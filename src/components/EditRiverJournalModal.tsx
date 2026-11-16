"use client";

import React, { useState, useMemo } from "react";
import { User } from "../types/auth";
import { DailyPairedPoint } from "../types/riverJournal";
import {
  X,
  Waves,
  Calendar,
  Save,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface EditRiverJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    date: string;
    muaraPahuDepth: number;
    senyiurDepth: number;
    muaraPahuId?: string;
    senyiurId?: string;
    userInput?: string;
  }) => Promise<void>;
  initialData: DailyPairedPoint;
  user: User;
  previousDayData?: DailyPairedPoint | null;
}

export const EditRiverJournalModal: React.FC<EditRiverJournalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  user,
  previousDayData,
}) => {
  const [muaraPahuInput, setMuaraPahuInput] = useState<string>(
    initialData.muaraPahu !== undefined ? String(initialData.muaraPahu) : ""
  );
  const [senyiurInput, setSenyiurInput] = useState<string>(
    initialData.senyiur !== undefined ? String(initialData.senyiur) : ""
  );
  const [userInput, setUserInput] = useState<string>(
    user.name || "Petugas Lapangan"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed numeric depths
  const parsedMP = parseFloat(muaraPahuInput.replace(",", ".")) || 0;
  const parsedSny = parseFloat(senyiurInput.replace(",", ".")) || 0;

  // Real-time calculation based on previous day
  const previewSimulation = useMemo(() => {
    let deltaMP = 0;
    let deltaSny = 0;
    let statusLabel = "Pengukuran Awal";
    let statusType: "both_up" | "both_down" | "flat" | "divergent" = "flat";

    if (previousDayData) {
      deltaMP = Number((parsedMP - previousDayData.muaraPahu).toFixed(2));
      deltaSny = Number((parsedSny - previousDayData.senyiur).toFixed(2));

      if (deltaMP > 0 && deltaSny > 0) {
        statusLabel = "Keduanya Naik (Banjir Kiriman)";
        statusType = "both_up";
      } else if (deltaMP < 0 && deltaSny < 0) {
        statusLabel = "Keduanya Turun (Fase Surut)";
        statusType = "both_down";
      } else if (deltaMP === 0 || deltaSny === 0) {
        statusLabel = "Stabil / Respon Lambat";
        statusType = "flat";
      } else {
        statusLabel = deltaMP > 0 ? "MP Naik, Senyiur Turun" : "MP Turun, Senyiur Naik";
        statusType = "divergent";
      }
    }

    const deficit = Number((parsedSny - 4.0).toFixed(2));

    return {
      deltaMP,
      deltaSny,
      statusLabel,
      statusType,
      deficit,
      isSenyiurSafe: parsedSny >= 4.0,
      isMPSafe: parsedMP >= 4.0,
    };
  }, [parsedMP, parsedSny, previousDayData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(parsedMP) || parsedMP <= 0) {
      setErrorMsg("Kedalaman Jetty Muara Pahu harus berupa angka positif!");
      return;
    }

    if (isNaN(parsedSny) || parsedSny <= 0) {
      setErrorMsg("Kedalaman Dermaga Senyiur harus berupa angka positif!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        date: initialData.date,
        muaraPahuDepth: Number(parsedMP.toFixed(2)),
        senyiurDepth: Number(parsedSny.toFixed(2)),
        muaraPahuId: initialData.muaraPahuId,
        senyiurId: initialData.senyiurId,
        userInput,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDisplayDate = new Date(initialData.date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-[#e95623] border border-orange-500/30">
              <Waves size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Edit Data River Journal
              </h2>
              <p className="text-xs text-slate-400">
                {formattedDisplayDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date Indicator */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calendar size={15} className="text-[#e95623]" />
              <span>Tanggal Pengukuran</span>
            </div>
            <span className="font-mono font-black text-xs text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {initialData.date}
            </span>
          </div>

          {/* Depth Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jetty Muara Pahu */}
            <div className="p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Jetty Muara Pahu
                </label>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Hilir
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="20"
                  value={muaraPahuInput}
                  onChange={(e) => setMuaraPahuInput(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 font-mono font-black text-lg text-emerald-900 bg-white border border-emerald-300 rounded-xl shadow-xs focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                  placeholder="0.00"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 pointer-events-none">
                  m
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">
                Kedalaman air aktual di Jetty Hilir
              </p>
            </div>

            {/* Dermaga Senyiur */}
            <div className="p-4 rounded-2xl border-2 border-amber-100 bg-amber-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Dermaga Senyiur
                </label>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Hulu
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="20"
                  value={senyiurInput}
                  onChange={(e) => setSenyiurInput(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 font-mono font-black text-lg text-amber-900 bg-white border border-amber-300 rounded-xl shadow-xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  placeholder="0.00"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 pointer-events-none">
                  m
                </span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">
                Kedalaman air aktual di Dermaga Hulu
              </p>
            </div>
          </div>

          {/* Realtime Calculation Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Kalkulasi Otomatis Matriks Sungai
              </span>
              <span className="text-[10px] font-medium text-slate-500">Live Preview</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block">&Delta; Muara Pahu</span>
                <span
                  className={`font-mono font-bold flex items-center gap-0.5 ${
                    previewSimulation.deltaMP > 0
                      ? "text-emerald-600"
                      : previewSimulation.deltaMP < 0
                      ? "text-rose-600"
                      : "text-slate-500"
                  }`}
                >
                  {previewSimulation.deltaMP > 0 ? (
                    <ArrowUpRight size={13} />
                  ) : previewSimulation.deltaMP < 0 ? (
                    <ArrowDownRight size={13} />
                  ) : null}
                  {previewSimulation.deltaMP >= 0 ? "+" : ""}
                  {previewSimulation.deltaMP.toFixed(2)} m
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-500 block">&Delta; Senyiur</span>
                <span
                  className={`font-mono font-bold flex items-center gap-0.5 ${
                    previewSimulation.deltaSny > 0
                      ? "text-emerald-600"
                      : previewSimulation.deltaSny < 0
                      ? "text-rose-600"
                      : "text-slate-500"
                  }`}
                >
                  {previewSimulation.deltaSny > 0 ? (
                    <ArrowUpRight size={13} />
                  ) : previewSimulation.deltaSny < 0 ? (
                    <ArrowDownRight size={13} />
                  ) : null}
                  {previewSimulation.deltaSny >= 0 ? "+" : ""}
                  {previewSimulation.deltaSny.toFixed(2)} m
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Arah Fluktuasi:</span>
                <span className="font-extrabold text-slate-900">
                  {previewSimulation.statusLabel}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Defisit Draft Senyiur:</span>
                <span className="font-mono font-black text-rose-600">
                  {previewSimulation.deficit.toFixed(2)} m (Kurang)
                </span>
              </div>
            </div>
          </div>

          {/* User Input / Petugas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Petugas / Surveyor Lapangan
            </label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:outline-hidden"
              placeholder="Nama surveyor..."
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-linear-to-r from-[#e95623] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
