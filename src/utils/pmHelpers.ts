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

/** Resolves display list of mechanics (up to 5) from array field or comma-separated fallback. */
export function resolveMechanicsArray(item: PeriodicInspectionItem): string[] {
  if (Array.isArray(item.mechanicNames) && item.mechanicNames.length > 0) {
    return item.mechanicNames.slice(0, 5);
  }
  if (item.mechanicName) {
    return item.mechanicName
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
  return [];
}

/** Canonical hauling fleet categories managed automatically via Volvo Connect. */
export const HAULING_CATEGORIES = [
  "Prime Mover",
  "Vessel 1",
  "Dolly",
  "Vessel 2",
] as const;

/** Canonical support unit types allowed for manual registration in Master Data Unit. */
export const SUPPORT_UNIT_TYPES = [
  { prefix: "LV", category: "Light Vehicle", label: "Light Vehicle (LV)" },
  { prefix: "TH", category: "Telehandler", label: "Telehandler (TH)" },
  { prefix: "FT", category: "Fuel Truck", label: "Fuel Truck (FT)" },
  { prefix: "ST", category: "Storing Truck", label: "Storing Truck (ST)" },
  { prefix: "WT", category: "Water Truck", label: "Water Truck (WT)" },
  { prefix: "AM", category: "Ambulance", label: "Ambulance (AM)" },
  { prefix: "BM", category: "Bus Manhaul", label: "Bus Manhaul (BM)" },
  { prefix: "EX", category: "Excavator", label: "Excavator (EX)" },
  { prefix: "DT", category: "Dump Truck", label: "Dump Truck (DT)" },
  { prefix: "CP", category: "Compactor", label: "Compactor (CP)" },
  { prefix: "DZ", category: "Dozer", label: "Dozer (DZ)" },
  { prefix: "GS", category: "Genset", label: "Genset (GS)" },
] as const;

/** Returns true if the unit category belongs to standalone support units. */
export function isSupportCategory(category?: string | null): boolean {
  if (!category) return false;
  return !HAULING_CATEGORIES.includes(category as (typeof HAULING_CATEGORIES)[number]);
}

/** Resolves the unit category ("Prime Mover", "Vessel 1", "Dolly", "Vessel 2", or support type) for a PS item. */
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

export const HM_TOLERANCE_HOURS = 50;
export const START_TIME_TOLERANCE_MINUTES = 60;
export const LEAD_TIME_TOLERANCE_HOURS = 2;

export interface KpiMetricEntry {
  plan: number;
  actual: number;
  pct: number;
  missingActualCount?: number;
}

export interface PsItemKpiEval {
  isPlanned: boolean;
  isExecuted: boolean;
  hm: {
    planVal: number | null;
    actualVal: number | null;
    diff: number | null;
    pass: boolean | null;
  };
  startTime: {
    planMin: number | null;
    actualMin: number | null;
    diffMinutes: number | null;
    pass: boolean | null;
  };
  leadTime: {
    planHours: number | null;
    actualHours: number | null;
    diffHours: number | null;
    pass: boolean | null;
  };
}

export interface PsKpiSummary {
  pmCompliance: KpiMetricEntry;
  akurasiServis: KpiMetricEntry;
  achievementServis: KpiMetricEntry;
  akurasiHm: KpiMetricEntry;
  akurasiStartTime: KpiMetricEntry;
  akurasiLeadTime: KpiMetricEntry;
  executedCount: number;
  plannedCount: number;
  incompleteActualCount: number;
}

/** Parses numbers supporting Indonesian thousands grouping (e.g. "4.500") and decimals. */
function parseLocalizedNumber(rawToken: string): number | null {
  const cleaned = rawToken.trim();
  if (!cleaned) return null;
  const isIndoThousands = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned);
  const normalized = isIndoThousands
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Extracts planned HM numeric target from strings like "Target 4.500 HM (P2 (500 HM))" or "500 HM". */
export function parsePlanHmHours(raw?: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const beforeParen = trimmed.split("(")[0].trim();
  const targetSrc = /\d/.test(beforeParen) ? beforeParen : trimmed;
  const match = targetSrc.match(/\d+(?:[.,]\d+)*/);
  return match ? parseLocalizedNumber(match[0]) : null;
}

/** Parses clock string ("07:00", "08:00 WITA", "15.30") into minutes from midnight (0..1439). */
export function parseClockTimeMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

/** Computes shortest circular distance in minutes across a 24-hour clock. */
export function circularClockDiffMinutes(aMin: number, bMin: number): number {
  const diff = Math.abs(aMin - bMin);
  return diff > 720 ? 1440 - diff : diff;
}

/** Extracts lead time duration in hours from strings like "8 Jam", "9hrs", or "5.5". */
export function parseLeadTimeHours(raw?: string | null): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/\d+(?:[.,]\d+)*/);
  return match ? parseLocalizedNumber(match[0]) : null;
}

