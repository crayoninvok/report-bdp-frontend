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
  AlertTriangle,
  Building2,
  Layers,
  Sparkles,
  ShieldCheck,
  Search,
  Truck,
  Clock,
  Wrench,
  Check,
} from "lucide-react";
import {
  DailyPaReportData,
  DailyPaUnitRow,
  MasterUnit,
} from "../services/plantService";
import { formatIndonesianFullDate } from "../utils/dailyPaHelpers";
import {
  ApprovedStamp,
  formatIndoFullDate,
} from "./DailyPlanApprovalModal";

export interface DailyPaSigner {
  roleTitle: string;
  position: string;
  department: string;
  name: string;
  date: string;
  isApproved: boolean;
}

export interface DailyPaApprovalData {
  documentLocation: string;
  documentDate: string;
  planner: DailyPaSigner;
  supervisor: DailyPaSigner;
  superintendent: DailyPaSigner;
}

export function getDefaultDailyPaApprovalData(
  site: "MuaraPahu" | "Senyiur" = "MuaraPahu"
): DailyPaApprovalData {
  const today = new Date().toISOString().slice(0, 10);
  const location = site === "MuaraPahu" ? "Muara Pahu" : "Senyiur";
  return {
    documentLocation: location,
    documentDate: today,
    planner: {
      roleTitle: "Dibuat Oleh :",
      position: "Maintenance Planner",
      department: "Plant & Maintenance",
      name: "Maintenance Planner",
      date: today,
      isApproved: true,
    },
    supervisor: {
      roleTitle: "Diperiksa Oleh :",
      position: "Maintenance Supervisor",
      department: "Plant Department",
      name: "Maintenance Supervisor",
      date: today,
      isApproved: true,
    },
    superintendent: {
      roleTitle: "Disetujui Oleh :",
      position: "Maintenance Superintendent",
      department: "Plant Department",
      name: "Maintenance Superintendent",
      date: today,
      isApproved: true,
    },
  };
}

function getDailyPaApprovalStorageKey(site: string): string {
  return `bdp_daily_pa_approval_${site || "MuaraPahu"}`;
}

export interface DailyPaPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: DailyPaReportData | null;
  selectedSite: "MuaraPahu" | "Senyiur";
  dateIso: string;
  masterUnits?: MasterUnit[];
}

