"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  assetfindrService,
  WeighBridgeTicket,
} from "../services/assetfindrService";
import { AssetFindrTokenModal } from "./AssetFindrTokenModal";
import { useNotification } from "../context/NotificationContext";
import {
  Scale,
  Truck,
  Layers,
  Gauge,
  Calendar,
  Filter,
  RefreshCw,
  Key,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  ShieldCheck,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

interface AssetFindrDashboardViewProps {
  user: User;
  onNavigateToData?: () => void;
}

const COLORS = [
  "#e95623",
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export const AssetFindrDashboardView: React.FC<AssetFindrDashboardViewProps> = ({
  user,
  onNavigateToData,
}) => {
  const { showSuccess, showError } = useNotification();
  const [tickets, setTickets] = useState<WeighBridgeTicket[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

  // Filters
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7days" | "30days">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const hasToken = typeof window !== "undefined" && !!assetfindrService.getStoredToken();

  // Load Data from AssetFindr API
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch up to 100 recent tickets for dashboard analytics
      const res = await assetfindrService.getTickets({
        page_no: 1,
        page_size: 100,
        ticket_date_start: startDate ? `${startDate}T00:00:00+07:00` : undefined,
        ticket_date_end: endDate ? `${endDate}T23:59:59+07:00` : undefined,
      });

      setTickets(res.data || []);
      setTotalRecords(res.total_records || 0);
      setIsLive(res.isLive);
    } catch (err: any) {
      console.error("Gagal mengambil data AssetFindr:", err);
      showError(err.message || "Gagal memuat data dari AssetFindr API");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Date Preset Changes
  const handleDatePresetChange = (preset: "all" | "today" | "7days" | "30days") => {
    setDatePreset(preset);
    const now = new Date();
    const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      setStartDate(formatYMD(now));
      setEndDate(formatYMD(now));
    } else if (preset === "7days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(now));
    } else if (preset === "30days") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(now));
    }
  };

  // Filtered tickets based on in-memory shift & material
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedShift !== "all") {
        const shiftMatch =
          t.work_shift_alias?.toLowerCase() === selectedShift.toLowerCase() ||
          t.work_shift_name?.toLowerCase().includes(selectedShift.toLowerCase());
        if (!shiftMatch) return false;
      }
      if (selectedMaterial !== "all") {
        const matName = t.material?.name || "Lainnya";
        if (matName !== selectedMaterial) return false;
      }
      return true;
    });
  }, [tickets, selectedShift, selectedMaterial]);

  // Unique Materials
  const materialOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.material?.name) set.add(t.material.name);
    });
    return Array.from(set);
  }, [tickets]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const totalRit = filteredTickets.length;
    const totalNetKg = filteredTickets.reduce((acc, t) => acc + (t.net_weight || 0), 0);
    const totalNetTon = totalNetKg / 1000;
    const totalGrossKg = filteredTickets.reduce((acc, t) => acc + (t.inbound_weight_kg || 0), 0);
    const totalTareKg = filteredTickets.reduce((acc, t) => acc + (t.outbound_weight_kg || 0), 0);
    const avgPayloadTon = totalRit > 0 ? totalNetTon / totalRit : 0;

    const uniqueVehicles = new Set(
      filteredTickets.map((t) => t.vehicle_reference_number || t.vehicle_name).filter(Boolean)
    );

    return {
      totalRit,
      totalNetTon,
      totalNetKg,
      totalGrossTon: totalGrossKg / 1000,
      totalTareTon: totalTareKg / 1000,
      avgPayloadTon,
      uniqueVehiclesCount: uniqueVehicles.size,
    };
  }, [filteredTickets]);

  // Daily Trend Data for Chart
  const dailyChartData = useMemo(() => {
    const map = new Map<string, { date: string; tonase: number; ritase: number }>();

    filteredTickets.forEach((t) => {
      const dStr = (t.ticket_date || t.created_at || "").slice(0, 10);
      if (!dStr) return;
      const cur = map.get(dStr) || { date: dStr, tonase: 0, ritase: 0 };
      cur.tonase += (t.net_weight || 0) / 1000;
      cur.ritase += 1;
      map.set(dStr, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => {
        const parts = item.date.split("-");
        const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
        return {
          ...item,
          displayDate: formattedDate,
          tonase: Math.round(item.tonase * 10) / 10,
        };
      });
  }, [filteredTickets]);

  // Shift Distribution Data
  const shiftChartData = useMemo(() => {
    let dsTon = 0;
    let dsRit = 0;
    let nsTon = 0;
    let nsRit = 0;

    filteredTickets.forEach((t) => {
      const isNight =
        t.work_shift_alias === "NS" ||
        (t.work_shift_name && t.work_shift_name.toLowerCase().includes("night"));
      const netTon = (t.net_weight || 0) / 1000;

      if (isNight) {
        nsTon += netTon;
        nsRit += 1;
      } else {
        dsTon += netTon;
        dsRit += 1;
      }
    });

    return [
      { name: "Day Shift (DS)", value: Math.round(dsTon * 10) / 10, ritase: dsRit, color: "#e95623" },
      { name: "Night Shift (NS)", value: Math.round(nsTon * 10) / 10, ritase: nsRit, color: "#1e293b" },
    ].filter((item) => item.ritase > 0);
  }, [filteredTickets]);

  // Top Haulers (Vehicles) Ranking
  const topVehicles = useMemo(() => {
    const map = new Map<string, { code: string; name: string; tonase: number; ritase: number }>();

    filteredTickets.forEach((t) => {
      const code = t.vehicle_reference_number || t.vehicle_name || "Unknown";
      const name = t.vehicle_name || code;
      const cur = map.get(code) || { code, name, tonase: 0, ritase: 0 };
      cur.tonase += (t.net_weight || 0) / 1000;
      cur.ritase += 1;
      map.set(code, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.tonase - a.tonase)
      .slice(0, 8);
  }, [filteredTickets]);

  // Route Analysis
  const routeAnalysis = useMemo(() => {
    const map = new Map<
      string,
      { routeName: string; distance: number; tonase: number; ritase: number }
    >();

    filteredTickets.forEach((t) => {
      const start = t.location_route?.start_location_name || t.inbound_location_label || "Pit";
      const end = t.location_route?.end_location_name || t.outbound_location_label || "Port";
      const routeName = `${start} → ${end}`;
      const distance = t.location_route?.distance_km || 0;

      const cur = map.get(routeName) || { routeName, distance, tonase: 0, ritase: 0 };
      cur.tonase += (t.net_weight || 0) / 1000;
      cur.ritase += 1;
      map.set(routeName, cur);
    });

    return Array.from(map.values());
  }, [filteredTickets]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#e95623]">
              <Scale size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  AssetFindr WeighBridge Dashboard
                </h1>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live API
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                    <Radio size={12} className="text-amber-600" />
                    Mode Simulasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Analitik & Monitoring Tiket Timbangan Batu Bara Batara &bull; Integrasi API AssetFindr
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsTokenModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
            title="Atur token autentikasi AssetFindr"
          >
            <Key size={14} className="text-orange-400" />
            <span>{hasToken ? "Ganti Token API" : "Hubungkan Token"}</span>
          </button>

          {onNavigateToData && (
            <button
              onClick={onNavigateToData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-50 text-[#e95623] hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Buka AssetFindr Data</span>
              <ArrowRight size={13} />
            </button>
          )}

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
            title="Segarkan data timbangan"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#e95623]" : ""} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Date presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">
            Periode:
          </span>
          <button
            onClick={() => handleDatePresetChange("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              datePreset === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Data
          </button>
          <button
            onClick={() => handleDatePresetChange("today")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              datePreset === "today"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => handleDatePresetChange("7days")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              datePreset === "7days"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => handleDatePresetChange("30days")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              datePreset === "30days"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            30 Hari Terakhir
          </button>
        </div>

        {/* Secondary filters: Shift and Material */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Shift:</span>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Shift</option>
              <option value="ds">Day Shift (DS)</option>
              <option value="ns">Night Shift (NS)</option>
            </select>
          </div>

          {/* Material Filter */}
          {materialOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px]">Material:</span>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-hidden cursor-pointer max-w-44 truncate"
              >
                <option value="all">Semua Material</option>
                {materialOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Ritase */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Ritase Timbang
            </span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
              <Truck size={16} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.totalRit.toLocaleString("id-ID")}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">Tiket</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Dari total {totalRecords.toLocaleString("id-ID")} tiket di sistem
          </span>
        </div>

        {/* Card 2: Total Tonase Bersih */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Tonase Bersih (Net)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Scale size={16} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {metrics.totalNetTon.toLocaleString("id-ID", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">Ton</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {metrics.totalNetKg.toLocaleString("id-ID")} kg netto
          </span>
        </div>

        {/* Card 3: Rata-Rata Payload */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Rata-Rata Payload / Rit
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Gauge size={16} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.avgPayloadTon.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">Ton / Rit</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">
            Target KPI: 205.0 Ton ({((metrics.avgPayloadTon / 205) * 100).toFixed(0)}%)
          </span>
        </div>

        {/* Card 4: Gross & Tare Weight */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Gross & Tare Weight
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Layers size={16} />
            </div>
          </div>
          <div className="my-1.5 space-y-0.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Gross (In):</span>
              <span className="font-mono font-bold text-slate-900">
                {metrics.totalGrossTon.toFixed(1)} T
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500 font-medium">Tare (Out):</span>
              <span className="font-mono font-bold text-slate-900">
                {metrics.totalTareTon.toFixed(1)} T
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Koreksi tara terintegrasi
          </span>
        </div>

        {/* Card 5: Unit Aktif */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Armada Hauler Aktif
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.uniqueVehiclesCount}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">Dump Truck</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Unit tercatat pada periode ini
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-[#e95623]" />
                Tren Tonase & Ritase Harian
              </h3>
              <p className="text-xs text-slate-400">
                Volume tonase bersih dan frekuensi penimbangan harian
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total {dailyChartData.length} Hari
            </span>
          </div>

          <div className="h-72 w-full mt-4">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                Belum ada data tiket untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    unit=" T"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#e95623" }}
                    unit=" rit"
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      name === "tonase" ? `${val} Ton` : `${val} Rit`,
                      name === "tonase" ? "Tonase Bersih" : "Jumlah Ritase",
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="tonase"
                    name="Tonase Bersih (Ton)"
                    fill="#e95623"
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ritase"
                    name="Ritase (Rit)"
                    stroke="#1e293b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#1e293b" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Shift Distribution (1 Col) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-[#e95623]" />
              Komposisi Shift Operasional
            </h3>
            <p className="text-xs text-slate-400">
              Proporsi muatan Day Shift vs Night Shift
            </p>
          </div>

          <div className="h-52 w-full mt-2 flex items-center justify-center">
            {shiftChartData.length === 0 ? (
              <span className="text-xs text-slate-400 font-medium">Tidak ada data shift</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shiftChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {shiftChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} Ton`, "Tonase"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Shift Details Breakdown */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {shiftChartData.map((s) => (
              <div key={s.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] font-bold text-slate-800">{s.name}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs font-mono font-black text-slate-900">{s.value} T</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{s.ritase} rit</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Top Haulers & Route Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 8 Haulers */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck size={16} className="text-[#e95623]" />
                Top Hauling Dump Trucks
              </h3>
              <p className="text-xs text-slate-400">Armada dengan akumulasi tonase tertinggi</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {topVehicles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Tidak ada data unit</div>
            ) : (
              topVehicles.map((v, idx) => {
                const maxTon = topVehicles[0]?.tonase || 1;
                const pct = Math.round((v.tonase / maxTon) * 100);

                return (
                  <div key={v.code} className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-900">{v.code}</span>
                        {v.name !== v.code && (
                          <span className="text-slate-400 text-[11px]">({v.name})</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 font-mono">
                        <span className="font-black text-slate-900">{v.tonase.toFixed(1)} Ton</span>
                        <span className="text-slate-400 text-[10px]">{v.ritase} Rit</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-[#e95623] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Route Analysis Table */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={16} className="text-[#e95623]" />
                  Analisis Rute & Jarak Angkut
                </h3>
                <p className="text-xs text-slate-400">Rute penimbangan dan efisiensi jarak</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-extrabold">
                    <th className="py-2.5 px-2">Rute Pengangkutan</th>
                    <th className="py-2.5 px-2 text-center">Jarak (KM)</th>
                    <th className="py-2.5 px-2 text-center">Ritase</th>
                    <th className="py-2.5 px-2 text-right">Total Tonase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeAnalysis.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Tidak ada data rute
                      </td>
                    </tr>
                  ) : (
                    routeAnalysis.map((r) => (
                      <tr key={r.routeName} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-2 font-bold text-slate-800">{r.routeName}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-600">
                          {r.distance > 0 ? `${r.distance} km` : "-"}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                          {r.ritase} rit
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-600">
                          {r.tonase.toFixed(1)} Ton
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick link to Data View */}
          {onNavigateToData && (
            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Ingin melihat rincian setiap tiket timbang?
              </span>
              <button
                onClick={onNavigateToData}
                className="text-xs font-black text-[#e95623] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Tabel AssetFindr Data</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Token Modal */}
      <AssetFindrTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onTokenUpdated={() => {
          loadData();
        }}
      />
    </div>
  );
};
