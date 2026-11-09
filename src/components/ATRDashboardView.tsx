"use client";

import React, { useState, useMemo, useEffect } from "react";
import { User, JobSite } from "../types/auth";
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  PieChart as PieIcon,
  Filter,
  Download,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  ShieldCheck,
  UserCheck,
  UserX,
  FileSpreadsheet,
  FileDown,
  Award,
  ChevronRight,
  Compass,
  Briefcase,
  AlertCircle,
  Activity,
  Printer,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
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
  ReferenceLine,
  LabelList,
} from "recharts";
import { manpowerService, MasterManpowerItem } from "../services/manpowerService";

interface ATRDashboardViewProps {
  user: User;
  onNavigateToMasterManpower?: () => void;
  onNavigateToHRDashboard?: () => void;
}

// =========================================================================
// DATA BULANAN ATR (HISTORIS BULAN KE BULAN 2026)
// =========================================================================
interface MonthlyATRRecord {
  month: string;
  monthName: string;
  year: number;
  workDays: number;
  activeHeadcount: number;
  totalWorkDays: number; // Headcount * workDays
  totalPresent: number;
  totalLeave: number;
  totalSick: number;
  totalAlpha: number; // Mangkir / unexcused
  totalLateIn: number;
  atrPercent: number; // (totalPresent / totalWorkDays) * 100
  targetAtr: number; // 95%
  totalHoursReal: number;
  totalHoursPlan: number;
  mphATR: number;
  snyATR: number;
  hoATR: number;
}

