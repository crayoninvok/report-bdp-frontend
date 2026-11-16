"use client";

import React from "react";
import { User } from "../types/auth";
import { Droplets, FlaskConical, Shield, Clock, Sparkles } from "lucide-react";

interface OilAnalysisViewProps {
  user?: User;
}

export const OilAnalysisView: React.FC<OilAnalysisViewProps> = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute -right-6 -bottom-8 opacity-5 pointer-events-none text-slate-900">
          <Droplets size={260} />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <Droplets size={13} className="text-[#e95623]" />
              Plant & Maintenance
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Menu Baru
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              Oil Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Monitoring hasil uji laboratorium sampel oli & pelumas unit alat berat (Oil Sampling & Analysis Report).
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Empty Content Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-95 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
          <Droplets size={32} />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-bold text-slate-800">
            Halaman Oil Analysis
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Halaman ini telah disiapkan di menu navigasi Plant & Maintenance. Isi dan format pelaporan analisis laboratorium oli dapat dikonfigurasikan sesuai kebutuhan.
          </p>
        </div>
        <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Halaman siap diisi</span>
        </div>
      </div>
    </div>
  );
};

