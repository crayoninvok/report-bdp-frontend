"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PlantDashboardData, PlantPmPeriodMode } from "../services/plantService";
import { computePsKpiMetrics, formatKpiPct } from "../utils/pmHelpers";
import {
  EmptyChartState,
  PlantChartCard,
  PM_STATUS_COLORS,
  SegmentedSwitch,
} from "./plantDashboardShared";

interface PlantDashboardPmSectionProps {
  pm: PlantDashboardData["pm"];
  pmPeriod: PlantPmPeriodMode;
  pmRange: PlantDashboardData["filters"]["pmRange"];
  onChangePmPeriod: (period: PlantPmPeriodMode) => void;
}

function getComplianceBarColor(pct: number, hasPlan: boolean): string {
  if (!hasPlan) return "#cbd5e1";
  if (pct >= 90) return "#10b981";
  if (pct >= 70) return "#f59e0b";
  return "#ef4444";
}

function PmDailyTooltip({
  active,
  payload,
  label,
  title,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  title: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[190px]">
      <div className="font-bold text-slate-900 mb-1.5 border-b border-slate-100 pb-1">
        {label} — {title}
      </div>
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const val = Number(entry.value || 0);
          const isPct = entry.dataKey === "achievementPercent";
          return (
            <div key={`${entry.dataKey}-${idx}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: entry.color || "#64748b" }}
                />
                <span>{entry.name}</span>
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {isPct ? `${val.toLocaleString("id-ID")}%` : `${val} unit`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PmComplianceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      label: string;
      pct: number;
      actual: number;
      plan: number;
      missingActualCount?: number;
    };
  }>;
}) {
  if (!active || !payload || !payload[0]?.payload) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[200px]">
      <div className="font-bold text-slate-900 mb-1">{item.label}</div>
      <div className="flex items-center justify-between gap-3 text-slate-600">
        <span>Skor KPI</span>
        <span className="font-black text-slate-900">{formatKpiPct(item.pct)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-slate-600 mt-0.5">
        <span>Actual / Plan</span>
        <span className="font-bold text-slate-800 tabular-nums">
          {item.actual} / {item.plan}
        </span>
      </div>
      {item.missingActualCount != null && item.missingActualCount > 0 && (
        <div className="mt-1.5 pt-1 border-t border-slate-100 text-[11px] font-medium text-amber-700">
          {item.missingActualCount} unit selesai belum mengisi nilai aktual
        </div>
      )}
    </div>
  );
}

export const PlantDashboardPmSection: React.FC<PlantDashboardPmSectionProps> = ({
  pm,
  pmPeriod,
  pmRange,
  onChangePmPeriod,
}) => {
  const { pi, ps } = pm;

  // Reuse single-source-of-truth KPI calculation from pmHelpers.ts
  const psKpi = useMemo(() => computePsKpiMetrics(ps.kpiItems || []), [ps.kpiItems]);

  const complianceChartData = useMemo(
    () => [
      {
        key: "pmCompliance",
        label: "PM Compliance",
        pct: psKpi.pmCompliance.pct,
        actual: psKpi.pmCompliance.actual,
        plan: psKpi.pmCompliance.plan,
      },
      {
        key: "akurasiServis",
        label: "Akurasi Servis",
        pct: psKpi.akurasiServis.pct,
        actual: psKpi.akurasiServis.actual,
        plan: psKpi.akurasiServis.plan,
      },
      {
        key: "achievementServis",
        label: "Achievement Servis",
        pct: psKpi.achievementServis.pct,
        actual: psKpi.achievementServis.actual,
        plan: psKpi.achievementServis.plan,
      },
      {
        key: "akurasiHm",
        label: "Akurasi HM (±50j)",
        pct: psKpi.akurasiHm.pct,
        actual: psKpi.akurasiHm.actual,
        plan: psKpi.akurasiHm.plan,
        missingActualCount: psKpi.akurasiHm.missingActualCount,
      },
      {
        key: "akurasiStartTime",
        label: "Start Time (±1j)",
        pct: psKpi.akurasiStartTime.pct,
        actual: psKpi.akurasiStartTime.actual,
        plan: psKpi.akurasiStartTime.plan,
        missingActualCount: psKpi.akurasiStartTime.missingActualCount,
      },
      {
        key: "akurasiLeadTime",
        label: "Lead Time (±2j)",
        pct: psKpi.akurasiLeadTime.pct,
        actual: psKpi.akurasiLeadTime.actual,
        plan: psKpi.akurasiLeadTime.plan,
        missingActualCount: psKpi.akurasiLeadTime.missingActualCount,
      },
    ],
    [psKpi]
  );

  const totalPmCompleted = pi.summary.totalCompleted + ps.summary.totalCompleted;
  const totalPmPlan = pi.summary.totalPlan + ps.summary.totalPlan;
  const piCompletedShare =
    totalPmCompleted > 0 ? Math.round((pi.summary.totalCompleted / totalPmCompleted) * 100) : 0;
  const psCompletedShare = totalPmCompleted > 0 ? 100 - piCompletedShare : 0;

  return (
    <section className="space-y-5 pt-2">
      {/* Section Heading + Period Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Preventive Maintenance (Periodic Inspection &amp; Periodic Service)
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi capaian inspeksi harian (PI) serta penjadwalan &amp; PM Compliance servis
              berkala (PS) untuk periode{" "}
              <strong className="text-slate-700">{pmRange.label}</strong>.
            </p>
          </div>
        </div>

        <SegmentedSwitch
          value={pmPeriod === "custom" ? "mtd" : pmPeriod}
          options={[
            { value: "week", label: "Minggu Ini" },
            { value: "mtd", label: "Bulan Ini" },
            { value: "30d", label: "30 Hari" },
            { value: "ytd", label: "YTD" },
          ]}
          onChange={onChangePmPeriod}
        />
      </div>

      {/* Top 4 PM KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: PI Achievement */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Periodic Inspection (PI)
            </span>
            <ClipboardCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {pi.summary.achievementPercent.toLocaleString("id-ID")}%
            </span>
            <span className="text-xs font-semibold text-slate-400">Achievement</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <strong className="text-emerald-700">{pi.summary.totalCompleted} Selesai</strong> dari{" "}
            {pi.summary.totalPlan} Plan ({pi.summary.totalScheduled} terjadwal)
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Schedule Fill: {pi.summary.scheduleFillPercent}%</span>
            <span>{pi.summary.daysCount} Hari Jadwal</span>
          </div>
        </div>

        {/* Card 2: PS Achievement */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Periodic Service (PS)
            </span>
            <Wrench className="w-4 h-4 text-[#e95623]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {ps.summary.achievementPercent.toLocaleString("id-ID")}%
            </span>
            <span className="text-xs font-semibold text-slate-400">Achievement</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <strong className="text-emerald-700">{ps.summary.totalCompleted} Selesai</strong> dari{" "}
            {ps.summary.totalPlan} Plan ({ps.summary.totalScheduled} terjadwal)
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-amber-700 font-semibold">
              In Progress: {ps.summary.inProgressCount}
            </span>
            <span className="text-sky-700 font-semibold">
              Scheduled: {ps.summary.scheduledOpenCount}
            </span>
          </div>
        </div>

        {/* Card 3: PS PM Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              PM Compliance (PS)
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                psKpi.pmCompliance.plan === 0
                  ? "bg-slate-100 text-slate-500 border-slate-200"
                  : psKpi.pmCompliance.pct >= 90
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : psKpi.pmCompliance.pct >= 70
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              Target 90%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatKpiPct(psKpi.pmCompliance.pct)}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              ({psKpi.pmCompliance.actual}/{psKpi.pmCompliance.plan} poin)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Akurasi Servis {formatKpiPct(psKpi.akurasiServis.pct)} • Ach Servis{" "}
            {formatKpiPct(psKpi.achievementServis.pct)}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {psKpi.incompleteActualCount > 0 ? (
              <span className="text-amber-700 font-medium">
                {psKpi.incompleteActualCount} unit selesai menunggu input HM/Jam aktual
              </span>
            ) : (
              <span>Seluruh data aktual KPI servis sudah terisi lengkap</span>
            )}
          </div>
        </div>

        {/* Card 4: Combined PM Execution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Eksekusi PM (PI + PS)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalPmCompleted}</span>
            <span className="text-xs font-semibold text-slate-400">
              Unit Selesai / {totalPmPlan} Plan
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${piCompletedShare}%` }}
            />
            <div
              className="h-full bg-[#e95623] transition-all"
              style={{ width: `${psCompletedShare}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              PI: <strong className="text-slate-800">{pi.summary.totalCompleted}</strong> ({piCompletedShare}%)
            </span>
            <span>
              PS: <strong className="text-slate-800">{ps.summary.totalCompleted}</strong> ({psCompletedShare}%)
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Section 2A: Periodic Inspection Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* PI Daily Trend (8 cols) */}
        <PlantChartCard
          className="lg:col-span-8"
          title="Tren Harian Periodic Inspection (PI)"
          subtitle="Perbandingan Target Plan vs Unit Terjadwal vs Unit Selesai + persentase achievement harian"
          badge="PERIODIC INSPECTION"
          badgeTone="sky"
        >
          {pi.dailySeries.length === 0 ? (
            <EmptyChartState message="Belum ada jadwal Periodic Inspection pada periode ini." />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={pi.dailySeries}
                  margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10.5, fill: "#64748b", fontWeight: 600 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="units"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    domain={[0, 120]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#e95623" }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<PmDailyTooltip title="Periodic Inspection" />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="units"
                    dataKey="plan"
                    name="Plan Target"
                    fill="#cbd5e1"
                    radius={[3, 3, 0, 0]}
                    barSize={12}
                  />
                  <Bar
                    yAxisId="units"
                    dataKey="scheduled"
                    name="Terjadwal"
                    fill="#38bdf8"
                    radius={[3, 3, 0, 0]}
                    barSize={12}
                  />
                  <Bar
                    yAxisId="units"
                    dataKey="completed"
                    name="Selesai"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    barSize={12}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="achievementPercent"
                    name="% Achievement"
                    stroke="#e95623"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#e95623" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>

        {/* PI Status Donut & Shift Breakdown (4 cols) */}
        <PlantChartCard
          className="lg:col-span-4"
          title="Status & Distribusi Shift PI"
          subtitle="Proporsi status inspeksi & perbandingan eksekusi Shift 1 vs Shift 2"
          badge="STATUS PI"
          badgeTone="slate"
        >
          {pi.statusBreakdown.length === 0 ? (
            <EmptyChartState message="Belum ada item Periodic Inspection pada periode ini." />
          ) : (
            <div className="flex flex-col justify-between h-[300px]">
              <div className="relative h-[165px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pi.statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {pi.statusBreakdown.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={PM_STATUS_COLORS[entry.key] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => `${val} unit`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Terjadwal
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {pi.summary.totalScheduled}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] px-1">
                {pi.statusBreakdown.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-slate-600 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PM_STATUS_COLORS[s.key] || "#94a3b8" }}
                      />
                      {s.name}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Realisasi Per Shift
                </div>
                {pi.shiftBreakdown.map((sh) => {
                  const pct = sh.total > 0 ? Math.round((sh.completed / sh.total) * 100) : 0;
                  return (
                    <div key={sh.shift} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">{sh.shift}</span>
                        <span className="text-slate-500 tabular-nums">
                          <strong className="text-slate-900">{sh.completed}</strong>/{sh.total} unit ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </PlantChartCard>
      </div>

      {/* Sub-Section 2B: Periodic Service Daily Trend & KPI Compliance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* PS Daily Trend (7 cols) */}
        <PlantChartCard
          className="lg:col-span-7"
          title="Tren Harian Periodic Service (PS)"
          subtitle="Target Plan vs Unit Terjadwal vs Servis Selesai & % Achievement"
          badge="PERIODIC SERVICE"
          badgeTone="orange"
        >
          {ps.dailySeries.length === 0 ? (
            <EmptyChartState message="Belum ada jadwal Periodic Service pada periode ini." />
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={ps.dailySeries}
                  margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="units"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    domain={[0, 120]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#e95623" }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<PmDailyTooltip title="Periodic Service" />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="units"
                    dataKey="plan"
                    name="Plan Target"
                    fill="#cbd5e1"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    yAxisId="units"
                    dataKey="scheduled"
                    name="Terjadwal"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    yAxisId="units"
                    dataKey="completed"
                    name="Selesai"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="achievementPercent"
                    name="% Achievement"
                    stroke="#e95623"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#e95623" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>

        {/* PS KPI Compliance Horizontal BarChart (5 cols) */}
        <PlantChartCard
          className="lg:col-span-5"
          title="Grafik KPI PM Compliance (Periodic Service)"
          subtitle="Skor 6 parameter ketepatan servis berkala dengan target benchmark 90%"
          badge="KPI 6 PARAMETER"
          badgeTone="emerald"
        >
          {ps.kpiItems.length === 0 ? (
            <EmptyChartState message="Belum ada item Periodic Service untuk menghitung KPI Compliance." />
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={complianceChartData}
                  margin={{ top: 8, right: 26, left: 6, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10.5, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<PmComplianceTooltip />} />
                  <ReferenceLine
                    x={90}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    label={{
                      value: "Target 90%",
                      position: "top",
                      fill: "#059669",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                  <Bar dataKey="pct" radius={[0, 5, 5, 0]} barSize={20}>
                    {complianceChartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={getComplianceBarColor(entry.pct, entry.plan > 0)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>
      </div>

      {/* Sub-Section 2C: Interval Breakdown + PS Status/Asset Class */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interval Breakdown Bar (7 cols) */}
        <PlantChartCard
          className="lg:col-span-7"
          title="Sebaran Interval Periodic Service (PS1–PS4 KM & P1–P4 HM)"
          subtitle="Komposisi workload jadwal servis berkala berdasarkan tier KM / HM dan status pengerjaan"
          badge="INTERVAL KM / HM"
          badgeTone="violet"
        >
          {ps.intervalBreakdown.length === 0 ? (
            <EmptyChartState
              heightClass="h-56"
              message="Belum ada jadwal interval Periodic Service pada periode ini."
            />
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={ps.intervalBreakdown}
                  margin={{ top: 10, right: 12, left: -14, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="interval"
                    tick={{ fontSize: 10.5, fill: "#64748b", fontWeight: 600 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(val) => `${val} unit`} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                  <Bar
                    dataKey="Completed"
                    stackId="int"
                    fill={PM_STATUS_COLORS.Completed}
                    barSize={32}
                  />
                  <Bar
                    dataKey="In Progress"
                    stackId="int"
                    fill={PM_STATUS_COLORS["In Progress"]}
                    barSize={32}
                  />
                  <Bar
                    dataKey="Scheduled"
                    stackId="int"
                    fill={PM_STATUS_COLORS.Scheduled}
                    barSize={32}
                  />
                  <Bar
                    dataKey="Pending"
                    stackId="int"
                    fill={PM_STATUS_COLORS.Pending}
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>

        {/* PS Status Donut + Asset & Shift Breakdown (5 cols) */}
        <PlantChartCard
          className="lg:col-span-5"
          title="Status, Kategori Unit & Shift PS"
          subtitle="Distribusi status pengerjaan serta proporsi Prime Mover, Dolly, dan Vessel"
          badge="RINGKASAN PS"
          badgeTone="orange"
        >
          {ps.statusBreakdown.length === 0 ? (
            <EmptyChartState
              heightClass="h-56"
              message="Belum ada data status Periodic Service pada periode ini."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-full min-h-[260px]">
              {/* Left: Donut */}
              <div className="flex flex-col items-center">
                <div className="relative h-[165px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={ps.statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={66}
                        paddingAngle={2}
                      >
                        {ps.statusBreakdown.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={PM_STATUS_COLORS[entry.key] || "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `${val} unit`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Total PS
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {ps.summary.totalScheduled}
                    </span>
                  </div>
                </div>
                <div className="w-full space-y-1 mt-1 px-2">
                  {ps.statusBreakdown.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PM_STATUS_COLORS[s.key] || "#94a3b8" }}
                        />
                        {s.name}
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Asset Breakdown + Shift */}
              <div className="space-y-4 sm:border-l sm:border-slate-100 sm:pl-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kategori Aset PS
                  </div>
                  {ps.assetBreakdown.map((asset) => {
                    const maxTotal = Math.max(
                      1,
                      ...ps.assetBreakdown.map((a) => a.total)
                    );
                    const widthPct = Math.round((asset.total / maxTotal) * 100);
                    return (
                      <div key={asset.assetCategory} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">
                            {asset.assetCategory}
                          </span>
                          <span className="text-slate-500 tabular-nums">
                            <strong className="text-slate-900">{asset.total}</strong> ({asset.completed} selesai)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#e95623]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Realisasi Per Shift
                  </div>
                  {ps.shiftBreakdown.map((sh) => {
                    const pct = sh.total > 0 ? Math.round((sh.completed / sh.total) * 100) : 0;
                    return (
                      <div key={sh.shift} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">{sh.shift}</span>
                          <span className="text-slate-500 tabular-nums">
                            <strong className="text-slate-900">{sh.completed}</strong>/{sh.total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </PlantChartCard>
      </div>
    </section>
  );
};

