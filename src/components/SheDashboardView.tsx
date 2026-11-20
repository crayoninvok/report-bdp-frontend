"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HardHat,
  FileText,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  sheService,
  SheDashboardData,
  HazardReportItem,
} from "../services/sheService";
import { useNotification } from "../context/NotificationContext";

interface SheDashboardViewProps {
  user: any;
  onNavigateToHazardReport?: () => void;
}

export const SheDashboardView: React.FC<SheDashboardViewProps> = ({
  user,
  onNavigateToHazardReport,
}) => {
  const { showError } = useNotification();

  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur" | "ALL">(
    user?.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu"
  );
  const [data, setData] = useState<SheDashboardData | null>(null);
  const [recentHazards, setRecentHazards] = useState<HazardReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashData, hazardsList] = await Promise.all([
        sheService.getDashboardData(selectedSite),
        sheService.getHazards(selectedSite),
      ]);
      setData(dashData);
      setRecentHazards(hazardsList.slice(0, 5));
    } catch (err: any) {
      showError(err.message || "Gagal memuat data dashboard SHE");
    } finally {
      setLoading(false);
    }
  }, [selectedSite, showError]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const siteLabel =
    selectedSite === "ALL"
      ? "Semua Site"
      : selectedSite === "MuaraPahu"
      ? "Site Muara Pahu"
      : "Site Senyiur";

  return (
    <div className="space-y-7 pb-8 min-w-0">
      {/* ---------------------------------------------------------
          Corporate Header Banner
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 shadow-xl p-6 sm:p-7 min-w-0">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 min-w-0">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#e95623] text-white shadow-xs">
                <HardHat size={13} />
                SAFETY, HEALTH &amp; ENVIRONMENT (SHE)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck size={12} />
                ZERO LTI ACHIEVEMENT • 100% COMPLIANCE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Safety, Health &amp; Environment (SHE) Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              Pusat komando pengawasan keselamatan pertambangan &amp; hauling armada PT Batara Dharma Persada.
              Monitoring terpadu Hazard Report, evaluasi risiko K3L, jam kerja selamat (Safe Man Hours), dan kepatuhan lingkungan hidup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Site Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              {(
                [
                  { key: "MuaraPahu", label: "Muara Pahu" },
                  { key: "Senyiur", label: "Senyiur" },
                  { key: "ALL", label: "Semua Site" },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSite(s.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedSite === s.key
                      ? "bg-[#e95623] text-white shadow-md"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all cursor-pointer"
              title="Refresh Data Dashboard"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-[#e95623]" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION 1: DATA PELAPORAN BAHAYA (HAZARD REPORT)
          - SECTION UTAMA KARENA MODUL HAZARD REPORT SUDAH AKTIF -
      ========================================================== */}
      <section className="space-y-4 min-w-0">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 min-w-0">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200">
                <ShieldAlert size={12} />
                MODUL UTAMA AKTIF
              </span>
              <span className="text-xs font-bold text-slate-400">• {siteLabel}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Data Pelaporan Bahaya (Hazard Report)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Rekapitulasi temuan potensi bahaya K3L (Kondisi Tidak Aman &amp; Tindakan Tidak Aman) serta progres penanganan perbaikan.
            </p>
          </div>

          {onNavigateToHazardReport && (
            <button
              type="button"
              onClick={onNavigateToHazardReport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#e95623] hover:bg-[#d44819] text-white shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
            >
              <span>Kelola Hazard Report</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* 5 Hazard KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 min-w-0">
          {/* Card 1: Total Hazard */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Hazard</span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <FileText size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {data?.totalHazards ?? 0}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-1">Laporan</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 mt-1">
              Seluruh temuan K3L
            </span>
          </div>

          {/* Card 2: KTA (Kondisi Tidak Aman) */}
          <div className="bg-white border border-orange-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all min-w-0">
            <div className="flex items-center justify-between text-[#e95623]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Kondisi Tdk Aman (KTA)</span>
              <div className="p-1.5 rounded-lg bg-orange-100 text-[#e95623]">
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-[#e95623]">
                {data?.ktaCount ?? 0}
              </span>
              <span className="text-xs font-bold text-orange-400 ml-1">Temuan</span>
            </div>
            <span className="text-[10px] font-bold text-orange-600 mt-1">
              Fasilitas &amp; Kondisi Fisik
            </span>
          </div>

          {/* Card 3: TTA (Tindakan Tidak Aman) */}
          <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all min-w-0">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tindakan Tdk Aman (TTA)</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <HardHat size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">
                {data?.ttaCount ?? 0}
              </span>
              <span className="text-xs font-bold text-amber-400 ml-1">Temuan</span>
            </div>
            <span className="text-[10px] font-bold text-amber-700 mt-1">
              Perilaku &amp; Kepatuhan SOP
            </span>
          </div>

          {/* Card 4: Open Hazard */}
          <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all min-w-0">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Hazard Open</span>
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600">
                {data?.openHazards ?? 0}
              </span>
              <span className="text-xs font-bold text-rose-400 ml-1">Perlu Tindakan</span>
            </div>
            <span className="text-[10px] font-bold text-rose-700 mt-1">
              Menunggu perbaikan/tindakan
            </span>
          </div>

          {/* Card 5: Closed Hazard */}
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all min-w-0">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Hazard Closed</span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                {data?.closedHazards ?? 0}
              </span>
              <span className="text-xs font-bold text-emerald-500 ml-1">Selesai</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 mt-1">
              {data?.resolutionRate ?? 100}% Tingkat Penyelesaian
            </span>
          </div>
        </div>

        {/* Hazard Risk Matrix & Recent Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
          {/* Risk Level Distribution */}
          <div className="lg:col-span-4 min-w-0 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3.5">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>Matriks Tingkat Risiko</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Klasifikasi tingkat keparahan risiko bahaya</p>
            </div>

            <div className="space-y-2.5">
              {(data?.riskDistribution || []).map((rk) => {
                const total = data?.totalHazards || 1;
                const pct = Math.round((rk.value / total) * 100);
                return (
                  <div key={rk.name} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rk.color }} />
                        {rk.name} Risk
                      </span>
                      <span className="font-extrabold text-slate-700">
                        {rk.value} Laporan ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: rk.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block">Prinsip Stop Work Authority (SWA):</span>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Setiap karyawan dan mitra kerja berhak dan wajib menghentikan pekerjaan apabila menemukan kondisi risiko Critical / High yang membahayakan jiwa.
              </p>
            </div>
          </div>

          {/* Recent Hazard Observations Widget */}
          <div className="lg:col-span-8 min-w-0 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-[#e95623]" />
                  <span>Temuan Bahaya Terkini (Recent Hazard Reports)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  5 laporan hazard terbaru yang membutuhkan pengawalan tindakan perbaikan
                </p>
              </div>
              {onNavigateToHazardReport && (
                <button
                  type="button"
                  onClick={onNavigateToHazardReport}
                  className="text-xs font-bold text-[#e95623] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {recentHazards.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada laporan hazard tercatat.
                </div>
              ) : (
                recentHazards.map((h) => {
                  let badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
                  if (h.status === "Closed") badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  if (h.status === "In Progress") badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";

                  return (
                    <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-xs text-slate-900">{h.reportNumber}</span>
                          <span className="text-[10px] font-bold text-slate-400">• {h.date}</span>
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-slate-100 text-slate-700">
                            {h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                              h.riskLevel === "Critical"
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : h.riskLevel === "High"
                                ? "bg-orange-100 text-orange-700 border border-orange-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {h.riskLevel}
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1">{h.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Lokasi: <span className="font-semibold text-slate-700">{h.lokasiBahaya || h.location}</span> • PIC: <span className="font-semibold text-slate-700">{h.penanggungJawabArea || h.picDept || "PLANT"}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeStyle}`}>
                          {h.status === "Closed" || h.statusGForm === "CLOSE" ? "CLOSED" : "OPEN"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
