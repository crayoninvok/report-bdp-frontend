"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User, JobSite } from "../types/auth";
import { ReportSummary, ReportDetails, EnrichedReportItem } from "../types/report";
import { reportService } from "../services/reportService";
import { CostReportTable } from "./CostReportTable";
import { EditPeriodModal } from "./EditPeriodModal";
import {
  Calendar,
  Building2,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  FileEdit,
  Eye,
  Pencil,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface ReportsViewProps {
  user: User;
  onNavigateToInput?: () => void;
}

type CostViewMode = "week" | "month" | "full";

export const ReportsView: React.FC<ReportsViewProps> = ({
  user,
  onNavigateToInput,
}) => {
  const { showSuccess, showError } = useNotification();
  const [selectedSite, setSelectedSite] = useState<JobSite>(
    user.jobSite === "HeadOffice" ? "MuaraPahu" : user.jobSite
  );

  // View Mode: 'week' | 'month' | 'full'
  const [viewMode, setViewMode] = useState<CostViewMode>("full");

  const [reportsList, setReportsList] = useState<ReportSummary[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [reportDetails, setReportDetails] = useState<ReportDetails | null>(null);

  // Month mode states
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [monthAggregatedDetails, setMonthAggregatedDetails] = useState<ReportDetails | null>(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditPeriodModalOpen, setIsEditPeriodModalOpen] = useState(false);

  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const canEditPeriod = isHeadOffice || user.jobSite === selectedSite;

  // Helper to extract clean month label from periodName or startDate
  const getMonthKey = (report: ReportSummary) => {
    if (report.startDate) {
      const d = new Date(report.startDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      }
    }
    const parts = report.periodName.split("-");
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return report.periodName;
  };

  // Group reports by distinct month
  const monthsMap = useMemo(() => {
    const map = new Map<string, ReportSummary[]>();
    for (const r of reportsList) {
      const key = getMonthKey(r);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(r);
    }
    return map;
  }, [reportsList]);

  const availableMonths = useMemo(() => {
    return Array.from(monthsMap.keys());
  }, [monthsMap]);

  // Load report list for selected site
  const loadReportsList = useCallback(async (siteToLoad: JobSite) => {
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const reports = await reportService.getReports(siteToLoad, 2026);
      setReportsList(reports);

      if (reports.length > 0) {
        setSelectedReportId(reports[0].id);
        const mKey = getMonthKey(reports[0]);
        setSelectedMonthKey(mKey);
      } else {
        setSelectedReportId("");
        setSelectedMonthKey("");
        setReportDetails(null);
        setMonthAggregatedDetails(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat daftar laporan");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Load report details for a specific report
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

  // Compute monthly aggregate by combining reports in that month
  const computeMonthAggregation = useCallback(
    async (mKey: string) => {
      const matchedReports = monthsMap.get(mKey);
      if (!matchedReports || matchedReports.length === 0) {
        setMonthAggregatedDetails(null);
        return;
      }

      setIsLoadingMonth(true);
      setErrorMsg(null);
      try {
        // Fetch details for all reports in this month
        const allDetails = await Promise.all(
          matchedReports.map((r) => reportService.getReportDetails(r.id))
        );

        if (allDetails.length === 0) {
          setMonthAggregatedDetails(null);
          return;
        }

        // If only 1 report in this month, use it directly as base
        if (allDetails.length === 1) {
          setMonthAggregatedDetails(allDetails[0]);
          return;
        }

        // Combine multiple weeks into a single monthly aggregated report
        let sumBudgetProduksi = 0;
        let sumRealisasiProduksi = 0;

        for (const d of allDetails) {
          sumBudgetProduksi += d.produksi.weeklyBudget || 0;
          sumRealisasiProduksi += d.produksi.weeklyRealisasi || 0;
        }

        const sumVarianceProduksi = sumBudgetProduksi - sumRealisasiProduksi;
        const monthlyProdPercent =
          sumBudgetProduksi > 0 ? (sumRealisasiProduksi / sumBudgetProduksi) * 100 : 0;

        // Sum Biaya Produksi
        let sumTotalBiayaBudget = 0;
        let sumTotalBiayaRealisasi = 0;

        for (const d of allDetails) {
          sumTotalBiayaBudget += d.biayaProduksi.weeklyBudget || 0;
          sumTotalBiayaRealisasi += d.biayaProduksi.weeklyRealisasi || 0;
        }

        const monthlyBiayaUnderOver = sumTotalBiayaBudget - sumTotalBiayaRealisasi;
        const monthlyBiayaBudgetPerTon =
          sumBudgetProduksi > 0 ? sumTotalBiayaBudget / sumBudgetProduksi : 0;
        const monthlyBiayaRealisasiPerTon =
          sumRealisasiProduksi > 0 ? sumTotalBiayaRealisasi / sumRealisasiProduksi : 0;
        const monthlyBiayaUnderOverPerTon =
          monthlyBiayaBudgetPerTon - monthlyBiayaRealisasiPerTon;

        // Aggregate items by accountName
        const itemMap = new Map<string, EnrichedReportItem>();
        for (const it of allDetails[0].items) {
          itemMap.set(it.accountName, {
            ...it,
            weeklyBudget: 0,
            weeklyRealisasi: 0,
            weeklyPercentTCBudget: 0,
            weeklyPercentTCRealisasi: 0,
            weeklyIdrPerTonBudget: 0,
            weeklyIdrPerTonRealisasi: 0,
            weeklyCostUnderOverPerTon: 0,
            weeklyCostUnderOver: 0,
          });
        }

        for (const d of allDetails) {
          for (const it of d.items) {
            const target = itemMap.get(it.accountName);
            if (target) {
              target.weeklyBudget += it.weeklyBudget || 0;
              target.weeklyRealisasi += it.weeklyRealisasi || 0;
            }
          }
        }

        // Recompute percentages and per-ton metrics
        const aggregatedItems: EnrichedReportItem[] = Array.from(itemMap.values()).map(
          (it) => {
            const tcBudget =
              sumTotalBiayaBudget > 0 ? (it.weeklyBudget / sumTotalBiayaBudget) * 100 : 0;
            const tcRealisasi =
              sumTotalBiayaRealisasi > 0
                ? (it.weeklyRealisasi / sumTotalBiayaRealisasi) * 100
                : 0;
            const tonBudget =
              sumBudgetProduksi > 0 ? it.weeklyBudget / sumBudgetProduksi : 0;
            const tonRealisasi =
              sumRealisasiProduksi > 0 ? it.weeklyRealisasi / sumRealisasiProduksi : 0;
            const underOverTon = tonBudget - tonRealisasi;
            const underOverNominal = it.weeklyBudget - it.weeklyRealisasi;

            return {
              ...it,
              weeklyPercentTCBudget: tcBudget,
              weeklyPercentTCRealisasi: tcRealisasi,
              weeklyIdrPerTonBudget: tonBudget,
              weeklyIdrPerTonRealisasi: tonRealisasi,
              weeklyCostUnderOverPerTon: underOverTon,
              weeklyCostUnderOver: underOverNominal,
            };
          }
        );

        // Latest report as reference for YTD info
        const latestDetail = allDetails[0];

        const aggregated: ReportDetails = {
          report: {
            ...latestDetail.report,
            periodName: `Bulan ${mKey}`,
          },
          produksi: {
            weeklyBudget: sumBudgetProduksi,
            weeklyRealisasi: sumRealisasiProduksi,
            weeklyVariance: sumVarianceProduksi,
            weeklyPercent: monthlyProdPercent,
            ytdBudget: latestDetail.produksi.ytdBudget,
            ytdRealisasi: latestDetail.produksi.ytdRealisasi,
            ytdVariance: latestDetail.produksi.ytdVariance,
            ytdPercent: latestDetail.produksi.ytdPercent,
          },
          biayaProduksi: {
            weeklyBudget: sumTotalBiayaBudget,
            weeklyPercentTCBudget: 100,
            weeklyIdrPerTonBudget: monthlyBiayaBudgetPerTon,
            weeklyRealisasi: sumTotalBiayaRealisasi,
            weeklyPercentTCRealisasi: 100,
            weeklyIdrPerTonRealisasi: monthlyBiayaRealisasiPerTon,
            weeklyCostUnderOverPerTon: monthlyBiayaUnderOverPerTon,
            weeklyCostUnderOver: monthlyBiayaUnderOver,
            ytdBudget: latestDetail.biayaProduksi.ytdBudget,
            ytdPercentTCBudget: 100,
            ytdIdrPerTonBudget: latestDetail.biayaProduksi.ytdIdrPerTonBudget,
            ytdRealisasi: latestDetail.biayaProduksi.ytdRealisasi,
            ytdPercentTCRealisasi: 100,
            ytdIdrPerTonRealisasi: latestDetail.biayaProduksi.ytdIdrPerTonRealisasi,
            ytdCostUnderOverPerTon: latestDetail.biayaProduksi.ytdCostUnderOverPerTon,
            ytdCostUnderOver: latestDetail.biayaProduksi.ytdCostUnderOver,
          },
          items: aggregatedItems,
        };

        setMonthAggregatedDetails(aggregated);
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal mengkalkulasi akumulasi bulanan");
      } finally {
        setIsLoadingMonth(false);
      }
    },
    [monthsMap]
  );

  useEffect(() => {
    loadReportsList(selectedSite);
  }, [selectedSite, loadReportsList]);

  useEffect(() => {
    if (selectedReportId) {
      loadReportDetails(selectedReportId);
    }
  }, [selectedReportId, loadReportDetails]);

  useEffect(() => {
    if (viewMode === "month" && selectedMonthKey) {
      computeMonthAggregation(selectedMonthKey);
    }
  }, [viewMode, selectedMonthKey, computeMonthAggregation]);

  const handleSiteChange = (newSite: JobSite) => {
    setSelectedSite(newSite);
  };

  // Determine active display data based on view mode
  const activeData: ReportDetails | null =
    viewMode === "month" ? monthAggregatedDetails : reportDetails;

  const isDataLoading =
    isLoadingList ||
    (viewMode === "month" ? isLoadingMonth : isLoadingDetails);

  // Export table data to CSV according to active view mode
  const handleExportCSV = () => {
    if (!activeData) return;

    const isMonthly = viewMode === "month";
    const isWeekly = viewMode === "week";

    let headers: string[] = [];
    if (isWeekly || isMonthly) {
      const prefix = isMonthly ? "BULANAN" : "MINGGUAN";
      headers = [
        "AKUN",
        `BUDGET_${prefix}`,
        "PERSEN_TC_BUDGET",
        "IDR_PER_TON_BUDGET",
        `REALISASI_${prefix}`,
        "PERSEN_TC_REALISASI",
        "IDR_PER_TON_REALISASI",
        "COST_UNDER_OVER_PER_TON",
        "COST_UNDER_OVER_NOMINAL",
      ];
    } else {
      headers = [
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
    }

    const rows: string[] = [];

    // Produksi Row
    if (isWeekly || isMonthly) {
      rows.push(
        [
          "PRODUKSI",
          activeData.produksi.weeklyBudget,
          "-",
          "-",
          activeData.produksi.weeklyRealisasi,
          activeData.produksi.weeklyPercent.toFixed(2) + "%",
          "-",
          "-",
          activeData.produksi.weeklyVariance,
        ].join(",")
      );
    } else {
      rows.push(
        [
          "PRODUKSI",
          activeData.produksi.weeklyBudget,
          "-",
          "-",
          activeData.produksi.weeklyRealisasi,
          activeData.produksi.weeklyPercent.toFixed(2) + "%",
          "-",
          "-",
          activeData.produksi.weeklyVariance,
          activeData.produksi.ytdBudget,
          "-",
          "-",
          activeData.produksi.ytdRealisasi,
          "-",
          "-",
          "-",
          activeData.produksi.ytdVariance,
        ].join(",")
      );
    }

    // Biaya Produksi Row
    if (isWeekly || isMonthly) {
      rows.push(
        [
          "BIAYA PRODUKSI",
          activeData.biayaProduksi.weeklyBudget,
          "100.00%",
          activeData.biayaProduksi.weeklyIdrPerTonBudget.toFixed(2),
          activeData.biayaProduksi.weeklyRealisasi,
          "100.00%",
          activeData.biayaProduksi.weeklyIdrPerTonRealisasi.toFixed(2),
          activeData.biayaProduksi.weeklyCostUnderOverPerTon.toFixed(2),
          activeData.biayaProduksi.weeklyCostUnderOver,
        ].join(",")
      );
    } else {
      rows.push(
        [
          "BIAYA PRODUKSI",
          activeData.biayaProduksi.weeklyBudget,
          "100.00%",
          activeData.biayaProduksi.weeklyIdrPerTonBudget.toFixed(2),
          activeData.biayaProduksi.weeklyRealisasi,
          "100.00%",
          activeData.biayaProduksi.weeklyIdrPerTonRealisasi.toFixed(2),
          activeData.biayaProduksi.weeklyCostUnderOverPerTon.toFixed(2),
          activeData.biayaProduksi.weeklyCostUnderOver,
          activeData.biayaProduksi.ytdBudget,
          "100.00%",
          activeData.biayaProduksi.ytdIdrPerTonBudget.toFixed(2),
          activeData.biayaProduksi.ytdRealisasi,
          "100.00%",
          activeData.biayaProduksi.ytdIdrPerTonRealisasi.toFixed(2),
          activeData.biayaProduksi.ytdCostUnderOverPerTon.toFixed(2),
          activeData.biayaProduksi.ytdCostUnderOver,
        ].join(",")
      );
    }

    // Items
    for (const it of activeData.items) {
      if (isWeekly || isMonthly) {
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
          ].join(",")
        );
      } else {
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
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const modeLabel = isMonthly ? "Bulanan" : isWeekly ? "Mingguan" : "Lengkap";
    link.setAttribute(
      "download",
      `Laporan_Cost_${modeLabel}_${selectedSite}_${(activeData.report.periodName || "").replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(
      `Laporan CSV (${modeLabel}) periode "${activeData.report.periodName}" berhasil diunduh!`,
      "Ekspor CSV Selesai"
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full">
      {/* 1. Header Banner & View Mode Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Laporan Cost Operasional
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Laporan evaluasi Budget vs Realisasi biaya tambang dengan opsi tampilan Mingguan, Bulanan, dan Lengkap.
            </p>
          </div>
        </div>

        {/* View Mode Toggle (Week | Month | Full) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-center shrink-0">
          <button
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "week"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock size={13} />
            <span>Mingguan (Week)</span>
          </button>

          <button
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "month"
                ? "bg-white text-[#0e9f9d] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={13} />
            <span>Bulanan (Month)</span>
          </button>

          <button
            onClick={() => setViewMode("full")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "full"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={13} />
            <span>Lengkap (Full/YTD)</span>
          </button>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Site & Dynamic Period Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {isHeadOffice ? (
              <>
                <button
                  onClick={() => handleSiteChange("MuaraPahu")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          {/* Period Dropdown: Adapts to View Mode */}
          {viewMode === "month" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Pilih Bulan:
              </span>
              <div className="relative">
                <select
                  value={selectedMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  disabled={availableMonths.length === 0}
                  className="pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0e9f9d] shadow-2xs"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      Bulan {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                {viewMode === "week" ? "Pilih Minggu:" : "Periode Acuan:"}
              </span>
              <div className="relative">
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  disabled={isLoadingList || reportsList.length === 0}
                  className="pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 shadow-2xs"
                >
                  {reportsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.periodName} (W{r.weekNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Edit Period Button */}
          {viewMode === "week" && reportDetails && canEditPeriod && (
            <button
              onClick={() => setIsEditPeriodModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Edit Informasi Periode ini (Nama, Minggu, Tanggal, dan Target Produksi)"
            >
              <Pencil size={13} className="text-blue-600" />
              <span>Edit Periode</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (viewMode === "month" && selectedMonthKey) {
                computeMonthAggregation(selectedMonthKey);
              } else if (selectedReportId) {
                loadReportDetails(selectedReportId);
              }
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Refresh Laporan"
          >
            <RefreshCw size={15} className={isDataLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Right: Actions (Export CSV & Link to Input Cost) */}
        <div className="flex items-center gap-2.5">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!activeData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all shadow-2xs cursor-pointer"
            title="Download Laporan ke format CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Shortcut to Input Cost */}
          {onNavigateToInput && (
            <button
              onClick={onNavigateToInput}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-orange-500 to-[#e95623] hover:from-orange-600 hover:to-[#d44415] shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
              title="Buka halaman Input Cost untuk mengedit atau upload data"
            >
              <FileEdit size={14} />
              <span>Input Data Cost</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-xs shadow-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Executive Metric KPI Cards */}
      {activeData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Produksi */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {viewMode === "month"
                  ? "Produksi Bulanan"
                  : viewMode === "week"
                  ? "Produksi Mingguan"
                  : "Produksi Mingguan"}
              </span>
              <div className="p-2 rounded-xl bg-batara-teal-50 text-[#0e9f9d] border border-batara-teal-100">
                <Layers size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">
                  {activeData.produksi.weeklyRealisasi > 0
                    ? Math.round(activeData.produksi.weeklyRealisasi).toLocaleString("id-ID")
                    : "-"}
                </span>
                <span className="text-xs text-slate-500 font-semibold">Ton</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Target Budget:{" "}
                <span className="font-bold text-slate-700">
                  {Math.round(activeData.produksi.weeklyBudget).toLocaleString("id-ID")} Ton
                </span>
              </p>
            </div>
          </div>

          {/* Card 2: Biaya Produksi */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                {viewMode === "month"
                  ? "Biaya Produksi (Bulanan)"
                  : viewMode === "week"
                  ? "Biaya Produksi (Mingguan)"
                  : "Biaya Produksi (Mingguan)"}
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900">
                  Rp {Math.round(activeData.biayaProduksi.weeklyRealisasi).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Budget:{" "}
                <span className="font-bold text-slate-700">
                  Rp {Math.round(activeData.biayaProduksi.weeklyBudget).toLocaleString("id-ID")}
                </span>
              </p>
            </div>
          </div>

          {/* Card 3: Variansi Cost */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">
                Cost Under / (Over)
              </span>
              <div
                className={`p-2 rounded-xl ${
                  activeData.biayaProduksi.weeklyCostUnderOver >= 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {activeData.biayaProduksi.weeklyCostUnderOver >= 0 ? (
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
                    activeData.biayaProduksi.weeklyCostUnderOver >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {activeData.biayaProduksi.weeklyCostUnderOver < 0
                    ? `(Rp ${Math.abs(Math.round(activeData.biayaProduksi.weeklyCostUnderOver)).toLocaleString("id-ID")})`
                    : `Rp ${Math.round(activeData.biayaProduksi.weeklyCostUnderOver).toLocaleString("id-ID")}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Status:{" "}
                <span
                  className={`font-bold ${
                    activeData.biayaProduksi.weeklyCostUnderOver >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {activeData.biayaProduksi.weeklyCostUnderOver >= 0
                    ? "Hemat (Under Budget)"
                    : "Over Budget"}
                </span>
              </p>
            </div>
          </div>

          {/* Card 4: YTD Cost Under / (Over) */}
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
                    activeData.biayaProduksi.ytdCostUnderOver >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {activeData.biayaProduksi.ytdCostUnderOver < 0
                    ? `(Rp ${Math.abs(Math.round(activeData.biayaProduksi.ytdCostUnderOver)).toLocaleString("id-ID")})`
                    : `Rp ${Math.round(activeData.biayaProduksi.ytdCostUnderOver).toLocaleString("id-ID")}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Kumulatif YTD hingga{" "}
                <span className="font-semibold text-slate-700">
                  {viewMode === "month"
                    ? selectedMonthKey
                    : activeData.report.periodName.split("-")[1] || activeData.report.periodName}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Table presentation */}
      {isDataLoading ? (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-xs gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-500">
            {viewMode === "month"
              ? "Mengkalkulasi akumulasi biaya bulanan..."
              : "Mengkalkulasi Laporan Cost Operasional..."}
          </span>
        </div>
      ) : activeData ? (
        <CostReportTable
          data={activeData}
          viewMode={viewMode}
          customPeriodLabel={
            viewMode === "month"
              ? `Akumulasi Bulan ${selectedMonthKey}`
              : undefined
          }
        />
      ) : (
        <div className="h-48 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 text-center p-6">
          <AlertCircle size={28} className="text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Belum ada laporan {viewMode === "month" ? "bulanan" : "mingguan"} untuk site {selectedSite}
          </p>
          {onNavigateToInput && (
            <button
              onClick={onNavigateToInput}
              className="mt-3 px-4 py-2 text-xs font-bold text-white bg-[#e95623] hover:bg-[#d44415] rounded-xl transition-all cursor-pointer"
            >
              Buka Halaman Input Cost
            </button>
          )}
        </div>
      )}

      {isEditPeriodModalOpen && reportDetails && (
        <EditPeriodModal
          user={user}
          isOpen={isEditPeriodModalOpen}
          onClose={() => setIsEditPeriodModalOpen(false)}
          reportDetails={reportDetails}
          onSuccess={async () => {
            await loadReportsList(selectedSite);
            if (selectedReportId) {
              await loadReportDetails(selectedReportId);
            }
          }}
        />
      )}
    </div>
  );
};
