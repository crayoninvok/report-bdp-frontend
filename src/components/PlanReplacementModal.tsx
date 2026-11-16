"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Check,
  ChevronDown,
  Wrench,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { plantService } from "../services/plantService";
import { MAJOR_COMPONENTS_LIST } from "./HistoricalComponentModal";

export interface PlanReplacementItem {
  id: string;
  site: "SENYIUR" | "MUARA PAHU";
  periodMonthYear: string; // e.g. "November 2026", "Desember 2026"
  unitCode: string;
  component: string;
  planHm: number;
  lastHm: number;
  actualDate?: string;
  actualHm?: number | null;
  hmLastReplacement: number;
  lifetime: number; // formula: actualHm - hmLastReplacement
  sourceComponent?: string; // "BRAND NEW" | "EX COMEX"
  remark?: string;
  createdAt?: string;
}

const DEFAULT_UNITS = [
  { unitCode: "PM401", brand: "VOLVO", model: "FH16", category: "Prime Mover", currentHm: 23876, jobSite: "Senyiur" },
  { unitCode: "PM402", brand: "VOLVO", model: "FH16", category: "Prime Mover", currentHm: 24065, jobSite: "Senyiur" },
  { unitCode: "PM403", brand: "VOLVO", model: "FH16", category: "Prime Mover", currentHm: 24174, jobSite: "Senyiur" },
  { unitCode: "EX-201", brand: "KOMATSU", model: "PC200-8", category: "Excavator", currentHm: 12450, jobSite: "Senyiur" },
  { unitCode: "EX-302", brand: "HITACHI", model: "ZX350H-5G", category: "Excavator", currentHm: 15300, jobSite: "Senyiur" },
  { unitCode: "DZ-002", brand: "ZOOMLION", model: "ZD-320-3", category: "Dozer", currentHm: 8470, jobSite: "Senyiur" },
];

const MONTH_YEAR_OPTIONS = [
  "November 2026",
  "Desember 2026",
  "Januari 2027",
  "Februari 2027",
  "Maret 2027",
  "April 2027",
];

interface PlanReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PlanReplacementItem) => void;
  initialData?: PlanReplacementItem | null;
  defaultSite?: string;
  defaultMonthYear?: string;
}

