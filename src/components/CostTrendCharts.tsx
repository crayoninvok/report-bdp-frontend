"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";
import { JobSite, User } from "../types/auth";
import { reportService } from "../services/reportService";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Sliders,
  DollarSign,
  Maximize2,
  Users,
  Fuel,
  Disc,
  Wrench,
  LayoutGrid,
  BarChart3,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Presentation,
  Scale,
  Coins,
} from "lucide-react";
import { CostReportPdfExportModal } from "./CostReportPdfExportModal";

// =========================================================================
// TYPES & CATEGORIES METADATA
// =========================================================================
export type CostCategoryKey = "total" | "comp" | "fuel" | "tyre" | "rep" | "ovh";

export interface CostCategoryMeta {
  key: CostCategoryKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  lightBg: string;
  borderCol: string;
  textCol: string;
  description: string;
}

export const COST_CATEGORIES: CostCategoryMeta[] = [
  {
    key: "total",
    label: "BIAYA PRODUKSI",
    shortLabel: "BIAYA PRODUKSI",
    icon: DollarSign,
    color: "#e95623",
    lightBg: "bg-[#fff5f1]",
    borderCol: "border-[#ffd2c2]",
    textCol: "text-[#e95623]",
    description: "Total akumulasi seluruh akun utama biaya produksi operasional site",
  },
  {
    key: "comp",
    label: "BEBAN COMPENSATION AND BENEFIT - SITE",
    shortLabel: "BEBAN COMPENSATION AND BENEFIT - SITE",
    icon: Users,
    color: "#059669",
    lightBg: "bg-emerald-50",
    borderCol: "border-emerald-200",
    textCol: "text-emerald-700",
    description: "Gaji, tunjangan karyawan, lembur, dan kompensasi operasional site",
  },
  {
    key: "fuel",
    label: "BEBAN FUEL - PRODUCTION",
    shortLabel: "BEBAN FUEL - PRODUCTION",
    icon: Fuel,
    color: "#D97706",
    lightBg: "bg-amber-50",
    borderCol: "border-amber-200",
    textCol: "text-amber-700",
    description: "Konsumsi bahan bakar solar untuk alat berat dan pendukung produksi",
  },
  {
    key: "tyre",
    label: "BEBAN TYRE",
    shortLabel: "BEBAN TYRE",
    icon: Disc,
    color: "#7C3AED",
    lightBg: "bg-purple-50",
    borderCol: "border-purple-200",
    textCol: "text-purple-700",
    description: "Pengadaan, penggantian ban dump truck/support, rim, dan maintenance ban",
  },
  {
    key: "rep",
    label: "BEBAN REPAIRS & MAINTENANCE",
    shortLabel: "BEBAN REPAIRS & MAINTENANCE",
    icon: Wrench,
    color: "#18bebc",
    lightBg: "bg-[#f0fdfd]",
    borderCol: "border-[#ccfbf9]",
    textCol: "text-[#0e9f9d]",
    description: "Perbaikan unit, penggantian sparepart, perlengkapan tools, & external services",
  },
  {
    key: "ovh",
    label: "BEBAN OVERHEAD COST - SITE",
    shortLabel: "BEBAN OVERHEAD COST - SITE",
    icon: Building2,
    color: "#E11D48",
    lightBg: "bg-rose-50",
    borderCol: "border-rose-200",
    textCol: "text-rose-700",
    description: "Biaya umum kantor site, rental non-produksi, mess, koordinasi keamanan, & perizinan",
  },
];

export interface CostRecordDetail {
  budget: number;
  realisasi: number;
  deviasi: number;
}

export interface ProductionDetail {
  budget: number;
  realisasi: number;
}

export interface IdrPerTonDetail {
  budget: number;
  realisasi: number;
  deviasi: number;
}

export interface FullPeriodRecord {
  label: string;
  isToday?: boolean;
  total: CostRecordDetail;
  comp: CostRecordDetail;
  fuel: CostRecordDetail;
  tyre: CostRecordDetail;
  rep: CostRecordDetail;
  ovh: CostRecordDetail;
  produksi?: ProductionDetail;
  idrPerTon?: IdrPerTonDetail;
}

// =========================================================================
// 1. DATA HISTORIS MINGGUAN (WEEKS 29 - 40) - HASIL SEED DATABASE EXACT
// =========================================================================
export const RAW_WEEKLY_SENYIUR: FullPeriodRecord[] = [
  {
    label: "W29",
    total: { budget: 21655, realisasi: 26600, deviasi: -4945 },
    comp: { budget: 1566, realisasi: 1800, deviasi: -234 },
    fuel: { budget: 7517, realisasi: 10030, deviasi: -2513 },
    tyre: { budget: 1458, realisasi: 2918, deviasi: -1460 },
    rep: { budget: 1167, realisasi: 1161, deviasi: 6 },
    ovh: { budget: 374, realisasi: 840, deviasi: -466 },
    produksi: { budget: 551862, realisasi: 534555 },
  },
  {
    label: "W30",
    total: { budget: 28246, realisasi: 36069, deviasi: -7823 },
    comp: { budget: 2178, realisasi: 2350, deviasi: -172 },
    fuel: { budget: 9805, realisasi: 12914, deviasi: -3109 },
    tyre: { budget: 1902, realisasi: 3987, deviasi: -2085 },
    rep: { budget: 1522, realisasi: 1545, deviasi: -23 },
    ovh: { budget: 483, realisasi: 1100, deviasi: -617 },
    produksi: { budget: 719820, realisasi: 719058 },
  },
  {
    label: "W31",
    total: { budget: 5649, realisasi: 5656, deviasi: -7 },
    comp: { budget: 436, realisasi: 450, deviasi: -14 },
    fuel: { budget: 1961, realisasi: 1980, deviasi: -19 },
    tyre: { budget: 380, realisasi: 434, deviasi: -54 },
    rep: { budget: 304, realisasi: 129, deviasi: 175 },
    ovh: { budget: 97, realisasi: 270, deviasi: -173 },
    produksi: { budget: 143964, realisasi: 128020 },
  },
  {
    label: "W32",
    total: { budget: 13181, realisasi: 14323, deviasi: -1142 },
    comp: { budget: 1016, realisasi: 1100, deviasi: -84 },
    fuel: { budget: 4576, realisasi: 5621, deviasi: -1045 },
    tyre: { budget: 888, realisasi: 1364, deviasi: -476 },
    rep: { budget: 710, realisasi: 588, deviasi: 122 },
    ovh: { budget: 225, realisasi: 520, deviasi: -295 },
    produksi: { budget: 335916, realisasi: 290073 },
  },
  {
    label: "W33",
    total: { budget: 19772, realisasi: 22573, deviasi: -2801 },
    comp: { budget: 1524, realisasi: 1650, deviasi: -126 },
    fuel: { budget: 6864, realisasi: 7004, deviasi: -140 },
    tyre: { budget: 1332, realisasi: 1879, deviasi: -547 },
    rep: { budget: 1065, realisasi: 2215, deviasi: -1150 },
    ovh: { budget: 338, realisasi: 750, deviasi: -412 },
    produksi: { budget: 503874, realisasi: 329844 },
  },
  {
    label: "W34",
    total: { budget: 26363, realisasi: 26467, deviasi: -104 },
    comp: { budget: 2033, realisasi: 2100, deviasi: -67 },
    fuel: { budget: 9152, realisasi: 7521, deviasi: 1631 },
    tyre: { budget: 1775, realisasi: 1855, deviasi: -80 },
    rep: { budget: 1420, realisasi: 2562, deviasi: -1142 },
    ovh: { budget: 451, realisasi: 855, deviasi: -404 },
    produksi: { budget: 671832, realisasi: 329844 },
  },
  {
    label: "W35",
    total: { budget: 2783, realisasi: 587, deviasi: 2196 },
    comp: { budget: 215, realisasi: 282, deviasi: -67 },
    fuel: { budget: 0, realisasi: 63, deviasi: -63 },
    tyre: { budget: 190, realisasi: 0, deviasi: 190 },
    rep: { budget: 152, realisasi: 18, deviasi: 134 },
    ovh: { budget: 48, realisasi: 56, deviasi: -8 },
    produksi: { budget: 71982, realisasi: 0 },
  },
  {
    label: "W36",
    total: { budget: 10206, realisasi: 4426, deviasi: 5780 },
    comp: { budget: 787, realisasi: 769, deviasi: 18 },
    fuel: { budget: 0, realisasi: 121, deviasi: -121 },
    tyre: { budget: 697, realisasi: 0, deviasi: 697 },
    rep: { budget: 558, realisasi: 21, deviasi: 537 },
    ovh: { budget: 174, realisasi: 62, deviasi: 112 },
    produksi: { budget: 263934, realisasi: 0 },
  },
  {
    label: "W37",
    total: { budget: 15797, realisasi: 8854, deviasi: 6943 },
    comp: { budget: 1288, realisasi: 2068, deviasi: -780 },
    fuel: { budget: 1, realisasi: 489, deviasi: -488 },
    tyre: { budget: 1141, realisasi: 0, deviasi: 1141 },
    rep: { budget: 913, realisasi: 56, deviasi: 857 },
    ovh: { budget: 285, realisasi: 417, deviasi: -132 },
    produksi: { budget: 431892, realisasi: 0 },
  },
  {
    label: "W38",
    total: { budget: 16595, realisasi: 9631, deviasi: 6964 },
    comp: { budget: 1161, realisasi: 1983, deviasi: -822 },
    fuel: { budget: 6805, realisasi: 522, deviasi: 6283 },
    tyre: { budget: 876, realisasi: 0, deviasi: 876 },
    rep: { budget: 701, realisasi: 60, deviasi: 641 },
    ovh: { budget: 398, realisasi: 563, deviasi: -165 },
    produksi: { budget: 331670, realisasi: 0 },
  },
  {
    label: "W39",
    total: { budget: 21027, realisasi: 12133, deviasi: 8894 },
    comp: { budget: 2592, realisasi: 2903, deviasi: -311 },
    fuel: { budget: 8166, realisasi: 554, deviasi: 7612 },
    tyre: { budget: 1052, realisasi: 0, deviasi: 1052 },
    rep: { budget: 841, realisasi: 64, deviasi: 777 },
    ovh: { budget: 425, realisasi: 899, deviasi: -474 },
    produksi: { budget: 398000, realisasi: 0 },
  },
  {
    label: "W40",
    total: { budget: 1437, realisasi: 1786, deviasi: -349 },
    comp: { budget: 416, realisasi: 788, deviasi: -372 },
    fuel: { budget: 58, realisasi: 34, deviasi: 24 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 3, realisasi: 1, deviasi: 2 },
    ovh: { budget: 87, realisasi: 147, deviasi: -60 },
    produksi: { budget: 173161, realisasi: 0 },
  },
  {
    label: "W41",
    total: { budget: 1257, realisasi: 755, deviasi: 502 },
    comp: { budget: 364, realisasi: 0, deviasi: 364 },
    fuel: { budget: 51, realisasi: 41, deviasi: 10 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 2, realisasi: 1, deviasi: 1 },
    ovh: { budget: 76, realisasi: 0, deviasi: 76 },
    produksi: { budget: 151516, realisasi: 0 },
  },
];

