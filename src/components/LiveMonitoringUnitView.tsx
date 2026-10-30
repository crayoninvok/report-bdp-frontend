"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { User } from "../types/auth";
import { volvoService, VolvoUnit, VolvoSummary } from "../services/volvoService";
import { useNotification } from "../context/NotificationContext";
import {
  Truck,
  Activity,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  Compass,
  Gauge,
  Clock,
  Layers,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Radio,
} from "lucide-react";

// Dynamically import VolvoMap with SSR disabled to guarantee Leaflet works cleanly in Next.js App Router
const VolvoMap = dynamic(() => import("./VolvoMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-150 flex flex-col items-center justify-center bg-slate-900/5 rounded-3xl border border-slate-200 gap-3">
      <RefreshCw className="animate-spin text-[#e95623]" size={32} />
      <span className="text-xs font-extrabold text-slate-600">
        Menyiapkan Peta Satelit Interaktif Armada Volvo...
      </span>
    </div>
  ),
});

interface LiveMonitoringUnitViewProps {
  user: User;
  onNavigateToAssetFindr?: () => void;
}

export const LiveMonitoringUnitView: React.FC<LiveMonitoringUnitViewProps> = ({
  user,
  onNavigateToAssetFindr,
}) => {
  const { showError, showSuccess } = useNotification();

  // Data States
  const [units, setUnits] = useState<VolvoUnit[]>([]);
  const [summary, setSummary] = useState<VolvoSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Map & Interaction States
  const [selectedUnit, setSelectedUnit] = useState<VolvoUnit | null>(null);
  const [mapLayer, setMapLayer] = useState<"satellite" | "streets" | "dark">("satellite");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "moving" | "idle">("all");

  // Auto-refresh interval (in seconds: 15, 30, 60, or 0 for off)
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  // Load Volvo Units Data
  const loadUnitsData = useCallback(
    async (isBackground = false, force = false) => {
      try {
        if (!isBackground) setIsLoading(true);
        else setIsRefreshing(true);

        const res = await volvoService.getLiveMonitoring(force);
        setUnits(res.data || []);
        setSummary(res.summary || null);
        setLastUpdated(new Date());

        // Keep selected unit synchronized
        if (selectedUnit) {
          const updated = res.data.find((u) => u.vin === selectedUnit.vin);
          if (updated) setSelectedUnit(updated);
        }
      } catch (err: any) {
        console.error("Gagal memuat data Volvo Live Monitoring:", err);
        if (!isBackground) {
          showError(err.message || "Gagal menghubungi API Volvo Trucks Telematics");
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedUnit, showError]
  );

  // Initial load
  useEffect(() => {
    loadUnitsData();
  }, [loadUnitsData]);

  // Auto-refresh countdown & trigger
  useEffect(() => {
    if (refreshInterval <= 0) return;

    setSecondsRemaining(refreshInterval);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          loadUnitsData(true, true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, loadUnitsData]);

  // Filtered Units List
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchSearch =
        u.pmNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.customerVehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "moving" && u.isMoving) ||
        (statusFilter === "idle" && !u.isMoving);

      return matchSearch && matchStatus;
    });
  }, [units, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-orange-100/50 via-emerald-50/30 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
                <Truck size={11} />
                Volvo Trucks Telematics
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Monitoring GPS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                Coal Hauling Fleet
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Live Monitoring Unit Volvo
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Pemantauan posisi armada truk Volvo (PM Unit) secara real-time via telematics GNSS GPS, mendeteksi pergerakan hauling batubara, kecepatan operasional, dan arah unit.
            </p>
          </div>

          {/* Action & Auto Refresh Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Auto refresh dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <Clock size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500 font-bold">Auto-refresh:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value={15}>15 dtk</option>
                <option value={30}>30 dtk</option>
                <option value={60}>60 dtk</option>
                <option value={0}>Manual</option>
              </select>
              {refreshInterval > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  {secondsRemaining}s
                </span>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadUnitsData(false, true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              <RefreshCw size={13} className={isLoading || isRefreshing ? "animate-spin" : ""} />
              <span>Refresh Sekarang</span>
            </button>
          </div>
        </div>

        {/* Last updated footer note */}
        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Terakhir diperbarui:{" "}
              <strong className="text-slate-700 font-mono">
                {lastUpdated.toLocaleTimeString("id-ID")} WITA
              </strong>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API Volvo Trucks Terhubung
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards: Total Units, Moving, Idle, Avg Speed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Units */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Truck size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Total Armada
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Total Unit Terpantau
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary?.totalUnits ?? units.length}{" "}
              <span className="text-sm font-bold text-slate-500">Unit</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Model Armada:</span>
            <strong className="text-slate-900 font-extrabold">Volvo FH (4)</strong>
          </div>
        </div>

        {/* Card 2: Moving Units */}
        <div className="bg-linear-to-br from-emerald-50/70 via-emerald-50/30 to-white rounded-3xl p-5 border border-emerald-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
              <Activity size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Aktif Bergerak
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-black text-emerald-800 block uppercase tracking-wider">
              Unit Bergerak (&gt;1.5 km/h)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
              {summary?.movingUnits ?? units.filter((u) => u.isMoving).length}{" "}
              <span className="text-sm font-bold text-emerald-700">Unit</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-200/50 flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>Rasio Bergerak:</span>
            <strong className="font-extrabold">
              {units.length > 0
                ? Math.round(
                    ((summary?.movingUnits ?? units.filter((u) => u.isMoving).length) /
                      units.length) *
                      100
                  )
                : 0}
              % Armada
            </strong>
          </div>
        </div>

        {/* Card 3: Idle / Stopped Units */}
        <div className="bg-linear-to-br from-amber-50/70 via-orange-50/30 to-white rounded-3xl p-5 border border-amber-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20">
              <MapPin size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              Standby / Parkir
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-black text-amber-800 block uppercase tracking-wider">
              Unit Berhenti / Idle
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
              {summary?.idleUnits ?? units.filter((u) => !u.isMoving).length}{" "}
              <span className="text-sm font-bold text-amber-700">Unit</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Status:</span>
            <strong className="font-extrabold">Parkir / Antrian Jembatan Timbang</strong>
          </div>
        </div>

        {/* Card 4: Average Speed */}
        <div className="bg-linear-to-br from-sky-50/70 via-slate-50/40 to-white rounded-3xl p-5 border border-sky-200/80 shadow-xs relative overflow-hidden group hover:border-sky-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs shadow-sky-500/20">
              <Gauge size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
              Hauling Speed
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-black text-sky-800 block uppercase tracking-wider">
              Kecepatan Rata-rata Unit Bergerak
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary?.averageMovingSpeed ?? 0}{" "}
              <span className="text-sm font-bold text-slate-500">km/h</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-sky-200/50 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Batas Kecepatan Hauling:</span>
            <strong className="font-extrabold text-slate-900">60 km/h (Maks)</strong>
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Unit Drawer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Leaflet Interactive Map (8 cols on lg) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col space-y-3">
          <div className="h-155 w-full">
            <VolvoMap
              units={filteredUnits}
              selectedUnit={selectedUnit}
              onSelectUnit={(unit) => setSelectedUnit(unit)}
              mapLayer={mapLayer}
              onLayerChange={(layer) => setMapLayer(layer)}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>
              Menampilkan <strong>{filteredUnits.length}</strong> dari <strong>{units.length}</strong> unit Volvo
            </span>
            <span>
              Klik salah satu penanda pada peta atau daftar unit untuk melihat rincian lengkap & lokasi Google Maps
            </span>
          </div>
        </div>

        {/* Right Side: Unit Search & List Panel (4 cols on lg) */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Radio size={16} className="text-[#e95623]" />
                Daftar Armada Volvo
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                {filteredUnits.length} Unit
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih unit untuk auto-center pada peta satelit
            </p>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari PM Unit (e.g. PM 439) atau VIN..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all font-medium"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-extrabold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Semua ({units.length})
            </button>
            <button
              onClick={() => setStatusFilter("moving")}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "moving"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Bergerak ({units.filter((u) => u.isMoving).length})
            </button>
            <button
              onClick={() => setStatusFilter("idle")}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "idle"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Berhenti ({units.filter((u) => !u.isMoving).length})
            </button>
          </div>

          {/* Scrollable Units List */}
          <div className="h-110 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {filteredUnits.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Tidak ada unit yang cocok dengan filter.
              </div>
            ) : (
              filteredUnits.map((unit) => {
                const isSelected = selectedUnit?.vin === unit.vin;
                const isMoving = unit.isMoving;

                return (
                  <div
                    key={unit.vin}
                    onClick={() => setSelectedUnit(unit)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-orange-50/70 border-orange-300 ring-2 ring-orange-400/30 shadow-xs"
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900 block">
                            {unit.pmNumber}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isMoving ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {unit.chassisNumber || unit.vin}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-black block ${
                            isMoving ? "text-emerald-700" : "text-slate-600"
                          }`}
                        >
                          {unit.speed} km/h
                        </span>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          {isMoving ? "Bergerak" : "Berhenti"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        Heading: <strong className="text-slate-700 font-mono">{unit.heading}&deg;</strong>
                      </span>
                      <span>
                        Alt: <strong className="text-slate-700 font-mono">{unit.altitude}m</strong>
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {unit.positionDateTime ? new Date(unit.positionDateTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