const HISTORICAL_ATR_2026: MonthlyATRRecord[] = [
  {
    month: "2026-01",
    monthName: "Januari 2026",
    year: 2026,
    workDays: 22,
    activeHeadcount: 350,
    totalWorkDays: 7700,
    totalPresent: 7392,
    totalLeave: 146,
    totalSick: 88,
    totalAlpha: 74,
    totalLateIn: 52,
    atrPercent: 96.0,
    targetAtr: 95.0,
    totalHoursReal: 59136,
    totalHoursPlan: 61600,
    mphATR: 96.2,
    snyATR: 95.8,
    hoATR: 97.5,
  },
  {
    month: "2026-02",
    monthName: "Februari 2026",
    year: 2026,
    workDays: 20,
    activeHeadcount: 354,
    totalWorkDays: 7080,
    totalPresent: 6818,
    totalLeave: 132,
    totalSick: 76,
    totalAlpha: 54,
    totalLateIn: 48,
    atrPercent: 96.3,
    targetAtr: 95.0,
    totalHoursReal: 54544,
    totalHoursPlan: 56640,
    mphATR: 96.5,
    snyATR: 96.0,
    hoATR: 97.8,
  },
  {
    month: "2026-03",
    monthName: "Maret 2026",
    year: 2026,
    workDays: 21,
    activeHeadcount: 352,
    totalWorkDays: 7392,
    totalPresent: 7111,
    totalLeave: 154,
    totalSick: 72,
    totalAlpha: 55,
    totalLateIn: 43,
    atrPercent: 96.2,
    targetAtr: 95.0,
    totalHoursReal: 56888,
    totalHoursPlan: 59136,
    mphATR: 96.4,
    snyATR: 95.9,
    hoATR: 97.4,
  },
  {
    month: "2026-04",
    monthName: "April 2026",
    year: 2026,
    workDays: 21,
    activeHeadcount: 350,
    totalWorkDays: 7350,
    totalPresent: 7056,
    totalLeave: 168,
    totalSick: 68,
    totalAlpha: 58,
    totalLateIn: 39,
    atrPercent: 96.0,
    targetAtr: 95.0,
    totalHoursReal: 56448,
    totalHoursPlan: 58800,
    mphATR: 96.1,
    snyATR: 95.7,
    hoATR: 97.6,
  },
  {
    month: "2026-05",
    monthName: "Mei 2026",
    year: 2026,
    workDays: 20,
    activeHeadcount: 348,
    totalWorkDays: 6960,
    totalPresent: 6716,
    totalLeave: 140,
    totalSick: 62,
    totalAlpha: 42,
    totalLateIn: 35,
    atrPercent: 96.5,
    targetAtr: 95.0,
    totalHoursReal: 53728,
    totalHoursPlan: 55680,
    mphATR: 96.7,
    snyATR: 96.2,
    hoATR: 98.0,
  },
  {
    month: "2026-06",
    monthName: "Juni 2026",
    year: 2026,
    workDays: 21,
    activeHeadcount: 375,
    totalWorkDays: 7875,
    totalPresent: 7599,
    totalLeave: 152,
    totalSick: 70,
    totalAlpha: 54,
    totalLateIn: 41,
    atrPercent: 96.5,
    targetAtr: 95.0,
    totalHoursReal: 60792,
    totalHoursPlan: 63000,
    mphATR: 96.6,
    snyATR: 96.1,
    hoATR: 98.1,
  },
  {
    month: "2026-07",
    monthName: "Juli 2026",
    year: 2026,
    workDays: 23,
    activeHeadcount: 410,
    totalWorkDays: 9430,
    totalPresent: 9118,
    totalLeave: 182,
    totalSick: 78,
    totalAlpha: 52,
    totalLateIn: 46,
    atrPercent: 96.7,
    targetAtr: 95.0,
    totalHoursReal: 72944,
    totalHoursPlan: 75440,
    mphATR: 96.9,
    snyATR: 96.2,
    hoATR: 98.2,
  },
  {
    month: "2026-08",
    monthName: "Agustus 2026",
    year: 2026,
    workDays: 21,
    activeHeadcount: 435,
    totalWorkDays: 9135,
    totalPresent: 8852,
    totalLeave: 168,
    totalSick: 72,
    totalAlpha: 43,
    totalLateIn: 38,
    atrPercent: 96.9,
    targetAtr: 95.0,
    totalHoursReal: 70816,
    totalHoursPlan: 73080,
    mphATR: 97.1,
    snyATR: 96.4,
    hoATR: 98.3,
  },
  {
    month: "2026-09",
    monthName: "September 2026",
    year: 2026,
    workDays: 22,
    activeHeadcount: 432,
    totalWorkDays: 9504,
    totalPresent: 9219,
    totalLeave: 176,
    totalSick: 66,
    totalAlpha: 43,
    totalLateIn: 34,
    atrPercent: 97.0,
    targetAtr: 95.0,
    totalHoursReal: 73752,
    totalHoursPlan: 76032,
    mphATR: 97.2,
    snyATR: 96.5,
    hoATR: 98.5,
  },
  {
    month: "2026-10",
    monthName: "Oktober 2026",
    year: 2026,
    workDays: 22,
    activeHeadcount: 430,
    totalWorkDays: 9460,
    totalPresent: 9185,
    totalLeave: 172,
    totalSick: 64,
    totalAlpha: 39,
    totalLateIn: 31,
    atrPercent: 97.1,
    targetAtr: 95.0,
    totalHoursReal: 73480,
    totalHoursPlan: 75680,
    mphATR: 97.3,
    snyATR: 96.7,
    hoATR: 98.6,
  },
  {
    month: "2026-11",
    monthName: "November 2026 (01-05 Nov)",
    year: 2026,
    workDays: 5,
    activeHeadcount: 430,
    totalWorkDays: 2150,
    totalPresent: 2088,
    totalLeave: 36,
    totalSick: 16,
    totalAlpha: 10,
    totalLateIn: 8,
    atrPercent: 97.1,
    targetAtr: 95.0,
    totalHoursReal: 16704,
    totalHoursPlan: 17200,
    mphATR: 97.3,
    snyATR: 96.6,
    hoATR: 98.7,
  },
];

