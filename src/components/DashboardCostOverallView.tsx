"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, JobSite } from "../types/auth";
import {
  reportService,
  CostOverallData,
  CostOverallDataset,
  CostCategoryEntity,
  CostTimelinePoint,
} from "../services/reportService";
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
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Building2,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Download,
  Layers,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  FileSpreadsheet,
  Scale,
  Sparkles,
  ArrowUpDown,
  Tag,
} from "lucide-react";

interface DashboardCostOverallViewProps {
  user: User;
}

type LevelFilter = "all" | "parent" | "account";
type MetricDisplay = "costPerTon" | "costTotal" | "combo";
type SortOption = "default" | "realisasiDesc" | "costPerTonDesc" | "deviasiDesc";

export const DashboardCostOverallView: React.FC<DashboardCostOverallViewProps> = ({ user }) => {
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const initialSite: string = isHeadOffice ? "Senyiur" : user.jobSite;

  // Site filter
  const [selectedSite, setSelectedSite] = useState<string>(initialSite);

  // Data states
  const [data, setData] = useState<CostOverallData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Time Mode: 'monthly' (Month to Date / Bulanan - DEFAULT) or 'weekly' (Mingguan Mulai W41)
  const [timeMode, setTimeMode] = useState<"monthly" | "weekly">("monthly");

  // Filters & Controls
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("account");
  const [selectedMetric, setSelectedMetric] = useState<MetricDisplay>("costPerTon");
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>("BEBAN COMPENSATION AND BENEFIT - SITE");
  const [selectedSubAccountFilter, setSelectedSubAccountFilter] = useState<string>("ALL");
  const [hideZeroCosts, setHideZeroCosts] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  // Period range filters (Jan - Okt for monthly, W41 - W42 for weekly)
  const [startPeriod, setStartPeriod] = useState<string>("Jan");
  const [endPeriod, setEndPeriod] = useState<string>("Okt");

  // Detail Modal state
  const [activeModalItem, setActiveModalItem] = useState<CostCategoryEntity | null>(null);

  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Math.round(val || 0));
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(Math.round(val || 0));
  };

  const formatCompact = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}Jt`;
    if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
    return `${Math.round(val)}`;
  };

  const formatIDRPerTon = (val: number) => {
    return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(val || 0))}/Ton`;
  };

  // Active dataset based on selected timeMode
  const activeDataset: CostOverallDataset | null = useMemo(() => {
    if (!data) return null;
    if (timeMode === "weekly" && data.weekly) {
      return data.weekly;
    }
    if (data.monthly) {
      return data.monthly;
    }
    return data;
  }, [data, timeMode]);

  // Available periods list according to active dataset
  const availablePeriods = useMemo(() => {
    if (activeDataset?.availablePeriods && activeDataset.availablePeriods.length > 0) {
      return activeDataset.availablePeriods;
    }
    return timeMode === "monthly"
      ? ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agst", "Sept", "Okt"]
      : ["W41", "W42"];
  }, [activeDataset, timeMode]);

  // Load data from backend
  const loadData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await reportService.getCostOverall(
        selectedSite !== "ALL" ? selectedSite : "ALL",
        2026
      );
      setData(res);
      const dataset = timeMode === "weekly" ? res.weekly || res : res.monthly || res;
      if (dataset.availablePeriods && dataset.availablePeriods.length > 0) {
        setStartPeriod(dataset.availablePeriods[0]);
        setEndPeriod(dataset.availablePeriods[dataset.availablePeriods.length - 1]);
      }
    } catch (err: any) {
      console.error("Error loading cost overall data:", err);
      setError(err.message || "Gagal memuat data Dashboard Cost Overall.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSite]);

  // Reset start and end period when timeMode changes
  useEffect(() => {
    if (availablePeriods.length > 0) {
      setStartPeriod(availablePeriods[0]);
      setEndPeriod(availablePeriods[availablePeriods.length - 1]);
    }
  }, [timeMode, availablePeriods]);

  // Filter timeline points by selected period range
  const filterTimelineRange = useCallback(
    (points: CostTimelinePoint[]) => {
      if (!points || points.length === 0) return [];
      const sIdx = availablePeriods.indexOf(startPeriod);
      const eIdx = availablePeriods.indexOf(endPeriod);
      if (sIdx === -1 || eIdx === -1 || sIdx > eIdx) return points;
      const validLabels = new Set(availablePeriods.slice(sIdx, eIdx + 1));
      return points.filter((p) => validLabels.has(p.label));
    },
    [availablePeriods, startPeriod, endPeriod]
  );

  // Sub-categories / accounts under the currently selected parent category
  const availableSubCategories = useMemo(() => {
    if (!activeDataset?.accounts) return [];
    if (selectedParentFilter === "ALL") {
      return activeDataset.accounts;
    }
    return activeDataset.accounts.filter((a) => a.parentName === selectedParentFilter);
  }, [activeDataset, selectedParentFilter]);

  // Active Parent Category data (if a single parent category is chosen)
  const activeParentCategory = useMemo(() => {
    if (!activeDataset?.parentCategories || selectedParentFilter === "ALL") return null;
    return activeDataset.parentCategories.find((p) => p.name === selectedParentFilter) || null;
  }, [activeDataset, selectedParentFilter]);

  const handleSelectParent = (parentName: string) => {
    setSelectedParentFilter(parentName);
    setSelectedSubAccountFilter("ALL");
  };

  // Compute filtered entities list
  const filteredEntities = useMemo(() => {
    if (!activeDataset) return [];
    let list: CostCategoryEntity[] = [];

    if (selectedLevel === "parent") {
      list = [...activeDataset.parentCategories];
    } else if (selectedLevel === "all") {
      list = [...activeDataset.parentCategories, ...activeDataset.accounts];
    } else {
      // Default: show sub-categories / child accounts
      list = [...activeDataset.accounts];
    }

    // Filter by parent category if selected
    if (selectedParentFilter !== "ALL") {
      list = list.filter((item) => {
        if (item.type === "parent") return item.name === selectedParentFilter;
        return item.parentName === selectedParentFilter;
      });
    }

    // Filter by specific sub-category / account if selected
    if (selectedSubAccountFilter !== "ALL") {
      list = list.filter((item) => {
        if (item.type === "parent") return false;
        return (
          (item.accountCode && item.accountCode === selectedSubAccountFilter) ||
          item.id === selectedSubAccountFilter ||
          (item.name && item.name === selectedSubAccountFilter) ||
          (item.accountName && item.accountName === selectedSubAccountFilter)
        );
      });
    }

    // Filter out zero costs if toggled
    if (hideZeroCosts) {
      list = list.filter((item) => {
        const activeRange = filterTimelineRange(item.timeline);
        const hasBudget = activeRange.some((t) => t.budgetCost > 0);
        const hasReal = activeRange.some((t) => t.realisasiCost > 0);
        return hasBudget || hasReal;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.accountName && item.accountName.toLowerCase().includes(q)) ||
          (item.accountCode && item.accountCode.toLowerCase().includes(q)) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
          (item.parentName && item.parentName.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === "realisasiDesc") {
      list.sort((a, b) => b.totalRealisasi - a.totalRealisasi);
    } else if (sortBy === "costPerTonDesc") {
      list.sort((a, b) => b.avgRealisasiIdrPerTon - a.avgRealisasiIdrPerTon);
    } else if (sortBy === "deviasiDesc") {
      list.sort((a, b) => a.totalDeviasi - b.totalDeviasi);
    }

    return list;
  }, [
    activeDataset,
    selectedLevel,
    selectedParentFilter,
    selectedSubAccountFilter,
    hideZeroCosts,
    searchQuery,
    sortBy,
    filterTimelineRange,
  ]);

  // Overall KPI totals based on active range
  const summaryRange = useMemo(() => {
    if (!activeDataset?.summaryTotal) return null;
    const timeline = filterTimelineRange(activeDataset.summaryTotal.timeline);
    const prodRange = filterTimelineRange(activeDataset.productionTimeline as any);
    const totalProdBudget = prodRange.reduce((s, p: any) => s + (p.budgetProduksi || 0), 0);
    const totalProdReal = prodRange.reduce((s, p: any) => s + (p.realisasiProduksi || 0), 0);
    const totalCostBudget = timeline.reduce((s, t) => s + t.budgetCost, 0);
    const totalCostReal = timeline.reduce((s, t) => s + t.realisasiCost, 0);
    const deviasiCost = totalCostBudget - totalCostReal;

    const budgetIdrPerTon = totalProdBudget > 0 ? Math.round(totalCostBudget / totalProdBudget) : 0;
    const realisasiIdrPerTon = totalProdReal > 0 ? Math.round(totalCostReal / totalProdReal) : 0;
    const deviasiIdrPerTon = budgetIdrPerTon - realisasiIdrPerTon;

    return {
      totalCostBudget,
      totalCostReal,
      deviasiCost,
      totalProdBudget,
      totalProdReal,
      budgetIdrPerTon,
      realisasiIdrPerTon,
      deviasiIdrPerTon,
      timeline,
    };
  }, [activeDataset, filterTimelineRange]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredEntities || filteredEntities.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "Tipe",
      "Kode Akun",
      "Nama Akun / Kategori",
      "Kategori Utama (Parent)",
      "Sub Kategori",
      "Cost Behavior",
      "Total Budget (IDR)",
      "Total Realisasi (IDR)",
      "Total Deviasi (IDR)",
      "Budget IDR/Ton",
      "Realisasi IDR/Ton",
      "Deviasi IDR/Ton",
    ];

    const rows = [headers.join(",")];
    filteredEntities.forEach((ent) => {
      const activeRange = filterTimelineRange(ent.timeline);
      const bCost = activeRange.reduce((s, t) => s + t.budgetCost, 0);
      const rCost = activeRange.reduce((s, t) => s + t.realisasiCost, 0);
      const devCost = bCost - rCost;
      const bTon = summaryRange?.totalProdBudget ? Math.round(bCost / summaryRange.totalProdBudget) : 0;
      const rTon = summaryRange?.totalProdReal ? Math.round(rCost / summaryRange.totalProdReal) : 0;

      rows.push(
        [
          `"${ent.type}"`,
          `"${ent.accountCode || "-"}"`,
          `"${(ent.name || ent.accountName || "").replace(/"/g, '""')}"`,
          `"${(ent.parentName || "-").replace(/"/g, '""')}"`,
          `"${(ent.subCategory || "-").replace(/"/g, '""')}"`,
          `"${ent.costBehavior || "-"}"`,
          Math.round(bCost),
          Math.round(rCost),
          Math.round(devCost),
          bTon,
          rTon,
          bTon - rTon,
        ].join(",")
      );
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dashboard_Cost_Overall_${selectedSite}_${timeMode}_${startPeriod}_${endPeriod}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pData = payload[0]?.payload;
    if (!pData) return null;

    const bTon = pData.budgetIdrPerTon || 0;
    const rTon = pData.realisasiIdrPerTon || 0;
    const devTon = pData.deviasiIdrPerTon || 0;
    const isOverBudget = devTon < 0;

    return (
      <div className="bg-white/95 backdrop-blur-md text-slate-800 p-3 rounded-xl shadow-xl border border-slate-200 text-xs space-y-2 min-w-56 z-50">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar size={13} className="text-[#e95623]" />
            {pData.label} ({pData.periodName || "-"})
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black border ${
              isOverBudget
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {isOverBudget ? "Over Budget" : "Under Budget"}
          </span>
        </div>

        {/* Cost / Ton Section */}
        <div className="p-2 rounded-lg bg-orange-50/50 border border-orange-200/60 space-y-1 font-mono text-[11px]">
          <div className="flex justify-between text-slate-500">
            <span>Budget Cost/Ton:</span>
            <strong className="text-slate-700">{formatIDRPerTon(bTon)}</strong>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Realisasi Cost/Ton:</span>
            <strong className="text-[#e95623] font-bold">{formatIDRPerTon(rTon)}</strong>
          </div>
          <div className="flex justify-between pt-1 border-t border-orange-200/60">
            <span className="text-slate-500">Deviasi Cost/Ton:</span>
            <strong className={devTon >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
              {devTon >= 0 ? `+${formatIDRPerTon(devTon)}` : formatIDRPerTon(devTon)}
            </strong>
          </div>
        </div>

        {/* Nominal Total Section */}
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1 font-mono text-[11px]">
          <div className="flex justify-between text-slate-500">
            <span>Budget Nominal:</span>
            <span className="text-slate-700">{formatCurrency(pData.budgetCost || 0)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Realisasi Nominal:</span>
            <span className="text-blue-700 font-bold">{formatCurrency(pData.realisasiCost || 0)}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-200/60">
            <span>Produksi Realisasi:</span>
            <span className="text-slate-600">{formatNumber(pData.prodReal || 0)} Ton</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200/80 flex items-center justify-center shadow-2xs">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                Dashboard Cost Overall
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {timeMode === "monthly" ? "Month to Date (MTD)" : "Mingguan (Mulai W41)"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {timeMode === "monthly"
                  ? "Analisis biaya operasional seluruh akun beban berbasis Bulanan (Month to Date) & evaluasi performa Cost/Ton"
                  : "Analisis biaya operasional seluruh akun beban berbasis Mingguan (tersedia mulai W41) & evaluasi performa Cost/Ton"}
              </p>
            </div>
          </div>
        </div>

        {/* Site Selector, Mode Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Mode Switcher (Bulanan vs Mingguan W41+) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTimeMode("monthly")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                timeMode === "monthly"
                  ? "bg-white text-slate-900 shadow-2xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar size={13} className={timeMode === "monthly" ? "text-[#e95623]" : ""} />
              <span>Bulanan (MTD)</span>
            </button>
            <button
              onClick={() => setTimeMode("weekly")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                timeMode === "weekly"
                  ? "bg-white text-slate-900 shadow-2xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Laporan mingguan murni (hanya tersedia mulai W41)"
            >
              <Clock size={13} className={timeMode === "weekly" ? "text-[#e95623]" : ""} />
              <span>Mingguan (W41+)</span>
            </button>
          </div>

          {/* Site Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            {isHeadOffice && (
              <button
                onClick={() => setSelectedSite("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedSite === "ALL"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Semua Site
              </button>
            )}
            {(isHeadOffice || user.jobSite === "Senyiur") && (
              <button
                onClick={() => setSelectedSite("Senyiur")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSite === "Senyiur"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-emerald-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                Senyiur
              </button>
            )}
            {(isHeadOffice || user.jobSite === "MuaraPahu") && (
              <button
                onClick={() => setSelectedSite("MuaraPahu")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSite === "MuaraPahu"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-blue-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block" />
                Muara Pahu
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs hover:border-slate-300 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin text-[#e95623]" : ""} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredEntities.length === 0}
            className="px-3.5 py-2 rounded-xl bg-linear-to-r from-[#e95623] to-[#d44818] hover:from-[#d44818] hover:to-[#be3e12] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download data format CSV / Excel"
          >
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Biaya Produksi */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Biaya Produksi
            </span>
            <div className="h-8 w-8 rounded-xl bg-orange-50 text-[#e95623] flex items-center justify-center border border-orange-200/70">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatCompact(summaryRange?.totalCostReal || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center justify-between">
              <span>Budget: {formatCompact(summaryRange?.totalCostBudget || 0)}</span>
              <span
                className={`font-mono font-bold ${
                  (summaryRange?.deviasiCost || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {(summaryRange?.deviasiCost || 0) >= 0 ? "+" : ""}
                {formatCompact(summaryRange?.deviasiCost || 0)}
              </span>
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-orange-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
        </div>

        {/* Card 2: Cost / Ton Rata-Rata */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Scale size={13} className="text-blue-500" />
              Cost / Ton Rata-Rata
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                (summaryRange?.deviasiIdrPerTon || 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {(summaryRange?.deviasiIdrPerTon || 0) >= 0 ? "Under Budget" : "Over Budget"}
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatIDRPerTon(summaryRange?.realisasiIdrPerTon || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center justify-between">
              <span>Budget: {formatIDRPerTon(summaryRange?.budgetIdrPerTon || 0)}</span>
              <span
                className={`font-mono font-bold ${
                  (summaryRange?.deviasiIdrPerTon || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {(summaryRange?.deviasiIdrPerTon || 0) >= 0 ? "+" : ""}
                {formatIDRPerTon(summaryRange?.deviasiIdrPerTon || 0)}
              </span>
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
        </div>

        {/* Card 3: Total Produksi Tonase */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers size={13} className="text-emerald-500" />
              Produksi Batubara
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {summaryRange?.totalProdBudget
                ? `${((summaryRange.totalProdReal / summaryRange.totalProdBudget) * 100).toFixed(1)}% Ach`
                : "0%"}
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatNumber(summaryRange?.totalProdReal || 0)} <span className="text-xs font-bold text-slate-500">Ton</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Target Budget: <strong className="font-mono text-slate-700">{formatNumber(summaryRange?.totalProdBudget || 0)} Ton</strong>
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        </div>

        {/* Card 4: Cakupan Akun & Sub-Kategori */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={13} className="text-purple-500" />
              Cakupan Entitas Biaya
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredEntities.length} Ditampilkan
            </span>
          </div>
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Kategori Utama:</span>
              <strong className="text-purple-700 font-bold">{activeDataset?.parentCategories?.length || 7} Kategori</strong>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Sub-Kategori Akun:</span>
              <strong className="text-blue-700 font-bold">{activeDataset?.accounts?.length || 79} Akun Beban</strong>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Kategori Aktif:</span>
              <strong className="text-orange-600 font-bold truncate max-w-36" title={selectedParentFilter}>
                {selectedParentFilter === "ALL" ? "Semua Kategori" : selectedParentFilter.replace("BEBAN ", "")}
              </strong>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
        </div>
      </div>

      {/* 2.5 Quick Category Switcher Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-[#e95623]" />
            Pilih Kategori Beban:
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Klik kategori untuk melihat seluruh sub-kategori di bawahnya
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleSelectParent("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs ${
              selectedParentFilter === "ALL"
                ? "bg-[#e95623] text-white"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Layers size={13} />
            Semua Kategori ({activeDataset?.accounts?.length || 79})
          </button>

          {activeDataset?.parentCategories?.map((p) => {
            const childCount = activeDataset.accounts.filter((a) => a.parentName === p.name).length;
            const isSelected = selectedParentFilter === p.name;
            const shortName = p.name.replace("BEBAN ", "");
            return (
              <button
                key={p.name}
                onClick={() => handleSelectParent(p.name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs ${
                  isSelected
                    ? "bg-[#e95623] text-white"
                    : "bg-white text-slate-700 hover:bg-orange-50 hover:text-[#e95623] border border-slate-200"
                }`}
              >
                <span>{shortName}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white font-black" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {childCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Filter & Control Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Row 1: Level Selector & Metric Display */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Level Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Tingkatan:
            </span>
            <button
              onClick={() => setSelectedLevel("account")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedLevel === "account"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Sub-Kategori Akun ({availableSubCategories.length})
            </button>
            <button
              onClick={() => setSelectedLevel("parent")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedLevel === "parent"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Kategori Utama ({activeDataset?.parentCategories?.length || 7})
            </button>
            <button
              onClick={() => setSelectedLevel("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedLevel === "all"
                  ? "bg-[#e95623] text-white shadow-2xs"
                  : "bg-orange-50 text-[#e95623] hover:bg-orange-100 border border-orange-200/60"
              }`}
            >
              Semua Tingkatan
            </button>
          </div>

          {/* Metric Selector (Cost/Ton vs Total Biaya vs Combo) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start lg:self-auto shrink-0">
            <span className="text-[11px] text-slate-500 font-semibold px-2 hidden sm:inline">
              Fokus Grafik:
            </span>
            <button
              onClick={() => setSelectedMetric("costPerTon")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedMetric === "costPerTon"
                  ? "bg-[#e95623] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cost / Ton (IDR/Ton)
            </button>
            <button
              onClick={() => setSelectedMetric("costTotal")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedMetric === "costTotal"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Biaya Total (IDR)
            </button>
            <button
              onClick={() => setSelectedMetric("combo")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedMetric === "combo"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kombinasi (Pcs &amp; Ton)
            </button>
          </div>
        </div>

        {/* Row 2: 5 Filter Controls (Parent Category, Sub-Category Dropdown, Period Range, Search, Sort) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Parent Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              1. Kategori Induk:
            </label>
            <select
              value={selectedParentFilter}
              onChange={(e) => handleSelectParent(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#e95623]/20"
            >
              <option value="ALL">Semua Kategori ({activeDataset?.accounts?.length || 79} Sub-Kategori)</option>
              {activeDataset?.parentCategories?.map((p) => {
                const cCount = activeDataset.accounts.filter((a) => a.parentName === p.name).length;
                return (
                  <option key={p.name} value={p.name}>
                    {p.name} ({cCount} Item)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Sub-Category / Akun Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              2. Sub-Kategori / Akun:
            </label>
            <select
              value={selectedSubAccountFilter}
              onChange={(e) => setSelectedSubAccountFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#e95623]/20"
            >
              <option value="ALL">
                Semua Sub-Kategori ({availableSubCategories.length} Item)
              </option>
              {availableSubCategories.map((acc) => {
                const displayName = acc.name || acc.accountName || "Akun Beban";
                return (
                  <option key={acc.id} value={acc.accountCode || acc.id}>
                    {acc.accountCode ? `${acc.accountCode} - ${displayName}` : displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Period Range Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {timeMode === "monthly" ? "3. Rentang Bulan (MTD):" : "3. Rentang Minggu (W41+):"}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
                className="w-1/2 text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-700"
              >
                {availablePeriods.map((p) => (
                  <option key={`start-${p}`} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400 font-bold">-</span>
              <select
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value)}
                className="w-1/2 text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-700"
              >
                {availablePeriods.map((p) => (
                  <option key={`end-${p}`} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              4. Cari Cepat:
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode, nama akun..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 5. Sort & Zero-cost Toggle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              5. Urutan &amp; Filter 0:
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-3/5 text-xs py-2 px-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="default">Urutan Laporan Cost</option>
                <option value="realisasiDesc">Realisasi Terbesar</option>
                <option value="costPerTonDesc">Cost/Ton Terbesar</option>
                <option value="deviasiDesc">Over Budget</option>
              </select>

              <button
                onClick={() => setHideZeroCosts(!hideZeroCosts)}
                className={`w-2/5 py-2 px-1 text-[10px] font-bold rounded-xl border transition-all text-center cursor-pointer ${
                  hideZeroCosts
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
                title="Klik untuk menyembunyikan akun tanpa biaya (0 rupiah)"
              >
                {hideZeroCosts ? "Hanya >0" : "Semua (0)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Parent Category Card (if specific parent selected and viewing all sub-accounts) */}
      {activeParentCategory && selectedSubAccountFilter === "ALL" && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-4 hover:border-slate-300 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Ringkasan Kategori Utama
                </span>
                <span className="text-xs text-slate-500 font-bold font-mono">
                  {availableSubCategories.length} Sub-Kategori Akun
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {activeParentCategory.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 font-medium font-sans">Total Sub-Kategori:</span>
              <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#e95623] font-bold border border-orange-200 shadow-2xs">
                {availableSubCategories.length} Item
              </span>
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans block">
                Cost/Ton Realisasi
              </span>
              <p className="text-sm sm:text-base font-black text-[#e95623] mt-0.5">
                {formatIDRPerTon(activeParentCategory.avgRealisasiIdrPerTon)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Budget: {formatIDRPerTon(activeParentCategory.avgBudgetIdrPerTon)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans block">
                Deviasi Cost/Ton
              </span>
              <p
                className={`text-sm sm:text-base font-black mt-0.5 ${
                  activeParentCategory.avgDeviasiIdrPerTon >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {activeParentCategory.avgDeviasiIdrPerTon >= 0 ? "+" : ""}
                {formatIDRPerTon(activeParentCategory.avgDeviasiIdrPerTon)}
              </p>
              <span className={`text-[10px] font-bold block mt-0.5 ${activeParentCategory.avgDeviasiIdrPerTon >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {activeParentCategory.avgDeviasiIdrPerTon >= 0 ? "Under Budget" : "Over Budget"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans block">
                Total Biaya Realisasi
              </span>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {formatCompact(activeParentCategory.totalRealisasi)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Budget: {formatCompact(activeParentCategory.totalBudget)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans block">
                Deviasi Biaya Total
              </span>
              <p
                className={`text-sm sm:text-base font-black mt-0.5 ${
                  activeParentCategory.totalDeviasi >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {activeParentCategory.totalDeviasi >= 0 ? "+" : ""}
                {formatCompact(activeParentCategory.totalDeviasi)}
              </p>
              <span className={`text-[10px] font-bold block mt-0.5 ${activeParentCategory.totalDeviasi >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {activeParentCategory.totalDeviasi >= 0 ? "Under Budget" : "Over Budget"}
              </span>
            </div>
          </div>

          {/* Parent Trend Line Chart */}
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={filterTimelineRange(activeParentCategory.timeline)}
                margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: "#64748b" }} stroke="#cbd5e1" />
                <YAxis
                  yAxisId="mainAxis"
                  tick={{ fontSize: 9.5, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  tickFormatter={(v) =>
                    selectedMetric === "costPerTon" ? `${v.toLocaleString()}` : formatCompact(v)
                  }
                />
                <Tooltip content={<CustomChartTooltip />} />
                {selectedMetric === "costPerTon" ? (
                  <>
                    <Bar yAxisId="mainAxis" dataKey="budgetIdrPerTon" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Budget (Rp/Ton)" />
                    <Line yAxisId="mainAxis" type="monotone" dataKey="realisasiIdrPerTon" stroke="#e95623" strokeWidth={2.5} dot={{ r: 3, fill: "#e95623" }} name="Realisasi (Rp/Ton)" />
                  </>
                ) : (
                  <>
                    <Bar yAxisId="mainAxis" dataKey="budgetCost" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Budget (IDR)" />
                    <Line yAxisId="mainAxis" type="monotone" dataKey="realisasiCost" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} name="Realisasi (IDR)" />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Section Title for Sub-Categories List */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Daftar Sub-Kategori Akun Beban
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#e95623] border border-orange-200">
              {filteredEntities.length} Item
            </span>
          </h2>
          {selectedParentFilter !== "ALL" && (
            <span className="text-xs text-slate-500 font-medium">
              &bull; {selectedParentFilter}
            </span>
          )}
        </div>
        {selectedSubAccountFilter !== "ALL" && (
          <button
            onClick={() => setSelectedSubAccountFilter("ALL")}
            className="text-xs font-bold text-[#e95623] hover:underline cursor-pointer self-start sm:self-auto"
          >
            Tampilkan Semua Sub-Kategori ({availableSubCategories.length}) &rarr;
          </button>
        )}
      </div>

      {/* 4. Visual Cards Grid */}
      {!isMounted || isLoading ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <RefreshCw size={28} className="animate-spin text-[#e95623] mx-auto" />
          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
            Menyiapkan Dashboard Cost Overall &amp; Kalkulasi Cost/Ton Seluruh Akun...
          </p>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <AlertCircle size={32} className="text-slate-300 mx-auto" />
          <p className="text-sm text-slate-700 font-bold">Tidak ada akun beban yang sesuai dengan filter</p>
          <p className="text-xs text-slate-400">
            Coba ubah kata kunci pencarian, filter kategori, atau klik tombol "Show All" untuk menampilkan seluruh akun
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredEntities.map((item) => {
            const activeRangeTimeline = filterTimelineRange(item.timeline);
            const totalBudget = activeRangeTimeline.reduce((s, t) => s + t.budgetCost, 0);
            const totalReal = activeRangeTimeline.reduce((s, t) => s + t.realisasiCost, 0);
            const totalDev = totalBudget - totalReal;
            const isOver = totalDev < 0;

            const bTon = summaryRange?.totalProdBudget ? Math.round(totalBudget / summaryRange.totalProdBudget) : 0;
            const rTon = summaryRange?.totalProdReal ? Math.round(totalReal / summaryRange.totalProdReal) : 0;
            const devTon = bTon - rTon;
            const isOverTon = devTon < 0;

            const isParent = item.type === "parent";
            const isSubCat = item.type === "subcategory";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
              >
                {/* Header Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Type Badge */}
                      <span
                        className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isParent
                            ? "bg-purple-100 text-purple-900 border-purple-300"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {isParent ? "Kategori Utama" : "Sub-Kategori"}
                      </span>

                      {/* Account Code */}
                      {item.accountCode && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.accountCode}
                        </span>
                      )}

                      {/* Cost Behavior */}
                      {item.costBehavior && (
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                            item.costBehavior === "VC"
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.costBehavior === "VC" ? "Variable Cost" : "Fixed Cost"}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        isOverTon
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isOverTon ? "Over Budget" : "Under Budget"}
                    </span>
                  </div>

                  {/* Title & Breadcrumb */}
                  <h3 className="text-sm font-black text-slate-900 tracking-tight leading-snug group-hover:text-[#e95623] transition-colors" title={item.name || item.accountName}>
                    {item.name || item.accountName}
                  </h3>

                  {item.parentName && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                      <span>Kategori Induk: {item.parentName}</span>
                    </p>
                  )}
                </div>

                {/* Dual KPI Metrics Row */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {/* Left: Cost / Ton */}
                  <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                      Cost / Ton Realisasi
                    </span>
                    <p className="text-base font-black text-[#e95623] mt-0.5">
                      {formatIDRPerTon(rTon)}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-orange-200/60">
                      <span>B: {formatIDRPerTon(bTon)}</span>
                      <span className={devTon >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                        {devTon >= 0 ? `+${devTon.toLocaleString()}` : devTon.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Right: Nominal Total */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                      Total Realisasi (IDR)
                    </span>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {formatCompact(totalReal)}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-200/60">
                      <span>B: {formatCompact(totalBudget)}</span>
                      <span className={totalDev >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                        {totalDev >= 0 ? `+${formatCompact(totalDev)}` : formatCompact(totalDev)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Chart */}
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={activeRangeTimeline}
                      margin={{ top: 8, right: selectedMetric === "combo" ? 15 : 5, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9.5, fill: "#64748b" }}
                        stroke="#cbd5e1"
                      />
                      <YAxis
                        yAxisId="mainAxis"
                        tick={{ fontSize: 9.5, fill: "#64748b" }}
                        stroke="#cbd5e1"
                        tickFormatter={(v) =>
                          selectedMetric === "costPerTon"
                            ? `${v.toLocaleString()}`
                            : formatCompact(v)
                        }
                      />
                      {selectedMetric === "combo" && (
                        <YAxis
                          yAxisId="tonAxis"
                          orientation="right"
                          tick={{ fontSize: 9, fill: "#e95623" }}
                          stroke="#fed7aa"
                          tickFormatter={(v) => `${v.toLocaleString()}`}
                        />
                      )}
                      <Tooltip content={<CustomChartTooltip />} />

                      {/* Bars according to selected metric */}
                      {selectedMetric === "costPerTon" && (
                        <>
                          <Bar
                            yAxisId="mainAxis"
                            dataKey="budgetIdrPerTon"
                            name="Budget IDR/Ton"
                            fill="#cbd5e1"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            yAxisId="mainAxis"
                            dataKey="realisasiIdrPerTon"
                            name="Realisasi IDR/Ton"
                            fill="#e95623"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                        </>
                      )}

                      {selectedMetric === "costTotal" && (
                        <>
                          <Bar
                            yAxisId="mainAxis"
                            dataKey="budgetCost"
                            name="Budget (Rp)"
                            fill="#cbd5e1"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            yAxisId="mainAxis"
                            dataKey="realisasiCost"
                            name="Realisasi (Rp)"
                            fill="#2563eb"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                        </>
                      )}

                      {selectedMetric === "combo" && (
                        <>
                          <Bar
                            yAxisId="mainAxis"
                            dataKey="realisasiCost"
                            name="Realisasi (Rp)"
                            fill="#3b82f6"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                          <Line
                            yAxisId="tonAxis"
                            type="monotone"
                            dataKey="realisasiIdrPerTon"
                            name="Cost/Ton (IDR/Ton)"
                            stroke="#e95623"
                            strokeWidth={2}
                            dot={{ r: 2, fill: "#e95623" }}
                          />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {activeRangeTimeline.length} {timeMode === "monthly" ? "Bulan" : "Minggu"} ({startPeriod} - {endPeriod})
                  </span>
                  <button
                    onClick={() => setActiveModalItem(item)}
                    className="text-[11px] font-bold text-slate-700 hover:text-[#e95623] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{timeMode === "monthly" ? "Detail Bulanan" : "Detail Mingguan"}</span>
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Detail Modal for Specific Account / Subcategory */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#e95623] border border-orange-200">
                    {activeModalItem.type === "parent" ? "Kategori Utama" : activeModalItem.type === "subcategory" ? "Sub-Kategori" : "Detail Akun"}
                  </span>
                  {activeModalItem.accountCode && (
                    <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {activeModalItem.accountCode}
                    </span>
                  )}
                  {activeModalItem.costBehavior && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      {activeModalItem.costBehavior}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  {activeModalItem.name || activeModalItem.accountName}
                </h2>
                {activeModalItem.parentName && (
                  <p className="text-xs text-slate-500 font-medium">
                    Kategori Induk: <strong className="text-slate-700">{activeModalItem.parentName}</strong>
                  </p>
                )}
              </div>

              <button
                onClick={() => setActiveModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Big Chart */}
              <div className="h-64 w-full bg-slate-50/50 p-3 rounded-2xl border border-slate-200/80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={filterTimelineRange(activeModalItem.timeline)}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#cbd5e1" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis
                      yAxisId="costAxis"
                      stroke="#cbd5e1"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={formatCompact}
                    />
                    <YAxis
                      yAxisId="tonAxis"
                      orientation="right"
                      stroke="#fed7aa"
                      tick={{ fontSize: 11, fill: "#e95623" }}
                      tickFormatter={(v) => `Rp ${v.toLocaleString()}`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                    <Bar
                      yAxisId="costAxis"
                      dataKey="budgetCost"
                      name="Budget Nominal (Rp)"
                      fill="#cbd5e1"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      yAxisId="costAxis"
                      dataKey="realisasiCost"
                      name="Realisasi Nominal (Rp)"
                      fill="#3b82f6"
                      radius={[3, 3, 0, 0]}
                    />
                    <Line
                      yAxisId="tonAxis"
                      type="monotone"
                      dataKey="realisasiIdrPerTon"
                      name="Realisasi IDR/Ton"
                      stroke="#e95623"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#e95623" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">{timeMode === "monthly" ? "Bulan" : "Minggu"}</th>
                      <th className="py-2.5 px-3">Periode</th>
                      <th className="py-2.5 px-3 text-right">Produksi (Ton)</th>
                      <th className="py-2.5 px-3 text-right">Budget (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Realisasi (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Budget / Ton</th>
                      <th className="py-2.5 px-3 text-right">Realisasi / Ton</th>
                      <th className="py-2.5 px-3 text-right">Deviasi / Ton</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                    {filterTimelineRange(activeModalItem.timeline).map((t) => {
                      const isOver = t.deviasiIdrPerTon < 0;
                      return (
                        <tr key={t.label} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900">{t.label}</td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[10px]">{t.periodName}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{formatNumber(t.prodReal)}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(t.budgetCost)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(t.realisasiCost)}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{formatIDRPerTon(t.budgetIdrPerTon)}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#e95623]">{formatIDRPerTon(t.realisasiIdrPerTon)}</td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              isOver ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            {t.deviasiIdrPerTon >= 0 ? `+${formatIDRPerTon(t.deviasiIdrPerTon)}` : formatIDRPerTon(t.deviasiIdrPerTon)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end bg-slate-50">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
