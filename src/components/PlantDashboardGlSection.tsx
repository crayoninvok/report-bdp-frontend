"use client";

import React, { useMemo, useState } from "react";
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarRange,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { PlantDashboardData } from "../services/plantService";
import {
  EmptyChartState,
  formatIdrAxis,
  formatIdrCompact,
  formatIdrExact,
  PLANT_CATEGORY_COLORS,
  PlantChartCard,
  SegmentedSwitch,
  stripBebanPrefix,
} from "./plantDashboardShared";

interface PlantDashboardGlSectionProps {
  data: PlantDashboardData;
}

type PeriodMode = "YTD" | "MTD";

function GlTooltipCard({
  active,
  payload,
  label,
  titleSuffix,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
    payload?: Record<string, any>;
  }>;
  label?: string;
  titleSuffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rowPayload = payload[0]?.payload || {};

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[210px] max-w-[300px]">
      <div className="font-bold text-slate-900 mb-1.5 border-b border-slate-100 pb-1">
        {label}
        {titleSuffix ? ` (${titleSuffix})` : ""}
      </div>
      {rowPayload.periodName && (
        <div className="text-[10px] font-medium text-slate-400 mb-1.5">
          {rowPayload.periodName}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const val = Number(entry.value || 0);
          const isPercent =
            entry.dataKey === "achPercent" || String(entry.name || "").includes("%");
          return (
            <div key={`${entry.dataKey}-${idx}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-600 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: entry.color || "#64748b" }}
                />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="font-bold text-slate-900 tabular-nums shrink-0">
                {isPercent ? `${val.toLocaleString("id-ID")}%` : formatIdrExact(val)}
              </span>
            </div>
          );
        })}
      </div>
      {typeof rowPayload.total === "number" && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between font-bold text-slate-900">
          <span>Total</span>
          <span>{formatIdrExact(rowPayload.total)}</span>
        </div>
      )}
      {typeof rowPayload.cumulativeTotal === "number" && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-orange-600 mt-0.5">
          <span>Akumulasi MTD</span>
          <span>{formatIdrCompact(rowPayload.cumulativeTotal)}</span>
        </div>
      )}
      {typeof rowPayload.txCount === "number" && rowPayload.txCount > 0 && (
        <div className="text-[10px] text-slate-400 mt-1">
          {rowPayload.txCount.toLocaleString("id-ID")} transaksi GL
        </div>
      )}
    </div>
  );
}

export const PlantDashboardGlSection: React.FC<PlantDashboardGlSectionProps> = ({ data }) => {
  const [pieMode, setPieMode] = useState<PeriodMode>("YTD");
  const [ccMode, setCcMode] = useState<PeriodMode>("YTD");

  const { glCost, fleet } = data;
  const { ytd, mtd, plReference } = glCost;

  const uploadedMonthsOnly = useMemo(
    () => glCost.monthlyGlTrend.filter((m) => m.hasData),
    [glCost.monthlyGlTrend]
  );

  // Site distribution percentage for YTD card visual bar
  const ytdSiteDenominator = ytd.mphCost + ytd.snyCost + ytd.hofCost;
  const ytdMphShare =
    ytdSiteDenominator > 0 ? Math.round((ytd.mphCost / ytdSiteDenominator) * 1000) / 10 : 0;
  const ytdSnyShare =
    ytdSiteDenominator > 0 ? Math.round((ytd.snyCost / ytdSiteDenominator) * 1000) / 10 : 0;

  // Category Donut data (switchable YTD / MTD)
  const pieSeries = useMemo(() => {
    return glCost.categoryBreakdown
      .map((item) => ({
        name: item.categoryLabel,
        categoryKey: item.categoryKey,
        value: pieMode === "YTD" ? item.ytdTotal : item.mtdTotal,
        share: pieMode === "YTD" ? item.ytdSharePercent : item.mtdSharePercent,
        color:
          PLANT_CATEGORY_COLORS[item.categoryKey as keyof typeof PLANT_CATEGORY_COLORS] ||
          "#64748b",
      }))
      .filter((x) => x.value > 0);
  }, [glCost.categoryBreakdown, pieMode]);

  const pieTotal = useMemo(() => pieSeries.reduce((s, x) => s + x.value, 0), [pieSeries]);

  // Account ranking data for horizontal bar chart
  const accountChartData = useMemo(() => {
    return glCost.accountBreakdown.slice(0, 10).map((acc) => ({
      shortName: stripBebanPrefix(acc.accountName),
      fullName: `${acc.accountCode} - ${acc.accountName}`,
      ytdTotal: acc.ytdTotal,
      mtdTotal: acc.mtdTotal,
      txCount: acc.txCountYtd,
    }));
  }, [glCost.accountBreakdown]);

  // Top 10 Cost Center / Unit data (switchable YTD / MTD)
  const costCenterChartData = useMemo(() => {
    const rawList = ccMode === "YTD" ? glCost.topCostCentersYtd : glCost.topCostCentersMtd;
    return [...rawList].reverse();
  }, [glCost.topCostCentersYtd, glCost.topCostCentersMtd, ccMode]);

  const plOverBudget = plReference.totals.ytdVariance < 0;

  const deltaPercent = mtd.dailyRunRateDeltaPercent;
  const deltaIsUp = deltaPercent !== null && deltaPercent > 0;
  const deltaIsDown = deltaPercent !== null && deltaPercent < 0;

  return (
    <section className="space-y-5">
      {/* Section Heading */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#e95623] flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Highlight Biaya GL Departemen Plant (YTD & MTD)
            </h2>
            <p className="text-xs text-slate-500">
              Sumber transaksi General Ledger akun Plant (Repairs & Maintenance, Tyre, Oli & Grease —
              tanpa BBM Produksi) serta referensi P&L Budget vs Aktual YTD.
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: YTD GL Cost */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Cost GL YTD ({data.filters.year})
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
              {ytd.uploadedMonthsCount} Bln GL ({ytd.uploadedMonthsLabel || "-"})
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">
            {formatIdrCompact(ytd.totalCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {ytd.transactionCount.toLocaleString("id-ID")} transaksi GL terakumulasi
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
            <span className="text-slate-600">
              R&amp;M:{" "}
              <strong className="text-slate-900">{formatIdrCompact(ytd.rmCost)}</strong>
            </span>
            <span className="text-slate-600">
              Tyre/Oli:{" "}
              <strong className="text-slate-900">
                {formatIdrCompact(ytd.tyreOliGreaseCost)}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 2: MTD GL Cost */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Cost GL MTD
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {mtd.hasData ? `${mtd.daysElapsed} Hari Data` : "No Data"}
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">
            {formatIdrCompact(mtd.totalCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate" title={mtd.periodName}>
            {mtd.periodName}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-600">
              Avg/Hari:{" "}
              <strong className="text-slate-900">{formatIdrCompact(mtd.avgDailyCost)}</strong>
            </span>
            {deltaPercent !== null && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold ${
                  deltaIsDown
                    ? "bg-emerald-50 text-emerald-700"
                    : deltaIsUp
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                }`}
                title="Perbandingan rata-rata biaya harian MTD terhadap periode bulan GL sebelumnya"
              >
                {deltaIsDown ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <ArrowUpRight className="w-3 h-3" />
                )}
                {deltaPercent > 0 ? `+${deltaPercent}%` : `${deltaPercent}%`} /hari
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Site Split YTD (MPH vs SNY) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Distribusi Cost per Site (YTD GL)
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-500">Muara Pahu</div>
              <div className="text-lg font-extrabold text-slate-900">
                {formatIdrCompact(ytd.mphCost)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500">Senyiur</div>
              <div className="text-lg font-extrabold text-slate-900">
                {formatIdrCompact(ytd.snyCost)}
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="h-full bg-[#e95623] transition-all"
              style={{ width: `${ytdMphShare}%` }}
            />
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${ytdSnyShare}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              MPH {ytdMphShare}% • SNY {ytdSnyShare}%
            </span>
            <span>{fleet.primeMoverPopulation} Prime Mover</span>
          </div>
        </div>

        {/* Card 4: Referensi P&L YTD Budget vs Realisasi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              P&amp;L Plant YTD (Jan–{data.filters.availableMonths.find((m) => m.month === data.filters.month)?.label.split(" ")[0] || "Nov"})
            </span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">
            {formatIdrCompact(plReference.totals.ytdRealisasi)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Budget YTD: <strong className="text-slate-700">{formatIdrCompact(plReference.totals.ytdBudget)}</strong>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-600">
              Serapan:{" "}
              <strong className="text-slate-900">
                {plReference.totals.ytdAchPercent.toLocaleString("id-ID")}%
              </strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold ${
                plOverBudget
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {plOverBudget ? "Over " : "Under "}
              {formatIdrCompact(Math.abs(plReference.totals.ytdVariance))}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1 Charts: MTD Daily Trend + PL YTD Budget vs Actual Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily MTD Spend Chart (6 cols) */}
        <PlantChartCard
          className="lg:col-span-6"
          title="Tren Harian Biaya GL Plant (MTD)"
          subtitle={`${mtd.periodName} — Komposisi harian per kategori biaya + garis akumulasi MTD`}
          badge="MTD GL"
          badgeTone="sky"
          rightSlot={
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <CalendarRange className="w-3.5 h-3.5 text-sky-600" />
              {mtd.daysElapsed} Hari
            </span>
          }
        >
          {glCost.dailyMtdTrend.length === 0 ? (
            <EmptyChartState message="Belum ada transaksi GL Plant pada bulan MTD yang dipilih." />
          ) : (
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={glCost.dailyMtdTrend}
                  margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="daily"
                    tickFormatter={formatIdrAxis}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <YAxis
                    yAxisId="cum"
                    orientation="right"
                    tickFormatter={formatIdrAxis}
                    tick={{ fontSize: 11, fill: "#e95623" }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip content={<GlTooltipCard titleSuffix="MTD Harian" />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="daily"
                    dataKey="tyre"
                    stackId="mtd"
                    name="Tyre & Rim"
                    fill={PLANT_CATEGORY_COLORS.TYRE}
                    barSize={26}
                  />
                  <Bar
                    yAxisId="daily"
                    dataKey="sparepart"
                    stackId="mtd"
                    name="Sparepart"
                    fill={PLANT_CATEGORY_COLORS.SPAREPART}
                    barSize={26}
                  />
                  <Bar
                    yAxisId="daily"
                    dataKey="oliGrease"
                    stackId="mtd"
                    name="Oli & Grease"
                    fill={PLANT_CATEGORY_COLORS.OLI_GREASE}
                    barSize={26}
                  />
                  <Bar
                    yAxisId="daily"
                    dataKey="consumableTools"
                    stackId="mtd"
                    name="Consumable & Tools"
                    fill={PLANT_CATEGORY_COLORS.CONSUMABLE_TOOLS}
                    barSize={26}
                  />
                  <Bar
                    yAxisId="daily"
                    dataKey="jasaUndercarriage"
                    stackId="mtd"
                    name="Jasa & U/C"
                    fill={PLANT_CATEGORY_COLORS.JASA_UNDERCARRIAGE}
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                  <Line
                    yAxisId="cum"
                    type="monotone"
                    dataKey="cumulativeTotal"
                    name="Akumulasi MTD"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#0f172a" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>

        {/* PL Summary Jan-Nov Budget vs Realisasi Reference (6 cols) */}
        <PlantChartCard
          className="lg:col-span-6"
          title={`Tren Bulanan Biaya Plant YTD ${data.filters.year} (Budget vs Aktual P&L)`}
          subtitle="Referensi P&L Operasional Jan–Nov: Beban Tyre, Repairs & Maintenance, Sparepart & Tools"
          badge="YTD P&L REF"
          badgeTone="violet"
        >
          {plReference.monthlyTrend.length === 0 ? (
            <EmptyChartState message="Belum ada data referensi P&L biaya Plant untuk filter ini." />
          ) : (
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={plReference.monthlyTrend}
                  margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="cost"
                    tickFormatter={formatIdrAxis}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "#8b5cf6" }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip content={<GlTooltipCard titleSuffix="P&L Plant" />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="cost"
                    dataKey="budget"
                    name="Budget Plant"
                    fill="#cbd5e1"
                    radius={[4, 4, 0, 0]}
                    barSize={14}
                  />
                  <Bar
                    yAxisId="cost"
                    dataKey="realisasi"
                    name="Aktual Realisasi"
                    fill="#e95623"
                    radius={[4, 4, 0, 0]}
                    barSize={14}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="achPercent"
                    name="% Realisasi"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#7c3aed" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>
      </div>

      {/* Row 2 Charts: Uploaded GL Monthly Comparison + Category Donut + Account Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Uploaded GL Monthly Comparison (4 cols) */}
        <PlantChartCard
          className="lg:col-span-4"
          title="Akumulasi GL Terupload (Per Bulan)"
          subtitle={`Otomatis bertambah setiap periode GL baru diupload (${ytd.uploadedMonthsLabel || "-"})`}
          badge="GL YTD"
          badgeTone="orange"
        >
          {uploadedMonthsOnly.length === 0 ? (
            <EmptyChartState message="Belum ada transaksi GL terupload." />
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={uploadedMonthsOnly}
                  margin={{ top: 10, right: 10, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatIdrAxis}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<GlTooltipCard titleSuffix="GL Bulanan" />} />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }} />
                  <Bar
                    dataKey="tyre"
                    stackId="gl"
                    name="Tyre & Rim"
                    fill={PLANT_CATEGORY_COLORS.TYRE}
                    barSize={42}
                  />
                  <Bar
                    dataKey="sparepart"
                    stackId="gl"
                    name="Sparepart"
                    fill={PLANT_CATEGORY_COLORS.SPAREPART}
                    barSize={42}
                  />
                  <Bar
                    dataKey="oliGrease"
                    stackId="gl"
                    name="Oli & Grease"
                    fill={PLANT_CATEGORY_COLORS.OLI_GREASE}
                    barSize={42}
                  />
                  <Bar
                    dataKey="consumableTools"
                    stackId="gl"
                    name="Consumable"
                    fill={PLANT_CATEGORY_COLORS.CONSUMABLE_TOOLS}
                    barSize={42}
                  />
                  <Bar
                    dataKey="jasaUndercarriage"
                    stackId="gl"
                    name="Jasa & U/C"
                    fill={PLANT_CATEGORY_COLORS.JASA_UNDERCARRIAGE}
                    radius={[5, 5, 0, 0]}
                    barSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>

        {/* Category Composition Donut Switchable YTD / MTD (4 cols) */}
        <PlantChartCard
          className="lg:col-span-4"
          title="Komposisi Kategori Biaya GL Plant"
          subtitle={`Proporsi kontribusi biaya ${pieMode === "YTD" ? "akumulasi YTD" : "bulan MTD"}`}
          badge={pieMode}
          badgeTone={pieMode === "YTD" ? "orange" : "sky"}
          rightSlot={
            <SegmentedSwitch
              value={pieMode}
              options={[
                { value: "YTD", label: "YTD" },
                { value: "MTD", label: "MTD" },
              ]}
              onChange={setPieMode}
            />
          }
        >
          {pieSeries.length === 0 ? (
            <EmptyChartState message={`Belum ada komposisi kategori pada ${pieMode}.`} />
          ) : (
            <div className="flex flex-col h-[290px]">
              <div className="relative h-[185px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieSeries}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {pieSeries.map((entry) => (
                        <Cell key={entry.categoryKey} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatIdrExact(Number(value || 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {pieMode} Total
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {formatIdrCompact(pieTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-1 space-y-1.5 overflow-y-auto pr-1">
                {pieSeries.map((item) => (
                  <div
                    key={item.categoryKey}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="flex items-center gap-2 text-slate-700 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium">{item.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-900 font-bold">
                      {item.share}%{" "}
                      <span className="text-slate-400 font-medium">
                        ({formatIdrCompact(item.value)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PlantChartCard>

        {/* Account Breakdown Horizontal Bar YTD vs MTD (4 cols) */}
        <PlantChartCard
          className="lg:col-span-4"
          title="Rincian Akun Biaya GL Plant"
          subtitle="Perbandingan YTD GL terupload vs MTD per kode beban"
          badge="YTD vs MTD"
          badgeTone="slate"
        >
          {accountChartData.length === 0 ? (
            <EmptyChartState message="Belum ada transaksi akun GL Plant." />
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={accountChartData}
                  margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={formatIdrAxis}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={118}
                    tick={{ fontSize: 10, fill: "#334155", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatIdrExact(Number(value || 0))}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName || ""
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }} />
                  <Bar
                    dataKey="ytdTotal"
                    name="YTD GL"
                    fill="#e95623"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                  <Bar
                    dataKey="mtdTotal"
                    name="MTD GL"
                    fill="#0284c7"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PlantChartCard>
      </div>

      {/* Row 3 Full-Width Chart: Top 10 Cost Center / Unit Consumption (Switchable YTD / MTD) */}
      <PlantChartCard
        title="Top 10 Unit / Cost Center Konsumsi Biaya Plant (GL)"
        subtitle={`Ranking serapan biaya Tyre, Sparepart/R&M, dan Oli/Grease per unit/cost center (${
          ccMode === "YTD" ? "Akumulasi YTD GL" : mtd.periodName
        })`}
        badge={`TOP 10 ${ccMode}`}
        badgeTone="emerald"
        rightSlot={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Non-Fuel Plant GL
            </span>
            <SegmentedSwitch
              value={ccMode}
              options={[
                { value: "YTD", label: "YTD" },
                { value: "MTD", label: "MTD" },
              ]}
              onChange={setCcMode}
            />
          </div>
        }
      >
        {costCenterChartData.length === 0 ? (
          <EmptyChartState
            heightClass="h-56"
            message={`Belum ada data Cost Center Plant untuk periode ${ccMode}.`}
          />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                layout="vertical"
                data={costCenterChartData}
                margin={{ top: 6, right: 24, left: 6, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatIdrAxis}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="costCenter"
                  width={84}
                  tick={{ fontSize: 11, fill: "#0f172a", fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GlTooltipCard titleSuffix={`${ccMode} GL`} />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar
                  dataKey="tyre"
                  stackId="cc"
                  name="Tyre & Rim"
                  fill={PLANT_CATEGORY_COLORS.TYRE}
                  barSize={18}
                />
                <Bar
                  dataKey="sparepartRm"
                  stackId="cc"
                  name="Sparepart & R&M"
                  fill={PLANT_CATEGORY_COLORS.SPAREPART}
                  barSize={18}
                />
                <Bar
                  dataKey="oliGrease"
                  stackId="cc"
                  name="Oli & Grease"
                  fill={PLANT_CATEGORY_COLORS.OLI_GREASE}
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PlantChartCard>
    </section>
  );
};
