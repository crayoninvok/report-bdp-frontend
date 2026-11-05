"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingDown,
  TrendingUp,
  Building2,
  GraduationCap,
  Briefcase,
  RefreshCw,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Layers,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
  Compass,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  manpowerService,
  HRDashboardData,
  MonthlyManpowerTrendItem,
} from "../services/manpowerService";

interface HRDashboardViewProps {
  user: any;
  onNavigateToMasterManpower?: () => void;
}

type TabType = "all" | "trend" | "distribution" | "overview" | "comparison";
type ChartMode = "active" | "flow" | "branches" | "growth" | "turnover";

export const HRDashboardView: React.FC<HRDashboardViewProps> = ({
  user,
  onNavigateToMasterManpower,
}) => {
  const [data, setData] = useState<HRDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Trend Chart State
  const [chartMode, setChartMode] = useState<ChartMode>("active");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const [showMA, setShowMA] = useState<boolean>(true);
  const [showTableDetails, setShowTableDetails] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await manpowerService.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Gagal memuat data HR dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await manpowerService.sync();
      if (res.success) {
        setSyncMessage(`Berhasil sinkron ${res.total || 585} data karyawan dari Google Sheet!`);
        await fetchDashboardData();
      }
    } catch (err: any) {
      setSyncMessage(`Sinkronisasi gagal: ${err.message || "Kesalahan jaringan"}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const kpi = data?.kpi || {
    totalKaryawan: 585,
    karyawanAktif: 430,
    karyawanResign: 155,
    turnoverRate: 26.5,
    pctLokal: 31.6,
    pctNonLokal: 68.4,
    tingkatRetensi: 73.5,
  };

  // Monthly trend filtering
  const monthlyTrend = data?.monthlyTrend || [];

  const filteredTrend = useMemo(() => {
    let result = monthlyTrend;
    if (selectedYear !== "all") {
      const yr = parseInt(selectedYear, 10);
      result = result.filter((item) => item.year === yr);
    }
    return result;
  }, [monthlyTrend, selectedYear]);

  // Aggregate stats for filtered trend period
  const trendMetrics = useMemo(() => {
    let totalJoined = 0;
    let totalResigned = 0;
    let maxJoined = { count: 0, label: "-" };
    let maxResigned = { count: 0, label: "-" };

    filteredTrend.forEach((m) => {
      let j = m.joined;
      let r = m.resigned;
      if (selectedBranch === "HO Jakarta") {
        j = m.hoJoined;
        r = m.hoResigned;
      } else if (selectedBranch === "Site Muara Pahu") {
        j = m.mpJoined;
        r = m.mpResigned;
      } else if (selectedBranch === "Site Senyiur") {
        j = m.snyJoined;
        r = m.snyResigned;
      }

      totalJoined += j;
      totalResigned += r;

      if (j > maxJoined.count) {
        maxJoined = { count: j, label: m.label };
      }
      if (r > maxResigned.count) {
        maxResigned = { count: r, label: m.label };
      }
    });

    const net = totalJoined - totalResigned;
    const avgJoined = filteredTrend.length > 0 ? (totalJoined / filteredTrend.length).toFixed(1) : "0";
    const lastHeadcount = filteredTrend.length > 0 ? filteredTrend[filteredTrend.length - 1].activeEndMonth : 430;

    return {
      totalJoined,
      totalResigned,
      net,
      avgJoined,
      maxJoined,
      maxResigned,
      lastHeadcount,
    };
  }, [filteredTrend, selectedBranch]);

  // Chart data formatted according to branch filter with Trendline & Moving Average
  const chartData = useMemo(() => {
    const raw = filteredTrend.map((m) => {
      let active = m.activeEndMonth;
      let joined = m.joined;
      let resigned = m.resigned;

      if (selectedBranch === "HO Jakarta") {
        active = m.hoActive;
        joined = m.hoJoined;
        resigned = m.hoResigned;
      } else if (selectedBranch === "Site Muara Pahu") {
        active = m.muaraPahuActive;
        joined = m.mpJoined;
        resigned = m.mpResigned;
      } else if (selectedBranch === "Site Senyiur") {
        active = m.senyiurActive;
        joined = m.snyJoined;
        resigned = m.snyResigned;
      }

      return {
        ...m,
        displayActive: active,
        displayJoined: joined,
        displayResigned: resigned,
        displayNet: joined - resigned,
      };
    });

    // Linear Regression on displayActive: y = slope * x + intercept
    const n = raw.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    raw.forEach((d, i) => {
      sumX += i;
      sumY += d.displayActive;
      sumXY += i * d.displayActive;
      sumXX += i * i;
    });

    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
    const intercept = n > 1 ? (sumY - slope * sumX) / n : (sumY / (n || 1));

    return raw.map((d, i) => {
      // 3-Month Moving Average
      let sumMA = 0;
      let countMA = 0;
      for (let k = Math.max(0, i - 2); k <= i; k++) {
        sumMA += raw[k].displayActive;
        countMA++;
      }
      const movingAverage = countMA > 0 ? Math.round(sumMA / countMA) : d.displayActive;

      // Linear regression trendline value
      const trendline = Math.round(slope * i + intercept);

      // MoM Growth %
      const prevActive = i > 0 ? raw[i - 1].displayActive : d.displayActive;
      const momGrowth = prevActive > 0 ? Number((((d.displayActive - prevActive) / prevActive) * 100).toFixed(1)) : 0;

      return {
        ...d,
        movingAverage,
        trendline,
        momGrowth,
        slope,
      };
    });
  }, [filteredTrend, selectedBranch]);

  // Trend direction & velocity analysis
  const trendVelocity = useMemo(() => {
    if (chartData.length < 2) {
      return { slope: 0, direction: "Stabil", label: "Headcount stabil", lastMoM: 0 };
    }
    const slope = chartData[0]?.slope || 0;
    let direction = "Pertumbuhan Stabil";
    if (slope > 2) direction = "Tren Pertumbuhan Cepat (Ekspansi)";
    else if (slope > 0.5) direction = "Tren Pertumbuhan Moderat";
    else if (slope < -0.5) direction = "Tren Penurunan";

    const lastMoM = chartData[chartData.length - 1]?.momGrowth || 0;

    return {
      slope: Number(slope.toFixed(1)),
      direction,
      lastMoM,
    };
  }, [chartData]);

  // ==============================================================
  // DATA PREPARATION FOR THE 5 VISUAL DISTRIBUTION CHARTS
  // ==============================================================

  // 1. Proporsi Headcount per Cabang (Donut)
  const branchProportionData = useMemo(() => {
    return [
      { name: "Site Senyiur", value: 242, color: "#1c3d73", pct: "56,3%" },
      { name: "Site Muara Pahu", value: 161, color: "#f59e0b", pct: "37,4%" },
      { name: "HO Jakarta", value: 27, color: "#0284c7", pct: "6,3%" },
    ];
  }, [data]);

  // 2. Komposisi Karyawan: Lokal vs Non-Lokal (Donut)
  const localityProportionData = useMemo(() => {
    return [
      { name: "Non Lokal (Nasional)", value: 294, color: "#1c3d73", pct: "68,4%" },
      { name: "Lokal (Kaltim)", value: 136, color: "#10b981", pct: "31,6%" },
    ];
  }, [data]);

  // 3. Perbandingan Lokal vs Non-Lokal per Cabang (Grouped Bar)
  const localityPerBranchData = useMemo(() => {
    return (data?.branchComparison?.lokalitas || [
      { branch: "HO Jakarta", lokal: 0, nonLokal: 27 },
      { branch: "Site Muara Pahu", lokal: 56, nonLokal: 105 },
      { branch: "Site Senyiur", lokal: 80, nonLokal: 162 },
    ]).map((b) => ({
      name: b.branch.replace("Site ", ""),
      fullName: b.branch,
      lokal: b.lokal,
      nonLokal: b.nonLokal,
    }));
  }, [data]);

  // 4. Distribusi Karyawan Aktif per Departemen (Bar)
  const deptDistributionData = useMemo(() => {
    return (data?.departemen || [
      { name: "Production", aktif: 230 },
      { name: "Plant", aktif: 113 },
      { name: "Hrga", aktif: 26 },
      { name: "HSE", aktif: 20 },
      { name: "Logistic", aktif: 15 },
      { name: "FA & Procurement", aktif: 10 },
      { name: "Operations", aktif: 7 },
      { name: "BoD", aktif: 5 },
      { name: "Infrastructure", aktif: 4 },
    ]).map((d) => ({
      name: d.name === "FA & Procurement" ? "FA & Proc" : d.name,
      fullName: d.name,
      aktif: d.aktif,
    }));
  }, [data]);

  // 5. Sebaran Job Level per Cabang (Stacked Bar)
  const jobLevelStackedData = useMemo(() => {
    return (data?.jobLevel || [
      { level: "Director", ho: 5, mp: 0, sny: 0 },
      { level: "Manager", ho: 6, mp: 3, sny: 1 },
      { level: "Superintendent", ho: 0, mp: 4, sny: 3 },
      { level: "Supervisor", ho: 3, mp: 5, sny: 5 },
      { level: "Junior Supervisor", ho: 9, mp: 21, sny: 33 },
      { level: "Staff", ho: 0, mp: 0, sny: 0 },
      { level: "Worker", ho: 4, mp: 128, sny: 200 },
    ]).map((j) => ({
      level: j.level === "Junior Supervisor" ? "Jr. Spv" : j.level === "Superintendent" ? "Supt." : j.level,
      fullLevel: j.level,
      ho: j.ho,
      mp: j.mp,
      sny: j.sny,
      total: (j as any).total || (j.ho + j.mp + j.sny),
    }));
  }, [data]);

  // Custom Recharts Tooltip for Trend
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload[0].payload as MonthlyManpowerTrendItem & {
        displayActive: number;
        displayJoined: number;
        displayResigned: number;
        displayNet: number;
        trendline: number;
        movingAverage: number;
        momGrowth: number;
      };

      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 min-w-56">
          <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
            <span>{current.label}</span>
            <span className="text-[10px] text-slate-400 font-mono">Periode Bulanan</span>
          </p>
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1c3d73]" />
                Headcount Aktif:
              </span>
              <span className="font-bold font-mono text-slate-900">
                {current.displayActive} orang
              </span>
            </div>
            {showTrendline && (
              <div className="flex justify-between items-center text-[#e95623]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-[#e95623]" />
                  Garis Tren Regresi:
                </span>
                <span className="font-bold font-mono">
                  {current.trendline} orang
                </span>
              </div>
            )}
            {showMA && (
              <div className="flex justify-between items-center text-cyan-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-cyan-500" />
                  Moving Avg (3-Bln):
                </span>
                <span className="font-bold font-mono">
                  {current.movingAverage} orang
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Karyawan Masuk:
              </span>
              <span className="font-bold font-mono text-emerald-600">
                +{current.displayJoined}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Karyawan Resign:
              </span>
              <span className="font-bold font-mono text-rose-600">
                -{current.displayResigned}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-1">
              <span className="text-slate-500">Pertumbuhan MoM:</span>
              <span
                className={`font-bold font-mono ${
                  current.momGrowth >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {current.momGrowth > 0 ? `+${current.momGrowth}%` : `${current.momGrowth}%`}
              </span>
            </div>
            {selectedBranch === "all" && (
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
                <span>HO: {current.hoActive}</span>
                <span>MP: {current.muaraPahuActive}</span>
                <span>SNY: {current.senyiurActive}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Donut Charts
  const DonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
            {item.name}
          </p>
          <p className="font-mono text-slate-600">
            Jumlah: <strong className="text-slate-900 font-bold">{item.value} orang</strong> ({item.payload.pct})
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Bar Charts
  const GenericBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1 min-w-36">
          <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center gap-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className="font-bold font-mono text-slate-900">{p.value} orang</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================== */}
      {/* 1. HEADER & CONTROLS */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1c3d73]/10 text-[#1c3d73] border border-[#1c3d73]/20">
              Human Resource & Development
            </span>
            {data?.lastSync && (
              <span className="text-[11px] text-slate-400">
                Terakhir sinkron: {new Date(data.lastSync).toLocaleString("id-ID")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            Dashboard Analitika Tenaga Kerja
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring Demografi, Status Ketenagakerjaan, Tren Bulan ke Bulan, dan Komparasi Cabang
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Tab Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              Semua Analisis
            </button>
            <button
              onClick={() => setActiveTab("trend")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "trend"
                  ? "bg-white text-[#1c3d73] shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#1c3d73]" />
              <span>Grafik Tren Bulanan</span>
            </button>
            <button
              onClick={() => setActiveTab("distribution")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "distribution"
                  ? "bg-white text-[#1c3d73] shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#1c3d73]" />
              <span>Grafik Distribusi</span>
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              Ikhtisar & Demografi
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "comparison"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              Komparasi Cabang
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1c3d73] hover:bg-[#152e56] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Menyinkronkan..." : "Sinkronkan HR"}</span>
          </button>

          {onNavigateToMasterManpower && (
            <button
              onClick={onNavigateToMasterManpower}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Master Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            syncMessage.includes("gagal")
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TOP KPI CARDS (Matching Image 1) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: TOTAL KARYAWAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#1c3d73] uppercase tracking-wider">
            Total Karyawan
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {kpi.totalKaryawan}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Database Keseluruhan</p>
        </div>

        {/* Card 2: KARYAWAN AKTIF */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Karyawan Aktif
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-emerald-700 tracking-tight font-mono">
              {kpi.karyawanAktif}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Status Aktif Saat Ini</p>
        </div>

        {/* Card 3: KARYAWAN RESIGN */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
            Karyawan Resign
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-rose-600 tracking-tight font-mono">
              {kpi.karyawanResign}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Telah Berhenti/Resign</p>
        </div>

        {/* Card 4: TURNOVER RATE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#1c3d73] uppercase tracking-wider">
            Turnover Rate
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-[#1c3d73] tracking-tight font-mono">
              {kpi.turnoverRate.toFixed(1).replace(".", ",")}%
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Rasio Resign vs Total</p>
        </div>

        {/* Card 5: % KARYAWAN LOKAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            % Karyawan Lokal
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {kpi.pctLokal.toFixed(1).replace(".", ",")}%
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Tenaga Kerja Daerah</p>
        </div>

        {/* Card 6: % NON-LOKAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            % Non-Lokal
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {kpi.pctNonLokal.toFixed(1).replace(".", ",")}%
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Tenaga Kerja Nasional</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SECTION GRAFIK TREN BULAN KE BULAN & TREND INTELLIGENCE */}
      {/* ============================================================== */}
      {(activeTab === "all" || activeTab === "trend") && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Header of Trend Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#1c3d73]/10 text-[#1c3d73] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Grafik & Analisis Tren Manpower Bulan ke Bulan
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualisasi pergerakan tenaga kerja kumulatif, garis tren linier, moving average, karyawan masuk, dan pertumbuhan per bulan
              </p>
            </div>

            {/* Filter Toolbar (Year, Branch, Mode) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Year Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <span className="text-[10px] text-slate-400 uppercase font-bold px-1.5">Tahun:</span>
                {["all", "2024", "2025", "2026"].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedYear === yr
                        ? "bg-white text-slate-900 shadow-xs"
                        : "hover:text-slate-900 text-slate-500"
                    }`}
                  >
                    {yr === "all" ? "Semua" : yr}
                  </button>
                ))}
              </div>

              {/* Branch Selector */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border-none focus:ring-2 focus:ring-[#1c3d73] cursor-pointer"
              >
                <option value="all">Semua Cabang (HO & Sites)</option>
                <option value="HO Jakarta">HO Jakarta</option>
                <option value="Site Muara Pahu">Site Muara Pahu</option>
                <option value="Site Senyiur">Site Senyiur</option>
              </select>

              {/* Chart Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setChartMode("active")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === "active"
                      ? "bg-[#1c3d73] text-white shadow-xs"
                      : "hover:text-slate-900 text-slate-600"
                  }`}
                  title="Headcount Aktif & Garis Tren"
                >
                  Headcount & Tren
                </button>
                <button
                  onClick={() => setChartMode("flow")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === "flow"
                      ? "bg-[#1c3d73] text-white shadow-xs"
                      : "hover:text-slate-900 text-slate-600"
                  }`}
                  title="Karyawan Masuk vs Keluar"
                >
                  Masuk vs Keluar
                </button>
                <button
                  onClick={() => setChartMode("growth")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === "growth"
                      ? "bg-[#1c3d73] text-white shadow-xs"
                      : "hover:text-slate-900 text-slate-600"
                  }`}
                  title="Pertumbuhan MoM (%)"
                >
                  MoM Growth (%)
                </button>
                <button
                  onClick={() => setChartMode("branches")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === "branches"
                      ? "bg-[#1c3d73] text-white shadow-xs"
                      : "hover:text-slate-900 text-slate-600"
                  }`}
                  title="Sebaran Cabang per Bulan"
                >
                  Komposisi Cabang
                </button>
                <button
                  onClick={() => setChartMode("turnover")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === "turnover"
                      ? "bg-[#1c3d73] text-white shadow-xs"
                      : "hover:text-slate-900 text-slate-600"
                  }`}
                  title="Turnover Rate Bulanan"
                >
                  Turnover Rate
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics of Filtered Horizon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Masuk</span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                +{trendMetrics.totalJoined}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">di periode terpilih</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Resign</span>
              <span className="text-xl font-black text-rose-600 font-mono">
                -{trendMetrics.totalResigned}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">di periode terpilih</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Pertumbuhan</span>
              <span
                className={`text-xl font-black font-mono ${
                  trendMetrics.net >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {trendMetrics.net > 0 ? `+${trendMetrics.net}` : trendMetrics.net}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">selisih masuk - keluar</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Rata-rata Masuk</span>
              <span className="text-xl font-black text-slate-900 font-mono">
                {trendMetrics.avgJoined}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">karyawan / bulan</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Puncak Masuk</span>
              <span className="text-sm font-black text-slate-900 truncate block">
                {trendMetrics.maxJoined.label}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                +{trendMetrics.maxJoined.count} orang
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Headcount Terkini</span>
              <span className="text-xl font-black text-[#1c3d73] font-mono">
                {trendMetrics.lastHeadcount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">tenaga kerja aktif</span>
            </div>
          </div>

          {/* Trend Intelligence / Executive Insight Banner */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Arah Tren Bisnis</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{trendVelocity.direction}</p>
                <p className="text-[11px] text-slate-500">Laju rerata +{trendVelocity.slope} orang/bln</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Pertumbuhan MoM Terakhir</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {trendVelocity.lastMoM > 0 ? `+${trendVelocity.lastMoM}%` : `${trendVelocity.lastMoM}%`}
                </p>
                <p className="text-[11px] text-slate-500">Kapasitas tenaga kerja optimal</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Rasio Rekrutmen vs Resign</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {(trendMetrics.totalJoined / (trendMetrics.totalResigned || 1)).toFixed(2)}x
                </p>
                <p className="text-[11px] text-slate-500">+{trendMetrics.totalJoined} masuk / -{trendMetrics.totalResigned} keluar</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Proyeksi Kuartal Depan</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                  {Math.round(trendMetrics.lastHeadcount + trendVelocity.slope * 3)} orang
                </p>
                <p className="text-[11px] text-slate-500">Estimasi berbasis regresi linier</p>
              </div>
            </div>
          </div>

          {/* Chart Controls: Toggle Trendline & Moving Average when applicable */}
          {chartMode === "active" && (
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTrendline}
                    onChange={(e) => setShowTrendline(e.target.checked)}
                    className="rounded border-slate-300 text-[#e95623] focus:ring-[#e95623]"
                  />
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#e95623] inline-block" />
                    Garis Tren Linier (Linear Trendline)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showMA}
                    onChange={(e) => setShowMA(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-600"
                  />
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-cyan-500 inline-block" />
                    Moving Average (MA 3-Bulan)
                  </span>
                </label>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Arah tren: <strong className="text-slate-600 font-semibold">{trendVelocity.direction}</strong> (+{trendVelocity.slope}/bulan)
              </span>
            </div>
          )}

          {/* Chart Rendering Container */}
          <div className="w-full h-80 min-h-80 bg-white rounded-xl pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "active" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="headcountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1c3d73" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1c3d73" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="displayActive"
                    name="Headcount Aktif"
                    stroke="#1c3d73"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#headcountGrad)"
                    dot={{ fill: "#1c3d73", r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "#e95623", stroke: "#fff", strokeWidth: 2 }}
                  />
                  {showTrendline && (
                    <Line
                      type="monotone"
                      dataKey="trendline"
                      name="Garis Tren (Linear Regression)"
                      stroke="#e95623"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                  {showMA && (
                    <Line
                      type="monotone"
                      dataKey="movingAverage"
                      name="Moving Average (3-Bulan)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                  )}
                </AreaChart>
              ) : chartMode === "flow" ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                  />
                  <Bar
                    dataKey="displayJoined"
                    name="Karyawan Masuk (Join)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="displayResigned"
                    name="Karyawan Keluar (Resign)"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="displayNet"
                    name="Net Growth (+/-)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", r: 3 }}
                  />
                </BarChart>
              ) : chartMode === "growth" ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                  />
                  <Bar
                    dataKey="momGrowth"
                    name="Pertumbuhan MoM (%)"
                    fill="#0284c7"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="momGrowth"
                    name="Kurva Pertumbuhan"
                    stroke="#1c3d73"
                    strokeWidth={2}
                    dot={{ fill: "#1c3d73", r: 3 }}
                  />
                </BarChart>
              ) : chartMode === "branches" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="senyiurGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1c3d73" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#1c3d73" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="mpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="hoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="senyiurActive"
                    name="Site Senyiur"
                    stackId="1"
                    stroke="#1c3d73"
                    fill="url(#senyiurGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="muaraPahuActive"
                    name="Site Muara Pahu"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="url(#mpGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="hoActive"
                    name="HO Jakarta"
                    stackId="1"
                    stroke="#0284c7"
                    fill="url(#hoGrad)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="turnoverRate"
                    name="Turnover Rate Bulanan (%)"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ fill: "#f43f5e", r: 3 }}
                    activeDot={{ r: 6, fill: "#e95623", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Collapsible Monthly Breakdown Table with Trend Columns */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTableDetails(!showTableDetails)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1c3d73]" />
                <span>
                  {showTableDetails ? "Sembunyikan" : "Tampilkan"} Tabel Rincian Data & Tren Bulanan ({filteredTrend.length} Bulan)
                </span>
              </div>
              {showTableDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTableDetails && (
              <div className="p-0 overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#1c3d73] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Periode</th>
                      <th className="py-2.5 px-3 text-right">Masuk</th>
                      <th className="py-2.5 px-3 text-right">Keluar</th>
                      <th className="py-2.5 px-3 text-right">Net Growth</th>
                      <th className="py-2.5 px-4 text-right">Headcount Aktif</th>
                      <th className="py-2.5 px-3 text-right">Garis Tren</th>
                      <th className="py-2.5 px-3 text-right">Moving Avg</th>
                      <th className="py-2.5 px-3 text-right">MoM Growth</th>
                      <th className="py-2.5 px-4 text-right">Turnover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {chartData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-4 font-sans font-bold text-slate-800">{row.label}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          {row.displayJoined > 0 ? `+${row.displayJoined}` : "0"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {row.displayResigned > 0 ? `-${row.displayResigned}` : "0"}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            row.displayNet >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {row.displayNet > 0 ? `+${row.displayNet}` : row.displayNet}
                        </td>
                        <td className="py-2 px-4 text-right font-black text-slate-900 bg-slate-50/50">
                          {row.displayActive}
                        </td>
                        <td className="py-2 px-3 text-right text-[#e95623] font-bold">
                          {row.trendline}
                        </td>
                        <td className="py-2 px-3 text-right text-cyan-700 font-bold">
                          {row.movingAverage}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            row.momGrowth >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {row.momGrowth > 0 ? `+${row.momGrowth}%` : `${row.momGrowth}%`}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-500 font-sans">
                          {row.turnoverRate.toFixed(1).replace(".", ",")}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SECTION GRAFIK DISTRIBUSI & DEMOGRAFI (NEW USER REQUEST) */}
      {/* ============================================================== */}
      {(activeTab === "all" || activeTab === "distribution") && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-t border-slate-200 pt-6">
            <BarChart3 className="w-5 h-5 text-[#1c3d73]" />
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Grafik Analitik Distribusi & Demografi
              </h2>
              <p className="text-xs text-slate-500">
                Visualisasi komparatif proporsi cabang, lokalitas daerah, sebaran departemen, dan jenjang jabatan
              </p>
            </div>
          </div>

          {/* Row 1: Dua Donut Charts (Proporsi Cabang & Komposisi Lokalitas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Proporsi Headcount per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#1c3d73]/10 text-[#1c3d73] flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Proporsi Headcount per Cabang
                      </h3>
                      <p className="text-[11px] text-slate-400">Sebaran total 430 karyawan aktif</p>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono text-[#1c3d73] bg-slate-100 px-2 py-0.5 rounded-md">
                    3 Unit Kerja
                  </span>
                </div>

                <div className="w-full h-56 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={branchProportionData}
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {branchProportionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Clean Legend Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                {branchProportionData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
                      {item.value} <span className="text-[10px] font-normal text-slate-500">org</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Komposisi Karyawan: Lokal vs Non-Lokal */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Komposisi Karyawan: Lokal vs Non-Lokal
                      </h3>
                      <p className="text-[11px] text-slate-400">Tenaga kerja daerah vs nasional</p>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    31,6% Lokal
                  </span>
                </div>

                <div className="w-full h-56 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={localityProportionData}
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {localityProportionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Clean Legend Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                {localityProportionData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
                      {item.value} <span className="text-[10px] font-normal text-slate-500">org</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Perbandingan Lokal per Cabang & Distribusi Departemen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 3: Perbandingan Tenaga Kerja: Lokal vs Non-Lokal per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#1c3d73]/10 text-[#1c3d73] flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Perbandingan Lokal vs Non-Lokal per Cabang
                      </h3>
                      <p className="text-[11px] text-slate-400">Komparasi personil daerah di masing-masing lokasi kerja</p>
                    </div>
                  </div>
                </div>

                <div className="w-full h-64 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={localityPerBranchData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="fullName" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<GenericBarTooltip />} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                      <Bar dataKey="lokal" name="Lokal (Kaltim)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="nonLokal" name="Non-Lokal (Nasional)" fill="#1c3d73" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex justify-between mt-2">
                <span>Site Muara Pahu: <strong className="text-slate-800">34,8%</strong> Lokal</span>
                <span>Site Senyiur: <strong className="text-slate-800">33,1%</strong> Lokal</span>
                <span>HO Jakarta: <strong className="text-slate-800">0,0%</strong> Lokal</span>
              </div>
            </div>

            {/* Chart 4: Distribusi Karyawan Aktif per Departemen */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#1c3d73]/10 text-[#1c3d73] flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Distribusi Karyawan Aktif per Departemen
                      </h3>
                      <p className="text-[11px] text-slate-400">Kekuatan personil operasional per divisi kerja</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    9 Divisi
                  </span>
                </div>

                <div className="w-full h-64 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptDistributionData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-20} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<GenericBarTooltip />} />
                      <Bar dataKey="aktif" name="Personil Aktif" fill="#1c3d73" radius={[4, 4, 0, 0]}>
                        {deptDistributionData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={index === 0 ? "#1c3d73" : index === 1 ? "#2563eb" : "#0284c7"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex justify-between mt-2">
                <span>Top 1: <strong className="text-slate-800">Production (230 orang / 53,5%)</strong></span>
                <span>Top 2: <strong className="text-slate-800">Plant (113 orang / 26,3%)</strong></span>
              </div>
            </div>
          </div>

          {/* Row 3: Sebaran Job Level per Cabang (Full Width Stacked Bar) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#1c3d73]/10 text-[#1c3d73] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Sebaran Job Level per Cabang (Aktif)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Struktur tingkatan jabatan (Director, Manager, Superintendent, Supervisor, Jr. Spv, Staff, Worker) ditumpuk per cabang
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Total 430 Personil
              </span>
            </div>

            <div className="w-full h-72 pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobLevelStackedData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="fullLevel" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<GenericBarTooltip />} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                  <Bar dataKey="sny" name="Site Senyiur" stackId="a" fill="#1c3d73" />
                  <Bar dataKey="mp" name="Site Muara Pahu" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="ho" name="HO Jakarta" stackId="a" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SECTION OVERVIEW & DEMOGRAFI (Matching Image 2) */}
      {/* ============================================================== */}
      {(activeTab === "all" || activeTab === "overview") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: STATUS KETENAGAKERJAAN & INDIKATOR KINERJA */}
            <div className="space-y-6">
              {/* Table 1: Status Ketenagakerjaan & Turnover */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Status Ketenagakerjaan & Turnover
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Status Hubungan Kerja</th>
                        <th className="py-2.5 px-3 text-right">Aktif</th>
                        <th className="py-2.5 px-3 text-right">Resign</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.statusKetenagakerjaan || [
                        { status: "PKWT (Kontrak)", aktif: 395, resign: 152, total: 547 },
                        { status: "PKWTT (Tetap)", aktif: 21, resign: 2, total: 23 },
                        { status: "Magang / Trainee", aktif: 14, resign: 1, total: 15 },
                        { status: "Lainnya / Non-Kategori", aktif: 0, resign: 0, total: 0 },
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-medium text-slate-800">{row.status}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {row.aktif}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                            {row.resign}
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                        <td className="py-2.5 px-4">Total Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">{kpi.karyawanResign}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{kpi.totalKaryawan}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table 2: Indikator Kinerja Turnover */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Indikator Kinerja Turnover
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Turnover Rate (Resign / Total)</span>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {kpi.turnoverRate.toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Tingkat Retensi (Aktif / Total)</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      {kpi.tingkatRetensi.toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: DEMOGRAFI TENAGA KERJA (AKTIF) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Demografi Tenaga Kerja (Aktif)
                  </h3>
                </div>

                <div className="p-4 space-y-5">
                  {/* Subsection 1: Komposisi Gender */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Komposisi Gender
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(data?.demografi?.gender || [
                        { label: "Laki-laki (Male)", count: 425, ratio: 98.8, color: "bg-[#1c3d73]" },
                        { label: "Perempuan (Female)", count: 5, ratio: 1.2, color: "bg-rose-500" },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800 w-36 truncate">{item.label}</span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="font-mono text-slate-500 w-12 text-right">{item.ratio}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-15">
                            <div
                              className={`h-full rounded-full ${item.color || "bg-[#1c3d73]"}`}
                              style={{ width: `${Math.min(item.ratio, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Subsection 2: Lokalitas (POH) */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Lokalitas (POH)
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(data?.demografi?.lokalitas || [
                        { label: "Lokal (Kaltim)", count: 136, ratio: 31.6, color: "bg-emerald-600" },
                        { label: "Non Lokal (Nasional)", count: 294, ratio: 68.4, color: "bg-blue-600" },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800 w-36 truncate">{item.label}</span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="font-mono text-slate-500 w-12 text-right">{item.ratio}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-15">
                            <div
                              className={`h-full rounded-full ${item.color || "bg-emerald-600"}`}
                              style={{ width: `${Math.min(item.ratio, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Subsection 3: Kelompok Usia Karyawan */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Kelompok Usia Karyawan
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(data?.demografi?.usia || [
                        { label: "< 25 Tahun", count: 107, ratio: 24.9, color: "bg-cyan-500" },
                        { label: "25 - 35 Tahun", count: 182, ratio: 42.3, color: "bg-blue-500" },
                        { label: "36 - 45 Tahun", count: 112, ratio: 26.0, color: "bg-indigo-600" },
                        { label: "> 45 Tahun", count: 29, ratio: 6.7, color: "bg-purple-600" },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800 w-36 truncate">{item.label}</span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="font-mono text-slate-500 w-12 text-right">{item.ratio}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-15">
                            <div
                              className={`h-full rounded-full ${item.color || "bg-indigo-600"}`}
                              style={{ width: `${Math.min(item.ratio, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: DISTRIBUSI DEPARTEMEN / ORGANISASI */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Distribusi Departemen / Organisasi
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Departemen</th>
                        <th className="py-2.5 px-3 text-right">Aktif</th>
                        <th className="py-2.5 px-3 text-right">Rasio</th>
                        <th className="py-2.5 px-4 text-left">Distribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.departemen || [
                        { name: "Production", aktif: 230, ratio: 53.5 },
                        { name: "Plant", aktif: 113, ratio: 26.3 },
                        { name: "Hrga", aktif: 26, ratio: 6.0 },
                        { name: "HSE", aktif: 20, ratio: 4.7 },
                        { name: "Logistic", aktif: 15, ratio: 3.5 },
                        { name: "FA & Procurement", aktif: 10, ratio: 2.3 },
                        { name: "Operations", aktif: 7, ratio: 1.6 },
                        { name: "BoD", aktif: 5, ratio: 1.2 },
                        { name: "Infrastructure", aktif: 4, ratio: 0.9 },
                      ]).map((dept, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-medium text-slate-800">{dept.name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {dept.aktif}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {dept.ratio}%
                          </td>
                          <td className="py-2 px-4">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1c3d73] rounded-full"
                                style={{ width: `${Math.min(dept.ratio, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                        <td className="py-2.5 px-4">Total Departemen</td>
                        <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                        <td className="py-2.5 px-3 text-right font-mono">100,0%</td>
                        <td className="py-2.5 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row in Overview: Struktur Job Level & Tingkat Pendidikan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table: Struktur Job Level per Cabang (Aktif) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Struktur Job Level per Cabang (Aktif)
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Jenjang Jabatan</th>
                      <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                      <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                      <th className="py-2.5 px-3 text-right">Senyiur</th>
                      <th className="py-2.5 px-3 text-right font-black text-slate-900">Total</th>
                      <th className="py-2.5 px-4 text-right">Rasio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.jobLevel || [
                      { level: "Director", ho: 5, mp: 0, sny: 0, total: 5, ratio: 1.2 },
                      { level: "Manager", ho: 6, mp: 3, sny: 1, total: 10, ratio: 2.3 },
                      { level: "Superintendent", ho: 0, mp: 4, sny: 3, total: 7, ratio: 1.6 },
                      { level: "Supervisor", ho: 3, mp: 5, sny: 5, total: 13, ratio: 3.0 },
                      { level: "Junior Supervisor", ho: 9, mp: 21, sny: 33, total: 63, ratio: 14.7 },
                      { level: "Staff", ho: 0, mp: 0, sny: 0, total: 0, ratio: 0.0 },
                      { level: "Worker", ho: 4, mp: 128, sny: 200, total: 332, ratio: 77.2 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-medium text-slate-800">{row.level}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{row.ho}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{row.mp}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{row.sny}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.total}
                        </td>
                        <td className="py-2 px-4 text-right font-mono text-slate-500">
                          {row.ratio}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Job Level</td>
                      <td className="py-2.5 px-3 text-right font-mono">27</td>
                      <td className="py-2.5 px-3 text-right font-mono">161</td>
                      <td className="py-2.5 px-3 text-right font-mono">242</td>
                      <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                      <td className="py-2.5 px-4 text-right font-mono">100,0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table: Tingkat Pendidikan (Aktif) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Tingkat Pendidikan (Aktif)
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Pendidikan</th>
                        <th className="py-2.5 px-3 text-right">Jumlah</th>
                        <th className="py-2.5 px-3 text-right">Rasio</th>
                        <th className="py-2.5 px-4 text-left">Distribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.pendidikan || [
                        { name: "SMA / SMK / Sederajat", count: 313, ratio: 72.8, color: "bg-[#1c3d73]" },
                        { name: "Diploma (D3 / D4)", count: 19, ratio: 4.4, color: "bg-emerald-600" },
                        { name: "Sarjana & Magister (S1/S2)", count: 47, ratio: 10.9, color: "bg-orange-500" },
                        { name: "Belum Terdata / Lainnya", count: 51, ratio: 11.9, color: "bg-slate-400" },
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{row.name}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {row.count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {row.ratio}%
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.color || "bg-[#1c3d73]"}`}
                                style={{ width: `${Math.min(row.ratio, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                        <td className="py-2.5 px-4">Total Terverifikasi</td>
                        <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                        <td className="py-2.5 px-3 text-right font-mono">100,0%</td>
                        <td className="py-2.5 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SECTION KOMPARASI CABANG / SITE (Matching Image 3) */}
      {/* ============================================================== */}
      {(activeTab === "all" || activeTab === "comparison") && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-2 border-t border-slate-200 pt-6">
            <Building2 className="w-5 h-5 text-[#1c3d73]" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Analisis Komparasi Antar Cabang / Site
            </h2>
            <span className="text-xs text-slate-400 font-medium ml-2">
              (HO Jakarta vs Site Muara Pahu vs Site Senyiur)
            </span>
          </div>

          {/* Row 1: Metrik Utama, Lokalitas, Gender per Cabang */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Table 1: Komparasi Metrik Utama per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Komparasi Metrik Utama per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Branch / Unit Kerja</th>
                      <th className="py-2.5 px-3 text-right">Aktif</th>
                      <th className="py-2.5 px-3 text-right">Resign</th>
                      <th className="py-2.5 px-4 text-right">Turnover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.metrikUtama || [
                      { branch: "HO Jakarta", aktif: 27, resign: 13, turnoverRate: 32.5 },
                      { branch: "Site Muara Pahu", aktif: 161, resign: 9, turnoverRate: 5.3 },
                      { branch: "Site Senyiur", aktif: 242, resign: 133, turnoverRate: 35.5 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-medium text-slate-800">{row.branch}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.aktif}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {row.resign}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {row.turnoverRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Perusahaan</td>
                      <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600">{kpi.karyawanResign}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.turnoverRate}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 2: Komposisi Lokalitas per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Komposisi Lokalitas per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Branch / Lokasi</th>
                      <th className="py-2.5 px-3 text-right">Lokal</th>
                      <th className="py-2.5 px-3 text-right">Non-Lokal</th>
                      <th className="py-2.5 px-4 text-right">% Lokal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.lokalitas || [
                      { branch: "HO Jakarta", lokal: 0, nonLokal: 27, pctLokal: 0.0 },
                      { branch: "Site Muara Pahu", lokal: 56, nonLokal: 105, pctLokal: 34.8 },
                      { branch: "Site Senyiur", lokal: 80, nonLokal: 162, pctLokal: 33.1 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-medium text-slate-800">{row.branch}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {row.lokal}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.nonLokal}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {row.pctLokal}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Perusahaan</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">136</td>
                      <td className="py-2.5 px-3 text-right font-mono">294</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.pctLokal}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 3: Komposisi Gender per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Komposisi Gender per Cabang (L / P)
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Branch / Lokasi</th>
                        <th className="py-2.5 px-4 text-right">Komposisi (L / P)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.branchComparison?.gender || [
                        { branch: "HO Jakarta", ratioStr: "22 L / 5 P" },
                        { branch: "Site Muara Pahu", ratioStr: "161 L / 0 P" },
                        { branch: "Site Senyiur", ratioStr: "242 L / 0 P" },
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-medium text-slate-800">{row.branch}</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                            {row.ratioStr}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500">
                Catatan: Mayoritas personil lapangan merupakan tenaga kerja operasional teknis tambang.
              </div>
            </div>
          </div>

          {/* Row 2: Status Hubungan Kerja & Distribusi Departemen per Cabang */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Hubungan Kerja per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Status Hubungan Kerja per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Status Kerja</th>
                      <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                      <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                      <th className="py-2.5 px-3 text-right">Senyiur</th>
                      <th className="py-2.5 px-4 text-right font-black text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.statusKerja || [
                      { status: "PKWT (Kontrak)", ho: 10, mp: 155, sny: 230 },
                      { status: "PKWTT (Tetap)", ho: 16, mp: 1, sny: 4 },
                      { status: "Magang & Non-Kategori", ho: 1, mp: 5, sny: 8 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{row.status}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.ho}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.mp}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.sny}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {row.ho + row.mp + row.sny}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Tenaga Kerja</td>
                      <td className="py-2.5 px-3 text-right font-mono">27</td>
                      <td className="py-2.5 px-3 text-right font-mono">161</td>
                      <td className="py-2.5 px-3 text-right font-mono">242</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.karyawanAktif}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Distribusi Kelompok Usia per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Distribusi Kelompok Usia per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Kelompok Usia</th>
                      <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                      <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                      <th className="py-2.5 px-3 text-right">Senyiur</th>
                      <th className="py-2.5 px-4 text-right font-black text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.usia || [
                      { kelompok: "< 25 Tahun", ho: 5, mp: 30, sny: 72 },
                      { kelompok: "25 - 35 Tahun", ho: 9, mp: 68, sny: 105 },
                      { kelompok: "36 - 45 Tahun", ho: 7, mp: 52, sny: 53 },
                      { kelompok: "> 45 Tahun", ho: 6, mp: 11, sny: 12 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{row.kelompok}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.ho}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.mp}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.sny}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {row.ho + row.mp + row.sny}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Karyawan</td>
                      <td className="py-2.5 px-3 text-right font-mono">27</td>
                      <td className="py-2.5 px-3 text-right font-mono">161</td>
                      <td className="py-2.5 px-3 text-right font-mono">242</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.karyawanAktif}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Row 3: Distribusi Departemen per Cabang */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-[#1c3d73] text-white px-4 py-3">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Distribusi Departemen per Cabang (Aktif)
              </h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                    <th className="py-2.5 px-4">Departemen / Divisi</th>
                    <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                    <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                    <th className="py-2.5 px-3 text-right">Senyiur</th>
                    <th className="py-2.5 px-4 text-right font-black text-slate-900">Total Departemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.branchComparison?.departemen || [
                    { departemen: "Production", ho: 0, mp: 101, sny: 129 },
                    { departemen: "Plant", ho: 1, mp: 33, sny: 79 },
                    { departemen: "Hrga", ho: 7, mp: 7, sny: 12 },
                    { departemen: "HSE", ho: 0, mp: 9, sny: 11 },
                    { departemen: "Logistic", ho: 0, mp: 7, sny: 8 },
                    { departemen: "FA & Procurement", ho: 10, mp: 0, sny: 0 },
                    { departemen: "Operations", ho: 3, mp: 2, sny: 2 },
                    { departemen: "BoD", ho: 5, mp: 0, sny: 0 },
                    { departemen: "Infrastructure", ho: 1, mp: 2, sny: 1 },
                  ]).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-4 font-medium text-slate-800">{row.departemen}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{row.ho}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{row.mp}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{row.sny}</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        {row.ho + row.mp + row.sny}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                    <td className="py-2.5 px-4">Total Departemen</td>
                    <td className="py-2.5 px-3 text-right font-mono">27</td>
                    <td className="py-2.5 px-3 text-right font-mono">161</td>
                    <td className="py-2.5 px-3 text-right font-mono">242</td>
                    <td className="py-2.5 px-4 text-right font-mono">{kpi.karyawanAktif}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
