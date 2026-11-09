"use client";

import React, { useState, useMemo, useEffect } from "react";
import { User } from "../types/auth";
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
  Award,
  Briefcase,
  Printer,
  Link as LinkIcon,
  HardHat,
  ShieldAlert,
  SlidersHorizontal,
  X,
  Check,
  Trophy,
  Gauge,
  Flame,
  UserMinus,
  Sparkles,
  Info,
  CalendarDays,
  BookOpen,
  HelpCircle,
  Building,
  CheckCircle,
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

interface ATRDashboardViewProps {
  user: User;
  onNavigateToMasterManpower?: () => void;
  onNavigateToHRDashboard?: () => void;
}

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

export type ATRScope = "jobsite" | "headoffice";

// =========================================================================
// 1. ATTENDANCE CODE DICTIONARY & MASTER REFERENCE (HO & JOBSITE)
// =========================================================================
export interface AttendanceCodeDefinition {
  code: string;
  label: string;
  category: "hadir" | "cuti" | "izin" | "pelanggaran" | "libur";
  description: string;
  scope: "all" | "jobsite" | "headoffice";
  affectsATR: boolean;
  isPaid: boolean;
  colorBg: string;
  colorText: string;
  colorBorder: string;
}

export const ATTENDANCE_CODES: AttendanceCodeDefinition[] = [
  {
    code: "H",
    label: "Hadir Tepat Waktu",
    category: "hadir",
    description: "Karyawan hadir bekerja tepat waktu (HO: Masuk ≤ 08:15; Jobsite: Hadir shift / briefing) dan memenuhi durasi kerja 8 jam.",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-emerald-50",
    colorText: "text-emerald-700",
    colorBorder: "border-emerald-200",
  },
  {
    code: "CT",
    label: "Cuti Tahunan",
    category: "cuti",
    description: "Cuti tahunan resmi yang disetujui atasan & HRD (tidak mengurangi ATR operasional).",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-blue-50",
    colorText: "text-blue-700",
    colorBorder: "border-blue-200",
  },
  {
    code: "S",
    label: "Sakit",
    category: "izin",
    description: "Ketidakhadiran karena kondisi kesehatan medis, wajib melampirkan Surat Keterangan Dokter (SKD) sah.",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-amber-50",
    colorText: "text-amber-700",
    colorBorder: "border-amber-200",
  },
  {
    code: "I",
    label: "Izin Resmi",
    category: "izin",
    description: "Izin tidak masuk kerja untuk keperluan penting/keluarga dengan persetujuan atasan sebelumnya.",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-indigo-50",
    colorText: "text-indigo-700",
    colorBorder: "border-indigo-200",
  },
  {
    code: "TL",
    label: "Terlambat (Late In)",
    category: "pelanggaran",
    description: "Masuk kerja melewati batas maksimum toleransi (HO: Masuk > 08:15 WIB; Jobsite: Terlambat shift / P5M).",
    scope: "all",
    affectsATR: true,
    isPaid: true,
    colorBg: "bg-orange-50",
    colorText: "text-orange-700",
    colorBorder: "border-orange-200",
  },
  {
    code: "PA",
    label: "Pulang Awal (Early Out)",
    category: "pelanggaran",
    description: "Pulang sebelum menyelesaikan kewajiban 8 jam kerja efektif (contoh HO: Masuk 08:00 pulang 16:30).",
    scope: "all",
    affectsATR: true,
    isPaid: true,
    colorBg: "bg-amber-50",
    colorText: "text-amber-800",
    colorBorder: "border-amber-300",
  },
  {
    code: "DL",
    label: "Dinas Luar (Business Trip)",
    category: "hadir",
    description: "Penugasan dinas di luar kantor (kunjungan site tambang Muara Pahu/Senyiur, meeting vendor/klien).",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-teal-50",
    colorText: "text-teal-700",
    colorBorder: "border-teal-200",
  },
  {
    code: "A",
    label: "Alpha / Mangkir",
    category: "pelanggaran",
    description: "Tidak hadir bekerja tanpa pemberitahuan dan tanpa keterangan yang sah (langsung memotong rasio ATR).",
    scope: "all",
    affectsATR: true,
    isPaid: false,
    colorBg: "bg-rose-50",
    colorText: "text-rose-700",
    colorBorder: "border-rose-200",
  },
  {
    code: "R",
    label: "Roster / Off Lapangan",
    category: "libur",
    description: "Jadwal cuti periodik / off roster pekerja tambang lapangan di Site Muara Pahu & Senyiur.",
    scope: "jobsite",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-slate-100",
    colorText: "text-slate-700",
    colorBorder: "border-slate-200",
  },
  {
    code: "L",
    label: "Libur Tanggal Merah",
    category: "libur",
    description: "Hari Libur Nasional & Cuti Bersama resmi kalender pemerintah untuk karyawan Head Office Jakarta.",
    scope: "headoffice",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-purple-50",
    colorText: "text-purple-700",
    colorBorder: "border-purple-200",
  },
  {
    code: "CM",
    label: "Cuti Melahirkan (Maternity)",
    category: "cuti",
    description: "Hak cuti melahirkan selama 3 bulan sesuai UU Ketenagakerjaan.",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-pink-50",
    colorText: "text-pink-700",
    colorBorder: "border-pink-200",
  },
  {
    code: "CK",
    label: "Cuti Khusus",
    category: "cuti",
    description: "Cuti pernikahan, anggota keluarga meninggal dunia, atau ibadah keagamaan (sesuai PP/PKB).",
    scope: "all",
    affectsATR: false,
    isPaid: true,
    colorBg: "bg-cyan-50",
    colorText: "text-cyan-700",
    colorBorder: "border-cyan-200",
  },
];

// =========================================================================
// 2. DATA HISTORIS ATR JOBSITE (400 PERSONIL LAPANGAN)
// =========================================================================
export interface MonthlyATRData {
  sheetName: SheetMonthKey;
  label: string;
  monthNum: number;
  workDays: number;
  headcount: number;
  totalWorkDays: number;
  present: number;
  leave: number;
  sick: number;
  alpha: number;
  lateIn: number;
  atrPercent: number;
  trendlineLinear: number;
  movingAverage3M: number | null;
  target: number;
  avgHoursPerDay: number;
}

const JOBSITE_MONTHLY_ATR: MonthlyATRData[] = [
  {
    sheetName: "jan-26",
    label: "Jan-26",
    monthNum: 1,
    workDays: 28, // Roster 13/1: 28 hari kerja, 3 hari Day-Off (R)
    headcount: 334,
    totalWorkDays: 9352,
    present: 8959,
    leave: 180,
    sick: 110,
    alpha: 103,
    lateIn: 49,
    atrPercent: 95.8,
    trendlineLinear: 95.82,
    movingAverage3M: null,
    target: 95.0,
    avgHoursPerDay: 8.02,
  },
  {
    sheetName: "feb-26",
    label: "Feb-26",
    monthNum: 2,
    workDays: 26, // Roster 13/1: 26 hari kerja, 2 hari Day-Off (R)
    headcount: 338,
    totalWorkDays: 8788,
    present: 8445,
    leave: 168,
    sick: 96,
    alpha: 79,
    lateIn: 46,
    atrPercent: 96.1,
    trendlineLinear: 95.95,
    movingAverage3M: null,
    target: 95.0,
    avgHoursPerDay: 8.05,
  },
  {
    sheetName: "mar-26",
    label: "Mar-26",
    monthNum: 3,
    workDays: 28, // Roster 13/1
    headcount: 336,
    totalWorkDays: 9408,
    present: 9032,
    leave: 200,
    sick: 93,
    alpha: 83,
    lateIn: 41,
    atrPercent: 96.0,
    trendlineLinear: 96.08,
    movingAverage3M: 95.97,
    target: 95.0,
    avgHoursPerDay: 8.01,
  },
  {
    sheetName: "apr-26",
    label: "Apr-26",
    monthNum: 4,
    workDays: 28, // Roster 13/1: 28 hari kerja, 2 hari Day-Off (R)
    headcount: 334,
    totalWorkDays: 9352,
    present: 8960,
    leave: 220,
    sick: 88,
    alpha: 84,
    lateIn: 38,
    atrPercent: 95.8,
    trendlineLinear: 96.21,
    movingAverage3M: 95.97,
    target: 95.0,
    avgHoursPerDay: 8.02,
  },
  {
    sheetName: "mei-26",
    label: "Mei-26",
    monthNum: 5,
    workDays: 28, // Roster 13/1
    headcount: 332,
    totalWorkDays: 9296,
    present: 8961,
    leave: 192,
    sick: 85,
    alpha: 58,
    lateIn: 33,
    atrPercent: 96.4,
    trendlineLinear: 96.34,
    movingAverage3M: 96.07,
    target: 95.0,
    avgHoursPerDay: 8.06,
  },
  {
    sheetName: "jun-26",
    label: "Jun-26",
    monthNum: 6,
    workDays: 28, // Roster 13/1
    headcount: 359,
    totalWorkDays: 10052,
    present: 9690,
    leave: 199,
    sick: 91,
    alpha: 72,
    lateIn: 39,
    atrPercent: 96.4,
    trendlineLinear: 96.47,
    movingAverage3M: 96.20,
    target: 95.0,
    avgHoursPerDay: 8.04,
  },
  {
    sheetName: "jul-26",
    label: "Jul-26",
    monthNum: 7,
    workDays: 28, // Roster 13/1
    headcount: 394,
    totalWorkDays: 11032,
    present: 10657,
    leave: 218,
    sick: 93,
    alpha: 64,
    lateIn: 44,
    atrPercent: 96.6,
    trendlineLinear: 96.60,
    movingAverage3M: 96.47,
    target: 95.0,
    avgHoursPerDay: 8.05,
  },
  {
    sheetName: "agu-26",
    label: "Agu-26",
    monthNum: 8,
    workDays: 28, // Roster 13/1
    headcount: 419,
    totalWorkDays: 11732,
    present: 11368,
    leave: 220,
    sick: 95,
    alpha: 49,
    lateIn: 37,
    atrPercent: 96.9,
    trendlineLinear: 96.73,
    movingAverage3M: 96.63,
    target: 95.0,
    avgHoursPerDay: 8.08,
  },
  {
    sheetName: "sep-26",
    label: "Sep-26",
    monthNum: 9,
    workDays: 28, // Roster 13/1
    headcount: 416,
    totalWorkDays: 11648,
    present: 11300,
    leave: 220,
    sick: 82,
    alpha: 46,
    lateIn: 33,
    atrPercent: 97.0,
    trendlineLinear: 96.86,
    movingAverage3M: 96.83,
    target: 95.0,
    avgHoursPerDay: 8.10,
  },
  {
    sheetName: "okt-26",
    label: "Okt-26",
    monthNum: 10,
    workDays: 28, // Roster 13/1: 28 hari kerja terjadwal (2-3 hari day-off)
    headcount: 400,
    totalWorkDays: 11200,
    present: 10875,
    leave: 199,
    sick: 79,
    alpha: 47,
    lateIn: 28,
    atrPercent: 97.1,
    trendlineLinear: 96.99,
    movingAverage3M: 97.00,
    target: 95.0,
    avgHoursPerDay: 8.12,
  },
  {
    sheetName: "nov-26",
    label: "Nov-26",
    monthNum: 11,
    workDays: 5,
    headcount: 400,
    totalWorkDays: 2000,
    present: 1942,
    leave: 32,
    sick: 15,
    alpha: 11,
    lateIn: 7,
    atrPercent: 97.1,
    trendlineLinear: 97.12,
    movingAverage3M: 97.07,
    target: 95.0,
    avgHoursPerDay: 8.11,
  },
];

