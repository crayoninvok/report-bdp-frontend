"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "../types/auth";
import {
  glService,
  GLPeriodItem,
  GLProfitCenterData,
} from "../services/glService";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Building2,
  DollarSign,
  Download,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  PieChart,
  Truck,
  Layers,
  FileSpreadsheet,
  Gauge,
  Wallet,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

interface ProfitCenterViewProps {
  user: User;
  onNavigateBack?: () => void;
}

export const ProfitCenterView: React.FC<ProfitCenterViewProps> = ({
  user,
  onNavigateBack,
}) => {
  // STRICT AUTHORIZATION CHECK:
  // Only dzaky.athariqf@bataramining.com can open / view this module
  const isAuthorized =
    user?.email?.trim().toLowerCase() === "dzaky.athariqf@bataramining.com";

  // If not authorized, render Access Denied Screen immediately
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-rose-500 via-amber-500 to-rose-600" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Restricted Access • Akses Terbatas
          </span>

          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            Otorisasi Tidak Memenuhi Syarat
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Halaman <span className="font-bold text-slate-800">Profit Center</span> memuat analisis performa finansial strategis dan margin laba rugi perusahaan. Modul ini secara ketat hanya dapat dibuka oleh akun eksekutif:
            <br />
            <span className="inline-block mt-2 font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 text-xs">
              dzaky.athariqf@bataramining.com
            </span>
          </p>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left mb-6">
            <p className="text-[11px] text-slate-400 font-medium">Akun Anda saat ini:</p>
            <p className="text-xs font-semibold text-slate-800 truncate">{user.name} ({user.email})</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Role: {user.role} • Site: {user.jobSite}</p>
          </div>

          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
            >
              Kembali ke Dashboard Cost
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- STATE FOR AUTHORIZED USER (DZAKY) ---
  const [periods, setPeriods] = useState<GLPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [profitData, setProfitData] = useState<GLProfitCenterData | null>(null);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<"ALL" | "MPH" | "SNY" | "HOF">("ALL");

  // Tariff simulation controls (IDR / Ton)
  const [tariffMph, setTariffMph] = useState<number>(85000);
  const [tariffSny, setTariffSny] = useState<number>(90000);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Table filters & controls
  const [tableSearch, setTableSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Formatters
  const formatIDR = (val: number | null | undefined, abbreviate = false) => {
    if (val === null || val === undefined) return "Rp 0";
    if (abbreviate) {
      if (Math.abs(val) >= 1_000_000_000) {
        return `Rp ${(val / 1_000_000_000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
      }
      if (Math.abs(val) >= 1_000_000) {
        return `Rp ${(val / 1_000_000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jt`;
      }
    }
    return `Rp ${Math.round(val).toLocaleString("id-ID")}`;
  };

  const formatNumber = (val: number | null | undefined, decimals = 0) => {
    if (val === null || val === undefined) return "0";
    return val.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Fetch initial periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const periodList = await glService.getPeriods();
        setPeriods(periodList);
        if (periodList.length > 0) {
          setSelectedPeriodId(periodList[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching periods:", err);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch profit center data when period or tariffs change
  const fetchProfitCenterData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await glService.getProfitCenter({
        periodId: selectedPeriodId || undefined,
        tariffMph,
        tariffSny,
      });

      if (res.success && res.data) {
        setProfitData(res.data);
      } else {
        setError(res.message || "Gagal memuat data Profit Center.");
      }
    } catch (err: any) {
      console.error("Error loading profit center:", err);
      setError(err.message || "Gagal memuat data Profit Center dari server.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfitCenterData();
  }, [selectedPeriodId, tariffMph, tariffSny]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProfitCenterData();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!profitData) return;

    const headers = [
      "Kode Akun",
      "Nama Akun",
      "Muara Pahu (MPH)",
      "Senyiur (SNY)",
      "Head Office (HOF)",
      "Total Konsolidasi",
      "Biaya per Ton (Rp)",
    ];

    const rows = profitData.summaries.map((s) => [
      `"${s.accountCode}"`,
      `"${s.accountName.replace(/"/g, '""')}"`,
      s.mphAmount,
      s.snyAmount,
      s.hofAmount,
      s.grandTotal,
      profitData.production.totalTon > 0
        ? Math.round(s.grandTotal / profitData.production.totalTon)
        : 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Profit_Center_Report_${profitData.period.periodName.replace(/[^a-zA-Z0-9]/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered summaries for financial table
  const filteredSummaries = useMemo(() => {
    if (!profitData) return [];
    if (!tableSearch) return profitData.summaries;
    const q = tableSearch.toLowerCase();
    return profitData.summaries.filter(
      (s) =>
        s.accountCode.toLowerCase().includes(q) ||
        s.accountName.toLowerCase().includes(q)
    );
  }, [profitData, tableSearch]);

  // Chart data: Site Comparison
  const siteComparisonChartData = useMemo(() => {
    if (!profitData) return [];
    return [
      {
        site: "Muara Pahu (MPH)",
        Pendapatan: profitData.revenue.mph,
        Beban: profitData.opex.mph,
        Laba: profitData.profit.grossMph,
        MarginPct: profitData.profit.marginPercentMph,
      },
      {
        site: "Senyiur (SNY)",
        Pendapatan: profitData.revenue.sny,
        Beban: profitData.opex.sny,
        Laba: profitData.profit.grossSny,
        MarginPct: profitData.profit.marginPercentSny,
      },
      {
        site: "Konsolidasi (Total)",
        Pendapatan: profitData.revenue.total,
        Beban: profitData.opex.total,
        Laba: profitData.profit.netConsolidated,
        MarginPct: profitData.profit.marginPercentConsolidated,
      },
    ];
  }, [profitData]);

  // Chart data: Account Groups
  const accountGroupChartData = useMemo(() => {
    if (!profitData) return [];
    return profitData.accountGroups.map((g) => ({
      name: g.group,
      MPH: g.mph,
      SNY: g.sny,
      HOF: g.hof,
      Total: g.total,
    }));
  }, [profitData]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Security Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-linear-to-l from-emerald-500/10 via-batara-orange-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Executive Access
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                dzaky.athariqf@bataramining.com
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0" />
              Profit Center Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Analisis performa finansial, kontribusi margin laba operasional, dan struktur biaya per unit kerja (Muara Pahu & Senyiur) berbasis data buku besar (GL) aktual.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isSimulatorOpen
                  ? "bg-amber-500 text-slate-950 shadow-amber-500/20"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-300" />
              <span>Simulasi Tarif Hauling</span>
              {isSimulatorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!profitData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Tariff Simulation Box */}
        {isSimulatorOpen && (
          <div className="mt-5 pt-5 border-t border-slate-700/80 bg-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Parameter Simulasi Tarif Kontrak Hauling (Rp / Ton)
              </span>
              <span className="text-[11px] text-slate-400">
                Ubah nilai untuk melihat dampak seketika pada pendapatan dan margin laba rugi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tarif Site Muara Pahu (MPH)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={tariffMph}
                    onChange={(e) => setTariffMph(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-400"
                    step="1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tarif Site Senyiur (SNY)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={tariffSny}
                    onChange={(e) => setTariffSny(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-400"
                    step="1000"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 flex items-end gap-2">
                <button
                  onClick={() => {
                    setTariffMph(85000);
                    setTariffSny(90000);
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Standar (MPH 85rb / SNY 90rb)
                </button>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Kalkulasi otomatis mengalikan tonase produksi aktual dengan tarif terpilih.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar: GL Period & Profit Center Selector */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Periode GL:</span>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="w-full md:w-72 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.periodName} ({p.fileName})
              </option>
            ))}
          </select>
        </div>

        {/* Site Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 whitespace-nowrap">Fokus Tampilan:</span>
          {(["ALL", "MPH", "SNY", "HOF"] as const).map((site) => (
            <button
              key={site}
              onClick={() => setSelectedSiteFilter(site)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedSiteFilter === site
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {site === "ALL"
                ? "Semua Unit (Konsolidasi)"
                : site === "MPH"
                ? "Muara Pahu (MPH)"
                : site === "SNY"
                ? "Senyiur (SNY)"
                : "Head Office (HOF)"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-600">Menghitung analitika Profit Center...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main KPI Summary Dashboard */}
      {!isLoading && profitData && (
        <>
          {/* Executive KPI Cards (Row 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Revenue */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Pendapatan (Revenue)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatIDR(
                  selectedSiteFilter === "MPH"
                    ? profitData.revenue.mph
                    : selectedSiteFilter === "SNY"
                    ? profitData.revenue.sny
                    : profitData.revenue.total
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Tonase: {formatNumber(profitData.production.totalTon)} Ton</span>
                <span className="font-semibold text-emerald-600">
                  {selectedSiteFilter === "MPH"
                    ? `Tarif: Rp ${formatNumber(profitData.tariffs.mph)}/T`
                    : selectedSiteFilter === "SNY"
                    ? `Tarif: Rp ${formatNumber(profitData.tariffs.sny)}/T`
                    : `Gabungan 2 Site`}
                </span>
              </div>
            </div>

            {/* Card 2: Operating Expenses (OPEX) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Beban Operasional (GL OPEX)
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
                {formatIDR(
                  selectedSiteFilter === "MPH"
                    ? profitData.opex.mph
                    : selectedSiteFilter === "SNY"
                    ? profitData.opex.sny
                    : selectedSiteFilter === "HOF"
                    ? profitData.opex.hof
                    : profitData.opex.total
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Direct Site: {formatIDR(profitData.opex.directSite, true)}</span>
                <span className="font-semibold text-slate-600">
                  Cost/Ton: Rp {formatNumber(profitData.profit.costPerTonConsolidated)}
                </span>
              </div>
            </div>

            {/* Card 3: Operating Profit (EBITDA) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Laba Operasional (EBITDA)
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  (selectedSiteFilter === "MPH"
                    ? profitData.profit.grossMph
                    : selectedSiteFilter === "SNY"
                    ? profitData.profit.grossSny
                    : profitData.profit.netConsolidated) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {formatIDR(
                  selectedSiteFilter === "MPH"
                    ? profitData.profit.grossMph
                    : selectedSiteFilter === "SNY"
                    ? profitData.profit.grossSny
                    : profitData.profit.netConsolidated
                )}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Margin:{" "}
                  <strong className="text-slate-800">
                    {selectedSiteFilter === "MPH"
                      ? profitData.profit.marginPercentMph
                      : selectedSiteFilter === "SNY"
                      ? profitData.profit.marginPercentSny
                      : profitData.profit.marginPercentConsolidated}
                    %
                  </strong>
                </span>
                <span className="font-semibold text-blue-600">
                  Laba/Ton: Rp {formatNumber(profitData.profit.profitPerTonConsolidated)}
                </span>
              </div>
            </div>

            {/* Card 4: Executive Efficiency Ratio */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Rasio Margin & Efisiensi
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {profitData.profit.marginPercentConsolidated}%
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Cost to Revenue:</span>
                <span className="font-bold text-slate-700">
                  {profitData.revenue.total > 0
                    ? ((profitData.opex.total / profitData.revenue.total) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Unit Comparison Cards (MPH vs SNY vs HOF) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Muara Pahu (MPH) Card */}
            <div
              className={`rounded-2xl p-5 border transition-all ${
                selectedSiteFilter === "MPH" || selectedSiteFilter === "ALL"
                  ? "bg-white border-emerald-300 shadow-md ring-1 ring-emerald-400/20"
                  : "bg-slate-50/70 border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <h3 className="font-black text-sm text-slate-900">Site Muara Pahu (MPH)</h3>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Main Operating Hub
                </span>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tonase Produksi:</span>
                  <span className="font-bold text-slate-800">{formatNumber(profitData.production.mphTon)} Ton</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tarif Kontrak:</span>
                  <span className="font-bold text-slate-800">Rp {formatNumber(profitData.tariffs.mph)} / Ton</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Pendapatan:</span>
                  <span className="font-black text-emerald-600">{formatIDR(profitData.revenue.mph, true)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Beban Operasional:</span>
                  <span className="font-bold text-rose-600">{formatIDR(profitData.opex.mph, true)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Laba Operasi (Margin):</span>
                  <span className="font-black text-slate-900">{formatIDR(profitData.profit.grossMph, true)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold">
                  <span className="text-slate-600">Margin Kontribusi:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {profitData.profit.marginPercentMph}%
                  </span>
                </div>
              </div>
            </div>

            {/* Senyiur (SNY) Card */}
            <div
              className={`rounded-2xl p-5 border transition-all ${
                selectedSiteFilter === "SNY" || selectedSiteFilter === "ALL"
                  ? "bg-white border-amber-300 shadow-md ring-1 ring-amber-400/20"
                  : "bg-slate-50/70 border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <h3 className="font-black text-sm text-slate-900">Site Senyiur (SNY)</h3>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Expansion Site
                </span>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tonase Produksi:</span>
                  <span className="font-bold text-slate-800">{formatNumber(profitData.production.snyTon)} Ton</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tarif Kontrak:</span>
                  <span className="font-bold text-slate-800">Rp {formatNumber(profitData.tariffs.sny)} / Ton</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Pendapatan:</span>
                  <span className="font-black text-emerald-600">{formatIDR(profitData.revenue.sny, true)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Beban Operasional:</span>
                  <span className="font-bold text-rose-600">{formatIDR(profitData.opex.sny, true)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Laba Operasi (Margin):</span>
                  <span className="font-black text-slate-900">{formatIDR(profitData.profit.grossSny, true)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold">
                  <span className="text-slate-600">Margin Kontribusi:</span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {profitData.profit.marginPercentSny}%
                  </span>
                </div>
              </div>
            </div>

            {/* Head Office (HOF) Corporate Center */}
            <div
              className={`rounded-2xl p-5 border transition-all ${
                selectedSiteFilter === "HOF" || selectedSiteFilter === "ALL"
                  ? "bg-white border-blue-300 shadow-md ring-1 ring-blue-400/20"
                  : "bg-slate-50/70 border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  <h3 className="font-black text-sm text-slate-900">Head Office (HOF)</h3>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Corporate Overhead
                </span>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Fungsi:</span>
                  <span className="font-semibold text-slate-800">Shared Services & Management</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Beban Administrasi HOF:</span>
                  <span className="font-bold text-rose-600">{formatIDR(profitData.opex.hof)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Rasio terhadap OPEX:</span>
                  <span className="font-bold text-slate-800">
                    {profitData.opex.total > 0
                      ? ((profitData.opex.hof / profitData.opex.total) * 100).toFixed(2)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Beban per Ton:</span>
                  <span className="font-bold text-slate-800">
                    Rp{" "}
                    {profitData.production.totalTon > 0
                      ? Math.round(profitData.opex.hof / profitData.production.totalTon)
                      : 0}
                  </span>
                </div>
                <div className="mt-3 p-2 rounded-lg bg-blue-50/80 text-[11px] text-blue-800 border border-blue-200/60 leading-tight">
                  Overhead HOF dialokasikan secara proporsional untuk mendukung kelancaran operasional 2 site.
                </div>
              </div>
            </div>
          </div>

          {/* Visual Performance Charts (Row 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Site Financial Comparison */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Perbandingan Finansial Profit Center
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pendapatan vs Beban Operasional vs Laba Kontribusi (Rp)
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Dalam Milyar IDR
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={siteComparisonChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="site" tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(val) => `${(val / 1_000_000_000).toFixed(1)}M`}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [formatIDR(value), name]}
                      contentStyle={{
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Beban" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Laba" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cost Structure by Account Group */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Struktur Beban per Kelompok Akun
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Distribusi alokasi biaya terbesar di seluruh Profit Center
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Buku Besar (GL)
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={accountGroupChartData.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(val) => `${(val / 1_000_000_000).toFixed(1)}M`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 9, fill: "#334155" }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [formatIDR(value), name]}
                      contentStyle={{
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                    <Bar dataKey="MPH" stackId="a" fill="#059669" />
                    <Bar dataKey="SNY" stackId="a" fill="#d97706" />
                    <Bar dataKey="HOF" stackId="a" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top 10 Cost Centers / Armada Unit */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Top Cost Center / Armada Unit Terbesar
                </h3>
                <p className="text-[11px] text-slate-500">
                  Konsumsi biaya terbesar berdasarkan unit armada Prime Mover (PM) & Support
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {profitData.topCostCenters.length} Cost Center Terpantau
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {profitData.topCostCenters.slice(0, 10).map((cc, idx) => (
                <div
                  key={cc.costCenter}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-black text-slate-900">{cc.costCenter}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        cc.projectArea === "MPH"
                          ? "bg-emerald-50 text-emerald-700"
                          : cc.projectArea === "SNY"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {cc.projectArea}
                    </span>
                  </div>
                  <div className="text-xs font-black text-slate-800">{formatIDR(cc.totalCost, true)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{cc.transactionCount} Transaksi</div>
                </div>
              ))}
            </div>
          </div>

          {/* Comprehensive P&L Financial Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#e95623]" />
                  Laporan Laba Rugi Profit Center (Executive Financial Statement)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rincian akun beban GL terpetakan per Profit Center Muara Pahu, Senyiur, dan Head Office
                </p>
              </div>

              {/* Search in Table */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode atau nama akun..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#e95623]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 min-w-25">Kode Akun</th>
                    <th className="py-2.5 px-3 min-w-55">Nama Akun Beban (GL)</th>
                    <th className="py-2.5 px-3 text-right min-w-32.5">Muara Pahu (MPH)</th>
                    <th className="py-2.5 px-3 text-right min-w-32.5">Senyiur (SNY)</th>
                    <th className="py-2.5 px-3 text-right min-w-27.5">Head Office (HOF)</th>
                    <th className="py-2.5 px-3 text-right min-w-35 bg-slate-200/50">Konsolidasi (Total)</th>
                    <th className="py-2.5 px-3 text-right min-w-25">Kontribusi (%)</th>
                    <th className="py-2.5 px-3 text-right min-w-27.5">Biaya / Ton</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Revenue Summary Row */}
                  <tr className="bg-emerald-50/70 font-black text-emerald-950 border-b border-emerald-200">
                    <td className="py-2.5 px-3 font-mono text-[11px]">4000-0000</td>
                    <td className="py-2.5 px-3">PENDAPATAN HAULING (SIMULASI REVENUE)</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-mono">
                      {formatIDR(profitData.revenue.mph)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-mono">
                      {formatIDR(profitData.revenue.sny)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono">-</td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 font-mono bg-emerald-100/60 font-black">
                      {formatIDR(profitData.revenue.total)}
                    </td>
                    <td className="py-2.5 px-3 text-right">100.0%</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      Rp{" "}
                      {formatNumber(
                        profitData.production.totalTon > 0
                          ? Math.round(profitData.revenue.total / profitData.production.totalTon)
                          : 0
                      )}
                    </td>
                  </tr>

                  {/* List of GL Account Rows */}
                  {filteredSummaries.map((s) => {
                    const contributionPct =
                      profitData.opex.total > 0
                        ? ((s.grandTotal / profitData.opex.total) * 100).toFixed(2)
                        : "0";
                    const costPerTon =
                      profitData.production.totalTon > 0
                        ? Math.round(s.grandTotal / profitData.production.totalTon)
                        : 0;

                    return (
                      <tr key={s.accountCode} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 font-bold">
                          {s.accountCode}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-medium">{s.accountName}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatIDR(s.mphAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatIDR(s.snyAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatIDR(s.hofAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          {formatIDR(s.grandTotal)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">{contributionPct}%</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          Rp {formatNumber(costPerTon)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total OPEX Row */}
                  <tr className="bg-rose-50/70 font-black text-rose-950 border-t-2 border-rose-200">
                    <td className="py-2.5 px-3 font-mono text-[11px]">5000-0000</td>
                    <td className="py-2.5 px-3 uppercase">TOTAL BEBAN OPERASIONAL (GL OPEX)</td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-mono">
                      {formatIDR(profitData.opex.mph)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-mono">
                      {formatIDR(profitData.opex.sny)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-mono">
                      {formatIDR(profitData.opex.hof)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-800 font-mono bg-rose-100/60 font-black">
                      {formatIDR(profitData.opex.total)}
                    </td>
                    <td className="py-2.5 px-3 text-right">100.0%</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      Rp {formatNumber(profitData.profit.costPerTonConsolidated)}
                    </td>
                  </tr>

                  {/* Net Operating Profit / EBITDA Row */}
                  <tr className="bg-slate-900 text-white font-black text-sm">
                    <td className="py-3 px-3 font-mono text-[11px] text-emerald-400">NET-PROFIT</td>
                    <td className="py-3 px-3 uppercase text-emerald-300">
                      LABA BERSIH OPERASIONAL (OPERATING EBITDA)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300">
                      {formatIDR(profitData.profit.grossMph)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300">
                      {formatIDR(profitData.profit.grossSny)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-300">
                      ({formatIDR(profitData.opex.hof)})
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 bg-slate-950 font-black">
                      {formatIDR(profitData.profit.netConsolidated)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                      {profitData.profit.marginPercentConsolidated}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300">
                      Rp {formatNumber(profitData.profit.profitPerTonConsolidated)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
              <span>Menampilkan {filteredSummaries.length} akun buku besar</span>
              <span className="font-semibold text-slate-600">
                PT Batara Dharma Persada • Executive Profit Center Report
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

