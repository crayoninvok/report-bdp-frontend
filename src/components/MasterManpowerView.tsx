"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  manpowerService,
  MasterManpowerItem,
  ManpowerStats,
} from "../services/manpowerService";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Filter,
  Building2,
  Briefcase,
  UserCheck,
  UserX,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  MapPin,
  Eye,
  X,
  CreditCard,
  HardHat,
  GraduationCap,
  HeartPulse,
  Phone,
  Mail,
  Home,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface MasterManpowerViewProps {
  user: User;
}

export const MasterManpowerView: React.FC<MasterManpowerViewProps> = ({ user }) => {
  // Data States
  const [manpowerList, setManpowerList] = useState<MasterManpowerItem[]>([]);
  const [stats, setStats] = useState<ManpowerStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusKeaktifan, setStatusKeaktifan] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedStatusEmp, setSelectedStatusEmp] = useState<string>("all");
  const [selectedPOH, setSelectedPOH] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const pageSize = 25;

  // Selected Employee for Detail Modal
  const [selectedEmployee, setSelectedEmployee] = useState<MasterManpowerItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"personal" | "pekerjaan" | "payroll" | "k3" | "pendidikan">("personal");

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");

      const [listRes, statsRes] = await Promise.all([
        manpowerService.getList({
          search: searchQuery,
          statusKeaktifan,
          branchName: selectedBranch,
          organization: selectedOrg,
          statusEmployee: selectedStatusEmp,
          pointOfHire: selectedPOH,
          page: currentPage,
          limit: pageSize,
        }),
        manpowerService.getStats(),
      ]);

      if (listRes.success) {
        setManpowerList(listRes.data);
        setTotalPages(listRes.pagination.totalPages);
        setTotalRecords(listRes.pagination.total);
      }

      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err: any) {
      console.error("Gagal memuat data manpower:", err);
      setErrorMsg(err.message || "Gagal memuat data manpower.");
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    statusKeaktifan,
    selectedBranch,
    selectedOrg,
    selectedStatusEmp,
    selectedPOH,
    currentPage,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Sync Trigger from Google Sheets
  const handleSyncFromSheet = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage("");
      setErrorMsg("");

      const res = await manpowerService.sync();
      if (res.success) {
        setSyncMessage(res.message);
        await loadData();
      } else {
        setErrorMsg(res.message || "Sinkronisasi gagal.");
      }
    } catch (err: any) {
      console.error("Error syncing manpower:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat sinkronisasi Google Sheet.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Export Table Data to CSV
  const handleExportCSV = () => {
    if (!manpowerList || manpowerList.length === 0) return;

    const headers = [
      "No",
      "Status Keaktifan",
      "Employee ID",
      "Nama Lengkap",
      "Jabatan",
      "Departemen",
      "Site/Cabang",
      "Status Kontrak",
      "POH",
      "Tanggal Masuk",
      "Email",
      "No HP",
      "Kota/Kabupaten",
    ];

    const rows = manpowerList.map((m, idx) => [
      (currentPage - 1) * pageSize + idx + 1,
      m.statusKeaktifan,
      m.employeeId,
      m.fullName,
      m.jobPosition || "-",
      m.organization || "-",
      m.branchName || "-",
      m.statusEmployee || "-",
      m.pointOfHire || "-",
      m.joinDate || "-",
      m.email || "-",
      m.mobilePhone || "-",
      m.kota || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Manpower_Batara_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Distinct organizations list for filter
  const organizations = useMemo(() => {
    return stats?.byOrganization?.map((o) => o.name) || [];
  }, [stats]);

  // Distinct branches list for filter
  const branches = useMemo(() => {
    return stats?.byBranch?.map((b) => b.name) || [];
  }, [stats]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & GOOGLE SPREADSHEET SYNC BAR */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#e95623]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Users className="w-3.5 h-3.5 text-[#e95623]" />
                Human Resource & Development
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Live Google Sheet Sync (Sheet: Data Mentah)
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Master Manpower Data
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Direktori terpusat seluruh tenaga kerja PT Batara Dharma Persada. Data terhubung otomatis ke spreadsheet resmi tim HR.
            </p>
          </div>

          {/* Action Buttons: Sync & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncFromSheet}
              disabled={isSyncing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#e95623] ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Google Sheet"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isLoading || manpowerList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d4481b] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Sync Success / Error Notification */}
        {syncMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage("")} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-700 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. EXECUTIVE SUMMARY CARDS (HEADCOUNT & DEMOGRAPHICS) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Manpower Terdaftar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Terdaftar
            </span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.totalAll || 0}
              <span className="text-xs font-semibold text-slate-500 ml-1.5">Orang</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Akumulasi keseluruhan data historis karyawan
            </p>
          </div>
        </div>

        {/* Card 2: Karyawan Aktif (Exist) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Karyawan Aktif
            </span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.totalExist || 0}
              <span className="text-xs font-semibold text-emerald-700 ml-1.5 font-bold">
                {stats?.totalAll ? ((stats.totalExist / stats.totalAll) * 100).toFixed(1) : 0}% Aktif
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Status Keaktifan: <strong className="text-slate-700">Exist</strong> (operasional berjalan)
            </p>
          </div>
        </div>

        {/* Card 3: Karyawan Non-Aktif (Exit / Resign) */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Karyawan Non-Aktif
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <UserX className="w-4 h-4 text-rose-600" />
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-rose-600 tracking-tight">
              {stats?.totalExit || 0}
              <span className="text-xs font-semibold text-rose-500 ml-1.5">
                {stats?.totalAll ? ((stats.totalExit / stats.totalAll) * 100).toFixed(1) : 0}% Exit
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Resign / masa kontrak berakhir
            </p>
          </div>
        </div>

        {/* Card 4: Sebaran Site Operasional */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Sebaran Jobsite
            </span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#e95623]" />
            </span>
          </div>
          <div className="space-y-1 text-xs">
            {stats?.byBranch && stats.byBranch.length > 0 ? (
              stats.byBranch.slice(0, 3).map((b, i) => (
                <div key={i} className="flex justify-between items-center text-slate-700">
                  <span className="truncate max-w-[120px]">{b.name}:</span>
                  <span className="font-bold text-slate-900">{b.exist} Aktif</span>
                </div>
              ))
            ) : (
              <span className="text-slate-400 text-xs">Memuat data site...</span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. FILTER TOOLBAR & REAL-TIME SEARCH */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nama, Employee ID, NIK, Jabatan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
            />
          </div>

          {/* Filter Status Keaktifan */}
          <div>
            <select
              value={statusKeaktifan}
              onChange={(e) => {
                setStatusKeaktifan(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="all">Semua Status Keaktifan</option>
              <option value="Exist">Aktif (Exist)</option>
              <option value="Exit">Non-Aktif (Exit)</option>
            </select>
          </div>

          {/* Filter Site / Cabang */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="all">Semua Site / Cabang</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Departemen / Organization */}
          <div>
            <select
              value={selectedOrg}
              onChange={(e) => {
                setSelectedOrg(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="all">Semua Departemen</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>

          {/* Filter POH (Point of Hire) */}
          <div>
            <select
              value={selectedPOH}
              onChange={(e) => {
                setSelectedPOH(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="all">Semua POH</option>
              <option value="Lokal">Lokal</option>
              <option value="Non Lokal">Non Lokal</option>
            </select>
          </div>
        </div>

        {/* Quick Reset & Total Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <strong>{manpowerList.length}</strong> dari <strong>{totalRecords}</strong> data karyawan
            </span>
            {(searchQuery || statusKeaktifan !== "all" || selectedBranch !== "all" || selectedOrg !== "all" || selectedPOH !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusKeaktifan("all");
                  setSelectedBranch("all");
                  setSelectedOrg("all");
                  setSelectedStatusEmp("all");
                  setSelectedPOH("all");
                  setCurrentPage(1);
                }}
                className="text-[#e95623] hover:underline font-bold text-xs cursor-pointer ml-2"
              >
                Reset Filter
              </button>
            )}
          </div>

          {stats?.lastSync && (
            <span className="text-[11px] text-slate-400">
              Sinkronisasi Terakhir: {new Date(stats.lastSync).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. MASTER MANPOWER DATA TABLE */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Site / Cabang</th>
                <th className="py-3 px-4">Status Kerja</th>
                <th className="py-3 px-4">POH</th>
                <th className="py-3 px-4">Tgl Masuk</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#e95623] mb-2" />
                    <span>Memuat data master manpower...</span>
                  </td>
                </tr>
              ) : manpowerList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Tidak ada data karyawan yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                manpowerList.map((m, idx) => {
                  const isExist = m.statusKeaktifan?.toLowerCase() === "exist";
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedEmployee(m)}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Status Keaktifan */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isExist
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExist ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {m.statusKeaktifan || "Exit"}
                        </span>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {m.employeeId}
                      </td>

                      {/* Full Name */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 group-hover:text-[#e95623] transition-colors">
                          {m.fullName}
                        </p>
                        {m.email && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {m.email}
                          </p>
                        )}
                      </td>

                      {/* Jabatan */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {m.jobPosition || "-"}
                      </td>

                      {/* Departemen */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700 text-[11px]">
                          {m.organization || "-"}
                        </span>
                      </td>

                      {/* Site / Cabang */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {m.branchName || "-"}
                      </td>

                      {/* Status Kerja */}
                      <td className="py-3 px-4 text-slate-600">
                        {m.statusEmployee || "-"}
                      </td>

                      {/* POH */}
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {m.pointOfHire || "-"}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {m.joinDate || "-"}
                      </td>

                      {/* Aksi Button */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedEmployee(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
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
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
            <div>
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({totalRecords} total karyawan)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold transition-colors cursor-pointer"
              >
                Sebelumnya
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                    if (p > totalPages) p = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === p
                          ? "bg-[#e95623] text-white"
                          : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold transition-colors cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. EMPLOYEE DETAIL DOSSIER MODAL (FULL 72 FIELDS) */}
      {/* ============================================================== */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#e95623] flex items-center justify-center font-black text-lg border border-orange-200 shrink-0">
                  {selectedEmployee.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      {selectedEmployee.fullName}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedEmployee.statusKeaktifan?.toLowerCase() === "exist"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {selectedEmployee.statusKeaktifan || "Exit"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">{selectedEmployee.employeeId}</span>
                    <span>•</span>
                    <span>{selectedEmployee.jobPosition || "-"}</span>
                    <span>•</span>
                    <span>{selectedEmployee.organization || "-"}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/30 px-6 overflow-x-auto gap-4 text-xs font-bold">
              {[
                { id: "personal", label: "Informasi Personal", icon: Users },
                { id: "pekerjaan", label: "Pekerjaan & Jabatan", icon: Briefcase },
                { id: "payroll", label: "Penggajian, Pajak & BPJS", icon: CreditCard },
                { id: "k3", label: "K3, MCU & APD", icon: HardHat },
                { id: "pendidikan", label: "Pendidikan & Pelatihan", icon: GraduationCap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeModalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={`py-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "border-[#e95623] text-[#e95623]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {activeModalTab === "personal" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">NIK (KTP)</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.nik || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tempat / Tanggal Lahir</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.birthPlace ? `${selectedEmployee.birthPlace}, ` : ""}
                      {selectedEmployee.birthDate || "-"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Usia</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.age || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Jenis Kelamin / Agama</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.gender || "-"} / {selectedEmployee.religion || "-"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Pernikahan / Gol. Darah</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.maritalStatus || "-"} ({selectedEmployee.bloodType || "-"})
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">No. Handphone / WhatsApp</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.mobilePhone || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Alamat KTP</span>
                    <span className="font-medium text-slate-800">{selectedEmployee.citizenIdAddress || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Alamat Domisili</span>
                    <span className="font-medium text-slate-800">{selectedEmployee.residentialAddress || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Kota / Kabupaten</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.kota || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Provinsi</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.provinsi || "-"}</span>
                  </div>
                </div>
              )}

              {activeModalTab === "pekerjaan" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Employee ID</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.employeeId}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Job Position (Jabatan)</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.jobPosition || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Job Level</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.jobLevel || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Departemen (Organization)</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.organization || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Site / Cabang Penempatan</span>
                    <span className="font-bold text-[#e95623]">{selectedEmployee.branchName || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Point of Hire (POH)</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.pointOfHire || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Karyawan</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.statusEmployee || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Masa Kerja (Length of Service)</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.lengthOfService || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tanggal Masuk (Join Date)</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.joinDate || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tanggal Berakhir Kontrak (End Date)</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.endDate || "-"}</span>
                  </div>
                  {selectedEmployee.resignDate && (
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 sm:col-span-2">
                      <span className="text-[10px] font-bold text-rose-500 uppercase block">Tanggal Resign / Keluar</span>
                      <span className="font-bold text-rose-800">{selectedEmployee.resignDate}</span>
                    </div>
                  )}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Approval Line / Manager</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.manager || selectedEmployee.approvalLine || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Cost Center</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.costCenter || "-"}</span>
                  </div>
                </div>
              )}

              {activeModalTab === "payroll" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nomor NPWP</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.npwp || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status PTKP & Pajak</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.ptkpStatus || "-"} / {selectedEmployee.employeeTaxStatus || "-"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nama Bank</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.bankName || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nomor Rekening Bank</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.bankAccount || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Nama Pemilik Rekening</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.bankAccountHolder || selectedEmployee.fullName}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">BPJS Ketenagakerjaan</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.bpjsKetenagakerjaan || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">BPJS Kesehatan</span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmployee.bpjsKesehatan || "-"}</span>
                  </div>
                </div>
              )}

              {activeModalTab === "k3" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tinggi / Berat Badan</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.tinggiBadan ? `${selectedEmployee.tinggiBadan} cm` : "-"} /{" "}
                      {selectedEmployee.beratBadan ? `${selectedEmployee.beratBadan} kg` : "-"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ukuran Seragam (Baju / Celana)</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.ukuranBaju || "-"} / {selectedEmployee.ukuranCelana || "-"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Warna Helm & Safety Shoes</span>
                    <span className="font-bold text-slate-900">
                      Helm: {selectedEmployee.warnaHelm || "-"} • Sepatu: {selectedEmployee.safetyShoes || "-"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tgl Terakhir MCU & Follow Up</span>
                    <span className="font-bold text-slate-900">
                      {selectedEmployee.tglTerakhirMcu || "-"} {selectedEmployee.followUpMcu ? `(${selectedEmployee.followUpMcu})` : ""}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Sertifikasi yang Dimiliki</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.sertifikasi || "Belum ada catatan sertifikasi"}</span>
                  </div>
                </div>
              )}

              {activeModalTab === "pendidikan" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Pendidikan Terakhir</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.pendidikan || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Jurusan</span>
                    <span className="font-bold text-slate-900">{selectedEmployee.jurusan || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Training Internal</span>
                    <span className="font-medium text-slate-800">{selectedEmployee.trainingInternal || "-"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Training External</span>
                    <span className="font-medium text-slate-800">{selectedEmployee.trainingExternal || "-"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

