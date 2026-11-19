"use client";

import React, { useState, useRef, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  X,
  FileDown,
  Printer,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Layers,
  Search,
} from "lucide-react";
import { HazardReportItem } from "../services/sheService";

export interface HazardReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  hazards: HazardReportItem[];
  selectedSite: "MuaraPahu" | "Senyiur" | "ALL";
  dateRangeText?: string;
}

export const HazardReportPdfModal: React.FC<HazardReportPdfModalProps> = ({
  isOpen,
  onClose,
  hazards,
  selectedSite,
  dateRangeText,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [jenisFilter, setJenisFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    return hazards.filter((h) => {
      const statusG = (h.statusGForm || (h.status === "Closed" ? "CLOSE" : "OPEN")).toUpperCase();
      if (statusFilter !== "ALL" && statusG !== statusFilter.toUpperCase()) return false;

      const jenis = (h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA")).toUpperCase();
      if (jenisFilter !== "ALL" && jenis !== jenisFilter.toUpperCase()) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = (h.identifikasiBahaya || h.title || "").toLowerCase().includes(q);
        const mLoc = (h.lokasiBahaya || h.location || "").toLowerCase().includes(q);
        const mRep = (h.namaPelapor || h.reporterName || "").toLowerCase().includes(q);
        const mPj = (h.penanggungJawabArea || h.picName || "").toLowerCase().includes(q);
        const mNrp = (h.nrpPelapor || "").toLowerCase().includes(q);
        if (!mTitle && !mLoc && !mRep && !mPj && !mNrp) return false;
      }
      return true;
    });
  }, [hazards, statusFilter, jenisFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    const closed = filteredItems.filter((i) => i.statusGForm === "CLOSE" || i.status === "Closed").length;
    const open = total - closed;
    const kta = filteredItems.filter((i) => (i.jenisPelaporan || (i.category === "Unsafe Action" ? "TTA" : "KTA")) === "KTA").length;
    const tta = filteredItems.filter((i) => (i.jenisPelaporan || (i.category === "Unsafe Action" ? "TTA" : "KTA")) === "TTA").length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 100;
    return { total, closed, open, kta, tta, resolutionRate };
  }, [filteredItems]);

  const siteLabel =
    selectedSite === "ALL"
      ? "Semua Site (Muara Pahu & Senyiur)"
      : selectedSite === "MuaraPahu"
      ? "Site Muara Pahu"
      : "Site Senyiur";

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

  const handleExportPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExporting(true);
      setExportProgress("Menyiapkan dokumen Hazard Report...");

      const el = printAreaRef.current;
      setExportProgress("Merender layout dokumen...");

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

      pdf.save(`SHE_Hazard_Report_${selectedSite}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error("Gagal mengekspor PDF:", err);
      alert("Terjadi kesalahan saat mengekspor PDF: " + (err?.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #hazard-report-printable,
          #hazard-report-printable * {
            visibility: visible;
          }
          #hazard-report-printable {
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
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-[#e95623]">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#e95623] text-white">
                  {selectedSite}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  SHE • Safety, Health &amp; Environment
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Export PDF &amp; Cetak Laporan Temuan Bahaya (Hazard Report)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
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
              <span>{isExporting ? exportProgress || "Memproses..." : "Download PDF"}</span>
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

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500">Status:</span>
              {[
                { id: "ALL", label: "Semua" },
                { id: "OPEN", label: "OPEN" },
                { id: "CLOSE", label: "CLOSE" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Jenis Pelaporan Filter */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="font-bold text-slate-500">Jenis:</span>
              {[
                { id: "ALL", label: "Semua" },
                { id: "KTA", label: "KTA" },
                { id: "TTA", label: "TTA" },
              ].map((jn) => (
                <button
                  key={jn.id}
                  type="button"
                  onClick={() => setJenisFilter(jn.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    jenisFilter === jn.id
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {jn.label}
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
              placeholder="Cari hazard / lokasi / pelapor..."
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
            id="hazard-report-printable"
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
                    SAFETY, HEALTH &amp; ENVIRONMENT (SHE) DEPARTMENT
                  </span>
                  <span className="text-xs font-bold text-slate-600 block mt-0.5">
                    LAPORAN IDENTIFIKASI BAHAYA &amp; TINDAKAN PENGENDALIAN (HAZARD REPORT)
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] font-semibold text-slate-600 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs mb-1.5">
                  <Building2 size={12} />
                  <span>{siteLabel.toUpperCase()}</span>
                </div>
                <div>
                  <strong>Periode / Tanggal:</strong> {dateRangeText || new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
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
                    Total Temuan Bahaya
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {stats.total}{" "}
                    <span className="text-xs font-semibold text-slate-500">Laporan</span>
                  </span>
                </div>
                <Layers size={22} className="text-slate-400" />
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Status CLOSE (Selesai)
                  </span>
                  <span className="text-xl font-black text-emerald-800">
                    {stats.closed}{" "}
                    <span className="text-xs font-semibold text-emerald-600">
                      ({stats.resolutionRate}%)
                    </span>
                  </span>
                </div>
                <CheckCircle2 size={22} className="text-emerald-500" />
              </div>

              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">
                    Status OPEN (Belum Selesai)
                  </span>
                  <span className="text-xl font-black text-rose-800">
                    {stats.open}{" "}
                    <span className="text-xs font-semibold text-rose-600">Laporan</span>
                  </span>
                </div>
                <AlertTriangle size={22} className="text-rose-500" />
              </div>

              <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-orange-700 uppercase block">
                    Klasifikasi Bahaya
                  </span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">
                    <span className="text-orange-700">{stats.kta} KTA</span> • <span className="text-purple-700">{stats.tta} TTA</span>
                  </span>
                </div>
                <ShieldCheck size={22} className="text-orange-500" />
              </div>
            </div>

            {/* Main Table */}
            <div className="rounded-xl border border-slate-300 overflow-hidden mb-5">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[9.5px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-8 border-r border-slate-700">No</th>
                    <th className="py-2.5 px-2.5 w-26 border-r border-slate-700">No. Hazard</th>
                    <th className="py-2.5 px-2.5 w-20 border-r border-slate-700">Tanggal</th>
                    <th className="py-2.5 px-2 text-center w-14 border-r border-slate-700">Jenis</th>
                    <th className="py-2.5 px-2.5 w-26 border-r border-slate-700">Lokasi Bahaya</th>
                    <th className="py-2.5 px-2.5 w-24 border-r border-slate-700">PJ Area</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 min-w-44">Identifikasi &amp; Rincian Bahaya</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 min-w-40">Tindakan Perbaikan</th>
                    <th className="py-2.5 px-2.5 w-28 border-r border-slate-700">Pelapor</th>
                    <th className="py-2.5 px-2 text-center w-16">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                        Tidak ada laporan bahaya pada kriteria ini.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const isEven = idx % 2 === 1;
                      const isKta = (item.jenisPelaporan || (item.category === "Unsafe Action" ? "TTA" : "KTA")) === "KTA";
                      const isClose = item.statusGForm === "CLOSE" || item.status === "Closed";

                      return (
                        <tr
                          key={item.id}
                          className={isEven ? "bg-slate-50/70" : "bg-white"}
                          style={{ pageBreakInside: "avoid" }}
                        >
                          <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 font-black text-slate-800 border-r border-slate-200 whitespace-nowrap">
                            <div>{item.reportNumber}</div>
                            <div className="text-[9px] font-semibold text-slate-400">
                              {item.project || (item.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU")}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 border-r border-slate-200 whitespace-nowrap text-[10px]">
                            <div>{item.tanggalPelaporan || item.date}</div>
                            <div className="text-slate-400 font-semibold">{item.time || "08:00"} WIB</div>
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            {isKta ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-100 text-[#e95623] border border-orange-200">
                                KTA
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                TTA
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 font-bold text-slate-800 border-r border-slate-200 text-[10px]">
                            {item.lokasiBahaya || item.location}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 font-semibold border-r border-slate-200 text-[10px]">
                            {item.penanggungJawabArea || item.picDept || item.picName || "PLANT"}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block leading-tight mb-0.5">
                              {item.identifikasiBahaya || item.title}
                            </span>
                            {(item.rincianBahaya || item.description) && (
                              <span className="text-[10px] text-slate-600 leading-snug line-clamp-2 block">
                                {item.rincianBahaya || item.description}
                              </span>
                            )}
                            {(item.dokumentasiSebelum || item.photoUrl || item.dokumentasiSesudah || item.evidenceUrl) && (
                              <div className="flex items-center gap-1 mt-1">
                                {(item.dokumentasiSebelum || item.photoUrl) && (
                                  <span className="inline-block text-[8px] font-bold text-[#e95623] bg-orange-50 border border-orange-200 px-1 py-0.2 rounded">
                                    Foto Temuan
                                  </span>
                                )}
                                {(item.dokumentasiSesudah || item.evidenceUrl) && (
                                  <span className="inline-block text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                                    Foto Selesai
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200 text-[10px] text-slate-700 leading-snug">
                            {item.tindakanPerbaikan || item.correctiveAction || "-"}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 text-[10px]">
                            <div className="font-bold text-slate-800">{item.namaPelapor || item.reporterName}</div>
                            {item.nrpPelapor && (
                              <div className="text-[9px] font-mono text-slate-400">NRP: {item.nrpPelapor}</div>
                            )}
                            <div className="text-[9px] text-slate-500">{item.departemenPelapor || item.reporterDept}</div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {isClose ? (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                CLOSE
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                OPEN
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Footer Note */}
            <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-medium">
              <span>
                Dokumen K3L internal operasional armada PT Batara Dharma Persada.
              </span>
              <span>Format Dokumen: BDP-SHE-HIRA-REP-A4L</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
