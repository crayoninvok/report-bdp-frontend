"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  HardHat,
  HeartPulse,
  Leaf,
  FileText,
  Plus,
  RefreshCw,
  Building2,
  ArrowRight,
  Flame,
  Award,
  AlertCircle,
  Clock3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
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
  const { showError, showSuccess } = useNotification();

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
    <div className="space-y-6">
      {/* ---------------------------------------------------------
          Corporate Header Banner
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 shadow-xl p-6 sm:p-7">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
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
              Pusat komando pemantauan keselamatan pertambangan &amp; hauling armada PT Batara Dharma Persada.
              Monitoring jam kerja selamat (Safe Man Hours), rasio frekuensi cedera (LTIFR), eliminasi potensi bahaya, dan pengelolaan lingkungan.
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

            {onNavigateToHazardReport && (
              <button
                type="button"
                onClick={onNavigateToHazardReport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-[#e95623] hover:bg-[#d84818] text-white shadow-lg transition-all cursor-pointer active:scale-98"
              >
                <ShieldAlert size={15} />
                <span>Buka Hazard Report</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Top Core Safety Metric Cards
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Safe Man Hours */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase">Jam Kerja Selamat</span>
            <Activity size={16} className="text-[#e95623]" />
          </div>
          <div className="mt-2.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {data?.safeManHours.toLocaleString("id-ID") ?? "1.285.400"}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1">Jam</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 mt-1">LTI Free Hours</span>
        </div>

        {/* Days Without LTI */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase">Hari Tanpa LTI</span>
            <Award size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
              {data?.daysWithoutLti ?? 435}
            </span>
            <span className="text-xs font-semibold text-emerald-600 ml-1">Hari</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 mt-1">Zero LTI Maintained</span>
        </div>

        {/* LTIFR & TRIFR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase">LTIFR / TRIFR</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">0.00</span>
            <span className="text-xs font-semibold text-slate-400 ml-1">Rate</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 mt-1">Target Industri: &lt; 0.50</span>
        </div>

        {/* Hazard Resolution Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase">Penyelesaian Bahaya</span>
            <ShieldCheck size={16} className="text-[#e95623]" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-[#e95623]">
              {data?.resolutionRate ?? 92}%
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 mt-1">
            {data?.closedHazards ?? 0} dari {data?.totalHazards ?? 0} ditangani
          </span>
        </div>

        {/* Near Miss */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase">Near Miss Report</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.nearMissCount ?? 1}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1">Insiden</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 mt-1">Investigasi Closed</span>
        </div>

        {/* Environmental Compliance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase">Kepatuhan Lingkungan</span>
            <Leaf size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">100%</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 mt-1">B3 &amp; Silt Trap Compliant</span>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Main Analytics Grid
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Monthly Trend Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#e95623]" />
                <span>Tren Bulanan: Identifikasi Bahaya vs Tindakan Selesai</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring proaktif laju temuan bahaya dan kecepatan penyelesaian tindakan koreksi
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">{siteLabel}</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.monthlyTrends || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    borderRadius: "12px",
                    border: "none",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar
                  dataKey="hazards"
                  name="Temuan Bahaya"
                  fill="#e95623"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="resolved"
                  name="Tindakan Selesai"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Distribution Donut Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers size={16} className="text-[#e95623]" />
              <span>Kategori Bahaya</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Komposisi jenis temuan K3L</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(data?.categoryDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    borderRadius: "10px",
                    border: "none",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {(data?.categoryDistribution || []).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-600 font-medium">{cat.name}</span>
                </div>
                <span className="font-extrabold text-slate-800">{cat.value} laporan</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Bottom Row: Risk Level Matrix & Recent Hazard Reports
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Risk Level Distribution */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3.5">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600" />
              <span>Matriks Tingkat Risiko</span>
            </h2>
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
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-[#e95623]" />
                <span>Temuan Bahaya Terkini (Recent Hazard Reports)</span>
              </h2>
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
                        <span className="text-[10px] font-bold text-slate-400">&bull; {h.date}</span>
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-slate-100 text-slate-700">
                          {h.category}
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
                      <h4 className="text-xs font-extrabold text-slate-800">{h.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{h.location}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeStyle}`}>
                        {h.status}
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
