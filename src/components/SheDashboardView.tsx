"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HardHat,
  FileText,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  MapPin,
  User,
  Calendar,
  Building2,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  sheService,
  SheDashboardData,
  HazardReportItem,
  SheMonthlyTrendItem,
  SheWeeklyTrendItem,
} from "../services/sheService";
import { useNotification } from "../context/NotificationContext";

// =========================================================================
// LINEAR REGRESSION TRENDLINE HELPER (y = mx + b)
// =========================================================================
interface TrendlineAnalysis {
  slope: number;
  intercept: number;
  startVal: number;
  endVal: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
  avgVal: number;
  maxVal: number;
  dataWithTrend: any[];
}

function computeLinearTrendline(
  dataList: any[],
  yKey: string,
  trendKeyName: string = "trendline"
): TrendlineAnalysis {
  const n = dataList.length;
  if (n === 0) {
    return {
      slope: 0,
      intercept: 0,
      startVal: 0,
      endVal: 0,
      percentChange: 0,
      direction: "flat",
      avgVal: 0,
      maxVal: 0,
      dataWithTrend: [],
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let maxVal = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = Number(dataList[i][yKey]) || 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    if (y > maxVal) maxVal = y;
  }

  const avgVal = Math.round((sumY / n) * 10) / 10;
  const denominator = n * sumX2 - sumX * sumX;
  const slope = n < 2 || denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = n < 2 ? sumY / (n || 1) : (sumY - slope * sumX) / n;

  const startVal = Math.round(intercept);
  const endVal = Math.round(slope * (n - 1) + intercept);
  const percentChange =
    startVal !== 0 ? Math.round(((endVal - startVal) / Math.abs(startVal)) * 1000) / 10 : 0;
  const direction = percentChange > 0.5 ? "up" : percentChange < -0.5 ? "down" : "flat";

  const dataWithTrend = dataList.map((d, i) => {
    const trendVal = Math.max(0, Math.round(slope * i + intercept));
    return {
      ...d,
      [trendKeyName]: trendVal,
    };
  });

  return {
    slope,
    intercept,
    startVal,
    endVal,
    percentChange,
    direction,
    avgVal,
    maxVal,
    dataWithTrend,
  };
}

interface SheDashboardViewProps {
  user: any;
  onNavigateToHazardReport?: () => void;
  onNavigateToInspection?: () => void;
}

export const SheDashboardView: React.FC<SheDashboardViewProps> = ({
  user,
  onNavigateToHazardReport,
  onNavigateToInspection,
}) => {
  const { showError } = useNotification();

  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur" | "ALL">(
    user?.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu"
  );
  const [data, setData] = useState<SheDashboardData | null>(null);
  const [recentHazards, setRecentHazards] = useState<HazardReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive Chart Controls State
  const [chartTab, setChartTab] = useState<"all" | "hazard" | "inspection">("all");
  const [timeGranularity, setTimeGranularity] = useState<"monthly" | "weekly">("monthly");
  const [showTrendline, setShowTrendline] = useState<boolean>(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashData, hazardsList] = await Promise.all([
        sheService.getDashboardData(selectedSite),
        sheService.getHazards(selectedSite),
      ]);
      setData(dashData);
      setRecentHazards(hazardsList.slice(0, 5));
    } catch (err: any) {
      showError(err.message || "Gagal memuat data dashboard SHE");
    } finally {
      setLoading(false);
    }
  }, [selectedSite, showError]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalHazards = data?.totalHazards || 1;
  const ktaPct = Math.round(((data?.ktaCount ?? 0) / totalHazards) * 100);
  const ttaPct = Math.round(((data?.ttaCount ?? 0) / totalHazards) * 100);
  const openPct = Math.round(((data?.openHazards ?? 0) / totalHazards) * 100);
  const closedPct = data?.resolutionRate ?? Math.round(((data?.closedHazards ?? 0) / totalHazards) * 100);

  // -------------------------------------------------------------------------
  // CHART DATA NORMALIZATION & TRENDLINE COMPUTATION
  // -------------------------------------------------------------------------
  const normalizedChartData = useMemo(() => {
    if (timeGranularity === "weekly") {
      const src = data?.weeklyTrends && data.weeklyTrends.length > 0 ? data.weeklyTrends : [];
      return src.map((w) => ({
        key: w.label || `Minggu ${w.week.replace("W", "")}`,
        shortKey: w.week,
        hazards: w.hazards || 0,
        resolved: w.resolved || 0,
        open: w.open || Math.max(0, (w.hazards || 0) - (w.resolved || 0)),
        kta: w.kta || 0,
        tta: w.tta || 0,
        inspections: w.inspections || 0,
        inspectionsCompliant: w.compliant ?? (w as any).inspectionsCompliant ?? 0,
        inspectionsNeedFollowUp: w.needFollowUp ?? (w as any).inspectionsNeedFollowUp ?? 0,
        inspectionsShift1: w.inspectionsShift1 || 0,
        inspectionsShift2: w.inspectionsShift2 || 0,
      }));
    }

    const src = data?.monthlyTrends && data.monthlyTrends.length > 0 ? data.monthlyTrends : [];
    return src.map((m) => ({
      key: m.month,
      shortKey: m.month.split(" ")[0] || m.month,
      hazards: m.hazards || 0,
      resolved: m.resolved || 0,
      open: m.open || Math.max(0, (m.hazards || 0) - (m.resolved || 0)),
      kta: m.kta || 0,
      tta: m.tta || 0,
      inspections: m.inspections || 0,
      inspectionsCompliant: m.inspectionsCompliant ?? (m as any).compliant ?? 0,
      inspectionsNeedFollowUp: m.inspectionsNeedFollowUp ?? (m as any).needFollowUp ?? 0,
      inspectionsShift1: m.inspectionsShift1 || 0,
      inspectionsShift2: m.inspectionsShift2 || 0,
    }));
  }, [timeGranularity, data]);

  const hazardTrendAnalysis = useMemo(() => {
    return computeLinearTrendline(normalizedChartData, "hazards", "hazardTrend");
  }, [normalizedChartData]);

  const inspectionTrendAnalysis = useMemo(() => {
    return computeLinearTrendline(normalizedChartData, "inspections", "inspectionTrend");
  }, [normalizedChartData]);

  const chartData = useMemo(() => {
    return normalizedChartData.map((d, i) => ({
      ...d,
      hazardTrend: hazardTrendAnalysis.dataWithTrend[i]?.hazardTrend ?? d.hazards,
      inspectionTrend: inspectionTrendAnalysis.dataWithTrend[i]?.inspectionTrend ?? d.inspections,
    }));
  }, [normalizedChartData, hazardTrendAnalysis, inspectionTrendAnalysis]);

  // Custom Tooltips for Recharts
  const CustomHazardTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pData = payload[0]?.payload || {};
    const total = pData.hazards || 0;
    const kta = pData.kta || 0;
    const tta = pData.tta || 0;
    const resolved = pData.resolved || 0;
    const open = pData.open || 0;
    const trend = pData.hazardTrend;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 border border-slate-700 shadow-2xl text-xs space-y-2 min-w-[220px] z-50">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Calendar size={12} className="text-[#e95623]" />
            {pData.key || label}
          </span>
          <span className="font-mono font-black text-amber-400 text-[11px]">
            {total} Laporan
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#e95623]" />
              Kondisi Tdk Aman (KTA):
            </span>
            <span className="font-mono font-bold text-slate-100">
              {kta} ({total > 0 ? Math.round((kta / total) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              Tindakan Tdk Aman (TTA):
            </span>
            <span className="font-mono font-bold text-slate-100">
              {tta} ({total > 0 ? Math.round((tta / total) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={11} />
              Selesai Ditangani:
            </span>
            <span className="font-mono font-bold text-emerald-400">{resolved}</span>
          </div>
          {open > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertCircle size={11} />
                Open (Belum Selesai):
              </span>
              <span className="font-mono font-bold text-rose-400">{open}</span>
            </div>
          )}
        </div>

        {showTrendline && trend !== undefined && (
          <div className="pt-1.5 border-t border-dashed border-rose-500/40 flex items-center justify-between text-[11px] text-rose-300">
            <span className="flex items-center gap-1">
              <TrendingUp size={11} className="text-rose-400" />
              Nilai Garis Tren:
            </span>
            <span className="font-mono font-black text-white">{trend} Lap</span>
          </div>
        )}
      </div>
    );
  };

  const CustomInspectionTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pData = payload[0]?.payload || {};
    const total = pData.inspections || 0;
    const shift1 = pData.inspectionsShift1 || 0;
    const shift2 = pData.inspectionsShift2 || 0;
    const compliant = pData.inspectionsCompliant || 0;
    const needFollowUp = pData.inspectionsNeedFollowUp || 0;
    const trend = pData.inspectionTrend;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 border border-slate-700 shadow-2xl text-xs space-y-2 min-w-[220px] z-50">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <ClipboardList size={12} className="text-sky-400" />
            {pData.key || label}
          </span>
          <span className="font-mono font-black text-sky-400 text-[11px]">
            {total} Inspeksi
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
              Shift 1 (Siang):
            </span>
            <span className="font-mono font-bold text-slate-100">
              {shift1} ({total > 0 ? Math.round((shift1 / total) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              Shift 2 (Malam):
            </span>
            <span className="font-mono font-bold text-slate-100">
              {shift2} ({total > 0 ? Math.round((shift2 / total) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={11} />
              Sesuai Standar:
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {compliant} ({total > 0 ? Math.round((compliant / total) * 100) : 100}%)
            </span>
          </div>
          {needFollowUp > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertCircle size={11} />
                Perlu Tindak Lanjut:
              </span>
              <span className="font-mono font-bold text-amber-400">{needFollowUp}</span>
            </div>
          )}
        </div>

        {showTrendline && trend !== undefined && (
          <div className="pt-1.5 border-t border-dashed border-amber-500/40 flex items-center justify-between text-[11px] text-amber-300">
            <span className="flex items-center gap-1">
              <TrendingUp size={11} className="text-amber-400" />
              Nilai Garis Tren:
            </span>
            <span className="font-mono font-black text-white">{trend} Insp</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 min-w-0 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------
          1. Corporate Header Banner (Aligned with Periodic Inspection & Cost)
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-6 md:p-7 min-w-0">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="space-y-1.5 min-w-0">
            {/* Top row: Site Selector Pills & Compliance Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full border border-white/15">
                <button
                  type="button"
                  onClick={() => setSelectedSite("MuaraPahu")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "MuaraPahu"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Muara Pahu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite("Senyiur")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "Senyiur"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Senyiur
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite("ALL")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "ALL"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Semua Site
                </button>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                Zero LTI • 100% Compliance
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <HardHat size={20} className="text-[#e95623]" />
              <span>Safety, Health &amp; Environment (SHE) Dashboard</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Monitoring terpadu Hazard Report, evaluasi risiko K3L (KTA &amp; TTA), dan pengawasan tindak lanjut perbaikan operasional armada PT Batara Dharma Persada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToHazardReport && (
              <button
                type="button"
                onClick={onNavigateToHazardReport}
                className="px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-98"
                title="Buka Halaman Form & Tabel Hazard Report"
              >
                <FileText size={14} className="text-white" />
                <span>Buka Hazard Report</span>
                <ArrowRight size={13} />
              </button>
            )}

            {onNavigateToInspection && (
              <button
                type="button"
                onClick={onNavigateToInspection}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                title="Buka Inspeksi Area Kerja"
              >
                <ClipboardList size={14} className="text-orange-400" />
                <span>Inspeksi Area Kerja</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-orange-400" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. KPI Summary Grid (Proportions matching Periodic Service & Cost)
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 min-w-0">
        {/* Card 1: Total Hazard */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-slate-500">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Total Hazard
              </span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <FileText size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {(data?.totalHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-slate-400 ml-1">Laporan</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              Seluruh temuan K3L
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full w-full" />
          </div>
        </div>

        {/* Card 2: KTA */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-orange-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-[#e95623]">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#e95623]">
                Kondisi Tdk Aman
              </span>
              <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-[#e95623]">
                {(data?.ktaCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-orange-400 ml-1">KTA</span>
            </div>
            <p className="text-[10px] font-bold text-orange-700 mt-0.5 truncate">
              {ktaPct}% • Fasilitas / Fisik
            </p>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-[#e95623] rounded-full" style={{ width: `${ktaPct}%` }} />
          </div>
        </div>

        {/* Card 3: TTA */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-amber-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-amber-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                Tindakan Tdk Aman
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <HardHat size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-amber-600">
                {(data?.ttaCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-amber-400 ml-1">TTA</span>
            </div>
            <p className="text-[10px] font-bold text-amber-800 mt-0.5 truncate">
              {ttaPct}% • Perilaku Kerja
            </p>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ttaPct}%` }} />
          </div>
        </div>

        {/* Card 4: Open */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-rose-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-rose-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                Hazard Open
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-rose-600">
                {(data?.openHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-rose-400 ml-1">Belum Selesai</span>
            </div>
            <p className="text-[10px] font-bold text-rose-700 mt-0.5 truncate">
              {openPct}% • Menunggu Tindakan
            </p>
          </div>
          <div className="w-full bg-rose-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${openPct}%` }} />
          </div>
        </div>

        {/* Card 5: Closed */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-emerald-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-emerald-800">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Hazard Closed
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-emerald-600">
                {(data?.closedHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-emerald-500 ml-1">Selesai</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-700 mt-0.5 truncate">
              {closedPct}% Selesai Ditangani
            </p>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${closedPct}%` }} />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Analytics & Trendlines: Hazard Report & Inspeksi Area Kerja
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4 min-w-0">
        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
                <Activity size={18} />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Grafik Analisis Tren K3L &amp; Inspeksi Area Kerja
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                Garis Tren Regresi (y = mx + b)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualisasi tren berkala temuan Hazard Report vs Inspeksi Area Kerja beserta proyeksi arah garis tren operasional.
            </p>
          </div>

          {/* Interactive Toolbar Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Tab Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setChartTab("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartTab === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Grafik
              </button>
              <button
                type="button"
                onClick={() => setChartTab("hazard")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartTab === "hazard"
                    ? "bg-[#e95623] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#e95623]"
                }`}
              >
                Hazard Report
              </button>
              <button
                type="button"
                onClick={() => setChartTab("inspection")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartTab === "inspection"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-sky-600"
                }`}
              >
                Inspeksi Area Kerja
              </button>
            </div>

            {/* Granularity Toggle: Bulanan vs Mingguan */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTimeGranularity("monthly")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeGranularity === "monthly"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setTimeGranularity("weekly")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeGranularity === "weekly"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mingguan
              </button>
            </div>

            {/* Trendline Toggle */}
            <button
              type="button"
              onClick={() => setShowTrendline(!showTrendline)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                showTrendline
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700"
              }`}
              title="Aktifkan atau sembunyikan garis tren regresi"
            >
              <TrendingUp
                size={13}
                className={showTrendline ? "text-amber-600" : "text-slate-400"}
              />
              <span>Garis Tren {showTrendline ? "Aktif" : "Nonaktif"}</span>
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div
          className={`grid gap-4 ${
            chartTab === "all" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {/* CHART 1: HAZARD REPORT */}
          {(chartTab === "all" || chartTab === "hazard") && (
            <div className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-orange-50/20 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-100 text-[#e95623]">
                      <AlertTriangle size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Tren Pelaporan Hazard (KTA &amp; TTA)
                      </h3>
                      <p className="text-[10.5px] text-slate-500">
                        Volume temuan bahaya vs status penyelesaian
                      </p>
                    </div>
                  </div>

                  {/* Trendline Badge */}
                  {showTrendline && (
                    <div
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-black border flex items-center gap-1 ${
                        hazardTrendAnalysis.direction === "down"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : hazardTrendAnalysis.direction === "up"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {hazardTrendAnalysis.direction === "down" ? (
                        <>
                          <TrendingDown size={13} className="text-emerald-600" />
                          <span>Tren Turun {Math.abs(hazardTrendAnalysis.percentChange)}% (Positif K3L)</span>
                        </>
                      ) : hazardTrendAnalysis.direction === "up" ? (
                        <>
                          <TrendingUp size={13} className="text-rose-600" />
                          <span>Tren Naik +{hazardTrendAnalysis.percentChange}%</span>
                        </>
                      ) : (
                        <span>Tren Stabil (0%)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Chart Canvas */}
                <div className={`w-full mt-3 ${chartTab === "hazard" ? "h-80 sm:h-96" : "h-72"}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortKey"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomHazardTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="kta"
                        name="Kondisi Tdk Aman (KTA)"
                        fill="#e95623"
                        stackId="hazardStack"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="tta"
                        name="Tindakan Tdk Aman (TTA)"
                        fill="#f59e0b"
                        stackId="hazardStack"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                      <Line
                        type="monotone"
                        dataKey="resolved"
                        name="Closed / Selesai"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#10b981" }}
                      />
                      {showTrendline && (
                        <Line
                          type="linear"
                          dataKey="hazardTrend"
                          name="Garis Tren Regresi"
                          stroke="#dc2626"
                          strokeWidth={2.5}
                          strokeDasharray="6 4"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Metrics Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[10.5px]">
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Rata-rata / Periode</span>
                  <span className="font-mono font-black text-slate-800 text-xs">
                    {hazardTrendAnalysis.avgVal.toLocaleString("id-ID")} Lap
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Puncak Tertinggi</span>
                  <span className="font-mono font-black text-amber-600 text-xs">
                    {hazardTrendAnalysis.maxVal.toLocaleString("id-ID")} Lap
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Penyelesaian</span>
                  <span className="font-mono font-black text-emerald-600 text-xs">
                    {closedPct}% Selesai
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Slope Garis Tren</span>
                  <span className="font-mono font-black text-slate-700 text-xs">
                    m = {hazardTrendAnalysis.slope.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CHART 2: INSPEKSI AREA KERJA */}
          {(chartTab === "all" || chartTab === "inspection") && (
            <div className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-sky-50/20 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <ClipboardList size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Tren Inspeksi Area Kerja
                      </h3>
                      <p className="text-[10.5px] text-slate-500">
                        Aktivitas shift &amp; tingkat kepatuhan standar area
                      </p>
                    </div>
                  </div>

                  {/* Trendline Badge */}
                  {showTrendline && (
                    <div
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-black border flex items-center gap-1 ${
                        inspectionTrendAnalysis.direction === "up"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : inspectionTrendAnalysis.direction === "down"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {inspectionTrendAnalysis.direction === "up" ? (
                        <>
                          <TrendingUp size={13} className="text-emerald-600" />
                          <span>Tren Meningkat +{inspectionTrendAnalysis.percentChange}%</span>
                        </>
                      ) : inspectionTrendAnalysis.direction === "down" ? (
                        <>
                          <TrendingDown size={13} className="text-amber-600" />
                          <span>Tren Menurun {Math.abs(inspectionTrendAnalysis.percentChange)}%</span>
                        </>
                      ) : (
                        <span>Tren Stabil (0%)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Chart Canvas */}
                <div className={`w-full mt-3 ${chartTab === "inspection" ? "h-80 sm:h-96" : "h-72"}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortKey"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomInspectionTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="inspectionsShift1"
                        name="Shift 1 (Siang)"
                        fill="#0284c7"
                        stackId="inspStack"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="inspectionsShift2"
                        name="Shift 2 (Malam)"
                        fill="#8b5cf6"
                        stackId="inspStack"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                      <Line
                        type="monotone"
                        dataKey="inspectionsCompliant"
                        name="Sesuai (Compliant)"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#10b981" }}
                      />
                      {showTrendline && (
                        <Line
                          type="linear"
                          dataKey="inspectionTrend"
                          name="Garis Tren Regresi"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          strokeDasharray="6 4"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Metrics Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[10.5px]">
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Rata-rata / Periode</span>
                  <span className="font-mono font-black text-slate-800 text-xs">
                    {inspectionTrendAnalysis.avgVal.toLocaleString("id-ID")} Insp
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Puncak Tertinggi</span>
                  <span className="font-mono font-black text-sky-600 text-xs">
                    {inspectionTrendAnalysis.maxVal.toLocaleString("id-ID")} Insp
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Kepatuhan Rata-rata</span>
                  <span className="font-mono font-black text-emerald-600 text-xs">
                    {data?.inspectionsSummary?.avgScoreInspections ?? 98.4}% Sesuai
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Slope Garis Tren</span>
                  <span className="font-mono font-black text-slate-700 text-xs">
                    m = {inspectionTrendAnalysis.slope.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------
          4. Main Content: Matriks Risiko, Top Area & Temuan Terkini
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0 items-start">
        {/* Left Column (lg:col-span-5): Matriks Risiko + Top Lokasi */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
          {/* Card A: Matriks Tingkat Risiko */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-rose-500" />
                  <span>Matriks Tingkat Risiko</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">Klasifikasi tingkat keparahan K3L</p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {(data?.totalHazards ?? 0).toLocaleString("id-ID")} Laporan
              </span>
            </div>

            <div className="space-y-2">
              {(data?.riskDistribution || []).map((rk) => {
                const pct = Math.round((rk.value / totalHazards) * 100);
                return (
                  <div key={rk.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rk.color }} />
                        {rk.name} Risk
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="font-bold text-slate-700">
                          {rk.value.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: rk.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-0.5">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5 text-[11px]">
                <ShieldCheck size={13} className="text-amber-700" />
                Prinsip Stop Work Authority (SWA)
              </span>
              <p className="text-[10.5px] leading-relaxed text-amber-900">
                Setiap karyawan berhak menghentikan pekerjaan apabila menemukan kondisi risiko Critical / High yang membahayakan.
              </p>
            </div>
          </div>

          {/* Card B: Top Area / Lokasi Temuan */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <MapPin size={15} className="text-[#e95623]" />
                  <span>Area Temuan Terbanyak</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">Top 5 area konsentrasi potensi bahaya</p>
              </div>
              <span className="text-[10.5px] font-bold text-slate-400">Peringkat</span>
            </div>

            <div className="space-y-2">
              {(data?.locationDistribution && data.locationDistribution.length > 0
                ? data.locationDistribution.slice(0, 5)
                : [
                    { name: "WORKSHOP", count: 502 },
                    { name: "MESS", count: 309 },
                    { name: "CHR", count: 205 },
                    { name: "KONSTRUKSI", count: 200 },
                    { name: "OFFICE", count: 121 },
                  ]
              ).map((loc, idx) => {
                const maxCount = data?.locationDistribution?.[0]?.count || 502;
                const pct = Math.round((loc.count / maxCount) * 100);
                const shareOfTotal = Math.round((loc.count / totalHazards) * 100);

                return (
                  <div key={loc.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded-md bg-slate-200/80 text-slate-700 text-[9.5px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-800 text-[11px] truncate">{loc.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2 font-mono text-[11px]">
                        <span className="font-bold text-slate-800">{loc.count.toLocaleString("id-ID")}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({shareOfTotal}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#e95623] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-7): Temuan Bahaya Terkini Feed */}
        <div className="lg:col-span-7 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FileText size={15} className="text-[#e95623]" />
                  <span>Temuan Bahaya Terkini</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  5 laporan hazard terbaru yang membutuhkan pengawalan
                </p>
              </div>

              {onNavigateToHazardReport && (
                <button
                  type="button"
                  onClick={onNavigateToHazardReport}
                  className="text-xs font-black text-[#e95623] hover:text-[#d44819] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {recentHazards.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada laporan hazard tercatat.
                </div>
              ) : (
                recentHazards.map((h) => {
                  const isClosed = h.status === "Closed" || h.statusGForm === "CLOSE";
                  const isTTA = h.jenisPelaporan === "TTA" || h.category === "Unsafe Action";

                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-2xs transition-all space-y-2"
                    >
                      {/* Row 1: Badges & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-[11px] text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                            {h.reportNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500">
                            <Calendar size={10} className="text-slate-400" />
                            {h.date}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black border ${
                              isTTA
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {isTTA ? "TTA" : "KTA"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                              h.riskLevel === "Critical"
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : h.riskLevel === "High"
                                ? "bg-orange-100 text-orange-700 border border-orange-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {h.riskLevel}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black border ${
                            isClosed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isClosed ? (
                            <>
                              <CheckCircle2 size={10} className="text-emerald-600" />
                              CLOSED
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              OPEN
                            </>
                          )}
                        </span>
                      </div>

                      {/* Row 2: Title */}
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                        {h.title || h.identifikasiBahaya}
                      </h4>

                      {/* Row 3: Footnote metadata */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 text-[10.5px] text-slate-500 border-t border-slate-200/60">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin size={10} className="text-[#e95623]" />
                          <strong className="text-slate-700">{h.lokasiBahaya || h.location}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Building2 size={10} className="text-slate-400" />
                          PIC: <strong className="text-slate-700">{h.penanggungJawabArea || h.picDept || "PLANT"}</strong>
                        </span>
                        {(h.reporterName || h.namaPelapor) && (
                          <span className="inline-flex items-center gap-1 font-medium ml-auto">
                            <User size={10} className="text-slate-400" />
                            <strong className="text-slate-700">{h.reporterName || h.namaPelapor}</strong>
                            {(h.nrpPelapor || h.reporterNrp) && (
                              <span className="text-slate-400 font-mono">({h.nrpPelapor || h.reporterNrp})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
