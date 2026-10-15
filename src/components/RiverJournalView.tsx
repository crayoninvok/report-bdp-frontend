"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, JobSite } from "../types/auth";
import {
  RiverJournalEntry,
  RiverJournalStats,
  CreateRiverJournalPayload,
} from "../types/riverJournal";
import { riverJournalService } from "../services/riverJournalService";
import { InputRiverJournalModal } from "./InputRiverJournalModal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Waves,
  Ship,
  Plus,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface RiverJournalViewProps {
  user: User;
}

export const RiverJournalView: React.FC<RiverJournalViewProps> = ({ user }) => {
  const { showSuccess, showError, confirm } = useNotification();

  const [activeSiteTab, setActiveSiteTab] = useState<"all" | "Senyiur" | "MuaraPahu">("all");
  const [entries, setEntries] = useState<RiverJournalEntry[]>([]);
  const [stats, setStats] = useState<RiverJournalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "surut" | "aman">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "7d" | "14d" | "30d">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const siteFilter = activeSiteTab === "all" ? undefined : activeSiteTab;
      const [fetchedEntries, fetchedStats] = await Promise.all([
        riverJournalService.getJournals({ site: siteFilter }),
        riverJournalService.getStats(siteFilter),
      ]);
      setEntries(fetchedEntries);
      setStats(fetchedStats);
    } catch (e: any) {
      console.error("Gagal memuat River Journal:", e);
      showError("Gagal memuat data River Journal.");
    } finally {
      setIsLoading(false);
    }
  }, [activeSiteTab, showError]);

  useEffect(() => {
    loadData();
    setCurrentPage(1);
  }, [loadData]);

  // Handle Input submission
  const handleCreateEntry = async (payload: CreateRiverJournalPayload) => {
    try {
      const created = await riverJournalService.createEntry(payload);
      showSuccess(
        `Berhasil mencatat kedalaman air ${created.waterDepth}m di ${created.location}`,
        "Data Jurnal Disimpan"
      );
      loadData();
    } catch (e: any) {
      throw new Error(e.message || "Gagal menyimpan jurnal sungai");
    }
  };

  // Handle delete
  const handleDeleteEntry = (id: string, location: string, date: string) => {
    confirm({
      title: "Hapus Catatan Jurnal Sungai",
      message: `Apakah Anda yakin ingin menghapus data pengukuran ${location} tanggal ${date}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger",
      onConfirm: async () => {
        try {
          await riverJournalService.deleteEntry(id);
          showSuccess("Data catatan pengukuran berhasil dihapus.");
          loadData();
        } catch {
          showError("Gagal menghapus data.");
        }
      },
    });
  };

  // Sync with Google Sheets live
  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      // Re-fetch from service
      await loadData();
      showSuccess(
        "Sinkronisasi data Google Sheets berhasil diperbarui!",
        "Tersinkronisasi"
      );
    } catch {
      showError("Gagal menyinkronkan data Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Tanggal",
      "Waktu Input",
      "Lokasi Pengukuran",
      "Kedalaman Air Sungai (m)",
      "Batas Minimum Kedalaman (m)",
      "Deskripsi Otomatis",
      "User Input",
      "Kesimpulan Data",
    ];

    const rows = filteredEntries.map((item) => [
      item.externalId || item.id,
      item.date,
      item.inputTime,
      `"${item.location}"`,
      item.waterDepth,
      item.minThreshold,
      `"${item.autoDescription}"`,
      `"${item.userInput}"`,
      `"${item.conclusion}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `River_Journal_Tabang_${activeSiteTab}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered & Sorted Entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Status filter
    if (statusFilter === "surut") {
      result = result.filter((e) => e.autoDescription.toLowerCase().includes("surut"));
    } else if (statusFilter === "aman") {
      result = result.filter((e) => e.autoDescription.toLowerCase().includes("aman"));
    }

    // Date range filter
    if (dateRangeFilter !== "all") {
      const days = dateRangeFilter === "7d" ? 7 : dateRangeFilter === "14d" ? 14 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      result = result.filter((e) => e.date >= cutoffStr);
    }

    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.location.toLowerCase().includes(q) ||
          e.userInput.toLowerCase().includes(q) ||
          e.conclusion.toLowerCase().includes(q) ||
          e.date.includes(q)
      );
    }

    return result;
  }, [entries, statusFilter, dateRangeFilter, searchQuery]);

  // Paginated Entries
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;

  // Chart Data: chronologically ascending
  const chartData = useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.inputTime.localeCompare(b.inputTime);
    });

    return sorted.map((e) => {
      const formattedDate = new Date(e.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      return {
        id: e.id,
        rawDate: e.date,
        label: `${formattedDate} ${e.inputTime}`,
        shortDate: formattedDate,
        time: e.inputTime,
        location: e.location,
        site: e.site,
        depth: e.waterDepth,
        threshold: e.minThreshold,
        status: e.autoDescription,
        userInput: e.userInput,
        conclusion: e.conclusion,
        isSafe: e.waterDepth >= e.minThreshold,
      };
    });
  }, [filteredEntries]);

  // Multi-Site Comparison Chart Data
  const comparativeChartData = useMemo(() => {
    if (activeSiteTab !== "all") return null;

    // Group dates and extract latest reading per date for Senyiur & Muara Pahu
    const dateMap = new Map<string, { senyiur?: number; muaraPahu?: number }>();

    [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => {
        const item = dateMap.get(e.date) || {};
        if (e.site === "Senyiur") {
          item.senyiur = e.waterDepth;
        } else if (e.site === "MuaraPahu") {
          item.muaraPahu = e.waterDepth;
        }
        dateMap.set(e.date, item);
      });

    return Array.from(dateMap.entries()).map(([dateStr, val]) => {
      const formatted = new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      return {
        date: dateStr,
        label: formatted,
        senyiur: val.senyiur !== undefined ? val.senyiur : null,
        muaraPahu: val.muaraPahu !== undefined ? val.muaraPahu : null,
        threshold: 4.0,
      };
    });
  }, [entries, activeSiteTab]);

  const latestReading = stats?.latestReading;
  const isLatestSafe = (latestReading?.waterDepth || 0) >= (latestReading?.minThreshold || 4.0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. TOP HEADER & HERO SECTION */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative background water wave */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Waves size={280} className="text-teal-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                Live Hydrograph Monitoring
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e95623]/20 text-[#e95623] border border-[#e95623]/30">
                Project Tabang
              </span>
              <a
                href="https://docs.google.com/spreadsheets/d/1QfY81fyk-hLYEQNGyn1B__jngaeTkKblIO1YWnrwlW4/edit?gid=0#gid=0"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors underline decoration-slate-500 underline-offset-2"
                title="Buka Google Spreadsheet Sumber Data"
              >
                <span>Google Sheets Sumber</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              RIVER JOURNAL &bull; KEDALAMAN SUNGAI
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pemantauan kedalaman alur pelayaran sungai dan batas draft minimum navigasi tongkang batubara
              di <strong>Dermaga Senyiur KM 0</strong> (Sheet 1) & <strong>Jetty Muara Pahu</strong> (Sheet 2).
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsInputModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-[#e95623] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-black tracking-wide shadow-lg shadow-orange-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Input Kedalaman Sungai</span>
            </button>

            <button
              onClick={handleSyncGoogleSheets}
              disabled={isSyncing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Sinkronisasi data Google Sheets terbaru"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin text-teal-400" : ""} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sync Sheets"}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download Data Format CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all cursor-pointer"
              title="Cetak Halaman Jurnal"
            >
              <Printer size={15} />
            </button>
          </div>
        </div>

        {/* SITE TABS: Semua Lokasi / Dermaga Senyiur / Jetty Muara Pahu */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveSiteTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSiteTab === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Semua Lokasi Project Tabang
            </button>
            <button
              onClick={() => setActiveSiteTab("Senyiur")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSiteTab === "Senyiur"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Dermaga Senyiur KM 0</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-white">
                Sheet 1
              </span>
            </button>
            <button
              onClick={() => setActiveSiteTab("MuaraPahu")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSiteTab === "MuaraPahu"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Jetty Muara Pahu</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-white">
                Sheet 2
              </span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-3">
            <span>Total Log: <strong>{filteredEntries.length}</strong> Pengukuran</span>
            <span>&bull;</span>
            <span>Batas Draft Tongkang: <strong className="text-white">4.0 Meter</strong></span>
          </div>
        </div>
      </div>

      {/* 2. 4 EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Kedalaman Terkini */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Kedalaman Air Terkini
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 ${
                isLatestSafe
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {isLatestSafe ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
              {isLatestSafe ? "Aman Navigasi" : "Surut / Waspada"}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black font-mono text-slate-900">
              {latestReading?.waterDepth !== undefined ? `${latestReading.waterDepth.toFixed(2)} m` : "—"}
            </div>
            {latestReading?.delta !== undefined && (
              <span
                className={`text-xs font-bold font-mono flex items-center gap-0.5 ${
                  latestReading.delta >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {latestReading.delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {latestReading.delta >= 0 ? `+${latestReading.delta}m` : `${latestReading.delta}m`}
              </span>
            )}
          </div>

          <div className="mt-2 text-[11px] text-slate-500 truncate" title={latestReading?.location}>
            Lokasi: <strong className="text-slate-800">{latestReading?.location || "—"}</strong>
          </div>
          <div className="text-[10px] text-slate-400">
            Waktu: {latestReading?.date || "—"} pk {latestReading?.inputTime || "—"} WIB
          </div>
        </div>

        {/* Card 2: Batas Minimum & Clearance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Batas Minimum Draft
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
              Pagu Tongkang
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black font-mono text-slate-900">
              4.00 m
            </div>
            {latestReading && (
              <span
                className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${
                  isLatestSafe
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {latestReading.waterDepth - 4.0 >= 0
                  ? `+${(latestReading.waterDepth - 4.0).toFixed(2)}m (Margin)`
                  : `${(latestReading.waterDepth - 4.0).toFixed(2)}m (Defisit)`}
              </span>
            )}
          </div>

          <div className="mt-2 text-[11px] text-slate-600">
            {isLatestSafe ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Ship size={12} />
                Tongkang diizinkan berlayar
              </span>
            ) : (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <ShieldAlert size={12} />
                Tugboat & Tongkang dilarang masuk
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            Syarat kedalaman minimum alur Sungai Mahakam / Kedang Kepala
          </div>
        </div>

        {/* Card 3: Rasio Aksesibilitas Navigasi */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Aksesibilitas Navigasi
            </span>
            <span className="text-[10px] font-bold text-indigo-600">
              {stats?.safeCount || 0} / {stats?.totalReadings || 0} Log
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-black font-mono text-indigo-950">
              {stats?.safePercentage !== undefined ? `${stats.safePercentage}%` : "0%"}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Layak Tongkang
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${stats?.safePercentage || 0}%` }}
              title={`Aman: ${stats?.safeCount || 0} kali`}
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${100 - (stats?.safePercentage || 0)}%` }}
              title={`Surut: ${stats?.surutCount || 0} kali`}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>Aman: {stats?.safeCount || 0}</span>
            <span>Surut: {stats?.surutCount || 0}</span>
          </div>
        </div>

        {/* Card 4: Ekstremitas Kedalaman */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Ekstremitas & Rata-rata
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              Periode Aktif
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Terendah
              </span>
              <span className="text-sm font-black font-mono text-rose-600 block mt-0.5">
                {stats?.minDepth !== undefined ? `${stats.minDepth.toFixed(2)}m` : "—"}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Rata-rata
              </span>
              <span className="text-sm font-black font-mono text-slate-800 block mt-0.5">
                {stats?.avgDepth !== undefined ? `${stats.avgDepth.toFixed(2)}m` : "—"}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Puncak
              </span>
              <span className="text-sm font-black font-mono text-emerald-600 block mt-0.5">
                {stats?.maxDepth !== undefined ? `${stats.maxDepth.toFixed(2)}m` : "—"}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 text-center">
            Pola fluktuasi pasang surut air sungai
          </div>
        </div>
      </div>

      {/* 3. GEMINI AI RIVER OPERATIONAL ANALYSIS BOX */}
      <div className="bg-linear-to-br from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl shrink-0 border border-blue-500/30 flex flex-col items-center gap-1">
            <Sparkles size={20} className="text-teal-400" />
            <span className="text-[8px] font-black uppercase tracking-wider text-teal-300">AI</span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Gemini AI River Operational Insight
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Model Hidrologi Tambang
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Analisis Hidrografi & Keputusan Navigasi Tongkang
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
              {/* Kolom 1 */}
              <div className="space-y-1">
                <span className="font-extrabold text-teal-300 block text-[11px]">
                  1. Kondisi Hidrologi & Anomali Alur:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activeSiteTab === "Senyiur" || activeSiteTab === "all"
                    ? "Alur Dermaga Senyiur KM 0 mengalami defisit kedalaman konstan (1.76m - 2.74m), berada 1.26m - 2.24m di bawah batas draft aman 4.0m. Sebaliknya, Jetty Muara Pahu berada pada kedalaman optimal (7.08m - 9.40m)."
                    : "Jetty Muara Pahu berada pada kondisi hidrologi stabil dan aman dengan rata-rata kedalaman 8.07m, melampaui batas draft minimum 4.0m secara berkelanjutan."}
                </p>
              </div>

              {/* Kolom 2 */}
              <div className="space-y-1">
                <span className="font-extrabold text-teal-300 block text-[11px]">
                  2. Dampak Operasional Tongkang (Barging):
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activeSiteTab === "Senyiur" || activeSiteTab === "all"
                    ? "Armada tugboat dan tongkang batubara berbobot penuh tidak dapat memasuki Dermaga Senyiur karena risiko kandas tinggi. Muatan batubara harus dialokasikan atau ditampung pada intermediate stockpile."
                    : "Seluruh aktivitas barging dan loading batubara di Jetty Muara Pahu berjalan lancar tanpa kendala draft. Alur sungai Mahakam mendukung kapasitas muat maksimal."}
                </p>
              </div>

              {/* Kolom 3 */}
              <div className="space-y-1">
                <span className="font-extrabold text-teal-300 block text-[11px]">
                  3. Tindakan Korektif & Rekomendasi Site:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activeSiteTab === "Senyiur" || activeSiteTab === "all"
                    ? "Terapkan status 'Stand-by Anchorage' untuk armada tongkang Senyiur. Monitor tren pasang air harian setiap pk 08:00 dan 16:00, serta siapkan skema partial loading jika terjadi lonjakan curah hujan di hulu."
                    : "Pertahankan jadwal pengapalan reguler. Lakukan pengecekan rutin tiang ukur berkala untuk mengantisipasi potensi perubahan debit air musiman."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Hydrograph Trend (8 cols if comparative, or full 12) */}
        <div className={`bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs ${activeSiteTab === "all" ? "lg:col-span-7" : "lg:col-span-12"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Waves size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Grafik Tren Kedalaman Air Sungai (Hydrograph)
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {activeSiteTab === "Senyiur"
                    ? "Dermaga Senyiur KM 0 (Fluktuasi Harian)"
                    : activeSiteTab === "MuaraPahu"
                    ? "Jetty Muara Pahu (Fluktuasi Harian)"
                    : "Seluruh Data Pengukuran Tabang"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3 h-1 bg-blue-600 rounded-full" />
                <span>Kedalaman Air (m)</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-rose-600">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500" />
                <span>Batas Minimum (4.0m)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  interval="preserveStartEnd"
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-xl text-white text-xs max-w-xs space-y-1.5">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                            <span className="font-extrabold text-teal-300">
                              {data.location}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {data.rawDate} pk {data.time}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between pt-0.5">
                            <span className="text-[11px] text-slate-400">Kedalaman:</span>
                            <span className="text-base font-black font-mono text-white">
                              {data.depth.toFixed(2)} Meter
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Batas Minimum:</span>
                            <span className="font-mono text-slate-300">{data.threshold.toFixed(2)} Meter</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Selisih Draft:</span>
                            <span
                              className={`font-mono font-bold ${
                                data.depth - data.threshold >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {data.depth - data.threshold >= 0 ? "+" : ""}
                              {(data.depth - data.threshold).toFixed(2)} Meter
                            </span>
                          </div>
                          <div className="pt-1 border-t border-slate-800">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                data.isSafe
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {data.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            Petugas: <strong>{data.userInput}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={4.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Batas Draft 4.0m",
                    position: "right",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="depth"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#depthGradient)"
                  dot={(props: any) => {
                    const isSafe = props.payload.isSafe;
                    return (
                      <circle
                        key={props.key}
                        cx={props.cx}
                        cy={props.cy}
                        r={2.5}
                        fill={isSafe ? "#10b981" : "#ef4444"}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparative Line Chart (Senyiur vs Muara Pahu) */}
        {activeSiteTab === "all" && comparativeChartData && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <SlidersHorizontal size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Komparasi Alur: Senyiur vs Muara Pahu
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Disparitas kedalaman hulu vs hilir Sungai Mahakam
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparativeChartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "#64748B" }}
                      interval="preserveStartEnd"
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      domain={[0, 11]}
                      tick={{ fontSize: 9, fill: "#64748B" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-xl text-white text-[11px] space-y-1">
                              <span className="font-bold text-teal-300 block">{item.date}</span>
                              <div className="flex items-center justify-between gap-3 text-emerald-400">
                                <span>Muara Pahu:</span>
                                <span className="font-mono font-bold">
                                  {item.muaraPahu !== null ? `${item.muaraPahu.toFixed(2)}m (Aman)` : "—"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-amber-400">
                                <span>Senyiur KM 0:</span>
                                <span className="font-mono font-bold">
                                  {item.senyiur !== null ? `${item.senyiur.toFixed(2)}m (Surut)` : "—"}
                                </span>
                              </div>
                              <div className="pt-1 border-t border-slate-800 text-[9px] text-slate-400">
                                Batas Draft: 4.0m
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={4.0}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="muaraPahu"
                      name="Muara Pahu"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="senyiur"
                      name="Senyiur KM 0"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-[10px] font-bold">
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Jetty Muara Pahu (Rata-rata 8.07m &bull; Aman)
              </span>
              <span className="text-amber-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Dermaga Senyiur (Rata-rata 2.04m &bull; Surut)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. DATA TABLE SECTION (Matching the 9 Columns of Google Sheet) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Table Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Ship size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Jurnal Log Harian Kedalaman Air Sungai (Data 9 Kolom)
              </h3>
              <p className="text-[10px] text-slate-500">
                Data terstruktur persis sesuai format Google Spreadsheet Project Tabang
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-50">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari user, tanggal, lokasi..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="surut">Surut (Tugboat Dilarang)</option>
              <option value="aman">Air Sudah Aman</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e: any) => setDateRangeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Rentang Waktu</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="14d">14 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 w-12 text-center">A &bull; ID</th>
                <th className="py-3 px-3 w-28">B &bull; Tanggal</th>
                <th className="py-3 px-3 w-24 text-center">C &bull; Waktu</th>
                <th className="py-3 px-3 min-w-40">D &bull; Lokasi Pengukuran</th>
                <th className="py-3 px-3 w-32 text-right">E &bull; Kedalaman (m)</th>
                <th className="py-3 px-3 w-32 text-right">F &bull; Batas Min (m)</th>
                <th className="py-3 px-3 min-w-50">G &bull; Deskripsi Otomatis</th>
                <th className="py-3 px-3 w-28">H &bull; Petugas</th>
                <th className="py-3 px-4 min-w-60">I &bull; Kesimpulan Data</th>
                <th className="py-3 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-600" />
                      <span className="text-xs font-semibold">Memuat Jurnal Sungai...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada catatan kedalaman sungai yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((item, idx) => {
                  const isSafe = item.waterDepth >= item.minThreshold;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Kolom A: ID */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                        {item.externalId || idx + 1}
                      </td>

                      {/* Kolom B: Tanggal */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* Kolom C: Waktu Input */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {item.inputTime}
                      </td>

                      {/* Kolom D: Lokasi Pengukuran */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800 block truncate max-w-45" title={item.location}>
                          {item.location}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                            item.site === "Senyiur"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {item.site}
                        </span>
                      </td>

                      {/* Kolom E: Kedalaman Air Sungai */}
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-mono text-sm font-black ${
                            isSafe ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {item.waterDepth.toFixed(2)} m
                        </span>
                      </td>

                      {/* Kolom F: Batas Minimum Kedalaman */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 font-semibold">
                        {item.minThreshold.toFixed(2)} m
                      </td>

                      {/* Kolom G: Deskripsi Otomatis */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isSafe
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isSafe ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                          <span>{item.autoDescription}</span>
                        </span>
                      </td>

                      {/* Kolom H: User yang Input */}
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">
                        {item.userInput}
                      </td>

                      {/* Kolom I: Kesimpulan Data */}
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] leading-relaxed">
                        {item.conclusion}
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteEntry(item.id, item.location, item.date)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Catatan Pengukuran"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div>
            Menampilkan{" "}
            <strong>
              {filteredEntries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </strong>{" "}
            sampai{" "}
            <strong>
              {Math.min(currentPage * itemsPerPage, filteredEntries.length)}
            </strong>{" "}
            dari <strong>{filteredEntries.length}</strong> total catatan
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer"
              aria-label="Halaman Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800 bg-slate-100 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer"
              aria-label="Halaman Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Input River Journal Modal */}
      {isInputModalOpen && (
        <InputRiverJournalModal
          user={user}
          onClose={() => setIsInputModalOpen(false)}
          onSubmit={handleCreateEntry}
          defaultSite={activeSiteTab}
        />
      )}
    </div>
  );
};
