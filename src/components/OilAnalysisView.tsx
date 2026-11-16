"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "../types/auth";
import {
  Droplets,
  FlaskConical,
  Shield,
  Clock,
  Sparkles,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Layers,
  Wrench,
  Check,
} from "lucide-react";
import { plantService } from "../services/plantService";
import {
  OilAnalysisModal,
  OilSampleItem,
  OIL_COMPONENTS_LIST,
} from "./OilAnalysisModal";
import { OilSamplingUploadModal } from "./OilSamplingUploadModal";

interface OilAnalysisViewProps {
  user?: User;
}

const STORAGE_KEY = "BDP_OIL_ANALYSIS_SAMPLES";

// Default Initial Sample Data matching user screenshots (ST-002 FAW 140LT)
const INITIAL_OIL_SAMPLES: OilSampleItem[] = [
  {
    id: "sample-st002-eng-1",
    unitCode: "ST-002",
    unitModel: "FAW 140LT",
    component: "ENGINE",
    barcodeLab: "LAB-17825",
    sampleDate: "14-Nov-26",
    hmUnit: 968,
    gradePelumas: "15W-40",
    rating: "NORMAL",
    si: 4,
    al: 2,
    na: 5,
    fe: 12,
    cu: 3,
    cr: 1,
    pb: 0,
    pqIndex: 15,
    visc100: 14.2,
    oxiOrIso6: 8.5,
    sootOrIso14: 0.3,
    waterOrTbn: 9.1,
    interpretation:
      "All Test Results Appear Acceptable. Take Oil Samples At 250 Hour Intervals To Monitor Condition.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-st002-hyd-1",
    unitCode: "ST-002",
    unitModel: "FAW 140LT",
    component: "HYDRAULIC SYSTEM",
    barcodeLab: "LAB-17826",
    sampleDate: "14-Nov-26",
    hmUnit: 968,
    gradePelumas: "TELLUS 46",
    rating: "NORMAL",
    si: 3,
    al: 1,
    na: 2,
    fe: 8,
    cu: 1,
    cr: 0,
    pb: 0,
    pqIndex: 10,
    visc100: 46.1,
    oxiOrIso6: 16,
    sootOrIso14: 13,
    waterOrTbn: 0.02,
    interpretation:
      "All Test Results Appear Acceptable. Cleanliness level ISO 4406 within target.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-st002-trans-1",
    unitCode: "ST-002",
    unitModel: "FAW 140LT",
    component: "TRANSMISSION",
    barcodeLab: "LAB-17827",
    sampleDate: "14-Nov-26",
    hmUnit: 968,
    gradePelumas: "TO-4 SAE 30",
    rating: "WARNING",
    si: 12,
    al: 5,
    na: 6,
    fe: 45,
    cu: 8,
    cr: 2,
    pb: 1,
    pqIndex: 28,
    visc100: 11.2,
    oxiOrIso6: 12.1,
    sootOrIso14: 0.8,
    waterOrTbn: 6.2,
    interpretation:
      "Caution: Moderate increase in iron (Fe) wear metal. Resample at 100 hours to monitor trend.",
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CRITICAL_METRICS = [
  { title: "Engine Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "ENGINE" },
  { title: "Transmission Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "TRANSMISSION" },
  { title: "Front Differential Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "FRONT DIFFERENTIAL" },
  { title: "Rear Differential Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "REAR DIFFERENTIAL" },
  { title: "Front Final Drive LH Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "FRONT FINAL DRIVE LH" },
  { title: "Front Final Drive RH Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "FRONT FINAL DRIVE RH" },
  { title: "Rear Final Drive LH Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "REAR FINAL DRIVE LH" },
  { title: "Rear Final Drive RH Component Critical", count: 63, subtext: "7 hari = 9 unit/hari", compKey: "REAR FINAL DRIVE RH" },
];

export const OilAnalysisView: React.FC<OilAnalysisViewProps> = ({ user }) => {
  // State for all samples
  const [samples, setSamples] = useState<OilSampleItem[]>(INITIAL_OIL_SAMPLES);

  // Selected Unit for Condition Monitoring
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>("ST-002");
  const [availableUnits, setAvailableUnits] = useState<Array<{ unitCode: string; label: string; model: string }>>([
    { unitCode: "ST-002", label: "ST-002 (FAW 140LT)", model: "FAW 140LT" },
    { unitCode: "PM401", label: "PM401 (VOLVO FH16)", model: "VOLVO FH16" },
    { unitCode: "PM402", label: "PM402 (VOLVO FH16)", model: "VOLVO FH16" },
    { unitCode: "PM403", label: "PM403 (VOLVO FH16)", model: "VOLVO FH16" },
    { unitCode: "EX-201", label: "EX-201 (KOMATSU PC200-8)", model: "KOMATSU PC200-8" },
    { unitCode: "EX-302", label: "EX-302 (HITACHI ZX350)", model: "HITACHI ZX350" },
    { unitCode: "DZ-002", label: "DZ-002 (ZOOMLION ZD-320)", model: "ZOOMLION ZD-320" },
  ]);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<"SEMUA" | "NORMAL" | "WARNING" | "CRITICAL">("SEMUA");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [editingSample, setEditingSample] = useState<OilSampleItem | null>(null);
  const [targetComponentForInput, setTargetComponentForInput] = useState<string>("ENGINE");

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSamples(parsed);
        }
      }
    } catch {}

    // Load master units from plant service
    plantService
      .getMasterUnits({ withTrailers: true })
      .then((res) => {
        if (res && res.data && res.data.length > 0) {
          const list = res.data.map((u: any) => ({
            unitCode: u.unitCode,
            label: `${u.unitCode} (${u.brand || ""} ${u.model || ""})`.trim(),
            model: `${u.brand || ""} ${u.model || ""}`.trim(),
          }));
          const existing = new Set(list.map((l: any) => l.unitCode));
          const extra = [
            { unitCode: "ST-002", label: "ST-002 (FAW 140LT)", model: "FAW 140LT" },
          ].filter((e) => !existing.has(e.unitCode));
          setAvailableUnits([...extra, ...list]);
        }
      })
      .catch(() => {});
  }, []);

  // Save to localStorage
  const saveSamples = (newSamples: OilSampleItem[]) => {
    setSamples(newSamples);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSamples));
    } catch {}
  };

  // Handle Save from Input Modal
  const handleSaveModal = (item: OilSampleItem) => {
    const existingIndex = samples.findIndex((s) => s.id === item.id);
    if (existingIndex >= 0) {
      const updated = [...samples];
      updated[existingIndex] = item;
      saveSamples(updated);
    } else {
      saveSamples([item, ...samples]);
    }
  };

  // Handle Delete
  const handleDeleteSample = (id: string, barcode: string) => {
    if (window.confirm(`Yakin ingin menghapus data sample laboratorium "${barcode}"?`)) {
      saveSamples(samples.filter((s) => s.id !== id));
    }
  };

  // Handle Batch Import from Excel Modal
  const handleSaveBatch = (newItems: OilSampleItem[]) => {
    const combined = [...newItems, ...samples];
    saveSamples(combined);
    alert(`Berhasil mengimpor ${newItems.length} data sampling oli ke sistem!`);
  };

  // Filtered samples for currently selected unit
  const unitSamples = useMemo(() => {
    return samples.filter((s) => s.unitCode.toUpperCase() === selectedUnitCode.toUpperCase());
  }, [samples, selectedUnitCode]);

  // Overall Status for the selected unit
  const overallUnitStatus = useMemo(() => {
    if (unitSamples.length === 0) return { label: "GOOD / NORMAL", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    const hasCritical = unitSamples.some((s) => s.rating === "CRITICAL");
    if (hasCritical) return { label: "CRITICAL", color: "text-rose-700 bg-rose-50 border-rose-200" };
    const hasWarning = unitSamples.some((s) => s.rating === "WARNING");
    if (hasWarning) return { label: "WARNING / CAUTION", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "GOOD / NORMAL", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }, [unitSamples]);

  // Selected Unit Info
  const selectedUnitObj = useMemo(() => {
    return (
      availableUnits.find((u) => u.unitCode === selectedUnitCode) || {
        unitCode: selectedUnitCode,
        label: `${selectedUnitCode} (FAW 140LT)`,
        model: "FAW 140LT",
      }
    );
  }, [availableUnits, selectedUnitCode]);

  // Compartments list to display: filter by search query
  const displayedComponents = useMemo(() => {
    let list = [...OIL_COMPONENTS_LIST];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.toLowerCase().includes(q));
    }
    return list;
  }, [searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Top 8 Summary Metric Cards matching Image 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 overflow-x-auto pb-1">
        {DEFAULT_CRITICAL_METRICS.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-w-32 hover:border-slate-300 transition-all"
          >
            <span className="text-[11px] font-bold text-slate-600 leading-snug line-clamp-2">
              {metric.title}
            </span>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {metric.count}
                </span>
                <span className="text-xs font-semibold text-slate-500">Unit</span>
              </div>
              <p className="text-[9.5px] font-semibold text-slate-400 mt-1">
                {metric.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Yellow Header Banner: CONDITION MONITORING Unit: ST-002 (matching Image 1) */}
      <div className="bg-[#facc15] border border-amber-400 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Title & Unit Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
            <span>CONDITION MONITORING</span>
          </h2>

          <div className="relative">
            <select
              value={selectedUnitCode}
              onChange={(e) => setSelectedUnitCode(e.target.value)}
              className="px-3.5 py-1.5 bg-white/95 hover:bg-white border border-amber-500/50 rounded-xl text-xs sm:text-sm font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/30 shadow-xs cursor-pointer appearance-none pr-8"
            >
              {availableUnits.map((u) => (
                <option key={u.unitCode} value={u.unitCode}>
                  Unit: {u.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            />
          </div>
        </div>

        {/* Right: Rating Filter Buttons (SEMUA, A, B, C, X) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-bold text-slate-800">Filter Rating:</span>
          <div className="inline-flex rounded-xl p-1 bg-amber-400/50 border border-amber-500/40 gap-1 text-xs font-black">
            <button
              onClick={() => setRatingFilter("SEMUA")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                ratingFilter === "SEMUA"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-800 hover:bg-amber-300"
              }`}
            >
              SEMUA
            </button>
            <button
              onClick={() => setRatingFilter("NORMAL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                ratingFilter === "NORMAL"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-800 hover:bg-amber-300"
              }`}
              title="A - Good / Normal"
            >
              A
            </button>
            <button
              onClick={() => setRatingFilter("WARNING")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                ratingFilter === "WARNING"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-800 hover:bg-amber-300"
              }`}
              title="B & C - Warning / Caution"
            >
              B / C
            </button>
            <button
              onClick={() => setRatingFilter("CRITICAL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                ratingFilter === "CRITICAL"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-800 hover:bg-amber-300"
              }`}
              title="X - Urgent / Critical"
            >
              X
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sub-toolbar: Search & Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-56 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kompartemen (Engine, Hydraulic, Final Drive...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 text-slate-800 shadow-2xs"
            />
          </div>

          <div className="text-xs text-slate-600 font-medium">
            Menampilkan <strong>{displayedComponents.length}</strong> Kompartemen • Status Keseluruhan:{" "}
            <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] border ${overallUnitStatus.color}`}>
              {overallUnitStatus.label}
            </span>
          </div>
        </div>

        {/* Action Buttons: Upload Excel & Tambah Sample */}
        <div className="flex items-center gap-2">
          {/* Upload Data Oil Sampling */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            title="Upload Data Oil Sampling via Excel/CSV"
          >
            <UploadCloud size={15} className="text-emerald-600" />
            <span>Upload Data Oil Sampling</span>
          </button>

          {/* Input Sample Modal Button */}
          <button
            type="button"
            onClick={() => {
              setEditingSample(null);
              setTargetComponentForInput("ENGINE");
              setIsInputModalOpen(true);
            }}
            className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Input Sample</span>
          </button>
        </div>
      </div>

      {/* 4. Compartments Cards & Tables (Matching Image 1 & Colors matching PS / Inspection) */}
      <div className="space-y-6">
        {displayedComponents.map((compName) => {
          // Filter samples for this component and current unit
          let compSamples = unitSamples.filter(
            (s) => s.component.toUpperCase() === compName.toUpperCase()
          );

          if (ratingFilter !== "SEMUA") {
            compSamples = compSamples.filter((s) => s.rating === ratingFilter);
          }

          // Determine Grade and default Lifetime
          const defaultGrade = compName === "HYDRAULIC SYSTEM" ? "TELLUS 46" : compName === "TRANSMISSION" ? "TO-4 SAE 30" : "15W-40";
          const currentGrade = compSamples[0]?.gradePelumas || defaultGrade;
          const lifetimeHm = compSamples[0]?.hmUnit || 47006;
          const lastInterpretation =
            compSamples[0]?.interpretation ||
            "All Test Results Appear Acceptable. Take Oil Samples At 250 Hour Intervals To Monitor Condition.";

          const isHydraulicOrFD = compName === "HYDRAULIC SYSTEM" || compName.includes("FINAL DRIVE");

          return (
            <div
              key={compName}
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 overflow-hidden"
            >
              {/* Compartment Header Bar matching Image 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-700">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                    {compName}
                  </h3>
                  <span>
                    Lifetime: <strong className="font-mono text-slate-900 font-bold">{lifetimeHm.toLocaleString("id-ID")} HM</strong>
                  </span>
                  <span>
                    Grade: <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">{currentGrade}</span>
                  </span>
                  <span className="text-slate-400">TOP UP: --</span>
                  <span className="text-slate-400">REPAIR: --</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingSample(null);
                    setTargetComponentForInput(compName);
                    setIsInputModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-[#2563eb] hover:text-white hover:bg-[#2563eb] border border-blue-200 rounded-xl transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1 active:scale-98"
                >
                  <Plus size={13} />
                  <span>Input Sample</span>
                </button>
              </div>

              {/* Table matching Image 1 layout & Periodic Inspection / Service colors */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-left border-collapse min-w-300 text-xs">
                  <thead>
                    {/* Level 1 Group Header */}
                    <tr className="border-b border-slate-200 text-[10.5px] font-extrabold uppercase tracking-tight text-center">
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 border-r border-slate-200 bg-slate-100/80 text-slate-700 w-28"
                      >
                        Sample Date
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-2.5 border-r border-slate-200 bg-slate-100/80 text-slate-700 w-20"
                      >
                        HM
                      </th>
                      <th
                        rowSpan={2}
                        className="py-2.5 px-3 border-r border-slate-200 bg-slate-100/80 text-slate-700 w-24"
                      >
                        Rating
                      </th>

                      {/* CONTAMINATION (Colspan 3) - Sky Blue */}
                      <th
                        colSpan={3}
                        className="py-1.5 px-3 border-r border-slate-200 bg-sky-50 text-sky-900 border-b border-sky-200"
                      >
                        CONTAMINATION
                      </th>

                      {/* WEAR METAL (Colspan 5) - Emerald Green */}
                      <th
                        colSpan={5}
                        className="py-1.5 px-3 border-r border-slate-200 bg-emerald-50 text-emerald-900 border-b border-emerald-200"
                      >
                        WEAR METAL
                      </th>

                      {/* PHYSICAL TEST (Colspan 4) - Orange / Peach */}
                      <th
                        colSpan={4}
                        className="py-1.5 px-3 border-r border-slate-200 bg-orange-50 text-orange-900 border-b border-orange-200"
                      >
                        PHYSICAL TEST
                      </th>

                      <th
                        rowSpan={2}
                        className="py-2.5 px-2 text-center bg-slate-100/80 text-slate-700 w-16"
                      >
                        Aksi
                      </th>
                    </tr>

                    {/* Level 2 Sub-columns */}
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-center select-none">
                      {/* Contamination: Si, Al, Na */}
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-sky-50/50 text-sky-800 w-12">Si</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-sky-50/50 text-sky-800 w-12">Al</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-sky-50/50 text-sky-800 w-12">Na</th>

                      {/* Wear Metal: Fe, Cu, Cr, Pb, PQ */}
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-800 w-12">Fe</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-800 w-12">Cu</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-800 w-12">Cr</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-800 w-12">Pb</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-emerald-50/50 text-emerald-800 w-12">PQ</th>

                      {/* Physical Test */}
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-orange-50/50 text-orange-800 w-16">Visc@100</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-orange-50/50 text-orange-800 w-14">
                        {isHydraulicOrFD ? "ISO.6" : "Oxi"}
                      </th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-orange-50/50 text-orange-800 w-14">
                        {isHydraulicOrFD ? "ISO.14" : "Soot"}
                      </th>
                      <th className="py-1.5 px-2 border-r border-slate-200 bg-orange-50/50 text-orange-800 w-14">
                        {isHydraulicOrFD ? "W" : "TBN"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {compSamples.length === 0 ? (
                      <tr>
                        <td
                          colSpan={16}
                          className="py-8 text-center text-slate-400 italic text-xs bg-slate-50/30"
                        >
                          Belum ada riwayat sampling laboratorium untuk kompartemen ini. Klik{" "}
                          <span
                            onClick={() => {
                              setEditingSample(null);
                              setTargetComponentForInput(compName);
                              setIsInputModalOpen(true);
                            }}
                            className="font-bold text-[#2563eb] cursor-pointer hover:underline"
                          >
                            "Input Sample"
                          </span>{" "}
                          untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      compSamples.map((sample) => (
                        <tr key={sample.id} className="hover:bg-slate-50/80 transition-colors text-center font-medium">
                          {/* Sample Date */}
                          <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">
                            {sample.sampleDate}
                          </td>

                          {/* HM */}
                          <td className="py-2.5 px-2.5 border-r border-slate-200 font-mono font-bold text-slate-800">
                            {sample.hmUnit.toLocaleString("id-ID")}
                          </td>

                          {/* Rating Badge */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                sample.rating === "NORMAL"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : sample.rating === "WARNING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {sample.rating === "NORMAL"
                                ? "A - Normal"
                                : sample.rating === "WARNING"
                                ? "B / C - Alert"
                                : "X - Critical"}
                            </span>
                          </td>

                          {/* Contamination */}
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.si}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.al}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.na}
                          </td>

                          {/* Wear Metal */}
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono font-semibold text-slate-800">
                            {sample.fe}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.cu}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.cr}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.pb}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.pqIndex}
                          </td>

                          {/* Physical Test */}
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                            {sample.visc100}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.oxiOrIso6}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.sootOrIso14}
                          </td>
                          <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-700">
                            {sample.waterOrTbn}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSample(sample);
                                  setTargetComponentForInput(sample.component);
                                  setIsInputModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Sample"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSample(sample.id, sample.barcodeLab)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Sample"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Interpretation Box matching Image 1 */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  LAST INTERPRETATION :
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {lastInterpretation}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Input Single Sample */}
      <OilAnalysisModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setEditingSample(null);
        }}
        onSave={handleSaveModal}
        initialData={editingSample}
        defaultUnitCode={selectedUnitCode}
        defaultComponent={targetComponentForInput}
      />

      {/* Modal Bulk Upload Excel / CSV */}
      <OilSamplingUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSaveBatch={handleSaveBatch}
      />
    </div>
  );
};
