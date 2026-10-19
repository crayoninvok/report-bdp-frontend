"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, JobSite } from "../types/auth";
import { DailyProduction, ProductionStats, ProductionTargets, WeeklyKpiSummary } from "../types/production";
import { productionService, DEFAULT_PRODUCTION_TARGETS } from "../services/productionService";
import { useNotification } from "../context/NotificationContext";
import {
  ClipboardList,
  FileSpreadsheet,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Truck,
  Gauge,
  Clock,
  Fuel,
  Layers,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Sparkles,
  Plus,
  RotateCcw,
  BarChart3,
  CalendarDays,
} from "lucide-react";

interface CoalProductionReportViewProps {
  user: User;
  onNavigateToInput?: () => void;
  onNavigateToDashboard?: () => void;
}

type ReportTab = "daily" | "weekly" | "monthly";
type SortField =
  | "date"
  | "weekNumber"
  | "production"
  | "pa"
  | "ua"
  | "payload"
  | "cycleTime"
  | "fuelRatio"
  | "tdp"
  | "unitRunning";

export const CoalProductionReportView: React.FC<CoalProductionReportViewProps> = ({
  user,
  onNavigateToInput,
  onNavigateToDashboard,
}) => {
  const { showSuccess, showError } = useNotification();

  // Primary data states
  const [records, setRecords] = useState<DailyProduction[]>([]);
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [targets, setTargets] = useState<ProductionTargets>(DEFAULT_PRODUCTION_TARGETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Tab & View States
  const [activeTab, setActiveTab] = useState<ReportTab>("daily");

  // Filters
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const [selectedSite, setSelectedSite] = useState<JobSite | "all">(
    isHeadOffice ? "all" : user.jobSite
  );
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Daily Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Weekly Pagination State
  const [weeklyPage, setWeeklyPage] = useState<number>(1);
  const [weeklyPageSize, setWeeklyPageSize] = useState<number>(15);

  // Jump page inputs
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, statsRes] = await Promise.all([
        productionService.getDailyProductions({
          site: selectedSite,
          weekNumber: selectedWeek !== "all" ? selectedWeek : undefined,
          search: searchQuery,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        productionService.getProductionStats({
          site: selectedSite,
          weekNumber: selectedWeek !== "all" ? selectedWeek : undefined,
        }),
      ]);

      setRecords(prodRes.data || []);
      if (prodRes.targets) setTargets(prodRes.targets);
      setStats(statsRes);
    } catch (err: any) {
      console.error("Gagal mengambil data laporan produksi:", err);
      showError(err.message || "Gagal memuat data laporan produksi");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite, selectedWeek, searchQuery, startDate, endDate, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setWeeklyPage(1);
  }, [selectedSite, selectedWeek, selectedMonth, startDate, endDate, searchQuery, pageSize]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showSuccess("Data laporan produksi berhasil diperbarui");
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedSite(isHeadOffice ? "all" : user.jobSite);
    setSelectedWeek("all");
    setSelectedMonth("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Get available weeks dynamically from records
  const availableWeeks = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.weekNumber) set.add(r.weekNumber);
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [records]);

  // Filtered & Sorted Daily Records
  const filteredDailyRecords = useMemo(() => {
    let list = [...records];

    // Filter site (if not handled by backend)
    if (selectedSite !== "all") {
      list = list.filter((r) => r.jobSite === selectedSite);
    }

    // Filter week
    if (selectedWeek !== "all") {
      list = list.filter((r) => r.weekNumber.toUpperCase() === selectedWeek.toUpperCase());
    }

    // Filter month
    if (selectedMonth !== "all") {
      list = list.filter((r) => {
        const parts = r.date.split("-");
        return parts.length >= 2 && parts[1] === selectedMonth;
      });
    }

    // Filter Date Range
    if (startDate) {
      list = list.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      list = list.filter((r) => r.date <= endDate);
    }

    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.date.includes(q) ||
          r.weekNumber.toLowerCase().includes(q) ||
          r.jobSite.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    // Sort records
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "date") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (sortField === "weekNumber") {
        const numA = parseInt(String(valA).replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(String(valB).replace(/\D/g, ""), 10) || 0;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return list;
  }, [records, selectedSite, selectedWeek, selectedMonth, startDate, endDate, searchQuery, sortField, sortOrder]);

  // Daily Pagination Calculations
  const totalDailyRecords = filteredDailyRecords.length;
  const totalDailyPages = Math.max(1, Math.ceil(totalDailyRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalDailyPages);

  const paginatedDailyRecords = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredDailyRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredDailyRecords, validCurrentPage, pageSize]);

  const dailyStartRecord = totalDailyRecords === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const dailyEndRecord = Math.min(validCurrentPage * pageSize, totalDailyRecords);

  // Overall Statistics from Filtered Data
  const filteredSummary = useMemo(() => {
    const count = filteredDailyRecords.length;
    if (count === 0) {
      return {
        count: 0,
        totalProduction: 0,
        avgDailyProd: 0,
        avgPa: 0,
        avgUa: 0,
        avgPayload: 0,
        avgCycleTime: 0,
        avgFuelRatio: 0,
        avgUnitRunning: 0,
        avgTdp: 0,
        paAchievedCount: 0,
        uaAchievedCount: 0,
      };
    }

    let totProd = 0;
    let totPa = 0;
    let totUa = 0;
    let totPayload = 0;
    let totCt = 0;
    let totFr = 0;
    let totUnit = 0;
    let totTdp = 0;
    let paAchieved = 0;
    let uaAchieved = 0;

    filteredDailyRecords.forEach((r) => {
      totProd += r.production;
      const paNorm = r.pa > 1 ? r.pa / 100 : r.pa;
      const uaNorm = r.ua > 1 ? r.ua / 100 : r.ua;
      totPa += paNorm;
      totUa += uaNorm;
      totPayload += r.payload;
      totCt += r.cycleTime;
      totFr += r.fuelRatio;
      totUnit += r.unitRunning;
      totTdp += r.tdp;

      if (paNorm >= targets.pa) paAchieved++;
      if (uaNorm >= targets.ua) uaAchieved++;
    });

    return {
      count,
      totalProduction: totProd,
      avgDailyProd: totProd / count,
      avgPa: (totPa / count) * 100,
      avgUa: (totUa / count) * 100,
      avgPayload: totPayload / count,
      avgCycleTime: totCt / count,
      avgFuelRatio: totFr / count,
      avgUnitRunning: totUnit / count,
      avgTdp: totTdp / count,
      paAchievedCount: paAchieved,
      uaAchievedCount: uaAchieved,
    };
  }, [filteredDailyRecords, targets]);

  // Weekly Grouped Summary
  const weeklySummaryList = useMemo(() => {
    const weekMap = new Map<string, DailyProduction[]>();
    filteredDailyRecords.forEach((r) => {
      const list = weekMap.get(r.weekNumber) || [];
      list.push(r);
      weekMap.set(r.weekNumber, list);
    });

    const result: (WeeklyKpiSummary & { kpiAchievedRatio: string })[] = [];
    Array.from(weekMap.entries()).forEach(([wNum, list]) => {
      const count = list.length;
      if (count === 0) return;

      const wProd = list.reduce((acc, r) => acc + r.production, 0);
      const wPa = (list.reduce((acc, r) => acc + (r.pa > 1 ? r.pa / 100 : r.pa), 0) / count) * 100;
      const wUa = (list.reduce((acc, r) => acc + (r.ua > 1 ? r.ua / 100 : r.ua), 0) / count) * 100;
      const wPayload = list.reduce((acc, r) => acc + r.payload, 0) / count;
      const wCt = list.reduce((acc, r) => acc + r.cycleTime, 0) / count;
      const wFr = list.reduce((acc, r) => acc + r.fuelRatio, 0) / count;
      const wUnit = list.reduce((acc, r) => acc + r.unitRunning, 0) / count;
      const wTdp = list.reduce((acc, r) => acc + r.tdp, 0) / count;

      // Sort dates
      const sortedDates = [...list].map((x) => x.date).sort();

      // Check how many KPI passed Plan
      let passCount = 0;
      if (wPa >= targets.pa * 100) passCount++;
      if (wUa >= targets.ua * 100) passCount++;
      if (wPayload >= targets.payload) passCount++;
      if (wCt <= targets.cycleTime) passCount++;
      if (wFr <= targets.fuelRatio) passCount++;
      if (wTdp >= targets.tdp) passCount++;

      result.push({
        weekNumber: wNum,
        daysCount: count,
        startDate: sortedDates[0],
        endDate: sortedDates[sortedDates.length - 1],
        paActual: Number(wPa.toFixed(2)),
        paTarget: targets.pa * 100,
        uaActual: Number(wUa.toFixed(2)),
        uaTarget: targets.ua * 100,
        payloadActual: Number(wPayload.toFixed(2)),
        payloadTarget: targets.payload,
        cycleTimeActual: Number(wCt.toFixed(2)),
        cycleTimeTarget: targets.cycleTime,
        fuelRatioActual: Number(wFr.toFixed(3)),
        fuelRatioTarget: targets.fuelRatio,
        unitRunningActual: Number(wUnit.toFixed(1)),
        unitRunningTarget: targets.unitRunning,
        tdpActual: Number(wTdp.toFixed(2)),
        tdpTarget: targets.tdp,
        productionActual: Number(wProd.toFixed(2)),
        kpiAchievedRatio: `${passCount}/6 KPI Sesuai Plan`,
      });
    });

    // Sort by week number
    return result.sort((a, b) => {
      const numA = parseInt(a.weekNumber.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.weekNumber.replace(/\D/g, ""), 10) || 0;
      return numB - numA; // newest week first
    });
  }, [filteredDailyRecords, targets]);

  // Weekly Pagination Calculations
  const totalWeeklyRecords = weeklySummaryList.length;
  const totalWeeklyPages = Math.max(1, Math.ceil(totalWeeklyRecords / weeklyPageSize));
  const validWeeklyPage = Math.min(weeklyPage, totalWeeklyPages);
  const paginatedWeeklyRecords = useMemo(() => {
    const startIndex = (validWeeklyPage - 1) * weeklyPageSize;
    return weeklySummaryList.slice(startIndex, startIndex + weeklyPageSize);
  }, [weeklySummaryList, validWeeklyPage, weeklyPageSize]);

  // Monthly Grouped Summary
  const monthlySummaryList = useMemo(() => {
    const monthMap = new Map<string, DailyProduction[]>();
    filteredDailyRecords.forEach((r) => {
      const mKey = r.date.slice(0, 7); // YYYY-MM
      const list = monthMap.get(mKey) || [];
      list.push(r);
      monthMap.set(mKey, list);
    });

    const monthNames: Record<string, string> = {
      "01": "Januari",
      "02": "Februari",
      "03": "Maret",
      "04": "April",
      "05": "Mei",
      "06": "Juni",
      "07": "Juli",
      "08": "Agustus",
      "09": "September",
      "10": "Oktober",
      "11": "November",
      "12": "Desember",
    };

    const result = [];
    for (const [mKey, list] of monthMap.entries()) {
      const count = list.length;
      const [yearStr, monthStr] = mKey.split("-");
      const monthLabel = `${monthNames[monthStr] || monthStr} ${yearStr}`;

      const totalProd = list.reduce((acc, r) => acc + r.production, 0);
      const avgPa = (list.reduce((acc, r) => acc + (r.pa > 1 ? r.pa / 100 : r.pa), 0) / count) * 100;
      const avgUa = (list.reduce((acc, r) => acc + (r.ua > 1 ? r.ua / 100 : r.ua), 0) / count) * 100;
      const avgPayload = list.reduce((acc, r) => acc + r.payload, 0) / count;
      const avgCt = list.reduce((acc, r) => acc + r.cycleTime, 0) / count;
      const avgFr = list.reduce((acc, r) => acc + r.fuelRatio, 0) / count;
      const avgTdp = list.reduce((acc, r) => acc + r.tdp, 0) / count;

      const planTonase = monthStr === "10" || monthStr === "11" || monthStr === "12"
        ? targets.monthlyProductionTarget // 671,000 Ton Q4
        : targets.monthlyProductionBase; // 398,000 Ton

      const varianceTon = totalProd - planTonase;
      const achievementPercent = planTonase > 0 ? (totalProd / planTonase) * 100 : 0;

      result.push({
        monthKey: mKey,
        monthLabel,
        daysCount: count,
        totalProduction: totalProd,
        planTonase,
        varianceTon,
        achievementPercent,
        avgPa,
        avgUa,
        avgPayload,
        avgCt,
        avgFr,
        avgTdp,
      });
    }

    return result.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredDailyRecords, targets]);

  // Sorting helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredDailyRecords.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }

    const headers = [
      "No",
      "Tanggal",
      "Minggu",
      "Site",
      "PA (%)",
      "UA (%)",
      "Payload (Ton)",
      "Cycle Time (Jam)",
      "Fuel Ratio (L/Ton)",
      "Unit Running",
      "TDP (Trip)",
      "Produksi (Ton)",
      "Keterangan",
    ];

    const rows = filteredDailyRecords.map((r, idx) => {
      const paPerc = (r.pa > 1 ? r.pa : r.pa * 100).toFixed(2);
      const uaPerc = (r.ua > 1 ? r.ua : r.ua * 100).toFixed(2);
      return [
        idx + 1,
        r.date,
        r.weekNumber,
        r.jobSite,
        paPerc,
        uaPerc,
        r.payload.toFixed(2),
        r.cycleTime.toFixed(2),
        r.fuelRatio.toFixed(3),
        r.unitRunning,
        r.tdp.toFixed(2),
        r.production.toFixed(2),
        `"${(r.notes || "").replace(/"/g, '""')}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Produksi_Coal_Hauling_${selectedSite}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess("Laporan produksi berhasil diunduh dalam format CSV");
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Jump page helper
  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalDailyPages) {
      setCurrentPage(p);
      setJumpPageInput("");
    }
  };

  // Format Helper for Day Name in Indonesian
  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[d.getDay()];
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Printable Corporate Header (visible only on print) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              PT BATARA DHARMA PERSADA
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Coal Hauling Operation &bull; Divisi Produksi & Transportasi Tambang
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              LAPORAN PRODUKSI COAL HAULING & PENCAPAIAN KPI
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Job Site: <strong>{selectedSite === "all" ? "Semua Site (Muara Pahu & Senyiur)" : selectedSite}</strong></p>
            <p>Tanggal Cetak: <strong>{new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</strong></p>
            <p>Dicetak Oleh: <strong>{user.name} ({user.role})</strong></p>
          </div>
        </div>
      </div>

      {/* Screen Top Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200/60 shadow-xs shrink-0">
                <ClipboardList size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Laporan Produksi Coal Hauling
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-50 text-[#e95623] border border-orange-200/80">
                    <Sparkles size={11} />
                    Coal Hauling Operation
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Modul Operasional Aktif
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed">
                  Laporan rekapitulasi data harian, mingguan, dan evaluasi ketercapaian KPI Coal Hauling PT Batara Dharma Persada
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Perbarui data"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#e95623]" : ""} />
              <span>{isRefreshing ? "Menyegarkan..." : "Refresh"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Unduh data dalam format CSV / Excel"
            >
              <Download size={14} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-2xs cursor-pointer"
              title="Cetak laporan / Print view"
            >
              <Printer size={14} className="text-blue-600" />
              <span>Cetak Laporan</span>
            </button>

            {onNavigateToInput && (
              <button
                onClick={onNavigateToInput}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#e95623] hover:bg-[#d44818] shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Input Data Produksi</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "daily"
                ? "bg-[#e95623] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Calendar size={14} />
            <span>Laporan Harian ({filteredDailyRecords.length} Data)</span>
          </button>

          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "weekly"
                ? "bg-[#e95623] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart3 size={14} />
            <span>Rekapitulasi Mingguan ({weeklySummaryList.length} Minggu)</span>
          </button>

          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "monthly"
                ? "bg-[#e95623] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CalendarDays size={14} />
            <span>Rekapitulasi Bulanan ({monthlySummaryList.length} Bulan)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Screen only) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Site Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={selectedSite}
                disabled={!isHeadOffice}
                onChange={(e) => setSelectedSite(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623] disabled:opacity-60 cursor-pointer"
              >
                <option value="all">Semua Site Operasional</option>
                <option value="MuaraPahu">Muara Pahu</option>
                <option value="Senyiur">Senyiur</option>
              </select>
            </div>

            {/* Week Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623] cursor-pointer"
              >
                <option value="all">Semua Kelompok Minggu</option>
                {availableWeeks.map((w) => (
                  <option key={w} value={w}>
                    Kelompok {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623] cursor-pointer"
            >
              <option value="all">Semua Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
                title="Rentang Awal Tanggal"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
                title="Rentang Akhir Tanggal"
              />
            </div>

            {/* Reset Button */}
            {(selectedSite !== (isHeadOffice ? "all" : user.jobSite) ||
              selectedWeek !== "all" ||
              selectedMonth !== "all" ||
              startDate !== "" ||
              endDate !== "" ||
              searchQuery !== "") && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Reset seluruh filter"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari tanggal, minggu, catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623] placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>
      </div>

      {/* KPI Performance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 print:grid-cols-6 print:gap-2">
        {/* Card 1: Total Produksi */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Produksi</span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
              <Truck size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {filteredSummary.totalProduction.toLocaleString("id-ID", {
              maximumFractionDigits: 1,
            })}
            <span className="text-xs font-semibold text-slate-400 ml-1">Ton</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Rata-rata: <strong>{filteredSummary.avgDailyProd.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</strong> T/Hari ({filteredSummary.count} Hari)
          </p>
        </div>

        {/* Card 2: PA */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata PA</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Gauge size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                filteredSummary.avgPa >= targets.pa * 100
                  ? "text-emerald-700"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgPa.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Plan: {(targets.pa * 100).toFixed(0)}%</span>
            <span
              className={`font-bold ${
                filteredSummary.avgPa >= targets.pa * 100
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgPa >= targets.pa * 100 ? "✓ Sesuai" : "⚠ Di Bawah"}
            </span>
          </div>
        </div>

        {/* Card 3: UA */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata UA</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                filteredSummary.avgUa >= targets.ua * 100
                  ? "text-emerald-700"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgUa.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Plan: {(targets.ua * 100).toFixed(0)}%</span>
            <span
              className={`font-bold ${
                filteredSummary.avgUa >= targets.ua * 100
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgUa >= targets.ua * 100 ? "✓ Sesuai" : "⚠ Di Bawah"}
            </span>
          </div>
        </div>

        {/* Card 4: Payload */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Payload</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Layers size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                filteredSummary.avgPayload >= targets.payload
                  ? "text-emerald-700"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgPayload.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">Ton</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Plan: {targets.payload.toFixed(0)} T</span>
            <span
              className={`font-bold ${
                filteredSummary.avgPayload >= targets.payload
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgPayload >= targets.payload ? "✓ Sesuai" : "⚠ Kurang"}
            </span>
          </div>
        </div>

        {/* Card 5: Cycle Time */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cycle Time</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                filteredSummary.avgCycleTime <= targets.cycleTime
                  ? "text-emerald-700"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgCycleTime.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">Jam</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Plan: {targets.cycleTime.toFixed(1)} J</span>
            <span
              className={`font-bold ${
                filteredSummary.avgCycleTime <= targets.cycleTime
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgCycleTime <= targets.cycleTime ? "✓ Cepat" : "⚠ Lambat"}
            </span>
          </div>
        </div>

        {/* Card 6: Fuel Ratio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fuel Ratio</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Fuel size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                filteredSummary.avgFuelRatio <= targets.fuelRatio
                  ? "text-emerald-700"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgFuelRatio.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-400">L/T</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Plan: {targets.fuelRatio.toFixed(2)}</span>
            <span
              className={`font-bold ${
                filteredSummary.avgFuelRatio <= targets.fuelRatio
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {filteredSummary.avgFuelRatio <= targets.fuelRatio ? "✓ Efisien" : "⚠ Boros"}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: DAILY PRODUCTION TABLE WITH FULL PAGINATION */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header Section */}
          <div className="px-6 py-4.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Laporan Rincian Produksi Harian
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Daftar rincian produksi harian coal hauling dan parameter kinerja operasional
              </p>
            </div>

            {/* Quick Rows per page top selector */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-[#e95623]"
              >
                <option value={10}>10 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3.5 text-center w-12">No</th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Tanggal</span>
                      {sortField === "date" ? (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      ) : (
                        <ArrowUpDown size={12} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none text-center"
                    onClick={() => handleSort("weekNumber")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Minggu</span>
                      {sortField === "weekNumber" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3.5">Site</th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none text-center"
                    onClick={() => handleSort("pa")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>PA (%)</span>
                      {sortField === "pa" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none text-center"
                    onClick={() => handleSort("ua")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>UA (%)</span>
                      {sortField === "ua" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort("payload")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Payload</span>
                      {sortField === "payload" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort("cycleTime")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Cycle Time</span>
                      {sortField === "cycleTime" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort("fuelRatio")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Fuel Ratio</span>
                      {sortField === "fuelRatio" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none text-center"
                    onClick={() => handleSort("unitRunning")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Unit</span>
                      {sortField === "unitRunning" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-slate-900 select-none text-center"
                    onClick={() => handleSort("tdp")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>TDP</span>
                      {sortField === "tdp" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-slate-900 select-none text-right"
                    onClick={() => handleSort("production")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Produksi (Ton)</span>
                      {sortField === "production" && (
                        sortOrder === "asc" ? <ArrowUp size={12} className="text-[#e95623]" /> : <ArrowDown size={12} className="text-[#e95623]" />
                      )}
                    </div>
                  </th>
                  <th className="px-3.5 py-3.5 text-center">Status KPI</th>
                  <th className="px-4 py-3.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <div className="h-8 w-8 rounded-full border-3 border-[#e95623] border-t-transparent animate-spin" />
                        <span className="font-semibold text-slate-600">Memuat data laporan produksi...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDailyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Truck size={36} className="text-slate-300 stroke-[1.5]" />
                        <span className="font-bold text-slate-700 text-sm">Tidak ada data produksi yang cocok</span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Cobalah sesuaikan filter pencarian atau tanggal di atas, atau klik tombol Reset Filter.
                        </p>
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDailyRecords.map((r, index) => {
                    const rowNumber = (validCurrentPage - 1) * pageSize + index + 1;
                    const paPerc = r.pa > 1 ? r.pa : r.pa * 100;
                    const uaPerc = r.ua > 1 ? r.ua : r.ua * 100;
                    const isPaAchieved = paPerc >= targets.pa * 100;
                    const isUaAchieved = uaPerc >= targets.ua * 100;
                    const isPayloadAchieved = r.payload >= targets.payload;
                    const isCycleTimeAchieved = r.cycleTime <= targets.cycleTime;
                    const isFuelRatioAchieved = r.fuelRatio <= targets.fuelRatio;
                    const isTdpAchieved = r.tdp >= targets.tdp;

                    let kpiPassedCount = 0;
                    if (isPaAchieved) kpiPassedCount++;
                    if (isUaAchieved) kpiPassedCount++;
                    if (isPayloadAchieved) kpiPassedCount++;
                    if (isCycleTimeAchieved) kpiPassedCount++;
                    if (isFuelRatioAchieved) kpiPassedCount++;
                    if (isTdpAchieved) kpiPassedCount++;

                    const dayName = getDayName(r.date);

                    return (
                      <tr
                        key={r.id || `${r.date}-${r.weekNumber}-${index}`}
                        className="hover:bg-slate-50/90 transition-colors group"
                      >
                        {/* No */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-center text-[11px] text-slate-400 font-semibold">
                          {rowNumber}
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 group-hover:text-[#e95623] transition-colors">
                              {r.date}
                            </span>
                            {dayName && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {dayName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Minggu */}
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {r.weekNumber}
                          </span>
                        </td>

                        {/* Site */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-700 font-semibold">
                            {r.jobSite === "MuaraPahu"
                              ? "Muara Pahu"
                              : r.jobSite === "Senyiur"
                              ? "Senyiur"
                              : r.jobSite}
                          </span>
                        </td>

                        {/* PA (%) */}
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isPaAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                            title={`Plan: ${(targets.pa * 100).toFixed(0)}%`}
                          >
                            {paPerc.toFixed(1)}%
                          </span>
                        </td>

                        {/* UA (%) */}
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[54px] px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isUaAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                            title={`Plan: ${(targets.ua * 100).toFixed(0)}%`}
                          >
                            {uaPerc.toFixed(1)}%
                          </span>
                        </td>

                        {/* Payload */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isPayloadAchieved ? "text-slate-800" : "text-amber-700"
                            }`}
                          >
                            {r.payload.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-0.5">T</span>
                        </td>

                        {/* Cycle Time */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isCycleTimeAchieved ? "text-slate-800" : "text-amber-700"
                            }`}
                          >
                            {r.cycleTime.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-0.5">J</span>
                        </td>

                        {/* Fuel Ratio */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isFuelRatioAchieved ? "text-slate-800" : "text-amber-700"
                            }`}
                          >
                            {r.fuelRatio.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-0.5">L/T</span>
                        </td>

                        {/* Unit Running */}
                        <td className="px-3 py-3 whitespace-nowrap text-center font-semibold text-slate-800">
                          {r.unitRunning}
                        </td>

                        {/* TDP */}
                        <td className="px-3 py-3 whitespace-nowrap text-center">
                          <span
                            className={`font-semibold ${
                              isTdpAchieved ? "text-slate-800" : "text-amber-700"
                            }`}
                          >
                            {r.tdp.toFixed(2)}
                          </span>
                        </td>

                        {/* Produksi (Ton) */}
                        <td className="px-4 py-3 whitespace-nowrap text-right font-black text-slate-900 text-[13px]">
                          {r.production.toLocaleString("id-ID", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Status KPI Badge */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              kpiPassedCount >= 5
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : kpiPassedCount >= 3
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {kpiPassedCount}/6 Sesuai
                          </span>
                        </td>

                        {/* Keterangan */}
                        <td
                          className="px-4 py-3 max-w-[200px] truncate text-[11px] text-slate-500 font-normal"
                          title={r.notes || ""}
                        >
                          {r.notes || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Summary Row */}
              {filteredDailyRecords.length > 0 && (
                <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-slate-900 text-xs">
                  <tr>
                    <td colSpan={4} className="px-4 py-3.5 text-right uppercase tracking-wider font-extrabold text-[11px] text-slate-600">
                      Rata-rata & Total Terfilter:
                    </td>
                    <td className="px-3 py-3.5 text-center font-black text-slate-900">
                      {filteredSummary.avgPa.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3.5 text-center font-black text-slate-900">
                      {filteredSummary.avgUa.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3.5 font-bold text-slate-800">
                      {filteredSummary.avgPayload.toFixed(1)} T
                    </td>
                    <td className="px-3 py-3.5 font-bold text-slate-800">
                      {filteredSummary.avgCycleTime.toFixed(1)} J
                    </td>
                    <td className="px-3 py-3.5 font-bold text-slate-800">
                      {filteredSummary.avgFuelRatio.toFixed(2)}
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-slate-800">
                      {filteredSummary.avgUnitRunning.toFixed(1)}
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-slate-800">
                      {filteredSummary.avgTdp.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#e95623] text-sm">
                      {filteredSummary.totalProduction.toLocaleString("id-ID", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] text-slate-500 font-bold">Ton</span>
                    </td>
                    <td colSpan={2} className="px-4 py-3.5 text-slate-500 text-[10.5px] font-medium">
                      ({filteredSummary.count} Hari Operasional)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls Section */}
          <div className="px-6 py-4 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            {/* Left Info: showing X to Y of Z */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="font-medium">
                Menampilkan <strong className="text-slate-900">{dailyStartRecord}</strong> –{" "}
                <strong className="text-slate-900">{dailyEndRecord}</strong> dari{" "}
                <strong className="text-slate-900">{totalDailyRecords}</strong> data produksi
              </span>

              {/* Rows per page dropdown */}
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
                <span className="text-slate-400 font-medium">Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 font-bold bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right Buttons: First, Prev, Page Numbers, Next, Last */}
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1 px-1">
                {(() => {
                  const pages: (number | string)[] = [];
                  const maxVisible = 5;

                  if (totalDailyPages <= maxVisible) {
                    for (let i = 1; i <= totalDailyPages; i++) pages.push(i);
                  } else {
                    if (validCurrentPage <= 3) {
                      pages.push(1, 2, 3, 4, "...", totalDailyPages);
                    } else if (validCurrentPage >= totalDailyPages - 2) {
                      pages.push(1, "...", totalDailyPages - 3, totalDailyPages - 2, totalDailyPages - 1, totalDailyPages);
                    } else {
                      pages.push(1, "...", validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, "...", totalDailyPages);
                    }
                  }

                  return pages.map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-bold select-none">
                          &hellip;
                        </span>
                      );
                    }

                    const isCurrent = page === validCurrentPage;
                    return (
                      <button
                        key={`page-${page}`}
                        onClick={() => setCurrentPage(Number(page))}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-[#e95623] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalDailyPages, p + 1))}
                disabled={validCurrentPage >= totalDailyPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalDailyPages)}
                disabled={validCurrentPage >= totalDailyPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={16} />
              </button>

              {/* Jump to Page Form if more than 5 pages */}
              {totalDailyPages > 5 && (
                <form onSubmit={handleJumpPage} className="hidden lg:flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
                  <span className="text-slate-400 text-xs">Ke:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalDailyPages}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder={String(validCurrentPage)}
                    className="w-12 px-1.5 py-1 text-center text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#e95623]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY RECAPITULATION (W01–W53) WITH PAGINATION */}
      {activeTab === "weekly" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Laporan Rekapitulasi KPI Mingguan (W01–W53)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Ringkasan akumulasi tonase, rata-rata parameter operasional mingguan, dan perbandingan terhadap Plan KPI
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Tampilkan:</span>
              <select
                value={weeklyPageSize}
                onChange={(e) => {
                  setWeeklyPageSize(Number(e.target.value));
                  setWeeklyPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-[#e95623]"
              >
                <option value={10}>10 minggu</option>
                <option value={15}>15 minggu</option>
                <option value={25}>25 minggu</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Minggu</th>
                  <th className="px-4 py-3.5">Periode Tanggal</th>
                  <th className="px-3 py-3.5 text-center">Hari</th>
                  <th className="px-4 py-3.5 text-right">Total Produksi (Ton)</th>
                  <th className="px-3 py-3.5 text-center">PA (%)</th>
                  <th className="px-3 py-3.5 text-center">UA (%)</th>
                  <th className="px-3 py-3.5 text-center">Payload</th>
                  <th className="px-3 py-3.5 text-center">Cycle Time</th>
                  <th className="px-3 py-3.5 text-center">Fuel Ratio</th>
                  <th className="px-3 py-3.5 text-center">Unit</th>
                  <th className="px-3 py-3.5 text-center">TDP</th>
                  <th className="px-4 py-3.5 text-center">Status Pencapaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {weeklySummaryList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                      Tidak ada data mingguan tersedia untuk filter saat ini.
                    </td>
                  </tr>
                ) : (
                  paginatedWeeklyRecords.map((w) => {
                    const isPaAchieved = w.paActual >= w.paTarget;
                    const isUaAchieved = w.uaActual >= w.uaTarget;
                    const isPayloadAchieved = w.payloadActual >= w.payloadTarget;
                    const isCtAchieved = w.cycleTimeActual <= w.cycleTimeTarget;
                    const isFrAchieved = w.fuelRatioActual <= w.fuelRatioTarget;
                    const isTdpAchieved = w.tdpActual >= w.tdpTarget;

                    return (
                      <tr key={w.weekNumber} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white">
                            {w.weekNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-semibold">
                          {w.startDate} s/d {w.endDate}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center text-slate-700 font-bold">
                          {w.daysCount} Hari
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-black text-slate-900 text-[13px]">
                          {w.productionActual.toLocaleString("id-ID", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-[10px] text-slate-400 font-semibold">Ton</span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isPaAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {w.paActual.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isUaAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {w.uaActual.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center font-semibold">
                          <span className={isPayloadAchieved ? "text-slate-800" : "text-amber-700"}>
                            {w.payloadActual.toFixed(1)} T
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center font-semibold">
                          <span className={isCtAchieved ? "text-slate-800" : "text-amber-700"}>
                            {w.cycleTimeActual.toFixed(1)} J
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center font-semibold">
                          <span className={isFrAchieved ? "text-slate-800" : "text-amber-700"}>
                            {w.fuelRatioActual.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center font-semibold text-slate-800">
                          {w.unitRunningActual.toFixed(1)}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center font-semibold">
                          <span className={isTdpAchieved ? "text-slate-800" : "text-amber-700"}>
                            {w.tdpActual.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {w.kpiAchievedRatio}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Weekly Pagination Controls */}
          {totalWeeklyPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200/80 bg-white flex items-center justify-between gap-4 print:hidden">
              <span className="text-xs text-slate-600 font-medium">
                Halaman <strong className="text-slate-900">{validWeeklyPage}</strong> dari{" "}
                <strong className="text-slate-900">{totalWeeklyPages}</strong> ({totalWeeklyRecords} Minggu)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWeeklyPage((p) => Math.max(1, p - 1))}
                  disabled={validWeeklyPage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>

                {Array.from({ length: totalWeeklyPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={`w-page-${p}`}
                    onClick={() => setWeeklyPage(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                      p === validWeeklyPage
                        ? "bg-[#e95623] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setWeeklyPage((p) => Math.min(totalWeeklyPages, p + 1))}
                  disabled={validWeeklyPage >= totalWeeklyPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40"
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MONTHLY RECAPITULATION */}
      {activeTab === "monthly" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4.5 border-b border-slate-200/80 bg-slate-50/60">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Laporan Rekapitulasi Produksi Bulanan
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Evaluasi ketercapaian target tonase bulanan (Base 398.000 Ton / Q4 671.000 Ton) dan rata-rata parameter teknis
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Bulan</th>
                  <th className="px-3 py-3.5 text-center">Hari Operasi</th>
                  <th className="px-4 py-3.5 text-right">Plan Tonase</th>
                  <th className="px-4 py-3.5 text-right">Realisasi Tonase</th>
                  <th className="px-4 py-3.5 text-right">Selisih (+/- Ton)</th>
                  <th className="px-4 py-3.5 text-center">% Capai Plan</th>
                  <th className="px-3 py-3.5 text-center">PA (%)</th>
                  <th className="px-3 py-3.5 text-center">UA (%)</th>
                  <th className="px-3 py-3.5 text-center">Payload</th>
                  <th className="px-3 py-3.5 text-center">Cycle Time</th>
                  <th className="px-3 py-3.5 text-center">Fuel Ratio</th>
                  <th className="px-3 py-3.5 text-center">TDP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthlySummaryList.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                      Tidak ada data bulanan yang tersedia.
                    </td>
                  </tr>
                ) : (
                  monthlySummaryList.map((m) => {
                    const isAchieved = m.achievementPercent >= 100;
                    return (
                      <tr key={m.monthKey} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {m.monthLabel}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-bold text-slate-700">
                          {m.daysCount} Hari
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right font-semibold text-slate-600">
                          {m.planTonase.toLocaleString("id-ID")} Ton
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right font-black text-slate-900 text-sm">
                          {m.totalProduction.toLocaleString("id-ID", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}{" "}
                          Ton
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right font-bold">
                          <span
                            className={
                              m.varianceTon >= 0 ? "text-emerald-700" : "text-rose-600"
                            }
                          >
                            {m.varianceTon >= 0 ? "+" : ""}
                            {m.varianceTon.toLocaleString("id-ID", {
                              maximumFractionDigits: 1,
                            })}{" "}
                            Ton
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                              isAchieved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {m.achievementPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-bold text-slate-800">
                          {m.avgPa.toFixed(1)}%
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-bold text-slate-800">
                          {m.avgUa.toFixed(1)}%
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                          {m.avgPayload.toFixed(1)} T
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                          {m.avgCt.toFixed(1)} J
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                          {m.avgFr.toFixed(2)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center font-semibold text-slate-800">
                          {m.avgTdp.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Signature Section (visible only on print) */}
      <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-slate-300 text-center text-xs">
        <div>
          <p className="text-slate-500 font-semibold mb-16">Dibuat Oleh:</p>
          <p className="font-bold text-slate-900 border-b border-slate-400 pb-1">
            {user.name}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{user.role} - Operational Data</p>
        </div>
        <div>
          <p className="text-slate-500 font-semibold mb-16">Diperiksa Oleh:</p>
          <p className="font-bold text-slate-900 border-b border-slate-400 pb-1">
            Production Foreman / Supervisor
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Coal Hauling Division</p>
        </div>
        <div>
          <p className="text-slate-500 font-semibold mb-16">Disetujui Oleh:</p>
          <p className="font-bold text-slate-900 border-b border-slate-400 pb-1">
            Project Manager / Superintendent
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">PT Batara Dharma Persada</p>
        </div>
      </div>
    </div>
  );
};
