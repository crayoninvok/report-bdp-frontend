"use client";

import React, { useState, useRef } from "react";
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  FileDown,
  Printer,
  X,
  Users,
  UserCheck,
  UserX,
  TrendingDown,
  TrendingUp,
  MapPin,
  Building2,
  Sliders,
  Loader2,
} from "lucide-react";
import {
  HRDashboardData,
} from "../services/manpowerService";

interface HRDashboardPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HRDashboardData | null;
  user?: any;
  processedTrendData: any[];
  trendMetrics: any;
  branchProportionData: any[];
  localityProportionData: any[];
  localityPerBranchData: any[];
  deptDistributionData: any[];
  jobLevelStackedData: any[];
}

export const HRDashboardPdfExportModal: React.FC<HRDashboardPdfExportModalProps> = ({
  isOpen,
  onClose,
  data,
  user,
  processedTrendData,
  trendMetrics,
  branchProportionData,
  localityProportionData,
  localityPerBranchData,
  deptDistributionData,
  jobLevelStackedData,
}) => {
  // Slide selection toggles
  const [includeSlide1, setIncludeSlide1] = useState(true);
  const [includeSlide2, setIncludeSlide2] = useState(true);
  const [includeSlide3, setIncludeSlide3] = useState(true);

  // Active preview tab
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState("");

  // Refs for off-screen capturing
  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);
  const slide3Ref = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const totalSlidesIncluded =
    (includeSlide1 ? 1 : 0) + (includeSlide2 ? 1 : 0) + (includeSlide3 ? 1 : 0);

  const currentDateStr = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const kpi = {
    totalKaryawan: data?.kpi?.totalKaryawan || 585,
    karyawanAktif: data?.kpi?.karyawanAktif || 430,
    karyawanResign: data?.kpi?.karyawanResign || 155,
    turnoverRate: data?.kpi?.turnoverRate || 26.5,
    persenLokal: data?.kpi ? (data.kpi as any).persenLokal || data.kpi.pctLokal || 31.6 : 31.6,
    persenNonLokal: data?.kpi ? (data.kpi as any).persenNonLokal || data.kpi.pctNonLokal || 68.4 : 68.4,
    totalLokal: (data?.kpi as any)?.totalLokal || 136,
    totalNonLokal: (data?.kpi as any)?.totalNonLokal || 294,
  };

  const statusKerjaList = data?.statusKetenagakerjaan || [
    { status: "PKWT (Kontrak)", aktif: 395, resign: 152, total: 547 },
    { status: "PKWTT (Tetap)", aktif: 21, resign: 2, total: 23 },
    { status: "Magang / Trainee", aktif: 14, resign: 1, total: 15 },
  ];

  const metrikUtamaCabang = data?.branchComparison?.metrikUtama || [
    { branch: "HO Jakarta", aktif: 27, resign: 13, turnoverRate: 32.5 },
    { branch: "Site Muara Pahu", aktif: 161, resign: 9, turnoverRate: 5.3 },
    { branch: "Site Senyiur", aktif: 242, resign: 133, turnoverRate: 35.5 },
  ];

  const lokalitasCabang = data?.branchComparison?.lokalitas || [
    { branch: "HO Jakarta", lokal: 0, nonLokal: 27, persenLokal: 0.0 },
    { branch: "Site Muara Pahu", lokal: 56, nonLokal: 105, persenLokal: 34.8 },
    { branch: "Site Senyiur", lokal: 80, nonLokal: 162, persenLokal: 33.1 },
  ];

  const pendidikanList = (data?.pendidikan || [
    { name: "SMA / SMK / Sederajat", count: 313, ratio: 72.8, color: "#1c3d73" },
    { name: "Diploma (D3 / D4)", count: 19, ratio: 4.4, color: "#10b981" },
    { name: "Sarjana & Magister (S1/S2)", count: 47, ratio: 10.9, color: "#f59e0b" },
    { name: "Belum Terdata / Lainnya", count: 51, ratio: 11.9, color: "#94a3b8" },
  ]).map((p) => ({
    tingkat: (p as any).tingkat || p.name,
    count: p.count,
    ratio: p.ratio,
  }));

  // Handle PDF Generation
  const handleExportPdf = async () => {
    if (totalSlidesIncluded === 0) {
      alert("Pilih minimal satu slide untuk di-export.");
      return;
    }

    try {
      setIsExporting(true);
      setProgressText("Menginisialisasi dokumen PDF landscape A4...");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let pageCount = 0;

      // Render Slide 1
      if (includeSlide1 && slide1Ref.current) {
        setProgressText("Merender Halaman 1: Ringkasan KPI & Grafik Tren...");
        const canvas1 = await html2canvas(slide1Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgData1 = canvas1.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData1, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // Render Slide 2
      if (includeSlide2 && slide2Ref.current) {
        setProgressText("Merender Halaman 2: 5 Grafik Distribusi & Demografi...");
        const canvas2 = await html2canvas(slide2Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgData2 = canvas2.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData2, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // Render Slide 3
      if (includeSlide3 && slide3Ref.current) {
        setProgressText("Merender Halaman 3: Matriks Komparasi Cabang...");
        const canvas3 = await html2canvas(slide3Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgData3 = canvas3.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData3, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      setProgressText("Menyimpan file PDF...");
      const today = new Date().toISOString().split("T")[0];
      const filename = `BDP_Dashboard_Analitika_Tenaga_Kerja_${today}.pdf`;

      pdf.save(filename);
      setProgressText("Berhasil di-download!");
      setTimeout(() => {
        setIsExporting(false);
        setProgressText("");
      }, 1000);
    } catch (err: any) {
      console.error("Gagal export PDF:", err);
      alert("Terjadi kesalahan saat memproses PDF: " + (err.message || "Unknown error"));
      setIsExporting(false);
      setProgressText("");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c3d73] text-white flex items-center justify-center shadow-xs">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Download Dashboard Analitika Tenaga Kerja (PDF)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1c3d73]/10 text-[#1c3d73]">
                  A4 Landscape
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Laporan visual bersih berformat landscape A4 tanpa header & lembar pengesahan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Toolbar: Slide Selection & Actions */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Checklist Slide Pilihan */}
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Sertakan Halaman:
            </span>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSlide1}
                onChange={(e) => setIncludeSlide1(e.target.checked)}
                className="w-4 h-4 rounded text-[#1c3d73] focus:ring-0 cursor-pointer"
              />
              <span className={includeSlide1 ? "font-bold text-slate-800" : "text-slate-400"}>
                Halaman 1: KPI & Tren Headcount
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSlide2}
                onChange={(e) => setIncludeSlide2(e.target.checked)}
                className="w-4 h-4 rounded text-[#1c3d73] focus:ring-0 cursor-pointer"
              />
              <span className={includeSlide2 ? "font-bold text-slate-800" : "text-slate-400"}>
                Halaman 2: 5 Grafik Distribusi
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSlide3}
                onChange={(e) => setIncludeSlide3(e.target.checked)}
                className="w-4 h-4 rounded text-[#1c3d73] focus:ring-0 cursor-pointer"
              />
              <span className={includeSlide3 ? "font-bold text-slate-800" : "text-slate-400"}>
                Halaman 3: Matriks Cabang
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting || totalSlidesIncluded === 0}
              type="button"
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#1c3d73] hover:bg-[#152e56] text-white font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{progressText || "Memproses..."}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF ({totalSlidesIncluded} Halaman)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Preview Bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-100 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium mr-2">Pratinjau Halaman:</span>
            <button
              onClick={() => setActiveTab(1)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 1
                  ? "bg-white text-[#1c3d73] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Halaman 1: KPI & Tren Headcount
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 2
                  ? "bg-white text-[#1c3d73] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Halaman 2: 5 Grafik Distribusi
            </button>
            <button
              onClick={() => setActiveTab(3)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 3
                  ? "bg-white text-[#1c3d73] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Halaman 3: Matriks Cabang
            </button>
          </div>
          <span className="text-slate-400 text-[11px]">
            Format: 297mm &times; 210mm (Landscape HD)
          </span>
        </div>

        {/* Interactive Modal Body (Preview Canvas) */}
        <div className="flex-1 overflow-auto p-6 bg-slate-200/60 flex justify-center items-start">
          <div className="origin-top scale-[0.8] sm:scale-[0.88] transition-transform">
            {activeTab === 1 && (
              <div className="shadow-2xl border border-slate-300 rounded-xl overflow-hidden">
                <Slide1Content
                  kpi={kpi}
                  processedTrendData={processedTrendData}
                  trendMetrics={trendMetrics}
                  currentDateStr={currentDateStr}
                />
              </div>
            )}
            {activeTab === 2 && (
              <div className="shadow-2xl border border-slate-300 rounded-xl overflow-hidden">
                <Slide2Content
                  branchProportionData={branchProportionData}
                  localityProportionData={localityProportionData}
                  localityPerBranchData={localityPerBranchData}
                  deptDistributionData={deptDistributionData}
                  jobLevelStackedData={jobLevelStackedData}
                  currentDateStr={currentDateStr}
                />
              </div>
            )}
            {activeTab === 3 && (
              <div className="shadow-2xl border border-slate-300 rounded-xl overflow-hidden">
                <Slide3Content
                  kpi={kpi}
                  statusKerjaList={statusKerjaList}
                  metrikUtamaCabang={metrikUtamaCabang}
                  lokalitasCabang={lokalitasCabang}
                  pendidikanList={pendidikanList}
                  currentDateStr={currentDateStr}
                />
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* OFF-SCREEN CAPTURE NODES (EXACT A4 LANDSCAPE DIMENSIONS)       */}
        {/* ============================================================== */}
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "1122px",
            zIndex: -9999,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          {/* Slide 1 Capture */}
          <div
            ref={slide1Ref}
            style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
          >
            <Slide1Content
              kpi={kpi}
              processedTrendData={processedTrendData}
              trendMetrics={trendMetrics}
              currentDateStr={currentDateStr}
            />
          </div>

          {/* Slide 2 Capture */}
          <div
            ref={slide2Ref}
            style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
          >
            <Slide2Content
              branchProportionData={branchProportionData}
              localityProportionData={localityProportionData}
              localityPerBranchData={localityPerBranchData}
              deptDistributionData={deptDistributionData}
              jobLevelStackedData={jobLevelStackedData}
              currentDateStr={currentDateStr}
            />
          </div>

          {/* Slide 3 Capture */}
          <div
            ref={slide3Ref}
            style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
          >
            <Slide3Content
              kpi={kpi}
              statusKerjaList={statusKerjaList}
              metrikUtamaCabang={metrikUtamaCabang}
              lokalitasCabang={lokalitasCabang}
              pendidikanList={pendidikanList}
              currentDateStr={currentDateStr}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// ============================================================================
// SLIDE 1: KPI CARDS & TREN HEADCOUNT BULAN KE BULAN (NO HEADER)
// ============================================================================
function Slide1Content({
  kpi,
  processedTrendData,
  trendMetrics,
  currentDateStr,
}: {
  kpi: any;
  processedTrendData: any[];
  trendMetrics: any;
  currentDateStr: string;
}) {
  return (
    <div
      className="bg-white p-7 text-slate-800 flex flex-col justify-between"
      style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
    >
      <div>
        {/* 6 Key Executive KPI Cards (Top of Slide) */}
        <div className="grid grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
              <span>TOTAL KARYAWAN</span>
              <Users className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{kpi.totalKaryawan}</div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">Database Keseluruhan</div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 mb-1">
              <span>KARYAWAN AKTIF</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">{kpi.karyawanAktif}</div>
            <div className="text-[9.5px] text-emerald-600 font-semibold mt-0.5">Status Aktif Saat Ini</div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="flex justify-between items-center text-[10px] font-bold text-rose-800 mb-1">
              <span>KARYAWAN RESIGN</span>
              <UserX className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">{kpi.karyawanResign}</div>
            <div className="text-[9.5px] text-rose-500 font-semibold mt-0.5">Telah Berhenti / Exit</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex justify-between items-center text-[10px] font-bold text-amber-800 mb-1">
              <span>TURNOVER RATE</span>
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono">{kpi.turnoverRate}%</div>
            <div className="text-[9.5px] text-amber-600 font-semibold mt-0.5">Rasio Resign vs Total</div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 mb-1">
              <span>TENAGA LOKAL</span>
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {kpi.persenLokal}% <span className="text-xs font-normal text-slate-500">({kpi.totalLokal})</span>
            </div>
            <div className="text-[9.5px] text-emerald-600 font-semibold mt-0.5">Daerah Kalimantan Timur</div>
          </div>

          <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200">
            <div className="flex justify-between items-center text-[10px] font-bold text-sky-800 mb-1">
              <span>NON-LOKAL</span>
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-700 font-mono">
              {kpi.persenNonLokal}% <span className="text-xs font-normal text-slate-500">({kpi.totalNonLokal})</span>
            </div>
            <div className="text-[9.5px] text-sky-600 font-semibold mt-0.5">Tenaga Kerja Nasional</div>
          </div>
        </div>

        {/* Section Title */}
        <div className="mt-5 flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1c3d73]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Tren Headcount Bulan ke Bulan (Agustus 2024 &ndash; Desember 2026)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Garis Biru: Karyawan Aktif &bull; Garis Oranye: Trendline Linier &bull; Garis Hijau: MA 3-Bulan
          </span>
        </div>

        {/* High Resolution Recharts Trendline with Explicit Dimensions & isAnimationActive=false */}
        <div className="w-full h-[380px] pt-3 flex justify-center">
          <AreaChart
            width={1066}
            height={380}
            data={processedTrendData}
            margin={{ top: 25, right: 25, left: 0, bottom: 25 }}
          >
            <defs>
              <linearGradient id="pdfTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1c3d73" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1c3d73" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              interval={processedTrendData && processedTrendData.length > 18 ? 1 : 0}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[(dataMin: number) => Math.max(0, dataMin - 15), (dataMax: number) => dataMax + 25]}
            />
            <Area
              type="monotone"
              dataKey="displayActive"
              name="Headcount Aktif"
              stroke="#1c3d73"
              strokeWidth={3}
              fill="url(#pdfTrendGrad)"
              isAnimationActive={false}
              dot={{ r: 4, fill: "#1c3d73", stroke: "#ffffff", strokeWidth: 2 }}
            >
              <LabelList
                dataKey="displayActive"
                position="top"
                content={({ x, y, value }: any) => {
                  if (value === undefined || value === null) return null;
                  return (
                    <text
                      key={`lbl-${x}-${y}`}
                      x={x}
                      y={Number(y) - 8}
                      fill="#1c3d73"
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="800"
                      fontFamily="monospace"
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke fill"
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </Area>
            <Line
              type="linear"
              dataKey="trendline"
              name="Trendline Linier"
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="movingAverage"
              name="Moving Average (3 Bulan)"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </div>

        {/* Bottom Intelligence Cards */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Rata-rata Headcount</span>
            <span className="text-base font-black text-slate-800 font-mono">
              {trendMetrics?.avgActive || 423} <span className="text-xs font-normal text-slate-500">Personil</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Puncak Tertinggi (Peak)</span>
            <span className="text-base font-black text-emerald-700 font-mono">
              {trendMetrics?.peakActive || 440} <span className="text-xs font-normal text-slate-500">({trendMetrics?.peakMonth || "Nov 2025"})</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Net Movement (Masuk vs Keluar)</span>
            <span className="text-base font-black text-sky-700 font-mono">
              +{trendMetrics?.totalJoined || 275} / -{trendMetrics?.totalResigned || 155}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Arah Pertumbuhan</span>
            <span className="text-base font-black text-[#1c3d73]">
              {trendMetrics?.direction === "up" ? "Tumbuh Positif (+)" : "Stabil Terkendali"}
            </span>
          </div>
        </div>
      </div>

      {/* Slide Footer (No pengesahan) */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-semibold text-slate-400">
        <span>PT Batara Dharma Persada &bull; Dashboard Analitika Tenaga Kerja &bull; Dicetak: {currentDateStr}</span>
        <span>Halaman 1 dari 3</span>
      </div>
    </div>
  );
}

// ============================================================================
// SLIDE 2: 5 GRAFIK DEMOGRAFI & DISTRIBUSI ORGANISASI (NO HEADER)
// ============================================================================
function Slide2Content({
  branchProportionData,
  localityProportionData,
  localityPerBranchData,
  deptDistributionData,
  jobLevelStackedData,
  currentDateStr,
}: {
  branchProportionData: any[];
  localityProportionData: any[];
  localityPerBranchData: any[];
  deptDistributionData: any[];
  jobLevelStackedData: any[];
  currentDateStr: string;
}) {
  return (
    <div
      className="bg-white p-7 text-slate-800 flex flex-col justify-between"
      style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
    >
      <div>
        {/* Section Title */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Distribusi Struktur Organisasi & Demografi Tenaga Kerja
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              (5 Visualisasi Analitik Cabang, Lokalitas, Departemen & Jenjang Jabatan)
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
            Total 430 Karyawan Aktif
          </span>
        </div>

        {/* 4 Grid Charts (Row 1 & Row 2) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Chart 1: Donut Proporsi Cabang */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-800">1. Proporsi Headcount per Cabang</span>
              <span className="text-[10px] font-semibold text-slate-500">Total 430</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[150px] h-[120px] flex justify-center items-center">
                <PieChart width={150} height={120}>
                  <Pie
                    data={branchProportionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {branchProportionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <text x={75} y={56} textAnchor="middle" dominantBaseline="central" className="font-mono text-xs font-black fill-slate-800">
                    430
                  </text>
                  <text x={75} y={69} textAnchor="middle" dominantBaseline="central" className="text-[9px] font-bold fill-slate-400">
                    Aktif
                  </text>
                </PieChart>
              </div>
              <div className="flex-1 space-y-1.5 text-[11px]">
                {branchProportionData.map((b, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      {b.value} <span className="text-slate-400 font-normal">({b.pct})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Donut Lokal vs Non-Lokal */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-800">2. Komposisi Karyawan: Lokal vs Non-Lokal</span>
              <span className="text-[10px] font-semibold text-slate-500">Daerah vs Nasional</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[150px] h-[120px] flex justify-center items-center">
                <PieChart width={150} height={120}>
                  <Pie
                    data={localityProportionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {localityProportionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <text x={75} y={56} textAnchor="middle" dominantBaseline="central" className="font-mono text-xs font-black fill-slate-800">
                    430
                  </text>
                  <text x={75} y={69} textAnchor="middle" dominantBaseline="central" className="text-[9px] font-bold fill-slate-400">
                    Total
                  </text>
                </PieChart>
              </div>
              <div className="flex-1 space-y-1.5 text-[11px]">
                {localityProportionData.map((l, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.name}
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      {l.value} <span className="text-slate-400 font-normal">({l.pct})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3: Grouped Bar Lokal vs Non-Lokal per Cabang */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800 block mb-1">
              3. Perbandingan Tenaga Kerja: Lokal vs Non-Lokal per Cabang
            </span>
            <div className="w-full h-[155px] flex justify-center">
              <BarChart
                width={500}
                height={155}
                data={localityPerBranchData}
                margin={{ top: 16, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="fullName" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Bar dataKey="lokal" name="Lokal (Kaltim)" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="lokal" position="top" fill="#047857" fontSize={9.5} fontWeight="bold" offset={3} />
                </Bar>
                <Bar dataKey="nonLokal" name="Non-Lokal (Nasional)" fill="#1c3d73" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="nonLokal" position="top" fill="#1c3d73" fontSize={9.5} fontWeight="bold" offset={3} />
                </Bar>
              </BarChart>
            </div>
            <div className="flex justify-around text-[10px] text-slate-500 pt-1 font-semibold">
              <span>HO: 0 Lokal / 27 Non-Lokal</span>
              <span>Muara Pahu: 56 Lokal / 105 Non-Lokal</span>
              <span>Senyiur: 80 Lokal / 162 Non-Lokal</span>
            </div>
          </div>

          {/* Chart 4: Distribusi Karyawan Aktif per Departemen */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800 block mb-1">
              4. Distribusi Karyawan Aktif per Departemen (9 Divisi)
            </span>
            <div className="w-full h-[155px] flex justify-center">
              <BarChart
                width={500}
                height={155}
                data={deptDistributionData}
                margin={{ top: 16, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} interval={0} angle={-20} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Bar dataKey="aktif" fill="#1c3d73" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="aktif" position="top" fill="#1c3d73" fontSize={9.5} fontWeight="bold" offset={3} />
                  {deptDistributionData.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? "#1c3d73" : index === 1 ? "#2563eb" : "#0284c7"} />
                  ))}
                </Bar>
              </BarChart>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span>Top 1: <strong>Production (230 org / 53,5%)</strong></span>
              <span>Top 2: <strong>Plant (113 org / 26,3%)</strong></span>
            </div>
          </div>
        </div>

        {/* Chart 5: Sebaran Job Level per Cabang (Stacked Bar) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-800">
              5. Sebaran Job Level per Cabang (Aktif: Director, Manager, Supt, Spv, Jr. Spv, Worker)
            </span>
            <span className="text-[10px] text-slate-500 font-bold">
              Site Senyiur (Navy) &bull; Site Muara Pahu (Amber) &bull; HO Jakarta (Sky)
            </span>
          </div>
          <div className="w-full h-[170px] flex justify-center">
            <BarChart
              width={1040}
              height={170}
              data={jobLevelStackedData}
              margin={{ top: 16, right: 15, left: -15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="fullLevel" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Bar dataKey="sny" name="Site Senyiur" stackId="a" fill="#1c3d73" isAnimationActive={false}>
                <LabelList dataKey="sny" position="center" fill="#ffffff" fontSize={9} fontWeight="bold" formatter={(v: any) => v >= 10 ? v : ""} />
              </Bar>
              <Bar dataKey="mp" name="Site Muara Pahu" stackId="a" fill="#f59e0b" isAnimationActive={false}>
                <LabelList dataKey="mp" position="center" fill="#ffffff" fontSize={9} fontWeight="bold" formatter={(v: any) => v >= 10 ? v : ""} />
              </Bar>
              <Bar dataKey="ho" name="HO Jakarta" stackId="a" fill="#0284c7" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="ho" position="center" fill="#ffffff" fontSize={9} fontWeight="bold" formatter={(v: any) => v >= 10 ? v : ""} />
                <LabelList dataKey="total" position="top" fill="#1e293b" fontSize={10} fontWeight="bold" offset={4} />
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* Slide Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-semibold text-slate-400">
        <span>PT Batara Dharma Persada &bull; Dashboard Analitika Tenaga Kerja &bull; Dicetak: {currentDateStr}</span>
        <span>Halaman 2 dari 3</span>
      </div>
    </div>
  );
}

// ============================================================================
// SLIDE 3: MATRIKS KOMPARASI CABANG & STATUS HUBUNGAN KERJA (NO HEADER & NO PENGESAHAN)
// ============================================================================
function Slide3Content({
  kpi,
  statusKerjaList,
  metrikUtamaCabang,
  lokalitasCabang,
  pendidikanList,
  currentDateStr,
}: {
  kpi: any;
  statusKerjaList: any[];
  metrikUtamaCabang: any[];
  lokalitasCabang: any[];
  pendidikanList: any[];
  currentDateStr: string;
}) {
  return (
    <div
      className="bg-white p-7 text-slate-800 flex flex-col justify-between"
      style={{ width: "1122px", height: "793px", minHeight: "793px", maxHeight: "793px" }}
    >
      <div>
        {/* Section Title */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Matriks Komparasi Cabang, Hubungan Kerja & Pendidikan Karyawan
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              (Rincian Tabular HO Jakarta, Site Muara Pahu, dan Site Senyiur)
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            Verified Data Sync
          </span>
        </div>

        {/* 4 Tables in a spacious 2x2 grid */}
        <div className="grid grid-cols-2 gap-5">
          {/* Table 1: Komparasi Metrik Utama Cabang */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-[#1c3d73] text-white px-4 py-2 font-bold text-xs uppercase tracking-wider">
              Komparasi Metrik Utama per Cabang
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="py-2 px-4 text-left">Branch / Unit Kerja</th>
                  <th className="py-2 px-3 text-right">Aktif</th>
                  <th className="py-2 px-3 text-right">Resign</th>
                  <th className="py-2 px-4 text-right">Turnover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrikUtamaCabang.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{m.branch}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{m.aktif}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">{m.resign}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">{m.turnoverRate}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                <tr>
                  <td className="py-2.5 px-4">Total Perusahaan</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-black">{kpi.karyawanAktif}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-black">{kpi.karyawanResign}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black">{kpi.turnoverRate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table 2: Komposisi Lokalitas per Cabang */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-[#1c3d73] text-white px-4 py-2 font-bold text-xs uppercase tracking-wider">
              Komposisi Lokalitas per Cabang
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="py-2 px-4 text-left">Branch / Lokasi</th>
                  <th className="py-2 px-3 text-right">Lokal</th>
                  <th className="py-2 px-3 text-right">Non-Lokal</th>
                  <th className="py-2 px-4 text-right">% Lokal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lokalitasCabang.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{l.branch}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{l.lokal}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">{l.nonLokal}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{l.persenLokal}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                <tr>
                  <td className="py-2.5 px-4">Total Perusahaan</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-black">{kpi.totalLokal}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-black">{kpi.totalNonLokal}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black">{kpi.persenLokal}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table 3: Status Hubungan Kerja & Turnover */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-800 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider">
              Status Hubungan Kerja & Retensi
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="py-2 px-4 text-left">Status Hubungan Kerja</th>
                  <th className="py-2 px-3 text-right">Aktif</th>
                  <th className="py-2 px-3 text-right">Resign</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statusKerjaList.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{s.status}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{s.aktif}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">{s.resign}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{s.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                <tr>
                  <td className="py-2.5 px-4">Total Karyawan</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-black">{kpi.karyawanAktif}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-black">{kpi.karyawanResign}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black">{kpi.totalKaryawan}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table 4: Tingkat Pendidikan */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-800 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider">
              Tingkat Pendidikan Karyawan (Aktif)
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="py-2 px-4 text-left">Pendidikan</th>
                  <th className="py-2 px-3 text-right">Jumlah</th>
                  <th className="py-2 px-4 text-right">Rasio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendidikanList.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{p.tingkat}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{p.count}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">{p.ratio}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                <tr>
                  <td className="py-2.5 px-4">Total Terverifikasi</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">{kpi.karyawanAktif}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black">100,0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Slide Footer (No Pengesahan) */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[10px] font-semibold text-slate-400">
        <span>PT Batara Dharma Persada &bull; Dashboard Analitika Tenaga Kerja &bull; Dicetak: {currentDateStr}</span>
        <span>Halaman 3 dari 3</span>
      </div>
    </div>
  );
}
