"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Truck, Gauge, Fuel, Clock, Calculator, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { DailyProduction } from "../types/production";
import { JobSite } from "../types/auth";
import { productionService, DEFAULT_PRODUCTION_TARGETS } from "../services/productionService";
import { UACalculatorModal } from "./UACalculatorModal";
import { useNotification } from "../context/NotificationContext";

interface InputProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (record: DailyProduction) => void;
  editData?: DailyProduction | null;
  defaultSite?: JobSite;
}

export function computeWeek(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1] - 1;
      const day = parts[2];
      const date = new Date(Date.UTC(year, month, day));
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const diffMs = date.getTime() - startOfYear.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(diffDays / 7) + 1;
      const clamped = Math.min(53, Math.max(1, weekNum));
      return `W${String(clamped).padStart(2, "0")}`;
    }
  } catch (e) {
    // fallback
  }
  return "W01";
}

export const InputProductionModal: React.FC<InputProductionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editData,
  defaultSite = "MuaraPahu",
}) => {
  const { showSuccess, showError } = useNotification();

  const [date, setDate] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("W31");
  const [jobSite, setJobSite] = useState<JobSite>(defaultSite);
  const [paPercent, setPaPercent] = useState<number>(93.0);
  const [uaPercent, setUaPercent] = useState<number>(88.0);
  const [payload, setPayload] = useState<number>(205.0);
  const [cycleTime, setCycleTime] = useState<number>(7.5);
  const [fuelRatio, setFuelRatio] = useState<number>(1.55);
  const [unitRunning, setUnitRunning] = useState<number>(43);
  const [tdp, setTdp] = useState<number>(2.7);
  const [production, setProduction] = useState<number>(0);
  const [isManualProduction, setIsManualProduction] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUaCalcOpen, setIsUaCalcOpen] = useState<boolean>(false);

  // Initialize form state
  useEffect(() => {
    if (editData) {
      setDate(editData.date);
      setWeekNumber(editData.weekNumber);
      setJobSite(editData.jobSite);
      setPaPercent(editData.pa > 1 ? editData.pa : Number((editData.pa * 100).toFixed(2)));
      setUaPercent(editData.ua > 1 ? editData.ua : Number((editData.ua * 100).toFixed(2)));
      setPayload(editData.payload);
      setCycleTime(editData.cycleTime);
      setFuelRatio(editData.fuelRatio);
      setUnitRunning(editData.unitRunning);
      setTdp(editData.tdp);
      setProduction(editData.production);
      setIsManualProduction(true);
      setNotes(editData.notes || "");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setWeekNumber(computeWeek(today));
      setJobSite(defaultSite);
      setPaPercent(95.8);
      setUaPercent(84.3);
      setPayload(205.0);
      setCycleTime(7.5);
      setFuelRatio(1.55);
      setUnitRunning(43);
      setTdp(2.7);
      setProduction(Number((43 * 205.0 * 2.7).toFixed(2)));
      setIsManualProduction(false);
      setNotes("");
    }
  }, [editData, defaultSite, isOpen]);

  // Recalculate production automatically when units, payload, or tdp change unless manual override
  useEffect(() => {
    if (!isManualProduction) {
      const computed = Number((unitRunning * payload * tdp).toFixed(2));
      setProduction(computed);
    }
  }, [unitRunning, payload, tdp, isManualProduction]);

  // Auto-update weekNumber when date changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setWeekNumber(computeWeek(newDate));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      showError("Tanggal wajib dipilih!");
      return;
    }

    setIsSubmitting(true);
    try {
      const paDecimal = paPercent > 1 ? paPercent / 100 : paPercent;
      const uaDecimal = uaPercent > 1 ? uaPercent / 100 : uaPercent;

      const payloadData: Partial<DailyProduction> = {
        date,
        weekNumber,
        jobSite,
        pa: paDecimal,
        ua: uaDecimal,
        payload,
        cycleTime,
        fuelRatio,
        unitRunning,
        tdp,
        production,
        notes: notes.trim() !== "" ? notes.trim() : null,
      };

      let result: DailyProduction;
      if (editData?.id) {
        result = await productionService.updateDailyProduction(editData.id, payloadData);
        showSuccess(`Data produksi tanggal ${date} (${weekNumber}) berhasil diperbarui!`);
      } else {
        result = await productionService.createDailyProduction(payloadData);
        showSuccess(`Data produksi tanggal ${date} (${weekNumber}) berhasil ditambahkan!`);
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan data produksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-slate-800 to-[#1e232b] text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#e95623] to-[#f97316] text-white shadow-md">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">
                  {editData ? "Edit Data Produksi Harian" : "Input Data Produksi Harian (KPI 2026)"}
                </h3>
                <p className="text-xs text-slate-300">
                  Divisi Coal Hauling &bull; PT Batara Dharma Persada
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Row 1: Tanggal, Kelompok Minggu, JobSite */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Operasional <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelompok Minggu
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value.toUpperCase())}
                    placeholder="W31"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#e95623] focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Otomatis</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokasi / Job Site <span className="text-rose-500">*</span>
                </label>
                <select
                  value={jobSite}
                  onChange={(e) => setJobSite(e.target.value as JobSite)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                >
                  <option value="MuaraPahu">Site Muara Pahu</option>
                  <option value="Senyiur">Site Senyiur</option>
                </select>
              </div>
            </div>

            {/* Row 2: PA & UA (with UA Calculator link) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Physical Availability (PA)
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">Plan: 93.0%</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={paPercent}
                    onChange={(e) => setPaPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Nilai Desimal: {(paPercent / 100).toFixed(4)}</span>
                  {paPercent >= 93.0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Plan Tercapai
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> Di Bawah Plan
                    </span>
                  )}
                </div>
              </div>

              {/* UA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Use of Availability (UA)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsUaCalcOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#e95623] hover:underline"
                  >
                    <Calculator size={12} />
                    <span>Hitung di Kalkulator UA</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={uaPercent}
                    onChange={(e) => setUaPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Plan: 88.0% &bull; Desimal: {(uaPercent / 100).toFixed(5)}</span>
                  {uaPercent >= 88.0 ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Plan Tercapai
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> Di Bawah Plan
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Payload, Cycle Time, Fuel Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Payload (Ton)</label>
                  <span className="text-[10px] text-slate-400">Plan: 205 Ton</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={payload}
                    onChange={(e) => setPayload(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Ton</span>
                </div>
              </div>

              {/* Cycle Time */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Cycle Time (Jam)</label>
                  <span className="text-[10px] text-slate-400">Plan: 7.5 Jam</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={cycleTime}
                    onChange={(e) => setCycleTime(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Jam</span>
                </div>
              </div>

              {/* Fuel Ratio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Fuel Ratio (L/Ton)</label>
                  <span className="text-[10px] text-slate-400">Plan: 1.55</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={fuelRatio}
                    onChange={(e) => setFuelRatio(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">L/Ton</span>
                </div>
              </div>
            </div>

            {/* Row 4: Unit Running, TDP, Produksi Tonase */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-200/60">
              {/* Unit Running */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Unit Running</label>
                  <span className="text-[10px] text-slate-400">Plan: 43 Unit</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={unitRunning}
                    onChange={(e) => setUnitRunning(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Unit</span>
                </div>
              </div>

              {/* TDP (Trip Per Day) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">TDP (Trip / Day)</label>
                  <span className="text-[10px] text-slate-400">Plan: 2.7 Trip</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={tdp}
                    onChange={(e) => setTdp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Trip</span>
                </div>
              </div>

              {/* Produksi (Ton) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-extrabold text-[#e95623]">
                    Produksi Harian (Ton)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualProduction(!isManualProduction)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                  >
                    {isManualProduction ? "Otomatis" : "Edit Manual"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={production}
                    onChange={(e) => {
                      setIsManualProduction(true);
                      setProduction(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#e95623] bg-white text-sm font-black text-[#e95623] focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-black text-[#e95623]">Ton</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Rumus: Unit ({unitRunning}) &times; Payload ({payload}) &times; TDP ({tdp})
                </p>
              </div>
            </div>

            {/* Row 5: Keterangan Operasional */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Catatan Operasional
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: 8/8 KPI tersedia, cuaca hujan 2 jam di KM 35, kondisi jalan licin..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-500">
              Total Tonase:{" "}
              <strong className="text-slate-800 font-extrabold">
                {production.toLocaleString("id-ID")} Ton
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#e95623] to-[#d44415] hover:opacity-95 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all"
              >
                <Save size={15} />
                <span>{isSubmitting ? "Menyimpan..." : editData ? "Perbarui Data" : "Simpan Data Produksi"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* UA Calculator Modal */}
      <UACalculatorModal
        isOpen={isUaCalcOpen}
        onClose={() => setIsUaCalcOpen(false)}
        initialPa={paPercent}
        initialTdp={tdp}
        onApplyUa={(uaDecimal, uaPerc) => {
          setUaPercent(uaPerc);
        }}
      />
    </>
  );
};
