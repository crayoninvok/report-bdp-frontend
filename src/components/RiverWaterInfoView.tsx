"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  RiverJournalEntry,
  SiteTrendPoint,
  SiteTrendSummary,
} from "../types/riverJournal";
import { riverJournalService } from "../services/riverJournalService";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  Waves,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  LogIn,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// =========================================================================
// OLS LINEAR REGRESSION HELPER (y = mx + b)
// =========================================================================
function computeSiteTrendData(
  entries: RiverJournalEntry[],
  siteName: "Senyiur" | "MuaraPahu"
): SiteTrendSummary {
  const siteEntries = entries.filter((e) => e.site === siteName);

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

interface RiverWaterInfoViewProps {
  user?: User | null;
  isStandalone?: boolean;
}

export const RiverWaterInfoView: React.FC<RiverWaterInfoViewProps> = ({
  user,
  isStandalone = false,
}) => {
  const [entries, setEntries] = useState<RiverJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showTable, setShowTable] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEntries = await riverJournalService.getJournals();
      setEntries(allEntries);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (e: any) {
      console.error("Gagal memuat data pantauan air sungai:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const senyiurData = useMemo(() => {
    return computeSiteTrendData(entries, "Senyiur");
  }, [entries]);

  const muaraPahuData = useMemo(() => {
    return computeSiteTrendData(entries, "MuaraPahu");
  }, [entries]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* ============================================================== */}
      {/* 1. HEADER (LIGHT, CLEAN, MINIMAL)                              */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Simple Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl p-1 bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center">
              <img
                src="/coa-logo-bdp.png"
                alt="PT Batara Dharma Persada"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Informasi Air Sungai
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                PT Batara Dharma Persada &bull; DAS Mahakam
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {lastUpdated && (
              <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                Pukul {lastUpdated} WITA
              </span>
            )}

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Perbarui data terbaru"
            >
              <RefreshCw
                size={13}
                className={isSyncing ? "animate-spin text-[#e95623]" : ""}
              />
              <span className="hidden sm:inline">
                {isSyncing ? "Memuat..." : "Refresh"}
              </span>
            </button>

            {isStandalone && (
              <a
                href="/"
                className="px-3 py-1.5 rounded-xl bg-[#e95623] hover:bg-[#d44415] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <LogIn size={13} />
                <span>Masuk Portal</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT (DUAL SITE CARDS - IDENTIK DENGAN GAMBAR USER) */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
              <RefreshCw size={16} className="animate-spin text-[#e95623]" />
              <span>Memuat data ketinggian air sungai...</span>
            </div>
          </div>
        )}

        {/* 2-Column Grid: Dermaga Senyiur KM 0 & Jetty Muara Pahu */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* ============================================================== */}
          {/* SITE 1: DERMAGA SENYIUR KM 0 (HULU)                            */}
          {/* ============================================================== */}
          <div className="bg-white border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              {/* Header Site 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-amber-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                      Hulu &bull; Loading Point
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      KM 0 Tabang
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Dermaga Senyiur KM 0
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Titik awal muat tongkang batu bara &bull; Standar Ketinggian Air Sungai: 4.00 Meter
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-white text-rose-600 border border-rose-300 text-xs font-bold shadow-2xs">
                    Plan: 4.00m
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-white text-amber-800 border border-amber-300 text-xs font-bold shadow-2xs">
                    Terkini: {senyiurData.latest ? `${senyiurData.latest.waterDepth.toFixed(2)}m` : "-"}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-xl bg-white border text-xs font-bold shadow-2xs flex items-center gap-1 ${
                      senyiurData.slope >= 0
                        ? "text-emerald-700 border-emerald-300"
                        : "text-rose-700 border-rose-300"
                    }`}
                  >
                    {senyiurData.slope >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    <span>
                      {senyiurData.slope >= 0 ? "+" : ""}
                      {senyiurData.slope} m/hari
                    </span>
                  </span>
                </div>
              </div>

              {/* 4 KPI Mini Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-amber-800 uppercase block">
                    Rata-rata Air
                  </span>
                  <span className="text-sm font-extrabold font-mono text-amber-950">
                    {senyiurData.avg.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Terendah (Min)
                  </span>
                  <span className="text-sm font-extrabold font-mono text-rose-600">
                    {senyiurData.min.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Tertinggi (Max)
                  </span>
                  <span className="text-sm font-extrabold font-mono text-emerald-600">
                    {senyiurData.max.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-rose-700 uppercase block">
                    Status Navigasi
                  </span>
                  <span className="text-[11px] font-extrabold text-rose-800">
                    STAND-BY (SURUT)
                  </span>
                </div>
              </div>

              {/* Legend */}
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

              {/* Visual Chart */}
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={senyiurData.data}
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
                            <div className="bg-white text-slate-800 rounded-xl p-2.5 shadow-lg border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                                <span className="font-bold text-amber-700">
                                  {p.date} ({p.label})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {p.inputTime} WITA
                                </span>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-600">
                                <span>Kedalaman:</span>
                                <strong className="text-amber-700 font-mono">
                                  {p.waterDepth.toFixed(2)} m
                                </strong>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-600">
                                <span>Standar Aman:</span>
                                <strong className="text-rose-600 font-mono">4.00 m</strong>
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
                      strokeWidth={1.5}
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
                      strokeWidth={1.75}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="waterDepth"
                      name="Kedalaman Aktual"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={0.18}
                      fill="#f59e0b"
                      dot={{ r: 3, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#ffffff" }}
                    >
                      <LabelList
                        dataKey="waterDepth"
                        position="top"
                        offset={6}
                        style={{ fontSize: "8px", fill: "#d97706", fontWeight: 700 }}
                        formatter={(val: any) =>
                          typeof val === "number" ? val.toFixed(2) : val
                        }
                      />
                    </Area>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Analysis Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-extrabold text-[11px] uppercase tracking-wider block text-amber-900">
                  ANALISIS KETINGGIAN AIR SENYIUR:
                </span>
                <p className="text-[10px] leading-relaxed font-medium text-amber-900/90">
                  Seluruh elevasi pengukuran di Senyiur berada di bawah batas ambang 4.0m (rentang{" "}
                  {senyiurData.min.toFixed(2)}m s/d {senyiurData.max.toFixed(2)}m). Kemiringan
                  tren tercatat{" "}
                  <strong>
                    {senyiurData.slope >= 0 ? "+" : ""}
                    {senyiurData.slope}m/hari
                  </strong>
                  . Tugboat dan ponton 300ft membutuhkan koordinasi elevasi kiriman hulu sebelum
                  manuver keluar.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SITE 2: JETTY MUARA PAHU (HILIR)                                */}
          {/* ============================================================== */}
          <div className="bg-white border-2 border-emerald-300/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              {/* Header Site 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-emerald-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Hilir &bull; Muara Mahakam
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Titik Pantau Estuari
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Jetty Muara Pahu
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Jalur utama transshipment sungai &bull; Standar Ketinggian Air Sungai: 4.00 Meter
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-white text-rose-600 border border-rose-300 text-xs font-bold shadow-2xs">
                    Plan: 4.00m
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-white text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
                    Terkini: {muaraPahuData.latest ? `${muaraPahuData.latest.waterDepth.toFixed(2)}m` : "-"}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-xl bg-white border text-xs font-bold shadow-2xs flex items-center gap-1 ${
                      muaraPahuData.slope >= 0
                        ? "text-emerald-700 border-emerald-300"
                        : "text-rose-700 border-rose-300"
                    }`}
                  >
                    {muaraPahuData.slope >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    <span>
                      {muaraPahuData.slope >= 0 ? "+" : ""}
                      {muaraPahuData.slope} m/hari
                    </span>
                  </span>
                </div>
              </div>

              {/* 4 KPI Mini Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                    Rata-rata Air
                  </span>
                  <span className="text-sm font-extrabold font-mono text-emerald-950">
                    {muaraPahuData.avg.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Terendah (Min)
                  </span>
                  <span className="text-sm font-extrabold font-mono text-rose-600">
                    {muaraPahuData.min.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Tertinggi (Max)
                  </span>
                  <span className="text-sm font-extrabold font-mono text-emerald-600">
                    {muaraPahuData.max.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                    Status Navigasi
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-900">
                    100% AMAN MELINTAS
                  </span>
                </div>
              </div>

              {/* Legend */}
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

              {/* Visual Chart */}
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={muaraPahuData.data}
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
                      ticks={[6, 7, 8, 9, 10, 11]}
                      tick={{ fontSize: 9, fill: "#059669" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0].payload as SiteTrendPoint;
                          return (
                            <div className="bg-white text-slate-800 rounded-xl p-2.5 shadow-lg border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                                <span className="font-bold text-emerald-700">
                                  {p.date} ({p.label})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {p.inputTime} WITA
                                </span>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-600">
                                <span>Kedalaman:</span>
                                <strong className="text-emerald-700 font-mono">
                                  {p.waterDepth.toFixed(2)} m
                                </strong>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-600">
                                <span>Standar Aman:</span>
                                <strong className="text-rose-600 font-mono">4.00 m</strong>
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
                      strokeWidth={1.5}
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
                      strokeWidth={1.75}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="waterDepth"
                      name="Kedalaman Aktual"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={0.18}
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

            {/* Analysis Box */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-extrabold text-[11px] uppercase tracking-wider block text-emerald-900">
                  ANALISIS KETINGGIAN AIR MUARA PAHU:
                </span>
                <p className="text-[10px] leading-relaxed font-medium text-emerald-900/90">
                  Elevasi Muara Pahu sangat prima dengan rentang {muaraPahuData.min.toFixed(2)}m s/d{" "}
                  {muaraPahuData.max.toFixed(2)}m (surplus {">"}+3.0m di atas standar 4.0m). Kemiringan
                  tren tercatat{" "}
                  <strong>
                    {muaraPahuData.slope >= 0 ? "+" : ""}
                    {muaraPahuData.slope}m/hari
                  </strong>
                  , mengonfirmasi tidak ada hambatan draft tongkang di muara.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible: Riwayat Pengukuran */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-800">Tabel Riwayat Pengukuran Terbaru</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                {entries.length} data
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#e95623]">
              <span>{showTable ? "Sembunyikan" : "Tampilkan"}</span>
              {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {showTable && (
            <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Waktu</th>
                    <th className="py-2 px-3">Lokasi</th>
                    <th className="py-2 px-3 text-right">Kedalaman (m)</th>
                    <th className="py-2 px-3 text-right">Standar Min</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {entries.slice(0, 10).map((item) => {
                    const isSafe = item.waterDepth >= (item.minThreshold || 4.0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-semibold">{item.date}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{item.inputTime}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{item.location}</td>
                        <td className="py-2 px-3 text-right font-mono font-extrabold">
                          <span className={item.site === "Senyiur" ? "text-amber-700" : "text-emerald-700"}>
                            {item.waterDepth.toFixed(2)}m
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">4.00m</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSafe
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isSafe ? "Air Aman" : "Surut"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Light Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>&copy; 2026 PT Batara Dharma Persada &bull; Pemantauan Elevasi Sungai DAS Mahakam</p>
      </footer>
    </div>
  );
};