/** Formats KPI compliance percentage up to 2 decimals using Indonesian comma separator. */
export function formatKpiPct(pct: number): string {
  return `${pct.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

function calcKpiPercent(actual: number, plan: number): number {
  if (plan <= 0) return 0;
  return Math.round((actual / plan) * 10000) / 100;
}

/** Checks whether a schedule item belongs to a planned category rather than Unscheduled/Breakdown. */
export function isPlannedPsCategory(
  item: Pick<PeriodicInspectionItem, "category" | "serviceType">
): boolean {
  if (item.category) {
    return !/unscheduled|breakdown/i.test(item.category);
  }
  return !/unscheduled|breakdown/i.test(item.serviceType || "");
}

/** Evaluates per-row Plan vs Actual pass/fail tolerances for HM, Start Time, and Lead Time. */
export function evaluatePmItemKpi(item: PeriodicInspectionItem): PsItemKpiEval {
  const isPlanned = isPlannedPsCategory(item);
  const isExecuted = item.status === "Completed";

  const planHm = parsePlanHmHours(item.planHmServis);
  const actualHm =
    item.actualHmServis != null && Number.isFinite(Number(item.actualHmServis))
      ? Number(item.actualHmServis)
      : null;
  const hmDiff = planHm != null && actualHm != null ? actualHm - planHm : null;
  const hmPass =
    isExecuted && hmDiff != null ? Math.abs(hmDiff) <= HM_TOLERANCE_HOURS : null;

  const planMin = parseClockTimeMinutes(item.planStartTime);
  const actualMin = parseClockTimeMinutes(item.actualStartTime);
  const startDiffMin =
    planMin != null && actualMin != null ? circularClockDiffMinutes(planMin, actualMin) : null;
  const startPass =
    isExecuted && startDiffMin != null
      ? startDiffMin <= START_TIME_TOLERANCE_MINUTES
      : null;

  const planHours = parseLeadTimeHours(item.planLeadTime);
  const actualHours = parseLeadTimeHours(item.actualLeadTime);
  const leadDiff = planHours != null && actualHours != null ? actualHours - planHours : null;
  const leadPass =
    isExecuted && leadDiff != null
      ? Math.abs(leadDiff) <= LEAD_TIME_TOLERANCE_HOURS
      : null;

  return {
    isPlanned,
    isExecuted,
    hm: { planVal: planHm, actualVal: actualHm, diff: hmDiff, pass: hmPass },
    startTime: {
      planMin,
      actualMin,
      diffMinutes: startDiffMin,
      pass: startPass,
    },
    leadTime: { planHours, actualHours, diffHours: leadDiff, pass: leadPass },
  };
}

/**
 * Computes Periodic Service KPI metrics matching the STRIVE compliance formula:
 * - Akurasi Servis: planned units executed / total executed units
 * - Achievement Servis: planned units executed / total planned units
 * - Akurasi HM: |Actual HM - Plan HM| <= 50 hrs
 * - Akurasi Start Time: |Actual Start - Plan Start| <= 1 hr (60 min)
 * - Akurasi Lead Time: |Actual Lead - Plan Lead| <= 2 hrs
 * - PM Compliance: sum(all 5 Actuals) / sum(all 5 Plans) * 100%
 */
export function computePsKpiMetrics(items: PeriodicInspectionItem[]): PsKpiSummary {
  let executedCount = 0;
  let plannedCount = 0;
  let executedPlannedCount = 0;

  let hmPlan = 0;
  let hmActual = 0;
  let hmMissing = 0;

  let startPlan = 0;
  let startActual = 0;
  let startMissing = 0;

  let leadPlan = 0;
  let leadActual = 0;
  let leadMissing = 0;

  let incompleteActualCount = 0;

  for (const item of items) {
    const ev = evaluatePmItemKpi(item);
    if (ev.isPlanned) plannedCount++;
    if (!ev.isExecuted) continue;

    executedCount++;
    if (ev.isPlanned) executedPlannedCount++;

    const hasHmActual = ev.hm.actualVal != null;
    const hasStartActual = ev.startTime.actualMin != null;
    const hasLeadActual = ev.leadTime.actualHours != null;
    if (!hasHmActual || !hasStartActual || !hasLeadActual) {
      incompleteActualCount++;
    }

    if (ev.hm.planVal != null && ev.hm.actualVal != null) {
      hmPlan++;
      if (ev.hm.pass) hmActual++;
    } else if (ev.hm.planVal != null) {
      hmMissing++;
    }

    if (ev.startTime.planMin != null && ev.startTime.actualMin != null) {
      startPlan++;
      if (ev.startTime.pass) startActual++;
    } else if (ev.startTime.planMin != null) {
      startMissing++;
    }

    if (ev.leadTime.planHours != null && ev.leadTime.actualHours != null) {
      leadPlan++;
      if (ev.leadTime.pass) leadActual++;
    } else if (ev.leadTime.planHours != null) {
      leadMissing++;
    }
  }

  const akurasiServis: KpiMetricEntry = {
    plan: executedCount,
    actual: executedPlannedCount,
    pct: calcKpiPercent(executedPlannedCount, executedCount),
  };
  const achievementServis: KpiMetricEntry = {
    plan: plannedCount,
    actual: executedPlannedCount,
    pct: calcKpiPercent(executedPlannedCount, plannedCount),
  };
  const akurasiHm: KpiMetricEntry = {
    plan: hmPlan,
    actual: hmActual,
    pct: calcKpiPercent(hmActual, hmPlan),
    missingActualCount: hmMissing,
  };
  const akurasiStartTime: KpiMetricEntry = {
    plan: startPlan,
    actual: startActual,
    pct: calcKpiPercent(startActual, startPlan),
    missingActualCount: startMissing,
  };
  const akurasiLeadTime: KpiMetricEntry = {
    plan: leadPlan,
    actual: leadActual,
    pct: calcKpiPercent(leadActual, leadPlan),
    missingActualCount: leadMissing,
  };

  const totalPlan =
    akurasiServis.plan +
    achievementServis.plan +
    akurasiHm.plan +
    akurasiStartTime.plan +
    akurasiLeadTime.plan;
  const totalActual =
    akurasiServis.actual +
    achievementServis.actual +
    akurasiHm.actual +
    akurasiStartTime.actual +
    akurasiLeadTime.actual;

  const pmCompliance: KpiMetricEntry = {
    plan: totalPlan,
    actual: totalActual,
    pct: calcKpiPercent(totalActual, totalPlan),
  };

  return {
    pmCompliance,
    akurasiServis,
    achievementServis,
    akurasiHm,
    akurasiStartTime,
    akurasiLeadTime,
    executedCount,
    plannedCount,
    incompleteActualCount,
  };
}

/** Exports PM KPI compliance, daily summary & unit detail sheets to an .xlsx workbook. */
export function exportPmScheduleExcel(params: {
  days: DaySchedule[];
  filteredRows: Array<PeriodicInspectionItem & { dayName: string; leadName?: string | null }>;
  masterUnits: MasterUnit[];
  selectedSite: string;
  startDate: string;
  endDate: string;
}) {
  const { days, filteredRows, masterUnits, selectedSite, startDate, endDate } = params;

  const scopedDays =
    startDate && endDate
      ? days.filter((d) => d.date >= startDate && d.date <= endDate)
      : days;

  const detailSheetData = filteredRows.map((row, idx) => {
    const kpi = evaluatePmItemKpi(row);
    return {
      No: idx + 1,
      Tanggal: row.date,
      Hari: row.dayName,
      Unit: row.unitCode,
      "Kategori Unit": resolvePsUnitCategory(row, masterUnits),
      "Buntut Ikut PS": resolveTrailerSummary(row, masterUnits),
      "Tipe Servis": row.serviceType,
      Kategori: row.category || "Scheduled PS",
      "Kategori KPI": kpi.isPlanned ? "Planned (Terjadwal)" : "Unscheduled / Breakdown",
      Shift: row.shift,
      "Plan Start Time": row.planStartTime || "-",
      "Actual Start Time": row.actualStartTime || "-",
      "Evaluasi Start": kpi.startTime.pass === null ? "-" : kpi.startTime.pass ? "Sesuai" : "Lewat",
      "Plan Lead Time": row.planLeadTime || "-",
      "Actual Lead Time": row.actualLeadTime || "-",
      "Evaluasi Lead": kpi.leadTime.pass === null ? "-" : kpi.leadTime.pass ? "Sesuai" : "Lewat",
      "Plan HM Servis": row.planHmServis || "-",
      "Actual HM Servis": row.actualHmServis ?? "-",
      "Evaluasi HM": kpi.hm.pass === null ? "-" : kpi.hm.pass ? "Sesuai" : "Lewat",
      Status: row.status,
      "KM Saat Ini": row.currentKm ?? row.liveKm ?? "",
      "Target KM Next": row.nextDueKm ?? "",
      "HM Saat Ini": row.currentHm ?? row.liveHm ?? "",
      "Target HM Next": row.nextDueHm ?? "",
      "Nama Pengawas (SPV)": row.supervisorName || row.leadName || "-",
      "Nama Mekanik": resolveMechanicsArray(row).join(", ") || "-",
      Catatan: row.notes || "",
    };
  });

  const allItems = scopedDays.flatMap((d) => d.items);
  const kpiSummary = computePsKpiMetrics(allItems);
  const siteLabel = selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur";
  const formatMissingNote = (count?: number) =>
    count && count > 0 ? `${count} unit belum isi aktual` : "0";
  const formatTargetStatus = (pct: number, plan: number) => {
    if (plan <= 0) return "Belum Ada Plan";
    if (pct >= 90) return "Target Tercapai (>=90%)";
    if (pct >= 70) return "Perlu Peningkatan (70-89%)";
    return "Di Bawah Target (<70%)";
  };

  const kpiSheetData = [
    {
      Parameter: `PERIODE: ${startDate || "-"} s/d ${endDate || "-"}`,
      Keterangan: `Job Site: ${siteLabel} | Total Item Periode: ${allItems.length} unit | Selesai: ${kpiSummary.executedCount} unit`,
      Plan: "",
      Actual: "",
      "Persentase KPI": "",
      "Belum Input Aktual": kpiSummary.incompleteActualCount > 0 ? `${kpiSummary.incompleteActualCount} unit Completed belum input HM/Jam aktual` : "Lengkap",
      "Status Target": "",
    },
    {
      Parameter: "PM Compliance (Total Semua Parameter)",
      Keterangan: "(Total Actual 5 parameter / Total Plan 5 parameter) x 100%",
      Plan: kpiSummary.pmCompliance.plan,
      Actual: kpiSummary.pmCompliance.actual,
      "Persentase KPI": kpiSummary.pmCompliance.plan > 0 ? formatKpiPct(kpiSummary.pmCompliance.pct) : "-",
      "Belum Input Aktual": formatMissingNote(kpiSummary.incompleteActualCount),
      "Status Target": formatTargetStatus(kpiSummary.pmCompliance.pct, kpiSummary.pmCompliance.plan),
    },
    {
      Parameter: "Akurasi Servis",
      Keterangan: "Kesesuaian unit yang di service (Unit terencana selesai / Total selesai aktual)",
      Plan: kpiSummary.akurasiServis.plan,
      Actual: kpiSummary.akurasiServis.actual,
      "Persentase KPI": kpiSummary.akurasiServis.plan > 0 ? formatKpiPct(kpiSummary.akurasiServis.pct) : "-",
      "Belum Input Aktual": "0",
      "Status Target": formatTargetStatus(kpiSummary.akurasiServis.pct, kpiSummary.akurasiServis.plan),
    },
    {
      Parameter: "Achievement Servis",
      Keterangan: "Ketepatan unit yang service (Unit terencana selesai / Total unit terencana)",
      Plan: kpiSummary.achievementServis.plan,
      Actual: kpiSummary.achievementServis.actual,
      "Persentase KPI": kpiSummary.achievementServis.plan > 0 ? formatKpiPct(kpiSummary.achievementServis.pct) : "-",
      "Belum Input Aktual": "0",
      "Status Target": formatTargetStatus(kpiSummary.achievementServis.pct, kpiSummary.achievementServis.plan),
    },
    {
      Parameter: "Akurasi HM",
      Keterangan: "Kesesuaian HM service toleransi +/- 50 hrs",
      Plan: kpiSummary.akurasiHm.plan,
      Actual: kpiSummary.akurasiHm.actual,
      "Persentase KPI": kpiSummary.akurasiHm.plan > 0 ? formatKpiPct(kpiSummary.akurasiHm.pct) : "-",
      "Belum Input Aktual": formatMissingNote(kpiSummary.akurasiHm.missingActualCount),
      "Status Target": formatTargetStatus(kpiSummary.akurasiHm.pct, kpiSummary.akurasiHm.plan),
    },
    {
      Parameter: "Akurasi Start Time",
      Keterangan: "Kesesuaian penarikan unit service, toleransi +/- 1 jam",
      Plan: kpiSummary.akurasiStartTime.plan,
      Actual: kpiSummary.akurasiStartTime.actual,
      "Persentase KPI": kpiSummary.akurasiStartTime.plan > 0 ? formatKpiPct(kpiSummary.akurasiStartTime.pct) : "-",
      "Belum Input Aktual": formatMissingNote(kpiSummary.akurasiStartTime.missingActualCount),
      "Status Target": formatTargetStatus(kpiSummary.akurasiStartTime.pct, kpiSummary.akurasiStartTime.plan),
    },
    {
      Parameter: "Akurasi Lead Time",
      Keterangan: "Kesesuaian lead time unit service, toleransi +/- 2 jam",
      Plan: kpiSummary.akurasiLeadTime.plan,
      Actual: kpiSummary.akurasiLeadTime.actual,
      "Persentase KPI": kpiSummary.akurasiLeadTime.plan > 0 ? formatKpiPct(kpiSummary.akurasiLeadTime.pct) : "-",
      "Belum Input Aktual": formatMissingNote(kpiSummary.akurasiLeadTime.missingActualCount),
      "Status Target": formatTargetStatus(kpiSummary.akurasiLeadTime.pct, kpiSummary.akurasiLeadTime.plan),
    },
  ];

  const summarySheetData = scopedDays.map((d) => {
    const completed = d.items.filter((i) => i.status === "Completed").length;
    const pct = d.targetUnits > 0 ? Math.round((completed / d.targetUnits) * 100) : 0;
    const dayKpi = computePsKpiMetrics(d.items);
    const fmt = (m: KpiMetricEntry) => (m.plan > 0 ? formatKpiPct(m.pct) : "-");
    return {
      Tanggal: d.date,
      Hari: d.dayName,
      "Target Plan": d.targetUnits,
      Terjadwal: d.items.length,
      Completed: completed,
      "In Progress": d.items.filter((i) => i.status === "In Progress").length,
      Scheduled: d.items.filter((i) => i.status === "Scheduled").length,
      Pending: d.items.filter((i) => i.status === "Pending").length,
      "% Achievement Target": `${pct}%`,
      "PM Compliance": fmt(dayKpi.pmCompliance),
      "Akurasi Servis": fmt(dayKpi.akurasiServis),
      "Achievement Servis": fmt(dayKpi.achievementServis),
      "Akurasi HM": fmt(dayKpi.akurasiHm),
      "Akurasi Start Time": fmt(dayKpi.akurasiStartTime),
      "Akurasi Lead Time": fmt(dayKpi.akurasiLeadTime),
      "Lead Mekanik": d.leadMechanic || d.leadInspector || "-",
    };
  });

  const wb = XLSX.utils.book_new();
  const wsKpi = XLSX.utils.json_to_sheet(kpiSheetData);
  const wsSummary = XLSX.utils.json_to_sheet(
    summarySheetData.length > 0 ? summarySheetData : [{ Info: "Tidak ada data ringkasan harian" }]
  );
  const wsDetail = XLSX.utils.json_to_sheet(
    detailSheetData.length > 0
      ? detailSheetData
      : [{ Info: "Tidak ada jadwal Periodic Service pada periode ini" }]
  );

  wsKpi["!cols"] = [
    { wch: 36 },
    { wch: 56 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 36 },
    { wch: 28 },
  ];

  wsSummary["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 11 },
    { wch: 11 },
    { wch: 12 },
    { wch: 11 },
    { wch: 10 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 17 },
    { wch: 17 },
    { wch: 24 },
  ];

  wsDetail["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsKpi, "KPI Compliance");
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Harian");
  XLSX.utils.book_append_sheet(wb, wsDetail, "Daftar Detail Servis");

  const safeStart = (startDate || "start").replace(/-/g, "");
  const safeEnd = (endDate || "end").replace(/-/g, "");
  XLSX.writeFile(wb, `Periodic_Service_${selectedSite}_${safeStart}_sd_${safeEnd}.xlsx`);
}

const INDO_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const INDO_FULL_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const INDO_DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** Formats a Date instance to local YYYY-MM-DD without UTC midnight rollback. */
export function toLocalIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Returns today's local YYYY-MM-DD date string. */
export function getLocalTodayIso(): string {
  return toLocalIsoDate(new Date());
}

/** Parses YYYY-MM-DD into a local Date at noon to avoid midnight/DST boundary shifts. */
export function parseIsoToLocalDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || "").trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const dt = new Date(y, m, d, 12, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

/** Shifts a YYYY-MM-DD string by deltaDays in local calendar time. */
export function shiftIsoDate(dateStr: string, deltaDays: number): string {
  const dt = parseIsoToLocalDate(dateStr) || new Date();
  dt.setDate(dt.getDate() + deltaDays);
  return toLocalIsoDate(dt);
}

/** Counts inclusive calendar days between two YYYY-MM-DD dates. */
export function countInclusiveDays(startDate: string, endDate: string): number {
  const s = parseIsoToLocalDate(startDate);
  const e = parseIsoToLocalDate(endDate);
  if (!s || !e || s > e) return 0;
  const utcS = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const utcE = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  return Math.round((utcE - utcS) / 86_400_000) + 1;
}

/** Returns Indonesian day name (e.g. "Kamis") for a YYYY-MM-DD string. */
export function getIndoDayNameClient(dateStr: string): string {
  const dt = parseIsoToLocalDate(dateStr);
  return dt ? INDO_DAY_NAMES[dt.getDay()] : "";
}

/** Formats YYYY-MM-DD into short Indonesian date (e.g. "12 Nov 2026"). */
export function formatIndoShortDate(dateStr: string, includeYear = true): string {
  const dt = parseIsoToLocalDate(dateStr);
  if (!dt) return dateStr;
  const day = dt.getDate();
  const mon = INDO_SHORT_MONTHS[dt.getMonth()];
  return includeYear ? `${day} ${mon} ${dt.getFullYear()}` : `${day} ${mon}`;
}

/** Formats month + year header (e.g. "November 2026") for calendar navigation. */
export function formatIndoMonthYear(year: number, monthIndex: number): string {
  return `${INDO_FULL_MONTHS[monthIndex] || ""} ${year}`;
}

/** Returns Monday..Sunday bounds in YYYY-MM-DD containing the given local date (defaults to today). */
export function getLocalWeekRange(dateStr = getLocalTodayIso()): {
  startDate: string;
  endDate: string;
} {
  const dt = parseIsoToLocalDate(dateStr) || new Date();
  const baseIso = toLocalIsoDate(dt);
  const mondayOffset = (dt.getDay() + 6) % 7;
  const startDate = shiftIsoDate(baseIso, -mondayOffset);
  return {
    startDate,
    endDate: shiftIsoDate(startDate, 6),
  };
}

/** Formats a single-day or multi-day date range label compactly. */
export function formatDateRangeLabel(
  startDate: string,
  endDate: string,
  todayStr: string,
  currentWeekRange?: { startDate: string; endDate: string } | null
): string {
  if (startDate === endDate) {
    if (startDate === todayStr) {
      return `Today • ${formatIndoShortDate(startDate)}`;
    }
    return formatIndoShortDate(startDate);
  }
  const s = parseIsoToLocalDate(startDate);
  const e = parseIsoToLocalDate(endDate);
  const days = countInclusiveDays(startDate, endDate);
  const isCurrentWeek =
    currentWeekRange &&
    startDate === currentWeekRange.startDate &&
    endDate === currentWeekRange.endDate;

  let rangeText: string;
  if (s && e && s.getFullYear() === e.getFullYear()) {
    rangeText =
      s.getMonth() === e.getMonth()
        ? `${s.getDate()}–${formatIndoShortDate(endDate)}`
        : `${formatIndoShortDate(startDate, false)} – ${formatIndoShortDate(
            endDate
          )}`;
  } else {
    rangeText = `${formatIndoShortDate(startDate)} – ${formatIndoShortDate(
      endDate
    )}`;
  }

  return isCurrentWeek
    ? `Minggu Ini • ${rangeText}`
    : `${rangeText} (${days} Hari)`;
}

