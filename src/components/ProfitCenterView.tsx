"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  glService,
  GLPeriodItem,
  GLProfitCenterData,
} from "../services/glService";
import {
  ShieldAlert,
  Calendar,
  Building2,
  DollarSign,
  Download,
  RefreshCw,
  Search,
  Truck,
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Percent,
  MapPin,
  Scale,
  Sparkles,
  Info,
  ChevronRight,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Globe,
  Layers,
  Users,
  Award,
  Wallet,
  Coins,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

interface ProfitCenterViewProps {
  user: User;
  onNavigateBack?: () => void;
}

export const ProfitCenterView: React.FC<ProfitCenterViewProps> = ({
  user,
  onNavigateBack,
}) => {
  // STRICT AUTHORIZATION CHECK:
  // Only dzaky.athariqf@bataramining.com & dellafajar@bataramining.com can open / view this module
  const allowedProfitCenterEmails = [
    "dzaky.athariqf@bataramining.com",
    "dellafajar@bataramining.com",
  ];
  const isAuthorized =
    !!user?.email && allowedProfitCenterEmails.includes(user.email.trim().toLowerCase());

  // State Management
  const [periods, setPeriods] = useState<GLPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profitData, setProfitData] = useState<GLProfitCenterData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Scope Tampilan: 'yearly' (Default YTD Akumulasi Penuh Tahun 2026) atau 'period' (Periode GL aktif)
  const [viewScope, setViewScope] = useState<"period" | "yearly">("yearly");

  // Rate Kontrak per Ton-KM (Tahun 2026 Default: Rp 1,050.00 ton/km)
  const [ratePerTonKm, setRatePerTonKm] = useState<number>(1050);
  // Tarif Pajak PPN (Default 15%, rentang 15% - 20%)
  const [ppnPercent, setPpnPercent] = useState<number>(15);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Kalkulator Bonus Karyawan States
  const [bonusPercent, setBonusPercent] = useState<number>(5);
  const [employeeCount, setEmployeeCount] = useState<number>(250);

  // Rata-rata Jarak (KM) dari semua tiket AssetFindr (Default berdasarkan data tiket aktual)
  const [avgKmOverall, setAvgKmOverall] = useState<number>(82.37);
  const [avgKmSny, setAvgKmSny] = useState<number>(73.37);
  const [avgKmMph, setAvgKmMph] = useState<number>(91.37);
  const [isCustomDistance, setIsCustomDistance] = useState<boolean>(false);

  // Search filter untuk rincian beban GL
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Format currency Rupiah
  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "Rp 0";
    return (
      "Rp " +
      Math.round(val).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  };

  // Format number
  const formatNum = (val?: number, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return val.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Load periods on mount
  useEffect(() => {
    if (!isAuthorized) return;
    const loadPeriods = async () => {
      try {
        const pList = await glService.getPeriods();
        setPeriods(pList);
        if (pList.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(pList[0].id);
        }
      } catch (err: any) {
        console.error("Gagal memuat periode GL:", err);
        setErrorMsg(err.message || "Gagal memuat periode GL");
      }
    };
    loadPeriods();
  }, [isAuthorized, selectedPeriodId]);

  // Load Profit Center data from API
  const loadProfitCenterData = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setIsLoading(true);
      setErrorMsg("");
      const res = await glService.getProfitCenter({
        year: selectedYear,
        periodId: selectedPeriodId || undefined,
        ratePerTonKm,
        ppnPercent,
        avgKmOverall,
        avgKmSny,
        avgKmMph,
      });

      if (res.success && res.data) {
        setProfitData(res.data);
        if (res.data.distances) {
          if (!isCustomDistance) {
            setAvgKmOverall(res.data.distances.overall || 82.37);
            setAvgKmSny(res.data.distances.sny || 73.37);
            setAvgKmMph(res.data.distances.mph || 91.37);
          }
        }
      } else {
        setErrorMsg(res.message || "Gagal mengambil data Profit Center.");
      }
    } catch (err: any) {
      console.error("Error loading profit center:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memuat Profit Center.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, selectedYear, ratePerTonKm, ppnPercent, avgKmOverall, avgKmSny, avgKmMph, isCustomDistance]);

  useEffect(() => {
    loadProfitCenterData();
  }, [loadProfitCenterData]);

  // ==============================================================
  // REAL-TIME ENGINE: Kalkulasi rumus instan di client saat slider/input diubah
  // ==============================================================
  const calculation = useMemo(() => {
    // 0. Data Tonase Tahun 2026 Penuh (YTD dari AssetFindr Jan - Des 2026)
    const yearlyTotalTon = profitData?.yearlyProduction?.totalTon || (selectedYear === 2026 ? 6420926.35 : selectedYear === 2025 ? 7186966 : 7209153);
    const yearlySnyTon = profitData?.yearlyProduction?.snyTon || (selectedYear === 2026 ? 5174053.1 : selectedYear === 2025 ? 5125437 : 5147624);
    const yearlyMphTon = profitData?.yearlyProduction?.mphTon || (selectedYear === 2026 ? 1246872.65 : 2061965);
    const yearlyTotalRit = profitData?.yearlyProduction?.totalRit || (selectedYear === 2026 ? 30153 : selectedYear === 2025 ? 32945 : 33045);
    const yearlySnyRit = profitData?.yearlyProduction?.snyRit || (selectedYear === 2026 ? 24110 : 23500);
    const yearlyMphRit = profitData?.yearlyProduction?.mphRit || (selectedYear === 2026 ? 6041 : 9445);

    // 1. Tonase Produksi Periode GL Aktif (Ton)
    const periodTonaseMph = profitData?.production?.mphTon || 0;
    const periodTonaseSny = profitData?.production?.snyTon || 0;
    const periodTotalTonase =
      profitData?.production?.totalTon || periodTonaseMph + periodTonaseSny;

    // Tentukan tonase yang aktif berdasarkan scope tampilan
    const isYearlyScope = true;
    const tonaseMph = yearlyMphTon;
    const tonaseSny = yearlySnyTon;
    const totalTonase = yearlyTotalTon;

    // 2. Average Distance (KM)
    const kmSny = avgKmSny;
    const kmMph = avgKmMph;
    const weightedAvgKm =
      totalTonase > 0
        ? (tonaseSny * kmSny + tonaseMph * kmMph) / totalTonase
        : avgKmOverall;
    const kmOverall = isCustomDistance ? avgKmOverall : weightedAvgKm;

    // 3. Rate Kontrak
    const rate = ratePerTonKm;

    // A. REVENUE = Total Tonase * Average Distance (km) * Rate per ton/km
    const revSny = Math.round(tonaseSny * kmSny * rate);
    const revMph = Math.round(tonaseMph * kmMph * rate);
    const revenue =
      revSny + revMph > 0 ? revSny + revMph : Math.round(totalTonase * kmOverall * rate);
    const keuntunganKotor = revenue;

    // Perhitungan Khusus Tahun 2026 Penuh
    const yearlyTonKmSny = yearlySnyTon * kmSny;
    const yearlyTonKmMph = yearlyMphTon * kmMph;
    const yearlyTonKmTotal = yearlyTonKmSny + yearlyTonKmMph;
    const yearlyRevSny = Math.round(yearlyTonKmSny * rate);
    const yearlyRevMph = Math.round(yearlyTonKmMph * rate);
    const yearlyGrossRevenue = yearlyRevSny + yearlyRevMph;

    // COST (Beban Biaya Operasional GL)
    const ytdOpexMph = profitData?.ytd?.opex?.mph ?? 59012938902;
    const ytdOpexSny = profitData?.ytd?.opex?.sny ?? 317033436148;
    const ytdOpexHof = profitData?.ytd?.opex?.hof ?? 13514226;
    const ytdTotalOpex = profitData?.ytd?.opex?.total ?? (ytdOpexMph + ytdOpexSny + ytdOpexHof);

    const periodOpexMph = profitData?.opex?.mph || 0;
    const periodOpexSny = profitData?.opex?.sny || 0;
    const periodOpexHof = profitData?.opex?.hof || 0;
    const periodTotalOpex = profitData?.opex?.total || (periodOpexMph + periodOpexSny + periodOpexHof);

    const opexMph = isYearlyScope ? ytdOpexMph : periodOpexMph;
    const opexSny = isYearlyScope ? ytdOpexSny : periodOpexSny;
    const opexHof = isYearlyScope ? ytdOpexHof : periodOpexHof;
    const cost = isYearlyScope ? ytdTotalOpex : periodTotalOpex;
    const totalBebanGL = cost;

    // B. PROFIT = (Revenue - Cost) - PPN (15% - 20%)
    const profitBeforePpn = revenue - cost;
    const profitBeforePpnMph = revMph - opexMph;
    const profitBeforePpnSny = revSny - opexSny;

    // Potongan PPN (sekitar 15-20%)
    const ppnAmount = Math.round(Math.max(0, profitBeforePpn) * (ppnPercent / 100));
    const ppnAmountMph = Math.round(Math.max(0, profitBeforePpnMph) * (ppnPercent / 100));
    const ppnAmountSny = Math.round(Math.max(0, profitBeforePpnSny) * (ppnPercent / 100));

    // Profit Final (Setelah PPN)
    const profit = profitBeforePpn - ppnAmount;
    const profitMph = profitBeforePpnMph - ppnAmountMph;
    const profitSny = profitBeforePpnSny - ppnAmountSny;
    const keuntunganBersih = profit;
    const keuntunganBersihMph = profitMph;
    const keuntunganBersihSny = profitSny;

    // Margin Persentase (%)
    const marginPercent =
      revenue > 0 ? (profit / revenue) * 100 : 0;
    const marginMph = revMph > 0 ? (profitMph / revMph) * 100 : 0;
    const marginSny = revSny > 0 ? (profitSny / revSny) * 100 : 0;

    // Ton-KM
    const tonKmSny = tonaseSny * kmSny;
    const tonKmMph = tonaseMph * kmMph;
    const tonKmTotal = totalTonase * kmOverall;

    // Per Ton metrics (Rp/Ton)
    const netPerTon =
      totalTonase > 0 ? Math.round(profit / totalTonase) : 0;
    const revPerTon =
      totalTonase > 0 ? Math.round(revenue / totalTonase) : 0;
    const costPerTon =
      totalTonase > 0 ? Math.round(cost / totalTonase) : 0;
    const ppnPerTon =
      totalTonase > 0 ? Math.round(ppnAmount / totalTonase) : 0;

    return {
      // Periode Aktif
      periodTonaseMph,
      periodTonaseSny,
      periodTotalTonase,

      // Yearly 2026 Data
      yearlyTotalTon,
      yearlySnyTon,
      yearlyMphTon,
      yearlyTotalRit,
      yearlySnyRit,
      yearlyMphRit,
      yearlyTonKmTotal,
      yearlyGrossRevenue,
      yearlyRevSny,
      yearlyRevMph,

      // Active Calculation Variables
      tonaseSny,
      tonaseMph,
      totalTonase,
      kmSny,
      kmMph,
      kmOverall,
      rate,
      tonKmSny,
      tonKmMph,
      tonKmTotal,
      revSny,
      revMph,
      revenue,
      keuntunganKotor: revenue,
      opexMph,
      opexSny,
      opexHof,
      cost,
      totalBebanGL: cost,
      profitBeforePpn,
      profitBeforePpnMph,
      profitBeforePpnSny,
      ppnPercent,
      ppnAmount,
      ppnAmountMph,
      ppnAmountSny,
      profit,
      keuntunganBersih: profit,
      profitMph,
      keuntunganBersihMph: profitMph,
      profitSny,
      keuntunganBersihSny: profitSny,
      marginPercent,
      marginMph,
      marginSny,
      netPerTon,
      revPerTon,
      costPerTon,
      ppnPerTon,
      isYearlyScope,
    };
  }, [
    profitData,
    ratePerTonKm,
    ppnPercent,
    avgKmOverall,
    avgKmSny,
    avgKmMph,
    isCustomDistance,
    viewScope,
  ]);


  // ==============================================================
  // KALKULASI BONUS KARYAWAN (PROFIT SHARING ENGINE)
  // ==============================================================
  const bonusCalculation = useMemo(() => {
    const profitBase = Math.max(0, calculation.profit);
    const totalBonus = Math.round(profitBase * (bonusPercent / 100));
    const perEmployee = employeeCount > 0 ? Math.round(totalBonus / employeeCount) : 0;
    const retainedProfit = calculation.profit - totalBonus;
    const ownerPercent = Math.max(0, 100 - bonusPercent);

    return {
      profitBase,
      bonusPercent,
      employeeCount,
      totalBonus,
      perEmployee,
      retainedProfit,
      ownerPercent,
    };
  }, [calculation.profit, bonusPercent, employeeCount]);

  // Chart Data Comparison
  const chartData = useMemo(() => {
    return [
      {
        name: "Muara Pahu (MPH)",
        revenue: calculation.revMph,
        cost: calculation.opexMph,
        profit: calculation.profitMph,
      },
      {
        name: "Senyiur (SNY)",
        revenue: calculation.revSny,
        cost: calculation.opexSny,
        profit: calculation.profitSny,
      },
      {
        name: calculation.isYearlyScope ? `Total ${selectedYear} (YTD)` : "Total Konsolidasi",
        revenue: calculation.revenue,
        cost: calculation.cost,
        profit: calculation.profit,
      },
    ];
  }, [calculation]);

  // Filtered GL Expense Summaries (Beban Biaya YTD 2026 atau Periode Tertentu)
  const activeSummaries = useMemo(() => {
    return profitData?.ytd?.summaries || profitData?.summaries || [];
  }, [profitData]);

  const filteredSummaries = useMemo(() => {
    if (!activeSummaries || activeSummaries.length === 0) return [];
    if (!searchQuery.trim()) return activeSummaries;
    const q = searchQuery.toLowerCase();
    return activeSummaries.filter(
      (s) =>
        s.accountCode.toLowerCase().includes(q) ||
        s.accountName.toLowerCase().includes(q)
    );
  }, [activeSummaries, searchQuery]);

  // Export Table Data to CSV
  const handleExportCSV = () => {
    if (!profitData) return;
    const rows = [
      ["PROFIT CENTER - LAPORAN KEUANGAN & REVENUE REAL-TIME"],
      [`Periode GL: ${profitData.period?.periodName || "-"}`],
      [`Tahun Anggaran: ${selectedYear} | Rate: Rp ${ratePerTonKm} / Ton-KM | Tarif PPN: ${ppnPercent}%`],
      [`TOTAL TONASE TAHUN 2026 (YTD): ${calculation.yearlyTotalTon.toLocaleString("id-ID")} Ton`],
      [`  - Senyiur 2026: ${calculation.yearlySnyTon.toLocaleString("id-ID")} Ton (${calculation.yearlySnyRit} Rit)`],
      [`  - Muara Pahu 2026: ${calculation.yearlyMphTon.toLocaleString("id-ID")} Ton (${calculation.yearlyMphRit} Rit)`],
      [""],
      ["RUMUS PERHITUNGAN:"],
      ["A. Revenue = Total Tonase * Average Distance (km) * Rate per ton (1.050)"],
      ["B. Profit = (Revenue - Cost) - PPN (\%)"],
      [""],
      [
        "Jobsite",
        "Tonase Periode (Ton)",
        "Tonase Tahun 2026 (Ton)",
        "Avg Distance (KM)",
        "Total Ton-KM",
        "Rate (Rp/Ton-KM)",
        "Revenue (Rp)",
        "Cost (Rp)",
        "PPN \% (Rp)",
        "Profit (Rp)",
        "Margin (%)",
      ],
      [
        "Muara Pahu (MPH)",
        calculation.periodTonaseMph,
        calculation.yearlyMphTon,
        calculation.kmMph.toFixed(2),
        calculation.tonKmMph.toFixed(0),
        calculation.rate,
        calculation.revMph,
        calculation.opexMph,
        calculation.ppnAmountMph,
        calculation.profitMph,
        `${calculation.marginMph.toFixed(2)}%`,
      ],
      [
        "Senyiur (SNY)",
        calculation.periodTonaseSny,
        calculation.yearlySnyTon,
        calculation.kmSny.toFixed(2),
        calculation.tonKmSny.toFixed(0),
        calculation.rate,
        calculation.revSny,
        calculation.opexSny,
        calculation.ppnAmountSny,
        calculation.profitSny,
        `${calculation.marginSny.toFixed(2)}%`,
      ],
      [
        "Head Office (HOF Overhead)",
        0,
        0,
        0,
        0,
        0,
        0,
        calculation.opexHof,
        0,
        -calculation.opexHof,
        "-",
      ],
      [
        "KONSOLIDASI (TOTAL)",
        calculation.periodTotalTonase,
        calculation.yearlyTotalTon,
        calculation.kmOverall.toFixed(2),
        calculation.tonKmTotal.toFixed(0),
        calculation.rate,
        calculation.revenue,
        calculation.cost,
        calculation.ppnAmount,
        calculation.profit,
        `${calculation.marginPercent.toFixed(2)}%`,
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Profit_Center_${selectedYear}_${profitData.period?.periodName || "report"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If not authorized, render Access Denied Screen immediately
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-rose-500 via-amber-500 to-rose-600" />

          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Restricted Access • Akses Terbatas
          </span>

          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            Otorisasi Tidak Memenuhi Syarat
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Halaman <span className="font-bold text-slate-800">Profit Center</span> memuat analisis performa finansial strategis dan margin laba rugi perusahaan. Modul ini secara ketat hanya dapat dibuka oleh akun eksekutif yang berwenang:
            <br />
            <span className="inline-flex flex-wrap justify-center gap-1.5 mt-2">
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                dzaky.athariqf@bataramining.com
              </span>
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                dellafajar@bataramining.com
              </span>
            </span>
          </p>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left mb-6">
            <p className="text-[11px] text-slate-400 font-medium">Akun Anda saat ini:</p>
            <p className="text-xs font-semibold text-slate-800 truncate">{user.name} ({user.email})</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Role: {user.role} • Site: {user.jobSite}</p>
          </div>

          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
            >
              Kembali ke Menu Utama
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & EXCLUSIVE SECURITY BADGE */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#e95623]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Executive Confidential • Profit Center
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Tahun Anggaran {selectedYear}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono text-slate-700 bg-slate-100 border border-slate-200">
                {user.email}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#e95623]" />
              Profit Center & Real-Time Revenue Engine
            </h1>
            
          </div>

          {/* Controls: Periode GL Selector, Scope Selector & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Periode per Tahun: 2026 / 2025 / 2024 */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
              <span className="text-xs font-black text-slate-700 px-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#e95623]" />
                Pilih Tahun:
              </span>
              <div className="flex items-center gap-1">
                {[2026, 2025, 2024].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(year);
                      if (year === 2026) setRatePerTonKm(1050);
                      else if (year === 2025) setRatePerTonKm(1000);
                      else if (year === 2024) setRatePerTonKm(950);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedYear === year
                        ? "bg-[#e95623] text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Tahun {year}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loadProfitCenterData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Menghitung..." : "Segarkan"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isLoading || !profitData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. DEDICATED HERO CARD: TOTAL TONASE TAHUN 2026 (YTD ASSETFINDR) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl p-5 md:p-6 text-slate-900 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                <Globe className="w-3.5 h-3.5 text-[#e95623]" />
                Total Produksi Tahun {selectedYear} (YTD)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Data Resmi AssetFindr • Jan s/d Des {selectedYear}
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tonase Hauling PT Batara Dharma Persada (Tahun {selectedYear})
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {formatNum(calculation.yearlyTotalTon, 2)}
                <span className="text-xl md:text-2xl font-bold text-slate-500 ml-1.5">Ton</span>
              </h2>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {formatNum(calculation.yearlyTotalRit, 0)} Ritase
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Estimasi Revenue Tahun {selectedYear}:{" "}
              <span className="font-bold text-slate-900">
                {formatRupiah(calculation.yearlyGrossRevenue)}
              </span>{" "}
              (pada Rate Rp {formatNum(calculation.rate, 0)}/Ton-KM)
            </p>
          </div>

          {/* Breakdown Per Site (Senyiur vs Muara Pahu) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Site Senyiur Chip */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-42.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Site Senyiur (SNY)
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {((calculation.yearlySnyTon / calculation.yearlyTotalTon) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-base font-black text-slate-900">
                {formatNum(calculation.yearlySnyTon, 0)} <span className="text-xs font-normal text-slate-500">Ton</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {formatNum(calculation.yearlySnyRit, 0)} Rit • Operasi Jan - Agu
              </p>
            </div>

            {/* Site Muara Pahu Chip */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-42.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Muara Pahu (MPH)
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {((calculation.yearlyMphTon / calculation.yearlyTotalTon) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-base font-black text-slate-900">
                {formatNum(calculation.yearlyMphTon, 0)} <span className="text-xs font-normal text-slate-500">Ton</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {formatNum(calculation.yearlyMphRit, 0)} Rit • Operasi Agu - Nov
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. FORMULA BLUEPRINT BANNER (RUMUS RESMI SESUAI REQUEST) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rumus A: Revenue */}
        <div className="bg-white rounded-2xl p-5 text-slate-900 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-black text-xs flex items-center justify-center">
                A
              </span>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Rumus Revenue
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
              Scope: Tahun {selectedYear}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-3 font-mono text-xs text-slate-800 leading-relaxed">
            <p className="font-bold text-slate-900">
              Revenue = Total Tonase (Senyiur + Muara Pahu) × Average KM × Rate per Ton (Rp 1.050)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[10px] text-slate-500">
                Tonase Tahun {selectedYear}
              </p>
              <p className="font-bold text-slate-800 mt-0.5">{formatNum(calculation.totalTonase, 0)} Ton</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[10px] text-slate-500">Avg Distance</p>
              <p className="font-bold text-slate-800 mt-0.5">{formatNum(calculation.kmOverall, 2)} KM</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[10px] text-slate-500">Rate Kontrak</p>
              <p className="font-bold text-slate-800 mt-0.5">Rp {formatNum(calculation.rate, 0)}/Ton-KM</p>
            </div>
          </div>
        </div>

        {/* Rumus B: Profit (Setelah PPN) */}
        <div className="bg-white rounded-2xl p-5 text-slate-900 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-[#e95623] border border-slate-200 font-black text-xs flex items-center justify-center">
                B
              </span>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Rumus Profit (Setelah PPN)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
              Final Margin
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-3 font-mono text-xs text-slate-800 leading-relaxed">
            <p className="font-bold text-slate-900">
              Profit = (Revenue − Cost) − PPN (%)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[10px] text-slate-500">Revenue</p>
              <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(calculation.revenue)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[10px] text-slate-500">Cost</p>
              <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(calculation.cost)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[10px] text-slate-500">Profit Margin</p>
              <p className="font-bold text-slate-800 mt-0.5">
                {calculation.marginPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. INTERACTIVE PARAMETER CONTROLLER (UBAH RATE & JARAK REAL-TIME) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#e95623]" />
              Parameter Kontrak & Jarak Hauling Real-Time
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuaikan rate kontrak tahun 2026 atau simulasi jarak hauling untuk melihat perubahan laba rugi secara langsung.
            </p>
          </div>

          <button
            onClick={() => {
              setRatePerTonKm(1050);
              setSelectedYear(2026);
              setIsCustomDistance(false);
              setAvgKmOverall(profitData?.distances?.overall || 82.37);
              setAvgKmSny(profitData?.distances?.sny || 73.37);
              setAvgKmMph(profitData?.distances?.mph || 91.37);
            }}
            className="text-xs font-semibold text-[#e95623] hover:underline self-start md:self-auto"
          >
            Reset ke Default 2026 (Rp 1.050/Ton-KM)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Tarif Pajak PPN (15% - 20%) */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Tarif Pajak PPN
              </label>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                15% - 20%
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={ppnPercent}
                onChange={(e) => setPpnPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[15, 16, 17.5, 18, 20].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPpnPercent(preset)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    ppnPercent === preset
                      ? "bg-[#e95623] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Potongan: {formatRupiah(calculation.ppnAmount)}
            </p>
          </div>

          {/* Rate per Ton-KM (Tahun 2026) */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Rate per Ton/KM (Tahun {selectedYear})
              </label>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                2026 Rate
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                step="25"
                min="100"
                value={ratePerTonKm}
                onChange={(e) => setRatePerTonKm(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {[1000, 1050, 1100, 1150].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setRatePerTonKm(preset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    ratePerTonKm === preset
                      ? "bg-[#e95623] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Rata-rata Jarak Tiket Muara Pahu */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Avg Distance Muara Pahu (MPH)
              </label>
              <span className="text-[10px] text-slate-400">Tiket Aktif</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={avgKmMph}
                onChange={(e) => {
                  setIsCustomDistance(true);
                  setAvgKmMph(Math.max(1, parseFloat(e.target.value) || 1));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">KM</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Rute dominan: Coalpad 02 TA → MP Side Dump (91.4 km)
            </p>
          </div>

          {/* Rata-rata Jarak Tiket Senyiur */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Avg Distance Senyiur (SNY)
              </label>
              <span className="text-[10px] text-slate-400">Tiket Aktif</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={avgKmSny}
                onChange={(e) => {
                  setIsCustomDistance(true);
                  setAvgKmSny(Math.max(1, parseFloat(e.target.value) || 1));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">KM</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Rute dominan: Coalpad 01 FSP → SYR Side Dump (71.8 km)
            </p>
          </div>

          {/* Rata-rata Jarak Gabungan (Combined All Tickets) */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Average Distance (Semua Tiket)
              </label>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                Weighted
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={Number(calculation.kmOverall.toFixed(2))}
                onChange={(e) => {
                  setIsCustomDistance(true);
                  setAvgKmOverall(Math.max(1, parseFloat(e.target.value) || 1));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">KM</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Rata-rata tertimbang jarak hauling kedua site
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. TIGA HERO METRICS UTAMA (HASIL RUMUS A & B) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* HERO 1: REVENUE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                Rumus A • Revenue
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Tahun {selectedYear}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Revenue
            </p>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {formatRupiah(calculation.revenue)}
            </h2>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Site Muara Pahu (MPH):</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.revMph)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Site Senyiur (SNY):</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.revSny)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Rata-rata Revenue per Ton:</span>
            <span className="font-bold text-slate-900">{formatRupiah(calculation.revPerTon)} / Ton</span>
          </div>
        </div>

        {/* HERO 2: COST */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Receipt className="w-3.5 h-3.5 text-slate-600" />
                Data GL • Cost
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Total OPEX</span>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Cost
            </p>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {formatRupiah(calculation.cost)}
            </h2>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Cost Site MPH:</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.opexMph)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Cost Site SNY:</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.opexSny)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Head Office Overhead:</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.opexHof)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Cost per Tonase:</span>
            <span className="font-bold text-slate-900">{formatRupiah(calculation.costPerTon)} / Ton</span>
          </div>
        </div>

        {/* HERO 3: PROFIT (SETELAH PPN) - Clean Executive Light Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-[#e95623]" />
                Rumus B • Profit (PPN {calculation.ppnPercent}%)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                Margin: {calculation.marginPercent.toFixed(1)}%
              </span>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Profit
            </p>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {formatRupiah(calculation.profit)}
            </h2>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between items-center text-[11px]">
                <span>Profit Sebelum Pajak:</span>
                <span className="font-semibold text-slate-800">{formatRupiah(calculation.profitBeforePpn)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span>Potongan PPN ({calculation.ppnPercent}%):</span>
                <span className="font-semibold text-slate-800">-{formatRupiah(calculation.ppnAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Profit MPH (Setelah PPN):</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.profitMph)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Profit SNY (Setelah PPN):</span>
                <span className="font-bold text-slate-900">{formatRupiah(calculation.profitSny)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Profit per Tonase:</span>
            <span className="font-bold text-slate-900">{formatRupiah(calculation.netPerTon)} / Ton</span>
          </div>
        </div>
      </div>
      {/* ============================================================== */}
      {/* 5B. KALKULATOR BONUS KARYAWAN (PROFIT SHARING ENGINE) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Award className="w-3.5 h-3.5 text-slate-600" />
                Profit Sharing • Kalkulator Bonus Karyawan
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                Tahun Anggaran {selectedYear}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#e95623]" />
              Simulasi Alokasi Bonus dari Profit Bersih
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan persentase bonus yang ingin dialokasikan dari Profit ({formatRupiah(calculation.profit)}) dan tentukan jumlah karyawan untuk pembagian merata.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-right self-start md:self-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Basis Laba Bersih (Profit)
            </span>
            <span className="text-base font-black text-slate-900">
              {formatRupiah(calculation.profit)}
            </span>
          </div>
        </div>

        {/* Control Inputs: Persentase Bonus & Total Karyawan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 relative z-10">
          {/* Input 1: Persentase Bonus dari Profit */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-slate-600" />
                Persentase Bonus dari Profit (%)
              </label>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                Input Owner
              </span>
            </div>
            <div className="relative mb-2.5">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={bonusPercent}
                onChange={(e) => setBonusPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full bg-white border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623] shadow-2xs"
                placeholder="Contoh: 5"
              />
              <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">%</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Preset Cepat:</span>
              {[1, 2.5, 5, 7.5, 10, 15].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBonusPercent(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bonusPercent === preset
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Input 2: Jumlah Total Karyawan (Bagi Rata) */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                Total Jumlah Karyawan (Penerima Bonus)
              </label>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                Bagi Rata
              </span>
            </div>
            <div className="relative mb-2.5">
              <input
                type="number"
                step="1"
                min="1"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-slate-300 rounded-xl pl-4 pr-16 py-2.5 text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623] shadow-2xs"
                placeholder="Contoh: 250"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">Orang</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Preset Karyawan:</span>
              {[100, 250, 350, 500, 1000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setEmployeeCount(count)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    employeeCount === count
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {count} Org
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Highlight Result Cards - Clean Light Executive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 relative z-10">
          {/* Result 1: TOTAL BONUS UNTUK SELURUH KARYAWAN */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700 mb-2">
                <Coins className="w-3.5 h-3.5" />
                Total Alokasi Bonus
              </span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Bonus Seluruh Karyawan
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(bonusCalculation.totalBonus)}
              </h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
              <span>Porsi dari Profit:</span>
              <span className="font-bold text-slate-900">{bonusPercent}%</span>
            </div>
          </div>

          {/* Result 2: BONUS RATA-RATA TIAP KARYAWAN */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700 mb-2">
                <Users className="w-3.5 h-3.5" />
                Bagi Rata per Individu
              </span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Bonus Tiap Karyawan
              </p>
              <h3 className="text-2xl font-black text-[#e95623] tracking-tight">
                {formatRupiah(bonusCalculation.perEmployee)}
                <span className="text-xs font-normal text-slate-500 ml-1.5">/ Orang</span>
              </h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
              <span>Dibagi untuk:</span>
              <span className="font-bold text-slate-900">{employeeCount} Karyawan</span>
            </div>
          </div>

          {/* Result 3: SISA PROFIT UNTUK PERUSAHAAN / OWNER */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 shadow-2xs relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700 mb-2">
                <Wallet className="w-3.5 h-3.5" />
                Retained Profit
              </span>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Sisa Profit Perusahaan (Owner)
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(bonusCalculation.retainedProfit)}
              </h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
              <span>Porsi Perusahaan:</span>
              <span className="font-bold text-slate-900">{bonusCalculation.ownerPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar of Distribution */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold mb-1.5 gap-1">
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
              Sisa Profit Perusahaan: {bonusCalculation.ownerPercent.toFixed(1)}% ({formatRupiah(bonusCalculation.retainedProfit)})
            </span>
            <span className="text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e95623] shrink-0" />
              Bonus Karyawan: {bonusPercent}% ({formatRupiah(bonusCalculation.totalBonus)})
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${bonusCalculation.ownerPercent}%` }}
              className="bg-slate-400 h-full transition-all duration-300"
              title={`Owner: ${bonusCalculation.ownerPercent.toFixed(1)}%`}
            />
            <div
              style={{ width: `${bonusPercent}%` }}
              className="bg-[#e95623] h-full transition-all duration-300"
              title={`Bonus Karyawan: ${bonusPercent}%`}
            />
          </div>
        </div>
      </div>



      {/* ============================================================== */}
      {/* 6. TABEL REKAPITULASI FINANCIAL PER JOBSITE (DENGAN TONASE 2026) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#e95623]" />
              Rekapitulasi Finansial & Tonase per Jobsite (Tahun {selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Penjabaran Revenue, Cost operasional GL, potongan PPN ({ppnPercent}%), dan Profit bersih per unit operasional, perbandingan tonase periode berjalan vs total akumulasi tahun 2026.
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-lg border self-start sm:self-auto flex items-center gap-1.5 ${
            calculation.isYearlyScope
              ? "bg-slate-100 text-slate-700 border-slate-200"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}>
            {calculation.isYearlyScope ? (
              <>
                <Globe className="w-3.5 h-3.5 text-slate-600" />
                Scope: Akumulasi Penuh Tahun {selectedYear}
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Scope: Periode GL {profitData?.period?.periodName || "Aktif"}
              </>
            )}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Jobsite Operasional</th>
                <th className="py-3 px-4 text-right">Tonase Periode (Ton)</th>
                <th className="py-3 px-4 text-right">
                  Total Tonase {selectedYear} (Ton)
                </th>
                <th className="py-3 px-4 text-right">Avg Jarak (KM)</th>
                <th className="py-3 px-4 text-right">Total Ton·KM</th>
                <th className="py-3 px-4 text-right">Rate / Ton-KM</th>
                <th className="py-3 px-4 text-right">
                  Revenue (A)
                </th>
                <th className="py-3 px-4 text-right">
                  Cost (GL)
                </th>
                <th className="py-3 px-4 text-right">
                  PPN ({calculation.ppnPercent}%)
                </th>
                <th className="py-3 px-4 text-right">
                  Profit (B)
                </th>
                <th className="py-3 px-4 text-right">Profit Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Site Muara Pahu */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Site Muara Pahu (MPH)
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-800">
                  {formatNum(calculation.periodTonaseMph, 0)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatNum(calculation.yearlyMphTon, 2)}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">
                  {formatNum(calculation.kmMph, 2)} km
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">
                  {formatNum(calculation.tonKmMph, 0)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">
                  Rp {formatNum(calculation.rate, 0)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.revMph)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.opexMph)}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">
                  -{formatRupiah(calculation.ppnAmountMph)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.profitMph)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {calculation.marginMph.toFixed(2)}%
                </td>
              </tr>

              {/* Site Senyiur */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Site Senyiur (SNY)
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-800">
                  {formatNum(calculation.periodTonaseSny, 0)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatNum(calculation.yearlySnyTon, 2)}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">
                  {formatNum(calculation.kmSny, 2)} km
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">
                  {formatNum(calculation.tonKmSny, 0)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">
                  Rp {formatNum(calculation.rate, 0)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.revSny)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.opexSny)}
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">
                  -{formatRupiah(calculation.ppnAmountSny)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.profitSny)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {calculation.marginSny.toFixed(2)}%
                </td>
              </tr>

              {/* Head Office Overhead */}
              <tr className="hover:bg-slate-50/80 transition-colors text-slate-500">
                <td className="py-3 px-4 font-medium text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Head Office (HOF Overhead)
                </td>
                <td className="py-3 px-4 text-right">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right">-</td>
                <td className="py-3 px-4 text-right">-</td>
                <td className="py-3 px-4 text-right">-</td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  {formatRupiah(calculation.opexHof)}
                </td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700">
                  -{formatRupiah(calculation.opexHof)}
                </td>
                <td className="py-3 px-4 text-right text-slate-400">-</td>
              </tr>

              {/* TOTAL KONSOLIDASI */}
              <tr className="bg-slate-100 text-slate-900 font-black text-[13px] border-t-2 border-slate-300">
                <td className="py-4 px-4 uppercase tracking-wider text-slate-900">
                  TOTAL KONSOLIDASI
                </td>
                <td className="py-4 px-4 text-right text-slate-800">
                  {formatNum(calculation.periodTotalTonase, 0)} Ton
                </td>
                <td className="py-4 px-4 text-right text-slate-900 font-black">
                  {formatNum(calculation.yearlyTotalTon, 2)} Ton
                </td>
                <td className="py-4 px-4 text-right text-slate-800">
                  {formatNum(calculation.kmOverall, 2)} km
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-800">
                  {formatNum(calculation.tonKmTotal, 0)}
                </td>
                <td className="py-4 px-4 text-right text-slate-800">
                  Rp {formatNum(calculation.rate, 0)}
                </td>
                <td className="py-4 px-4 text-right text-slate-900 font-bold">
                  {formatRupiah(calculation.revenue)}
                </td>
                <td className="py-4 px-4 text-right text-slate-900 font-bold">
                  {formatRupiah(calculation.cost)}
                </td>
                <td className="py-4 px-4 text-right text-slate-900 font-bold text-sm">
                  {formatRupiah(calculation.profit)}
                </td>
                <td className="py-4 px-4 text-right text-slate-900">
                  {calculation.marginPercent.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. GRAFIK KOMPARASI KEUANGAN (REVENUE VS BEBAN VS LABA BERSIH) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Visualisasi Finansial: Revenue, Cost & Profit (Setelah PPN)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan nominal rupiah antara Revenue, Cost operasional GL, dan Profit setelah PPN (Scope: Akumulasi Tahun {selectedYear}).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-3 h-3 rounded bg-slate-700" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-3 h-3 rounded bg-slate-400" /> Cost
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-3 h-3 rounded bg-[#e95623]" /> Profit
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#475569" }}
                tickFormatter={(val) => `Rp ${(val / 1000000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  formatRupiah(Number(val)),
                  name === "revenue" ? "Revenue" : name === "cost" ? "Cost" : "Profit",
                ]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: "12px",
                  color: "#0f172a",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#334155" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cost" name="Cost" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#e95623" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 8. RINCIAN COST OPERASIONAL GL (PENGURANG REVENUE) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#e95623]" />
              Rincian Akun Cost Operasional GL (Cost Drivers Tahun {selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Komponen biaya yang mengurangi Revenue menjadi Profit ({calculation.isYearlyScope ? "Sumber: Akumulasi YTD Resmi Laporan Keuangan" : `Sumber: GL Periode ${profitData?.period?.periodName || ""}`} • Total: {formatRupiah(calculation.cost)})
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama akun beban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-[#e95623]"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs">
              <tr className="text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4">Kode Akun</th>
                <th className="py-2.5 px-4">Nama Akun Cost GL</th>
                <th className="py-2.5 px-4 text-right">Muara Pahu (MPH)</th>
                <th className="py-2.5 px-4 text-right">Senyiur (SNY)</th>
                <th className="py-2.5 px-4 text-right">Head Office (HOF)</th>
                <th className="py-2.5 px-4 text-right bg-slate-200/60">Total Cost</th>
                <th className="py-2.5 px-4 text-right">Porsi (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length > 0 ? (
                filteredSummaries.map((s, idx) => {
                  const porsi =
                    calculation.totalBebanGL > 0
                      ? (s.grandTotal / calculation.totalBebanGL) * 100
                      : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {s.accountCode}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {s.accountName}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                        {formatRupiah(s.mphAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                        {formatRupiah(s.snyAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-500">
                        {formatRupiah(s.hofAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-50/50">
                        {formatRupiah(s.grandTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-700">
                        {porsi.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada akun beban GL yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
