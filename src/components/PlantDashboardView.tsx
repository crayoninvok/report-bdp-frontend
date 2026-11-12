"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { User } from "../types/auth";
import {
  PlantDashboardData,
  PlantGlScope,
  PlantPmPeriodMode,
  plantService,
} from "../services/plantService";
import { PlantDashboardGlSection } from "./PlantDashboardGlSection";
import { PlantDashboardPmSection } from "./PlantDashboardPmSection";

interface PlantDashboardViewProps {
  user?: User | null;
}

export const PlantDashboardView: React.FC<PlantDashboardViewProps> = () => {
  const [site, setSite] = useState<string>("ALL");
  const [glScope, setGlScope] = useState<PlantGlScope>("all_plant");
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [pmPeriod, setPmPeriod] = useState<PlantPmPeriodMode>("mtd");

  const [data, setData] = useState<PlantDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await plantService.getPlantDashboard({
        site,
        glScope,
        month: selectedMonth,
        pmPeriod,
      });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError("Gagal memuat data Dashboard Plant.");
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memuat Dashboard Plant.");
    } finally {
      setLoading(false);
    }
  }, [site, glScope, selectedMonth, pmPeriod]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Banner & Global Controls */}
      <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-[11px] font-bold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              Plant &amp; Maintenance Analytics
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Dashboard Plant
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Ringkasan visual biaya General Ledger Departemen Plant (YTD &amp; MTD) serta performa
              Preventive Maintenance (Periodic Inspection &amp; Periodic Service).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Site Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-orange-300 shrink-0" />
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                aria-label="Filter Job Site"
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="text-slate-900">
                  Semua Site (MPH &amp; SNY)
                </option>
                <option value="MuaraPahu" className="text-slate-900">
                  Muara Pahu
                </option>
                <option value="Senyiur" className="text-slate-900">
                  Senyiur
                </option>
              </select>
            </div>

            {/* GL Scope Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
              <Layers className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <select
                value={glScope}
                onChange={(e) => setGlScope(e.target.value as PlantGlScope)}
                aria-label="Scope Akun GL Plant"
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="all_plant" className="text-slate-900">
                  Semua Akun Plant (R&amp;M + Tyre/Oli/Grease)
                </option>
                <option value="rm_only" className="text-slate-900">
                  Hanya Repairs &amp; Maintenance
                </option>
                <option value="tyre_oli_grease" className="text-slate-900">
                  Hanya Tyre, Oli &amp; Grease
                </option>
              </select>
            </div>

            {/* MTD Month Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <select
                value={selectedMonth ?? data?.filters.month ?? ""}
                onChange={(e) =>
                  setSelectedMonth(e.target.value ? Number(e.target.value) : undefined)
                }
                aria-label="Periode Bulan MTD GL"
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {(data?.filters.availableMonths || []).map((m) => (
                  <option key={m.month} value={m.month} className="text-slate-900">
                    MTD {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d54918] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Muat Ulang
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton on initial load */}
      {loading && !data && (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-36 rounded-2xl bg-slate-200/70" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-80 rounded-2xl bg-slate-200/70" />
            <div className="h-80 rounded-2xl bg-slate-200/70" />
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-sm font-bold">Gagal Memuat Dashboard Plant</div>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Main Dashboard Sections (Charts & Visual Highlight Cards Only) */}
      {data && (
        <div className={`space-y-8 transition-opacity ${loading ? "opacity-75" : "opacity-100"}`}>
          <PlantDashboardGlSection data={data} />
          <PlantDashboardPmSection
            pm={data.pm}
            pmPeriod={pmPeriod}
            pmRange={data.filters.pmRange}
            onChangePmPeriod={setPmPeriod}
          />
        </div>
      )}
    </div>
  );
};
