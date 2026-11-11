"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Clock,
  DollarSign,
  Fuel,
  Gauge,
  History,
  Radio,
  RefreshCw,
  Search,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { PmRadarResponse, PmRadarUnit } from "../services/plantService";
import {
  formatHm,
  formatKm,
  formatRupiah,
  getPmReadinessStyle,
} from "../utils/pmHelpers";

interface PreventiveMaintenanceRadarTabProps {
  radarData: PmRadarUnit[];
  radarSummary: PmRadarResponse["summary"] | null;
  telemetryMeta?: PmRadarResponse["telemetryMeta"] | null;
  isLoading: boolean;
  onRefreshForce: () => void;
  onQuickScheduleUnit: (unit: PmRadarUnit) => void;
}

type RadarFilterType = "ALL" | "Overdue" | "Due Soon" | "Safe" | "Scheduled";
type RadarSortType = "urgency" | "cost" | "unit";

/** Calculates 0-100% progress inside the current 12,000 KM service cycle. */
function computeCycleProgressPct(liveKm: number | null, targetKm: number | null): number {
  if (!liveKm || !targetKm || targetKm <= 0) return 0;
  const remaining = targetKm - liveKm;
  if (remaining <= 0) return 100;
  const cycleSize = 12000;
  const pct = Math.round(((cycleSize - Math.min(remaining, cycleSize)) / cycleSize) * 100);
  return Math.max(0, Math.min(100, pct));
}

export const PreventiveMaintenanceRadarTab: React.FC<
  PreventiveMaintenanceRadarTabProps
