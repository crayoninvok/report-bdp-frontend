"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, JobSite } from "../types/auth";
import { PLSummaryOpsData, PLSummaryOpsItemData } from "../types/report";
import { reportService } from "../services/reportService";
import {
  FileSpreadsheet,
  Eye,
  Calendar,
  Building2,
  TrendingUp,
  DollarSign,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  BarChart3,
  TableProperties,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface SummaryOpsViewProps {
  user: User;
}

export const SummaryOpsView: React.FC<SummaryOpsViewProps> = ({ user }) => {
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const [selectedSite, setSelectedSite] = useState<JobSite>(
    isHeadOffice ? "Senyiur" : user.jobSite
  );
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [summaries, setSummaries] = useState<PLSummaryOpsData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // default to latest month (Oct)
  const [viewMode, setViewMode] = useState<"detail" | "matrix" | "chart">("detail");
  const [matrixMetric, setMatrixMetric] = useState<"cost" | "idrTon" | "all">("cost");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary ops data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportService.getSummaryOps(selectedSite, selectedYear);
      setSummaries(data);
      if (data.length > 0) {
        // Find if selectedMonth exists, otherwise select the latest month available
        const hasCurrent = data.some((d) => d.month === selectedMonth);
        if (!hasCurrent) {
          const maxMonth = Math.max(...data.map((d) => d.month));
          setSelectedMonth(maxMonth);
        }
      }
    } catch (err: any) {
      console.error("Error loading summary ops:", err);
      setError(err.message || "Gagal memuat data Laporan Summary");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSite, selectedYear]);

  // Selected single month data
  const currentSummary = useMemo(() => {
    return summaries.find((s) => s.month === selectedMonth) || null;
  }, [summaries, selectedMonth]);

  // Formatters
  const formatIDR = (val: number | null | undefined, isParenthesisForNegative = true) => {
    if (val === null || val === undefined || val === 0) return "-";
    const rounded = Math.round(val);
    const absStr = Math.abs(rounded).toLocaleString("id-ID");
    if (rounded < 0) {
      return isParenthesisForNegative ? `(${absStr})` : `-${absStr}`;
    }
    return absStr;
  };

  const formatTon = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    return Math.round(val).toLocaleString("id-ID");
  };

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    return `${val.toFixed(2).replace(".", ",")}%`;
  };

  const formatPerTon = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    const rounded = Math.round(val);
    if (rounded < 0) {
      return `(${Math.abs(rounded).toLocaleString("id-ID")})`;
    }
    return rounded.toLocaleString("id-ID");
  };

  // Find Total Biaya Produksi from items
  const biayaProduksiItem = useMemo(() => {
    if (!currentSummary) return null;
    return (
      currentSummary.items.find(
        (it) => it.accountName.trim().toUpperCase() === "BIAYA PRODUKSI"
      ) || null
    );
  }, [currentSummary]);

  // YTD aggregated metrics
  const ytdTotals = useMemo(() => {
    let budgetProd = 0;
    let realProd = 0;
    let budgetCost = 0;
    let realCost = 0;

    summaries.forEach((s) => {
      budgetProd += s.budgetProduksi || 0;
      realProd += s.realisasiProduksi || 0;

      const bp = s.items.find(
        (it) => it.accountName.trim().toUpperCase() === "BIAYA PRODUKSI"
      );
      if (bp) {
        budgetCost += bp.budgetCost || 0;
        realCost += bp.realisasiCost || 0;
      }
    });

    const achProd = budgetProd > 0 ? (realProd / budgetProd) * 100 : 0;
    const achCost = budgetCost > 0 ? (realCost / budgetCost) * 100 : 0;
    const budgetIdrTon = budgetProd > 0 ? budgetCost / budgetProd : 0;
    const realIdrTon = realProd > 0 ? realCost / realProd : 0;

    return {
      budgetProd,
      realProd,
      achProd,
      budgetCost,
      realCost,
      achCost,
      budgetIdrTon,
      realIdrTon,
      varianceCost: budgetCost - realCost,
      variancePerTon: budgetIdrTon - realIdrTon,
    };
  }, [summaries]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return summaries
      .slice()
      .sort((a, b) => a.month - b.month)
      .map((s) => {
        const bp = s.items.find(
          (it) => it.accountName.trim().toUpperCase() === "BIAYA PRODUKSI"
        );
        return {
          month: s.monthLabel,
          prodBudget: Math.round(s.budgetProduksi || 0),
          prodReal: Math.round(s.realisasiProduksi || 0),
          costBudgetM: bp ? Math.round((bp.budgetCost || 0) / 1000000) / 1000 : 0, // in Billions (Milyar)
          costRealM: bp ? Math.round((bp.realisasiCost || 0) / 1000000) / 1000 : 0,
          idrTonBudget: s.budgetProduksi > 0 && bp && bp.budgetIdrPerTon > 0 ? Math.round(bp.budgetIdrPerTon) : null,
          idrTonReal: s.realisasiProduksi > 0 && bp && bp.realisasiIdrPerTon > 0 ? Math.round(bp.realisasiIdrPerTon) : null,
          achProd: s.achProduksiPercent ? s.achProduksiPercent : 0,
        };
      });
  }, [summaries]);

  // Export CSV
  const handleExportCSV = () => {
    if (!currentSummary) return;
    const headers = [
      "Akun",
      "Budget Tonnase (Ton)",
      "Budget Cost (IDR)",
      "Budget % NS",
      "Budget IDR/Ton",
      "Realisasi Tonnase (Ton)",
      "Realisasi Cost (IDR)",
      "Realisasi % NS",
      "Realisasi IDR/Ton",
      "% ACH",
      "Cost Under/Over Per Ton",
      "Cost Under/Over Total",
    ];

    const rows: string[][] = [];

    // Produksi row
    rows.push([
      "PRODUKSI (TON)",
      currentSummary.budgetProduksi ? currentSummary.budgetProduksi.toString() : "-",
      "-",
      "-",
      "-",
      currentSummary.realisasiProduksi ? currentSummary.realisasiProduksi.toString() : "-",
      "-",
      "-",
      "-",
      currentSummary.achProduksiPercent ? currentSummary.achProduksiPercent.toFixed(2) + "%" : "-",
      "-",
      "-",
    ]);

    // Items
    currentSummary.items.forEach((it) => {
      rows.push([
        `"${it.accountName.trim()}"`,
        "-",
        it.budgetCost ? it.budgetCost.toString() : "-",
        it.budgetPercentNS ? it.budgetPercentNS.toFixed(2) + "%" : "-",
        it.budgetIdrPerTon ? it.budgetIdrPerTon.toFixed(2) : "-",
        "-",
        it.realisasiCost ? it.realisasiCost.toString() : "-",
        it.realisasiPercentNS ? it.realisasiPercentNS.toFixed(2) + "%" : "-",
        it.realisasiIdrPerTon ? it.realisasiIdrPerTon.toFixed(2) : "-",
        it.achPercent ? it.achPercent.toFixed(2) + "%" : "-",
        it.costUnderOverPerTon ? it.costUnderOverPerTon.toFixed(2) : "-",
        it.costUnderOver ? it.costUnderOver.toString() : "-",
      ]);
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      `download`,
      `PL_Summary_1_OPS_${selectedSite}_${currentSummary.monthLabel}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-batara-orange-50 text-[#e95623] rounded-xl border border-batara-orange-200 shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Laporan Summary Operasional
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  <Eye size={11} /> Views Only
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sheet <span className="font-semibold text-slate-700 font-mono">PL Summary 1 OPS</span> &bull; Terkalkulasi otomatis dari Laporan Laba Rugi Operasional
              </p>
            </div>
          </div>
        </div>

        {/* Action & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Site Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {isHeadOffice ? (
              (["Senyiur", "MuaraPahu"] as const).map((site) => {
                const isSelected = selectedSite === site;
                return (
                  <button
                    key={site}
                    onClick={() => setSelectedSite(site)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      isSelected
                        ? "bg-white text-[#e95623] font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {site === "Senyiur" ? "Site Senyiur" : "Site Muara Pahu"}
                  </button>
                );
              })
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-xs">
                <Building2
                  size={14}
                  className={selectedSite === "MuaraPahu" ? "text-emerald-600" : "text-amber-600"}
                />
                <span className={selectedSite === "MuaraPahu" ? "text-emerald-800" : "text-amber-800"}>
                  Site {selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                  Site Anda
                </span>
              </div>
            )}
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <span>{selectedYear}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-blue-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={!currentSummary}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e95623] text-white rounded-xl text-xs font-semibold hover:bg-[#d44415] shadow-xs transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. PANDUAN LAPORAN SUMMARY BANNER */}
      <div className="p-4 bg-linear-to-r from-orange-50/70 via-slate-50 to-teal-50/40 rounded-2xl border border-orange-200/80 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#e95623] text-white rounded-xl shadow-xs mt-0.5 shrink-0">
            <Info size={16} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                Panduan: Perbedaan Volume Produksi (Ton) vs Biaya per Ton (IDR/Ton)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Sheet PL Summary 1 OPS &bull; Views Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-600">
              <div className="p-2.5 bg-white rounded-xl border border-blue-100/80 shadow-2xs">
                <span className="font-bold text-slate-900 block mb-0.5">
                  1. Target Produksi (Ton)
                </span>
                Target volume penambangan batubara (Tonase). Jika berstatus tanda strip (<span className="font-mono font-bold text-slate-800">-</span>), berarti <strong>tidak ada aktivitas produksi</strong> pada bulan tersebut.
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100/80 shadow-2xs">
                <span className="font-bold text-slate-900 block mb-0.5">
                  2. IDR / Ton (Biaya per Ton)
                </span>
                Rasio efisiensi biaya dibagi volume produksi (<span className="font-mono text-slate-800">Biaya / Tonase</span>). Jika bulan tersebut tidak ada produksi (<span className="font-mono font-bold text-slate-800">-</span>), maka IDR/Ton otomatis berstatus strip (<span className="font-mono font-bold text-slate-800">-</span>).
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100/80 shadow-2xs">
                <span className="font-bold text-slate-900 block mb-0.5">
                  3. Arti Tanda Strip (-)
                </span>
                Tanda strip (<span className="font-mono font-bold text-slate-800">-</span>) menandakan <strong>belum ada penambangan batubara</strong> (seperti Site Muara Pahu bulan Jan–Jul yang merupakan masa pra-operasi/setup).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI CARDS */}
      {currentSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Volume Produksi (Ton) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Volume Produksi ({currentSummary.monthLabel})
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Boxes size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {currentSummary.realisasiProduksi > 0 ? (
                  <>
                    {formatTon(currentSummary.realisasiProduksi)}{" "}
                    <span className="text-xs font-medium text-slate-500">Ton</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-mono text-xl">-</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>
                  Budget:{" "}
                  {currentSummary.budgetProduksi > 0
                    ? `${formatTon(currentSummary.budgetProduksi)} Ton`
                    : "-"}
                </span>
                <span
                  className={`font-bold ${
                    currentSummary.budgetProduksi > 0 && currentSummary.realisasiProduksi > 0
                      ? currentSummary.achProduksiPercent >= 100
                        ? "text-emerald-600"
                        : "text-amber-600"
                      : "text-slate-400"
                  }`}
                >
                  {currentSummary.budgetProduksi > 0 && currentSummary.realisasiProduksi > 0
                    ? `${formatPercent(currentSummary.achProduksiPercent)} ACH`
                    : currentSummary.realisasiProduksi === 0
                    ? "(Tidak Ada Produksi)"
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Biaya Produksi */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Biaya Produksi Total</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <DollarSign size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {biayaProduksiItem && biayaProduksiItem.realisasiCost > 0 ? (
                  <>
                    Rp {(biayaProduksiItem.realisasiCost / 1_000_000_000).toFixed(2)}{" "}
                    <span className="text-xs font-medium text-slate-500">Miliar</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-mono text-xl">-</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>
                  Budget:{" "}
                  {biayaProduksiItem && biayaProduksiItem.budgetCost > 0
                    ? `Rp ${(biayaProduksiItem.budgetCost / 1_000_000_000).toFixed(2)} M`
                    : "-"}
                </span>
                <span
                  className={`font-bold ${
                    biayaProduksiItem && biayaProduksiItem.budgetCost > 0 && biayaProduksiItem.realisasiCost > 0
                      ? biayaProduksiItem.achPercent <= 100
                        ? "text-emerald-600"
                        : "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {biayaProduksiItem && biayaProduksiItem.budgetCost > 0
                    ? `${formatPercent(biayaProduksiItem.achPercent)} ACH`
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Biaya per Ton (IDR/Ton) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Biaya per Ton (IDR/Ton)
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp size={18} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {currentSummary.realisasiProduksi > 0 &&
                biayaProduksiItem &&
                biayaProduksiItem.realisasiIdrPerTon > 0 ? (
                  <>
                    Rp {formatPerTon(biayaProduksiItem.realisasiIdrPerTon)}{" "}
                    <span className="text-xs font-medium text-slate-500">/ Ton</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-mono text-xl">-</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>
                  Budget:{" "}
                  {currentSummary.budgetProduksi > 0 &&
                  biayaProduksiItem &&
                  biayaProduksiItem.budgetIdrPerTon > 0
                    ? `Rp ${formatPerTon(biayaProduksiItem.budgetIdrPerTon)} / Ton`
                    : "-"}
                </span>
                {currentSummary.realisasiProduksi > 0 &&
                currentSummary.budgetProduksi > 0 &&
                biayaProduksiItem ? (
                  <span
                    className={`font-bold ${
                      biayaProduksiItem.costUnderOverPerTon >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {biayaProduksiItem.costUnderOverPerTon >= 0 ? "Hemat" : "Over"}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px] font-medium">
                    (Tidak ada pembagi tonase)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Cost Efficiency (Under/Over) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Efisiensi Biaya (Under/Over)</span>
              <div className={`p-2 rounded-lg ${biayaProduksiItem && biayaProduksiItem.costUnderOver >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {biayaProduksiItem && biayaProduksiItem.costUnderOver >= 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
              </div>
            </div>
            <div>
              <div className={`text-2xl font-black ${biayaProduksiItem && biayaProduksiItem.costUnderOver >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {biayaProduksiItem && (biayaProduksiItem.budgetCost > 0 || biayaProduksiItem.realisasiCost > 0)
                  ? formatIDR(biayaProduksiItem.costUnderOver)
                  : "-"}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>
                  Per Ton:{" "}
                  {currentSummary.budgetProduksi > 0 &&
                  currentSummary.realisasiProduksi > 0 &&
                  biayaProduksiItem &&
                  biayaProduksiItem.costUnderOverPerTon !== 0
                    ? `Rp ${formatPerTon(biayaProduksiItem.costUnderOverPerTon)}`
                    : "-"}
                </span>
                <span className="font-semibold text-slate-600">
                  {biayaProduksiItem && (biayaProduksiItem.budgetCost > 0 || biayaProduksiItem.realisasiCost > 0)
                    ? biayaProduksiItem.costUnderOver >= 0
                      ? "Efisiensi Biaya"
                      : "Over Budget"
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW MODE TABS & MONTH SELECTOR BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setViewMode("detail")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "detail"
                ? "bg-white text-[#e95623] font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableProperties size={14} />
            <span>Detail Bulanan</span>
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "matrix"
                ? "bg-white text-[#e95623] font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>Matriks Seluruh Bulan</span>
          </button>
          <button
            onClick={() => setViewMode("chart")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "chart"
                ? "bg-white text-[#e95623] font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 size={14} />
            <span>Grafik Kinerja</span>
          </button>
        </div>

        {/* Month Pills (Only shown in Detail mode) */}
        {viewMode === "detail" && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {summaries
              .slice()
              .sort((a, b) => a.month - b.month)
              .map((s) => {
                const isSelected = selectedMonth === s.month;
                return (
                  <button
                    key={s.month}
                    onClick={() => setSelectedMonth(s.month)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-[#e95623] text-white font-bold shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s.monthLabel}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* 5. MAIN CONTENT BASED ON VIEW MODE */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="h-8 w-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mb-3" />
          <span className="text-xs font-semibold text-slate-500">Memuat data Laporan Summary Operasional...</span>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-700">
          <p className="font-bold text-sm mb-1">Terjadi Kesalahan</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : viewMode === "detail" && currentSummary ? (
        /* ============================================================== */
        /* TAB 1: DETAIL BULANAN (SAMA PERSIS SHEET PL SUMMARY 1 OPS)     */
        /* ============================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Laporan PL Summary 1 OPS &bull; {selectedSite === "Senyiur" ? "Site Senyiur" : "Site Muara Pahu"} ({currentSummary.monthLabel} {selectedYear})
              </h2>
              <p className="text-[11px] text-slate-500">
                Nilai realisasi, alokasi budget, rasio persentase Net Sales (% NS), dan indeks IDR per Ton.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold font-mono">
              Periode: {currentSummary.periodName || currentSummary.monthLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300">
                  <th rowSpan={2} className="px-4 py-3 border border-slate-300 text-left min-w-70">
                    AKUN
                  </th>
                  <th colSpan={4} className="px-3 py-2 border border-slate-300 text-center bg-blue-50/70 text-blue-900">
                    BUDGET
                  </th>
                  <th colSpan={4} className="px-3 py-2 border border-slate-300 text-center bg-emerald-50/70 text-emerald-900">
                    REALISASI
                  </th>
                  <th colSpan={3} className="px-3 py-2 border border-slate-300 text-center bg-purple-50/70 text-purple-900">
                    KINERJA & EFISIENSI
                  </th>
                </tr>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-300">
                  {/* Budget */}
                  <th className="px-2.5 py-2 border border-slate-300 text-right bg-blue-50/60 min-w-28">TONNASE (Ton)</th>
                  <th className="px-3 py-2 border border-slate-300 text-right bg-blue-50/40 min-w-32.5">COST (Rp)</th>
                  <th className="px-2 py-2 border border-slate-300 text-right bg-blue-50/40 min-w-17.5">% NS</th>
                  <th className="px-2 py-2 border border-slate-300 text-right bg-blue-50/40 min-w-22.5">IDR/Ton</th>
                  {/* Realisasi */}
                  <th className="px-2.5 py-2 border border-slate-300 text-right bg-emerald-50/60 min-w-28">TONNASE (Ton)</th>
                  <th className="px-3 py-2 border border-slate-300 text-right bg-emerald-50/40 min-w-32.5">COST (Rp)</th>
                  <th className="px-2 py-2 border border-slate-300 text-right bg-emerald-50/40 min-w-17.5">% NS</th>
                  <th className="px-2 py-2 border border-slate-300 text-right bg-emerald-50/40 min-w-22.5">IDR/Ton</th>
                  {/* Kinerja */}
                  <th className="px-2 py-2 border border-slate-300 text-right bg-purple-50/40 min-w-20">% ACH</th>
                  <th className="px-2 py-2 border border-slate-300 text-right bg-purple-50/40 min-w-27.5">Under/(Over) /Ton</th>
                  <th className="px-3 py-2 border border-slate-300 text-right bg-purple-50/40 min-w-32.5">Under/(Over) Cost</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. PRODUKSI ROW */}
                <tr className="bg-amber-50/60 font-bold border-b border-slate-300">
                  <td className="px-4 py-2.5 border border-slate-300 text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">PRODUKSI</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                        Satuan: Ton
                      </span>
                      {currentSummary.realisasiProduksi === 0 && currentSummary.budgetProduksi === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-normal">
                          (Tidak Ada Produksi)
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Budget */}
                  <td className="px-2.5 py-2.5 border border-slate-300 text-right font-mono text-slate-800 font-bold">
                    {currentSummary.budgetProduksi > 0 ? `${formatTon(currentSummary.budgetProduksi)} Ton` : "-"}
                  </td>
                  <td className="px-3 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  <td className="px-2 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  <td className="px-2 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  {/* Realisasi */}
                  <td className="px-2.5 py-2.5 border border-slate-300 text-right font-mono text-slate-900 font-bold">
                    {currentSummary.realisasiProduksi > 0 ? `${formatTon(currentSummary.realisasiProduksi)} Ton` : "-"}
                  </td>
                  <td className="px-3 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  <td className="px-2 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  <td className="px-2 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  {/* Kinerja */}
                  <td className="px-2 py-2.5 border border-slate-300 text-right font-mono">
                    {currentSummary.budgetProduksi > 0 && currentSummary.realisasiProduksi > 0 ? (
                      <span className={currentSummary.achProduksiPercent >= 100 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                        {formatPercent(currentSummary.achProduksiPercent)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                  <td className="px-3 py-2.5 border border-slate-300 text-center text-slate-400 font-mono">-</td>
                </tr>

                {/* 2. ITEM ROWS */}
                {currentSummary.items.map((item) => {
                  const isTotalBiayaProduksi = item.accountName.trim().toUpperCase() === "BIAYA PRODUKSI";
                  const isSubAccount =
                    item.accountName.includes("BEBAN FUEL") ||
                    item.accountName.includes("BEBAN TYRE") ||
                    item.accountName.includes("BEBAN RENTAL ALAT PRODUKSI") ||
                    item.accountName.includes("BEBAN SPAREPART") ||
                    item.accountName.includes("BEBAN TOOLS") ||
                    item.accountName.includes("BEBAN RENTAL ALAT NON PRODUKSI");

                  const rowClass = isTotalBiayaProduksi
                    ? "bg-blue-100/70 font-extrabold text-blue-950 border-y-2 border-blue-400"
                    : isSubAccount
                    ? "bg-slate-50/50 text-slate-700"
                    : "bg-white font-semibold text-slate-900";

                  return (
                    <tr key={item.id} className={`border-b border-slate-200 hover:bg-blue-50/30 transition-colors ${rowClass}`}>
                      {/* Akun Name */}
                      <td className="px-4 py-2 border border-slate-300">
                        <div className="flex items-center gap-1.5">
                          {isSubAccount && <span className="text-slate-400 font-mono text-xs pl-4">↳</span>}
                          <span className={isTotalBiayaProduksi ? "text-blue-950" : isSubAccount ? "text-slate-700" : "text-blue-800"}>
                            {item.accountName}
                          </span>
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="px-2.5 py-2 border border-slate-300 text-center text-slate-400 font-mono">
                        -
                      </td>
                      <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                        {formatIDR(item.budgetCost)}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                        {item.budgetCost > 0 ? formatPercent(item.budgetPercentNS) : "-"}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                        {currentSummary.budgetProduksi > 0 && item.budgetIdrPerTon > 0
                          ? formatPerTon(item.budgetIdrPerTon)
                          : "-"}
                      </td>

                      {/* Realisasi */}
                      <td className="px-2.5 py-2 border border-slate-300 text-center text-slate-400 font-mono">
                        -
                      </td>
                      <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                        {formatIDR(item.realisasiCost)}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                        {item.realisasiCost > 0 ? formatPercent(item.realisasiPercentNS) : "-"}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                        {currentSummary.realisasiProduksi > 0 && item.realisasiIdrPerTon > 0
                          ? formatPerTon(item.realisasiIdrPerTon)
                          : "-"}
                      </td>

                      {/* Kinerja */}
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono font-bold">
                        {item.budgetCost > 0 ? (
                          <span className={item.achPercent <= 100 ? "text-emerald-700" : "text-rose-700"}>
                            {formatPercent(item.achPercent)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                        {currentSummary.budgetProduksi > 0 &&
                        currentSummary.realisasiProduksi > 0 &&
                        item.costUnderOverPerTon !== 0 ? (
                          <span className={item.costUnderOverPerTon >= 0 ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                            {formatPerTon(item.costUnderOverPerTon)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                        {item.costUnderOver !== 0 ? (
                          <span className={item.costUnderOver >= 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                            {formatIDR(item.costUnderOver)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === "matrix" ? (
        /* ============================================================== */
        /* TAB 2: MATRIKS SELURUH BULAN (ALL MONTHS GRID YTD)             */
        /* ============================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Matriks Tahunan Operasional &bull; {selectedSite === "Senyiur" ? "Site Senyiur" : "Site Muara Pahu"} ({selectedYear})
              </h2>
              <p className="text-[11px] text-slate-500">
                Komparasi seluruh bulan Januari s/d Oktober 2026. Tanda strip (<span className="font-mono font-bold">-</span>) menandakan tidak ada aktivitas produksi batubara di bulan tersebut.
              </p>
            </div>

            {/* Metric Mode Filter (Cost vs IDR/Ton vs Lengkap) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setMatrixMetric("cost")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    matrixMetric === "cost"
                      ? "bg-white text-blue-700 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Beban Biaya (IDR)
                </button>
                <button
                  onClick={() => setMatrixMetric("idrTon")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    matrixMetric === "idrTon"
                      ? "bg-white text-blue-700 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Biaya per Ton (IDR/Ton)
                </button>
                <button
                  onClick={() => setMatrixMetric("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    matrixMetric === "all"
                      ? "bg-white text-blue-700 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Lengkap (Cost & IDR/Ton)
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                <span>YTD: {ytdTotals.realProd > 0 ? `${formatTon(ytdTotals.realProd)} Ton` : "-"}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th rowSpan={2} className="px-4 py-3 border border-slate-300 text-left min-w-65 sticky left-0 bg-slate-100 z-10 shadow-xs">
                    AKUN
                  </th>
                  {summaries
                    .slice()
                    .sort((a, b) => a.month - b.month)
                    .map((s) => (
                      <th
                        key={s.month}
                        colSpan={matrixMetric === "all" ? 3 : 2}
                        className="px-3 py-2 border border-slate-300 text-center min-w-45 bg-slate-50"
                      >
                        {s.monthLabel}
                      </th>
                    ))}
                  <th
                    colSpan={matrixMetric === "all" ? 3 : 2}
                    className="px-3 py-2 border border-slate-300 text-center min-w-50 bg-blue-100/70 text-blue-900"
                  >
                    TOTAL YTD 2026
                  </th>
                </tr>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-300">
                  {summaries
                    .slice()
                    .sort((a, b) => a.month - b.month)
                    .map((s) => (
                      <React.Fragment key={`sub-${s.month}`}>
                        {matrixMetric === "cost" ? (
                          <>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-blue-700">Budget (Rp)</th>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-emerald-700">Realisasi (Rp)</th>
                          </>
                        ) : matrixMetric === "idrTon" ? (
                          <>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-blue-700">Budget (Rp/Ton)</th>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-emerald-700">Realisasi (Rp/Ton)</th>
                          </>
                        ) : (
                          <>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-emerald-700">Cost (Rp)</th>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-indigo-700">IDR/Ton</th>
                            <th className="px-2 py-1.5 border border-slate-300 text-right text-purple-700">% ACH</th>
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  {matrixMetric === "cost" ? (
                    <>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-blue-900">Budget (Rp)</th>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-emerald-900">Realisasi (Rp)</th>
                    </>
                  ) : matrixMetric === "idrTon" ? (
                    <>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-blue-900">Budget (Rp/Ton)</th>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-emerald-900">Realisasi (Rp/Ton)</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-emerald-900">Cost YTD</th>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-indigo-900">IDR/Ton</th>
                      <th className="px-2 py-1.5 border border-slate-300 text-right bg-blue-50 text-purple-900">% ACH</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* PRODUKSI ROW */}
                <tr className="bg-amber-50/60 font-bold border-b border-slate-300">
                  <td className="px-4 py-2 border border-slate-300 text-slate-900 sticky left-0 bg-amber-50/90 z-10 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span>PRODUKSI</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200/80 text-amber-900 font-semibold">
                        Ton
                      </span>
                    </div>
                  </td>
                  {summaries
                    .slice()
                    .sort((a, b) => a.month - b.month)
                    .map((s) => (
                      <React.Fragment key={`p-${s.month}`}>
                        {matrixMetric === "all" ? (
                          <>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-900 font-bold">
                              {s.realisasiProduksi > 0 ? `${formatTon(s.realisasiProduksi)} Ton` : "-"}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center font-mono text-slate-400">
                              -
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                              {s.budgetProduksi > 0 && s.realisasiProduksi > 0 ? (
                                <span className={s.achProduksiPercent >= 100 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                                  {formatPercent(s.achProduksiPercent)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-600">
                              {s.budgetProduksi > 0 ? `${formatTon(s.budgetProduksi)} Ton` : "-"}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-900 font-bold">
                              {s.realisasiProduksi > 0 ? `${formatTon(s.realisasiProduksi)} Ton` : "-"}
                            </td>
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  {matrixMetric === "all" ? (
                    <>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-emerald-900">
                        {ytdTotals.realProd > 0 ? `${formatTon(ytdTotals.realProd)} Ton` : "-"}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-center font-mono bg-blue-50/60 text-slate-400">
                        -
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-blue-900">
                        {ytdTotals.budgetProd > 0 && ytdTotals.realProd > 0
                          ? formatPercent((ytdTotals.realProd / ytdTotals.budgetProd) * 100)
                          : "-"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-blue-950">
                        {ytdTotals.budgetProd > 0 ? `${formatTon(ytdTotals.budgetProd)} Ton` : "-"}
                      </td>
                      <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-emerald-900">
                        {ytdTotals.realProd > 0 ? `${formatTon(ytdTotals.realProd)} Ton` : "-"}
                      </td>
                    </>
                  )}
                </tr>

                {/* DISTINCT ACCOUNT NAMES ACROSS ALL MONTHS */}
                {(() => {
                  const firstSummary = summaries[0];
                  if (!firstSummary) return null;

                  return firstSummary.items.map((sampleItem) => {
                    const accName = sampleItem.accountName;
                    const isTotalBiaya = accName.trim().toUpperCase() === "BIAYA PRODUKSI";
                    const isSubAccount =
                      accName.includes("BEBAN FUEL") ||
                      accName.includes("BEBAN TYRE") ||
                      accName.includes("BEBAN RENTAL ALAT PRODUKSI") ||
                      accName.includes("BEBAN SPAREPART") ||
                      accName.includes("BEBAN TOOLS") ||
                      accName.includes("BEBAN RENTAL ALAT NON PRODUKSI");

                    let ytdBudgetAcc = 0;
                    let ytdRealAcc = 0;

                    const rowClass = isTotalBiaya
                      ? "bg-blue-100/70 font-extrabold text-blue-950 border-y-2 border-blue-400"
                      : isSubAccount
                      ? "bg-slate-50/50 text-slate-700"
                      : "bg-white font-semibold text-slate-900";

                    return (
                      <tr key={accName} className={`border-b border-slate-200 hover:bg-blue-50/20 transition-colors ${rowClass}`}>
                        {/* Sticky Name */}
                        <td className={`px-4 py-2 border border-slate-300 sticky left-0 z-10 shadow-xs ${isTotalBiaya ? "bg-blue-100" : isSubAccount ? "bg-slate-50" : "bg-white"}`}>
                          <div className="flex items-center gap-1.5">
                            {isSubAccount && <span className="text-slate-400 font-mono text-xs pl-4">↳</span>}
                            <span>{accName}</span>
                          </div>
                        </td>

                        {/* Each Month */}
                        {summaries
                          .slice()
                          .sort((a, b) => a.month - b.month)
                          .map((s) => {
                            const it = s.items.find((item) => item.accountName === accName);
                            const bCost = it ? it.budgetCost : 0;
                            const rCost = it ? it.realisasiCost : 0;
                            const bTon = it ? it.budgetIdrPerTon : 0;
                            const rTon = it ? it.realisasiIdrPerTon : 0;
                            const ach = it ? it.achPercent : 0;

                            ytdBudgetAcc += bCost;
                            ytdRealAcc += rCost;

                            return (
                              <React.Fragment key={`${s.month}-${accName}`}>
                                {matrixMetric === "cost" ? (
                                  <>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-600">
                                      {formatIDR(bCost)}
                                    </td>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-900">
                                      {formatIDR(rCost)}
                                    </td>
                                  </>
                                ) : matrixMetric === "idrTon" ? (
                                  <>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-600">
                                      {s.budgetProduksi > 0 && bTon > 0 ? formatPerTon(bTon) : "-"}
                                    </td>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-900">
                                      {s.realisasiProduksi > 0 && rTon > 0 ? formatPerTon(rTon) : "-"}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-900">
                                      {formatIDR(rCost)}
                                    </td>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono text-slate-700">
                                      {s.realisasiProduksi > 0 && rTon > 0 ? formatPerTon(rTon) : "-"}
                                    </td>
                                    <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                                      {bCost > 0 ? (
                                        <span className={ach <= 100 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                                          {formatPercent(ach)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-normal">-</span>
                                      )}
                                    </td>
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}

                        {/* YTD Total */}
                        {matrixMetric === "cost" ? (
                          <>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-blue-950">
                              {formatIDR(ytdBudgetAcc)}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-emerald-900">
                              {formatIDR(ytdRealAcc)}
                            </td>
                          </>
                        ) : matrixMetric === "idrTon" ? (
                          <>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-blue-950">
                              {ytdTotals.budgetProd > 0 ? formatPerTon(ytdBudgetAcc / ytdTotals.budgetProd) : "-"}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-emerald-900">
                              {ytdTotals.realProd > 0 ? formatPerTon(ytdRealAcc / ytdTotals.realProd) : "-"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-emerald-900">
                              {formatIDR(ytdRealAcc)}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-indigo-900">
                              {ytdTotals.realProd > 0 ? formatPerTon(ytdRealAcc / ytdTotals.realProd) : "-"}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-right font-mono bg-blue-50/60 font-bold text-blue-900">
                              {ytdBudgetAcc > 0 ? formatPercent((ytdRealAcc / ytdBudgetAcc) * 100) : "-"}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* TAB 3: GRAFIK KINERJA BULANAN (CHARTS)                         */
        /* ============================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Produksi Bulanan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tren Produksi Bulanan (Tonase)</h3>
                <p className="text-[11px] text-slate-500">Perbandingan target budget vs realisasi produksi</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">Ton</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => formatTon(val) + " Ton"}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="prodBudget" name="Budget Produksi" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prodReal" name="Realisasi Produksi" fill="#18bebc" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="prodReal" name="Tren Realisasi" stroke="#0e9f9d" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Biaya Produksi Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Total Biaya Produksi (Miliar Rupiah)</h3>
                <p className="text-[11px] text-slate-500">Budget vs realisasi pengeluaran per bulan</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-batara-orange-50 text-[#e95623] text-xs font-semibold">Rp Miliar</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => "Rp " + Number(val).toFixed(2) + " Miliar"}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="costBudgetM" name="Budget Biaya (M)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costRealM" name="Realisasi Biaya (M)" fill="#e95623" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="costRealM" name="Tren Biaya" stroke="#b3340d" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: IDR per Ton */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Biaya per Ton (IDR / Ton)</h3>
                <p className="text-[11px] text-slate-500">Efisiensi pengeluaran per tonase produksi bulanan</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-batara-orange-50 text-[#e95623] text-xs font-semibold">IDR / Ton</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) =>
                      val === null || val === undefined || Number(val) === 0
                        ? "- (Tidak Ada Produksi)"
                        : "Rp " + Math.round(Number(val)).toLocaleString("id-ID") + " / Ton"
                    }
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="idrTonBudget" name="Budget IDR/Ton" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="idrTonReal" name="Realisasi IDR/Ton" fill="#e95623" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="idrTonReal" name="Garis Realisasi" stroke="#18bebc" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT & FOOTER DETAILS */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>
            Data tersinkronisasi dengan database Supabase PostgreSQL &bull; Sumber: <span className="font-semibold text-slate-700">10.26 - Lap Keu BDP 1 Update (PL Summary 1 OPS)</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span>PT Batara Dharma Persada</span>
          <span>&bull;</span>
          <span>Sistem Pelaporan Biaya Operasional</span>
        </div>
      </div>
    </div>
  );
};
