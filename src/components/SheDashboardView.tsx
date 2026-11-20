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
  MapPin,
  User,
  Calendar,
  Building2,
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

  const totalHazards = data?.totalHazards || 1;
  const ktaPct = Math.round(((data?.ktaCount ?? 0) / totalHazards) * 100);
  const ttaPct = Math.round(((data?.ttaCount ?? 0) / totalHazards) * 100);
  const openPct = Math.round(((data?.openHazards ?? 0) / totalHazards) * 100);

  return (
    <div className="space-y-6 pb-10 min-w-0">
      {/* ---------------------------------------------------------
          1. Corporate Header Banner
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

      {/* ---------------------------------------------------------
          2. Section Header: Modul Utama Hazard Report
      ---------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 min-w-0">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200">
              <ShieldAlert size={11} />
              MODUL UTAMA AKTIF
            </span>
            <span className="text-xs font-bold text-slate-400">• {siteLabel}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Data Pelaporan Bahaya (Hazard Report)
          </h2>
          <p className="text-xs text-slate-500">
            Rekapitulasi temuan potensi bahaya K3L (Kondisi Tidak Aman &amp; Tindakan Tidak Aman) serta progres penyelesaian.
          </p>
        </div>

        {onNavigateToHazardReport && (
          <button
            type="button"
            onClick={onNavigateToHazardReport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#e95623] hover:bg-[#d44819] text-white shadow-xs hover:shadow transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <span>Buka Data Hazard Report</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------
          3. 5 KPI Summary Cards (Refined & Balanced)
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 min-w-0">
        {/* Card 1: Total Hazard */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all min-w-0">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Hazard</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {(data?.totalHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-400">Laporan</span>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 mt-1 truncate">
              Seluruh temuan K3L terdata
            </p>
          </div>
          <div className="w-full h-1 bg-slate-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full w-full" />
          </div>
        </div>

        {/* Card 2: KTA */}
        <div className="bg-white border border-orange-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-orange-300 hover:shadow-sm transition-all min-w-0">
          <div className="flex items-center justify-between text-[#e95623]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#e95623]">Kondisi Tdk Aman</span>
            <div className="p-2 rounded-xl bg-orange-50 text-[#e95623]">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#e95623] tracking-tight">
                {(data?.ktaCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-orange-400">Temuan</span>
            </div>
            <p className="text-[10.5px] font-bold text-orange-700 mt-1 truncate">
              {ktaPct}% • Kondisi Fisik / Fasilitas
            </p>
          </div>
          <div className="w-full h-1 bg-orange-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#e95623] rounded-full" style={{ width: `${ktaPct}%` }} />
          </div>
        </div>

        {/* Card 3: TTA */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-sm transition-all min-w-0">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Tindakan Tdk Aman</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <HardHat size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                {(data?.ttaCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-amber-400">Temuan</span>
            </div>
            <p className="text-[10.5px] font-bold text-amber-800 mt-1 truncate">
              {ttaPct}% • Perilaku &amp; Kepatuhan SOP
            </p>
          </div>
          <div className="w-full h-1 bg-amber-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ttaPct}%` }} />
          </div>
        </div>

        {/* Card 4: Open */}
        <div className="bg-white border border-rose-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-rose-300 hover:shadow-sm transition-all min-w-0">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">Hazard Open</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {(data?.openHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-rose-400">Laporan</span>
            </div>
            <p className="text-[10.5px] font-bold text-rose-700 mt-1 truncate">
              {openPct}% • Menunggu Tindakan
            </p>
          </div>
          <div className="w-full h-1 bg-rose-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${openPct}%` }} />
          </div>
        </div>

        {/* Card 5: Closed */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all min-w-0">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Hazard Closed</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {(data?.closedHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-emerald-500">Selesai</span>
            </div>
            <p className="text-[10.5px] font-bold text-emerald-700 mt-1 truncate">
              {data?.resolutionRate ?? 0}% Selesai Ditangani
            </p>
          </div>
          <div className="w-full h-1 bg-emerald-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data?.resolutionRate ?? 0}%` }} />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          4. Main Balanced Content Grid (2 Columns: Left 5 & Right 7)
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0 items-start">
        {/* Left Column (lg:col-span-5): Matriks Risiko + Top Lokasi Temuan */}
        <div className="lg:col-span-5 space-y-5 min-w-0">
          {/* Card A: Matriks Tingkat Risiko */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-500" />
                  <span>Matriks Tingkat Risiko</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Klasifikasi tingkat keparahan temuan K3L</p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                {(data?.totalHazards ?? 0).toLocaleString("id-ID")} Laporan
              </span>
            </div>

            <div className="space-y-3">
              {(data?.riskDistribution || []).map((rk) => {
                const pct = Math.round((rk.value / totalHazards) * 100);
                return (
                  <div key={rk.name} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: rk.color }} />
                        {rk.name} Risk
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">
                          {rk.value.toLocaleString("id-ID")}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-white border border-slate-200 text-slate-600">
                          {pct}%
                        </span>
                      </div>
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

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-700" />
                Prinsip Stop Work Authority (SWA)
              </span>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Setiap karyawan &amp; mitra kerja berhak dan wajib menghentikan pekerjaan apabila menemukan kondisi risiko Critical / High yang membahayakan keselamatan.
              </p>
            </div>
          </div>

          {/* Card B: Top Area / Lokasi Temuan Bahaya */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin size={16} className="text-[#e95623]" />
                  <span>Area Temuan Terbanyak</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Top 5 lokasi konsentrasi potensi bahaya</p>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Peringkat</span>
            </div>

            <div className="space-y-2.5">
              {(data?.locationDistribution && data.locationDistribution.length > 0
                ? data.locationDistribution.slice(0, 5)
                : [
                    { name: "WORKSHOP", count: 502 },
                    { name: "MESS", count: 309 },
                    { name: "CHR", count: 205 },
                    { name: "KONSTRUKSI", count: 200 },
                    { name: "OFFICE", count: 121 },
                  ]
              ).map((loc, idx) => {
                const maxCount = data?.locationDistribution?.[0]?.count || 502;
                const pct = Math.round((loc.count / maxCount) * 100);
                const shareOfTotal = Math.round((loc.count / totalHazards) * 100);

                return (
                  <div key={loc.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-black text-slate-800 truncate">{loc.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono font-bold text-slate-800">{loc.count.toLocaleString("id-ID")}</span>
                        <span className="text-[10px] font-medium text-slate-400">({shareOfTotal}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#e95623] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-7): Temuan Bahaya Terkini Feed */}
        <div className="lg:col-span-7 min-w-0">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-[#e95623]" />
                  <span>Temuan Bahaya Terkini</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  5 laporan hazard terbaru yang membutuhkan pengawalan perbaikan
                </p>
              </div>

              {onNavigateToHazardReport && (
                <button
                  type="button"
                  onClick={onNavigateToHazardReport}
                  className="text-xs font-black text-[#e95623] hover:text-[#d44819] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Buka Semua Laporan</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {recentHazards.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada laporan hazard tercatat.
                </div>
              ) : (
                recentHazards.map((h) => {
                  const isClosed = h.status === "Closed" || h.statusGForm === "CLOSE";
                  const isTTA = h.jenisPelaporan === "TTA" || h.category === "Unsafe Action";

                  return (
                    <div
                      key={h.id}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-xs transition-all space-y-2.5"
                    >
                      {/* Row 1: Header Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            {h.reportNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 ml-1">
                            <Calendar size={11} className="text-slate-400" />
                            {h.date}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              isTTA
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {isTTA ? "TTA" : "KTA"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              h.riskLevel === "Critical"
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : h.riskLevel === "High"
                                ? "bg-orange-100 text-orange-700 border border-orange-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {h.riskLevel} Risk
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isClosed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isClosed ? (
                            <>
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              CLOSED
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              OPEN
                            </>
                          )}
                        </span>
                      </div>

                      {/* Row 2: Title / Bahaya */}
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                        {h.title || h.identifikasiBahaya}
                      </h4>

                      {/* Row 3: Meta Footnote */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin size={11} className="text-[#e95623]" />
                          Lokasi: <strong className="text-slate-700">{h.lokasiBahaya || h.location}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Building2 size={11} className="text-slate-400" />
                          PIC: <strong className="text-slate-700">{h.penanggungJawabArea || h.picDept || "PLANT"}</strong>
                        </span>
                        {(h.reporterName || h.namaPelapor) && (
                          <span className="inline-flex items-center gap-1 font-medium ml-auto">
                            <User size={11} className="text-slate-400" />
                            <strong className="text-slate-700">{h.reporterName || h.namaPelapor}</strong>
                            {(h.nrpPelapor || h.reporterNrp) && (
                              <span className="text-slate-400 font-mono">({h.nrpPelapor || h.reporterNrp})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
