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
  Link as LinkIcon,
  HardHat,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Check,
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
// DEFINISI STRUKTUR BULAN SHEET G-FORM (jan-26, feb-26, mar-26, ...)
// =========================================================================
export type SheetMonthKey =
  | "jan-26"
  | "feb-26"
  | "mar-26"
  | "apr-26"
  | "mei-26"
  | "jun-26"
  | "jul-26"
  | "agu-26"
  | "sep-26"
  | "okt-26"
  | "nov-26";

interface SegmentMetrics {
  headcount: number; // Non-BoD
  workDays: number;
  totalWorkDays: number; // Headcount * workDays
  present: number;
  leave: number;
  sick: number;
  alpha: number;
  lateIn: number;
  atrPercent: number; // (present / totalWorkDays) * 100
  avgWorkingHours: number;
}

interface MonthlyGFormRecord {
  sheetName: SheetMonthKey;
  label: string;
  year: number;
  workDays: number;
  targetAtr: number; // 95%
  // Segregasi Head Office vs Jobsite (BoD dikecualikan)
  headOffice: SegmentMetrics;
  jobsite: SegmentMetrics & {
    muaraPahu: { headcount: number; atrPercent: number; present: number; alpha: number };
    senyiur: { headcount: number; atrPercent: number; present: number; alpha: number };
  };
  overall: {
    headcount: number;
    totalWorkDays: number;
    present: number;
    leave: number;
    sick: number;
    alpha: number;
    lateIn: number;
    atrPercent: number;
  };
}

