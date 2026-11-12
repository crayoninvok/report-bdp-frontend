import * as XLSX from "xlsx";
import { DaySchedule, MasterUnit, PeriodicInspectionItem, WeeklyScheduleData } from "../services/plantService";

export const PM_SERVICE_TYPES = [
  "PS1 (12.000 KM)",
  "PS2 (24.000 KM)",
  "PS3 (48.000 KM)",
  "P1 (250 HM)",
  "P2 (500 HM)",
  "P3 (1000 HM)",
  "P4 (2000 HM)",
  "Greasing & PS",
  "Unscheduled / Breakdown",
] as const;

export const PS_CATEGORY_OPTIONS = [
  "Scheduled PS",
  "Back-Log / Follow-up",
  "Unscheduled",
  "Breakdown",
  "Overhaul / Major",
  "Greasing & Routine",
] as const;

export const PS_START_TIME_OPTIONS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "00:00",
  "01:00",
  "03:00",
  "05:00",
] as const;

export const PS_LEAD_TIME_OPTIONS = [
  "1 Jam",
  "2 Jam",
  "3 Jam",
  "4 Jam",
  "6 Jam",
  "8 Jam",
  "12 Jam",
  "24 Jam",
  "> 24 Jam",
] as const;

export const PS_HM_SERVIS_OPTIONS = [
  "250 HM",
  "500 HM",
  "1000 HM",
  "2000 HM",
  "2500 HM",
  "5000 HM",
] as const;

export const PM_STATUS_OPTIONS = ["Scheduled", "In Progress", "Completed", "Pending"] as const;
export const PM_SHIFT_OPTIONS = ["Shift 1", "Shift 2"] as const;

export interface StatusStyle {
  card: string;
  badge: string;
  select: string;
  icon: string;
  dot: string;
}

