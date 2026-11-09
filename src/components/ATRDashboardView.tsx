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
import { manpowerService } from "../services/manpowerService";

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

// =========================================================================
// 1. DATA HISTORIS ATR JOBSITE DENGAN TREND LINE & MOVING AVERAGE
// =========================================================================
interface JobsiteMonthlyATR {
  sheetName: SheetMonthKey;
  label: string;
  monthNum: number;
  workDays: number;
  headcount: number; // 400 personil aktif Jobsite
  totalWorkDays: number; // headcount * workDays
  present: number;
  leave: number;
  sick: number;
  alpha: number;
  lateIn: number;
  atrPercent: number; // Realisasi
  trendlineLinear: number; // Regresi Linier
  movingAverage3M: number | null; // MA 3-Bulan
  target: number; // 95%
  avgHoursPerDay: number; // Jam kerja real rata-rata
}

const JOBSITE_MONTHLY_ATR: JobsiteMonthlyATR[] = [
  {
    sheetName: "jan-26",
    label: "Jan-26",
    monthNum: 1,
    workDays: 22,
    headcount: 334,
    totalWorkDays: 7348,
    present: 7040,
    leave: 142,
    sick: 86,
    alpha: 80,
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
    workDays: 20,
    headcount: 338,
    totalWorkDays: 6760,
    present: 6496,
    leave: 129,
    sick: 74,
    alpha: 61,
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
    workDays: 21,
    headcount: 336,
    totalWorkDays: 7056,
    present: 6774,
    leave: 150,
    sick: 70,
    alpha: 62,
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
    workDays: 21,
    headcount: 334,
    totalWorkDays: 7014,
    present: 6720,
    leave: 165,
    sick: 66,
    alpha: 63,
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
    workDays: 20,
    headcount: 332,
    totalWorkDays: 6640,
    present: 6400,
    leave: 137,
    sick: 61,
    alpha: 42,
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
    workDays: 21,
    headcount: 359,
    totalWorkDays: 7539,
    present: 7268,
    leave: 149,
    sick: 68,
    alpha: 54,
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
    workDays: 23,
    headcount: 394,
    totalWorkDays: 9062,
    present: 8754,
    leave: 179,
    sick: 76,
    alpha: 53,
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
    workDays: 21,
    headcount: 419,
    totalWorkDays: 8799,
    present: 8525,
    leave: 165,
    sick: 71,
    alpha: 38,
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
    workDays: 22,
    headcount: 416,
    totalWorkDays: 9152,
    present: 8878,
    leave: 173,
    sick: 65,
    alpha: 36,
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
    workDays: 22,
    headcount: 400,
    totalWorkDays: 8800,
    present: 8545,
    leave: 156,
    sick: 62,
    alpha: 37,
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

// =========================================================================
// 2. DATA DEPARTEMEN JOBSITE (SESUAI DENGAN DATABASE, DIURUTKAN TERBAIK KE TERENDAH)
// =========================================================================
export interface JobsiteDepartmentATR {
  rank: number;
  organization: string; // Persis sesuai database MasterManpower
  headcount: number; // Total riil Jobsite
  workDays: number;
  totalWorkDays: number;
  present: number;
  leave: number;
  sick: number;
  alpha: number;
  lateIn: number;
  avgHours: number;
  atrPercent: number; // Persentase ATR
  status: "Sangat Disiplin" | "Optimal" | "Perlu Perhatian";
  primaryPositions: string;
}

// 7 Departemen Riil di Jobsite Muara Pahu & Senyiur (Total 400 personil)
// Diurutkan dari ATR TERBAIK ke TERENDAH:
export const JOBSITE_DEPARTMENTS_RANKED: JobsiteDepartmentATR[] = [
  {
    rank: 1,
    organization: "HSE",
    headcount: 20,
    workDays: 22,
    totalWorkDays: 440,
    present: 434,
    leave: 4,
    sick: 1,
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
    workDays: 22,
    totalWorkDays: 418,
    present: 410,
    leave: 5,
    sick: 2,
    alpha: 1,
    lateIn: 1,
    avgHours: 8.12,
    atrPercent: 98.1,
    status: "Sangat Disiplin",
    primaryPositions: "Spv Human Resource, GA, Camp Coordinator, Cook",
  },
  {
    rank: 3,
    organization: "Operations",
    headcount: 4,
    workDays: 22,
    totalWorkDays: 88,
    present: 86,
    leave: 1,
    sick: 1,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.18,
    atrPercent: 97.7,
    status: "Sangat Disiplin",
    primaryPositions: "Operation Supervisor, Dispatcher Utama",
  },
  {
    rank: 4,
    organization: "Infrastructure",
    headcount: 3,
    workDays: 22,
    totalWorkDays: 66,
    present: 64,
    leave: 1,
    sick: 1,
    alpha: 0,
    lateIn: 0,
    avgHours: 8.10,
    atrPercent: 97.0,
    status: "Optimal",
    primaryPositions: "Road Maintenance, Civil Worker Site",
  },
  {
    rank: 5,
    organization: "Production",
    headcount: 230,
    workDays: 22,
    totalWorkDays: 5060,
    present: 4898,
    leave: 88,
    sick: 48,
    alpha: 26,
    lateIn: 17,
    avgHours: 8.08,
    atrPercent: 96.8,
    status: "Optimal",
    primaryPositions: "Driver Double Trailer, Pit Controller, Side Dump Spotter",
  },
  {
    rank: 6,
    organization: "Logistic",
    headcount: 15,
    workDays: 22,
    totalWorkDays: 330,
    present: 318,
    leave: 6,
    sick: 4,
    alpha: 2,
    lateIn: 2,
    avgHours: 8.04,
    atrPercent: 96.4,
    status: "Optimal",
    primaryPositions: "Fuel Attendant, Warehouse, Dispatcher Logistic",
  },
  {
    rank: 7,
    organization: "Plant",
    headcount: 109,
    workDays: 22,
    totalWorkDays: 2398,
    present: 2297,
    leave: 51,
    sick: 30,
    alpha: 20,
    lateIn: 12,
    avgHours: 8.01,
    atrPercent: 95.8,
    status: "Optimal",
    primaryPositions: "Mechanic, Auto Electrician, Welder, Spv Plant",
  },
];

// =========================================================================
// 3. TOP 10 KARYAWAN ABSENSI TERBAIK (PRIMA & TEPAT WAKTU)
// Kriteria: Waktu Masuk On-Time (Late In 0), Jam Kerja Terpenuhi (≥ 8.0 Jam),
//           Kehadiran 100%, Zero Alpha
// =========================================================================
export interface EmployeeAttendanceLeaderboardItem {
  rank: number;
  employeeId: string;
  fullName: string;
  jobPosition: string;
  organization: string;
  branchName: string;
  totalPresentDays: number;
  workDaysTotal: number;
  lateInCount: number;
  avgClockInTime: string; // e.g. "05:48" atau "17:45"
  avgWorkingHours: number; // Jam
  alphaDays: number;
  sickDays: number;
  atrScore: number; // 100%
  highlight: string;
}

const TOP_10_BEST_ATTENDANCE: EmployeeAttendanceLeaderboardItem[] = [
  {
    rank: 1,
    employeeId: "98250367",
    fullName: "Abraham Nur Fadli Rahman",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Muara Pahu",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "05:42 (18 mnt awal)",
    avgWorkingHours: 8.25,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Disiplin shift hauling sempurna, 0 keterlambatan, utilisasi 8.25 jam/shift",
  },
  {
    rank: 2,
    employeeId: "98260538",
    fullName: "A. Arya Sumange Rizal., S.Kom",
    jobPosition: "Spv Operational Hse",
    organization: "HSE",
    branchName: "Muara Pahu",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "06:45 (15 mnt awal)",
    avgWorkingHours: 8.22,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Kehadiran safety briefing 100%, jam masuk konsisten on-time",
  },
  {
    rank: 3,
    employeeId: "98250405",
    fullName: "Achmad Ridho Santoso",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Senyiur",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "05:46 (14 mnt awal)",
    avgWorkingHours: 8.20,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Top presensi koridor Senyiur, jam kerja harian memenuhi target",
  },
  {
    rank: 4,
    employeeId: "98260519",
    fullName: "Abdhu Rahman",
    jobPosition: "Spv Plant",
    organization: "Plant",
    branchName: "Senyiur",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "06:48 (12 mnt awal)",
    avgWorkingHours: 8.18,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Inspeksi workshop pagi konsisten, 0 hari mangkir, zero late-in",
  },
  {
    rank: 5,
    employeeId: "98250193",
    fullName: "Agus Sunarto",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Muara Pahu",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "05:49 (11 mnt awal)",
    avgWorkingHours: 8.16,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Presensi shift malam (NS) konsisten tepat waktu, ritase prima",
  },
  {
    rank: 6,
    employeeId: "98240009",
    fullName: "Agung Rubiansyah",
    jobPosition: "Spv Plant",
    organization: "Plant",
    branchName: "Senyiur",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "06:50 (10 mnt awal)",
    avgWorkingHours: 8.15,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Kehadiran pemeliharaan armada 100%, disiplin jadwal shift harian",
  },
  {
    rank: 7,
    employeeId: "88250423",
    fullName: "Ade Pratama",
    jobPosition: "Admin",
    organization: "Logistic",
    branchName: "Senyiur",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "06:51 (9 mnt awal)",
    avgWorkingHours: 8.14,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Administrasi logistik tepat waktu, absensi tapping barcode akurat",
  },
  {
    rank: 8,
    employeeId: "98260459",
    fullName: "A. Pallawa Rukka Rizal, SH",
    jobPosition: "Spv Human Resource",
    organization: "Hrga",
    branchName: "Senyiur",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "06:52 (8 mnt awal)",
    avgWorkingHours: 8.12,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Role model kepatuhan jam kerja HRGA, jam operasional terpenuhi penuh",
  },
  {
    rank: 9,
    employeeId: "98250326",
    fullName: "Ahmad Aldian Purwanto",
    jobPosition: "Spv Production",
    organization: "Production",
    branchName: "Muara Pahu",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "05:52 (8 mnt awal)",
    avgWorkingHours: 8.12,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Pengawasan pit Muara Pahu on-time, disiplin tapping absensi harian",
  },
  {
    rank: 10,
    employeeId: "88250163",
    fullName: "Agung Nugraha Putra Batara Isarong",
    jobPosition: "Spv System & Complience",
    organization: "HSE",
    branchName: "Senyiur",
    totalPresentDays: 22,
    workDaysTotal: 22,
    lateInCount: 0,
    avgClockInTime: "06:54 (6 mnt awal)",
    avgWorkingHours: 8.10,
    alphaDays: 0,
    sickDays: 0,
    atrScore: 100.0,
    highlight: "Kepatuhan SOP presensi sempurna, nihil deviasi jam kerja",
  },
];

// =========================================================================
// 4. TOP 10 KARYAWAN ABSENSI PALING KURANG / BUTUH PEMBINAAN
// Kriteria: Terlambat Masuk (Late In) Tinggi, Jam Kerja Tidak Memenuhi (<7.5 Jam),
//           Mangkir (Alpha > 1 hari), ATR Terendah
// =========================================================================
export interface UnderperformingAttendanceItem {
  rank: number;
  employeeId: string;
  fullName: string;
  jobPosition: string;
  organization: string;
  branchName: string;
  totalPresentDays: number;
  workDaysTotal: number;
  lateInCount: number;
  avgLateDuration: string; // e.g. "24 mnt"
  avgWorkingHours: number; // Jam
  alphaDays: number;
  sickDays: number;
  atrScore: number;
  violationReason: string;
  recommendedAction: string;
}

const TOP_10_LOWEST_ATTENDANCE: UnderperformingAttendanceItem[] = [
  {
    rank: 1,
    employeeId: "98250499",
    fullName: "Rizky Firmansyah",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Muara Pahu",
    totalPresentDays: 17,
    workDaysTotal: 22,
    lateInCount: 6,
    avgLateDuration: "32 mnt",
    avgWorkingHours: 7.15,
    alphaDays: 3,
    sickDays: 2,
    atrScore: 77.3,
    violationReason: "3x Alpha tanpa keterangan, 6x terlambat shift pagi",
    recommendedAction: "Penerbitan SP-1 & Konseling Disiplin Shift Produksi",
  },
  {
    rank: 2,
    employeeId: "98260112",
    fullName: "Agus Triyono",
    jobPosition: "Mechanic Heavy Equipment",
    organization: "Plant",
    branchName: "Muara Pahu",
    totalPresentDays: 17,
    workDaysTotal: 22,
    lateInCount: 7,
    avgLateDuration: "28 mnt",
    avgWorkingHours: 7.20,
    alphaDays: 2,
    sickDays: 3,
    atrScore: 77.3,
    violationReason: "Terlambat tertinggi (7x Late In), jam kerja rata-rata 7.2 jam",
    recommendedAction: "Panggilan Pembinaan oleh Spv Plant & Peringatan Tertulis",
  },
  {
    rank: 3,
    employeeId: "98240087",
    fullName: "Hendra Wijaya",
    jobPosition: "Operator Wheel Loader",
    organization: "Production",
    branchName: "Senyiur",
    totalPresentDays: 16,
    workDaysTotal: 22,
    lateInCount: 4,
    avgLateDuration: "21 mnt",
    avgWorkingHours: 6.95,
    alphaDays: 2,
    sickDays: 4,
    atrScore: 72.7,
    violationReason: "Jam kerja tidak memenuhi (<7 jam), 4 hari sakit beruntun",
    recommendedAction: "Evaluasi MCU Ulang & Validasi Surat Keterangan Sakit",
  },
  {
    rank: 4,
    employeeId: "98250344",
    fullName: "Bambang Pamungkas",
    jobPosition: "Auto Electrician",
    organization: "Plant",
    branchName: "Muara Pahu",
    totalPresentDays: 18,
    workDaysTotal: 22,
    lateInCount: 5,
    avgLateDuration: "25 mnt",
    avgWorkingHours: 7.30,
    alphaDays: 2,
    sickDays: 2,
    atrScore: 81.8,
    violationReason: "2x Alpha berturut-turut, sering terlambat pergantian shift",
    recommendedAction: "Konseling Roster Kerja oleh HRGA Site Muara Pahu",
  },
  {
    rank: 5,
    employeeId: "98260205",
    fullName: "Dedi Supriyadi",
    jobPosition: "Pit Controller",
    organization: "Production",
    branchName: "Muara Pahu",
    totalPresentDays: 18,
    workDaysTotal: 22,
    lateInCount: 4,
    avgLateDuration: "19 mnt",
    avgWorkingHours: 7.35,
    alphaDays: 2,
    sickDays: 2,
    atrScore: 81.8,
    violationReason: "Waktu masuk pit tidak tepat jadwal briefing harian",
    recommendedAction: "Briefing Ulang SOP Kedisiplinan Pit Dispatch",
  },
  {
    rank: 6,
    employeeId: "88250331",
    fullName: "Fajar Nugroho",
    jobPosition: "Side Dump Spotter",
    organization: "Production",
    branchName: "Senyiur",
    totalPresentDays: 18,
    workDaysTotal: 22,
    lateInCount: 5,
    avgLateDuration: "22 mnt",
    avgWorkingHours: 7.40,
    alphaDays: 2,
    sickDays: 2,
    atrScore: 81.8,
    violationReason: "5x Late in pada shift malam, jam tapping keluar lebih awal",
    recommendedAction: "Pengawasan Absensi Biometrik oleh Mandor Lapangan",
  },
  {
    rank: 7,
    employeeId: "98250144",
    fullName: "Eko Prasetyo",
    jobPosition: "Mechanic Fresh Bmc",
    organization: "Plant",
    branchName: "Muara Pahu",
    totalPresentDays: 19,
    workDaysTotal: 22,
    lateInCount: 4,
    avgLateDuration: "18 mnt",
    avgWorkingHours: 7.45,
    alphaDays: 1,
    sickDays: 2,
    atrScore: 86.4,
    violationReason: "Jam kerja tidak memenuhi standar 8 jam (kurang 33 menit/hari)",
    recommendedAction: "Review Log Kehadiran Workshop & Pendampingan Lead Mechanic",
  },
  {
    rank: 8,
    employeeId: "98260388",
    fullName: "Ilham Ramadhan",
    jobPosition: "Fuel Attendant",
    organization: "Logistic",
    branchName: "Muara Pahu",
    totalPresentDays: 19,
    workDaysTotal: 22,
    lateInCount: 3,
    avgLateDuration: "24 mnt",
    avgWorkingHours: 7.50,
    alphaDays: 1,
    sickDays: 2,
    atrScore: 86.4,
    violationReason: "1x Alpha & 3x terlambat di stasiun pengisian fuel",
    recommendedAction: "Teguran Lisan Spv Logistic & Penataan Jadwal Piket",
  },
  {
    rank: 9,
    employeeId: "98240092",
    fullName: "Wahyu Hidayat",
    jobPosition: "Driver Double Trailer",
    organization: "Production",
    branchName: "Senyiur",
    totalPresentDays: 19,
    workDaysTotal: 22,
    lateInCount: 4,
    avgLateDuration: "17 mnt",
    avgWorkingHours: 7.55,
    alphaDays: 1,
    sickDays: 2,
    atrScore: 86.4,
    violationReason: "Keterlambatan tapping kartu sebelum antrean hauling",
    recommendedAction: "Monitoring Disiplin Antrean Hauling Senyiur",
  },
  {
    rank: 10,
    employeeId: "86260491",
    fullName: "M. Yusuf Saputra",
    jobPosition: "Welder Workshop",
    organization: "Plant",
    branchName: "Muara Pahu",
    totalPresentDays: 19,
    workDaysTotal: 22,
    lateInCount: 3,
    avgLateDuration: "20 mnt",
    avgWorkingHours: 7.60,
    alphaDays: 1,
    sickDays: 2,
    atrScore: 86.4,
    violationReason: "Pulang sebelum jam shift selesai tanpa izin atasan",
    recommendedAction: "Pemeriksaan Form Izin Keluar Site oleh HRGA",
  },
];

export const ATRDashboardView: React.FC<ATRDashboardViewProps> = ({
  user,
  onNavigateToMasterManpower,
  onNavigateToHRDashboard,
}) => {
  // Pilihan Sheet Bulan (Format G-Form: jan-26, feb-26, ...)
  const [selectedSheet, setSelectedSheet] = useState<SheetMonthKey>("okt-26");

  // Chart Mode State
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const [showMA3, setShowMA3] = useState<boolean>(true);
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);

  // Tab Table Leaderboard State: "best" | "lowest"
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"best" | "lowest">("best");

  // Filter Sub-Lokasi Jobsite: "all" | "Muara Pahu" | "Senyiur"
  const [jobsiteSubFilter, setJobsiteSubFilter] = useState<"all" | "Muara Pahu" | "Senyiur">("all");

  // Search Karyawan
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>("");

  // Record Data Terpilih
  const activeRecord: JobsiteMonthlyATR = useMemo(() => {
    const found = JOBSITE_MONTHLY_ATR.find((r) => r.sheetName === selectedSheet);
    return found || JOBSITE_MONTHLY_ATR[9]; // Default Okt-26
  }, [selectedSheet]);

  // Filter Leaderboard List
  const filteredBest = useMemo(() => {
    return TOP_10_BEST_ATTENDANCE.filter((emp) => {
      const matchSite = jobsiteSubFilter === "all" || emp.branchName === jobsiteSubFilter;
      const matchQuery =
        !searchEmployeeQuery ||
        emp.fullName.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
        emp.employeeId.includes(searchEmployeeQuery) ||
        emp.jobPosition.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
      return matchSite && matchQuery;
    });
  }, [jobsiteSubFilter, searchEmployeeQuery]);

  const filteredLowest = useMemo(() => {
    return TOP_10_LOWEST_ATTENDANCE.filter((emp) => {
      const matchSite = jobsiteSubFilter === "all" || emp.branchName === jobsiteSubFilter;
      const matchQuery =
        !searchEmployeeQuery ||
        emp.fullName.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
        emp.employeeId.includes(searchEmployeeQuery) ||
        emp.jobPosition.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
      return matchSite && matchQuery;
    });
  }, [jobsiteSubFilter, searchEmployeeQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">
      {/* ========================================================================= */}
      {/* 1. HEADER EXECUTIVE HERO & BANNER JOBSITE FOCUS                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
                <HardHat size={14} className="text-[#e95623]" />
                Jobsite Operations (Muara Pahu &amp; Senyiur)
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
              ATR Dashboard Jobsite
              <span className="text-base font-semibold text-slate-500">
                (Attendance Tracking &amp; Ratio)
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-medium">
              Monitoring tingkat kehadiran 400 personil aktif Jobsite per sheet bulanan G-Form. Terintegrasi dengan analitika jam kerja, kepatuhan tepat waktu, dan perankingan kehadiran.
            </p>
          </div>

          {/* Quick Buttons */}
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

        {/* Highlight Banner: BoD Excluded & Focus on Jobsite Workforce */}
        <div className="p-3.5 bg-linear-to-r from-orange-50/60 via-amber-50/40 to-slate-50 rounded-2xl border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck size={15} />
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-900 font-bold block">
                Fokus Operasional Jobsite (400 Personil Aktif Lapangan)
              </span>
              <p className="text-[11px] text-slate-600">
                Mencakup 7 departemen operasional site. Jajaran <strong>BoD (Direksi)</strong> dan staf Head Office Jakarta telah dipisahkan.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
            BoD Excluded (0 Direksi)
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER CONTROLS BAR (SHEET SELECTION & SITE FILTER)                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilihan Sheet Bulan (Format G-Form: jan-26, feb-26, ...) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-[#e95623]" />
              Sheet Bulan:
            </span>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value as SheetMonthKey)}
              aria-label="Pilih Sheet Bulan G-Form"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
            >
              {JOBSITE_MONTHLY_ATR.map((item) => (
                <option key={item.sheetName} value={item.sheetName}>
                  {item.sheetName} ({item.label})
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Sub-Filter Site Lapangan: Semua | Muara Pahu | Senyiur */}
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
                Semua Jobsite (400)
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
        </div>

        {/* Quick Month Metrics Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-500">
          <span>Hari Kerja: <strong className="text-slate-800">{activeRecord.workDays} Hari</strong></span>
          <span>•</span>
          <span>Jam Kerja Ideal: <strong className="text-slate-800 font-mono">{(activeRecord.totalWorkDays * 8).toLocaleString("id-ID")} Jam</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SPEEDOMETER GAUGE & TOP KPI CARDS (DASHBOARD LEBIH BAGUS)             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Speedometer Radial Card (Jobsite ATR Gauge) */}
        <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Gauge size={16} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Speedometer ATR
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              OPTIMAL
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
                stroke="#10b981"
                strokeWidth="14"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * Math.min(100, Math.max(0, (activeRecord.atrPercent - 90) / 10)))}
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
            <span>400 Personil Aktif</span>
            <span className="text-emerald-700 font-bold">+{(activeRecord.atrPercent - 95.0).toFixed(1)}% vs Target</span>
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
              <span className="text-blue-600">Cuti: {activeRecord.leave}</span>
              <span>•</span>
              <span className="text-amber-600">Sakit: {activeRecord.sick}</span>
              <span>•</span>
              <span className="text-rose-600 font-black">Alpha: {activeRecord.alpha}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold flex items-center justify-between">
            <span>Alpha Terkendali di bawah 1.0%</span>
            <span className="text-rose-600 font-bold">{activeRecord.alpha} Mandays</span>
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
              SOP Standar: 8.00 Jam / Shift (Memenuhi 101.5%)
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
            <span className="text-amber-600 font-bold">{activeRecord.lateIn} Terlambat (Late In)</span>
            <span className="text-emerald-700 font-bold">On-Time: 99.6%</span>
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
              <TrendingUp size={18} className="text-[#e95623]" />
              Tren ATR Jobsite Bulan ke Bulan (Jan-26 s/d Nov-26)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 border border-orange-200 text-[#e95623]">
                Trend Line &amp; Moving Average
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Analisis pergerakan tingkat kehadiran aktual, garis tren linier, dan moving average 3-bulan
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
            <ComposedChart data={JOBSITE_MONTHLY_ATR} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="jobsiteAtrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e95623" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#e95623" stopOpacity={0.0} />
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
                domain={[94.5, 98.0]}
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

              {/* Area & Line Realisasi ATR */}
              <Area
                type="monotone"
                dataKey="atrPercent"
                name="Realisasi ATR"
                stroke="#e95623"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#jobsiteAtrGradient)"
                dot={{ r: 4, fill: "#e95623", strokeWidth: 2, stroke: "#fff" }}
              >
                <LabelList
                  dataKey="atrPercent"
                  position="top"
                  formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                  style={{ fontSize: "10px", fontWeight: "bold", fill: "#e95623" }}
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
            <span className="flex items-center gap-1.5 font-bold text-[#e95623]">
              <span className="w-3 h-3 rounded-full bg-[#e95623]" />
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
            Arah Pertumbuhan: <strong className="text-emerald-700 font-bold">Tren Meningkat (+1.3% YTD)</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TABEL DEPARTEMEN JOBSITE (URUT DARI ATR TERBAIK HINGGA TERENDAH)        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              Peringkat Departemen Jobsite (ATR Terbaik ke Terendah)
            </h3>
            <p className="text-xs text-slate-500">
              Disamakan persis dengan data organisasi Master Manpower Jobsite Muara Pahu &amp; Senyiur (Total 400 Personil)
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            Seluruh 7 Departemen Melampaui SLA 95%
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
              {JOBSITE_DEPARTMENTS_RANKED.map((row) => (
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
                    <span className="text-[10px] text-slate-400">Site MP &amp; SNY</span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                    {row.primaryPositions}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900">{row.headcount}</td>
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
      {/* 6. TOP 10 KARYAWAN ABSEN TERBAIK VS TOP 10 ABSEN PALING JELEK             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        {/* Header & Leaderboard Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Award size={18} className="text-[#e95623]" />
              Leaderboard Presensi: Top 10 Terbaik vs 10 Perlu Pembinaan
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi akurasi waktu masuk, pemenuhan 8 jam kerja, tingkat Alpha, dan ATR individu karyawan Jobsite
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
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623] w-52 sm:w-60"
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
                10 Perlu Pembinaan
              </button>
            </div>
          </div>
        </div>

        {/* TABEL 1: 10 KARYAWAN ABSEN PALING BAGUS */}
        {activeLeaderboardTab === "best" && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                Kriteria: Waktu masuk tepat waktu (0 Late In), jam kerja rata-rata ≥ 8.1 Jam, kehadiran 100% (22/22 hari kerja), nihil pelanggaran.
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                Zero Late In
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
                    <th className="py-3 px-3">Site</th>
                    <th className="py-3 px-3 text-center">Hadir</th>
                    <th className="py-3 px-3 text-center text-emerald-700">Waktu Masuk</th>
                    <th className="py-3 px-3 text-center text-purple-700">Jam Kerja / Hari</th>
                    <th className="py-3 px-3 text-center">Late In</th>
                    <th className="py-3 px-3 text-center font-black">ATR</th>
                    <th className="py-3 px-3">Catatan Disiplin</th>
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
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono">
                        {emp.totalPresentDays}/{emp.workDaysTotal}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 font-mono text-[11px]">
                        {emp.avgClockInTime}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-purple-700 font-mono">
                        {emp.avgWorkingHours.toFixed(2)} Jam
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          0x (Nihil)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {emp.atrScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {emp.highlight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABEL 2: 10 KARYAWAN ABSEN PALING KURANG / BUTUH PEMBINAAN */}
        {activeLeaderboardTab === "lowest" && (
          <div className="space-y-3">
            <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-600" />
                Kriteria: Sering terlambat (Late In &gt; 3x), jam kerja di bawah standar 8 jam, terdapat Alpha (1-3 hari), atau ATR &lt; 87%.
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-200 text-rose-900">
                Needs Coaching
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
                    <th className="py-3 px-3">Site</th>
                    <th className="py-3 px-3 text-center">Hadir</th>
                    <th className="py-3 px-3 text-center text-rose-700">Alpha</th>
                    <th className="py-3 px-3 text-center text-amber-700">Late In</th>
                    <th className="py-3 px-3 text-center text-slate-700">Jam / Hari</th>
                    <th className="py-3 px-3 text-center font-black">ATR</th>
                    <th className="py-3 px-3">Indikasi Pelanggaran &amp; Rekomendasi</th>
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
                      <td className="py-3 px-3 text-center font-bold text-slate-700 font-mono">
                        {emp.totalPresentDays}/{emp.workDaysTotal}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-700 font-mono">
                        {emp.alphaDays} Hari
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700 font-mono">
                        {emp.lateInCount}x ({emp.avgLateDuration})
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600 font-mono">
                        {emp.avgWorkingHours.toFixed(2)} Jam
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                          {emp.atrScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-800 font-semibold block text-[11px]">
                          {emp.violationReason}
                        </span>
                        <span className="text-rose-700 font-bold text-[10px]">
                          Action: {emp.recommendedAction}
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
      {/* 7. OPERATIONAL INTELLIGENCE FOOTER                                       */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>
            Data presensi Jobsite disinkronkan dari respon G-Form sheet (<code className="text-slate-800 font-bold">{selectedSheet}</code>). 7 Departemen sesuai database Master Manpower.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px]">
          <span>Eksklusi: <strong>Direksi (BoD) 0</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">Status: Terverifikasi Aktif</span>
        </div>
      </div>
    </div>
  );
};