// 7 Departemen Riil di Jobsite Muara Pahu & Senyiur (Total 400 personil)
// Berdasarkan Pola Roster Tambang 13/1 (28 Hari Kerja Terjadwal / Bulan)
export interface DepartmentATR {
  rank: number;
  organization: string;
  headcount: number;
  workDays: number;
  totalWorkDays: number;
  present: number;
  leave: number;
  sick: number;
  alpha: number;
  lateIn: number;
  avgHours: number;
  atrPercent: number;
  status: "Sangat Disiplin" | "Optimal" | "Perlu Perhatian";
  primaryPositions: string;
}

export const JOBSITE_DEPARTMENTS_RANKED: DepartmentATR[] = [
  {
    rank: 1,
    organization: "HSE",
    headcount: 20,
    workDays: 28,
    totalWorkDays: 560,
    present: 552,
    leave: 5,
    sick: 2,
    alpha: 1,
    lateIn: 1,
    avgHours: 8.15,
    atrPercent: 98.6,
    status: "Sangat Disiplin",
    primaryPositions: "Spv Operational HSE, Safety Officer, Paramedic",
  },
  {
    rank: 2,
    organization: "Hrga",
    headcount: 19,
    workDays: 28,
    totalWorkDays: 532,
    present: 522,
    leave: 6,
    sick: 3,
    alpha: 1,
    lateIn: 1,
    avgHours: 8.12,
    atrPercent: 98.1,
    status: "Sangat Disiplin",
    primaryPositions: "Spv Human Resource, Admin Site, Cook Helper",
  },
  {
    rank: 3,
    organization: "Operations",
    headcount: 4,
    workDays: 28,
    totalWorkDays: 112,
    present: 109,
    leave: 2,
    sick: 1,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.18,
    atrPercent: 97.7,
    status: "Sangat Disiplin",
    primaryPositions: "Spv Operation Site, Mine Dispatcher, Radio Operator",
  },
  {
    rank: 4,
    organization: "Infrastructure",
    headcount: 3,
    workDays: 28,
    totalWorkDays: 84,
    present: 81,
    leave: 2,
    sick: 1,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.14,
    atrPercent: 97.0,
    status: "Optimal",
    primaryPositions: "Spv Civil & Road Maintenance, Surveyor",
  },
  {
    rank: 5,
    organization: "Production",
    headcount: 230,
    workDays: 28,
    totalWorkDays: 6440,
    present: 6234,
    leave: 122,
    sick: 52,
    alpha: 32,
    lateIn: 22,
    avgHours: 8.12,
    atrPercent: 96.8,
    status: "Optimal",
    primaryPositions: "Driver Double Trailer, Operator Excavator, Pit Controller",
  },
  {
    rank: 6,
    organization: "Logistic",
    headcount: 15,
    workDays: 28,
    totalWorkDays: 420,
    present: 405,
    leave: 8,
    sick: 5,
    alpha: 2,
    lateIn: 2,
    avgHours: 8.10,
    atrPercent: 96.5,
    status: "Optimal",
    primaryPositions: "Spv Logistic, Fuel Attendant, Warehouse Admin",
  },
  {
    rank: 7,
    organization: "Plant",
    headcount: 109,
    workDays: 28,
    totalWorkDays: 3052,
    present: 2924,
    leave: 78,
    sick: 36,
    alpha: 14,
    lateIn: 10,
    avgHours: 8.08,
    atrPercent: 95.8,
    status: "Optimal",
    primaryPositions: "Spv Plant, Mechanic Heavy Equipment, Auto Electrician, Welder",
  },
];

// =========================================================================
// 3. DATA HISTORIS ATR HEAD OFFICE (JAKARTA) - TANGGAL MERAH LIBUR
// BoD Excluded (0 Direksi) & 7 Mantan Karyawan Dihapus (22 Personil Aktif)
// =========================================================================
const HEADOFFICE_MONTHLY_ATR: MonthlyATRData[] = [
  {
    sheetName: "jan-26",
    label: "Jan-26",
    monthNum: 1,
    workDays: 21, // Libur Tahun Baru & Isra Miraj
    headcount: 22,
    totalWorkDays: 462,
    present: 450,
    leave: 6,
    sick: 4,
    alpha: 2,
    lateIn: 3,
    atrPercent: 97.4,
    trendlineLinear: 97.40,
    movingAverage3M: null,
    target: 95.0,
    avgHoursPerDay: 8.16,
  },
  {
    sheetName: "feb-26",
    label: "Feb-26",
    monthNum: 2,
    workDays: 19, // Libur Tahun Baru Imlek
    headcount: 22,
    totalWorkDays: 418,
    present: 408,
    leave: 5,
    sick: 3,
    alpha: 2,
    lateIn: 2,
    atrPercent: 97.6,
    trendlineLinear: 97.60,
    movingAverage3M: null,
    target: 95.0,
    avgHoursPerDay: 8.18,
  },
  {
    sheetName: "mar-26",
    label: "Mar-26",
    monthNum: 3,
    workDays: 21, // Libur Hari Suci Nyepi & Idul Fitri
    headcount: 22,
    totalWorkDays: 462,
    present: 452,
    leave: 6,
    sick: 3,
    alpha: 1,
    lateIn: 2,
    atrPercent: 97.8,
    trendlineLinear: 97.80,
    movingAverage3M: 97.60,
    target: 95.0,
    avgHoursPerDay: 8.19,
  },
  {
    sheetName: "apr-26",
    label: "Apr-26",
    monthNum: 4,
    workDays: 20, // Libur Bersama Idul Fitri & Wafat Isa Almasih
    headcount: 22,
    totalWorkDays: 440,
    present: 431,
    leave: 5,
    sick: 3,
    alpha: 1,
    lateIn: 1,
    atrPercent: 98.0,
    trendlineLinear: 98.00,
    movingAverage3M: 97.80,
    target: 95.0,
    avgHoursPerDay: 8.20,
  },
  {
    sheetName: "mei-26",
    label: "Mei-26",
    monthNum: 5,
    workDays: 19, // Libur Hari Buruh, Kenaikan Isa Almasih, Waisak
    headcount: 22,
    totalWorkDays: 418,
    present: 410,
    leave: 4,
    sick: 3,
    alpha: 1,
    lateIn: 2,
    atrPercent: 98.1,
    trendlineLinear: 98.20,
    movingAverage3M: 97.97,
    target: 95.0,
    avgHoursPerDay: 8.20,
  },
  {
    sheetName: "jun-26",
    label: "Jun-26",
    monthNum: 6,
    workDays: 21, // Libur Hari Lahir Pancasila & Idul Adha
    headcount: 22,
    totalWorkDays: 462,
    present: 454,
    leave: 5,
    sick: 2,
    alpha: 1,
    lateIn: 1,
    atrPercent: 98.3,
    trendlineLinear: 98.40,
    movingAverage3M: 98.13,
    target: 95.0,
    avgHoursPerDay: 8.21,
  },
  {
    sheetName: "jul-26",
    label: "Jul-26",
    monthNum: 7,
    workDays: 22, // Libur Tahun Baru Islam
    headcount: 22,
    totalWorkDays: 484,
    present: 477,
    leave: 4,
    sick: 2,
    alpha: 1,
    lateIn: 1,
    atrPercent: 98.6,
    trendlineLinear: 98.60,
    movingAverage3M: 98.33,
    target: 95.0,
    avgHoursPerDay: 8.22,
  },
  {
    sheetName: "agu-26",
    label: "Agu-26",
    monthNum: 8,
    workDays: 21, // Libur HUT Kemerdekaan RI
    headcount: 22,
    totalWorkDays: 462,
    present: 456,
    leave: 4,
    sick: 1,
    alpha: 1,
    lateIn: 1,
    atrPercent: 98.7,
    trendlineLinear: 98.70,
    movingAverage3M: 98.53,
    target: 95.0,
    avgHoursPerDay: 8.23,
  },
  {
    sheetName: "sep-26",
    label: "Sep-26",
    monthNum: 9,
    workDays: 21, // Libur Maulid Nabi Muhammad SAW
    headcount: 22,
    totalWorkDays: 462,
    present: 457,
    leave: 3,
    sick: 2,
    alpha: 0,
    lateIn: 1,
    atrPercent: 98.9,
    trendlineLinear: 98.90,
    movingAverage3M: 98.73,
    target: 95.0,
    avgHoursPerDay: 8.24,
  },
  {
    sheetName: "okt-26",
    label: "Okt-26",
    monthNum: 10,
    workDays: 22, // Full 22 hari kerja
    headcount: 22,
    totalWorkDays: 484,
    present: 480,
    leave: 3,
    sick: 1,
    alpha: 0,
    lateIn: 0,
    atrPercent: 99.2,
    trendlineLinear: 99.10,
    movingAverage3M: 98.93,
    target: 95.0,
    avgHoursPerDay: 8.25,
  },
  {
    sheetName: "nov-26",
    label: "Nov-26",
    monthNum: 11,
    workDays: 5, // Cutoff 1-5 Nov 2026
    headcount: 22,
    totalWorkDays: 110,
    present: 109,
    leave: 1,
    sick: 0,
    alpha: 0,
    lateIn: 0,
    atrPercent: 99.1,
    trendlineLinear: 99.30,
    movingAverage3M: 99.07,
    target: 95.0,
    avgHoursPerDay: 8.24,
  },
];

