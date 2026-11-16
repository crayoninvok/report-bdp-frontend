"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radio,
  Sparkles,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  DailyPaMonthlyDaySummary,
  plantService,
} from "../services/plantService";
import {
  INDONESIAN_MONTHS,
  INDONESIAN_WEEKDAYS_MON_FIRST,
  buildCalendarMonthGrid,
  getTodayIsoDate,
} from "../utils/dailyPaHelpers";

interface DailyPaReportViewProps {
  onNavigateToMasterUnit?: () => void;
}

export const DailyPaReportView: React.FC<DailyPaReportViewProps> = ({
  onNavigateToMasterUnit,
}) => {
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const now = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState<number>(() => now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => now.getMonth());
  const [siteFilter, setSiteFilter] = useState<"" | "MuaraPahu" | "Senyiur">("");
  const [onlineCount, setOnlineCount] = useState<number>(70);

  // Fetch telemetry online count when site changes
  useEffect(() => {
    plantService
      .getPmRadar(siteFilter === "MuaraPahu" ? "MuaraPahu" : "Senyiur")
      .then((res) => {
        if (res?.telemetryMeta?.onlineCount !== undefined) {
          setOnlineCount(res.telemetryMeta.onlineCount);
        }
      })
      .catch(() => {});
  }, [siteFilter]);

  const [summaryMap, setSummaryMap] = useState<
    Record<string, DailyPaMonthlyDaySummary>
  >({});

  useEffect(() => {
    let active = true;
    const loadMonth = async () => {
      try {
        const res = await plantService.getDailyPaMonthlySummary(
          viewYear,
          viewMonth + 1,
          siteFilter || undefined
        );
        if (!active || !res.success) return;
        const map: Record<string, DailyPaMonthlyDaySummary> = {};
        for (const d of res.data.days) {
          map[d.date] = d;
        }
        setSummaryMap(map);
      } catch {
        // Keep calendar navigable even if summary fetch fails transiently
      }
    };
    loadMonth();
    return () => {
      active = false;
    };
  }, [viewYear, viewMonth, siteFilter]);

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    return Array.from({ length: 7 }, (_, idx) => currentYear - 3 + idx);
  }, [now]);

  const cells = useMemo(
    () => buildCalendarMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleResetToday = () => {
    const current = new Date();
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
  };

  const isViewingCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-5">
      {/* 0. Hero Section Header matching Periodic Service / Maintenance */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg-plantmaintenance.jpeg')" }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/95 via-slate-900/88 to-slate-900/70" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#e95623] text-white shadow-xs">
                <ShieldCheck size={13} />
                PLANT &amp; MAINTENANCE • DAILY PA REPORT
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <Radio size={12} className="animate-pulse text-emerald-300" />
                Volvo Live: {onlineCount} Unit Online
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/15">
                <CalendarCheck size={12} className="text-[#e95623]" />
                {INDONESIAN_MONTHS[viewMonth]} {viewYear}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Daily Physical Availability (PA) Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Monitoring ketersediaan fisik armada hauling, breakdown downtime, serta performa kesiapan unit harian berbasis tanggal kalender operasional.
            </p>
          </div>

          {/* Controls Strip matching image */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Site Switcher */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
                {[
                  { key: "", label: "Semua Site" },
                  { key: "MuaraPahu", label: "Site Muara Pahu" },
                  { key: "Senyiur", label: "Site Senyiur" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSiteFilter(s.key as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      siteFilter === s.key
                        ? "bg-[#e95623] text-white shadow-md"
                        : "text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Refresh button under site buttons as in image */}
              <button
                type="button"
                onClick={() => {
                  plantService
                    .getDailyPaMonthlySummary(
                      viewYear,
                      viewMonth + 1,
                      siteFilter || undefined
                    )
                    .then((res) => {
                      if (!res.success) return;
                      const map: Record<string, DailyPaMonthlyDaySummary> = {};
                      for (const d of res.data.days) {
                        map[d.date] = d;
                      }
                      setSummaryMap(map);
                    })
                    .catch(() => {});
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh Data Bulanan"
              >
                <RefreshCw size={11} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Month & Year Navigation Box */}
            <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                aria-label="Pilih Bulan"
                className="px-2 py-1 bg-white/10 text-white rounded-lg text-xs font-bold border border-white/15 focus:outline-hidden cursor-pointer"
              >
                {INDONESIAN_MONTHS.map((name, idx) => (
                  <option key={name} value={idx} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                aria-label="Pilih Tahun"
                className="px-2 py-1 bg-white/10 text-white rounded-lg text-xs font-bold border border-white/15 focus:outline-hidden cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight size={16} />
              </button>

              {!isViewingCurrentMonth && (
                <button
                  type="button"
                  onClick={handleResetToday}
                  className="px-2.5 py-1 rounded-lg bg-[#e95623] hover:bg-[#d84b1a] text-white text-[11px] font-extrabold transition-all cursor-pointer"
                >
                  Bulan Ini
                </button>
              )}
            </div>

            {/* Buka Hari Ini Button */}
            <Link
              href={`/daily-pa-report/${todayIso}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-all cursor-pointer"
            >
              <span>Buka Hari Ini</span>
              <ArrowUpRight size={14} className="text-[#e95623]" />
            </Link>

            {/* Target Metric Badge */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/12 text-white border border-white/20 select-none">
              <Sparkles size={15} className="text-orange-300" />
              <span>Target PA: 90%</span>
            </div>

            {/* Master Unit link if available */}
            {onNavigateToMasterUnit && (
              <button
                type="button"
                onClick={onNavigateToMasterUnit}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all cursor-pointer"
              >
                <Database size={14} />
                <span>Master Unit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {INDONESIAN_WEEKDAYS_MON_FIRST.map((day) => (
            <div
              key={day.short}
              className={`py-3 px-2 text-center text-[11px] sm:text-xs font-extrabold uppercase tracking-wider ${
                day.isSunday
                  ? "text-rose-600"
                  : day.isWeekend
                  ? "text-slate-600"
                  : "text-slate-500"
              }`}
            >
              <span className="sm:hidden">{day.short}</span>
              <span className="hidden sm:inline">{day.full}</span>
            </div>
          ))}
        </div>

        {/* 6x7 Date Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-200/80">
          {cells.map((cell) => {
            const isToday = cell.iso === todayIso;
            const daySummary = summaryMap[cell.iso];
            const isPaHealthy = daySummary
              ? daySummary.overallPaPercent >= daySummary.targetPa
              : true;

            return (
              <Link
                key={cell.iso}
                href={`/daily-pa-report/${cell.iso}`}
                aria-label={`Buka Daily PA Report tanggal ${cell.iso}`}
                className={`group relative min-h-24 sm:min-h-28 lg:min-h-32 p-2 sm:p-3 flex flex-col justify-between transition-all focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-sky-400 ${
                  isToday
                    ? "bg-sky-50/75 hover:bg-sky-100/70"
                    : !cell.isCurrentMonth
                    ? "bg-slate-50/70 hover:bg-slate-100/80"
                    : cell.isSunday
                    ? "bg-rose-50/20 hover:bg-sky-50/60"
                    : cell.isWeekend
                    ? "bg-slate-50/40 hover:bg-sky-50/60"
                    : "bg-white hover:bg-sky-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-colors ${
                      isToday
                        ? "bg-sky-600 text-white shadow-xs"
                        : !cell.isCurrentMonth
                        ? "text-slate-400 group-hover:text-slate-600"
                        : cell.isSunday
                        ? "text-rose-600 group-hover:bg-rose-100/70"
                        : "text-slate-800 group-hover:bg-sky-100/80 group-hover:text-sky-800"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {isToday ? (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                      Hari Ini
                    </span>
                  ) : (
                    <ArrowUpRight
                      size={15}
                      className="text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
                    />
                  )}
                </div>

                {daySummary ? (
                  <div className="pt-1.5 space-y-1">
                    <div
                      className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold border ${
                        isPaHealthy
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      PA {daySummary.overallPaPercent.toFixed(1)}%
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 hidden sm:block">
                      {daySummary.totalUnits} unit &bull; {daySummary.breakdownUnitCount} BD
                    </div>
                  </div>
                ) : !cell.isCurrentMonth ? (
                  <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                    {INDONESIAN_MONTHS[cell.monthIndex].slice(0, 3)}
                  </span>
                ) : (
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 group-hover:text-sky-700 transition-colors opacity-0 group-hover:opacity-100">
                      Buka Laporan →
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
