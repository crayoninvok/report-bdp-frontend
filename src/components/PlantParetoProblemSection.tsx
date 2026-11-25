"use client";

import React, { useState } from "react";
import {
  Activity,
  BarChart2,
  Clock,
  Compass,
  Disc,
  Droplet,
  ExternalLink,
  Flame,
  Layers,
  Package,
  Search,
  Settings,
  Shield,
  Truck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  PlantBreakdownParetoData,
  PlantBreakdownParetoItem,
} from "../services/plantService";

interface PlantParetoProblemSectionProps {
  pareto?: PlantBreakdownParetoData | null;
  site?: string;
  onNavigateToBreakdown?: (filterComponent?: string) => void;
}

// Visual color palette and icons for the 9 registered components
function getComponentVisual(componentName: string, isFeaturedDark = false) {
  const norm = componentName.toLowerCase();

  if (norm.includes("engine")) {
    return {
      name: "Engine",
      systemTitle: "ENGINE SYSTEM",
      bgClass: "bg-gradient-to-br from-red-600 via-rose-700 to-red-800 text-white",
      borderClass: "border-red-500/30",
      accentBg: "bg-red-950/40 text-red-200",
      icon: <Wrench size={18} />,
      watermarkIcon: <Wrench size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("hydraul")) {
    return {
      name: "Hydraulic",
      systemTitle: "HYDRAULIC SYSTEM",
      bgClass: "bg-gradient-to-br from-orange-500 to-amber-600 text-white",
      borderClass: "border-orange-400/30",
      accentBg: "bg-orange-950/40 text-orange-200",
      icon: <Droplet size={18} />,
      watermarkIcon: <Droplet size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("transmi")) {
    return {
      name: "Transmission",
      systemTitle: "TRANSMISSION SYSTEM",
      bgClass: "bg-gradient-to-br from-blue-600 to-sky-700 text-white",
      borderClass: "border-blue-400/30",
      accentBg: "bg-blue-950/40 text-blue-200",
      icon: <Settings size={18} />,
      watermarkIcon: <Settings size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("undercarriage")) {
    return {
      name: "Undercarriage",
      systemTitle: "UNDERCARRIAGE SYSTEM",
      bgClass: "bg-gradient-to-br from-indigo-700 to-purple-800 text-white",
      borderClass: "border-indigo-400/30",
      accentBg: "bg-indigo-950/40 text-indigo-200",
      icon: <Layers size={18} />,
      watermarkIcon: <Layers size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("electr")) {
    return {
      name: "Electrical",
      systemTitle: "ELECTRICAL SYSTEM",
      bgClass: "bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 text-slate-900",
      borderClass: "border-amber-300",
      accentBg: "bg-amber-900/15 text-amber-950",
      icon: <Zap size={18} />,
      watermarkIcon: <Zap size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("steering")) {
    return {
      name: "Steering",
      systemTitle: "STEERING SYSTEM",
      bgClass: "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800",
      borderClass: "border-slate-300",
      accentBg: "bg-slate-700/10 text-slate-900",
      icon: <Compass size={18} />,
      watermarkIcon: <Compass size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("brake")) {
    return {
      name: "Brake",
      systemTitle: "BRAKE SYSTEM",
      bgClass: "bg-gradient-to-br from-slate-600 to-zinc-800 text-white",
      borderClass: "border-zinc-500/30",
      accentBg: "bg-zinc-950/40 text-zinc-200",
      icon: <Disc size={18} />,
      watermarkIcon: <Disc size={72} className="opacity-15" />,
    };
  }

  if (norm.includes("travel")) {
    return {
      name: "Travel Drive",
      systemTitle: "TRAVEL DRIVE SYSTEM",
      bgClass: "bg-gradient-to-br from-teal-600 to-emerald-700 text-white",
      borderClass: "border-teal-400/30",
      accentBg: "bg-teal-950/40 text-teal-200",
      icon: <Activity size={18} />,
      watermarkIcon: <Activity size={72} className="opacity-15" />,
    };
  }

  // Others default
  if (isFeaturedDark) {
    return {
      name: "Others",
      systemTitle: "OTHERS SYSTEM",
      bgClass: "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900 text-white",
      borderClass: "border-slate-500/40",
      accentBg: "bg-slate-950/40 text-slate-200",
      icon: <Package size={18} />,
      watermarkIcon: <Package size={72} className="opacity-15" />,
    };
  }

  return {
    name: "Others",
    systemTitle: "OTHERS SYSTEM",
    bgClass: "bg-gradient-to-br from-slate-400 to-slate-500 text-white",
    borderClass: "border-slate-300/40",
    accentBg: "bg-slate-950/30 text-slate-100",
    icon: <Package size={18} />,
    watermarkIcon: <Package size={72} className="opacity-15" />,
  };
}

export const PlantParetoProblemSection: React.FC<
  PlantParetoProblemSectionProps
> = ({ pareto, site, onNavigateToBreakdown }) => {
  const [viewMode, setViewMode] = useState<"both" | "hours" | "frequency">("both");
  const [selectedCompForDetail, setSelectedCompForDetail] = useState<string | null>(null);

  const byHours = pareto?.byHours || [];
  const byFrequency = pareto?.byFrequency || [];
  const totalHours = pareto?.totalHours || 0;
  const totalFrequency = pareto?.totalFrequency || 0;
  const records = pareto?.records || [];

  // Filter records when user clicks a component
  const filteredRecords = selectedCompForDetail
    ? records.filter((r) => {
        const norm = (r.component || "").toLowerCase();
        const sel = selectedCompForDetail.toLowerCase();
        if (sel === "others") {
          return (
            !norm.includes("engine") &&
            !norm.includes("hydraul") &&
            !norm.includes("transmi") &&
            !norm.includes("clutch") &&
            !norm.includes("undercarriage") &&
            !norm.includes("track") &&
            !norm.includes("suspension") &&
            !norm.includes("axle") &&
            !norm.includes("electr") &&
            !norm.includes("steering") &&
            !norm.includes("brake") &&
            !norm.includes("travel")
          );
        }
        return norm.includes(sel.slice(0, 5));
      })
    : [];

  const topHoursItem = byHours[0];
  const otherHoursItems = byHours.slice(1);

  const topFreqItem = byFrequency[0];
  const otherFreqItems = byFrequency.slice(1);

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* 1. SECTION HEADER BAR WITH VIEW TOGGLE                              */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#e95623] shrink-0">
            <Flame size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Pareto Problem Repair &amp; Maintenance
              </h3>
              {site && site !== "ALL" && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-[#e95623]">
                  {site === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Komponen dengan HM dan Frekuensi tertinggi ditampilkan lebih besar secara estetik
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-600 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => setViewMode("both")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "both"
                ? "bg-white text-slate-900 font-black shadow-xs"
                : "hover:text-slate-900"
            }`}
          >
            Keduanya Bersisian
          </button>
          <button
            type="button"
            onClick={() => setViewMode("hours")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "hours"
                ? "bg-white text-[#e95623] font-black shadow-xs"
                : "hover:text-slate-900"
            }`}
          >
            <Clock size={13} />
            <span>Fokus Jam (Hours)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("frequency")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "frequency"
                ? "bg-white text-amber-700 font-black shadow-xs"
                : "hover:text-slate-900"
            }`}
          >
            <BarChart2 size={13} />
            <span>Fokus Frekuensi</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. THE TWO MOSAIC PAPAN CATUR CARDS                                 */}
      {/* =================================================================== */}
      <div
        className={`grid gap-5 ${
          viewMode === "both"
            ? "grid-cols-1 xl:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* =============================================================== */}
        {/* CARD A: MAJOR BREAKDOWN BY HOURS (PAPAN CATUR)                 */}
        {/* =============================================================== */}
        {(viewMode === "both" || viewMode === "hours") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col justify-between space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Truck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 tracking-tight">
                    Major Breakdown by Hours (Papan Catur)
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Total Akumulasi Durasi Perbaikan Komponen
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono font-black">
                {totalHours.toLocaleString("id-ID", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                Jam Total
              </div>
            </div>

            {/* Mosaic Grid: Rank #1 featured + 8 components */}
            <div className="space-y-3">
              {/* Top Section: Rank #1 (5 cols) + Ranks #2..#5 (7 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* #1 HIGHEST DOWNTIME IMPACT (Large Card) */}
                {topHoursItem && (
                  <div
                    onClick={() => setSelectedCompForDetail(topHoursItem.component)}
                    className={`sm:col-span-5 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-55 shadow-sm cursor-pointer hover:brightness-105 transition-all ${
                      getComponentVisual(topHoursItem.component).bgClass
                    }`}
                  >
                    <div className="absolute -bottom-4 -right-4 pointer-events-none">
                      {getComponentVisual(topHoursItem.component).watermarkIcon}
                    </div>

                    {/* Top Tag & Action */}
                    <div className="flex items-center justify-between gap-1 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/25 text-white backdrop-blur-xs">
                        #1 HIGHEST DOWNTIME IMPACT
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCompForDetail(topHoursItem.component);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-900 shadow-2xs cursor-pointer transition-all"
                      >
                        <Search size={10} />
                        <span>Filter WO</span>
                      </button>
                    </div>

                    {/* Middle: Title & Subtitle */}
                    <div className="my-3 z-10">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white mb-2">
                        {getComponentVisual(topHoursItem.component).icon}
                      </div>
                      <div className="text-sm font-black tracking-tight uppercase">
                        {getComponentVisual(topHoursItem.component).systemTitle}
                      </div>
                      <p className="text-[10px] text-white/80 mt-0.5 leading-snug">
                        Penyumbang downtime terbesar di seluruh armada • Klik untuk filter WO
                      </p>
                    </div>

                    {/* Bottom: Huge Stat */}
                    <div className="z-10 pt-2 border-t border-white/15">
                      <div className="text-2xl sm:text-3xl font-black font-mono leading-none tracking-tight">
                        {topHoursItem.durationHours.toLocaleString("id-ID", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        <span className="text-xs font-bold text-white/80">Hours</span>
                      </div>
                      <div className="text-[11px] font-bold text-white/90 mt-1">
                        {topHoursItem.frequency} Kasus WO ({topHoursItem.percentageHours}%)
                      </div>
                    </div>
                  </div>
                )}

                {/* Ranks #2, #3, #4, #5 (2x2 Grid) */}
                <div className="sm:col-span-7 grid grid-cols-2 gap-3">
                  {otherHoursItems.slice(0, 4).map((item) => {
                    const visual = getComponentVisual(item.component);
                    return (
                      <div
                        key={item.component}
                        onClick={() => setSelectedCompForDetail(item.component)}
                        className={`rounded-2xl p-3.5 flex flex-col justify-between min-h-26.25 shadow-2xs cursor-pointer hover:brightness-105 transition-all ${visual.bgClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black opacity-85">
                            #{item.rank}
                          </span>
                          <span className="opacity-80">{visual.icon}</span>
                        </div>
                        <div>
                          <div className="text-xs font-black leading-tight">
                            {visual.name}
                          </div>
                          <div className="text-[10px] opacity-80 font-medium">
                            {item.percentageHours}% Total
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-white/15 flex items-baseline justify-between">
                          <span className="text-sm font-black font-mono">
                            {item.durationHours.toLocaleString("id-ID", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </span>
                          <span className="text-[10px] font-bold opacity-80">
                            Hours
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Row: Ranks #6, #7, #8, #9 (4 Columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {otherHoursItems.slice(4, 8).map((item) => {
                  const visual = getComponentVisual(item.component);
                  return (
                    <div
                      key={item.component}
                      onClick={() => setSelectedCompForDetail(item.component)}
                      className={`rounded-xl p-3 flex flex-col justify-between min-h-21.25 shadow-2xs cursor-pointer hover:brightness-105 transition-all ${visual.bgClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black opacity-85">
                          #{item.rank}
                        </span>
                        <span className="opacity-80">{visual.icon}</span>
                      </div>
                      <div>
                        <div className="text-xs font-black truncate">
                          {visual.name}
                        </div>
                        <div className="text-[9px] opacity-75 font-medium">
                          {item.percentageHours}% Total
                        </div>
                      </div>
                      <div className="pt-1 border-t border-current/15 flex items-baseline justify-between">
                        <span className="text-xs font-black font-mono">
                          {item.durationHours.toLocaleString("id-ID", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </span>
                        <span className="text-[9px] font-bold opacity-75">
                          Hours
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footnote */}
            <p className="text-[10px] text-slate-400 italic pt-1">
              * Papan catur dinamis: Ukuran kotak otomatis menyesuaikan durasi jam downtime 9 Komponen Terdaftar
            </p>
          </div>
        )}

        {/* =============================================================== */}
        {/* CARD B: MAJOR BREAKDOWN BY FREQUENCY (PAPAN CATUR)             */}
        {/* =============================================================== */}
        {(viewMode === "both" || viewMode === "frequency") && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col justify-between space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 tracking-tight">
                    Major Breakdown by Frequency (Papan Catur)
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Frekuensi Total Kejadian Kerusakan per Komponen
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-black">
                {totalFrequency} Kasus Total
              </div>
            </div>

            {/* Mosaic Grid: Rank #1 featured + 8 components */}
            <div className="space-y-3">
              {/* Top Section: Rank #1 (5 cols) + Ranks #2..#5 (7 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* #1 MOST FREQUENT BREAKDOWN (Large Card) */}
                {topFreqItem && (
                  <div
                    onClick={() => setSelectedCompForDetail(topFreqItem.component)}
                    className={`sm:col-span-5 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between min-h-55 shadow-sm cursor-pointer hover:brightness-105 transition-all ${
                      getComponentVisual(topFreqItem.component, true).bgClass
                    }`}
                  >
                    <div className="absolute -bottom-4 -right-4 pointer-events-none">
                      {getComponentVisual(topFreqItem.component).watermarkIcon}
                    </div>

                    {/* Top Tag & Action */}
                    <div className="flex items-center justify-between gap-1 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/25 text-white backdrop-blur-xs">
                        #1 MOST FREQUENT BREAKDOWN
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCompForDetail(topFreqItem.component);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-900 shadow-2xs cursor-pointer transition-all"
                      >
                        <Search size={10} />
                        <span>Filter WO</span>
                      </button>
                    </div>

                    {/* Middle: Title & Subtitle */}
                    <div className="my-3 z-10">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white mb-2">
                        {getComponentVisual(topFreqItem.component).icon}
                      </div>
                      <div className="text-sm font-black tracking-tight uppercase">
                        {getComponentVisual(topFreqItem.component).systemTitle}
                      </div>
                      <p className="text-[10px] text-white/80 mt-0.5 leading-snug">
                        Frekuensi kasus kerusakan paling sering terjadi • Klik untuk filter WO
                      </p>
                    </div>

                    {/* Bottom: Huge Stat */}
                    <div className="z-10 pt-2 border-t border-white/15">
                      <div className="text-2xl sm:text-3xl font-black font-mono leading-none tracking-tight">
                        {topFreqItem.frequency}{" "}
                        <span className="text-xs font-bold text-white/80">Kasus</span>
                      </div>
                      <div className="text-[11px] font-bold text-white/90 mt-1">
                        {topFreqItem.durationHours.toLocaleString("id-ID", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        Jam BD ({topFreqItem.percentageFreq}%)
                      </div>
                    </div>
                  </div>
                )}

                {/* Ranks #2, #3, #4, #5 (2x2 Grid) */}
                <div className="sm:col-span-7 grid grid-cols-2 gap-3">
                  {otherFreqItems.slice(0, 4).map((item) => {
                    const visual = getComponentVisual(item.component);
                    return (
                      <div
                        key={item.component}
                        onClick={() => setSelectedCompForDetail(item.component)}
                        className={`rounded-2xl p-3.5 flex flex-col justify-between min-h-26.25 shadow-2xs cursor-pointer hover:brightness-105 transition-all ${visual.bgClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black opacity-85">
                            #{item.rank}
                          </span>
                          <span className="opacity-80">{visual.icon}</span>
                        </div>
                        <div>
                          <div className="text-xs font-black leading-tight">
                            {visual.name}
                          </div>
                          <div className="text-[10px] opacity-80 font-medium">
                            {item.percentageFreq}% Kasus
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-white/15 flex items-baseline justify-between">
                          <span className="text-sm font-black font-mono">
                            {item.frequency}
                          </span>
                          <span className="text-[10px] font-bold opacity-80">
                            Kasus
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Row: Ranks #6, #7, #8, #9 (4 Columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {otherFreqItems.slice(4, 8).map((item) => {
                  const visual = getComponentVisual(item.component);
                  return (
                    <div
                      key={item.component}
                      onClick={() => setSelectedCompForDetail(item.component)}
                      className={`rounded-xl p-3 flex flex-col justify-between min-h-21.25 shadow-2xs cursor-pointer hover:brightness-105 transition-all ${visual.bgClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black opacity-85">
                          #{item.rank}
                        </span>
                        <span className="opacity-80">{visual.icon}</span>
                      </div>
                      <div>
                        <div className="text-xs font-black truncate">
                          {visual.name}
                        </div>
                        <div className="text-[9px] opacity-75 font-medium">
                          {item.percentageFreq}% Kasus
                        </div>
                      </div>
                      <div className="pt-1 border-t border-current/15 flex items-baseline justify-between">
                        <span className="text-xs font-black font-mono">
                          {item.frequency}
                        </span>
                        <span className="text-[9px] font-bold opacity-75">
                          Kasus
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footnote */}
            <p className="text-[10px] text-slate-400 italic pt-1">
              * Papan catur dinamis: Ukuran kotak otomatis menyesuaikan frekuensi kerusakan 9 Komponen Terdaftar
            </p>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 3. WORK ORDER DETAIL MODAL (WHEN FILTER WO IS CLICKED)              */}
      {/* =================================================================== */}
      {selectedCompForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-[#e95623] flex items-center justify-center">
                  <Search size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    Detail Kasus Breakdown: {selectedCompForDetail} System
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Menampilkan laporan kasus WO dan akumulasi durasi perbaikan dari Daily Breakdown
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompForDetail(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-xs font-bold text-slate-600">
                    Belum ada catatan detail Work Order untuk komponen {selectedCompForDetail}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Data diambil secara dinamis dari tabel Daily Breakdown Report.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">No WO</th>
                        <th className="py-2.5 px-3">Deskripsi Kerusakan</th>
                        <th className="py-2.5 px-3 text-right">Durasi (Jam)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                            {rec.date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {rec.unitCode}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-orange-600 font-bold whitespace-nowrap">
                            {rec.woNumber || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-semibold max-w-xs truncate">
                            {rec.breakdownDescription}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {rec.durationHours} Jam
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                rec.status === "Close"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Total Kasus Tercatat: <strong>{filteredRecords.length} WO</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCompForDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
