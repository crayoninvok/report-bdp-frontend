"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Zap,
  Cpu,
  Calendar,
  AlertTriangle,
  Clock,
  Check,
  ChevronDown,
  Sparkles,
  Info,
  DollarSign,
  Layers,
} from "lucide-react";
import { MasterUnit, plantService } from "../services/plantService";
import { HistoricalComponentItem } from "./HistoricalComponentView";

// List of required components as annotated by user
export const MAJOR_COMPONENTS_LIST = [
  "HYDRAULIC PUMP",
  "DRUM BRAKE",
  "DIFFERENTIAL FRONT",
  "DIFFERENTIAL REAR",
  "ENGINE",
  "TRANSMISSION",
  "FINAL DRIVE FRONT LH",
  "FINAL DRIVE FRONT RH",
  "FINAL DRIVE REAR LH",
  "FINAL DRIVE REAR RH",
  "HUB AXLE FRONT LH",
  "HUB AXLE FRONT RH",
] as const;

// Default sample units if master unit table is empty or for quick selection
const DEFAULT_FALLBACK_UNITS = [
  { unitCode: "DZ-002", model: "ZD-320-3 (HD)", brand: "ZOOMLION", category: "Dozer", currentHm: 8470, jobSite: "Senyiur" },
  { unitCode: "EX-201", model: "PC200-8", brand: "KOMATSU", category: "Excavator", currentHm: 4605.5, jobSite: "Senyiur" },
  { unitCode: "EX-302", model: "ZX350H-5G", brand: "HITACHI", category: "Excavator", currentHm: 3959.5, jobSite: "Senyiur" },
  { unitCode: "PM401", model: "FH16 610", brand: "VOLVO", category: "Prime Mover", currentHm: 6250, jobSite: "MuaraPahu" },
  { unitCode: "PM402", model: "FH16 610", brand: "VOLVO", category: "Prime Mover", currentHm: 5890, jobSite: "MuaraPahu" },
  { unitCode: "DT-101", model: "700 ZY", brand: "HINO", category: "Dump Truck", currentHm: 3420, jobSite: "Senyiur" },
];

interface HistoricalComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: HistoricalComponentItem) => void;
  initialData?: HistoricalComponentItem | null;
  site?: string;
}