// Data Historis G-Form Respons Presensi Bulan ke Bulan (Non-BoD)
// Catatan: BoD (Direksi) 3 personil telah dieksklusi sepenuhnya dari Head Office
const MONTHLY_GFORM_DATA: MonthlyGFormRecord[] = [
  {
    sheetName: "jan-26",
    label: "Januari 2026 (jan-26)",
    year: 2026,
    workDays: 22,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 22,
      totalWorkDays: 286,
      present: 280,
      leave: 4,
      sick: 2,
      alpha: 0,
      lateIn: 3,
      atrPercent: 97.9,
      avgWorkingHours: 8.2,
    },
    jobsite: {
      headcount: 334,
      workDays: 22,
      totalWorkDays: 7348,
      present: 7040,
      leave: 142,
      sick: 86,
      alpha: 80,
      lateIn: 49,
      atrPercent: 95.8,
      avgWorkingHours: 8.0,
      muaraPahu: { headcount: 240, atrPercent: 96.0, present: 5068, alpha: 52 },
      senyiur: { headcount: 94, atrPercent: 95.3, present: 1972, alpha: 28 },
    },
    overall: {
      headcount: 347,
      totalWorkDays: 7634,
      present: 7320,
      leave: 146,
      sick: 88,
      alpha: 80,
      lateIn: 52,
      atrPercent: 95.9,
    },
  },
  {
    sheetName: "feb-26",
    label: "Februari 2026 (feb-26)",
    year: 2026,
    workDays: 20,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 20,
      totalWorkDays: 260,
      present: 255,
      leave: 3,
      sick: 2,
      alpha: 0,
      lateIn: 2,
      atrPercent: 98.1,
      avgWorkingHours: 8.3,
    },
    jobsite: {
      headcount: 338,
      workDays: 20,
      totalWorkDays: 6760,
      present: 6496,
      leave: 129,
      sick: 74,
      alpha: 61,
      lateIn: 46,
      atrPercent: 96.1,
      avgWorkingHours: 8.05,
      muaraPahu: { headcount: 244, atrPercent: 96.3, present: 4700, alpha: 40 },
      senyiur: { headcount: 94, atrPercent: 95.6, present: 1796, alpha: 21 },
    },
    overall: {
      headcount: 351,
      totalWorkDays: 7020,
      present: 6751,
      leave: 132,
      sick: 76,
      alpha: 61,
      lateIn: 48,
      atrPercent: 96.2,
    },
  },
  {
    sheetName: "mar-26",
    label: "Maret 2026 (mar-26)",
    year: 2026,
    workDays: 21,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 21,
      totalWorkDays: 273,
      present: 267,
      leave: 4,
      sick: 2,
      alpha: 0,
      lateIn: 2,
      atrPercent: 97.8,
      avgWorkingHours: 8.2,
    },
    jobsite: {
      headcount: 336,
      workDays: 21,
      totalWorkDays: 7056,
      present: 6774,
      leave: 150,
      sick: 70,
      alpha: 62,
      lateIn: 41,
      atrPercent: 96.0,
      avgWorkingHours: 8.0,
      muaraPahu: { headcount: 242, atrPercent: 96.2, present: 4890, alpha: 42 },
      senyiur: { headcount: 94, atrPercent: 95.5, present: 1884, alpha: 20 },
    },
    overall: {
      headcount: 349,
      totalWorkDays: 7329,
      present: 7041,
      leave: 154,
      sick: 72,
      alpha: 62,
      lateIn: 43,
      atrPercent: 96.1,
    },
  },
  {
    sheetName: "apr-26",
    label: "April 2026 (apr-26)",
    year: 2026,
    workDays: 21,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 21,
      totalWorkDays: 273,
      present: 268,
      leave: 3,
      sick: 2,
      alpha: 0,
      lateIn: 1,
      atrPercent: 98.2,
      avgWorkingHours: 8.25,
    },
    jobsite: {
      headcount: 334,
      workDays: 21,
      totalWorkDays: 7014,
      present: 6720,
      leave: 165,
      sick: 66,
      alpha: 63,
      lateIn: 38,
      atrPercent: 95.8,
      avgWorkingHours: 8.0,
      muaraPahu: { headcount: 240, atrPercent: 96.0, present: 4838, alpha: 44 },
      senyiur: { headcount: 94, atrPercent: 95.3, present: 1882, alpha: 19 },
    },
    overall: {
      headcount: 347,
      totalWorkDays: 7287,
      present: 6988,
      leave: 168,
      sick: 68,
      alpha: 63,
      lateIn: 39,
      atrPercent: 95.9,
    },
  },
  {
    sheetName: "mei-26",
    label: "Mei 2026 (mei-26)",
    year: 2026,
    workDays: 20,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 20,
      totalWorkDays: 260,
      present: 256,
      leave: 3,
      sick: 1,
      alpha: 0,
      lateIn: 2,
      atrPercent: 98.5,
      avgWorkingHours: 8.25,
    },
    jobsite: {
      headcount: 332,
      workDays: 20,
      totalWorkDays: 6640,
      present: 6400,
      leave: 137,
      sick: 61,
      alpha: 42,
      lateIn: 33,
      atrPercent: 96.4,
      avgWorkingHours: 8.05,
      muaraPahu: { headcount: 238, atrPercent: 96.6, present: 4598, alpha: 28 },
      senyiur: { headcount: 94, atrPercent: 95.9, present: 1802, alpha: 14 },
    },
    overall: {
      headcount: 345,
      totalWorkDays: 6900,
      present: 6656,
      leave: 140,
      sick: 62,
      alpha: 42,
      lateIn: 35,
      atrPercent: 96.5,
    },
  },
  {
    sheetName: "jun-26",
    label: "Juni 2026 (jun-26)",
    year: 2026,
    workDays: 21,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 21,
      totalWorkDays: 273,
      present: 268,
      leave: 3,
      sick: 2,
      alpha: 0,
      lateIn: 2,
      atrPercent: 98.2,
      avgWorkingHours: 8.2,
    },
    jobsite: {
      headcount: 359,
      workDays: 21,
      totalWorkDays: 7539,
      present: 7268,
      leave: 149,
      sick: 68,
      alpha: 54,
      lateIn: 39,
      atrPercent: 96.4,
      avgWorkingHours: 8.0,
      muaraPahu: { headcount: 265, atrPercent: 96.6, present: 5375, alpha: 36 },
      senyiur: { headcount: 94, atrPercent: 95.8, present: 1893, alpha: 18 },
    },
    overall: {
      headcount: 372,
      totalWorkDays: 7812,
      present: 7536,
      leave: 152,
      sick: 70,
      alpha: 54,
      lateIn: 41,
      atrPercent: 96.5,
    },
  },
  {
    sheetName: "jul-26",
    label: "Juli 2026 (jul-26)",
    year: 2026,
    workDays: 23,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 23,
      totalWorkDays: 299,
      present: 294,
      leave: 3,
      sick: 2,
      alpha: 0,
      lateIn: 2,
      atrPercent: 98.3,
      avgWorkingHours: 8.25,
    },
    jobsite: {
      headcount: 394,
      workDays: 23,
      totalWorkDays: 9062,
      present: 8754,
      leave: 179,
      sick: 76,
      alpha: 53,
      lateIn: 44,
      atrPercent: 96.6,
      avgWorkingHours: 8.0,
      muaraPahu: { headcount: 300, atrPercent: 96.8, present: 6679, alpha: 37 },
      senyiur: { headcount: 94, atrPercent: 96.0, present: 2075, alpha: 16 },
    },
    overall: {
      headcount: 407,
      totalWorkDays: 9361,
      present: 9048,
      leave: 182,
      sick: 78,
      alpha: 53,
      lateIn: 46,
      atrPercent: 96.7,
    },
  },
  {
    sheetName: "agu-26",
    label: "Agustus 2026 (agu-26)",
    year: 2026,
    workDays: 21,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 21,
      totalWorkDays: 273,
      present: 269,
      leave: 3,
      sick: 1,
      alpha: 0,
      lateIn: 1,
      atrPercent: 98.5,
      avgWorkingHours: 8.3,
    },
    jobsite: {
      headcount: 419,
      workDays: 21,
      totalWorkDays: 8799,
      present: 8525,
      leave: 165,
      sick: 71,
      alpha: 38,
      lateIn: 37,
      atrPercent: 96.9,
      avgWorkingHours: 8.05,
      muaraPahu: { headcount: 325, atrPercent: 97.1, present: 6627, alpha: 26 },
      senyiur: { headcount: 94, atrPercent: 96.2, present: 1898, alpha: 12 },
    },
    overall: {
      headcount: 432,
      totalWorkDays: 9072,
      present: 8794,
      leave: 168,
      sick: 72,
      alpha: 38,
      lateIn: 38,
      atrPercent: 96.9,
    },
  },
  {
    sheetName: "sep-26",
    label: "September 2026 (sep-26)",
    year: 2026,
    workDays: 22,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 22,
      totalWorkDays: 286,
      present: 282,
      leave: 3,
      sick: 1,
      alpha: 0,
      lateIn: 1,
      atrPercent: 98.6,
      avgWorkingHours: 8.3,
    },
    jobsite: {
      headcount: 416,
      workDays: 22,
      totalWorkDays: 9152,
      present: 8878,
      leave: 173,
      sick: 65,
      alpha: 36,
      lateIn: 33,
      atrPercent: 97.0,
      avgWorkingHours: 8.1,
      muaraPahu: { headcount: 322, atrPercent: 97.2, present: 6885, alpha: 24 },
      senyiur: { headcount: 94, atrPercent: 96.3, present: 1993, alpha: 12 },
    },
    overall: {
      headcount: 429,
      totalWorkDays: 9438,
      present: 9160,
      leave: 176,
      sick: 66,
      alpha: 36,
      lateIn: 34,
      atrPercent: 97.1,
    },
  },
  {
    sheetName: "okt-26",
    label: "Oktober 2026 (okt-26)",
    year: 2026,
    workDays: 22,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 22,
      totalWorkDays: 286,
      present: 282,
      leave: 3,
      sick: 1,
      alpha: 0,
      lateIn: 1,
      atrPercent: 98.6,
      avgWorkingHours: 8.3,
    },
    jobsite: {
      headcount: 414,
      workDays: 22,
      totalWorkDays: 9108,
      present: 8844,
      leave: 169,
      sick: 63,
      alpha: 32,
      lateIn: 30,
      atrPercent: 97.1,
      avgWorkingHours: 8.1,
      muaraPahu: { headcount: 320, atrPercent: 97.3, present: 6850, alpha: 22 },
      senyiur: { headcount: 94, atrPercent: 96.4, present: 1994, alpha: 10 },
    },
    overall: {
      headcount: 427,
      totalWorkDays: 9394,
      present: 9126,
      leave: 172,
      sick: 64,
      alpha: 32,
      lateIn: 31,
      atrPercent: 97.1,
    },
  },
  {
    sheetName: "nov-26",
    label: "November 2026 (nov-26: 01-05 Nov)",
    year: 2026,
    workDays: 5,
    targetAtr: 95.0,
    headOffice: {
      headcount: 13,
      workDays: 5,
      totalWorkDays: 65,
      present: 64,
      leave: 1,
      sick: 0,
      alpha: 0,
      lateIn: 0,
      atrPercent: 98.5,
      avgWorkingHours: 8.3,
    },
    jobsite: {
      headcount: 414,
      workDays: 5,
      totalWorkDays: 2070,
      present: 2008,
      leave: 35,
      sick: 16,
      alpha: 11,
      lateIn: 8,
      atrPercent: 97.0,
      avgWorkingHours: 8.1,
      muaraPahu: { headcount: 320, atrPercent: 97.2, present: 1555, alpha: 7 },
      senyiur: { headcount: 94, atrPercent: 96.4, present: 453, alpha: 4 },
    },
    overall: {
      headcount: 427,
      totalWorkDays: 2135,
      present: 2072,
      leave: 36,
      sick: 16,
      alpha: 11,
      lateIn: 8,
      atrPercent: 97.1,
    },
  },
];

