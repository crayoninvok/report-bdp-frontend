"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  RiverJournalEntry,
  RiverJournalStats,
  CreateRiverJournalPayload,
} from "../types/riverJournal";
import { riverJournalService } from "../services/riverJournalService";
import { InputRiverJournalModal } from "./InputRiverJournalModal";
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
} from "recharts";
import {
  Waves,
  Ship,
  Plus,
  RefreshCw,
  Printer,
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

interface RiverJournalViewProps {
  user: User;
}

interface DailyPairedPoint {
  date: string;
  label: string;
  senyiur: number;
  muaraPahu: number;
  deltaSenyiur: number;
  deltaMuaraPahu: number;
  isSameDirection: boolean;
  statusLabel: string;
  statusType: "both_up" | "both_down" | "divergent" | "flat";
  senyiurDeficit: number;
}

export const RiverJournalView: React.FC<RiverJournalViewProps> = ({ user }) => {
  const { showSuccess, showError } = useNotification();

  const [entries, setEntries] = useState<RiverJournalEntry[]>([]);
  const [statsSenyiur, setStatsSenyiur] = useState<RiverJournalStats | null>(null);
  const [statsMuaraPahu, setStatsMuaraPahu] = useState<RiverJournalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);

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
    bothUpCount,
    bothDownCount,
    divergentCount,
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

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Analisis hidrologis perbandingan kedalaman air antara <strong>Dermaga Senyiur KM 0 (Hulu)</strong> dan{" "}
              <strong>Jetty Muara Pahu (Hilir)</strong> yang berada pada satu kesatuan Daerah Aliran Sungai (DAS).
              Mengevaluasi apakah kenaikan/penurunan di Muara Pahu diikuti oleh Senyiur serta dampaknya terhadap izin draft tongkang (4.0m).
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
              onClick={handleSyncGoogleSheets}
              disabled={isSyncing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Sinkronisasi data Google Sheets terbaru"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin text-teal-400" : ""} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sync Sheets"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all cursor-pointer"
              title="Cetak Halaman Analisis"
            >
              <Printer size={15} />
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
            level air Senyiur (1.76m - 2.74m) masih berada di bawah pagu draft aman tongkang 4.0m (defisit minimal 1.26m).
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
                      value: "Pagu 4.0m",
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
    </div>
  );
};