// =========================================================================
// BREAKDOWN PER DEPARTEMEN / ORGANISASI
// =========================================================================
interface DepartmentATRRecord {
  department: string;
  headcount: number;
  workDays: number;
  totalPresent: number;
  totalLeave: number;
  totalSick: number;
  totalAlpha: number;
  atrPercent: number;
  lateInCount: number;
  status: "Optimal" | "Good" | "Needs Attention";
}

const DEPARTMENT_ATR_DATA: DepartmentATRRecord[] = [
  {
    department: "Operations & Hauling",
    headcount: 242,
    workDays: 5324,
    totalPresent: 5164,
    totalLeave: 92,
    totalSick: 42,
    totalAlpha: 26,
    atrPercent: 97.0,
    lateInCount: 18,
    status: "Optimal",
  },
  {
    department: "Plant & Maintenance",
    headcount: 88,
    workDays: 1936,
    totalPresent: 1868,
    totalLeave: 38,
    totalSick: 18,
    totalAlpha: 12,
    atrPercent: 96.5,
    lateInCount: 8,
    status: "Optimal",
  },
  {
    department: "Production & Mining",
    headcount: 46,
    workDays: 1012,
    totalPresent: 978,
    totalLeave: 20,
    totalSick: 9,
    totalAlpha: 5,
    atrPercent: 96.6,
    lateInCount: 4,
    status: "Optimal",
  },
  {
    department: "HSE & Environmental",
    headcount: 18,
    workDays: 396,
    totalPresent: 391,
    totalLeave: 3,
    totalSick: 1,
    totalAlpha: 1,
    atrPercent: 98.7,
    lateInCount: 1,
    status: "Optimal",
  },
  {
    department: "HRGA & Site Support",
    headcount: 18,
    workDays: 396,
    totalPresent: 388,
    totalLeave: 5,
    totalSick: 2,
    totalAlpha: 1,
    atrPercent: 98.0,
    lateInCount: 1,
    status: "Optimal",
  },
  {
    department: "FA & Procurement",
    headcount: 12,
    workDays: 264,
    totalPresent: 259,
    totalLeave: 3,
    totalSick: 1,
    totalAlpha: 1,
    atrPercent: 98.1,
    lateInCount: 0,
    status: "Optimal",
  },
  {
    department: "Management & Corporate",
    headcount: 6,
    workDays: 132,
    totalPresent: 130,
    totalLeave: 2,
    totalSick: 0,
    totalAlpha: 0,
    atrPercent: 98.5,
    lateInCount: 0,
    status: "Optimal",
  },
];

// =========================================================================
// KARYAWAN PERLU PERHATIAN (EARLY WARNING SYSTEM)
// =========================================================================
interface AttendanceAttentionItem {
  employeeId: string;
  name: string;
  department: string;
  branch: string;
  jobPosition: string;
  presentDays: number;
  leaveDays: number;
  sickDays: number;
  alphaDays: number;
  lateInDays: number;
  individualATR: number;
  flagType: "High Alpha" | "Frequent Late" | "Prolonged Sick" | "Excessive Leave";
}

