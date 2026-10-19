"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, JobSite } from "../types/auth";
import { DailyProduction, ProductionStats, WeeklyKpiSummary } from "../types/production";
import { productionService, DEFAULT_PRODUCTION_TARGETS } from "../services/productionService";
import { InputProductionModal } from "./InputProductionModal";
import { UACalculatorModal } from "./UACalculatorModal";
import { UploadProductionExcelModal } from "./UploadProductionExcelModal";
import { useNotification } from "../context/NotificationContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  Truck,
  Plus,
  Calculator,
  RefreshCw,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  Fuel,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  ArrowUpDown,
  Sparkles,
  LineChart as LineChartIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { calculateLinearTrend, TrendResult } from "../utils/trendCalculator";


interface InputProductionViewProps {
  user: User;
  onNavigateToDashboard?: () => void;
}

export const InputProductionView: React.FC<InputProductionViewProps> = ({
  user,
  onNavigateToDashboard,
}) => {
  const { showSuccess, showError, confirm } = useNotification();

  const [records, setRecords] = useState<DailyProduction[]>([]);
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters & State
  const [selectedSite, setSelectedSite] = useState<JobSite | "all">(
    user.jobSite === "HeadOffice" ? "all" : user.jobSite
  );
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "calculator">("daily");
  const [weeklySubTab, setWeeklySubTab] = useState<"charts" | "table">("charts");
  const [chartViewMode, setChartViewMode] = useState<"active" | "full">("active");

  // Daily Pagination State
  const [dailyPage, setDailyPage] = useState<number>(1);
  const [dailyPageSize, setDailyPageSize] = useState<number>(25);

  // Modals
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<DailyProduction | null>(null);
  const [isUaModalOpen, setIsUaModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // In-page UA Calculator state for Tab 3
  const [calcCalHours, setCalcCalHours] = useState<number>(24);
  const [calcDelay, setCalcDelay] = useState<number>(2.33);
  const [calcPa, setCalcPa] = useState<number>(100);
  const [calcTargetTrip, setCalcTargetTrip] = useState<number>(3.0);
  const [calcActualTrip, setCalcActualTrip] = useState<number>(3.03);


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, statsRes] = await Promise.all([
        productionService.getDailyProductions({
          site: selectedSite,
          weekNumber: selectedWeek,
          search: searchQuery,
        }),
        productionService.getProductionStats({
          site: selectedSite,
          weekNumber: selectedWeek,
        }),
      ]);

      setRecords(prodRes.data);
      setStats(statsRes);
    } catch (e: any) {
      console.error("Failed to load production data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setDailyPage(1);
  }, [selectedSite, selectedWeek, searchQuery]);

  // Sync with bundled Excel master
  const handleSyncExcelMaster = async () => {
    setIsSyncing(true);
    try {
      const res = await productionService.syncBundledExcel();
      if (res.success) {
        showSuccess(res.message || "Berhasil menyinkronkan data dari file Excel Master!");
        await fetchData();
      } else {
        showError(res.message || "Gagal menyinkronkan data");
      }
    } catch (e: any) {
      showError(e.message || "Terjadi kesalahan sinkronisasi");
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete handler
  const handleDeleteRecord = (rec: DailyProduction) => {
    confirm({
      title: "Hapus Data Produksi",
      message: `Apakah Anda yakin ingin menghapus data produksi tanggal ${rec.date} (${rec.weekNumber}) dengan total tonase ${rec.production.toLocaleString()} Ton?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger",
      onConfirm: async () => {
        try {
          await productionService.deleteDailyProduction(rec.id);
          showSuccess(`Data produksi tanggal ${rec.date} berhasil dihapus.`);
          fetchData();
        } catch (e: any) {
          showError(e.message || "Gagal menghapus data");
        }
      },
    });
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (records.length === 0) {
      showError("Tidak ada data untuk diekspor!");
      return;
    }
    const headers = [
      "Tanggal",
      "Kelompok Minggu",
      "Site",
      "PA (%)",
      "UA (%)",
      "Payload (Ton)",
      "Cycle Time (Jam)",
      "Fuel Ratio (L/Ton)",
      "Unit Running",
      "TDP",
      "Produksi (Ton)",
      "Keterangan",
    ];

    const rows = records.map((r) => [
      r.date,
      r.weekNumber,
      r.jobSite,
      (r.pa * 100).toFixed(2),
      (r.ua * 100).toFixed(2),
      r.payload.toFixed(2),
      r.cycleTime.toFixed(2),
      r.fuelRatio.toFixed(3),
      r.unitRunning,
      r.tdp.toFixed(2),
      r.production.toFixed(2),
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Produksi_Coal_Hauling_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Data produksi berhasil diekspor ke CSV!");
  };

  // Unique weeks list for filter dropdown
  const availableWeeks = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => set.add(r.weekNumber));
    return Array.from(set).sort();
  }, [records]);

  // Selected weeks depending on chartViewMode
  const currentWeeklyList = useMemo(() => {
    if (!stats) return [];
    if (chartViewMode === "full" && stats.allWeeksKpis && stats.allWeeksKpis.length > 0) {
      return stats.allWeeksKpis;
    }
    return stats.weeklyKpis;
  }, [stats, chartViewMode]);

  // Linear Trendline Calculations for Weekly Tab
  const weeklyTrends = useMemo(() => {
    if (!currentWeeklyList || currentWeeklyList.length === 0) return null;

    const payloadTrend = calculateLinearTrend(
      currentWeeklyList.map((w) => (w.payloadActual !== null ? Number(w.payloadActual.toFixed(1)) : 0)),
      { unit: "Ton" }
    );
    const cycleTimeTrend = calculateLinearTrend(
      currentWeeklyList.map((w) => (w.cycleTimeActual !== null ? Number(w.cycleTimeActual.toFixed(2)) : 0)),
      { unit: "Jam", subNote: "Efisien" }
    );
    const paTrend = calculateLinearTrend(
      currentWeeklyList.map((w) => (w.paActual !== null ? Number((w.paActual * 100).toFixed(1)) : 0)),
      { unit: "%" }
    );
    const uaTrend = calculateLinearTrend(
      currentWeeklyList.map((w) => (w.uaActual !== null ? Number((w.uaActual * 100).toFixed(1)) : 0)),
      { unit: "%" }
    );
    const fuelRatioTrend = calculateLinearTrend(
      currentWeeklyList.map((w) => (w.fuelRatioActual !== null ? Number(w.fuelRatioActual.toFixed(2)) : 0)),
      { unit: "L/T", subNote: "Hemat" }
    );
    const tdpTrend = calculateLinearTrend(
      currentWeeklyList.map((w) => (w.tdpActual !== null ? Number(w.tdpActual.toFixed(2)) : 0)),
      { unit: "Trip" }
    );

    return {
      payloadTrend,
      cycleTimeTrend,
      paTrend,
      uaTrend,
      fuelRatioTrend,
      tdpTrend,
    };
  }, [currentWeeklyList]);

  // Prepared weekly chart data for Tab 2
  const weeklyChartData = useMemo(() => {
    if (!stats || !weeklyTrends) return [];
    return currentWeeklyList.map((w, idx) => ({
      week: w.weekNumber,
      paActual: w.paActual !== null ? Number((w.paActual * 100).toFixed(1)) : 0,
      paPlan: 93.0,
      paTrend: weeklyTrends.paTrend.trendValues[idx],
      uaActual: w.uaActual !== null ? Number((w.uaActual * 100).toFixed(1)) : 0,
      uaPlan: 88.0,
      uaTrend: weeklyTrends.uaTrend.trendValues[idx],
      payloadActual: w.payloadActual !== null ? Number(w.payloadActual.toFixed(1)) : 0,
      payloadPlan: 205.0,
      payloadTrend: weeklyTrends.payloadTrend.trendValues[idx],
      cycleTimeActual: w.cycleTimeActual !== null ? Number(w.cycleTimeActual.toFixed(2)) : 0,
      cycleTimePlan: 7.5,
      cycleTimeTrend: weeklyTrends.cycleTimeTrend.trendValues[idx],
      fuelRatioActual: w.fuelRatioActual !== null ? Number(w.fuelRatioActual.toFixed(2)) : 0,
      fuelRatioPlan: 1.55,
      fuelRatioTrend: weeklyTrends.fuelRatioTrend.trendValues[idx],
      tdpActual: w.tdpActual !== null ? Number(w.tdpActual.toFixed(2)) : 0,
      tdpPlan: 2.7,
      tdpTrend: weeklyTrends.tdpTrend.trendValues[idx],
      productionActual: w.productionActual || 0,
    }));
  }, [stats, currentWeeklyList, weeklyTrends]);

  const renderTrendBadge = (trend?: TrendResult | null) => {
    if (!trend) return null;
    const isUp = trend.direction === "up";
    const isDown = trend.direction === "down";

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
          isUp
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : isDown
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : null}
        <span>{trend.label}</span>
      </span>
    );
  };


  // In-page calculator computation
  const inPageCalcResult = useMemo(() => {
    return productionService.calculateUAOffline({
      calendarHours: calcCalHours,
      plannedDelay: calcDelay,
      pa: calcPa / 100,
      targetTrip: calcTargetTrip,
      actualTrip: calcActualTrip,
    });
  }, [calcCalHours, calcDelay, calcPa, calcTargetTrip, calcActualTrip]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200/60 shadow-xs shrink-0">
                <Truck size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Input Data Produksi &amp; Evaluasi KPI
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-50 text-[#e95623] border border-orange-200/80">
                    <Sparkles size={11} />
                    Coal Hauling Operation
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    KPI Tahunan 2026
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed">
                  Pencatatan real-time ritase, tonase, Physical Availability (PA), Use of Availability (UA),
                  Cycle Time, serta Fuel Ratio armada Coal Hauling PT Batara Dharma Persada.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsUaModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 cursor-pointer"
              title="Buka Kalkulator UA"
            >
              <Calculator size={14} className="text-[#18bebc]" />
              <span className="hidden sm:inline">Kalkulator UA</span>
            </button>

            <button
              onClick={handleSyncExcelMaster}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Sinkronkan data harian dari file Excel KPI Master"
            >
              <RefreshCw size={14} className={`text-amber-500 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sync Excel"}</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 cursor-pointer"
              title="Upload file template Excel"
            >
              <Upload size={14} className="text-blue-600" />
              <span className="hidden sm:inline">Upload Excel</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Ekspor tabel ke format CSV"
            >
              <Download size={14} className="text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => {
                setEditingRecord(null);
                setIsInputModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#e95623] hover:bg-[#d44818] shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Input Produksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total Produksi */}
          <div className="col-span-2 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Total Produksi
              </span>
              <span className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
                <Truck size={14} />
              </span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {stats.totalProduction.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-1">Ton</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Rata-rata: {stats.avgProductionDaily.toLocaleString("id-ID")} Ton/hari</span>
              <span className="text-[#e95623] font-bold">{stats.totalDays} Hari</span>
            </div>
          </div>

          {/* PA (%) */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Avg PA
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {(stats.avgPa * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Plan: 93.0%</span>
              <span className={stats.avgPa >= 0.93 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {stats.avgPa >= 0.93 ? "Optimal" : "Kurang"}
              </span>
            </div>
          </div>

          {/* UA (%) */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Avg UA
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {(stats.avgUa * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Plan: 88.0%</span>
              <span className={stats.avgUa >= 0.88 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {stats.avgUa >= 0.88 ? "Optimal" : "Wajib Naik"}
              </span>
            </div>
          </div>

          {/* Payload */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Avg Payload
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {stats.avgPayload.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">Ton</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Plan: 205 T</span>
              <span className={stats.avgPayload >= 205 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {stats.avgPayload >= 205 ? "Tercapai" : "Kurang"}
              </span>
            </div>
          </div>

          {/* Cycle Time */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Cycle Time
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {stats.avgCycleTime.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">Jam</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Plan: 7.5 J</span>
              <span className={stats.avgCycleTime <= 7.5 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                {stats.avgCycleTime <= 7.5 ? "Cepat" : "+ Lambat"}
              </span>
            </div>
          </div>

          {/* Fuel Ratio */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Fuel Ratio
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {stats.avgFuelRatio.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">L/T</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Plan: 1.55</span>
              <span className={stats.avgFuelRatio <= 1.55 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                {stats.avgFuelRatio <= 1.55 ? "Efisien" : "Boros"}
              </span>
            </div>
          </div>

          {/* TDP (Trips/Day) */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Avg TDP
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">
                {stats.avgTdp.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">Trip</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Plan: 2.7</span>
              <span className={stats.avgTdp >= 2.7 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {stats.avgTdp >= 2.7 ? "Tercapai" : "Kurang"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "daily"
                ? "bg-[#e95623] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Calendar size={14} />
            <span>Data Produksi Harian ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "weekly"
                ? "bg-[#e95623] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart3 size={14} />
            <span>Ringkasan KPI Mingguan (W01–W53)</span>
          </button>

          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "calculator"
                ? "bg-[#e95623] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Calculator size={14} />
            <span>Kalkulator UA Mandiri</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 px-2">
          {/* Site Filter */}
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
          >
            <option value="all">Semua Site</option>
            <option value="MuaraPahu">Muara Pahu</option>
            <option value="Senyiur">Senyiur</option>
          </select>

          {/* Week Filter */}
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
          >
            <option value="all">Semua Minggu (W01–W53)</option>
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                Kelompok {w}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari tanggal / catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623] w-40 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Daily Production Table */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-3 py-3.5">Minggu</th>
                  <th className="px-3 py-3.5">PA (%)</th>
                  <th className="px-3 py-3.5">UA (%)</th>
                  <th className="px-3 py-3.5">Payload</th>
                  <th className="px-3 py-3.5">Cycle Time</th>
                  <th className="px-3 py-3.5">Fuel Ratio</th>
                  <th className="px-3 py-3.5">Unit</th>
                  <th className="px-3 py-3.5">TDP</th>
                  <th className="px-4 py-3.5 text-right">Produksi (Ton)</th>
                  <th className="px-4 py-3.5">Keterangan</th>
                  <th className="px-3 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 rounded-full border-2 border-[#e95623] border-t-transparent animate-spin" />
                        <span>Memuat data produksi...</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                        <Truck size={32} className="text-slate-300" />
                        <span className="font-bold text-slate-700">Belum ada data produksi</span>
                        <p className="text-[11px] text-slate-400">
                          Klik tombol <strong>Sync Excel Master</strong> untuk memuat data awal dari file
                          'KPI . Anual 2026 Wajib Input Daily + UA.xlsx' atau klik <strong>+ Input Produksi Baru</strong>.
                        </p>
                        <button
                          onClick={handleSyncExcelMaster}
                          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#e95623] hover:opacity-90 shadow-sm"
                        >
                          Muat Data dari Excel Master Sekarang
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const totalDailyPages = Math.max(1, Math.ceil(records.length / dailyPageSize));
                    const validDailyPage = Math.min(dailyPage, totalDailyPages);
                    const startIndex = (validDailyPage - 1) * dailyPageSize;
                    const paginated = records.slice(startIndex, startIndex + dailyPageSize);

                    return paginated.map((r) => {
                    const paPerc = r.pa > 1 ? r.pa : r.pa * 100;
                    const uaPerc = r.ua > 1 ? r.ua : r.ua * 100;
                    const isPaAchieved = paPerc >= 93.0;
                    const isUaAchieved = uaPerc >= 88.0;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                          {r.date}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {r.weekNumber}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isPaAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {paPerc.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isUaAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {uaPerc.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{r.payload.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 ml-0.5">T</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{r.cycleTime.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 ml-0.5">J</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{r.fuelRatio.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 ml-0.5">L/T</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-800">
                          {r.unitRunning}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-800">
                          {r.tdp.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-black text-slate-900">
                          {r.production.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-500" title={r.notes || ""}>
                          {r.notes || "-"}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingRecord(r);
                                setIsInputModalOpen(true);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-[#e95623] hover:bg-orange-50 transition-colors"
                              title="Edit Data"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {records.length > 0 && (
            <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Info & Rows per page */}
              <div className="flex items-center gap-3 text-slate-600">
                <span>
                  Menampilkan{" "}
                  <strong className="text-slate-900">
                    {(dailyPage - 1) * dailyPageSize + 1}
                  </strong>{" "}
                  –{" "}
                  <strong className="text-slate-900">
                    {Math.min(dailyPage * dailyPageSize, records.length)}
                  </strong>{" "}
                  dari <strong className="text-slate-900">{records.length}</strong> data
                </span>

                <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
                  <span className="text-slate-400">Baris:</span>
                  <select
                    value={dailyPageSize}
                    onChange={(e) => {
                      setDailyPageSize(Number(e.target.value));
                      setDailyPage(1);
                    }}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Navigation buttons */}
              {(() => {
                const totalPages = Math.max(1, Math.ceil(records.length / dailyPageSize));
                return (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDailyPage(1)}
                      disabled={dailyPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft size={14} />
                    </button>

                    <button
                      onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                      disabled={dailyPage <= 1}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Sebelumnya"
                    >
                      <ChevronLeft size={13} />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPages <= 5) return true;
                          return Math.abs(p - dailyPage) <= 2 || p === 1 || p === totalPages;
                        })
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && p - prev > 1;

                          return (
                            <React.Fragment key={`page-item-${p}`}>
                              {showEllipsis && (
                                <span className="px-1 text-slate-400 font-bold">&hellip;</span>
                              )}
                              <button
                                onClick={() => setDailyPage(p)}
                                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all ${
                                  p === dailyPage
                                    ? "bg-[#e95623] text-white shadow-2xs"
                                    : "text-slate-600 hover:bg-slate-100 border border-slate-200"
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setDailyPage((p) => Math.min(totalPages, p + 1))}
                      disabled={dailyPage >= totalPages}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Berikutnya"
                    >
                      <span className="hidden sm:inline">Berikutnya</span>
                      <ChevronRight size={13} />
                    </button>

                    <button
                      onClick={() => setDailyPage(totalPages)}
                      disabled={dailyPage >= totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Weekly KPI Summary & Charts (W01–W53) */}
      {activeTab === "weekly" && stats && (
        <div className="space-y-4">
          {/* Sub-tab & Mode Selector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeeklySubTab("charts")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  weeklySubTab === "charts"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <LineChartIcon size={14} className="text-[#18bebc]" />
                <span>Grafik Visual KPI</span>
              </button>
              <button
                onClick={() => setWeeklySubTab("table")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  weeklySubTab === "table"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <BarChart3 size={14} className="text-[#e95623]" />
                <span>Tabel Matriks Mingguan</span>
              </button>
            </div>

            {weeklySubTab === "charts" && (
              <div className="flex items-center p-1 rounded-xl bg-slate-100 text-xs font-bold">
                <button
                  onClick={() => setChartViewMode("active")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    chartViewMode === "active"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Sesuai lembar kerja 'Indikator KPI W30-W53'"
                >
                  Fokus Aktif (W30–W53)
                </button>
                <button
                  onClick={() => setChartViewMode("full")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    chartViewMode === "full"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Sesuai lembar kerja 'Grafik KPI 2026'"
                >
                  Skala Penuh (W01–W53)
                </button>
              </div>
            )}
          </div>

          {/* Visual Charts View */}
          {weeklySubTab === "charts" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* CHART 1: Payload */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Truck size={15} />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      Payload (Ton)
                    </span>
                    {weeklyTrends && renderTrendBadge(weeklyTrends.payloadTrend)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="text-indigo-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-indigo-600" /> Actual
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#e95623]" /> Plan 205 T
                    </span>
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#0284c7] border-t border-dashed" /> Tren ({weeklyTrends?.payloadTrend.direction === "up" ? "Naik ↗" : weeklyTrends?.payloadTrend.direction === "down" ? "Turun ↘" : "Stabil ↔"})
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 15, right: 25, left: 10, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        interval={chartViewMode === "full" ? 3 : 0}
                        tickMargin={10}
                        padding={{ left: 50, right: 25 }}
                      />
                      <YAxis
                        domain={[0, 250]}
                        width={50}
                        tickMargin={10}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <Tooltip
                        formatter={(v: any, name: any) => {
                          if (typeof name === "string" && name.includes("Tren")) {
                            return [`${v !== null ? v + " Ton" : "-"}`, name];
                          }
                          return [`${v !== null ? v + " Ton" : "-"}`, "Payload Actual"];
                        }}
                      />
                      <ReferenceLine y={205.0} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 205 T", fill: "#e95623", fontSize: 9, position: "right" }} />
                      <Line
                        type="monotone"
                        dataKey="payloadActual"
                        name="Payload Actual"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#4f46e5" }}
                        connectNulls={false}
                      >
                        {chartViewMode === "active" && (
                          <LabelList dataKey="payloadActual" position="top" formatter={(v: any) => (v !== null ? `${v}` : "")} style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }} />
                        )}
                      </Line>
                      <Line
                        type="linear"
                        dataKey="payloadTrend"
                        name={`Tren (${weeklyTrends?.payloadTrend.direction === "up" ? "Naik ↗" : weeklyTrends?.payloadTrend.direction === "down" ? "Turun ↘" : "Stabil ↔"})`}
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: Cycle Time */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Clock size={15} />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      Cycle Time (Jam)
                    </span>
                    {weeklyTrends && renderTrendBadge(weeklyTrends.cycleTimeTrend)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="text-violet-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-violet-600" /> Actual
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#e95623]" /> Plan 7.5 Jam
                    </span>
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#0284c7] border-t border-dashed" /> Tren ({weeklyTrends?.cycleTimeTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 15, right: 25, left: 10, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        interval={chartViewMode === "full" ? 3 : 0}
                        tickMargin={10}
                        padding={{ left: 50, right: 25 }}
                      />
                      <YAxis
                        domain={[0, 15]}
                        width={50}
                        tickMargin={10}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v) => `${v} j`}
                      />
                      <Tooltip
                        formatter={(v: any, name: any) => {
                          if (typeof name === "string" && name.includes("Tren")) {
                            return [`${v !== null ? v + " Jam" : "-"}`, name];
                          }
                          return [`${v !== null ? v + " Jam" : "-"}`, "Cycle Time Actual"];
                        }}
                      />
                      <ReferenceLine y={7.5} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 7.5 Jam", fill: "#e95623", fontSize: 9, position: "right" }} />
                      <Line
                        type="monotone"
                        dataKey="cycleTimeActual"
                        name="Cycle Time Actual"
                        stroke="#7c3aed"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#7c3aed" }}
                        connectNulls={false}
                      >
                        {chartViewMode === "active" && (
                          <LabelList dataKey="cycleTimeActual" position="top" formatter={(v: any) => (v !== null ? `${v}` : "")} style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }} />
                        )}
                      </Line>
                      <Line
                        type="linear"
                        dataKey="cycleTimeTrend"
                        name={`Tren (${weeklyTrends?.cycleTimeTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 3: PA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Gauge size={15} />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      PA (Physical Availability)
                    </span>
                    {weeklyTrends && renderTrendBadge(weeklyTrends.paTrend)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="text-blue-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-600" /> PA Actual
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#e95623]" /> Plan 93%
                    </span>
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#0284c7] border-t border-dashed" /> Tren ({weeklyTrends?.paTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 15, right: 25, left: 10, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        interval={chartViewMode === "full" ? 3 : 0}
                        tickMargin={10}
                        padding={{ left: 50, right: 25 }}
                      />
                      <YAxis
                        domain={[0, 110]}
                        width={50}
                        tickMargin={10}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        formatter={(v: any, name: any) => {
                          if (typeof name === "string" && name.includes("Tren")) {
                            return [`${v !== null ? v + "%" : "-"}`, name];
                          }
                          return [`${v !== null ? v + "%" : "-"}`, "PA Actual"];
                        }}
                      />
                      <ReferenceLine y={93.0} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 93%", fill: "#e95623", fontSize: 9, position: "right" }} />
                      <Line
                        type="monotone"
                        dataKey="paActual"
                        name="PA Actual"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#2563eb" }}
                        connectNulls={false}
                      >
                        {chartViewMode === "active" && (
                          <LabelList dataKey="paActual" position="top" formatter={(v: any) => (v !== null ? `${v}%` : "")} style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }} />
                        )}
                      </Line>
                      <Line
                        type="linear"
                        dataKey="paTrend"
                        name={`Tren (${weeklyTrends?.paTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 4: UA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <Clock size={15} />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      UA (Utilisasi Availability)
                    </span>
                    {weeklyTrends && renderTrendBadge(weeklyTrends.uaTrend)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="text-teal-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-teal-600" /> UA Actual
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#e95623]" /> Plan 88%
                    </span>
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#0284c7] border-t border-dashed" /> Tren ({weeklyTrends?.uaTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 15, right: 25, left: 10, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        interval={chartViewMode === "full" ? 3 : 0}
                        tickMargin={10}
                        padding={{ left: 50, right: 25 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        width={50}
                        tickMargin={10}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        formatter={(v: any, name: any) => {
                          if (typeof name === "string" && name.includes("Tren")) {
                            return [`${v !== null ? v + "%" : "-"}`, name];
                          }
                          return [`${v !== null ? v + "%" : "-"}`, "UA Actual"];
                        }}
                      />
                      <ReferenceLine y={88.0} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 88%", fill: "#e95623", fontSize: 9, position: "right" }} />
                      <Line
                        type="monotone"
                        dataKey="uaActual"
                        name="UA Actual"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#0d9488" }}
                        connectNulls={false}
                      >
                        {chartViewMode === "active" && (
                          <LabelList dataKey="uaActual" position="top" formatter={(v: any) => (v !== null ? `${v}%` : "")} style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }} />
                        )}
                      </Line>
                      <Line
                        type="linear"
                        dataKey="uaTrend"
                        name={`Tren (${weeklyTrends?.uaTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 5: Fuel Ratio */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Fuel size={15} />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      Fuel Ratio (L/Ton)
                    </span>
                    {weeklyTrends && renderTrendBadge(weeklyTrends.fuelRatioTrend)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="text-amber-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-600" /> Actual
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#e95623]" /> Plan 1.55
                    </span>
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#0284c7] border-t border-dashed" /> Tren ({weeklyTrends?.fuelRatioTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 15, right: 25, left: 10, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        interval={chartViewMode === "full" ? 3 : 0}
                        tickMargin={10}
                        padding={{ left: 50, right: 25 }}
                      />
                      <YAxis
                        domain={[0, 2.5]}
                        width={50}
                        tickMargin={10}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <Tooltip
                        formatter={(v: any, name: any) => {
                          if (typeof name === "string" && name.includes("Tren")) {
                            return [`${v !== null ? v + " L/Ton" : "-"}`, name];
                          }
                          return [`${v !== null ? v + " L/Ton" : "-"}`, "Fuel Ratio Actual"];
                        }}
                      />
                      <ReferenceLine y={1.55} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 1.55", fill: "#e95623", fontSize: 9, position: "right" }} />
                      <Line
                        type="monotone"
                        dataKey="fuelRatioActual"
                        name="Fuel Ratio Actual"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#d97706" }}
                        connectNulls={false}
                      >
                        {chartViewMode === "active" && (
                          <LabelList dataKey="fuelRatioActual" position="top" formatter={(v: any) => (v !== null ? `${v}` : "")} style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }} />
                        )}
                      </Line>
                      <Line
                        type="linear"
                        dataKey="fuelRatioTrend"
                        name={`Tren (${weeklyTrends?.fuelRatioTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 6: TPD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      <TrendingUp size={15} />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">
                      TPD (Trip Per Day)
                    </span>
                    {weeklyTrends && renderTrendBadge(weeklyTrends.tdpTrend)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold">
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-sky-600" /> Actual
                    </span>
                    <span className="text-orange-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#e95623]" /> Plan 2.7
                    </span>
                    <span className="text-sky-600 flex items-center gap-1">
                      <span className="h-0.5 w-3 bg-[#0284c7] border-t border-dashed" /> Tren ({weeklyTrends?.tdpTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData} margin={{ top: 15, right: 25, left: 10, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        interval={chartViewMode === "full" ? 3 : 0}
                        tickMargin={10}
                        padding={{ left: 50, right: 25 }}
                      />
                      <YAxis
                        domain={[0, 3.5]}
                        width={50}
                        tickMargin={10}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <Tooltip
                        formatter={(v: any, name: any) => {
                          if (typeof name === "string" && name.includes("Tren")) {
                            return [`${v !== null ? v + " Trip" : "-"}`, name];
                          }
                          return [`${v !== null ? v + " Trip" : "-"}`, "TPD Actual"];
                        }}
                      />
                      <ReferenceLine y={2.7} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 2.7", fill: "#e95623", fontSize: 9, position: "right" }} />
                      <Line
                        type="monotone"
                        dataKey="tdpActual"
                        name="TPD Actual"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#0284c7" }}
                        connectNulls={false}
                      >
                        {chartViewMode === "active" && (
                          <LabelList dataKey="tdpActual" position="top" formatter={(v: any) => (v !== null ? `${v}` : "")} style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }} />
                        )}
                      </Line>
                      <Line
                        type="linear"
                        dataKey="tdpTrend"
                        name={`Tren (${weeklyTrends?.tdpTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                        stroke="#0284c7"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Table View */}
          {weeklySubTab === "table" && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                Ringkasan Pencapaian KPI Mingguan (W01–W53)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Rekapitulasi rata-rata KPI mingguan sesuai lembar kerja 'Grafik KPI 2026' dan 'Indikator KPI W30-W53'.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3">Kelompok Minggu</th>
                      <th className="px-3 py-3">Hari Aktif</th>
                      <th className="px-3 py-3">PA Actual</th>
                      <th className="px-3 py-3 text-slate-400">PA Plan</th>
                      <th className="px-3 py-3">UA Actual</th>
                      <th className="px-3 py-3 text-slate-400">UA Plan</th>
                      <th className="px-3 py-3">Payload Actual</th>
                      <th className="px-3 py-3 text-slate-400">Payload Plan</th>
                      <th className="px-3 py-3">Cycle Time Actual</th>
                      <th className="px-3 py-3 text-slate-400">CT Plan</th>
                      <th className="px-3 py-3">Fuel Ratio Actual</th>
                      <th className="px-3 py-3 text-slate-400">FR Plan</th>
                      <th className="px-3 py-3">TDP Actual</th>
                      <th className="px-3 py-3 text-slate-400">TDP Plan</th>
                      <th className="px-4 py-3 text-right">Produksi Actual (Ton)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {stats.weeklyKpis.map((w) => {
                      const isPaOk = w.paActual >= w.paTarget;
                      const isUaOk = w.uaActual >= w.uaTarget;

                      return (
                        <tr key={w.weekNumber} className="hover:bg-slate-50/80">
                          <td className="px-3 py-3 font-extrabold text-slate-900">
                            {w.weekNumber}
                          </td>
                          <td className="px-3 py-3 text-slate-500">{w.daysCount} Hari</td>
                          <td className="px-3 py-3">
                            <span className={`font-bold ${isPaOk ? "text-emerald-600" : "text-amber-600"}`}>
                              {(w.paActual * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-400">{(w.paTarget * 100).toFixed(1)}%</td>
                          <td className="px-3 py-3">
                            <span className={`font-bold ${isUaOk ? "text-emerald-600" : "text-amber-600"}`}>
                              {(w.uaActual * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-400">{(w.uaTarget * 100).toFixed(1)}%</td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{w.payloadActual.toFixed(1)}</td>
                          <td className="px-3 py-3 text-slate-400">{w.payloadTarget}</td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{w.cycleTimeActual.toFixed(1)}</td>
                          <td className="px-3 py-3 text-slate-400">{w.cycleTimeTarget}</td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{w.fuelRatioActual.toFixed(2)}</td>
                          <td className="px-3 py-3 text-slate-400">{w.fuelRatioTarget}</td>
                          <td className="px-3 py-3 font-semibold text-slate-800">{w.tdpActual.toFixed(2)}</td>
                          <td className="px-3 py-3 text-slate-400">{w.tdpTarget}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {w.productionActual.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Tab 3: Standalone UA Calculator */}
      {activeTab === "calculator" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#e95623] to-[#f97316] text-white shadow-md">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Kalkulator UA (Use of Availability)
              </h2>
              <p className="text-xs text-slate-500">
                Hitung estimasi pencapaian UA berdasarkan waktu kalender, planned delay, PA, dan plan trip
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Waktu Kalender (Jam)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={calcCalHours}
                onChange={(e) => setCalcCalHours(parseFloat(e.target.value) || 24)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Planned Delay (Jam)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={calcDelay}
                onChange={(e) => setCalcDelay(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400">Istirahat, refuel, change shift, cooling tyre</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Physical Availability (PA %)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={calcPa}
                onChange={(e) => setCalcPa(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan Trip per Hari
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={calcTargetTrip}
                onChange={(e) => setCalcTargetTrip(parseFloat(e.target.value) || 3.0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trip Aktual per Hari (TDP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={calcActualTrip}
                onChange={(e) => setCalcActualTrip(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              />
            </div>
          </div>

          {/* Results Showcase */}
          <div className="p-6 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 block">
                  Hasil Perhitungan UA Aktual
                </span>
                <span className="text-xs text-slate-300">
                  Target Standar KPI: 88.0%
                </span>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-[#18bebc]">
                  {inPageCalcResult.uaActualPercent}%
                </span>
                <span className="block text-xs text-slate-400">
                  Desimal: {inPageCalcResult.uaActual}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block">UA Potensial</span>
                <span className="text-base font-bold text-white">{inPageCalcResult.uaPotentialPercent}%</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block">Pencapaian Trip</span>
                <span className="text-base font-bold text-white">{inPageCalcResult.tripAchievementPercent}%</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block">Waktu Kerja Ekuivalen</span>
                <span className="text-base font-bold text-white">{inPageCalcResult.equivalentWorkingHours} Jam</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 block">Lost Time Operasional</span>
                <span className="text-base font-bold text-white">{inPageCalcResult.lostTimeOperational} Jam</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input / Edit Modal */}
      <InputProductionModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setEditingRecord(null);
        }}
        onSaved={() => fetchData()}
        editData={editingRecord}
        defaultSite={selectedSite === "all" ? "MuaraPahu" : selectedSite}
      />

      {/* UA Calculator Modal */}
      <UACalculatorModal
        isOpen={isUaModalOpen}
        onClose={() => setIsUaModalOpen(false)}
      />

      {/* Upload Excel Modal */}
      <UploadProductionExcelModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchData()}
        defaultSite={selectedSite === "all" ? "MuaraPahu" : selectedSite}
      />
    </div>
  );
};
