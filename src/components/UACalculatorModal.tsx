"use client";

import React, { useState, useEffect } from "react";
import { X, Calculator, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { productionService } from "../services/productionService";
import { UACalculatorResult } from "../types/production";

interface UACalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPa?: number; // e.g. 0.958 or 95.8
  initialTdp?: number; // e.g. 2.7 or 3.0
  onApplyUa?: (uaDecimal: number, uaPercent: number) => void;
}

export const UACalculatorModal: React.FC<UACalculatorModalProps> = ({
  isOpen,
  onClose,
  initialPa = 1.0,
  initialTdp = 3.03,
  onApplyUa,
}) => {
  const [calendarHours, setCalendarHours] = useState<number>(24);
  const [plannedDelay, setPlannedDelay] = useState<number>(2.33);
  const [paInput, setPaInput] = useState<number>(
    initialPa > 1 ? initialPa : Number((initialPa * 100).toFixed(1))
  );
  const [targetTrip, setTargetTrip] = useState<number>(3.0);
  const [actualTrip, setActualTrip] = useState<number>(initialTdp || 3.03);

  const [result, setResult] = useState<UACalculatorResult | null>(null);

  useEffect(() => {
    if (initialPa) {
      setPaInput(initialPa > 1 ? initialPa : Number((initialPa * 100).toFixed(1)));
    }
    if (initialTdp) {
      setActualTrip(initialTdp);
    }
  }, [initialPa, initialTdp]);

  useEffect(() => {
    if (!isOpen) return;
    const calc = productionService.calculateUAOffline({
      calendarHours,
      plannedDelay,
      pa: paInput / 100,
      targetTrip,
      actualTrip,
    });
    setResult(calc);
  }, [calendarHours, plannedDelay, paInput, targetTrip, actualTrip, isOpen]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setCalendarHours(24);
    setPlannedDelay(2.33);
    setPaInput(100);
    setTargetTrip(3.0);
    setActualTrip(3.03);
  };

  const handleApply = () => {
    if (result && onApplyUa) {
      onApplyUa(result.uaActual, result.uaActualPercent);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-slate-800 to-[#1e232b] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#e95623] to-[#f97316] text-white shadow-md">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Kalkulator UA (Use of Availability)
              </h3>
              <p className="text-xs text-slate-300">
                Formula Standar Kalkulator UA Operasional Coal Hauling
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Formula Info Banner */}
          <div className="p-3.5 rounded-xl bg-batara-orange-50/70 border border-batara-orange-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#e95623]">
              <Sparkles size={14} />
              <span>Rumus Kalender UA:</span>
            </div>
            <code className="block p-2 rounded-lg bg-white font-mono text-[11px] text-slate-800 border border-batara-orange-100 shadow-2xs">
              UA Aktual = PA &times; ((Waktu Kalender - Planned Delay) &divide; Waktu Kalender) &times; (Trip Aktual &divide; Plan Trip)
            </code>
            <p className="text-[11px] text-slate-500">
              Ubah nilai parameter input di bawah untuk menghitung Use of Availability (UA) secara real-time.
            </p>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Waktu Kalender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Waktu Kalender (Jam/Hari)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={calendarHours}
                  onChange={(e) => setCalendarHours(parseFloat(e.target.value) || 24)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Jam</span>
              </div>
            </div>

            {/* Planned Delay */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Planned Delay (Jam/Hari)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="24"
                  value={plannedDelay}
                  onChange={(e) => setPlannedDelay(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Jam</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Istirahat, refuel, change shift, cooling tyre (default ~2.33 jam)
              </p>
            </div>

            {/* PA % */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Physical Availability (PA %)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={paInput}
                  onChange={(e) => setPaInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Plan PA Operasional: 93.0%</p>
            </div>

            {/* Plan Trip per Hari */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plan Trip per Hari
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={targetTrip}
                  onChange={(e) => setTargetTrip(parseFloat(e.target.value) || 3.0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Trip</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Standar plan trip: 3.0 trip</p>
            </div>

            {/* Trip Aktual per Hari */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trip Aktual per Hari (TDP)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualTrip}
                  onChange={(e) => setActualTrip(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                />
                <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">Trip</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Rata-rata pencapaian ritase harian per unit armada
              </p>
            </div>
          </div>

          {/* Results Card */}
          {result && (
            <div className="p-4 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    Hasil Perhitungan UA Aktual
                  </span>
                  {result.isAchieved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={11} /> Mencapai Plan (88%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle size={11} /> Di Bawah Plan (88%)
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-3xl font-black tracking-tight text-[#18bebc]">
                    {result.uaActualPercent}%
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Desimal: {result.uaActual}
                  </span>
                </div>
              </div>

              {/* Metrics Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="block text-[10px] text-slate-400">UA Potensial</span>
                  <span className="text-sm font-bold text-white">{result.uaPotentialPercent}%</span>
                  <span className="block text-[9px] text-slate-400">Waktu Efektif: {result.effectiveHours} jam</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="block text-[10px] text-slate-400">Pencapaian Trip</span>
                  <span className="text-sm font-bold text-white">{result.tripAchievementPercent}%</span>
                  <span className="block text-[9px] text-slate-400">{result.actualTrip} / {result.targetTrip} Trip</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="block text-[10px] text-slate-400">Waktu Kerja Ekuivalen</span>
                  <span className="text-sm font-bold text-white">{result.equivalentWorkingHours} Jam</span>
                  <span className="block text-[9px] text-slate-400">Waktu Efektif &times; Pencapaian</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="block text-[10px] text-slate-400">Lost Time Operasional</span>
                  <span className="text-sm font-bold text-white">{result.lostTimeOperational} Jam</span>
                  <span className="block text-[9px] text-slate-400">Selisih waktu efektif</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Tutup
            </button>
            {onApplyUa && result && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#e95623] to-[#d44415] hover:opacity-95 shadow-md shadow-orange-500/20 transition-all"
              >
                <span>Terapkan UA ({result.uaActualPercent}%) ke Form</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
