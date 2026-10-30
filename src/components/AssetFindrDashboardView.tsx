"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  assetfindrService,
  DailyProductionItem,
  DailyProductionResponse,
} from "../services/assetfindrService";
import { AssetFindrTokenModal } from "./AssetFindrTokenModal";
import { useNotification } from "../context/NotificationContext";
import {
  Scale,
  Truck,
  Layers,
  Calendar,
  RefreshCw,
  Key,
  Sun,
  Moon,
  TrendingUp,
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Zap,
  MapPin,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

interface AssetFindrDashboardViewProps {
  user: User;
  onNavigateToData?: () => void;
}

export const AssetFindrDashboardView: React.FC<AssetFindrDashboardViewProps> = ({
  user,
  onNavigateToData,
}) => {
  const { showSuccess, showError } = useNotification();

  // Date Range Defaults: Tanggal 01 bulan ini s/d hari ini
  const today = useMemo(() => new Date(), []);
  const defaultYear = today.getFullYear();
  const defaultMonth = String(today.getMonth() + 1).padStart(2, "0");
  const defaultDate = String(today.getDate()).padStart(2, "0");

  const [startDate, setStartDate] = useState<string>(`${defaultYear}-${defaultMonth}-01`);
  const [endDate, setEndDate] = useState<string>(`${defaultYear}-${defaultMonth}-${defaultDate}`);

  // Jobsite Filter: 'all' | 'senyiur' | 'muara_pahu'
  const [selectedJobsite, setSelectedJobsite] = useState<"all" | "senyiur" | "muara_pahu">("all");

  // Data States
  const [dailyData, setDailyData] = useState<DailyProductionItem[]>([]);
  const [summary, setSummary] = useState<DailyProductionResponse["summary"] | null>(null);
  const [period, setPeriod] = useState<DailyProductionResponse["period"] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

  // Today Date String
  const todayStr = `${defaultYear}-${defaultMonth}-${defaultDate}`;

  // View Options
  const [chartType, setChartType] = useState<"stacked" | "grouped">("stacked");
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [showTotalLine, setShowTotalLine] = useState<boolean>(true);
  const [showBarLabels, setShowBarLabels] = useState<boolean>(true);

  // Load Daily Production Data
  const loadDailyProduction = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await assetfindrService.getDailyProduction(startDate, endDate, selectedJobsite);
      setDailyData(res.data || []);
      setSummary(res.summary || null);
      setPeriod(res.period || null);
      setIsLive(res.isLive);
    } catch (err: any) {
      console.error("Gagal memuat produksi harian:", err);
      showError(err.message || "Gagal memuat data produksi harian dari AssetFindr");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedJobsite, showError]);

  useEffect(() => {
    loadDailyProduction();
  }, [loadDailyProduction]);

  // Format number to Indonesian locale
  const formatNum = (val?: number, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return val.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Chart Data preparation with Trend Line and Total Tonase
  const chartData = useMemo(() => {
    const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

    // Hari operasional yang sudah selesai (strictly < todayStr & totalTonase > 0)
    // Sesuai permintaan: Garis trend berhenti di 1 hari sebelum hari ini (H-1)
    const completedItems = sorted.filter(
      (item) => item.date < todayStr && item.totalTonase > 0
    );
    const n = completedItems.length;

    let slope = 0;
    let intercept = 0;

    if (n >= 2) {
      const sumX = completedItems.reduce((acc, _, idx) => acc + idx, 0);
      const sumY = completedItems.reduce((acc, item) => acc + item.totalTonase, 0);
      const avgX = sumX / n;
      const avgY = sumY / n;

      let numerator = 0;
      let denominator = 0;
      completedItems.forEach((item, idx) => {
        const xDiff = idx - avgX;
        const yDiff = item.totalTonase - avgY;
        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
      });

      if (denominator !== 0) {
        slope = numerator / denominator;
        intercept = avgY - slope * avgX;
      }
    }

    return sorted.map((item) => {
      const isBeforeToday = item.date < todayStr;
      const isToday = item.date === todayStr;

      let trendValue: number | null = null;
      let totalCompleted: number | null = null;

      // Garis tren regresi & garis total berhenti tepat 1 hari sebelum hari ini (H-1)
      if (isBeforeToday && item.totalTonase > 0) {
        const completedIdx = completedItems.findIndex((ci) => ci.date === item.date);
        if (completedIdx !== -1 && n >= 2) {
          trendValue = Math.round(slope * completedIdx + intercept);
        }
        totalCompleted = item.totalTonase;
      }

      // Format label ringkas total tonase di atas setiap bar (misal: "15.5k", "35.0k", "8.4k")
      let totalTonaseLabel = "";
      if (item.totalTonase > 0) {
        totalTonaseLabel =
          item.totalTonase >= 1000
            ? `${(item.totalTonase / 1000).toFixed(1)}k`
            : `${Math.round(item.totalTonase)}`;
      }

      return {
        ...item,
        label: `${String(item.day).padStart(2, "0")}`,
        fullLabel: item.displayDate,
        isToday,
        isBeforeToday,
        // Garis tren linear berhenti di H-1 (null untuk hari ini)
        trendLine: trendValue,
        // Garis total harian berhenti di H-1 (null untuk hari ini)
        totalTonaseCompleted: totalCompleted,
        totalTonaseLabel,
      };
    });
  }, [dailyData, todayStr]);

  // Export CSV
  const handleExportCSV = () => {
    if (!dailyData || dailyData.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }

    const headers = [
      "Tanggal",
      "Hari",
      "Tonase DS (Ton)",
      "Ritase DS",
      "Tonase NS (Ton)",
      "Ritase NS",
      "Total Tonase (Ton)",
      "Total Ritase",
      "Rata-rata Payload (Ton/Rit)",
    ];

    const csvRows = [headers.join(",")];
    dailyData.forEach((row) => {
      csvRows.push(
        [
          `"${row.date}"`,
          `"${row.dayName}"`,
          row.tonaseDS,
          row.ritaseDS,
          row.tonaseNS,
          row.ritaseNS,
          row.totalTonase,
          row.totalRitase,
          row.avgPayloadTotal,
        ].join(",")
      );
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Produksi_Harian_Batara_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Data berhasil diekspor ke CSV!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-orange-100/60 via-amber-50/30 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
                <Scale size={11} />
                AssetFindr Weighbridge
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white flex items-center gap-1.5">
                <Truck size={11} />
                Coal Hauling
              </span>
              {isLive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live API Terhubung
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Mode Simulasi
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Produksi Harian Batara
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
              Rekapitulasi produksi hauling per hari dari tanggal 01 hingga hari ini dengan rincian tonase
              operasional <span className="font-bold text-amber-600">Day Shift (DS)</span> dan{" "}
              <span className="font-bold text-indigo-600">Night Shift (NS)</span>.
            </p>
          </div>

          {/* Action Buttons & Date Preset */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold shadow-2xs hover:shadow transition-all cursor-pointer"
            >
              <Key size={14} className="text-[#e95623]" />
              <span>Pengaturan Token</span>
            </button>

            {onNavigateToData && (
              <button
                onClick={onNavigateToData}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold shadow-2xs hover:shadow transition-all cursor-pointer"
              >
                <span>Lihat Data Tiket</span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              onClick={loadDailyProduction}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#e95623] hover:bg-[#d0491d] text-white text-xs font-black shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span>{isLoading ? "Memuat..." : "Segarkan"}</span>
            </button>
          </div>
        </div>

        {/* Filter Section: Jobsite & Periode */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
          {/* Jobsite Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-xs mr-1">
                <MapPin size={15} className="text-[#e95623]" />
                Pilih Jobsite:
              </span>

              <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedJobsite("all")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedJobsite === "all"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Semua Jobsite</span>
                  {selectedJobsite === "all" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedJobsite("senyiur")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedJobsite === "senyiur"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selectedJobsite === "senyiur" ? "bg-white" : "bg-emerald-500"}`} />
                  <span>Jobsite Senyiur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedJobsite("muara_pahu")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedJobsite === "muara_pahu"
                      ? "bg-[#e95623] text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-orange-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selectedJobsite === "muara_pahu" ? "bg-white" : "bg-orange-500"}`} />
                  <span>Jobsite Muara Pahu</span>
                </button>
              </div>
            </div>

            {/* Current Active Jobsite Badge Indicator */}
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Filter Jobsite: </span>
              <span className="font-extrabold text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                {selectedJobsite === "all"
                  ? "Semua Jobsite (Senyiur & Muara Pahu)"
                  : selectedJobsite === "senyiur"
                  ? "Jobsite Senyiur"
                  : "Jobsite Muara Pahu"}
              </span>
            </div>
          </div>

          {/* Date Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Calendar size={14} className="text-slate-500" />
                Periode:
              </span>

              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-[11px] font-bold text-slate-500">Mulai:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <span className="text-slate-400 font-bold">s/d</span>

                <div className="flex items-center gap-1.5 px-2">
                  <span className="text-[11px] font-bold text-slate-500">Sampai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStartDate(`${defaultYear}-${defaultMonth}-01`);
                  setEndDate(`${defaultYear}-${defaultMonth}-${defaultDate}`);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-[#e95623] border border-orange-200 transition-colors cursor-pointer"
              >
                Reset ke 01 s/d Hari Ini
              </button>
            </div>

            {period && (
              <div className="text-xs text-slate-500 font-medium">
                Menampilkan <strong>{period.total_days} hari</strong> ({period.active_days} hari operasional aktif)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notice when Jobsite Senyiur is selected */}
      {selectedJobsite === "senyiur" && (
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <span className="font-extrabold block">Informasi Operasional Site Senyiur</span>
            <span className="text-amber-800/90 font-medium">
              Tidak ada aktivitas operasional hauling batubara di Jobsite Senyiur pada periode bulan ini (Produksi 0 Ton). Seluruh aktivitas operasional berjalan aktif di Site Muara Pahu.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards: DS, NS, and Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Grand Total Tonase */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Scale size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Month-to-Date
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Total Tonase Produksi
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatNum(summary?.grandTotalTonase, 2)}{" "}
              <span className="text-sm font-bold text-slate-500">Ton</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Ritase:</span>
            <strong className="text-slate-900 font-extrabold">
              {summary?.grandTotalRitase?.toLocaleString("id-ID") || 0} Rit
            </strong>
          </div>
        </div>

        {/* Card 2: Day Shift (DS) - Orange Theme */}
        <div className="bg-linear-to-br from-amber-50/70 via-orange-50/40 to-white rounded-3xl p-5 border border-amber-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 to-[#e95623] text-white flex items-center justify-center shadow-xs shadow-orange-500/20">
              <Sun size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              Day Shift (DS)
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-black text-amber-800 block uppercase tracking-wider">
              Tonase Day Shift (DS)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
              {formatNum(summary?.totalTonaseDS, 2)}{" "}
              <span className="text-sm font-bold text-amber-700">Ton</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Ritase DS:</span>
            <strong className="font-extrabold">
              {summary?.totalRitaseDS?.toLocaleString("id-ID") || 0} Rit{" "}
              <span className="text-[11px] font-normal text-amber-700">
                ({summary && summary.grandTotalTonase > 0 ? Math.round((summary.totalTonaseDS / summary.grandTotalTonase) * 100) : 0}%)
              </span>
            </strong>
          </div>
        </div>

        {/* Card 3: Night Shift (NS) - Indigo Theme */}
        <div className="bg-linear-to-br from-indigo-50/70 via-slate-50/40 to-white rounded-3xl p-5 border border-indigo-200/80 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-600 to-slate-900 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
              <Moon size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
              Night Shift (NS)
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-black text-indigo-800 block uppercase tracking-wider">
              Tonase Night Shift (NS)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
              {formatNum(summary?.totalTonaseNS, 2)}{" "}
              <span className="text-sm font-bold text-indigo-700">Ton</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-indigo-200/50 flex items-center justify-between text-xs font-semibold text-indigo-900">
            <span>Ritase NS:</span>
            <strong className="font-extrabold">
              {summary?.totalRitaseNS?.toLocaleString("id-ID") || 0} Rit{" "}
              <span className="text-[11px] font-normal text-indigo-700">
                ({summary && summary.grandTotalTonase > 0 ? Math.round((summary.totalTonaseNS / summary.grandTotalTonase) * 100) : 0}%)
              </span>
            </strong>
          </div>
        </div>

        {/* Card 4: Daily Average & Payload */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Rata-rata
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Rata-rata Tonase / Hari
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatNum(summary?.avgTonasePerDay, 2)}{" "}
              <span className="text-sm font-bold text-slate-500">Ton/Hari</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Rata-rata Muatan:</span>
            <strong className="text-emerald-700 font-extrabold">
              {formatNum(summary?.avgPayloadOverall, 1)} Ton/Rit
            </strong>
          </div>
        </div>
      </div>

      {/* Chart Section: Produksi Harian DS & NS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-[#e95623]" />
              Grafik Produksi Harian per Shift (Tanggal 01 s/d Hari Ini)
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan kontribusi Day Shift (DS), Night Shift (NS), Total Harian, serta Garis Tren produksi (berhenti H-1)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Stacked / Grouped */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setChartType("stacked")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === "stacked"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Bertumpuk
              </button>
              <button
                onClick={() => setChartType("grouped")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === "grouped"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Berdampingan
              </button>
            </div>

            {/* Toggle Garis Tren Regresi */}
            <button
              onClick={() => setShowTrendLine(!showTrendLine)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showTrendLine
                  ? "bg-sky-50 text-sky-800 border-sky-300 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan Garis Tren Regresi (berhenti di H-1)"
            >
              <TrendingUp size={13} className={showTrendLine ? "text-sky-600" : "text-slate-400"} />
              <span>Garis Tren</span>
            </button>

            {/* Toggle Garis Total Harian */}
            <button
              onClick={() => setShowTotalLine(!showTotalLine)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showTotalLine
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan Garis Total Harian (berhenti di H-1)"
            >
              <Layers size={13} className={showTotalLine ? "text-emerald-600" : "text-slate-400"} />
              <span>Garis Total</span>
            </button>

            {/* Toggle Label Angka Total di Bar */}
            <button
              onClick={() => setShowBarLabels(!showBarLabels)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showBarLabels
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan angka total di atas setiap batang grafik"
            >
              <span>Label Angka</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs ml-auto sm:ml-0"
              title="Download Data CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-88 sm:h-96 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
              <RefreshCw size={18} className="animate-spin text-[#e95623]" />
              <span>Memuat grafik produksi harian...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Tidak ada data produksi pada rentang tanggal yang dipilih.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 25, right: 15, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.ceil((dataMax || 1000) * 1.15)]}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as any;
                      const isToday = data.isToday;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-2 border border-slate-800 min-w-56">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-extrabold text-slate-200">
                              {data.fullLabel} ({data.dayName})
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white animate-pulse">
                                Hari Ini
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {/* Day Shift */}
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Day Shift (DS):
                              </span>
                              <strong className="font-mono">{formatNum(data.tonaseDS, 2)} Ton</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-3.5 flex justify-between">
                              <span>{data.ritaseDS} Rit</span>
                              {data.avgPayloadDS > 0 && <span>{data.avgPayloadDS} T/rit</span>}
                            </div>

                            {/* Night Shift */}
                            <div className="flex items-center justify-between gap-4 pt-1">
                              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                Night Shift (NS):
                              </span>
                              <strong className="font-mono">{formatNum(data.tonaseNS, 2)} Ton</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-3.5 flex justify-between">
                              <span>{data.ritaseNS} Rit</span>
                              {data.avgPayloadNS > 0 && <span>{data.avgPayloadNS} T/rit</span>}
                            </div>

                            {/* Total Harian */}
                            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 text-emerald-400 font-extrabold">
                              <span>Total Harian:</span>
                              <span className="font-mono text-sm">{formatNum(data.totalTonase, 2)} Ton</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-1 flex justify-between">
                              <span>Total Ritase: {data.totalRitase} Rit</span>
                              {data.avgPayloadTotal > 0 && <span>{data.avgPayloadTotal} T/rit</span>}
                            </div>

                            {/* Garis Tren Regresi info */}
                            {data.trendLine !== null && data.trendLine !== undefined && (
                              <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between gap-4 text-sky-400 text-[11px] font-semibold">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-0.5 bg-sky-400" />
                                  Garis Tren:
                                </span>
                                <span className="font-mono">{formatNum(data.trendLine, 0)} Ton</span>
                              </div>
                            )}

                            {/* Catatan jika hari ini */}
                            {isToday && (
                              <div className="text-[10px] text-amber-300/90 bg-amber-950/40 p-2 rounded-lg border border-amber-800/50 mt-1 leading-snug">
                                * Garis tren berhenti di H-1 (kemarin) karena operasional hari ini masih berjalan.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                />

                {/* Bar Day Shift (DS) */}
                <Bar
                  name="Day Shift (DS)"
                  dataKey="tonaseDS"
                  fill="#f97316"
                  stackId={chartType === "stacked" ? "a" : undefined}
                  radius={chartType === "stacked" ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />

                {/* Bar Night Shift (NS) */}
                <Bar
                  name="Night Shift (NS)"
                  dataKey="tonaseNS"
                  fill="#6366f1"
                  stackId={chartType === "stacked" ? "a" : undefined}
                  radius={[6, 6, 0, 0]}
                />

                {/* Line Total Harian (Berhenti di H-1) */}
                {showTotalLine && (
                  <Line
                    name="Total Harian (s/d Kemarin)"
                    dataKey="totalTonaseCompleted"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 1.5, stroke: "#ffffff" }}
                    activeDot={{ r: 5, fill: "#10b981" }}
                    connectNulls={false}
                  />
                )}

                {/* Line Garis Tren Regresi Linier (Berhenti di H-1) */}
                {showTrendLine && (
                  <Line
                    name="Garis Tren (s/d Kemarin)"
                    dataKey="trendLine"
                    type="linear"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5, fill: "#0284c7" }}
                    connectNulls={false}
                  />
                )}

                {/* Label Total di Atas Setiap Bar */}
                {showBarLabels && (
                  <Line
                    dataKey="totalTonase"
                    stroke="none"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                    isAnimationActive={false}
                    tooltipType="none"
                  >
                    <LabelList
                      dataKey="totalTonaseLabel"
                      position="top"
                      offset={8}
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 800,
                        fill: "#475569",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                  </Line>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>



      {/* AssetFindr Token Modal */}
      <AssetFindrTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onTokenUpdated={loadDailyProduction}
      />
    </div>
  );
};
