"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "../types/auth";
import {
  plantService,
  TyreRimUsageResponse,
  TyreRimTransactionItem,
  TyreRimSpecSummary,
  TyreRimUnitSummary,
} from "../services/plantService";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Disc,
  CircleDot,
  Wrench,
  Search,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  X,
  Truck,
  TrendingUp,
  Tag,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Boxes,
  HelpCircle,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  LayoutGrid,
} from "lucide-react";

interface TyreRimUsageViewProps {
  user: User;
}

export const TyreRimUsageView: React.FC<TyreRimUsageViewProps> = ({ user }) => {
  // Filters
  const [selectedSite, setSelectedSite] = useState<"ALL" | "MPH" | "SNY">("ALL");
  const [selectedItemType, setSelectedItemType] = useState<"ALL" | "TYRE" | "RIM">("ALL");
  const [selectedSpec, setSelectedSpec] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [data, setData] = useState<TyreRimUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination for transactions table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Active chart view tab: "all" | "timeline" | "donut" | "units"
  const [activeChartTab, setActiveChartTab] = useState<"all" | "timeline" | "donut" | "units">("all");

  // Timeline chart metric toggle: "combo" | "qty" | "cost"
  const [timelineMetric, setTimelineMetric] = useState<"combo" | "qty" | "cost">("combo");

  // Donut chart metric toggle: "qty" | "cost"
  const [donutMetric, setDonutMetric] = useState<"qty" | "cost">("qty");

  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatCompactCurrency = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}Jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
    return `${val || 0}`;
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const day = parts[2];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const mIdx = parseInt(parts[1], 10) - 1;
        const mName = monthNames[mIdx] || parts[1];
        return `${day} ${mName}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Custom Tooltip for Timeline Chart
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pData = payload[0]?.payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs space-y-2 min-w-52 z-50">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 gap-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar size={13} className="text-[#e95623]" />
            {pData?.date}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
            {pData?.totalQty || 0} pcs total
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-blue-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs" />
              Tyre (Ban):
            </span>
            <span className="font-bold text-white text-xs">{pData?.tyreQty || 0} pcs</span>
          </div>
          <div className="flex items-center justify-between text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs" />
              Rim (Velg):
            </span>
            <span className="font-bold text-white text-xs">{pData?.rimQty || 0} pcs</span>
          </div>
          {pData?.totalCost > 0 && (
            <div className="flex items-center justify-between text-orange-300 pt-1.5 border-t border-slate-800">
              <span className="flex items-center gap-1.5 font-sans font-medium text-slate-400">
                <DollarSign size={12} className="text-[#e95623]" />
                Total Biaya:
              </span>
              <span className="font-bold text-orange-400">{formatCurrency(pData?.totalCost || 0)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Custom Tooltip for Donut Chart
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs space-y-2 z-50 min-w-44">
        <div className="flex items-center gap-2 font-black text-sm pb-1 border-b border-slate-700/80">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
        </div>
        <div className="font-mono text-xs space-y-1">
          <div className="flex justify-between gap-3 text-slate-300">
            <span>Kuantitas:</span>
            <strong className="text-white">{formatNumber(item.qty)} Pcs</strong>
          </div>
          <div className="flex justify-between gap-3 text-slate-300">
            <span>Total Biaya:</span>
            <strong className="text-orange-400">{formatCurrency(item.cost)}</strong>
          </div>
          <div className="flex justify-between gap-3 text-slate-300">
            <span>Harga Rata-rata:</span>
            <strong className="text-white">
              {formatCurrency(item.qty > 0 ? item.cost / item.qty : 0)}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  // Custom Tooltip for Top Units Chart
  const CustomTopUnitTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pData = payload[0]?.payload;
    if (!pData) return null;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs space-y-2 min-w-48 z-50">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
          <span className="font-mono font-black text-white text-sm flex items-center gap-1.5">
            <Truck size={14} className="text-[#e95623]" />
            {pData.unitCode}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
            {pData.totalQty} pcs
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-blue-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Tyre (Ban):
            </span>
            <span className="font-bold text-white">{pData.tyreQty} pcs</span>
          </div>
          <div className="flex items-center justify-between text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Rim (Velg):
            </span>
            <span className="font-bold text-white">{pData.rimQty} pcs</span>
          </div>
          <div className="flex items-center justify-between text-orange-300 pt-1.5 border-t border-slate-800">
            <span className="text-slate-400 font-sans">Total Biaya:</span>
            <span className="font-bold text-orange-400">{formatCurrency(pData.totalCost)}</span>
          </div>
        </div>
      </div>
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(Math.round(val || 0));
  };

  const formatDecimal = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await plantService.getTyreRimUsage({
        site: selectedSite !== "ALL" ? selectedSite : undefined,
        itemType: selectedItemType !== "ALL" ? selectedItemType : undefined,
        specification: selectedSpec || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        q: searchQuery || undefined,
      });
      setData(res);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Error loading tyre & rim usage data:", err);
      setError(err.message || "Gagal memuat data Tyre & Rim Usage.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSite, selectedItemType, selectedSpec, startDate, endDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // All transactions from response
  const transactions = useMemo(() => data?.transactions || [], [data]);

  // Paginated transactions
  const totalPages = Math.ceil(transactions.length / rowsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return transactions.slice(start, start + rowsPerPage);
  }, [transactions, currentPage, rowsPerPage]);

  // Available unique specifications for dropdown
  const availableSpecs = useMemo(() => {
    if (!data?.specBreakdown) return [];
    return data.specBreakdown.map((s) => s.specification);
  }, [data]);

  // CSV Export handler
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      alert("Tidak ada data transaksi untuk diekspor.");
      return;
    }

    const headers = [
      "Tanggal",
      "No. Voucher",
      "Kategori",
      "Spesifikasi",
      "Kode Material",
      "Unit Armada",
      "Posisi Roda",
      "Qty (Pcs)",
      "Harga Satuan (IDR)",
      "Total Biaya (IDR)",
      "Cost Center",
      "Site",
      "Remark Asli",
    ];

    const csvRows = [headers.join(",")];
    transactions.forEach((tx) => {
      const line = [
        `"${tx.date || ""}"`,
        `"${tx.regNo || ""}"`,
        `"${tx.itemType}"`,
        `"${(tx.specification || "").replace(/"/g, '""')}"`,
        `"${tx.materialCode || ""}"`,
        `"${tx.targetUnit || ""}"`,
        `"${(tx.position || "").replace(/"/g, '""')}"`,
        tx.qty || 1,
        Math.round(tx.unitPrice || 0),
        Math.round(tx.debet || 0),
        `"${tx.costCenter || ""}"`,
        `"${tx.projectArea || ""}"`,
        `"${(tx.remark || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(line.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const typeLabel = selectedItemType !== "ALL" ? `_${selectedItemType}` : "";
    const siteLabel = selectedSite !== "ALL" ? `_${selectedSite}` : "";
    a.download = `Tyre_Rim_Usage_Report${siteLabel}${typeLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const kpis = data?.kpis;
  const specBreakdown = data?.specBreakdown || [];
  const topUnits = data?.topUnits || [];
  const positionSummary = data?.positionSummary || { PrimeMover: 0, Dolly: 0, Vessel1: 0, Vessel2: 0, Other: 0 };

  const totalPositions =
    positionSummary.PrimeMover +
    positionSummary.Dolly +
    positionSummary.Vessel1 +
    positionSummary.Vessel2 +
    positionSummary.Other;

  const dailyTimeline = useMemo(() => data?.dailyTimeline || [], [data]);

  const peakTimelineDay = useMemo(() => {
    if (!dailyTimeline || dailyTimeline.length === 0) return null;
    return [...dailyTimeline].sort((a, b) => b.totalQty - a.totalQty)[0];
  }, [dailyTimeline]);

  const topUnitsChartData = useMemo(() => {
    if (!data?.topUnits) return [];
    const limit = activeChartTab === "units" ? 15 : 10;
    return data.topUnits.slice(0, limit).map((u) => ({
      unitCode: u.unitCode,
      tyreQty: u.tyreQty || 0,
      rimQty: u.rimQty || 0,
      totalQty: u.qty || 0,
      totalCost: u.totalCost || 0,
    }));
  }, [data?.topUnits, activeChartTab]);

  const donutData = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        name: "Tyre (Ban)",
        value: donutMetric === "qty" ? (kpis.tyreQty || 0) : (kpis.tyreCost || 0),
        qty: kpis.tyreQty || 0,
        cost: kpis.tyreCost || 0,
        color: "#2563eb",
      },
      {
        name: "Rim (Velg)",
        value: donutMetric === "qty" ? (kpis.rimQty || 0) : (kpis.rimCost || 0),
        qty: kpis.rimQty || 0,
        cost: kpis.rimCost || 0,
        color: "#f59e0b",
      },
    ];
  }, [kpis, donutMetric]);

  const tyreRimRatio = useMemo(() => {
    if (!kpis || !kpis.rimQty || kpis.rimQty === 0) return null;
    return (kpis.tyreQty / kpis.rimQty).toFixed(1);
  }, [kpis]);

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200/80 flex items-center justify-center shadow-2xs">
              <Disc size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                Tyre &amp; Rim Usage Monitoring
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GL Beban Tyre (05110203)
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Analisis real-time konsumsi dan pemasangan ban &amp; velg armada operasional dari jurnal pengeluaran barang (Good Issue)
              </p>
            </div>
          </div>
        </div>

        {/* Site Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
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
            <button
              onClick={() => setSelectedSite("MPH")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedSite === "MPH"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-blue-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block" />
              Muara Pahu
            </button>
            <button
              onClick={() => setSelectedSite("SNY")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedSite === "SNY"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-emerald-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
              Senyiur
            </button>
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
            onClick={handleExportCsv}
            disabled={transactions.length === 0}
            className="px-3.5 py-2 rounded-xl bg-linear-to-r from-[#e95623] to-[#d44818] hover:from-[#d44818] hover:to-[#be3e12] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download data transaksi format CSV / Excel"
          >
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Biaya Pemakaian */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Biaya Pemakaian
            </span>
            <div className="h-8 w-8 rounded-xl bg-orange-50 text-[#e95623] flex items-center justify-center border border-orange-200/70">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {formatCurrency(kpis?.totalCost || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <span>{kpis?.totalTransactions || 0} transaksi voucher GI</span>
              <span>&bull;</span>
              <strong className="text-slate-700 font-bold">{kpis?.totalQty || 0} pcs</strong>
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-orange-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
        </div>

        {/* Card 2: Pemakaian Tyre */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Disc size={13} className="text-blue-500" />
              Pemakaian Tyre (Ban)
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {kpis?.totalQty ? ((kpis.tyreQty / kpis.totalQty) * 100).toFixed(1) : 0}% Qty
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {formatNumber(kpis?.tyreQty || 0)}
              </h3>
              <span className="text-xs font-bold text-slate-500">Pcs</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Total: <strong className="font-mono text-slate-800">{formatCurrency(kpis?.tyreCost || 0)}</strong>
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Rata-rata: <strong className="font-mono text-blue-600">{formatCurrency(kpis?.avgTyreCost || 0)}</strong>/pcs
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
        </div>

        {/* Card 3: Pemakaian Rim */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CircleDot size={13} className="text-amber-500" />
              Pemakaian Rim (Velg)
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {kpis?.totalQty ? ((kpis.rimQty / kpis.totalQty) * 100).toFixed(1) : 0}% Qty
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {formatNumber(kpis?.rimQty || 0)}
              </h3>
              <span className="text-xs font-bold text-slate-500">Pcs</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Total: <strong className="font-mono text-slate-800">{formatCurrency(kpis?.rimCost || 0)}</strong>
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Rata-rata: <strong className="font-mono text-amber-600">{formatCurrency(kpis?.avgRimCost || 0)}</strong>/pcs
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
        </div>

        {/* Card 4: Top Unit Replacement */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Truck size={13} className="text-emerald-500" />
              Top Armada Penggantian
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {topUnits.length} Unit
            </span>
          </div>
          <div className="mt-2.5">
            {topUnits.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {topUnits[0].unitCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {topUnits[0].qty} Pcs
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                  Runner up: <strong className="text-slate-700 font-bold">{topUnits[1]?.unitCode || "-"}</strong> ({topUnits[1]?.qty || 0} pcs) &bull; <strong className="text-slate-700 font-bold">{topUnits[2]?.unitCode || "-"}</strong> ({topUnits[2]?.qty || 0} pcs)
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Tidak ada data unit</p>
            )}
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        </div>
      </div>

      {/* 2.5. Section Grafik & Analitik Visual Tyre & Rim */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200/80 flex items-center justify-center shadow-2xs">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Grafik Analisis Pemakaian Tyre &amp; Rim
                  {kpis?.totalQty ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#e95623] border border-orange-200/80">
                      {kpis.totalQty} Pcs Terpasang
                    </span>
                  ) : null}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Visualisasi tren periodik, perbandingan rasio konsumsi, dan intensitas penggantian per unit armada
                </p>
              </div>
            </div>
          </div>

          {/* View Toggles */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveChartTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeChartTab === "all"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={13} />
              <span>Semua Grafik</span>
            </button>
            <button
              onClick={() => setActiveChartTab("timeline")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeChartTab === "timeline"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp size={13} />
              <span>Tren Waktu</span>
            </button>
            <button
              onClick={() => setActiveChartTab("donut")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeChartTab === "donut"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <PieChartIcon size={13} />
              <span>Proporsi Rim vs Tyre</span>
            </button>
            <button
              onClick={() => setActiveChartTab("units")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeChartTab === "units"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Truck size={13} />
              <span>Top Armada</span>
            </button>
          </div>
        </div>

        {/* Charts Body */}
        {!isMounted || isLoading ? (
          <div className="py-20 text-center space-y-2.5">
            <RefreshCw size={26} className="animate-spin text-[#e95623] mx-auto" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Menyiapkan Visualisasi Grafik Tyre &amp; Rim...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. TIMELINE CHART (Rendered in 'all' or 'timeline') */}
            {(activeChartTab === "all" || activeChartTab === "timeline") && (
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-[#e95623]" />
                      Tren Pemakaian Tyre &amp; Rim Sepanjang Waktu
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Fluktuasi kuantitas pemasangan ban &amp; velg armada berdasarkan tanggal transaksi Good Issue
                    </p>
                  </div>

                  {/* Metric Switcher for Timeline */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold self-start sm:self-auto">
                    <button
                      onClick={() => setTimelineMetric("combo")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        timelineMetric === "combo"
                          ? "bg-white text-slate-800 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Kombinasi (Pcs &amp; Biaya)
                    </button>
                    <button
                      onClick={() => setTimelineMetric("qty")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        timelineMetric === "qty"
                          ? "bg-white text-slate-800 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Kuantitas (Pcs)
                    </button>
                    <button
                      onClick={() => setTimelineMetric("cost")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        timelineMetric === "cost"
                          ? "bg-white text-slate-800 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Biaya (IDR)
                    </button>
                  </div>
                </div>

                {dailyTimeline.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Activity size={28} className="text-slate-300" />
                    <p className="text-xs font-semibold">Tidak ada data tren harian untuk filter yang dipilih</p>
                  </div>
                ) : (
                  <div className={`w-full ${activeChartTab === "timeline" ? "h-96" : "h-76"}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={dailyTimeline}
                        margin={{ top: 12, right: timelineMetric === "combo" ? 20 : 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          stroke="#cbd5e1"
                          minTickGap={16}
                        />
                        <YAxis
                          yAxisId="qtyAxis"
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          stroke="#cbd5e1"
                          allowDecimals={false}
                          tickFormatter={(v) => (timelineMetric === "cost" ? formatCompactCurrency(v) : `${v}`)}
                        />
                        {timelineMetric === "combo" && (
                          <YAxis
                            yAxisId="costAxis"
                            orientation="right"
                            tickFormatter={formatCompactCurrency}
                            tick={{ fontSize: 10, fill: "#e95623" }}
                            stroke="#fcd34d"
                          />
                        )}
                        <Tooltip content={<CustomTimelineTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                          iconType="circle"
                        />
                        {timelineMetric !== "cost" && (
                          <>
                            <Bar
                              yAxisId="qtyAxis"
                              dataKey="tyreQty"
                              name="Tyre (Ban) - Pcs"
                              fill="#2563eb"
                              radius={[3, 3, 0, 0]}
                              maxBarSize={32}
                            />
                            <Bar
                              yAxisId="qtyAxis"
                              dataKey="rimQty"
                              name="Rim (Velg) - Pcs"
                              fill="#f59e0b"
                              radius={[3, 3, 0, 0]}
                              maxBarSize={32}
                            />
                          </>
                        )}
                        {timelineMetric === "cost" && (
                          <Bar
                            yAxisId="qtyAxis"
                            dataKey="totalCost"
                            name="Total Biaya (IDR)"
                            fill="#e95623"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                          />
                        )}
                        {timelineMetric === "combo" && (
                          <Line
                            yAxisId="costAxis"
                            type="monotone"
                            dataKey="totalCost"
                            name="Total Biaya (IDR)"
                            stroke="#e95623"
                            strokeWidth={2.5}
                            dot={{ r: 2.5, fill: "#e95623" }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Timeline Highlights Pill Bar */}
                {dailyTimeline.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <span>Total Periode: <strong className="text-slate-800 font-bold font-mono">{dailyTimeline.length} hari aktif</strong></span>
                      <span>&bull;</span>
                      <span>Rata-rata: <strong className="text-slate-800 font-bold font-mono">{formatDecimal((kpis?.totalQty || 0) / dailyTimeline.length)} pcs/hari</strong></span>
                    </div>

                    {peakTimelineDay && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#e95623] border border-orange-200">
                          Puncak Pemakaian
                        </span>
                        <strong className="text-slate-800 font-bold font-mono">{peakTimelineDay.date}</strong>
                        <span className="text-slate-500">({peakTimelineDay.totalQty} pcs &bull; {formatCurrency(peakTimelineDay.totalCost)})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. DUAL COMPARISON GRID (Proporsi Donut & Top Armada Stacked Bar) */}
            {(activeChartTab === "all" || activeChartTab === "donut" || activeChartTab === "units") && (
              <div
                className={`grid grid-cols-1 ${
                  activeChartTab === "all" ? "lg:grid-cols-2" : "grid-cols-1"
                } gap-5`}
              >
                {/* PROPORSI TYRE VS RIM (DONUT CHART) */}
                {(activeChartTab === "all" || activeChartTab === "donut") && (
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <PieChartIcon size={14} className="text-blue-600" />
                          Komparasi Proporsi Tyre vs Rim
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Perbandingan porsi kuantitas fisik dan nilai rupiah pemakaian
                        </p>
                      </div>

                      {/* Donut Metric Toggle */}
                      <div className="flex items-center p-0.5 bg-white rounded-lg border border-slate-200 text-[10px] font-bold shrink-0">
                        <button
                          onClick={() => setDonutMetric("qty")}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            donutMetric === "qty"
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Qty (Pcs)
                        </button>
                        <button
                          onClick={() => setDonutMetric("cost")}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            donutMetric === "cost"
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Biaya (IDR)
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Donut SVG */}
                      <div className="w-full sm:w-1/2 h-56 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={activeChartTab === "donut" ? 65 : 50}
                              outerRadius={activeChartTab === "donut" ? 95 : 75}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomDonutTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Center Metric Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Total {donutMetric === "qty" ? "Qty" : "Biaya"}
                          </span>
                          <span className="text-base font-black text-slate-800 font-mono tracking-tight">
                            {donutMetric === "qty"
                              ? `${formatNumber(kpis?.totalQty || 0)} Pcs`
                              : formatCompactCurrency(kpis?.totalCost || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Detail Breakdown Cards */}
                      <div className="w-full sm:w-1/2 space-y-2.5">
                        {/* Tyre Box */}
                        <div className="p-2.5 rounded-xl border border-blue-200/90 bg-blue-50/60 transition-all hover:bg-blue-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                              <Disc size={13} className="text-blue-600" />
                              Tyre (Ban)
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                              {kpis?.totalQty ? ((kpis.tyreQty / kpis.totalQty) * 100).toFixed(1) : 0}% Qty
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between font-mono">
                            <span className="text-sm font-black text-slate-900">
                              {formatNumber(kpis?.tyreQty || 0)} pcs
                            </span>
                            <span className="text-xs font-bold text-blue-700">
                              {formatCurrency(kpis?.tyreCost || 0)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Rata-rata: <strong className="font-mono text-slate-700 font-bold">{formatCurrency(kpis?.avgTyreCost || 0)}</strong>/pcs
                          </div>
                        </div>

                        {/* Rim Box */}
                        <div className="p-2.5 rounded-xl border border-amber-200/90 bg-amber-50/60 transition-all hover:bg-amber-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                              <CircleDot size={13} className="text-amber-600" />
                              Rim (Velg)
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              {kpis?.totalQty ? ((kpis.rimQty / kpis.totalQty) * 100).toFixed(1) : 0}% Qty
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between font-mono">
                            <span className="text-sm font-black text-slate-900">
                              {formatNumber(kpis?.rimQty || 0)} pcs
                            </span>
                            <span className="text-xs font-bold text-amber-800">
                              {formatCurrency(kpis?.rimCost || 0)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Rata-rata: <strong className="font-mono text-slate-700 font-bold">{formatCurrency(kpis?.avgRimCost || 0)}</strong>/pcs
                          </div>
                        </div>

                        {/* Ratio Pill */}
                        {tyreRimRatio && (
                          <div className="p-2 rounded-lg bg-white border border-slate-200 text-center text-[10px] text-slate-600 font-medium shadow-2xs">
                            Rasio Pemakaian: <strong className="text-slate-900 font-bold font-mono">1 Velg (Rim) : {tyreRimRatio} Ban (Tyre)</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TOP 10 ARMADA REPLACEMENT (STACKED BAR CHART) */}
                {(activeChartTab === "all" || activeChartTab === "units") && (
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck size={14} className="text-emerald-600" />
                          Top Armada Penggantian Tyre &amp; Rim
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Unit armada dengan kuantitas penggantian komponen ban &amp; velg tertinggi
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                        {topUnitsChartData.length} Unit Tertinggi
                      </span>
                    </div>

                    {topUnitsChartData.length === 0 ? (
                      <div className="h-56 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl bg-white">
                        <Truck size={28} className="text-slate-300" />
                        <p className="text-xs font-semibold">Tidak ada data unit</p>
                      </div>
                    ) : (
                      <div className={`w-full ${activeChartTab === "units" ? "h-96" : "h-56"}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topUnitsChartData}
                            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                              dataKey="unitCode"
                              tick={{ fontSize: 9.5, fill: "#334155", fontWeight: 700 }}
                              stroke="#cbd5e1"
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#64748b" }}
                              stroke="#cbd5e1"
                              allowDecimals={false}
                            />
                            <Tooltip content={<CustomTopUnitTooltip />} />
                            <Legend
                              wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                              iconType="circle"
                            />
                            <Bar
                              dataKey="tyreQty"
                              name="Tyre (Ban)"
                              stackId="unitStack"
                              fill="#2563eb"
                              radius={[0, 0, 0, 0]}
                              maxBarSize={28}
                            />
                            <Bar
                              dataKey="rimQty"
                              name="Rim (Velg)"
                              stackId="unitStack"
                              fill="#f59e0b"
                              radius={[3, 3, 0, 0]}
                              maxBarSize={28}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {topUnitsChartData.length > 0 && (
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60 font-medium">
                        <span>
                          Unit Terbanyak: <strong className="text-slate-900 font-bold font-mono">{topUnitsChartData[0]?.unitCode}</strong> ({topUnitsChartData[0]?.totalQty} pcs total)
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatCurrency(topUnitsChartData[0]?.totalCost)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Analytics & Visual Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Specification Breakdown Card (2 Columns Wide on LG) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Boxes size={16} className="text-[#e95623]" />
                Rincian Pemakaian per Spesifikasi &amp; Merek
              </h2>
              <p className="text-xs text-slate-500">
                Proporsi kuantitas dan alokasi biaya per jenis ban &amp; velg yang terpasang
              </p>
            </div>
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {specBreakdown.length} Spesifikasi Aktif
            </span>
          </div>

          <div className="space-y-3.5">
            {specBreakdown.map((spec, sIdx) => {
              const isRim = spec.itemType === "Rim";
              return (
                <div
                  key={spec.specification}
                  onClick={() => setSelectedSpec(selectedSpec === spec.specification ? "" : spec.specification)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedSpec === spec.specification
                      ? "border-orange-400 bg-orange-50/40 shadow-xs"
                      : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                  title={`Klik untuk filter spesifikasi ${spec.specification}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                          isRim
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isRim ? "RIM" : "TYRE"}
                      </span>
                      <span className="font-bold text-xs text-slate-800 truncate" title={spec.specification}>
                        {spec.specification}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs shrink-0 font-mono">
                      <span className="font-bold text-slate-900">
                        {spec.qty} Pcs{" "}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({spec.percentQty.toFixed(1)}%)
                        </span>
                      </span>
                      <span className="font-bold text-[#e95623]">
                        {formatCurrency(spec.totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isRim ? "bg-amber-500" : "bg-linear-to-r from-blue-500 to-[#e95623]"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(spec.percentQty, 3))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>
                      Harga Satuan Rata-rata:{" "}
                      <strong className="text-slate-700 font-mono font-bold">
                        {formatCurrency(spec.avgPrice)}
                      </strong>
                    </span>
                    <span>
                      Porsi Biaya:{" "}
                      <strong className="text-slate-700 font-mono font-bold">
                        {spec.percentCost.toFixed(1)}%
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Position & Top Units Summary (1 Column Wide on LG) */}
        <div className="space-y-5">
          {/* Posisi Pemasangan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
            <div className="pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#18bebc]" />
                Distribusi Posisi Roda
              </h3>
              <p className="text-[11px] text-slate-400">
                Pemasangan komponen pada rangkaian armada
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Prime Mover</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {positionSummary.PrimeMover} <span className="text-[10px] font-normal text-slate-500">pcs</span>
                </p>
                <div className="text-[10px] text-blue-600 font-bold mt-0.5">
                  {totalPositions ? ((positionSummary.PrimeMover / totalPositions) * 100).toFixed(1) : 0}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dolly</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {positionSummary.Dolly} <span className="text-[10px] font-normal text-slate-500">pcs</span>
                </p>
                <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                  {totalPositions ? ((positionSummary.Dolly / totalPositions) * 100).toFixed(1) : 0}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Vessel 1</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {positionSummary.Vessel1} <span className="text-[10px] font-normal text-slate-500">pcs</span>
                </p>
                <div className="text-[10px] text-purple-600 font-bold mt-0.5">
                  {totalPositions ? ((positionSummary.Vessel1 / totalPositions) * 100).toFixed(1) : 0}%
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Vessel 2</span>
                <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                  {positionSummary.Vessel2} <span className="text-[10px] font-normal text-slate-500">pcs</span>
                </p>
                <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                  {totalPositions ? ((positionSummary.Vessel2 / totalPositions) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>

            {positionSummary.Other > 0 && (
              <p className="text-[10px] text-slate-400 italic text-center">
                +{positionSummary.Other} pcs dengan rincian posisi velg / perbaikan umum
              </p>
            )}
          </div>

          {/* Top Units Roster */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} className="text-[#e95623]" />
                Top 6 Armada Terbanyak
              </h3>
              <span className="text-[10px] text-slate-400">Qty Ganti</span>
            </div>

            <div className="space-y-2">
              {topUnits.slice(0, 6).map((unit, idx) => (
                <div
                  key={unit.unitCode}
                  onClick={() => setSearchQuery(unit.unitCode)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer group"
                  title={`Klik untuk filter unit ${unit.unitCode}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                        idx === 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : idx === 1
                          ? "bg-slate-200 text-slate-800"
                          : idx === 2
                          ? "bg-orange-100 text-orange-900"
                          : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 group-hover:text-[#e95623] transition-colors">
                      {unit.unitCode}
                    </span>
                    {unit.rimQty > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        +{unit.rimQty} Rim
                      </span>
                    )}
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-slate-900">{unit.qty} pcs</span>
                    <span className="text-[10px] text-slate-400 block">
                      {formatCurrency(unit.totalCost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Transactions Table Toolbar & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-slate-50/70 space-y-3.5">
          {/* Top Toolbar Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-[#e95623]" />
                Daftar Detail Transaksi Pengeluaran Barang
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {transactions.length} Transaksi Ditemukan
              </span>
              {(selectedItemType !== "ALL" || selectedSpec || startDate || endDate || searchQuery) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#e95623] border border-orange-200/80">
                  Filter Aktif
                </span>
              )}
            </div>

            {/* Item Type Switcher (Semua, Khusus Tyre, Khusus Rim) */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200 text-xs shrink-0 font-bold">
              <button
                onClick={() => setSelectedItemType("ALL")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedItemType === "ALL"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua ({kpis?.totalTransactions || 0})
              </button>
              <button
                onClick={() => setSelectedItemType("TYRE")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedItemType === "TYRE"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-blue-700"
                }`}
              >
                <Disc size={13} />
                <span>Tyre ({kpis?.tyreCount || 0})</span>
              </button>
              <button
                onClick={() => setSelectedItemType("RIM")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedItemType === "RIM"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-amber-800"
                }`}
              >
                <CircleDot size={13} />
                <span>Rim ({kpis?.rimCount || 0})</span>
              </button>
            </div>
          </div>

          {/* Sub Filter Row: Specific Spec, Date Range, Search Box, Reset */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Spesifikasi Filter */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs flex-1 min-w-55 max-w-sm hover:border-slate-300 transition-colors">
              <Tag size={13} className="text-[#e95623] shrink-0" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Spesifikasi:
              </span>
              <select
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
                className="w-full bg-transparent font-medium text-slate-700 focus:outline-hidden cursor-pointer text-xs truncate"
              >
                <option value="">Semua Spesifikasi</option>
                {availableSpecs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {selectedSpec && (
                <button
                  onClick={() => setSelectedSpec("")}
                  className="text-slate-400 hover:text-red-500 cursor-pointer ml-0.5 shrink-0"
                  title="Hapus filter spesifikasi"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs hover:border-slate-300 transition-colors">
              <Calendar size={13} className="text-[#e95623] shrink-0" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Tgl:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-hidden text-xs cursor-pointer"
                title="Dari Tanggal"
              />
              <span className="text-slate-300 font-bold shrink-0">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-hidden text-xs cursor-pointer"
                title="Sampai Tanggal"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-slate-400 hover:text-red-500 cursor-pointer ml-0.5 shrink-0"
                  title="Hapus filter tanggal"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-50">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari voucher GI, unit PM, spesifikasi, posisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-orange-500 placeholder:text-slate-400 font-medium shadow-2xs hover:border-slate-300 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Reset All Filters */}
            {(selectedItemType !== "ALL" || selectedSpec || startDate || endDate || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedItemType("ALL");
                  setSelectedSpec("");
                  setStartDate("");
                  setEndDate("");
                  setSearchQuery("");
                }}
                className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#e95623] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                title="Reset Semua Filter"
              >
                <X size={13} />
                <span>Reset Filter</span>
              </button>
            )}

            {/* Rows Per Page Selector */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                title="Jumlah baris per halaman"
              >
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. Table Component */}
        <div className="overflow-x-auto min-h-95">
          {isLoading ? (
            <div className="py-20 text-center space-y-2.5">
              <RefreshCw size={26} className="animate-spin text-[#e95623] mx-auto" />
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                Memuat Data Pemakaian Tyre &amp; Rim...
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Disc size={32} className="text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Tidak ada transaksi yang cocok dengan filter atau pencarian saat ini.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider select-none">
                  <th className="py-3 px-3 w-28">Tanggal</th>
                  <th className="py-3 px-3 w-32">No. Voucher</th>
                  <th className="py-3 px-2.5 w-20 text-center">Kategori</th>
                  <th className="py-3 px-3 min-w-48">Spesifikasi Barang</th>
                  <th className="py-3 px-3 w-28 text-center">Unit Armada</th>
                  <th className="py-3 px-3 min-w-36">Posisi Roda</th>
                  <th className="py-3 px-3 text-right w-20">Qty</th>
                  <th className="py-3 px-3 text-right w-32">Harga Satuan</th>
                  <th className="py-3 px-3 text-right w-36">Total Biaya (Debet)</th>
                  <th className="py-3 px-2.5 w-16 text-center">Site</th>
                  <th className="py-3 px-3 min-w-44">Keterangan (Remark)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedTransactions.map((tx, idx) => {
                  const isRim = tx.itemType === "Rim";
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                      }`}
                    >
                      {/* Tanggal */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                        {tx.date}
                      </td>

                      {/* No. Voucher */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded border whitespace-nowrap bg-amber-50 text-amber-900 border-amber-200/90">
                          {tx.regNo || "-"}
                        </span>
                      </td>

                      {/* Kategori Badge (Tyre vs Rim) */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isRim
                              ? "bg-amber-100 text-amber-950 border-amber-300"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isRim ? (
                            <>
                              <CircleDot size={10} />
                              <span>RIM</span>
                            </>
                          ) : (
                            <>
                              <Disc size={10} />
                              <span>TYRE</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Spesifikasi & Kode Material */}
                      <td className="py-2.5 px-3 min-w-48 max-w-72">
                        <div className="font-bold text-slate-900 text-[11px] truncate" title={tx.specification}>
                          {tx.specification}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-tight">
                          {tx.materialCode}
                        </div>
                      </td>

                      {/* Unit Armada Terpasang */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {tx.targetUnit !== "-" ? (
                          <span
                            onClick={() => setSearchQuery(tx.targetUnit)}
                            className="font-mono font-black text-slate-800 text-[11px] bg-slate-100 hover:bg-orange-100 hover:text-[#e95623] px-2 py-0.5 rounded border border-slate-200 cursor-pointer transition-colors"
                            title={`Klik untuk filter armada ${tx.targetUnit}`}
                          >
                            {tx.targetUnit}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">-</span>
                        )}
                      </td>

                      {/* Posisi Roda */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {tx.position !== "-" ? (
                          <span className="font-mono text-[11px] text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            {tx.position}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono">-</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[11px]">
                          {tx.qty}
                        </span>
                      </td>

                      {/* Harga Satuan */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-[11px] whitespace-nowrap">
                        {formatNumber(tx.unitPrice)}
                      </td>

                      {/* Total Biaya (Debet) */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatNumber(tx.debet)}
                      </td>

                      {/* Site */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                            tx.projectArea === "MPH"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {tx.projectArea || "MPH"}
                        </span>
                      </td>

                      {/* Keterangan Asli */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-64 truncate" title={tx.remark}>
                        {tx.remark || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 6. Pagination Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 text-xs text-slate-600">
          <div>
            Menampilkan{" "}
            <strong className="text-slate-800">
              {transactions.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            </strong>{" "}
            -{" "}
            <strong className="text-slate-800">
              {Math.min(currentPage * rowsPerPage, transactions.length)}
            </strong>{" "}
            dari <strong className="text-slate-800">{transactions.length}</strong> transaksi
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
              title="Halaman Pertama"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs font-mono">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
              title="Halaman Selanjutnya"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
              title="Halaman Terakhir"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
