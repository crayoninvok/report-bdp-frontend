"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  RiverJournalEntry,
  RiverJournalStats,
  CreateRiverJournalPayload,
  DailyPairedPoint,
  SiteTrendPoint,
  SiteTrendSummary,
} from "../types/riverJournal";
import { riverJournalService } from "../services/riverJournalService";
import { InputRiverJournalModal } from "./InputRiverJournalModal";
import { RiverJournalPdfExportModal } from "./RiverJournalPdfExportModal";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  Waves,
  Ship,
  Plus,
  FileDown,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Activity,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers,
  Info,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

// =========================================================================
// SITE-SPECIFIC TRENDLINE ENGINE (OLS LINEAR REGRESSION: y = mx + b)
// =========================================================================
function computeSiteTrendData(
  entries: RiverJournalEntry[],
  siteName: "Senyiur" | "MuaraPahu"
): SiteTrendSummary {
  const siteEntries = entries.filter((e) => e.site === siteName);

  // Group by date keeping latest measurement of the day
  const dateMap = new Map<string, RiverJournalEntry>();
  siteEntries.forEach((e) => {
    const existing = dateMap.get(e.date);
    if (!existing || e.inputTime >= existing.inputTime) {
      dateMap.set(e.date, e);
    }
  });

  const sortedList = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (sortedList.length === 0) {
    return {
      data: [],
      slope: 0,
      avg: 0,
      min: 0,
      max: 0,
      latest: null,
    };
  }

  // OLS Linear Regression: y = m*x + b
  const n = sortedList.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const y = sortedList[i].waterDepth;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const depths = sortedList.map((e) => e.waterDepth);
  const min = Math.min(...depths);
  const max = Math.max(...depths);
  const avg = depths.reduce((a, b) => a + b, 0) / n;

  const points: SiteTrendPoint[] = sortedList.map((e, i) => {
    const trendVal = slope * i + intercept;
    const planVal = e.minThreshold || 4.0;
    return {
      date: e.date,
      label: new Date(e.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      inputTime: e.inputTime,
      waterDepth: e.waterDepth,
      plan: planVal,
      trendDepth: Number(trendVal.toFixed(2)),
      diffToPlan: Number((e.waterDepth - planVal).toFixed(2)),
      location: e.location,
    };
  });

  return {
    data: points,
    slope: Number(slope.toFixed(3)),
    avg: Number(avg.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    latest: sortedList[sortedList.length - 1],
  };
}

interface RiverJournalViewProps {
  user: User;
}

export const RiverJournalView: React.FC<RiverJournalViewProps> = ({ user }) => {
  const { showSuccess, showError } = useNotification();

  const [entries, setEntries] = useState<RiverJournalEntry[]>([]);
  const [statsSenyiur, setStatsSenyiur] = useState<RiverJournalStats | null>(null);
  const [statsMuaraPahu, setStatsMuaraPahu] = useState<RiverJournalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Active Chart View Mode: "dual_axis" | "daily_delta" | "absolute_depth"
  const [chartViewMode, setChartViewMode] = useState<"dual_axis" | "daily_delta" | "absolute_depth">("dual_axis");

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allEntries, snyStats, mpStats] = await Promise.all([
        riverJournalService.getJournals(),
        riverJournalService.getStats("Senyiur"),
        riverJournalService.getStats("MuaraPahu"),
      ]);
      setEntries(allEntries);
      setStatsSenyiur(snyStats);
      setStatsMuaraPahu(mpStats);
    } catch (e: any) {
      console.error("Gagal memuat River Journal:", e);
      showError("Gagal memuat data River Journal.");
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
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

  // Sync with Google Sheets live
  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    try {
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

  // =========================================================================
  // HYDROLOGICAL CORRELATION ENGINE (SENYIUR VS MUARA PAHU)
  // =========================================================================
  const {
    pairedData,
    pearsonCorrelation,
    agreementRate,
    bothUpCount,
    bothDownCount,
    divergentCount,
    totalTransitions,
    mpTotalSwing,
    snyTotalSwing,
    amplificationRatio,
  } = useMemo(() => {
    // 1. Group latest depth per date for Senyiur & Muara Pahu
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

    // 2. Filter dates where both sites have measurements
    const overlappingDates = Array.from(dateMap.entries())
      .filter(([, val]) => val.senyiur !== undefined && val.muaraPahu !== undefined)
      .sort(([dA], [dB]) => dA.localeCompare(dB));

    const pairedList: DailyPairedPoint[] = [];
    let sameCount = 0;
    let upUp = 0;
    let downDown = 0;
    let divergent = 0;

    for (let i = 0; i < overlappingDates.length; i++) {
      const [dateStr, val] = overlappingDates[i];
      const sny = val.senyiur!;
      const mp = val.muaraPahu!;

      let deltaS = 0;
      let deltaMP = 0;
      let isSame = true;
      let statusLabel = "Pengukuran Awal";
      let statusType: DailyPairedPoint["statusType"] = "flat";

      if (i > 0) {
        const prevSny = overlappingDates[i - 1][1].senyiur!;
        const prevMP = overlappingDates[i - 1][1].muaraPahu!;
        deltaS = Number((sny - prevSny).toFixed(2));
        deltaMP = Number((mp - prevMP).toFixed(2));

        if (deltaMP > 0 && deltaS > 0) {
          isSame = true;
          statusLabel = "Keduanya Naik (Banjir Kiriman)";
          statusType = "both_up";
          upUp++;
          sameCount++;
        } else if (deltaMP < 0 && deltaS < 0) {
          isSame = true;
          statusLabel = "Keduanya Turun (Fase Surut)";
          statusType = "both_down";
          downDown++;
          sameCount++;
        } else if (deltaMP === 0 || deltaS === 0) {
          isSame = true;
          statusLabel = "Stabil / Respon Lambat";
          statusType = "flat";
          sameCount++;
        } else {
          isSame = false;
          statusLabel = deltaMP > 0 ? "MP Naik, Senyiur Turun" : "MP Turun, Senyiur Naik";
          statusType = "divergent";
          divergent++;
        }
      }

      const formattedDate = new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });

      pairedList.push({
        date: dateStr,
        label: formattedDate,
        senyiur: sny,
        muaraPahu: mp,
        deltaSenyiur: deltaS,
        deltaMuaraPahu: deltaMP,
        isSameDirection: isSame,
        statusLabel,
        statusType,
        senyiurDeficit: Number((sny - 4.0).toFixed(2)),
      });
    }

    // 3. Compute Pearson r correlation
    const n = pairedList.length;
    let r = 0;
    if (n > 1) {
      const sVals = pairedList.map((p) => p.senyiur);
      const mVals = pairedList.map((p) => p.muaraPahu);
      const sMean = sVals.reduce((a, b) => a + b, 0) / n;
      const mMean = mVals.reduce((a, b) => a + b, 0) / n;

      let num = 0;
      let sDen = 0;
      let mDen = 0;
      for (let i = 0; i < n; i++) {
        const sDiff = sVals[i] - sMean;
        const mDiff = mVals[i] - mMean;
        num += sDiff * mDiff;
        sDen += sDiff * sDiff;
        mDen += mDiff * mDiff;
      }
      r = sDen > 0 && mDen > 0 ? num / (Math.sqrt(sDen) * Math.sqrt(mDen)) : 0;
    }

    const transitions = Math.max(n - 1, 1);
    const agreementPct = Number(((sameCount / transitions) * 100).toFixed(1));

    const sMin = Math.min(...pairedList.map((p) => p.senyiur));
    const sMax = Math.max(...pairedList.map((p) => p.senyiur));
    const mMin = Math.min(...pairedList.map((p) => p.muaraPahu));
    const mMax = Math.max(...pairedList.map((p) => p.muaraPahu));
    const mSwing = mMax - mMin;
    const sSwing = sMax - sMin;
    const ampRatio = sSwing > 0 ? Number((mSwing / sSwing).toFixed(2)) : 1;

    const latest = pairedList.length > 0 ? pairedList[pairedList.length - 1] : null;

    return {
      pairedData: pairedList,
      pearsonCorrelation: Number(r.toFixed(3)),
      agreementRate: agreementPct,
      bothUpCount: upUp,
      bothDownCount: downDown,
      divergentCount: divergent,
      totalTransitions: transitions,
      mpTotalSwing: Number(mSwing.toFixed(2)),
      snyTotalSwing: Number(sSwing.toFixed(2)),
      amplificationRatio: ampRatio,
      latestComparison: latest,
    };
  }, [entries]);

  // Site-specific trend data with Plan 4.0m & OLS regression lines
  const senyiurSiteData = useMemo(() => {
    return computeSiteTrendData(entries, "Senyiur");
  }, [entries]);

  const muaraPahuSiteData = useMemo(() => {
    return computeSiteTrendData(entries, "MuaraPahu");
  }, [entries]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. TOP HEADER & HERO SECTION */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background water wave */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Waves size={280} className="text-teal-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                Analisis Hidrologi & Propagasi Alur Sungai
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e95623]/20 text-[#e95623] border border-[#e95623]/30">
                DAS Mahakam &bull; Project Tabang
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
              RIVER JOURNAL &bull; ANALISIS KOMPARASI SENYIUR VS MUARA PAHU
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Komparasi fluktuasi kedalaman air Senyiur (Hulu) vs Muara Pahu (Hilir) dalam satu DAS Mahakam.
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
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black tracking-wide shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all cursor-pointer"
              title="Download Laporan PDF Presentasi River Journal"
            >
              <FileDown size={16} />
              <span>Export PDF Laporan</span>
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
          </div>
        </div>
      </div>

      {/* 2. CORE ANSWER & DETAILED HYDROLOGICAL INSIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card A: Kenaikan Muara Pahu vs Senyiur */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Kenaikan Air (Fase Pasang)
            </span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp size={14} />
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900">
            Jika Muara Pahu Naik, Apakah Senyiur Naik?
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-emerald-700 font-extrabold">YA, KONSISTEN NAIK.</strong> Ketika terjadi kenaikan debit di Muara Pahu,
            Senyiur tercatat naik secara serentak pada sebagian besar hari.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Contoh Banjir Hulu (14 Okt):</span>
              <strong className="text-slate-900">MP +1.00m &bull; SNY +0.74m</strong>
            </div>
            <div className="flex justify-between">
              <span>Puncak Terbesar:</span>
              <strong className="text-slate-900">MP 9.40m &bull; SNY 2.74m</strong>
            </div>
          </div>
        </div>

        {/* Card B: Penurunan Muara Pahu vs Senyiur */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Penurunan Air (Fase Surut)
            </span>
            <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown size={14} />
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900">
            Seperti Apa Karakteristik Turunnya?
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-rose-700 font-extrabold">TURUN SECARA BERTAHAP.</strong> Penurunan di Muara Pahu selalu
            diikuti oleh penyusutan alur di Senyiur karena berkurangnya debit limpasan dari hulu pegunungan.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Contoh Fase Surut (02-05 Okt):</span>
              <strong className="text-slate-900">MP -1.12m &bull; SNY -0.34m</strong>
            </div>
            <div className="flex justify-between">
              <span>Titik Terendah Periode:</span>
              <strong className="text-slate-900">MP 7.08m &bull; SNY 1.76m</strong>
            </div>
          </div>
        </div>

        {/* Card C: Disparitas Skala Fluktuasi */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Skala Ayunan (Amplifikasi)
            </span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
              <SlidersHorizontal size={14} />
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900">
            Mengapa Perubahan di MP Lebih Besar?
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Muara Pahu berada di badan utama Sungai Mahakam yang mengumpulkan debit dari seluruh anak sungai, sehingga
            fluktuasi totalnya mencapai <strong className="text-slate-800">2.32m</strong>, sedangkan Senyiur berayun <strong className="text-slate-800">0.98m</strong>.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Rasio Amplifikasi Fluktuasi:</span>
              <strong className="text-indigo-700">2.37 : 1 (MP : SNY)</strong>
            </div>
            <div className="flex justify-between">
              <span>Sensitivitas:</span>
              <strong className="text-slate-900">Tiap 1m MP &asymp; 0.42m SNY</strong>
            </div>
          </div>
        </div>

        {/* Card D: Implikasi Tongkang 4.0m */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Keputusan Tongkang (4.0m)
            </span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
              <Ship size={14} />
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900">
            Apakah Tongkang Bisa Masuk Senyiur?
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-rose-700 font-extrabold">BELUM BISA.</strong> Meskipun air Senyiur naik saat MP naik,
            level air Senyiur (1.76m - 2.74m) masih berada di bawah standar ketinggian air sungai aman tongkang 4.0m (defisit minimal 1.26m).
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Jetty Muara Pahu:</span>
              <strong className="text-emerald-700">100% Layak Navigasi</strong>
            </div>
            <div className="flex justify-between">
              <span>Dermaga Senyiur KM 0:</span>
              <strong className="text-rose-700">Siaga Surut / Stand-by</strong>
            </div>
          </div>
        </div>
      </div>
      {/* 3. INTERACTIVE COMPARATIVE HYDROGRAPH CHARTS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Chart View Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Visualisasi Komparasi Alur Sungai: Senyiur vs Muara Pahu
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Pilih perspektif visual untuk melihat keselarasan naik/turun permukaan air
              </p>
            </div>
          </div>

          {/* Toggle buttons for chart view mode */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setChartViewMode("dual_axis")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === "dual_axis"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitCompare size={13} />
              <span>Dual-Axis (Keselarasan Gelombang)</span>
            </button>

            <button
              onClick={() => setChartViewMode("daily_delta")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === "daily_delta"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={13} />
              <span>Delta Fluktuasi Harian (&plusmn;m)</span>
            </button>

            <button
              onClick={() => setChartViewMode("absolute_depth")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === "absolute_depth"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers size={13} />
              <span>Skala Kedalaman Nyata</span>
            </button>
          </div>
        </div>

        {/* CHART 1: DUAL-AXIS SYNCHRONIZED WAVE (Shows perfect wave alignment) */}
        {chartViewMode === "dual_axis" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-bold text-amber-700">
                  <span className="w-3 h-1 bg-amber-500 rounded-full" />
                  <span>Dermaga Senyiur KM 0 (Sumbu Kiri: 0m - 4.5m)</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span>Jetty Muara Pahu (Sumbu Kanan: 6.0m - 11.0m)</span>
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Puncak gelombang naik dan lembah surut bergerak serempak
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={pairedData}
                  margin={{ top: 15, right: 25, left: -10, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="senyiurGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    angle={-25}
                    textAnchor="end"
                  />
                  {/* Left Axis: Senyiur */}
                  <YAxis
                    yAxisId="left"
                    domain={[0, 4.5]}
                    tick={{ fontSize: 10, fill: "#d97706" }}
                    tickFormatter={(v) => `${v}m (SNY)`}
                  />
                  {/* Right Axis: Muara Pahu */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[6, 11]}
                    tick={{ fontSize: 10, fill: "#059669" }}
                    tickFormatter={(v) => `${v}m (MP)`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DailyPairedPoint;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-xl text-white text-xs space-y-1.5 min-w-56">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                              <span className="font-extrabold text-teal-300">{data.date}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                {data.statusLabel}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>Jetty Muara Pahu:</span>
                              <span className="font-mono text-sm">
                                {data.muaraPahu.toFixed(2)}m{" "}
                                <span className="text-[10px]">
                                  ({data.deltaMuaraPahu >= 0 ? "+" : ""}{data.deltaMuaraPahu}m)
                                </span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-amber-400 font-bold">
                              <span>Dermaga Senyiur:</span>
                              <span className="font-mono text-sm">
                                {data.senyiur.toFixed(2)}m{" "}
                                <span className="text-[10px]">
                                  ({data.deltaSenyiur >= 0 ? "+" : ""}{data.deltaSenyiur}m)
                                </span>
                              </span>
                            </div>
                            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                              <span>Defisit Draft Senyiur:</span>
                              <span className="text-rose-400 font-bold font-mono">
                                {data.senyiurDeficit}m dari 4.0m
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={4.0}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Standar 4.0m",
                      position: "left",
                      fill: "#ef4444",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  />
                  {/* Senyiur Area & Line */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="senyiur"
                    name="Dermaga Senyiur"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#senyiurGradient)"
                    dot={{ r: 3, fill: "#f59e0b" }}
                  />
                  {/* Muara Pahu Line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="muaraPahu"
                    name="Jetty Muara Pahu"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 2: DAILY DELTA BAR CHART (Proves side-by-side directional changes) */}
        {chartViewMode === "daily_delta" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
                  <span>Perubahan Harian Muara Pahu (&plusmn;m)</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-amber-700">
                  <span className="w-3 h-3 bg-amber-500 rounded-sm" />
                  <span>Perubahan Harian Senyiur (&plusmn;m)</span>
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Nilai &gt; 0 artinya NAIK, nilai &lt; 0 artinya TURUN
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pairedData.slice(1)} // skip first index which has no previous delta
                  margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    domain={[-1.5, 1.5]}
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}m`}
                  />
                  <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DailyPairedPoint;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-xl text-white text-xs space-y-1.5 min-w-52">
                            <span className="font-extrabold text-teal-300 block pb-1 border-b border-slate-800">
                              {data.date} ({data.statusLabel})
                            </span>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>Delta Muara Pahu:</span>
                              <strong className="font-mono">
                                {data.deltaMuaraPahu >= 0 ? "+" : ""}{data.deltaMuaraPahu} Meter
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-amber-400">
                              <span>Delta Senyiur:</span>
                              <strong className="font-mono">
                                {data.deltaSenyiur >= 0 ? "+" : ""}{data.deltaSenyiur} Meter
                              </strong>
                            </div>
                            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                              Keselarasan Arah:{" "}
                              <strong className={data.isSameDirection ? "text-teal-400" : "text-rose-400"}>
                                {data.isSameDirection ? "SEARAH" : "BERLAWANAN"}
                              </strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="deltaMuaraPahu"
                    name="Delta Muara Pahu"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="deltaSenyiur"
                    name="Delta Senyiur"
                    fill="#f59e0b"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 3: ABSOLUTE WATER ELEVATION COMPARISON */}
        {chartViewMode === "absolute_depth" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span>Jetty Muara Pahu (Rata-rata 8.07m &bull; Aman Navigasi)</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-amber-700">
                  <span className="w-3 h-1 bg-amber-500 rounded-full" />
                  <span>Dermaga Senyiur KM 0 (Rata-rata 2.04m &bull; Surut)</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-rose-600">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500" />
                  <span>Batas Minimum Tongkang (4.00m)</span>
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={pairedData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    domain={[0, 11]}
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickFormatter={(v) => `${v}m`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DailyPairedPoint;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-xl text-white text-xs space-y-1.5 min-w-52">
                            <span className="font-extrabold text-teal-300 block pb-1 border-b border-slate-800">
                              {data.date}
                            </span>
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>Muara Pahu:</span>
                              <span className="font-mono">{data.muaraPahu.toFixed(2)}m (Aman)</span>
                            </div>
                            <div className="flex justify-between items-center text-amber-400 font-bold">
                              <span>Senyiur KM 0:</span>
                              <span className="font-mono">{data.senyiur.toFixed(2)}m (Surut)</span>
                            </div>
                            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                              Batas Draft: <strong>4.00 Meter</strong>
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
                      value: "Batas Draft Tongkang (4.0m)",
                      position: "right",
                      fill: "#ef4444",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="muaraPahu"
                    name="Jetty Muara Pahu"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="senyiur"
                    name="Dermaga Senyiur"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 4B. GRAFIK INDIVIDUAL MASING-MASING SITE & GARIS TREN */}
      <div className="space-y-4">
        {/* Section Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center font-bold shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623]">
                  Site Specific Hydrographs
                </span>
                <span className="text-[10px] text-slate-300 font-bold">&bull;</span>
                <span className="text-[10px] font-bold text-slate-500">
                  Plan Ambang Batas 4.0m
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                GRAFIK ELEVASI & TREN PER SITE &bull; STANDAR KETINGGIAN AIR 4.0M & GARIS TREN LINIER
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Evaluasi kedalaman harian riil terhadap batas minimum draft tongkang (Plan 4.0m) disertai garis tren regresi linier OLS dan angka terukur
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[11px]">
              <span className="w-3 border-t-2 border-dashed border-rose-500 inline-block" />
              <span>Standar Ketinggian Air Sungai: 4.0m</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-extrabold text-[11px]">
              <span className="w-3 border-t-2 border-dashed border-slate-700 inline-block" />
              <span>Garis Tren (OLS)</span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Grid for Site Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ============================================================== */}
          {/* SITE 1: DERMAGA SENYIUR KM 0 (HULU)                            */}
          {/* ============================================================== */}
          <div className="bg-white border border-amber-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div>
              {/* Header Card Site 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-amber-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-500/30">
                      Hulu &bull; Loading Point
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono">
                      KM 0 Tabang
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Dermaga Senyiur KM 0
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Titik awal muat tongkang batu bara &bull; Standar Ketinggian Air Sungai: 4.00 Meter
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
                    Plan: 4.00m
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black">
                    Terkini: {senyiurSiteData.latest?.waterDepth.toFixed(2)}m
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-xl border text-xs font-black flex items-center gap-1 ${
                      senyiurSiteData.slope >= 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {senyiurSiteData.slope >= 0 ? (
                      <TrendingUp size={13} />
                    ) : (
                      <TrendingDown size={13} />
                    )}
                    <span>
                      {senyiurSiteData.slope >= 0 ? "+" : ""}
                      {senyiurSiteData.slope} m/hari
                    </span>
                  </span>
                </div>
              </div>

              {/* KPI Mini Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-amber-800 uppercase block">
                    Rata-rata Air
                  </span>
                  <span className="text-sm font-black font-mono text-amber-950">
                    {senyiurSiteData.avg.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Terendah (Min)
                  </span>
                  <span className="text-sm font-black font-mono text-rose-600">
                    {senyiurSiteData.min.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Tertinggi (Max)
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-600">
                    {senyiurSiteData.max.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-rose-700 uppercase block">
                    Status Navigasi
                  </span>
                  <span className="text-[11px] font-black text-rose-800">
                    STAND-BY (SURUT)
                  </span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-[10px] text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-amber-700">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span>Kedalaman Aktual (m)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-3 border-t-2 border-dashed border-slate-700 inline-block" />
                    <span>Garis Tren (OLS)</span>
                  </span>
                </div>
                <span className="flex items-center gap-1.5 font-bold text-rose-600 font-mono">
                  <span className="w-3 border-t-2 border-dashed border-rose-500 inline-block" />
                  <span>Standar Ketinggian Air Sungai: 4.0m</span>
                </span>
              </div>

              {/* Chart Visual */}
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={senyiurSiteData.data}
                    margin={{ top: 20, right: 15, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      domain={[0, 4.5]}
                      ticks={[0, 1.0, 2.0, 3.0, 4.0, 4.5]}
                      tick={{ fontSize: 9, fill: "#d97706" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload as SiteTrendPoint;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700 text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-1">
                                <span className="font-extrabold text-amber-400">
                                  {p.date} ({p.label})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {p.inputTime} WITA
                                </span>
                              </div>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-300">Kedalaman Aktual:</span>
                                  <span className="font-mono font-black text-amber-400">
                                    {p.waterDepth.toFixed(2)} m
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-300">Plan Ambang Batas:</span>
                                  <span className="font-mono font-bold text-rose-400">
                                    {p.plan.toFixed(2)} m
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-300">Garis Tren (OLS):</span>
                                  <span className="font-mono font-bold text-slate-300">
                                    {p.trendDepth.toFixed(2)} m
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1 text-[11px]">
                                  <span className="text-slate-400">Defisit ke Plan 4.0m:</span>
                                  <span className="font-mono font-black text-rose-400">
                                    {p.diffToPlan.toFixed(2)} m (Kurang)
                                  </span>
                                </div>
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
                      strokeWidth={1.75}
                      label={{
                        value: "Standar 4.0m",
                        position: "insideTopRight",
                        fill: "#ef4444",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="trendDepth"
                      name="Garis Tren (OLS)"
                      stroke="#334155"
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="waterDepth"
                      name="Kedalaman Aktual"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={0.16}
                      fill="#f59e0b"
                      dot={{ r: 3, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#ffffff" }}
                    >
                      <LabelList
                        dataKey="waterDepth"
                        position="top"
                        offset={6}
                        style={{ fontSize: "8px", fill: "#b45309", fontWeight: 700 }}
                        formatter={(val: any) =>
                          typeof val === "number" ? val.toFixed(2) : val
                        }
                      />
                    </Area>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insight Footnote Site 1 */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-black text-[11px] uppercase tracking-wider block">
                  Analisis Ketinggian Air Senyiur:
                </span>
                <p className="text-[10px] text-amber-950 leading-relaxed font-medium">
                  Seluruh elevasi pengukuran di Senyiur berada di bawah batas ambang 4.0m (rentang {senyiurSiteData.min.toFixed(2)}m s/d {senyiurSiteData.max.toFixed(2)}m). Kemiringan tren tercatat <strong>{senyiurSiteData.slope >= 0 ? "+" : ""}{senyiurSiteData.slope}m/hari</strong>. Tugboat dan ponton 300ft membutuhkan koordinasi elevasi kiriman hulu sebelum manuver keluar.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SITE 2: JETTY MUARA PAHU (HILIR)                               */}
          {/* ============================================================== */}
          <div className="bg-white border border-emerald-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div>
              {/* Header Card Site 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-emerald-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                      Hilir &bull; Muara Mahakam
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono">
                      Titik Pantau Estuari
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Jetty Muara Pahu
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Jalur utama transshipment sungai &bull; Standar Ketinggian Air Sungai: 4.00 Meter
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
                    Plan: 4.00m
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-black">
                    Terkini: {muaraPahuSiteData.latest?.waterDepth.toFixed(2)}m
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-xl border text-xs font-black flex items-center gap-1 ${
                      muaraPahuSiteData.slope >= 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {muaraPahuSiteData.slope >= 0 ? (
                      <TrendingUp size={13} />
                    ) : (
                      <TrendingDown size={13} />
                    )}
                    <span>
                      {muaraPahuSiteData.slope >= 0 ? "+" : ""}
                      {muaraPahuSiteData.slope} m/hari
                    </span>
                  </span>
                </div>
              </div>

              {/* KPI Mini Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                    Rata-rata Air
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-950">
                    {muaraPahuSiteData.avg.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Terendah (Min)
                  </span>
                  <span className="text-sm font-black font-mono text-amber-600">
                    {muaraPahuSiteData.min.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Tertinggi (Max)
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-600">
                    {muaraPahuSiteData.max.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-emerald-700 uppercase block">
                    Status Navigasi
                  </span>
                  <span className="text-[11px] font-black text-emerald-800">
                    100% AMAN MELINTAS
                  </span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-[10px] text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span>Kedalaman Aktual (m)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-3 border-t-2 border-dashed border-slate-700 inline-block" />
                    <span>Garis Tren (OLS)</span>
                  </span>
                </div>
                <span className="flex items-center gap-1.5 font-bold text-rose-600 font-mono">
                  <span className="w-3 border-t-2 border-dashed border-rose-500 inline-block" />
                  <span>Standar Ketinggian Air Sungai: 4.0m</span>
                </span>
              </div>

              {/* Chart Visual */}
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={muaraPahuSiteData.data}
                    margin={{ top: 20, right: 15, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis
                      domain={[5.5, 11]}
                      ticks={[6.0, 7.0, 8.0, 9.0, 10.0, 11.0]}
                      tick={{ fontSize: 9, fill: "#059669" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload as SiteTrendPoint;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700 text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-1">
                                <span className="font-extrabold text-emerald-400">
                                  {p.date} ({p.label})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {p.inputTime} WITA
                                </span>
                              </div>
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-300">Kedalaman Aktual:</span>
                                  <span className="font-mono font-black text-emerald-400">
                                    {p.waterDepth.toFixed(2)} m
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-300">Plan Ambang Batas:</span>
                                  <span className="font-mono font-bold text-rose-400">
                                    {p.plan.toFixed(2)} m
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-300">Garis Tren (OLS):</span>
                                  <span className="font-mono font-bold text-slate-300">
                                    {p.trendDepth.toFixed(2)} m
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1 text-[11px]">
                                  <span className="text-slate-400">Surplus vs Plan 4.0m:</span>
                                  <span className="font-mono font-black text-emerald-400">
                                    +{p.diffToPlan.toFixed(2)} m (Surplus Aman)
                                  </span>
                                </div>
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
                      strokeWidth={1.75}
                      label={{
                        value: "Standar 4.0m",
                        position: "insideBottomRight",
                        fill: "#ef4444",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="trendDepth"
                      name="Garis Tren (OLS)"
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="waterDepth"
                      name="Kedalaman Aktual"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={0.16}
                      fill="#10b981"
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 1.5, stroke: "#ffffff" }}
                    >
                      <LabelList
                        dataKey="waterDepth"
                        position="top"
                        offset={6}
                        style={{ fontSize: "8px", fill: "#047857", fontWeight: 700 }}
                        formatter={(val: any) =>
                          typeof val === "number" ? val.toFixed(2) : val
                        }
                      />
                    </Area>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insight Footnote Site 2 */}
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-black text-[11px] uppercase tracking-wider block">
                  Analisis Ketinggian Air Muara Pahu:
                </span>
                <p className="text-[10px] text-emerald-950 leading-relaxed font-medium">
                  Elevasi Muara Pahu sangat prima dengan rentang {muaraPahuSiteData.min.toFixed(2)}m s/d {muaraPahuSiteData.max.toFixed(2)}m (surplus {">"}+3.0m di atas standar 4.0m). Kemiringan tren tercatat <strong>{muaraPahuSiteData.slope >= 0 ? "+" : ""}{muaraPahuSiteData.slope}m/hari</strong>, mengonfirmasi tidak ada hambatan draft tongkang di muara.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MATRIKS SINKRONISASI & PERUBAHAN HARIAN (MODERN COMPARISON TABLE) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <GitCompare size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Matriks Sinkronisasi Harian: Muara Pahu vs Senyiur
              </h3>
              <p className="text-[10px] text-slate-500">
                Rekapitulasi perubahan harian membuktikan hubungan langsung kenaikan/penurunan antar kedua titik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
              Keduanya Naik: {bothUpCount} Hari
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
              Keduanya Turun: {bothDownCount} Hari
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
              Berlawanan: {divergentCount} Hari
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-28">Tanggal</th>
                <th className="py-3 px-3 w-36 text-right">Jetty Muara Pahu (m)</th>
                <th className="py-3 px-3 w-36 text-right">&Delta; Muara Pahu</th>
                <th className="py-3 px-3 w-36 text-right">Dermaga Senyiur (m)</th>
                <th className="py-3 px-3 w-36 text-right">&Delta; Senyiur</th>
                <th className="py-3 px-4 min-w-50">Keselarasan Arah Fluktuasi</th>
                <th className="py-3 px-3 w-40 text-right">Defisit Draft Senyiur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-600" />
                      <span className="text-xs font-semibold">Menghitung matriks korelasi sungai...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                [...pairedData].reverse().map((item, idx) => {
                  const isUp = item.statusType === "both_up";
                  const isDown = item.statusType === "both_down";
                  return (
                    <tr
                      key={item.date}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800">
                        {item.muaraPahu.toFixed(2)} m
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            item.deltaMuaraPahu > 0
                              ? "text-emerald-600"
                              : item.deltaMuaraPahu < 0
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {item.deltaMuaraPahu > 0 ? (
                            <ArrowUpRight size={13} />
                          ) : item.deltaMuaraPahu < 0 ? (
                            <ArrowDownRight size={13} />
                          ) : null}
                          {item.deltaMuaraPahu >= 0 ? "+" : ""}
                          {item.deltaMuaraPahu.toFixed(2)}m
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-amber-800">
                        {item.senyiur.toFixed(2)} m
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            item.deltaSenyiur > 0
                              ? "text-emerald-600"
                              : item.deltaSenyiur < 0
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {item.deltaSenyiur > 0 ? (
                            <ArrowUpRight size={13} />
                          ) : item.deltaSenyiur < 0 ? (
                            <ArrowDownRight size={13} />
                          ) : null}
                          {item.deltaSenyiur >= 0 ? "+" : ""}
                          {item.deltaSenyiur.toFixed(2)}m
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isUp
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isDown
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : item.statusType === "flat"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp size={11} className="text-emerald-600" />
                          ) : isDown ? (
                            <TrendingDown size={11} className="text-blue-600" />
                          ) : (
                            <Info size={11} />
                          )}
                          <span>{item.statusLabel}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {item.senyiurDeficit.toFixed(2)} m (Kurang)
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input River Journal Modal */}
      {isInputModalOpen && (
        <InputRiverJournalModal
          user={user}
          onClose={() => setIsInputModalOpen(false)}
          onSubmit={handleCreateEntry}
        />
      )}

      {/* Export PDF Modal */}
      {isPdfModalOpen && (
        <RiverJournalPdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          pairedData={pairedData}
          senyiurSiteData={senyiurSiteData}
          muaraPahuSiteData={muaraPahuSiteData}
          pearsonCorrelation={pearsonCorrelation}
          agreementRate={agreementRate}
          bothUpCount={bothUpCount}
          bothDownCount={bothDownCount}
          divergentCount={divergentCount}
          totalTransitions={totalTransitions}
          amplificationRatio={amplificationRatio}
          mpTotalSwing={mpTotalSwing}
          snyTotalSwing={snyTotalSwing}
          statsSenyiur={statsSenyiur}
          statsMuaraPahu={statsMuaraPahu}
          user={user}
        />
      )}
    </div>
  );
};