export const DailyPaPdfExportModal: React.FC<DailyPaPdfExportModalProps> = ({
  isOpen,
  onClose,
  reportData,
  selectedSite,
  dateIso,
}) => {
  const [filterMode, setFilterMode] = useState<
    "all" | "bd_only" | "below_target"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [isSignerModalOpen, setIsSignerModalOpen] = useState(false);

  // Approval Data
  const [approvalData, setApprovalData] = useState<DailyPaApprovalData>(() => {
    try {
      const key = getDailyPaApprovalStorageKey(selectedSite);
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultDailyPaApprovalData(selectedSite);
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync approval data when site changes
  useEffect(() => {
    try {
      const key = getDailyPaApprovalStorageKey(selectedSite);
      const saved = localStorage.getItem(key);
      if (saved) {
        setApprovalData(JSON.parse(saved));
        return;
      }
    } catch {}
    setApprovalData(getDefaultDailyPaApprovalData(selectedSite));
  }, [selectedSite]);

  const handleSaveApproval = (newData: DailyPaApprovalData) => {
    setApprovalData(newData);
    try {
      const key = getDailyPaApprovalStorageKey(selectedSite);
      localStorage.setItem(key, JSON.stringify(newData));
    } catch {}
    setIsSignerModalOpen(false);
  };

  const allUnits = reportData?.units || [];
  const targetPa = reportData?.report.targetPa ?? 93;
  const calendarHours = reportData?.report.calendarHours ?? 24;

  // Filtered Units for PDF document
  const filteredUnits = useMemo(() => {
    return allUnits.filter((u) => {
      if (filterMode === "bd_only" && u.bdCount === 0) return false;
      if (filterMode === "below_target" && !u.isBelowTarget) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUnit = u.unitCode.toLowerCase().includes(q);
        const matchesCategory = u.category.toLowerCase().includes(q);
        const matchesActivity = u.activities.some((act) =>
          act.activityText.toLowerCase().includes(q)
        );
        if (!matchesUnit && !matchesCategory && !matchesActivity) {
          return false;
        }
      }
      return true;
    });
  }, [allUnits, filterMode, searchQuery]);

  const siteLabel =
    selectedSite === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur";

  const formattedDate = useMemo(() => {
    if (!dateIso) return "";
    try {
      const parts = dateIso.split("-");
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10)
        );
        return formatIndonesianFullDate(d);
      }
    } catch {}
    return dateIso;
  }, [dateIso]);

  const printTimestamp = useMemo(() => {
    const d = new Date();
    return `${d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} pukul ${d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })} WIB`;
  }, []);

  if (!isOpen) return null;

  // Handle Export PDF via html2canvas-pro + jsPDF
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExporting(true);
      setExportProgress("Menyiapkan dokumen Daily PA...");

      const el = printAreaRef.current;
      setExportProgress("Merender layout dokumen ke format grafik...");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1200,
      });

      setExportProgress("Menyusun halaman PDF A4 Landscape...");
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
        // Multi-page slicing if table has many units
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

      const cleanSite = selectedSite;
      const cleanDate = dateIso || "Report";
      pdf.save(`Daily_PA_Report_${cleanSite}_${cleanDate}.pdf`);
    } catch (err: any) {
      console.error("Gagal mengekspor PDF:", err);
      alert("Terjadi kesalahan saat mengekspor PDF: " + (err?.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Handle Native Browser Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      {/* Scoped Print Style for A4 Landscape Document */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #daily-pa-printable,
          #daily-pa-printable * {
            visibility: visible;
          }
          #daily-pa-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 8mm;
            background: white !important;
          }
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e95623]/20 border border-[#e95623]/40 flex items-center justify-center text-[#e95623]">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#e95623] text-white">
                  {selectedSite}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Tanggal: {formattedDate}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Download PDF &amp; Cetak Laporan Daily PA (Physical Availability)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSignerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
              title="Atur Tanda Tangan & Pengesahan Dokumen"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Pengesahan Dokumen</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
              title="Cetak langsung menggunakan dialog print browser"
            >
              <Printer size={14} />
              <span>Cetak (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting || allUnits.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d84818] text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <FileDown size={14} />
              <span>
                {isExporting ? exportProgress || "Memproses..." : "Download PDF"}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Hidden on Print) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Filter Tampilan:</span>
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 border border-slate-300">
              {(
                [
                  { id: "all", label: `Semua (${allUnits.length})` },
                  {
                    id: "bd_only",
                    label: `Unit BD (${reportData?.summary.breakdownUnitCount ?? 0})`,
                  },
                  {
                    id: "below_target",
                    label: `PA < ${targetPa}% (${reportData?.summary.belowTargetUnitCount ?? 0})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterMode === tab.id
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-64">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari kode unit / aktivitas BD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Printable Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 print:p-0 print:bg-white">
          <div
            id="daily-pa-printable"
            ref={printAreaRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mx-auto text-slate-800 print:border-none print:shadow-none print:p-0 print:rounded-none"
            style={{ maxWidth: "1120px" }}
          >
            {/* Header Document */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src="/coa-logo-bdp.png"
                  alt="PT Batara Dharma Persada"
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
                    PT BATARA DHARMA PERSADA
                  </h1>
                  <span className="text-[11px] font-extrabold text-[#e95623] tracking-wide block uppercase">
                    PLANT &amp; MAINTENANCE DEPARTMENT &bull; PHYSICAL AVAILABILITY
                  </span>
                  <span className="text-xs font-bold text-slate-600 block mt-0.5">
                    LAPORAN HARIAN KETERSEDIAAN FISIK UNIT (DAILY PA REPORT)
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] font-semibold text-slate-600 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs mb-1.5">
                  <Building2 size={12} />
                  <span>{siteLabel.toUpperCase()}</span>
                </div>
                <div>
                  <strong>Tanggal Report:</strong> {formattedDate}
                </div>
                <div>
                  <strong>Waktu Cetak:</strong> {printTimestamp}
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-3 my-4">
              {/* PA % Keseluruhan */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  (reportData?.summary.overallPaPercent ?? 100) >= targetPa
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-rose-200 bg-rose-50/70"
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    PA % Keseluruhan
                  </span>
                  <span
                    className={`text-xl font-black ${
                      (reportData?.summary.overallPaPercent ?? 100) >= targetPa
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {reportData && reportData.summary.totalUnits > 0
                      ? `${reportData.summary.overallPaPercent.toFixed(1)}%`
                      : "-"}
                  </span>
                  <span className="text-[9.5px] text-slate-500 block font-semibold">
                    Target: {targetPa}%
                  </span>
                </div>
                <Sparkles
                  size={22}
                  className={
                    (reportData?.summary.overallPaPercent ?? 100) >= targetPa
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }
                />
              </div>

              {/* Unit Breakdown Periode */}
              <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-sky-700 uppercase block">
                    Unit Breakdown
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    {reportData?.summary.breakdownUnitCount ?? 0}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      / {reportData?.summary.totalUnits ?? 0} Unit
                    </span>
                  </span>
                  <span className="text-[9.5px] text-slate-500 block font-semibold">
                    Total BD: {reportData?.summary.totalBd ?? 0} aktivitas
                  </span>
                </div>
                <Truck size={22} className="text-sky-500" />
              </div>

              {/* PA di Bawah Target */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  (reportData?.summary.belowTargetUnitCount ?? 0) > 0
                    ? "border-rose-200 bg-rose-50/60"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    PA &lt; Target ({targetPa}%)
                  </span>
                  <span
                    className={`text-xl font-black ${
                      (reportData?.summary.belowTargetUnitCount ?? 0) > 0
                        ? "text-rose-700"
                        : "text-slate-800"
                    }`}
                  >
                    {reportData?.summary.belowTargetUnitCount ?? 0}{" "}
                    <span className="text-xs font-semibold text-slate-500">Unit</span>
                  </span>
                  <span className="text-[9.5px] text-slate-500 block font-semibold">
                    MTTR:{" "}
                    {reportData?.summary.overallMttr != null
                      ? `${reportData.summary.overallMttr.toFixed(2)}j`
                      : "-"}{" "}
                    &bull; MTBF:{" "}
                    {reportData?.summary.overallMtbf != null
                      ? `${reportData.summary.overallMtbf.toFixed(2)}j`
                      : "-"}
                  </span>
                </div>
                <AlertTriangle
                  size={22}
                  className={
                    (reportData?.summary.belowTargetUnitCount ?? 0) > 0
                      ? "text-rose-500"
                      : "text-slate-400"
                  }
                />
              </div>

              {/* Parameter Jam & Total Downtime */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Parameter Jam &amp; DT
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {calendarHours}{" "}
                    <span className="text-xs font-semibold text-slate-500">Jam/Hari</span>
                  </span>
                  <span className="text-[9.5px] text-slate-500 block font-semibold">
                    Total Downtime:{" "}
                    {reportData?.summary.totalDowntime.toFixed(2) ?? "0.00"} Jam
                  </span>
                </div>
                <Clock size={22} className="text-slate-400" />
              </div>
            </div>

            {/* Main Daily PA Table */}
            <div className="rounded-xl border border-slate-300 overflow-hidden mb-5">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[9.5px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-8 border-r border-slate-700">
                      No
                    </th>
                    <th className="py-2.5 px-3 w-28 border-r border-slate-700">
                      Unit
                    </th>
                    <th className="py-2.5 px-2 text-center w-16 border-r border-slate-700">
                      Jml BD
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-22 border-r border-slate-700">
                      Downtime (j)
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-24 border-r border-slate-700">
                      Available (j)
                    </th>
                    <th className="py-2.5 px-2.5 text-center w-20 border-r border-slate-700">
                      PA (%)
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-700 min-w-56">
                      BD Activity &amp; Keterangan
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-700">
                      Jam BD
                    </th>
                    <th className="py-2.5 px-2 text-center w-14 border-r border-slate-700">
                      MTTR
                    </th>
                    <th className="py-2.5 px-2 text-center w-14">
                      MTBF
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        Tidak ada unit pada tanggal/filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((row, idx) => {
                      const isEven = idx % 2 === 1;
                      return (
                        <tr
                          key={row.id || idx}
                          className={isEven ? "bg-slate-50/70" : "bg-white"}
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                            {row.no}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <span className="font-black text-slate-900 block">
                              {row.unitCode}
                            </span>
                            <span className="text-[9.5px] text-slate-400 font-medium block">
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                            {row.bdCount > 0 ? row.bdCount : "-"}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-700 border-r border-slate-200">
                            {row.totalDowntime > 0
                              ? row.totalDowntime.toFixed(2)
                              : "-"}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                            {row.availableHours.toFixed(2)}
                          </td>
                          <td
                            className={`py-2 px-2.5 text-center font-black border-r border-slate-200 ${
                              row.isBelowTarget
                                ? "bg-rose-100/80 text-rose-800"
                                : "bg-emerald-100/80 text-emerald-800"
                            }`}
                          >
                            {row.paPercent.toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-3 border-r border-slate-200">
                            {row.activities.length === 0 ? (
                              <span className="text-slate-400 italic text-[10px]">
                                -
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {row.activities.map((act) => (
                                  <div
                                    key={act.id}
                                    className="flex items-start gap-1 text-[10.5px] leading-snug"
                                  >
                                    <span
                                      className={`px-1 rounded text-[8.5px] font-black uppercase shrink-0 mt-0.5 ${
                                        act.sourceType === "PI"
                                          ? "bg-sky-100 text-sky-800 border border-sky-300"
                                          : act.sourceType === "PS"
                                          ? "bg-orange-100 text-[#e95623] border border-orange-300"
                                          : "bg-slate-100 text-slate-700 border border-slate-300"
                                      }`}
                                    >
                                      {act.sourceType}
                                    </span>
                                    <span className="text-slate-700 font-medium">
                                      {act.activityText}
                                    </span>
                                    <span className="text-[9.5px] text-slate-500 font-bold shrink-0 ml-auto">
                                      ({act.durationHours}j)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600 font-mono text-[10px] border-r border-slate-200 whitespace-nowrap">
                            {row.breakdownTimesJoined || "-"}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 font-bold border-r border-slate-200">
                            {row.mttr != null ? row.mttr.toFixed(2) : "-"}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700 font-bold">
                            {row.mtbf != null ? row.mtbf.toFixed(2) : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Approval / Signature Section */}
            <div
              className="pt-4 border-t-2 border-slate-800"
              style={{ pageBreakInside: "avoid" }}
            >
              <div className="flex items-center justify-between mb-3 text-[11px] text-slate-600 font-semibold">
                <span>
                  Lokasi Pengesahan:{" "}
                  <strong className="text-slate-900">
                    {approvalData.documentLocation}
                  </strong>
                </span>
                <span>
                  Tanggal Dokumen:{" "}
                  <strong className="text-slate-900">
                    {formatIndoFullDate(approvalData.documentDate)}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Signer 1: Planner */}
                <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-36 text-center relative overflow-hidden">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      {approvalData.planner.roleTitle}
                    </span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                      {approvalData.planner.position}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      {approvalData.planner.department}
                    </span>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    {approvalData.planner.isApproved ? (
                      <ApprovedStamp dateStr={approvalData.planner.date} isCompact />
                    ) : (
                      <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 italic">
                        (Belum disahkan)
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-900 block underline">
                      {approvalData.planner.name}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-semibold">
                      Tgl: {approvalData.planner.date}
                    </span>
                  </div>
                </div>

                {/* Signer 2: Supervisor */}
                <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-36 text-center relative overflow-hidden">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      {approvalData.supervisor.roleTitle}
                    </span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                      {approvalData.supervisor.position}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      {approvalData.supervisor.department}
                    </span>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    {approvalData.supervisor.isApproved ? (
                      <ApprovedStamp dateStr={approvalData.supervisor.date} isCompact />
                    ) : (
                      <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 italic">
                        (Belum disahkan)
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-900 block underline">
                      {approvalData.supervisor.name}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-semibold">
                      Tgl: {approvalData.supervisor.date}
                    </span>
                  </div>
                </div>

                {/* Signer 3: Superintendent */}
                <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-36 text-center relative overflow-hidden">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      {approvalData.superintendent.roleTitle}
                    </span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                      {approvalData.superintendent.position}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      {approvalData.superintendent.department}
                    </span>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    {approvalData.superintendent.isApproved ? (
                      <ApprovedStamp dateStr={approvalData.superintendent.date} isCompact />
                    ) : (
                      <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 italic">
                        (Belum disahkan)
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-900 block underline">
                      {approvalData.superintendent.name}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-semibold">
                      Tgl: {approvalData.superintendent.date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Disclaimer */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                <span>
                  Dokumen internal operasional armada PT Batara Dharma Persada. Dilarang menggandakan tanpa izin tertulis.
                </span>
                <span>Format Dokumen: BDP-PLT-PA-DAILY-A4L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Signers */}
      {isSignerModalOpen && (
        <DailyPaSignerEditorModal
          isOpen={isSignerModalOpen}
          onClose={() => setIsSignerModalOpen(false)}
          data={approvalData}
          onSave={handleSaveApproval}
          selectedSite={selectedSite}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// Sub-Modal: Signer Editor
// ----------------------------------------------------------------------
interface DailyPaSignerEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DailyPaApprovalData;
  onSave: (newData: DailyPaApprovalData) => void;
  selectedSite: string;
}

const DailyPaSignerEditorModal: React.FC<DailyPaSignerEditorModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
}) => {
  const [formData, setFormData] = useState<DailyPaApprovalData>(data);

  if (!isOpen) return null;

  const handleChange = (
    signerKey: "planner" | "supervisor" | "superintendent",
    field: keyof DailyPaSigner,
    val: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [signerKey]: {
        ...prev[signerKey],
        [field]: val,
      },
    }));
  };

  const signers: Array<{
    key: "planner" | "supervisor" | "superintendent";
    title: string;
    sub: string;
  }> = [
    {
      key: "planner",
      title: "Maintenance Planner",
      sub: "Dibuat Oleh",
    },
    {
      key: "supervisor",
      title: "Maintenance Supervisor",
      sub: "Diperiksa Oleh",
    },
    {
      key: "superintendent",
      title: "Maintenance Superintendent",
      sub: "Disetujui Oleh",
    },
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-[#e95623]" />
            <h3 className="text-sm font-extrabold text-white">
              Pengaturan Tanda Tangan &amp; Pengesahan Daily PA
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Lokasi Pengesahan
              </label>
              <input
                type="text"
                value={formData.documentLocation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    documentLocation: e.target.value,
                  }))
                }
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Tanggal Dokumen
              </label>
              <input
                type="date"
                value={formData.documentDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    documentDate: e.target.value,
                  }))
                }
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            {signers.map(({ key, title, sub }) => {
              const signer = formData[key];
              return (
                <div
                  key={key}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        {title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {sub}
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={signer.isApproved}
                        onChange={(e) =>
                          handleChange(key, "isApproved", e.target.checked)
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Tampilkan Cap Approved</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-0.5">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) =>
                          handleChange(key, "name", e.target.value)
                        }
                        className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-0.5">
                        Tanggal TTD
                      </label>
                      <input
                        type="date"
                        value={signer.date}
                        onChange={(e) =>
                          handleChange(key, "date", e.target.value)
                        }
                        className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
          >
            Simpan Pengesahan
          </button>
        </div>
      </div>
    </div>
  );
};
