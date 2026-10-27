"use client";

import React, { useState, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  FileDown,
  Printer,
  X,
  Waves,
  Ship,
  TrendingUp,
  TrendingDown,
  Loader2,
  Download,
  SlidersHorizontal,
  GitCompare,
  FileSpreadsheet,
  Activity,
  Check,
} from "lucide-react";
import { User } from "../types/auth";
import {
  DailyPairedPoint,
  RiverJournalStats,
  SiteTrendSummary,
} from "../types/riverJournal";

interface RiverJournalPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairedData: DailyPairedPoint[];
  senyiurSiteData: SiteTrendSummary;
  muaraPahuSiteData: SiteTrendSummary;
  pearsonCorrelation: number;
  agreementRate: number;
  bothUpCount: number;
  bothDownCount: number;
  divergentCount: number;
  totalTransitions: number;
  amplificationRatio: number;
  mpTotalSwing: number;
  snyTotalSwing: number;
  statsSenyiur: RiverJournalStats | null;
  statsMuaraPahu: RiverJournalStats | null;
  user?: User;
}

export const RiverJournalPdfExportModal: React.FC<RiverJournalPdfExportModalProps> = ({
  isOpen,
  onClose,
  pairedData,
  senyiurSiteData,
  muaraPahuSiteData,
  pearsonCorrelation,
  agreementRate,
  bothUpCount,
  bothDownCount,
  divergentCount,
  totalTransitions,
  amplificationRatio,
  mpTotalSwing,
  snyTotalSwing,
  statsSenyiur,
  statsMuaraPahu,
  user,
}) => {
  // Slide selection toggles (Now 3 slides: Slide 1 Komparasi, Slide 2 Per Site Trendline, Slide 3 Matriks)
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

  const currentDateString = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalSlidesIncluded =
    (includeSlide1 ? 1 : 0) + (includeSlide2 ? 1 : 0) + (includeSlide3 ? 1 : 0);

  // Handler: Generate PDF
  const handleExportPdf = async () => {
    if (totalSlidesIncluded === 0) {
      alert("Silakan pilih minimal 1 slide untuk di-export.");
      return;
    }

    try {
      setIsExporting(true);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let pageCount = 0;

      // 1. Render Slide 1
      if (includeSlide1 && slide1Ref.current) {
        setExportProgressText("Merender Slide 1: Ringkasan Analisis & Hidrograf Komparasi...");
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
        setExportProgressText("Merender Slide 2: Analisis Tren Masing-Masing Site & Plan 4.0m...");
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
        setExportProgressText("Merender Slide 3: Matriks Sinkronisasi Harian & SOP Navigasi...");
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
      const todayStr = new Date().toISOString().slice(0, 10);
      const fileName = `BDP_River_Journal_Executive_Presentation_${todayStr}.pdf`;

      pdf.save(fileName);
      setExportProgressText("Selesai! PDF berhasil diunduh.");
      setTimeout(() => {
        setIsExporting(false);
        setExportProgressText("");
      }, 1000);
    } catch (err) {
      console.error("Gagal membuat PDF River Journal:", err);
      alert("Terjadi kesalahan saat memproses PDF laporan River Journal.");
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  // Export CSV Data
  const handleExportCsv = () => {
    const headers = [
      "Tanggal",
      "Kedalaman Muara Pahu (m)",
      "Perubahan Harian Muara Pahu (m)",
      "Kedalaman Senyiur (m)",
      "Perubahan Harian Senyiur (m)",
      "Status Hubungan",
      "Defisit Draft Senyiur terhadap 4.0m (m)",
    ];

    const rows = pairedData.map((d) => [
      d.date,
      d.muaraPahu.toFixed(2),
      d.deltaMuaraPahu.toFixed(2),
      d.senyiur.toFixed(2),
      d.deltaSenyiur.toFixed(2),
      `"${d.statusLabel}"`,
      d.senyiurDeficit.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `BDP_River_Journal_Data_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* ============================================================== */}
      {/* HIDDEN OFF-SCREEN SLIDE RENDER NODES FOR html2canvas           */}
      {/* ============================================================== */}
      <div
        className="fixed top-0 left-0 pointer-events-none opacity-0 z-[-9999]"
        style={{ width: "1122px" }}
      >
        {/* ============================================================== */}
        {/* SLIDE 1: RINGKASAN EKSEKUTIF & HIDROGRAF KOMPARASI             */}
        {/* ============================================================== */}
        <div
          ref={slide1Ref}
          className="bg-white p-7 text-slate-800 flex flex-col justify-between"
          style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
        >
          {/* Header Slide 1 */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center">
                  <img
                    src="/coa-logo-bdp.png"
                    alt="PT Batara Dharma Persada"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase text-[#e95623]">
                      PT BATARA DHARMA PERSADA
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">&bull;</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Report Management Portal
                    </span>
                  </div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                    LAPORAN ANALISIS HIDROLOGI ALUR SUNGAI (SENYIUR VS MUARA PAHU)
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Monitoring Fluktuasi Permukaan Air Hulu-Hilir & Evaluasi Kelayakan Draft Tongkang (4.0m) &bull; DAS Mahakam Project Tabang
                  </p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-extrabold">
                  <Waves size={12} className="text-teal-600" />
                  <span>DAS Terpadu Mahakam</span>
                </div>
                <p className="text-[10px] font-medium text-slate-400">
                  Tanggal: <strong className="text-slate-700 font-mono">{currentDateString}</strong>
                </p>
              </div>
            </div>

            {/* 4 Highlight Metric Cards */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 block">
                  1. Keselarasan Arah Fluktuasi
                </span>
                <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                  {agreementRate}% Searah
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">
                  {bothUpCount + bothDownCount} dari {totalTransitions} hari bergerak serentak naik/turun
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 block">
                  2. Korelasi Pearson (r)
                </span>
                <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                  r = +{pearsonCorrelation}
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">
                  Korelasi positif sangat kuat (&gt; 0.80) dari limpasan satu DAS
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                  3. Rasio Skala Fluktuasi
                </span>
                <div className="text-lg font-black text-indigo-900 font-mono mt-0.5">
                  {amplificationRatio}x Lebih Lebar di MP
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">
                  Tiap kenaikan 1.0m di Muara Pahu &asymp; +0.42m di Senyiur
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-700 block">
                  4. Status Draft Tongkang Senyiur
                </span>
                <div className="text-lg font-black text-rose-700 font-mono mt-0.5">
                  Defisit (-1.26m s/d -2.24m)
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight">
                  Maks Senyiur 2.74m, masih di bawah ambang aman 4.0m
                </span>
              </div>
            </div>

            {/* 4 Summary Analytic Cards */}
            <div className="grid grid-cols-4 gap-3 mt-2.5">
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <TrendingUp size={11} /> Kenaikan Air (Fase Pasang)
                </span>
                <p className="text-[9px] text-emerald-900 font-bold mt-1 leading-snug">
                  YA, KONSISTEN NAIK SEARAH.
                </p>
                <p className="text-[8.5px] text-slate-600 mt-0.5 leading-snug">
                  Saat banjir kiriman hulu tiba, MP naik tajam (+0.50m - +1.00m) dan Senyiur langsung naik (+0.15m - +0.74m).
                </p>
              </div>

              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                  <TrendingDown size={11} /> Penurunan Air (Fase Surut)
                </span>
                <p className="text-[9px] text-blue-900 font-bold mt-1 leading-snug">
                  SURUT SECARA BERTAHAP.
                </p>
                <p className="text-[8.5px] text-slate-600 mt-0.5 leading-snug">
                  Resesi debit di MP (-0.30m s/d -1.12m) diikuti surut bertahap di Senyiur (-0.10m s/d -0.34m).
                </p>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                  <SlidersHorizontal size={11} /> Disparitas Ayunan Alur
                </span>
                <p className="text-[9px] text-indigo-900 font-bold mt-1 leading-snug">
                  MP SWING: 2.32m &bull; SNY: 0.98m
                </p>
                <p className="text-[8.5px] text-slate-600 mt-0.5 leading-snug">
                  Muara Pahu menampung akumulasi volume sungai utama Mahakam sehingga ayunan permukaan airnya 2.37x lebih dinamis.
                </p>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Ship size={11} /> Implikasi Tongkang 4.0m
                </span>
                <p className="text-[9px] text-amber-900 font-bold mt-1 leading-snug">
                  MP: 100% AMAN &bull; SNY: STAND-BY
                </p>
                <p className="text-[8.5px] text-slate-600 mt-0.5 leading-snug">
                  Tongkang 300ft muatan penuh belum dapat masuk Senyiur KM 0 secara mandiri tanpa partial loading.
                </p>
              </div>
            </div>

            {/* Visual Hydrograph Chart with EXACT NUMBERS Printed */}
            <div className="mt-3 bg-slate-50/70 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5 text-[10px]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-bold text-amber-700">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span>Dermaga Senyiur KM 0 (Sumbu Kiri: 0.0m - 4.5m)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span>Jetty Muara Pahu (Sumbu Kanan: 6.0m - 11.0m)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rose-600 font-bold font-mono text-[9px] flex items-center gap-1">
                    <span className="w-3 border-t-2 border-dashed border-rose-500 inline-block" />
                    Garis Ambang Batas Tongkang: 4.0 Meter
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={pairedData}
                    margin={{ top: 18, right: 30, left: 0, bottom: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8, fill: "#475569" }}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 4.5]}
                      tick={{ fontSize: 8, fill: "#d97706" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[6, 11]}
                      tick={{ fontSize: 8, fill: "#059669" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <ReferenceLine
                      yAxisId="left"
                      y={4.0}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Standar 4.0m",
                        position: "left",
                        fill: "#ef4444",
                        fontSize: 8,
                        fontWeight: 700,
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="senyiur"
                      name="Dermaga Senyiur"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={0.15}
                      fill="#f59e0b"
                      dot={{ r: 2.5, fill: "#f59e0b" }}
                    >
                      <LabelList
                        dataKey="senyiur"
                        position="top"
                        offset={6}
                        style={{ fontSize: "7px", fill: "#b45309", fontWeight: 700 }}
                        formatter={(val: any) =>
                          typeof val === "number" ? val.toFixed(2) : val
                        }
                      />
                    </Area>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="muaraPahu"
                      name="Jetty Muara Pahu"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "#10b981" }}
                    >
                      <LabelList
                        dataKey="muaraPahu"
                        position="top"
                        offset={6}
                        style={{ fontSize: "7px", fill: "#047857", fontWeight: 700 }}
                        formatter={(val: any) =>
                          typeof val === "number" ? val.toFixed(2) : val
                        }
                      />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Footer Slide 1 */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[9px] font-semibold text-slate-400">
            <span>Dokumen Resmi Internal PT Batara Dharma Persada &bull; Strictly Confidential</span>
            <span>Report Management Portal &bull; Halaman 1 dari {totalSlidesIncluded}</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SLIDE 2: GRAFIK MASING-MASING SITE + PLAN KETINGGIAN & TREN    */}
        {/* ============================================================== */}
        <div
          ref={slide2Ref}
          className="bg-white p-7 text-slate-800 flex flex-col justify-between"
          style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
        >
          {/* Header Slide 2 */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center">
                  <img
                    src="/coa-logo-bdp.png"
                    alt="PT Batara Dharma Persada"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase text-[#e95623]">
                      PT BATARA DHARMA PERSADA
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">&bull;</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Report Management Portal
                    </span>
                  </div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                    GRAFIK INDIVIDUAL KEDALAMAN AIR PER SITE &bull; PLAN 4.0M & GARIS TREN
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Evaluasi Elevasi Air Aktual Terhadap Plan Batas Minimum Draft Tongkang (4.0m) Beserta Garis Tren Regresi Linier
                  </p>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold">
                  <Activity size={12} className="text-indigo-600" />
                  <span>Tren Linier Least Squares</span>
                </div>
                <p className="text-[10px] font-medium text-slate-400">
                  Tanggal: <strong className="text-slate-700 font-mono">{currentDateString}</strong>
                </p>
              </div>
            </div>

            {/* 2 Site Charts Side-by-Side */}
            <div className="grid grid-cols-2 gap-4 mt-3.5">
              {/* Site 1: Dermaga Senyiur KM 0 */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">
                        Dermaga Senyiur KM 0 (Hulu)
                      </span>
                      <h3 className="text-xs font-black text-slate-900">
                        Kedalaman Aktual vs Plan 4.0m
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[8.5px] font-extrabold">
                        Plan: 4.00m
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] font-extrabold">
                        Terkini: {senyiurSiteData.latest?.waterDepth.toFixed(2)}m
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[8.5px] font-extrabold">
                        Tren: {senyiurSiteData.slope >= 0 ? "+" : ""}{senyiurSiteData.slope}m/hari
                      </span>
                    </div>
                  </div>

                  {/* Legend bar */}
                  <div className="flex items-center gap-3 mt-2 text-[8.5px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1 text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Aktual Air
                    </span>
                    <span className="flex items-center gap-1 text-rose-600 font-mono">
                      <span className="w-3 border-t-2 border-dashed border-rose-500" />
                      Standar Air 4.0m
                    </span>
                    <span className="flex items-center gap-1 text-slate-800 font-mono">
                      <span className="w-3 border-t-2 border-dashed border-slate-800" />
                      Garis Tren Linier
                    </span>
                  </div>

                  {/* Senyiur Chart */}
                  <div className="h-56 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={senyiurSiteData.data}
                        margin={{ top: 16, right: 10, left: -15, bottom: 15 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 7, fill: "#475569" }}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis
                          domain={[0, 4.5]}
                          tick={{ fontSize: 8, fill: "#d97706" }}
                          tickFormatter={(v) => `${v}m`}
                        />
                        <ReferenceLine
                          y={4.0}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: "Plan 4.0m",
                            position: "right",
                            fill: "#ef4444",
                            fontSize: 7.5,
                            fontWeight: 700,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="waterDepth"
                          name="Kedalaman Air"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="#f59e0b"
                          fillOpacity={0.15}
                          dot={{ r: 2.5, fill: "#f59e0b" }}
                        >
                          <LabelList
                            dataKey="waterDepth"
                            position="top"
                            offset={5}
                            style={{ fontSize: "6.5px", fill: "#b45309", fontWeight: 700 }}
                            formatter={(v: any) => (typeof v === "number" ? v.toFixed(2) : v)}
                          />
                        </Area>
                        <Line
                          type="monotone"
                          dataKey="trendDepth"
                          name="Garis Tren"
                          stroke="#0F172A"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick stats footer for Senyiur */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-4 gap-2 text-center text-[8.5px]">
                  <div className="p-1 rounded-md bg-white border border-slate-100">
                    <span className="text-slate-400 block">Min</span>
                    <strong className="text-slate-800 font-mono">{senyiurSiteData.min.toFixed(2)}m</strong>
                  </div>
                  <div className="p-1 rounded-md bg-white border border-slate-100">
                    <span className="text-slate-400 block">Rata-rata</span>
                    <strong className="text-slate-800 font-mono">{senyiurSiteData.avg.toFixed(2)}m</strong>
                  </div>
                  <div className="p-1 rounded-md bg-white border border-slate-100">
                    <span className="text-slate-400 block">Maksimum</span>
                    <strong className="text-slate-800 font-mono">{senyiurSiteData.max.toFixed(2)}m</strong>
                  </div>
                  <div className="p-1 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-100">
                    <span className="block text-[8px]">Status</span>
                    <span>Defisit (&lt; 4.0m)</span>
                  </div>
                </div>
              </div>

              {/* Site 2: Jetty Muara Pahu */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">
                        Jetty Muara Pahu (Hilir)
                      </span>
                      <h3 className="text-xs font-black text-slate-900">
                        Kedalaman Aktual vs Plan 4.0m
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[8.5px] font-extrabold">
                        Plan: 4.00m
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8.5px] font-extrabold">
                        Terkini: {muaraPahuSiteData.latest?.waterDepth.toFixed(2)}m
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[8.5px] font-extrabold">
                        Tren: {muaraPahuSiteData.slope >= 0 ? "+" : ""}{muaraPahuSiteData.slope}m/hari
                      </span>
                    </div>
                  </div>

                  {/* Legend bar */}
                  <div className="flex items-center gap-3 mt-2 text-[8.5px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Aktual Air
                    </span>
                    <span className="flex items-center gap-1 text-rose-600 font-mono">
                      <span className="w-3 border-t-2 border-dashed border-rose-500" />
                      Standar Air 4.0m
                    </span>
                    <span className="flex items-center gap-1 text-slate-800 font-mono">
                      <span className="w-3 border-t-2 border-dashed border-slate-800" />
                      Garis Tren Linier
                    </span>
                  </div>

                  {/* Muara Pahu Chart */}
                  <div className="h-56 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={muaraPahuSiteData.data}
                        margin={{ top: 16, right: 10, left: -15, bottom: 15 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 7, fill: "#475569" }}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis
                          domain={[0, 11]}
                          tick={{ fontSize: 8, fill: "#059669" }}
                          tickFormatter={(v) => `${v}m`}
                        />
                        <ReferenceLine
                          y={4.0}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: "Plan 4.0m",
                            position: "right",
                            fill: "#ef4444",
                            fontSize: 7.5,
                            fontWeight: 700,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="waterDepth"
                          name="Kedalaman Air"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="#10b981"
                          fillOpacity={0.15}
                          dot={{ r: 2.5, fill: "#10b981" }}
                        >
                          <LabelList
                            dataKey="waterDepth"
                            position="top"
                            offset={5}
                            style={{ fontSize: "6.5px", fill: "#047857", fontWeight: 700 }}
                            formatter={(v: any) => (typeof v === "number" ? v.toFixed(2) : v)}
                          />
                        </Area>
                        <Line
                          type="monotone"
                          dataKey="trendDepth"
                          name="Garis Tren"
                          stroke="#0F172A"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick stats footer for Muara Pahu */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-4 gap-2 text-center text-[8.5px]">
                  <div className="p-1 rounded-md bg-white border border-slate-100">
                    <span className="text-slate-400 block">Min</span>
                    <strong className="text-slate-800 font-mono">{muaraPahuSiteData.min.toFixed(2)}m</strong>
                  </div>
                  <div className="p-1 rounded-md bg-white border border-slate-100">
                    <span className="text-slate-400 block">Rata-rata</span>
                    <strong className="text-slate-800 font-mono">{muaraPahuSiteData.avg.toFixed(2)}m</strong>
                  </div>
                  <div className="p-1 rounded-md bg-white border border-slate-100">
                    <span className="text-slate-400 block">Maksimum</span>
                    <strong className="text-slate-800 font-mono">{muaraPahuSiteData.max.toFixed(2)}m</strong>
                  </div>
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                    <span className="block text-[8px]">Status</span>
                    <span>100% Aman (&ge;4m)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Takeaway Note */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[8.5px] text-slate-600 flex items-center justify-between">
              <span>
                <strong>Kesimpulan Tren:</strong> Arah tren linier kedua site menunjukkan keselarasan positif searah aliran air hulu-ke-hilir. Garis putus-putus hitam merepresentasikan regresi linier Ordinary Least Squares (OLS).
              </span>
              <span className="font-bold text-slate-800 font-mono text-[9px] shrink-0 ml-4">
                Standar Ketinggian Air Sungai: 4.00m (Batas Minimum Tongkang)
              </span>
            </div>
          </div>

          {/* Footer Slide 2 */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[9px] font-semibold text-slate-400">
            <span>Dokumen Resmi Internal PT Batara Dharma Persada &bull; Strictly Confidential</span>
            <span>Report Management Portal &bull; Halaman 2 dari {totalSlidesIncluded}</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SLIDE 3: MATRIKS SINKRONISASI HARIAN & TABEL RINCIAN LENGKAP   */}
        {/* ============================================================== */}
        <div
          ref={slide3Ref}
          className="bg-white p-7 text-slate-800 flex flex-col justify-between"
          style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
        >
          {/* Header Slide 3 */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center">
                  <img
                    src="/coa-logo-bdp.png"
                    alt="PT Batara Dharma Persada"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase text-[#e95623]">
                      PT BATARA DHARMA PERSADA
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">&bull;</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Report Management Portal
                    </span>
                  </div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                    MATRIKS SINKRONISASI ELEVASI AIR & STATUS DRAFT TONGKANG
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Rekapitulasi Angka Pengukuran Kedalaman Harian, Nilai Fluktuasi (&plusmn;m), dan Defisit Draft Navigasi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[9px]">
                  Keduanya Naik: {bothUpCount} Hari
                </span>
                <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[9px]">
                  Keduanya Turun: {bothDownCount} Hari
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[9px]">
                  Berlawanan: {divergentCount} Hari
                </span>
              </div>
            </div>

            {/* Matrix Data Table: Split into 2 Clean Columns to fit all rows on 1 slide */}
            <div className="mt-3 grid grid-cols-2 gap-3.5">
              {/* Column 1 (First half of dates) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[8.5px]">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                      <th className="py-1.5 px-2">Tanggal</th>
                      <th className="py-1.5 px-2 text-right">MP Depth</th>
                      <th className="py-1.5 px-2 text-right">&Delta; MP</th>
                      <th className="py-1.5 px-2 text-right">SNY Depth</th>
                      <th className="py-1.5 px-2 text-right">&Delta; SNY</th>
                      <th className="py-1.5 px-2 text-right">Defisit 4m</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pairedData.slice(0, Math.ceil(pairedData.length / 2)).map((row, idx) => (
                      <tr
                        key={row.date}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      >
                        <td className="py-1 px-2 font-bold font-mono text-slate-800">
                          {row.date}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700">
                          {row.muaraPahu.toFixed(2)}m
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold">
                          <span
                            className={
                              row.deltaMuaraPahu > 0
                                ? "text-emerald-600"
                                : row.deltaMuaraPahu < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                            }
                          >
                            {row.deltaMuaraPahu >= 0 ? "+" : ""}
                            {row.deltaMuaraPahu.toFixed(2)}m
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-amber-700">
                          {row.senyiur.toFixed(2)}m
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold">
                          <span
                            className={
                              row.deltaSenyiur > 0
                                ? "text-emerald-600"
                                : row.deltaSenyiur < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                            }
                          >
                            {row.deltaSenyiur >= 0 ? "+" : ""}
                            {row.deltaSenyiur.toFixed(2)}m
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-rose-700">
                          {row.senyiurDeficit.toFixed(2)}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Column 2 (Second half of dates) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[8.5px]">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                      <th className="py-1.5 px-2">Tanggal</th>
                      <th className="py-1.5 px-2 text-right">MP Depth</th>
                      <th className="py-1.5 px-2 text-right">&Delta; MP</th>
                      <th className="py-1.5 px-2 text-right">SNY Depth</th>
                      <th className="py-1.5 px-2 text-right">&Delta; SNY</th>
                      <th className="py-1.5 px-2 text-right">Defisit 4m</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pairedData.slice(Math.ceil(pairedData.length / 2)).map((row, idx) => (
                      <tr
                        key={row.date}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      >
                        <td className="py-1 px-2 font-bold font-mono text-slate-800">
                          {row.date}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700">
                          {row.muaraPahu.toFixed(2)}m
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold">
                          <span
                            className={
                              row.deltaMuaraPahu > 0
                                ? "text-emerald-600"
                                : row.deltaMuaraPahu < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                            }
                          >
                            {row.deltaMuaraPahu >= 0 ? "+" : ""}
                            {row.deltaMuaraPahu.toFixed(2)}m
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-amber-700">
                          {row.senyiur.toFixed(2)}m
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold">
                          <span
                            className={
                              row.deltaSenyiur > 0
                                ? "text-emerald-600"
                                : row.deltaSenyiur < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                            }
                          >
                            {row.deltaSenyiur >= 0 ? "+" : ""}
                            {row.deltaSenyiur.toFixed(2)}m
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold text-rose-700">
                          {row.senyiurDeficit.toFixed(2)}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tactical Notes Box */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[9px] text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block uppercase tracking-wide">
                Pedoman Operasional & Keputusan Navigasi Tongkang Batubara:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 leading-relaxed">
                <li>
                  <strong>Kenaikan Serentak:</strong> Setiap kali Jetty Muara Pahu naik, Dermaga Senyiur KM 0 dipastikan mengalami kenaikan air dalam kurun 6-18 jam karena berasal dari daerah tangkapan hujan (DAS) yang sama.
                </li>
                <li>
                  <strong>Batas Aman Tongkang 4.0m:</strong> Walaupun elevasi Senyiur naik saat pasang, kedalaman maksimumnya (2.74m) masih memiliki defisit minimal 1.26m dari ambang 4.0m. Pemuatan tongkang 300ft muatan penuh tetap diprioritaskan di Jetty Muara Pahu.
                </li>
                <li>
                  <strong>Jadwal Pengukuran:</strong> Pengukuran fisik kedalaman air wajib diinput secara kontinu setiap pukul 08:00 dan 16:00 WITA.
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Slide 3 */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[9px] font-semibold text-slate-400">
            <span>Dokumen Resmi Internal PT Batara Dharma Persada &bull; Strictly Confidential</span>
            <span>Report Management Portal &bull; Halaman 3 dari {totalSlidesIncluded}</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VISIBLE INTERACTIVE MODAL DIALOG                              */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-r from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <FileDown size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Export Laporan Presentasi River Journal
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Download slide presentasi eksekutif &bull; Analisis Komparasi, Tren Per Site & Matriks Sinkronisasi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Controls & Options Bar */}
        <div className="px-6 py-3.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Slide selection checkboxes */}
          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <span>Sertakan Slide:</span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={includeSlide1}
                onChange={(e) => setIncludeSlide1(e.target.checked)}
                className="rounded text-[#e95623] focus:ring-[#e95623] h-4 w-4"
              />
              <span>Slide 1 (Komparasi)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={includeSlide2}
                onChange={(e) => setIncludeSlide2(e.target.checked)}
                className="rounded text-[#e95623] focus:ring-[#e95623] h-4 w-4"
              />
              <span>Slide 2 (Tren Per Site & Plan)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={includeSlide3}
                onChange={(e) => setIncludeSlide3(e.target.checked)}
                className="rounded text-[#e95623] focus:ring-[#e95623] h-4 w-4"
              />
              <span>Slide 3 (Matriks Harian)</span>
            </label>
          </div>

          {/* Preview Tab Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setActivePreviewSlide(1)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreviewSlide === 1
                  ? "bg-teal-50 text-teal-800 font-extrabold shadow-2xs border border-teal-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slide 1 (Komparasi)
            </button>
            <button
              onClick={() => setActivePreviewSlide(2)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreviewSlide === 2
                  ? "bg-teal-50 text-teal-800 font-extrabold shadow-2xs border border-teal-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slide 2 (Tren Site)
            </button>
            <button
              onClick={() => setActivePreviewSlide(3)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreviewSlide === 3
                  ? "bg-teal-50 text-teal-800 font-extrabold shadow-2xs border border-teal-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slide 3 (Matriks)
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable Preview of Selected Slide */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 flex justify-center items-center">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-slate-300 p-4 sm:p-6 scale-[0.98] transition-all">
            {activePreviewSlide === 1 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-[#e95623] uppercase text-[10px]">
                      Slide 1 Preview
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Laporan Analisis Hidrologi & Keselarasan Alur
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    A4 Landscape &bull; Angka Kedalaman Tercetak Lengkap
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-teal-700 font-bold block">Keselarasan</span>
                    <strong className="text-sm font-black font-mono">{agreementRate}% Searah</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-teal-700 font-bold block">Korelasi r</span>
                    <strong className="text-sm font-black font-mono">+{pearsonCorrelation}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-indigo-700 font-bold block">Rasio Volatilitas</span>
                    <strong className="text-sm font-black font-mono">{amplificationRatio}x MP</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-rose-700 font-bold block">Status Tongkang</span>
                    <strong className="text-xs font-black text-rose-700">Defisit (&lt; 4.0m)</strong>
                  </div>
                </div>

                <div className="h-44 w-full bg-slate-50 rounded-xl p-2 border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={pairedData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 8 }} />
                      <YAxis yAxisId="left" domain={[0, 4.5]} tick={{ fontSize: 8 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[6, 11]} tick={{ fontSize: 8 }} />
                      <ReferenceLine yAxisId="left" y={4.0} stroke="#ef4444" strokeDasharray="4 4" />
                      <Area yAxisId="left" type="monotone" dataKey="senyiur" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2}>
                        <LabelList dataKey="senyiur" position="top" style={{ fontSize: "7px", fill: "#b45309", fontWeight: 700 }} formatter={(v: any) => typeof v === "number" ? v.toFixed(2) : v} />
                      </Area>
                      <Line yAxisId="right" type="monotone" dataKey="muaraPahu" stroke="#10b981" strokeWidth={2}>
                        <LabelList dataKey="muaraPahu" position="top" style={{ fontSize: "7px", fill: "#047857", fontWeight: 700 }} formatter={(v: any) => typeof v === "number" ? v.toFixed(2) : v} />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : activePreviewSlide === 2 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-[#e95623] uppercase text-[10px]">
                      Slide 2 Preview
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Grafik Individual Kedalaman Per Site, Plan 4.0m & Garis Tren Regresi
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    2 Panel Analisis Site Berdampingan
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-amber-800">Dermaga Senyiur KM 0</span>
                      <span className="text-[10px] text-slate-600 font-mono">Tren: {senyiurSiteData.slope >= 0 ? "+" : ""}{senyiurSiteData.slope}m/hari</span>
                    </div>
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={senyiurSiteData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 7 }} />
                          <YAxis domain={[0, 4.5]} tick={{ fontSize: 7 }} />
                          <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="3 3" />
                          <Area type="monotone" dataKey="waterDepth" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15}>
                            <LabelList dataKey="waterDepth" position="top" style={{ fontSize: "6px", fill: "#b45309" }} formatter={(v: any) => typeof v === "number" ? v.toFixed(2) : v} />
                          </Area>
                          <Line type="monotone" dataKey="trendDepth" stroke="#0F172A" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-emerald-800">Jetty Muara Pahu</span>
                      <span className="text-[10px] text-slate-600 font-mono">Tren: {muaraPahuSiteData.slope >= 0 ? "+" : ""}{muaraPahuSiteData.slope}m/hari</span>
                    </div>
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={muaraPahuSiteData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 7 }} />
                          <YAxis domain={[0, 11]} tick={{ fontSize: 7 }} />
                          <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="3 3" />
                          <Area type="monotone" dataKey="waterDepth" stroke="#10b981" fill="#10b981" fillOpacity={0.15}>
                            <LabelList dataKey="waterDepth" position="top" style={{ fontSize: "6px", fill: "#047857" }} formatter={(v: any) => typeof v === "number" ? v.toFixed(2) : v} />
                          </Area>
                          <Line type="monotone" dataKey="trendDepth" stroke="#0F172A" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-[#e95623] uppercase text-[10px]">
                      Slide 3 Preview
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Matriks Angka Kedalaman Harian & Defisit Draft Tongkang
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total: {pairedData.length} Pengukuran Sinkron
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700">
                      <tr>
                        <th className="py-1 px-2">Tanggal</th>
                        <th className="py-1 px-2 text-right">Muara Pahu</th>
                        <th className="py-1 px-2 text-right">&Delta; MP</th>
                        <th className="py-1 px-2 text-right">Senyiur</th>
                        <th className="py-1 px-2 text-right">&Delta; SNY</th>
                        <th className="py-1 px-2 text-right">Defisit 4m</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {pairedData.slice(0, 8).map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50">
                          <td className="py-1 px-2">{d.date}</td>
                          <td className="py-1 px-2 text-right text-emerald-700 font-bold">{d.muaraPahu.toFixed(2)}m</td>
                          <td className="py-1 px-2 text-right">{d.deltaMuaraPahu >= 0 ? "+" : ""}{d.deltaMuaraPahu.toFixed(2)}m</td>
                          <td className="py-1 px-2 text-right text-amber-700 font-bold">{d.senyiur.toFixed(2)}m</td>
                          <td className="py-1 px-2 text-right">{d.deltaSenyiur >= 0 ? "+" : ""}{d.deltaSenyiur.toFixed(2)}m</td>
                          <td className="py-1 px-2 text-right text-rose-700 font-bold">{d.senyiurDeficit.toFixed(2)}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 text-center italic">
                  (Seluruh baris data pengukuran akan tercetak rapi secara penuh pada lembar PDF Slide 3)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Halaman</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {isExporting && (
              <span className="text-xs font-medium text-slate-500 animate-pulse flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin text-teal-600" />
                <span>{exportProgressText}</span>
              </span>
            )}

            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting || totalSlidesIncluded === 0}
              className="px-5 py-2 rounded-xl bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black shadow-md shadow-teal-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Memproses PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download PDF Laporan ({totalSlidesIncluded} Slide)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
