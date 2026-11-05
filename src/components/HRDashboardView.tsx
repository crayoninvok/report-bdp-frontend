"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingDown,
  Building2,
  GraduationCap,
  Briefcase,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  manpowerService,
  HRDashboardData,
} from "../services/manpowerService";

interface HRDashboardViewProps {
  user: any;
  onNavigateToMasterManpower?: () => void;
}

export const HRDashboardView: React.FC<HRDashboardViewProps> = ({
  user,
  onNavigateToMasterManpower,
}) => {
  const [data, setData] = useState<HRDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "overview" | "comparison">("all");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await manpowerService.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Gagal memuat data HR dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await manpowerService.sync();
      if (res.success) {
        setSyncMessage(`Berhasil sinkron ${res.total || 585} data karyawan dari Google Sheet!`);
        await fetchDashboardData();
      }
    } catch (err: any) {
      setSyncMessage(`Sinkronisasi gagal: ${err.message || "Kesalahan jaringan"}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const kpi = data?.kpi || {
    totalKaryawan: 585,
    karyawanAktif: 430,
    karyawanResign: 155,
    turnoverRate: 26.5,
    pctLokal: 31.6,
    pctNonLokal: 68.4,
    tingkatRetensi: 73.5,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================== */}
      {/* 1. HEADER & CONTROLS */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1c3d73]/10 text-[#1c3d73] border border-[#1c3d73]/20">
              Human Resource & Development
            </span>
            {data?.lastSync && (
              <span className="text-[11px] text-slate-400">
                Terakhir sinkron: {new Date(data.lastSync).toLocaleString("id-ID")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            Dashboard Analitika Tenaga Kerja
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring Demografi, Status Ketenagakerjaan, Turnover Rate, dan Distribusi per Cabang
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Tab Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              Semua Analisis
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              Ikhtisar & Demografi
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "comparison"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "hover:text-slate-900"
              }`}
            >
              Komparasi Cabang
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1c3d73] hover:bg-[#152e56] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Menyinkronkan..." : "Sinkronkan HR"}</span>
          </button>

          {onNavigateToMasterManpower && (
            <button
              onClick={onNavigateToMasterManpower}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Master Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            syncMessage.includes("gagal")
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TOP KPI CARDS (Matching Image 1) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: TOTAL KARYAWAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#1c3d73] uppercase tracking-wider">
            Total Karyawan
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {kpi.totalKaryawan}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Database Keseluruhan</p>
        </div>

        {/* Card 2: KARYAWAN AKTIF */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Karyawan Aktif
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-emerald-700 tracking-tight font-mono">
              {kpi.karyawanAktif}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Status Aktif Saat Ini</p>
        </div>

        {/* Card 3: KARYAWAN RESIGN */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
            Karyawan Resign
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-rose-600 tracking-tight font-mono">
              {kpi.karyawanResign}
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Telah Berhenti/Resign</p>
        </div>

        {/* Card 4: TURNOVER RATE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#1c3d73] uppercase tracking-wider">
            Turnover Rate
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-[#1c3d73] tracking-tight font-mono">
              {kpi.turnoverRate.toFixed(1).replace(".", ",")}%
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Rasio Resign vs Total</p>
        </div>

        {/* Card 5: % KARYAWAN LOKAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            % Karyawan Lokal
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {kpi.pctLokal.toFixed(1).replace(".", ",")}%
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Tenaga Kerja Daerah</p>
        </div>

        {/* Card 6: % NON-LOKAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            % Non-Lokal
          </span>
          <div className="my-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {kpi.pctNonLokal.toFixed(1).replace(".", ",")}%
            </h2>
          </div>
          <p className="text-[10px] text-slate-400 italic">Tenaga Kerja Nasional</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SECTION OVERVIEW & DEMOGRAFI (Matching Image 2) */}
      {/* ============================================================== */}
      {(activeTab === "all" || activeTab === "overview") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: STATUS KETENAGAKERJAAN & INDIKATOR KINERJA */}
            <div className="space-y-6">
              {/* Table 1: Status Ketenagakerjaan & Turnover */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Status Ketenagakerjaan & Turnover
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Status Hubungan Kerja</th>
                        <th className="py-2.5 px-3 text-right">Aktif</th>
                        <th className="py-2.5 px-3 text-right">Resign</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.statusKetenagakerjaan || [
                        { status: "PKWT (Kontrak)", aktif: 395, resign: 152, total: 547 },
                        { status: "PKWTT (Tetap)", aktif: 21, resign: 2, total: 23 },
                        { status: "Magang / Trainee", aktif: 14, resign: 1, total: 15 },
                        { status: "Lainnya / Non-Kategori", aktif: 0, resign: 0, total: 0 },
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-medium text-slate-800">{row.status}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {row.aktif}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                            {row.resign}
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                        <td className="py-2.5 px-4">Total Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">{kpi.karyawanResign}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{kpi.totalKaryawan}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table 2: Indikator Kinerja Turnover */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Indikator Kinerja Turnover
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Turnover Rate (Resign / Total)</span>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {kpi.turnoverRate.toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Tingkat Retensi (Aktif / Total)</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      {kpi.tingkatRetensi.toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: DEMOGRAFI TENAGA KERJA (AKTIF) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Demografi Tenaga Kerja (Aktif)
                  </h3>
                </div>

                <div className="p-4 space-y-5">
                  {/* Subsection 1: Komposisi Gender */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Komposisi Gender
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(data?.demografi?.gender || [
                        { label: "Laki-laki (Male)", count: 425, ratio: 98.8, color: "bg-[#1c3d73]" },
                        { label: "Perempuan (Female)", count: 5, ratio: 1.2, color: "bg-rose-500" },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800 w-36 truncate">{item.label}</span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="font-mono text-slate-500 w-12 text-right">{item.ratio}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full ${item.color || "bg-[#1c3d73]"}`}
                              style={{ width: `${Math.min(item.ratio, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Subsection 2: Lokalitas (POH) */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Lokalitas (POH)
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(data?.demografi?.lokalitas || [
                        { label: "Lokal (Kaltim)", count: 136, ratio: 31.6, color: "bg-emerald-600" },
                        { label: "Non Lokal (Nasional)", count: 294, ratio: 68.4, color: "bg-blue-600" },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800 w-36 truncate">{item.label}</span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="font-mono text-slate-500 w-12 text-right">{item.ratio}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full ${item.color || "bg-emerald-600"}`}
                              style={{ width: `${Math.min(item.ratio, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Subsection 3: Kelompok Usia Karyawan */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Kelompok Usia Karyawan
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(data?.demografi?.usia || [
                        { label: "< 25 Tahun", count: 107, ratio: 24.9, color: "bg-cyan-500" },
                        { label: "25 - 35 Tahun", count: 182, ratio: 42.3, color: "bg-blue-500" },
                        { label: "36 - 45 Tahun", count: 112, ratio: 26.0, color: "bg-indigo-600" },
                        { label: "> 45 Tahun", count: 29, ratio: 6.7, color: "bg-purple-600" },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800 w-36 truncate">{item.label}</span>
                          <span className="font-mono font-bold text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="font-mono text-slate-500 w-12 text-right">{item.ratio}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full rounded-full ${item.color || "bg-indigo-600"}`}
                              style={{ width: `${Math.min(item.ratio, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: DISTRIBUSI DEPARTEMEN / ORGANISASI */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Distribusi Departemen / Organisasi
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Departemen</th>
                        <th className="py-2.5 px-3 text-right">Aktif</th>
                        <th className="py-2.5 px-3 text-right">Rasio</th>
                        <th className="py-2.5 px-4 text-left">Distribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.departemen || [
                        { name: "Production", aktif: 230, ratio: 53.5 },
                        { name: "Plant", aktif: 113, ratio: 26.3 },
                        { name: "Hrga", aktif: 26, ratio: 6.0 },
                        { name: "HSE", aktif: 20, ratio: 4.7 },
                        { name: "Logistic", aktif: 15, ratio: 3.5 },
                        { name: "FA & Procurement", aktif: 10, ratio: 2.3 },
                        { name: "Operations", aktif: 7, ratio: 1.6 },
                        { name: "BoD", aktif: 5, ratio: 1.2 },
                        { name: "Infrastructure", aktif: 4, ratio: 0.9 },
                      ]).map((dept, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-medium text-slate-800">{dept.name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {dept.aktif}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {dept.ratio}%
                          </td>
                          <td className="py-2 px-4">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1c3d73] rounded-full"
                                style={{ width: `${Math.min(dept.ratio, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                        <td className="py-2.5 px-4">Total Departemen</td>
                        <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                        <td className="py-2.5 px-3 text-right font-mono">100,0%</td>
                        <td className="py-2.5 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row in Overview: Struktur Job Level & Tingkat Pendidikan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table: Struktur Job Level per Cabang (Aktif) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Struktur Job Level per Cabang (Aktif)
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Jenjang Jabatan</th>
                      <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                      <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                      <th className="py-2.5 px-3 text-right">Senyiur</th>
                      <th className="py-2.5 px-3 text-right font-black text-slate-900">Total</th>
                      <th className="py-2.5 px-4 text-right">Rasio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.jobLevel || [
                      { level: "Director", ho: 5, mp: 0, sny: 0, total: 5, ratio: 1.2 },
                      { level: "Manager", ho: 6, mp: 3, sny: 1, total: 10, ratio: 2.3 },
                      { level: "Superintendent", ho: 0, mp: 4, sny: 3, total: 7, ratio: 1.6 },
                      { level: "Supervisor", ho: 3, mp: 5, sny: 5, total: 13, ratio: 3.0 },
                      { level: "Junior Supervisor", ho: 9, mp: 21, sny: 33, total: 63, ratio: 14.7 },
                      { level: "Staff", ho: 0, mp: 0, sny: 0, total: 0, ratio: 0.0 },
                      { level: "Worker", ho: 4, mp: 128, sny: 200, total: 332, ratio: 77.2 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-medium text-slate-800">{row.level}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{row.ho}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{row.mp}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">{row.sny}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.total}
                        </td>
                        <td className="py-2 px-4 text-right font-mono text-slate-500">
                          {row.ratio}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Job Level</td>
                      <td className="py-2.5 px-3 text-right font-mono">27</td>
                      <td className="py-2.5 px-3 text-right font-mono">161</td>
                      <td className="py-2.5 px-3 text-right font-mono">242</td>
                      <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                      <td className="py-2.5 px-4 text-right font-mono">100,0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table: Tingkat Pendidikan (Aktif) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Tingkat Pendidikan (Aktif)
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Pendidikan</th>
                        <th className="py-2.5 px-3 text-right">Jumlah</th>
                        <th className="py-2.5 px-3 text-right">Rasio</th>
                        <th className="py-2.5 px-4 text-left">Distribusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.pendidikan || [
                        { name: "SMA / SMK / Sederajat", count: 313, ratio: 72.8, color: "bg-[#1c3d73]" },
                        { name: "Diploma (D3 / D4)", count: 19, ratio: 4.4, color: "bg-emerald-600" },
                        { name: "Sarjana & Magister (S1/S2)", count: 47, ratio: 10.9, color: "bg-orange-500" },
                        { name: "Belum Terdata / Lainnya", count: 51, ratio: 11.9, color: "bg-slate-400" },
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 font-medium text-slate-800">{row.name}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {row.count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {row.ratio}%
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.color || "bg-[#1c3d73]"}`}
                                style={{ width: `${Math.min(row.ratio, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                        <td className="py-2.5 px-4">Total Terverifikasi</td>
                        <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                        <td className="py-2.5 px-3 text-right font-mono">100,0%</td>
                        <td className="py-2.5 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SECTION KOMPARASI CABANG / SITE (Matching Image 3) */}
      {/* ============================================================== */}
      {(activeTab === "all" || activeTab === "comparison") && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-2 border-t border-slate-200 pt-6">
            <Building2 className="w-5 h-5 text-[#1c3d73]" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Analisis Komparasi Antar Cabang / Site
            </h2>
            <span className="text-xs text-slate-400 font-medium ml-2">
              (HO Jakarta vs Site Muara Pahu vs Site Senyiur)
            </span>
          </div>

          {/* Row 1: Metrik Utama, Lokalitas, Gender per Cabang */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Table 1: Komparasi Metrik Utama per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Komparasi Metrik Utama per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Branch / Unit Kerja</th>
                      <th className="py-2.5 px-3 text-right">Aktif</th>
                      <th className="py-2.5 px-3 text-right">Resign</th>
                      <th className="py-2.5 px-4 text-right">Turnover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.metrikUtama || [
                      { branch: "HO Jakarta", aktif: 27, resign: 13, turnoverRate: 32.5 },
                      { branch: "Site Muara Pahu", aktif: 161, resign: 9, turnoverRate: 5.3 },
                      { branch: "Site Senyiur", aktif: 242, resign: 133, turnoverRate: 35.5 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-medium text-slate-800">{row.branch}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.aktif}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          {row.resign}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {row.turnoverRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Perusahaan</td>
                      <td className="py-2.5 px-3 text-right font-mono">{kpi.karyawanAktif}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600">{kpi.karyawanResign}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.turnoverRate}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 2: Komposisi Lokalitas per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Komposisi Lokalitas per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Branch / Lokasi</th>
                      <th className="py-2.5 px-3 text-right">Lokal</th>
                      <th className="py-2.5 px-3 text-right">Non-Lokal</th>
                      <th className="py-2.5 px-4 text-right">% Lokal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.lokalitas || [
                      { branch: "HO Jakarta", lokal: 0, nonLokal: 27, pctLokal: 0.0 },
                      { branch: "Site Muara Pahu", lokal: 56, nonLokal: 105, pctLokal: 34.8 },
                      { branch: "Site Senyiur", lokal: 80, nonLokal: 162, pctLokal: 33.1 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-medium text-slate-800">{row.branch}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {row.lokal}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {row.nonLokal}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                          {row.pctLokal}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Perusahaan</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">136</td>
                      <td className="py-2.5 px-3 text-right font-mono">294</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.pctLokal}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 3: Komposisi Gender per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#1c3d73] text-white px-4 py-3">
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Komposisi Gender per Cabang (L / P)
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                        <th className="py-2.5 px-4">Branch / Lokasi</th>
                        <th className="py-2.5 px-4 text-right">Komposisi (L / P)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.branchComparison?.gender || [
                        { branch: "HO Jakarta", ratioStr: "22 L / 5 P" },
                        { branch: "Site Muara Pahu", ratioStr: "161 L / 0 P" },
                        { branch: "Site Senyiur", ratioStr: "242 L / 0 P" },
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-4 font-medium text-slate-800">{row.branch}</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                            {row.ratioStr}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500">
                Catatan: Mayoritas personil lapangan merupakan tenaga kerja operasional teknis tambang.
              </div>
            </div>
          </div>

          {/* Row 2: Status Hubungan Kerja & Distribusi Departemen per Cabang */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Hubungan Kerja per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Status Hubungan Kerja per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Status Kerja</th>
                      <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                      <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                      <th className="py-2.5 px-3 text-right">Senyiur</th>
                      <th className="py-2.5 px-4 text-right font-black text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.statusKerja || [
                      { status: "PKWT (Kontrak)", ho: 10, mp: 155, sny: 230 },
                      { status: "PKWTT (Tetap)", ho: 16, mp: 1, sny: 4 },
                      { status: "Magang & Non-Kategori", ho: 1, mp: 5, sny: 8 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{row.status}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.ho}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.mp}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.sny}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {row.ho + row.mp + row.sny}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Tenaga Kerja</td>
                      <td className="py-2.5 px-3 text-right font-mono">27</td>
                      <td className="py-2.5 px-3 text-right font-mono">161</td>
                      <td className="py-2.5 px-3 text-right font-mono">242</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.karyawanAktif}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Distribusi Kelompok Usia per Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-[#1c3d73] text-white px-4 py-3">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Distribusi Kelompok Usia per Cabang
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                      <th className="py-2.5 px-4">Kelompok Usia</th>
                      <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                      <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                      <th className="py-2.5 px-3 text-right">Senyiur</th>
                      <th className="py-2.5 px-4 text-right font-black text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.branchComparison?.usia || [
                      { kelompok: "< 25 Tahun", ho: 5, mp: 30, sny: 72 },
                      { kelompok: "25 - 35 Tahun", ho: 9, mp: 68, sny: 105 },
                      { kelompok: "36 - 45 Tahun", ho: 7, mp: 52, sny: 53 },
                      { kelompok: "> 45 Tahun", ho: 6, mp: 11, sny: 12 },
                    ]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{row.kelompok}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.ho}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.mp}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.sny}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {row.ho + row.mp + row.sny}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                      <td className="py-2.5 px-4">Total Karyawan</td>
                      <td className="py-2.5 px-3 text-right font-mono">27</td>
                      <td className="py-2.5 px-3 text-right font-mono">161</td>
                      <td className="py-2.5 px-3 text-right font-mono">242</td>
                      <td className="py-2.5 px-4 text-right font-mono">{kpi.karyawanAktif}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Row 3: Distribusi Departemen per Cabang */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-[#1c3d73] text-white px-4 py-3">
              <h3 className="text-xs font-black uppercase tracking-wider">
                Distribusi Departemen per Cabang (Aktif)
              </h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left font-bold">
                    <th className="py-2.5 px-4">Departemen / Divisi</th>
                    <th className="py-2.5 px-3 text-right">HO Jakarta</th>
                    <th className="py-2.5 px-3 text-right">Muara Pahu</th>
                    <th className="py-2.5 px-3 text-right">Senyiur</th>
                    <th className="py-2.5 px-4 text-right font-black text-slate-900">Total Departemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.branchComparison?.departemen || [
                    { departemen: "Production", ho: 0, mp: 101, sny: 129 },
                    { departemen: "Plant", ho: 1, mp: 33, sny: 79 },
                    { departemen: "Hrga", ho: 7, mp: 7, sny: 12 },
                    { departemen: "HSE", ho: 0, mp: 9, sny: 11 },
                    { departemen: "Logistic", ho: 0, mp: 7, sny: 8 },
                    { departemen: "FA & Procurement", ho: 10, mp: 0, sny: 0 },
                    { departemen: "Operations", ho: 3, mp: 2, sny: 2 },
                    { departemen: "BoD", ho: 5, mp: 0, sny: 0 },
                    { departemen: "Infrastructure", ho: 1, mp: 2, sny: 1 },
                  ]).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-4 font-medium text-slate-800">{row.departemen}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{row.ho}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{row.mp}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{row.sny}</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        {row.ho + row.mp + row.sny}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/70 font-black border-t-2 border-slate-200 text-slate-900">
                    <td className="py-2.5 px-4">Total Departemen</td>
                    <td className="py-2.5 px-3 text-right font-mono">27</td>
                    <td className="py-2.5 px-3 text-right font-mono">161</td>
                    <td className="py-2.5 px-3 text-right font-mono">242</td>
                    <td className="py-2.5 px-4 text-right font-mono">{kpi.karyawanAktif}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
