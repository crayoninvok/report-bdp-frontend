"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  Target,
  Timer,
  Wrench,
} from "lucide-react";
import { WeeklyScheduleData } from "../services/plantService";
import {
  computePsKpiMetrics,
  formatKpiPct,
  KpiMetricEntry,
} from "../utils/pmHelpers";

interface PeriodicServiceKpiSectionProps {
  scheduleData: WeeklyScheduleData | null;
  onJumpToDetail?: () => void;
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

/** Executive KPI section implementing the 6 Periodic Service compliance formulas below the Hero Banner. */
export const PeriodicServiceKpiSection: React.FC<
  PeriodicServiceKpiSectionProps
> = ({ scheduleData, onJumpToDetail }) => {
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [showFormulaNote, setShowFormulaNote] = useState<boolean>(false);

  const days = useMemo(() => scheduleData?.days || [], [scheduleData]);
  const activeDayFilter = useMemo(() => {
    if (selectedDate === "ALL") return "ALL";
    return days.some((d) => d.date === selectedDate) ? selectedDate : "ALL";
  }, [days, selectedDate]);

  const scopedItems = useMemo(() => {
    if (activeDayFilter === "ALL") {
      return days.flatMap((d) => d.items);
    }
    return days.find((d) => d.date === activeDayFilter)?.items || [];
  }, [days, activeDayFilter]);

  const kpi = useMemo(() => computePsKpiMetrics(scopedItems), [scopedItems]);

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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                KPI Periodic Service (PM Compliance)
              </h2>
              <button
                type="button"
                onClick={() => setShowFormulaNote((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Lihat rincian formula perhitungan KPI"
              >
                <Info size={11} />
                <span>Formula</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {activeDayFilter === "ALL"
                ? `Periode Minggu: ${scheduleData?.weekRange.formatted || "-"}`
                : `Tanggal: ${
                    days.find((d) => d.date === activeDayFilter)?.dayName || ""
                  }, ${
                    days.find((d) => d.date === activeDayFilter)
                      ?.dayDateFormatted || activeDayFilter
                  }`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kpi.incompleteActualCount > 0 && (
            <button
              type="button"
              onClick={onJumpToDetail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
            >
              <AlertCircle size={13} className="text-amber-600" />
              <span>
                {kpi.incompleteActualCount} unit Completed belum input aktual
              </span>
            </button>
          )}

          <select
            value={activeDayFilter}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 cursor-pointer"
          >
            <option value="ALL">Minggu Ini (Semua Hari)</option>
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {d.dayName} ({d.dayDateFormatted}) • {d.items.length} Unit
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expandable Formula Legend */}
      {showFormulaNote && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div>
            <strong className="text-slate-800">PM Compliance:</strong> (Total
            Actual semua 5 parameter ÷ Total Plan semua 5 parameter) × 100%
          </div>
          <div>
            <strong className="text-slate-800">Akurasi Servis:</strong> Unit
            terencana selesai ÷ Total unit selesai aktual
          </div>
          <div>
            <strong className="text-slate-800">Achievement Servis:</strong> Unit
            terencana selesai ÷ Total unit terencana di jadwal
          </div>
          <div>
            <strong className="text-slate-800">Akurasi HM:</strong> Selisih
            |Actual HM − Plan HM| ≤ 50 jam
          </div>
          <div>
            <strong className="text-slate-800">Akurasi Start Time:</strong>{" "}
            Selisih |Actual Start − Plan Start| ≤ 1 jam
          </div>
          <div>
            <strong className="text-slate-800">Akurasi Lead Time:</strong>{" "}
            Selisih |Actual Lead Time − Plan Lead Time| ≤ 2 jam
          </div>
        </div>
      )}

      {/* KPI Grid: 1 Featured PM Compliance + 5 Parameter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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