export const HistoricalComponentModal: React.FC<HistoricalComponentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  site = "Senyiur",
}) => {
  // Master units state
  const [masterUnits, setMasterUnits] = useState<any[]>(DEFAULT_FALLBACK_UNITS);

  // Form Fields
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>("DZ-002");
  const [unitCurrentHm, setUnitCurrentHm] = useState<number>(8470);
  const [statusOverride, setStatusOverride] = useState<string>("");

  const [componentName, setComponentName] = useState<string>("");
  const [componentDescription, setComponentDescription] = useState<string>("Komponen standar unit baru");
  const [hmPasang, setHmPasang] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState<string>("0");
  const [sourceComponent, setSourceComponent] = useState<string>("Brand New");
  const [targetLifetime, setTargetLifetime] = useState<number>(10000);
  const [estimasiBiaya, setEstimasiBiaya] = useState<number>(0);
  const [tglRencana, setTglRencana] = useState<string>("");

  // Load units from API on mount
  useEffect(() => {
    let isMounted = true;
    plantService
      .getMasterUnits({ withTrailers: true })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data && res.data.length > 0) {
          // Merge with fallback to ensure rich selection
          const existingCodes = new Set(res.data.map((u: any) => u.unitCode));
          const extra = DEFAULT_FALLBACK_UNITS.filter((f) => !existingCodes.has(f.unitCode));
          setMasterUnits([...res.data, ...extra]);
        }
      })
      .catch(() => {
        // Keep fallback units
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize form when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setSelectedUnitCode(initialData.unitCode);
      setUnitCurrentHm(initialData.hmUnitTerkini ?? 0);
      setComponentName(initialData.componentName ?? "");
      setComponentDescription(initialData.componentDescription ?? "Komponen standar unit baru");
      setHmPasang(initialData.hmPasang ?? 0);
      setSerialNumber(initialData.serialNumber ?? "0");
      setSourceComponent((initialData as any).sourceComponent ?? "Brand New");
      setTargetLifetime(initialData.targetLifetime ?? 10000);
      setEstimasiBiaya(initialData.estimasiBiaya ?? 0);
      setTglRencana(initialData.tglRencana ?? "");
    } else {
      // Default reset
      const defaultUnit = masterUnits[0] || DEFAULT_FALLBACK_UNITS[0];
      setSelectedUnitCode(defaultUnit.unitCode);
      setUnitCurrentHm(defaultUnit.currentHm ?? 8470);
      setComponentName("");
      setComponentDescription("Komponen standar unit baru");
      setHmPasang(0);
      setSerialNumber("0");
      setSourceComponent("Brand New");
      setTargetLifetime(10000);
      setEstimasiBiaya(0);
      setTglRencana("");
    }
  }, [initialData, isOpen]);

  // Handle unit change: auto-sync unitCurrentHm
  const handleUnitChange = (code: string) => {
    setSelectedUnitCode(code);
    const found = masterUnits.find((u) => u.unitCode === code);
    if (found && found.currentHm !== null && found.currentHm !== undefined) {
      setUnitCurrentHm(found.currentHm);
    }
  };

  // Calculations in real time
  const runningHm = useMemo(() => {
    return Math.max(0, (unitCurrentHm || 0) - (hmPasang || 0));
  }, [unitCurrentHm, hmPasang]);

  const sisaJam = useMemo(() => {
    return (targetLifetime || 0) - runningHm;
  }, [targetLifetime, runningHm]);

  const umurPersen = useMemo(() => {
    if (!targetLifetime || targetLifetime <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((runningHm / targetLifetime) * 100)));
  }, [targetLifetime, runningHm]);

  // Auto-calculated status
  const computedStatus = useMemo(() => {
    if (statusOverride) return statusOverride;
    if (sisaJam <= 0) return "CRITICAL";
    if (sisaJam < 3000) return "PREPARE";
    return "MONITORING";
  }, [sisaJam, statusOverride]);

  // Auto-calculated estimated replacement date (based on 16 hrs/day)
  useEffect(() => {
    if (!initialData && !tglRencana) {
      const avgDaily = 16;
      const days = Math.max(0, Math.ceil(sisaJam / avgDaily));
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      setTglRencana(targetDate.toISOString().split("T")[0]);
    }
  }, [sisaJam, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentName.trim()) {
      alert("Silakan masukkan atau pilih Nama Major Komponen!");
      return;
    }

    const payload: HistoricalComponentItem = {
      id: initialData?.id || `comp-${Date.now()}`,
      unitCode: selectedUnitCode,
      componentName: componentName.trim(),
      componentDescription: componentDescription.trim(),
      serialNumber: serialNumber.trim() || "0",
      hmPasang: Number(hmPasang) || 0,
      hmUnitTerkini: Number(unitCurrentHm) || 0,
      targetLifetime: Number(targetLifetime) || 10000,
      runningHm: Number(runningHm) || 0,
      dailyAvgHm: 16,
      tglPasang: initialData?.tglPasang || new Date().toISOString().split("T")[0],
      tglRencana: tglRencana || new Date().toISOString().split("T")[0],
      estimasiBiaya: Number(estimasiBiaya) || 0,
      site: site,
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
              <Cpu size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Catat</span>
                <span className="text-[#e95623]">Historical penggantian Component</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Otomatis tersinkronisasi dengan data input Daily HM & Fuel
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Auto-Sync Blue Banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <Zap size={15} />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span>Auto-Sync Daily HM & Fuel Terhubung</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed max-w-md">
                  Running HM komponen akan otomatis dihitung:{" "}
                  <span className="font-semibold text-blue-950">
                    HM Unit ({unitCurrentHm.toLocaleString("id-ID")}) - HM Pasang
                  </span>
                  . Ketika operator menginput Daily HM baru, jam komponen otomatis ikut bergerak.
                </p>
              </div>
            </div>

            <div className="shrink-0 sm:text-right">
              <span className="inline-block px-3 py-1 rounded-xl bg-white border border-blue-300 font-bold text-blue-800 text-[11px] shadow-2xs">
                HM Unit: {unitCurrentHm.toLocaleString("id-ID")} Jam
              </span>
            </div>
          </div>

          {/* Row 1: No. Unit Alat Berat & Status Rencana */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                No. Unit Alat Berat <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedUnitCode}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-9"
                >
                  {masterUnits.map((u) => (
                    <option key={u.unitCode} value={u.unitCode}>
                      {u.unitCode} - {u.brand || ""} {u.model || ""} ({u.category || "Alat Berat"})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status Rencana
              </label>
              <div className="relative">
                <select
                  value={statusOverride || computedStatus}
                  onChange={(e) => setStatusOverride(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs cursor-pointer appearance-none pr-9"
                >
                  <option value="MONITORING">MONITORING (Normal)</option>
                  <option value="PREPARE">PERSIAPAN PR / PREPARE (&lt; 3,000 Jam)</option>
                  <option value="CRITICAL">CRITICAL (&le; 0 Jam)</option>
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Nama Major Komponen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-black mr-1">
                  Nama Major Komponen *
                </span>
              </label>
              <span className="text-[10.5px] text-slate-400">Pilih dari tombol cepat di bawah</span>
            </div>

            <input
              type="text"
              required
              placeholder="Contoh: Engine Complete Cummins QSM11 / Hydraulic Main Pump"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
            />

            {/* Quick Component Chips matching user requirement */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MAJOR_COMPONENTS_LIST.map((tag) => {
                const isActive = componentName.toUpperCase() === tag;
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => setComponentName(tag)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: HM Unit Saat Pasang & Running HM Komponen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">HM Unit Saat Pasang</label>
                <span className="text-[10px] text-slate-400">(0 jika bawaan unit baru)</span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={hmPasang}
                onChange={(e) => setHmPasang(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Isi HM unit ketika komponen baru/rekondisi ini dipasang.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Running HM Komponen</label>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  ⚡ Terhitung Otomatis
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={`${runningHm.toLocaleString("id-ID")} Jam`}
                className="w-full px-3.5 py-2.5 bg-orange-50/40 border border-orange-200 rounded-xl text-xs font-black text-slate-900 cursor-not-allowed shadow-2xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Jam pemakaian komponen hingga saat ini.
              </p>
            </div>
          </div>

          {/* Row 4: Serial Number & Source Component */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Serial Number</label>
                <span className="text-[10px] text-slate-400">(0 jika bawaan unit baru)</span>
              </div>
              <input
                type="text"
                placeholder="0"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Source Component</label>
                <span className="text-[10px] text-slate-400">(Brand New / Ex Comex)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSourceComponent("Brand New")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    sourceComponent === "Brand New"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Brand New
                </button>
                <button
                  type="button"
                  onClick={() => setSourceComponent("Ex Comex")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    sourceComponent === "Ex Comex"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Ex Comex
                </button>
              </div>
            </div>
          </div>

          {/* Row 5: Target Lifetime & Proyeksi Sisa Jam Operasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Lifetime (Jam/HM) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={targetLifetime}
                onChange={(e) => setTargetLifetime(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Standar lifetime manufaktur (misal: Engine 12.000h, Pump 10.000h).
              </p>
            </div>

            {/* Proyeksi Sisa Jam Operasi Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                PROYEKSI SISA JAM OPERASI
              </span>
              <div className="my-1">
                <span
                  className={`text-xl font-black ${
                    sisaJam <= 0
                      ? "text-rose-600"
                      : sisaJam < 3000
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {sisaJam.toLocaleString("id-ID")} Jam Tersisa
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sisaJam <= 0
                        ? "bg-rose-500"
                        : sisaJam < 3000
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, umurPersen)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {umurPersen}% dari target lifetime telah terpakai
                </p>
              </div>
            </div>
          </div>

          {/* Row 6: Estimasi Biaya Komponen & Estimasi Tanggal Penggantian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimasi Biaya Komponen (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                placeholder="0"
                value={estimasiBiaya || ""}
                onChange={(e) => setEstimasiBiaya(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
              />
              {estimasiBiaya > 0 && (
                <p className="text-[10px] font-semibold text-slate-500 mt-1">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(estimasiBiaya)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimasi Tanggal Penggantian
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={tglRencana}
                  onChange={(e) => setTglRencana(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Disesuaikan otomatis dengan sisa jam dan laju operasi unit.
              </p>
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
              <span>Simpan Jadwal PCR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
