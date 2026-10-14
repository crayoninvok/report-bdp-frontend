"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, JobSite } from "../types/auth";
import { ReportSummary, ReportDetails } from "../types/report";
import { reportService } from "../services/reportService";
import { CostReportTable } from "./CostReportTable";
import { InputBudgetModal } from "./InputBudgetModal";
import { InputRealisasiModal } from "./InputRealisasiModal";
import { CreatePeriodModal } from "./CreatePeriodModal";
import {
  Calendar,
  Building2,
  Lock,
  Edit3,
  Plus,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  AlertCircle,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface ReportsViewProps {
  user: User;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ user }) => {
  const [selectedSite, setSelectedSite] = useState<JobSite>(
    user.jobSite === "HeadOffice" ? "MuaraPahu" : user.jobSite
  );
  const [reportsList, setReportsList] = useState<ReportSummary[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [reportDetails, setReportDetails] = useState<ReportDetails | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isRealisasiModalOpen, setIsRealisasiModalOpen] = useState(false);
  const [isCreatePeriodModalOpen, setIsCreatePeriodModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Determine permissions
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const canEditBudget = isHeadOffice || user.jobSite === selectedSite;
  const canEditRealisasi = isHeadOffice || user.jobSite === selectedSite;

  // Load report list for selected site
  const loadReportsList = useCallback(async (siteToLoad: JobSite) => {
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const reports = await reportService.getReports(siteToLoad, 2026);
      setReportsList(reports);

      if (reports.length > 0) {
        // Default to the first report (latest)
        setSelectedReportId(reports[0].id);
      } else {
        setSelectedReportId("");
        setReportDetails(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat daftar laporan");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Load report details when selectedReportId changes
  const loadReportDetails = useCallback(async (id: string) => {
    if (!id) return;
    setIsLoadingDetails(true);
    setErrorMsg(null);
    try {
      const details = await reportService.getReportDetails(id);
      setReportDetails(details);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat detail laporan");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadReportsList(selectedSite);
  }, [selectedSite, loadReportsList]);

  useEffect(() => {
    if (selectedReportId) {
      loadReportDetails(selectedReportId);
    }
  }, [selectedReportId, loadReportDetails]);

  const handleSiteChange = (newSite: JobSite) => {
    setSelectedSite(newSite);
  };

  const handleDeleteReport = async () => {
    if (!reportDetails) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await reportService.deleteReport(reportDetails.report.id);
      setSuccessMsg(`Laporan periode ${reportDetails.report.periodName} (${reportDetails.report.jobSite}) berhasil dihapus.`);
      setIsDeleteConfirmOpen(false);
      await loadReportsList(selectedSite);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus laporan");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export table data to CSV
  const handleExportCSV = () => {
    if (!reportDetails) return;

    const headers = [
      "AKUN",
      "BUDGET_MINGGUAN",
      "PERSEN_TC_BUDGET",
      "IDR_PER_TON_BUDGET",
      "REALISASI_MINGGUAN",
      "PERSEN_TC_REALISASI",
      "IDR_PER_TON_REALISASI",
      "COST_UNDER_OVER_PER_TON",
      "COST_UNDER_OVER_NOMINAL",
      "BUDGET_YTD",
      "PERSEN_TC_BUDGET_YTD",
      "IDR_PER_TON_BUDGET_YTD",
      "REALISASI_YTD",
      "PERSEN_TC_REALISASI_YTD",
      "IDR_PER_TON_REALISASI_YTD",
      "COST_UNDER_OVER_PER_TON_YTD",
      "COST_UNDER_OVER_NOMINAL_YTD",
    ];

    const rows: string[] = [];

    // Produksi Row
    rows.push(
      [
        "PRODUKSI",
        reportDetails.produksi.weeklyBudget,
        "-",
        "-",
        reportDetails.produksi.weeklyRealisasi,
        reportDetails.produksi.weeklyPercent.toFixed(2) + "%",
        "-",
        "-",
        reportDetails.produksi.weeklyVariance,
        reportDetails.produksi.ytdBudget,
        "-",
        "-",
        reportDetails.produksi.ytdRealisasi,
        "-",
        "-",
        "-",
        reportDetails.produksi.ytdVariance,
      ].join(",")
    );

    // Biaya Produksi Row
    rows.push(
      [
        "BIAYA PRODUKSI",
        reportDetails.biayaProduksi.weeklyBudget,
        "100.00%",
        reportDetails.biayaProduksi.weeklyIdrPerTonBudget.toFixed(2),
        reportDetails.biayaProduksi.weeklyRealisasi,
        "100.00%",
        reportDetails.biayaProduksi.weeklyIdrPerTonRealisasi.toFixed(2),
        reportDetails.biayaProduksi.weeklyCostUnderOverPerTon.toFixed(2),
        reportDetails.biayaProduksi.weeklyCostUnderOver,
        reportDetails.biayaProduksi.ytdBudget,
        "100.00%",
        reportDetails.biayaProduksi.ytdIdrPerTonBudget.toFixed(2),
        reportDetails.biayaProduksi.ytdRealisasi,
        "100.00%",
        reportDetails.biayaProduksi.ytdIdrPerTonRealisasi.toFixed(2),
        reportDetails.biayaProduksi.ytdCostUnderOverPerTon.toFixed(2),
        reportDetails.biayaProduksi.ytdCostUnderOver,
      ].join(",")
    );

    // Items
    for (const it of reportDetails.items) {
      rows.push(
        [
          `"${it.accountName}"`,
          it.weeklyBudget,
          it.weeklyPercentTCBudget.toFixed(2) + "%",
          it.weeklyIdrPerTonBudget.toFixed(2),
          it.weeklyRealisasi,
          it.weeklyPercentTCRealisasi.toFixed(2) + "%",
          it.weeklyIdrPerTonRealisasi.toFixed(2),
          it.weeklyCostUnderOverPerTon.toFixed(2),
          it.weeklyCostUnderOver,
          it.ytdBudget,
          it.ytdPercentTCBudget.toFixed(2) + "%",
          it.ytdIdrPerTonBudget.toFixed(2),
          it.ytdRealisasi,
          it.ytdPercentTCRealisasi.toFixed(2) + "%",
          it.ytdIdrPerTonRealisasi.toFixed(2),
          it.ytdCostUnderOverPerTon.toFixed(2),
          it.ytdCostUnderOver,
        ].join(",")
      );
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Cost_${reportDetails.report.jobSite}_${reportDetails.report.periodName.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full">
      {/* 1. Control Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Site & Period Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Selector Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {isHeadOffice ? (
              <>
                <button
                  onClick={() => handleSiteChange("MuaraPahu")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSite === "MuaraPahu"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={14} className="text-emerald-600" />
                  <span>Site Muara Pahu</span>
                </button>
                <button
                  onClick={() => handleSiteChange("Senyiur")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSite === "Senyiur"
                      ? "bg-white text-amber-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={14} className="text-amber-600" />
                  <span>Site Senyiur</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-800">
                <Building2
                  size={15}
                  className={
                    user.jobSite === "MuaraPahu" ? "text-emerald-600" : "text-amber-600"
                  }
                />
                <span>Site {user.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                  Site Anda
                </span>
              </div>
            )}
          </div>

            {/* Period Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Periode Minggu:
              </span>
              <div className="relative">
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  disabled={isLoadingList || reportsList.length === 0}
                  className="pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623] shadow-2xs"
                >
                  {reportsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.periodName} (W{r.weekNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadReportDetails(selectedReportId)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={isLoadingDetails ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Right: Actions (Input Budget, Input Realisasi, Create Period, Export) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Create Period */}
            <button
              onClick={() => setIsCreatePeriodModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Periode Baru</span>
            </button>

            {/* Input Budget */}
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              disabled={!canEditBudget || !reportDetails}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                canEditBudget
                  ? "bg-[#e95623] text-white hover:bg-[#d44415] shadow-[#e95623]/20 shadow-md cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
              title={
                canEditBudget
                  ? `Input atau edit Budget untuk Site ${selectedSite}`
                  : `Hanya PIC Site ${selectedSite} atau Head Office yang dapat menginput Budget`
              }
            >
              {canEditBudget ? <Edit3 size={14} /> : <Lock size={14} />}
              <span>Input Budget</span>
            </button>

            {/* Input Realisasi */}
            <button
              onClick={() => setIsRealisasiModalOpen(true)}
              disabled={!canEditRealisasi || !reportDetails}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                canEditRealisasi
                  ? "bg-[#0e9f9d] text-white hover:bg-[#0d7f7d] shadow-[#0e9f9d]/20 shadow-md cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
              title={
                canEditRealisasi
                  ? `Input atau edit Realisasi untuk Site ${selectedSite}`
                  : `Hanya PIC Site ${selectedSite} atau Head Office yang dapat menginput Realisasi`
              }
            >
              {canEditRealisasi ? <Edit3 size={14} /> : <Lock size={14} />}
              <span>Input Realisasi</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={!reportDetails}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Export data ke format CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Hapus Laporan (SuperAdmin only) */}
            {user.role === "SuperAdmin" && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={!reportDetails || isDeleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Hapus periode laporan ini (Super Admin)"
              >
                <Trash2 size={14} className="text-rose-600" />
                <span className="hidden sm:inline">Hapus Laporan</span>
              </button>
            )}
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs shadow-xs font-semibold animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-xs shadow-xs">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. Executive Metric KPI Cards */}
        {reportDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Produksi Mingguan */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Produksi Mingguan
                </span>
                <div className="p-2 rounded-xl bg-batara-teal-50 text-[#0e9f9d] border border-batara-teal-100">
                  <Layers size={16} />
                </div>
              </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">
                  {reportDetails.produksi.weeklyRealisasi > 0
                    ? Math.round(reportDetails.produksi.weeklyRealisasi).toLocaleString("id-ID")
                    : "-"}
                </span>
                <span className="text-xs text-slate-500 font-semibold">Ton</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Target Budget:{" "}
                <span className="font-bold text-slate-700">
                  {Math.round(reportDetails.produksi.weeklyBudget).toLocaleString("id-ID")} Ton
                </span>
              </p>
            </div>
          </div>

          {/* Card 2: Biaya Produksi Mingguan */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                Biaya Produksi (Mingguan)
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">
                  Rp {Math.round(reportDetails.biayaProduksi.weeklyRealisasi).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Budget:{" "}
                <span className="font-bold text-slate-700">
                  Rp {Math.round(reportDetails.biayaProduksi.weeklyBudget).toLocaleString("id-ID")}
                </span>
              </p>
            </div>
          </div>

          {/* Card 3: Variansi Cost Mingguan */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                Cost Under / (Over)
              </span>
              <div
                className={`p-2 rounded-xl ${
                  reportDetails.biayaProduksi.weeklyCostUnderOver >= 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {reportDetails.biayaProduksi.weeklyCostUnderOver >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl font-extrabold ${
                    reportDetails.biayaProduksi.weeklyCostUnderOver >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {reportDetails.biayaProduksi.weeklyCostUnderOver < 0
                    ? `(Rp ${Math.abs(Math.round(reportDetails.biayaProduksi.weeklyCostUnderOver)).toLocaleString("id-ID")})`
                    : `Rp ${Math.round(reportDetails.biayaProduksi.weeklyCostUnderOver).toLocaleString("id-ID")}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Status:{" "}
                <span
                  className={`font-bold ${
                    reportDetails.biayaProduksi.weeklyCostUnderOver >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {reportDetails.biayaProduksi.weeklyCostUnderOver >= 0
                    ? "Hemat (Under Budget)"
                    : "Over Budget"}
                </span>
              </p>
            </div>
          </div>

          {/* Card 4: YTD Cost Under/(Over) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                YTD Cost Under / (Over)
              </span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Calendar size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xl font-extrabold ${
                    reportDetails.biayaProduksi.ytdCostUnderOver >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {reportDetails.biayaProduksi.ytdCostUnderOver < 0
                    ? `(Rp ${Math.abs(Math.round(reportDetails.biayaProduksi.ytdCostUnderOver)).toLocaleString("id-ID")})`
                    : `Rp ${Math.round(reportDetails.biayaProduksi.ytdCostUnderOver).toLocaleString("id-ID")}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Kumulatif YTD hingga{" "}
                <span className="font-semibold text-slate-700">
                  {reportDetails.report.periodName.split("-")[1] || reportDetails.report.periodName}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. The Interactive High-Fidelity Excel-Styled Table */}
      {isLoadingDetails ? (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-xs gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-500">
            Mengkalkulasi Laporan Cost Operasional...
          </span>
        </div>
      ) : reportDetails ? (
        <CostReportTable data={reportDetails} />
      ) : (
        <div className="h-48 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-center p-6">
          <AlertCircle size={28} className="text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Belum ada laporan mingguan untuk site {selectedSite}
          </p>
          {isHeadOffice && (
            <button
              onClick={() => setIsCreatePeriodModalOpen(true)}
              className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
            >
              + Buat Periode Minggu Baru
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {reportDetails && isBudgetModalOpen && (
        <InputBudgetModal
          user={user}
          reportDetails={reportDetails}
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          onSuccess={() => loadReportDetails(reportDetails.report.id)}
        />
      )}

      {reportDetails && isRealisasiModalOpen && (
        <InputRealisasiModal
          user={user}
          reportDetails={reportDetails}
          isOpen={isRealisasiModalOpen}
          onClose={() => setIsRealisasiModalOpen(false)}
          onSuccess={() => loadReportDetails(reportDetails.report.id)}
        />
      )}

      {isCreatePeriodModalOpen && (
        <CreatePeriodModal
          user={user}
          isOpen={isCreatePeriodModalOpen}
          onClose={() => setIsCreatePeriodModalOpen(false)}
          onSuccess={(newId) => {
            loadReportsList(selectedSite);
            setSelectedReportId(newId);
          }}
        />
      )}

      {/* Delete Report Confirmation Modal */}
      {isDeleteConfirmOpen && reportDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Hapus Periode Laporan?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Anda akan menghapus seluruh data laporan untuk{" "}
              <strong className="text-slate-800">Site {reportDetails.report.jobSite} – {reportDetails.report.periodName}</strong> termasuk rincian 86 akun beban. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Laporan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