const STATUS_STYLE_MAP: Record<string, StatusStyle> = {
  Completed: {
    card: "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300",
    badge: "bg-emerald-600 text-white",
    select: "bg-emerald-600 text-white border-emerald-700",
    icon: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  "In Progress": {
    card: "bg-amber-50/70 border-amber-200 hover:border-amber-300",
    badge: "bg-amber-500 text-white",
    select: "bg-amber-500 text-white border-amber-600",
    icon: "text-amber-600",
    dot: "bg-amber-500",
  },
  Pending: {
    card: "bg-rose-50/70 border-rose-200 hover:border-rose-300",
    badge: "bg-rose-600 text-white",
    select: "bg-rose-600 text-white border-rose-700",
    icon: "text-rose-600",
    dot: "bg-rose-500",
  },
  Scheduled: {
    card: "bg-white border-slate-200 hover:border-orange-300",
    badge: "bg-slate-200 text-slate-700",
    select: "bg-slate-100 text-slate-700 border-slate-300",
    icon: "text-[#e95623]",
    dot: "bg-slate-400",
  },
};

const READINESS_STYLE_MAP: Record<string, { badge: string; label: string }> = {
  Overdue: {
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
    label: "OVERDUE",
  },
  "Due Soon": {
    badge: "bg-amber-100 text-amber-800 border border-amber-300",
    label: "DUE SOON",
  },
  Safe: {
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    label: "AMAN",
  },
  "No Telemetry": {
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    label: "NO VOLVO DATA",
  },
};

/** Returns uniform visual classes for a PM item status. */
export function getPmStatusStyle(status: string): StatusStyle {
  return STATUS_STYLE_MAP[status] || STATUS_STYLE_MAP.Scheduled;
}

/** Returns badge styling & label for unit KM/HM readiness status. */
export function getPmReadinessStyle(readinessStatus: string) {
  return READINESS_STYLE_MAP[readinessStatus] || READINESS_STYLE_MAP["No Telemetry"];
}

/** Calculates next periodic KM & HM targets matching backend computePmTargets. */
export function computePmTargetsClient(
  serviceType: string,
  currentKm?: number | null,
  currentHm?: number | null
): { nextDueKm: number | null; nextDueHm: number | null } {
  const sUpper = (serviceType || "").toUpperCase();
  let nextDueKm: number | null = null;
  let nextDueHm: number | null = null;

  if (currentKm != null && !isNaN(currentKm) && currentKm > 0) {
    if (sUpper.includes("48.000") || sUpper.includes("48000") || sUpper.includes("PS3")) {
      nextDueKm = Math.round(currentKm + 48000);
    } else if (sUpper.includes("24.000") || sUpper.includes("24000") || sUpper.includes("PS2")) {
      nextDueKm = Math.round(currentKm + 24000);
    } else if (sUpper.includes("12.000") || sUpper.includes("12000") || sUpper.includes("PS1")) {
      nextDueKm = Math.round(currentKm + 12000);
    }
  }

  if (currentHm != null && !isNaN(currentHm) && currentHm > 0) {
    if (sUpper.includes("2000") || sUpper.includes("P4")) {
      nextDueHm = Math.round((currentHm + 2000) * 10) / 10;
    } else if (sUpper.includes("1000") || sUpper.includes("P3")) {
      nextDueHm = Math.round((currentHm + 1000) * 10) / 10;
    } else if (sUpper.includes("500") || sUpper.includes("P2")) {
      nextDueHm = Math.round((currentHm + 500) * 10) / 10;
    } else if (sUpper.includes("250") || sUpper.includes("P1")) {
      nextDueHm = Math.round((currentHm + 250) * 10) / 10;
    }
  }

  return { nextDueKm, nextDueHm };
}

/** Formats odometer integer with Indonesian thousand separators. */
export function formatKm(val?: number | null): string {
  if (val == null || isNaN(val)) return "-";
  return `${Math.round(val).toLocaleString("id-ID")} km`;
}

/** Formats engine hours up to 1 decimal place with Indonesian locale. */
export function formatHm(val?: number | null): string {
  if (val == null || isNaN(val)) return "-";
  return `${(Math.round(val * 10) / 10).toLocaleString("id-ID")} hm`;
}

/** Formats IDR currency values cleanly. */
export function formatRupiah(val?: number | null): string {
  if (val == null || isNaN(val)) return "Rp 0";
  return `Rp ${Math.round(val).toLocaleString("id-ID")}`;
}

/** Parses comma-separated buntut codes (when explicitly included in PS) into an array. */
export function parseIncludedTrailers(buntutSummary?: string | null): string[] {
  if (!buntutSummary) return [];
  return buntutSummary
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/** Resolves the unit category ("Prime Mover", "Vessel 1", "Dolly", "Vessel 2") for a PS item. */
export function resolvePsUnitCategory(
  item: PeriodicInspectionItem,
  masterUnits: MasterUnit[]
): string {
  if (item.unit?.category) return item.unit.category;
  const match = masterUnits.find((u) => u.unitCode === item.unitCode);
  return match?.category || (item.unitCode.startsWith("PM") ? "Prime Mover" : "Unit");
}

/**
 * Resolves trailer / buntut summary strictly from explicitly saved PS `buntutSummary`.
 * Never auto-inherits a Head's full trailer chain because Dolly & Vessel PS is independent.
 */
export function resolveTrailerSummary(
  item: PeriodicInspectionItem,
  masterUnits: MasterUnit[]
): string {
  const explicit = item.buntutSummary?.trim();
  if (explicit) return explicit;
  const cat = resolvePsUnitCategory(item, masterUnits);
  if (cat === "Prime Mover") return "Head Only";
  return `${cat} (Mandiri)`;
}

/** Computes start and end YYYY-MM-DD strings for range presets. */
export function getPresetDateRange(
  preset: "current" | "2weeks" | "month",
  currentWeekStart?: string,
  currentWeekEnd?: string
): { startDate: string; endDate: string } {
  const today = new Date();
  if (preset === "current" && currentWeekStart && currentWeekEnd) {
    return { startDate: currentWeekStart, endDate: currentWeekEnd };
  }
  if (preset === "2weeks") {
    const baseMon = currentWeekStart ? new Date(currentWeekStart) : new Date(today);
    const prevMon = new Date(baseMon);
    prevMon.setDate(baseMon.getDate() - 7);
    const curSun = new Date(baseMon);
    curSun.setDate(baseMon.getDate() + 6);
    return {
      startDate: prevMon.toISOString().slice(0, 10),
      endDate: curSun.toISOString().slice(0, 10),
    };
  }
  const y = today.getFullYear();
  const m = today.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    startDate: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    endDate: `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Exports PM detail & daily summary sheets to an .xlsx workbook. */
export function exportPmScheduleExcel(params: {
  days: DaySchedule[];
  filteredRows: Array<PeriodicInspectionItem & { dayName: string; leadName?: string | null }>;
  masterUnits: MasterUnit[];
  selectedSite: string;
  startDate: string;
  endDate: string;
}) {
  const { days, filteredRows, masterUnits, selectedSite, startDate, endDate } = params;

  const detailSheetData = filteredRows.map((row, idx) => ({
    No: idx + 1,
    Tanggal: row.date,
    Hari: row.dayName,
    Unit: row.unitCode,
    "Kategori Unit": resolvePsUnitCategory(row, masterUnits),
    "Buntut Ikut PS": resolveTrailerSummary(row, masterUnits),
    "Tipe Servis": row.serviceType,
    Kategori: row.category || "Scheduled PS",
    Shift: row.shift,
    "Plan Start Time": row.planStartTime || "-",
    "Plan Lead Time": row.planLeadTime || "-",
    "Plan HM Servis": row.planHmServis || "-",
    Status: row.status,
    "KM Saat Ini": row.currentKm ?? row.liveKm ?? "",
    "Target KM Next": row.nextDueKm ?? "",
    "HM Saat Ini": row.currentHm ?? row.liveHm ?? "",
    "Target HM Next": row.nextDueHm ?? "",
    "Nama Pengawas (SPV)": row.supervisorName || row.leadName || "-",
    "Nama Mekanik": row.mechanicNames?.length
      ? row.mechanicNames.join(", ")
      : row.mechanicName || "-",
    Catatan: row.notes || "",
  }));

  const summarySheetData = days.map((d) => {
    const completed = d.items.filter((i) => i.status === "Completed").length;
    const pct = d.targetUnits > 0 ? Math.round((completed / d.targetUnits) * 100) : 0;
    return {
      Tanggal: d.date,
      Hari: d.dayName,
      "Target Plan": d.targetUnits,
      Terjadwal: d.items.length,
      Completed: completed,
      "In Progress": d.items.filter((i) => i.status === "In Progress").length,
      Scheduled: d.items.filter((i) => i.status === "Scheduled").length,
      Pending: d.items.filter((i) => i.status === "Pending").length,
      "% Achievement": `${pct}%`,
      "Lead Mekanik": d.leadMechanic || d.leadInspector || "-",
    };
  });

  const wb = XLSX.utils.book_new();
  const wsDetail = XLSX.utils.json_to_sheet(
    detailSheetData.length > 0
      ? detailSheetData
      : [{ Info: "Tidak ada jadwal Periodic Service pada periode ini" }]
  );
  const wsSummary = XLSX.utils.json_to_sheet(
    summarySheetData.length > 0 ? summarySheetData : [{ Info: "Tidak ada data ringkasan" }]
  );

  wsDetail["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsDetail, "Daftar Detail Servis");
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Harian");

  const safeStart = (startDate || "start").replace(/-/g, "");
  const safeEnd = (endDate || "end").replace(/-/g, "");
  XLSX.writeFile(wb, `Periodic_Service_${selectedSite}_${safeStart}_sd_${safeEnd}.xlsx`);
}

