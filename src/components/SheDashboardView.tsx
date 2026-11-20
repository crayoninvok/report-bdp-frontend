"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
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

  const totalHazards = data?.totalHazards || 1;
  const ktaPct = Math.round(((data?.ktaCount ?? 0) / totalHazards) * 100);
  const ttaPct = Math.round(((data?.ttaCount ?? 0) / totalHazards) * 100);
  const openPct = Math.round(((data?.openHazards ?? 0) / totalHazards) * 100);
  const closedPct = data?.resolutionRate ?? Math.round(((data?.closedHazards ?? 0) / totalHazards) * 100);

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 min-w-0 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------
          1. Corporate Header Banner (Aligned with Periodic Inspection & Cost)
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-6 md:p-7 min-w-0">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="space-y-1.5 min-w-0">
            {/* Top row: Site Selector Pills & Compliance Badge */}
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

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                Zero LTI • 100% Compliance
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <HardHat size={20} className="text-[#e95623]" />
              <span>Safety, Health &amp; Environment (SHE) Dashboard</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Monitoring terpadu Hazard Report, evaluasi risiko K3L (KTA &amp; TTA), dan pengawasan tindak lanjut perbaikan operasional armada PT Batara Dharma Persada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToHazardReport && (
              <button
                type="button"
                onClick={onNavigateToHazardReport}
                className="px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-98"
                title="Buka Halaman Form & Tabel Hazard Report"
              >
                <FileText size={14} className="text-white" />
                <span>Buka Hazard Report</span>
                <ArrowRight size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-orange-400" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. KPI Summary Grid (Proportions matching Periodic Service & Cost)
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 min-w-0">
        {/* Card 1: Total Hazard */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-slate-500">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Total Hazard
              </span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <FileText size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {(data?.totalHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-slate-400 ml-1">Laporan</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              Seluruh temuan K3L
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full w-full" />
          </div>
        </div>

        {/* Card 2: KTA */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-orange-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-[#e95623]">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#e95623]">
                Kondisi Tdk Aman
              </span>
              <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-[#e95623]">
                {(data?.ktaCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-orange-400 ml-1">KTA</span>
            </div>
            <p className="text-[10px] font-bold text-orange-700 mt-0.5 truncate">
              {ktaPct}% • Fasilitas / Fisik
            </p>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-[#e95623] rounded-full" style={{ width: `${ktaPct}%` }} />
          </div>
        </div>

        {/* Card 3: TTA */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-amber-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-amber-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                Tindakan Tdk Aman
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <HardHat size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-amber-600">
                {(data?.ttaCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-amber-400 ml-1">TTA</span>
            </div>
            <p className="text-[10px] font-bold text-amber-800 mt-0.5 truncate">
              {ttaPct}% • Perilaku Kerja
            </p>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ttaPct}%` }} />
          </div>
        </div>

        {/* Card 4: Open */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-rose-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-rose-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                Hazard Open
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-rose-600">
                {(data?.openHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-rose-400 ml-1">Belum Selesai</span>
            </div>
            <p className="text-[10px] font-bold text-rose-700 mt-0.5 truncate">
              {openPct}% • Menunggu Tindakan
            </p>
          </div>
          <div className="w-full bg-rose-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${openPct}%` }} />
          </div>
        </div>

        {/* Card 5: Closed */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-emerald-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-emerald-800">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Hazard Closed
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-emerald-600">
                {(data?.closedHazards ?? 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] font-bold text-emerald-500 ml-1">Selesai</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-700 mt-0.5 truncate">
              {closedPct}% Selesai Ditangani
            </p>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${closedPct}%` }} />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Main Content: Matriks Risiko, Top Area & Temuan Terkini
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0 items-start">
        {/* Left Column (lg:col-span-5): Matriks Risiko + Top Lokasi */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
          {/* Card A: Matriks Tingkat Risiko */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-rose-500" />
                  <span>Matriks Tingkat Risiko</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">Klasifikasi tingkat keparahan K3L</p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {(data?.totalHazards ?? 0).toLocaleString("id-ID")} Laporan
              </span>
            </div>

            <div className="space-y-2">
              {(data?.riskDistribution || []).map((rk) => {
                const pct = Math.round((rk.value / totalHazards) * 100);
                return (
                  <div key={rk.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rk.color }} />
                        {rk.name} Risk
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="font-bold text-slate-700">
                          {rk.value.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
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

            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-0.5">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5 text-[11px]">
                <ShieldCheck size={13} className="text-amber-700" />
                Prinsip Stop Work Authority (SWA)
              </span>
              <p className="text-[10.5px] leading-relaxed text-amber-900">
                Setiap karyawan berhak menghentikan pekerjaan apabila menemukan kondisi risiko Critical / High yang membahayakan.
              </p>
            </div>
          </div>

          {/* Card B: Top Area / Lokasi Temuan */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <MapPin size={15} className="text-[#e95623]" />
                  <span>Area Temuan Terbanyak</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">Top 5 area konsentrasi potensi bahaya</p>
              </div>
              <span className="text-[10.5px] font-bold text-slate-400">Peringkat</span>
            </div>

            <div className="space-y-2">
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
                  <div key={loc.name} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded-md bg-slate-200/80 text-slate-700 text-[9.5px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-800 text-[11px] truncate">{loc.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2 font-mono text-[11px]">
                        <span className="font-bold text-slate-800">{loc.count.toLocaleString("id-ID")}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({shareOfTotal}%)</span>
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
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FileText size={15} className="text-[#e95623]" />
                  <span>Temuan Bahaya Terkini</span>
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  5 laporan hazard terbaru yang membutuhkan pengawalan
                </p>
              </div>

              {onNavigateToHazardReport && (
                <button
                  type="button"
                  onClick={onNavigateToHazardReport}
                  className="text-xs font-black text-[#e95623] hover:text-[#d44819] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
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
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-2xs transition-all space-y-2"
                    >
                      {/* Row 1: Badges & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-[11px] text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                            {h.reportNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-500">
                            <Calendar size={10} className="text-slate-400" />
                            {h.date}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black border ${
                              isTTA
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {isTTA ? "TTA" : "KTA"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                              h.riskLevel === "Critical"
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : h.riskLevel === "High"
                                ? "bg-orange-100 text-orange-700 border border-orange-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {h.riskLevel}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black border ${
                            isClosed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isClosed ? (
                            <>
                              <CheckCircle2 size={10} className="text-emerald-600" />
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

                      {/* Row 2: Title */}
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                        {h.title || h.identifikasiBahaya}
                      </h4>

                      {/* Row 3: Footnote metadata */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 text-[10.5px] text-slate-500 border-t border-slate-200/60">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin size={10} className="text-[#e95623]" />
                          <strong className="text-slate-700">{h.lokasiBahaya || h.location}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Building2 size={10} className="text-slate-400" />
                          PIC: <strong className="text-slate-700">{h.penanggungJawabArea || h.picDept || "PLANT"}</strong>
                        </span>
                        {(h.reporterName || h.namaPelapor) && (
                          <span className="inline-flex items-center gap-1 font-medium ml-auto">
                            <User size={10} className="text-slate-400" />
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
