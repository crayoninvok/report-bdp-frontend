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
  SlidersHorizontal,
  FileSpreadsheet,
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

  // View Options
  const [chartType, setChartType] = useState<"stacked" | "grouped">("stacked");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchDate, setSearchDate] = useState<string>("");

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

  // Filtered & Sorted Daily List for Table
  const tableRows = useMemo(() => {
    let list = [...dailyData];
    if (searchDate.trim()) {
      const q = searchDate.toLowerCase();
      list = list.filter(
        (item) =>
          item.date.includes(q) ||
          item.displayDate.toLowerCase().includes(q) ||
          item.dayName.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      return sortOrder === "desc"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });
    return list;
  }, [dailyData, searchDate, sortOrder]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    return [...dailyData].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
      ...item,
      label: `${String(item.day).padStart(2, "0")}`,
      fullLabel: item.displayDate,
    }));
  }, [dailyData]);

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

  // Today Date String
  const todayStr = `${defaultYear}-${defaultMonth}-${defaultDate}`;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-[#e95623]" />
              Grafik Produksi Harian per Shift (Tanggal 01 s/d Hari Ini)
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan kontribusi tonase antara Day Shift (DS) dan Night Shift (NS) setiap hari
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType("stacked")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartType === "stacked"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Bertumpuk (Stacked)
            </button>
            <button
              onClick={() => setChartType("grouped")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartType === "grouped"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Berdampingan (Grouped)
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-80 w-full pt-2">
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
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
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
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DailyProductionItem & { fullLabel: string };
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-2 border border-slate-800">
                          <p className="font-bold border-b border-slate-800 pb-1 text-slate-300">
                            {data.fullLabel} ({data.dayName})
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Day Shift (DS):
                              </span>
                              <strong>{formatNum(data.tonaseDS, 2)} Ton</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-3.5">
                              Ritase: {data.ritaseDS} Rit &bull; {data.avgPayloadDS} T/rit
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-1">
                              <span className="flex items-center gap-1.5 text-indigo-400">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                Night Shift (NS):
                              </span>
                              <strong>{formatNum(data.tonaseNS, 2)} Ton</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-3.5">
                              Ritase: {data.ritaseNS} Rit &bull; {data.avgPayloadNS} T/rit
                            </div>

                            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 text-emerald-400 font-extrabold">
                              <span>Total Harian:</span>
                              <span>{formatNum(data.totalTonase, 2)} Ton</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-1">
                              Total Ritase: {data.totalRitase} Rit
                            </div>
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
                  wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                />
                <Bar
                  name="Day Shift (DS)"
                  dataKey="tonaseDS"
                  fill="#f97316"
                  stackId={chartType === "stacked" ? "a" : undefined}
                  radius={chartType === "stacked" ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />
                <Bar
                  name="Night Shift (NS)"
                  dataKey="tonaseNS"
                  fill="#6366f1"
                  stackId={chartType === "stacked" ? "a" : undefined}
                  radius={[6, 6, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Table: Produksi Harian Tanggal 01 Hingga Hari Ini (DS & NS) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-[#e95623]" />
                Tabel Produksi Harian (Tanggal 01 s/d Hari Ini)
              </h2>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  selectedJobsite === "senyiur"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : selectedJobsite === "muara_pahu"
                    ? "bg-orange-100 text-orange-800 border border-orange-300"
                    : "bg-slate-200/80 text-slate-800 border border-slate-300"
                }`}
              >
                {selectedJobsite === "all"
                  ? "Semua Jobsite"
                  : selectedJobsite === "senyiur"
                  ? "Jobsite Senyiur"
                  : "Jobsite Muara Pahu"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian angka tonase Day Shift (DS) dan Night Shift (NS) setiap hari operasional
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              placeholder="Cari tanggal atau hari..."
              className="px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 w-44 sm:w-52"
            />

            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal size={13} />
              <span>{sortOrder === "desc" ? "Terbaru &rarr; Terlama" : "Terlama &rarr; Terbaru"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 min-w-[150px]">Tanggal & Hari</th>
                {/* DS Header with Amber Accent */}
                <th className="py-3.5 px-4 min-w-[180px] bg-amber-100/90 text-amber-950 border-x border-amber-200 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Sun size={14} className="text-amber-600" />
                    <span>Day Shift (DS)</span>
                  </div>
                </th>
                {/* NS Header with Indigo Accent */}
                <th className="py-3.5 px-4 min-w-[180px] bg-indigo-100/90 text-indigo-950 border-r border-indigo-200 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Moon size={14} className="text-indigo-600" />
                    <span>Night Shift (NS)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[150px] text-right font-black">Total Tonase</th>
                <th className="py-3.5 px-4 w-28 text-center">Total Rit</th>
                <th className="py-3.5 px-4 min-w-[130px] text-center">Rasio Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#e95623]" />
                      <span>Sedang memuat data harian...</span>
                    </div>
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada data produksi yang cocok.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, idx) => {
                  const isToday = row.date === todayStr;
                  const dsPercent =
                    row.totalTonase > 0 ? Math.round((row.tonaseDS / row.totalTonase) * 100) : 0;
                  const nsPercent =
                    row.totalTonase > 0 ? Math.round((row.tonaseNS / row.totalTonase) * 100) : 0;

                  return (
                    <tr
                      key={row.date}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isToday ? "bg-orange-50/30 font-semibold" : ""
                      }`}
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* Date & Day */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-extrabold text-slate-900 block text-xs">
                              {row.displayDate}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {row.date}
                            </span>
                          </div>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white animate-pulse">
                              Hari Ini
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Day Shift (DS) Column - Amber/Orange Accent */}
                      <td className="py-3.5 px-4 text-right bg-amber-50/50 border-x border-amber-100/80">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-amber-950 block">
                            {formatNum(row.tonaseDS, 2)}{" "}
                            <span className="text-[10px] font-bold text-amber-700">Ton</span>
                          </span>
                          <span className="text-[11px] text-amber-800 font-semibold flex items-center justify-end gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-amber-200/60 text-[10px] font-bold">
                              {row.ritaseDS} Rit
                            </span>
                            {row.avgPayloadDS > 0 && (
                              <span className="text-[10px] opacity-75 font-mono">
                                ({row.avgPayloadDS} T/rit)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Night Shift (NS) Column - Indigo Accent */}
                      <td className="py-3.5 px-4 text-right bg-indigo-50/50 border-r border-indigo-100/80">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-indigo-950 block">
                            {formatNum(row.tonaseNS, 2)}{" "}
                            <span className="text-[10px] font-bold text-indigo-700">Ton</span>
                          </span>
                          <span className="text-[11px] text-indigo-800 font-semibold flex items-center justify-end gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-200/60 text-[10px] font-bold">
                              {row.ritaseNS} Rit
                            </span>
                            {row.avgPayloadNS > 0 && (
                              <span className="text-[10px] opacity-75 font-mono">
                                ({row.avgPayloadNS} T/rit)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Total Tonase */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {formatNum(row.totalTonase, 2)}{" "}
                          <span className="text-[10px] font-bold text-slate-500">Ton</span>
                        </span>
                        {row.avgPayloadTotal > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Rata-rata: {row.avgPayloadTotal} T/rit
                          </span>
                        )}
                      </td>

                      {/* Total Ritase */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-[11px]">
                          {row.totalRitase} Rit
                        </span>
                      </td>

                      {/* Shift Ratio Progress Bar */}
                      <td className="py-3.5 px-4 text-center">
                        {row.totalTonase > 0 ? (
                          <div className="space-y-1">
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                              <div
                                style={{ width: `${dsPercent}%` }}
                                className="bg-amber-500 h-full transition-all"
                                title={`DS: ${dsPercent}%`}
                              />
                              <div
                                style={{ width: `${nsPercent}%` }}
                                className="bg-indigo-600 h-full transition-all"
                                title={`NS: ${nsPercent}%`}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400">
                              <span className="text-amber-600">{dsPercent}% DS</span>
                              <span className="text-indigo-600">{nsPercent}% NS</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">0%</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Total Akumulasi MTD */}
            {summary && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                  <td colSpan={2} className="py-4 px-4 uppercase tracking-wider text-slate-200">
                    TOTAL AKUMULASI (01 s/d Hari Ini)
                  </td>
                  {/* DS Total */}
                  <td className="py-4 px-4 text-right bg-amber-500/20 text-amber-300 border-x border-slate-700">
                    <span className="block text-sm font-black text-amber-200">
                      {formatNum(summary.totalTonaseDS, 2)} Ton
                    </span>
                    <span className="text-[10px] text-amber-300/80 font-normal">
                      {summary.totalRitaseDS.toLocaleString("id-ID")} Rit
                    </span>
                  </td>
                  {/* NS Total */}
                  <td className="py-4 px-4 text-right bg-indigo-500/20 text-indigo-300 border-r border-slate-700">
                    <span className="block text-sm font-black text-indigo-200">
                      {formatNum(summary.totalTonaseNS, 2)} Ton
                    </span>
                    <span className="text-[10px] text-indigo-300/80 font-normal">
                      {summary.totalRitaseNS.toLocaleString("id-ID")} Rit
                    </span>
                  </td>
                  {/* Grand Total */}
                  <td className="py-4 px-4 text-right text-emerald-400">
                    <span className="block text-sm font-black">
                      {formatNum(summary.grandTotalTonase, 2)} Ton
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {summary.avgPayloadOverall} T/rit
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-white">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-white font-black">
                      {summary.grandTotalRitase.toLocaleString("id-ID")} Rit
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-slate-400 text-[10px]">
                    MTD Summary
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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