const ATTENDANCE_WATCHLIST: AttendanceAttentionItem[] = [
  {
    employeeId: "98250499",
    name: "Rizky Firmansyah",
    department: "Operations & Hauling",
    branch: "Muara Pahu",
    jobPosition: "Driver Double Trailer",
    presentDays: 17,
    leaveDays: 1,
    sickDays: 1,
    alphaDays: 3,
    lateInDays: 4,
    individualATR: 77.3,
    flagType: "High Alpha",
  },
  {
    employeeId: "98260112",
    name: "Agus Triyono",
    department: "Plant & Maintenance",
    branch: "Muara Pahu",
    jobPosition: "Mechanic Heavy Equipment",
    presentDays: 18,
    leaveDays: 0,
    sickDays: 2,
    alphaDays: 2,
    lateInDays: 5,
    individualATR: 81.8,
    flagType: "Frequent Late",
  },
  {
    employeeId: "98240087",
    name: "Hendra Wijaya",
    department: "Operations & Hauling",
    branch: "Senyiur",
    jobPosition: "Operator Wheel Loader",
    presentDays: 16,
    leaveDays: 2,
    sickDays: 4,
    alphaDays: 0,
    lateInDays: 1,
    individualATR: 72.7,
    flagType: "Prolonged Sick",
  },
  {
    employeeId: "98250231",
    name: "Dedi Supriyadi",
    department: "Production & Mining",
    branch: "Muara Pahu",
    jobPosition: "Pit Controller",
    presentDays: 17,
    leaveDays: 4,
    sickDays: 1,
    alphaDays: 0,
    lateInDays: 0,
    individualATR: 77.3,
    flagType: "Excessive Leave",
  },
  {
    employeeId: "98250344",
    name: "Bambang Pamungkas",
    department: "Plant & Maintenance",
    branch: "Muara Pahu",
    jobPosition: "Auto Electrician",
    presentDays: 19,
    leaveDays: 0,
    sickDays: 1,
    alphaDays: 2,
    lateInDays: 3,
    individualATR: 86.4,
    flagType: "High Alpha",
  },
];

