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
  PeriodicInspectionItem,
  DaySchedule,
  plantService,
} from "../services/plantService";

interface PeriodicInspectionPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleData: WeeklyScheduleData | null;
  selectedSite: "MuaraPahu" | "Senyiur";
  masterUnits: MasterUnit[];
  initialStartDate?: string;
  initialEndDate?: string;
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
}) => {
  // -------------------------------------------------------------
  // Date Range Filter States
  // -------------------------------------------------------------
  const [rangePreset, setRangePreset] = useState<"current" | "2weeks" | "month" | "custom">(
    initialStartDate && initialEndDate ? "custom" : "current"
  );
  const [customStart, setCustomStart] = useState<string>(() => {
    return initialStartDate || scheduleData?.weekRange.startDate || new Date().toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return initialEndDate || scheduleData?.weekRange.endDate || new Date().toISOString().slice(0, 10);
  });

  const [activeScheduleData, setActiveScheduleData] = useState<WeeklyScheduleData | null>(scheduleData);
  const [isLoadingRange, setIsLoadingRange] = useState<boolean>(false);

  // Sync activeScheduleData when scheduleData changes and preset is "current"
  useEffect(() => {
    if (rangePreset === "current" && scheduleData) {
      setActiveScheduleData(scheduleData);
      setCustomStart(scheduleData.weekRange.startDate);
      setCustomEnd(scheduleData.weekRange.endDate);
    }
  }, [scheduleData, rangePreset]);

  // Load custom range data
  const fetchDateRangeData = useCallback(
    async (startStr: string, endStr: string) => {
      try {
        setIsLoadingRange(true);
        const data = await plantService.getWeeklySchedule(
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
    [selectedSite]
  );

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

  // Active Slide Preview (id: "week-1", "week-2", ..., "eval")
  const [activeSlideKey, setActiveSlideKey] = useState<string>("week-1");

  // Keep activeSlideKey valid
  useEffect(() => {
    if (activeSlideKey === "eval") return;
    const exists = weekChunks.some((w) => w.id === activeSlideKey);
    if (!exists && weekChunks.length > 0) {
      setActiveSlideKey(weekChunks[0].id);
    }
  }, [weekChunks, activeSlideKey]);

  // Export Loading State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>("");

  // Refs for rendering to canvas
  const weekSlideRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

  const totalWeekPlan = activeScheduleData?.summary.totalWeekPlan || 63;
  const overallAchievementPercent =
    totalWeekPlan > 0 ? Math.min(100, Math.round((totalCompleted / totalWeekPlan) * 100)) : 0;

  const totalSlidesIncluded =
    weekChunks.filter((w) => isSlideIncluded(w.id)).length +
    (isSlideIncluded("eval") ? 1 : 0);

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

      // 2. Render Final Slide: Evaluasi & Otorisasi
      if (isSlideIncluded("eval") && evalSlideRef.current) {
        setExportProgressText("Merender Slide Evaluasi Kinerja & Lembar Pengesahan...");
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

      setExportProgressText("Menyimpan dan mengunduh berkas PDF presentasi...");
      const sanitizedSite = selectedSite === "MuaraPahu" ? "MuaraPahu" : "Senyiur";
      const sDateStr = (activeScheduleData?.weekRange.startDate || customStart).replace(/-/g, "");
      const eDateStr = (activeScheduleData?.weekRange.endDate || customEnd).replace(/-/g, "");
      const fileName = `Periodic_Inspection_Weekly_Deck_${sanitizedSite}_${sDateStr}_sd_${eDateStr}.pdf`;

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
              Ekspor Bahan Presentasi Weekly &bull; Periodic Inspection (PI)
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
                <strong className="text-[#e95623]">{weekChunks.length} Slide Board</strong> + 1 Slide Evaluasi)
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
              <span>Slide Rekap Kinerja Harian</span>
            </label>
          </div>

          {/* Preview Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
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
              Rekap Kinerja Harian
            </button>
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
                            PLANT & MAINTENANCE DIVISION &bull; WEEKLY PERIODIC INSPECTION (PI)
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
                          Target: {activeScheduleData?.defaultDailyTarget || 9} Unit/Hari
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
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Inspeksi Selesai (Completed)
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl font-black text-emerald-700 font-mono">
                            {chunkCompleted}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800">
                            / {chunkPlan} Unit
                          </span>
                          <span className="text-xs font-black text-emerald-700 ml-auto">
                            {chunkPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full transition-all"
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
                                    isCompletedMet ? "text-emerald-600" : "text-slate-700"
                                  }`}
                                >
                                  {day.completedCount}/{day.targetUnits}
                                </span>
                              </div>

                              {/* Progress line */}
                              <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-1 rounded-full ${
                                    isCompletedMet
                                      ? "bg-emerald-500"
                                      : day.completedCount > 0
                                      ? "bg-amber-500"
                                      : "bg-transparent"
                                  }`}
                                  style={{ width: `${completionPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Unit Items */}
                            <div className="p-1 space-y-1 flex-1 overflow-hidden">
                              {day.items.length === 0 ? (
                                <div className="py-8 text-center text-[9px] text-slate-400">
                                  Tidak ada jadwal
                                </div>
                              ) : (
                                <>
                                  {day.items.slice(0, 10).map((item) => {
                                    const isCompleted = item.status === "Completed";
                                    const isInProgress = item.status === "In Progress";
                                    const isPending = item.status === "Pending";
                                    const unitInfo = masterUnits.find((u) => u.unitCode === item.unitCode);
                                    const trailerText =
                                      item.buntutSummary ||
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
                                            {trailerText}
                                          </span>
                                          <span className="text-[7px] font-semibold text-slate-600 bg-slate-100/90 px-1 rounded">
                                            {item.shift === "Shift 2" ? "S2" : "S1"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {day.items.length > 10 && (
                                    <div className="text-[7.5px] font-bold text-center text-slate-500 bg-slate-100/90 rounded py-0.5">
                                      +{day.items.length - 10} unit lagi (Detail di Slide Evaluasi)
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
            {/* SLIDE: EVALUASI KINERJA KUMULATIF & LEMBAR PENGESAHAN          */}
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
                        EVALUASI KINERJA & RINGKASAN PERIODIC INSPECTION (PI)
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

                {/* Daily Breakdown Table across the range */}
                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[9px]">
                      <tr>
                        <th className="py-2 px-3">Hari & Tanggal</th>
                        <th className="py-2 px-3 text-center">Plan Target</th>
                        <th className="py-2 px-3 text-center">Terjadwal</th>
                        <th className="py-2 px-3 text-center text-emerald-700">Completed</th>
                        <th className="py-2 px-3 text-center text-amber-700">In Progress</th>
                        <th className="py-2 px-3 text-center text-slate-600">Scheduled</th>
                        <th className="py-2 px-3 text-center text-rose-700">Pending</th>
                        <th className="py-2 px-3 text-center">% Achieved</th>
                        <th className="py-2 px-3 text-right">Status Harian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeScheduleData?.days.map((d) => {
                        const comp = d.items.filter((i) => i.status === "Completed").length;
                        const inProg = d.items.filter((i) => i.status === "In Progress").length;
                        const sched = d.items.filter((i) => i.status === "Scheduled").length;
                        const pend = d.items.filter((i) => i.status === "Pending").length;
                        const pct = d.targetUnits > 0 ? Math.round((comp / d.targetUnits) * 100) : 0;
                        const isMet = comp >= d.targetUnits && d.targetUnits > 0;

                        return (
                          <tr key={d.date} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-800">
                              {d.dayName}, {d.date}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{d.targetUnits} Unit</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">{d.items.length}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">{comp}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">{inProg}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-600">{sched}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">{pend}</td>
                            <td className="py-2 px-3 text-center font-mono font-extrabold text-slate-900">{pct}%</td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                  isMet
                                    ? "bg-emerald-100 text-emerald-800"
                                    : comp > 0
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isMet ? "Target Tercapai" : comp > 0 ? "Sebagian Selesai" : "Belum Mulai"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Summary Row */}
                      <tr className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-300">
                        <td className="py-2.5 px-3 uppercase tracking-wider">TOTAL KUMULATIF PERIODE</td>
                        <td className="py-2.5 px-3 text-center font-mono">{totalWeekPlan} Unit</td>
                        <td className="py-2.5 px-3 text-center font-mono">{allItems.length}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-700">{totalCompleted}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-700">{totalInProgress}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">{totalScheduled}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-700">{totalPending}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{overallAchievementPercent}%</td>
                        <td className="py-2.5 px-3 text-right text-[#e95623]">
                          {overallAchievementPercent >= 100 ? "Memenuhi Target" : "Dalam Pemantauan"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slide Evaluasi Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-400">
                <span>Dokumen Resmi Presentasi Weekly &bull; PT Batara Dharma Persada</span>
                <span>Dicetak pada: {todayDateString}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