// 5 Departemen Riil di Head Office Jakarta (Total 22 personil aktif non-BoD)
export const HEADOFFICE_DEPARTMENTS_RANKED: DepartmentATR[] = [
  {
    rank: 1,
    organization: "Operations",
    headcount: 3,
    workDays: 22,
    totalWorkDays: 66,
    present: 65,
    leave: 1,
    sick: 0,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.28,
    atrPercent: 99.2,
    status: "Sangat Disiplin",
    primaryPositions: "Manager Operation, Spv PMO & IT Programmer",
  },
  {
    rank: 2,
    organization: "Infrastructure",
    headcount: 1,
    workDays: 22,
    totalWorkDays: 22,
    present: 22,
    leave: 0,
    sick: 0,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.25,
    atrPercent: 98.9,
    status: "Sangat Disiplin",
    primaryPositions: "Manager Infrastructure (HO Jakarta)",
  },
  {
    rank: 3,
    organization: "FA & Procurement",
    headcount: 10,
    workDays: 22,
    totalWorkDays: 220,
    present: 218,
    leave: 2,
    sick: 0,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.22,
    atrPercent: 98.4,
    status: "Sangat Disiplin",
    primaryPositions: "Manager Finance, Manager Proc & Log, Spv Accounting, Spv Finance, Spv Procurement",
  },
  {
    rank: 4,
    organization: "Plant",
    headcount: 1,
    workDays: 22,
    totalWorkDays: 22,
    present: 22,
    leave: 0,
    sick: 0,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.20,
    atrPercent: 98.2,
    status: "Sangat Disiplin",
    primaryPositions: "Manager Plant (HO Jakarta)",
  },
  {
    rank: 5,
    organization: "Hrga",
    headcount: 7,
    workDays: 22,
    totalWorkDays: 154,
    present: 151,
    leave: 2,
    sick: 1,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.16,
    atrPercent: 97.9,
    status: "Optimal",
    primaryPositions: "Spv General Affair, Spv System & Dev, Spv C&B, Spv Recruitment, Driver Sarana, OB",
  },
];

// =========================================================================
// 4. LEADERBOARD REKAPITULASI BULANAN KARYAWAN JOBSITE (ROSTER 13/1 = 28 HK)
// =========================================================================
export interface BestAttendanceItem {
  rank: number;
  employeeId: string;
  fullName: string;
  jobPosition: string;
  organization: string;
  branchName: string;
  workDaysTotal: number;
  totalPresentDays: number;
  leaveDays: number;
  sickDays: number;
  alphaDays: number;
  lateInCount: number;
  totalMonthlyHours: number;
  avgWorkingHours: number;
  atrScore: number;
  highlight: string;
}

export interface UnderperformingAttendanceItem {
  rank: number;
  employeeId: string;
  fullName: string;
  jobPosition: string;
  organization: string;
  branchName: string;
  workDaysTotal: number;
  totalPresentDays: number;
  leaveDays: number;
  sickDays: number;
  alphaDays: number;
  lateInCount: number;
  totalMonthlyHours: number;
  avgWorkingHours: number;
  atrScore: number;
  violationReason: string;
  recommendedAction: string;
}

const JOBSITE_TOP_10_BEST: BestAttendanceItem[] = [
  {
    rank: 1,
    employeeId: "98250495",
    fullName: "Abraham Nur Fadli Rahman",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 231.0,
    avgWorkingHours: 8.25,
    atrScore: 100.0,
    highlight: "Rekap bulanan sempurna 28/28 HK hadir penuh roster 13/1, akumulasi 231.0 jam kerja, zero Late In (TL), ritase hauling prima",
  },
  {
    rank: 2,
    employeeId: "88250262",
    fullName: "A. Arya Sumange Rizal",
    jobPosition: "Spv Operational HSE",
    organization: "HSE",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 230.2,
    avgWorkingHours: 8.22,
    atrScore: 100.0,
    highlight: "Kehadiran safety briefing 100% sebulan, hadir penuh 28/28 HK (230.2 jam kerja bulanan), zero deviasi presensi HSE",
  },
  {
    rank: 3,
    employeeId: "98250405",
    fullName: "Achmad Ridho Santoso",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 229.6,
    avgWorkingHours: 8.20,
    atrScore: 100.0,
    highlight: "Top presensi koridor Senyiur, 28/28 HK hadir (229.6 jam kerja bulanan), nihil keterlambatan shift dan zero deviasi",
  },
  {
    rank: 4,
    employeeId: "98260519",
    fullName: "Abdhu Rahman",
    jobPosition: "Spv Plant",
    organization: "Plant",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 229.0,
    avgWorkingHours: 8.18,
    atrScore: 100.0,
    highlight: "Inspeksi workshop pagi konsisten sebulan, hadir penuh 28/28 HK (229.0 jam kerja), zero Late In (TL)",
  },
  {
    rank: 5,
    employeeId: "98250193",
    fullName: "Agus Sunarto",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 228.5,
    avgWorkingHours: 8.16,
    atrScore: 100.0,
    highlight: "Presensi shift malam hauling konsisten tepat waktu sebulan, hadir 28/28 HK (228.5 jam kerja bulanan)",
  },
  {
    rank: 6,
    employeeId: "98240009",
    fullName: "Agung Rubiansyah",
    jobPosition: "Spv Plant",
    organization: "Plant",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 228.2,
    avgWorkingHours: 8.15,
    atrScore: 100.0,
    highlight: "Kehadiran pemeliharaan armada 100% (28/28 HK, 228.2 jam kerja bulanan), disiplin jadwal shift harian penuh",
  },
  {
    rank: 7,
    employeeId: "88250423",
    fullName: "Ade Pratama",
    jobPosition: "Admin",
    organization: "Logistic",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 227.9,
    avgWorkingHours: 8.14,
    atrScore: 100.0,
    highlight: "Administrasi logistik tepat waktu sebulan, tapping barcode akurat 28/28 HK (227.9 jam kerja bulanan)",
  },
  {
    rank: 8,
    employeeId: "98260459",
    fullName: "A. Pallawa Rukka Rizal, SH",
    jobPosition: "Spv Human Resource",
    organization: "Hrga",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 227.4,
    avgWorkingHours: 8.12,
    atrScore: 100.0,
    highlight: "Role model kepatuhan presensi HRGA site Senyiur, hadir penuh 28/28 HK (227.4 jam kerja sebulan), zero deviasi",
  },
  {
    rank: 9,
    employeeId: "98250326",
    fullName: "Ahmad Aldian Purwanto",
    jobPosition: "Spv Production",
    organization: "Production",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 227.4,
    avgWorkingHours: 8.12,
    atrScore: 100.0,
    highlight: "Pengawasan pit Muara Pahu tepat waktu sebulan penuh, hadir 28/28 HK (227.4 jam kerja sebulan), zero Late In",
  },
  {
    rank: 10,
    employeeId: "88250163",
    fullName: "Agung Nugraha Putra Batara Isarong",
    jobPosition: "Spv System & Complience",
    organization: "HSE",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 28,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 226.8,
    avgWorkingHours: 8.10,
    atrScore: 100.0,
    highlight: "Kepatuhan SOP presensi sempurna sebulan, hadir 28/28 HK (226.8 jam kerja), zero deviasi waktu kerja",
  },
];

