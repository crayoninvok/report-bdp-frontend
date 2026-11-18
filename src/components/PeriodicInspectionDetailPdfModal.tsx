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
  Search,
  Filter,
  Check,
  RotateCcw,
  User,
  Sliders,
} from "lucide-react";
import {
  MasterUnit,
  PeriodicInspectionItem,
} from "../services/plantService";
import {
  ApprovedStamp,
  formatIndoFullDate,
} from "./DailyPlanApprovalModal";

export interface PiDetailSigner {
  roleTitle: string;
  position: string;
  department: string;
  name: string;
  date: string;
  isApproved: boolean;
}

export interface PiDetailApprovalData {
  documentLocation: string;
  documentDate: string;
  inspector: PiDetailSigner;
  planner: PiDetailSigner;
  superintendent: PiDetailSigner;
}

export function getDefaultPiApprovalData(
  site: "MuaraPahu" | "Senyiur" = "MuaraPahu"
): PiDetailApprovalData {
  const today = new Date().toISOString().slice(0, 10);
  const location = site === "MuaraPahu" ? "Muara Pahu" : "Senyiur";
  return {
    documentLocation: location,
    documentDate: today,
    inspector: {
      roleTitle: "Dibuat Oleh :",
      position: "Lead Inspector / Pengawas",
      department: "Plant & Maintenance",
      name: "Lead Inspector",
      date: today,
      isApproved: true,
    },
    planner: {
      roleTitle: "Diperiksa Oleh :",
      position: "Maintenance Planner",
      department: "Plant & Maintenance",
      name: "Maintenance Planner",
      date: today,
      isApproved: true,
    },
    superintendent: {
      roleTitle: "Disetujui Oleh :",
      position: "Plant Superintendent",
      department: "Plant & Maintenance",
      name: "Plant Superintendent",
      date: today,
      isApproved: true,
    },
  };
}

function getPiApprovalStorageKey(site: string): string {
  return `bdp_pi_detail_approval_${site || "MuaraPahu"}`;
}

export interface PeriodicInspectionDetailPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<
    PeriodicInspectionItem & {
      dayName?: string;
      dayDateFormatted?: string;
    }
  >;
  selectedSite: "MuaraPahu" | "Senyiur";
  dateRangeText: string;
  masterUnits: MasterUnit[];
}

export const PeriodicInspectionDetailPdfModal: React.FC<
  PeriodicInspectionDetailPdfModalProps
