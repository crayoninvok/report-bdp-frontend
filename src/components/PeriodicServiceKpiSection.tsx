"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  FileText,
  Gauge,
  RefreshCw,
  Target,
  Timer,
  Wrench,
} from "lucide-react";
import { MasterUnit, plantService, WeeklyScheduleData } from "../services/plantService";
import {
  computePsKpiMetrics,
  countInclusiveDays,
  exportPmScheduleExcel,
  formatDateRangeLabel,
  formatIndoMonthYear,
  formatIndoShortDate,
  formatKpiPct,
  getIndoDayNameClient,
  getLocalTodayIso,
  getLocalWeekRange,
  KpiMetricEntry,
  parseIsoToLocalDate,
  shiftIsoDate,
  toLocalIsoDate,
} from "../utils/pmHelpers";

const MAX_KPI_RANGE_DAYS = 90;
const CALENDAR_WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

interface PeriodicServiceKpiSectionProps {
  scheduleData: WeeklyScheduleData | null;
  selectedSite: string;
  isLoadingWeekly?: boolean;
  masterUnits?: MasterUnit[];
  onJumpToDetail?: (range: { startDate: string; endDate: string }) => void;
  onRangeChange?: (range: { startDate: string; endDate: string }) => void;
  onExportPdf?: (range: { startDate: string; endDate: string }) => void;
}

interface KpiCardDescriptor {
  id: string;
  title: string;
  subtitle: string;
  metric: KpiMetricEntry;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
}

interface CalendarCell {
  iso: string;
  dayNum: number;
  inCurrentMonth: boolean;
}

/** Returns threshold tone classes for a percentage score. */
function getScoreTone(pct: number, hasPlan: boolean) {
  if (!hasPlan) {
    return {
      text: "text-slate-400",
      badge: "bg-slate-100 text-slate-500 border-slate-200",
      bar: "bg-slate-300",
    };
  }
  if (pct >= 90) {
    return {
      text: "text-emerald-700",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      bar: "bg-emerald-500",
    };
  }
  if (pct >= 70) {
    return {
      text: "text-amber-700",
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      bar: "bg-amber-500",
    };
  }
  return {
    text: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
  };
}

/** Builds a Monday-first calendar grid of cells for the requested year & month. */
function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12, 0, 0).getDate();
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dt = new Date(year, monthIndex, 1 - mondayOffset + i, 12, 0, 0);
    cells.push({
      iso: toLocalIsoDate(dt),
      dayNum: dt.getDate(),
      inCurrentMonth: dt.getMonth() === monthIndex && dt.getFullYear() === year,
    });
  }
  return cells;
}

/** Normalizes and enforces a valid inclusive range capped at MAX_KPI_RANGE_DAYS. */
function normalizeKpiRange(a: string, b: string): {
  startDate: string;
  endDate: string;
  wasCapped: boolean;
} {
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  if (countInclusiveDays(start, end) > MAX_KPI_RANGE_DAYS) {
    return {
      startDate: start,
      endDate: shiftIsoDate(start, MAX_KPI_RANGE_DAYS - 1),
      wasCapped: true,
    };
  }
  return { startDate: start, endDate: end, wasCapped: false };
}

interface KpiCalendarRangePickerProps {
  startDate: string;
  endDate: string;
  todayStr: string;
  currentWeekRange: { startDate: string; endDate: string };
  onApplyRange: (startDate: string, endDate: string) => void;
}