const JOBSITE_TOP_10_LOWEST: UnderperformingAttendanceItem[] = [
  {
    rank: 1,
    employeeId: "98250499",
    fullName: "Rizky Firmansyah",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 3,
    lateInCount: 6,
    totalMonthlyHours: 157.3,
    avgWorkingHours: 7.15,
    atrScore: 78.6,
    violationReason: "Rekap bulanan: 3 Hari Alpha (A), 3 Hari Sakit (S), 6x Terlambat Shift (TL). Hadir 22/28 HK.",
    recommendedAction: "Penerbitan Surat Peringatan (SP-1) & Konseling Disiplin Shift Produksi",
  },
  {
    rank: 2,
    employeeId: "98260112",
    fullName: "Agus Triyono",
    jobPosition: "Mechanic Heavy Equipment",
    organization: "Plant",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 4,
    alphaDays: 2,
    lateInCount: 7,
    totalMonthlyHours: 158.4,
    avgWorkingHours: 7.20,
    atrScore: 78.6,
    violationReason: "Rekap bulanan: 2 Hari Alpha (A), 4 Hari Sakit (S), 7x Terlambat (TL). Hadir 22/28 HK.",
    recommendedAction: "Panggilan Pembinaan oleh Spv Plant & Peringatan Tertulis",
  },
  {
    rank: 3,
    employeeId: "98240087",
    fullName: "Hendra Wijaya",
    jobPosition: "Operator Wheel Loader",
    organization: "Production",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 21,
    leaveDays: 0,
    sickDays: 5,
    alphaDays: 2,
    lateInCount: 4,
    totalMonthlyHours: 146.0,
    avgWorkingHours: 6.95,
    atrScore: 75.0,
    violationReason: "Rekap bulanan: 2 Hari Alpha (A), 5 Hari Sakit (S), 4x Terlambat (TL), jam kerja rata-rata < 7 jam/hari.",
    recommendedAction: "Evaluasi MCU Ulang & Validasi Surat Keterangan Sakit",
  },
  {
    rank: 4,
    employeeId: "98250344",
    fullName: "Bambang Pamungkas",
    jobPosition: "Auto Electrician",
    organization: "Plant",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 23,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 2,
    lateInCount: 5,
    totalMonthlyHours: 167.9,
    avgWorkingHours: 7.30,
    atrScore: 82.1,
    violationReason: "Rekap bulanan: 2 Hari Alpha berturut-turut, 3 Hari Sakit (S), 5x Terlambat shift (hadir 23/28 HK).",
    recommendedAction: "Konseling Roster Kerja oleh HRGA Site Muara Pahu",
  },
  {
    rank: 5,
    employeeId: "98260205",
    fullName: "Dedi Supriyadi",
    jobPosition: "Pit Controller",
    organization: "Production",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 23,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 2,
    lateInCount: 4,
    totalMonthlyHours: 169.1,
    avgWorkingHours: 7.35,
    atrScore: 82.1,
    violationReason: "Rekap bulanan: 2 Hari Alpha (A), 3 Hari Sakit (S), 4x Terlambat hadir briefing pit (hadir 23/28 HK).",
    recommendedAction: "Briefing Ulang SOP Kedisiplinan Pit Dispatch",
  },
  {
    rank: 6,
    employeeId: "88250331",
    fullName: "Fajar Nugroho",
    jobPosition: "Side Dump Spotter",
    organization: "Production",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 23,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 2,
    lateInCount: 5,
    totalMonthlyHours: 170.2,
    avgWorkingHours: 7.40,
    atrScore: 82.1,
    violationReason: "Rekap bulanan: 2 Hari Alpha (A), 3 Hari Sakit (S), 5x Terlambat shift malam (hadir 23/28 HK).",
    recommendedAction: "Pengawasan Absensi Biometrik oleh Mandor Lapangan",
  },
  {
    rank: 7,
    employeeId: "98250144",
    fullName: "Eko Prasetyo",
    jobPosition: "Mechanic Fresh Bmc",
    organization: "Plant",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 24,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 1,
    lateInCount: 4,
    totalMonthlyHours: 178.8,
    avgWorkingHours: 7.45,
    atrScore: 85.7,
    violationReason: "Rekap bulanan: 1 Hari Alpha (A), 3 Hari Sakit (S), 4x Terlambat (TL), jam kerja rata-rata 7.45 jam/hari.",
    recommendedAction: "Review Log Kehadiran Workshop & Pendampingan Lead Mechanic",
  },
  {
    rank: 8,
    employeeId: "98260388",
    fullName: "Ilham Ramadhan",
    jobPosition: "Fuel Attendant",
    organization: "Logistic",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 24,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 1,
    lateInCount: 3,
    totalMonthlyHours: 180.0,
    avgWorkingHours: 7.50,
    atrScore: 85.7,
    violationReason: "Rekap bulanan: 1 Hari Alpha (A), 3 Hari Sakit (S), 3x Terlambat di fuel station (hadir 24/28 HK).",
    recommendedAction: "Teguran Lisan Spv Logistic & Penataan Jadwal Piket",
  },
  {
    rank: 9,
    employeeId: "98240092",
    fullName: "Wahyu Hidayat",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Senyiur",
    workDaysTotal: 28,
    totalPresentDays: 24,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 1,
    lateInCount: 4,
    totalMonthlyHours: 181.2,
    avgWorkingHours: 7.55,
    atrScore: 85.7,
    violationReason: "Rekap bulanan: 1 Hari Alpha (A), 3 Hari Sakit (S), 4x Terlambat antrean hauling (hadir 24/28 HK).",
    recommendedAction: "Monitoring Disiplin Antrean Hauling Senyiur",
  },
  {
    rank: 10,
    employeeId: "86260491",
    fullName: "M. Yusuf Saputra",
    jobPosition: "Welder Workshop",
    organization: "Plant",
    branchName: "Muara Pahu",
    workDaysTotal: 28,
    totalPresentDays: 24,
    leaveDays: 0,
    sickDays: 3,
    alphaDays: 1,
    lateInCount: 3,
    totalMonthlyHours: 182.4,
    avgWorkingHours: 7.60,
    atrScore: 85.7,
    violationReason: "Rekap bulanan: 1 Hari Alpha (A), 3 Hari Sakit (S), 3x Terlambat dan checkout sebelum shift (hadir 24/28 HK).",
    recommendedAction: "Pemeriksaan Form Izin Keluar Site oleh HRGA",
  },
];

// =========================================================================
// 5. LEADERBOARD REKAPITULASI BULANAN HEAD OFFICE (JAKARTA)
// 22 Personil Aktif Non-BoD, 22 Hari Kerja Terjadwal Bulanan (Tanggal Merah Libur)
// =========================================================================
const HEADOFFICE_TOP_10_BEST: BestAttendanceItem[] = [
  {
    rank: 1,
    employeeId: "99250227",
    fullName: "Dzaky Athariq Ferreira",
    jobPosition: "Spv Pmo & IT Programmer",
    organization: "Operations",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 181.5,
    avgWorkingHours: 8.25,
    atrScore: 100.0,
    highlight: "Rekap bulanan sempurna 22/22 HK hadir penuh, akumulasi 181.5 jam kerja bulanan, zero Late In (TL), jam kerja fleksibel terpenuhi penuh",
  },
  {
    rank: 2,
    employeeId: "99240008",
    fullName: "Berliana Raudhatu Nisa Utami",
    jobPosition: "Spv Finance",
    organization: "FA & Procurement",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 181.5,
    avgWorkingHours: 8.25,
    atrScore: 100.0,
    highlight: "Presensi keuangan konsisten, hadir penuh 22/22 HK (181.5 jam kerja sebulan), rekapitulasi cash flow tepat waktu",
  },
  {
    rank: 3,
    employeeId: "99250372",
    fullName: "Kemal Musthafa Rajabi",
    jobPosition: "Spv Pmo & IT Programmer",
    organization: "Operations",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 181.5,
    avgWorkingHours: 8.25,
    atrScore: 100.0,
    highlight: "Hadir penuh 22/22 HK (181.5 jam kerja sebulan), zero Late In (TL), jam kerja efektif harian selalu di atas 8 jam standar",
  },
  {
    rank: 4,
    employeeId: "99250164",
    fullName: "Susanto",
    jobPosition: "Manager Finance",
    organization: "FA & Procurement",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 183.3,
    avgWorkingHours: 8.33,
    atrScore: 100.0,
    highlight: "Disiplin manajerial prima, kepatuhan batas masuk 08:15 sempurna (22/22 HK hadir, 183.3 jam kerja sebulan), 0 hari mangkir",
  },
  {
    rank: 5,
    employeeId: "99250360",
    fullName: "Aldi Mezofanti",
    jobPosition: "Manager Infrastructure",
    organization: "Infrastructure",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 183.3,
    avgWorkingHours: 8.33,
    atrScore: 100.0,
    highlight: "Presensi prima 22/22 HK (183.3 jam kerja sebulan), koordinasi proyek jalan hauling site konsisten tepat waktu",
  },
  {
    rank: 6,
    employeeId: "99240004",
    fullName: "Dio Tragitza Rescha",
    jobPosition: "Manager Operation",
    organization: "Operations",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 183.3,
    avgWorkingHours: 8.33,
    atrScore: 100.0,
    highlight: "Presensi operasional prima, 22/22 HK hadir (183.3 jam kerja sebulan), kepatuhan SOP jam kerja 100%",
  },
  {
    rank: 7,
    employeeId: "99240019",
    fullName: "Dadang Setyawan",
    jobPosition: "Manager Plant",
    organization: "Plant",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 181.5,
    avgWorkingHours: 8.25,
    atrScore: 100.0,
    highlight: "Monitoring maintenance unit HO konsisten, hadir penuh 22/22 HK (181.5 jam kerja sebulan), zero deviasi batas masuk 08:15",
  },
  {
    rank: 8,
    employeeId: "99260464",
    fullName: "Atep Supriatna",
    jobPosition: "Spv Accounting",
    organization: "FA & Procurement",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 179.7,
    avgWorkingHours: 8.17,
    atrScore: 100.0,
    highlight: "Presensi accounting konsisten 22/22 HK hadir (179.7 jam kerja sebulan), jam kerja harian terpenuhi 8.17 jam, zero TL",
  },
  {
    rank: 9,
    employeeId: "99240018",
    fullName: "Della Fajar Lestari",
    jobPosition: "Spv System & Development",
    organization: "Hrga",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 181.5,
    avgWorkingHours: 8.25,
    atrScore: 100.0,
    highlight: "Disiplin presensi HRGA, hadir penuh 22/22 HK (181.5 jam kerja sebulan), zero deviasi batas masuk 08:15 WIB, zero TL",
  },
  {
    rank: 10,
    employeeId: "99250268",
    fullName: "Blasius Foera Era Telaumbanua",
    jobPosition: "Spv Procurement",
    organization: "FA & Procurement",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 22,
    leaveDays: 0,
    sickDays: 0,
    alphaDays: 0,
    lateInCount: 0,
    totalMonthlyHours: 182.6,
    avgWorkingHours: 8.30,
    atrScore: 100.0,
    highlight: "Presensi pengadaan barang tepat waktu, hadir 22/22 HK (182.6 jam kerja sebulan), jam kerja fleksibel terpenuhi penuh",
  },
];

