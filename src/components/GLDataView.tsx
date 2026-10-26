"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { User } from "../types/auth";
import {
  glService,
  GLPeriodItem,
  GLExpenseSummaryItem,
  GLTransactionItem,
  GLPreviewData,
} from "../services/glService";
import {
  Upload,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Calendar,
  Building2,
  TableProperties,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  ArrowUpDown,
  FileText,
  BadgeAlert,
} from "lucide-react";

interface GLDataViewProps {
  user: User;
}

export const GLDataView: React.FC<GLDataViewProps> = ({ user }) => {
  // Periods
  const [periods, setPeriods] = useState<GLPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [activePeriod, setActivePeriod] = useState<GLPeriodItem | null>(null);

  // Tabs: "summary" (Sheet2 - Kode Beban) vs "transactions" (Sheet1 - Detail Jurnal)
  const [activeTab, setActiveTab] = useState<"summary" | "transactions">("summary");

  // Filters
  const [selectedSite, setSelectedSite] = useState<string>("ALL"); // "ALL" | "MPH" | "SNY" | "HOF"
  const [summarySearch, setSummarySearch] = useState<string>("");
  const [txSearch, setTxSearch] = useState<string>("");
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("");

  // Data states
  const [summaries, setSummaries] = useState<GLExpenseSummaryItem[]>([]);
  const [summaryTotals, setSummaryTotals] = useState<{
    HOF: number;
    MPH: number;
    SNY: number;
    grandTotal: number;
  }>({ HOF: 0, MPH: 0, SNY: 0, grandTotal: 0 });

  const [transactions, setTransactions] = useState<GLTransactionItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTxLoading, setIsTxLoading] = useState<boolean>(false);
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

  // When selectedPeriodId changes, load Sheet2 summaries
  useEffect(() => {
    if (!selectedPeriodId) {
      setSummaries([]);
      return;
    }
    loadSummaries(selectedPeriodId);
  }, [selectedPeriodId, summarySearch]);

  const loadSummaries = async (periodId: string) => {
    try {
      const res = await glService.getExpenseSummaries(periodId, summarySearch);
      setSummaries(res.data);
      if (res.period) {
        setActivePeriod(res.period);
      }
      if (res.totals) {
        setSummaryTotals(res.totals);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat ringkasan kode beban GL.");
    }
  };

  // Load transactions when tab is "transactions", or when filters change
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
    if (activeTab === "transactions") {
      loadTransactions(1);
    }
  }, [activeTab, selectedPeriodId, selectedSite, selectedAccountFilter]);

  // Debounced search for transactions
  useEffect(() => {
    if (activeTab !== "transactions") return;
    const timer = setTimeout(() => {
      loadTransactions(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [txSearch]);

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
      // Reload periods & data
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

  return (
    <div className="space-y-4">
      {/* Top Action & Filter Bar (NO DASHBOARD AS REQUESTED) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Title & Active Period Info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  General Ledger (GL) Data
                </h1>
                {activePeriod && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-[#e95623] border border-orange-200">
                    {activePeriod.periodName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Buku besar transaksi biaya operasional per site (Sheet1 Detail &amp; Sheet2 Rekap Beban)
              </p>
            </div>
          </div>

          {/* Right: Period Dropdown, Refresh, and Upload Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {periods.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-500 font-medium">Periode:</span>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
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
              onClick={() => {
                if (selectedPeriodId) {
                  loadSummaries(selectedPeriodId);
                  if (activeTab === "transactions") loadTransactions(pagination.page);
                }
              }}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewData(null);
                setUploadError(null);
                setUploadSuccess(null);
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Data GL (.xls)</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher & Site Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Tabs: Sheet2 vs Sheet1 */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "summary"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <TableProperties size={14} />
              <span>Rekap Kode Beban (Sheet2)</span>
              {summaries.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                  {summaries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "transactions"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ListFilter size={14} />
              <span>Detail Jurnal GL (Sheet1)</span>
              {activePeriod && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                  {activePeriod.totalTransactions.toLocaleString()}
                </span>
              )}
            </button>
          </div>

          {/* Site Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Site:
            </span>
            {[
              { id: "ALL", label: "Semua Site" },
              { id: "MPH", label: "Muara Pahu (MPH)" },
              { id: "SNY", label: "Senyiur (SNY)" },
              { id: "HOF", label: "Head Office (HOF)" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedSite(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedSite === st.id
                    ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw size={28} className="animate-spin text-[#e95623] mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Memuat data General Ledger...</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center mx-auto">
            <FileSpreadsheet size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Belum Ada Data GL yang Diunggah</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Silakan unggah file Excel General Ledger bulanan (.xls / .xlsx) yang berisi Sheet1 (Data Jurnal) dan Sheet2 (Rekap Kode Beban).
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Upload size={14} />
            <span>Upload File GL Sekarang</span>
          </button>
        </div>
      ) : activeTab === "summary" ? (
        /* ================= TAB 1: SHEET2 REKAP KODE BEBAN ================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Rekapitulasi 38 Akun Beban (Sheet2)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                &bull; Total Grand Total: <strong>{formatCurrency(summaryTotals.grandTotal)}</strong>
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode / nama akun..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-3.5 w-32">Kode Akun</th>
                  <th className="py-3 px-3.5 min-w-[240px]">Nama Akun Beban</th>
                  <th
                    className={`py-3 px-3.5 text-right w-36 ${
                      selectedSite === "HOF" ? "bg-amber-100/60 font-black text-amber-900" : ""
                    }`}
                  >
                    HOF (IDR)
                  </th>
                  <th
                    className={`py-3 px-3.5 text-right w-44 ${
                      selectedSite === "MPH" ? "bg-blue-100/60 font-black text-blue-900" : ""
                    }`}
                  >
                    MPH (IDR)
                  </th>
                  <th
                    className={`py-3 px-3.5 text-right w-40 ${
                      selectedSite === "SNY" ? "bg-emerald-100/60 font-black text-emerald-900" : ""
                    }`}
                  >
                    SNY (IDR)
                  </th>
                  <th className="py-3 px-3.5 text-right w-44 bg-slate-200/70 font-black text-slate-900">
                    Grand Total (IDR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada akun beban yang sesuai dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  summaries.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-orange-50/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedAccountFilter(item.accountCode);
                        setActiveTab("transactions");
                      }}
                      title="Klik untuk melihat transaksi jurnal akun ini"
                    >
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800 text-[11px]">
                        {item.accountCode}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-800 group-hover:text-[#e95623] transition-colors">
                        {item.accountName}
                      </td>
                      <td
                        className={`py-2.5 px-3.5 text-right font-mono ${
                          selectedSite === "HOF" ? "bg-amber-50/60 font-bold" : ""
                        }`}
                      >
                        {item.hofAmount > 0 ? formatNumber(item.hofAmount) : "-"}
                      </td>
                      <td
                        className={`py-2.5 px-3.5 text-right font-mono ${
                          selectedSite === "MPH" ? "bg-blue-50/60 font-bold" : ""
                        }`}
                      >
                        {item.mphAmount > 0 ? formatNumber(item.mphAmount) : "-"}
                      </td>
                      <td
                        className={`py-2.5 px-3.5 text-right font-mono ${
                          selectedSite === "SNY" ? "bg-emerald-50/60 font-bold" : ""
                        }`}
                      >
                        {item.snyAmount > 0 ? formatNumber(item.snyAmount) : "-"}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                        {formatNumber(item.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                  <td colSpan={3} className="py-3 px-3.5 text-right uppercase tracking-wider">
                    Total
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono ${
                      selectedSite === "HOF" ? "bg-amber-100/70" : ""
                    }`}
                  >
                    {formatNumber(summaryTotals.HOF)}
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono ${
                      selectedSite === "MPH" ? "bg-blue-100/70" : ""
                    }`}
                  >
                    {formatNumber(summaryTotals.MPH)}
                  </td>
                  <td
                    className={`py-3 px-3.5 text-right font-mono ${
                      selectedSite === "SNY" ? "bg-emerald-100/70" : ""
                    }`}
                  >
                    {formatNumber(summaryTotals.SNY)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-sm bg-slate-200/90 text-[#e95623]">
                    {formatNumber(summaryTotals.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* ================= TAB 2: SHEET1 DETAIL JURNAL TRANSAKSI ================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden space-y-0">
          {/* Filter & Search Toolbar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Detail Transaksi Jurnal (Sheet1)
              </span>

              {selectedAccountFilter && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-orange-100/80 text-[#e95623] font-bold border border-orange-200">
                  <span>Filter Akun: {selectedAccountFilter}</span>
                  <button
                    onClick={() => setSelectedAccountFilter("")}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari voucher, akun, vendor, remark..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-orange-500"
                />
              </div>

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
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[380px]">
            {isTxLoading ? (
              <div className="py-16 text-center">
                <RefreshCw size={24} className="animate-spin text-[#e95623] mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Memuat baris transaksi...</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 w-24">Tanggal</th>
                    <th className="py-3 px-3 w-32">No. Voucher</th>
                    <th className="py-3 px-3 min-w-[200px]">Akun Beban</th>
                    <th className="py-3 px-2.5 w-16 text-center">CC</th>
                    <th className="py-3 px-2.5 w-16 text-center">Site</th>
                    <th className="py-3 px-3 text-right w-36">Debet (IDR)</th>
                    <th className="py-3 px-3 min-w-[180px]">Customer / Vendor</th>
                    <th className="py-3 px-3 min-w-[220px]">Keterangan (Remark)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada transaksi yang cocok dengan filter atau pencarian.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                          {tx.date}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 text-[11px]">
                          {tx.regNo || "-"}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 text-[11px] line-clamp-1">
                            {tx.accountName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.accountCode}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono text-[10px] text-slate-500">
                          {tx.costCenter || "-"}
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.projectArea === "MPH"
                                ? "bg-blue-100 text-blue-800"
                                : tx.projectArea === "SNY"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {tx.projectArea || "-"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatNumber(tx.debet)}
                        </td>
                        <td className="py-2 px-3 text-slate-700 text-[11px] max-w-[200px] truncate" title={tx.supplierName}>
                          {tx.supplierName || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[240px] truncate" title={tx.remark}>
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
          <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan{" "}
              <strong>
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </strong>{" "}
              -{" "}
              <strong>
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{" "}
              dari <strong>{pagination.total.toLocaleString()}</strong> transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadTransactions(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-50"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadTransactions(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-50"
                title="Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                Halaman {pagination.page} / {pagination.totalPages || 1}
              </span>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadTransactions(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-50"
                title="Selanjutnya"
              >
                <ChevronRight size={14} />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadTransactions(pagination.totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-slate-50"
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center">
                  <Upload size={18} />
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
              className="border-2 border-dashed border-slate-300 hover:border-[#e95623] rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-orange-50/20 transition-all cursor-pointer space-y-2.5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-12 w-12 rounded-2xl bg-white shadow-xs border border-slate-200 text-[#e95623] flex items-center justify-center mx-auto">
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
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <RefreshCw size={20} className="animate-spin text-[#e95623] mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Menganalisis lembar Sheet1 &amp; Sheet2...
                </p>
              </div>
            )}

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 font-bold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {previewData && !uploadSuccess && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-600">Hasil Analisis File:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Valid &amp; Siap Disimpan
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Periode</span>
                    <p className="font-bold text-slate-800 truncate">{previewData.periodName}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Debet</span>
                    <p className="font-bold text-[#e95623] truncate">
                      {formatCurrency(previewData.totalDebet)}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sheet1 (Jurnal)</span>
                    <p className="font-bold text-slate-800">
                      {previewData.totalTransactions.toLocaleString()} baris
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sheet2 (Akun)</span>
                    <p className="font-bold text-slate-800">{previewData.summaries.length} akun</p>
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
                  <span className="text-slate-400">
                    HOF: {formatNumber(previewData.siteTotals.HOF)} | MPH: {formatNumber(previewData.siteTotals.MPH)} | SNY: {formatNumber(previewData.siteTotals.SNY)}
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
                className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
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
