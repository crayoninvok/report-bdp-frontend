"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  glService,
  GLFuelConsumptionResponse,
  GLPeriodItem,
} from "../services/glService";
import {
  Fuel,
  Scale,
  TrendingUp,
  BarChart3,
  Truck,
  Calendar,
  RefreshCw,
  Layers,
  Download,
  CheckCircle2,
  MapPin,
  Sparkles,
  Database,
  Filter,
  Clock,
  Coins,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

interface FuelConsumptionGLSectionProps {
  initialSite?: string;
  productionTonase?: number;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export const FuelConsumptionGLSection: React.FC<FuelConsumptionGLSectionProps> = ({
  initialSite = "all",
  productionTonase,
  defaultStartDate,
  defaultEndDate,
}) => {
  const [periods, setPeriods] = useState<GLPeriodItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>(
    initialSite === "muara_pahu" ? "MPH" : initialSite === "senyiur" ? "SNY" : initialSite || "ALL"
  );
  const [data, setData] = useState<GLFuelConsumptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"daily" | "fleet" | "logs">("daily");

  // Load GL Periods
  useEffect(() => {
    glService
      .getPeriods()
      .then((res) => {
        setPeriods(res || []);
        if (res && res.length > 0) {
          setSelectedPeriodId(res[0].id);
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil periode GL:", err);
      });
  }, []);

  // Fetch Fuel Consumption from GL
  const fetchFuelData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await glService.getFuelConsumption({
        periodId: selectedPeriodId || undefined,
        site: selectedSite !== "ALL" ? selectedSite : undefined,
        startDate: defaultStartDate || undefined,
        endDate: defaultEndDate || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error("Error fetching GL fuel consumption:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodId, selectedSite, defaultStartDate, defaultEndDate]);

  useEffect(() => {
    fetchFuelData();
  }, [fetchFuelData]);

  // Format IDR Currency
  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "Rp 0";
    if (val >= 1000000000) {
      return `Rp ${(val / 1000000000).toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} Miliar`;
    }
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} Juta`;
    }
    return `Rp ${val.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  };

  // Format number
  const formatNum = (val?: number, decimals = 0) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return val.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Active GL Period Object
  const currentPeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId) || periods[0] || null;
  }, [periods, selectedPeriodId]);

  // Daily Chart Data formatted
  const dailyChartData = useMemo(() => {
    if (!data?.dailyData) return [];
    return data.dailyData.map((d) => {
      const parts = d.date.split("-");
      const shortDate = parts.length >= 3 ? `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}` : d.date;
      return {
        ...d,
        shortDate,
        costMiliar: Number((d.cost / 1000000000).toFixed(3)),
        litersLabel: d.liters >= 1000 ? `${(d.liters / 1000).toFixed(0)}k L` : `${d.liters} L`,
      };
    });
  }, [data]);

  // Fleet Chart Data (Top 10)
  const fleetChartData = useMemo(() => {
    if (!data?.topFleets) return [];
    return data.topFleets.slice(0, 10).map((f) => ({
      ...f,
      litersK: Math.round(f.totalLiters / 1000),
      label: f.costCenter,
    }));
  }, [data]);

  // Calculate Fuel Ratio if production tonase is available
  const fuelRatio = useMemo(() => {
    if (!productionTonase || productionTonase <= 0 || !data?.summary.totalLiters) return null;
    return Number((data.summary.totalLiters / productionTonase).toFixed(2));
  }, [productionTonase, data]);

  // Export Fuel CSV
  const handleExportCSV = () => {
    if (!data?.dailyData || data.dailyData.length === 0) return;

    const headers = [
      "Tanggal",
      "Konsumsi Solar (Liter)",
      "Total Biaya Fuel (IDR)",
      "Rata-rata Harga (IDR/Liter)",
      "Jumlah Transaksi GI",
    ];

    const rows = data.dailyData.map((d) => [
      `"${d.date}"`,
      d.liters,
      d.cost,
      d.avgPrice ? Math.round(d.avgPrice) : 0,
      d.transactionCount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GL_Fuel_Consumption_${currentPeriod?.periodName || "Report"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
              <Fuel size={12} className="text-rose-600" />
              Fuel Consumption &bull; General Ledger
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-600" />
              GL Audited Actual
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              Akun: 05110201 (Prod) &bull; 05110805 (Mob)
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Fuel className="text-rose-600" size={24} />
            Konsumsi Fuel Operasional (Data GL)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-3xl">
            Rekapitulasi pemakaian Bio Solar (Liter) dan realisasi biaya BBM dari pembukuan General Ledger (GL) per unit armada, site, dan tanggal operasional.
          </p>
        </div>

        {/* Filter Controls: Period & Site */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Selector */}
          {periods.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <Calendar size={13} className="text-slate-500" />
              <span className="font-bold text-slate-500 text-[11px]">Periode GL:</span>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.periodName} ({p.month}/{p.year})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Site Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedSite("ALL")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedSite === "ALL"
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Site
            </button>
            <button
              type="button"
              onClick={() => setSelectedSite("MPH")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedSite === "MPH"
                  ? "bg-[#e95623] text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-[#e95623]"
              }`}
            >
              Muara Pahu (MPH)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSite("SNY")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedSite === "SNY"
                  ? "bg-emerald-600 text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Senyiur (SNY)
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchFuelData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer disabled:opacity-50 border border-slate-200"
            title="Perbarui Data Fuel GL"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-rose-600" : ""} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Download CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Volume Liter, Biaya Rupiah, Rata-rata Harga, Transaksi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume Solar */}
        <div className="bg-gradient-to-br from-rose-50/50 to-orange-50/30 rounded-3xl p-5 border border-rose-200/70 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Fuel size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              Volume Solar
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Total Konsumsi Solar
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight font-mono">
              {formatNum(data?.summary.totalLiters)}{" "}
              <span className="text-sm font-bold text-slate-500">Liter</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-rose-100/80 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Muara Pahu:</span>
            <strong className="text-rose-950">
              {formatNum(data?.summary.siteBreakdown.find((s) => s.projectArea === "MPH")?.liters)} L
            </strong>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Senyiur:</span>
            <span>{formatNum(data?.summary.siteBreakdown.find((s) => s.projectArea === "SNY")?.liters)} L</span>
          </div>
        </div>

        {/* Card 2: Total Biaya Fuel (IDR) */}
        <div className="bg-gradient-to-br from-amber-50/50 to-yellow-50/30 rounded-3xl p-5 border border-amber-200/70 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Coins size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Biaya GL
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Total Biaya Fuel (GL)
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight font-mono">
              {formatRupiah(data?.summary.totalCost)}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-100/80 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Rata-rata Harga Solar:</span>
            <strong className="text-amber-950 font-mono">
              Rp {formatNum(Math.round(data?.summary.avgPricePerLiter || 10580))}/L
            </strong>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Beban Produksi:</span>
            <span>{formatRupiah(data?.summary.accountBreakdown.find((a) => a.accountCode === "05110201")?.cost)}</span>
          </div>
        </div>

        {/* Card 3: Rata-rata Harian & Fuel Ratio */}
        <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-3xl p-5 border border-indigo-200/70 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              Efisiensi
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              {fuelRatio !== null ? "Actual Fuel Ratio" : "Rata-rata Konsumsi / Hari"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight font-mono">
              {fuelRatio !== null ? (
                <>
                  {fuelRatio.toFixed(2)}{" "}
                  <span className="text-sm font-bold text-slate-500">L/Ton</span>
                </>
              ) : (
                <>
                  {data?.dailyData && data.dailyData.length > 0
                    ? formatNum(Math.round(data.summary.totalLiters / data.dailyData.length))
                    : "0"}{" "}
                  <span className="text-sm font-bold text-slate-500">L/Hari</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Rata-rata Konsumsi / Hari:</span>
            <strong className="text-indigo-950 font-mono">
              {data?.dailyData && data.dailyData.length > 0
                ? formatNum(Math.round(data.summary.totalLiters / data.dailyData.length))
                : 0}{" "}
              L
            </strong>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Hari Operasional:</span>
            <span>{data?.dailyData.length || 0} Hari Aktif</span>
          </div>
        </div>

        {/* Card 4: Transaksi & Voucher GI */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Truck size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Voucher GI
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Total Pengisian Solar
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {formatNum(data?.summary.totalTransactions)}{" "}
              <span className="text-sm font-bold text-slate-500">Voucher</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>Rata-rata per Pengisian:</span>
            <strong className="text-slate-900 font-mono">
              {data?.summary.totalTransactions
                ? formatNum(Math.round(data.summary.totalLiters / data.summary.totalTransactions))
                : 0}{" "}
              L/GI
            </strong>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Armada Tercatat:</span>
            <span>{data?.topFleets.length || 0}+ Cost Center</span>
          </div>
        </div>
      </div>

      {/* Visual Charts: Daily Fuel Trend & Top Fleets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left: Daily Fuel Consumption Chart */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-50/60 border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-rose-600" />
                Tren Konsumsi Solar Harian (Liter) & Biaya (Rp Miliar)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pergerakan volume solar harian aktual dari GL {currentPeriod?.periodName}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-3 h-3 rounded bg-rose-500" /> Volume (Liter)
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-3 h-1 bg-amber-500 rounded-full" /> Biaya (Rp Miliar)
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw size={16} className="animate-spin text-rose-600" />
                <span>Memuat grafik konsumsi BBM...</span>
              </div>
            ) : dailyChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data konsumsi harian pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyChartData} margin={{ top: 20, right: 20, left: 10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={10} tickLine={false} dy={6} />
                  {/* Left Axis: Volume Liter */}
                  <YAxis
                    yAxisId="left"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k L`}
                  />
                  {/* Right Axis: Biaya Miliar */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `Rp ${v}M`}
                  />
                  <Tooltip
                    content={(props: any) => {
                      const { active, payload } = props;
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as any;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-800 min-w-52 font-sans">
                            <div className="font-extrabold text-slate-200 border-b border-slate-800 pb-1 flex justify-between">
                              <span>Tanggal {d.date}</span>
                              <span className="text-[10px] text-slate-400">{d.transactionCount} Voucher</span>
                            </div>
                            <div className="flex justify-between gap-3 text-rose-400 font-bold">
                              <span>Volume Solar:</span>
                              <span className="font-mono">{formatNum(d.liters)} Liter</span>
                            </div>
                            <div className="flex justify-between gap-3 text-amber-400 font-bold">
                              <span>Total Biaya:</span>
                              <span className="font-mono">{formatRupiah(d.cost)}</span>
                            </div>
                            <div className="flex justify-between gap-3 text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                              <span>Harga Satuan:</span>
                              <span className="font-mono">Rp {formatNum(Math.round(d.avgPrice))}/L</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="liters" name="Volume Solar (L)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="costMiliar"
                    name="Biaya Fuel (Rp Miliar)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f59e0b" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Top 10 Units Chart */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-50/60 border border-slate-200/80 space-y-4">
          <div className="pb-3 border-b border-slate-200/80">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Truck size={18} className="text-indigo-600" />
              Top 10 Unit / Fleet Terbesar
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Konsumsi solar berdasarkan Cost Center</p>
          </div>

          <div className="h-72 w-full pt-1">
            {fleetChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data armada.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fleetChartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${v}k L`} />
                  <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={10} width={60} tickLine={false} />
                  <Tooltip
                    formatter={(val: any, _, item: any) => [
                      `${formatNum(item.payload.totalLiters)} Liter (${formatRupiah(item.payload.totalCost)})`,
                      "Total Konsumsi",
                    ]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                  />
                  <Bar dataKey="litersK" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="litersK" position="right" formatter={(v: any) => `${v}k`} style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher & Table Breakdown */}
      <div className="pt-2 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "daily"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              📅 Rincian Harian ({data?.dailyData.length || 0} Hari)
            </button>
            <button
              onClick={() => setActiveTab("fleet")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "fleet"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              🚛 Ranking Unit Armada ({data?.topFleets.length || 0} Unit)
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              📋 Log Transaksi Terakhir ({data?.recentTransactions.length || 0} Baris)
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Sumber Data: General Ledger &bull; Tabel GLTransaction
          </div>
        </div>

        {/* Tab 1: Daily Table */}
        {activeTab === "daily" && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-right">Volume Solar (Liter)</th>
                  <th className="px-4 py-3 text-right">Total Biaya (IDR)</th>
                  <th className="px-4 py-3 text-right">Rata-rata Harga / Liter</th>
                  <th className="px-4 py-3 text-center">Jumlah Voucher GI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {dailyChartData.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.date}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-700 font-mono">
                      {formatNum(row.liters)} L
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                      {formatRupiah(row.cost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      Rp {formatNum(Math.round(row.avgPrice))}/L
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {row.transactionCount} Pengisian
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Fleet Ranking Table */}
        {activeTab === "fleet" && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ranking</th>
                  <th className="px-4 py-3">Cost Center / Unit</th>
                  <th className="px-4 py-3">Project Area</th>
                  <th className="px-4 py-3 text-right">Total Volume (Liter)</th>
                  <th className="px-4 py-3 text-right">Total Biaya (IDR)</th>
                  <th className="px-4 py-3 text-center">Frekuensi GI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data?.topFleets.map((f, idx) => (
                  <tr key={`${f.costCenter}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-black text-slate-400">#{idx + 1}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{f.costCenter}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          f.projectArea === "MPH"
                            ? "bg-orange-50 text-[#e95623] border border-orange-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {f.projectArea}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-indigo-700 font-mono">
                      {formatNum(f.totalLiters)} L
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                      {formatRupiah(f.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {f.transactionCount} kali
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Recent Transactions Logs */}
        {activeTab === "logs" && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">No. Voucher (Reg)</th>
                  <th className="px-4 py-3">Unit (Cost Center)</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Spesifikasi</th>
                  <th className="px-4 py-3 text-right">Volume (Liter)</th>
                  <th className="px-4 py-3 text-right">Nilai Debet (IDR)</th>
                  <th className="px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data?.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{tx.date}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{tx.regNo || "-"}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{tx.costCenter || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {tx.projectArea || "MPH"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{tx.specification || "BIO SOLAR"}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-700 font-mono">
                      {formatNum(tx.qty)} L
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(tx.debet)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{tx.remark || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