const HEADOFFICE_COACHING_LIST: UnderperformingAttendanceItem[] = [
  {
    rank: 1,
    employeeId: "99260521",
    fullName: "Hilmy Naufal",
    jobPosition: "Driver Sarana",
    organization: "Hrga",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 21,
    leaveDays: 0,
    sickDays: 1,
    alphaDays: 0,
    lateInCount: 3,
    totalMonthlyHours: 162.8,
    avgWorkingHours: 7.75,
    atrScore: 95.5,
    violationReason: "Rekap bulanan: 3x masuk > 08:15 WIB (kode TL) dan 1 hari Sakit (S). Total hadir 21/22 HK.",
    recommendedAction: "Penyesuaian jadwal tugas luar (DL) atau revisi jam standby pool sarana",
  },
  {
    rank: 2,
    employeeId: "99260463",
    fullName: "Henri Hendriansah",
    jobPosition: "Office Boy",
    organization: "Hrga",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 21,
    leaveDays: 0,
    sickDays: 1,
    alphaDays: 0,
    lateInCount: 2,
    totalMonthlyHours: 163.8,
    avgWorkingHours: 7.80,
    atrScore: 95.5,
    violationReason: "Rekap bulanan: 2x terlambat tapping masuk (kode TL), 1x pulang awal (PA), dan 1 hari Sakit (S). Total hadir 21/22 HK.",
    recommendedAction: "Penggunaan form Izin Keluar Kantor / Dinas Luar (DL) oleh Spv GA",
  },
  {
    rank: 3,
    employeeId: "99250415",
    fullName: "Adi Susanto",
    jobPosition: "Spv General Affair",
    organization: "Hrga",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 21,
    leaveDays: 0,
    sickDays: 1,
    alphaDays: 0,
    lateInCount: 2,
    totalMonthlyHours: 165.9,
    avgWorkingHours: 7.90,
    atrScore: 95.5,
    violationReason: "Rekap bulanan: 2x tapping masuk pukul 08:23 WIB (inspeksi logistik gudang luar) & 1 hari Sakit (S). Total hadir 21/22 HK.",
    recommendedAction: "Pencatatan status Dinas Luar (DL) untuk tugas lapangan sebelum jam kantor HO",
  },
  {
    rank: 4,
    employeeId: "99260529",
    fullName: "Kayla Azzahra Jasmine",
    jobPosition: "Magang - Finance",
    organization: "FA & Procurement",
    branchName: "HO Jakarta",
    workDaysTotal: 22,
    totalPresentDays: 21,
    leaveDays: 0,
    sickDays: 1,
    alphaDays: 0,
    lateInCount: 2,
    totalMonthlyHours: 164.9,
    avgWorkingHours: 7.85,
    atrScore: 95.5,
    violationReason: "Rekap bulanan: 2x masuk lewat 08:15 WIB dan 1 hari Sakit (S), jam kerja harian rata-rata 7.85 jam (<8 jam).",
    recommendedAction: "Sosialisasi aturan jam kerja fleksibel (Clock-out = Clock-in + 9 Jam)",
  },
];

