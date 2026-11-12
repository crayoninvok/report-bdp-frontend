"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  X,
  FileDown,
  Printer,
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Building2,
  Layers,
  Wrench,
  UserCheck,
  CalendarDays,
  Filter,
  ArrowRight,
} from "lucide-react";
import {
  WeeklyScheduleData,
  MasterUnit,
  DaySchedule,
  plantService,
} from "../services/plantService";
import {
  computePsKpiMetrics,
  evaluatePmItemKpi,
  formatKpiPct,
  getLocalTodayIso,
  resolveMechanicsArray,
  resolvePsUnitCategory,
} from "../utils/pmHelpers";

interface PeriodicInspectionPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleData: WeeklyScheduleData | null;
  selectedSite: "MuaraPahu" | "Senyiur";
  masterUnits: MasterUnit[];
  initialStartDate?: string;
  initialEndDate?: string;
  mode?: "pi" | "pm";
}

/**
 * Dynamic Achievement Theme Helper
 * - 0 - 89%: Merah (Rose/Red)
 * - 90% - 99%: Kuning (Amber/Yellow)
 * - >= 100%: Hijau (Emerald/Green)
 */
export const getAchievementTheme = (pct: number) => {
  if (pct >= 100) {
    return {
      cardBg: "bg-emerald-50/60",
      border: "border-emerald-200",
      titleText: "text-emerald-800",
      valText: "text-emerald-700",
      subText: "text-emerald-800",
      barTrack: "bg-emerald-200/60",
      barFill: "bg-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
      statusLabel: "Target Tercapai",
    };
  }
  if (pct >= 90) {
    return {
      cardBg: "bg-amber-50/60",
      border: "border-amber-200",
      titleText: "text-amber-800",
      valText: "text-amber-700",
      subText: "text-amber-800",
      barTrack: "bg-amber-200/60",
      barFill: "bg-amber-500",
      badge: "bg-amber-100 text-amber-800",
      statusLabel: "Perlu Peningkatan",
    };
  }
  return {
    cardBg: "bg-rose-50/60",
    border: "border-rose-200",
    titleText: "text-rose-800",
    valText: "text-rose-700",
    subText: "text-rose-800",
    barTrack: "bg-rose-200/60",
    barFill: "bg-rose-600",
    badge: "bg-rose-100 text-rose-800",
    statusLabel: "Di Bawah Target",
  };
};

function getKpiComplianceTheme(pct: number, hasPlan: boolean) {
  if (!hasPlan) {
    return {
      cardBg: "bg-slate-50",
      border: "border-slate-200",
      valText: "text-slate-400",
      barFill: "bg-slate-300",
      badge: "bg-slate-100 text-slate-500",
    };
  }
  if (pct >= 90) {
    return {
      cardBg: "bg-emerald-50/60",
      border: "border-emerald-200",
      valText: "text-emerald-700",
      barFill: "bg-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
    };
  }
  if (pct >= 70) {
    return {
      cardBg: "bg-amber-50/60",
      border: "border-amber-200",
      valText: "text-amber-700",
      barFill: "bg-amber-500",
      badge: "bg-amber-100 text-amber-800",
    };
  }
  return {
    cardBg: "bg-rose-50/60",
    border: "border-rose-200",
    valText: "text-rose-700",
    barFill: "bg-rose-600",
    badge: "bg-rose-100 text-rose-800",
  };
}

export const PeriodicInspectionPdfExportModal: React.FC<
  PeriodicInspectionPdfExportModalProps