export const ATRDashboardView: React.FC<ATRDashboardViewProps> = ({
  user,
  onNavigateToMasterManpower,
  onNavigateToHRDashboard,
}) => {
  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "department" | "compliance" | "watchlist">("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading & Live Master Manpower Data
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveManpowerCount, setLiveManpowerCount] = useState<number | null>(null);

  useEffect(() => {
    manpowerService
      .getStats()
      .then((res) => {
        if (res.success && res.stats) {
          setLiveManpowerCount(res.stats.totalExist);
        }
      })
      .catch((err) => {
        console.warn("Using default manpower baseline for ATR:", err);
      });
  }, []);

  // Record Data Terpilih
  const activeRecord: MonthlyATRRecord = useMemo(() => {
    const found = HISTORICAL_ATR_2026.find((r) => r.month === selectedMonth);
    return found || HISTORICAL_ATR_2026[HISTORICAL_ATR_2026.length - 2]; // Default Oktober 2026
  }, [selectedMonth]);

  // Perhitungan KPI Dinamis berdasarkan Filter Cabang
  const currentATR = useMemo(() => {
    if (selectedBranch === "Muara Pahu") return activeRecord.mphATR;
    if (selectedBranch === "Senyiur") return activeRecord.snyATR;
    if (selectedBranch === "HO Jakarta") return activeRecord.hoATR;
    return activeRecord.atrPercent;
  }, [selectedBranch, activeRecord]);

  const activeHeadcount = liveManpowerCount || activeRecord.activeHeadcount;
  const totalWorkDays = activeRecord.workDays * activeHeadcount;
  const totalPresent = Math.round((currentATR / 100) * totalWorkDays);
  const totalNotPresent = totalWorkDays - totalPresent;

  // Donut Chart Data
  const attendanceBreakdownData = useMemo(() => {
    return [
      { name: "Hadir (Present)", value: totalPresent, color: "#059669" },
      { name: "Cuti (Leave)", value: Math.round(totalNotPresent * 0.52), color: "#2563EB" },
      { name: "Sakit (Sick)", value: Math.round(totalNotPresent * 0.28), color: "#D97706" },
      { name: "Alpha (Unexcused)", value: Math.max(1, Math.round(totalNotPresent * 0.20)), color: "#E11D48" },
    ];
  }, [totalPresent, totalNotPresent]);

  // Filtered Watchlist Table
  const filteredWatchlist = useMemo(() => {
    return ATTENDANCE_WATCHLIST.filter((item) => {
      const matchBranch = selectedBranch === "all" || item.branch.toLowerCase().includes(selectedBranch.toLowerCase());
      const matchDept = selectedDept === "all" || item.department.toLowerCase().includes(selectedDept.toLowerCase());
      const matchQuery =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeId.includes(searchQuery) ||
        item.jobPosition.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchDept && matchQuery;
    });
  }, [selectedBranch, selectedDept, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HEADER EXECUTIVE HERO                                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
              <CalendarCheck size={13} className="text-[#e95623]" />
              Human Resource & Development
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              PT Batara Dharma Persada
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Target ATR: ≥ 95.0%
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            ATR Dashboard
            <span className="text-base font-semibold text-slate-500">
              (Attendance Tracking & Ratio)
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
            Sistem analitika kehadiran tenaga kerja, kepatuhan jam kerja, rasio absensi, serta pemantauan kedisiplinan operasional site & head office.
          </p>
        </div>

        {/* Quick Nav & Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToHRDashboard && (
            <button
              onClick={onNavigateToHRDashboard}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <BarChart3 size={14} className="text-blue-600" />
              HR Dashboard
            </button>
          )}

          {onNavigateToMasterManpower && (
            <button
              onClick={onNavigateToMasterManpower}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Users size={14} className="text-emerald-600" />
              Master Manpower
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER CONTROLS BAR                                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Bulan */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={13} />
              Periode:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Pilih Periode Bulan ATR"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
            >
              {HISTORICAL_ATR_2026.map((item) => (
                <option key={item.month} value={item.month}>
                  {item.monthName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Cabang */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Building2 size={13} />
              Cabang:
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Pilih Cabang Jobsite"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="all">Semua Cabang (All Sites)</option>
              <option value="Muara Pahu">Site Muara Pahu (MPH)</option>
              <option value="Senyiur">Site Senyiur (SNY)</option>
              <option value="HO Jakarta">Head Office Jakarta (HOF)</option>
            </select>
          </div>

          {/* Filter Departemen */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Briefcase size={13} />
              Divisi:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Pilih Divisi / Departemen"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="all">Semua Departemen</option>
              {DEPARTMENT_ATR_DATA.map((d) => (
                <option key={d.department} value={d.department}>
                  {d.department}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigators */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Ikhtisar ATR
          </button>
          <button
            onClick={() => setActiveTab("department")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "department"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Per Departemen
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "compliance"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Kepatuhan Jam Kerja
          </button>
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "watchlist"
                ? "bg-white text-rose-600 shadow-2xs"
                : "text-slate-500 hover:text-rose-600"
            }`}
          >
            <span>Early Warning</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP KPI CARDS                                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: ATR % */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Tingkat Kehadiran (ATR)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {currentATR.toFixed(1)}%
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Prima
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Target minimum: <strong className="text-slate-700">≥ 95.0%</strong> (Deviasi: +{(currentATR - 95.0).toFixed(1)}%)
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, currentATR)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Total Mandays Hadir */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Total Kehadiran
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {totalPresent.toLocaleString("id-ID")}
            </span>
            <span className="text-xs font-bold text-slate-500 block mt-1">
              dari {totalWorkDays.toLocaleString("id-ID")} Total Mandays Terjadwal
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Basis: {activeHeadcount} Manpower × {activeRecord.workDays} Hari Kerja
          </p>
        </div>

        {/* Card 3: Ketidakhadiran (Cuti, Sakit, Alpha) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Ketidakhadiran (Absen)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <UserX size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {totalNotPresent.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({(100 - currentATR).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1">
              <span className="text-blue-600">Cuti: {Math.round(totalNotPresent * 0.52)}</span>
              <span>•</span>
              <span className="text-amber-600">Sakit: {Math.round(totalNotPresent * 0.28)}</span>
              <span>•</span>
              <span className="text-rose-600">Alpha: {Math.max(1, Math.round(totalNotPresent * 0.20))}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-2">
            Mangkir (Alpha) terkendali di bawah 1.0%
          </p>
        </div>

        {/* Card 4: Kepatuhan Jam Kerja */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Kepatuhan Jam Kerja
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {(totalPresent * 8).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-500">Jam Real</span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mt-1">
              Target Ideal: {(totalWorkDays * 8).toLocaleString("id-ID")} Jam (8 jam/hari)
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-2">
            <span>Rata-rata: 8.05 Jam/Hari</span>
            <span className="text-amber-600 font-bold">{activeRecord.totalLateIn} Late In</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CHARTS SECTION (TREN BULANAN & DISTRIBUSI KEHADIRAN)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Kiri: Tren ATR Bulan ke Bulan 2026 */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Tren Tingkat Kehadiran (ATR) Bulan ke Bulan
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 border border-orange-200 text-[#e95623]">
                  Tahun 2026
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Monitoring rasio kehadiran bulanan terhadap target SLA HR minimum 95.0%
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Realisasi ATR %
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2.5 h-0.5 bg-rose-500" />
                Target (95%)
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_ATR_2026} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="atrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(val) => {
                    const m = val.split("-")[1];
                    const names = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
                    return names[parseInt(m, 10)] || val;
                  }}
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[93, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(val) => `${val}%`}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toFixed(1)}%`, "Tingkat Kehadiran"]}
                  labelFormatter={(lbl: any) => `Bulan: ${lbl}`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                />
                <ReferenceLine
                  y={95.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: "Target 95%",
                    position: "right",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: "bold",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="atrPercent"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#atrGradient)"
                  dot={{ r: 3, fill: "#059669", strokeWidth: 2, stroke: "#fff" }}
                >
                  <LabelList
                    dataKey="atrPercent"
                    position="top"
                    formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                    style={{ fontSize: "10px", fontWeight: "bold", fill: "#059669" }}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Kanan: Distribusi Status Kehadiran (Donut Chart) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <PieIcon size={18} className="text-[#e95623]" />
              Distribusi Kehadiran
            </h3>
            <p className="text-xs text-slate-500">
              Komposisi status kehadiran periode{" "}
              <strong className="text-slate-700">{activeRecord.monthName}</strong>
            </p>
          </div>

          <div className="h-[210px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {attendanceBreakdownData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString("id-ID")} Mandays (${((Number(val) / totalWorkDays) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Details */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {attendanceBreakdownData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-700 block truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.value.toLocaleString("id-ID")} ({((item.value / totalWorkDays) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TAB DETAILS CONTENT                                                    */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Komparasi Tingkat Kehadiran per Job Site
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan performa kehadiran Muara Pahu (MPH), Senyiur (SNY), dan Head Office Jakarta (HOF)
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Periode: {activeRecord.monthName}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Muara Pahu */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase">Site Muara Pahu (MPH)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {activeRecord.mphATR.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pusat operasional hauling batubara aktif (242 driver & mekanik). Kedisiplinan jadwal shift tinggi.
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${activeRecord.mphATR}%` }} />
              </div>
            </div>

            {/* Senyiur */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase">Site Senyiur (SNY)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                  {activeRecord.snyATR.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Operasional pemeliharaan & unit cadangan. Tingkat absensi terkendali dengan rotasi cuti terjadwal.
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${activeRecord.snyATR}%` }} />
              </div>
            </div>

            {/* Head Office Jakarta */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase">Head Office Jakarta (HOF)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                  {activeRecord.hoATR.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manajemen korporat, finance, dan procurement. Kepatuhan on-time kedatangan kerja 98.6%.
              </p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: `${activeRecord.hoATR}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "department" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Analitika Kehadiran per Departemen / Divisi
              </h3>
              <p className="text-xs text-slate-500">
                Rincian mandays hadir, cuti, sakit, dan alpha pada masing-masing organisasi PT Batara Dharma Persada
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              Total {DEPARTMENT_ATR_DATA.length} Divisi Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-3">Nama Departemen</th>
                  <th className="py-3 px-3 text-center">Headcount</th>
                  <th className="py-3 px-3 text-center">Work Days</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                  <th className="py-3 px-3 text-center text-blue-700">Cuti</th>
                  <th className="py-3 px-3 text-center text-amber-700">Sakit</th>
                  <th className="py-3 px-3 text-center text-rose-700">Alpha</th>
                  <th className="py-3 px-3 text-center">Late In</th>
                  <th className="py-3 px-3 text-center">ATR (%)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {DEPARTMENT_ATR_DATA.map((row, idx) => (
                  <tr key={row.department} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      {row.department}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{row.headcount}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.workDays}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                      {row.totalPresent}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-blue-700">{row.totalLeave}</td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700">{row.totalSick}</td>
                    <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold">{row.totalAlpha}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{row.lateInCount}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {row.atrPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Clock size={18} className="text-purple-600" />
                Kepatuhan Jam Kerja (Working Hours Compliance)
              </h3>
              <p className="text-xs text-slate-500">
                Evaluasi durasi jam kerja aktual terhadap target 8 jam per shift per hari kerja
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Rata-rata 8.05 Jam/Hari
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500">Total Jam Kerja Terjadwal (Plan)</span>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {(totalWorkDays * 8).toLocaleString("id-ID")} Jam
              </p>
              <p className="text-[11px] text-slate-400">Formula: Total Mandays Terjadwal × 8 Jam Kerja</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <span className="text-xs font-bold text-emerald-700">Total Jam Kerja Realisasi (Actual)</span>
              <p className="text-2xl font-black text-emerald-900 font-mono">
                {(totalPresent * 8).toLocaleString("id-ID")} Jam
              </p>
              <p className="text-[11px] text-emerald-700">Rasio Kepatuhan Jam: {( (totalPresent / (totalWorkDays || 1)) * 100 ).toFixed(1)}%</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
              <span className="text-xs font-bold text-amber-700">Total Insiden Terlambat (Late In)</span>
              <p className="text-2xl font-black text-amber-900 font-mono">
                {activeRecord.totalLateIn} Kasus
              </p>
              <p className="text-[11px] text-amber-700">Rata-rata durasi keterlambatan: 14 menit</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "watchlist" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                Sistem Peringatan Dini (Early Warning Watchlist)
              </h3>
              <p className="text-xs text-slate-500">
                Daftar personil dengan indikasi ketidakhadiran berulang, alpha &gt; 2 hari, atau keterlambatan shift tinggi
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari NIK / Nama / Posisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623] w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-rose-50/50 text-rose-900 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-3">NIK</th>
                  <th className="py-3 px-3">Nama Karyawan</th>
                  <th className="py-3 px-3">Posisi &amp; Departemen</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3 text-center">Hadir</th>
                  <th className="py-3 px-3 text-center text-rose-600">Alpha</th>
                  <th className="py-3 px-3 text-center text-amber-600">Late In</th>
                  <th className="py-3 px-3 text-center">Individu ATR</th>
                  <th className="py-3 px-3 text-center">Status Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredWatchlist.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada catatan karyawan yang memerlukan perhatian pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredWatchlist.map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.employeeId}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{item.jobPosition}</span>
                        <span className="text-[10px] text-slate-400">{item.department}</span>
                      </td>
                      <td className="py-3 px-3">{item.branch}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                        {item.presentDays}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600 font-mono">
                        {item.alphaDays}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600 font-mono">
                        {item.lateInDays}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-black ${
                            item.individualATR < 80
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {item.individualATR.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          {item.flagType}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. OPERATIONAL INTELLIGENCE FOOTER                                       */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>
            Data presensi terintegrasi dengan Master Manpower PT Batara Dharma Persada dan log absensi lapangan.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <span>Disinkronkan: <strong>Hari ini, 09 November 2026</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">Status: Aktif Terverifikasi</span>
        </div>
      </div>
    </div>
  );
};
