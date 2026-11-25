"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  X,
  FileDown,
  Printer,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Building2,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  WeeklyScheduleData,
  MasterUnit,
  DaySchedule,
  PeriodicInspectionItem,
} from "../services/plantService";
import { parsePlanHmHours } from "../utils/pmHelpers";
import {
  DailyPlanApprovalData,
  DailyPlanApprovalModal,
  getDefaultApprovalData,
  ApprovedStamp,
  formatIndoFullDate,
} from "./DailyPlanApprovalModal";

interface DailyPlanServicePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleData: WeeklyScheduleData | null;
  selectedSite: "MuaraPahu" | "Senyiur";
  masterUnits: MasterUnit[];
  approvalData?: DailyPlanApprovalData;
  onUpdateApprovalData?: (data: DailyPlanApprovalData) => void;
}

export function parseWorkOrderDetails(notes?: string | null, category?: string | null): {
  woNumber: string;
  mrNumber: string;
  backlogActivity: string;
  remark: string;
} {
  let wo = "-";
  let mr = "-";
  let act = "-";
  let rem = category ? `PERIODICAL SERVICE + ${category.toUpperCase()}` : "PERIODICAL SERVICE";

  if (!notes) {
    return { woNumber: wo, mrNumber: mr, backlogActivity: act, remark: rem };
  }

  const woMatch = notes.match(/WO\s*:\s*([^|;\n]+)/i);
  if (woMatch) wo = woMatch[1].trim();

  const mrMatch = notes.match(/MR\s*:\s*([^|;\n]+)/i);
  if (mrMatch) mr = mrMatch[1].trim();

  const actMatch = notes.match(/(?:BL|ML|BACKLOG|ACTIVITY|KEGIATAN)\s*:\s*([^|;\n]+)/i);
  if (actMatch) {
    act = actMatch[1].trim();
  } else if (woMatch || mrMatch) {
    act = notes
      .replace(/WO\s*:\s*[^|;\n]+/gi, "")
      .replace(/MR\s*:\s*[^|;\n]+/gi, "")
      .replace(/[|;]/g, " ")
      .trim() || "-";
  } else {
    act = notes.trim();
  }

  if (act !== "-" && !act.toUpperCase().includes("SCHEDULED")) {
    rem = "PERIODICAL SERVICE + BACKLOG";
  }

  return { woNumber: wo, mrNumber: mr, backlogActivity: act, remark: rem };
}

