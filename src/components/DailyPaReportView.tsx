"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  INDONESIAN_MONTHS,
  INDONESIAN_WEEKDAYS_MON_FIRST,
  buildCalendarMonthGrid,
  getTodayIsoDate,
} from "../utils/dailyPaHelpers";

export const DailyPaReportView: React.FC = () => {
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const now = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState<number>(() => now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => now.getMonth());

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
      {/* Header & Month Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
            <CalendarCheck size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
                Daily PA Report
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {INDONESIAN_MONTHS[viewMonth]} {viewYear}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Klik tanggal pada kalender untuk membuka halaman detail Daily PA Report pada tanggal tersebut.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>

          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            aria-label="Pilih Bulan"
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-300 cursor-pointer"
          >
            {INDONESIAN_MONTHS.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            aria-label="Pilih Tahun"
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-300 cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight size={16} />
          </button>

          {!isViewingCurrentMonth && (
            <button
              type="button"
              onClick={handleResetToday}
              className="h-9 px-3.5 rounded-xl border border-sky-200 bg-sky-50 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
            >
              Bulan Ini
            </button>
          )}

          <Link
            href={`/daily-pa-report/${todayIso}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>Buka Hari Ini</span>
            <ArrowUpRight size={14} />
          </Link>
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

                {!cell.isCurrentMonth && (
                  <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                    {INDONESIAN_MONTHS[cell.monthIndex].slice(0, 3)}
                  </span>
                )}

                {cell.isCurrentMonth && (
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
