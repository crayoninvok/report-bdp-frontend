"use client";

import React from "react";
import { AlertTriangle, Wrench, Clock, FileSpreadsheet } from "lucide-react";

export const DailyBreakdownReportView: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-orange-100/50 via-rose-50/30 to-transparent rounded-full -mr-24 -mt-24 pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
              <Wrench size={11} />
              Plant &amp; Maintenance
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5">
              <AlertTriangle size={11} />
              Breakdown Monitoring
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Daily Breakdown Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Pusat pemantauan, pencatatan aktivitas kerusakan unit, analisis waktu downtime, dan laporan riwayat perbaikan armada harian.
          </p>
        </div>
      </div>

      {/* Placeholder Body Card */}
      <div className="bg-white rounded-3xl p-10 sm:p-16 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200/70 flex items-center justify-center shadow-xs">
          <FileSpreadsheet size={32} />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">
            Halaman Daily Breakdown Report
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Halaman ini telah disiapkan untuk diintegrasikan dengan fitur laporan dan penginputan breakdown harian.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
          <Clock size={12} />
          <span>Siap untuk pengembangan modul</span>
        </div>
      </div>
    </div>
  );
};

export default DailyBreakdownReportView;

