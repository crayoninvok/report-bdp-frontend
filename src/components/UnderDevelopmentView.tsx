"use client";

import React from "react";
import { User } from "../types/auth";
import {
  Truck,
  Construction,
  Clock,
  ArrowLeft,
  Users,
  ShieldCheck,
  Fuel,
  Scale,
  Database,
  SearchCheck,
  FileCheck,
  Wrench,
  ClipboardCheck,
  Activity,
  Settings,
  UserCheck,
  CalendarCheck,
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
  moduleCategory = "Cost Analytics",
  onBackToDashboard,
}) => {
  const isHRD =
    moduleCategory === "Human Resource & Development" ||
    moduleName.toLowerCase().includes("manpower") ||
    moduleName.toLowerCase().includes("hr");
  const isCostAnalytics =
    moduleCategory === "Cost Analytics" || moduleName.toLowerCase().includes("gl");
  const isPlantMaintenance =
    moduleCategory === "Plant & Maintenance" ||
    moduleName.toLowerCase().includes("plant") ||
    moduleName.toLowerCase().includes("inspection");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner (Executive Clean Light Theme) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-xs relative overflow-hidden">
        {/* Decorative background outline */}
        <div className="absolute -right-8 -bottom-10 opacity-40 pointer-events-none text-slate-100">
          {isHRD ? (
            <Users size={240} />
          ) : isPlantMaintenance ? (
            <Wrench size={240} />
          ) : isCostAnalytics ? (
            <Database size={240} />
          ) : (
            <Truck size={240} />
          )}
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <Construction size={13} className="text-[#e95623]" />
              Under Development
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {moduleCategory}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              {moduleName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Modul <strong>{moduleName}</strong> untuk divisi <strong>{moduleCategory}</strong> sedang dalam tahap perancangan arsitektur data dan integrasi sistem operasional PT Batara Dharma Persada.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Dashboard Cost</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Preview Cards */}
      {isHRD ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Users size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Manpower Headcount & Demographics
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Monitoring total tenaga kerja aktif, sebaran penempatan jobsite (Muara Pahu, Senyiur, Head Office), komposisi level jabatan, dan status kekaryawanan (PKWT/PKWTT).
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <CalendarCheck size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Roster & Shift Attendance
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Manajemen jadwal roster kerja lapangan (on/off site), presensi harian per shift hauling, rekapitulasi cuti, serta kesiapan manpower operasional harian.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <ShieldCheck size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Master Data & Compliance K3
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Database terpusat profil personalia, masa berlaku SIM BII Umum, sertifikasi Kimper tambang, riwayat MCU berkala, dan kepatuhan BPJS Ketenagakerjaan.
            </p>
          </div>
        </div>
      ) : isPlantMaintenance ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Activity size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Fleet Availability (PA / MA)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Monitoring kesiapan unit operasional melalui Physical Availability (PA), Mechanical Availability (MA), MTBF, serta durasi breakdown armada hauling dan alat berat.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <ClipboardCheck size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Periodic Inspection & Backlog
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Checklist berkala servis rutin (P1/250 HM, P2/500 HM, P3/1000 HM, P4/2000 HM), pelaporan temuan defect harian mekanik, dan mitigasi backlog penggantian part kritis.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Settings size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Integrasi Biaya Sparepart & Oli
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pencatatan konsumsi suku cadang, pelumas mesin/transmisi, dan biaya perbaikan per unit yang terhubung otomatis ke laporan Cost Analytics PT Batara Dharma Persada.
            </p>
          </div>
        </div>
      ) : isCostAnalytics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Database size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Integrasi General Ledger (GL)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sinkronisasi transaksi jurnal umum, nomor voucher, dan pos debet/kredit langsung dari sistem akuntansi site ke buku besar Batara.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <SearchCheck size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Audit Trail & Drill-down Biaya
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kemampuan menelusuri rincian setiap bukti pengeluaran kas/bank hingga invoice pendukung untuk verifikasi deviasi beban biaya operasional.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <FileCheck size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Rekonsiliasi Otomatis ke Laporan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Penyelarasan otomatis data GL dengan Laporan Mingguan (*Weekly Report*) dan Laporan Summary Operasional (*PL Summary 1 OPS*).
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Scale size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Monitoring Ritase & Tonase
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pencatatan real-time muatan batubara dari pit tambang menuju stock ROM atau Jetty dengan verifikasi jembatan timbang (*weighbridge*).
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Truck size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Fleet & Cycle Time Alur
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Evaluasi kecepatan dan produktivitas unit dump truck hauling, waktu tempuh hauling road, serta kesiapan unit operasi per shift.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold">
              <Fuel size={20} className="text-[#e95623]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Fuel Ratio & Cost Linking
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sinkronisasi otomatis konsumsi bahan bakar (*liter per ton-km*) yang langsung terhubung dengan komponen biaya di Dashboard Cost.
            </p>
          </div>
        </div>
      )}

      {/* Notice Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-slate-700 text-xs font-medium">
        <Clock size={18} className="text-[#e95623] shrink-0" />
        <span>
          Modul ini akan segera tersedia pada pembaruan rilis operasional PT Batara Dharma Persada berikutnya. Untuk pertanyaan atau saran kebutuhan input, hubungi tim Administrator.
        </span>
      </div>
    </div>
  );
};
