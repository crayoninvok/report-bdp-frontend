"use client";

import React, { useState, useMemo, useEffect } from "react";
import { User, JobSite } from "../types/auth";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Building2,
  DollarSign,
  Fuel,
  Disc,
  Wrench,
  Users,
  Search,
  Filter,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  Sliders,
  Calendar,
  X,
  BarChart3,
  FileDown,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from "recharts";
import {
  RAW_MONTHLY_SENYIUR,
  RAW_MONTHLY_MUARAPAHU,
  RAW_WEEKLY_SENYIUR,
  RAW_WEEKLY_MUARAPAHU,
  FullPeriodRecord,
  formatYAxisTick,
  computeYTDDataset,
} from "./CostTrendCharts";
import { CostDriverPdfExportModal } from "./CostDriverPdfExportModal";
import { reportService } from "../services/reportService";

// =========================================================================
// DEFINISI KATEGORI BEBAN UTAMA
// =========================================================================
export type BebanGroupKey = "comp" | "fuel" | "tyre" | "rep" | "ovh" | "sub";

export const TOP5_BEBAN_META: Record<
  BebanGroupKey,
  { label: string; shortLabel: string; color: string; lightBg: string; borderCol: string; textCol: string }
> = {
  comp: {
    label: "Beban Gaji, Incentive dan Benefit Karyawan",
    shortLabel: "Gaji & Benefit",
    color: "#059669",
    lightBg: "bg-emerald-50",
    borderCol: "border-emerald-200",
    textCol: "text-emerald-700",
  },
  fuel: {
    label: "Beban Fuel (Solar Production)",
    shortLabel: "Fuel Solar",
    color: "#D97706",
    lightBg: "bg-amber-50",
    borderCol: "border-amber-200",
    textCol: "text-amber-700",
  },
  tyre: {
    label: "Beban Tyre (Ban Alat Berat)",
    shortLabel: "Tyre (Ban)",
    color: "#7C3AED",
    lightBg: "bg-purple-50",
    borderCol: "border-purple-200",
    textCol: "text-purple-700",
  },
  rep: {
    label: "Beban Repair & Maintenance",
    shortLabel: "Repair & Maint",
    color: "#18bebc",
    lightBg: "bg-batara-teal-50",
    borderCol: "border-batara-teal-100",
    textCol: "text-[#0e9f9d]",
  },
  ovh: {
    label: "Beban Overhead Cost - Site",
    shortLabel: "Overhead Cost",
    color: "#E11D48",
    lightBg: "bg-rose-50",
    borderCol: "border-rose-200",
    textCol: "text-rose-700",
  },
  sub: {
    label: "Beban Subkontraktor & Rental",
    shortLabel: "Subkontraktor",
    color: "#2563EB",
    lightBg: "bg-blue-50",
    borderCol: "border-blue-200",
    textCol: "text-blue-700",
  },
};

export interface CostDriverItem {
  id: string;
  rank?: number;
  name: string;
  bebanKey: BebanGroupKey;
  bebanLabel: string;
  accountCode: string;
  accountName: string;
  costBehavior: "VC" | "FC";
  budgetCost: number; // Juta Rupiah (M)
  realisasiCost: number; // Juta Rupiah (M)
  varianceCost: number; // Deviasi: Positif = Over Budget, Negatif = Efisien
  variancePercent: number; // % deviasi
  serapanPercent: number; // % serapan realisasi terhadap budget
  status: "critical" | "warning" | "efficiency";
  trend: "worsening" | "stable" | "improving";
}

interface CostDriverViewProps {
  user: User;
}