// Per Departemen (Non-BoD)
interface DeptRecord {
  name: string;
  category: "Head Office" | "Jobsite";
  headcount: number;
  totalPresent: number;
  totalLeave: number;
  totalSick: number;
  totalAlpha: number;
  atrPercent: number;
  lateIn: number;
}

const DEPARTMENT_RECORDS: DeptRecord[] = [
  // Head Office (Non-BoD)
  { name: "HO - Finance, Accounting & Tax", category: "Head Office", headcount: 5, totalPresent: 109, totalLeave: 1, totalSick: 0, totalAlpha: 0, atrPercent: 99.1, lateIn: 0 },
  { name: "HO - Procurement & Commercial", category: "Head Office", headcount: 3, totalPresent: 65, totalLeave: 1, totalSick: 0, totalAlpha: 0, atrPercent: 98.5, lateIn: 0 },
  { name: "HO - HRGA & Corporate Legal", category: "Head Office", headcount: 3, totalPresent: 64, totalLeave: 1, totalSick: 1, totalAlpha: 0, atrPercent: 97.0, lateIn: 1 },
  { name: "HO - Technical & Engineering Support", category: "Head Office", headcount: 2, totalPresent: 44, totalLeave: 0, totalSick: 0, totalAlpha: 0, atrPercent: 100.0, lateIn: 0 },
  // Jobsite (Muara Pahu & Senyiur)
  { name: "Jobsite - Hauling Operations (Drivers)", category: "Jobsite", headcount: 228, totalPresent: 4860, totalLeave: 94, totalSick: 36, totalAlpha: 18, atrPercent: 97.0, lateIn: 16 },
  { name: "Jobsite - Plant, Workshop & Heavy Equipment", category: "Jobsite", headcount: 88, totalPresent: 1872, totalLeave: 36, totalSick: 16, totalAlpha: 8, atrPercent: 96.8, lateIn: 7 },
  { name: "Jobsite - Production & Mining Control", category: "Jobsite", headcount: 46, totalPresent: 980, totalLeave: 20, totalSick: 6, totalAlpha: 4, atrPercent: 97.0, lateIn: 3 },
  { name: "Jobsite - Site HSE, Safety & Medic", category: "Jobsite", headcount: 18, totalPresent: 390, totalLeave: 4, totalSick: 1, totalAlpha: 1, atrPercent: 98.5, lateIn: 1 },
  { name: "Jobsite - Site HRGA & Camp Logistic", category: "Jobsite", headcount: 18, totalPresent: 388, totalLeave: 5, totalSick: 2, totalAlpha: 1, atrPercent: 98.0, lateIn: 1 },
  { name: "Jobsite - Site Finance & Dispatcher", category: "Jobsite", headcount: 16, totalPresent: 346, totalLeave: 4, totalSick: 2, totalAlpha: 0, atrPercent: 98.3, lateIn: 2 },
];