/** Interactive calendar popover supporting multi-day (Minggu Ini default) and single-day KPI filtering. */
const KpiCalendarRangePicker: React.FC<KpiCalendarRangePickerProps> = ({
  startDate,
  endDate,
  todayStr,
  currentWeekRange,
  onApplyRange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const initialMonthAnchor = parseIsoToLocalDate(endDate) || new Date();
  const [viewYear, setViewYear] = useState(initialMonthAnchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonthAnchor.getMonth());

  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const [manualStart, setManualStart] = useState(startDate);
  const [manualEnd, setManualEnd] = useState(endDate);
  const [rangeNotice, setRangeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setDraftStart(null);
        setHoverIso(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setDraftStart(null);
        setHoverIso(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        const anchor = parseIsoToLocalDate(endDate) || new Date();
        setViewYear(anchor.getFullYear());
        setViewMonth(anchor.getMonth());
        setDraftStart(null);
        setHoverIso(null);
        setManualStart(startDate);
        setManualEnd(endDate);
        setRangeNotice(null);
      }
      return next;
    });
  };

  const commitAndClose = (rawA: string, rawB: string) => {
    const normalized = normalizeKpiRange(rawA, rawB);
    onApplyRange(normalized.startDate, normalized.endDate);
    setManualStart(normalized.startDate);
    setManualEnd(normalized.endDate);
    setDraftStart(null);
    setHoverIso(null);
    setRangeNotice(
      normalized.wasCapped
        ? `Rentang dibatasi maksimal ${MAX_KPI_RANGE_DAYS} hari.`
        : null
    );
    if (!normalized.wasCapped) {
      setIsOpen(false);
    }
  };

  const handleDayClick = (iso: string) => {
    setRangeNotice(null);
    if (!draftStart) {
      setDraftStart(iso);
      setManualStart(iso);
      setManualEnd(iso);
      return;
    }
    commitAndClose(draftStart, iso);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1, 12, 0, 0);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const monthRange = useMemo(() => {
    const dt = parseIsoToLocalDate(todayStr) || new Date();
    const y = dt.getFullYear();
    const m = dt.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      end: `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [todayStr]);

  const presets = useMemo(
    () => [
      {
        id: "week",
        label: "Minggu Ini",
        start: currentWeekRange.startDate,
        end: currentWeekRange.endDate,
      },
      { id: "today", label: "Today", start: todayStr, end: todayStr },
      {
        id: "7d",
        label: "7 Hari Terakhir",
        start: shiftIsoDate(todayStr, -6),
        end: todayStr,
      },
      {
        id: "30d",
        label: "30 Hari Terakhir",
        start: shiftIsoDate(todayStr, -29),
        end: todayStr,
      },
      {
        id: "month",
        label: "Bulan Ini",
        start: monthRange.start,
        end: monthRange.end,
      },
    ],
    [todayStr, currentWeekRange, monthRange]
  );

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Preview active selection or drag/two-click hover range
  const previewStart = useMemo(() => {
    if (!draftStart) return startDate;
    const target = hoverIso || draftStart;
    return draftStart <= target ? draftStart : target;
  }, [draftStart, hoverIso, startDate]);

  const previewEnd = useMemo(() => {
    if (!draftStart) return endDate;
    const target = hoverIso || draftStart;
    return draftStart <= target ? target : draftStart;
  }, [draftStart, hoverIso, endDate]);

  const triggerLabel = formatDateRangeLabel(
    startDate,
    endDate,
    todayStr,
    currentWeekRange
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 transition-colors cursor-pointer"
        title="Buka kalender untuk memilih tanggal atau rentang hari KPI"
      >
        <Calendar size={14} className="text-[#e95623] shrink-0" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Filter Kalender KPI Periodic Service"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-40 w-[312px] sm:w-[344px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 space-y-3"
        >
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const isActive =
                !draftStart && startDate === p.start && endDate === p.end;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => commitAndClose(p.start, p.end)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#e95623] text-white border-[#e95623] shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Month Header */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-extrabold text-slate-800">
              {formatIndoMonthYear(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Headers & Day Cells */}
          <div>
            <div className="grid grid-cols-7 mb-1">
              {CALENDAR_WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="text-center text-[10px] font-extrabold text-slate-400 py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-y-1"
              onMouseLeave={() => setHoverIso(null)}
            >
              {cells.map((cell) => {
                const isStart = cell.iso === previewStart;
                const isEnd = cell.iso === previewEnd;
                const isSingle = isStart && isEnd;
                const isInBetween =
                  cell.iso > previewStart && cell.iso < previewEnd;
                const isToday = cell.iso === todayStr;

                let cellStyle = cell.inCurrentMonth
                  ? "text-slate-700 hover:bg-slate-100 rounded-lg"
                  : "text-slate-300 hover:bg-slate-50 rounded-lg";

                if (isSingle) {
                  cellStyle =
                    "bg-[#e95623] text-white font-extrabold rounded-lg shadow-2xs";
                } else if (isStart) {
                  cellStyle =
                    "bg-[#e95623] text-white font-extrabold rounded-l-lg shadow-2xs";
                } else if (isEnd) {
                  cellStyle =
                    "bg-[#e95623] text-white font-extrabold rounded-r-lg shadow-2xs";
                } else if (isInBetween) {
                  cellStyle =
                    "bg-orange-100/90 text-orange-950 font-bold rounded-none hover:bg-orange-200/70";
                }

                const todayRing =
                  isToday && !isStart && !isEnd
                    ? "ring-1 ring-inset ring-[#e95623]/70 font-extrabold"
                    : "";

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => handleDayClick(cell.iso)}
                    onMouseEnter={() => {
                      if (draftStart) setHoverIso(cell.iso);
                    }}
                    className={`h-8 w-full text-xs transition-colors flex items-center justify-center cursor-pointer ${cellStyle} ${todayRing}`}
                  >
                    {cell.dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection Guidance / Notice */}
          <p
            className={`text-[10.5px] leading-snug ${
              rangeNotice ? "text-rose-600 font-semibold" : "text-slate-500"
            }`}
          >
            {rangeNotice
              ? rangeNotice
              : draftStart
              ? `Awal dipilih: ${formatIndoShortDate(
                  draftStart
                )}. Klik tanggal selesai (atau klik tanggal sama untuk 1 hari).`
              : "Klik tanggal awal lalu tanggal akhir untuk filter 1 atau beberapa hari."}
          </p>

          {/* Manual Date Inputs & Apply */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualStart && manualEnd) {
                commitAndClose(manualStart, manualEnd);
              }
            }}
            className="pt-2.5 border-t border-slate-100 space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Dari Tanggal
                </span>
                <input
                  type="date"
                  value={manualStart}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualStart(val);
                    setDraftStart(null);
                    const parsed = parseIsoToLocalDate(val);
                    if (parsed) {
                      setViewYear(parsed.getFullYear());
                      setViewMonth(parsed.getMonth());
                    }
                  }}
                  className="w-full px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </label>

              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Sampai Tanggal
                </span>
                <input
                  type="date"
                  value={manualEnd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualEnd(val);
                    setDraftStart(null);
                  }}
                  className="w-full px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  commitAndClose(
                    currentWeekRange.startDate,
                    currentWeekRange.endDate
                  )
                }
                className="text-[11px] font-bold text-[#e95623] hover:underline cursor-pointer"
              >
                Reset ke Minggu Ini
              </button>
              <button
                type="submit"
                disabled={!manualStart || !manualEnd}
                className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 cursor-pointer"
              >
                Terapkan Rentang
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/** Executive KPI section implementing the 6 Periodic Service compliance formulas below the Hero Banner. */
export const PeriodicServiceKpiSection: React.FC<
  PeriodicServiceKpiSectionProps
> = ({
  scheduleData,
  selectedSite,
  isLoadingWeekly = false,
  masterUnits = [],
  onJumpToDetail,
  onRangeChange,
  onExportPdf,
}) => {
  const todayStr = getLocalTodayIso();
  const currentWeekRange = useMemo(
    () => getLocalWeekRange(todayStr),
    [todayStr]
  );
  const [kpiRange, setKpiRange] = useState<{
    startDate: string;
    endDate: string;
  }>(() => getLocalWeekRange());

  const { startDate, endDate } = kpiRange;

  const isRangeCoveredBySchedule = useMemo(() => {
    if (!scheduleData?.weekRange) return false;
    if (scheduleData.selectedSite && scheduleData.selectedSite !== selectedSite) {
      return false;
    }
    return (
      startDate >= scheduleData.weekRange.startDate &&
      endDate <= scheduleData.weekRange.endDate
    );
  }, [scheduleData, selectedSite, startDate, endDate]);

  const activeRangeKey = `${selectedSite}|${startDate}|${endDate}`;
  const [rangeState, setRangeState] = useState<{
    key: string;
    data: WeeklyScheduleData;
  } | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [rangeErrorState, setRangeErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const isLoadingRange =
    !isRangeCoveredBySchedule && loadingKey === activeRangeKey;
  const rangeError =
    !isRangeCoveredBySchedule && rangeErrorState?.key === activeRangeKey
      ? rangeErrorState.message
      : null;

  // Fetch multi-day or out-of-week range from backend whenever active weekly data does not cover [startDate..endDate]
  useEffect(() => {
    if (isRangeCoveredBySchedule) {
      return;
    }

    // Avoid duplicate fetch on initial page mount while the initial current week is still loading
    if (
      !scheduleData &&
      isLoadingWeekly &&
      startDate === currentWeekRange.startDate &&
      endDate === currentWeekRange.endDate
    ) {
      return;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingKey(activeRangeKey);
      setRangeErrorState((prev) =>
        prev?.key === activeRangeKey ? null : prev
      );
    });

    plantService
      .getPmWeeklySchedule(undefined, selectedSite, startDate, endDate)
      .then((data) => {
        if (cancelled) return;
        setRangeState({ key: activeRangeKey, data });
        setRangeErrorState(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setRangeErrorState({
          key: activeRangeKey,
          message:
            err instanceof Error ? err.message : "Gagal memuat data KPI periode",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingKey((prev) => (prev === activeRangeKey ? null : prev));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isRangeCoveredBySchedule,
    scheduleData,
    isLoadingWeekly,
    selectedSite,
    startDate,
    endDate,
    activeRangeKey,
    currentWeekRange.startDate,
    currentWeekRange.endDate,
    reloadTick,
  ]);

  const scopedDays = useMemo(() => {
    const source = isRangeCoveredBySchedule
      ? scheduleData
      : rangeState?.key === activeRangeKey
      ? rangeState.data
      : null;
    if (!source?.days) return [];
    return source.days.filter((d) => d.date >= startDate && d.date <= endDate);
  }, [
    isRangeCoveredBySchedule,
    scheduleData,
    rangeState,
    activeRangeKey,
    startDate,
    endDate,
  ]);

  const scopedItems = useMemo(
    () => scopedDays.flatMap((d) => d.items),
    [scopedDays]
  );

  const kpi = useMemo(() => computePsKpiMetrics(scopedItems), [scopedItems]);

  useEffect(() => {
    onRangeChange?.({ startDate, endDate });
  }, [startDate, endDate, onRangeChange]);

  const handleExportKpiExcel = () => {
    const flatRows = scopedDays.flatMap((d) =>
      d.items.map((item) => ({
        ...item,
        dayName: d.dayName || getIndoDayNameClient(d.date),
        leadName: d.leadMechanic || d.leadInspector || null,
      }))
    );
    exportPmScheduleExcel({
      days: scopedDays,
      filteredRows: flatRows,
      masterUnits,
      selectedSite,
      startDate,
      endDate,
    });
  };

  const dayCount = countInclusiveDays(startDate, endDate);
  const isSingleDay = startDate === endDate;
  const isTodaySelected = isSingleDay && startDate === todayStr;
  const isCurrentWeekSelected =
    startDate === currentWeekRange.startDate &&
    endDate === currentWeekRange.endDate;

  const periodSubtitle = isSingleDay
    ? isTodaySelected
      ? `Today (${getIndoDayNameClient(startDate)}, ${formatIndoShortDate(
          startDate
        )}) • ${scopedItems.length} Unit`
      : `${getIndoDayNameClient(startDate)}, ${formatIndoShortDate(
          startDate
        )} • ${scopedItems.length} Unit`
    : `${isCurrentWeekSelected ? "Minggu Ini" : "Periode"}: ${formatIndoShortDate(
        startDate
      )} – ${formatIndoShortDate(endDate)} (${dayCount} Hari) • ${
        scopedItems.length
      } Unit`;

  const parameterCards: KpiCardDescriptor[] = [
    {
      id: "akurasi-servis",
      title: "Akurasi Servis",
      subtitle: "Kesesuaian unit yang di service",
      metric: kpi.akurasiServis,
      icon: <CheckCircle2 size={14} />,
      accentBg: "bg-orange-50",
      accentText: "text-[#e95623]",
    },
    {
      id: "achievement-servis",
      title: "Achievement Servis",
      subtitle: "Ketepatan unit yang service",
      metric: kpi.achievementServis,
      icon: <Target size={14} />,
      accentBg: "bg-blue-50",
      accentText: "text-blue-600",
    },
    {
      id: "akurasi-hm",
      title: "Akurasi HM",
      subtitle: "Toleransi ± 50 hrs",
      metric: kpi.akurasiHm,
      icon: <Wrench size={14} />,
      accentBg: "bg-emerald-50",
      accentText: "text-emerald-600",
    },
    {
      id: "akurasi-start",
      title: "Akurasi Start Time",
      subtitle: "Toleransi ± 1 jam",
      metric: kpi.akurasiStartTime,
      icon: <Clock size={14} />,
      accentBg: "bg-violet-50",
      accentText: "text-violet-600",
    },
    {
      id: "akurasi-lead",
      title: "Akurasi Lead Time",
      subtitle: "Toleransi ± 2 jam",
      metric: kpi.akurasiLeadTime,
      icon: <Timer size={14} />,
      accentBg: "bg-sky-50",
      accentText: "text-sky-600",
    },
  ];

  const complianceTone = getScoreTone(
    kpi.pmCompliance.pct,
    kpi.pmCompliance.plan > 0
  );

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200/70">
            <Gauge size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              KPI Periodic Service (PM Compliance)
            </h2>
            <p className="text-[11px] text-slate-500">{periodSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLoadingRange && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-600">
              <RefreshCw size={12} className="animate-spin text-[#e95623]" />
              <span>Memuat...</span>
            </span>
          )}

          {kpi.incompleteActualCount > 0 && (
            <button
              type="button"
              onClick={() => onJumpToDetail?.({ startDate, endDate })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
            >
              <AlertCircle size={13} className="text-amber-600" />
              <span>
                {kpi.incompleteActualCount} unit Completed belum input aktual
              </span>
            </button>
          )}

          <KpiCalendarRangePicker
            startDate={startDate}
            endDate={endDate}
            todayStr={todayStr}
            currentWeekRange={currentWeekRange}
            onApplyRange={(s, e) => setKpiRange({ startDate: s, endDate: e })}
          />

          <button
            type="button"
            onClick={handleExportKpiExcel}
            disabled={isLoadingRange || scopedDays.length === 0}
            title="Download Excel KPI Compliance & Detail Periodic Service"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            <span>Excel KPI</span>
          </button>

          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf({ startDate, endDate })}
              disabled={isLoadingRange}
              title="Export PDF Presentasi & KPI Periodic Service sesuai periode terpilih"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileText size={13} className="text-orange-400" />
              <span>PDF KPI</span>
            </button>
          )}
        </div>
      </div>

      {rangeError && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <span>{rangeError}</span>
          <button
            type="button"
            onClick={() => setReloadTick((t) => t + 1)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-rose-200 hover:bg-rose-100 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* KPI Grid: 1 Featured PM Compliance + 5 Parameter Cards */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 transition-opacity ${
          isLoadingRange ? "opacity-60" : "opacity-100"
        }`}
      >
        {/* 1. PM Compliance (Summary Total) */}
        <div className="rounded-2xl p-4 bg-slate-900 text-white border border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-300">
                PM Compliance
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-white">
                Total
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Total semua parameter
            </p>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {kpi.pmCompliance.plan > 0
                ? formatKpiPct(kpi.pmCompliance.pct)
                : "-"}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span>Plan: {kpi.pmCompliance.plan}</span>
              <span>Actual: {kpi.pmCompliance.actual}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${complianceTone.bar}`}
                style={{ width: `${Math.min(100, kpi.pmCompliance.pct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2..6 Individual Parameter Cards */}
        {parameterCards.map((card) => {
          const hasPlan = card.metric.plan > 0;
          const tone = getScoreTone(card.metric.pct, hasPlan);
          return (
            <div
              key={card.id}
              className="rounded-2xl p-3.5 bg-slate-50/70 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800 leading-tight">
                    {card.title}
                  </span>
                  <div
                    className={`p-1.5 rounded-xl shrink-0 ${card.accentBg} ${card.accentText}`}
                  >
                    {card.icon}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  {card.subtitle}
                </p>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-xl font-black font-mono ${tone.text}`}>
                    {hasPlan ? formatKpiPct(card.metric.pct) : "-"}
                  </span>
                  {card.metric.missingActualCount != null &&
                    card.metric.missingActualCount > 0 && (
                      <span
                        className="text-[9.5px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md"
                        title="Unit Completed yang belum diisi data aktual"
                      >
                        {card.metric.missingActualCount} blm isi
                      </span>
                    )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span>Plan: {card.metric.plan}</span>
                  <span>Actual: {card.metric.actual}</span>
                </div>

                <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${tone.bar}`}
                    style={{ width: `${Math.min(100, card.metric.pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