export const CostDriverView: React.FC<CostDriverViewProps> = ({ user }) => {
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const defaultSite: JobSite = !isHeadOffice ? user.jobSite : "Senyiur";

  // Filter Utama: Site, Timeframe & Periode Spesifik
  const [selectedSite, setSelectedSite] = useState<JobSite | "AllSites">(defaultSite);
  const [timeframe, setTimeframe] = useState<"month" | "week" | "ytd">("ytd");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Filter Direktori & Chart
  const [activeBebanFilter, setActiveBebanFilter] = useState<string>("all");
  const [activeBehaviorFilter, setActiveBehaviorFilter] = useState<string>("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDriverDetail, setSelectedDriverDetail] = useState<CostDriverItem | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Chart Mode
  const [top5ChartMode, setTop5ChartMode] = useState<"comparison" | "trend">("comparison");
  const [activeTop5Beban, setActiveTop5Beban] = useState<BebanGroupKey | "all">("all");

  // Reset periode spesifik jika timeframe berganti
  const handleTimeframeChange = (newTf: "month" | "week" | "ytd") => {
    setTimeframe(newTf);
    setSelectedPeriod("all");
  };

  // Dynamic Weekly Trends from Backend
  const [dynamicWeekly, setDynamicWeekly] = useState<{
    Senyiur: { weekly: FullPeriodRecord[]; monthly?: FullPeriodRecord[] };
    MuaraPahu: { weekly: FullPeriodRecord[]; monthly?: FullPeriodRecord[] };
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    reportService
      .getCostTrends(undefined, 2026)
      .then((data) => {
        if (isMounted && data) {
          setDynamicWeekly(data);
        }
      })
      .catch((err) => {
        console.warn("Using static fallback for cost driver trends:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const weeklySenyiur = useMemo(() => {
    if (dynamicWeekly?.Senyiur?.weekly?.length) return dynamicWeekly.Senyiur.weekly;
    return RAW_WEEKLY_SENYIUR;
  }, [dynamicWeekly]);

  const weeklyMuaraPahu = useMemo(() => {
    if (dynamicWeekly?.MuaraPahu?.weekly?.length) return dynamicWeekly.MuaraPahu.weekly;
    return RAW_WEEKLY_MUARAPAHU;
  }, [dynamicWeekly]);

  const monthlySenyiur = useMemo(() => {
    if (dynamicWeekly?.Senyiur?.monthly?.length) return dynamicWeekly.Senyiur.monthly;
    return RAW_MONTHLY_SENYIUR;
  }, [dynamicWeekly]);

  const monthlyMuaraPahu = useMemo(() => {
    if (dynamicWeekly?.MuaraPahu?.monthly?.length) return dynamicWeekly.MuaraPahu.monthly;
    return RAW_MONTHLY_MUARAPAHU;
  }, [dynamicWeekly]);

  // 1. DATASET DASAR (Sesuai Site & Timeframe yang dipilih)
  const baseDataset: FullPeriodRecord[] = useMemo(() => {
    if (selectedSite === "Senyiur") {
      if (timeframe === "ytd") return computeYTDDataset(monthlySenyiur);
      if (timeframe === "month") return monthlySenyiur;
      return weeklySenyiur;
    }

    if (selectedSite === "MuaraPahu") {
      if (timeframe === "ytd") return computeYTDDataset(monthlyMuaraPahu);
      if (timeframe === "month") return monthlyMuaraPahu;
      return weeklyMuaraPahu;
    }

    // Konsolidasi: Gabungan Senyiur + Muara Pahu
    if (timeframe === "ytd") {
      const combinedMonthly = monthlySenyiur.map((sRec, idx) => {
        const mRec = monthlyMuaraPahu[idx] || {
          label: sRec.label,
          total: { budget: 0, realisasi: 0, deviasi: 0 },
          comp: { budget: 0, realisasi: 0, deviasi: 0 },
          fuel: { budget: 0, realisasi: 0, deviasi: 0 },
          tyre: { budget: 0, realisasi: 0, deviasi: 0 },
          rep: { budget: 0, realisasi: 0, deviasi: 0 },
          ovh: { budget: 0, realisasi: 0, deviasi: 0 },
        };
        const sumCost = (k: "total" | "comp" | "fuel" | "tyre" | "rep" | "ovh") => ({
          budget: sRec[k].budget + mRec[k].budget,
          realisasi: sRec[k].realisasi + mRec[k].realisasi,
          deviasi: sRec[k].deviasi + mRec[k].deviasi,
        });
        return {
          label: sRec.label,
          total: sumCost("total"),
          comp: sumCost("comp"),
          fuel: sumCost("fuel"),
          tyre: sumCost("tyre"),
          rep: sumCost("rep"),
          ovh: sumCost("ovh"),
        };
      });
      return computeYTDDataset(combinedMonthly);
    }

    if (timeframe === "month") {
      return monthlySenyiur.map((sRec, idx) => {
        const mRec = monthlyMuaraPahu[idx] || {
          label: sRec.label,
          total: { budget: 0, realisasi: 0, deviasi: 0 },
          comp: { budget: 0, realisasi: 0, deviasi: 0 },
          fuel: { budget: 0, realisasi: 0, deviasi: 0 },
          tyre: { budget: 0, realisasi: 0, deviasi: 0 },
          rep: { budget: 0, realisasi: 0, deviasi: 0 },
          ovh: { budget: 0, realisasi: 0, deviasi: 0 },
        };
        const sumCost = (k: "total" | "comp" | "fuel" | "tyre" | "rep" | "ovh") => ({
          budget: sRec[k].budget + mRec[k].budget,
          realisasi: sRec[k].realisasi + mRec[k].realisasi,
          deviasi: sRec[k].deviasi + mRec[k].deviasi,
        });
        return {
          label: sRec.label,
          total: sumCost("total"),
          comp: sumCost("comp"),
          fuel: sumCost("fuel"),
          tyre: sumCost("tyre"),
          rep: sumCost("rep"),
          ovh: sumCost("ovh"),
        };
      });
    }

    // Konsolidasi Mingguan
    return weeklySenyiur.map((sRec, idx) => {
      const mRec = weeklyMuaraPahu[idx] || {
        label: sRec.label,
        total: { budget: 0, realisasi: 0, deviasi: 0 },
        comp: { budget: 0, realisasi: 0, deviasi: 0 },
        fuel: { budget: 0, realisasi: 0, deviasi: 0 },
        tyre: { budget: 0, realisasi: 0, deviasi: 0 },
        rep: { budget: 0, realisasi: 0, deviasi: 0 },
        ovh: { budget: 0, realisasi: 0, deviasi: 0 },
      };
      const sumCost = (k: "total" | "comp" | "fuel" | "tyre" | "rep" | "ovh") => ({
        budget: sRec[k].budget + mRec[k].budget,
        realisasi: sRec[k].realisasi + mRec[k].realisasi,
        deviasi: sRec[k].deviasi + mRec[k].deviasi,
      });
      return {
        label: sRec.label,
        total: sumCost("total"),
        comp: sumCost("comp"),
        fuel: sumCost("fuel"),
        tyre: sumCost("tyre"),
        rep: sumCost("rep"),
        ovh: sumCost("ovh"),
      };
    });
  }, [selectedSite, timeframe, weeklySenyiur, weeklyMuaraPahu]);

  // 2. DATASET AKTIF BERDASARKAN FILTER PERIODE SPESIFIK
  const activeDataset: FullPeriodRecord[] = useMemo(() => {
    if (selectedPeriod === "all") return baseDataset;
    return baseDataset.filter((item) => item.label === selectedPeriod);
  }, [baseDataset, selectedPeriod]);

  // 3. TOTAL FINANSIAL PER KATEGORI BEBAN (SINKRON DENGAN DASHBOARD UTAMA)
  const categorySums = useMemo(() => {
    const sums: Record<
      "total" | "comp" | "fuel" | "tyre" | "rep" | "ovh",
      { budget: number; realisasi: number; variance: number; variancePercent: number; serapanPercent: number }
    > = {
      total: { budget: 0, realisasi: 0, variance: 0, variancePercent: 0, serapanPercent: 0 },
      comp: { budget: 0, realisasi: 0, variance: 0, variancePercent: 0, serapanPercent: 0 },
      fuel: { budget: 0, realisasi: 0, variance: 0, variancePercent: 0, serapanPercent: 0 },
      tyre: { budget: 0, realisasi: 0, variance: 0, variancePercent: 0, serapanPercent: 0 },
      rep: { budget: 0, realisasi: 0, variance: 0, variancePercent: 0, serapanPercent: 0 },
      ovh: { budget: 0, realisasi: 0, variance: 0, variancePercent: 0, serapanPercent: 0 },
    };

    const keys: Array<"total" | "comp" | "fuel" | "tyre" | "rep" | "ovh"> = [
      "total",
      "comp",
      "fuel",
      "tyre",
      "rep",
      "ovh",
    ];

    if (timeframe === "ytd" && selectedPeriod === "all") {
      // Untuk mode YTD akumulatif keseluruhan, ambil posisi record kumulatif terakhir (per tanggal hari ini / input terakhir)
      const last = baseDataset[baseDataset.length - 1];
      keys.forEach((k) => {
        const b = last ? last[k].budget : 0;
        const r = last ? last[k].realisasi : 0;
        const v = r - b;
        const vPct = b > 0 ? (v / b) * 100 : 0;
        const sPct = b > 0 ? (r / b) * 100 : 0;
        sums[k] = {
          budget: b,
          realisasi: r,
          variance: v,
          variancePercent: Number(vPct.toFixed(1)),
          serapanPercent: Number(sPct.toFixed(1)),
        };
      });
      return sums;
    }

    // Untuk Bulanan, Mingguan, atau periode spesifik: jumlahkan seluruh baris dalam activeDataset
    keys.forEach((k) => {
      let b = 0;
      let r = 0;
      activeDataset.forEach((row) => {
        b += row[k].budget;
        r += row[k].realisasi;
      });
      const v = r - b;
      const vPct = b > 0 ? (v / b) * 100 : 0;
      const sPct = b > 0 ? (r / b) * 100 : 0;
      sums[k] = {
        budget: b,
        realisasi: r,
        variance: v,
        variancePercent: Number(vPct.toFixed(1)),
        serapanPercent: Number(sPct.toFixed(1)),
      };
    });

    return sums;
  }, [baseDataset, activeDataset, timeframe, selectedPeriod]);

  // 4. DAFTAR MASTER COST DRIVER
  const rawDrivers: CostDriverItem[] = useMemo(() => {
    return [
      {
        id: `${selectedSite}-comp-1`,
        name: "05110101 - BEBAN GAJI, INCENTIVE DAN BENEFIT KARYAWAN",
        bebanKey: "comp",
        bebanLabel: "Beban Gaji, Incentive dan Benefit Karyawan",
        accountCode: "05110101",
        accountName: "BEBAN GAJI, INCENTIVE DAN BENEFIT KARYAWAN",
        costBehavior: "VC",
        budgetCost: categorySums.comp.budget,
        realisasiCost: categorySums.comp.realisasi,
        varianceCost: categorySums.comp.variance,
        variancePercent: categorySums.comp.variancePercent,
        serapanPercent: categorySums.comp.serapanPercent,
        status:
          categorySums.comp.variance > 500
            ? "critical"
            : categorySums.comp.variance > 0
            ? "warning"
            : "efficiency",
        trend: categorySums.comp.variance > 0 ? "worsening" : "improving",
      },
      {
        id: `${selectedSite}-fuel-1`,
        name: "05110201 - BEBAN FUEL - PRODUCTION",
        bebanKey: "fuel",
        bebanLabel: "Beban Fuel (Solar Production)",
        accountCode: "05110201",
        accountName: "BEBAN FUEL - PRODUCTION",
        costBehavior: "VC",
        budgetCost: categorySums.fuel.budget,
        realisasiCost: categorySums.fuel.realisasi,
        varianceCost: categorySums.fuel.variance,
        variancePercent: categorySums.fuel.variancePercent,
        serapanPercent: categorySums.fuel.serapanPercent,
        status:
          categorySums.fuel.variance > 500
            ? "critical"
            : categorySums.fuel.variance > 0
            ? "warning"
            : "efficiency",
        trend: categorySums.fuel.variance > 0 ? "worsening" : "improving",
      },
      {
        id: `${selectedSite}-tyre-1`,
        name: "05110203 - BEBAN TYRE & RIM",
        bebanKey: "tyre",
        bebanLabel: "Beban Tyre (Ban Alat Berat)",
        accountCode: "05110203",
        accountName: "BEBAN TYRE & RIM",
        costBehavior: "VC",
        budgetCost: categorySums.tyre.budget,
        realisasiCost: categorySums.tyre.realisasi,
        varianceCost: categorySums.tyre.variance,
        variancePercent: categorySums.tyre.variancePercent,
        serapanPercent: categorySums.tyre.serapanPercent,
        status:
          categorySums.tyre.variance > 500
            ? "critical"
            : categorySums.tyre.variance > 0
            ? "warning"
            : "efficiency",
        trend: categorySums.tyre.variance > 0 ? "worsening" : "improving",
      },
      {
        id: `${selectedSite}-ovh-1`,
        name: "05110401 - RENTAL ALAT NON PRODUKSI & KANTOR SITE",
        bebanKey: "ovh",
        bebanLabel: "Beban Overhead Cost - Site",
        accountCode: "05110401",
        accountName: "RENTAL ALAT NON PRODUKSI & KANTOR SITE",
        costBehavior: "FC",
        budgetCost: categorySums.ovh.budget,
        realisasiCost: categorySums.ovh.realisasi,
        varianceCost: categorySums.ovh.variance,
        variancePercent: categorySums.ovh.variancePercent,
        serapanPercent: categorySums.ovh.serapanPercent,
        status:
          categorySums.ovh.variance > 300
            ? "critical"
            : categorySums.ovh.variance > 0
            ? "warning"
            : "efficiency",
        trend: categorySums.ovh.variance > 0 ? "worsening" : "improving",
      },
      {
        id: `${selectedSite}-rep-1`,
        name: "05110301 - BEBAN SPAREPART & SERVICE EKSTERNAL",
        bebanKey: "rep",
        bebanLabel: "Beban Repair & Maintenance",
        accountCode: "05110301",
        accountName: "BEBAN SPAREPART & SERVICE EKSTERNAL",
        costBehavior: "VC",
        budgetCost: categorySums.rep.budget,
        realisasiCost: categorySums.rep.realisasi,
        varianceCost: categorySums.rep.variance,
        variancePercent: categorySums.rep.variancePercent,
        serapanPercent: categorySums.rep.serapanPercent,
        status:
          categorySums.rep.variance > 300
            ? "critical"
            : categorySums.rep.variance > 0
            ? "warning"
            : "efficiency",
        trend: categorySums.rep.variance > 0 ? "worsening" : "improving",
      },
    ];
  }, [selectedSite, categorySums]);

  // 5. TOP 5 COST DRIVERS (Diurutkan dari Deviasi Over Tertinggi)
  const top5Drivers = useMemo(() => {
    return [...rawDrivers]
      .sort((a, b) => b.varianceCost - a.varianceCost)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
  }, [rawDrivers]);

  // 6. TOTAL OVER AGREGAT TOP 5
  const top5TotalVariance = useMemo(() => {
    return top5Drivers
      .filter((d) => d.varianceCost > 0)
      .reduce((acc, curr) => acc + curr.varianceCost, 0);
  }, [top5Drivers]);

  // Helper untuk mengekstrak record per kategori beban
  const getPeriodRecordForBeban = (row: FullPeriodRecord, key: BebanGroupKey) => {
    if (key === "fuel") return row.fuel;
    if (key === "tyre") return row.tyre;
    if (key === "comp") return row.comp;
    if (key === "rep") return row.rep;
    if (key === "ovh") return row.ovh;
    return {
      budget: Math.round(row.total.budget * 0.08),
      realisasi: Math.round(row.total.realisasi * 0.08),
      deviasi: Math.round(row.total.deviasi * 0.08),
    };
  };

  const orderedBebanKeys: BebanGroupKey[] = useMemo(() => {
    return top5Drivers.map((d) => d.bebanKey);
  }, [top5Drivers]);

  // 7. DATA KOMPARASI BUDGET VS REALISASI (UNTUK CHART MODE 1)
  const top5ComparisonData = useMemo(() => {
    return orderedBebanKeys.map((key) => {
      const sum = categorySums[key as "comp" | "fuel" | "tyre" | "rep" | "ovh"];
      const meta = TOP5_BEBAN_META[key];
      const isOver = sum.variance > 0;

      return {
        key,
        name: meta.label,
        shortLabel: meta.shortLabel,
        color: meta.color,
        lightBg: meta.lightBg,
        borderCol: meta.borderCol,
        textCol: meta.textCol,
        budget: sum.budget,
        realisasi: sum.realisasi,
        variance: sum.variance,
        overAmount: Math.max(0, sum.variance),
        varPct: sum.variancePercent,
        serapanPct: sum.serapanPercent,
        isOver,
      };
    });
  }, [orderedBebanKeys, categorySums]);

  // 8. MULTI-LINE TREND DATA (BERDASARKAN BASET DATASET SESUAI TIMEFRAME)
  const top5MonthlyMultiData = useMemo(() => {
    return baseDataset.map((row) => ({
      month: row.label,
      comp: row.comp?.realisasi || 0,
      fuel: row.fuel?.realisasi || 0,
      tyre: row.tyre?.realisasi || 0,
      rep: row.rep?.realisasi || 0,
      ovh: row.ovh?.realisasi || 0,
    }));
  }, [baseDataset]);

  // Single Beban Trend Data
  const singleBebanMonthlyData = useMemo(() => {
    if (activeTop5Beban === "all") return [];
    return baseDataset.map((row) => {
      const rec = getPeriodRecordForBeban(row, activeTop5Beban);
      const over = Math.max(0, rec.realisasi - rec.budget);
      return {
        month: row.label,
        budget: rec.budget,
        realisasi: rec.realisasi,
        over,
        deviasi: rec.deviasi,
      };
    });
  }, [activeTop5Beban, baseDataset]);

  // Single Beban Metrics
  const singleBebanMetrics = useMemo(() => {
    if (activeTop5Beban === "all") return null;
    const sum = categorySums[activeTop5Beban as "comp" | "fuel" | "tyre" | "rep" | "ovh"];
    let peakMonth = "";
    let peakVal = 0;

    baseDataset.forEach((row) => {
      const rec = getPeriodRecordForBeban(row, activeTop5Beban);
      if (rec.realisasi > peakVal) {
        peakVal = rec.realisasi;
        peakMonth = row.label;
      }
    });

    const meta = TOP5_BEBAN_META[activeTop5Beban];
    return {
      meta,
      bTotal: sum.budget,
      rTotal: sum.realisasi,
      variance: sum.variance,
      varPct: sum.variancePercent,
      serapanPct: sum.serapanPercent,
      peakMonth,
      peakVal,
    };
  }, [activeTop5Beban, baseDataset, categorySums]);

  // Sparkline Bulanan / Mingguan
  const getBebanSparkline = (key: BebanGroupKey) => {
    return baseDataset.map((row) => {
      const rec = getPeriodRecordForBeban(row, key);
      return {
        m: row.label,
        v: rec.realisasi,
        b: rec.budget,
      };
    });
  };

  // Filtered List untuk Direktori Tabel
  const filteredDrivers = useMemo(() => {
    return rawDrivers.filter((item) => {
      if (activeBebanFilter !== "all" && item.bebanKey !== activeBebanFilter) return false;
      if (activeBehaviorFilter !== "all" && item.costBehavior !== activeBehaviorFilter) return false;
      if (activeStatusFilter !== "all" && item.status !== activeStatusFilter) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchAccount = item.accountName.toLowerCase().includes(q) || item.accountCode.includes(q);
        const matchBeban = item.bebanLabel.toLowerCase().includes(q);
        if (!matchName && !matchAccount && !matchBeban) return false;
      }
      return true;
    });
  }, [rawDrivers, activeBebanFilter, activeBehaviorFilter, activeStatusFilter, searchQuery]);

  // Category Icon Mapping
  const getBebanIcon = (key: BebanGroupKey) => {
    switch (key) {
      case "comp":
        return <Users size={16} className="text-emerald-600" />;
      case "fuel":
        return <Fuel size={16} className="text-amber-600" />;
      case "tyre":
        return <Disc size={16} className="text-purple-600" />;
      case "rep":
        return <Wrench size={16} className="text-[#18bebc]" />;
      case "ovh":
        return <Building2 size={16} className="text-rose-600" />;
      default:
        return <DollarSign size={16} className="text-slate-600" />;
    }
  };

  // Label Periode Aktif
  const activePeriodLabel = useMemo(() => {
    if (timeframe === "ytd") return "Kumulatif YTD 2026 (Jan - 15 Okt)";
    if (timeframe === "month") {
      if (selectedPeriod === "all") return "Bulanan (Jan - Okt 2026)";
      return `Bulan ${selectedPeriod} 2026`;
    }
    if (selectedPeriod === "all") {
      const lastLabel = baseDataset[baseDataset.length - 1]?.label || "W41";
      return `Mingguan (W29 - ${lastLabel} 2026)`;
    }
    return `Minggu ${selectedPeriod}`;
  }, [timeframe, selectedPeriod, baseDataset]);

  // Export CSV Data
  const handleExportCsv = () => {
    const headers = [
      "RANK",
      "KODE_AKUN",
      "NAMA_AKUN",
      "KATEGORI_BEBAN",
      "PERILAKU_BIAYA",
      "BUDGET_TARGET_IDR",
      "REALISASI_AKTUAL_IDR",
      "DEVIASI_VARIANCE_IDR",
      "PERSEN_DEVIASI",
      "PERSEN_SERAPAN",
      "STATUS",
    ];

    const rows = filteredDrivers.map((item, idx) => [
      idx + 1,
      `"${item.accountCode}"`,
      `"${item.accountName}"`,
      `"${item.bebanLabel}"`,
      item.costBehavior,
      item.budgetCost * 1_000_000,
      item.realisasiCost * 1_000_000,
      item.varianceCost * 1_000_000,
      `${item.variancePercent}%`,
      `${item.serapanPercent}%`,
      item.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Cost_Driver_${selectedSite}_${activePeriodLabel.replace(/[\s\(\)\-\.]+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner & Filter Terpadu (Site + Timeframe + Periode) */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200/80 bg-linear-to-r from-slate-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-4xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-orange-200 border border-white/20">
              <span className="h-2 w-2 rounded-full bg-[#e95623] animate-pulse" />
              <span>Cost Driver Intelligence &bull; Biaya Operasional Tambang</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Cost Driver
            </h1>
          </div>

          {/* Controls: Site Selector + Timeframe Switcher */}
          <div className="shrink-0 flex flex-col items-start sm:items-end gap-3">
            {/* JobSite Selector */}
            <div className="p-1.5 bg-slate-800/90 rounded-2xl border border-white/15 backdrop-blur-md flex items-center gap-1 shadow-lg">
              {isHeadOffice ? (
                <>
                  <button
                    onClick={() => setSelectedSite("Senyiur")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSite === "Senyiur"
                        ? "bg-[#e95623] text-white shadow-md shadow-[#e95623]/30"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Building2 size={14} />
                    <span>Site Senyiur</span>
                  </button>
                  <button
                    onClick={() => setSelectedSite("MuaraPahu")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSite === "MuaraPahu"
                        ? "bg-[#18bebc] text-white shadow-md shadow-[#18bebc]/30"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Building2 size={14} />
                    <span>Site Muara Pahu</span>
                  </button>
                  <button
                    onClick={() => setSelectedSite("AllSites")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSite === "AllSites"
                        ? "bg-slate-700 text-white shadow-md"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Layers size={14} />
                    <span>Konsolidasi</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white">
                  <Building2 size={14} className="text-[#e95623]" />
                  <span>Site {user.jobSite}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 text-orange-200">
                    Site Anda
                  </span>
                </div>
              )}
            </div>

            {/* Timeframe Switcher (Persis seperti Dashboard Utama: Bulanan, Mingguan, Kumulatif YTD) */}
            <div className="flex items-center p-1 bg-slate-800/90 rounded-2xl border border-white/15 backdrop-blur-md shadow-lg">
              <button
                onClick={() => handleTimeframeChange("month")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeframe === "month"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Calendar size={13} className={timeframe === "month" ? "text-blue-600" : "text-slate-400"} />
                <span>Bulanan</span>
              </button>
              <button
                onClick={() => handleTimeframeChange("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeframe === "week"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sliders size={13} className={timeframe === "week" ? "text-blue-600" : "text-slate-400"} />
                <span>Mingguan</span>
              </button>
            </div>

            {/* Sub-Filter Periode Spesifik (Bulan Tertentu / Minggu Tertentu) */}
            {timeframe !== "ytd" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Pilih Periode:</span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-md"
                >
                  {timeframe === "month" ? (
                    <>
                      <option value="all">Semua Bulan (Jan - Okt 2026)</option>
                      {baseDataset.map((item) => (
                        <option key={item.label} value={item.label}>
                          Bulan {item.label} 2026
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value="all">
                        Semua Minggu (W29 - {baseDataset[baseDataset.length - 1]?.label || "W41"})
                      </option>
                      {baseDataset.map((item, idx) => (
                        <option key={item.label} value={item.label}>
                          Minggu {item.label} {idx === baseDataset.length - 1 ? "(Terbaru)" : ""}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Export Actions (Sync dengan Dashboard Utama) */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Download data Cost Driver format CSV"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 border border-blue-400/30"
                title="Download slide presentasi PDF landscape A4"
              >
                <FileDown size={14} className="text-white" />
                <span>Export PDF Presentasi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VISUALISASI & GRAFIK KOMPARASI BEBAN */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
        {/* Chart Header & Mode Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[#e95623]" />
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Visualisasi Beban Biaya: Budget vs Realisasi (
                {selectedSite === "AllSites" ? "Konsolidasi" : `Site ${selectedSite}`} &bull; {activePeriodLabel})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Perbandingan performa Target Budget vs Realisasi aktual 5 kelompok beban produksi untuk periode terpilih.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setTop5ChartMode("comparison")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                top5ChartMode === "comparison"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={14} className={top5ChartMode === "comparison" ? "text-[#e95623]" : ""} />
              <span>Komparasi Budget vs Realisasi</span>
            </button>
            <button
              type="button"
              onClick={() => setTop5ChartMode("trend")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                top5ChartMode === "trend"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp size={14} className={top5ChartMode === "trend" ? "text-[#e95623]" : ""} />
              <span>Tren {timeframe === "week" ? "Mingguan" : "Bulanan"}</span>
            </button>
          </div>
        </div>

        {/* MODE 1: KOMPARASI BUDGET VS REALISASI */}
        {top5ChartMode === "comparison" && (
          <div className="space-y-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5ComparisonData}
                  margin={{ top: 25, right: 20, left: 0, bottom: 10 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                    tickFormatter={formatYAxisTick}
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2 min-w-48">
                            <div className="font-extrabold text-sm border-b border-slate-700/60 pb-1.5 flex items-center justify-between gap-2">
                              <span>{item.name}</span>
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex justify-between gap-3 text-slate-300">
                                <span>Budget Target:</span>
                                <span className="font-mono font-bold text-white">
                                  Rp {(item.budget / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                </span>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <span>Realisasi Aktual:</span>
                                <span className="font-mono font-bold text-white">
                                  Rp {(item.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                </span>
                              </div>
                              <div
                                className={`flex justify-between gap-3 pt-1 border-t border-slate-800 font-bold ${
                                  item.isOver ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                <span>{item.isOver ? "Over Budget:" : "Efisien:"}</span>
                                <span className="font-mono">
                                  {item.isOver ? "+" : ""}
                                  {(item.variance / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M (
                                  {item.serapanPct}%)
                                </span>
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
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 12, fontSize: "11px", fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="budget"
                    name="Budget Target"
                    fill="#94A3B8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  >
                    <LabelList
                      dataKey="budget"
                      position="top"
                      formatter={(val: any) =>
                        val ? `Rp ${(Number(val) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M` : ""
                      }
                      style={{ fontSize: "9px", fontWeight: 700, fill: "#64748B" }}
                    />
                  </Bar>
                  <Bar
                    dataKey="realisasi"
                    name="Realisasi Aktual"
                    fill="#e95623"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  >
                    <LabelList
                      dataKey="realisasi"
                      position="top"
                      formatter={(val: any) =>
                        val ? `Rp ${(Number(val) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M` : ""
                      }
                      style={{ fontSize: "9px", fontWeight: 800, fill: "#e95623" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* MODE 2: TREN SERI WAKTU */}
        {top5ChartMode === "trend" && (
          <div className="space-y-4">
            {/* Sub-Filter Beban Pills */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter size={13} />
                <span>Kategori Beban:</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTop5Beban("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTop5Beban === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <Layers size={13} />
                <span>Semua 5 Beban (Multi-Line)</span>
              </button>

              {top5ComparisonData.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTop5Beban(item.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTop5Beban === item.key
                      ? "text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                  style={activeTop5Beban === item.key ? { backgroundColor: item.color } : undefined}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: activeTop5Beban === item.key ? "#fff" : item.color }}
                  />
                  <span>{item.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Multi-Line View */}
            {activeTop5Beban === "all" && (
              <div className="space-y-3">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={top5MonthlyMultiData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                      />
                      <YAxis
                        tickFormatter={formatYAxisTick}
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2 min-w-56">
                                <div className="font-extrabold text-xs text-slate-300 border-b border-slate-700/60 pb-1.5 flex items-center justify-between">
                                  <span>Periode: {label}</span>
                                  <span className="text-[10px] text-orange-400 font-semibold">
                                    Realisasi Beban
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px]">
                                  {payload.map((entry: any, idx: number) => {
                                    const meta = TOP5_BEBAN_META[entry.dataKey as BebanGroupKey];
                                    if (!meta) return null;
                                    return (
                                      <div key={idx} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: meta.color }}
                                          />
                                          <span className="text-slate-300 truncate">{meta.shortLabel}:</span>
                                        </div>
                                        <span className="font-mono font-bold text-white shrink-0">
                                          Rp {(entry.value / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                        </span>
                                      </div>
                                    );
                                  })}
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
                        wrapperStyle={{ paddingBottom: 12, fontSize: "11px", fontWeight: 600 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="comp"
                        name="Comp & Benefit"
                        stroke={TOP5_BEBAN_META.comp.color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="fuel"
                        name="Fuel Solar"
                        stroke={TOP5_BEBAN_META.fuel.color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tyre"
                        name="Tyre (Ban)"
                        stroke={TOP5_BEBAN_META.tyre.color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rep"
                        name="Repair & Maint"
                        stroke={TOP5_BEBAN_META.rep.color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ovh"
                        name="Overhead Cost"
                        stroke={TOP5_BEBAN_META.ovh.color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Single Beban Drilldown View */}
            {activeTop5Beban !== "all" && singleBebanMetrics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Kategori Beban</span>
                    <p className="text-xs font-black truncate mt-0.5" style={{ color: singleBebanMetrics.meta.color }}>
                      {singleBebanMetrics.meta.shortLabel}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Budget Target</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      Rp {(singleBebanMetrics.bTotal / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Realisasi Aktual</span>
                    <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                      Rp {(singleBebanMetrics.rTotal / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Deviasi Varian</span>
                    <p
                      className={`text-xs font-black mt-0.5 ${
                        singleBebanMetrics.variance > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {singleBebanMetrics.variance > 0 ? "+" : ""}
                      {(singleBebanMetrics.variance / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M (
                      {singleBebanMetrics.serapanPct}%)
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Titik Tertinggi (Peak)</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {singleBebanMetrics.peakMonth} (Rp{" "}
                      {(singleBebanMetrics.peakVal / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M)
                    </p>
                  </div>
                </div>

                {/* Composed Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={singleBebanMonthlyData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                      />
                      <YAxis
                        tickFormatter={formatYAxisTick}
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            const diff = d.realisasi - d.budget;
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-1.5 min-w-44">
                                <div className="font-extrabold text-xs text-slate-300 border-b border-slate-700/60 pb-1">
                                  Periode {label} &bull; {singleBebanMetrics.meta.shortLabel}
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>Target Budget:</span>
                                  <span className="font-mono text-slate-400">
                                    Rp {(d.budget / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>Realisasi Aktual:</span>
                                  <span className="font-mono font-bold text-white">
                                    Rp {(d.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                  </span>
                                </div>
                                <div
                                  className={`flex justify-between font-bold pt-1 border-t border-slate-800 ${
                                    diff > 0 ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                >
                                  <span>{diff > 0 ? "Over Budget:" : "Efisiensi:"}</span>
                                  <span className="font-mono">
                                    {diff > 0 ? "+" : ""}
                                    {(diff / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                  </span>
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
                        wrapperStyle={{ paddingBottom: 12, fontSize: "11px", fontWeight: 600 }}
                      />
                      <Bar
                        dataKey="realisasi"
                        name={`Realisasi ${singleBebanMetrics.meta.shortLabel}`}
                        fill="#e95623"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                      <Line
                        type="monotone"
                        dataKey="budget"
                        name="Target Budget"
                        stroke="#0F172A"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3, fill: "#0F172A" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. TOP 5 COST DRIVERS CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-black text-xs border border-rose-200">
                5
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                TOP 5 COST DRIVERS (PERINGKAT PEMICU BIAYA UTAMA)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                {selectedSite === "AllSites" ? "Konsolidasi" : `Site ${selectedSite}`} &bull; {activePeriodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Peringkat pemicu biaya produksi diurutkan berdasarkan nominal over budget tertinggi pada periode {activePeriodLabel}.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold">
              Total Over Beban: +Rp {(top5TotalVariance / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
            </span>
          </div>
        </div>

        {/* Top 5 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {top5Drivers.map((driver) => {
            const isRank1 = driver.rank === 1;
            const isRank2 = driver.rank === 2;
            const isOver = driver.varianceCost > 0;

            return (
              <div
                key={driver.id}
                onClick={() => setSelectedDriverDetail(driver)}
                className={`relative rounded-2xl border transition-all cursor-pointer p-4 flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 group ${
                  isRank1 && isOver
                    ? "bg-linear-to-b from-rose-50/70 via-white to-white border-rose-300 ring-2 ring-rose-500/20 shadow-md shadow-rose-900/5"
                    : isRank2 && isOver
                    ? "bg-linear-to-b from-orange-50/60 via-white to-white border-orange-200 hover:border-orange-300"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >
                {/* Rank Badge */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl font-black text-xs shadow-xs ${
                        isRank1 && isOver
                          ? "bg-[#e95623] text-white"
                          : isRank2 && isOver
                          ? "bg-amber-500 text-white"
                          : "bg-slate-800 text-white"
                      }`}
                    >
                      #{driver.rank}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {driver.costBehavior} &bull; {driver.accountCode}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                      isOver
                        ? "text-rose-600 bg-rose-50 border-rose-100"
                        : "text-emerald-600 bg-emerald-50 border-emerald-100"
                    }`}
                  >
                    {isOver ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    <span>{isOver ? `+${driver.variancePercent}%` : `${driver.variancePercent}%`}</span>
                  </span>
                </div>

                {/* Content */}
                <div className="py-3 space-y-2 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 truncate">
                    {getBebanIcon(driver.bebanKey)}
                    <span className="truncate">{driver.bebanLabel}</span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#e95623] transition-colors leading-snug font-mono">
                    {driver.accountCode} - {driver.accountName}
                  </h3>

                  {/* Financial Breakdown Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Target Budget:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        Rp {(driver.budgetCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Realisasi Aktual:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        Rp {(driver.realisasiCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Rasio Serapan:</span>
                      <span className="font-extrabold text-slate-800">
                        {driver.serapanPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Mini Trend Sparkline */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Tren Seri:</span>
                      <span className="font-semibold text-slate-600">{timeframe === "week" ? "Mingguan" : "Bulanan"}</span>
                    </div>
                    <div className="h-7 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getBebanSparkline(driver.bebanKey)}
                          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                        >
                          <Bar
                            dataKey="v"
                            fill="#e95623"
                            radius={[2, 2, 0, 0]}
                            opacity={0.85}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Financial Over Amount */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isOver ? "Over Budget:" : "Efisiensi:"}
                    </span>
                    <span
                      className={`text-xs font-black ${
                        isOver ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {isOver ? "+" : ""}
                      {(driver.varianceCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </span>
                  </div>

                  <button
                    type="button"
                    className="w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 group-hover:bg-[#e95623] group-hover:text-white text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Lihat Detail Biaya</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DIREKTORI LENGKAP COST DRIVER PER KATEGORI BEBAN */}
      <div className="space-y-4 pt-2">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#e95623]" />
                <span>DAFTAR COST DRIVER PER KATEGORI BEBAN</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Katalog kelompok biaya operasional, klasifikasi sifat biaya, dan performa realisasi periode {activePeriodLabel}.
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Menampilkan <strong className="text-slate-900">{filteredDrivers.length}</strong> dari{" "}
              {rawDrivers.length} Kategori Biaya
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-56 max-w-md">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari driver, akun COA, atau pemicu biaya..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]/25 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Sifat & Status */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveBehaviorFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeBehaviorFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Semua Sifat
                </button>
                <button
                  onClick={() => setActiveBehaviorFilter("VC")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeBehaviorFilter === "VC"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Variable Cost (VC)
                </button>
                <button
                  onClick={() => setActiveBehaviorFilter("FC")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeBehaviorFilter === "FC"
                      ? "bg-white text-purple-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Fixed Cost (FC)
                </button>
              </div>

              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeStatusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Semua Status
                </button>
                <button
                  onClick={() => setActiveStatusFilter("critical")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeStatusFilter === "critical"
                      ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Over Budget
                </button>
                <button
                  onClick={() => setActiveStatusFilter("efficiency")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    activeStatusFilter === "efficiency"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Efisien
                </button>
              </div>
            </div>
          </div>

          {/* Filter Kategori Beban Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveBebanFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBebanFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Layers size={13} />
              <span>Semua Beban</span>
            </button>
            <button
              onClick={() => setActiveBebanFilter("comp")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBebanFilter === "comp"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <Users size={13} />
              <span>Gaji & Benefit</span>
            </button>
            <button
              onClick={() => setActiveBebanFilter("fuel")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBebanFilter === "fuel"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <Fuel size={13} />
              <span>Fuel Solar</span>
            </button>
            <button
              onClick={() => setActiveBebanFilter("tyre")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBebanFilter === "tyre"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60"
              }`}
            >
              <Disc size={13} />
              <span>Tyre (Ban)</span>
            </button>
            <button
              onClick={() => setActiveBebanFilter("rep")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBebanFilter === "rep"
                  ? "bg-[#18bebc] text-white shadow-xs"
                  : "bg-batara-teal-50 text-[#0e9f9d] hover:bg-teal-100 border border-batara-teal-100"
              }`}
            >
              <Wrench size={13} />
              <span>Repair & Maintenance</span>
            </button>
            <button
              onClick={() => setActiveBebanFilter("ovh")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBebanFilter === "ovh"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              <Building2 size={13} />
              <span>Overhead Cost</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 border-r border-slate-800 w-12 text-center">Rank</th>
                  <th className="py-3 px-4 border-r border-slate-800">Akun Beban (COA)</th>
                  <th className="py-3 px-4 border-r border-slate-800 text-center">Sifat</th>
                  <th className="py-3 px-4 border-r border-slate-800 text-right">Target Budget (M)</th>
                  <th className="py-3 px-4 border-r border-slate-800 text-right">Realisasi (M)</th>
                  <th className="py-3 px-4 border-r border-slate-800 text-right">Deviasi Varian (M)</th>
                  <th className="py-3 px-4 border-r border-slate-800 text-center">Rasio Serapan</th>
                  <th className="py-3 px-4 border-r border-slate-800 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDrivers.map((item, index) => {
                  const isOver = item.varianceCost > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.rank && item.rank <= 3 && isOver ? "bg-amber-50/15" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-500 border-r border-slate-100">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-white font-extrabold text-[10px] ${
                            item.rank === 1 && isOver
                              ? "bg-[#e95623]"
                              : item.rank === 2 && isOver
                              ? "bg-amber-500"
                              : "bg-slate-800"
                          }`}
                        >
                          #{item.rank || index + 1}
                        </span>
                      </td>

                      {/* Akun Beban (COA) */}
                      <td className="py-3.5 px-4 border-r border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                            {getBebanIcon(item.bebanKey)}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className="text-xs font-black text-slate-900 font-mono hover:text-[#e95623] cursor-pointer"
                              onClick={() => setSelectedDriverDetail(item)}
                            >
                              {item.accountCode} - {item.accountName}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {item.bebanLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cost Behavior */}
                      <td className="py-3.5 px-4 border-r border-slate-100 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            item.costBehavior === "VC"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {item.costBehavior}
                        </span>
                      </td>

                      {/* Target Budget */}
                      <td className="py-3.5 px-4 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                        Rp {(item.budgetCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                      </td>

                      {/* Realisasi */}
                      <td className="py-3.5 px-4 border-r border-slate-100 text-right font-mono font-bold text-slate-900">
                        Rp {(item.realisasiCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                      </td>

                      {/* Deviasi Biaya */}
                      <td className="py-3.5 px-4 border-r border-slate-100 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-black font-mono text-xs ${
                              isOver ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            {isOver ? "+" : ""}
                            {(item.varianceCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isOver ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {isOver ? `+${item.variancePercent}%` : `${item.variancePercent}%`}
                          </span>
                        </div>
                      </td>

                      {/* Rasio Serapan */}
                      <td className="py-3.5 px-4 border-r border-slate-100 text-center font-bold text-slate-800">
                        {item.serapanPercent}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 border-r border-slate-100 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOver
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isOver ? (
                            <AlertCircle size={11} className="text-rose-600" />
                          ) : (
                            <CheckCircle2 size={11} className="text-emerald-600" />
                          )}
                          <span>{isOver ? "Over Budget" : "Efisien"}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedDriverDetail(item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-[#e95623] hover:text-white text-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Detail</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={24} className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-500">
                          Tidak ditemukan cost driver yang cocok dengan pencarian Anda
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. MODAL DETAIL BIAYA COST DRIVER */}
      {selectedDriverDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-linear-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  {selectedDriverDetail.rank && (
                    <span className="px-2 py-0.5 rounded-md bg-[#e95623] text-white font-black text-[10px]">
                      RANK #{selectedDriverDetail.rank}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold text-[10px]">
                    {selectedDriverDetail.costBehavior === "VC" ? "Variable Cost (VC)" : "Fixed Cost (FC)"}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {selectedDriverDetail.accountCode}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white font-mono">
                  {selectedDriverDetail.accountCode} - {selectedDriverDetail.accountName}
                </h3>
                <p className="text-xs text-slate-300">
                  Kategori Beban: {selectedDriverDetail.bebanLabel}
                </p>
              </div>

              <button
                onClick={() => setSelectedDriverDetail(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Financial Variance Overview */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Biaya Budget</span>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5 font-mono">
                    Rp {(selectedDriverDetail.budgetCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Biaya Realisasi</span>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">
                    Rp {(selectedDriverDetail.realisasiCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Deviasi Varian</span>
                  <p
                    className={`text-sm font-black mt-0.5 font-mono ${
                      selectedDriverDetail.varianceCost > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {selectedDriverDetail.varianceCost > 0 ? "+" : ""}
                    {(selectedDriverDetail.varianceCost / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                  </p>
                </div>
              </div>

              {/* Grafik Tren Historis Periode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-[#e95623]" />
                    <span>
                      Grafik Tren Historis {timeframe === "week" ? "Mingguan" : "Bulanan"} (
                      {TOP5_BEBAN_META[selectedDriverDetail.bebanKey]?.shortLabel})
                    </span>
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
                      <span>Target Budget</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#e95623]">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#e95623]" />
                      <span>Aktual Realisasi</span>
                    </div>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getBebanSparkline(selectedDriverDetail.bebanKey)}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="m"
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                      />
                      <YAxis
                        tickFormatter={formatYAxisTick}
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            const realisasi = Number(d.v || 0);
                            const budget = Number(d.b || 0);
                            const diff = realisasi - budget;
                            const isOver = diff > 0;
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2 min-w-52">
                                <div className="font-extrabold text-xs text-white border-b border-slate-700/60 pb-1.5 flex items-center justify-between gap-2">
                                  <span>Periode: {label}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                    {selectedDriverDetail.accountCode}
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px]">
                                  <div className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                                      <span>Target Budget:</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-100">
                                      Rp {(budget / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-[#e95623] shrink-0" />
                                      <span>Realisasi:</span>
                                    </span>
                                    <span className="font-mono font-bold text-[#f97316]">
                                      Rp {(realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                    </span>
                                  </div>
                                  <div
                                    className={`flex justify-between items-center font-bold pt-1.5 border-t border-slate-800 ${
                                      isOver ? "text-rose-400" : "text-emerald-400"
                                    }`}
                                  >
                                    <span>{isOver ? "Over Budget:" : "Efisiensi:"}</span>
                                    <span className="font-mono">
                                      {isOver ? "+" : ""}
                                      {(diff / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="b"
                        name="Target Budget"
                        fill="#94A3B8"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey="v"
                        name="Aktual Realisasi"
                        fill="#e95623"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                PT Batara Dharma Persada &bull; Cost Control Unit (
                {selectedSite === "AllSites" ? "Konsolidasi" : `Site ${selectedSite}`} &bull; {activePeriodLabel})
              </span>
              <button
                onClick={() => setSelectedDriverDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Presentasi Export Modal */}
      {isPdfModalOpen && (
        <CostDriverPdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          selectedSite={selectedSite}
          timeframe={timeframe}
          selectedPeriod={selectedPeriod}
          categorySums={categorySums}
          top5ComparisonData={top5ComparisonData}
          top5Drivers={top5Drivers}
          allDrivers={filteredDrivers}
          activePeriodLabel={activePeriodLabel}
          user={user}
        />
      )}
    </div>
  );
};
