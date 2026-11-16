"use client";

import React, { useState, useMemo, useEffect } from "react";
import { User } from "../types/auth";
import {
  Briefcase,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  History,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { HistoricalComponentModal } from "./HistoricalComponentModal";
import { PlanReplacementModal, PlanReplacementItem } from "./PlanReplacementModal";

export interface HistoricalComponentItem {
  id: string;
  unitCode: string;
  componentName: string;
  componentDescription?: string;
  serialNumber: string;
  sourceComponent?: string;
  hmPasang: number;
  hmUnitTerkini: number;
  targetLifetime: number;
  runningHm?: number;
  dailyAvgHm?: number;
  tglPasang?: string;
  tglRencana?: string;
  estimasiBiaya?: number;
  site: string;
  createdAt?: string;
}

// Logic calculations as requested:
// 1. Lifetime Component = HM unit terakhir - HM terakhir penggantian (HM pasang)
// 2. Sisa Jam & Umur = Target Lifetime - Lifetime Component
// 3. Tanggal Rencana Penggantian = Proyeksi tanggal jatuh tempo berdasarkan sisa jam & rata-rata HM harian
// 4. Status:
//    a. >= 3000 jam -> Monitoring
//    b. < 3000 jam -> Prepare Component (Persiapan PR)
//    c. <= 0 jam -> Critical
export function calculateComponentMetrics(item: HistoricalComponentItem) {
  const hmUnit = item.hmUnitTerkini ?? 0;
  const hmInstall = item.hmPasang ?? 0;
  const targetLife = item.targetLifetime ?? 0;

  // Lifetime Component
  const lifetimeComponent = Math.max(0, hmUnit - hmInstall);

  // Running HM (sama dengan lifetime component atau running jam sejak pasang)
  const runningHm = item.runningHm !== undefined ? item.runningHm : lifetimeComponent;

  // Sisa Jam & Umur
  const sisaJam = targetLife - lifetimeComponent;
  
  // Persentase pemakaian umur (% umur terpakai atau sisa umur)
  const umurPersen = targetLife > 0
    ? Math.max(0, Math.min(100, Math.round((lifetimeComponent / targetLife) * 100)))
    : 0;

  // Tanggal Rencana Penggantian
  // Formula: jika HM jatuh tempo maka tanggal menyesuaikan sisa jam / average daily HM
  const avgDailyHm = item.dailyAvgHm && item.dailyAvgHm > 0 ? item.dailyAvgHm : 16;
  let tglRencana = item.tglRencana;
  if (!tglRencana) {
    if (sisaJam > 0) {
      const remainingDays = Math.ceil(sisaJam / avgDailyHm);
      const projDate = new Date();
      projDate.setDate(projDate.getDate() + remainingDays);
      tglRencana = projDate.toISOString().split("T")[0];
    } else {
      tglRencana = new Date().toISOString().split("T")[0];
    }
  }

  // Status calculation:
  // a. >= 3000 jam -> MONITORING
  // b. < 3000 jam dan > 0 jam -> PREPARE COMPONENT (PERSIAPAN PR)
  // c. <= 0 jam -> CRITICAL
  let status: "MONITORING" | "PREPARE" | "CRITICAL" = "MONITORING";
  if (sisaJam <= 0) {
    status = "CRITICAL";
  } else if (sisaJam < 3000) {
    status = "PREPARE";
  } else {
    status = "MONITORING";
  }

  return {
    lifetimeComponent,
    runningHm,
    sisaJam,
    umurPersen,
    tglRencana,
    status,
  };
}

interface HistoricalComponentViewProps {
  user?: User;
}

const STORAGE_KEY = "BDP_HISTORICAL_COMPONENTS_DATA";
const PLAN_STORAGE_KEY = "BDP_PLAN_REPLACEMENT_DATA";

// Default plan items matching user uploaded table image:
const DEFAULT_PLAN_ITEMS: PlanReplacementItem[] = [
  {
    id: "plan-sample-1",
    site: "SENYIUR",
    periodMonthYear: "November 2026",
    unitCode: "PM401",
    component: "ENGINE",
    planHm: 24000,
    lastHm: 23876,
    actualDate: "15/11/2026",
    actualHm: 23987,
    hmLastReplacement: 0,
    lifetime: 23987, // Formula: 23987 - 0 = 23987
    sourceComponent: "BRAND NEW",
    remark: "OVERHAUL ENGINE",
    createdAt: new Date().toISOString(),
  },
  {
    id: "plan-sample-2",
    site: "SENYIUR",
    periodMonthYear: "Desember 2026",
    unitCode: "PM402",
    component: "ENGINE",
    planHm: 24000,
    lastHm: 24065,
    actualDate: "",
    actualHm: null,
    hmLastReplacement: 0,
    lifetime: 0,
    sourceComponent: "",
    remark: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "plan-sample-3",
    site: "SENYIUR",
    periodMonthYear: "Desember 2026",
    unitCode: "PM403",
    component: "ENGINE",
    planHm: 24000,
    lastHm: 24174,
    actualDate: "",
    actualHm: null,
    hmLastReplacement: 0,
    lifetime: 0,
    sourceComponent: "",
    remark: "",
    createdAt: new Date().toISOString(),
  },
];

export const HistoricalComponentView: React.FC<HistoricalComponentViewProps> = ({ user }) => {
  // Active Tab: "update" or "plan"
  const [activeTab, setActiveTab] = useState<"update" | "plan">("update");

  // Selected Site (default user's site or Senyiur)
  const defaultSite = user?.jobSite === "MuaraPahu" ? "MuaraPahu" : "Senyiur";
  const [selectedSite, setSelectedSite] = useState<string>(defaultSite);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planPeriodFilter, setPlanPeriodFilter] = useState<string>("ALL");

  // Modal State for Historical Component
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<HistoricalComponentItem | null>(null);

  // Modal State for Plan Replacement
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [editingPlanItem, setEditingPlanItem] = useState<PlanReplacementItem | null>(null);
  const [activePlanMonthForAdd, setActivePlanMonthForAdd] = useState<string>("November 2026");

  // Data items state
  const [items, setItems] = useState<HistoricalComponentItem[]>([]);
  const [planItems, setPlanItems] = useState<PlanReplacementItem[]>(DEFAULT_PLAN_ITEMS);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore storage read error
    }

    try {
      const savedPlan = localStorage.getItem(PLAN_STORAGE_KEY);
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan);
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          setPlanItems(parsedPlan);
        }
      }
    } catch {
      // Ignore storage read error
    }
  }, []);

  // Save to localStorage whenever items change
  const saveItems = (newItems: HistoricalComponentItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // Ignore storage write error
    }
  };

  const savePlanItems = (newPlans: PlanReplacementItem[]) => {
    setPlanItems(newPlans);
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(newPlans));
    } catch {
      // Ignore storage write error
    }
  };

  // Handle Save from Plan Modal
  const handleSavePlanModal = (item: PlanReplacementItem) => {
    const existingIndex = planItems.findIndex((p) => p.id === item.id);
    if (existingIndex >= 0) {
      const updated = [...planItems];
      updated[existingIndex] = item;
      savePlanItems(updated);
    } else {
      savePlanItems([item, ...planItems]);
    }
  };

  // Handle Delete Plan Item
  const handleDeletePlanItem = (id: string, unit: string, comp: string) => {
    if (window.confirm(`Yakin ingin menghapus rencana penggantian ${comp} untuk unit ${unit}?`)) {
      const filtered = planItems.filter((p) => p.id !== id);
      savePlanItems(filtered);
    }
  };

  // Handle Save from Modal
  const handleSaveModal = (item: HistoricalComponentItem) => {
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = item;
      saveItems(updated);
    } else {
      saveItems([item, ...items]);
    }
  };

  // Handle Delete
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus catatan komponen "${name}"?`)) {
      const filtered = items.filter((i) => i.id !== id);
      saveItems(filtered);
    }
  };

  // Computed metrics for all items
  const processedItems = useMemo(() => {
    return items.map((it) => ({
      ...it,
      metrics: calculateComponentMetrics(it),
    }));
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      // Site filter
      if (selectedSite !== "ALL" && item.site !== selectedSite) return false;

      // Status filter
      if (statusFilter !== "ALL" && item.metrics.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUnit = item.unitCode.toLowerCase().includes(q);
        const matchComp = item.componentName.toLowerCase().includes(q);
        const matchSn = item.serialNumber.toLowerCase().includes(q);
        if (!matchUnit && !matchComp && !matchSn) return false;
      }

      return true;
    });
  }, [processedItems, selectedSite, statusFilter, searchQuery]);

  // Summary counts for cards
  const summaryCounts = useMemo(() => {
    let monitoring = 0;
    let prepare = 0;
    let critical = 0;

    for (const it of processedItems) {
      if (selectedSite !== "ALL" && it.site !== selectedSite) continue;
      if (it.metrics.status === "MONITORING") monitoring++;
      else if (it.metrics.status === "PREPARE") prepare++;
      else if (it.metrics.status === "CRITICAL") critical++;
    }

    return { monitoring, prepare, critical };
  }, [processedItems, selectedSite]);

  // Filtered Plan Items
  const filteredPlanItems = useMemo(() => {
    return planItems.filter((p) => {
      // Site filter
      if (selectedSite !== "ALL") {
        const pSiteNorm = p.site.toUpperCase().replace(/\s+/g, "");
        const selNorm = selectedSite.toUpperCase().replace(/\s+/g, "");
        if (!pSiteNorm.includes(selNorm) && !selNorm.includes(pSiteNorm)) return false;
      }

      // Period filter
      if (planPeriodFilter !== "ALL" && p.periodMonthYear !== planPeriodFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUnit = p.unitCode.toLowerCase().includes(q);
        const matchComp = p.component.toLowerCase().includes(q);
        const matchRemark = (p.remark || "").toLowerCase().includes(q);
        const matchSource = (p.sourceComponent || "").toLowerCase().includes(q);
        if (!matchUnit && !matchComp && !matchRemark && !matchSource) return false;
      }

      return true;
    });
  }, [planItems, selectedSite, planPeriodFilter, searchQuery]);

  // Group Plan Items by Month/Year Period
  const groupedPlanItems = useMemo(() => {
    const map: Record<string, PlanReplacementItem[]> = {};
    for (const item of filteredPlanItems) {
      const period = item.periodMonthYear || "Lainnya";
      if (!map[period]) map[period] = [];
      map[period].push(item);
    }
    return map;
  }, [filteredPlanItems]);

  // Distinct available periods for dropdown filter
  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(planItems.map((p) => p.periodMonthYear)));
    if (!periods.includes("November 2026")) periods.push("November 2026");
    if (!periods.includes("Desember 2026")) periods.push("Desember 2026");
    return periods;
  }, [planItems]);

  // Formatter for Currency IDR
  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null || val === 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute -right-6 -bottom-8 opacity-5 pointer-events-none text-slate-900">
          <History size={260} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                <History size={13} className="text-[#e95623]" />
                Plant & Maintenance
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#e95623] border border-orange-200">
                Component Lifecycle
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Historical Component
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Monitoring riwayat penggantian komponen, target lifetime, estimasi jatuh tempo penggantian, serta status kesiapan spare part alat berat.
            </p>
          </div>

          {/* Metric Summary Cards matching uploaded design */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
            {/* Card 1: Monitoring */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 min-w-36 sm:min-w-40 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Component Monitoring</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800">{summaryCounts.monitoring}</span>
                <span className="text-xs font-semibold text-slate-500">Unit</span>
              </div>
            </div>

            {/* Card 2: Prepare */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 min-w-36 sm:min-w-40 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Component Prepare</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800">{summaryCounts.prepare}</span>
                <span className="text-xs font-semibold text-slate-500">Unit</span>
              </div>
            </div>

            {/* Card 3: Critical */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 min-w-36 sm:min-w-40 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Component Critical</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-600">{summaryCounts.critical}</span>
                <span className="text-xs font-semibold text-slate-500">Unit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Active Population Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 pt-3 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("update")}
              className={`flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-bold tracking-tight transition-all relative ${
                activeTab === "update"
                  ? "text-[#e95623]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase size={16} className={activeTab === "update" ? "text-[#e95623]" : "text-slate-400"} />
              <span>Update Historical Component</span>
              {activeTab === "update" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e95623] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("plan")}
              className={`flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-bold tracking-tight transition-all relative ${
                activeTab === "plan"
                  ? "text-[#e95623]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar size={16} className={activeTab === "plan" ? "text-[#e95623]" : "text-slate-400"} />
              <span>Plan Component Replacement</span>
              {activeTab === "plan" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e95623] rounded-full" />
              )}
            </button>
          </div>

          {/* Right Site Population Indicator */}
          <div className="pb-3 text-right">
            <span className="text-xs font-bold text-slate-600">
              {activeTab === "update" ? (
                <>
                  Populasi Aktif {selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}:{" "}
                  <span className="text-slate-900 font-black">{filteredItems.length} Head Unit</span>
                </>
              ) : (
                <>
                  Total Plan:{" "}
                  <span className="text-slate-900 font-black">{filteredPlanItems.length} Item Penggantian</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Action Button */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-56 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "update"
                    ? "Cari no. unit, nama komponen, serial number..."
                    : "Cari no. unit, komponen, remark, source..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 text-slate-800 shadow-2xs"
              />
            </div>

            {/* Site Filter (For SuperAdmin / HeadOffice) */}
            {(!user || user.role === "SuperAdmin" || user.jobSite === "HeadOffice") && (
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 text-slate-700 font-semibold shadow-2xs cursor-pointer"
              >
                <option value="Senyiur">Site Senyiur</option>
                <option value="MuaraPahu">Site Muara Pahu</option>
                <option value="ALL">Semua Site</option>
              </select>
            )}

            {/* Filter per Active Tab */}
            {activeTab === "update" ? (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 text-slate-700 font-semibold shadow-2xs cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="MONITORING">Monitoring (&ge; 3,000 Jam)</option>
                <option value="PREPARE">Prepare (&lt; 3,000 Jam)</option>
                <option value="CRITICAL">Critical (&le; 0 Jam)</option>
              </select>
            ) : (
              <select
                value={planPeriodFilter}
                onChange={(e) => setPlanPeriodFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 text-slate-700 font-semibold shadow-2xs cursor-pointer"
              >
                <option value="ALL">Semua Periode</option>
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    Plan {p}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {activeTab === "update" ? (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-[#e95623] hover:bg-[#d54918] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>Tambah Komponen</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingPlanItem(null);
                  setIsPlanModalOpen(true);
                }}
                className="px-4 py-2 bg-[#e95623] hover:bg-[#d54918] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>Input Plan Replacement</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: HISTORICAL COMPONENT VIEW */}
        {activeTab === "update" && (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full text-left border-collapse min-w-300">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10.5px] font-bold text-slate-600 uppercase tracking-wider select-none">
                  <th className="py-3 px-3 text-center w-12">NO</th>
                  <th className="py-3 px-3 text-center w-24">NO. UNIT</th>
                  <th className="py-3 px-4 min-w-56">NAMA KOMPONEN</th>
                  <th className="py-3 px-3 text-center min-w-28">SERIAL NUMBER</th>
                  <th className="py-3 px-3 text-center min-w-24">HM PASANG</th>
                  <th className="py-3 px-3 text-center min-w-32">HM UNIT TERKINI</th>
                  <th className="py-3 px-3 text-center min-w-28">LIFETIME COMPONENT</th>
                  <th className="py-3 px-3 text-center min-w-28">RUNNING HM</th>
                  <th className="py-3 px-4 text-center min-w-36">SISA JAM & UMUR</th>
                  <th className="py-3 px-3 text-center min-w-28">TGL RENCANA</th>
                  <th className="py-3 px-3 text-center min-w-32">STATUS</th>
                  <th className="py-3 px-4 text-right min-w-32">ESTIMASI BIAYA</th>
                  <th className="py-3 px-3 text-center w-20">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-16 text-center bg-white">
                      <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#e95623] shadow-2xs">
                          <History size={24} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-800">
                            Belum Ada Data Historical Component
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Tabel siap menerima data. Klik tombol{" "}
                            <span
                              onClick={() => {
                                setEditingItem(null);
                                setIsModalOpen(true);
                              }}
                              className="font-bold text-[#e95623] cursor-pointer hover:underline"
                            >
                              + Tambah Komponen
                            </span>{" "}
                            untuk mencatat riwayat komponen unit baru.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const m = item.metrics;

                    // Progress bar color based on status
                    let barColor = "bg-emerald-500";
                    let statusBadge = (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        MONITORING
                      </span>
                    );

                    if (m.status === "CRITICAL") {
                      barColor = "bg-rose-500";
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          CRITICAL
                        </span>
                      );
                    } else if (m.status === "PREPARE") {
                      barColor = "bg-amber-500";
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          PERSIAPAN PR
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors bg-white font-medium"
                      >
                        {/* NO */}
                        <td className="py-3.5 px-3 text-center text-slate-500 font-semibold">
                          {idx + 1}
                        </td>

                        {/* NO. UNIT */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                            {item.unitCode}
                          </span>
                        </td>

                        {/* NAMA KOMPONEN */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 leading-snug">
                              {item.componentName}
                            </div>
                            {item.componentDescription && (
                              <div className="text-[10px] text-slate-500 leading-snug">
                                {item.componentDescription}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* SERIAL NUMBER */}
                        <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-600">
                          {item.serialNumber || "-"}
                        </td>

                        {/* HM PASANG */}
                        <td className="py-3.5 px-3 text-center text-slate-600">
                          {item.hmPasang.toLocaleString("id-ID")} Jam
                        </td>

                        {/* HM UNIT TERKINI */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="space-y-0.5">
                            <div className="font-bold text-blue-700">
                              {item.hmUnitTerkini.toLocaleString("id-ID")} Jam
                            </div>
                            <div className="flex items-center justify-center gap-1 text-[9.5px] text-emerald-600 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Daily HM Sync</span>
                            </div>
                          </div>
                        </td>

                        {/* LIFETIME COMPONENT */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                          {m.lifetimeComponent.toLocaleString("id-ID")} Jam
                        </td>

                        {/* RUNNING HM */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                          {m.runningHm.toLocaleString("id-ID")} Jam
                        </td>

                        {/* SISA JAM & UMUR */}
                        <td className="py-3.5 px-4 text-center min-w-36">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={`font-black ${
                                  m.status === "CRITICAL"
                                    ? "text-rose-600"
                                    : m.status === "PREPARE"
                                    ? "text-amber-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                {m.sisaJam.toLocaleString("id-ID")} Jam
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {m.umurPersen}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${Math.min(100, m.umurPersen)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* TGL RENCANA */}
                        <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-700">
                          {m.tglRencana || "-"}
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-3 text-center">
                          {statusBadge}
                        </td>

                        {/* ESTIMASI BIAYA */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800 font-mono">
                          {formatRupiah(item.estimasiBiaya)}
                        </td>

                        {/* AKSI */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Komponen"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.componentName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Komponen"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PLAN COMPONENT REPLACEMENT VIEW */}
        {activeTab === "plan" && (
          <div className="divide-y divide-slate-200">
            {Object.keys(groupedPlanItems).length === 0 ? (
              <div className="py-16 text-center bg-white">
                <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#e95623] shadow-2xs">
                    <Calendar size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">
                      Belum Ada Data Plan Component Replacement
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Jadwal rencana penggantian komponen belum dibuat. Klik tombol{" "}
                      <span
                        onClick={() => {
                          setEditingPlanItem(null);
                          setIsPlanModalOpen(true);
                        }}
                        className="font-bold text-[#e95623] cursor-pointer hover:underline"
                      >
                        + Input Plan Replacement
                      </span>{" "}
                      untuk menambahkan jadwal baru.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              Object.entries(groupedPlanItems).map(([period, groupItems]) => (
                <div key={period} className="p-4 sm:p-6 space-y-3 bg-white">
                  {/* Group Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e95623]" />
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">
                        Plan Replacement {period}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {groupItems.length} Item
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setActivePlanMonthForAdd(period);
                        setEditingPlanItem(null);
                        setIsPlanModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#e95623] hover:text-[#c44114] flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus size={14} />
                      <span>Tambah Jadwal {period}</span>
                    </button>
                  </div>

                  {/* Table matching user image exactly */}
                  <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse min-w-300 text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-[10.5px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300 select-none">
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 w-12">NO</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-24">SITE</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-24">NO UNIT</th>
                          <th className="py-2.5 px-4 text-center border-r border-slate-300 min-w-36">COMPONENT</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-24">PLAN HM</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-24">LAST HM</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-36">ACTUAL DATE REPLACEMENT</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-36">ACTUAL HM REPLACEMENT</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-32">HM LAST REPLACEMENT</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-28 bg-orange-50/50 text-[#e95623]">LIFETIME</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300 min-w-36">SOURCE COMPONENT</th>
                          <th className="py-2.5 px-4 text-center border-r border-slate-300 min-w-44">REMARK</th>
                          <th className="py-2.5 px-3 text-center w-24">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {groupItems.map((item, idx) => {
                          // Formula: Lifetime Adalah formula dari Actual HM Replacement – HM Last Replacement
                          const actNum = item.actualHm !== null && item.actualHm !== undefined ? Number(item.actualHm) : null;
                          const calculatedLifetime = actNum !== null && actNum > 0
                            ? Math.max(0, actNum - (item.hmLastReplacement || 0))
                            : 0;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors font-medium">
                              {/* NO */}
                              <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                                {idx + 1}
                              </td>

                              {/* SITE */}
                              <td className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                                {item.site}
                              </td>

                              {/* NO UNIT */}
                              <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-200">
                                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                  {item.unitCode}
                                </span>
                              </td>

                              {/* COMPONENT */}
                              <td className="py-3 px-4 text-center font-bold text-slate-900 border-r border-slate-200">
                                {item.component}
                              </td>

                              {/* PLAN HM */}
                              <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800 border-r border-slate-200">
                                {item.planHm ? item.planHm.toLocaleString("id-ID") : "-"}
                              </td>

                              {/* LAST HM */}
                              <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800 border-r border-slate-200">
                                {item.lastHm ? item.lastHm.toLocaleString("id-ID") : "-"}
                              </td>

                              {/* ACTUAL DATE REPLACEMENT */}
                              <td className="py-3 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                                {item.actualDate || ""}
                              </td>

                              {/* ACTUAL HM REPLACEMENT */}
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                                {item.actualHm !== null && item.actualHm !== undefined && item.actualHm !== 0
                                  ? item.actualHm.toLocaleString("id-ID")
                                  : ""}
                              </td>

                              {/* HM LAST REPLACEMENT */}
                              <td className="py-3 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                                {item.hmLastReplacement !== undefined ? item.hmLastReplacement.toLocaleString("id-ID") : 0}
                              </td>

                              {/* LIFETIME (FORMULA: Actual HM Replacement – HM Last Replacement) */}
                              <td className="py-3 px-3 text-center font-mono font-black text-slate-900 border-r border-slate-200 bg-orange-50/30">
                                {calculatedLifetime.toLocaleString("id-ID")}
                              </td>

                              {/* SOURCE COMPONENT */}
                              <td className="py-3 px-3 text-center font-semibold text-slate-800 border-r border-slate-200">
                                {item.sourceComponent || ""}
                              </td>

                              {/* REMARK */}
                              <td className="py-3 px-4 text-center font-semibold text-slate-800 border-r border-slate-200">
                                {item.remark || ""}
                              </td>

                              {/* AKSI */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingPlanItem(item);
                                      setIsPlanModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-[#e95623] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit / Catat Realisasi"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlanItem(item.id, item.unitCode, item.component)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Rencana"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Input Form: Historical Component */}
      <HistoricalComponentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveModal}
        initialData={editingItem}
        site={selectedSite === "ALL" ? "Senyiur" : selectedSite}
      />

      {/* Modal Input Form: Plan Component Replacement */}
      <PlanReplacementModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlanItem(null);
        }}
        onSave={handleSavePlanModal}
        initialData={editingPlanItem}
        defaultSite={selectedSite === "MuaraPahu" ? "MUARA PAHU" : "SENYIUR"}
        defaultMonthYear={activePlanMonthForAdd}
      />
    </div>
  );
};
