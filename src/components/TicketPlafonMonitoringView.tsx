"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  CreditCard,
  Calendar,
  Plane,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  History,
  Settings2,
  RefreshCw,
  Building2,
  MapPin,
  TrendingDown,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { User } from "../types/auth";
import {
  TicketPlafonItem,
  TicketPlafonSummary,
  TicketUsageHistoryItem,
  getTicketPlafonList,
  recordTicketUsage,
  getTicketHistory,
  updatePlafonConfig,
  resetPlafonManual,
} from "../services/ticketPlafonService";

interface TicketPlafonMonitoringViewProps {
  user: User | null;
}

export default function TicketPlafonMonitoringView({ user }: TicketPlafonMonitoringViewProps) {
  // State
  const [data, setData] = useState<TicketPlafonItem[]>([]);
  const [summary, setSummary] = useState<TicketPlafonSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeSiteTab, setActiveSiteTab] = useState<"Senyiur" | "Muara Pahu" | "Head Office Jakarta" | "ALL">("Senyiur");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [plafonStatusFilter, setPlafonStatusFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Modals
  const [selectedEmployee, setSelectedEmployee] = useState<TicketPlafonItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Form states for Record Ticket
  const [ticketForm, setTicketForm] = useState({
    ticketNumber: "",
    destination: "BPN - CGK",
    airline: "Batik Air",
    departureDate: new Date().toISOString().split("T")[0],
    returnDate: "",
    ticketCost: 1500000,
    notes: "Cuti Rooster" as "Cuti Rooster" | "On Site" | "Perjalanan Dinas",
    dinasBookingType: "BERANGKAT" as "BERANGKAT" | "PULANG" | "PP",
    additionalNotes: "",
  });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState<boolean>(false);

  // Form states for History
  const [historyList, setHistoryList] = useState<TicketUsageHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Form states for Edit Plafon
  const [editPlafonAmount, setEditPlafonAmount] = useState<number>(5500000);
  const [editPlafonNotes, setEditPlafonNotes] = useState<string>("");
  const [isSubmittingConfig, setIsSubmittingConfig] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Data
  const fetchData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getTicketPlafonList({
        site: activeSiteTab,
        search: searchQuery,
        department: departmentFilter !== "ALL" ? departmentFilter : undefined,
      });

      if (res.success) {
        setData(res.data);
        setSummary(res.summary);
      } else {
        setError(res.message || "Gagal mengambil data plafon tiket.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSiteTab]);

  // Handle Search Debounced / Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.organization) set.add(item.organization);
    });
    return Array.from(set).sort();
  }, [data]);

  // Client-side filtering for search & status
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.fullName.toLowerCase().includes(q);
        const matchNik = item.employeeId.toLowerCase().includes(q);
        const matchPos = (item.jobPosition || "").toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchPos) return false;
      }

      // Department
      if (departmentFilter !== "ALL" && item.organization !== departmentFilter) {
        return false;
      }

      // Plafon Status Filter
      if (plafonStatusFilter === "FULL") {
        if (item.usedAmount > 0) return false;
      } else if (plafonStatusFilter === "PARTIAL") {
        if (item.usedAmount === 0 || item.remainingAmount === 0) return false;
      } else if (plafonStatusFilter === "EMPTY") {
        if (item.remainingAmount > 0) return false;
      } else if (plafonStatusFilter === "CYCLE_ACTIVE") {
        if (!item.lastDepartureDate) return false;
      }

      return true;
    });
  }, [data, searchQuery, departmentFilter, plafonStatusFilter]);

  // Reset to page 1 whenever filters or rowsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSiteTab, searchQuery, departmentFilter, plafonStatusFilter, rowsPerPage]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  // Currency Formatter
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Date Formatter
  const formatDate = (val: string | null) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return val;
    }
  };

  // Calculate 2-month auto reset date preview
  const previewNextResetDate = useMemo(() => {
    const targetDateStr =
      ticketForm.notes === "Perjalanan Dinas" &&
      ticketForm.dinasBookingType === "PP" &&
      ticketForm.returnDate
        ? ticketForm.returnDate
        : ticketForm.departureDate;

    if (!targetDateStr) return "-";
    const dep = new Date(targetDateStr);
    if (isNaN(dep.getTime())) return "-";
    const reset = new Date(dep);
    reset.setMonth(reset.getMonth() + 2);
    return formatDate(reset.toISOString());
  }, [ticketForm.departureDate, ticketForm.returnDate, ticketForm.notes, ticketForm.dinasBookingType]);

  // Open Record Modal
  const handleOpenRecordModal = (emp: TicketPlafonItem) => {
    setSelectedEmployee(emp);
    setTicketForm({
      ticketNumber: "",
      destination: "BPN - CGK",
      airline: "Batik Air",
      departureDate: new Date().toISOString().split("T")[0],
      returnDate: "",
      ticketCost: 1500000,
      notes: "Cuti Rooster",
      dinasBookingType: "BERANGKAT",
      additionalNotes: "",
    });
    setIsRecordModalOpen(true);
  };

  // Submit Ticket Record
  const handleSubmitTicketRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      setIsSubmittingTicket(true);

      const finalDepDate = ticketForm.departureDate;
      const finalRetDate =
        ticketForm.notes === "Perjalanan Dinas" && ticketForm.dinasBookingType === "PP"
          ? ticketForm.returnDate || undefined
          : undefined;

      let combinedNotes: string = ticketForm.notes;
      if (ticketForm.notes === "Perjalanan Dinas") {
        const dinasLabel =
          ticketForm.dinasBookingType === "BERANGKAT"
            ? "Berangkat"
            : ticketForm.dinasBookingType === "PULANG"
            ? "Pulang"
            : "PP (Pulang-Pergi)";
        combinedNotes = `Perjalanan Dinas (${dinasLabel})`;
      }

      if (ticketForm.additionalNotes.trim()) {
        combinedNotes += ` - ${ticketForm.additionalNotes.trim()}`;
      }

      const res = await recordTicketUsage({
        employeeId: selectedEmployee.employeeId,
        ticketNumber: ticketForm.ticketNumber,
        destination: ticketForm.destination,
        airline: ticketForm.airline,
        departureDate: finalDepDate,
        returnDate: finalRetDate,
        ticketCost: Number(ticketForm.ticketCost),
        notes: combinedNotes,
      });

      if (res.success) {
        showToast(res.message || "Penggunaan tiket berhasil dicatat!", "success");
        setIsRecordModalOpen(false);
        fetchData(true);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat tiket.", "error");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Open History Modal
  const handleOpenHistoryModal = async (emp: TicketPlafonItem) => {
    setSelectedEmployee(emp);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await getTicketHistory(emp.employeeId);
      if (res.success) {
        setHistoryList(res.data.history);
      }
    } catch (err: any) {
      showToast("Gagal memuat riwayat: " + err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open Config Modal
  const handleOpenConfigModal = (emp: TicketPlafonItem) => {
    setSelectedEmployee(emp);
    setEditPlafonAmount(emp.plafonAmount);
    setEditPlafonNotes(emp.notes || "");
    setIsConfigModalOpen(true);
  };

  // Submit Config
  const handleSubmitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      setIsSubmittingConfig(true);
      const res = await updatePlafonConfig(selectedEmployee.employeeId, {
        plafonAmount: Number(editPlafonAmount),
        notes: editPlafonNotes,
      });

      if (res.success) {
        showToast("Plafon berhasil disesuaikan!", "success");
        setIsConfigModalOpen(false);
        fetchData(true);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah plafon.", "error");
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  // Manual Reset
  const handleManualReset = async (emp: TicketPlafonItem) => {
    if (!confirm(`Reset plafon tiket untuk ${emp.fullName} (${emp.employeeId}) kembali ke Rp ${emp.plafonAmount.toLocaleString("id-ID")}?`)) {
      return;
    }
    try {
      const res = await resetPlafonManual(emp.employeeId);
      if (res.success) {
        showToast(res.message, "success");
        fetchData(true);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mereset plafon.", "error");
    }
  };

  // Export filtered view to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      showToast("Tidak ada data untuk diekspor.", "info");
      return;
    }

    const headers = [
      "NIK / ID",
      "Nama Karyawan",
      "Jabatan",
      "Departemen",
      "Site",
      "Point of Hire",
      "Status",
      "Plafon Alokasi (Rp)",
      "Plafon Terpakai (Rp)",
      "Sisa Plafon (Rp)",
      "Persentase Terpakai (%)",
      "Tiket Terakhir",
      "Jadwal Reset Otomatis (2 Bulan)",
      "Sisa Hari Menuju Reset",
    ];

    const rows = filteredData.map((d) => [
      `"${d.employeeId}"`,
      `"${d.fullName}"`,
      `"${d.jobPosition || "-"}"`,
      `"${d.organization || "-"}"`,
      `"${d.site}"`,
      `"${d.pointOfHire || "-"}"`,
      `"${d.jobStatus || "-"}"`,
      d.plafonAmount,
      d.usedAmount,
      d.remainingAmount,
      d.plafonAmount > 0 ? ((d.usedAmount / d.plafonAmount) * 100).toFixed(1) : 0,
      `"${formatDate(d.lastDepartureDate)}"`,
      `"${formatDate(d.nextResetDate)}"`,
      d.daysUntilReset !== null ? d.daysUntilReset : "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Ticket_Plafon_${activeSiteTab}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-bounce ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : toastMessage.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Plane className="w-3.5 h-3.5" />
              Human Resource & Development • Plafon Tiket
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Ticket Plafon Controlling
            </h1>
            <p className="text-blue-100/80 text-sm mt-1 max-w-2xl leading-relaxed">
              Monitoring plafon tiket penerbangan karyawan Non-Lokal (Senyiur & Muara Pahu). Default plafon{" "}
              <span className="font-semibold text-amber-300">Rp 5.500.000,00</span> per orang dengan siklus reset otomatis{" "}
              <span className="font-semibold text-emerald-300">2 bulan</span> dari tanggal tiket keberangkatan.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-semibold backdrop-blur-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Memperbarui..." : "Refresh Data"}
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-md transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Site Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSiteTab("Senyiur")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSiteTab === "Senyiur"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Site Senyiur
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeSiteTab === "Senyiur"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {summary?.totalSenyiur ?? 159}
            </span>
          </button>

          <button
            onClick={() => setActiveSiteTab("Muara Pahu")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSiteTab === "Muara Pahu"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            Site Muara Pahu
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeSiteTab === "Muara Pahu"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {summary?.totalMuaraPahu ?? 109}
            </span>
          </button>

          <button
            onClick={() => setActiveSiteTab("Head Office Jakarta")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSiteTab === "Head Office Jakarta"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            Head Office Jakarta
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeSiteTab === "Head Office Jakarta"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {summary?.totalHoJakarta ?? 27}
            </span>
          </button>

          <button
            onClick={() => setActiveSiteTab("ALL")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSiteTab === "ALL"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            Semua Site (Total Non Lokal)
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeSiteTab === "ALL"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {summary?.totalNonLokalAll ?? 295}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Manpower Non Lokal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Manpower Non Lokal
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {summary ? summary.totalEmployees : "-"}
              <span className="text-xs font-semibold text-slate-500 ml-1.5">Karyawan</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{activeSiteTab === "ALL" ? "Seluruh Jobsite" : `Khusus ${activeSiteTab}`}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Alokasi Plafon */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Alokasi Plafon
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-slate-900 truncate" title={summary ? formatRupiah(summary.totalPlafonAllocated) : ""}>
              {summary ? formatRupiah(summary.totalPlafonAllocated) : "-"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Default: Rp 5.500.000 / org
            </div>
          </div>
        </div>

        {/* Card 3: Plafon Terpakai */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Plafon Terpakai
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Plane className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-amber-600 truncate" title={summary ? formatRupiah(summary.totalPlafonUsed) : ""}>
              {summary ? formatRupiah(summary.totalPlafonUsed) : "-"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary ? `${summary.countActiveTicketUsage} karyawan aktif` : "-"}
            </div>
          </div>
        </div>

        {/* Card 4: Sisa Plafon */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Sisa Saldo Plafon
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-emerald-600 truncate" title={summary ? formatRupiah(summary.totalPlafonRemaining) : ""}>
              {summary ? formatRupiah(summary.totalPlafonRemaining) : "-"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Tersedia untuk tiket berikutnya
            </div>
          </div>
        </div>

        {/* Card 5: Auto-Reset 2 Bulan */}
        <div className="bg-linear-to-br from-purple-50 to-indigo-50/50 rounded-2xl p-5 border border-purple-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              Siklus Reset 2 Bulan
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-base font-black text-purple-900">
              Otomatis 2 Bulan
            </div>
            <div className="text-[11px] text-purple-700 mt-1 font-medium">
              Dari tanggal tiket keberangkatan
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIK, Nama Karyawan, atau Jabatan..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
            />
          </form>

          {/* Department & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Semua Departemen ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Plafon Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={plafonStatusFilter}
                onChange={(e) => setPlafonStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Semua Status Plafon</option>
                <option value="FULL">Plafon Utuh (Rp 5.500.000)</option>
                <option value="PARTIAL">Sebagian Terpakai</option>
                <option value="EMPTY">Plafon Habis</option>
                <option value="CYCLE_ACTIVE">Sedang Berjalan (Ada Tiket)</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium ml-auto">
              Menampilkan <span className="font-bold text-slate-900">{filteredData.length}</span> dari{" "}
              {data.length} karyawan
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-500">Memuat Data Manpower & Plafon Tiket...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">{error}</p>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Tidak ada data karyawan ditemukan</h3>
            <p className="text-xs text-slate-400">
              Coba sesuaikan kata kunci pencarian atau filter departemen.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Jabatan & Organisasi</th>
                  <th className="py-3 px-4">Site & POH</th>
                  <th className="py-3 px-4 text-right">Alokasi Plafon</th>
                  <th className="py-3 px-4 text-right">Terpakai</th>
                  <th className="py-3 px-4 text-right">Sisa Saldo</th>
                  <th className="py-3 px-4 text-center">Tiket Terakhir</th>
                  <th className="py-3 px-4 text-center">Siklus Reset 2 Bulan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((emp, idx) => {
                  const usedPercent =
                    emp.plafonAmount > 0
                      ? Math.min(100, Math.round((emp.usedAmount / emp.plafonAmount) * 100))
                      : 0;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {startIndex + idx + 1}
                      </td>

                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {emp.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                              <span>NIK: {emp.employeeId}</span>
                              {emp.jobStatus && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold">
                                  {emp.jobStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job & Org */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {emp.jobPosition || "-"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {emp.organization || "-"}
                        </div>
                      </td>

                      {/* Site & POH */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                              emp.site === "Senyiur"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : emp.site === "Muara Pahu"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            {emp.site}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded w-fit border border-amber-200">
                            {emp.pointOfHire || "Non Lokal"}
                          </span>
                        </div>
                      </td>

                      {/* Plafon Amount */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {formatRupiah(emp.plafonAmount)}
                        </div>
                        <button
                          onClick={() => handleOpenConfigModal(emp)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          <Settings2 className="w-2.5 h-2.5" />
                          Atur
                        </button>
                      </td>

                      {/* Used Amount */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`font-mono font-bold ${
                            emp.usedAmount > 0 ? "text-amber-600" : "text-slate-400"
                          }`}
                        >
                          {formatRupiah(emp.usedAmount)}
                        </div>
                        <div className="w-24 ml-auto mt-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usedPercent > 80
                                ? "bg-rose-500"
                                : usedPercent > 40
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {usedPercent}% terpakai
                        </div>
                      </td>

                      {/* Remaining Amount */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`font-mono font-extrabold ${
                            emp.remainingAmount === 0
                              ? "text-rose-600"
                              : emp.remainingAmount < emp.plafonAmount
                              ? "text-emerald-700"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatRupiah(emp.remainingAmount)}
                        </div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            emp.remainingAmount === 0
                              ? "bg-rose-100 text-rose-700"
                              : emp.remainingAmount < emp.plafonAmount
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {emp.remainingAmount === 0
                            ? "Habis"
                            : emp.remainingAmount < emp.plafonAmount
                            ? "Sebagian"
                            : "Utuh"}
                        </span>
                      </td>

                      {/* Last Departure */}
                      <td className="py-3 px-4 text-center">
                        {emp.lastDepartureDate ? (
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-slate-800">
                              {formatDate(emp.lastDepartureDate)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {emp.ticketCount}x tiket
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum ada tiket</span>
                        )}
                      </td>

                      {/* 2 Months Reset Cycle */}
                      <td className="py-3 px-4 text-center">
                        {emp.nextResetDate ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-slate-800 text-[11px]">
                              {formatDate(emp.nextResetDate)}
                            </span>
                            {emp.isResetEligible ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <RotateCcw className="w-2.5 h-2.5" />
                                Siap / Ter-reset
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Clock className="w-2.5 h-2.5" />
                                {emp.daysUntilReset !== null && emp.daysUntilReset >= 0
                                  ? `${emp.daysUntilReset} hari lagi`
                                  : "Siklus aktif"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Plafon Aktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Record Ticket Button */}
                          <button
                            onClick={() => handleOpenRecordModal(emp)}
                            title="Catat Tiket Keberangkatan"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 transition-all font-bold flex items-center gap-1 text-[11px]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tiket</span>
                          </button>

                          {/* History Button */}
                          <button
                            onClick={() => handleOpenHistoryModal(emp)}
                            title="Lihat Riwayat Tiket"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all text-[11px]"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Manual Reset Button */}
                          {emp.usedAmount > 0 && (
                            <button
                              onClick={() => handleManualReset(emp)}
                              title="Reset Manual Plafon"
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 transition-all text-[11px]"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredData.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              {/* Left: Row selector & Summary */}
              <div className="flex items-center gap-3 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span>Tampilkan:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={filteredData.length}>Semua ({filteredData.length})</option>
                  </select>
                  <span>per halaman</span>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span> -{" "}
                  <span className="font-bold text-slate-800">{endIndex}</span> dari{" "}
                  <span className="font-bold text-slate-800">{filteredData.length}</span> karyawan
                </div>
              </div>

              {/* Right: Page navigation buttons */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="Halaman Pertama"
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Halaman Sebelumnya"
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      const prev = array[index - 1];
                      const showEllipsis = prev && page - prev > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="px-1 text-slate-400 font-bold select-none">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-all ${
                              currentPage === page
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Halaman Berikutnya"
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Halaman Terakhir"
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* MODAL 1: CATAT PENGGUNAAN TIKET */}
      {isRecordModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-linear-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  Form Keberangkatan Tiket
                </div>
                <h3 className="text-lg font-bold mt-0.5">{selectedEmployee.fullName}</h3>
                <div className="text-xs text-blue-100/90 font-mono">
                  NIK: {selectedEmployee.employeeId} • Site: {selectedEmployee.site}
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Ribbon */}
            <div className="bg-blue-50/80 border-b border-blue-100 px-5 py-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Plafon Sekarang: </span>
                <span className="font-bold text-slate-800">
                  {formatRupiah(selectedEmployee.plafonAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Sisa Saldo: </span>
                <span className="font-extrabold text-emerald-700">
                  {formatRupiah(selectedEmployee.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitTicketRecord} className="p-5 space-y-4">
              {/* 1. Keperluan / Kategori Tiket */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keperluan / Kategori Tiket *
                </label>
                <select
                  required
                  value={ticketForm.notes}
                  onChange={(e) => {
                    const val = e.target.value as "Cuti Rooster" | "On Site" | "Perjalanan Dinas";
                    setTicketForm({
                      ...ticketForm,
                      notes: val,
                      destination:
                        val === "On Site"
                          ? "CGK - BPN"
                          : val === "Cuti Rooster"
                          ? "BPN - CGK"
                          : ticketForm.destination,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="Cuti Rooster">Cuti Rooster (Tiket Pulang Cuti)</option>
                  <option value="On Site">On Site (Tiket Keberangkatan ke Site)</option>
                  <option value="Perjalanan Dinas">Perjalanan Dinas (Fleksibel Berangkat/Pulang/PP)</option>
                </select>
              </div>

              {/* Sub-Pilihan Jika Perjalanan Dinas */}
              {ticketForm.notes === "Perjalanan Dinas" && (
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                  <label className="block text-[11px] font-bold text-blue-900">
                    Pilihan Pemesanan Tiket Dinas:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTicketForm({ ...ticketForm, dinasBookingType: "BERANGKAT" })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                        ticketForm.dinasBookingType === "BERANGKAT"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white border border-blue-200 text-blue-800 hover:bg-blue-100"
                      }`}
                    >
                      Berangkat Dulu
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketForm({ ...ticketForm, dinasBookingType: "PULANG" })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                        ticketForm.dinasBookingType === "PULANG"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white border border-blue-200 text-blue-800 hover:bg-blue-100"
                      }`}
                    >
                      Pesan Pulang
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketForm({ ...ticketForm, dinasBookingType: "PP" })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                        ticketForm.dinasBookingType === "PP"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white border border-blue-200 text-blue-800 hover:bg-blue-100"
                      }`}
                    >
                      Berangkat & Pulang (PP)
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Tanggal Input (Disesuaikan berdasarkan keperluan) */}
              {ticketForm.notes === "On Site" ? (
                /* On Site: Hanya 1 tanggal keberangkatan */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Tiket Keberangkatan (On Site) *
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      1 Tanggal Saja
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={ticketForm.departureDate}
                    onChange={(e) => setTicketForm({ ...ticketForm, departureDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tiket keberangkatan personel kembali bertugas ke jobsite.
                  </p>
                </div>
              ) : ticketForm.notes === "Cuti Rooster" ? (
                /* Cuti Rooster: Hanya 1 tanggal kepulangan */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Tiket Pulang (Cuti Rooster) *
                    </label>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      1 Tanggal Saja
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={ticketForm.departureDate}
                    onChange={(e) => setTicketForm({ ...ticketForm, departureDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tiket kepulangan personel dari jobsite ke domisili untuk jadwal cuti rooster.
                  </p>
                </div>
              ) : ticketForm.dinasBookingType === "PP" ? (
                /* Perjalanan Dinas PP: 2 Tanggal */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Keberangkatan Dinas *
                    </label>
                    <input
                      type="date"
                      required
                      value={ticketForm.departureDate}
                      onChange={(e) => setTicketForm({ ...ticketForm, departureDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Kepulangan Dinas *
                    </label>
                    <input
                      type="date"
                      required
                      value={ticketForm.returnDate}
                      onChange={(e) => setTicketForm({ ...ticketForm, returnDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              ) : ticketForm.dinasBookingType === "BERANGKAT" ? (
                /* Perjalanan Dinas: Berangkat Dulu */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Keberangkatan Dinas *
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Berangkat Dulu
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={ticketForm.departureDate}
                    onChange={(e) => setTicketForm({ ...ticketForm, departureDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pemesanan tiket keberangkatan dinas terlebih dahulu. Tiket pulang dapat dipesan menyusul.
                  </p>
                </div>
              ) : (
                /* Perjalanan Dinas: Pesan Pulang */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Kepulangan Dinas *
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Pesan Pulang
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={ticketForm.departureDate}
                    onChange={(e) => setTicketForm({ ...ticketForm, departureDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pemesanan tiket kepulangan dari dinas setelah tiket keberangkatan sebelumnya.
                  </p>
                </div>
              )}

              {/* 3. Detail Tiket */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* No Tiket */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Tiket / Booking Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketForm.ticketNumber}
                    onChange={(e) => setTicketForm({ ...ticketForm, ticketNumber: e.target.value })}
                    placeholder="Contoh: TJ8921 / 126-23490182"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Maskapai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maskapai Penerbangan
                  </label>
                  <select
                    value={ticketForm.airline}
                    onChange={(e) => setTicketForm({ ...ticketForm, airline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Batik Air">Batik Air</option>
                    <option value="Garuda Indonesia">Garuda Indonesia</option>
                    <option value="Lion Air">Lion Air</option>
                    <option value="Super Air Jet">Super Air Jet</option>
                    <option value="Citilink">Citilink</option>
                    <option value="Pelita Air">Pelita Air</option>
                    <option value="Wings Air">Wings Air</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Rute Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rute Penerbangan *
                </label>
                <input
                  type="text"
                  required
                  value={ticketForm.destination}
                  onChange={(e) => setTicketForm({ ...ticketForm, destination: e.target.value })}
                  placeholder="Contoh: BPN - CGK (Balikpapan - Jakarta)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Biaya Tiket */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biaya Tiket (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={ticketForm.ticketCost}
                    onChange={(e) => setTicketForm({ ...ticketForm, ticketCost: Number(e.target.value) })}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Format nominal: {formatRupiah(Number(ticketForm.ticketCost) || 0)}
                </div>
              </div>

              {/* Keterangan Tambahan (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={ticketForm.additionalNotes}
                  onChange={(e) => setTicketForm({ ...ticketForm, additionalNotes: e.target.value })}
                  placeholder="Contoh: Roster Periode Nov 2026, Meeting Koordinasi HO, dsb"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Auto Reset Preview Card */}
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5 text-xs">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                  Siklus Reset Otomatis 2 Bulan:
                </div>
                <div className="text-purple-800 text-[11px] leading-relaxed">
                  Plafon akan otomatis direset kembali ke Rp 5.500.000 pada tanggal{" "}
                  <span className="font-extrabold underline">{previewNextResetDate}</span> (2 bulan dari keberangkatan).
                </div>
                <div className="text-[11px] text-slate-600 pt-1 border-t border-purple-200/60 flex items-center justify-between">
                  <span>Estimasi Sisa Plafon Setelah Transaksi:</span>
                  <span
                    className={`font-mono font-bold ${
                      selectedEmployee.remainingAmount - Number(ticketForm.ticketCost) < 0
                        ? "text-rose-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatRupiah(Math.max(0, selectedEmployee.remainingAmount - Number(ticketForm.ticketCost)))}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmittingTicket && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingTicket ? "Menyimpan..." : "Simpan & Update Plafon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RIWAYAT PENGGUNAAN TIKET */}
      {isHistoryModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  Riwayat Penggunaan Tiket
                </div>
                <h3 className="text-lg font-bold mt-0.5">{selectedEmployee.fullName}</h3>
                <div className="text-xs text-slate-300 font-mono">
                  NIK: {selectedEmployee.employeeId} • Site: {selectedEmployee.site}
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              {loadingHistory ? (
                <div className="p-10 flex flex-col items-center justify-center gap-2">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-500 font-semibold">Memuat riwayat...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Plane className="w-9 h-9 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Belum ada catatan riwayat tiket untuk karyawan ini.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {historyList.map((item, idx) => (
                    <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-100 last:border-b-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {item.ticketNumber || `Tiket #${idx + 1}`}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {item.airline || "Maskapai"}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">
                            {item.destination || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Berangkat: <b>{formatDate(item.departureDate)}</b>
                          </span>
                          {item.returnDate && (
                            <span>
                              Pulang: <b>{formatDate(item.returnDate)}</b>
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-600 italic">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {formatRupiah(item.ticketCost)}
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PLAFON CONFIG */}
      {isConfigModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Konfigurasi Plafon Karyawan
                </div>
                <h3 className="text-lg font-bold mt-0.5">{selectedEmployee.fullName}</h3>
                <div className="text-xs text-slate-300 font-mono">NIK: {selectedEmployee.employeeId}</div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitConfig} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Alokasi Plafon (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100000}
                    value={editPlafonAmount}
                    onChange={(e) => setEditPlafonAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Default standar: Rp 5.500.000,00
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Penyesuaian
                </label>
                <textarea
                  rows={3}
                  value={editPlafonNotes}
                  onChange={(e) => setEditPlafonNotes(e.target.value)}
                  placeholder="Alasan perubahan plafon (misal: penyesuaian level manajemen atau dinas khusus)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConfig}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center gap-2"
                >
                  {isSubmittingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
