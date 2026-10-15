"use client";

import React, { useState, useMemo } from "react";
import { User, JobSite } from "../types/auth";
import {
  X,
  Waves,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { CreateRiverJournalPayload } from "../types/riverJournal";

interface InputRiverJournalModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (payload: CreateRiverJournalPayload) => Promise<void>;
  defaultSite?: JobSite | "all";
}

export const InputRiverJournalModal: React.FC<InputRiverJournalModalProps> = ({
  user,
  onClose,
  onSubmit,
  defaultSite,
}) => {
  const initialSite: JobSite =
    defaultSite && defaultSite !== "all"
      ? defaultSite
      : user.jobSite === "Senyiur"
      ? "Senyiur"
      : "MuaraPahu";

  const initialLocation =
    initialSite === "Senyiur" ? "Dermaga Senyiur KM 0" : "Jetty Muara Pahu";

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const [site, setSite] = useState<JobSite>(initialSite);
  const [location, setLocation] = useState(initialLocation);
  const [date, setDate] = useState(todayStr);
  const [inputTime, setInputTime] = useState(timeStr);
  const [waterDepth, setWaterDepth] = useState<string>("2.50");
  const [minThreshold, setMinThreshold] = useState<string>("4.00");
  const [userInput, setUserInput] = useState(user.name || "Petugas Lapangan");
  const [conclusion, setConclusion] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When site changes, update default location
  const handleSiteChange = (newSite: JobSite) => {
    setSite(newSite);
    if (newSite === "Senyiur") {
      setLocation("Dermaga Senyiur KM 0");
    } else if (newSite === "MuaraPahu") {
      setLocation("Jetty Muara Pahu");
    }
  };

  const parsedDepth = parseFloat(waterDepth.replace(",", ".")) || 0;
  const parsedThreshold = parseFloat(minThreshold.replace(",", ".")) || 4.0;
  const draftMargin = Number((parsedDepth - parsedThreshold).toFixed(2));
  const isSafe = parsedDepth >= parsedThreshold;

  // Compute live auto description
  const computedAutoDescription = useMemo(() => {
    if (isSafe) {
      return "Air Sudah Aman";
    }
    return "Surut (Tugboat Tidak Bisa Masuk)";
  }, [isSafe]);

  // Compute suggested conclusion if user hasn't typed custom conclusion
  const defaultConclusion = useMemo(() => {
    if (isSafe) {
      return "Operasional Lancar";
    }
    return "Kondisi air sungai masih surut, tugboat belum bisa masuk ke sungai.";
  }, [isSafe]);

  const activeConclusion = conclusion.trim() !== "" ? conclusion : defaultConclusion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(parsedDepth) || parsedDepth <= 0) {
      setErrorMsg("Kedalaman air sungai harus berupa angka positif!");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        date,
        inputTime,
        location,
        site,
        waterDepth: parsedDepth,
        minThreshold: parsedThreshold,
        autoDescription: computedAutoDescription,
        userInput,
        conclusion: activeConclusion,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data kedalaman sungai");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-[#18bebc] to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
              <Waves size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-white flex items-center gap-2">
                Input Jurnal Kedalaman Sungai
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#e95623] text-white">
                  Project Tabang
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pencatatan draft kedalaman air sungai & batas aman navigasi tongkang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Project Site & Lokasi Pengukuran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Project Site Tabang
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSiteChange("Senyiur")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    site === "Senyiur"
                      ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-400/40"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Site Senyiur
                </button>
                <button
                  type="button"
                  onClick={() => handleSiteChange("MuaraPahu")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    site === "MuaraPahu"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/40"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Site Muara Pahu
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Lokasi Pengukuran (Dermaga / Jetty)
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="e.g. Dermaga Senyiur KM 0"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Tanggal & Waktu Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tanggal Pengukuran
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Waktu Input (Jam:Menit)
              </label>
              <div className="relative">
                <Clock size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="time"
                  value={inputTime}
                  onChange={(e) => setInputTime(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Kedalaman Air Sungai & Batas Minimum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                <span>Kedalaman Air Sungai</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Satuan: Meter (m)
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="30"
                  value={waterDepth}
                  onChange={(e) => setWaterDepth(e.target.value)}
                  required
                  className="w-full text-lg font-black font-mono text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                Hasil sounding aktual tiang ukur dermaga
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                <span>Batas Minimum Tongkang</span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-md">
                  Pagu Draft: 4.0 m
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  required
                  className="w-full text-lg font-black font-mono text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="4.00"
                />
              </div>
              <span className="text-[10px] text-slate-500 block">
                Draft minimal agar tugboat & tongkang tidak kandas
              </span>
            </div>
          </div>

          {/* 4. REAL-TIME AUTO COMPUTATION CARD (Preview Otomatis) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isSafe
                ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                : "bg-rose-50/80 border-rose-300 text-rose-950"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-current/15 mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className={isSafe ? "text-emerald-700" : "text-rose-700"} />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Kalkulasi Otomatis Sistem
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                <span>Selisih Draft:</span>
                <span
                  className={`px-2 py-0.5 rounded-md ${
                    isSafe ? "bg-emerald-200/80 text-emerald-900" : "bg-rose-200/80 text-rose-900"
                  }`}
                >
                  {draftMargin >= 0 ? `+${draftMargin} m (Aman)` : `${draftMargin} m (Defisit)`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  Kolom G (Deskripsi Otomatis):
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {isSafe ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 size={13} />
                      {computedAutoDescription}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-600 text-white shadow-xs">
                      <AlertTriangle size={13} />
                      {computedAutoDescription}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  Izin Masuk Sungai:
                </span>
                <div className="mt-1 flex items-center gap-1.5 font-bold text-[11px]">
                  <Ship size={14} className="shrink-0" />
                  <span>
                    {isSafe
                      ? "Tongkang & Tugboat DISETUJUI Masuk"
                      : "DILARANG MASUK (Waspada Kandas / Stand-by)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. User yang Input & Kesimpulan Data */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                User yang Input (Kolom H)
              </label>
              <div className="relative">
                <UserIcon size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  required
                  placeholder="Nama Petugas"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Kesimpulan Data (Kolom I)</span>
                <button
                  type="button"
                  onClick={() => setConclusion(defaultConclusion)}
                  className="text-[10px] text-blue-600 hover:underline font-bold"
                >
                  Gunakan Teks Rekomendasi
                </button>
              </label>
              <input
                type="text"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder={defaultConclusion}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black tracking-wide shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? "Menyimpan Data..." : "Simpan Data Jurnal"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