> = ({
  isOpen,
  onClose,
  scheduleData,
  selectedSite,
  masterUnits,
  initialStartDate,
  initialEndDate,
  mode = "pi",
}) => {
  const isPmMode = mode === "pm";
  // -------------------------------------------------------------
  // Date Range Filter States
  // -------------------------------------------------------------
  const [rangePreset, setRangePreset] = useState<"current" | "2weeks" | "month" | "custom">(
    initialStartDate && initialEndDate ? "custom" : "current"
  );
  const [customStart, setCustomStart] = useState<string>(() => {
    return initialStartDate || scheduleData?.weekRange.startDate || getLocalTodayIso();
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return initialEndDate || scheduleData?.weekRange.endDate || getLocalTodayIso();
  });

  const [activeScheduleData, setActiveScheduleData] = useState<WeeklyScheduleData | null>(scheduleData);
  const [isLoadingRange, setIsLoadingRange] = useState<boolean>(false);

  // Load custom range data
  const fetchDateRangeData = useCallback(
    async (startStr: string, endStr: string) => {
      try {
        setIsLoadingRange(true);
        const data = isPmMode
          ? await plantService.getPmWeeklySchedule(
              undefined,
              selectedSite,
              startStr,
              endStr
            )
          : await plantService.getWeeklySchedule(
              undefined,
              selectedSite,
              startStr,
              endStr
            );
        setActiveScheduleData(data);
      } catch (err) {
        console.error("Gagal memuat rentang tanggal untuk PDF:", err);
      } finally {
        setIsLoadingRange(false);
      }
    },
    [selectedSite, isPmMode]
  );

  // Sync active date range whenever modal opens or parent initialStartDate/EndDate changes
  useEffect(() => {
    if (!isOpen) return;
    if (
      initialStartDate &&
      initialEndDate &&
      (!scheduleData?.weekRange ||
        initialStartDate !== scheduleData.weekRange.startDate ||
        initialEndDate !== scheduleData.weekRange.endDate)
    ) {
      setRangePreset("custom");
      setCustomStart(initialStartDate);
      setCustomEnd(initialEndDate);
      void fetchDateRangeData(initialStartDate, initialEndDate);
      return;
    }
    if (scheduleData) {
      setRangePreset("current");
      setActiveScheduleData(scheduleData);
      setCustomStart(scheduleData.weekRange.startDate);
      setCustomEnd(scheduleData.weekRange.endDate);
    }
  }, [isOpen, initialStartDate, initialEndDate, scheduleData, fetchDateRangeData]);

  // Handle Preset Changes
  const handleSelectPreset = (preset: "current" | "2weeks" | "month" | "custom") => {
    setRangePreset(preset);

    if (preset === "current") {
      if (scheduleData) {
        setActiveScheduleData(scheduleData);
        setCustomStart(scheduleData.weekRange.startDate);
        setCustomEnd(scheduleData.weekRange.endDate);
      }
      return;
    }

    const today = new Date();
    if (preset === "2weeks") {
      // 14 days: 1 week before current week through current week
      const curMonStr = scheduleData?.weekRange.startDate || today.toISOString().slice(0, 10);
      const curMon = new Date(curMonStr);
      const prevMon = new Date(curMon);
      prevMon.setDate(curMon.getDate() - 7);
      const curSun = new Date(curMon);
      curSun.setDate(curMon.getDate() + 6);

      const sStr = prevMon.toISOString().slice(0, 10);
      const eStr = curSun.toISOString().slice(0, 10);
      setCustomStart(sStr);
      setCustomEnd(eStr);
      fetchDateRangeData(sStr, eStr);
    } else if (preset === "month") {
      // Month: 1st of month to end of month
      const y = today.getFullYear();
      const m = today.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);

      const sStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const eStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
      setCustomStart(sStr);
      setCustomEnd(eStr);
      fetchDateRangeData(sStr, eStr);
    }
  };

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) {
      alert("Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.");
      return;
    }
    fetchDateRangeData(customStart, customEnd);
  };

  // -------------------------------------------------------------
  // Dynamic Week Chunks & Slides
  // -------------------------------------------------------------
  const weekChunks = useMemo(() => {
    if (!activeScheduleData?.days || activeScheduleData.days.length === 0) return [];
    const days = activeScheduleData.days;
    const chunks: {
      id: string;
      label: string;
      weekNum: number;
      dateRangeStr: string;
      days: DaySchedule[];
    }[] = [];

    for (let i = 0; i < days.length; i += 7) {
      const chunkDays = days.slice(i, i + 7);
      const startStr = chunkDays[0].dayDateFormatted;
      const endStr = chunkDays[chunkDays.length - 1].dayDateFormatted;
      const weekNum = Math.floor(i / 7) + 1;
      chunks.push({
        id: `week-${weekNum}`,
        label: `Minggu ${weekNum}`,
        weekNum,
        dateRangeStr: `${startStr} - ${endStr}`,
        days: chunkDays,
      });
    }
    return chunks;
  }, [activeScheduleData]);

  // Slide Inclusion States (keyed by slide id: "week-1", "week-2", ..., "eval")
  const [includedSlideIds, setIncludedSlideIds] = useState<Record<string, boolean>>({});

  const isSlideIncluded = (id: string) => {
    return includedSlideIds[id] !== false;
  };

  const toggleSlideIncluded = (id: string) => {
    setIncludedSlideIds((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  };

  // Active Slide Preview (id: "week-1", "week-2", ..., "eval", "kpi-detail-1", ...)
  const [activeSlideKey, setActiveSlideKey] = useState<string>("week-1");

  // Export Loading State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>("");

  // Refs for rendering to canvas
  const weekSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const kpiDetailSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const evalSlideRef = useRef<HTMLDivElement>(null);

  // Date formatted strings
  const todayDateString = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const siteLabel = selectedSite === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur";
  const overallRangeLabel = activeScheduleData?.weekRange.formatted || "Periode";

  // Calculations across all days in range
  const allItems = useMemo(() => {
    if (!activeScheduleData?.days) return [];
    return activeScheduleData.days.flatMap((d) => d.items);
  }, [activeScheduleData]);

  const pmKpiSummary = useMemo(
    () => (isPmMode ? computePsKpiMetrics(allItems) : null),
    [isPmMode, allItems]
  );

  const kpiDetailChunks = useMemo(() => {
    if (!isPmMode || !activeScheduleData?.days) return [];
    const flat = activeScheduleData.days.flatMap((d) =>
      d.items.map((item) => ({
        ...item,
        dayName: d.dayName,
        leadName: d.leadMechanic || d.leadInspector || null,
      }))
    );
    if (flat.length === 0) return [];
    const PAGE_SIZE = 14;
    const chunks: Array<{
      id: string;
      label: string;
      pageNum: number;
      startIndex: number;
      items: typeof flat;
    }> = [];
    for (let i = 0; i < flat.length; i += PAGE_SIZE) {
      const pageNum = Math.floor(i / PAGE_SIZE) + 1;
      chunks.push({
        id: `kpi-detail-${pageNum}`,
        label:
          flat.length > PAGE_SIZE
            ? `Detail KPI Unit (${pageNum})`
            : "Detail KPI Unit",
        pageNum,
        startIndex: i,
        items: flat.slice(i, i + PAGE_SIZE),
      });
    }
    return chunks;
  }, [isPmMode, activeScheduleData]);

  // Keep activeSlideKey valid
  useEffect(() => {
    if (activeSlideKey === "eval") return;
    if (
      weekChunks.some((w) => w.id === activeSlideKey) ||
      kpiDetailChunks.some((c) => c.id === activeSlideKey)
    ) {
      return;
    }
    if (weekChunks.length > 0) {
      setActiveSlideKey(weekChunks[0].id);
    }
  }, [weekChunks, kpiDetailChunks, activeSlideKey]);

  const totalCompleted = useMemo(() => {
    return allItems.filter((i) => i.status === "Completed").length;
  }, [allItems]);

  const totalInProgress = useMemo(() => {
    return allItems.filter((i) => i.status === "In Progress").length;
  }, [allItems]);

  const totalScheduled = useMemo(() => {
    return allItems.filter((i) => i.status === "Scheduled").length;
  }, [allItems]);

  const totalPending = useMemo(() => {
    return allItems.filter((i) => i.status === "Pending").length;
  }, [allItems]);

  const totalWeekPlan = useMemo(() => {
    if (activeScheduleData?.days?.length) {
      return activeScheduleData.days.reduce((acc, d) => acc + (d.targetUnits || 0), 0);
    }
    return activeScheduleData?.summary.totalWeekPlan || 0;
  }, [activeScheduleData]);

  const overallAchievementPercent =
    totalWeekPlan > 0 ? Math.min(100, Math.round((totalCompleted / totalWeekPlan) * 100)) : 0;

  const totalSlidesIncluded =
    weekChunks.filter((w) => isSlideIncluded(w.id)).length +
    (isSlideIncluded("eval") ? 1 : 0) +
    kpiDetailChunks.filter((c) => isSlideIncluded(c.id)).length;

  // -------------------------------------------------------------
  // Handler: Generate High-Resolution PDF Presentation
  // -------------------------------------------------------------
  const handleExportPdf = async () => {
    if (totalSlidesIncluded === 0) {
      alert("Silakan pilih minimal 1 slide untuk diekspor.");
      return;
    }

    // Save previous display values to restore later
    const previousDisplays: Record<string, string> = {};
    weekChunks.forEach((w) => {
      const el = weekSlideRefs.current[w.id];
      if (el) previousDisplays[w.id] = el.style.display;
    });
    kpiDetailChunks.forEach((c) => {
      const el = kpiDetailSlideRefs.current[c.id];
      if (el) previousDisplays[c.id] = el.style.display;
    });
    if (evalSlideRef.current) {
      previousDisplays["eval"] = evalSlideRef.current.style.display;
    }

    try {
      setIsExporting(true);
      setExportProgressText("Menginisialisasi engine PDF landscape presentasi...");

      // Temporarily ensure all included slides are rendered in DOM for html2canvas
      weekChunks.forEach((w) => {
        const el = weekSlideRefs.current[w.id];
        if (el && isSlideIncluded(w.id)) el.style.display = "flex";
      });
      kpiDetailChunks.forEach((c) => {
        const el = kpiDetailSlideRefs.current[c.id];
        if (el && isSlideIncluded(c.id)) el.style.display = "flex";
      });
      if (evalSlideRef.current && isSlideIncluded("eval")) {
        evalSlideRef.current.style.display = "flex";
      }

      // Small tick for DOM repaint
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      let pageCount = 0;

      // 1. Render Each Week Chunk Slide
      for (const w of weekChunks) {
        if (!isSlideIncluded(w.id)) continue;
        const el = weekSlideRefs.current[w.id];
        if (!el) continue;

        setExportProgressText(`Merender ${w.label} (${w.dateRangeStr})...`);
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgData = canvas.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // 2. Render Slide Evaluasi & KPI Compliance
      if (isSlideIncluded("eval") && evalSlideRef.current) {
        setExportProgressText(
          isPmMode
            ? "Merender Slide KPI Compliance & Rekap Harian..."
            : "Merender Slide Evaluasi Kinerja & Lembar Pengesahan..."
        );
        const canvasEval = await html2canvas(evalSlideRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgEval = canvasEval.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgEval, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      // 3. Render Detail KPI Unit Slide(s) in Periodic Service Mode
      for (const chunk of kpiDetailChunks) {
        if (!isSlideIncluded(chunk.id)) continue;
        const el = kpiDetailSlideRefs.current[chunk.id];
        if (!el) continue;

        setExportProgressText(`Merender ${chunk.label}...`);
        const canvasDetail = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1122,
          windowHeight: 793,
        });

        const imgDetail = canvasDetail.toDataURL("image/png");
        if (pageCount > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgDetail, "PNG", 0, 0, 297, 210, undefined, "FAST");
        pageCount++;
      }

      setExportProgressText("Menyimpan dan mengunduh berkas PDF presentasi...");
      const sanitizedSite = selectedSite === "MuaraPahu" ? "MuaraPahu" : "Senyiur";
      const sDateStr = (activeScheduleData?.weekRange.startDate || customStart).replace(/-/g, "");
      const eDateStr = (activeScheduleData?.weekRange.endDate || customEnd).replace(/-/g, "");
      const prefix = isPmMode ? "Periodic_Service_Weekly_Deck" : "Periodic_Inspection_Weekly_Deck";
      const fileName = `${prefix}_${sanitizedSite}_${sDateStr}_sd_${eDateStr}.pdf`;

      pdf.save(fileName);
      setIsExporting(false);
      onClose();
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Gagal mengekspor PDF: " + (err?.message || "Terjadi kesalahan"));
      setIsExporting(false);
    } finally {
      // Restore previous displays
      weekChunks.forEach((w) => {
        const el = weekSlideRefs.current[w.id];
        if (el && previousDisplays[w.id] !== undefined) {
          el.style.display = previousDisplays[w.id];
        }
      });
      kpiDetailChunks.forEach((c) => {
        const el = kpiDetailSlideRefs.current[c.id];
        if (el && previousDisplays[c.id] !== undefined) {
          el.style.display = previousDisplays[c.id];
        }
      });
      if (evalSlideRef.current && previousDisplays["eval"] !== undefined) {
        evalSlideRef.current.style.display = previousDisplays["eval"];
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-315 h-[95vh] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
        {/* ========================================================== */}
        {/* TOP TOOLBAR: TITLE & EXPORT BUTTON (LIGHT THEME)           */}
        {/* ========================================================== */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-[#e95623] border border-orange-200">
                PDF Export Engine &bull; A4 Landscape
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {siteLabel} &bull; {overallRangeLabel}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              Ekspor Bahan Presentasi Weekly &bull; {isPmMode ? "Periodic Service (PS)" : "Periodic Inspection (PI)"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting || totalSlidesIncluded === 0 || isLoadingRange}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-white" />
                  <span>{exportProgressText || "Memproses PDF..."}</span>
                </>
              ) : (
                <>
                  <FileDown size={14} className="text-white" />
                  <span>Download PDF Presentasi ({totalSlidesIncluded} Slide)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Tutup dialog"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/* SUBHEADER: FIXED DATE RANGE FILTER & PRESETS (LIGHT THEME) */}
        {/* ========================================================== */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
              <CalendarDays size={13} className="text-[#e95623]" />
              Rentang Tanggal:
            </span>

            {[
              { id: "current", label: "1 Minggu Ini (7 Hari)" },
              { id: "2weeks", label: "2 Minggu (14 Hari)" },
              { id: "month", label: "Bulan Ini" },
              { id: "custom", label: "Fixed Date Range (Kustom)" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rangePreset === p.id
                    ? "bg-[#e95623] text-white shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          {rangePreset === "custom" && (
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px] font-semibold">Dari:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 text-slate-800 text-xs px-2 py-0.5 rounded border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
              />
              <span className="text-slate-500 text-[11px] font-semibold">s/d:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 text-slate-800 text-xs px-2 py-0.5 rounded border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
              />
              <button
                type="button"
                onClick={handleApplyCustomRange}
                disabled={isLoadingRange}
                className="px-2.5 py-0.5 rounded-lg bg-[#e95623] text-white text-[11px] font-bold hover:bg-[#d44818] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingRange ? "Memuat..." : "Terapkan"}
              </button>
            </div>
          )}

          {/* Indicator of Loaded Days */}
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            {isLoadingRange ? (
              <span className="flex items-center gap-1.5 text-orange-600 font-semibold animate-pulse">
                <RefreshCw size={12} className="animate-spin" /> Memperbarui data periode...
              </span>
            ) : (
              <span>
                Total <strong className="text-slate-800">{activeScheduleData?.days.length || 7} Hari</strong> (
                <strong className="text-[#e95623]">{weekChunks.length} Slide Board</strong> + 1 Slide{" "}
                {isPmMode ? "KPI & Evaluasi" : "Evaluasi"}
                {kpiDetailChunks.length > 0 ? ` + ${kpiDetailChunks.length} Slide Detail KPI` : ""})
              </span>
            )}
          </div>
        </div>

        {/* ========================================================== */}
        {/* SLIDE SELECTION & PREVIEW SWITCHER (LIGHT THEME)           */}
        {/* ========================================================== */}
        <div className="px-6 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Checkboxes to include slides */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-600">Pilih Slide:</span>

            {weekChunks.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold hover:text-slate-900"
              >
                <input
                  type="checkbox"
                  checked={isSlideIncluded(w.id)}
                  onChange={() => toggleSlideIncluded(w.id)}
                  className="rounded accent-[#e95623] cursor-pointer"
                />
                <span>
                  {w.label} <span className="text-[10px] text-slate-400">({w.dateRangeStr})</span>
                </span>
              </label>
            ))}

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold hover:text-slate-900">
              <input
                type="checkbox"
                checked={isSlideIncluded("eval")}
                onChange={() => toggleSlideIncluded("eval")}
                className="rounded accent-[#e95623] cursor-pointer"
              />
              <span>{isPmMode ? "Slide KPI & Rekap Harian" : "Slide Rekap Kinerja Harian"}</span>
            </label>

            {kpiDetailChunks.map((chunk) => (
              <label
                key={chunk.id}
                className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-semibold hover:text-slate-900"
              >
                <input
                  type="checkbox"
                  checked={isSlideIncluded(chunk.id)}
                  onChange={() => toggleSlideIncluded(chunk.id)}
                  className="rounded accent-[#e95623] cursor-pointer"
                />
                <span>{chunk.label}</span>
              </label>
            ))}
          </div>

          {/* Preview Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2">Preview:</span>
            {weekChunks.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveSlideKey(w.id)}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeSlideKey === w.id
                    ? "bg-[#e95623] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                {w.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveSlideKey("eval")}
              className={`px-2.5 py-0.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSlideKey === "eval"
                  ? "bg-[#e95623] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              {isPmMode ? "KPI & Rekap Harian" : "Rekap Kinerja Harian"}
            </button>
            {kpiDetailChunks.map((chunk) => (
              <button
                key={chunk.id}
                type="button"
                onClick={() => setActiveSlideKey(chunk.id)}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeSlideKey === chunk.id
                    ? "bg-[#e95623] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                {chunk.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar during export */}
        {isExporting && (
          <div className="px-6 py-2 bg-orange-50 border-b border-orange-200 flex items-center gap-3 text-xs font-semibold text-orange-800 animate-pulse shrink-0">
            <RefreshCw size={14} className="animate-spin text-[#e95623]" />
            <span>{exportProgressText}</span>
          </div>
        )}

        {/* ========================================================== */}
        {/* SLIDE CANVAS VIEWPORT (CLEAN LIGHT CANVAS CONTAINER)        */}
        {/* ========================================================== */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80 flex items-center justify-center">
          <div className="relative shadow-xl rounded-2xl overflow-hidden bg-white text-slate-900 border border-slate-200">
            {/* ============================================================== */}
            {/* SLIDE(S): WEEK CHUNK BOARDS (7-DAY MATRICES)                   */}
            {/* ============================================================== */}
            {weekChunks.map((w) => {
              const chunkAllItems = w.days.flatMap((d) => d.items);
              const chunkCompleted = chunkAllItems.filter((i) => i.status === "Completed").length;
              const chunkPlan = w.days.reduce((acc, d) => acc + d.targetUnits, 0);
              const chunkPercent =
                chunkPlan > 0 ? Math.min(100, Math.round((chunkCompleted / chunkPlan) * 100)) : 0;
              const chunkTheme = getAchievementTheme(chunkPercent);
              const chunkKpi = isPmMode ? computePsKpiMetrics(chunkAllItems) : null;
              const maxDayItems = isPmMode ? 8 : 10;

              return (
                <div
                  key={w.id}
                  ref={(el) => {
                    weekSlideRefs.current[w.id] = el;
                  }}
                  style={{
                    width: "1122px",
                    height: "793px",
                    display: activeSlideKey === w.id ? "flex" : "none",
                  }}
                  className="flex-col justify-between p-6 bg-white select-none"
                >
                  {/* Slide Header */}
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
                      <div className="flex items-center gap-3">
                        <img
                          src="/coa-logo-bdp.png"
                          alt="Logo PT Batara Dharma Persada"
                          className="h-10 w-10 object-contain"
                        />
                        <div>
                          <h1 className="text-sm font-black tracking-wider text-slate-900 uppercase">
                            PT BATARA DHARMA PERSADA
                          </h1>
                          <span className="text-[10px] font-extrabold text-[#e95623] tracking-wide block">
                            PLANT & MAINTENANCE DIVISION &bull; {isPmMode ? "WEEKLY PERIODIC SERVICE (PS)" : "WEEKLY PERIODIC INSPECTION (PI)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-900 text-white tracking-wide">
                          {siteLabel.toUpperCase()}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-orange-100 text-[#e95623] border border-orange-200 tracking-wide">
                          {w.label}: {w.dateRangeStr}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-100 text-slate-700">
                          Target: {activeScheduleData?.defaultDailyTarget || (isPmMode ? 4 : 9)} Unit/Hari
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400">
                        Slide {w.weekNum} / {totalSlidesIncluded} &bull; {todayDateString}
                      </span>
                    </div>

                    {/* 4 Executive KPI Cards */}
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {/* Card 1: Total Plan */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Target Plan ({w.label})
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black text-slate-900 font-mono">
                            {chunkPlan}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Unit Head</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          Target kumulatif {w.days.length} hari kerja
                        </span>
                      </div>

                      {/* Card 2: Total Terjadwal */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Masuk Jadwal
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black text-slate-900 font-mono">
                            {chunkAllItems.length}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">Unit Terjadwal</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          Tersebar pada periode {w.dateRangeStr}
                        </span>
                      </div>

                      {/* Card 3: Realisasi Selesai */}
                      <div className={`${chunkTheme.cardBg} border ${chunkTheme.border} rounded-xl p-2.5`}>
                        <span className={`text-[9px] font-bold ${chunkTheme.titleText} uppercase tracking-wider block`}>
                          {isPmMode ? "Servis Selesai (Completed)" : "Inspeksi Selesai (Completed)"}
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className={`text-xl font-black ${chunkTheme.valText} font-mono`}>
                            {chunkCompleted}
                          </span>
                          <span className={`text-[10px] font-bold ${chunkTheme.subText}`}>
                            / {chunkPlan} Unit
                          </span>
                          <span className={`text-xs font-black ${chunkTheme.valText} ml-auto`}>
                            {chunkPercent}%
                          </span>
                        </div>
                        <div className={`w-full ${chunkTheme.barTrack} rounded-full h-1.5 mt-1 overflow-hidden`}>
                          <div
                            className={`${chunkTheme.barFill} h-1.5 rounded-full transition-all`}
                            style={{ width: `${chunkPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Card 4: Populasi Unit */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Populasi Head Unit Aktif
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black text-slate-900 font-mono">
                            {activeScheduleData?.primeMoverPopulation ?? 0}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            Head Prime Mover
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          Total Semua Site: {activeScheduleData?.totalPopulationAllSites || 71} Head
                        </span>
                      </div>
                    </div>

                    {/* PERIODIC SERVICE KPI COMPLIANCE STRIP (PM MODE ONLY) */}
                    {isPmMode && chunkKpi && (
                      <div className="mt-2 bg-slate-50/90 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
                        <div className="shrink-0 pr-2 border-r border-slate-200">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700 block leading-tight">
                            KPI Compliance
                          </span>
                          <span className="text-[7.5px] font-semibold text-slate-400 block">
                            Minggu Ke-{w.weekNum}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-2 flex-1">
                          {[
                            { label: "PM Compliance", metric: chunkKpi.pmCompliance },
                            { label: "Akurasi Servis", metric: chunkKpi.akurasiServis },
                            { label: "Achievement Servis", metric: chunkKpi.achievementServis },
                            { label: "Akurasi HM (±50j)", metric: chunkKpi.akurasiHm },
                            { label: "Start Time (±1j)", metric: chunkKpi.akurasiStartTime },
                            { label: "Lead Time (±2j)", metric: chunkKpi.akurasiLeadTime },
                          ].map((kpi) => {
                            const hasPlan = kpi.metric.plan > 0;
                            const kpiTheme = getKpiComplianceTheme(kpi.metric.pct, hasPlan);
                            return (
                              <div
                                key={kpi.label}
                                className={`rounded-lg border px-2 py-1 ${kpiTheme.cardBg} ${kpiTheme.border}`}
                              >
                                <span className="text-[7.5px] font-bold text-slate-600 block truncate">
                                  {kpi.label}
                                </span>
                                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                                  <span className={`text-[11px] font-black font-mono ${kpiTheme.valText}`}>
                                    {hasPlan ? formatKpiPct(kpi.metric.pct) : "-"}
                                  </span>
                                  <span className="text-[7.5px] font-mono font-bold text-slate-500">
                                    {kpi.metric.actual}/{kpi.metric.plan}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 7-DAY WEEKLY GRID MATRIX */}
                    <div
                      className={`grid gap-2 mt-3 items-stretch ${
                        w.days.length === 7
                          ? "grid-cols-7"
                          : w.days.length === 6
                          ? "grid-cols-6"
                          : w.days.length === 5
                          ? "grid-cols-5"
                          : "grid-cols-7"
                      }`}
                    >
                      {w.days.map((day) => {
                        const isCompletedMet =
                          day.completedCount >= day.targetUnits && day.targetUnits > 0;
                        const completionPercent =
                          day.targetUnits > 0
                            ? Math.min(
                                100,
                                Math.round((day.completedCount / day.targetUnits) * 100)
                              )
                            : 0;
                        const dayTheme = getAchievementTheme(completionPercent);

                        return (
                          <div
                            key={day.date}
                            className={`border rounded-xl flex flex-col bg-slate-50/50 overflow-hidden ${
                              day.isToday
                                ? "border-[#e95623] shadow-xs"
                                : "border-slate-200"
                            }`}
                          >
                            {/* Day Header */}
                            <div
                              className={`px-2 py-1.5 border-b text-center ${
                                day.isToday
                                  ? "bg-orange-50 border-orange-200"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                                  {day.dayName}
                                </span>
                                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                  Plan: {day.targetUnits}
                                </span>
                              </div>

                              <div className="flex items-baseline justify-between mt-0.5">
                                <span className="text-[9px] font-semibold text-slate-500">
                                  {day.dayDateFormatted}
                                </span>
                                <span
                                  className={`text-[9px] font-mono font-black ${
                                    day.completedCount === 0
                                      ? "text-slate-700"
                                      : dayTheme.valText
                                  }`}
                                >
                                  {day.completedCount}/{day.targetUnits}
                                </span>
                              </div>

                              {/* Progress line */}
                              <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-1 rounded-full ${
                                    day.completedCount === 0
                                      ? "bg-transparent"
                                      : dayTheme.barFill
                                  }`}
                                  style={{ width: `${completionPercent}%` }}
                                />
                              </div>

                              {/* Lead Inspector / Mechanic Badge in PDF */}
                              {(day.leadMechanic || day.leadInspector) && (
                                <div className="mt-1 flex items-center justify-between px-1 py-0.5 rounded bg-orange-50 border border-orange-200/60 text-[7px] text-orange-900 font-bold truncate">
                                  <span>Lead:</span>
                                  <span className="truncate">{day.leadMechanic || day.leadInspector}</span>
                                </div>
                              )}
                            </div>

                            {/* Unit Items */}
                            <div className="p-1 space-y-1 flex-1 overflow-hidden">
                              {day.items.length === 0 ? (
                                <div className="py-8 text-center text-[9px] text-slate-400">
                                  Tidak ada jadwal
                                </div>
                              ) : (
                                <>
                                  {day.items.slice(0, maxDayItems).map((item) => {
                                    const isCompleted = item.status === "Completed";
                                    const isInProgress = item.status === "In Progress";
                                    const isPending = item.status === "Pending";
                                    const unitInfo = masterUnits.find((u) => u.unitCode === item.unitCode);
                                    const trailerText = isPmMode
                                      ? item.buntutSummary?.trim() ||
                                        (unitInfo?.category === "Prime Mover"
                                          ? "Head Only"
                                          : unitInfo?.category || "-")
                                      : item.buntutSummary ||
                                        unitInfo?.trailers?.summary ||
                                        unitInfo?.buntutSummary ||
                                        "-";

                                    return (
                                      <div
                                        key={item.id}
                                        className={`p-1 rounded-lg border text-left leading-tight ${
                                          isCompleted
                                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                                            : isInProgress
                                            ? "bg-amber-50/70 border-amber-200 text-amber-950"
                                            : isPending
                                            ? "bg-rose-50/70 border-rose-200 text-rose-950"
                                            : "bg-white border-slate-200/90 text-slate-800"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1">
                                            <Truck
                                              size={9}
                                              className={
                                                isCompleted
                                                  ? "text-emerald-600"
                                                  : isInProgress
                                                  ? "text-amber-600"
                                                  : isPending
                                                  ? "text-rose-600"
                                                  : "text-[#e95623]"
                                              }
                                            />
                                            <span className="text-[10px] font-black tracking-tight font-mono">
                                              {item.unitCode}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-[7px] font-black uppercase px-1 py-0.2 rounded ${
                                              isCompleted
                                                ? "bg-emerald-600 text-white"
                                                : isInProgress
                                                ? "bg-amber-500 text-white"
                                                : isPending
                                                ? "bg-rose-600 text-white"
                                                : "bg-slate-200 text-slate-700"
                                            }`}
                                          >
                                            {item.status}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[7.5px] text-slate-500 mt-0.5">
                                          <span className="truncate max-w-22.5 font-mono">
                                            {isPmMode ? (item.serviceType || trailerText) : trailerText}
                                          </span>
                                          <span className="text-[7px] font-semibold text-slate-600 bg-slate-100/90 px-1 rounded">
                                            {item.shift === "Shift 2" ? "S2" : "S1"}
                                          </span>
                                        </div>
                                        {isPmMode && (item.currentKm || item.liveKm) ? (
                                          <div className="text-[6.5px] text-slate-500 font-mono truncate mt-0.5">
                                            {(item.currentKm ?? item.liveKm)?.toLocaleString("id-ID")} km{(item.currentHm ?? item.liveHm) ? ` • ${(item.currentHm ?? item.liveHm)?.toLocaleString("id-ID")} hm` : ""}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                  {day.items.length > maxDayItems && (
                                    <div className="text-[7.5px] font-bold text-center text-slate-500 bg-slate-100/90 rounded py-0.5">
                                      +{day.items.length - maxDayItems} unit lagi ({isPmMode ? "Detail di Slide KPI Unit" : "Detail di Slide Evaluasi"})
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slide Footer */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">Status Legend:</span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Completed (Selesai)
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        In Progress (Sedang Berjalan)
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        Scheduled (Terjadwal)
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Pending (Tertunda)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-[8.5px]">
                      <span>Divisi Plant & Maintenance</span>
                      <span>Dicetak: {todayDateString}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ============================================================== */}
            {/* SLIDE: EVALUASI KINERJA KUMULATIF & KPI COMPLIANCE             */}
            {/* ============================================================== */}
            <div
              ref={evalSlideRef}
              style={{
                width: "1122px",
                height: "793px",
                display: activeSlideKey === "eval" ? "flex" : "none",
              }}
              className="flex-col justify-between p-6 bg-white select-none"
            >
              {/* Header Slide Evaluasi */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src="/coa-logo-bdp.png"
                      alt="Logo PT Batara Dharma Persada"
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <h1 className="text-sm font-black tracking-wider text-slate-900 uppercase">
                        PT BATARA DHARMA PERSADA
                      </h1>
                      <span className="text-[10px] font-extrabold text-[#e95623] tracking-wide block">
                        {isPmMode
                          ? "RINGKASAN KPI COMPLIANCE & EVALUASI HARIAN PERIODIC SERVICE (PS)"
                          : "EVALUASI KINERJA & RINGKASAN PERIODIC INSPECTION (PI)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-900 text-white tracking-wide">
                      {siteLabel.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-orange-100 text-[#e95623] border border-orange-200 tracking-wide">
                      Periode: {overallRangeLabel}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400">
                    Slide Evaluasi / {totalSlidesIncluded} &bull; {todayDateString}
                  </span>
                </div>

                {/* 6 PARAMETER KPI COMPLIANCE SUMMARY CARDS (PM MODE) */}
                {isPmMode && pmKpiSummary && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-700">
                        Perhitungan KPI Compliance Periodic Service ({overallRangeLabel})
                      </span>
                      {pmKpiSummary.incompleteActualCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[8.5px] font-bold">
                          Catatan: {pmKpiSummary.incompleteActualCount} unit Completed belum input aktual HM/Start/Lead
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        {
                          title: "PM Compliance",
                          sub: "Total semua 5 parameter",
                          metric: pmKpiSummary.pmCompliance,
                        },
                        {
                          title: "Akurasi Servis",
                          sub: "Unit selesai vs aktual",
                          metric: pmKpiSummary.akurasiServis,
                        },
                        {
                          title: "Achievement Servis",
                          sub: "Ketepatan rencana servis",
                          metric: pmKpiSummary.achievementServis,
                        },
                        {
                          title: "Akurasi HM (±50j)",
                          sub: "Toleransi ±50 jam",
                          metric: pmKpiSummary.akurasiHm,
                        },
                        {
                          title: "Akurasi Start (±1j)",
                          sub: "Toleransi ±1 jam",
                          metric: pmKpiSummary.akurasiStartTime,
                        },
                        {
                          title: "Akurasi Lead (±2j)",
                          sub: "Toleransi ±2 jam",
                          metric: pmKpiSummary.akurasiLeadTime,
                        },
                      ].map((card) => {
                        const hasPlan = card.metric.plan > 0;
                        const kpiTheme = getKpiComplianceTheme(card.metric.pct, hasPlan);
                        const barWidth = Math.max(0, Math.min(100, card.metric.pct));
                        return (
                          <div
                            key={card.title}
                            className={`rounded-xl border p-2.5 ${kpiTheme.cardBg} ${kpiTheme.border}`}
                          >
                            <span className="text-[8.5px] font-extrabold text-slate-700 uppercase tracking-wide block truncate">
                              {card.title}
                            </span>
                            <div className="flex items-baseline justify-between gap-1 mt-1">
                              <span className={`text-lg font-black font-mono leading-none ${kpiTheme.valText}`}>
                                {hasPlan ? formatKpiPct(card.metric.pct) : "-"}
                              </span>
                              <span className="text-[8.5px] font-mono font-bold text-slate-600">
                                {card.metric.actual}/{card.metric.plan}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-white/80 rounded-full overflow-hidden mt-1.5 border border-slate-200/70">
                              <div
                                className={`h-full rounded-full ${kpiTheme.barFill}`}
                                style={{ width: `${hasPlan ? barWidth : 0}%` }}
                              />
                            </div>
                            <span className="text-[7.5px] text-slate-500 font-medium block mt-1 truncate">
                              {card.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daily Breakdown Table across the range */}
                <div className={`${isPmMode ? "mt-3" : "mt-4"} border border-slate-200 rounded-xl overflow-hidden shadow-2xs`}>
                  <table className={`w-full text-left border-collapse ${isPmMode ? "text-[9px]" : "text-[10px]"}`}>
                    <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[8.5px]">
                      {isPmMode ? (
                        <tr>
                          <th className="py-1.5 px-2.5">Hari &amp; Tanggal</th>
                          <th className="py-1.5 px-1.5 text-center">Plan</th>
                          <th className="py-1.5 px-1.5 text-center">Jadwal</th>
                          <th className="py-1.5 px-1.5 text-center text-emerald-700">Comp</th>
                          <th className="py-1.5 px-1.5 text-center text-amber-700">Prog</th>
                          <th className="py-1.5 px-1.5 text-center text-rose-700">Pend</th>
                          <th className="py-1.5 px-1.5 text-center text-slate-800">PM Comp.</th>
                          <th className="py-1.5 px-1.5 text-center">Akurasi</th>
                          <th className="py-1.5 px-1.5 text-center">Achiev.</th>
                          <th className="py-1.5 px-1.5 text-center">HM ±50j</th>
                          <th className="py-1.5 px-1.5 text-center">Start ±1j</th>
                          <th className="py-1.5 px-1.5 text-center">Lead ±2j</th>
                          <th className="py-1.5 px-2 text-right">Status</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="py-2 px-3">Hari &amp; Tanggal</th>
                          <th className="py-2 px-3 text-center">Plan Target</th>
                          <th className="py-2 px-3 text-center">Terjadwal</th>
                          <th className="py-2 px-3 text-center text-emerald-700">Completed</th>
                          <th className="py-2 px-3 text-center text-amber-700">In Progress</th>
                          <th className="py-2 px-3 text-center text-slate-600">Scheduled</th>
                          <th className="py-2 px-3 text-center text-rose-700">Pending</th>
                          <th className="py-2 px-3 text-center">% Achieved</th>
                          <th className="py-2 px-3 text-right">Status Harian</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const allDays = activeScheduleData?.days || [];
                        const maxVisibleRows = isPmMode ? 10 : 14;
                        const visibleDays = allDays.slice(0, maxVisibleRows);
                        const hiddenDayCount = allDays.length - visibleDays.length;

                        return (
                          <>
                            {visibleDays.map((d) => {
                              const comp = d.items.filter((i) => i.status === "Completed").length;
                              const inProg = d.items.filter((i) => i.status === "In Progress").length;
                              const sched = d.items.filter((i) => i.status === "Scheduled").length;
                              const pend = d.items.filter((i) => i.status === "Pending").length;
                              const pct = d.targetUnits > 0 ? Math.round((comp / d.targetUnits) * 100) : 0;
                              const rowTheme = getAchievementTheme(pct);

                              if (isPmMode) {
                                const dayKpi = computePsKpiMetrics(d.items);
                                const pmHasPlan = dayKpi.pmCompliance.plan > 0;
                                const pmTheme = getKpiComplianceTheme(dayKpi.pmCompliance.pct, pmHasPlan);
                                const fmtCell = (m: { plan: number; pct: number }) =>
                                  m.plan > 0 ? formatKpiPct(m.pct) : "-";

                                return (
                                  <tr key={d.date} className="hover:bg-slate-50">
                                    <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                      <div>{d.dayName}, {d.date}</div>
                                      {(d.leadMechanic || d.leadInspector) && (
                                        <div className="text-[8px] font-semibold text-orange-700">
                                          Lead: {d.leadMechanic || d.leadInspector}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold">{d.targetUnits}</td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-700">{d.items.length}</td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">{comp}</td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-amber-700">{inProg}</td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-rose-700">{pend}</td>
                                    <td className={`py-1.5 px-1.5 text-center font-mono font-black ${pmTheme.valText}`}>
                                      {fmtCell(dayKpi.pmCompliance)}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-700">
                                      {fmtCell(dayKpi.akurasiServis)}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-700">
                                      {fmtCell(dayKpi.achievementServis)}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-700">
                                      {fmtCell(dayKpi.akurasiHm)}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-700">
                                      {fmtCell(dayKpi.akurasiStartTime)}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-700">
                                      {fmtCell(dayKpi.akurasiLeadTime)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                      <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase ${pmTheme.badge}`}>
                                        {!pmHasPlan
                                          ? "N/A"
                                          : dayKpi.pmCompliance.pct >= 90
                                          ? "On Target"
                                          : dayKpi.pmCompliance.pct >= 70
                                          ? "Warning"
                                          : "Below"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={d.date} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-bold text-slate-800">
                                    <div>{d.dayName}, {d.date}</div>
                                    {(d.leadMechanic || d.leadInspector) && (
                                      <div className="text-[9px] font-semibold text-orange-700">Lead: {d.leadMechanic || d.leadInspector}</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono font-bold">{d.targetUnits} Unit</td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">{d.items.length}</td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">{comp}</td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">{inProg}</td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">{sched}</td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">{pend}</td>
                                  <td className={`py-2 px-3 text-center font-mono font-extrabold ${comp === 0 ? "text-slate-400" : rowTheme.valText}`}>{pct}%</td>
                                  <td className="py-2 px-3 text-right">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                        comp === 0
                                          ? "bg-slate-100 text-slate-500"
                                          : rowTheme.badge
                                      }`}
                                    >
                                      {comp === 0 ? "Belum Mulai" : rowTheme.statusLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}

                            {hiddenDayCount > 0 && (
                              <tr className="bg-slate-50/80 text-slate-500 italic">
                                <td colSpan={isPmMode ? 13 : 9} className="py-1 px-2.5 text-center text-[8.5px]">
                                  + {hiddenDayCount} hari lainnya dalam rentang {overallRangeLabel} telah diperhitungkan pada baris TOTAL KUMULATIF PERIODE di bawah.
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                      {/* Summary Row */}
                      {(() => {
                        if (isPmMode && pmKpiSummary) {
                          const hasPlan = pmKpiSummary.pmCompliance.plan > 0;
                          const totalKpiTheme = getKpiComplianceTheme(pmKpiSummary.pmCompliance.pct, hasPlan);
                          const fmtTot = (m: { plan: number; pct: number }) =>
                            m.plan > 0 ? formatKpiPct(m.pct) : "-";
                          return (
                            <tr className="bg-slate-100/90 font-black text-slate-900 border-t border-slate-300">
                              <td className="py-2 px-2.5 uppercase tracking-wider">TOTAL KUMULATIF</td>
                              <td className="py-2 px-1.5 text-center font-mono">{totalWeekPlan}</td>
                              <td className="py-2 px-1.5 text-center font-mono">{allItems.length}</td>
                              <td className="py-2 px-1.5 text-center font-mono text-emerald-700">{totalCompleted}</td>
                              <td className="py-2 px-1.5 text-center font-mono text-amber-700">{totalInProgress}</td>
                              <td className="py-2 px-1.5 text-center font-mono text-rose-700">{totalPending}</td>
                              <td className={`py-2 px-1.5 text-center font-mono font-black ${totalKpiTheme.valText}`}>
                                {fmtTot(pmKpiSummary.pmCompliance)}
                              </td>
                              <td className="py-2 px-1.5 text-center font-mono">{fmtTot(pmKpiSummary.akurasiServis)}</td>
                              <td className="py-2 px-1.5 text-center font-mono">{fmtTot(pmKpiSummary.achievementServis)}</td>
                              <td className="py-2 px-1.5 text-center font-mono">{fmtTot(pmKpiSummary.akurasiHm)}</td>
                              <td className="py-2 px-1.5 text-center font-mono">{fmtTot(pmKpiSummary.akurasiStartTime)}</td>
                              <td className="py-2 px-1.5 text-center font-mono">{fmtTot(pmKpiSummary.akurasiLeadTime)}</td>
                              <td className="py-2 px-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase ${totalKpiTheme.badge}`}>
                                  {!hasPlan
                                    ? "N/A"
                                    : pmKpiSummary.pmCompliance.pct >= 90
                                    ? "On Target"
                                    : pmKpiSummary.pmCompliance.pct >= 70
                                    ? "Warning"
                                    : "Below"}
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        const totalTheme = getAchievementTheme(overallAchievementPercent);
                        return (
                          <tr className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-300">
                            <td className="py-2.5 px-3 uppercase tracking-wider">TOTAL KUMULATIF PERIODE</td>
                            <td className="py-2.5 px-3 text-center font-mono">{totalWeekPlan} Unit</td>
                            <td className="py-2.5 px-3 text-center font-mono">{allItems.length}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-700">{totalCompleted}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-amber-700">{totalInProgress}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-700">{totalScheduled}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-rose-700">{totalPending}</td>
                            <td className={`py-2.5 px-3 text-center font-mono font-black ${totalTheme.valText}`}>{overallAchievementPercent}%</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${totalTheme.badge}`}>
                                {totalTheme.statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slide Evaluasi Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-400">
                <span>Dokumen Resmi Presentasi {isPmMode ? "Periodic Service" : "Weekly"} &bull; PT Batara Dharma Persada</span>
                <span>Dicetak pada: {todayDateString}</span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SLIDES: DETAIL EVALUASI KPI PER UNIT (PM MODE)                 */}
            {/* ============================================================== */}
            {isPmMode &&
              kpiDetailChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  ref={(el) => {
                    kpiDetailSlideRefs.current[chunk.id] = el;
                  }}
                  style={{
                    width: "1122px",
                    height: "793px",
                    display: activeSlideKey === chunk.id ? "flex" : "none",
                  }}
                  className="flex-col justify-between p-6 bg-white select-none"
                >
                  <div>
                    {/* Header Slide Detail KPI Unit */}
                    <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
                      <div className="flex items-center gap-3">
                        <img
                          src="/coa-logo-bdp.png"
                          alt="Logo PT Batara Dharma Persada"
                          className="h-10 w-10 object-contain"
                        />
                        <div>
                          <h1 className="text-sm font-black tracking-wider text-slate-900 uppercase">
                            PT BATARA DHARMA PERSADA
                          </h1>
                          <span className="text-[10px] font-extrabold text-[#e95623] tracking-wide block">
                            DETAIL EVALUASI KPI UNIT PERIODIC SERVICE (PLAN VS ACTUAL)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-900 text-white tracking-wide">
                          {siteLabel.toUpperCase()}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-orange-100 text-[#e95623] border border-orange-200 tracking-wide">
                          Periode: {overallRangeLabel}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400">
                        {chunk.label} / {totalSlidesIncluded} &bull; {todayDateString}
                      </span>
                    </div>

                    {/* Evaluation Tolerance Legend */}
                    <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[8.5px]">
                      <div className="font-semibold text-slate-600">
                        <span className="font-black text-slate-800 uppercase mr-2">Standar KPI:</span>
                        Akurasi HM (&plusmn;50 Jam) &bull; Akurasi Start Time (&plusmn;1 Jam) &bull; Akurasi Lead Time (&plusmn;2 Jam)
                      </div>
                      <span className="font-bold text-slate-500">
                        Menampilkan unit {chunk.startIndex + 1}&ndash;{chunk.startIndex + chunk.items.length} dari {allItems.length} unit
                      </span>
                    </div>

                    {/* Unit Detail Table */}
                    <div className="mt-2.5 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-[8.5px] border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[8px]">
                          <tr>
                            <th className="py-1.5 px-2 text-center w-8">No</th>
                            <th className="py-1.5 px-2">Tanggal</th>
                            <th className="py-1.5 px-2">Unit &amp; Kategori</th>
                            <th className="py-1.5 px-2">Tipe Servis</th>
                            <th className="py-1.5 px-2 text-center">Status</th>
                            <th className="py-1.5 px-2">HM Plan / Act (&plusmn;50j)</th>
                            <th className="py-1.5 px-2">Start Plan / Act (&plusmn;1j)</th>
                            <th className="py-1.5 px-2">Lead Plan / Act (&plusmn;2j)</th>
                            <th className="py-1.5 px-2">Pengawas &amp; Mekanik</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {chunk.items.map((item, idx) => {
                            const ev = evaluatePmItemKpi(item);
                            const unitCat = resolvePsUnitCategory(item, masterUnits);
                            const mechanicsList = resolveMechanicsArray(item);
                            const renderPassBadge = (pass: boolean | null) => {
                              if (pass === true) {
                                return (
                                  <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[7px] uppercase">
                                    OK
                                  </span>
                                );
                              }
                              if (pass === false) {
                                return (
                                  <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[7px] uppercase">
                                    MISS
                                  </span>
                                );
                              }
                              return (
                                <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-400 font-bold text-[7px]">
                                  -
                                </span>
                              );
                            };

                            const statusBadgeClass =
                              item.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "In Progress"
                                ? "bg-amber-100 text-amber-800"
                                : item.status === "Pending"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700";

                            return (
                              <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/70">
                                <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-500">
                                  {chunk.startIndex + idx + 1}
                                </td>
                                <td className="py-1.5 px-2 whitespace-nowrap">
                                  <div className="font-bold text-slate-800">{item.date}</div>
                                  <div className="text-[7.5px] text-slate-400">{item.dayName}</div>
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="font-black text-slate-900">{item.unitCode}</div>
                                  <div className="text-[7.5px] font-semibold text-slate-500">{unitCat}</div>
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="font-bold text-slate-800">{item.serviceType || "-"}</div>
                                  {item.buntutSummary && (
                                    <div className="text-[7.5px] text-slate-400 truncate max-w-[120px]">
                                      + {item.buntutSummary}
                                    </div>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase ${statusBadgeClass}`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 font-mono">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-slate-700">
                                      {ev.hm.planVal != null ? ev.hm.planVal.toLocaleString("id-ID") : item.planHmServis || "-"}
                                      {" / "}
                                      <strong>{ev.hm.actualVal != null ? ev.hm.actualVal.toLocaleString("id-ID") : "-"}</strong>
                                    </span>
                                    {renderPassBadge(ev.hm.pass)}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 font-mono">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-slate-700">
                                      {item.planStartTime || "-"} / <strong>{item.actualStartTime || "-"}</strong>
                                    </span>
                                    {renderPassBadge(ev.startTime.pass)}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 font-mono">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-slate-700">
                                      {item.planLeadTime || "-"} / <strong>{item.actualLeadTime || "-"}</strong>
                                    </span>
                                    {renderPassBadge(ev.leadTime.pass)}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="font-bold text-slate-700 truncate max-w-[140px]">
                                    {item.supervisorName ? `Spv: ${item.supervisorName}` : item.leadName ? `Lead: ${item.leadName}` : "-"}
                                  </div>
                                  <div className="text-[7.5px] text-slate-500 truncate max-w-[140px]">
                                    {mechanicsList.length > 0 ? mechanicsList.join(", ") : "-"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Slide Footer */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-400">
                    <span>Detail KPI Compliance Unit &bull; PT Batara Dharma Persada</span>
                    <span>Dicetak pada: {todayDateString}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
