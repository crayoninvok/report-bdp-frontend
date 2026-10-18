"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  FileDown,
  Printer,
  X,
  Building2,
  Calendar,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  Users,
  Fuel,
  Disc,
  Wrench,
  Loader2,
  Sparkles,
  Presentation,
  Check,
  Eye,
  FileSpreadsheet,
  Scale,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  fetchAiChartAnalysis,
  generateLocalAiChartAnalysis,
  ChartAnalysisParams,
  ChartAiAnalysisResult,
} from "@/lib/chartAiAnalysis";
import { JobSite, User } from "../types/auth";
import {
  COST_CATEGORIES,
  CostCategoryKey,
  FullPeriodRecord,
  RAW_WEEKLY_SENYIUR,
  RAW_WEEKLY_MUARAPAHU,
  RAW_MONTHLY_SENYIUR,
  RAW_MONTHLY_MUARAPAHU,
  addLinearTrendline,
  formatYAxisTick,
  computeYTDDataset,
} from "./CostTrendCharts";

export type PdfSiteSelection = "Senyiur" | "MuaraPahu" | "AllSites";

interface CostReportPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSite?: JobSite;
  defaultTimeframe?: "month" | "week" | "ytd";
  defaultCategory?: CostCategoryKey;
  user?: User;
  dynamicData?: {
    Senyiur: { weekly: FullPeriodRecord[]; monthly?: FullPeriodRecord[] };
    MuaraPahu: { weekly: FullPeriodRecord[]; monthly?: FullPeriodRecord[] };
  } | null;
}

