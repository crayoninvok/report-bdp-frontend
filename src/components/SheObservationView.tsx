"use client";

import React, { useState } from "react";
import { Eye, ShieldCheck, Construction } from "lucide-react";

interface SheObservationViewProps {
  user: any;
  onNavigateToDashboard?: () => void;
}

export const SheObservationView: React.FC<SheObservationViewProps> = ({
  user,
  onNavigateToDashboard,
}) => {
  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur" | "ALL">(
    user?.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu"
  );

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 min-w-0 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------
          1. Header Banner
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-6 md:p-7 min-w-0">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="space-y-1.5 min-w-0">
            {/* Top row: Site Selector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full border border-white/15">
                <button
                  type="button"
                  onClick={() => setSelectedSite("MuaraPahu")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "MuaraPahu"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Muara Pahu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite("Senyiur")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "Senyiur"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Senyiur
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite("ALL")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "ALL"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Semua Site
                </button>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                Safety Observation Program
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Eye size={20} className="text-[#e95623]" />
              <span>Observasi Keselamatan Kerja (Safety Observation)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Program observasi perilaku kerja, pemantauan kepatuhan SOP lapangan, dan intervensi keselamatan operasional armada PT Batara Dharma Persada.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. Placeholder Content Area (Kosongkan Dulu)
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/60 text-[#e95623] flex items-center justify-center mx-auto shadow-2xs">
          <Eye size={32} />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h2 className="text-base font-extrabold text-slate-900">
            Modul Observasi Keselamatan
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman observasi telah ditambahkan ke sistem. Rincian formulir isian, indikator pengamatan, dan rekapitulasi data akan segera diisi sesuai kebutuhan operasional.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
          <Construction size={13} className="text-amber-500" />
          <span>Form &amp; Data Observasi Siap Dikonfigurasi</span>
        </div>
      </div>
    </div>
  );
};
