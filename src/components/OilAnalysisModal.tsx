"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Droplets,
  Calendar,
  Check,
  ChevronDown,
  Sparkles,
  FlaskConical,
  AlertTriangle,
  Info,
} from "lucide-react";
import { plantService } from "../services/plantService";

export const OIL_COMPONENTS_LIST = [
  "ENGINE",
  "TRANSMISSION",
  "FRONT DIFFERENTIAL",
  "REAR DIFFERENTIAL",
  "FRONT FINAL DRIVE LH",
  "FRONT FINAL DRIVE RH",
  "REAR FINAL DRIVE LH",
  "REAR FINAL DRIVE RH",
  "HYDRAULIC SYSTEM",
] as const;

export interface OilSampleItem {
  id: string;
  unitCode: string;
  unitModel?: string;
  component: string;
  barcodeLab: string;
  sampleDate: string; // e.g. "14-Nov-26"
  hmUnit: number;
  gradePelumas: string;
  rating: "NORMAL" | "WARNING" | "CRITICAL";

  // 1. Kontaminasi (PPM)
  si: number; // Silicon / Debu
  al: number; // Aluminium
  na: number; // Sodium / Coolant

  // 2. Wear Metal (PPM)
  fe: number; // Besi
  cu: number; // Tembaga
  cr: number; // Kromium
  pb: number; // Timbal
  pqIndex: number; // PQ Index

  // 3. Physical Test & Cleanliness
  visc100: number; // Visc@100 (cSt)
  oxiOrIso6: number; // Oxi / ISO.6 (Hyd/FD)
  sootOrIso14: number; // Soot / ISO.14 (Hyd/FD)
  waterOrTbn: number; // Water (%) / TBN / W

  // 4. Rekomendasi
  interpretation: string;
  createdAt?: string;
}

const DEFAULT_UNITS = [
  { unitCode: "ST-002", label: "ST-002 (FAW 140LT)", model: "FAW 140LT", currentHm: 968 },
  { unitCode: "PM401", label: "PM401 (VOLVO FH16)", model: "VOLVO FH16", currentHm: 23876 },
  { unitCode: "PM402", label: "PM402 (VOLVO FH16)", model: "VOLVO FH16", currentHm: 24065 },
  { unitCode: "PM403", label: "PM403 (VOLVO FH16)", model: "VOLVO FH16", currentHm: 24174 },
  { unitCode: "EX-201", label: "EX-201 (KOMATSU PC200-8)", model: "KOMATSU PC200-8", currentHm: 12450 },
  { unitCode: "EX-302", label: "EX-302 (HITACHI ZX350)", model: "HITACHI ZX350", currentHm: 15300 },
  { unitCode: "DZ-002", label: "DZ-002 (ZOOMLION ZD-320)", model: "ZOOMLION ZD-320", currentHm: 8470 },
];

interface OilAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: OilSampleItem) => void;
  initialData?: OilSampleItem | null;
  defaultUnitCode?: string;
  defaultComponent?: string;
}

export function formatSampleDateNow(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const m = months[d.getMonth()];
  const y = String(d.getFullYear()).slice(-2);
  return `${day}-${m}-${y}`;
}

