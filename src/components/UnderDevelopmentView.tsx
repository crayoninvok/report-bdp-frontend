"use client";

import React from "react";
import { User } from "../types/auth";
import {
  Truck,
  Construction,
  Clock,
  ArrowLeft,
  FileSpreadsheet,
  ClipboardList,
  Sparkles,
  ShieldCheck,
  Fuel,
  Scale,
} from "lucide-react";

interface UnderDevelopmentViewProps {
  user: User;
  moduleName: string;
  moduleCategory?: string;
  onBackToDashboard: () => void;
}

export const UnderDevelopmentView: React.FC<UnderDevelopmentViewProps> = ({
  user,
  moduleName,
  moduleCategory = "Coal Hauling",
  onBackToDashboard,
}) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background truck outline */}
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none">
          <Truck size={240} className="text-amber-400" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Construction size={13} className="text-amber-400" />
              Under Development
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/15">
              {moduleCategory}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              {moduleName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Modul operasional <strong>{moduleName}</strong> untuk divisi <strong>{moduleCategory}</strong> sedang dalam tahap perancangan dan integrasi sistem.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Dashboard Cost</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2.5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Scale size={20} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Monitoring Ritase & Tonase
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pencatatan real-time muatan batubara dari pit tambang menuju stock ROM atau Jetty dengan verifikasi jembatan timbang (*weighbridge*).
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2.5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Fleet & Cycle Time Alur
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Evaluasi kecepatan dan produktivitas unit dump truck hauling, waktu tempuh hauling road, serta kesiapan unit operasi per shift.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <Fuel size={20} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Fuel Ratio & Cost Linking
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sinkronisasi otomatis konsumsi bahan bakar (*liter per ton-km*) yang langsung terhubung dengan komponen biaya di Dashboard Cost.
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs font-medium">
        <Clock size={18} className="text-amber-600 shrink-0" />
        <span>
          Modul ini akan segera tersedia pada pembaruan rilis operasional PT Batara Dharma Persada berikutnya. Untuk pertanyaan atau saran kebutuhan input, hubungi tim Administrator.
        </span>
      </div>
    </div>
  );
};
