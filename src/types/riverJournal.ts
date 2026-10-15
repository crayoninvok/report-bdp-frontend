import { JobSite } from "./auth";

export interface RiverJournalEntry {
  id: string;
  externalId?: number; // Kolom A: ID
  date: string; // Kolom B: Tanggal (YYYY-MM-DD)
  inputTime: string; // Kolom C: Waktu Input (HH:mm)
  location: string; // Kolom D: Lokasi Pengukuran ("Dermaga Senyiur KM 0" / "Jetty Muara Pahu")
  site: JobSite; // "Senyiur" | "MuaraPahu"
  waterDepth: number; // Kolom E: Kedalaman Air Sungai (m)
  minThreshold: number; // Kolom F: Batas Minimum Kedalaman (m, default 4.0)
  autoDescription: string; // Kolom G: Deskripsi otomatis ("Surut (Tugboat Tidak Bisa Masuk)" / "Air Sudah Aman")
  userInput: string; // Kolom H: User yang input ("Dzaky")
  conclusion: string; // Kolom I: Kesimpulan Data
  createdAt?: string;
  updatedAt?: string;
}

export interface RiverJournalStats {
  totalReadings: number;
  latestReading: (RiverJournalEntry & { delta?: number }) | null;
  minDepth: number;
  maxDepth: number;
  avgDepth: number;
  safeCount: number;
  surutCount: number;
  safePercentage: number;
  currentStatus: "Aman" | "Surut" | "Unknown";
}

export interface CreateRiverJournalPayload {
  externalId?: number;
  date: string;
  inputTime: string;
  location: string;
  site: JobSite;
  waterDepth: number;
  minThreshold: number;
  autoDescription?: string;
  userInput: string;
  conclusion?: string;
}

export interface DailyPairedPoint {
  date: string;
  label: string;
  senyiur: number;
  muaraPahu: number;
  deltaSenyiur: number;
  deltaMuaraPahu: number;
  isSameDirection: boolean;
  statusLabel: string;
  statusType: "both_up" | "both_down" | "divergent" | "flat";
  senyiurDeficit: number;
}

export interface SiteTrendPoint {
  date: string;
  label: string;
  inputTime: string;
  waterDepth: number;
  plan: number;
  trendDepth: number;
  diffToPlan: number;
  location: string;
}

export interface SiteTrendSummary {
  data: SiteTrendPoint[];
  slope: number;
  avg: number;
  min: number;
  max: number;
  latest: RiverJournalEntry | null;
}