function formatDateDmy(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const DailyPlanServicePdfModal: React.FC<DailyPlanServicePdfModalProps> = ({
  isOpen,
  onClose,
  scheduleData,
  selectedSite,
  masterUnits,
  approvalData,
  onUpdateApprovalData,
}) => {
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL");
  const [internalApproval, setInternalApproval] = useState<DailyPlanApprovalData>(
    () => approvalData || getDefaultApprovalData(selectedSite)
  );
  const [isEditApprovalModalOpen, setIsEditApprovalModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>("");

  useEffect(() => {
    if (approvalData) {
      setInternalApproval(approvalData);
    }
  }, [approvalData]);

  const activeApproval = approvalData || internalApproval;

  const handleSaveApproval = (data: DailyPlanApprovalData) => {
    setInternalApproval(data);
    onUpdateApprovalData?.(data);
  };

  const printAreaRef = useRef<HTMLDivElement>(null);

  const siteLabel = selectedSite === "MuaraPahu" ? "MUARA PAHU" : "SENYIUR";
  const siteProperCase = selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur";

  // Build model map from masterUnits
  const unitModelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of masterUnits) {
      map.set(u.unitCode, u.model || u.brand || "FH16");
    }
    return map;
  }, [masterUnits]);

  // Filtered days to print
  const daysToDisplay = useMemo(() => {
    if (!scheduleData?.days) return [];
    if (selectedDateFilter === "ALL") {
      // Include all days that have items or all 7 days
      return scheduleData.days;
    }
    return scheduleData.days.filter((d) => d.date === selectedDateFilter);
  }, [scheduleData, selectedDateFilter]);

  const activeDaysWithItems = useMemo(() => {
    return daysToDisplay.filter((d) => d.items.length > 0);
  }, [daysToDisplay]);

  const totalUnitsScheduled = useMemo(() => {
    return daysToDisplay.reduce((sum, d) => sum + d.items.length, 0);
  }, [daysToDisplay]);

  // Today formatted
  const todayFormatted = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return `${siteProperCase}, ${formatIndoFullDate(today)}`;
  }, [siteProperCase]);

  // Handler: Export PDF via jsPDF & html2canvas-pro
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExporting(true);
      setExportProgress("Menyiapkan dokumen PDF...");

      // Render high-resolution canvas (scale 2.2 for crisp print text)
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      setExportProgress("Menyusun lembar A4 Landscape...");
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight, undefined, "FAST");
      } else {
        // Multi-page slicing if table is longer than 1 landscape page
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = position - pdfHeight;
          pdf.addPage("a4", "landscape");
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
          heightLeft -= pdfHeight;
        }
      }

      const dateStr = selectedDateFilter === "ALL" ? scheduleData?.weekRange.startDate || "Week" : selectedDateFilter;
      pdf.save(`Daily_Plan_Service_${selectedSite}_${dateStr}.pdf`);
    } catch (err: any) {
      console.error("Gagal mengekspor PDF:", err);
      alert("Terjadi kesalahan saat menghasilkan PDF: " + (err?.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Handler: Print via browser dialog
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-[#e95623]">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Preview &amp; Cetak PDF Daily Plan Service
              </h2>
              <p className="text-xs text-slate-400">
                Format dokumen resmi standar Plant &amp; Maintenance PT Batara Dharma Persada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar / Options Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Hari */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Tanggal:</span>
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
              >
                <option value="ALL">
                  Semua Hari Minggu Ini ({scheduleData?.weekRange.formatted || "-"})
                </option>
                {(scheduleData?.days || []).map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.dayName}, {formatIndoFullDate(d.date)} ({d.items.length} unit)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Total Unit: <strong className="text-slate-900">{totalUnitsScheduled} Unit</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 shadow-xs cursor-pointer transition-all"
            >
              <Printer size={15} />
              <span>Cetak (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d54918] text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>{exportProgress || "Memproses..."}</span>
                </>
              ) : (
                <>
                  <FileDown size={15} />
                  <span>Download PDF A4 Landscape</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configuration Bar for Signatories & Cap Approved */}
        <div className="px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 text-[11px] flex flex-wrap items-center justify-between gap-3 text-slate-700 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold flex items-center gap-1.5 text-slate-800">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Status Tanda Tangan &amp; Cap:</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Cap Approved:{" "}
                {[
                  activeApproval.planner.isApproved,
                  activeApproval.maintenanceSupt.isApproved,
                  activeApproval.logisticSupt.isApproved,
                  activeApproval.productionSupt.isApproved,
                ].filter(Boolean).length}
                /4
              </span>

              <span className="text-slate-600 font-bold">
                • {activeApproval.documentLocation},{" "}
                {formatIndoFullDate(activeApproval.documentDate)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditApprovalModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck size={13} />
            <span>Edit Nama, Tanggal &amp; Cap Approved</span>
          </button>
        </div>

        {/* Live Document Canvas Preview (A4 Landscape Formatted) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/70 grow">
          <div
            ref={printAreaRef}
            className="bg-white mx-auto shadow-xl p-8 sm:p-10 text-slate-900 border border-slate-300 font-sans print:shadow-none print:border-none print:p-0"
            style={{ width: "100%", maxWidth: "1122px", minHeight: "750px" }}
          >
            {/* Top Logo & Header */}
            <div className="flex items-start gap-3.5 mb-3">
              {/* Batara Double Chevron Arrow Logo */}
              <div className="shrink-0 flex items-center pt-0.5">
                <svg width="42" height="38" viewBox="0 0 42 38" fill="none">
                  <path
                    d="M3 35L17 19L3 3H10L24 19L10 35H3Z"
                    fill="#0ea5e9"
                  />
                  <path
                    d="M17 35L31 19L17 3H24L38 19L24 35H17Z"
                    fill="#e95623"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  Periodic Service – Daily Plan Service
                </h1>
              </div>
            </div>

            {/* Subheader Company Info */}
            <div className="text-xs leading-relaxed text-slate-800 mb-4">
              <div className="font-black tracking-wide text-slate-900 uppercase">
                PT BATARA DHARMA PERSADA
              </div>
              <div className="font-extrabold text-[#e95623] tracking-wide uppercase">
                PLANT &amp; MAINTENANCE DEPARTMENT - {siteLabel}
              </div>
            </div>

            {/* Document Title Centered */}
            <div className="text-center my-4">
              <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 underline underline-offset-4 decoration-2">
                DAILY MAINTENANCE SERVICE
              </h2>
            </div>

            {/* Tables for each date in daysToDisplay */}
            <div className="space-y-6">
              {daysToDisplay.map((day: DaySchedule) => {
                const items = day.items;
                return (
                  <div key={day.date} className="page-break-inside-avoid">
                  {/* Date Section Header */}
                  <div className="text-xs font-black text-slate-900 mb-1.5 flex items-center justify-between">
                    <span>Tanggal : {formatIndoFullDate(day.date)}</span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      {day.dayName} • Target Plan: {day.targetUnits} Unit
                    </span>
                  </div>

                  {/* Table with Green Header */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-slate-700">
                      <thead>
                        <tr className="bg-[#c6e0b4] text-slate-900 font-extrabold text-center uppercase tracking-tight">
                          <th className="border border-slate-700 px-1.5 py-1.5 w-7">NO</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-20">CODE NUMBER</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-14">MODEL</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-20">PLAN DATE PS</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-18">
                            PLAN<br />START TIME
                          </th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-18">PLAN HM PS</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-20">TYPE SERVICE</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-14">DURATION</th>
                          <th className="border border-slate-700 px-2 py-1.5 w-28">WORK ORDER/MR</th>
                          <th className="border border-slate-700 px-1.5 py-1.5 w-18">LOCATION</th>
                          <th className="border border-slate-700 px-2 py-1.5 min-w-35 text-left">
                            BACKLOG, MIDLIFE, REPAIR ACTIVITY
                          </th>
                          <th className="border border-slate-700 px-2 py-1.5 min-w-32 text-left">REMARK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={12}
                              className="border border-slate-700 px-4 py-3 text-center text-slate-500 italic bg-slate-50/50"
                            >
                              Tidak ada jadwal unit periodic service pada tanggal ini (Target Plan: {day.targetUnits} unit).
                            </td>
                          </tr>
                        ) : (
                          items.map((item: PeriodicInspectionItem, idx: number) => {
                            const model = unitModelMap.get(item.unitCode) || item.unit?.model || "FH16";
                            const leadHrs = item.planLeadTime
                              ? item.planLeadTime.replace(/jam/i, "").trim()
                              : "8";
                            const hmVal =
                              item.planHmServis != null && item.planHmServis !== ""
                                ? item.planHmServis.replace(/hm/i, "").trim()
                                : item.currentHm != null
                                ? String(item.currentHm)
                                : "-";

                            const details = parseWorkOrderDetails(item.notes, item.category);

                            return (
                              <tr
                                key={item.id}
                                className="text-slate-900 font-semibold hover:bg-slate-50 transition-colors"
                              >
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-bold">
                                  {idx + 1}
                                </td>
                                <td className="border border-slate-700 px-1.5 py-1.5 text-center font-bold font-mono">
                                  {item.unitCode}
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-bold">
                                  {model}
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-mono">
                                  {formatDateDmy(item.date)}
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-mono font-bold">
                                  {item.planStartTime || "07:00"}
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-mono font-bold">
                                  {hmVal}
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-bold">
                                  {item.serviceType || "P1 (250 HM)"}
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-mono">
                                  {leadHrs}
                                </td>
                                <td className="border border-slate-700 px-2 py-1.5 font-mono text-[9.5px] leading-tight">
                                  <div>WO : {details.woNumber}</div>
                                  <div>MR : {details.mrNumber}</div>
                                </td>
                                <td className="border border-slate-700 px-1 py-1.5 text-center font-bold">
                                  {siteLabel}
                                </td>
                                <td className="border border-slate-700 px-2 py-1.5 text-[9.5px] font-medium leading-tight">
                                  {details.backlogActivity}
                                </td>
                                <td className="border border-slate-700 px-2 py-1.5 text-[9.5px] font-bold text-slate-800 leading-tight">
                                  {details.remark}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

            {/* Signature & Approval Block */}
            <div className="mt-8 pt-4 border-t border-slate-300 page-break-inside-avoid">
              <div className="text-xs font-black text-slate-900 mb-4 font-sans">
                {activeApproval.documentLocation},{" "}
                {formatIndoFullDate(activeApproval.documentDate)}
              </div>

              <div className="grid grid-cols-4 gap-4 text-center text-xs font-sans">
                {/* Column 1: Planner */}
                <div className="flex flex-col justify-between min-h-36.25 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {activeApproval.planner.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {activeApproval.planner.isApproved ? (
                      <ApprovedStamp
                        dateStr={activeApproval.planner.date}
                        isCompact
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Tanda Tangan Manual)
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-black text-slate-900 underline underline-offset-2">
                      {activeApproval.planner.name ||
                        activeApproval.planner.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {activeApproval.planner.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {activeApproval.planner.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(activeApproval.planner.date)}
                    </div>
                  </div>
                </div>

                {/* Column 2: Maintenance Superintendent */}
                <div className="flex flex-col justify-between min-h-36.25 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {activeApproval.maintenanceSupt.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {activeApproval.maintenanceSupt.isApproved ? (
                      <ApprovedStamp
                        dateStr={activeApproval.maintenanceSupt.date}
                        isCompact
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Tanda Tangan Manual)
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-black text-slate-900 underline underline-offset-2">
                      {activeApproval.maintenanceSupt.name ||
                        activeApproval.maintenanceSupt.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {activeApproval.maintenanceSupt.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {activeApproval.maintenanceSupt.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(activeApproval.maintenanceSupt.date)}
                    </div>
                  </div>
                </div>

                {/* Column 3: Logistic Superintendent */}
                <div className="flex flex-col justify-between min-h-36.25 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {activeApproval.logisticSupt.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {activeApproval.logisticSupt.isApproved ? (
                      <ApprovedStamp
                        dateStr={activeApproval.logisticSupt.date}
                        isCompact
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Tanda Tangan Manual)
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-black text-slate-900 underline underline-offset-2">
                      {activeApproval.logisticSupt.name ||
                        activeApproval.logisticSupt.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {activeApproval.logisticSupt.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {activeApproval.logisticSupt.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(activeApproval.logisticSupt.date)}
                    </div>
                  </div>
                </div>

                {/* Column 4: Production Superintendent */}
                <div className="flex flex-col justify-between min-h-36.25 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {activeApproval.productionSupt.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {activeApproval.productionSupt.isApproved ? (
                      <ApprovedStamp
                        dateStr={activeApproval.productionSupt.date}
                        isCompact
                      />
                    ) : (
                      <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Tanda Tangan Manual)
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-black text-slate-900 underline underline-offset-2">
                      {activeApproval.productionSupt.name ||
                        activeApproval.productionSupt.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {activeApproval.productionSupt.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {activeApproval.productionSupt.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(activeApproval.productionSupt.date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Tanda Tangan & Cap Approved */}
      <DailyPlanApprovalModal
        isOpen={isEditApprovalModalOpen}
        onClose={() => setIsEditApprovalModalOpen(false)}
        initialData={activeApproval}
        onSave={handleSaveApproval}
        selectedSite={selectedSite}
      />
    </div>
  );
};