export const CostReportPdfExportModal: React.FC<CostReportPdfExportModalProps> = ({
  isOpen,
  onClose,
  defaultSite = "Senyiur",
  defaultTimeframe = "week",
  defaultCategory = "total",
  user,
  dynamicData,
}) => {
  const isHeadOffice = user ? user.role === "SuperAdmin" || user.jobSite === "HeadOffice" : true;
  const initialResolvedSite: PdfSiteSelection = !isHeadOffice && user
    ? (user.jobSite as PdfSiteSelection)
    : defaultSite === "MuaraPahu"
    ? "MuaraPahu"
    : "Senyiur";

  // 1. FILTER STATES
  const [selectedSite, setSelectedSite] = useState<PdfSiteSelection>(initialResolvedSite);
  const [timeframe, setTimeframe] = useState<"month" | "week" | "ytd">(defaultTimeframe);
  const [selectedCategory, setSelectedCategory] = useState<CostCategoryKey>(defaultCategory);

  // Range filters for Weeks
  const latestWeek = RAW_WEEKLY_SENYIUR[RAW_WEEKLY_SENYIUR.length - 1]?.label || "W41";
  const [startWeek, setStartWeek] = useState<string>("W29");
  const [endWeek, setEndWeek] = useState<string>(latestWeek);

  // Range filters for Months
  const [startMonth, setStartMonth] = useState<string>("Jan");
  const [endMonth, setEndMonth] = useState<string>("Oct");

  // Slide pages to include
  const [includeSlide1, setIncludeSlide1] = useState(true);
  const [includeSlide2, setIncludeSlide2] = useState(true);

  // Preview tab active slide
  const [activePreviewSlide, setActivePreviewSlide] = useState<1 | 2>(1);

  // Loading & export progress
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressText, setExportProgressText] = useState("");

  // Refs for DOM slide capture
  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);

  // 2. DATA PROCESSING & CONSOLIDATION
  const availableWeeks = useMemo(
    () => RAW_WEEKLY_SENYIUR.map((item) => item.label),
    []
  );
  const availableMonths = useMemo(
    () => RAW_MONTHLY_SENYIUR.map((item) => item.label),
    []
  );

  // Build filtered raw dataset
  const filteredDataset: FullPeriodRecord[] = useMemo(() => {
    let sourceData: FullPeriodRecord[] = [];
    const weeklySen = dynamicData?.Senyiur?.weekly?.length ? dynamicData.Senyiur.weekly : RAW_WEEKLY_SENYIUR;
    const weeklyMua = dynamicData?.MuaraPahu?.weekly?.length ? dynamicData.MuaraPahu.weekly : RAW_WEEKLY_MUARAPAHU;
    const monthlySen = dynamicData?.Senyiur?.monthly?.length ? dynamicData.Senyiur.monthly : RAW_MONTHLY_SENYIUR;
    const monthlyMua = dynamicData?.MuaraPahu?.monthly?.length ? dynamicData.MuaraPahu.monthly : RAW_MONTHLY_MUARAPAHU;

    if (timeframe === "week") {
      if (selectedSite === "Senyiur") {
        sourceData = weeklySen;
      } else if (selectedSite === "MuaraPahu") {
        sourceData = weeklyMua;
      } else {
        // Konsolidasi (AllSites): Sum Senyiur + Muara Pahu
        sourceData = weeklySen.map((senItem, idx) => {
          const muaraItem = weeklyMua[idx] || senItem;
          const totB = senItem.total.budget + muaraItem.total.budget;
          const totR = senItem.total.realisasi + muaraItem.total.realisasi;
          const prodB = (senItem.produksi?.budget || 0) + (muaraItem.produksi?.budget || 0);
          const prodR = (senItem.produksi?.realisasi || 0) + (muaraItem.produksi?.realisasi || 0);
          const idrTonB = prodB > 0 ? Math.round((totB * 1e6) / prodB) : 0;
          const idrTonR = prodR > 0 ? Math.round((totR * 1e6) / prodR) : 0;
          return {
            label: senItem.label,
            total: {
              budget: totB,
              realisasi: totR,
              deviasi: senItem.total.deviasi + muaraItem.total.deviasi,
            },
            comp: {
              budget: senItem.comp.budget + muaraItem.comp.budget,
              realisasi: senItem.comp.realisasi + muaraItem.comp.realisasi,
              deviasi: senItem.comp.deviasi + muaraItem.comp.deviasi,
            },
            fuel: {
              budget: senItem.fuel.budget + muaraItem.fuel.budget,
              realisasi: senItem.fuel.realisasi + muaraItem.fuel.realisasi,
              deviasi: senItem.fuel.deviasi + muaraItem.fuel.deviasi,
            },
            tyre: {
              budget: senItem.tyre.budget + muaraItem.tyre.budget,
              realisasi: senItem.tyre.realisasi + muaraItem.tyre.realisasi,
              deviasi: senItem.tyre.deviasi + muaraItem.tyre.deviasi,
            },
            rep: {
              budget: senItem.rep.budget + muaraItem.rep.budget,
              realisasi: senItem.rep.realisasi + muaraItem.rep.realisasi,
              deviasi: senItem.rep.deviasi + muaraItem.rep.deviasi,
            },
            ovh: {
              budget: senItem.ovh.budget + muaraItem.ovh.budget,
              realisasi: senItem.ovh.realisasi + muaraItem.ovh.realisasi,
              deviasi: senItem.ovh.deviasi + muaraItem.ovh.deviasi,
            },
            produksi: { budget: prodB, realisasi: prodR },
            idrPerTon: { budget: idrTonB, realisasi: idrTonR, deviasi: idrTonB - idrTonR },
          };
        });
      }

      // Filter by startWeek and endWeek
      const sIdx = availableWeeks.indexOf(startWeek);
      const eIdx = availableWeeks.indexOf(endWeek);
      const minI = Math.min(sIdx === -1 ? 0 : sIdx, eIdx === -1 ? availableWeeks.length - 1 : eIdx);
      const maxI = Math.max(sIdx === -1 ? 0 : sIdx, eIdx === -1 ? availableWeeks.length - 1 : eIdx);
      return sourceData.slice(minI, maxI + 1);
    } else {
      // Monthly
      if (selectedSite === "Senyiur") {
        sourceData = monthlySen;
      } else if (selectedSite === "MuaraPahu") {
        sourceData = monthlyMua;
      } else {
        // Konsolidasi (AllSites)
        sourceData = monthlySen.map((senItem, idx) => {
          const muaraItem = monthlyMua[idx] || senItem;
          const totB = senItem.total.budget + muaraItem.total.budget;
          const totR = senItem.total.realisasi + muaraItem.total.realisasi;
          const prodB = (senItem.produksi?.budget || 0) + (muaraItem.produksi?.budget || 0);
          const prodR = (senItem.produksi?.realisasi || 0) + (muaraItem.produksi?.realisasi || 0);
          const idrTonB = prodB > 0 ? Math.round((totB * 1e6) / prodB) : 0;
          const idrTonR = prodR > 0 ? Math.round((totR * 1e6) / prodR) : 0;
          return {
            label: senItem.label,
            total: {
              budget: totB,
              realisasi: totR,
              deviasi: senItem.total.deviasi + muaraItem.total.deviasi,
            },
            comp: {
              budget: senItem.comp.budget + muaraItem.comp.budget,
              realisasi: senItem.comp.realisasi + muaraItem.comp.realisasi,
              deviasi: senItem.comp.deviasi + muaraItem.comp.deviasi,
            },
            fuel: {
              budget: senItem.fuel.budget + muaraItem.fuel.budget,
              realisasi: senItem.fuel.realisasi + muaraItem.fuel.realisasi,
              deviasi: senItem.fuel.deviasi + muaraItem.fuel.deviasi,
            },
            tyre: {
              budget: senItem.tyre.budget + muaraItem.tyre.budget,
              realisasi: senItem.tyre.realisasi + muaraItem.tyre.realisasi,
              deviasi: senItem.tyre.deviasi + muaraItem.tyre.deviasi,
            },
            rep: {
              budget: senItem.rep.budget + muaraItem.rep.budget,
              realisasi: senItem.rep.realisasi + muaraItem.rep.realisasi,
              deviasi: senItem.rep.deviasi + muaraItem.rep.deviasi,
            },
            ovh: {
              budget: senItem.ovh.budget + muaraItem.ovh.budget,
              realisasi: senItem.ovh.realisasi + muaraItem.ovh.realisasi,
              deviasi: senItem.ovh.deviasi + muaraItem.ovh.deviasi,
            },
            produksi: { budget: prodB, realisasi: prodR },
            idrPerTon: { budget: idrTonB, realisasi: idrTonR, deviasi: idrTonB - idrTonR },
          };
        });
      }

      // Filter by startMonth and endMonth
      const sIdx = availableMonths.indexOf(startMonth);
      const eIdx = availableMonths.indexOf(endMonth);
      const minI = Math.min(sIdx === -1 ? 0 : sIdx, eIdx === -1 ? availableMonths.length - 1 : eIdx);
      const maxI = Math.max(sIdx === -1 ? 0 : sIdx, eIdx === -1 ? availableMonths.length - 1 : eIdx);
      const sliced = sourceData.slice(minI, maxI + 1);
      return timeframe === "ytd" ? computeYTDDataset(sliced) : sliced;
    }
  }, [timeframe, selectedSite, startWeek, endWeek, startMonth, endMonth, availableWeeks, availableMonths]);

  // Active Category Meta
  const activeMeta = useMemo(
    () => COST_CATEGORIES.find((c) => c.key === selectedCategory) || COST_CATEGORIES[0],
    [selectedCategory]
  );

  // Processed Focused Category Trendline Data for Slide 1
  const slide1TrendData = useMemo(() => {
    const extracted = filteredDataset.map((item) => ({
      label: item.label,
      budget: item[selectedCategory].budget,
      realisasi: item[selectedCategory].realisasi,
      deviasi: item[selectedCategory].deviasi,
    }));

    let data = addLinearTrendline(extracted, "budget", "trendBudget");
    data = addLinearTrendline(data, "realisasi", "trendRealisasi");
    return data;
  }, [filteredDataset, selectedCategory]);

  // Key KPI Summary Numbers for Slide 1 Banner
  const kpiSummary = useMemo(() => {
    const totalB =
      timeframe === "ytd"
        ? (filteredDataset[filteredDataset.length - 1]?.[selectedCategory].budget || 0)
        : filteredDataset.reduce((acc, curr) => acc + curr[selectedCategory].budget, 0);
    const totalR =
      timeframe === "ytd"
        ? (filteredDataset[filteredDataset.length - 1]?.[selectedCategory].realisasi || 0)
        : filteredDataset.reduce((acc, curr) => acc + curr[selectedCategory].realisasi, 0);
    const netDev = totalB - totalR;
    const efficiency = totalB > 0 ? (totalR / totalB) * 100 : 0;
    const isEfficient = netDev >= 0;

    // Peak and Min
    let peakR = -Infinity;
    let peakPeriod = "";
    let minR = Infinity;
    let minPeriod = "";

    filteredDataset.forEach((item) => {
      const r = item[selectedCategory].realisasi;
      if (r > peakR) {
        peakR = r;
        peakPeriod = item.label;
      }
      if (r < minR) {
        minR = r;
        minPeriod = item.label;
      }
    });

    const totalProdB = filteredDataset.reduce((acc, curr) => acc + (curr.produksi?.budget || 0), 0);
    const totalProdR = filteredDataset.reduce((acc, curr) => acc + (curr.produksi?.realisasi || 0), 0);
    const idrTonB = totalProdB > 0 ? Math.round((totalB * 1e6) / totalProdB) : 0;
    const idrTonR = totalProdR > 0 ? Math.round((totalR * 1e6) / totalProdR) : 0;
    const idrTonDev = idrTonB - idrTonR;

    return {
      totalB,
      totalR,
      netDev,
      efficiency,
      isEfficient,
      peakR,
      peakPeriod,
      minR,
      minPeriod,
      idrTonB,
      idrTonR,
      idrTonDev,
      totalProdB,
      totalProdR,
    };
  }, [filteredDataset, selectedCategory, timeframe]);

  // 2-Bar Comparison Data for Slide 1 (Budget vs Actual) - Persis Dashboard Utama
  const slide1BarData = useMemo(() => {
    return [
      {
        name: "Target Budget",
        shortName: "Budget",
        value: kpiSummary.totalB,
        fill: "#0EA5E9",
      },
      {
        name: "Aktual Realisasi",
        shortName: "Actual",
        value: kpiSummary.totalR,
        fill: "#F97316",
      },
    ];
  }, [kpiSummary]);

  const deviasiPercent = useMemo(() => {
    return kpiSummary.totalB > 0
      ? (Math.abs(kpiSummary.netDev) / kpiSummary.totalB) * 100
      : 0;
  }, [kpiSummary]);

  // Pre-calculated data for all 6 categories on Slide 2
  const slide2GridData = useMemo(() => {
    return COST_CATEGORIES.map((cat) => {
      const extracted = filteredDataset.map((item) => ({
        label: item.label,
        budget: item[cat.key].budget,
        realisasi: item[cat.key].realisasi,
        deviasi: item[cat.key].deviasi,
      }));
      const withTrend = addLinearTrendline(
        addLinearTrendline(extracted, "budget", "trendBudget"),
        "realisasi",
        "trendRealisasi"
      );
      const totalB = extracted.reduce((acc, curr) => acc + curr.budget, 0);
      const totalR = extracted.reduce((acc, curr) => acc + curr.realisasi, 0);
      const dev = totalB - totalR;

      return {
        meta: cat,
        data: withTrend,
        totalB,
        totalR,
        dev,
      };
    });
  }, [filteredDataset]);

  // Human readable title strings
  const siteLabel =
    selectedSite === "Senyiur"
      ? "Site Senyiur"
      : selectedSite === "MuaraPahu"
      ? "Site Muara Pahu"
      : "Konsolidasi (Senyiur + Muara Pahu)";

  const periodLabel =
    timeframe === "week"
      ? `Mingguan (${startWeek} - ${endWeek})`
      : `Bulanan (${startMonth} - ${endMonth} 2026)`;

  const currentDateString = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // AI Chart Analysis State & Runner
  const [aiAnalysis, setAiAnalysis] = useState<ChartAiAnalysisResult>(() =>
    generateLocalAiChartAnalysis({
      site: siteLabel,
      categoryKey: selectedCategory,
      categoryLabel: activeMeta.label,
      timeframe: timeframe === "week" ? "Mingguan" : timeframe === "month" ? "Bulanan" : "Kumulatif YTD",
      periodRange: periodLabel,
      totalBudget: kpiSummary.totalB,
      totalRealisasi: kpiSummary.totalR,
      netVariance: kpiSummary.netDev,
      efficiency: kpiSummary.efficiency,
      peakPeriod: kpiSummary.peakPeriod,
      peakValue: kpiSummary.peakR,
      minPeriod: kpiSummary.minPeriod,
      minValue: kpiSummary.minR,
      dataPoints: slide1TrendData.map((d) => ({
        label: d.label,
        budget: d.budget,
        realisasi: d.realisasi,
        deviasi: d.deviasi,
      })),
    })
  );
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  const runAiAnalysis = useCallback(async () => {
    setIsAnalyzingAi(true);
    const params: ChartAnalysisParams = {
      site: siteLabel,
      categoryKey: selectedCategory,
      categoryLabel: activeMeta.label,
      timeframe: timeframe === "week" ? "Mingguan" : timeframe === "month" ? "Bulanan" : "Kumulatif YTD",
      periodRange: periodLabel,
      totalBudget: kpiSummary.totalB,
      totalRealisasi: kpiSummary.totalR,
      netVariance: kpiSummary.netDev,
      efficiency: kpiSummary.efficiency,
      peakPeriod: kpiSummary.peakPeriod,
      peakValue: kpiSummary.peakR,
      minPeriod: kpiSummary.minPeriod,
      minValue: kpiSummary.minR,
      dataPoints: slide1TrendData.map((d) => ({
        label: d.label,
        budget: d.budget,
        realisasi: d.realisasi,
        deviasi: d.deviasi,
      })),
    };

    const local = generateLocalAiChartAnalysis(params);
    setAiAnalysis(local);

    try {
      const res = await fetchAiChartAnalysis(params);
      if (res && res.polaTren) {
        setAiAnalysis(res);
      }
    } catch {
      // keep local
    } finally {
      setIsAnalyzingAi(false);
    }
  }, [
    siteLabel,
    selectedCategory,
    activeMeta,
    timeframe,
    periodLabel,
    kpiSummary,
    slide1TrendData,
  ]);

  useEffect(() => {
    runAiAnalysis();
  }, [selectedCategory, timeframe, selectedSite, startWeek, endWeek, startMonth, endMonth]);

  // 3. EXPORT TO PDF ENGINE
  const handleExportPdf = async () => {
    if (!includeSlide1 && !includeSlide2) {
      alert("Pilih minimal satu slide untuk di-export ke PDF.");
      return;
    }

    try {
      setIsExporting(true);
      setExportProgressText("Menginisialisasi engine PDF landscape...");

      // Create jsPDF instance in A4 Landscape
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let pageCount = 0;

      // Render Slide 1 if included
      if (includeSlide1 && slide1Ref.current) {
        setExportProgressText("Merender Slide 1: Executive Summary & Grafik Tren Utama...");
        const canvas1 = await html2canvas(slide1Ref.current, {
          scale: 2, // High resolution crispness
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgData1 = canvas1.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData1, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // Render Slide 2 if included
      if (includeSlide2 && slide2Ref.current) {
        setExportProgressText("Merender Slide 2: Matriks 6 Beban & Tabel Finansial...");
        const canvas2 = await html2canvas(slide2Ref.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgData2 = canvas2.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData2, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      setExportProgressText("Menyimpan file PDF presentasi...");
      const cleanSite = selectedSite.toLowerCase();
      const cleanPeriod =
        timeframe === "week" ? `${startWeek}_${endWeek}` : `${startMonth}_${endMonth}`;
      const fileName = `BDP_Cost_Analytics_Presentation_${cleanSite}_${cleanPeriod}.pdf`;

      pdf.save(fileName);
      setExportProgressText("Selesai! PDF berhasil di-download.");
      setTimeout(() => {
        setIsExporting(false);
        setExportProgressText("");
      }, 1000);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Terjadi kesalahan saat membuat file PDF. Silakan coba kembali.");
      setIsExporting(false);
      setExportProgressText("");
    }
  };

  // 4. PRINT DIRECT ENGINE
  const handlePrint = () => {
    window.print();
  };

  // Data label formatter for Realisasi data points on Slide 1 chart (e.g. 2,1 M / 2,2 M / 33,5 M)
  const renderSlide1PointLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === undefined || value === null || isNaN(value)) return null;
    const num = value / 1000;
    const formatted = `${num.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} M`;

    return (
      <g transform={`translate(${x},${y - 13})`}>
        <rect
          x={-24}
          y={-9}
          width={48}
          height={15}
          rx={3}
          fill="#FFFFFF"
          fillOpacity={0.94}
          stroke="#2563EB"
          strokeWidth={1}
        />
        <text
          x={0}
          y={0}
          fill="#1D4ED8"
          fontSize={9}
          fontWeight="800"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // 5. SLIDE RENDER HELPERS
  const renderSlide1Content = () => (
    <div className="w-280.5 h-198.25 bg-white text-slate-900 p-8 shadow-xl border border-slate-300 rounded-lg flex flex-col justify-between shrink-0 font-sans">
      {/* Top Section */}
      <div>
        {/* Compact Presentation Header */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-lg text-xs font-black bg-blue-900 text-white tracking-wide">
              {siteLabel}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-black bg-amber-500 text-slate-950 tracking-wide">
              {periodLabel}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Slide 1 / {includeSlide2 ? "2" : "1"} &bull; {currentDateString}
          </span>
        </div>

        {/* 5 KPI Highlight Cards Banner */}
        <div className="grid grid-cols-5 gap-3 mt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Budget
            </span>
            <div className="text-lg font-black text-slate-900 mt-1">
              Rp {(kpiSummary.totalB / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
            </div>
            <span className="text-[10px] font-medium text-slate-500">
              Plafon {periodLabel}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Total Realisasi
            </span>
            <div className="text-lg font-black text-blue-900 mt-1">
              Rp {(kpiSummary.totalR / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
            </div>
            <span className="text-[10px] font-medium text-blue-600">
              Biaya aktual operasional
            </span>
          </div>

          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
              Biaya per Ton (Rp/Ton)
            </span>
            <div className="text-lg font-black text-teal-950 mt-1">
              {kpiSummary.idrTonR > 0 ? `Rp ${kpiSummary.idrTonR.toLocaleString("id-ID")}` : "-"}
            </div>
            <span className="text-[10px] font-medium text-teal-700 truncate block">
              {kpiSummary.idrTonB > 0 ? `Target: Rp ${kpiSummary.idrTonB.toLocaleString("id-ID")}` : "Biaya per Tonase"}
              {kpiSummary.idrTonB > 0 && kpiSummary.idrTonR > 0 && (
                <span className={kpiSummary.idrTonDev >= 0 ? " font-bold text-emerald-700" : " font-bold text-rose-700"}>
                  {" "}({kpiSummary.idrTonDev >= 0 ? `Hemat` : `Over`})
                </span>
              )}
            </span>
          </div>

          <div
            className={`border rounded-xl p-3 ${
              kpiSummary.isEfficient
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-rose-50/70 border-rose-200"
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                kpiSummary.isEfficient ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Varian Bersih
            </span>
            <div
              className={`text-lg font-black mt-1 flex items-center gap-1 ${
                kpiSummary.isEfficient ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              <span>
                {kpiSummary.netDev >= 0 ? "+" : "-"}
                {(Math.abs(kpiSummary.netDev) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-white border">
                {kpiSummary.isEfficient ? "Hemat" : "Over"}
              </span>
            </div>
            <span
              className={`text-[10px] font-medium ${
                kpiSummary.isEfficient ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {kpiSummary.isEfficient ? "Di bawah plafon budget" : "Melebihi alokasi budget"}
            </span>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
              Rasio Efisiensi
            </span>
            <div className="text-lg font-black text-indigo-950 mt-1">
              {kpiSummary.efficiency.toFixed(1)}%
            </div>
            <span className="text-[10px] font-medium text-indigo-600">
              Serapan anggaran
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Main Trend Line Chart & Variance Bar Chart */}
      <div className="grid grid-cols-12 gap-5 my-2 flex-1">
        {/* Primary Line Chart (8 cols) */}
        <div className="col-span-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Grafik Tren: {activeMeta.label}
              </h3>
            </div>
          </div>

          {/* Recharts container with explicit dimensions for crisp capture */}
          <div className="w-165 h-82.5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={slide1TrendData}
                margin={{ top: 22, right: 24, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: "bold", fill: "#475569" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  tickFormatter={formatYAxisTick}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px", fontWeight: "bold" }}
                />
                {/* Budget (Garis Solid Warna Cerah, Tanpa Nominal) */}
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke="#0EA5E9"
                  strokeWidth={2.4}
                  dot={{ r: 4, fill: "#0EA5E9", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
                {/* Realisasi (Garis Solid dengan Angka Titik 2,1 M / 2,2 M) */}
                <Line
                  type="monotone"
                  dataKey="realisasi"
                  name="Realisasi"
                  stroke="#2563EB"
                  strokeWidth={2.8}
                  dot={{ r: 5, fill: "#1D4ED8", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  label={renderSlide1PointLabel}
                  isAnimationActive={false}
                />
                {/* Trendline Realisasi (Garis Putus-putus Hanya untuk Tren) */}
                <Line
                  type="monotone"
                  dataKey="trendRealisasi"
                  name="Tren Realisasi"
                  stroke="#D97706"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sub Legend & Annotation */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Satuan nilai: Miliar Rupiah (M)</span>
            <span>
              Puncak Realisasi: <strong>{kpiSummary.peakPeriod}</strong> (Rp{" "}
              {(kpiSummary.peakR / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M)
            </span>
          </div>
        </div>

        {/* Right: 2-Bar Comparison (Budget vs Actual) & Ukuran Deviasi (4 cols) - Persis Dashboard Utama */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Budget vs Actual
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                kpiSummary.isEfficient
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {kpiSummary.isEfficient ? "Efisien" : "Over Budget"}
            </span>
          </div>

          <div className="w-full h-52 my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={slide1BarData}
                margin={{ top: 22, right: 20, left: -15, bottom: 0 }}
                barGap={12}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fontWeight: "bold", fill: "#475569" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  tickFormatter={formatYAxisTick}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                  {slide1BarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v: any) =>
                      `${Math.round(Number(v) / 1000).toLocaleString("id-ID")} M`
                    }
                    style={{ fontSize: "11px", fontWeight: "800", fill: "#1E293B" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pengukuran Deviasi & Rasio Serapan Biaya */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Scale size={13} className="text-[#e95623] shrink-0" />
                <span>Deviasi Biaya:</span>
              </span>
              <div className="text-right">
                <span
                  className={`text-sm font-black font-mono ${
                    kpiSummary.isEfficient ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {kpiSummary.isEfficient ? "+" : ""}
                  {(kpiSummary.netDev / 1000).toLocaleString("id-ID", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  M
                </span>
                <span
                  className={`block text-[10px] font-extrabold ${
                    kpiSummary.isEfficient ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {kpiSummary.isEfficient
                    ? `(-${deviasiPercent.toFixed(1)}% di bawah budget)`
                    : `(+${deviasiPercent.toFixed(1)}% di atas budget)`}
                </span>
              </div>
            </div>

            {/* Visual Ratio Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                <span>Rasio Serapan Biaya:</span>
                <strong
                  className={kpiSummary.isEfficient ? "text-emerald-700" : "text-rose-700"}
                >
                  {kpiSummary.efficiency.toFixed(1)}%
                </strong>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    kpiSummary.isEfficient ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(kpiSummary.efficiency, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Executive Insights & Sign-off Footer */}
      <div>
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 mb-3 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5 flex flex-col items-center gap-0.5">
            <Sparkles size={16} />
            <span className="text-[8px] font-black uppercase tracking-wider text-blue-700">AI</span>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  Gemini AI Analysis
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {aiAnalysis.source === "gemini" ? "Live Gemini Model" : "Smart Engine"}
                </span>
              </div>
              <button
                type="button"
                onClick={runAiAnalysis}
                disabled={isAnalyzingAi}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                title="Muat ulang analisis AI membaca data grafik terkini"
              >
                <RefreshCw size={11} className={isAnalyzingAi ? "animate-spin text-blue-600" : ""} />
                <span>{isAnalyzingAi ? "Membaca Grafik..." : "Analisis Ulang"}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-0.5">
              <div>
                <span className="font-bold text-slate-800 block text-[11px]">Pola Tren Operasional:</span>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                  {aiAnalysis.polaTren}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-800 block text-[11px]">Evaluasi Anggaran:</span>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                  {aiAnalysis.evaluasiAnggaran}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-800 block text-[11px]">Tindakan Korektif Site:</span>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                  {aiAnalysis.tindakanKorektif}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-2">
          <span>
            CONFIDENTIAL • HANYA UNTUK KEPERLUAN INTERNAL RAPAT MANAJEMEN PT BATARA DHARMA
            PERSADA
          </span>
          <span className="font-bold text-slate-600">
            Halaman 1 / {includeSlide2 ? "2" : "1"}
          </span>
        </div>
      </div>
    </div>
  );

  const renderSlide2Content = () => (
    <div className="w-280.5 h-198.25 bg-white text-slate-900 p-8 shadow-xl border border-slate-300 rounded-lg flex flex-col justify-between shrink-0 font-sans">
      {/* Slide 2 Compact Header */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Matriks 6 Akun Biaya Operasional & Rekapitulasi Finansial
            </h2>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-800">
              {siteLabel}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800">
              {periodLabel}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Slide 2 / 2
          </span>
        </div>

        {/* 6 Mini Charts Matrix Grid */}
        <div className="grid grid-cols-6 gap-3 mt-3">
          {slide2GridData.map((item) => {
            const Icon = item.meta.icon;
            const isEff = item.dev >= 0;
            return (
              <div
                key={item.meta.key}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Icon size={12} className={item.meta.textCol} />
                    <span className="text-[10px] font-black text-slate-800 truncate max-w-23.75">
                      {item.meta.shortLabel}
                    </span>
                  </div>
                </div>

                {/* Mini Numbers */}
                <div className="flex items-center justify-between text-[9px] mb-1 text-slate-600">
                  <span>B: {(item.totalB / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M</span>
                  <span>R: {(item.totalR / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M</span>
                  <span className={`font-bold ${isEff ? "text-emerald-700" : "text-rose-700"}`}>
                    {item.dev >= 0 ? "+" : "-"}
                    {(Math.abs(item.dev) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                  </span>
                </div>

                {/* Tiny Sparkline */}
                <div className="w-36.25 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={item.data}
                      margin={{ top: 2, right: 2, left: -25, bottom: 0 }}
                    >
                      <Line
                        type="monotone"
                        dataKey="budget"
                        stroke="#0EA5E9"
                        strokeWidth={1.4}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="realisasi"
                        stroke={item.meta.color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Summary Table */}
      <div className="my-3 flex-1 flex flex-col justify-center">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-2 border-r border-slate-800">Periode</th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">
                  Biaya Total
                </th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">
                  Comp & Benefit
                </th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">Fuel Solar</th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">Tyre (Ban)</th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">
                  Repair & Maint
                </th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">Overhead</th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right">Varian (M)</th>
                <th className="py-2.5 px-2 border-r border-slate-800 text-right text-emerald-400">
                  IDR/Ton Real
                </th>
                <th className="py-2.5 px-2 text-right text-teal-400">
                  Efisiensi/Ton
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDataset.map((row, idx) => {
                const netDev = row.total.deviasi;
                const tonDev = row.idrPerTon?.deviasi ?? 0;
                return (
                  <tr
                    key={row.label}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                  >
                    <td className="py-2 px-2 font-black text-slate-800 border-r border-slate-200">
                      {row.label}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-semibold text-slate-900">
                      {(row.total.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-slate-700">
                      {(row.comp.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-slate-700">
                      {(row.fuel.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-slate-700">
                      {(row.tyre.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-slate-700">
                      {(row.rep.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-slate-700">
                      {(row.ovh.realisasi / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-black border-r border-slate-200 ${
                        netDev >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {netDev >= 0 ? "+" : "-"}
                      {(Math.abs(netDev) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-bold text-slate-900 bg-slate-50/50">
                      {row.idrPerTon?.realisasi ? `Rp ${row.idrPerTon.realisasi.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-black font-mono bg-slate-50/50 ${
                        tonDev >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {row.idrPerTon?.realisasi && row.idrPerTon?.budget ? (
                        <>
                          {tonDev >= 0 ? "+" : "-"}
                          Rp {Math.abs(tonDev).toLocaleString("id-ID")}
                        </>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                <td className="py-2.5 px-2 border-r border-slate-300">TOTAL PERIODE</td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 text-blue-900">
                  {(filteredDataset
                    .reduce((acc, curr) => acc + curr.total.realisasi, 0) / 1000)
                    .toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  M
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">
                  {(filteredDataset
                    .reduce((acc, curr) => acc + curr.comp.realisasi, 0) / 1000)
                    .toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  M
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">
                  {(filteredDataset
                    .reduce((acc, curr) => acc + curr.fuel.realisasi, 0) / 1000)
                    .toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  M
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">
                  {(filteredDataset
                    .reduce((acc, curr) => acc + curr.tyre.realisasi, 0) / 1000)
                    .toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  M
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">
                  {(filteredDataset
                    .reduce((acc, curr) => acc + curr.rep.realisasi, 0) / 1000)
                    .toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  M
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300">
                  {(filteredDataset
                    .reduce((acc, curr) => acc + curr.ovh.realisasi, 0) / 1000)
                    .toLocaleString("id-ID", { maximumFractionDigits: 1 })}{" "}
                  M
                </td>
                <td
                  className={`py-2.5 px-2 text-right border-r border-slate-300 font-black ${
                    kpiSummary.isEfficient ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {kpiSummary.isEfficient ? "+" : "-"}
                  {(Math.abs(kpiSummary.netDev) / 1000).toLocaleString("id-ID", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  M
                </td>
                <td className="py-2.5 px-2 text-right border-r border-slate-300 text-slate-900 font-mono font-bold bg-slate-200/60">
                  {kpiSummary.idrTonR > 0 ? `Rp ${kpiSummary.idrTonR.toLocaleString("id-ID")}` : "-"}
                </td>
                <td
                  className={`py-2.5 px-2 text-right font-mono font-black bg-slate-200/60 ${
                    kpiSummary.idrTonDev >= 0 ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  {kpiSummary.idrTonR > 0 && kpiSummary.idrTonB > 0 ? (
                    <>
                      {kpiSummary.idrTonDev >= 0 ? "+" : "-"}
                      Rp {Math.abs(kpiSummary.idrTonDev).toLocaleString("id-ID")}
                    </>
                  ) : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer text */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-2 mt-2">
        <span>
          Report Management Portal &bull; PT Batara Dharma Persada
        </span>
        <span className="font-bold text-slate-600">Slide 2 / 2</span>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Hidden Off-Screen Slide Render Nodes for html2canvas (Always mounted & rendered with complete dimensions) */}
      <div
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: "1122px",
          zIndex: -9999,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div ref={slide1Ref} style={{ width: "1122px", height: "793px" }}>
          {renderSlide1Content()}
        </div>
        <div ref={slide2Ref} style={{ width: "1122px", height: "793px" }}>
          {renderSlide2Content()}
        </div>
      </div>

      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-2xl border border-blue-400/30 backdrop-blur-md">
              <Presentation className="text-blue-400" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Export PDF Presentasi Eksekutif
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                  Slide Deck 16:9 Landscape
                </span>
              </div>
              <p className="text-xs text-slate-300">
                PT Batara Dharma Persada — Template Presentasi Manajemen Mingguan & Bulanan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Toolbar Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Site */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Filter Jobsite
              </span>
              <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                {isHeadOffice ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedSite("Senyiur")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedSite === "Senyiur"
                          ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 size={13} className="text-amber-600" />
                      <span>Site Senyiur</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSite("MuaraPahu")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedSite === "MuaraPahu"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 size={13} className="text-emerald-600" />
                      <span>Site Muara Pahu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSite("AllSites")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedSite === "AllSites"
                          ? "bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Gabungan kedua site"
                    >
                      <Layers size={13} className="text-blue-600" />
                      <span>Konsolidasi (Semua Site)</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-2xs">
                    <Building2
                      size={13}
                      className={selectedSite === "MuaraPahu" ? "text-emerald-600" : "text-amber-600"}
                    />
                    <span className={selectedSite === "MuaraPahu" ? "text-emerald-800" : "text-amber-800"}>
                      Site {selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                      Site Anda
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Timeframe Mode */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tipe Rentang Waktu
              </span>
              <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimeframe("week")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeframe === "week"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders size={13} />
                  <span>Mingguan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("month")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeframe === "month"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calendar size={13} />
                  <span>Bulanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("ytd")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeframe === "ytd"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp size={13} />
                  <span>Kumulatif YTD</span>
                </button>
              </div>
            </div>

            {/* Range Pickers */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pilih Periode Rentang
              </span>
              {timeframe === "week" ? (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
                  <select
                    value={startWeek}
                    onChange={(e) => setStartWeek(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {availableWeeks.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs">s/d</span>
                  <select
                    value={endWeek}
                    onChange={(e) => setEndWeek(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {availableWeeks.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setStartWeek("W29");
                      setEndWeek(latestWeek);
                    }}
                    className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Reset (Semua W29-{latestWeek})
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs">s/d</span>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setStartMonth("Jan");
                      setEndMonth("Sep");
                    }}
                    className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Reset (Jan-Sep)
                  </button>
                </div>
              )}
            </div>

            {/* Category Focus for Slide 1 */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Fokus Akun Slide 1
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CostCategoryKey)}
                className="bg-white border border-slate-200 shadow-2xs rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                {COST_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Slide selection checkboxes & Download Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Pilihan Slide:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSlide1}
                  onChange={(e) => setIncludeSlide1(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Slide 1 (Tren Utama)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSlide2}
                  onChange={(e) => setIncludeSlide2(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Slide 2 (Matriks 6 Beban)</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cetak langsung menggunakan dialog print browser"
              >
                <Printer size={15} />
                <span>Cetak / Print</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44415] active:brightness-90 text-white shadow-md shadow-[#e95623]/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>{exportProgressText || "Memproses..."}</span>
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    <span>Download PDF Presentasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Slide Preview Navigation Tabs */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
              <Eye size={14} /> Preview Halaman:
            </span>
            <button
              onClick={() => setActivePreviewSlide(1)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePreviewSlide === 1
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slide 1: Executive Summary & Grafik Tren Utama
            </button>
            <button
              onClick={() => setActivePreviewSlide(2)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePreviewSlide === 2
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slide 2: Matriks 6 Akun Beban & Tabel Finansial
            </button>
          </div>

          <span className="text-[11px] text-slate-500">
            Total {filteredDataset.length} data points terfilter ({periodLabel})
          </span>
        </div>

        {/* Scrollable Container with Slide Canvas (1122px x 793px A4 Landscape) */}
        <div className="flex-1 overflow-auto p-6 bg-slate-200/70 flex flex-col items-center gap-8">
          {activePreviewSlide === 1 ? renderSlide1Content() : renderSlide2Content()}
        </div>
      </div>
    </div>
  );
};
