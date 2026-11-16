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
  ChevronDown,
} from "lucide-react";
import { PlanReplacementItem } from "./PlanReplacementModal";
import {
  ApprovedStamp,
  formatIndoFullDate,
} from "./DailyPlanApprovalModal";
import {
  PlanReplacementApprovalData,
  PlanReplacementApprovalModal,
  getDefaultPlanApprovalData,
  getPlanApprovalStorageKey,
} from "./PlanReplacementApprovalModal";

interface PlanReplacementPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  planItems: PlanReplacementItem[];
  selectedSite: string; // "Senyiur", "MuaraPahu", "ALL"
  selectedPeriod?: string; // "ALL" or specific period
}

export const PlanReplacementPdfModal: React.FC<PlanReplacementPdfModalProps> = ({
  isOpen,
  onClose,
  planItems,
  selectedSite,
  selectedPeriod = "ALL",
}) => {
  const [siteFilter, setSiteFilter] = useState<string>(selectedSite || "ALL");
  const [periodFilter, setPeriodFilter] = useState<string>(selectedPeriod || "ALL");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>("");

  // Approval Data State
  const [approvalData, setApprovalData] = useState<PlanReplacementApprovalData>(() => {
    try {
      const key = getPlanApprovalStorageKey(selectedSite);
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultPlanApprovalData(selectedSite);
  });
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync approval data when siteFilter changes
  useEffect(() => {
    try {
      const key = getPlanApprovalStorageKey(siteFilter);
      const saved = localStorage.getItem(key);
      if (saved) {
        setApprovalData(JSON.parse(saved));
        return;
      }
    } catch {}
    setApprovalData(getDefaultPlanApprovalData(siteFilter));
  }, [siteFilter]);

  const handleSaveApproval = (newData: PlanReplacementApprovalData) => {
    setApprovalData(newData);
    try {
      const key = getPlanApprovalStorageKey(siteFilter);
      localStorage.setItem(key, JSON.stringify(newData));
    } catch {}
  };

  // Available periods
  const availablePeriods = useMemo(() => {
    const list = Array.from(new Set(planItems.map((p) => p.periodMonthYear)));
    if (!list.includes("November 2026")) list.push("November 2026");
    if (!list.includes("Desember 2026")) list.push("Desember 2026");
    return list;
  }, [planItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return planItems.filter((item) => {
      // Site filter
      if (siteFilter !== "ALL") {
        const itemSite = item.site.toUpperCase().replace(/\s+/g, "");
        const curSite = siteFilter.toUpperCase().replace(/\s+/g, "");
        if (!itemSite.includes(curSite) && !curSite.includes(itemSite)) return false;
      }

      // Period filter
      if (periodFilter !== "ALL" && item.periodMonthYear !== periodFilter) {
        return false;
      }

      return true;
    });
  }, [planItems, siteFilter, periodFilter]);

  // Group items by periodMonthYear
  const groupedItems = useMemo(() => {
    const map: Record<string, PlanReplacementItem[]> = {};
    for (const it of filteredItems) {
      const p = it.periodMonthYear || "Lainnya";
      if (!map[p]) map[p] = [];
      map[p].push(it);
    }
    return map;
  }, [filteredItems]);

  // Determine site header text matching the user's design:
  // "PLANT & MAINTENANCE DEPARTMENT – SITE SENYIUR/MUARA PAHU"
  const siteHeaderText = useMemo(() => {
    if (siteFilter === "Senyiur") return "SITE SENYIUR";
    if (siteFilter === "MuaraPahu") return "SITE MUARA PAHU";
    return "SITE SENYIUR/MUARA PAHU";
  }, [siteFilter]);

  if (!isOpen) return null;

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExporting(true);
      setExportProgress("Menyiapkan dokumen...");

      // Render high resolution canvas (scale 2.2 for crisp text and crisp borders)
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

      const periodStr = periodFilter === "ALL" ? "All_Periods" : periodFilter.replace(/\s+/g, "_");
      pdf.save(`Planned_Component_Replacement_${siteFilter}_${periodStr}.pdf`);
    } catch (err: any) {
      console.error("Gagal mengekspor PDF:", err);
      alert("Terjadi kesalahan saat mengekspor PDF: " + (err?.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Handle Print via Browser
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      {/* Scoped Print Style to ensure exact landscape print without UI bars */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #plan-replacement-printable-document,
          #plan-replacement-printable-document * {
            visibility: visible;
          }
          #plan-replacement-printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Header (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-[#e95623]">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Preview &amp; Export PDF Plan Component Replacement
              </h2>
              <p className="text-xs text-slate-400">
                Format dokumen cetak resmi Plant &amp; Maintenance PT Batara Dharma Persada
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

        {/* Toolbar & Filter Controls (Hidden on Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Site */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Site:</span>
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
              >
                <option value="ALL">Semua Site (Senyiur &amp; Muara Pahu)</option>
                <option value="Senyiur">Site Senyiur</option>
                <option value="MuaraPahu">Site Muara Pahu</option>
              </select>
            </div>

            {/* Filter Periode */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Periode:</span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
              >
                <option value="ALL">Semua Periode Bulan</option>
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Total Item: <strong className="text-slate-900">{filteredItems.length} Komponen</strong>
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

        {/* Configuration Bar for Signatories & Cap Approved (Same as PS) */}
        <div className="px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 text-[11px] flex flex-wrap items-center justify-between gap-3 text-slate-700 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold flex items-center gap-1.5 text-slate-800">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Status Tanda Tangan &amp; Cap:</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Cap Approved:{" "}
                {[
                  approvalData.planner.isApproved,
                  approvalData.supervisor.isApproved,
                  approvalData.superintendent.isApproved,
                ].filter(Boolean).length}
                /3
              </span>

              <span className="text-slate-600 font-bold">
                • {approvalData.documentLocation},{" "}
                {formatIndoFullDate(approvalData.documentDate)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsApprovalModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck size={13} />
            <span>Edit Nama, Tanggal &amp; Cap Approved</span>
          </button>
        </div>

        {/* Preview & Printable Area (A4 Landscape Formatted Document) */}
        <div className="flex-1 overflow-auto bg-slate-200/70 p-4 sm:p-8 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div
            id="plan-replacement-printable-document"
            ref={printAreaRef}
            className="bg-white text-black w-280 min-h-198 p-8 sm:p-10 shadow-2xl print:shadow-none print:w-full print:p-0 font-sans leading-normal"
            style={{ fontFamily: "'Arial', 'Segoe UI', sans-serif" }}
          >
            {/* 1. Header matching user uploaded image */}
            <div className="mb-6 space-y-0.5">
              <h1 className="text-sm font-black tracking-normal uppercase text-black leading-tight">
                PT BATARA DHARMA PERSADA
              </h1>
              <h2 className="text-xs font-bold tracking-normal uppercase text-black leading-tight">
                PLANT &amp; MAINTENANCE DEPARTMENT – {siteHeaderText}
              </h2>
              <h3 className="text-xs font-semibold tracking-normal text-black leading-tight">
                Plan Replacement Component
              </h3>
            </div>

            {/* 2. Grouped Tables per Month/Year */}
            {Object.keys(groupedItems).length === 0 ? (
              <div className="py-12 text-center border border-black/40 text-xs italic text-slate-500">
                Tidak ada data rencana penggantian komponen untuk filter yang dipilih.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedItems).map(([period, items]) => (
                  <div key={period} className="space-y-1.5">
                    {/* Period Title */}
                    <div className="text-[11px] font-bold text-black">
                      Plan Replacement {period}
                    </div>

                    {/* Table with crisp black borders matching image */}
                    <table
                      className="w-full text-left border-collapse text-[10px]"
                      style={{
                        border: "1px solid #000",
                        tableLayout: "fixed",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid #000",
                            backgroundColor: "#ffffff",
                          }}
                          className="font-bold text-center uppercase"
                        >
                          <th style={{ border: "1px solid #000", width: "4%" }} className="p-1.5 text-center">
                            NO
                          </th>
                          <th style={{ border: "1px solid #000", width: "7%" }} className="p-1.5 text-center">
                            SITE
                          </th>
                          <th style={{ border: "1px solid #000", width: "7%" }} className="p-1.5 text-center">
                            NO UNIT
                          </th>
                          <th style={{ border: "1px solid #000", width: "10%" }} className="p-1.5 text-center">
                            COMPONENT
                          </th>
                          <th style={{ border: "1px solid #000", width: "7%" }} className="p-1.5 text-center">
                            PLAN HM
                          </th>
                          <th style={{ border: "1px solid #000", width: "7%" }} className="p-1.5 text-center">
                            LAST HM
                          </th>
                          <th style={{ border: "1px solid #000", width: "11%" }} className="p-1.5 text-center">
                            ACTUAL DATE REPLACEMENT
                          </th>
                          <th style={{ border: "1px solid #000", width: "11%" }} className="p-1.5 text-center">
                            ACTUAL HM REPLACEMENT
                          </th>
                          <th style={{ border: "1px solid #000", width: "10%" }} className="p-1.5 text-center">
                            HM LAST REPLACEMENT
                          </th>
                          <th style={{ border: "1px solid #000", width: "7%" }} className="p-1.5 text-center">
                            LIFETIME
                          </th>
                          <th style={{ border: "1px solid #000", width: "9%" }} className="p-1.5 text-center">
                            SOURCE COMPONENT
                          </th>
                          <th style={{ border: "1px solid #000", width: "10%" }} className="p-1.5 text-center">
                            REMARK
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => {
                          const actNum =
                            it.actualHm !== null && it.actualHm !== undefined ? Number(it.actualHm) : null;
                          const calculatedLifetime =
                            actNum !== null && actNum > 0
                              ? Math.max(0, actNum - (it.hmLastReplacement || 0))
                              : 0;

                          return (
                            <tr key={it.id} style={{ borderBottom: "1px solid #000" }}>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-medium">
                                {idx + 1}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-bold">
                                {it.site}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-bold">
                                {it.unitCode}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-bold">
                                {it.component}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-mono">
                                {it.planHm ? it.planHm.toLocaleString("id-ID") : "-"}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-mono">
                                {it.lastHm ? it.lastHm.toLocaleString("id-ID") : "-"}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-mono">
                                {it.actualDate || ""}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-mono font-bold">
                                {it.actualHm !== null && it.actualHm !== undefined && it.actualHm !== 0
                                  ? it.actualHm.toLocaleString("id-ID")
                                  : ""}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-mono">
                                {it.hmLastReplacement !== undefined ? it.hmLastReplacement.toLocaleString("id-ID") : 0}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-mono font-bold">
                                {calculatedLifetime.toLocaleString("id-ID")}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-medium">
                                {it.sourceComponent || ""}
                              </td>
                              <td style={{ border: "1px solid #000" }} className="p-1.5 text-center font-medium">
                                {it.remark || ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Signature & Approval Block (Styled exactly as in PS) */}
            <div className="mt-8 pt-4 border-t border-slate-300 page-break-inside-avoid">
              <div className="text-xs font-black text-slate-900 mb-3 font-sans">
                {approvalData.documentLocation},{" "}
                {formatIndoFullDate(approvalData.documentDate)}
              </div>

              <div className="grid grid-cols-3 gap-6 text-center text-xs font-sans">
                {/* Column 1: Planner */}
                <div className="flex flex-col justify-between min-h-36 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {approvalData.planner.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {approvalData.planner.isApproved ? (
                      <ApprovedStamp
                        dateStr={approvalData.planner.date}
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
                      {approvalData.planner.name || approvalData.planner.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {approvalData.planner.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {approvalData.planner.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(approvalData.planner.date)}
                    </div>
                  </div>
                </div>

                {/* Column 2: Supervisor */}
                <div className="flex flex-col justify-between min-h-36 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {approvalData.supervisor.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {approvalData.supervisor.isApproved ? (
                      <ApprovedStamp
                        dateStr={approvalData.supervisor.date}
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
                      {approvalData.supervisor.name || approvalData.supervisor.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {approvalData.supervisor.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {approvalData.supervisor.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(approvalData.supervisor.date)}
                    </div>
                  </div>
                </div>

                {/* Column 3: Superintendent */}
                <div className="flex flex-col justify-between min-h-36 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200">
                  <div className="font-bold text-slate-800">
                    {approvalData.superintendent.roleTitle}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {approvalData.superintendent.isApproved ? (
                      <ApprovedStamp
                        dateStr={approvalData.superintendent.date}
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
                      {approvalData.superintendent.name ||
                        approvalData.superintendent.position}
                    </div>
                    <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                      {approvalData.superintendent.position}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {approvalData.superintendent.department}
                    </div>
                    <div className="text-[8px] text-emerald-800 font-bold mt-0.5">
                      Tgl: {formatIndoFullDate(approvalData.superintendent.date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Approval Modal (Same as PS) */}
      <PlanReplacementApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        initialData={approvalData}
        onSave={handleSaveApproval}
        selectedSite={siteFilter}
      />
    </div>
  );
};