export const RAW_WEEKLY_MUARAPAHU: FullPeriodRecord[] = [
  {
    label: "W29",
    total: { budget: 3182, realisasi: 1013, deviasi: 2169 },
    comp: { budget: 271, realisasi: 107, deviasi: 164 },
    fuel: { budget: 1458, realisasi: 297, deviasi: 1161 },
    tyre: { budget: 211, realisasi: 0, deviasi: 211 },
    rep: { budget: 211, realisasi: 98, deviasi: 113 },
    ovh: { budget: 157, realisasi: 210, deviasi: -53 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "W30",
    total: { budget: 4151, realisasi: 1596, deviasi: 2555 },
    comp: { budget: 354, realisasi: 501, deviasi: -147 },
    fuel: { budget: 1901, realisasi: 297, deviasi: 1604 },
    tyre: { budget: 275, realisasi: 0, deviasi: 275 },
    rep: { budget: 275, realisasi: 117, deviasi: 158 },
    ovh: { budget: 205, realisasi: 250, deviasi: -45 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "W31",
    total: { budget: 830, realisasi: 584, deviasi: 246 },
    comp: { budget: 71, realisasi: 1, deviasi: 70 },
    fuel: { budget: 380, realisasi: 535, deviasi: -155 },
    tyre: { budget: 55, realisasi: 41, deviasi: 14 },
    rep: { budget: 55, realisasi: 2, deviasi: 53 },
    ovh: { budget: 41, realisasi: 5, deviasi: 36 },
    produksi: { budget: 18866, realisasi: 17204 },
  },
  {
    label: "W32",
    total: { budget: 1937, realisasi: 1529, deviasi: 408 },
    comp: { budget: 165, realisasi: 250, deviasi: -85 },
    fuel: { budget: 887, realisasi: 811, deviasi: 76 },
    tyre: { budget: 128, realisasi: 118, deviasi: 10 },
    rep: { budget: 128, realisasi: 177, deviasi: -49 },
    ovh: { budget: 96, realisasi: 91, deviasi: 5 },
    produksi: { budget: 44021, realisasi: 45969 },
  },
  {
    label: "W33",
    total: { budget: 2906, realisasi: 3124, deviasi: -218 },
    comp: { budget: 248, realisasi: 334, deviasi: -86 },
    fuel: { budget: 1331, realisasi: 2001, deviasi: -670 },
    tyre: { budget: 192, realisasi: 193, deviasi: -1 },
    rep: { budget: 192, realisasi: 286, deviasi: -94 },
    ovh: { budget: 143, realisasi: 164, deviasi: -21 },
    produksi: { budget: 66032, realisasi: 57519 },
  },
  {
    label: "W34",
    total: { budget: 3874, realisasi: 3508, deviasi: 366 },
    comp: { budget: 330, realisasi: 422, deviasi: -92 },
    fuel: { budget: 1774, realisasi: 2092, deviasi: -318 },
    tyre: { budget: 256, realisasi: 375, deviasi: -119 },
    rep: { budget: 256, realisasi: 273, deviasi: -17 },
    ovh: { budget: 191, realisasi: 180, deviasi: 11 },
    produksi: { budget: 88043, realisasi: 0 },
  },
  {
    label: "W35",
    total: { budget: 415, realisasi: 2590, deviasi: -2175 },
    comp: { budget: 35, realisasi: 302, deviasi: -267 },
    fuel: { budget: 190, realisasi: 494, deviasi: -304 },
    tyre: { budget: 27, realisasi: 0, deviasi: 27 },
    rep: { budget: 27, realisasi: 148, deviasi: -121 },
    ovh: { budget: 20, realisasi: 636, deviasi: -616 },
    produksi: { budget: 9433, realisasi: 19463 },
  },
  {
    label: "W36",
    total: { budget: 1522, realisasi: 4532, deviasi: -3010 },
    comp: { budget: 130, realisasi: 415, deviasi: -285 },
    fuel: { budget: 697, realisasi: 2402, deviasi: -1705 },
    tyre: { budget: 101, realisasi: 92, deviasi: 9 },
    rep: { budget: 101, realisasi: 161, deviasi: -60 },
    ovh: { budget: 75, realisasi: 174, deviasi: -99 },
    produksi: { budget: 34588, realisasi: 78188 },
  },
  {
    label: "W37",
    total: { budget: 2491, realisasi: 6883, deviasi: -4392 },
    comp: { budget: 212, realisasi: 975, deviasi: -763 },
    fuel: { budget: 1141, realisasi: 2763, deviasi: -1622 },
    tyre: { budget: 165, realisasi: 103, deviasi: 62 },
    rep: { budget: 165, realisasi: 642, deviasi: -477 },
    ovh: { budget: 123, realisasi: 209, deviasi: -86 },
    produksi: { budget: 56599, realisasi: 78188 },
  },
  {
    label: "W38",
    total: { budget: 18793, realisasi: 10485, deviasi: 8308 },
    comp: { budget: 1400, realisasi: 2199, deviasi: -799 },
    fuel: { budget: 9791, realisasi: 4405, deviasi: 5386 },
    tyre: { budget: 966, realisasi: 222, deviasi: 744 },
    rep: { budget: 966, realisasi: 625, deviasi: 341 },
    ovh: { budget: 720, realisasi: 187, deviasi: 533 },
    produksi: { budget: 331667, realisasi: 131651 },
  },
  {
    label: "W39",
    total: { budget: 22882, realisasi: 15754, deviasi: 7128 },
    comp: { budget: 1680, realisasi: 2511, deviasi: -831 },
    fuel: { budget: 11749, realisasi: 6625, deviasi: 5124 },
    tyre: { budget: 1159, realisasi: 504, deviasi: 655 },
    rep: { budget: 1159, realisasi: 749, deviasi: 410 },
    ovh: { budget: 864, realisasi: 222, deviasi: 642 },
    produksi: { budget: 398000, realisasi: 0 },
  },
  {
    label: "W40",
    total: { budget: 8606, realisasi: 4949, deviasi: 3657 },
    comp: { budget: 697, realisasi: 733, deviasi: -36 },
    fuel: { budget: 4782, realisasi: 1212, deviasi: 3570 },
    tyre: { budget: 504, realisasi: 372, deviasi: 132 },
    rep: { budget: 504, realisasi: 106, deviasi: 398 },
    ovh: { budget: 376, realisasi: 26, deviasi: 350 },
    produksi: { budget: 173161, realisasi: 147212 },
  },
  {
    label: "W41",
    total: { budget: 0, realisasi: 9850, deviasi: -9850 },
    comp: { budget: 0, realisasi: 1489, deviasi: -1489 },
    fuel: { budget: 0, realisasi: 4137, deviasi: -4137 },
    tyre: { budget: 0, realisasi: 732, deviasi: -732 },
    rep: { budget: 0, realisasi: 313, deviasi: -313 },
    ovh: { budget: 0, realisasi: 64, deviasi: -64 },
    produksi: { budget: 151516, realisasi: 192040 },
  },
];

// =========================================================================
// 2. DATA HISTORIS BULANAN (JAN - SEP 2026) PER KATEGORI BEBAN
// =========================================================================
export const RAW_MONTHLY_SENYIUR: FullPeriodRecord[] = [
  {
    label: "Jan",
    total: { budget: 30503, realisasi: 33501, deviasi: -2998 },
    comp: { budget: 2763, realisasi: 4534, deviasi: -1771 },
    fuel: { budget: 10590, realisasi: 11062, deviasi: -472 },
    tyre: { budget: 2054, realisasi: 3287, deviasi: -1233 },
    rep: { budget: 1644, realisasi: 1594, deviasi: 50 },
    ovh: { budget: 512, realisasi: 1653, deviasi: -1141 },
    produksi: { budget: 777406, realisasi: 711288 },
  },
  {
    label: "Feb",
    total: { budget: 28472, realisasi: 35343, deviasi: -6871 },
    comp: { budget: 2579, realisasi: 4677, deviasi: -2098 },
    fuel: { budget: 9884, realisasi: 11331, deviasi: -1447 },
    tyre: { budget: 1917, realisasi: 4098, deviasi: -2181 },
    rep: { budget: 1534, realisasi: 1352, deviasi: 182 },
    ovh: { budget: 479, realisasi: 379, deviasi: 100 },
    produksi: { budget: 725579, realisasi: 721549 },
  },
  {
    label: "Mar",
    total: { budget: 29487, realisasi: 38283, deviasi: -8796 },
    comp: { budget: 2671, realisasi: 6131, deviasi: -3460 },
    fuel: { budget: 10237, realisasi: 12028, deviasi: -1791 },
    tyre: { budget: 1986, realisasi: 4332, deviasi: -2346 },
    rep: { budget: 1589, realisasi: 1430, deviasi: 159 },
    ovh: { budget: 495, realisasi: 327, deviasi: 168 },
    produksi: { budget: 751492, realisasi: 676455 },
  },
  {
    label: "Apr",
    total: { budget: 30503, realisasi: 39045, deviasi: -8542 },
    comp: { budget: 2763, realisasi: 4847, deviasi: -2084 },
    fuel: { budget: 10590, realisasi: 15184, deviasi: -4594 },
    tyre: { budget: 2054, realisasi: 3395, deviasi: -1341 },
    rep: { budget: 1644, realisasi: 1246, deviasi: 398 },
    ovh: { budget: 512, realisasi: 802, deviasi: -290 },
    produksi: { budget: 777406, realisasi: 548131 },
  },
  {
    label: "May",
    total: { budget: 31522, realisasi: 38918, deviasi: -7396 },
    comp: { budget: 2855, realisasi: 3609, deviasi: -754 },
    fuel: { budget: 10943, realisasi: 15148, deviasi: -4205 },
    tyre: { budget: 2123, realisasi: 3604, deviasi: -1481 },
    rep: { budget: 1698, realisasi: 2161, deviasi: -463 },
    ovh: { budget: 531, realisasi: 656, deviasi: -125 },
    produksi: { budget: 803319, realisasi: 710718 },
  },
  {
    label: "Jun",
    total: { budget: 31522, realisasi: 42848, deviasi: -11326 },
    comp: { budget: 2855, realisasi: 6333, deviasi: -3478 },
    fuel: { budget: 10943, realisasi: 15352, deviasi: -4409 },
    tyre: { budget: 2123, realisasi: 3821, deviasi: -1698 },
    rep: { budget: 1698, realisasi: 1895, deviasi: -197 },
    ovh: { budget: 531, realisasi: 1417, deviasi: -886 },
    produksi: { budget: 803319, realisasi: 743330 },
  },
  {
    label: "Jul",
    total: { budget: 29187, realisasi: 41081, deviasi: -11894 },
    comp: { budget: 2644, realisasi: 5569, deviasi: -2925 },
    fuel: { budget: 10132, realisasi: 14096, deviasi: -3964 },
    tyre: { budget: 1966, realisasi: 4308, deviasi: -2342 },
    rep: { budget: 1572, realisasi: 1859, deviasi: -287 },
    ovh: { budget: 491, realisasi: 858, deviasi: -367 },
    produksi: { budget: 743814, realisasi: 743740 },
  },
  {
    label: "Aug",
    total: { budget: 29187, realisasi: 31925, deviasi: -2738 },
    comp: { budget: 2644, realisasi: 3228, deviasi: -584 },
    fuel: { budget: 10132, realisasi: 10538, deviasi: -406 },
    tyre: { budget: 1966, realisasi: 2227, deviasi: -261 },
    rep: { budget: 1572, realisasi: 2528, deviasi: -956 },
    ovh: { budget: 491, realisasi: 537, deviasi: -46 },
    produksi: { budget: 743814, realisasi: 406397 },
  },
  {
    label: "Sep",
    total: { budget: 21287, realisasi: 12133, deviasi: 9154 },
    comp: { budget: 2852, realisasi: 2903, deviasi: -51 },
    fuel: { budget: 8166, realisasi: 554, deviasi: 7612 },
    tyre: { budget: 1052, realisasi: 0, deviasi: 1052 },
    rep: { budget: 841, realisasi: 64, deviasi: 777 },
    ovh: { budget: 425, realisasi: 899, deviasi: -474 },
    produksi: { budget: 398000, realisasi: 0 },
  },
  {
    label: "Oct",
    total: { budget: 2694, realisasi: 2541, deviasi: 153 },
    comp: { budget: 781, realisasi: 774, deviasi: 7 },
    fuel: { budget: 109, realisasi: 74, deviasi: 35 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 5, realisasi: 2, deviasi: 3 },
    ovh: { budget: 163, realisasi: 131, deviasi: 32 },
    produksi: { budget: 324677, realisasi: 0 },
  },
];

export const RAW_MONTHLY_MUARAPAHU: FullPeriodRecord[] = [
  {
    label: "Jan",
    total: { budget: 0, realisasi: 0, deviasi: 0 },
    comp: { budget: 0, realisasi: 0, deviasi: 0 },
    fuel: { budget: 0, realisasi: 0, deviasi: 0 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 0, realisasi: 0, deviasi: 0 },
    ovh: { budget: 0, realisasi: 0, deviasi: 0 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "Feb",
    total: { budget: 0, realisasi: 0, deviasi: 0 },
    comp: { budget: 0, realisasi: 0, deviasi: 0 },
    fuel: { budget: 0, realisasi: 0, deviasi: 0 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 0, realisasi: 0, deviasi: 0 },
    ovh: { budget: 0, realisasi: 0, deviasi: 0 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "Mar",
    total: { budget: 0, realisasi: 0, deviasi: 0 },
    comp: { budget: 0, realisasi: 0, deviasi: 0 },
    fuel: { budget: 0, realisasi: 0, deviasi: 0 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 0, realisasi: 0, deviasi: 0 },
    ovh: { budget: 0, realisasi: 0, deviasi: 0 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "Apr",
    total: { budget: 0, realisasi: 194, deviasi: -194 },
    comp: { budget: 0, realisasi: 0, deviasi: 0 },
    fuel: { budget: 0, realisasi: 0, deviasi: 0 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 0, realisasi: 0, deviasi: 0 },
    ovh: { budget: 0, realisasi: 176, deviasi: -176 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "May",
    total: { budget: 0, realisasi: 142, deviasi: -142 },
    comp: { budget: 0, realisasi: 0, deviasi: 0 },
    fuel: { budget: 0, realisasi: 0, deviasi: 0 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 0, realisasi: 4, deviasi: -4 },
    ovh: { budget: 0, realisasi: 137, deviasi: -137 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "Jun",
    total: { budget: 0, realisasi: 523, deviasi: -523 },
    comp: { budget: 0, realisasi: 25, deviasi: -25 },
    fuel: { budget: 0, realisasi: 0, deviasi: 0 },
    tyre: { budget: 0, realisasi: 0, deviasi: 0 },
    rep: { budget: 0, realisasi: 77, deviasi: -77 },
    ovh: { budget: 0, realisasi: 21, deviasi: -21 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "Jul",
    total: { budget: 4151, realisasi: 1596, deviasi: 2555 },
    comp: { budget: 354, realisasi: 501, deviasi: -147 },
    fuel: { budget: 1901, realisasi: 297, deviasi: 1604 },
    tyre: { budget: 275, realisasi: 0, deviasi: 275 },
    rep: { budget: 275, realisasi: 117, deviasi: 158 },
    ovh: { budget: 205, realisasi: 250, deviasi: -45 },
    produksi: { budget: 0, realisasi: 0 },
  },
  {
    label: "Aug",
    total: { budget: 3874, realisasi: 3508, deviasi: 366 },
    comp: { budget: 330, realisasi: 422, deviasi: -92 },
    fuel: { budget: 1774, realisasi: 2092, deviasi: -318 },
    tyre: { budget: 256, realisasi: 375, deviasi: -119 },
    rep: { budget: 256, realisasi: 273, deviasi: -17 },
    ovh: { budget: 191, realisasi: 179, deviasi: 12 },
    produksi: { budget: 88043, realisasi: 57519 },
  },
  {
    label: "Sep",
    total: { budget: 22882, realisasi: 15755, deviasi: 7127 },
    comp: { budget: 1680, realisasi: 2431, deviasi: -751 },
    fuel: { budget: 11749, realisasi: 6625, deviasi: 5124 },
    tyre: { budget: 1159, realisasi: 504, deviasi: 655 },
    rep: { budget: 1159, realisasi: 749, deviasi: 410 },
    ovh: { budget: 864, realisasi: 303, deviasi: 561 },
    produksi: { budget: 398000, realisasi: 216232 },
  },
  {
    label: "Oct",
    total: { budget: 16339, realisasi: 14799, deviasi: 1540 },
    comp: { budget: 1510, realisasi: 2221, deviasi: -711 },
    fuel: { budget: 8945, realisasi: 5349, deviasi: 3596 },
    tyre: { budget: 946, realisasi: 1104, deviasi: -158 },
    rep: { budget: 946, realisasi: 419, deviasi: 527 },
    ovh: { budget: 705, realisasi: 90, deviasi: 615 },
    produksi: { budget: 324677, realisasi: 339252 },
  },
];

// =========================================================================
// 3. HELPER: ORDINARY LEAST SQUARES LINEAR REGRESSION (y = mx + b)
// =========================================================================
export function addLinearTrendline<T extends { [key: string]: any }>(
  data: T[],
  key: string,
  trendKey: string
): (T & { [key: string]: number })[] {
  const n = data.length;
  if (n <= 1) return data as any;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const y = data[i][key];
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return data as any;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return data.map((item, i) => ({
    ...item,
    [trendKey]: Math.round((slope * i + intercept) * 10) / 10,
  }));
}

// Helper: Format Y-Axis ticks compactly without excessive zeros (e.g. 60000 -> 60 M, 15000 -> 15 M, 0 -> 0)
export const formatYAxisTick = (val: number) => {
  if (val === 0) return "0";
  const num = val / 1000;
  const formatted =
    num % 1 === 0
      ? num.toString()
      : num.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return `${formatted} M`;
};

// Helper: Calculate cumulative Year-to-Date (YTD) running sum
export function computeYTDDataset(base: FullPeriodRecord[]): FullPeriodRecord[] {
  let cumTotal = { budget: 0, realisasi: 0, deviasi: 0 };
  let cumComp = { budget: 0, realisasi: 0, deviasi: 0 };
  let cumFuel = { budget: 0, realisasi: 0, deviasi: 0 };
  let cumTyre = { budget: 0, realisasi: 0, deviasi: 0 };
  let cumRep = { budget: 0, realisasi: 0, deviasi: 0 };
  let cumOvh = { budget: 0, realisasi: 0, deviasi: 0 };
  let cumProd = { budget: 0, realisasi: 0 };

  const list: FullPeriodRecord[] = base.map((item) => {
    cumTotal = {
      budget: cumTotal.budget + item.total.budget,
      realisasi: cumTotal.realisasi + item.total.realisasi,
      deviasi: cumTotal.deviasi + item.total.deviasi,
    };
    cumComp = {
      budget: cumComp.budget + item.comp.budget,
      realisasi: cumComp.realisasi + item.comp.realisasi,
      deviasi: cumComp.deviasi + item.comp.deviasi,
    };
    cumFuel = {
      budget: cumFuel.budget + item.fuel.budget,
      realisasi: cumFuel.realisasi + item.fuel.realisasi,
      deviasi: cumFuel.deviasi + item.fuel.deviasi,
    };
    cumTyre = {
      budget: cumTyre.budget + item.tyre.budget,
      realisasi: cumTyre.realisasi + item.tyre.realisasi,
      deviasi: cumTyre.deviasi + item.tyre.deviasi,
    };
    cumRep = {
      budget: cumRep.budget + item.rep.budget,
      realisasi: cumRep.realisasi + item.rep.realisasi,
      deviasi: cumRep.deviasi + item.rep.deviasi,
    };
    cumOvh = {
      budget: cumOvh.budget + item.ovh.budget,
      realisasi: cumOvh.realisasi + item.ovh.realisasi,
      deviasi: cumOvh.deviasi + item.ovh.deviasi,
    };

    if (item.produksi) {
      cumProd = {
        budget: cumProd.budget + (item.produksi.budget || 0),
        realisasi: cumProd.realisasi + (item.produksi.realisasi || 0),
      };
    }

    const idrTonBudget = cumProd.budget > 0
      ? Math.round((cumTotal.budget * 1e6) / cumProd.budget)
      : (item.idrPerTon?.budget || 0);
    const idrTonReal = cumProd.realisasi > 0
      ? Math.round((cumTotal.realisasi * 1e6) / cumProd.realisasi)
      : (item.idrPerTon?.realisasi || 0);

    return {
      label: item.label,
      total: { ...cumTotal },
      comp: { ...cumComp },
      fuel: { ...cumFuel },
      tyre: { ...cumTyre },
      rep: { ...cumRep },
      ovh: { ...cumOvh },
      produksi: { ...cumProd },
      idrPerTon: {
        budget: idrTonBudget,
        realisasi: idrTonReal,
        deviasi: idrTonBudget - idrTonReal,
      },
    };
  });

  // Khusus untuk YTD: setelah bulan terakhir yang diinput (contoh Oct), tampilkan tanggal hari ini (contoh: "14 Okt").
  // Jika belum ada data baru yang diinput untuk hari ini, kumulatif nilainya tetap sama dengan data terakhir yang diinput.
  if (list.length > 0) {
    const now = new Date();
    const day = now.getDate();
    const idMonths = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
    ];
    const todayLabel = `${day} ${idMonths[now.getMonth()]}`;

    const lastItem = list[list.length - 1];
    // Hanya append jika label terakhir berbeda dari label hari ini
    if (lastItem.label !== todayLabel) {
      const idrTonBudget = cumProd.budget > 0 ? Math.round((cumTotal.budget * 1e6) / cumProd.budget) : 0;
      const idrTonReal = cumProd.realisasi > 0 ? Math.round((cumTotal.realisasi * 1e6) / cumProd.realisasi) : 0;
      list.push({
        label: todayLabel,
        isToday: true,
        total: { ...cumTotal },
        comp: { ...cumComp },
        fuel: { ...cumFuel },
        tyre: { ...cumTyre },
        rep: { ...cumRep },
        ovh: { ...cumOvh },
        produksi: { ...cumProd },
        idrPerTon: {
          budget: idrTonBudget,
          realisasi: idrTonReal,
          deviasi: idrTonBudget - idrTonReal,
        },
      });
    }
  }

  return list;
}

// =========================================================================
// 4. MAIN COMPONENT
// =========================================================================
interface CostTrendChartsProps {
  initialSite?: JobSite;
  user?: User;
}

export const CostTrendCharts: React.FC<CostTrendChartsProps> = ({
  initialSite = "Senyiur",
  user,
}) => {
  const isHeadOffice = user ? user.role === "SuperAdmin" || user.jobSite === "HeadOffice" : true;
  const initialResolvedSite = !isHeadOffice && user
    ? user.jobSite
    : initialSite === "HeadOffice" ? "Senyiur" : initialSite;

  const [activeSite, setActiveSite] = useState<JobSite>(initialResolvedSite);
  const [timeframe, setTimeframe] = useState<"month" | "week" | "ytd">("month");
  const [selectedCategory, setSelectedCategory] = useState<CostCategoryKey>("total");
  const [viewMode, setViewMode] = useState<"both" | "focused" | "grid">("both");
  const [showTrendlines, setShowTrendlines] = useState(true);
  const [showProductionLine, setShowProductionLine] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [dynamicTrends, setDynamicTrends] = useState<{
    Senyiur: { weekly: FullPeriodRecord[]; monthly?: FullPeriodRecord[] };
    MuaraPahu: { weekly: FullPeriodRecord[]; monthly?: FullPeriodRecord[] };
  } | null>(null);

  // Fetch dynamic trends from backend on mount so new weeks and months appear automatically
  useEffect(() => {
    let isMounted = true;
    reportService
      .getCostTrends(undefined, 2026)
      .then((data) => {
        if (isMounted && data) {
          setDynamicTrends(data);
        }
      })
      .catch((err) => {
        console.warn("Using static fallback for cost trends:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Active category metadata
  const activeMeta = useMemo(
    () => COST_CATEGORIES.find((c) => c.key === selectedCategory) || COST_CATEGORIES[0],
    [selectedCategory]
  );
  const isTotalCategory = selectedCategory === "total";
  const isTonnageVisible = isTotalCategory && showProductionLine;

  // Raw period data selection
  const rawDataset: FullPeriodRecord[] = useMemo(() => {
    const siteKey = activeSite === "MuaraPahu" ? "MuaraPahu" : "Senyiur";
    const dynamicMonthly =
      dynamicTrends && dynamicTrends[siteKey]?.monthly && dynamicTrends[siteKey].monthly!.length > 0
        ? dynamicTrends[siteKey].monthly!
        : null;
    const fallbackMonthly = activeSite === "MuaraPahu" ? RAW_MONTHLY_MUARAPAHU : RAW_MONTHLY_SENYIUR;
    const monthlyBase = dynamicMonthly || fallbackMonthly;

    if (timeframe === "ytd") {
      return computeYTDDataset(monthlyBase);
    } else if (timeframe === "month") {
      return monthlyBase;
    } else {
      if (dynamicTrends && dynamicTrends[siteKey]?.weekly?.length > 0) {
        return dynamicTrends[siteKey].weekly;
      }
      return activeSite === "MuaraPahu" ? RAW_WEEKLY_MUARAPAHU : RAW_WEEKLY_SENYIUR;
    }
  }, [timeframe, activeSite, dynamicTrends]);

  // Extract focused category data & add trendlines
  const processedFocusedData = useMemo(() => {
    const extracted = rawDataset.map((item) => ({
      label: item.label,
      isToday: item.isToday,
      budget: item[selectedCategory].budget,
      realisasi: item[selectedCategory].realisasi,
      deviasi: item[selectedCategory].deviasi,
      prodBudget: item.produksi?.budget || 0,
      prodRealisasi: item.produksi?.realisasi || 0,
    }));

    let data = addLinearTrendline(extracted, "budget", "trendBudget");
    data = addLinearTrendline(data, "realisasi", "trendRealisasi");
    data = addLinearTrendline(data, "deviasi", "trendDeviasi");
    return data;
  }, [rawDataset, selectedCategory]);

  // Processed Rupiah per Ton Data & Trendline
  const processedIdrTonData = useMemo(() => {
    const extracted = rawDataset.map((item) => {
      let b = 0;
      let r = 0;
      if (selectedCategory === "total") {
        b = item.idrPerTon?.budget ?? (item.produksi?.budget ? Math.round((item.total.budget * 1e6) / item.produksi.budget) : 0);
        r = item.idrPerTon?.realisasi ?? (item.produksi?.realisasi ? Math.round((item.total.realisasi * 1e6) / item.produksi.realisasi) : 0);
      } else {
        b = item.produksi?.budget ? Math.round((item[selectedCategory].budget * 1e6) / item.produksi.budget) : 0;
        r = item.produksi?.realisasi ? Math.round((item[selectedCategory].realisasi * 1e6) / item.produksi.realisasi) : 0;
      }
      return {
        label: item.label,
        isToday: item.isToday,
        idrTonBudget: b,
        idrTonReal: r,
        idrTonDeviasi: b - r,
      };
    });

    let data = addLinearTrendline(extracted, "idrTonReal", "trendIdrTonReal");
    data = addLinearTrendline(data, "idrTonBudget", "trendIdrTonBudget");
    return data;
  }, [rawDataset, selectedCategory]);

  const idrTonSummary = useMemo(() => {
    const validB = processedIdrTonData.filter((d) => d.idrTonBudget > 0);
    const validR = processedIdrTonData.filter((d) => d.idrTonReal > 0);
    const avgB = validB.length > 0 ? Math.round(validB.reduce((s, c) => s + c.idrTonBudget, 0) / validB.length) : 0;
    const avgR = validR.length > 0 ? Math.round(validR.reduce((s, c) => s + c.idrTonReal, 0) / validR.length) : 0;
    const netDev = avgB - avgR;
    return { avgB, avgR, netDev };
  }, [processedIdrTonData]);

  // Calculate summary metrics for focused category
  const focusedSummary = useMemo(() => {
    if (timeframe === "ytd") {
      // Untuk mode YTD, posisi terkini adalah record kumulatif terakhir (per tanggal hari ini / input terakhir)
      const last = rawDataset[rawDataset.length - 1];
      const totalB = last ? last[selectedCategory].budget : 0;
      const totalR = last ? last[selectedCategory].realisasi : 0;
      const netDev = totalB - totalR;
      return { totalB, totalR, netDev };
    }
    const totalB = rawDataset.reduce((acc, curr) => acc + curr[selectedCategory].budget, 0);
    const totalR = rawDataset.reduce((acc, curr) => acc + curr[selectedCategory].realisasi, 0);
    const netDev = totalB - totalR;
    return { totalB, totalR, netDev };
  }, [rawDataset, selectedCategory, timeframe]);

  // 2-Bar comparison data for the selected category (Budget vs Actual)
  const sideBarTotalData = useMemo(() => {
    return [
      {
        name: "Target Budget",
        shortName: "Budget",
        value: focusedSummary.totalB,
        fill: "#0EA5E9",
      },
      {
        name: "Aktual Realisasi",
        shortName: "Actual",
        value: focusedSummary.totalR,
        fill: "#F97316",
      },
    ];
  }, [focusedSummary]);

  const deviasiPercent = useMemo(() => {
    return focusedSummary.totalB > 0
      ? (Math.abs(focusedSummary.netDev) / focusedSummary.totalB) * 100
      : 0;
  }, [focusedSummary]);

  const serapanRatio = useMemo(() => {
    return focusedSummary.totalB > 0
      ? (focusedSummary.totalR / focusedSummary.totalB) * 100
      : 0;
  }, [focusedSummary]);

  // Pre-calculate data with trendlines for all 6 categories (for Grid view)
  const allCategoriesData = useMemo(() => {
    return COST_CATEGORIES.map((cat) => {
      const extracted = rawDataset.map((item) => ({
        label: item.label,
        isToday: item.isToday,
        budget: item[cat.key].budget,
        realisasi: item[cat.key].realisasi,
        deviasi: item[cat.key].deviasi,
      }));

      let withTrends = addLinearTrendline(extracted, "budget", "trendBudget");
      withTrends = addLinearTrendline(withTrends, "realisasi", "trendRealisasi");

      const totalB = timeframe === "ytd"
        ? (rawDataset[rawDataset.length - 1]?.[cat.key].budget || 0)
        : rawDataset.reduce((acc, curr) => acc + curr[cat.key].budget, 0);
      const totalR = timeframe === "ytd"
        ? (rawDataset[rawDataset.length - 1]?.[cat.key].realisasi || 0)
        : rawDataset.reduce((acc, curr) => acc + curr[cat.key].realisasi, 0);
      const netDev = totalB - totalR;

      return {
        meta: cat,
        data: withTrends,
        summary: { totalB, totalR, netDev },
      };
    });
  }, [rawDataset, timeframe]);

  // Custom Data Label for Budget (matches blue badge box)
  const renderBudgetLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;
    const num = value / 1000;
    const formatted = `${num.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} M`;
    return (
      <g transform={`translate(${x},${y - 14})`}>
        <rect
          x={-28}
          y={-12}
          width={56}
          height={16}
          rx={3}
          fill="#EEF2FF"
          stroke="#93C5FD"
          strokeWidth={1}
        />
        <text
          x={0}
          y={0}
          fill="#1E40AF"
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // Custom Data Label for Realisasi (matches compact 2,1 M / 2,2 M format)
  const renderRealisasiLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;
    const num = value / 1000;
    const formatted = `${num.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} M`;
    return (
      <g transform={`translate(${x},${y - 14})`}>
        <rect
          x={-24}
          y={-10}
          width={48}
          height={16}
          rx={3}
          fill="#FFF7ED"
          stroke="#FDBA74"
          strokeWidth={1}
        />
        <text
          x={0}
          y={0}
          fill="#C2410C"
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // Custom Data Label for Deviasi (green if efficiency, dark if deficit)
  const renderDeviasiLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;
    const isNeg = value < 0;
    const num = Math.abs(value) / 1000;
    const formatted = isNeg
      ? `-${num.toLocaleString("id-ID", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })} M`
      : `+${num.toLocaleString("id-ID", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })} M`;

    return (
      <g transform={`translate(${x},${isNeg ? y + 16 : y - 14})`}>
        <rect
          x={-30}
          y={-12}
          width={60}
          height={16}
          rx={3}
          fill="#F1F5F9"
          stroke={isNeg ? "#CBD5E1" : "#86EFAC"}
          strokeWidth={1}
        />
        <text
          x={0}
          y={0}
          fill={isNeg ? "#334155" : "#15803D"}
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // Custom Data Label for Tonase Bar (semi-transparent green pill with tonnage value)
  const renderTonaseBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null || Number(value) <= 0) return null;
    const valNum = Number(value);
    const formatted =
      valNum >= 1000
        ? `${Math.round(valNum / 1000).toLocaleString("id-ID")}k`
        : `${valNum}`;
    const badgeText = `${formatted} Ton`;
    const posX = (x || 0) + (width || 0) / 2;
    const posY = (y || 0) - 10;

    return (
      <g transform={`translate(${posX},${posY})`}>
        <rect
          x={-28}
          y={-9}
          width={56}
          height={16}
          rx={4}
          fill="#ECFDF5"
          stroke="#A7F3D0"
          strokeWidth={1}
        />
        <text
          x={0}
          y={0}
          fill="#065F46"
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {badgeText}
        </text>
      </g>
    );
  };

  // Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isTodayItem = payload[0]?.payload?.isToday;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 min-w-48 z-50">
          <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between gap-2">
            <span>Periode: {label}</span>
            {isTodayItem && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 border border-orange-200">
                Hari Ini
              </span>
            )}
          </div>
          {payload.map((entry: any, index: number) => {
            const isTrend = entry.dataKey?.startsWith("trend");
            const isTonase =
              entry.dataKey === "prodRealisasi" ||
              entry.dataKey === "prodBudget" ||
              entry.name?.toLowerCase().includes("tonase") ||
              entry.name?.toLowerCase().includes("produksi");

            if (isTonase && !isTonnageVisible) return null;

            let formattedVal = "-";
            if (entry.value !== undefined && entry.value !== null) {
              if (isTonase) {
                formattedVal = `${Math.round(Number(entry.value)).toLocaleString("id-ID")} Ton`;
              } else {
                const valNum = Number(entry.value) / 1000;
                formattedVal = `${valNum.toLocaleString("id-ID", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })} M`;
              }
            }

            return (
              <div
                key={`item-${index}`}
                className="flex items-center justify-between gap-3 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600 font-medium">{entry.name}:</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    isTrend
                      ? "text-slate-500 italic"
                      : isTonase
                      ? "text-emerald-700 font-extrabold"
                      : "text-slate-900"
                  }`}
                >
                  {formattedVal}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const IconComp = activeMeta.icon;

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Site, Timeframe & View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Selector Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {isHeadOffice ? (
              <>
                <button
                  onClick={() => setActiveSite("Senyiur")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSite === "Senyiur"
                      ? "bg-white text-amber-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={14} className="text-amber-600" />
                  <span>Site Senyiur</span>
                </button>
                <button
                  onClick={() => setActiveSite("MuaraPahu")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSite === "MuaraPahu"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={14} className="text-emerald-600" />
                  <span>Site Muara Pahu</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-xs">
                <Building2
                  size={14}
                  className={activeSite === "MuaraPahu" ? "text-emerald-600" : "text-amber-600"}
                />
                <span className={activeSite === "MuaraPahu" ? "text-emerald-800" : "text-amber-800"}>
                  Site {activeSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                  Site Anda
                </span>
              </div>
            )}
          </div>

          {/* Timeframe Switcher (Month, Week, YTD) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setTimeframe("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeframe === "month"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar size={13} className="text-blue-600" />
              <span>Bulanan</span>
            </button>
            <button
              onClick={() => setTimeframe("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeframe === "week"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders size={13} className="text-blue-600" />
              <span>Mingguan</span>
            </button>
          </div>
        </div>

        {/* Right: Export PDF Presentasi */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
            title="Download grafik ke PDF Landscape presentasi mingguan"
          >
            <FileDown size={14} className="text-white" />
            <span>Export PDF Presentasi</span>
          </button>
        </div>
      </div>

      {/* 2. Category Selector Pills (6 Akun Beban) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Pilih Kategori Beban Biaya:</span>
            <span className="text-[11px] text-slate-400">
              (Klik kategori untuk fokus analisis grafik & tren)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            6 Kategori Utama Terpantau
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {COST_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const CatIcon = cat.icon;
            // Quick total for pill
            const pillTotalB = rawDataset.reduce(
              (acc, curr) => acc + curr[cat.key].budget,
              0
            );
            const pillTotalR = rawDataset.reduce(
              (acc, curr) => acc + curr[cat.key].realisasi,
              0
            );
            const isEfficiency = pillTotalB >= pillTotalR;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/30 scale-[1.02]"
                    : "bg-slate-50/70 hover:bg-slate-100/90 text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-white/10 text-white" : `${cat.lightBg} ${cat.textCol}`
                    }`}
                  >
                    <CatIcon size={14} />
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                      isSelected
                        ? isEfficiency
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                        : isEfficiency
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {isEfficiency ? "Efisien" : "Defisit"}
                  </span>
                </div>

                <div className="w-full min-w-0">
                  <p
                    className={`text-[10px] sm:text-[11px] font-bold leading-tight line-clamp-2 min-h-7 flex items-center ${
                      isSelected ? "text-white" : "text-slate-800"
                    }`}
                    title={cat.shortLabel}
                  >
                    {cat.shortLabel}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 font-mono ${
                      isSelected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    R: {(pillTotalR / 1000).toLocaleString("id-ID", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    })} M
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Primary Focused Chart View (Visible in 'both' or 'focused' mode) */}
      {(viewMode === "both" || viewMode === "focused") && (
        <div className="space-y-6">
          {/* Side-by-Side: Main LineChart (9 cols) & 2-Bar Comparison with Measured Deviasi (3 cols) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Left: Main LineChart (Diperlebar menjadi 9 cols) */}
            <div className="xl:col-span-9 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${activeMeta.lightBg} ${activeMeta.textCol} border ${activeMeta.borderCol}`}
                  >
                    <IconComp size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>
                        {activeMeta.label.toUpperCase()}{" "}
                        {timeframe === "ytd"
                          ? "KUMULATIF YTD 2026"
                          : timeframe === "month"
                          ? "BULANAN 2026"
                          : "MINGGUAN"}{" "}
                        {activeSite.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeMeta.description} &bull; Sumbu Kiri: <span className="font-semibold text-slate-700">Biaya (Rp Miliar)</span>
                      {isTonnageVisible && (
                        <> &bull; Sumbu Kanan: <span className="font-semibold text-emerald-700">Tonase (Ton)</span></>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>BUDGET</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-orange-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <span>REALISASI</span>
                  </div>
                  {showTrendlines && (
                    <div className="flex items-center gap-1.5 text-orange-500 font-medium">
                      <span className="border-b-2 border-dashed border-orange-400 w-3" />
                      <span>Tren Realisasi</span>
                    </div>
                  )}
                  {isTotalCategory && (
                    <button
                      type="button"
                      onClick={() => setShowProductionLine(!showProductionLine)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        showProductionLine
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-400 line-through opacity-70"
                      }`}
                      title="Klik untuk tampilkan / sembunyikan bar tonase produksi"
                    >
                      <span className="h-3 w-2.5 rounded-xs bg-emerald-500/40 border border-emerald-600 inline-block" />
                      <span>Tonase Produksi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="w-full h-80 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={processedFocusedData}
                    margin={{ top: 28, right: isTonnageVisible ? 55 : 35, left: 15, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#94A3B8" }}
                      padding={{ left: 38, right: 30 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#94A3B8" }}
                      tickFormatter={formatYAxisTick}
                      width={56}
                      domain={[0, "auto"]}
                      label={{
                        value: "Rp",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                        fontWeight: 700,
                        fill: "#475569",
                      }}
                    />
                    {isTonnageVisible && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#059669"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "#A7F3D0" }}
                        tickFormatter={(val: number) => {
                          if (val === 0) return "0";
                          if (val >= 1000) return `${Math.round(val / 1000)}k`;
                          return `${val}`;
                        }}
                        domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.2) : 100)]}
                        width={56}
                        label={{
                          value: "Ton",
                          angle: 90,
                          position: "insideRight",
                          fontSize: 12,
                          fontWeight: 700,
                          fill: "#059669",
                        }}
                      />
                    )}
                    <Tooltip content={<CustomTooltip />} />

                    {/* TONASE PRODUKSI BAR (Hanya di Biaya Produksi, Transparan dengan badge angka tonase) */}
                    {isTonnageVisible && (
                      <Bar
                        yAxisId="right"
                        dataKey="prodRealisasi"
                        name="Tonase Produksi"
                        fill="#10B981"
                        fillOpacity={0.28}
                        stroke="#059669"
                        strokeWidth={1.2}
                        strokeOpacity={0.5}
                        radius={[5, 5, 0, 0]}
                        maxBarSize={36}
                      >
                        <LabelList
                          dataKey="prodRealisasi"
                          content={renderTonaseBarLabel}
                        />
                      </Bar>
                    )}

                    {/* BUDGET Line (Solid Bright Color, No Nominal Label) */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="budget"
                      name="BUDGET"
                      stroke="#0EA5E9"
                      strokeWidth={2.6}
                      dot={{
                        r: 4.5,
                        fill: "#0EA5E9",
                        stroke: "#FFFFFF",
                        strokeWidth: 1.5,
                      }}
                      activeDot={{ r: 6.5, stroke: "#0284C7", strokeWidth: 2 }}
                    />

                    {/* REALISASI Line */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="realisasi"
                      name="REALISASI"
                      stroke="#F97316"
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        fill: "#06B6D4",
                        stroke: "#EA580C",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 7, stroke: "#C2410C", strokeWidth: 2 }}
                      label={renderRealisasiLabel}
                    />

                    {/* Regression Trendline (Realisasi Saja Sesuai Permintaan) */}
                    {showTrendlines && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="trendRealisasi"
                        name="Tren Realisasi"
                        stroke="#FDBA74"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}

                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: 2-Bar Comparison (Budget vs Actual) & Ukuran Deviasi (3 cols - Kompak & Proporsional) */}
            <div className="xl:col-span-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#e95623] shrink-0">
                    <BarChart3 size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
                      Budget vs Actual
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                      {activeMeta.shortLabel} &bull; {activeSite}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                    focusedSummary.netDev >= 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {focusedSummary.netDev >= 0 ? "Efisien" : "Over Budget"}
                </span>
              </div>

              {/* 2-Bar Chart Canvas */}
              <div className="w-full h-56 pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sideBarTotalData}
                    margin={{ top: 25, right: 15, left: -15, bottom: 5 }}
                    barGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                    />
                    <YAxis
                      tickFormatter={formatYAxisTick}
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(241, 245, 249, 0.6)", radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          const num = Math.round(Number(item.value) / 1000);
                          const isBudget = item.payload.shortName === "Budget";
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1 min-w-36 z-50">
                              <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
                                <span>{item.payload.name}</span>
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isBudget ? "bg-[#0EA5E9]" : "bg-[#F97316]"
                                  }`}
                                />
                              </p>
                              <div className="flex items-center justify-between gap-3 pt-0.5">
                                <span className="text-slate-500 font-medium">Total:</span>
                                <span className="font-mono font-black text-slate-900 text-xs">
                                  Rp {num.toLocaleString("id-ID")} M
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      {sideBarTotalData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(v: any) =>
                          `${Math.round(Number(v) / 1000).toLocaleString("id-ID")} M`
                        }
                        style={{ fontSize: "11px", fontWeight: "800", fill: "#1E293B" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* PENGUKURAN DEVIASI (BERDASARKAN GRAFIK YANG DIPILIH) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Scale size={13} className="text-[#e95623] shrink-0" />
                    <span>Deviasi:</span>
                  </span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-black font-mono ${
                        focusedSummary.netDev >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {focusedSummary.netDev >= 0 ? "+" : ""}
                      {(focusedSummary.netDev / 1000).toLocaleString("id-ID", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      M
                    </span>
                    <span
                      className={`block text-[10px] font-extrabold ${
                        focusedSummary.netDev >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {focusedSummary.netDev >= 0
                        ? `(-${deviasiPercent.toFixed(1)}% di bawah budget)`
                        : `(+${deviasiPercent.toFixed(1)}% di atas budget)`}
                    </span>
                  </div>
                </div>
                {/* Visual Ratio Progress */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Rasio Serapan Biaya:</span>
                    <strong
                      className={
                        focusedSummary.netDev >= 0 ? "text-emerald-700" : "text-rose-700"
                      }
                    >
                      {serapanRatio.toFixed(1)}%
                    </strong>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        focusedSummary.netDev >= 0 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(serapanRatio, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variance Chart: DEVIASI (BUDGET - REALISASI) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>
                    DEVIASI {activeMeta.label.toUpperCase()} (BUDGET vs REALISASI)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nilai positif menandakan penghematan/efisiensi biaya (&gt; 0), nilai negatif
                  menandakan pembengkakan biaya (&lt; 0)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Deviasi Aktual</span>
                </div>
                {showTrendlines && (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <span className="border-b-2 border-dashed border-amber-500 w-3" />
                    <span>Tren Deviasi</span>
                  </div>
                )}
              </div>
            </div>

            {/* Variance Canvas */}
            <div className="w-full h-72 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={processedFocusedData}
                  margin={{ top: 25, right: 30, left: 15, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#94A3B8" }}
                    padding={{ left: 38, right: 30 }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#94A3B8" }}
                    tickFormatter={formatYAxisTick}
                    width={56}
                    label={{
                      value: "Rp",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                      fontWeight: 700,
                      fill: "#475569",
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Zero Reference Line */}
                  <ReferenceLine
                    y={0}
                    stroke="#64748B"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    label={{
                      value: "Break-even (0)",
                      position: "right",
                      fill: "#94A3B8",
                      fontSize: 10,
                    }}
                  />

                  {/* Deviasi Line */}
                  <Line
                    type="monotone"
                    dataKey="deviasi"
                    name="Deviasi (Budget - Realisasi)"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      fill: "#059669",
                      stroke: "#FFFFFF",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7, stroke: "#047857", strokeWidth: 2 }}
                    label={renderDeviasiLabel}
                  />

                  {/* Trendline Deviasi */}
                  {showTrendlines && (
                    <Line
                      type="monotone"
                      dataKey="trendDeviasi"
                      name="Tren Deviasi (Regresi)"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rupiah per Ton Chart: BIAYA PER TON (IDR / TON) (BUDGET vs REALISASI) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Coins size={18} className="text-[#0e9f9d]" />
                  <span>
                    BIAYA PER TON: {activeMeta.label.toUpperCase()} (IDR / TON)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan target budget vs realisasi biaya per tonase produksi batubara (Rp / Ton)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span>Target Budget</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#e95623] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e95623]" />
                  <span>Aktual Realisasi</span>
                </div>

                {showTrendlines && (
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <span className="border-b-2 border-dashed border-amber-500 w-3" />
                    <span>Garis Regresi</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rupiah per Ton Canvas */}
            <div className="w-full h-76 pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={processedIdrTonData}
                  margin={{ top: 25, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#94A3B8" }}
                    padding={{ left: 28, right: 24 }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#94A3B8" }}
                    tickFormatter={(val) => `Rp ${(Number(val) / 1000).toFixed(0)}k`}
                    width={70}
                    label={{
                      value: "IDR / Ton",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fontWeight: 700,
                      fill: "#475569",
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const d = payload[0]?.payload;
                      const bVal = d?.idrTonBudget || 0;
                      const rVal = d?.idrTonReal || 0;
                      const dev = bVal - rVal;
                      const isHemat = dev >= 0;
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1.5 min-w-50">
                          <div className="font-extrabold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                            <span>Periode {label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{activeSite}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              Budget IDR/Ton:
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {bVal > 0 ? `Rp ${bVal.toLocaleString("id-ID")} / Ton` : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#e95623]" />
                              Realisasi IDR/Ton:
                            </span>
                            <span className="font-mono font-bold text-[#e95623]">
                              {rVal > 0 ? `Rp ${rVal.toLocaleString("id-ID")} / Ton` : "-"}
                            </span>
                          </div>
                          {bVal > 0 && rVal > 0 && (
                            <div className={`flex justify-between items-center pt-1 border-t border-slate-100 font-bold ${isHemat ? "text-emerald-600" : "text-rose-600"}`}>
                              <span>Efisiensi:</span>
                              <span className="font-mono">
                                {isHemat ? "+" : "-"}Rp {Math.abs(dev).toLocaleString("id-ID")} / Ton ({isHemat ? "Hemat" : "Over"})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    dataKey="idrTonBudget"
                    name="Budget (Rp/Ton)"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="idrTonReal"
                    name="Realisasi (Rp/Ton)"
                    fill="#e95623"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />

                  {showTrendlines && (
                    <Line
                      type="monotone"
                      dataKey="trendIdrTonReal"
                      name="Regresi Linier"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quick summary cards for Rupiah/Ton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Rata-rata Target Budget</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {idrTonSummary.avgB > 0 ? `Rp ${idrTonSummary.avgB.toLocaleString("id-ID")} / Ton` : "-"}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Rata-rata Aktual Realisasi</span>
                <span className="text-sm font-bold text-[#e95623] font-mono">
                  {idrTonSummary.avgR > 0 ? `Rp ${idrTonSummary.avgR.toLocaleString("id-ID")} / Ton` : "-"}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${idrTonSummary.netDev >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                <span className="text-[11px] font-medium block">Efisiensi Rata-rata</span>
                <span className="text-sm font-black font-mono">
                  {idrTonSummary.netDev >= 0 ? "+" : "-"}Rp {Math.abs(idrTonSummary.netDev).toLocaleString("id-ID")} / Ton ({idrTonSummary.netDev >= 0 ? "Efisien" : "Over"})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Grid of 6 Cost Category Charts (Visible in 'both' or 'grid' mode) */}
      {(viewMode === "both" || viewMode === "grid") && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <LayoutGrid size={18} className="text-blue-600" />
                <span>
                  OVERVIEW 6 KATEGORI BIAYA & TREN (
                  {timeframe === "ytd" ? "KUMULATIF YTD" : timeframe === "month" ? "BULANAN" : "MINGGUAN"}) &bull;{" "}
                  {activeSite.toUpperCase()}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap grafik dilengkapi garis tren regresi linier untuk memantau trajectory biaya
                operasional
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Budget
              </span>
              <span className="flex items-center gap-1.5 text-orange-600">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Realisasi
              </span>
              {showTrendlines && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="border-b-2 border-dashed border-slate-400 w-3" /> Tren
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {allCategoriesData.map((catItem) => {
              const { meta, data, summary } = catItem;
              const isSelected = selectedCategory === meta.key;
              const isEfficiency = summary.netDev >= 0;
              const MiniIcon = meta.icon;

              return (
                <div
                  key={meta.key}
                  className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-blue-500/50 border-blue-400"
                      : "border-slate-200"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center ${meta.lightBg} ${meta.textCol} border ${meta.borderCol}`}
                        >
                          <MiniIcon size={17} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {meta.label}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {timeframe === "ytd" ? "Akumulasi YTD 2026" : timeframe === "month" ? "Bulanan 2026" : "Periode Mingguan"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isEfficiency
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isEfficiency ? (
                          <ArrowDownRight size={12} className="text-emerald-700" />
                        ) : (
                          <ArrowUpRight size={12} className="text-rose-700" />
                        )}
                        <span>{isEfficiency ? "Efisien" : "Defisit"}</span>
                      </span>
                    </div>

                    {/* Metric Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 my-3 text-center">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-500">Budget</p>
                        <p className="text-xs font-extrabold text-blue-700 mt-0.5">
                          {(summary.totalB / 1000).toLocaleString("id-ID", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })}{" "}
                          M
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-500">Realisasi</p>
                        <p className="text-xs font-extrabold text-orange-700 mt-0.5">
                          {(summary.totalR / 1000).toLocaleString("id-ID", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })}{" "}
                          M
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-xl border ${
                          isEfficiency
                            ? "bg-emerald-50/70 border-emerald-100"
                            : "bg-rose-50/70 border-rose-100"
                        }`}
                      >
                        <p className="text-[10px] font-medium text-slate-500">Deviasi</p>
                        <p
                          className={`text-xs font-extrabold mt-0.5 ${
                            isEfficiency ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {isEfficiency ? "+" : "-"}
                          {(Math.abs(summary.netDev) / 1000).toLocaleString("id-ID", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })}{" "}
                          M
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mini Line Chart with Trends */}
                  <div className="w-full h-44 my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data}
                        margin={{ top: 10, right: 15, left: -5, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94A3B8"
                          fontSize={9}
                          tickLine={false}
                          interval={timeframe === "week" ? 2 : 1}
                          padding={{ left: 16, right: 16 }}
                        />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={9}
                          tickLine={false}
                          tickFormatter={formatYAxisTick}
                          width={42}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        <Line
                          type="monotone"
                          dataKey="budget"
                          name="Budget"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#2563EB" }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="realisasi"
                          name="Realisasi"
                          stroke="#F97316"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#EA580C" }}
                          activeDot={{ r: 5 }}
                        />

                        {showTrendlines && (
                          <Line
                            type="monotone"
                            dataKey="trendRealisasi"
                            name="Tren Realisasi"
                            stroke="#FDBA74"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            dot={false}
                            isAnimationActive={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setSelectedCategory(meta.key);
                        if (viewMode === "grid") setViewMode("both");
                      }}
                      className={`text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                        isSelected
                          ? "text-blue-600 font-extrabold"
                          : "text-slate-600 hover:text-blue-600"
                      }`}
                    >
                      <span>{isSelected ? "Sedang Difokuskan" : "Klik untuk Fokus Detail"}</span>
                      <ArrowRight size={13} />
                    </button>

                    <span className="text-[10px] text-slate-400">
                      {data.length} Titik Data
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Executive PDF Presentation Export Modal */}
      <CostReportPdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        defaultSite={activeSite}
        defaultTimeframe={timeframe}
        defaultCategory={selectedCategory}
        user={user}
        dynamicData={dynamicTrends}
      />
    </div>
  );
};