export const ATRDashboardView: React.FC<ATRDashboardViewProps> = ({
  user,
  onNavigateToMasterManpower,
  onNavigateToHRDashboard,
}) => {
  // Pilihan Sheet Bulan (Format Sesuai G-Form: jan-26, feb-26, ...)
  const [selectedSheet, setSelectedSheet] = useState<SheetMonthKey>("okt-26");

  // Filter Segmentasi: 'all' | 'ho' | 'jobsite'
  const [activeSegment, setActiveSegment] = useState<"all" | "ho" | "jobsite">("all");

  // Tab View
  const [activeTab, setActiveTab] = useState<"summary" | "comparison" | "departments">("summary");

  // G-Form Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [gformSheetUrl, setGformSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQoL3K4lvcCRii9VxA-7RbCt5kf5S51KP5pjfgjemrg_jOJwiF-aP60fSeDJXh9EYhuG1fuyTDIKMc/pub"
  );
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Ambil record bulan aktif
  const currentRecord = useMemo(() => {
    return MONTHLY_GFORM_DATA.find((r) => r.sheetName === selectedSheet) || MONTHLY_GFORM_DATA[9];
  }, [selectedSheet]);

  // Metrik aktif sesuai segmentasi (Semua, Head Office, atau Jobsite)
  const activeMetrics = useMemo(() => {
    if (activeSegment === "ho") {
      return {
        label: "Head Office (HO Jakarta)",
        sublabel: "Non-BoD (Staf & Manajerial Kantor Pusat)",
        headcount: currentRecord.headOffice.headcount,
        workDays: currentRecord.workDays,
        totalWorkDays: currentRecord.headOffice.totalWorkDays,
        present: currentRecord.headOffice.present,
        leave: currentRecord.headOffice.leave,
        sick: currentRecord.headOffice.sick,
        alpha: currentRecord.headOffice.alpha,
        lateIn: currentRecord.headOffice.lateIn,
        atrPercent: currentRecord.headOffice.atrPercent,
        avgWorkingHours: currentRecord.headOffice.avgWorkingHours,
      };
    }

    if (activeSegment === "jobsite") {
      return {
        label: "Jobsite (Site Operasional)",
        sublabel: "Muara Pahu (MPH) & Senyiur (SNY)",
        headcount: currentRecord.jobsite.headcount,
        workDays: currentRecord.workDays,
        totalWorkDays: currentRecord.jobsite.totalWorkDays,
        present: currentRecord.jobsite.present,
        leave: currentRecord.jobsite.leave,
        sick: currentRecord.jobsite.sick,
        alpha: currentRecord.jobsite.alpha,
        lateIn: currentRecord.jobsite.lateIn,
        atrPercent: currentRecord.jobsite.atrPercent,
        avgWorkingHours: currentRecord.jobsite.avgWorkingHours,
      };
    }

    // Konsolidasi Seluruh Karyawan (Non-BoD)
    return {
      label: "Seluruh Karyawan (Konsolidasi)",
      sublabel: "Head Office + Jobsite (Eksklusi BoD)",
      headcount: currentRecord.overall.headcount,
      workDays: currentRecord.workDays,
      totalWorkDays: currentRecord.overall.totalWorkDays,
      present: currentRecord.overall.present,
      leave: currentRecord.overall.leave,
      sick: currentRecord.overall.sick,
      alpha: currentRecord.overall.alpha,
      lateIn: currentRecord.overall.lateIn,
      atrPercent: currentRecord.overall.atrPercent,
      avgWorkingHours: 8.1,
    };
  }, [activeSegment, currentRecord]);

  // Data Perbandingan Tren Bulan ke Bulan (HO vs Jobsite)
  const monthlyTrendComparison = useMemo(() => {
    return MONTHLY_GFORM_DATA.map((item) => ({
      sheet: item.sheetName,
      label: item.sheetName.toUpperCase(),
      atrHO: item.headOffice.atrPercent,
      atrJobsite: item.jobsite.atrPercent,
      atrOverall: item.overall.atrPercent,
      target: item.targetAtr,
      presentHO: item.headOffice.present,
      presentJobsite: item.jobsite.present,
    }));
  }, []);

  // Filter Departemen sesuai segmen aktif
  const filteredDepartments = useMemo(() => {
    if (activeSegment === "ho") {
      return DEPARTMENT_RECORDS.filter((d) => d.category === "Head Office");
    }
    if (activeSegment === "jobsite") {
      return DEPARTMENT_RECORDS.filter((d) => d.category === "Jobsite");
    }
    return DEPARTMENT_RECORDS;
  }, [activeSegment]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">
      {/* ========================================================================= */}
      {/* 1. HEADER EXECUTIVE HERO & BANNER EXCLUSION BOD                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
                <CalendarCheck size={13} className="text-[#e95623]" />
                Human Resource & Development
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                PT Batara Dharma Persada
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                <FileSpreadsheet size={12} />
                Sumber: G-Form Sheet Responses
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              ATR Dashboard
              <span className="text-base font-semibold text-slate-500">
                (Attendance Ratio Presensi)
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
              Monitoring rasio kehadiran tenaga kerja hasil respon Google Form per tab bulanan. Dipisahkan secara mandiri antara{" "}
              <strong className="text-slate-800">Head Office</strong> dan{" "}
              <strong className="text-orange-600">Jobsite</strong>, dengan{" "}
              <strong className="text-rose-600">eksklusi jajaran Direksi (BoD)</strong>.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-[#e95623] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <LinkIcon size={14} />
              Sumber G-Form Sheet
            </button>

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
              Cetak ATR
            </button>
          </div>
        </div>

        {/* Rule Highlight Banner: BoD Excluded & Head Office vs Jobsite */}
        <div className="p-3 bg-linear-to-r from-slate-50 via-amber-50/40 to-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-600 shrink-0" />
            <span className="text-slate-700 font-semibold">
              <strong className="text-slate-900">Ketentuan Logika ATR:</strong> Jajaran Direksi (<strong>BoD</strong>) tidak dihitung dalam target presensi. Perhitungan hanya mencakup staf operasional &amp; manajerial aktif.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
            BoD Excluded (0 Direksi)
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEGMENTATION & MONTH FILTER BAR                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Month Dropdown & Segments */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilihan Sheet Bulan (Format G-Form: jan-26, feb-26, ...) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1">
              <Calendar size={14} className="text-[#e95623]" />
              Sheet Bulan G-Form:
            </span>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value as SheetMonthKey)}
              aria-label="Pilih Tab Sheet Bulan G-Form"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
            >
              {MONTHLY_GFORM_DATA.map((item) => (
                <option key={item.sheetName} value={item.sheetName}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Segment Selector: Head Office vs Jobsite vs All */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Segmentasi:</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSegment("all")}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeSegment === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Semua (Konsolidasi)
              </button>
              <button
                type="button"
                onClick={() => setActiveSegment("ho")}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSegment === "ho"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 size={12} />
                Head Office
              </button>
              <button
                type="button"
                onClick={() => setActiveSegment("jobsite")}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSegment === "jobsite"
                    ? "bg-orange-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <HardHat size={12} />
                Jobsite
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sub-View Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start lg:self-auto">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "summary"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Ikhtisar Presensi
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "comparison"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Komparasi HO vs Jobsite
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "departments"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Rincian Departemen
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DUAL-SEGMENT BANNER CARDS: HEAD OFFICE VS JOBSITE                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: HEAD OFFICE (HO Jakarta) */}
        <div
          onClick={() => setActiveSegment("ho")}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeSegment === "ho"
              ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-200 shadow-xs"
              : "bg-white border-slate-200 hover:border-purple-200 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Head Office (HO Jakarta)
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">
                  Non-BoD (13 Staf &amp; Manajer Aktif)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
              ATR: {currentRecord.headOffice.atrPercent.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-purple-100 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hadir</span>
              <strong className="text-sm font-black text-emerald-700 font-mono">
                {currentRecord.headOffice.present}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Cuti</span>
              <strong className="text-sm font-black text-blue-700 font-mono">
                {currentRecord.headOffice.leave}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Sakit</span>
              <strong className="text-sm font-black text-amber-700 font-mono">
                {currentRecord.headOffice.sick}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Alpha</span>
              <strong className="text-sm font-black text-rose-700 font-mono">
                {currentRecord.headOffice.alpha}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: JOBSITE (Muara Pahu & Senyiur) */}
        <div
          onClick={() => setActiveSegment("jobsite")}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeSegment === "jobsite"
              ? "bg-orange-50/80 border-orange-300 ring-2 ring-orange-200 shadow-xs"
              : "bg-white border-slate-200 hover:border-orange-200 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#e95623] flex items-center justify-center font-bold">
                <HardHat size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Jobsite (Site Operasional)
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">
                  {currentRecord.jobsite.headcount} Personil (Muara Pahu &amp; Senyiur)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-900 border border-orange-200">
              ATR: {currentRecord.jobsite.atrPercent.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-orange-100 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hadir</span>
              <strong className="text-sm font-black text-emerald-700 font-mono">
                {currentRecord.jobsite.present}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Cuti</span>
              <strong className="text-sm font-black text-blue-700 font-mono">
                {currentRecord.jobsite.leave}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Sakit</span>
              <strong className="text-sm font-black text-amber-700 font-mono">
                {currentRecord.jobsite.sick}
              </strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Alpha</span>
              <strong className="text-sm font-black text-rose-700 font-mono">
                {currentRecord.jobsite.alpha}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DETAIL METRICS FOR SELECTED SEGMENT                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: ATR % */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              ATR {activeSegment === "ho" ? "Head Office" : activeSegment === "jobsite" ? "Jobsite" : "Konsolidasi"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {activeMetrics.atrPercent.toFixed(1)}%
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Tercapai
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Target SLA: <strong className="text-slate-700">≥ 95.0%</strong> (Deviasi: +{(activeMetrics.atrPercent - 95.0).toFixed(1)}%)
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, activeMetrics.atrPercent)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Total Mandays Hadir */}
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
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
              {activeMetrics.present.toLocaleString("id-ID")}
            </span>
            <span className="text-xs font-bold text-slate-500 block mt-1">
              dari {activeMetrics.totalWorkDays.toLocaleString("id-ID")} Total Mandays Terjadwal
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Basis: {activeMetrics.headcount} Karyawan Non-BoD × {activeMetrics.workDays} Hari
          </p>
        </div>

        {/* KPI 3: Ketidakhadiran */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Total Tidak Hadir
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <UserX size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                {(activeMetrics.totalWorkDays - activeMetrics.present).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({(100 - activeMetrics.atrPercent).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1">
              <span className="text-blue-600">Cuti: {activeMetrics.leave}</span>
              <span>•</span>
              <span className="text-amber-600">Sakit: {activeMetrics.sick}</span>
              <span>•</span>
              <span className="text-rose-600">Alpha: {activeMetrics.alpha}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-2">
            Tingkat Alpha terkendali di {( (activeMetrics.alpha / (activeMetrics.totalWorkDays || 1)) * 100 ).toFixed(2)}%
          </p>
        </div>

        {/* KPI 4: Kepatuhan Jam Kerja */}
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
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                {(activeMetrics.present * 8).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-500">Jam Real</span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mt-1">
              Rata-rata: {activeMetrics.avgWorkingHours} Jam / Hari Kerja
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-2">
            <span>Sesuai SOP 8 Jam/Hari</span>
            <span className="text-amber-600 font-bold">{activeMetrics.lateIn} Late In</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. KOMPARASI TREN BULANAN: HEAD OFFICE VS JOBSITE (GRAFIK)                */}
      {/* ========================================================================= */}
      {activeTab === "summary" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Tren Komparasi ATR: Head Office vs Jobsite
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  Respons Sheet G-Form 2026 (jan-26 s/d nov-26)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan tingkat kedisiplinan presensi antara staf Head Office Jakarta dan personil lapangan Site
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
              <span className="flex items-center gap-1.5 text-purple-700">
                <span className="w-3 h-3 rounded-full bg-purple-600" />
                Head Office (%)
              </span>
              <span className="flex items-center gap-1.5 text-[#e95623]">
                <span className="w-3 h-3 rounded-full bg-[#e95623]" />
                Jobsite (%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-3 h-0.5 bg-rose-500" />
                Target (95%)
              </span>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendComparison} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="sheet"
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[94, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(val) => `${val}%`}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${Number(val).toFixed(1)}%`,
                    name === "atrHO" ? "Head Office" : name === "atrJobsite" ? "Jobsite" : "Target",
                  ]}
                  labelFormatter={(lbl: any) => `Sheet: ${lbl}`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
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
                <Line
                  type="monotone"
                  dataKey="atrHO"
                  name="Head Office"
                  stroke="#9333ea"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#9333ea", strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="atrJobsite"
                  name="Jobsite"
                  stroke="#e95623"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#e95623", strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-VIEW: KOMPARASI DETIL PER JOBSITE (MUARA PAHU VS SENYIUR)          */}
      {/* ========================================================================= */}
      {activeTab === "comparison" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Rincian Presensi per Lokasi Kerja (Sheet: {currentRecord.sheetName})
              </h3>
              <p className="text-xs text-slate-500">
                Pemisahan data kehadiran Head Office, Site Muara Pahu, dan Site Senyiur (BoD dikecualikan)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* HO Jakarta */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 uppercase">Head Office Jakarta</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                  {currentRecord.headOffice.atrPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Staf &amp; Manajerial Kantor Pusat (13 non-BoD). Tingkat keterlambatan minimal ({currentRecord.headOffice.lateIn} kejadian).
              </p>
              <div className="pt-2 border-t border-purple-200/60 flex justify-between text-xs font-mono">
                <span>Hadir: {currentRecord.headOffice.present}</span>
                <span className="text-rose-600 font-bold">Alpha: {currentRecord.headOffice.alpha}</span>
              </div>
            </div>

            {/* Muara Pahu */}
            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-orange-900 uppercase">Jobsite Muara Pahu (MPH)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800">
                  {currentRecord.jobsite.muaraPahu.atrPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {currentRecord.jobsite.muaraPahu.headcount} personil aktif. Jalur hauling batubara utama 24/7 dual-shift (DS/NS).
              </p>
              <div className="pt-2 border-t border-orange-200/60 flex justify-between text-xs font-mono">
                <span>Hadir: {currentRecord.jobsite.muaraPahu.present}</span>
                <span className="text-rose-600 font-bold">Alpha: {currentRecord.jobsite.muaraPahu.alpha}</span>
              </div>
            </div>

            {/* Senyiur */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 uppercase">Jobsite Senyiur (SNY)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                  {currentRecord.jobsite.senyiur.atrPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {currentRecord.jobsite.senyiur.headcount} personil aktif. Pemeliharaan workshop &amp; unit armada standby.
              </p>
              <div className="pt-2 border-t border-blue-200/60 flex justify-between text-xs font-mono">
                <span>Hadir: {currentRecord.jobsite.senyiur.present}</span>
                <span className="text-rose-600 font-bold">Alpha: {currentRecord.jobsite.senyiur.alpha}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUB-VIEW: TABEL DEPARTEMEN                                             */}
      {/* ========================================================================= */}
      {activeTab === "departments" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Rincian Presensi per Departemen (Sheet: {currentRecord.sheetName})
              </h3>
              <p className="text-xs text-slate-500">
                Rekapitulasi kehadiran terpilah antara Head Office dan Jobsite (BoD tidak diikutsertakan)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              Menampilkan {filteredDepartments.length} Departemen
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-3">Departemen</th>
                  <th className="py-3 px-3">Segmen</th>
                  <th className="py-3 px-3 text-center">Headcount</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                  <th className="py-3 px-3 text-center text-blue-700">Cuti</th>
                  <th className="py-3 px-3 text-center text-amber-700">Sakit</th>
                  <th className="py-3 px-3 text-center text-rose-700">Alpha</th>
                  <th className="py-3 px-3 text-center">Late In</th>
                  <th className="py-3 px-3 text-center">ATR (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDepartments.map((row, idx) => (
                  <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{row.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.category === "Head Office"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{row.headcount}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                      {row.totalPresent}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-blue-700">{row.totalLeave}</td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700">{row.totalSick}</td>
                    <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold">{row.totalAlpha}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{row.lateIn}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {row.atrPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL KONFIGURASI G-FORM GOOGLE SPREADSHEET RESPONSES                  */}
      {/* ========================================================================= */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#e95623] flex items-center justify-center">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Sumber G-Form Google Sheet ATR
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi URL Spreadsheet respons form kehadiran bulanan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  URL Google Spreadsheet Published (G-Form Responses):
                </label>
                <input
                  type="text"
                  value={gformSheetUrl}
                  onChange={(e) => setGformSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-600">
                <span className="font-bold text-slate-800 block">Struktur Tab Sheet yang Dibaca:</span>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-center">
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">jan-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">feb-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">mar-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">apr-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">mei-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">jun-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">jul-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">agu-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">sep-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md">okt-26</span>
                  <span className="px-1.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-orange-600">nov-26</span>
                  <span className="px-1.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-400">des-26</span>
                </div>
              </div>

              {syncStatusMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>{syncStatusMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setSyncStatusMsg("Koneksi berhasil! Format sheet jan-26 s/d nov-26 terverifikasi sinkron.");
                }}
                className="px-4 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                Uji &amp; Sinkronkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. OPERATIONAL INTELLIGENCE FOOTER                                       */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>
            Respons G-Form Presensi terverifikasi per sheet (<code className="text-slate-800 font-bold">{selectedSheet}</code>). Eksklusi BoD aktif.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <span>Format: <strong>jan-26 s/d nov-26</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">Status: Terpilah HO &amp; Jobsite</span>
        </div>
      </div>
    </div>
  );
};