export const PlanReplacementModal: React.FC<PlanReplacementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultSite = "SENYIUR",
  defaultMonthYear = "November 2026",
}) => {
  const [masterUnits, setMasterUnits] = useState<any[]>(DEFAULT_UNITS);

  // Form Fields
  const [site, setSite] = useState<"SENYIUR" | "MUARA PAHU">("SENYIUR");
  const [periodMonthYear, setPeriodMonthYear] = useState<string>(defaultMonthYear);
  const [unitCode, setUnitCode] = useState<string>("PM401");
  const [component, setComponent] = useState<string>("ENGINE");
  const [planHm, setPlanHm] = useState<number>(24000);
  const [lastHm, setLastHm] = useState<number>(23876);
  const [actualDate, setActualDate] = useState<string>("");
  const [actualHm, setActualHm] = useState<string>("");
  const [hmLastReplacement, setHmLastReplacement] = useState<number>(0);
  const [sourceComponent, setSourceComponent] = useState<string>("BRAND NEW");
  const [remark, setRemark] = useState<string>("OVERHAUL ENGINE");

  // Load units on mount
  useEffect(() => {
    let isMounted = true;
    plantService
      .getMasterUnits({ withTrailers: true })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data && res.data.length > 0) {
          const codes = new Set(res.data.map((u: any) => u.unitCode));
          const extra = DEFAULT_UNITS.filter((f) => !codes.has(f.unitCode));
          setMasterUnits([...res.data, ...extra]);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize form
  useEffect(() => {
    if (initialData) {
      setSite(initialData.site);
      setPeriodMonthYear(initialData.periodMonthYear);
      setUnitCode(initialData.unitCode);
      setComponent(initialData.component);
      setPlanHm(initialData.planHm);
      setLastHm(initialData.lastHm);
      setActualDate(initialData.actualDate || "");
      setActualHm(initialData.actualHm !== null && initialData.actualHm !== undefined ? String(initialData.actualHm) : "");
      setHmLastReplacement(initialData.hmLastReplacement || 0);
      setSourceComponent(initialData.sourceComponent || "BRAND NEW");
      setRemark(initialData.remark || "");
    } else {
      setSite(defaultSite.toUpperCase().includes("MUARA") ? "MUARA PAHU" : "SENYIUR");
      setPeriodMonthYear(defaultMonthYear);
      const defU = masterUnits[0] || DEFAULT_UNITS[0];
      setUnitCode(defU.unitCode);
      setLastHm(defU.currentHm || 23876);
      setComponent("ENGINE");
      setPlanHm(24000);
      setActualDate("");
      setActualHm("");
      setHmLastReplacement(0);
      setSourceComponent("BRAND NEW");
      setRemark("OVERHAUL ENGINE");
    }
  }, [initialData, isOpen, defaultSite, defaultMonthYear]);

  // Handle unit change: auto-sync lastHm
  const handleUnitChange = (code: string) => {
    setUnitCode(code);
    const found = masterUnits.find((u) => u.unitCode === code);
    if (found && found.currentHm !== null && found.currentHm !== undefined) {
      setLastHm(found.currentHm);
    }
  };

  // Lifetime calculation formula:
  // Lifetime Adalah formula dari Actual HM Replacement – HM Last Replacement
  const computedLifetime = useMemo(() => {
    const act = parseFloat(actualHm);
    if (!isNaN(act) && act > 0) {
      return Math.max(0, act - (hmLastReplacement || 0));
    }
    return 0;
  }, [actualHm, hmLastReplacement]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitCode.trim()) {
      alert("Pilih No. Unit terlebih dahulu!");
      return;
    }
    if (!component.trim()) {
      alert("Pilih atau isi nama Component!");
      return;
    }

    const actNum = actualHm !== "" ? parseFloat(actualHm) : null;
    const finalLifetime = actNum !== null && !isNaN(actNum) && actNum > 0
      ? Math.max(0, actNum - (hmLastReplacement || 0))
      : 0;

    const payload: PlanReplacementItem = {
      id: initialData?.id || `plan-${Date.now()}`,
      site,
      periodMonthYear,
      unitCode: unitCode.trim().toUpperCase(),
      component: component.trim().toUpperCase(),
      planHm: Number(planHm) || 0,
      lastHm: Number(lastHm) || 0,
      actualDate: actualDate.trim() || undefined,
      actualHm: actNum,
      hmLastReplacement: Number(hmLastReplacement) || 0,
      lifetime: finalLifetime,
      sourceComponent: sourceComponent.trim().toUpperCase(),
      remark: remark.trim().toUpperCase(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#e95623] shadow-xs">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Input</span>
                <span className="text-[#e95623]">Plan Component Replacement</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perencanaan jadwal penggantian & pencatatan realisasi HM komponen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Periode Bulan/Tahun & Site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Periode Rencana (Bulan & Tahun) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={periodMonthYear}
                  onChange={(e) => setPeriodMonthYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-9"
                >
                  {MONTH_YEAR_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Plan Replacement {m}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Site Operasional <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-9"
                >
                  <option value="SENYIUR">SENYIUR</option>
                  <option value="MUARA PAHU">MUARA PAHU</option>
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: No Unit & Component */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                No. Unit <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={unitCode}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-9"
                >
                  {masterUnits.map((u) => (
                    <option key={u.unitCode} value={u.unitCode}>
                      {u.unitCode} - {u.brand || ""} {u.model || ""} ({u.category || "Unit"})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Component <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Misal: ENGINE / TRANSMISSION"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Quick Component Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400">Pilihan Cepat Komponen:</span>
            <div className="flex flex-wrap gap-1.5">
              {["ENGINE", "TRANSMISSION", "HYDRAULIC PUMP", "FINAL DRIVE FRONT LH", "FINAL DRIVE FRONT RH", "DIFFERENTIAL FRONT", "DRUM BRAKE"].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setComponent(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    component.toUpperCase() === tag
                      ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Plan HM & Last HM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan HM <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={planHm}
                onChange={(e) => setPlanHm(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Target HM saat komponen direncanakan ganti (misal: 24.000).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Last HM</label>
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  ⚡ Sync dari Unit
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={lastHm}
                onChange={(e) => setLastHm(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                HM terakhir unit yang tercatat di sistem.
              </p>
            </div>
          </div>

          {/* Row 4: Actual Date & Actual HM Replacement (Optional until execution) */}
          <div className="p-4 bg-orange-50/40 border border-orange-200/70 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Wrench size={14} className="text-[#e95623]" />
                <span>Realisasi Penggantian (Actual Replacement)</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Kosongkan jika masih rencana
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Actual Date Replacement
                </label>
                <input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Actual HM Replacement
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Contoh: 23987"
                  value={actualHm}
                  onChange={(e) => setActualHm(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Row 5: HM Last Replacement & Computed Lifetime */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                HM Last Replacement
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={hmLastReplacement}
                onChange={(e) => setHmLastReplacement(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                HM unit saat penggantian sebelumnya (0 jika baru).
              </p>
            </div>

            {/* Formula Box for Lifetime */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  LIFETIME (HASIL FORMULA)
                </span>
                <span className="text-[9.5px] font-semibold text-slate-400">
                  Actual HM - Last HM
                </span>
              </div>
              <div className="my-1">
                <span
                  className={`text-xl font-black ${
                    computedLifetime > 0 ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {computedLifetime.toLocaleString("id-ID")} Jam
                </span>
              </div>
              <p className="text-[9.5px] text-slate-400">
                {actualHm
                  ? `${actualHm} - ${hmLastReplacement} = ${computedLifetime} Jam`
                  : "Menunggu input Actual HM Replacement"}
              </p>
            </div>
          </div>

          {/* Row 6: Source Component & Remark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Source Component
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceComponent("BRAND NEW")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    sourceComponent === "BRAND NEW"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  BRAND NEW
                </button>
                <button
                  type="button"
                  onClick={() => setSourceComponent("EX COMEX")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    sourceComponent === "EX COMEX"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  EX COMEX
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Remark / Keterangan
              </label>
              <input
                type="text"
                placeholder="Misal: OVERHAUL ENGINE"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs uppercase"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d54918] active:scale-98 text-white text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              <span>Simpan Plan Replacement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

