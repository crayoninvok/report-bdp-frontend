"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  FileDown,
  Printer,
  X,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Eye,
  BarChart3,
  Download,
  AlertTriangle,
} from "lucide-react";
import { JobSite, User } from "../types/auth";
import { CostDriverItem, BebanGroupKey } from "./CostDriverView";

interface CostDriverPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSite: JobSite | "AllSites";
  timeframe: "month" | "week" | "ytd";
  selectedPeriod: string;
  categorySums: any;
  top5ComparisonData: any[];
  top5Drivers: CostDriverItem[];
  allDrivers: CostDriverItem[];
  activePeriodLabel: string;
  user?: User;
}

export const CostDriverPdfExportModal: React.FC<CostDriverPdfExportModalProps> = ({
  isOpen,
  onClose,
  selectedSite,
  timeframe,
  selectedPeriod,
  categorySums,
  top5ComparisonData,
  top5Drivers,
  allDrivers,
  activePeriodLabel,
  user,
}) => {
  // Slide selection toggles
  const [includeSlide1, setIncludeSlide1] = useState(true);
  const [includeSlide2, setIncludeSlide2] = useState(true);
  const [includeSlide3, setIncludeSlide3] = useState(true);

  // Active preview tab (1, 2, or 3)
  const [activePreviewSlide, setActivePreviewSlide] = useState<1 | 2 | 3>(1);

  // Export progress state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressText, setExportProgressText] = useState("");

  // Slide DOM refs
  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);
  const slide3Ref = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const siteLabel =
    selectedSite === "AllSites"
      ? "Konsolidasi All Sites (Muara Pahu & Senyiur)"
      : `Site ${selectedSite === "MuaraPahu" ? "Muara Pahu" : selectedSite}`;

  const currentDateString = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalBudget = categorySums?.total?.budget || 0;
  const totalRealisasi = categorySums?.total?.realisasi || 0;
  const totalVariance = categorySums?.total?.variance || 0;
  const serapanPercent = categorySums?.total?.serapanPercent || 0;
  const isOverBudget = totalVariance > 0;

  // Total slides included count
  const totalSlidesIncluded =
    (includeSlide1 ? 1 : 0) + (includeSlide2 ? 1 : 0) + (includeSlide3 ? 1 : 0);

  // Export PDF presentation in A4 Landscape (297mm x 210mm)
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportProgressText("Menginisialisasi engine PDF landscape presentasi...");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let pageCount = 0;

      // 1. Render Slide 1
      if (includeSlide1 && slide1Ref.current) {
        setExportProgressText("Merender Slide 1: Executive Overview & Komparasi Beban...");
        const canvas1 = await html2canvas(slide1Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const img1 = canvas1.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(img1, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // 2. Render Slide 2
      if (includeSlide2 && slide2Ref.current) {
        setExportProgressText("Merender Slide 2: Peringkat Top 5 Cost Drivers...");
        const canvas2 = await html2canvas(slide2Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const img2 = canvas2.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(img2, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // 3. Render Slide 3
      if (includeSlide3 && slide3Ref.current) {
        setExportProgressText("Merender Slide 3: Direktori Rincian Akun Beban...");
        const canvas3 = await html2canvas(slide3Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const img3 = canvas3.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(img3, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      setExportProgressText("Menyimpan file presentasi PDF...");
      const cleanSite = selectedSite.toLowerCase();
      const fileName = `BDP_Cost_Driver_Presentation_${cleanSite}_${activePeriodLabel.replace(/[\s\(\)\-\.]+/g, "_")}.pdf`;

      pdf.save(fileName);
      setExportProgressText("Selesai! PDF berhasil di-download.");
      setTimeout(() => {
        setIsExporting(false);
        setExportProgressText("");
      }, 1000);
    } catch (err) {
      console.error("Gagal membuat PDF presentasi Cost Driver:", err);
      alert("Terjadi kesalahan saat memproses PDF presentasi.");
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  // Direct window print
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "RANK",
      "KODE_AKUN",
      "NAMA_AKUN",
      "KATEGORI_BEBAN",
      "PERILAKU_BIAYA",
      "BUDGET_TARGET_IDR",
      "REALISASI_AKTUAL_IDR",
      "DEVIASI_VARIANCE_IDR",
      "PERSEN_DEVIASI",
      "PERSEN_SERAPAN",
      "STATUS",
    ];

    const rows = allDrivers.map((item, idx) => [
      idx + 1,
      `"${item.accountCode}"`,
      `"${item.accountName}"`,
      `"${item.bebanLabel}"`,
      item.costBehavior,
      item.budgetCost * 1_000_000,
      item.realisasiCost * 1_000_000,
      item.varianceCost * 1_000_000,
      `${item.variancePercent}%`,
      `${item.serapanPercent}%`,
      item.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Cost_Driver_${selectedSite}_${activePeriodLabel.replace(/[\s\(\)\-\.]+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl max-h-[96vh] flex flex-col bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* MODAL HEADER TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-[#e95623] to-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  Export Slide Presentasi Cost Driver (16:9 Landscape)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  A4 Landscape
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dokumen presentasi eksekutif siap pakai untuk evaluasi manajemen PT Batara Dharma Persada.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              title="Download data tabel ke file CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              title="Cetak langsung menggunakan browser"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting || totalSlidesIncluded === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>{exportProgressText || "Memproses..."}</span>
                </>
              ) : (
                <>
                  <FileDown size={15} className="text-white" />
                  <span>Download PDF Presentasi ({totalSlidesIncluded} Slide)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Tutup dialog"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SUBHEADER: SLIDE CHECKBOXES & PREVIEW TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-xs">
          {/* Checkboxes to include slides */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-400">Pilih Slide:</span>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-200 font-semibold hover:text-white">
              <input
                type="checkbox"
                checked={includeSlide1}
                onChange={(e) => setIncludeSlide1(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
              <span>Slide 1: Overview & Komparasi Beban</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-200 font-semibold hover:text-white">
              <input
                type="checkbox"
                checked={includeSlide2}
                onChange={(e) => setIncludeSlide2(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
              <span>Slide 2: Top 5 Cost Drivers (COA)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-200 font-semibold hover:text-white">
              <input
                type="checkbox"
                checked={includeSlide3}
                onChange={(e) => setIncludeSlide3(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
              <span>Slide 3: Direktori Rincian Akun</span>
            </label>
          </div>

          {/* Slide preview switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 px-2">Preview:</span>
            <button
              type="button"
              onClick={() => setActivePreviewSlide(1)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activePreviewSlide === 1
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Slide 1
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewSlide(2)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activePreviewSlide === 2
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Slide 2
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewSlide(3)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activePreviewSlide === 3
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Slide 3
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT: SLIDE VIEWER CONTAINER */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex items-center justify-center">
          {/* THE 3 HIGH-RESOLUTION SLIDES (1122px x 793px = Landscape A4 ratio) */}
          <div className="relative shadow-2xl rounded-2xl overflow-hidden bg-white text-slate-900 border border-slate-300">
            {/* ============================================================== */}
            {/* SLIDE 1: EXECUTIVE OVERVIEW & KOMPARASI BEBAN                  */}
            {/* ============================================================== */}
            <div
              ref={slide1Ref}
              style={{
                width: "1122px",
                height: "793px",
                display: activePreviewSlide === 1 ? "flex" : "none",
              }}
              className="flex-col justify-between p-8 bg-white select-none print:flex print:m-0"
            >
              {/* Header Slide 1 */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src="/coa-logo-bdp.png"
                      alt="Logo PT Batara Dharma Persada"
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
                        PT BATARA DHARMA PERSADA
                      </h1>
                      <span className="text-[11px] font-bold text-[#e95623] tracking-wide block">
                        COST DRIVER INTELLIGENCE &bull; OPERASIONAL TAMBANG
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-slate-900 text-white tracking-wide">
                      {siteLabel}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-amber-500 text-slate-950 tracking-wide">
                      {activePeriodLabel}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-400">
                    Slide 1 / {totalSlidesIncluded} &bull; {currentDateString}
                  </span>
                </div>

                {/* 4 Executive KPI Cards */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {/* Total Budget */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Plafon Anggaran (Budget)
                    </span>
                    <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                      Rp {(totalBudget / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      Target plafon periode terpilih
                    </span>
                  </div>

                  {/* Total Realisasi */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      Total Realisasi (Aktual)
                    </span>
                    <div className="text-xl font-black text-blue-900 mt-1 font-mono">
                      Rp {(totalRealisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </div>
                    <span className="text-[10px] font-medium text-blue-600">
                      Biaya aktual operasional tambang
                    </span>
                  </div>

                  {/* Deviasi Bersih */}
                  <div
                    className={`border rounded-xl p-3.5 ${
                      !isOverBudget
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-rose-50/70 border-rose-200"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        !isOverBudget ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      Deviasi Bersih (Varian)
                    </span>
                    <div
                      className={`text-xl font-black mt-1 flex items-center gap-1.5 font-mono ${
                        !isOverBudget ? "text-emerald-800" : "text-rose-800"
                      }`}
                    >
                      <span>
                        {totalVariance > 0 ? "+" : ""}
                        {(totalVariance / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-white border">
                        {isOverBudget ? "Over Budget" : "Efisien"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        !isOverBudget ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isOverBudget
                        ? "Realisasi melampaui alokasi budget"
                        : "Realisasi di bawah plafon budget"}
                    </span>
                  </div>

                  {/* Rasio Serapan */}
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      Rasio Serapan Anggaran
                    </span>
                    <div className="text-xl font-black text-indigo-950 mt-1 font-mono">
                      {serapanPercent}%
                    </div>
                    <span className="text-[10px] font-medium text-indigo-600">
                      Persentase realisasi terhadap budget
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Bar Chart & Summary List */}
              <div className="grid grid-cols-12 gap-5 my-3 flex-1 items-stretch">
                {/* Bar Chart (8 cols) */}
                <div className="col-span-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Komparasi Budget vs Realisasi (5 Kategori Beban Utama)
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">Satuan: Juta Rupiah (M)</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={top5ComparisonData}
                        margin={{ top: 20, right: 15, left: 0, bottom: 5 }}
                        barGap={6}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="shortLabel"
                          tick={{ fontSize: 10, fontWeight: 700, fill: "#334155" }}
                        />
                        <YAxis
                          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                          tick={{ fontSize: 10, fill: "#64748B" }}
                          tickFormatter={(v) => `Rp ${(v / 1000).toFixed(0)}M`}
                        />
                        <Tooltip
                          formatter={(val: any) => [
                            `Rp ${(Number(val) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`,
                          ]}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: 6, fontSize: "10px", fontWeight: 700 }}
                        />
                        <Bar
                          dataKey="budget"
                          name="Budget Target"
                          fill="#94A3B8"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        >
                          <LabelList
                            dataKey="budget"
                            position="top"
                            formatter={(val: any) =>
                              val ? `Rp ${(Number(val) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M` : ""
                            }
                            style={{ fontSize: "8px", fontWeight: 700, fill: "#64748B" }}
                          />
                        </Bar>
                        <Bar
                          dataKey="realisasi"
                          name="Realisasi Aktual"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        >
                          {top5ComparisonData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                          <LabelList
                            dataKey="realisasi"
                            position="top"
                            formatter={(val: any) =>
                              val ? `Rp ${(Number(val) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M` : ""
                            }
                            style={{ fontSize: "8px", fontWeight: 800, fill: "#0F172A" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right: Category Performance Summary (4 cols) */}
                <div className="col-span-4 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <Layers size={14} className="text-[#e95623]" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Ringkasan Status Beban
                    </h3>
                  </div>

                  <div className="space-y-2 py-2">
                    {top5ComparisonData.map((item) => (
                      <div
                        key={item.key}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-slate-800 text-[11px]">
                            {item.shortLabel}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Realisasi: Rp {(item.realisasi / 1000).toFixed(1)}M
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                              item.isOver
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.isOver ? `+${item.varPct}%` : `${item.varPct}%`}
                          </span>
                          <div
                            className={`text-[10px] font-bold font-mono mt-0.5 ${
                              item.isOver ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            {item.isOver ? "+" : ""}
                            {(item.variance / 1000).toFixed(1)}M
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 text-center font-semibold">
                    Data tersinkronisasi dengan laporan operasional aktif
                  </div>
                </div>
              </div>

              {/* Footer Slide 1 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-semibold text-slate-400">
                <span>Dokumen Resmi Internal PT Batara Dharma Persada &bull; Strictly Confidential</span>
                <span>Cost Analytics Platform &bull; Halaman 1 dari {totalSlidesIncluded}</span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SLIDE 2: PERINGKAT TOP 5 COST DRIVERS (COA LEVEL)             */}
            {/* ============================================================== */}
            <div
              ref={slide2Ref}
              style={{
                width: "1122px",
                height: "793px",
                display: activePreviewSlide === 2 ? "flex" : "none",
              }}
              className="flex-col justify-between p-8 bg-white select-none print:flex print:m-0"
            >
              {/* Header Slide 2 */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src="/coa-logo-bdp.png"
                      alt="Logo PT Batara Dharma Persada"
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
                        PT BATARA DHARMA PERSADA
                      </h1>
                      <span className="text-[11px] font-bold text-rose-600 tracking-wide block">
                        PERINGKAT TOP 5 COST DRIVERS (PEMICU BIAYA OPERASIONAL UTAMA)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-slate-900 text-white tracking-wide">
                      {siteLabel}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-rose-600 text-white tracking-wide">
                      Pemicu Over Terbesar
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-400">
                    Slide 2 / {totalSlidesIncluded} &bull; {currentDateString}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-900">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>
                      5 Akun COA dengan kontribusi over budget tertinggi yang menjadi fokus prioritas pengendalian efisiensi.
                    </span>
                  </div>
                  <span className="font-mono font-black text-rose-700">
                    Periode: {activePeriodLabel}
                  </span>
                </div>
              </div>

              {/* Middle Section: Top 5 Detail Cards Grid */}
              <div className="grid grid-cols-5 gap-3 my-3 flex-1 items-stretch">
                {top5Drivers.map((driver) => {
                  const isOver = driver.varianceCost > 0;
                  return (
                    <div
                      key={driver.id}
                      className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between shadow-xs"
                    >
                      {/* Top Rank Badge */}
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <span className="h-7 w-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            #{driver.rank}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 font-mono">
                            {driver.costBehavior}
                          </span>
                        </div>

                        {/* COA Code & Name */}
                        <div className="mt-3">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono inline-block mb-1">
                            {driver.accountCode}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                            {driver.accountName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                            {driver.bebanLabel}
                          </span>
                        </div>
                      </div>

                      {/* Financial Numbers */}
                      <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Budget:</span>
                          <span className="font-semibold text-slate-700">
                            Rp {(driver.budgetCost / 1000).toFixed(1)}M
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Realisasi:</span>
                          <span className="font-bold text-slate-900">
                            Rp {(driver.realisasiCost / 1000).toFixed(1)}M
                          </span>
                        </div>
                        <div
                          className={`flex justify-between font-extrabold pt-1.5 border-t border-slate-200 text-xs ${
                            isOver ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          <span>{isOver ? "Over:" : "Hemat:"}</span>
                          <span>
                            {isOver ? "+" : ""}
                            {(driver.varianceCost / 1000).toFixed(1)}M
                          </span>
                        </div>
                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-sans">Serapan:</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              isOver
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {driver.serapanPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Visual Bar: Horizontal Distribution */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Distribusi Deviasi Over Budget Akun Teratas
                </span>
                <div className="space-y-1">
                  {top5Drivers.map((driver) => {
                    const maxOver = top5Drivers[0]?.varianceCost || 1;
                    const pctWidth = Math.max(
                      (driver.varianceCost / maxOver) * 100,
                      8
                    );
                    return (
                      <div key={driver.id} className="flex items-center gap-2 text-[10px]">
                        <span className="w-24 font-bold text-slate-700 truncate font-mono">
                          {driver.accountCode}
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-rose-600 h-full rounded-full transition-all"
                            style={{ width: `${pctWidth}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-bold text-rose-700 font-mono">
                          +Rp {(driver.varianceCost / 1000).toFixed(1)}M
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Slide 2 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-semibold text-slate-400">
                <span>Dokumen Resmi Internal PT Batara Dharma Persada &bull; Strictly Confidential</span>
                <span>Cost Analytics Platform &bull; Halaman 2 dari {totalSlidesIncluded}</span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SLIDE 3: DIREKTORI RINCIAN LENGKAP AKUN BEBAN                 */}
            {/* ============================================================== */}
            <div
              ref={slide3Ref}
              style={{
                width: "1122px",
                height: "793px",
                display: activePreviewSlide === 3 ? "flex" : "none",
              }}
              className="flex-col justify-between p-8 bg-white select-none print:flex print:m-0"
            >
              {/* Header Slide 3 */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src="/coa-logo-bdp.png"
                      alt="Logo PT Batara Dharma Persada"
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <h1 className="text-base font-black tracking-wider text-slate-900 uppercase">
                        PT BATARA DHARMA PERSADA
                      </h1>
                      <span className="text-[11px] font-bold text-indigo-700 tracking-wide block">
                        DIREKTORI RINCIAN AKUN BEBAN BIAYA PRODUKSI (FINANCIAL BREAKDOWN)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-slate-900 text-white tracking-wide">
                      {siteLabel}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white tracking-wide">
                      Total {allDrivers.length} Akun
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-400">
                    Slide 3 / {totalSlidesIncluded} &bull; {currentDateString}
                  </span>
                </div>
              </div>

              {/* Middle Section: Financial Table */}
              <div className="my-3 flex-1 overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-center">
                      <th className="px-2.5 py-2 border border-slate-700 w-10">No</th>
                      <th className="px-3 py-2 border border-slate-700 text-left">Kode & Nama Akun COA</th>
                      <th className="px-2.5 py-2 border border-slate-700 text-left">Kategori Beban</th>
                      <th className="px-2 py-2 border border-slate-700 w-12">Tipe</th>
                      <th className="px-3 py-2 border border-slate-700 text-right">Budget (Rp M)</th>
                      <th className="px-3 py-2 border border-slate-700 text-right">Realisasi (Rp M)</th>
                      <th className="px-3 py-2 border border-slate-700 text-right">Deviasi (Rp M)</th>
                      <th className="px-2 py-2 border border-slate-700 text-center">% Serapan</th>
                      <th className="px-2 py-2 border border-slate-700 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDrivers.slice(0, 14).map((item, idx) => {
                      const isOver = item.varianceCost > 0;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-200 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                          }`}
                        >
                          <td className="px-2.5 py-1.5 border border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 border border-slate-200">
                            <span className="font-mono font-bold text-blue-700 mr-1.5 text-[10px]">
                              {item.accountCode}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {item.accountName}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 border border-slate-200 text-slate-600 truncate">
                            {item.bebanLabel}
                          </td>
                          <td className="px-2 py-1.5 border border-slate-200 text-center font-mono font-semibold text-slate-500">
                            {item.costBehavior}
                          </td>
                          <td className="px-3 py-1.5 border border-slate-200 text-right font-mono text-slate-700">
                            {(item.budgetCost / 1000).toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5 border border-slate-200 text-right font-mono font-bold text-slate-900">
                            {(item.realisasiCost / 1000).toFixed(1)}
                          </td>
                          <td
                            className={`px-3 py-1.5 border border-slate-200 text-right font-mono font-black ${
                              isOver ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            {isOver ? "+" : ""}
                            {(item.varianceCost / 1000).toFixed(1)}
                          </td>
                          <td className="px-2 py-1.5 border border-slate-200 text-center font-mono font-bold text-slate-800">
                            {item.serapanPercent}%
                          </td>
                          <td className="px-2 py-1.5 border border-slate-200 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                isOver
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isOver ? "Over" : "Hemat"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Slide 3 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-semibold text-slate-400">
                <span>Dokumen Resmi Internal PT Batara Dharma Persada &bull; Strictly Confidential</span>
                <span>Cost Analytics Platform &bull; Halaman 3 dari {totalSlidesIncluded}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