> = ({
  isOpen,
  onClose,
  items,
  selectedSite,
  dateRangeText,
  masterUnits,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [shiftFilter, setShiftFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [isSignerModalOpen, setIsSignerModalOpen] = useState<boolean>(false);

  // Approval Data
  const [approvalData, setApprovalData] = useState<PiDetailApprovalData>(() => {
    try {
      const key = getPiApprovalStorageKey(selectedSite);
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultPiApprovalData(selectedSite);
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync approval data when site changes
  useEffect(() => {
    try {
      const key = getPiApprovalStorageKey(selectedSite);
      const saved = localStorage.getItem(key);
      if (saved) {
        setApprovalData(JSON.parse(saved));
        return;
      }
    } catch {}
    setApprovalData(getDefaultPiApprovalData(selectedSite));
  }, [selectedSite]);

  const handleSaveApproval = (newData: PiDetailApprovalData) => {
    setApprovalData(newData);
    try {
      const key = getPiApprovalStorageKey(selectedSite);
      localStorage.setItem(key, JSON.stringify(newData));
    } catch {}
    setIsSignerModalOpen(false);
  };

  // Map master units for model/category lookup
  const unitMetaMap = useMemo(() => {
    const map = new Map<string, MasterUnit>();
    for (const u of masterUnits) {
      map.set(u.unitCode.toUpperCase(), u);
    }
    return map;
  }, [masterUnits]);

  // Filtered items for document
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (shiftFilter !== "ALL" && item.shift !== shiftFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUnit = item.unitCode.toLowerCase().includes(q);
        const matchesBuntut =
          item.buntutSummary && item.buntutSummary.toLowerCase().includes(q);
        const matchesInspector =
          item.inspectorName && item.inspectorName.toLowerCase().includes(q);
        const matchesNotes =
          item.notes && item.notes.toLowerCase().includes(q);
        const matchesService =
          item.serviceType && item.serviceType.toLowerCase().includes(q);
        if (
          !matchesUnit &&
          !matchesBuntut &&
          !matchesInspector &&
          !matchesNotes &&
          !matchesService
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, statusFilter, shiftFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredItems.length;
    const completed = filteredItems.filter(
      (i) => i.status === "Completed"
    ).length;
    const inProgress = filteredItems.filter(
      (i) => i.status === "In Progress"
    ).length;
    const scheduled = filteredItems.filter(
      (i) => i.status === "Scheduled"
    ).length;
    const pending = filteredItems.filter(
      (i) => i.status === "Pending"
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, scheduled, pending, completionRate };
  }, [filteredItems]);

  const siteLabel =
    selectedSite === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur";
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

  // Handle Export PDF via html2canvas-pro & jsPDF
  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExporting(true);
      setExportProgress("Menyiapkan dokumen rekap...");

      const el = printAreaRef.current;
      setExportProgress("Merender layout dokumen ke grafis kanvas...");

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
        // Multi-page slicing
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
      const cleanRange = dateRangeText.replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`Laporan_Detail_Periodic_Inspection_${cleanSite}_${cleanRange}.pdf`);
    } catch (err: any) {
      console.error("Gagal mengekspor PDF:", err);
      alert("Terjadi kesalahan saat mengekspor PDF: " + (err?.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Handle Browser Native Print
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
          #periodic-inspection-detail-printable,
          #periodic-inspection-detail-printable * {
            visibility: visible;
          }
          #periodic-inspection-detail-printable {
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
                  Periode: {dateRangeText}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Export PDF &amp; Cetak Laporan Detail Periodic Inspection (PI)
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
              disabled={isExporting || filteredItems.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d84818] text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <FileDown size={14} />
              <span>{isExporting ? exportProgress || "Memproses PDF..." : "Download PDF"}</span>
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

        {/* Filter Controls Bar (Hidden on Print) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500">Status:</span>
              {(["ALL", "Completed", "In Progress", "Scheduled", "Pending"] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st === "ALL" ? "Semua Status" : st}
                  </button>
                )
              )}
            </div>

            {/* Shift Filter */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="font-bold text-slate-500">Shift:</span>
              {(["ALL", "Shift 1", "Shift 2"] as const).map((sh) => (
                <button
                  key={sh}
                  type="button"
                  onClick={() => setShiftFilter(sh)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    shiftFilter === sh
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {sh === "ALL" ? "Semua Shift" : sh}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-64">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari kode unit / inspector / catatan..."
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

        {/* Printable Document Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 print:p-0 print:bg-white">
          <div
            id="periodic-inspection-detail-printable"
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
                    PLANT &amp; MAINTENANCE DEPARTMENT &bull; PERIODIC INSPECTION (PI)
                  </span>
                  <span className="text-xs font-bold text-slate-600 block mt-0.5">
                    LAPORAN DETAIL PELAKSANAAN INSPEKSI ARMADA HAULING &amp; SUPPORT
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] font-semibold text-slate-600 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs mb-1.5">
                  <Building2 size={12} />
                  <span>{siteLabel.toUpperCase()}</span>
                </div>
                <div>
                  <strong>Periode:</strong> {dateRangeText}
                </div>
                <div>
                  <strong>Waktu Cetak:</strong> {printTimestamp}
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-4 gap-3 my-4">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Total Unit Terjadwal
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {stats.total} <span className="text-xs font-semibold text-slate-500">Unit</span>
                  </span>
                </div>
                <Layers size={22} className="text-slate-400" />
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Selesai (Completed)
                  </span>
                  <span className="text-xl font-black text-emerald-800">
                    {stats.completed}{" "}
                    <span className="text-xs font-semibold text-emerald-600">
                      ({stats.completionRate}%)
                    </span>
                  </span>
                </div>
                <CheckCircle2 size={22} className="text-emerald-500" />
              </div>

              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">
                    Sedang Berjalan (Progress)
                  </span>
                  <span className="text-xl font-black text-amber-800">
                    {stats.inProgress}{" "}
                    <span className="text-xs font-semibold text-amber-600">Unit</span>
                  </span>
                </div>
                <Sparkles size={22} className="text-amber-500" />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Scheduled / Pending
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    {stats.scheduled + stats.pending}{" "}
                    <span className="text-xs font-semibold text-slate-500">Unit</span>
                  </span>
                </div>
                <Calendar size={22} className="text-slate-400" />
              </div>
            </div>

            {/* Main Detail Table */}
            <div className="rounded-xl border border-slate-300 overflow-hidden mb-5">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-800 text-white font-bold uppercase text-[9.5px] tracking-wider">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-8 border-r border-slate-700">No</th>
                    <th className="py-2 px-2.5 w-24 border-r border-slate-700">Tanggal</th>
                    <th className="py-2 px-2 w-16 text-center border-r border-slate-700">Shift</th>
                    <th className="py-2 px-2.5 w-24 border-r border-slate-700">Unit Kepala</th>
                    <th className="py-2 px-2.5 w-28 border-r border-slate-700">Model / Kategori</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">Rangkaian Gandengan (V1, DL, V2)</th>
                    <th className="py-2 px-2 w-20 text-center border-r border-slate-700">Tipe Servis</th>
                    <th className="py-2 px-2.5 w-28 border-r border-slate-700">Inspector / PIC</th>
                    <th className="py-2 px-2 w-24 text-center border-r border-slate-700">Status</th>
                    <th className="py-2 px-2.5 w-36">Catatan / Temuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                        Tidak ada catatan inspeksi pada filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const meta = unitMetaMap.get(item.unitCode.toUpperCase());
                      const isEven = idx % 2 === 1;

                      let statusBadge = (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-slate-100 text-slate-700 border border-slate-300">
                          {item.status}
                        </span>
                      );
                      if (item.status === "Completed") {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Completed
                          </span>
                        );
                      } else if (item.status === "In Progress") {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            In Progress
                          </span>
                        );
                      } else if (item.status === "Pending") {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            Pending
                          </span>
                        );
                      } else if (item.status === "Scheduled") {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                            Scheduled
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={item.id || idx}
                          className={isEven ? "bg-slate-50/70" : "bg-white"}
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <td className="py-2 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-slate-800 whitespace-nowrap border-r border-slate-200">
                            <div>{item.dayName || item.date}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {item.date}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                            {item.shift || "Shift 1"}
                          </td>
                          <td className="py-2 px-2.5 font-black text-slate-900 border-r border-slate-200">
                            {item.unitCode}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 border-r border-slate-200">
                            <span className="font-semibold block text-slate-800">
                              {meta?.brand ? `${meta.brand} ${meta.model || ""}` : meta?.category || "Prime Mover"}
                            </span>
                            <span className="text-[9.5px] text-slate-400">
                              {meta?.category || "Hauling Unit"}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 border-r border-slate-200 font-mono text-[10.5px]">
                            {item.buntutSummary || "-"}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                            {item.serviceType || "PI Regular"}
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-slate-800 border-r border-slate-200">
                            {item.inspectorName || "-"}
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                            {statusBadge}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 text-[10px] leading-snug">
                            {item.notes || "-"}
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
                {/* Signer 1: Inspector */}
                <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-36 text-center relative overflow-hidden">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      {approvalData.inspector.roleTitle}
                    </span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                      {approvalData.inspector.position}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      {approvalData.inspector.department}
                    </span>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    {approvalData.inspector.isApproved ? (
                      <ApprovedStamp dateStr={approvalData.inspector.date} isCompact />
                    ) : (
                      <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 italic">
                        (Belum disahkan)
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-900 block underline">
                      {approvalData.inspector.name}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-semibold">
                      Tgl: {approvalData.inspector.date}
                    </span>
                  </div>
                </div>

                {/* Signer 2: Planner */}
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
                <span>
                  Format Dokumen: BDP-PLT-PI-REP-A4L
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Signers & Pengesahan */}
      {isSignerModalOpen && (
        <SignerEditorModal
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
interface SignerEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PiDetailApprovalData;
  onSave: (newData: PiDetailApprovalData) => void;
  selectedSite: string;
}

const SignerEditorModal: React.FC<SignerEditorModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
  selectedSite,
}) => {
  const [formData, setFormData] = useState<PiDetailApprovalData>(data);

  if (!isOpen) return null;

  const handleChange = (
    signerKey: "inspector" | "planner" | "superintendent",
    field: keyof PiDetailSigner,
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
    key: "inspector" | "planner" | "superintendent";
    title: string;
    sub: string;
  }> = [
    {
      key: "inspector",
      title: "Lead Inspector / Pengawas",
      sub: "Dibuat Oleh",
    },
    {
      key: "planner",
      title: "Maintenance Planner",
      sub: "Diperiksa Oleh",
    },
    {
      key: "superintendent",
      title: "Plant Superintendent",
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
              Pengaturan Tanda Tangan &amp; Pengesahan Dokumen
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