> = ({
  radarData,
  radarSummary,
  telemetryMeta,
  isLoading,
  onRefreshForce,
  onQuickScheduleUnit,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RadarFilterType>("ALL");
  const [sortBy, setSortBy] = useState<RadarSortType>("urgency");
  const [selectedGlUnit, setSelectedGlUnit] = useState<PmRadarUnit | null>(null);
  const [glModalSearch, setGlModalSearch] = useState("");

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = radarData.filter((u) => {
      if (statusFilter === "Scheduled" && !u.activeSchedule) return false;
      if (
        statusFilter !== "ALL" &&
        statusFilter !== "Scheduled" &&
        u.readinessStatus !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        u.unitCode.toLowerCase().includes(q) ||
        (u.buntutSummary || "").toLowerCase().includes(q) ||
        (u.model || "").toLowerCase().includes(q) ||
        (u.vin || "").toLowerCase().includes(q) ||
        (u.glSummary.lastServiceRemark || "").toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "cost") {
        return (b.glSummary?.totalCost || 0) - (a.glSummary?.totalCost || 0);
      }
      if (sortBy === "unit") {
        return a.unitNumber - b.unitNumber;
      }
      // Urgency: Overdue -> Due Soon -> Safe -> No Telemetry, then smallest remainingKm
      const rankMap: Record<string, number> = {
        Overdue: 0,
        "Due Soon": 1,
        Safe: 2,
        "No Telemetry": 3,
      };
      const ra = rankMap[a.readinessStatus] ?? 4;
      const rb = rankMap[b.readinessStatus] ?? 4;
      if (ra !== rb) return ra - rb;
      const remA = a.remainingKm ?? Number.MAX_SAFE_INTEGER;
      const remB = b.remainingKm ?? Number.MAX_SAFE_INTEGER;
      return remA - remB;
    });
  }, [radarData, searchQuery, statusFilter, sortBy]);

  const filteredGlTransactions = useMemo(() => {
    if (!selectedGlUnit) return [];
    const q = glModalSearch.trim().toLowerCase();
    if (!q) return selectedGlUnit.glHistory;
    return selectedGlUnit.glHistory.filter(
      (tx) =>
        tx.accountName.toLowerCase().includes(q) ||
        tx.specification.toLowerCase().includes(q) ||
        tx.remark.toLowerCase().includes(q) ||
        (tx.regNo || "").toLowerCase().includes(q)
    );
  }, [selectedGlUnit, glModalSearch]);

  return (
    <div className="space-y-4">
      {/* 5 Executive Radar & GL Cost KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-rose-600 uppercase tracking-wider">
            <span>Overdue Interval</span>
            <AlertTriangle size={15} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700 font-mono">
              {radarSummary?.overdueCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Unit Lewat Batas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Melebihi target KM/HM service berikutnya
          </p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider">
            <span>Due Soon Radar</span>
            <Clock size={15} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 font-mono">
              {radarSummary?.dueSoonCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Unit Mendekati</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sisa &le; 1.500 km atau &le; 25 hm lagi
          </p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <span>Armada Aman</span>
            <CheckCircle2 size={15} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {radarSummary?.safeCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Unit Safe</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Telemetry online: {radarSummary?.onlineTelemetry ?? 0} /{" "}
            {radarSummary?.activeUnits ?? 0} unit
          </p>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase tracking-wider">
            <span>Sudah Terjadwal</span>
            <CalendarPlus size={15} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 font-mono">
              {radarSummary?.scheduledCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Unit On-Plan</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Terhubung langsung dengan kalender PM
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>Biaya PM &amp; Part (GL)</span>
            <DollarSign size={15} className="text-[#e95623]" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-slate-900 font-mono block truncate">
              {formatRupiah(radarSummary?.totalGlPmCost ?? 0)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Oli, Grease, Sparepart &amp; Jasa Eksternal
          </p>
        </div>
      </div>

      {/* Filter & Volvo Sync Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-64">
          <div className="relative flex-1 min-w-56 max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari unit, buntut, VIN, remark GL..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623] text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "ALL", label: "Semua" },
                { id: "Overdue", label: "Overdue" },
                { id: "Due Soon", label: "Due Soon" },
                { id: "Safe", label: "Aman" },
                { id: "Scheduled", label: "Terjadwal" },
              ] as Array<{ id: RadarFilterType; label: string }>
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === pill.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as RadarSortType)}
            className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#e95623]"
          >
            <option value="urgency">Urut: Prioritas Service Terdekat</option>
            <option value="cost">Urut: Biaya GL Tertinggi</option>
            <option value="unit">Urut: Nomor Unit</option>
          </select>

          <button
            type="button"
            onClick={onRefreshForce}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-[#e95623] border border-orange-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Sync Live Volvo</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metadata Strip */}
      {telemetryMeta && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-emerald-600 animate-pulse" />
            <span>
              <strong>Volvo Connect Live Telemetry:</strong>{" "}
              {telemetryMeta.onlineCount} unit merespons real-time odometer &amp; engine hours
            </span>
          </div>
          <span className="font-mono text-slate-500">
            Update terakhir:{" "}
            {telemetryMeta.fetchedAt
              ? new Date(telemetryMeta.fetchedAt).toLocaleString("id-ID")
              : "-"}
          </span>
        </div>
      )}

      {/* Main Radar Fleet Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3 px-4">Unit Head &amp; Buntut</th>
                <th className="py-3 px-4">Live Volvo KM / HM</th>
                <th className="py-3 px-4">Target &amp; Sisa Interval</th>
                <th className="py-3 px-4">Kesiapan &amp; Jadwal</th>
                <th className="py-3 px-4">Riwayat Biaya GL PM</th>
                <th className="py-3 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {isLoading
                      ? "Memuat data telemetry Volvo & GL..."
                      : "Tidak ada unit yang sesuai dengan filter saat ini."}
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const readinessStyle = getPmReadinessStyle(unit.readinessStatus);
                  const cyclePct = computeCycleProgressPct(unit.liveKm, unit.targetKm);

                  return (
                    <tr
                      key={unit.unitCode}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Unit & Buntut */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
                            <Truck size={15} />
                          </div>
                          <div>
                            <div className="font-mono font-black text-sm text-slate-900">
                              {unit.unitCode}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 font-mono">
                              {unit.buntutSummary || "-"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {unit.model} {unit.vin ? `• ${unit.vin.slice(-6)}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Volvo Live KM & HM */}
                      <td className="py-3 px-4 align-top">
                        {unit.hasTelemetry ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                              <Gauge size={13} className="text-[#e95623]" />
                              <span>{formatKm(unit.liveKm)}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-600">
                              HM: <strong>{formatHm(unit.liveHm)}</strong>
                            </div>
                            {unit.fuelLevel != null && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Fuel size={11} className="text-sky-600" />
                                <span>Solar {unit.fuelLevel}%</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                            Telemetry Offline
                          </span>
                        )}
                      </td>

                      {/* Target & Sisa Countdown */}
                      <td className="py-3 px-4 align-top min-w-52">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                            {unit.recommendedServiceType}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {cyclePct}% cycle
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              unit.readinessStatus === "Overdue"
                                ? "bg-rose-500"
                                : unit.readinessStatus === "Due Soon"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${cyclePct}%` }}
                          />
                        </div>

                        <div className="mt-1.5 space-y-0.5 text-[11px] font-mono">
                          <div className="text-slate-700">
                            Sisa KM:{" "}
                            <strong
                              className={
                                unit.remainingKm != null && unit.remainingKm <= 1500
                                  ? "text-amber-700"
                                  : "text-slate-900"
                              }
                            >
                              {unit.remainingKm != null
                                ? `${unit.remainingKm.toLocaleString("id-ID")} km`
                                : "-"}
                            </strong>{" "}
                            <span className="text-slate-400">
                              (Target {unit.targetKm ? unit.targetKm.toLocaleString("id-ID") : "-"})
                            </span>
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            Sisa HM:{" "}
                            <strong>
                              {unit.remainingHm != null
                                ? `${unit.remainingHm.toLocaleString("id-ID")} hm`
                                : "-"}
                            </strong>{" "}
                            (Target {unit.targetHm ? unit.targetHm.toLocaleString("id-ID") : "-"})
                          </div>
                        </div>
                      </td>

                      {/* Readiness & Schedule Status */}
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${readinessStyle.badge}`}
                        >
                          {readinessStyle.label}
                        </span>

                        {unit.activeSchedule && (
                          <div className="mt-1.5 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-800">
                            Plan: {unit.activeSchedule.date} • {unit.activeSchedule.status}
                          </div>
                        )}

                        {unit.lastCompletedPm && (
                          <div className="mt-1 text-[10px] text-slate-500">
                            Last PM: {unit.lastCompletedPm.date} ({unit.lastCompletedPm.serviceType})
                          </div>
                        )}
                      </td>

                      {/* GL Summary */}
                      <td className="py-3 px-4 align-top min-w-52">
                        <div className="font-mono font-black text-slate-900">
                          {formatRupiah(unit.glSummary.totalCost)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Oli {formatRupiah(unit.glSummary.oilCost)} • Grease{" "}
                          {formatRupiah(unit.glSummary.greaseCost)}
                        </div>
                        {unit.glSummary.txCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGlUnit(unit);
                              setGlModalSearch("");
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#e95623] hover:text-[#c74315] cursor-pointer"
                          >
                            <History size={12} />
                            <span>Lihat {unit.glSummary.txCount} Transaksi GL</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Belum ada transaksi PM di GL
                          </span>
                        )}
                      </td>

                      {/* Quick Schedule Action */}
                      <td className="py-3 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onQuickScheduleUnit(unit)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#e95623] hover:bg-[#d44818] text-white shadow-xs transition-all cursor-pointer"
                        >
                          <CalendarPlus size={13} />
                          <span>Jadwalkan PM</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail GL Maintenance History */}
      {selectedGlUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10">
                  <Wrench size={18} className="text-[#e95623]" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    Riwayat GL Maintenance &amp; Sparepart • {selectedGlUnit.unitCode}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Buntut: {selectedGlUnit.buntutSummary || "-"} • Live:{" "}
                    {formatKm(selectedGlUnit.liveKm)} / {formatHm(selectedGlUnit.liveHm)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGlUnit(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 4 Cost Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Beban Oli (05110204)
                </span>
                <div className="text-sm font-black font-mono text-slate-900 mt-1">
                  {formatRupiah(selectedGlUnit.glSummary.oilCost)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Beban Grease (05110205)
                </span>
                <div className="text-sm font-black font-mono text-slate-900 mt-1">
                  {formatRupiah(selectedGlUnit.glSummary.greaseCost)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Beban Sparepart (05110301)
                </span>
                <div className="text-sm font-black font-mono text-slate-900 mt-1">
                  {formatRupiah(selectedGlUnit.glSummary.sparepartCost)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  External Service (05110305)
                </span>
                <div className="text-sm font-black font-mono text-slate-900 mt-1">
                  {formatRupiah(selectedGlUnit.glSummary.externalCost)}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={glModalSearch}
                  onChange={(e) => setGlModalSearch(e.target.value)}
                  placeholder="Filter nama part, akun, atau remark..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
                />
              </div>
              <span className="text-xs font-bold text-slate-500">
                Menampilkan {filteredGlTransactions.length} transaksi
              </span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Akun Beban</th>
                    <th className="py-2 px-3">Material / Spesifikasi</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-3">Remark / Pekerjaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGlTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono whitespace-nowrap text-slate-700">
                        <div>{tx.date}</div>
                        {tx.regNo && (
                          <div className="text-[10px] text-slate-400">{tx.regNo}</div>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {tx.accountName}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {tx.specification}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{tx.qty}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(tx.debet)}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {tx.isScheduledPm && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">
                              Scheduled PM
                            </span>
                          )}
                          <span>{tx.remark || "-"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