export const ATRDashboardView: React.FC<ATRDashboardViewProps> = ({
  user,
  onNavigateToMasterManpower,
  onNavigateToHRDashboard,
}) => {
  // 1. Primary Scope Switcher: "jobsite" | "headoffice"
  const [selectedScope, setSelectedScope] = useState<ATRScope>("headoffice");

  // 2. Sheet Month Selection (jan-26 ... nov-26)
  const [selectedSheet, setSelectedSheet] = useState<SheetMonthKey>("okt-26");

  // 3. Chart Toggles
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const [showMA3, setShowMA3] = useState<boolean>(true);
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);

  // 4. Leaderboard Tab: "best" | "lowest"
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"best" | "lowest">("best");

  // 5. Filter Sub-Lokasi Jobsite (jika scope = jobsite): "all" | "Muara Pahu" | "Senyiur"
  const [jobsiteSubFilter, setJobsiteSubFilter] = useState<"all" | "Muara Pahu" | "Senyiur">("all");

  // 6. Search Employee
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>("");

  // 7. Attendance Code Modal / Dictionary Toggle
  const [isAttendanceCodeModalOpen, setIsAttendanceCodeModalOpen] = useState<boolean>(false);
  const [selectedCodeCategoryFilter, setSelectedCodeCategoryFilter] = useState<string>("all");

  // Active Monthly Record according to Scope
  const activeRecord: MonthlyATRData = useMemo(() => {
    const list = selectedScope === "jobsite" ? JOBSITE_MONTHLY_ATR : HEADOFFICE_MONTHLY_ATR;
    const found = list.find((r) => r.sheetName === selectedSheet);
    return found || list[9]; // Default Okt-26
  }, [selectedScope, selectedSheet]);

  const activeMonthlyList = useMemo(() => {
    return selectedScope === "jobsite" ? JOBSITE_MONTHLY_ATR : HEADOFFICE_MONTHLY_ATR;
  }, [selectedScope]);

  // Dynamic Department Ranking based on selected month (activeRecord)
  const activeDepartmentList = useMemo(() => {
    const baseList = selectedScope === "jobsite" ? JOBSITE_DEPARTMENTS_RANKED : HEADOFFICE_DEPARTMENTS_RANKED;
    const baseStandardWorkDays = selectedScope === "jobsite" ? 28 : 22;
    const currentWorkDays = activeRecord.workDays;
    const ratio = currentWorkDays / baseStandardWorkDays;

    return baseList.map((dept) => {
      const totalWorkDays = dept.headcount * currentWorkDays;
      const leave = Math.round(dept.leave * ratio);
      const sick = Math.round(dept.sick * ratio);
      const alpha = Math.round(dept.alpha * ratio);
      const lateIn = Math.round(dept.lateIn * ratio);
      const present = Math.max(0, totalWorkDays - leave - sick - alpha);
      const atrPercent = totalWorkDays > 0 ? Number(((present / totalWorkDays) * 100).toFixed(1)) : 100.0;

      return {
        ...dept,
        workDays: currentWorkDays,
        totalWorkDays,
        present,
        leave,
        sick,
        alpha,
        lateIn,
        atrPercent,
      };
    });
  }, [selectedScope, activeRecord]);

  // Dynamic Leaderboard Best Attendees based on selected month (activeRecord)
  const filteredBest = useMemo(() => {
    const source = selectedScope === "jobsite" ? JOBSITE_TOP_10_BEST : HEADOFFICE_TOP_10_BEST;
    const currentWorkDays = activeRecord.workDays;

    return source
      .map((emp) => {
        const totalMonthlyHours = Number((currentWorkDays * emp.avgWorkingHours).toFixed(1));
        const monthHighlight =
          selectedScope === "headoffice"
            ? `Rekap bulan ${activeRecord.label}: Hadir penuh ${currentWorkDays}/${currentWorkDays} HK (${totalMonthlyHours} jam kerja), zero Late In (TL), jam kerja fleksibel terpenuhi penuh`
            : `Rekap bulan ${activeRecord.label}: Hadir penuh ${currentWorkDays}/${currentWorkDays} HK roster 13/1 (${totalMonthlyHours} jam kerja), zero Late In (TL), ritase hauling prima`;

        return {
          ...emp,
          workDaysTotal: currentWorkDays,
          totalPresentDays: currentWorkDays,
          leaveDays: 0,
          sickDays: 0,
          alphaDays: 0,
          lateInCount: 0,
          totalMonthlyHours,
          highlight: monthHighlight,
        };
      })
      .filter((emp) => {
        const matchSite =
          selectedScope === "headoffice" ||
          jobsiteSubFilter === "all" ||
          emp.branchName === jobsiteSubFilter;
        const matchQuery =
          !searchEmployeeQuery ||
          emp.fullName.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
          emp.employeeId.includes(searchEmployeeQuery) ||
          emp.jobPosition.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
        return matchSite && matchQuery;
      });
  }, [selectedScope, activeRecord, jobsiteSubFilter, searchEmployeeQuery]);

  // Dynamic Leaderboard Underperforming / Coaching based on selected month (activeRecord)
  const filteredLowest = useMemo(() => {
    const source = selectedScope === "jobsite" ? JOBSITE_TOP_10_LOWEST : HEADOFFICE_COACHING_LIST;
    const currentWorkDays = activeRecord.workDays;
    const baseStandardWorkDays = selectedScope === "jobsite" ? 28 : 22;
    const ratio = currentWorkDays / baseStandardWorkDays;

    return source
      .map((emp) => {
        let presentDays: number;
        let sick: number;
        let alpha: number;
        let late: number;
        let totalHours: number;
        let atrScore: number;
        let violationText: string;

        if (selectedScope === "headoffice") {
          if (currentWorkDays <= 5) {
            // Cutoff / parsial misal nov-26 (5 hari)
            presentDays = currentWorkDays;
            sick = 0;
            alpha = 0;
            late = 1;
            totalHours = Number((presentDays * emp.avgWorkingHours).toFixed(1));
            atrScore = 98.0;
            violationText = `Rekap ${activeRecord.label} (Cutoff ${currentWorkDays} HK): 1x terlambat masuk (>08:15 WIB), jam kerja ${totalHours} jam`;
          } else {
            presentDays = Math.max(1, currentWorkDays - 1);
            sick = 1;
            alpha = 0;
            late = emp.lateInCount;
            totalHours = Number((presentDays * emp.avgWorkingHours).toFixed(1));
            atrScore = Number(((presentDays / currentWorkDays) * 100).toFixed(1));
            violationText = `Rekap ${activeRecord.label}: ${late}x masuk lewat 08:15 WIB dan 1 hari Sakit (S). Hadir ${presentDays}/${currentWorkDays} HK (${totalHours} jam kerja sebulan)`;
          }
        } else {
          // Jobsite
          alpha = Math.max(0, Math.round(emp.alphaDays * ratio));
          sick = Math.max(1, Math.round(emp.sickDays * ratio));
          late = Math.max(1, Math.round(emp.lateInCount * ratio));
          presentDays = Math.max(1, currentWorkDays - alpha - sick);
          totalHours = Number((presentDays * emp.avgWorkingHours).toFixed(1));
          atrScore = Number(((presentDays / currentWorkDays) * 100).toFixed(1));
          violationText = `Rekap ${activeRecord.label}: ${alpha > 0 ? `${alpha} Hari Alpha (A), ` : ""}${sick} Hari Sakit (S), ${late}x Terlambat (TL). Hadir ${presentDays}/${currentWorkDays} HK (${totalHours} jam kerja)`;
        }

        return {
          ...emp,
          workDaysTotal: currentWorkDays,
          totalPresentDays: presentDays,
          leaveDays: 0,
          sickDays: sick,
          alphaDays: alpha,
          lateInCount: late,
          totalMonthlyHours: totalHours,
          atrScore,
          violationReason: violationText,
        };
      })
      .filter((emp) => {
        const matchSite =
          selectedScope === "headoffice" ||
          jobsiteSubFilter === "all" ||
          emp.branchName === jobsiteSubFilter;
        const matchQuery =
          !searchEmployeeQuery ||
          emp.fullName.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
          emp.employeeId.includes(searchEmployeeQuery) ||
          emp.jobPosition.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
        return matchSite && matchQuery;
      });
  }, [selectedScope, activeRecord, jobsiteSubFilter, searchEmployeeQuery]);

  // Filter Attendance Codes
  const filteredAttendanceCodes = useMemo(() => {
    return ATTENDANCE_CODES.filter((item) => {
      const matchScope =
        item.scope === "all" ||
        (selectedScope === "jobsite" && item.scope === "jobsite") ||
        (selectedScope === "headoffice" && item.scope === "headoffice");
      const matchCat =
        selectedCodeCategoryFilter === "all" || item.category === selectedCodeCategoryFilter;
      return matchScope && matchCat;
    });
  }, [selectedScope, selectedCodeCategoryFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HERO WITH SCOPE SWITCHER (HEAD OFFICE VS JOBSITE)            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                  selectedScope === "headoffice"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-orange-100 text-[#e95623] border-orange-200"
                }`}
              >
                {selectedScope === "headoffice" ? (
                  <>
                    <Building size={14} className="text-blue-700" />
                    Head Office (Jakarta)
                  </>
                ) : (
                  <>
                    <HardHat size={14} className="text-[#e95623]" />
                    Jobsite Operations (Muara Pahu &amp; Senyiur)
                  </>
                )}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                PT Batara Dharma Persada
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12} />
                SLA ATR Target: ≥ 95.0%
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              {selectedScope === "headoffice" ? "ATR Dashboard Head Office" : "ATR Dashboard Jobsite"}
              <span className="text-base font-semibold text-slate-500">
                (Attendance Tracking &amp; Ratio)
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
              {selectedScope === "headoffice"
                ? "Monitoring kepatuhan presensi 22 personil aktif Head Office Jakarta. Jam kerja 8 jam fleksibel, toleransi masuk maksimal 08:15 WIB, dan tanggal merah libur resmi."
                : "Monitoring rasio kehadiran 400 personil aktif Jobsite Muara Pahu & Senyiur per sheet bulanan G-Form. Terintegrasi dengan analitika shift operasional dan ranking departemen."}
            </p>
          </div>

          {/* Scope Switcher & Quick Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
            {/* Primary Toggle: HO vs Jobsite */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedScope("headoffice")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  selectedScope === "headoffice"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building size={14} />
                Head Office
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedScope === "headoffice" ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                  22
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope("jobsite")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  selectedScope === "jobsite"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <HardHat size={14} />
                Jobsite
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedScope === "jobsite" ? "bg-orange-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                  400
                </span>
              </button>
            </div>

            {/* Attendance Code Dictionary Button */}
            <button
              onClick={() => setIsAttendanceCodeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Lihat kamus dan arti kode kehadiran (H, CT, S, I, TL, PA, DL, A, R, L)"
            >
              <BookOpen size={14} className="text-purple-600" />
              Kode Presensi
            </button>

            {onNavigateToHRDashboard && (
              <button
                onClick={onNavigateToHRDashboard}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart3 size={14} className="text-blue-600" />
                HR
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              Cetak
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER KHUSUS HEAD OFFICE ATURAN KERJA & EXCLUSIONS                       */}
        {/* ========================================================================= */}
        {selectedScope === "headoffice" ? (
          <div className="space-y-3">
            <div className="p-4 bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 rounded-2xl border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Clock size={16} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
                      Ketentuan Jam Kerja &amp; Libur Head Office (Jakarta)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                      8 Jam Kerja + 1 Jam Istirahat
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Batas Masuk: 08:15 WIB
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    ⏰ <strong>Batas Maksimum Masuk:</strong> Pukul <strong>08:15 WIB</strong> (masuk &gt; 08:15 tercatat sebagai Terlambat / <code className="text-orange-700 font-bold">TL</code>).
                    <br />
                    ⏳ <strong>Fleksibilitas Jam Pulang (8 Jam Kerja):</strong> Jika masuk <strong>07:00</strong> boleh pulang <strong>16:00</strong>; jika masuk <strong>08:00</strong> pulang <strong>17:00</strong>; jika masuk <strong>08:15</strong> pulang <strong>17:15</strong>.
                    <br />
                    🗓️ <strong>Hari Libur:</strong> Tanggal Merah (Hari Libur Nasional &amp; Cuti Bersama) serta akhir pekan (Sabtu-Minggu) adalah <strong>LIBUR RESMI (<code className="text-purple-700 font-bold">L</code>)</strong> dan tidak memotong rasio kehadiran.
                  </p>
                </div>
              </div>

              {/* Exclusion Badges */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  BoD Excluded (0 Direksi)
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Jobsite Banner */
          <div className="p-3.5 bg-linear-to-r from-orange-50/60 via-amber-50/40 to-slate-50 rounded-2xl border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck size={15} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-900 font-bold block">
                    Fokus Operasional Jobsite (400 Personil Aktif Lapangan)
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                    Sistem Roster 13/1 (28 Hari Kerja Terjadwal / Bulan)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Mencakup 7 departemen operasional Site Muara Pahu (306) &amp; Senyiur (94). Pola kerja 13 hari on : 1 hari day-off (2–3 hari libur roster tidak memotong ATR). Jajaran <strong>BoD</strong> &amp; staf HO dipisahkan.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
              BoD Excluded (0 Direksi)
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER CONTROLS BAR (SHEET SELECTION & SUB-FILTER)                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilihan Sheet Bulan (Format G-Form: jan-26, feb-26, ...) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className={selectedScope === "headoffice" ? "text-blue-600" : "text-[#e95623]"} />
              Sheet Bulan:
            </span>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value as SheetMonthKey)}
              aria-label="Pilih Sheet Bulan G-Form"
              className="px-3.5 py-1.5 rounded-xl border border-blue-300 bg-blue-50/50 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              {activeMonthlyList.map((item) => (
                <option key={item.sheetName} value={item.sheetName}>
                  {item.sheetName} ({item.label} - {item.workDays} HK)
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Sub-Filter jika Jobsite */}
          {selectedScope === "jobsite" ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Site:</span>
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setJobsiteSubFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    jobsiteSubFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Semua (400)
                </button>
                <button
                  type="button"
                  onClick={() => setJobsiteSubFilter("Muara Pahu")}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    jobsiteSubFilter === "Muara Pahu"
                      ? "bg-orange-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Muara Pahu (306)
                </button>
                <button
                  type="button"
                  onClick={() => setJobsiteSubFilter("Senyiur")}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    jobsiteSubFilter === "Senyiur"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Senyiur (94)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1">
                <Building size={12} />
                Head Office : BDP Jakarta (22 Karyawan)
              </span>
            </div>
          )}
        </div>

        {/* Quick Month Metrics Badge */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto text-xs font-semibold text-slate-600">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Aktif: {activeRecord.label} ({activeRecord.workDays} Hari Kerja)
          </span>
          <span>•</span>
          <span>
            Total Mandays: <strong className="text-slate-900 font-mono">{activeRecord.totalWorkDays.toLocaleString("id-ID")}</strong>
          </span>
          <span>•</span>
          <span>
            Standar: <strong className="text-slate-900 font-mono">{(activeRecord.totalWorkDays * 8).toLocaleString("id-ID")} Jam</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SPEEDOMETER GAUGE & TOP KPI CARDS                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Speedometer Radial Card */}
        <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  selectedScope === "headoffice"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-orange-500/20 text-orange-400"
                }`}
              >
                <Gauge size={16} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Speedometer ATR
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PRIMA (≥95%)
            </span>
          </div>

          {/* Semi-Circle Speedometer Visualization */}
          <div className="my-3 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 200 110" className="w-44 h-24">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#334155"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Progress Arc (Normalized to 90%-100% scale for high sensitivity) */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={selectedScope === "headoffice" ? "#3b82f6" : "#10b981"}
                strokeWidth="14"
                strokeDasharray="251.2"
                strokeDashoffset={
                  251.2 - 251.2 * Math.min(100, Math.max(0, (activeRecord.atrPercent - 90) / 10))
                }
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center -mt-6">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {activeRecord.atrPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                Target SLA: ≥ 95.0%
              </span>
            </div>
          </div>

          {/* Speedometer Footer Legends */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-700/60 font-mono">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              &lt;95% Low
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              95-96% Good
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ≥96% Prima
            </span>
          </div>
        </div>

        {/* KPI 2: Total Mandays Kehadiran */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Total Kehadiran
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
              {activeRecord.present.toLocaleString("id-ID")}
            </span>
            <span className="text-xs font-bold text-slate-500 block mt-1">
              dari {activeRecord.totalWorkDays.toLocaleString("id-ID")} Total Mandays Terjadwal
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>{activeRecord.headcount} Personil Aktif</span>
            <span className="text-emerald-700 font-bold">
              +{(activeRecord.atrPercent - 95.0).toFixed(1)}% vs Target SLA
            </span>
          </div>
        </div>

        {/* KPI 3: Ketidakhadiran (Cuti, Sakit, Alpha) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
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
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {(activeRecord.totalWorkDays - activeRecord.present).toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({(100 - activeRecord.atrPercent).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1">
              <span className="text-blue-600">CT: {activeRecord.leave}</span>
              <span>•</span>
              <span className="text-amber-600">S: {activeRecord.sick}</span>
              <span>•</span>
              <span className="text-rose-600 font-black">A: {activeRecord.alpha}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
            <span>Alpha Terkendali</span>
            <span className="text-rose-600 font-bold font-mono">{activeRecord.alpha} Mandays</span>
          </div>
        </div>

        {/* KPI 4: Kepatuhan Jam Kerja & Late In */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
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
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {activeRecord.avgHoursPerDay.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-slate-500">Jam / Hari</span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mt-1">
              {selectedScope === "headoffice"
                ? "Standar HO: 8.00 Jam Kerja Fleksibel"
                : "Standar Lapangan: 8.00 Jam Shift"}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
            <span className="text-amber-600 font-bold">
              {activeRecord.lateIn}x Terlambat ({selectedScope === "headoffice" ? ">08:15" : "Late In"})
            </span>
            <span className="text-emerald-700 font-bold">On-Time: 99.7%</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. GRAFIK TREN ATR DENGAN GARIS REGRESI LINIER & MOVING AVERAGE           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className={selectedScope === "headoffice" ? "text-blue-600" : "text-[#e95623]"} />
              Tren ATR {selectedScope === "headoffice" ? "Head Office Jakarta" : "Jobsite Operasional"} Bulan ke Bulan
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  selectedScope === "headoffice"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-orange-50 border-orange-200 text-[#e95623]"
                }`}
              >
                Jan-26 s/d Nov-26
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Analisis pergerakan persentase kehadiran aktual, garis tren linier, dan moving average 3-bulan
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTrendline(!showTrendline)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                showTrendline
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              Trendline Linier
            </button>
            <button
              onClick={() => setShowMA3(!showMA3)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                showMA3
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              MA 3-Bulan
            </button>
            <button
              onClick={() => setShowTargetLine(!showTargetLine)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                showTargetLine
                  ? "bg-rose-100 text-rose-900 border-rose-300"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              Target 95%
            </button>
          </div>
        </div>

        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={activeMonthlyList} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="scopeAtrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={selectedScope === "headoffice" ? "#3b82f6" : "#e95623"}
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor={selectedScope === "headoffice" ? "#3b82f6" : "#e95623"}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 700 }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                domain={[94.5, 100.0]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(val) => `${val}%`}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${Number(val).toFixed(2)}%`,
                  name === "atrPercent"
                    ? "Realisasi ATR"
                    : name === "trendlineLinear"
                    ? "Trendline Linier"
                    : name === "movingAverage3M"
                    ? "Moving Average 3M"
                    : "Target",
                ]}
                labelFormatter={(lbl: any) => `Sheet: ${lbl}`}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  fontWeight: 600,
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              {showTargetLine && (
                <ReferenceLine
                  y={95.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Target SLA (95%)",
                    position: "right",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: "bold",
                  }}
                />
              )}

              {/* Garis Penanda Bulan Terpilih (Active Sheet Marker) */}
              <ReferenceLine
                x={activeRecord.label}
                stroke={selectedScope === "headoffice" ? "#2563eb" : "#e95623"}
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `📍 ${activeRecord.label} (${activeRecord.atrPercent.toFixed(1)}%)`,
                  position: "top",
                  fill: selectedScope === "headoffice" ? "#1d4ed8" : "#c2410c",
                  fontSize: 10,
                  fontWeight: "bold",
                }}
              />

              {/* Area & Line Realisasi ATR */}
              <Area
                type="monotone"
                dataKey="atrPercent"
                name="Realisasi ATR"
                stroke={selectedScope === "headoffice" ? "#2563eb" : "#e95623"}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scopeAtrGradient)"
                dot={{
                  r: 4,
                  fill: selectedScope === "headoffice" ? "#2563eb" : "#e95623",
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
              >
                <LabelList
                  dataKey="atrPercent"
                  position="top"
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                  style={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    fill: selectedScope === "headoffice" ? "#2563eb" : "#e95623",
                  }}
                />
              </Area>

              {/* Garis Trendline Linier */}
              {showTrendline && (
                <Line
                  type="linear"
                  dataKey="trendlineLinear"
                  name="Trendline Linier"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              {/* Garis Moving Average 3-Bulan */}
              {showMA3 && (
                <Line
                  type="monotone"
                  dataKey="movingAverage3M"
                  name="Moving Average 3M"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 font-bold ${
                selectedScope === "headoffice" ? "text-blue-700" : "text-[#e95623]"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  selectedScope === "headoffice" ? "bg-blue-600" : "bg-[#e95623]"
                }`}
              />
              Realisasi ATR Bulanan
            </span>
            {showTrendline && (
              <span className="flex items-center gap-1.5 font-bold text-amber-600">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500" />
                Tren Regresi Linier
              </span>
            )}
            {showMA3 && (
              <span className="flex items-center gap-1.5 font-bold text-purple-600">
                <span className="w-4 h-0.5 bg-purple-600" />
                Moving Average 3-Bulan
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Kinerja Presensi:{" "}
            <strong className="text-emerald-700 font-bold">
              {selectedScope === "headoffice"
                ? "Sangat Prima (Rata-rata 98.3% di atas SLA)"
                : "Konsisten Naik (+1.3% YTD)"}
            </strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. TABEL DEPARTEMEN (URUT DARI ATR TERBAIK HINGGA TERENDAH)                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <Trophy size={18} className="text-amber-500" />
              Peringkat Departemen {selectedScope === "headoffice" ? "Head Office" : "Jobsite"} (ATR Terbaik ke Terendah)
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                  selectedScope === "headoffice"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : "bg-orange-50 text-[#e95623] border-orange-200"
                }`}
              >
                Periode: {activeRecord.label} ({activeRecord.workDays} HK)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {selectedScope === "headoffice"
                ? `Mencakup 5 departemen aktif Head Office Jakarta (${activeRecord.workDays} hari kerja efektif periode ${activeRecord.label})`
                : `Disamakan persis dengan data organisasi Master Manpower Jobsite Muara Pahu & Senyiur (${activeRecord.workDays} hari kerja roster 13/1 periode ${activeRecord.label})`}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            {selectedScope === "headoffice"
              ? `Seluruh 5 Departemen HO Melampaui 97.5% di ${activeRecord.label}`
              : `Seluruh 7 Departemen Jobsite Melampaui SLA 95% di ${activeRecord.label}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-black uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-3">Organisasi / Departemen</th>
                <th className="py-3 px-3">Posisi Utama</th>
                <th className="py-3 px-3 text-center">Headcount</th>
                <th className="py-3 px-3 text-center text-slate-700">Jadwal (HK)</th>
                <th className="py-3 px-3 text-center text-slate-600">Total Mandays</th>
                <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                <th className="py-3 px-3 text-center text-blue-700">Cuti</th>
                <th className="py-3 px-3 text-center text-amber-700">Sakit</th>
                <th className="py-3 px-3 text-center text-rose-700">Alpha</th>
                <th className="py-3 px-3 text-center">Late In</th>
                <th className="py-3 px-3 text-center">Jam / Hari</th>
                <th className="py-3 px-3 text-center font-black">ATR (%)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {activeDepartmentList.map((row) => (
                <tr key={row.organization} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs ${
                        row.rank === 1
                          ? "bg-amber-400 text-amber-950 shadow-2xs"
                          : row.rank === 2
                          ? "bg-slate-300 text-slate-900"
                          : row.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-100 text-slate-600 font-bold"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <strong className="text-slate-900 font-bold block">{row.organization}</strong>
                    <span className="text-[10px] text-slate-400">
                      {selectedScope === "headoffice" ? "HO Jakarta" : "Site MP & SNY"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                    {row.primaryPositions}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900">{row.headcount}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700 font-mono">
                    {row.workDays} HK
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-600 font-mono">
                    {row.totalWorkDays.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                    {row.present.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-blue-700">{row.leave}</td>
                  <td className="py-3 px-3 text-center font-mono text-amber-700">{row.sick}</td>
                  <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold">{row.alpha}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{row.lateIn}</td>
                  <td className="py-3 px-3 text-center font-mono text-purple-700 font-bold">
                    {row.avgHours.toFixed(2)}h
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                        row.atrPercent >= 98.0
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : row.atrPercent >= 96.5
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {row.atrPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === "Sangat Disiplin"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. REKAPITULASI PRESENSI BULANAN: TOP TERBAIK VS PERLU PEMBINAAN           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        {/* Header & Leaderboard Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Award size={18} className={selectedScope === "headoffice" ? "text-blue-600" : "text-[#e95623]"} />
              Rekapitulasi Presensi Bulanan {selectedScope === "headoffice" ? "Head Office" : "Jobsite"} ({activeRecord.label}): Top Terbaik vs Perlu Pembinaan
            </h3>
            <p className="text-xs text-slate-500">
              {selectedScope === "headoffice"
                ? "Laporan rekapitulasi bulanan per karyawan: Jadwal Hari Kerja (HK), Hadir (H), Cuti (CT), Sakit (S), Alpha (A), Terlambat (TL), Total Jam Bulanan, dan Rasio ATR"
                : "Laporan rekapitulasi bulanan per personil Jobsite: Roster 13/1 (28 HK), Hadir (H), Cuti (CT), Sakit (S), Alpha (A), Terlambat (TL), Total Jam Bulanan, dan Rasio ATR"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari NIK / Nama Karyawan..."
                value={searchEmployeeQuery}
                onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-52 sm:w-60"
              />
            </div>

            {/* Tab Switcher Best vs Lowest */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveLeaderboardTab("best")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeLeaderboardTab === "best"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Trophy size={13} />
                10 Absen Paling Bagus
              </button>
              <button
                type="button"
                onClick={() => setActiveLeaderboardTab("lowest")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeLeaderboardTab === "lowest"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-rose-600"
                }`}
              >
                <AlertTriangle size={13} />
                {selectedScope === "headoffice" ? "Perlu Pembinaan HO" : "10 Perlu Pembinaan"}
              </button>
            </div>
          </div>
        </div>

        {/* TABEL 1: 10 KARYAWAN ABSEN PALING BAGUS (REKAPITULASI BULANAN) */}
        {activeLeaderboardTab === "best" && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                {selectedScope === "headoffice"
                  ? "Kriteria Rekap Bulanan HO: 100% Hadir hari kerja kantor (22/22 HK), akumulasi total jam kerja bulanan ≥ 180 Jam, nihil Alpha (A), dan zero Terlambat (0x TL)."
                  : "Kriteria Rekap Bulanan Jobsite: 100% Hadir hari kerja roster 13/1 (28/28 HK), akumulasi total jam kerja bulanan ≥ 226 Jam, nihil Alpha (A), dan zero Terlambat (0x TL)."}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-950 border border-emerald-300">
                ATR 100.0% (Zero Deviasi Bulanan)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-emerald-50/40 text-emerald-950 font-black uppercase tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">Rank</th>
                    <th className="py-3 px-3">NIK</th>
                    <th className="py-3 px-3">Nama Lengkap</th>
                    <th className="py-3 px-3">Posisi &amp; Organisasi</th>
                    <th className="py-3 px-3">Site / Lokasi</th>
                    <th className="py-3 px-3 text-center">Jadwal (HK)</th>
                    <th className="py-3 px-3 text-center text-emerald-700">Hadir (H)</th>
                    <th className="py-3 px-3 text-center text-blue-700">Cuti (CT)</th>
                    <th className="py-3 px-3 text-center text-amber-700">Sakit (S)</th>
                    <th className="py-3 px-3 text-center text-rose-700">Alpha (A)</th>
                    <th className="py-3 px-3 text-center text-orange-700">Telat (TL)</th>
                    <th className="py-3 px-3 text-center text-purple-700">Total Jam Bulanan</th>
                    <th className="py-3 px-3 text-center font-black">ATR (%)</th>
                    <th className="py-3 px-3">Evaluasi Presensi Bulanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredBest.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs ${
                            emp.rank === 1
                              ? "bg-amber-400 text-amber-950 shadow-2xs ring-2 ring-amber-300"
                              : emp.rank === 2
                              ? "bg-slate-300 text-slate-900 ring-1 ring-slate-400"
                              : emp.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {emp.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{emp.employeeId}</td>
                      <td className="py-3 px-3 font-black text-slate-900">{emp.fullName}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{emp.jobPosition}</span>
                        <span className="text-[10px] text-slate-400">{emp.organization}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">{emp.branchName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-600 font-mono">
                        {emp.workDaysTotal} HK
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                        {emp.totalPresentDays} Hari
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-blue-700">{emp.leaveDays}</td>
                      <td className="py-3 px-3 text-center font-mono text-amber-700">{emp.sickDays}</td>
                      <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold">{emp.alphaDays}</td>
                      <td className="py-3 px-3 text-center font-mono text-orange-700 font-bold">{emp.lateInCount}x</td>
                      <td className="py-3 px-3 text-center font-mono text-purple-700 font-bold">
                        <span>{emp.totalMonthlyHours.toFixed(1)} Jam</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ({emp.avgWorkingHours.toFixed(2)}h/hari)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {emp.atrScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] leading-relaxed max-w-sm">
                        {emp.highlight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABEL 2: KARYAWAN ABSEN PERLU PEMBINAAN (REKAPITULASI BULANAN) */}
        {activeLeaderboardTab === "lowest" && (
          <div className="space-y-3">
            <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-600" />
                {selectedScope === "headoffice"
                  ? "Kriteria Rekap Bulanan HO: Karyawan dengan catatan akumulasi keterlambatan masuk kantor (kode TL > 08:15 WIB), izin sakit (S), atau jam kerja bulanan kurang dari standar."
                  : "Kriteria Rekap Bulanan Jobsite: Karyawan dengan akumulasi keterlambatan shift (TL), hari mangkir / Alpha (A), sakit (S), kehadiran < 28 HK, atau nilai ATR bulanan terendah."}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-200 text-rose-950 border border-rose-300">
                Evaluasi &amp; Pembinaan Bulanan HR
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-rose-50/40 text-rose-950 font-black uppercase tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">Rank</th>
                    <th className="py-3 px-3">NIK</th>
                    <th className="py-3 px-3">Nama Lengkap</th>
                    <th className="py-3 px-3">Posisi &amp; Organisasi</th>
                    <th className="py-3 px-3">Site / Lokasi</th>
                    <th className="py-3 px-3 text-center">Jadwal (HK)</th>
                    <th className="py-3 px-3 text-center text-slate-800">Hadir (H)</th>
                    <th className="py-3 px-3 text-center text-blue-700">Cuti (CT)</th>
                    <th className="py-3 px-3 text-center text-amber-700">Sakit (S)</th>
                    <th className="py-3 px-3 text-center text-rose-700">Alpha (A)</th>
                    <th className="py-3 px-3 text-center text-orange-700">Telat (TL)</th>
                    <th className="py-3 px-3 text-center text-purple-700">Total Jam Bulanan</th>
                    <th className="py-3 px-3 text-center font-black">ATR (%)</th>
                    <th className="py-3 px-3">Rekapitulasi Pelanggaran &amp; Rekomendasi HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredLowest.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs ${
                            emp.rank <= 3
                              ? "bg-rose-600 text-white shadow-2xs ring-1 ring-rose-400"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {emp.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{emp.employeeId}</td>
                      <td className="py-3 px-3 font-black text-slate-900">{emp.fullName}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{emp.jobPosition}</span>
                        <span className="text-[10px] text-slate-400">{emp.organization}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">{emp.branchName}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-600 font-mono">
                        {emp.workDaysTotal} HK
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                        {emp.totalPresentDays} Hari
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-blue-700">{emp.leaveDays}</td>
                      <td className="py-3 px-3 text-center font-mono text-amber-700 font-bold">
                        {emp.sickDays > 0 ? `${emp.sickDays} Hari` : "0"}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-700 font-mono">
                        {emp.alphaDays > 0 ? `${emp.alphaDays} Hari` : "0"}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-orange-700 font-mono">
                        {emp.lateInCount > 0 ? `${emp.lateInCount}x` : "0"}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-purple-700 font-bold">
                        <span>{emp.totalMonthlyHours.toFixed(1)} Jam</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ({emp.avgWorkingHours.toFixed(2)}h/hari)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                          {emp.atrScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 space-y-1 max-w-sm">
                        <span className="text-slate-800 font-semibold block text-[11px] leading-snug">
                          {emp.violationReason}
                        </span>
                        <span className="inline-block text-rose-700 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Tindakan HR: {emp.recommendedAction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. ATTENDANCE CODE MASTER REFERENCE CARD (HO & JOBSITE)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen size={18} className="text-purple-600" />
              Kamus Kode Presensi (Attendance Code Reference)
            </h3>
            <p className="text-xs text-slate-500">
              Standar kode absensi resmi PT Batara Dharma Persada yang berlaku untuk Head Office Jakarta dan Jobsite Operasional
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Kategori:</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedCodeCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCodeCategoryFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeCategoryFilter("hadir")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCodeCategoryFilter === "hadir" ? "bg-emerald-600 text-white" : "text-slate-600"
                }`}
              >
                Hadir
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeCategoryFilter("cuti")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCodeCategoryFilter === "cuti" ? "bg-blue-600 text-white" : "text-slate-600"
                }`}
              >
                Cuti
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeCategoryFilter("izin")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCodeCategoryFilter === "izin" ? "bg-amber-600 text-white" : "text-slate-600"
                }`}
              >
                Izin/Sakit
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeCategoryFilter("pelanggaran")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCodeCategoryFilter === "pelanggaran" ? "bg-rose-600 text-white" : "text-slate-600"
                }`}
              >
                Deviasi/TL
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodeCategoryFilter("libur")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCodeCategoryFilter === "libur" ? "bg-purple-600 text-white" : "text-slate-600"
                }`}
              >
                Libur/Roster
              </button>
            </div>
          </div>
        </div>

        {/* Code Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAttendanceCodes.map((item) => (
            <div
              key={item.code}
              className={`p-3.5 rounded-2xl border transition-all ${item.colorBg} ${item.colorBorder} flex flex-col justify-between space-y-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm shadow-2xs font-mono ${
                      item.category === "hadir"
                        ? "bg-emerald-600 text-white"
                        : item.category === "cuti"
                        ? "bg-blue-600 text-white"
                        : item.category === "pelanggaran"
                        ? "bg-rose-600 text-white"
                        : item.category === "libur"
                        ? "bg-purple-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {item.code}
                  </span>
                  <div>
                    <strong className="text-xs font-black text-slate-900 block">{item.label}</strong>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {item.scope === "all" ? "HO & Jobsite" : item.scope === "headoffice" ? "Khusus Head Office" : "Khusus Jobsite"}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    item.affectsATR
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}
                >
                  {item.affectsATR ? "Memotong ATR" : "Sesuai Standar"}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {item.description}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-semibold">
                <span>Kategori: <strong className="capitalize text-slate-800">{item.category}</strong></span>
                <span>Gaji: <strong className={item.isPaid ? "text-emerald-700" : "text-rose-700"}>{item.isPaid ? "Dibayar" : "Potong Gaji"}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9. OPERATIONAL INTELLIGENCE FOOTER                                       */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>
            {selectedScope === "headoffice"
              ? "Data presensi Head Office Jakarta: 22 personil aktif. Jam kerja 8 jam fleksibel (+1h istirahat), batas masuk 08:15 WIB, tanggal merah libur resmi."
              : `Data presensi Jobsite disinkronkan dari G-Form sheet (${selectedSheet}). 7 Departemen sesuai database Master Manpower.`}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <span>Eksklusi: <strong>BoD (Direksi) 0</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">Status: Terverifikasi Aktif</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 10. MODAL KAMUS ATTENDANCE CODE (JIKA DIKLIK DARI HEADER)                 */}
      {/* ========================================================================= */}
      {isAttendanceCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Buku Panduan Kode Presensi (Attendance Codes)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem singkatan absensi PT Batara Dharma Persada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAttendanceCodeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {ATTENDANCE_CODES.map((c) => (
                <div key={c.code} className="py-3 flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                    {c.code}
                  </span>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-slate-900">{c.label}</strong>
                      <span className="text-[10px] text-slate-400 capitalize">{c.scope === "all" ? "HO & Jobsite" : c.scope}</span>
                    </div>
                    <p className="text-xs text-slate-600">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAttendanceCodeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
