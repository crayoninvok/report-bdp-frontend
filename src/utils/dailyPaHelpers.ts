export const INDONESIAN_MONTHS = [
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

export const INDONESIAN_WEEKDAYS_MON_FIRST = [
  { short: "Sen", full: "Senin", isWeekend: false, isSunday: false },
  { short: "Sel", full: "Selasa", isWeekend: false, isSunday: false },
  { short: "Rab", full: "Rabu", isWeekend: false, isSunday: false },
  { short: "Kam", full: "Kamis", isWeekend: false, isSunday: false },
  { short: "Jum", full: "Jumat", isWeekend: false, isSunday: false },
  { short: "Sab", full: "Sabtu", isWeekend: true, isSunday: false },
  { short: "Min", full: "Minggu", isWeekend: true, isSunday: true },
] as const;

export interface ParsedIsoDate {
  year: number;
  monthIndex: number;
  day: number;
  date: Date;
}

export interface CalendarCell {
  iso: string;
  day: number;
  monthIndex: number;
  year: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isSunday: boolean;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** Formats local calendar numbers into canonical YYYY-MM-DD. */
export function formatIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/** Returns today's local calendar date as YYYY-MM-DD. */
export function getTodayIsoDate(): string {
  const now = new Date();
  return formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Strictly parses YYYY-MM-DD and rejects calendar overflow dates such as 2026-02-30. */
export function parseIsoDate(raw: string | undefined | null): ParsedIsoDate | null {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, monthIndex, day, date };
}

/** Returns the YYYY-MM-DD string shifted by offsetDays relative to iso, or null if invalid. */
export function shiftIsoDate(iso: string, offsetDays: number): string | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const shifted = new Date(parsed.year, parsed.monthIndex, parsed.day + offsetDays);
  return formatIsoDate(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
}

/** Formats a Date in full Indonesian notation (e.g., "Kamis, 12 November 2026"). */
export function formatIndonesianFullDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Formats a Date in compact Indonesian notation (e.g., "12 Nov 2026"). */
export function formatIndonesianShortDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Builds a 42-cell (6x7) Monday-first monthly calendar grid for the given year & monthIndex. */
export function buildCalendarMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const colIndex = i % 7;
    const cellYear = cellDate.getFullYear();
    const cellMonth = cellDate.getMonth();
    const cellDay = cellDate.getDate();

    cells.push({
      iso: formatIsoDate(cellYear, cellMonth, cellDay),
      day: cellDay,
      monthIndex: cellMonth,
      year: cellYear,
      isCurrentMonth: cellYear === year && cellMonth === monthIndex,
      isWeekend: colIndex >= 5,
      isSunday: colIndex === 6,
    });
  }

  return cells;
}