export const OilAnalysisModal: React.FC<OilAnalysisModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultUnitCode = "ST-002",
  defaultComponent = "ENGINE",
}) => {
  const [masterUnits, setMasterUnits] = useState<any[]>(DEFAULT_UNITS);

  // Form States matching image 2
  const [unitCode, setUnitCode] = useState<string>(defaultUnitCode);
  const [component, setComponent] = useState<string>(defaultComponent);
  const [barcodeLab, setBarcodeLab] = useState<string>("LAB-17825");
  const [sampleDate, setSampleDate] = useState<string>(formatSampleDateNow());
  const [hmUnit, setHmUnit] = useState<number>(968);
  const [gradePelumas, setGradePelumas] = useState<string>("15W-40");
  const [rating, setRating] = useState<"NORMAL" | "WARNING" | "CRITICAL">("NORMAL");

  // 1. Kontaminasi
  const [si, setSi] = useState<number>(0);
  const [al, setAl] = useState<number>(0);
  const [na, setNa] = useState<number>(0);

  // 2. Wear Metal
  const [fe, setFe] = useState<number>(0);
  const [cu, setCu] = useState<number>(0);
  const [cr, setCr] = useState<number>(0);
  const [pb, setPb] = useState<number>(0);
  const [pqIndex, setPqIndex] = useState<number>(0);

  // 3. Physical Test
  const [visc100, setVisc100] = useState<number>(0);
  const [oxiOrIso6, setOxiOrIso6] = useState<number>(0);
  const [sootOrIso14, setSootOrIso14] = useState<number>(0);
  const [waterOrTbn, setWaterOrTbn] = useState<number>(0);

  // 4. Rekomendasi
  const [interpretation, setInterpretation] = useState<string>(
    "Normal inspection. Take oil samples at 250 hour intervals to monitor condition."
  );

  // Fetch live master units on mount
  useEffect(() => {
    let isMounted = true;
    plantService
      .getMasterUnits({ withTrailers: true })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data && res.data.length > 0) {
          const formatted = res.data.map((u: any) => ({
            unitCode: u.unitCode,
            label: `${u.unitCode} (${u.brand || ""} ${u.model || ""})`.trim(),
            model: `${u.brand || ""} ${u.model || ""}`.trim(),
            currentHm: u.currentHm || 0,
          }));
          const existingCodes = new Set(formatted.map((f: any) => f.unitCode));
          const extra = DEFAULT_UNITS.filter((d) => !existingCodes.has(d.unitCode));
          setMasterUnits([...extra, ...formatted]);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync initialData or defaults
  useEffect(() => {
    if (initialData) {
      setUnitCode(initialData.unitCode);
      setComponent(initialData.component);
      setBarcodeLab(initialData.barcodeLab || "LAB-17825");
      setSampleDate(initialData.sampleDate || formatSampleDateNow());
      setHmUnit(initialData.hmUnit || 0);
      setGradePelumas(initialData.gradePelumas || "15W-40");
      setRating(initialData.rating || "NORMAL");

      setSi(initialData.si || 0);
      setAl(initialData.al || 0);
      setNa(initialData.na || 0);

      setFe(initialData.fe || 0);
      setCu(initialData.cu || 0);
      setCr(initialData.cr || 0);
      setPb(initialData.pb || 0);
      setPqIndex(initialData.pqIndex || 0);

      setVisc100(initialData.visc100 || 0);
      setOxiOrIso6(initialData.oxiOrIso6 || 0);
      setSootOrIso14(initialData.sootOrIso14 || 0);
      setWaterOrTbn(initialData.waterOrTbn || 0);

      setInterpretation(
        initialData.interpretation ||
          "Normal inspection. Take oil samples at 250 hour intervals to monitor condition."
      );
    } else {
      setUnitCode(defaultUnitCode);
      setComponent(defaultComponent);
      setBarcodeLab(`LAB-${Math.floor(10000 + Math.random() * 90000)}`);
      setSampleDate(formatSampleDateNow());

      const foundUnit = masterUnits.find((u) => u.unitCode === defaultUnitCode);
      setHmUnit(foundUnit?.currentHm || 968);

      const defGrade = defaultComponent === "HYDRAULIC SYSTEM" ? "TELLUS 46" : "15W-40";
      setGradePelumas(defGrade);
      setRating("NORMAL");

      setSi(0);
      setAl(0);
      setNa(0);
      setFe(0);
      setCu(0);
      setCr(0);
      setPb(0);
      setPqIndex(0);
      setVisc100(0);
      setOxiOrIso6(0);
      setSootOrIso14(0);
      setWaterOrTbn(0);
      setInterpretation(
        "All Test Results Appear Acceptable. Take Oil Samples At 250 Hour Intervals To Monitor Condition."
      );
    }
  }, [initialData, isOpen, defaultUnitCode, defaultComponent]);

  // Auto-sync grade when component changes
  const handleComponentChange = (newComp: string) => {
    setComponent(newComp);
    if (!initialData) {
      if (newComp === "HYDRAULIC SYSTEM") {
        setGradePelumas("TELLUS 46");
      } else if (newComp === "TRANSMISSION") {
        setGradePelumas("TO-4 SAE 30");
      } else if (newComp.includes("DIFFERENTIAL") || newComp.includes("FINAL DRIVE")) {
        setGradePelumas("SAE 50 / 85W-140");
      } else {
        setGradePelumas("15W-40");
      }
    }
  };

  // Auto-sync HM when unit changes
  const handleUnitChange = (code: string) => {
    setUnitCode(code);
    const found = masterUnits.find((u) => u.unitCode === code);
    if (found && found.currentHm) {
      setHmUnit(found.currentHm);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedUnitObj = masterUnits.find((u) => u.unitCode === unitCode);

    const payload: OilSampleItem = {
      id: initialData?.id || `oil-${Date.now()}`,
      unitCode: unitCode.trim().toUpperCase(),
      unitModel: selectedUnitObj?.model || selectedUnitObj?.label || "",
      component: component.trim().toUpperCase(),
      barcodeLab: barcodeLab.trim().toUpperCase(),
      sampleDate: sampleDate.trim(),
      hmUnit: Number(hmUnit) || 0,
      gradePelumas: gradePelumas.trim().toUpperCase(),
      rating,
      si: Number(si) || 0,
      al: Number(al) || 0,
      na: Number(na) || 0,
      fe: Number(fe) || 0,
      cu: Number(cu) || 0,
      cr: Number(cr) || 0,
      pb: Number(pb) || 0,
      pqIndex: Number(pqIndex) || 0,
      visc100: Number(visc100) || 0,
      oxiOrIso6: Number(oxiOrIso6) || 0,
      sootOrIso14: Number(sootOrIso14) || 0,
      waterOrTbn: Number(waterOrTbn) || 0,
      interpretation: interpretation.trim(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6">
        {/* Header matching Image 2 */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-xs">
              <FlaskConical size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Input Hasil Analisis Sampling Oil (SOS)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pencatatan parameter keausan metal, kontaminasi, dan interpretasi laboratorium
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Row 1: No. Unit, Component, Barcode/Kode Lab */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NO. UNIT <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={unitCode}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-8"
                >
                  {masterUnits.map((u) => (
                    <option key={u.unitCode} value={u.unitCode}>
                      {u.label || u.unitCode}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                COMPONENT <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={component}
                  onChange={(e) => handleComponentChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-8"
                >
                  {OIL_COMPONENTS_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                BARCODE / KODE LAB
              </label>
              <input
                type="text"
                placeholder="LAB-17825"
                value={barcodeLab}
                onChange={(e) => setBarcodeLab(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs font-mono uppercase"
              />
            </div>
          </div>

          {/* Row 2: Tgl Sample, HM Unit, Grade Pelumas, Rating Hasil */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TGL SAMPLE <span className="text-[10px] text-slate-400 font-normal">(14-Nov-26)</span>
              </label>
              <input
                type="text"
                required
                placeholder="14-Nov-26"
                value={sampleDate}
                onChange={(e) => setSampleDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                HM UNIT <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={hmUnit}
                onChange={(e) => setHmUnit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GRADE PELUMAS
              </label>
              <input
                type="text"
                placeholder="15W-40"
                value={gradePelumas}
                onChange={(e) => setGradePelumas(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                RATING HASIL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-black shadow-2xs cursor-pointer appearance-none pr-8 ${
                    rating === "NORMAL"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : rating === "WARNING"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}
                >
                  <option value="NORMAL">A - Normal (Good)</option>
                  <option value="WARNING">B / C - Warning (Caution)</option>
                  <option value="CRITICAL">X - Critical (Urgent)</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 1: KONTAMINASI (PPM) */}
          <div className="bg-sky-50/50 border border-sky-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                1. KONTAMINASI (PPM)
              </span>
              <span className="text-[10px] text-sky-600 font-semibold">
                Parameter debu &amp; kebocoran pendingin
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Si (Silicon / Debu)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={si}
                  onChange={(e) => setSi(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Al (Aluminium)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={al}
                  onChange={(e) => setAl(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Na (Sodium / Coolant)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={na}
                  onChange={(e) => setNa(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>
          </div>

          {/* Section 2: WEAR METAL (PPM) */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                2. WEAR METAL (PPM)
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Tingkat keausan komponen metal internal
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Fe (Besi)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fe}
                  onChange={(e) => setFe(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cu (Tembaga)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cu}
                  onChange={(e) => setCu(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cr (Kromium)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cr}
                  onChange={(e) => setCr(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pb (Timbal)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pb}
                  onChange={(e) => setPb(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  PQ Index
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pqIndex}
                  onChange={(e) => setPqIndex(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>
          </div>

          {/* Section 3: PHYSICAL TEST & CLEANLINESS */}
          <div className="bg-orange-50/50 border border-orange-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                3. PHYSICAL TEST &amp; CLEANLINESS
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">
                Kekentalan, jelaga, oksidasi, dan kebersihan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Visc@100 (cSt)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={visc100}
                  onChange={(e) => setVisc100(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {component === "HYDRAULIC SYSTEM" ? "ISO.6 (Hyd/FD)" : "Oxi"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={oxiOrIso6}
                  onChange={(e) => setOxiOrIso6(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {component === "HYDRAULIC SYSTEM" ? "ISO.14 (Hyd/FD)" : "Soot"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sootOrIso14}
                  onChange={(e) => setSootOrIso14(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {component === "HYDRAULIC SYSTEM" ? "Water (%) / W" : "TBN / Water (%)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={waterOrTbn}
                  onChange={(e) => setWaterOrTbn(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>
          </div>

          {/* Section 4: LAST INTERPRETATION / REKOMENDASI LABORATORIUM */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              LAST INTERPRETATION / REKOMENDASI LABORATORIUM
            </label>
            <textarea
              rows={3}
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              placeholder="Contoh: All Test Results Appear Acceptable. Take Oil Samples At 250 Hour Intervals To Monitor Condition."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-98 text-white text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              <span>Simpan Hasil Lab</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
