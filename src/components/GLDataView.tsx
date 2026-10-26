"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { User } from "../types/auth";
import {
  glService,
  GLPeriodItem,
  GLTransactionItem,
  GLPreviewData,
} from "../services/glService";
import {
  Upload,
  RefreshCw,
  Search,
  Calendar,
  Building2,
  TableProperties,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Download,
  FileSpreadsheet,
  Coins,
  MapPin,
  Tag,
} from "lucide-react";

interface GLDataViewProps {
  user: User;
}

export const GLDataView: React.FC<GLDataViewProps> = ({ user }) => {
  // Periods
  const [periods, setPeriods] = useState<GLPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [activePeriod, setActivePeriod] = useState<GLPeriodItem | null>(null);

  // Filters (Head Office omitted per requirement)
  const [selectedSite, setSelectedSite] = useState<"ALL" | "MPH" | "SNY">("ALL");
  const [txSearch, setTxSearch] = useState<string>("");
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("");

  // Data states
  const [transactions, setTransactions] = useState<GLTransactionItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });

  const [totalSiteCost, setTotalSiteCost] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTxLoading, setIsTxLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<GLPreviewData | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Initial load: Fetch periods
  const loadPeriods = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await glService.getPeriods();
      setPeriods(data);
      if (data.length > 0) {
        const initialPeriod = data[0];
        setSelectedPeriodId(initialPeriod.id);
        setActivePeriod(initialPeriod);
      } else {
        setSelectedPeriodId("");
        setActivePeriod(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat daftar periode GL.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  // Fetch summary totals for the active period (to show Total Biaya Site)
  useEffect(() => {
    if (!selectedPeriodId) {
      setTotalSiteCost(0);
      return;
    }
    const fetchTotals = async () => {
      try {
        const res = await glService.getExpenseSummaries(selectedPeriodId);
        if (res.period) {
          setActivePeriod(res.period);
        }
        if (res.totals) {
          setTotalSiteCost(res.totals.MPH + res.totals.SNY);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTotals();
  }, [selectedPeriodId]);

  // Load transactions when period, site filter, account filter change
  const loadTransactions = async (page = 1) => {
    if (!selectedPeriodId) return;
    setIsTxLoading(true);
    try {
      const res = await glService.getTransactions({
        periodId: selectedPeriodId,
        site: selectedSite !== "ALL" ? selectedSite : undefined,
        accountCode: selectedAccountFilter || undefined,
        q: txSearch,
        page,
        limit: pagination.limit,
      });
      setTransactions(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsTxLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
  }, [selectedPeriodId, selectedSite, selectedAccountFilter]);

  // Debounced search for transactions
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [txSearch]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (selectedPeriodId) {
      await loadTransactions(pagination.page);
      try {
        const res = await glService.getExpenseSummaries(selectedPeriodId);
        if (res.totals) {
          setTotalSiteCost(res.totals.MPH + res.totals.SNY);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Handle file select for upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFilePreview(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFilePreview(file);
  };

  const processFilePreview = async (file: File) => {
    setSelectedFile(file);
    setIsPreviewing(true);
    setUploadError(null);
    setUploadSuccess(null);
    setPreviewData(null);

    try {
      const preview = await glService.previewUpload(file);
      setPreviewData(preview);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Gagal membaca struktur file Excel GL.");
    } finally {
      setIsPreviewing(false);
    }
  };

  // Commit upload to database
  const handleCommitUpload = async () => {
    if (!selectedFile) return;
    setIsCommitting(true);
    setUploadError(null);
    try {
      const result = await glService.commitUpload(selectedFile);
      setUploadSuccess(
        `Sukses! Data GL periode "${result.periodName}" berhasil disimpan (${result.totalTransactions.toLocaleString()} baris transaksi).`
      );
      await loadPeriods();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setPreviewData(null);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Gagal menyimpan data GL ke database.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Export Transactions to CSV
  const exportTransactionsToCSV = async () => {
    if (!selectedPeriodId) return;
    setIsExporting(true);
    try {
      const res = await glService.getTransactions({
        periodId: selectedPeriodId,
        site: selectedSite !== "ALL" ? selectedSite : undefined,
        accountCode: selectedAccountFilter || undefined,
        q: txSearch,
        page: 1,
        limit: 5000,
      });

      const headers = ["Tanggal", "No Voucher", "Kode Akun", "Nama Akun", "Cost Center", "Site", "Debet (IDR)", "Customer/Vendor", "Remark"];
      const rows = res.data.map((tx) => [
        `"${tx.date}"`,
        `"${tx.regNo || ""}"`,
        `"${tx.accountCode || ""}"`,
        `"${(tx.accountName || "").replace(/"/g, '""')}"`,
        `"${tx.costCenter || ""}"`,
        `"${tx.projectArea || ""}"`,
        Math.round(tx.debet || 0),
        `"${(tx.supplierName || "").replace(/"/g, '""')}"`,
        `"${(tx.remark || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `GL_Data_${activePeriod?.periodName.replace(/[\/\s:]+/g, "_") || "Export"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ================= TOP CONTROL & FILTER BAR ================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Header Title, Metadata Strips, and Action Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left Title & Status Badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-linear-to-br from-[#e95623] to-[#d44818] shadow-md shadow-orange-500/20 text-white flex items-center justify-center shrink-0">
              <Database size={22} className="stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  General Ledger (GL) Data
                </h1>
                {activePeriod && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-50 text-[#e95623] border border-orange-200/90">
                    <Calendar size={11} className="shrink-0" />
                    <span>{activePeriod.periodName}</span>
                  </span>
                )}
              </div>

              {/* Metadata Pill Strip */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium pt-0.5">
                <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/70 text-slate-600">
                  <MapPin size={11} className="text-[#e95623]" />
                  <span>Site: Muara Pahu &amp; Senyiur</span>
                </span>

                <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/70 text-slate-700 font-semibold">
                  <Coins size={11} className="text-amber-600" />
                  <span>Total Biaya Site:</span>
                  <span className="font-mono font-bold text-[#e95623]">
                    {formatCurrency(totalSiteCost)}
                  </span>
                </span>

                {activePeriod && (
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/70 text-slate-600">
                    <FileSpreadsheet size={11} className="text-blue-600" />
                    <span>{pagination.total > 0 ? pagination.total.toLocaleString() : activePeriod.totalTransactions.toLocaleString()} Transaksi</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Controls: Period Selector, Refresh, Upload CTA */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {periods.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50/90 border border-slate-200 px-3 py-1.5 rounded-xl text-xs hover:border-slate-300 transition-colors">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  Periode:
                </span>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.periodName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Refresh Data GL"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin text-[#e95623]" : ""} />
            </button>

            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewData(null);
                setUploadError(null);
                setUploadSuccess(null);
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-linear-to-r from-[#e95623] to-[#d44818] hover:from-[#d44818] hover:to-[#be3e12] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Upload size={14} className="stroke-[2.4]" />
              <span>Upload Data GL (.xls)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Site Filter Pills (Direct, no Sheet2 tab) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Filter Site:
            </span>
            {[
              { id: "ALL" as const, label: "Semua Site" },
              { id: "MPH" as const, label: "Muara Pahu (MPH)" },
              { id: "SNY" as const, label: "Senyiur (SNY)" },
            ].map((st) => {
              const isActive = selectedSite === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedSite(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? st.id === "MPH"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : st.id === "SNY"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <MapPin size={12} className={isActive ? "text-white" : "text-slate-400"} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Stats on Active Filter */}
          <div className="text-xs text-slate-500 font-medium">
            <span>Total Transaksi: </span>
            <strong className="text-slate-800 font-mono font-bold">
              {pagination.total.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT: GL TRANSACTIONS (SHEET1) DIRECTLY ================= */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-16 text-center shadow-xs space-y-3">
          <RefreshCw size={32} className="animate-spin text-[#e95623] mx-auto" />
          <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">
            Memuat Data General Ledger...
          </p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-xs space-y-4 max-w-xl mx-auto my-6">
          <div className="h-14 w-14 rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Belum Ada Data GL yang Diunggah</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1.5">
              Silakan unggah file Excel General Ledger bulanan (.xls / .xlsx) untuk melihat dan mengelola data transaksi.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer inline-flex items-center gap-2"
          >
            <Upload size={14} />
            <span>Upload File GL Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden space-y-0">
          {/* Table Toolbar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Detail Transaksi General Ledger
              </span>

              {selectedAccountFilter && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-orange-100 text-[#e95623] font-bold border border-orange-200 shadow-2xs">
                  <Tag size={12} />
                  <span>Akun: {selectedAccountFilter}</span>
                  <button
                    onClick={() => setSelectedAccountFilter("")}
                    className="hover:text-red-700 cursor-pointer ml-0.5"
                    title="Hapus filter akun"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search input with clear button */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari voucher, akun, vendor, remark..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-orange-500 placeholder:text-slate-400 font-medium"
                />
                {txSearch && (
                  <button
                    onClick={() => setTxSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Rows per page selector */}
              <select
                value={pagination.limit}
                onChange={(e) => {
                  setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10) }));
                  loadTransactions(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold cursor-pointer"
                title="Baris per halaman"
              >
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
              </select>

              {/* Export CSV button */}
              <button
                onClick={exportTransactionsToCSV}
                disabled={isExporting || transactions.length === 0}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-40"
                title="Download CSV Transaksi GL"
              >
                {isExporting ? (
                  <RefreshCw size={13} className="animate-spin text-[#e95623]" />
                ) : (
                  <Download size={13} />
                )}
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-95">
            {isTxLoading ? (
              <div className="py-20 text-center space-y-2.5">
                <RefreshCw size={26} className="animate-spin text-[#e95623] mx-auto" />
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                  Memuat Baris Transaksi...
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider select-none">
                    <th className="py-3 px-3 w-28">Tanggal</th>
                    <th className="py-3 px-3 w-32">No. Voucher</th>
                    <th className="py-3 px-3 min-w-50">Akun Beban</th>
                    <th className="py-3 px-2.5 w-16 text-center">CC</th>
                    <th className="py-3 px-2.5 w-16 text-center">Site</th>
                    <th className="py-3 px-3 text-right w-36">Debet (IDR)</th>
                    <th className="py-3 px-3 min-w-45">Customer / Vendor</th>
                    <th className="py-3 px-3 min-w-55">Keterangan (Remark)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 text-xs">
                        Tidak ada transaksi yang cocok dengan filter atau pencarian saat ini.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50/90 transition-colors ${
                          idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap text-[11px]">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-3">
                          {tx.regNo ? (
                            <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70 whitespace-nowrap">
                              {tx.regNo}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-[11px] line-clamp-1">
                            {tx.accountName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium">
                            {tx.accountCode}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[10px] text-slate-500">
                          {tx.costCenter || "-"}
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${
                              tx.projectArea === "MPH"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : tx.projectArea === "SNY"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {tx.projectArea || "-"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatNumber(tx.debet)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 text-[11px] max-w-50 truncate" title={tx.supplierName}>
                          {tx.supplierName || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-60 truncate" title={tx.remark}>
                          {tx.remark || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan{" "}
              <strong className="text-slate-800">
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </strong>{" "}
              -{" "}
              <strong className="text-slate-800">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{" "}
              dari <strong className="text-slate-800">{pagination.total.toLocaleString()}</strong> transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadTransactions(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadTransactions(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
                title="Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs">
                Halaman {pagination.page} / {pagination.totalPages || 1}
              </span>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadTransactions(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
                title="Selanjutnya"
              >
                <ChevronRight size={14} />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadTransactions(pagination.totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL UPLOAD DATA GL ================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center shadow-xs">
                  <Upload size={18} className="stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Upload File General Ledger</h3>
                  <p className="text-xs text-slate-500">
                    Format: Excel (.xls / .xlsx) berisi Sheet1 (Data GL) dan Sheet2 (Kode Beban)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#e95623] rounded-2xl p-7 text-center bg-slate-50/50 hover:bg-orange-50/20 transition-all cursor-pointer space-y-2.5 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-12 w-12 rounded-2xl bg-white shadow-xs border border-slate-200 text-[#e95623] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : "Klik atau seret file Excel GL ke sini"}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung .xls (Excel 97-2004) dan .xlsx hingga 40MB
                </p>
              </div>
            </div>

            {/* Preview Status & Details */}
            {isPreviewing && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <RefreshCw size={22} className="animate-spin text-[#e95623] mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Menganalisis lembar Sheet1 &amp; Sheet2...
                </p>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 font-bold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {previewData && !uploadSuccess && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="font-bold text-slate-700">Hasil Analisis File:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Valid &amp; Siap Disimpan
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Periode</span>
                    <p className="font-bold text-slate-800 truncate mt-0.5">{previewData.periodName}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Debet</span>
                    <p className="font-bold text-[#e95623] truncate mt-0.5">
                      {formatCurrency(previewData.totalDebet)}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sheet1 (Jurnal)</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {previewData.totalTransactions.toLocaleString()} baris
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sheet2 (Akun)</span>
                    <p className="font-bold text-slate-800 mt-0.5">{previewData.summaries.length} akun</p>
                  </div>
                </div>

                {/* Reconciliation check notice */}
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span>
                    Rekonsiliasi Sheet1 &amp; Sheet2:{" "}
                    <strong className="text-emerald-700">
                      {previewData.reconciliationMatch ? "Cocok 100% (Selisih Rp 0)" : "Terdapat deviasi"}
                    </strong>
                  </span>
                  <span className="text-slate-500 font-medium">
                    MPH: <strong className="font-mono text-slate-800">{formatNumber(previewData.siteTotals.MPH)}</strong> | SNY: <strong className="font-mono text-slate-800">{formatNumber(previewData.siteTotals.SNY)}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={!previewData || isCommitting || !!uploadSuccess}
                onClick={handleCommitUpload}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-[#e95623] to-[#d44818] hover:from-[#d44818] hover:to-[#be3e12] text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Konfirmasi &amp; Simpan Data GL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
