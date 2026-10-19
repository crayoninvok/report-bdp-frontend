"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
  Area,
} from "recharts";
import { User, JobSite } from "../types/auth";
import { DailyProduction, ProductionStats, WeeklyKpiSummary } from "../types/production";
import { productionService, DEFAULT_PRODUCTION_TARGETS } from "../services/productionService";
import { calculateLinearTrend, TrendResult } from "../utils/trendCalculator";
import { useNotification } from "../context/NotificationContext";
import {
  Truck,
  Gauge,
  Clock,
  Fuel,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowRight,
  Calculator,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  BarChart3,
  Sparkles,
  CalendarDays,
  Printer,
  ChevronRight,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { UACalculatorModal } from "./UACalculatorModal";

interface CoalProductionDashboardViewProps {
  user: User;
  onNavigateToInput?: () => void;
  onNavigateToReports?: () => void;
}

export const CoalProductionDashboardView: React.FC<CoalProductionDashboardViewProps> = ({
  user,
  onNavigateToInput,
  onNavigateToReports,
}) => {
  const { showSuccess, showError } = useNotification();

  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyProduction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedSite, setSelectedSite] = useState<JobSite | "all">(
    user.jobSite === "HeadOffice" ? "all" : user.jobSite
  );

  // Period view switch: "weekly" (default) or "monthly"
  const [periodView, setPeriodView] = useState<"weekly" | "monthly">("weekly");
  // Dynamic scale dropdown states for ongoing week-by-week and month-by-month data
  const [weeklyScale, setWeeklyScale] = useState<string>("active");
  const [monthlyScale, setMonthlyScale] = useState<string>("all");
  const [isUaCalcOpen, setIsUaCalcOpen] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, dailyRes] = await Promise.all([
        productionService.getProductionStats({ site: selectedSite }),
        productionService.getDailyProductions({ site: selectedSite }),
      ]);
      setStats(statsData);
      setDailyRecords(dailyRes.data || []);
    } catch (e: any) {
      console.error("Failed to load production data for dashboard:", e);
      showError(e.message || "Gagal memuat data dashboard produksi");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Discover weeks containing recorded production data dynamically
  const { minWeek, maxWeek, weeksWithDataList } = useMemo(() => {
    if (!stats?.weeklyKpis) return { minWeek: "W30", maxWeek: "W41", weeksWithDataList: [] };
    const withData = stats.weeklyKpis.filter(
      (w) => (w.productionActual && w.productionActual > 0) || (w.daysCount && w.daysCount > 0)
    );
    if (withData.length === 0) return { minWeek: "W30", maxWeek: "W41", weeksWithDataList: [] };
    const min = withData[0].weekNumber;
    const max = withData[withData.length - 1].weekNumber;
    return { minWeek: min, maxWeek: max, weeksWithDataList: withData };
  }, [stats]);

  // Group weeks dynamically by month for week-by-week dropdown options
  const monthWeekOptions = useMemo(() => {
    const monthMap = new Map<string, { label: string; weeks: Set<string> }>();
    const monthNames: Record<string, string> = {
      "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
      "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
      "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
    };

    dailyRecords.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        const ym = r.date.substring(0, 7);
        const mKey = r.date.substring(5, 7);
        const year = r.date.substring(0, 4);
        if (!monthMap.has(ym)) {
          const mName = monthNames[mKey] || mKey;
          monthMap.set(ym, { label: `${mName} ${year}`, weeks: new Set() });
        }
        if (r.weekNumber) {
          monthMap.get(ym)!.weeks.add(r.weekNumber);
        }
      }
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, info]) => {
        const sortedWeeks = Array.from(info.weeks).sort();
        const range = sortedWeeks.length > 0
          ? `(${sortedWeeks[0]}–${sortedWeeks[sortedWeeks.length - 1]})`
          : "";
        return {
          value: `month-${key}`,
          monthKey: key,
          weeks: sortedWeeks,
          label: `${info.label} ${range}`.trim(),
        };
      });
  }, [dailyRecords]);

  // Dynamic selected weeks depending on weeklyScale dropdown
  const currentWeeks = useMemo(() => {
    if (!stats) return [];
    if (weeklyScale === "full" && stats.allWeeksKpis && stats.allWeeksKpis.length > 0) {
      return stats.allWeeksKpis;
    }
    if (weeklyScale === "withData" && weeksWithDataList.length > 0) {
      return weeksWithDataList;
    }
    if (weeklyScale.startsWith("month-")) {
      const targetOpt = monthWeekOptions.find((opt) => opt.value === weeklyScale);
      if (targetOpt && targetOpt.weeks.length > 0) {
        const weekSet = new Set(targetOpt.weeks);
        const source = stats.allWeeksKpis || stats.weeklyKpis;
        const filtered = source.filter((w) => weekSet.has(w.weekNumber));
        if (filtered.length > 0) return filtered;
      }
    }
    return stats.weeklyKpis;
  }, [stats, weeklyScale, weeksWithDataList, monthWeekOptions]);

  // Human-friendly label for current weekly scale
  const weeklyScaleLabel = useMemo(() => {
    if (weeklyScale === "full") return "W01–W53 (Skala Penuh)";
    if (weeklyScale === "withData") return `${minWeek}–${maxWeek} (Terdata)`;
    if (weeklyScale.startsWith("month-")) {
      const found = monthWeekOptions.find((opt) => opt.value === weeklyScale);
      return found?.label || weeklyScale;
    }
    return "W30–W53 (Periode Berjalan)";
  }, [weeklyScale, minWeek, maxWeek, monthWeekOptions]);

  // Derived viewMode for label density on charts
  const viewMode = weeklyScale === "full" ? "full" : "active";

  // Linear Trendline Calculations for Weekly KPI Metrics
  const weeklyTrends = useMemo(() => {
    if (!currentWeeks || currentWeeks.length === 0) return null;

    const prodTrend = calculateLinearTrend(
      currentWeeks.map((w) => w.productionActual || 0),
      { unit: "Ton" }
    );
    const payloadTrend = calculateLinearTrend(
      currentWeeks.map((w) => (w.payloadActual !== null ? Number(w.payloadActual.toFixed(1)) : 0)),
      { unit: "Ton" }
    );
    const cycleTimeTrend = calculateLinearTrend(
      currentWeeks.map((w) => (w.cycleTimeActual !== null ? Number(w.cycleTimeActual.toFixed(2)) : 0)),
      { unit: "Jam", subNote: "Efisien" }
    );
    const paTrend = calculateLinearTrend(
      currentWeeks.map((w) => (w.paActual !== null ? Number((w.paActual * 100).toFixed(1)) : 0)),
      { unit: "%" }
    );
    const uaTrend = calculateLinearTrend(
      currentWeeks.map((w) => (w.uaActual !== null ? Number((w.uaActual * 100).toFixed(1)) : 0)),
      { unit: "%" }
    );
    const fuelRatioTrend = calculateLinearTrend(
      currentWeeks.map((w) => (w.fuelRatioActual !== null ? Number(w.fuelRatioActual.toFixed(2)) : 0)),
      { unit: "L/T", subNote: "Hemat" }
    );
    const tdpTrend = calculateLinearTrend(
      currentWeeks.map((w) => (w.tdpActual !== null ? Number(w.tdpActual.toFixed(2)) : 0)),
      { unit: "Trip" }
    );

    return {
      prodTrend,
      payloadTrend,
      cycleTimeTrend,
      paTrend,
      uaTrend,
      fuelRatioTrend,
      tdpTrend,
    };
  }, [currentWeeks]);

  // Prepared Weekly Chart data depending on viewMode with trendline values
  const weeklyChartData = useMemo(() => {
    if (!stats || !weeklyTrends) return [];

    return currentWeeks.map((w, idx) => ({
      week: w.weekNumber,
      paActual: w.paActual !== null ? Number((w.paActual * 100).toFixed(1)) : 0,
      paPlan: 93.0,
      paTrend: weeklyTrends.paTrend.trendValues[idx],
      uaActual: w.uaActual !== null ? Number((w.uaActual * 100).toFixed(1)) : 0,
      uaPlan: 88.0,
      uaTrend: weeklyTrends.uaTrend.trendValues[idx],
      payloadActual: w.payloadActual !== null ? Number(w.payloadActual.toFixed(1)) : 0,
      payloadPlan: 205.0,
      payloadTrend: weeklyTrends.payloadTrend.trendValues[idx],
      cycleTimeActual: w.cycleTimeActual !== null ? Number(w.cycleTimeActual.toFixed(2)) : 0,
      cycleTimePlan: 7.5,
      cycleTimeTrend: weeklyTrends.cycleTimeTrend.trendValues[idx],
      fuelRatioActual: w.fuelRatioActual !== null ? Number(w.fuelRatioActual.toFixed(2)) : 0,
      fuelRatioPlan: 1.55,
      fuelRatioTrend: weeklyTrends.fuelRatioTrend.trendValues[idx],
      tdpActual: w.tdpActual !== null ? Number(w.tdpActual.toFixed(2)) : 0,
      tdpPlan: 2.7,
      tdpTrend: weeklyTrends.tdpTrend.trendValues[idx],
      productionActual: w.productionActual || 0,
    }));
  }, [stats, currentWeeks, weeklyTrends]);

  // Cumulative weekly production curve with weekly production trendline (using currentWeeks)
  const weeklyProdTrend = useMemo(() => {
    if (!currentWeeks || currentWeeks.length === 0) return null;
    return calculateLinearTrend(
      currentWeeks.map((w) => w.productionActual || 0),
      { unit: "Ton" }
    );
  }, [currentWeeks]);

  const cumulativeData = useMemo(() => {
    if (!currentWeeks || currentWeeks.length === 0) return [];
    const prodTrend = weeklyProdTrend || calculateLinearTrend(
      currentWeeks.map((w) => w.productionActual || 0),
      { unit: "Ton" }
    );
    let cum = 0;
    return currentWeeks.map((w, idx) => {
      cum += w.productionActual || 0;
      return {
        week: w.weekNumber,
        weeklyProduction: Math.round(w.productionActual || 0),
        weeklyProductionTrend: prodTrend.trendValues[idx],
        cumulativeProduction: Math.round(cum),
      };
    });
  }, [currentWeeks, weeklyProdTrend]);

  // Discover available months dynamically from records & backend targets
  const availableMonths = useMemo(() => {
    const monthNames: Record<string, string> = {
      "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
      "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
      "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
    };
    const defaultTargets: Record<string, number> = {
      "08": 32000,
      "09": 398000,
      "10": 671000,
      "11": 700000,
      "12": 700000,
    };

    const ymSet = new Set<string>();
    dailyRecords.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        ymSet.add(r.date.substring(0, 7));
      }
    });

    if (stats?.monthlyTargets) {
      stats.monthlyTargets.forEach((t) => {
        ymSet.add(`2026-${t.monthKey}`);
      });
    }

    if (ymSet.size === 0) {
      ymSet.add("2026-08");
      ymSet.add("2026-09");
      ymSet.add("2026-10");
    }

    return Array.from(ymSet)
      .sort()
      .map((ym) => {
        const parts = ym.split("-");
        const year = parts[0];
        const mKey = parts[1];
        const mName = monthNames[mKey] || `Bulan ${mKey}`;
        const statFound = stats?.monthlyTargets?.find((x) => x.monthKey === mKey);
        const target = statFound?.target || defaultTargets[mKey] || 500000;
        return {
          key: ym,
          monthKey: mKey,
          year,
          name: `${mName} ${year}`,
          shortName: mName,
          target,
        };
      });
  }, [dailyRecords, stats]);

  // Filter months by monthlyScale dropdown
  const filteredMonths = useMemo(() => {
    if (monthlyScale === "q3") {
      const q3 = availableMonths.filter((m) => ["07", "08", "09"].includes(m.monthKey));
      return q3.length > 0 ? q3 : availableMonths;
    }
    if (monthlyScale === "q4") {
      const q4 = availableMonths.filter((m) => ["10", "11", "12"].includes(m.monthKey));
      return q4.length > 0 ? q4 : availableMonths;
    }
    if (monthlyScale !== "all") {
      const single = availableMonths.filter((m) => m.key === monthlyScale || m.monthKey === monthlyScale);
      if (single.length > 0) return single;
    }
    return availableMonths;
  }, [availableMonths, monthlyScale]);

  // Human-friendly label for current monthly scale
  const monthlyScaleLabel = useMemo(() => {
    if (monthlyScale === "q3") return "Kuartal 3 (Q3: Agu – Sep)";
    if (monthlyScale === "q4") return "Kuartal 4 (Q4: Okt – Des)";
    if (monthlyScale !== "all") {
      const found = availableMonths.find((m) => m.key === monthlyScale || m.monthKey === monthlyScale);
      return found?.name || monthlyScale;
    }
    return "Semua Bulan (YTD 2026)";
  }, [monthlyScale, availableMonths]);

  // Monthly items for Plan cards (dynamically derived)
  const monthlyItems = useMemo(() => {
    if (stats?.monthlyTargets && stats.monthlyTargets.length > 0) {
      return stats.monthlyTargets;
    }
    return availableMonths.map((m) => {
      const recs = dailyRecords.filter(
        (r) => r.date.startsWith(m.key) || (m.monthKey === "08" && r.date.startsWith("2026-07-31"))
      );
      const actual = recs.reduce((acc, r) => acc + r.production, 0);
      return {
        monthKey: m.monthKey,
        monthLabel: m.shortName,
        name: m.name,
        target: m.target,
        actual: Math.round(actual),
      };
    });
  }, [stats, availableMonths, dailyRecords]);

  // Monthly Trend Data with linear trendlines for monthly charts
  const monthlyChartData = useMemo(() => {
    let cum = 0;
    const computed = filteredMonths.map((m) => {
      const recs = dailyRecords.filter((r) => {
        if (m.monthKey === "08") return r.date.startsWith("2026-08") || r.date.startsWith("2026-07-31");
        return r.date.startsWith(m.key) || r.date.startsWith(`2026-${m.monthKey}`);
      });

      const count = recs.length;
      const statFound = stats?.monthlyTargets?.find((x) => x.monthKey === m.monthKey);
      const actual = statFound && statFound.actual > 0
        ? statFound.actual
        : recs.reduce((acc, r) => acc + r.production, 0);

      cum += actual;

      const pa = count > 0
        ? (recs.reduce((acc, r) => acc + (r.pa > 1 ? r.pa / 100 : r.pa), 0) / count) * 100
        : 95.8;
      const ua = count > 0
        ? (recs.reduce((acc, r) => acc + (r.ua > 1 ? r.ua / 100 : r.ua), 0) / count) * 100
        : 83.5;
      const payload = count > 0 ? recs.reduce((acc, r) => acc + r.payload, 0) / count : 205.8;
      const cycleTime = count > 0 ? recs.reduce((acc, r) => acc + r.cycleTime, 0) / count : 8.2;
      const fuelRatio = count > 0 ? recs.reduce((acc, r) => acc + r.fuelRatio, 0) / count : 1.52;
      const tdp = count > 0 ? recs.reduce((acc, r) => acc + r.tdp, 0) / count : 2.75;
      const achievementPercent = m.target > 0 ? (actual / m.target) * 100 : 0;

      return {
        month: m.shortName,
        fullName: m.name,
        monthKey: m.monthKey,
        planProduction: m.target,
        actualProduction: Math.round(actual),
        cumulativeProduction: Math.round(cum),
        achievementPercent: Number(achievementPercent.toFixed(1)),
        paActual: Number(pa.toFixed(1)),
        paPlan: 93.0,
        uaActual: Number(ua.toFixed(1)),
        uaPlan: 88.0,
        payloadActual: Number(payload.toFixed(1)),
        payloadPlan: 205.0,
        cycleTimeActual: Number(cycleTime.toFixed(2)),
        cycleTimePlan: 7.5,
        fuelRatioActual: Number(fuelRatio.toFixed(2)),
        fuelRatioPlan: 1.55,
        tdpActual: Number(tdp.toFixed(2)),
        tdpPlan: 2.7,
      };
    });

    const monthlyProdTrend = calculateLinearTrend(
      computed.map((m) => m.actualProduction),
      { unit: "Ton" }
    );
    const monthlyPaTrend = calculateLinearTrend(
      computed.map((m) => m.paActual),
      { unit: "%" }
    );
    const monthlyUaTrend = calculateLinearTrend(
      computed.map((m) => m.uaActual),
      { unit: "%" }
    );
    const monthlyPayloadTrend = calculateLinearTrend(
      computed.map((m) => m.payloadActual),
      { unit: "Ton" }
    );
    const monthlyFuelRatioTrend = calculateLinearTrend(
      computed.map((m) => m.fuelRatioActual),
      { unit: "L/T", subNote: "Hemat" }
    );

    const dataWithTrends = computed.map((m, idx) => ({
      ...m,
      monthlyProdTrend: monthlyProdTrend.trendValues[idx],
      monthlyPaTrend: monthlyPaTrend.trendValues[idx],
      monthlyUaTrend: monthlyUaTrend.trendValues[idx],
      monthlyPayloadTrend: monthlyPayloadTrend.trendValues[idx],
      monthlyFuelRatioTrend: monthlyFuelRatioTrend.trendValues[idx],
    }));

    return {
      data: dataWithTrends,
      trends: {
        prod: monthlyProdTrend,
        pa: monthlyPaTrend,
        ua: monthlyUaTrend,
        payload: monthlyPayloadTrend,
        fuelRatio: monthlyFuelRatioTrend,
      },
    };
  }, [dailyRecords, stats, filteredMonths]);

  // Helper badge renderer for trend indicator
  const renderTrendBadge = (trend?: TrendResult | null) => {
    if (!trend) return null;
    const isUp = trend.direction === "up";
    const isDown = trend.direction === "down";

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shadow-2xs ${
          isUp
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : isDown
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null}
        <span>{trend.label}</span>
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Screen Top Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200/60 shadow-xs shrink-0">
                <BarChart3 size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Grafik Pencapaian KPI Produksi 2026
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-50 text-[#e95623] border border-orange-200/80">
                    <Sparkles size={11} />
                    Coal Hauling 2026
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed">
                  Monitoring tren mingguan (W01–W53) metrik Physical Availability (PA), Use of Availability (UA),
                  Payload, Cycle Time, Fuel Ratio, dan TPD terhadap plan acuan tahunan.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Site selector */}
            <div className="relative">
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value as any)}
                className="appearance-none px-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623] cursor-pointer transition-colors"
              >
                <option value="all">Semua Site</option>
                <option value="MuaraPahu">Muara Pahu</option>
                <option value="Senyiur">Senyiur</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setIsUaCalcOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 cursor-pointer"
              title="Buka Kalkulator UA"
            >
              <Calculator size={14} className="text-[#18bebc]" />
              <span>Kalkulator UA</span>
            </button>

            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                title="Buka modul tabel laporan di Laporan Produksi"
              >
                <FileSpreadsheet size={14} className="text-[#e95623]" />
                <span className="hidden sm:inline">Laporan Produksi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTION ROW: Button Input Data di luar card, ditempatkan tepat di atas Skala Minggu */}
      <div className="flex items-center justify-end -mb-2">
        {onNavigateToInput && (
          <button
            onClick={onNavigateToInput}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#e95623] hover:bg-[#d44818] shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
            title="Buka form input data produksi harian baru"
          >
            <Plus size={15} />
            <span>Input Data Produksi</span>
          </button>
        )}
      </div>

      {/* DASHBOARD CONTROL BAR: SEGMENTED SWITCH & DYNAMIC SCALE DROPDOWN */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        {/* Modern Segmented Switch: Mingguan vs Bulanan */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setPeriodView("weekly")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodView === "weekly"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar size={13} className={periodView === "weekly" ? "text-[#e95623]" : "text-slate-400"} />
            <span>Tren Mingguan</span>
          </button>

          <button
            onClick={() => setPeriodView("monthly")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodView === "monthly"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <CalendarDays size={13} className={periodView === "monthly" ? "text-[#e95623]" : "text-slate-400"} />
            <span>Tren Bulanan</span>
          </button>
        </div>

        {/* Dynamic Scale & Period Dropdowns */}
        <div className="flex items-center gap-3">
          {periodView === "weekly" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                <Filter size={13} className="text-slate-400" />
                <span>Skala Minggu:</span>
              </span>
              <div className="relative">
                <select
                  value={weeklyScale}
                  onChange={(e) => setWeeklyScale(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e95623] cursor-pointer transition-colors"
                >
                  <option value="active">Periode Berjalan (W30–W53)</option>
                  {weeksWithDataList.length > 0 && (
                    <option value="withData">{`Minggu Terdata Saja (${minWeek}–${maxWeek})`}</option>
                  )}
                  <option value="full">Skala Penuh Tahunan (W01–W53)</option>
                  {monthWeekOptions.length > 0 && (
                    <optgroup label="Berdasarkan Bulan">
                      {monthWeekOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                <Filter size={13} className="text-slate-400" />
                <span>Periode Bulan:</span>
              </span>
              <div className="relative">
                <select
                  value={monthlyScale}
                  onChange={(e) => setMonthlyScale(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e95623] cursor-pointer transition-colors"
                >
                  <option value="all">Semua Bulan (YTD 2026)</option>
                  <option value="q3">Kuartal 3 (Q3: Agu – Sep)</option>
                  <option value="q4">Kuartal 4 (Q4: Okt – Des)</option>
                  {availableMonths.length > 0 && (
                    <optgroup label="Bulan Spesifik">
                      {availableMonths.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PLAN BULANAN CARDS (Aug, Sep, Oct) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {monthlyItems.map((m) => {
          const percent = m.target > 0 ? (m.actual / m.target) * 100 : 0;
          const isAchieved = percent >= 100;

          return (
            <div
              key={m.monthKey}
              className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative overflow-hidden transition-all ${
                periodView === "monthly" ? "ring-2 ring-[#e95623]/20 border-[#e95623]/40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Plan Produksi Bulanan
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">{m.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isAchieved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-orange-50 text-[#e95623] border-orange-200"
                  }`}
                >
                  {percent.toFixed(1)}% Tercapai
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {m.actual.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 ml-1">Ton</span>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Plan: {m.target.toLocaleString("id-ID")} Ton
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAchieved ? "bg-emerald-500" : "bg-[#e95623]"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: GRAFIK TREN MINGGUAN (WEEKLY TRENDLINES)                       */}
      {/* ========================================================================= */}
      {periodView === "weekly" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="text-[#e95623]" size={18} />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Visualisasi Grafik &amp; Tren Line Mingguan (Weekly &bull; {weeklyScaleLabel})
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Monitoring tren mingguan metrik KPI operasional coal hauling
            </span>
          </div>

          {/* TAMPILAN UTAMA: CHART 1: Produksi Aktual Mingguan & Akumulasi (Combo Bar + Line) - PALING ATAS */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900">
                Pencapaian Produksi Mingguan &amp; Akumulasi Kumulatif (Ton)
              </h3>
              {weeklyProdTrend && renderTrendBadge(weeklyProdTrend)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Evaluasi tonase batubara yang dipindahkan per kelompok minggu serta pertumbuhan akumulatifnya
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#e95623]">
              <span className="h-3 w-3 rounded bg-[#e95623]" /> Produksi Mingguan (Ton)
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="h-0.5 w-3.5 bg-blue-600" /> Akumulasi Total
            </span>
            <span className="flex items-center gap-1.5 text-sky-600">
              <span className="h-0.5 w-3.5 bg-sky-500 border-t border-dashed" /> Tren ({weeklyProdTrend?.direction === "up" ? "Naik ↗" : "Turun ↘"})
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cumulativeData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={10}
                padding={{ left: 50, right: 25 }}
              />
              <YAxis
                yAxisId="left"
                width={56}
                tickMargin={10}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k T`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                width={56}
                tickMargin={10}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k T`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${Number(value).toLocaleString("id-ID")} Ton`,
                  name === "weeklyProduction"
                    ? "Produksi Mingguan"
                    : name === "cumulativeProduction"
                    ? "Akumulasi Total"
                    : typeof name === "string" && name.includes("Tren")
                    ? name
                    : "Garis Tren",
                ]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
              />
              <Bar
                yAxisId="left"
                dataKey="weeklyProduction"
                name="weeklyProduction"
                fill="#e95623"
                radius={[6, 6, 0, 0]}
              >
                <LabelList
                  dataKey="weeklyProduction"
                  position="top"
                  formatter={(v: any) => (v > 0 ? `${(v / 1000).toFixed(0)}k` : "0")}
                  style={{ fontSize: 9, fill: "#e95623", fontWeight: 700 }}
                />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeProduction"
                name="cumulativeProduction"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: "#2563eb" }}
              />
              <Line
                yAxisId="left"
                type="linear"
                dataKey="weeklyProductionTrend"
                name={`Tren Produksi (${weeklyProdTrend?.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TAMPILAN UTAMA: CHART 2: Payload (Ton) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900">
                Payload Muatan DT (Ton)
              </h3>
              {weeklyTrends && renderTrendBadge(weeklyTrends.payloadTrend)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kapasitas muat aktual per armada hauling dibandingkan plan standard (205 Ton)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-0.5 w-3.5 bg-emerald-600" /> Payload Actual
            </span>
            <span className="flex items-center gap-1.5 text-[#e95623]">
              <span className="h-0.5 w-3.5 bg-[#e95623] border-t-2 border-dashed" /> Plan (205.0 T)
            </span>
            <span className="flex items-center gap-1.5 text-sky-600">
              <span className="h-0.5 w-3.5 bg-sky-500 border-t border-dashed" /> Tren ({weeklyTrends?.payloadTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyChartData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={10}
                padding={{ left: 50, right: 25 }}
              />
              <YAxis
                domain={[180, 220]}
                width={48}
                tickMargin={10}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => `${v} T`}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (typeof name === "string" && name.includes("Tren")) {
                    return [`${value !== null ? value + " Ton" : "-"}`, name];
                  }
                  return [`${value !== null ? value + " Ton" : "-"}`, "Payload Actual"];
                }}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
              />
              <ReferenceLine
                y={205.0}
                stroke="#e95623"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: "Plan 205.0 T",
                  fill: "#e95623",
                  fontSize: 10,
                  position: "right",
                }}
              />
              <Line
                type="monotone"
                dataKey="payloadActual"
                name="Payload Actual"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#059669" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              >
                {viewMode === "active" && (
                  <LabelList
                    dataKey="payloadActual"
                    position="top"
                    formatter={(v: any) => (v !== null ? `${v}` : "")}
                    style={{ fontSize: 9, fill: "#1e293b", fontWeight: 700 }}
                  />
                )}
              </Line>
              <Line
                type="linear"
                dataKey="payloadTrend"
                name={`Tren (${weeklyTrends?.payloadTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TAMPILAN UTAMA: CHART 3: Cycle Time (Jam) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900">
                Cycle Time Hauling (Jam)
              </h3>
              {weeklyTrends && renderTrendBadge(weeklyTrends.cycleTimeTrend)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Waktu tempuh ritase pergi-pulang dump truck hauling terhadap plan acuan (7.5 Jam)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="h-0.5 w-3.5 bg-amber-600" /> Cycle Time Actual
            </span>
            <span className="flex items-center gap-1.5 text-[#e95623]">
              <span className="h-0.5 w-3.5 bg-[#e95623] border-t-2 border-dashed" /> Plan (7.5 J)
            </span>
            <span className="flex items-center gap-1.5 text-sky-600">
              <span className="h-0.5 w-3.5 bg-sky-500 border-t border-dashed" /> Tren ({weeklyTrends?.cycleTimeTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyChartData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickMargin={10}
                padding={{ left: 50, right: 25 }}
              />
              <YAxis
                domain={[4, 12]}
                width={48}
                tickMargin={10}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={(v) => `${v} J`}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (typeof name === "string" && name.includes("Tren")) {
                    return [`${value !== null ? value + " Jam" : "-"}`, name];
                  }
                  return [`${value !== null ? value + " Jam" : "-"}`, "Cycle Time Actual"];
                }}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
              />
              <ReferenceLine
                y={7.5}
                stroke="#e95623"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: "Plan 7.5 J",
                  fill: "#e95623",
                  fontSize: 10,
                  position: "right",
                }}
              />
              <Line
                type="monotone"
                dataKey="cycleTimeActual"
                name="Cycle Time Actual"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#d97706" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              >
                {viewMode === "active" && (
                  <LabelList
                    dataKey="cycleTimeActual"
                    position="top"
                    formatter={(v: any) => (v !== null ? `${v}` : "")}
                    style={{ fontSize: 9, fill: "#1e293b", fontWeight: 700 }}
                  />
                )}
              </Line>
              <Line
                type="linear"
                dataKey="cycleTimeTrend"
                name={`Tren (${weeklyTrends?.cycleTimeTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TAMPILAN UTAMA: DUA GRAFIK BERDAMPINGAN: PA & UA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PA Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  Physical Availability - PA (%)
                </h3>
                {weeklyTrends && renderTrendBadge(weeklyTrends.paTrend)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Kesiapan mekanis armada hauling</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-blue-600">
                <span className="h-0.5 w-3 bg-blue-600" /> PA Actual
              </span>
              <span className="flex items-center gap-1 text-[#e95623]">
                <span className="h-0.5 w-3 bg-[#e95623] border-t border-dashed" /> Plan 93%
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickMargin={10}
                  padding={{ left: 35, right: 20 }}
                />
                <YAxis
                  domain={[0, 100]}
                  width={48}
                  tickMargin={10}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value !== null ? value + "%" : "-"}`,
                    name === "paActual" ? "PA Actual" : name,
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                />
                <ReferenceLine
                  y={93.0}
                  stroke="#e95623"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: "Plan 93%", fill: "#e95623", fontSize: 10, position: "right" }}
                />
                <Line
                  type="monotone"
                  dataKey="paActual"
                  name="PA Actual"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#2563eb" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                >
                  {viewMode === "active" && (
                    <LabelList
                      dataKey="paActual"
                      position="top"
                      formatter={(v: any) => (v !== null ? `${v}%` : "")}
                      style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }}
                    />
                  )}
                </Line>
                <Line
                  type="linear"
                  dataKey="paTrend"
                  name={`Tren (${weeklyTrends?.paTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* UA Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  Use of Availability - UA (%)
                </h3>
                {weeklyTrends && renderTrendBadge(weeklyTrends.uaTrend)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Efektivitas penggunaan unit yang siap</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-purple-600">
                <span className="h-0.5 w-3 bg-purple-600" /> UA Actual
              </span>
              <span className="flex items-center gap-1 text-[#e95623]">
                <span className="h-0.5 w-3 bg-[#e95623] border-t border-dashed" /> Plan 88%
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickMargin={10}
                  padding={{ left: 35, right: 20 }}
                />
                <YAxis
                  domain={[0, 100]}
                  width={48}
                  tickMargin={10}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value !== null ? value + "%" : "-"}`,
                    name === "uaActual" ? "UA Actual" : name,
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                />
                <ReferenceLine
                  y={88.0}
                  stroke="#e95623"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: "Plan 88%", fill: "#e95623", fontSize: 10, position: "right" }}
                />
                <Line
                  type="monotone"
                  dataKey="uaActual"
                  name="UA Actual"
                  stroke="#9333ea"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#9333ea" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                >
                  {viewMode === "active" && (
                    <LabelList
                      dataKey="uaActual"
                      position="top"
                      formatter={(v: any) => (v !== null ? `${v}%` : "")}
                      style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }}
                    />
                  )}
                </Line>
                <Line
                  type="linear"
                  dataKey="uaTrend"
                  name={`Tren (${weeklyTrends?.uaTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TAMPILAN UTAMA: DUA GRAFIK BERDAMPINGAN: FUEL RATIO & TDP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Ratio Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  Fuel Ratio (Liter/Ton)
                </h3>
                {weeklyTrends && renderTrendBadge(weeklyTrends.fuelRatioTrend)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Efisiensi konsumsi solar operasional</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-rose-600">
                <span className="h-0.5 w-3 bg-rose-600" /> FR Actual
              </span>
              <span className="flex items-center gap-1 text-[#e95623]">
                <span className="h-0.5 w-3 bg-[#e95623] border-t border-dashed" /> Plan 1.55
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickMargin={10}
                  padding={{ left: 35, right: 20 }}
                />
                <YAxis
                  domain={[1.0, 2.0]}
                  width={48}
                  tickMargin={10}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${v} L`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value !== null ? value + " L/Ton" : "-"}`,
                    name === "fuelRatioActual" ? "Fuel Ratio Actual" : name,
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                />
                <ReferenceLine
                  y={1.55}
                  stroke="#e95623"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: "Plan 1.55", fill: "#e95623", fontSize: 10, position: "right" }}
                />
                <Line
                  type="monotone"
                  dataKey="fuelRatioActual"
                  name="Fuel Ratio Actual"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#e11d48" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                >
                  {viewMode === "active" && (
                    <LabelList
                      dataKey="fuelRatioActual"
                      position="top"
                      formatter={(v: any) => (v !== null ? `${v}` : "")}
                      style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }}
                    />
                  )}
                </Line>
                <Line
                  type="linear"
                  dataKey="fuelRatioTrend"
                  name={`Tren (${weeklyTrends?.fuelRatioTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TDP Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  Trip Per Day - TDP (Trip)
                </h3>
                {weeklyTrends && renderTrendBadge(weeklyTrends.tdpTrend)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Rata-rata ritase harian per unit armada</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-teal-600">
                <span className="h-0.5 w-3 bg-teal-600" /> TDP Actual
              </span>
              <span className="flex items-center gap-1 text-[#e95623]">
                <span className="h-0.5 w-3 bg-[#e95623] border-t border-dashed" /> Plan 2.7
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickMargin={10}
                  padding={{ left: 35, right: 20 }}
                />
                <YAxis
                  domain={[1.5, 4.0]}
                  width={48}
                  tickMargin={10}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value !== null ? value + " Trip" : "-"}`,
                    name === "tdpActual" ? "TPD Actual" : name,
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                />
                <ReferenceLine
                  y={2.7}
                  stroke="#e95623"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: "Plan 2.7", fill: "#e95623", fontSize: 10, position: "right" }}
                />
                <Line
                  type="monotone"
                  dataKey="tdpActual"
                  name="TPD Actual"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#0d9488" }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                >
                  {viewMode === "active" && (
                    <LabelList
                      dataKey="tdpActual"
                      position="top"
                      formatter={(v: any) => (v !== null ? `${v}` : "")}
                      style={{ fontSize: 8.5, fill: "#1e293b", fontWeight: 700 }}
                    />
                  )}
                </Line>
                <Line
                  type="linear"
                  dataKey="tdpTrend"
                  name={`Tren (${weeklyTrends?.tdpTrend.direction === "up" ? "Naik ↗" : "Turun ↘"})`}
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: GRAFIK TREN BULANAN (MONTHLY TRENDLINES)                       */}
      {/* ========================================================================= */}
      {periodView === "monthly" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-[#e95623]" size={18} />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Visualisasi Grafik &amp; Tren Line Bulanan (Monthly &bull; {monthlyScaleLabel})
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Evaluasi target plan bulanan dan laju pertumbuhan produksi batubara PT Batara Dharma Persada
            </span>
          </div>

          {/* Chart 1: Produksi Bulanan vs Plan Acuan & Kumulatif */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tren Produksi Bulanan vs Plan Acuan &amp; Kumulatif (Ton)
                  </h3>
                  {monthlyChartData.trends.prod && renderTrendBadge(monthlyChartData.trends.prod)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Realisasi tonase bulanan terhadap target plan acuan tahunan (Agustus, September, Oktober 2026)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[#e95623]">
                  <span className="h-3 w-3 rounded bg-[#e95623]" /> Realisasi Produksi (Ton)
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-3 w-3 rounded bg-slate-300" /> Plan Acuan (Ton)
                </span>
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="h-0.5 w-3.5 bg-blue-600" /> Akumulasi Kumulatif
                </span>
                <span className="flex items-center gap-1.5 text-sky-600">
                  <span className="h-0.5 w-3.5 bg-sky-500 border-t border-dashed" /> Tren ({monthlyChartData.trends.prod?.direction === "up" ? "Naik ↗" : "Turun ↘"})
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData.data} margin={{ top: 20, right: 30, left: 10, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }}
                    tickMargin={10}
                    padding={{ left: 50, right: 50 }}
                  />
                  <YAxis
                    yAxisId="left"
                    width={56}
                    tickMargin={10}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k T`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    width={56}
                    tickMargin={10}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k T`}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString("id-ID")} Ton`,
                      name === "actualProduction"
                        ? "Realisasi Produksi"
                        : name === "planProduction"
                        ? "Plan Acuan"
                        : name === "cumulativeProduction"
                        ? "Akumulasi Kumulatif"
                        : name === "monthlyProdTrend"
                        ? "Garis Tren Bulanan"
                        : name,
                    ]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="planProduction"
                    name="planProduction"
                    fill="#cbd5e1"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="actualProduction"
                    name="actualProduction"
                    fill="#e95623"
                    radius={[6, 6, 0, 0]}
                  >
                    <LabelList
                      dataKey="actualProduction"
                      position="top"
                      formatter={(v: any) => `${(v / 1000).toFixed(1)}k`}
                      style={{ fontSize: 10, fill: "#e95623", fontWeight: 800 }}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativeProduction"
                    name="cumulativeProduction"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#2563eb" }}
                  />
                  <Line
                    yAxisId="left"
                    type="linear"
                    dataKey="monthlyProdTrend"
                    name="monthlyProdTrend"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly KPI Grid: 2 Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly PA & UA */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Tren Bulanan PA (%) &amp; UA (%)
                    </h3>
                    {monthlyChartData.trends.pa && renderTrendBadge(monthlyChartData.trends.pa)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Evolusi rata-rata kesiapan dan utilitas bulanan</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="h-0.5 w-3 bg-blue-600" /> PA Actual
                  </span>
                  <span className="flex items-center gap-1 text-purple-600">
                    <span className="h-0.5 w-3 bg-purple-600" /> UA Actual
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData.data} margin={{ top: 20, right: 25, left: 10, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} width={45} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: any, name: any) => [`${v}%`, name]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                    />
                    <ReferenceLine y={93.0} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan PA 93%", fill: "#e95623", fontSize: 9.5, position: "right" }} />
                    <ReferenceLine y={88.0} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan UA 88%", fill: "#e95623", fontSize: 9.5, position: "right" }} />
                    <Line type="monotone" dataKey="paActual" name="PA Actual" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb" }}>
                      <LabelList dataKey="paActual" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 9, fontWeight: 700 }} />
                    </Line>
                    <Line type="linear" dataKey="monthlyPaTrend" name="Tren PA" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                    <Line type="monotone" dataKey="uaActual" name="UA Actual" stroke="#9333ea" strokeWidth={2.5} dot={{ r: 4, fill: "#9333ea" }}>
                      <LabelList dataKey="uaActual" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 9, fontWeight: 700 }} />
                    </Line>
                    <Line type="linear" dataKey="monthlyUaTrend" name="Tren UA" stroke="#9333ea" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Payload & Fuel Ratio */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Tren Bulanan Payload (T) &amp; Fuel Ratio (L/T)
                    </h3>
                    {monthlyChartData.trends.payload && renderTrendBadge(monthlyChartData.trends.payload)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Efisiensi muatan dan konsumsi bahan bakar bulanan</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="h-0.5 w-3 bg-emerald-600" /> Payload (Ton)
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    <span className="h-0.5 w-3 bg-rose-600" /> FR (L/T)
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData.data} margin={{ top: 20, right: 35, left: 10, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }} />
                    <YAxis yAxisId="payload" domain={[190, 220]} width={48} tickFormatter={(v) => `${v}T`} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="fuel" orientation="right" domain={[1.0, 2.0]} width={45} tickFormatter={(v) => `${v}L`} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }} />
                    <ReferenceLine yAxisId="payload" y={205.0} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 205T", fill: "#e95623", fontSize: 9, position: "left" }} />
                    <ReferenceLine yAxisId="fuel" y={1.55} stroke="#e95623" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Plan 1.55", fill: "#e95623", fontSize: 9, position: "right" }} />
                    <Line yAxisId="payload" type="monotone" dataKey="payloadActual" name="Payload Actual" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: "#059669" }}>
                      <LabelList dataKey="payloadActual" position="top" formatter={(v: any) => `${v}T`} style={{ fontSize: 9, fontWeight: 700 }} />
                    </Line>
                    <Line yAxisId="payload" type="linear" dataKey="monthlyPayloadTrend" name="Tren Payload" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                    <Line yAxisId="fuel" type="monotone" dataKey="fuelRatioActual" name="Fuel Ratio Actual" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4, fill: "#e11d48" }}>
                      <LabelList dataKey="fuelRatioActual" position="top" formatter={(v: any) => `${v}`} style={{ fontSize: 9, fontWeight: 700 }} />
                    </Line>
                    <Line yAxisId="fuel" type="linear" dataKey="monthlyFuelRatioTrend" name="Tren FR" stroke="#e11d48" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UA Calculator Modal */}
      <UACalculatorModal
        isOpen={isUaCalcOpen}
        onClose={() => setIsUaCalcOpen(false)}
      />
    </div>
  );
};
