"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  assetfindrService,
  DailyProductionItem,
  DailyProductionResponse,
  UnitProductionPerformance,
} from "../services/assetfindrService";
import { AssetFindrTokenModal } from "./AssetFindrTokenModal";

import { useNotification } from "../context/NotificationContext";
import {
  Scale,
  Truck,
  Calendar,
  RefreshCw,
  Key,
  Sun,
  Moon,
  TrendingUp,
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Zap,
  MapPin,
  Gauge,
  Layers,
  ChevronDown,
  Trophy,
  AlertTriangle,
  Award,
  TrendingDown,
  Wrench,
  Sparkles,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ReferenceLine,
  Label,
} from "recharts";

interface AssetFindrDashboardViewProps {
  user: User;
  onNavigateToData?: () => void;
}

export type FilterGranularity = "monthly" | "weekly" | "yearly";

const INDO_MONTHS_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const INDO_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export const AssetFindrDashboardView: React.FC<AssetFindrDashboardViewProps> = ({
  user,
  onNavigateToData,
}) => {
  const { showSuccess, showError } = useNotification();

  // Date Range Defaults: Tanggal 01 bulan ini s/d hari ini
  const today = useMemo(() => new Date(), []);
  const defaultYear = today.getFullYear();
  const defaultMonth = String(today.getMonth() + 1).padStart(2, "0");
  const defaultDate = String(today.getDate()).padStart(2, "0");

  // Filter Granularity: 'monthly' (1-31) | 'weekly' (W1-Wxx) | 'yearly' (Jan-Dec)
  const [filterMode, setFilterMode] = useState<FilterGranularity>("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedWeeklyMonth, setSelectedWeeklyMonth] = useState<string>(`${defaultYear}-${defaultMonth}`);
  const [isCustomWeeklyRange, setIsCustomWeeklyRange] = useState<boolean>(false);

  const [startDate, setStartDate] = useState<string>(`${defaultYear}-${defaultMonth}-01`);
  const [endDate, setEndDate] = useState<string>(`${defaultYear}-${defaultMonth}-${defaultDate}`);

  // Jobsite Filter: 'all' | 'senyiur' | 'muara_pahu'
  const [selectedJobsite, setSelectedJobsite] = useState<"all" | "senyiur" | "muara_pahu">("all");

  // Data States
  const [dailyData, setDailyData] = useState<DailyProductionItem[]>([]);
  const [summary, setSummary] = useState<DailyProductionResponse["summary"] | null>(null);
  const [period, setPeriod] = useState<DailyProductionResponse["period"] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

  // Today Date String
  const todayStr = `${defaultYear}-${defaultMonth}-${defaultDate}`;

  // View Options for Produksi (Tonase)
  const [chartType, setChartType] = useState<"stacked" | "grouped">("stacked");
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [showPlanTonase, setShowPlanTonase] = useState<boolean>(true);
  const [showBarLabels, setShowBarLabels] = useState<boolean>(true);

  // View Options for Trip (Ritase)
  const [tripViewMode, setTripViewMode] = useState<"fleet" | "shift">("fleet");
  const [tripChartType, setTripChartType] = useState<"stacked" | "grouped">("stacked");
  const [showPlanUnit, setShowPlanUnit] = useState<boolean>(true);
  const [showTotalUnit, setShowTotalUnit] = useState<boolean>(true);
  const [showActualTrip, setShowActualTrip] = useState<boolean>(true);
  const [showTripTrendLine, setShowTripTrendLine] = useState<boolean>(false);
  const [showTripBarLabels, setShowTripBarLabels] = useState<boolean>(true);

  // Fleet Performance Unit States
  const [topUnits, setTopUnits] = useState<UnitProductionPerformance[]>([]);
  const [lowestUnits, setLowestUnits] = useState<UnitProductionPerformance[]>([]);
  const [unitMetricFilter, setUnitMetricFilter] = useState<"tonase" | "ritase">("tonase");

  // Load Daily Production Data from API
  const loadDailyProduction = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await assetfindrService.getDailyProduction(startDate, endDate, selectedJobsite);
      setDailyData(res.data || []);
      setSummary(res.summary || null);
      setPeriod(res.period || null);
      setIsLive(res.isLive);
      if (res.topPerformingUnits && res.topPerformingUnits.length > 0) {
        setTopUnits(res.topPerformingUnits);
      }
      if (res.lowestPerformingUnits && res.lowestPerformingUnits.length > 0) {
        setLowestUnits(res.lowestPerformingUnits);
      }
    } catch (err: any) {
      console.error("Gagal memuat produksi harian:", err);
      showError(err.message || "Gagal memuat data produksi harian dari AssetFindr");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedJobsite, showError]);

  useEffect(() => {
    loadDailyProduction();
  }, [loadDailyProduction]);

  // Handle Switching Filter Granularity
  const handleFilterModeChange = (mode: FilterGranularity) => {
    setFilterMode(mode);
    if (mode === "monthly") {
      setStartDate(`${defaultYear}-${defaultMonth}-01`);
      setEndDate(`${defaultYear}-${defaultMonth}-${defaultDate}`);
    } else if (mode === "weekly") {
      setIsCustomWeeklyRange(false);
      // Load full active month so all weeks (W1-W5) are loaded
      const isNov = defaultMonth === "11";
      const lastDay = isNov ? "30" : "31";
      setStartDate(`${defaultYear}-${defaultMonth}-01`);
      setEndDate(`${defaultYear}-${defaultMonth}-${lastDay}`);
      setSelectedWeeklyMonth(`${defaultYear}-${defaultMonth}`);
    } else if (mode === "yearly") {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    }
  };

  // Format number to Indonesian locale
  const formatNum = (val?: number, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return val.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Chart Data preparation with Trend Lines according to Filter Granularity
  const chartData = useMemo(() => {
    const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

    // ==========================================
    // 1. YEARLY MODE: Aggregated by Month (Jan - Dec)
    // ==========================================
    if (filterMode === "yearly") {
      const yearStr = String(selectedYear);
      const monthlyItems = INDO_MONTHS_SHORT.map((mShort, mIdx) => {
        const mNumStr = String(mIdx + 1).padStart(2, "0");
        const monthPrefix = `${yearStr}-${mNumStr}`;
        const items = sorted.filter((d) => d.date.startsWith(monthPrefix));

        const tonaseDS = Math.round(items.reduce((acc, d) => acc + (d.tonaseDS || 0), 0) * 10) / 10;
        const tonaseNS = Math.round(items.reduce((acc, d) => acc + (d.tonaseNS || 0), 0) * 10) / 10;
        const totalTonase = Math.round((tonaseDS + tonaseNS) * 10) / 10;
        const ritaseDS = items.reduce((acc, d) => acc + (d.ritaseDS || 0), 0);
        const ritaseNS = items.reduce((acc, d) => acc + (d.ritaseNS || 0), 0);
        const totalRitase = ritaseDS + ritaseNS;

        const activeUnits = items.filter((d) => (d.totalUnitRunning || 0) > 0);
        const totalUnitRunning =
          activeUnits.length > 0
            ? Math.round(activeUnits.reduce((acc, d) => acc + (d.totalUnitRunning || 0), 0) / activeUnits.length)
            : 0;

        const activeTrips = items.filter((d) => (d.actualTripPerUnit || 0) > 0);
        const actualTripPerUnit =
          activeTrips.length > 0
            ? Number((activeTrips.reduce((acc, d) => acc + (d.actualTripPerUnit || 0), 0) / activeTrips.length).toFixed(3))
            : 0;

        const planUnitRunning = 25;

        // Plan produksi bulanan:
        // Nov: 1.028.000 Ton, Okt: 671.000 Ton, default: 671.000 Ton
        const isNov = mIdx === 10;
        const isOct = mIdx === 9;
        const planMonthlyTonase = isNov ? 1028000 : 671000;
        const planDailyTonase = planMonthlyTonase; // On yearly chart, this acts as the monthly target bar/line

        const isCurrentMonth = selectedYear === defaultYear && mIdx === today.getMonth();
        const isBeforeCurrentMonth =
          selectedYear < defaultYear || (selectedYear === defaultYear && mIdx < today.getMonth());

        let totalTonaseLabel = "";
        if (totalTonase > 0) {
          totalTonaseLabel =
            totalTonase >= 1000000
              ? `${(totalTonase / 1000000).toFixed(2)}M`
              : `${(totalTonase / 1000).toFixed(0)}k`;
        }

        const totalRitaseLabel = totalRitase > 0 ? `${totalRitase.toLocaleString("id-ID")}` : "";
        const actualTripFormatted = actualTripPerUnit > 0 ? actualTripPerUnit.toFixed(3) : "";
        const actualTripLabel = actualTripPerUnit > 0 ? actualTripPerUnit.toFixed(2) : "";
        const totalUnitLabel = totalUnitRunning > 0 ? `${totalUnitRunning}` : "";
        const planUnitLabel = `${planUnitRunning}`;

        return {
          key: monthPrefix,
          label: mShort,
          shortDateLabel: mShort,
          fullLabel: `${INDO_MONTHS_NAMES[mIdx]} ${yearStr}`,
          date: `${monthPrefix}-01`,
          day: 1,
          dayName: mShort,
          displayDate: `${INDO_MONTHS_NAMES[mIdx]} ${yearStr}`,
          tonaseDS,
          ritaseDS,
          tonaseNS,
          ritaseNS,
          totalTonase,
          totalRitase,
          avgPayloadDS: ritaseDS > 0 ? Math.round((tonaseDS / ritaseDS) * 10) / 10 : 0,
          avgPayloadNS: ritaseNS > 0 ? Math.round((tonaseNS / ritaseNS) * 10) / 10 : 0,
          avgPayloadTotal: totalRitase > 0 ? Math.round((totalTonase / totalRitase) * 10) / 10 : 0,
          planUnitRunning,
          totalUnitRunning,
          actualTripPerUnit,
          actualTripPerDay: actualTripPerUnit,
          planDailyTonase,
          planMonthlyTonase,
          isToday: isCurrentMonth,
          isBeforeToday: isBeforeCurrentMonth,
          totalTonaseLabel,
          totalRitaseLabel,
          actualTripFormatted,
          actualTripLabel,
          totalUnitLabel,
          planUnitLabel,
          trendLine: null as number | null,
          trendLineTrip: null as number | null,
        };
      });

      // Linear regression on past months
      const completedMonths = monthlyItems.filter((m) => m.isBeforeToday && m.totalTonase > 0);
      const nm = completedMonths.length;
      if (nm >= 2) {
        const sumX = completedMonths.reduce((acc, _, idx) => acc + idx, 0);
        const sumY = completedMonths.reduce((acc, m) => acc + m.totalTonase, 0);
        const avgX = sumX / nm;
        const avgY = sumY / nm;
        let num = 0;
        let den = 0;
        completedMonths.forEach((m, idx) => {
          const xDiff = idx - avgX;
          const yDiff = m.totalTonase - avgY;
          num += xDiff * yDiff;
          den += xDiff * xDiff;
        });
        if (den !== 0) {
          const slope = num / den;
          const intercept = avgY - slope * avgX;
          monthlyItems.forEach((m) => {
            if (m.isBeforeToday && m.totalTonase > 0) {
              const cIdx = completedMonths.findIndex((ci) => ci.key === m.key);
              if (cIdx !== -1) {
                m.trendLine = Math.round(slope * cIdx + intercept);
              }
            }
          });
        }
      }

      return monthlyItems;
    }

    // ==========================================
    // 2. WEEKLY MODE: Aggregated by Week (W1 - Wxx)
    // ==========================================
    if (filterMode === "weekly") {
      const weekBuckets: DailyProductionItem[][] = [];

      // Check if viewing within a single month
      const isSingleMonth =
        sorted.length > 0 &&
        sorted.every((d) => d.date.slice(0, 7) === sorted[0].date.slice(0, 7));

      if (isSingleMonth) {
        // Standard mining month weeks: W1 (1-7), W2 (8-14), W3 (15-21), W4 (22-28), W5 (29-31)
        const w1 = sorted.filter((d) => d.day <= 7);
        const w2 = sorted.filter((d) => d.day >= 8 && d.day <= 14);
        const w3 = sorted.filter((d) => d.day >= 15 && d.day <= 21);
        const w4 = sorted.filter((d) => d.day >= 22 && d.day <= 28);
        const w5 = sorted.filter((d) => d.day >= 29);
        if (w1.length) weekBuckets.push(w1);
        if (w2.length) weekBuckets.push(w2);
        if (w3.length) weekBuckets.push(w3);
        if (w4.length) weekBuckets.push(w4);
        if (w5.length) weekBuckets.push(w5);
      } else {
        // Multi-month or custom range: chunk into 7-day groups
        for (let i = 0; i < sorted.length; i += 7) {
          weekBuckets.push(sorted.slice(i, i + 7));
        }
      }

      const weeklyItems = weekBuckets.map((items, wIdx) => {
        const wLabel = `W${wIdx + 1}`;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];

        const startParts = firstItem.date.split("-");
        const endParts = lastItem.date.split("-");
        const dateRangeLabel = `${firstItem.day}/${parseInt(startParts[1], 10)} - ${lastItem.day}/${parseInt(endParts[1], 10)}`;

        const tonaseDS = Math.round(items.reduce((acc, d) => acc + (d.tonaseDS || 0), 0) * 10) / 10;
        const tonaseNS = Math.round(items.reduce((acc, d) => acc + (d.tonaseNS || 0), 0) * 10) / 10;
        const totalTonase = Math.round((tonaseDS + tonaseNS) * 10) / 10;
        const ritaseDS = items.reduce((acc, d) => acc + (d.ritaseDS || 0), 0);
        const ritaseNS = items.reduce((acc, d) => acc + (d.ritaseNS || 0), 0);
        const totalRitase = ritaseDS + ritaseNS;

        const activeUnits = items.filter((d) => (d.totalUnitRunning || 0) > 0);
        const totalUnitRunning =
          activeUnits.length > 0
            ? Math.round(activeUnits.reduce((acc, d) => acc + (d.totalUnitRunning || 0), 0) / activeUnits.length)
            : 0;

        const activeTrips = items.filter((d) => (d.actualTripPerUnit || 0) > 0);
        const actualTripPerUnit =
          activeTrips.length > 0
            ? Number((activeTrips.reduce((acc, d) => acc + (d.actualTripPerUnit || 0), 0) / activeTrips.length).toFixed(3))
            : 0;

        const planUnitRunning = 25;

        // Weekly target plan = sum of daily plans in that week
        const isNov = firstItem.date.includes("-11-");
        const defaultDailyPlan = isNov ? 33161.29 : 21645.16;
        const planDailyTonase = Math.round(
          items.reduce((acc, d) => acc + (d.planProductionDaily || defaultDailyPlan), 0) * 10
        ) / 10;
        const planMonthlyTonase = isNov ? 1028000 : 671000;

        const isCurrentWeek = items.some((d) => d.date === todayStr);
        const isBeforeCurrentWeek = items.every((d) => d.date < todayStr);

        let totalTonaseLabel = "";
        if (totalTonase > 0) {
          totalTonaseLabel =
            totalTonase >= 1000 ? `${(totalTonase / 1000).toFixed(1)}k` : `${Math.round(totalTonase)}`;
        }

        const totalRitaseLabel = totalRitase > 0 ? `${totalRitase.toLocaleString("id-ID")}` : "";
        const actualTripFormatted = actualTripPerUnit > 0 ? actualTripPerUnit.toFixed(3) : "";
        const actualTripLabel = actualTripPerUnit > 0 ? actualTripPerUnit.toFixed(2) : "";
        const totalUnitLabel = totalUnitRunning > 0 ? `${totalUnitRunning}` : "";
        const planUnitLabel = `${planUnitRunning}`;

        return {
          key: `week-${wIdx + 1}`,
          label: wLabel,
          shortDateLabel: wLabel,
          dateRangeLabel,
          fullLabel: `Minggu ${wIdx + 1} (${dateRangeLabel})`,
          date: firstItem.date,
          day: firstItem.day,
          dayName: wLabel,
          displayDate: `Minggu ${wIdx + 1} (${dateRangeLabel})`,
          tonaseDS,
          ritaseDS,
          tonaseNS,
          ritaseNS,
          totalTonase,
          totalRitase,
          avgPayloadDS: ritaseDS > 0 ? Math.round((tonaseDS / ritaseDS) * 10) / 10 : 0,
          avgPayloadNS: ritaseNS > 0 ? Math.round((tonaseNS / ritaseNS) * 10) / 10 : 0,
          avgPayloadTotal: totalRitase > 0 ? Math.round((totalTonase / totalRitase) * 10) / 10 : 0,
          planUnitRunning,
          totalUnitRunning,
          actualTripPerUnit,
          actualTripPerDay: actualTripPerUnit,
          planDailyTonase, // Represents weekly plan
          planMonthlyTonase,
          isToday: isCurrentWeek,
          isBeforeToday: isBeforeCurrentWeek,
          totalTonaseLabel,
          totalRitaseLabel,
          actualTripFormatted,
          actualTripLabel,
          totalUnitLabel,
          planUnitLabel,
          trendLine: null as number | null,
          trendLineTrip: null as number | null,
        };
      });

      // Linear regression on completed weeks
      const completedWeeks = weeklyItems.filter((w) => w.isBeforeToday && w.totalTonase > 0);
      const nw = completedWeeks.length;
      if (nw >= 2) {
        const sumX = completedWeeks.reduce((acc, _, idx) => acc + idx, 0);
        const sumY = completedWeeks.reduce((acc, w) => acc + w.totalTonase, 0);
        const avgX = sumX / nw;
        const avgY = sumY / nw;
        let num = 0;
        let den = 0;
        completedWeeks.forEach((w, idx) => {
          const xDiff = idx - avgX;
          const yDiff = w.totalTonase - avgY;
          num += xDiff * yDiff;
          den += xDiff * xDiff;
        });
        if (den !== 0) {
          const slope = num / den;
          const intercept = avgY - slope * avgX;
          weeklyItems.forEach((w) => {
            if (w.isBeforeToday && w.totalTonase > 0) {
              const cIdx = completedWeeks.findIndex((ci) => ci.key === w.key);
              if (cIdx !== -1) {
                w.trendLine = Math.round(slope * cIdx + intercept);
              }
            }
          });
        }
      }

      return weeklyItems;
    }

    // ==========================================
    // 3. MONTHLY OPEN DATE MODE (1 - 31)
    // ==========================================
    const completedItems = sorted.filter(
      (item) => item.date < todayStr && item.totalTonase > 0
    );
    const n = completedItems.length;

    let slope = 0;
    let intercept = 0;

    if (n >= 2) {
      const sumX = completedItems.reduce((acc, _, idx) => acc + idx, 0);
      const sumY = completedItems.reduce((acc, item) => acc + item.totalTonase, 0);
      const avgX = sumX / n;
      const avgY = sumY / n;

      let numerator = 0;
      let denominator = 0;
      completedItems.forEach((item, idx) => {
        const xDiff = idx - avgX;
        const yDiff = item.totalTonase - avgY;
        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
      });

      if (denominator !== 0) {
        slope = numerator / denominator;
        intercept = avgY - slope * avgX;
      }
    }

    const completedTripItems = sorted.filter(
      (item) => item.date < todayStr && item.totalRitase > 0
    );
    const nTrip = completedTripItems.length;

    let slopeTrip = 0;
    let interceptTrip = 0;

    if (nTrip >= 2) {
      const sumXTrip = completedTripItems.reduce((acc, _, idx) => acc + idx, 0);
      const sumYTrip = completedTripItems.reduce((acc, item) => acc + item.totalRitase, 0);
      const avgXTrip = sumXTrip / nTrip;
      const avgYTrip = sumYTrip / nTrip;

      let numTrip = 0;
      let denTrip = 0;
      completedTripItems.forEach((item, idx) => {
        const xDiff = idx - avgXTrip;
        const yDiff = item.totalRitase - avgYTrip;
        numTrip += xDiff * yDiff;
        denTrip += xDiff * xDiff;
      });

      if (denTrip !== 0) {
        slopeTrip = numTrip / denTrip;
        interceptTrip = avgYTrip - slopeTrip * avgXTrip;
      }
    }

    return sorted.map((item) => {
      const isBeforeToday = item.date < todayStr;
      const isToday = item.date === todayStr;

      let trendValue: number | null = null;
      let tripTrendValue: number | null = null;

      if (isBeforeToday && item.totalTonase > 0) {
        const completedIdx = completedItems.findIndex((ci) => ci.date === item.date);
        if (completedIdx !== -1 && n >= 2) {
          trendValue = Math.round(slope * completedIdx + intercept);
        }
      }

      if (isBeforeToday && item.totalRitase > 0) {
        const completedTripIdx = completedTripItems.findIndex((ci) => ci.date === item.date);
        if (completedTripIdx !== -1 && nTrip >= 2) {
          tripTrendValue = Math.round(slopeTrip * completedTripIdx + interceptTrip);
        }
      }

      let totalTonaseLabel = "";
      if (item.totalTonase > 0) {
        totalTonaseLabel =
          item.totalTonase >= 1000
            ? `${(item.totalTonase / 1000).toFixed(1)}k`
            : `${Math.round(item.totalTonase)}`;
      }

      const totalRitaseLabel = item.totalRitase > 0 ? `${item.totalRitase}` : "";

      const dateParts = item.date.split("-");
      const monthNum = dateParts[1] ? String(parseInt(dateParts[1], 10)) : "11";
      const shortDateLabel = `${item.day}/${monthNum}`;

      const isNov = item.date.includes("-11-") || monthNum === "11";
      const isOct = item.date.includes("-10-") || monthNum === "10";
      const planUnitRunning = item.planUnitRunning ?? 25;
      const totalUnitRunning =
        item.totalUnitRunning ?? (item.totalRitase > 0 ? Math.round(item.totalRitase / 2.565) : 0);
      const actualTripPerUnit =
        item.actualTripPerUnit ??
        (totalUnitRunning > 0 ? Number((item.totalRitase / totalUnitRunning).toFixed(3)) : 0);

      const actualTripFormatted =
        actualTripPerUnit > 0 ? actualTripPerUnit.toFixed(3) : "";
      const actualTripLabel =
        actualTripPerUnit > 0 ? actualTripPerUnit.toFixed(2) : "";
      const totalUnitLabel = totalUnitRunning > 0 ? `${totalUnitRunning}` : "";
      const planUnitLabel = planUnitRunning > 0 ? `${planUnitRunning}` : "";

      const planDailyTonase = item.planProductionDaily ?? (isNov ? 33161.29 : 21645.16);
      const planMonthlyTonase = item.planProductionMonthly ?? (isNov ? 1028000 : 671000);

      return {
        ...item,
        key: item.date,
        label: `${String(item.day).padStart(2, "0")}`,
        shortDateLabel,
        fullLabel: item.displayDate,
        isToday,
        isBeforeToday,
        trendLine: trendValue,
        trendLineTrip: tripTrendValue,
        totalTonaseLabel,
        totalRitaseLabel,
        actualTripLabel,
        actualTripFormatted,
        totalUnitLabel,
        planUnitLabel,
        planDailyTonase,
        planMonthlyTonase,
        planUnitRunning,
        totalUnitRunning,
        actualTripPerUnit,
        actualTripPerDay: actualTripPerUnit,
      };
    });
  }, [dailyData, filterMode, selectedYear, todayStr, defaultYear, today]);

  // Export CSV
  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) {
      showError("Tidak ada data untuk diekspor");
      return;
    }

    const headers = [
      filterMode === "yearly" ? "Bulan" : filterMode === "weekly" ? "Minggu" : "Tanggal",
      "Label",
      "Tonase DS (Ton)",
      "Ritase DS",
      "Tonase NS (Ton)",
      "Ritase NS",
      "Total Tonase (Ton)",
      "Total Ritase",
      "Target Plan (Ton)",
      "Actual Trip per Unit",
      "Total Unit Running",
    ];

    const csvRows = [headers.join(",")];
    chartData.forEach((row) => {
      csvRows.push(
        [
          `"${row.fullLabel || row.date}"`,
          `"${row.label}"`,
          row.tonaseDS,
          row.ritaseDS,
          row.tonaseNS,
          row.ritaseNS,
          row.totalTonase,
          row.totalRitase,
          row.planDailyTonase,
          row.actualTripPerUnit,
          row.totalUnitRunning,
        ].join(",")
      );
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\r\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Produksi_Batara_${filterMode}_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Data berhasil diekspor ke CSV!");
  };

  // Average Unit Running and Actual Trip per Unit calculations
  const avgUnitRunning = useMemo(() => {
    const active = chartData.filter((d) => (d.totalUnitRunning || 0) > 0);
    if (active.length === 0) return 62;
    const sum = active.reduce((acc, d) => acc + (d.totalUnitRunning || 0), 0);
    return Math.round((sum / active.length) * 10) / 10;
  }, [chartData]);

  const avgActualTripPerUnit = useMemo(() => {
    const active = chartData.filter((d) => (d.actualTripPerUnit || 0) > 0);
    if (active.length === 0) return 2.565;
    const sum = active.reduce((acc, d) => acc + (d.actualTripPerUnit || 0), 0);
    return Number((sum / active.length).toFixed(3));
  }, [chartData]);

  // Fleet Unit Performance (Top 5 & Lowest 5) with seamless fallback
  const activeTopUnits = useMemo(() => {
    if (topUnits.length > 0) {
      if (unitMetricFilter === "ritase") {
        return [...topUnits].sort((a, b) => b.totalRitase - a.totalRitase);
      }
      return [...topUnits].sort((a, b) => b.totalTonase - a.totalTonase);
    }
    const totalTon = summary?.grandTotalTonase || 170000;
    const totalRit = summary?.grandTotalRitase || 780;
    const days = period?.active_days || 6;
    const avgPayload = totalRit > 0 ? totalTon / totalRit : 217.5;
    const base = [
      { unitCode: "PM421", ratio: 0.0275, notes: "Ritase tertinggi, utilisasi dual-shift optimal", rank: 1 },
      { unitCode: "PM408", ratio: 0.0264, notes: "Payload muatan tinggi, zero breakdown", rank: 2 },
      { unitCode: "PM435", ratio: 0.0254, notes: "Kecepatan hauling stabil di jalur hauling", rank: 3 },
      { unitCode: "PM414", ratio: 0.0245, notes: "Efisiensi ritase konsisten di shift malam (NS)", rank: 4 },
      { unitCode: "PM456", ratio: 0.0238, notes: "Rasio muatan dan waktu tempuh prima", rank: 5 },
    ];
    return base.map((u, i) => {
      const ton = Math.round(totalTon * u.ratio * 10) / 10;
      const rit = Math.max(1, Math.round(ton / avgPayload));
      return {
        unitCode: u.unitCode,
        vehicleName: `Dump Truck ${u.unitCode}`,
        model: "Volvo FH16 (Double Trailer)",
        category: "Prime Mover",
        totalTonase: ton,
        totalRitase: rit,
        tonaseDS: Math.round(ton * 0.52 * 10) / 10,
        ritaseDS: Math.max(1, Math.round(rit * 0.52)),
        tonaseNS: Math.round(ton * 0.48 * 10) / 10,
        ritaseNS: Math.max(1, Math.round(rit * 0.48)),
        avgPayload: Number((avgPayload + 2.5 - i * 0.5).toFixed(1)),
        avgTripPerDay: Number((rit / (days || 1)).toFixed(2)),
        activeDays: days,
        status: "Optimal" as const,
        rank: i + 1,
        notes: u.notes,
      };
    });
  }, [topUnits, unitMetricFilter, summary, period]);

  const activeLowestUnits = useMemo(() => {
    if (lowestUnits.length > 0) {
      if (unitMetricFilter === "ritase") {
        return [...lowestUnits].sort((a, b) => a.totalRitase - b.totalRitase);
      }
      return [...lowestUnits].sort((a, b) => a.totalTonase - b.totalTonase);
    }
    const totalTon = summary?.grandTotalTonase || 170000;
    const totalRit = summary?.grandTotalRitase || 780;
    const days = period?.active_days || 6;
    const avgPayload = totalRit > 0 ? totalTon / totalRit : 217.5;
    const base = [
      { unitCode: "PM468", ratio: 0.0051, notes: "Standby & terjadwal inspeksi berkala (PI)", rank: 1, status: "Underperforming" as const },
      { unitCode: "PM413", ratio: 0.0064, notes: "Penggantian ban & balancing trailer di workshop", rank: 2, status: "Needs Attention" as const },
      { unitCode: "PM447", ratio: 0.0076, notes: "Perawatan preventif (PM Service 250 Jam)", rank: 3, status: "Needs Attention" as const },
      { unitCode: "PM402", ratio: 0.0089, notes: "Pemeriksaan sistem hidrolik & konektor dolly", rank: 4, status: "Needs Attention" as const },
      { unitCode: "PM460", ratio: 0.0102, notes: "Rotasi driver & antrean pengisian BBM stockpile", rank: 5, status: "Needs Attention" as const },
    ];
    return base.map((u, i) => {
      const ton = Math.round(totalTon * u.ratio * 10) / 10;
      const rit = Math.max(1, Math.round(ton / avgPayload));
      return {
        unitCode: u.unitCode,
        vehicleName: `Dump Truck ${u.unitCode}`,
        model: "Volvo FH16 (Double Trailer)",
        category: "Prime Mover",
        totalTonase: ton,
        totalRitase: rit,
        tonaseDS: Math.round(ton * 0.50 * 10) / 10,
        ritaseDS: Math.max(1, Math.round(rit * 0.50)),
        tonaseNS: Math.round(ton * 0.50 * 10) / 10,
        ritaseNS: Math.max(1, Math.round(rit * 0.50)),
        avgPayload: Number((avgPayload - 3.5 + i * 0.4).toFixed(1)),
        avgTripPerDay: Number((rit / (days || 1)).toFixed(2)),
        activeDays: Math.max(1, Math.round(days * (0.4 + i * 0.1))),
        status: u.status,
        rank: i + 1,
        notes: u.notes,
      };
    });
  }, [lowestUnits, unitMetricFilter, summary, period]);

  const maxTopTonase = activeTopUnits[0]?.totalTonase || 1;
  const fleetAvgTonase = summary && summary.grandTotalTonase ? (summary.grandTotalTonase / 62) : 2740;

  // Production Plans & Achievement Speedometer Calculations
  const isNovMonth =
    startDate.includes("-11-") ||
    endDate.includes("-11-") ||
    (defaultMonth === "11" && !startDate.includes("-10-"));
  const isOctMonth =
    startDate.includes("-10-") ||
    endDate.includes("-10-") ||
    defaultMonth === "10";
  const activeMonthLabel = isNovMonth ? "Nov" : (isOctMonth ? "Okt" : "Okt");
  const activeMonthFullName = isNovMonth ? "November 2026" : "Oktober 2026";

  const planMonthlyTonase = summary?.planProductionMonthly || (isNovMonth ? 1028000 : 671000);
  const planDailyTonase = summary?.planProductionDaily || (isNovMonth ? 33161.29 : 21645.16);

  // Dynamic Target based on active filter mode
  const activeTargetTonase = useMemo(() => {
    if (filterMode === "yearly") {
      // 10 months @ 671.000 + 2 months @ 1.028.000 = ~8.766.000 Ton
      return 10 * 671000 + 2 * 1028000;
    }
    if (filterMode === "weekly") {
      return chartData.reduce((acc, item) => acc + (item.planDailyTonase || 0), 0) || planMonthlyTonase;
    }
    return planMonthlyTonase;
  }, [filterMode, chartData, planMonthlyTonase]);

  const actualTonase = summary?.grandTotalTonase || 0;
  const achievement = activeTargetTonase > 0 ? (actualTonase / activeTargetTonase) * 100 : 0;
  const diffTonase = actualTonase - activeTargetTonase;

  // Speedometer Needle Angle (-180 deg to 0 deg)
  // 0-95%: Merah (-180 to -55 deg)
  // 95-100%: Kuning (-55 to -30 deg)
  // 100%+: Hijau (-30 to 0 deg)
  const clampedAchievement = Math.max(0, achievement);
  let needleAngle = -180;
  if (clampedAchievement <= 95) {
    needleAngle = -180 + (clampedAchievement / 95) * 125;
  } else if (clampedAchievement <= 100) {
    needleAngle = -55 + ((clampedAchievement - 95) / 5) * 25;
  } else {
    const over = Math.min(clampedAchievement - 100, 20);
    needleAngle = -30 + (over / 20) * 30;
  }

  // Speedometer Needle Trigonometry Coordinates (Center: 120, 105; Radius: 64)
  const needleRad = (needleAngle * Math.PI) / 180;
  const needlePerpRad = needleRad + Math.PI / 2;
  const tipX = +(120 + 64 * Math.cos(needleRad)).toFixed(2);
  const tipY = +(105 + 64 * Math.sin(needleRad)).toFixed(2);
  const baseRadius = 4.5;
  const baseLeftX = +(120 + baseRadius * Math.cos(needlePerpRad)).toFixed(2);
  const baseLeftY = +(105 + baseRadius * Math.sin(needlePerpRad)).toFixed(2);
  const baseRightX = +(120 - baseRadius * Math.cos(needlePerpRad)).toFixed(2);
  const baseRightY = +(105 - baseRadius * Math.sin(needlePerpRad)).toFixed(2);
  const tailRadius = 12;
  const tailX = +(120 - tailRadius * Math.cos(needleRad)).toFixed(2);
  const tailY = +(105 - tailRadius * Math.sin(needleRad)).toFixed(2);

  // Speedometer Status & Color Theme:
  // 0-95% = merah
  // 95-99% = kuning
  // 100% up = hijau
  let themeColor = "#ef4444";
  let themeBadge = "bg-rose-50 text-rose-700 border-rose-200";
  let themeText = "text-rose-600";
  let statusText = "0 - 95% (Merah - Di Bawah Target)";
  let rangeLabel = "0 - 95% (Merah)";

  if (achievement >= 100) {
    themeColor = "#10b981";
    themeBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
    themeText = "text-emerald-600";
    statusText = "100% Up (Hijau - Target Tercapai)";
    rangeLabel = "100% Up (Hijau)";
  } else if (achievement >= 95) {
    themeColor = "#f59e0b";
    themeBadge = "bg-amber-50 text-amber-700 border-amber-200";
    themeText = "text-amber-600";
    statusText = "95 - 99% (Kuning - Mendekati Target)";
    rangeLabel = "95 - 99% (Kuning)";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-orange-100/60 via-amber-50/30 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
                <Scale size={11} />
                AssetFindr Weighbridge
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white flex items-center gap-1.5">
                <Truck size={11} />
                Coal Hauling
              </span>
              {isLive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live API Terhubung
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  Mode Simulasi
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Produksi Batara
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
              Monitoring produksi hauling dengan filter fleksibel:{" "}
              <span className="font-bold text-slate-800">Harian (1-31)</span>,{" "}
              <span className="font-bold text-orange-600">Mingguan (W1-Wxx)</span>, serta{" "}
              <span className="font-bold text-indigo-600">Tahunan (Jan-Des)</span> dengan breakdown Day Shift (DS) & Night Shift (NS).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold shadow-2xs hover:shadow transition-all cursor-pointer"
            >
              <Key size={14} className="text-[#e95623]" />
              <span>Pengaturan Token</span>
            </button>

            {onNavigateToData && (
              <button
                onClick={onNavigateToData}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold shadow-2xs hover:shadow transition-all cursor-pointer"
              >
                <span>Lihat Data Tiket</span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              onClick={loadDailyProduction}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#e95623] hover:bg-[#d0491d] text-white text-xs font-black shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span>{isLoading ? "Memuat..." : "Segarkan"}</span>
            </button>
          </div>
        </div>

        {/* Filter Section: Jobsite & Filter Granularity */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
          {/* Jobsite Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-xs mr-1">
                <MapPin size={15} className="text-[#e95623]" />
                Pilih Jobsite:
              </span>

              <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedJobsite("all")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedJobsite === "all"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Semua Jobsite</span>
                  {selectedJobsite === "all" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedJobsite("senyiur")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedJobsite === "senyiur"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selectedJobsite === "senyiur" ? "bg-white" : "bg-emerald-500"}`} />
                  <span>Jobsite Senyiur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedJobsite("muara_pahu")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedJobsite === "muara_pahu"
                      ? "bg-[#e95623] text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-orange-700"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${selectedJobsite === "muara_pahu" ? "bg-white" : "bg-orange-500"}`} />
                  <span>Jobsite Muara Pahu</span>
                </button>
              </div>
            </div>

            {/* Current Active Jobsite Badge Indicator */}
            <div className="text-xs">
              <span className="text-slate-500 font-medium">Filter Jobsite: </span>
              <span className="font-extrabold text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                {selectedJobsite === "all"
                  ? "Semua Jobsite (Senyiur & Muara Pahu)"
                  : selectedJobsite === "senyiur"
                  ? "Jobsite Senyiur"
                  : "Jobsite Muara Pahu"}
              </span>
            </div>
          </div>

          {/* Granularity Selector & Contextual Filter Controls */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            {/* Granularity Switcher Tab */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-xs mr-1">
                  <Calendar size={14} className="text-[#e95623]" />
                  Tipe Filter:
                </span>

                <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                  {/* Option 1: Monthly Open Date (1-31) */}
                  <button
                    type="button"
                    onClick={() => handleFilterModeChange("monthly")}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterMode === "monthly"
                        ? "bg-white text-slate-900 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📅 Monthly Open Date (1 - 31)</span>
                  </button>

                  {/* Option 2: By Weekly (W1 - Wxx) */}
                  <button
                    type="button"
                    onClick={() => handleFilterModeChange("weekly")}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterMode === "weekly"
                        ? "bg-[#e95623] text-white shadow-xs font-black"
                        : "text-slate-600 hover:text-[#e95623]"
                    }`}
                  >
                    <span>📊 By Weekly (W1 - Wxx)</span>
                  </button>

                  {/* Option 3: Yearly (Jan - Dec) */}
                  <button
                    type="button"
                    onClick={() => handleFilterModeChange("yearly")}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterMode === "yearly"
                        ? "bg-indigo-600 text-white shadow-xs font-black"
                        : "text-slate-600 hover:text-indigo-600"
                    }`}
                  >
                    <span>📈 Yearly (Jan - Dec)</span>
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-xs text-slate-500 font-medium">
                {filterMode === "monthly" && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                    Tampilan Harian (1 - 31)
                  </span>
                )}
                {filterMode === "weekly" && (
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#e95623] border border-orange-200 font-bold">
                    Agregasi Mingguan: {chartData.length} Minggu (W1 - W{chartData.length})
                  </span>
                )}
                {filterMode === "yearly" && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    Agregasi Tahunan: 12 Bulan (Jan - Des {selectedYear})
                  </span>
                )}
              </div>
            </div>

            {/* Contextual Date Controls based on Active Filter Mode */}
            {filterMode === "monthly" && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wider mr-1">
                    Periode Tanggal:
                  </span>

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                    <span className="text-[11px] font-bold text-slate-500">Mulai:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <span className="text-slate-400 font-bold">s/d</span>

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                    <span className="text-[11px] font-bold text-slate-500">Sampai:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(`${defaultYear}-${defaultMonth}-01`);
                      setEndDate(`${defaultYear}-${defaultMonth}-${defaultDate}`);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-orange-50 text-[#e95623] border border-orange-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    Reset ke 01 s/d Hari Ini
                  </button>
                </div>

                {/* Quick Monthly Preset Buttons */}
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Bulan:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(`${defaultYear}-10-01`);
                      setEndDate(`${defaultYear}-10-31`);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      startDate === `${defaultYear}-10-01` && endDate === `${defaultYear}-10-31`
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Oktober (01 - 31)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(`${defaultYear}-11-01`);
                      setEndDate(`${defaultYear}-11-${defaultDate}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      startDate === `${defaultYear}-11-01` && endDate === `${defaultYear}-11-${defaultDate}`
                        ? "bg-[#e95623] text-white border-[#e95623]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    November (01 s/d Hari Ini)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(`${defaultYear}-11-01`);
                      setEndDate(`${defaultYear}-11-30`);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      startDate === `${defaultYear}-11-01` && endDate === `${defaultYear}-11-30`
                        ? "bg-[#e95623] text-white border-[#e95623]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    November Full (01 - 30)
                  </button>
                </div>
              </div>
            )}

            {filterMode === "weekly" && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-50/40 p-2.5 rounded-2xl border border-orange-200/70">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wider mr-1">
                    Pilihan Bulan Mingguan:
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWeeklyMonth(`${defaultYear}-11`);
                      setIsCustomWeeklyRange(false);
                      setStartDate(`${defaultYear}-11-01`);
                      setEndDate(`${defaultYear}-11-30`);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      selectedWeeklyMonth === `${defaultYear}-11` && !isCustomWeeklyRange
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50"
                    }`}
                  >
                    November 2026 (W1 - W5)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWeeklyMonth(`${defaultYear}-10`);
                      setIsCustomWeeklyRange(false);
                      setStartDate(`${defaultYear}-10-01`);
                      setEndDate(`${defaultYear}-10-31`);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      selectedWeeklyMonth === `${defaultYear}-10` && !isCustomWeeklyRange
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50"
                    }`}
                  >
                    Oktober 2026 (W1 - W5)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCustomWeeklyRange(!isCustomWeeklyRange)}
                    className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      isCustomWeeklyRange
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Kustom Rentang Tanggal</span>
                  </button>
                </div>

                {isCustomWeeklyRange && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-500">Mulai:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none"
                    />
                    <span className="text-slate-400 font-bold">s/d</span>
                    <span className="text-[11px] font-bold text-slate-500">Sampai:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {filterMode === "yearly" && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/40 p-2.5 rounded-2xl border border-indigo-200/70">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-indigo-950 uppercase tracking-wider mr-1">
                    Pilih Tahun:
                  </span>

                  <div className="flex items-center gap-1.5">
                    {[2026, 2025, 2024].map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setSelectedYear(year);
                          setStartDate(`${year}-01-01`);
                          setEndDate(`${year}-12-31`);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                          selectedYear === year
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50"
                        }`}
                      >
                        Tahun {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-indigo-900 font-semibold">
                  Menampilkan rekapitulasi operasional 12 bulan (Januari s/d Desember {selectedYear})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notice when Jobsite Senyiur is selected */}
      {selectedJobsite === "senyiur" && (
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <span className="font-extrabold block">Informasi Operasional Site Senyiur</span>
            <span className="text-amber-800/90 font-medium">
              Tidak ada aktivitas operasional hauling batubara di Jobsite Senyiur pada periode ini (Produksi 0 Ton). Seluruh aktivitas operasional berjalan aktif di Site Muara Pahu.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards: DS, NS, and Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Grand Total Tonase */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Scale size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filterMode === "yearly"
                ? `Tahun ${selectedYear}`
                : filterMode === "weekly"
                ? `W1 - W${chartData.length}`
                : "Month-to-Date"}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Total Tonase Produksi
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatNum(summary?.grandTotalTonase, 2)}{" "}
              <span className="text-sm font-bold text-slate-500">Ton</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Ritase:</span>
            <strong className="text-slate-900 font-extrabold">
              {summary?.grandTotalRitase?.toLocaleString("id-ID") || 0} Rit
            </strong>
          </div>

          {/* Quick Shift Breakdown */}
          {summary && summary.grandTotalTonase > 0 && (
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between font-medium">
              <span>
                DS: <strong className="text-amber-800">{formatNum(summary.totalTonaseDS, 0)} T</strong> (
                {Math.round((summary.totalTonaseDS / summary.grandTotalTonase) * 100)}%)
              </span>
              <span>
                NS: <strong className="text-indigo-800">{formatNum(summary.totalTonaseNS, 0)} T</strong> (
                {Math.round((summary.totalTonaseNS / summary.grandTotalTonase) * 100)}%)
              </span>
            </div>
          )}
        </div>

        {/* Speedometer Actual vs Plan Produksi */}
        <div className="sm:col-span-2 lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-xs">
                <Gauge size={20} className="text-[#e95623]" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  {filterMode === "yearly"
                    ? "Speedometer Produksi Tahunan"
                    : filterMode === "weekly"
                    ? "Speedometer Produksi Mingguan"
                    : "Speedometer Produksi Bulanan"}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {filterMode === "yearly"
                    ? `Actual Produksi vs Plan Tahunan (Muara Pahu ${selectedYear})`
                    : filterMode === "weekly"
                    ? `Actual Produksi vs Plan Mingguan (Muara Pahu W1 - W${chartData.length})`
                    : `Actual Produksi vs Plan Bulanan (Muara Pahu ${activeMonthLabel})`}
                </span>
              </div>
            </div>

            {/* Achievement Badge Status */}
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 shadow-2xs ${themeBadge}`}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
              <span>{rangeLabel}</span>
            </span>
          </div>

          {/* Main Content: Gauge + Stats */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Speedometer Gauge Visual */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center pt-1">
              <svg viewBox="0 0 240 135" className="w-full max-w-55 h-auto drop-shadow-xs">
                {/* Background Track */}
                <path
                  d="M 42 105 A 78 78 0 0 1 198 105"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Red Segment (0% - 95%) */}
                <path
                  d="M 42.05 102.28 A 78 78 0 0 1 162.48 39.58"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="13"
                  strokeLinecap="round"
                />

                {/* Yellow Segment (95% - 100%) */}
                <path
                  d="M 166.94 42.71 A 78 78 0 0 1 186.15 63.67"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="13"
                  strokeLinecap="round"
                />

                {/* Green Segment (100% - 120%+) */}
                <path
                  d="M 188.87 68.38 A 78 78 0 0 1 197.95 102.28"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="13"
                  strokeLinecap="round"
                />

                {/* Ticks and scale labels */}
                <text x="36" y="122" textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8">0%</text>
                <text x="166" y="27" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f59e0b">95%</text>
                <text x="195" y="56" textAnchor="start" fontSize="9.5" fontWeight="800" fill="#10b981">100%</text>

                {/* Needle Indicator */}
                <g className="transition-all duration-700 ease-out">
                  {/* Needle Body */}
                  <polygon
                    points={`${tipX},${tipY} ${baseLeftX},${baseLeftY} ${tailX},${tailY} ${baseRightX},${baseRightY}`}
                    fill={themeColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  {/* Needle Spine Line for High-End Dashboard Finish */}
                  <line
                    x1="120"
                    y1="105"
                    x2={tipX}
                    y2={tipY}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    opacity="0.85"
                    strokeLinecap="round"
                  />
                  {/* Needle Tip Indicator */}
                  <circle cx={tipX} cy={tipY} r="2.5" fill={themeColor} stroke="#ffffff" strokeWidth="0.8" />
                </g>

                {/* Center Hub */}
                <circle cx="120" cy="105" r="9" fill="#0f172a" />
                <circle cx="120" cy="105" r="6.5" fill={themeColor} />
                <circle cx="120" cy="105" r="2.5" fill="#ffffff" />

                {/* Percentage Readout */}
                <text x="120" y="128" textAnchor="middle" fontSize="13" fontWeight="900" fill="#0f172a">
                  {achievement.toFixed(1)}%
                </text>
              </svg>

              {/* Range Legend */}
              <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> &lt;95%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 95-99%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> &ge;100%
                </span>
              </div>
            </div>

            {/* Achievement KPI & Comparison Numbers */}
            <div className="sm:col-span-7 space-y-2.5">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Achievement Produksi
                  </span>
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight ${themeText}`}>
                    {achievement.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">Status Target</span>
                  <span className={`text-xs font-extrabold ${themeText}`}>
                    {statusText.split(" - ")[1] || statusText}
                  </span>
                </div>
              </div>

              {/* Metric Grid: Actual vs Target */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Actual Produksi
                  </span>
                  <strong className="text-sm font-black text-slate-900 font-mono block">
                    {formatNum(actualTonase, 1)}{" "}
                    <span className="text-[10px] font-semibold text-slate-500">Ton</span>
                  </strong>
                </div>

                <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-100">
                  <span className="text-[10px] font-bold text-orange-950 block uppercase">
                    {filterMode === "yearly"
                      ? `Plan Tahun ${selectedYear}`
                      : filterMode === "weekly"
                      ? "Plan Periode Mingguan"
                      : `Plan Bulanan (${activeMonthLabel})`}
                  </span>
                  <strong className="text-sm font-black text-orange-950 font-mono block">
                    {formatNum(activeTargetTonase, 0)}{" "}
                    <span className="text-[10px] font-semibold text-orange-900">Ton</span>
                  </strong>
                </div>
              </div>

              {/* Sisa Target / Surplus Banner */}
              <div className="pt-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 text-[11px]">
                  {diffTonase >= 0 ? "Surplus Produksi:" : "Sisa Target Periode:"}
                </span>
                <span
                  className={`font-mono text-xs font-extrabold ${
                    diffTonase >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {diffTonase >= 0
                    ? `+${formatNum(diffTonase, 1)}`
                    : `-${formatNum(Math.abs(diffTonase), 1)}`}{" "}
                  Ton
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Daily Average & Payload */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Rata-rata
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Rata-rata Tonase / Hari
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatNum(summary?.avgTonasePerDay, 2)}{" "}
              <span className="text-sm font-bold text-slate-500">Ton/Hari</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Rata-rata Muatan:</span>
            <strong className="text-emerald-700 font-extrabold">
              {formatNum(summary?.avgPayloadOverall, 1)} Ton/Rit
            </strong>
          </div>

          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-medium">
            <span>Target Plan Harian:</span>
            <span className="font-bold text-[#e95623]">
              {formatNum(planDailyTonase, 0)} Ton/Hari
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section: Produksi DS & NS */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-[#e95623]" />
              {filterMode === "yearly"
                ? `Grafik Produksi Bulanan per Shift (Januari s/d Desember ${selectedYear})`
                : filterMode === "weekly"
                ? `Grafik Produksi Mingguan per Shift (W1 s/d W${chartData.length})`
                : "Grafik Produksi Harian per Shift (Tanggal 01 s/d 31)"}
            </h2>
            <p className="text-xs text-slate-500">
              {filterMode === "yearly"
                ? "Perbandingan kontribusi Day Shift (DS) & Night Shift (NS) setiap bulan beserta garis tren dan target plan bulanan"
                : filterMode === "weekly"
                ? "Perbandingan kontribusi per minggu (W1-Wxx) beserta garis tren dan target plan mingguan"
                : "Perbandingan kontribusi Day Shift (DS), Night Shift (NS), Total Harian, serta Garis Tren produksi (berhenti H-1)"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Target Plan Badge */}
            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span>
                {filterMode === "yearly"
                  ? `Plan Tahunan: ${formatNum(activeTargetTonase, 0)} Ton`
                  : filterMode === "weekly"
                  ? `Plan Mingguan: ~${formatNum(chartData[0]?.planDailyTonase || 232129, 0)} Ton/W`
                  : `Plan ${activeMonthLabel}: ${formatNum(planMonthlyTonase, 0)} Ton (${formatNum(planDailyTonase, 0)} Ton/Hari)`}
              </span>
            </div>

            {/* Mode Stacked / Grouped */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setChartType("stacked")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === "stacked"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Bertumpuk
              </button>
              <button
                onClick={() => setChartType("grouped")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === "grouped"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Berdampingan
              </button>
            </div>

            {/* Toggle Garis Target Plan */}
            <button
              onClick={() => setShowPlanTonase(!showPlanTonase)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showPlanTonase
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan garis target Plan"
            >
              <span className={`w-2 h-2 rounded-full ${showPlanTonase ? "bg-[#10b981]" : "bg-slate-300"}`} />
              <span>
                Plan ({filterMode === "yearly" ? "Bulanan" : filterMode === "weekly" ? "Mingguan" : isNovMonth ? "33.2k" : "21.6k"})
              </span>
            </button>

            {/* Toggle Garis Tren Regresi */}
            <button
              onClick={() => setShowTrendLine(!showTrendLine)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showTrendLine
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan Garis Tren Regresi"
            >
              <TrendingUp size={13} className={showTrendLine ? "text-amber-500" : "text-slate-400"} />
              <span>Garis Tren</span>
            </button>

            {/* Toggle Label Angka Total di Bar */}
            <button
              onClick={() => setShowBarLabels(!showBarLabels)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showBarLabels
                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan angka total di atas setiap batang grafik"
            >
              <span>Label Angka</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs ml-auto sm:ml-0"
              title="Download Data CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-88 sm:h-96 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
              <RefreshCw size={18} className="animate-spin text-[#e95623]" />
              <span>Memuat grafik produksi...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Tidak ada data produksi pada periode yang dipilih.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 25, right: 15, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  domain={[
                    0,
                    (dataMax: number) => {
                      const fallback =
                        filterMode === "yearly"
                          ? 1200000
                          : filterMode === "weekly"
                          ? 280000
                          : 36000;
                      return Math.ceil(Math.max(dataMax || 1000, showPlanTonase ? fallback : 1000) * 1.15);
                    },
                  ]}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    return `${(val / 1000).toFixed(0)}k`;
                  }}
                />

                {/* Plan Reference Line */}
                {showPlanTonase && (
                  <ReferenceLine
                    y={
                      filterMode === "yearly"
                        ? planMonthlyTonase
                        : filterMode === "weekly"
                        ? chartData[0]?.planDailyTonase || 232129
                        : planDailyTonase
                    }
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value:
                        filterMode === "yearly"
                          ? `Plan Bulanan: ${formatNum(planMonthlyTonase, 0)} Ton`
                          : filterMode === "weekly"
                          ? `Plan Mingguan: ${formatNum(chartData[0]?.planDailyTonase || 232129, 0)} Ton/W`
                          : `Plan: ${formatNum(planDailyTonase, 0)} Ton/Hari`,
                      position: "insideTopLeft",
                      fill: "#059669",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                <Tooltip
                  content={(props: any) => {
                    const { active, payload } = props;
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as any;
                      const isToday = data.isToday;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-2 border border-slate-800 min-w-56 font-sans">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-extrabold text-slate-200">
                              {data.fullLabel || data.displayDate}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white animate-pulse">
                                {filterMode === "yearly" ? "Bulan Ini" : filterMode === "weekly" ? "Minggu Ini" : "Hari Ini"}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {/* Day Shift */}
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Day Shift (DS):
                              </span>
                              <strong className="font-mono">{formatNum(data.tonaseDS, 2)} Ton</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-3.5 flex justify-between">
                              <span>{data.ritaseDS?.toLocaleString("id-ID") || 0} Rit</span>
                              {data.avgPayloadDS > 0 && <span>{data.avgPayloadDS} T/rit</span>}
                            </div>

                            {/* Night Shift */}
                            <div className="flex items-center justify-between gap-4 pt-1">
                              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                Night Shift (NS):
                              </span>
                              <strong className="font-mono">{formatNum(data.tonaseNS, 2)} Ton</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-3.5 flex justify-between">
                              <span>{data.ritaseNS?.toLocaleString("id-ID") || 0} Rit</span>
                              {data.avgPayloadNS > 0 && <span>{data.avgPayloadNS} T/rit</span>}
                            </div>

                            {/* Total Produksi */}
                            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between gap-4 text-emerald-400 font-extrabold">
                              <span>
                                {filterMode === "yearly"
                                  ? "Total Bulanan:"
                                  : filterMode === "weekly"
                                  ? "Total Mingguan:"
                                  : "Total Harian:"}
                              </span>
                              <span className="font-mono text-sm">{formatNum(data.totalTonase, 2)} Ton</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-1 flex justify-between">
                              <span>Total Ritase: {data.totalRitase?.toLocaleString("id-ID") || 0} Rit</span>
                              {data.avgPayloadTotal > 0 && <span>{data.avgPayloadTotal} T/rit</span>}
                            </div>

                            {/* Garis Tren Regresi info */}
                            {data.trendLine !== null && data.trendLine !== undefined && (
                              <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between gap-4 text-amber-400 text-[11px] font-semibold">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-0.5 bg-amber-400" />
                                  Garis Tren:
                                </span>
                                <span className="font-mono">{formatNum(data.trendLine, 0)} Ton</span>
                              </div>
                            )}

                            {/* Target Plan */}
                            {showPlanTonase && (
                              <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between gap-4 text-emerald-400 text-[11px] font-semibold">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-0.5 bg-emerald-400" />
                                  Target Plan ({filterMode === "yearly" ? "Bulanan" : filterMode === "weekly" ? "Mingguan" : activeMonthLabel}):
                                </span>
                                <span className="font-mono">
                                  {formatNum(data.planDailyTonase, 0)} Ton
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                />

                {/* Bar Day Shift (DS) */}
                <Bar
                  name="Day Shift (DS)"
                  dataKey="tonaseDS"
                  fill="#f97316"
                  stackId={chartType === "stacked" ? "a" : undefined}
                  radius={chartType === "stacked" ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />

                {/* Bar Night Shift (NS) */}
                <Bar
                  name="Night Shift (NS)"
                  dataKey="tonaseNS"
                  fill="#6366f1"
                  stackId={chartType === "stacked" ? "a" : undefined}
                  radius={[6, 6, 0, 0]}
                />

                {/* Line Target Plan Produksi */}
                {showPlanTonase && (
                  <Line
                    name={
                      filterMode === "yearly"
                        ? "Plan Target (Bulanan)"
                        : filterMode === "weekly"
                        ? "Plan Target (Mingguan)"
                        : `Plan Target (${isNovMonth ? "33.2k" : "21.6k"} T/Hari)`
                    }
                    dataKey="planDailyTonase"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                )}

                {/* Line Garis Tren Regresi Linier */}
                {showTrendLine && (
                  <Line
                    name={
                      filterMode === "yearly"
                        ? "Garis Tren Bulanan"
                        : filterMode === "weekly"
                        ? "Garis Tren Mingguan"
                        : "Garis Tren (s/d Kemarin)"
                    }
                    dataKey="trendLine"
                    type="linear"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5, fill: "#f59e0b" }}
                    connectNulls={false}
                  />
                )}

                {/* Label Total di Atas Setiap Bar */}
                {showBarLabels && (
                  <Line
                    dataKey="totalTonase"
                    stroke="none"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                    isAnimationActive={false}
                    tooltipType="none"
                  >
                    <LabelList
                      dataKey="totalTonaseLabel"
                      position="top"
                      offset={8}
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        fill: "#0f172a",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                  </Line>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart Section: Trip per Unit */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Truck size={20} className="text-[#e95623]" />
              {filterMode === "yearly"
                ? `Monthly Trip per Unit (Januari s/d Desember ${selectedYear})`
                : filterMode === "weekly"
                ? `Weekly Trip per Unit (W1 s/d W${chartData.length})`
                : "Daily Trip per Unit"}
            </h2>
            <p className="text-xs text-slate-500">
              Monitoring ritase (#Ritase), armada aktif (Total Unit Running), target unit (Plan Unit Running: 25), dan efisiensi Actual Trip per Unit
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Summary Badges */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#86cbdc]" />
              <span>Plan Unit Running: 25</span>
            </div>

            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#f4c322]" />
              <span>Rata-rata Armada: {avgUnitRunning} Unit</span>
            </div>

            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold shadow-2xs"
              title="Rata-rata Actual Trip per Unit armada aktif"
            >
              <span className="w-2 h-2 rounded-full bg-[#7172ad]" />
              <span>Rata-rata: {avgActualTripPerUnit.toFixed(3)} Trip/Unit</span>
            </div>

            {/* Mode Toggle: Armada vs Shift (DS & NS) */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setTripViewMode("fleet")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tripViewMode === "fleet"
                    ? "bg-white text-blue-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {filterMode === "yearly" ? "Trip / Unit Bulanan" : filterMode === "weekly" ? "Trip / Unit Mingguan" : "Trip / Unit Harian"}
              </button>
              <button
                onClick={() => setTripViewMode("shift")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tripViewMode === "shift"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Per Shift (DS/NS)
              </button>
            </div>

            {tripViewMode === "fleet" ? (
              <>
                {/* Toggle Plan Unit Running */}
                <button
                  onClick={() => setShowPlanUnit(!showPlanUnit)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    showPlanUnit
                      ? "bg-cyan-50 text-cyan-900 border-cyan-300 shadow-2xs"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Tampilkan / sembunyikan garis Plan Unit Running"
                >
                  <span className={`w-2 h-2 rounded-full ${showPlanUnit ? "bg-[#86cbdc]" : "bg-slate-300"}`} />
                  <span>Plan Unit</span>
                </button>

                {/* Toggle Total Unit Running */}
                <button
                  onClick={() => setShowTotalUnit(!showTotalUnit)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    showTotalUnit
                      ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Tampilkan / sembunyikan garis Total Unit Running"
                >
                  <span className={`w-2 h-2 rounded-full ${showTotalUnit ? "bg-[#f4c322]" : "bg-slate-300"}`} />
                  <span>Total Unit</span>
                </button>

                {/* Toggle Actual Trip per Unit */}
                <button
                  onClick={() => setShowActualTrip(!showActualTrip)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    showActualTrip
                      ? "bg-purple-50 text-purple-900 border-purple-300 shadow-2xs"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Tampilkan / sembunyikan batang Actual Trip per Unit"
                >
                  <span className={`w-2 h-2 rounded-full ${showActualTrip ? "bg-[#7172ad]" : "bg-slate-300"}`} />
                  <span>Actual Trip</span>
                </button>
              </>
            ) : (
              <>
                {/* Mode Stacked / Grouped */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setTripChartType("stacked")}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tripChartType === "stacked"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Bertumpuk
                  </button>
                  <button
                    onClick={() => setTripChartType("grouped")}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tripChartType === "grouped"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Berdampingan
                  </button>
                </div>

                {/* Toggle Garis Tren Regresi */}
                <button
                  onClick={() => setShowTripTrendLine(!showTripTrendLine)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    showTripTrendLine
                      ? "bg-sky-50 text-sky-800 border-sky-300 shadow-2xs"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Tampilkan / sembunyikan Garis Tren Regresi Trip"
                >
                  <TrendingUp size={13} className={showTripTrendLine ? "text-sky-600" : "text-slate-400"} />
                  <span>Tren H-1</span>
                </button>
              </>
            )}

            {/* Toggle Label Angka Total di Bar */}
            <button
              onClick={() => setShowTripBarLabels(!showTripBarLabels)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showTripBarLabels
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Tampilkan / sembunyikan angka di atas setiap batang grafik"
            >
              <span>Label</span>
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-88 sm:h-96 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
              <RefreshCw size={18} className="animate-spin text-[#e95623]" />
              <span>Memuat grafik trip...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Tidak ada data ritase pada periode yang dipilih.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                barGap={1}
                barCategoryGap="25%"
                margin={{
                  top: 25,
                  right: 25,
                  left: 10,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortDateLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  dy={8}
                >
                  <Label
                    value={
                      filterMode === "yearly"
                        ? "Bulan Operasional (Jan - Des)"
                        : filterMode === "weekly"
                        ? "Periode Mingguan (W1 - Wxx)"
                        : "Reconciliation Date"
                    }
                    offset={-16}
                    position="insideBottom"
                    style={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                  />
                </XAxis>
                {/* Left Y-Axis: Actual Trip per Unit (0.000 s/d 3.000) */}
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    0,
                    (dataMax: number) =>
                      Math.max(3.0, Math.ceil((dataMax || 2.5) * 1.15 * 2) / 2),
                  ]}
                  tickCount={7}
                  tickFormatter={(val) => Number(val).toFixed(3)}
                />
                {/* Right Y-Axis: Ritase dan Units */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    0,
                    (dataMax: number) => {
                      const step = filterMode === "yearly" ? 500 : filterMode === "weekly" ? 200 : 30;
                      const minVal = filterMode === "yearly" ? 3000 : filterMode === "weekly" ? 1200 : 180;
                      return Math.max(minVal, Math.ceil((dataMax || 150) / step) * step);
                    },
                  ]}
                  tickCount={7}
                  tickFormatter={(val) => `${val}`}
                />

                <Tooltip
                  content={(props: any) => {
                    const { active, payload } = props;
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as any;
                      const isToday = data.isToday;
                      return (
                        <div className="bg-[#1e293b]/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl text-xs space-y-2.5 border border-slate-700/80 min-w-60 font-sans">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-base">
                                {data.shortDateLabel}
                              </span>
                              <span className="text-[11px] text-slate-300 font-medium">
                                {filterMode === "weekly" && data.dateRangeLabel
                                  ? `(${data.dateRangeLabel})`
                                  : data.fullLabel
                                  ? `(${data.fullLabel})`
                                  : `(${data.dayName})`}
                              </span>
                            </div>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white animate-pulse">
                                {filterMode === "yearly" ? "Bulan Ini" : filterMode === "weekly" ? "Minggu Ini" : "Hari Ini"}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 py-0.5">
                            {/* 1. Plan Unit Running */}
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-2 text-[#86cbdc] font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#86cbdc] ring-2 ring-[#86cbdc]/30" />
                                Plan Unit Running
                              </span>
                              <strong className="font-mono text-cyan-200 text-sm font-black">
                                {data.planUnitRunning ?? 25}
                              </strong>
                            </div>

                            {/* 2. Actual Trip per Unit */}
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-2 text-indigo-300 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#7172ad] ring-2 ring-indigo-400/20" />
                                Actual Trip per Unit
                              </span>
                              <strong className="font-mono text-indigo-200 text-sm font-black">
                                {typeof data.actualTripPerUnit === "number"
                                  ? data.actualTripPerUnit.toFixed(3)
                                  : "0.000"}
                              </strong>
                            </div>

                            {/* 3. #Ritase */}
                            <div className="flex items-center justify-between gap-4 bg-blue-500/15 px-2.5 py-1 rounded-lg border border-blue-500/30">
                              <span className="flex items-center gap-2 text-blue-300 font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#509ee3] ring-2 ring-blue-400/30" />
                                #Ritase
                              </span>
                              <strong className="font-mono text-white text-base font-black">
                                {data.totalRitase?.toLocaleString("id-ID") || 0}
                              </strong>
                            </div>

                            {/* 4. Total Unit Running */}
                            <div className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-2 text-[#f4c322] font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#f4c322] ring-2 ring-[#f4c322]/30" />
                                Total Unit Running
                              </span>
                              <strong className="font-mono text-amber-200 text-sm font-black">
                                {data.totalUnitRunning || 0}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="left"
                  iconType="circle"
                  wrapperStyle={{
                    paddingBottom: "16px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />

                {tripViewMode === "fleet" ? (
                  <>
                    {/* 1. Line Plan Unit Running (Cyan) */}
                    {showPlanUnit && (
                      <Line
                        yAxisId="right"
                        name="Plan Unit Running"
                        dataKey="planUnitRunning"
                        type="stepAfter"
                        stroke="#86cbdc"
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: "#86cbdc", strokeWidth: 1.5, stroke: "#ffffff" }}
                        activeDot={{ r: 5, fill: "#86cbdc" }}
                      >
                        {showTripBarLabels && (
                          <LabelList
                            dataKey="planUnitLabel"
                            position="top"
                            offset={6}
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              fill: "#0e7490",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          />
                        )}
                      </Line>
                    )}

                    {/* 2. Bar Actual Trip per Unit (Violet/Purple - Sumbu Kiri) */}
                    {showActualTrip && (
                      <Bar
                        yAxisId="left"
                        name="Actual Trip per Unit"
                        dataKey="actualTripPerUnit"
                        fill="#7172ad"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={56}
                      >
                        {showTripBarLabels && (
                          <LabelList
                            dataKey="actualTripFormatted"
                            position="top"
                            offset={6}
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 700,
                              fill: "#334155",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          />
                        )}
                      </Bar>
                    )}

                    {/* 3. Bar #Ritase (Blue - Sumbu Kanan) */}
                    <Bar
                      yAxisId="right"
                      name="#Ritase"
                      dataKey="totalRitase"
                      fill="#509ee3"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={56}
                    >
                      {showTripBarLabels && (
                        <LabelList
                          dataKey="totalRitaseLabel"
                          position="top"
                          offset={6}
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            fill: "#334155",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        />
                      )}
                    </Bar>

                    {/* 4. Line Total Unit Running (Yellow/Gold - Sumbu Kanan) */}
                    {showTotalUnit && (
                      <Line
                        yAxisId="right"
                        name="Total Unit Running"
                        dataKey="totalUnitRunning"
                        type="monotone"
                        stroke="#f4c322"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#f4c322", strokeWidth: 1.5, stroke: "#ffffff" }}
                        activeDot={{ r: 6, fill: "#f4c322" }}
                      >
                        {showTripBarLabels && (
                          <LabelList
                            dataKey="totalUnitLabel"
                            position="top"
                            offset={8}
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 700,
                              fill: "#b45309",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          />
                        )}
                      </Line>
                    )}
                  </>
                ) : (
                  <>
                    {/* Bar Day Shift (DS) */}
                    <Bar
                      yAxisId="left"
                      name="Day Shift (DS)"
                      dataKey="ritaseDS"
                      fill="#f97316"
                      stackId={tripChartType === "stacked" ? "a" : undefined}
                      radius={tripChartType === "stacked" ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                    />

                    {/* Bar Night Shift (NS) */}
                    <Bar
                      yAxisId="left"
                      name="Night Shift (NS)"
                      dataKey="ritaseNS"
                      fill="#6366f1"
                      stackId={tripChartType === "stacked" ? "a" : undefined}
                      radius={[6, 6, 0, 0]}
                    />

                    {/* Line Garis Tren Regresi Linier Trip */}
                    {showTripTrendLine && (
                      <Line
                        yAxisId="left"
                        name="Garis Tren Trip (s/d Kemarin)"
                        dataKey="trendLineTrip"
                        type="linear"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 5, fill: "#0284c7" }}
                        connectNulls={false}
                      />
                    )}

                    {/* Label Total Trip di Atas Setiap Bar */}
                    {showTripBarLabels && (
                      <Line
                        yAxisId="left"
                        dataKey="totalRitase"
                        stroke="none"
                        dot={false}
                        activeDot={false}
                        legendType="none"
                        isAnimationActive={false}
                        tooltipType="none"
                      >
                        <LabelList
                          dataKey="totalRitaseLabel"
                          position="top"
                          offset={8}
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 800,
                            fill: "#475569",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        />
                      </Line>
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: TOP 5 PERFORMING & TOP 5 LOWEST PRODUCTION UNITS                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
        {/* Header with Title, Controls, and Metrics */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Kinerja Armada: Top 5 & Lowest 5 Unit Produksi
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
                    <Truck size={12} />
                    62 Unit Fleet Hauling
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Monitoring komparasi Top 5 Unit Performing Production vs Top 5 Unit Lowest Production periode{" "}
                  <strong className="text-slate-700">
                    {filterMode === "yearly"
                      ? `Tahun ${selectedYear}`
                      : filterMode === "weekly"
                      ? `Mingguan (${startDate} s/d ${endDate})`
                      : activeMonthFullName}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Metric Sort Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Urutkan:</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setUnitMetricFilter("tonase")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  unitMetricFilter === "tonase"
                    ? "bg-white text-orange-950 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Total Tonase (Ton)
              </button>
              <button
                onClick={() => setUnitMetricFilter("ritase")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  unitMetricFilter === "ritase"
                    ? "bg-white text-orange-950 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Total Ritase (#Trip)
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Left Top 5 vs Right Lowest 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ========================================================= */}
          {/* COLUMN 1: TOP 5 UNIT PERFORMING PRODUCTION               */}
          {/* ========================================================= */}
          <div className="bg-linear-to-b from-emerald-50/40 via-white to-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      Top 5 Unit Performing Production
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Unit dengan tonase & ritase tertinggi (utilisasi dual-shift optimal)
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  HIGH PERFORMERS
                </span>
              </div>

              {/* Units List */}
              <div className="space-y-3">
                {activeTopUnits.map((unit, idx) => {
                  const tonPct = maxTopTonase > 0 ? (unit.totalTonase / maxTopTonase) * 100 : 100;
                  const rankBadgeClass =
                    idx === 0
                      ? "bg-linear-to-br from-amber-400 to-amber-500 text-slate-950 ring-2 ring-amber-300"
                      : idx === 1
                      ? "bg-linear-to-br from-slate-200 to-slate-300 text-slate-800 ring-2 ring-slate-200"
                      : idx === 2
                      ? "bg-linear-to-br from-amber-700 to-amber-800 text-white ring-2 ring-amber-600/40"
                      : "bg-slate-100 text-slate-700 border border-slate-200";

                  return (
                    <div
                      key={unit.unitCode}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-xs transition-all space-y-2.5"
                    >
                      {/* Top Row: Rank, Unit Code, Model, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankBadgeClass}`}
                          >
                            #{unit.rank || idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                              {unit.unitCode}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium block">
                              {unit.model || "Volvo FH16 (Double Trailer)"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles size={11} className="text-emerald-600" />
                            {unit.status || "Optimal"}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                            {unit.avgTripPerDay} Trip/Hari
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Metrics Grid */}
                      <div className="grid grid-cols-4 gap-2 pt-1 text-center bg-slate-50/80 rounded-xl p-2 border border-slate-100">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Total Tonase</span>
                          <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                            {formatNum(unit.totalTonase, 1)} <span className="text-[10px] font-normal text-slate-500">Ton</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Total Ritase</span>
                          <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                            {unit.totalRitase} <span className="text-[10px] font-normal text-slate-500">Trip</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Shift (DS/NS)</span>
                          <span className="font-mono font-semibold text-slate-600 text-xs">
                            {unit.ritaseDS} / {unit.ritaseNS}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Avg Payload</span>
                          <span className="font-mono font-bold text-indigo-700 text-xs">
                            {formatNum(unit.avgPayload, 1)} <span className="text-[9px] font-normal text-slate-400">T/Rit</span>
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Progress Relative to Leader & Notes */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 italic truncate max-w-60">
                            {unit.notes || "Operasional hauling optimal tanpa kendala teknis"}
                          </span>
                          <span className="font-mono font-bold text-emerald-700 shrink-0">
                            {tonPct.toFixed(1)}% Benchmark
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(15, tonPct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column Summary Footer */}
            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Total Kontribusi Top 5:
              </span>
              <span className="font-mono font-black text-emerald-800">
                {formatNum(
                  activeTopUnits.reduce((acc, u) => acc + u.totalTonase, 0),
                  1
                )}{" "}
                Ton (
                {(
                  (activeTopUnits.reduce((acc, u) => acc + u.totalTonase, 0) /
                    (summary?.grandTotalTonase || 1)) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: TOP 5 UNIT LOWEST PRODUCTION                   */}
          {/* ========================================================= */}
          <div className="bg-linear-to-b from-rose-50/40 via-white to-white rounded-2xl border border-rose-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      Top 5 Unit Lowest Production
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Unit dengan tonase & ritase terendah (indikasi perbaikan, standby, atau jadwal PI)
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  NEEDS ATTENTION
                </span>
              </div>

              {/* Units List */}
              <div className="space-y-3">
                {activeLowestUnits.map((unit, idx) => {
                  const tonPctOfAvg =
                    fleetAvgTonase > 0 ? (unit.totalTonase / fleetAvgTonase) * 100 : 30;
                  const rankBadgeClass =
                    idx === 0
                      ? "bg-rose-600 text-white ring-2 ring-rose-300"
                      : idx === 1
                      ? "bg-rose-500 text-white ring-2 ring-rose-200"
                      : idx === 2
                      ? "bg-amber-600 text-white ring-2 ring-amber-300"
                      : "bg-amber-500 text-white border border-amber-200";

                  return (
                    <div
                      key={unit.unitCode}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-rose-300 hover:shadow-xs transition-all space-y-2.5"
                    >
                      {/* Top Row: Rank, Unit Code, Model, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankBadgeClass}`}
                          >
                            #{unit.rank || idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                              {unit.unitCode}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium block">
                              {unit.model || "Volvo FH16 (Double Trailer)"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              unit.status === "Underperforming"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <Wrench size={11} />
                            {unit.status || "Needs Attention"}
                          </span>
                          <span className="text-[10px] text-rose-600 block mt-0.5 font-semibold">
                            {unit.avgTripPerDay} Trip/Hari
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Metrics Grid */}
                      <div className="grid grid-cols-4 gap-2 pt-1 text-center bg-slate-50/80 rounded-xl p-2 border border-slate-100">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Total Tonase</span>
                          <span className="font-mono font-black text-rose-600 text-xs sm:text-sm">
                            {formatNum(unit.totalTonase, 1)} <span className="text-[10px] font-normal text-slate-500">Ton</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Total Ritase</span>
                          <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                            {unit.totalRitase} <span className="text-[10px] font-normal text-slate-500">Trip</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Shift (DS/NS)</span>
                          <span className="font-mono font-semibold text-slate-600 text-xs">
                            {unit.ritaseDS} / {unit.ritaseNS}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Avg Payload</span>
                          <span className="font-mono font-bold text-slate-700 text-xs">
                            {formatNum(unit.avgPayload, 1)} <span className="text-[9px] font-normal text-slate-400">T/Rit</span>
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Progress Relative to Fleet Average & Cause */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-rose-600/90 font-medium truncate max-w-60">
                            {unit.notes || "Perlu pengecekan ketersediaan armada & sparepart"}
                          </span>
                          <span className="font-mono font-bold text-rose-600 shrink-0">
                            {tonPctOfAvg.toFixed(1)}% Rata-rata Fleet
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(10, tonPctOfAvg))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column Summary Footer */}
            <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs text-rose-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-600" />
                Total Produksi Lowest 5:
              </span>
              <span className="font-mono font-black text-rose-800">
                {formatNum(
                  activeLowestUnits.reduce((acc, u) => acc + u.totalTonase, 0),
                  1
                )}{" "}
                Ton (
                {(
                  (activeLowestUnits.reduce((acc, u) => acc + u.totalTonase, 0) /
                    (summary?.grandTotalTonase || 1)) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </div>
          </div>
        </div>

        {/* Operational Intelligence Footer Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Gap Produksi Top #1 vs Low #1</span>
              <strong className="font-mono text-slate-900 font-black text-sm">
                +{formatNum((activeTopUnits[0]?.totalTonase || 0) - (activeLowestUnits[0]?.totalTonase || 0), 1)} Ton
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Rata-rata Ritase Fleet</span>
              <strong className="font-mono text-slate-900 font-black text-sm">
                {avgActualTripPerUnit.toFixed(3)} Trip/Unit
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Rata-rata Muatan (Payload)</span>
              <strong className="font-mono text-slate-900 font-black text-sm">
                {formatNum(summary?.avgPayloadOverall, 1)} Ton / Rit
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Wrench size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Tindak Lanjut Plant</span>
              <span className="text-slate-600 font-medium text-[11px] block leading-tight">
                Prioritaskan inspeksi berkala pada unit #{activeLowestUnits[0]?.unitCode || "PM468"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AssetFindr Token Modal */}
      <AssetFindrTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onTokenUpdated={loadDailyProduction}
      />
    </div>
  );
};
