"use client";

import { API_BASE_URL } from "./apiConfig";
import seedData from "../data/workAreaInspectionsSeed.json";

export const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe1y_q2HFcRICNWmtt_ur5RGz10NDR4V8KVghzhu_83SNvHKg/viewform";

// Exact 17 Locations from BDP Google Form
export const LOKASI_INSPEKSI_OPTIONS = [
  "OFFICE",
  "MESS & CAMP",
  "KANTIN",
  "WORKSHOP",
  "WAREHOUSE",
  "TOOL ROOM",
  "FUEL STATION & FUEL STORAGE",
  "RUMAH GENSET",
  "COAL PAD",
  "JETTY",
  "CHR",
  "TPS LB3",
  "OIL TRAP",
  "WTP",
  "WASHING PAD",
  "WATERFILL",
  "PROJECT KONSTRUKSI",
] as const;

export type LokasiInspeksiType = (typeof LOKASI_INSPEKSI_OPTIONS)[number];

export const SHIFT_OPTIONS = ["SHIFT 1", "SHIFT 2"] as const;
export type ShiftType = (typeof SHIFT_OPTIONS)[number];

export const PROJECT_OPTIONS = ["SENYIUR", "MUARA PAHU"] as const;
export type ProjectType = (typeof PROJECT_OPTIONS)[number];

// Exact 11 Checklist Items for OIL TRAP from Google Form
export const OIL_TRAP_CHECKLIST_ITEMS = [
  "Saluran masuk (inlet) lancar/tidak tersumbat",
  "Terdiri dari 3 kompartement/trap",
  "Dinding dan lantai bangunan tidak bocor",
  "Saluran antar kompartemen dilengkapi pipa elbow dan berfungsi dengan baik",
  "Terdapat lapisan minyak dan oli yang terperangkap",
  "Kondisi air buangan (outlet) kualitas baik",
  "Ada endapan lumpur dalam masing-masing trap",
  "Tidak terdapat sampah/benda asing di dalam oil trap",
  "Oil trap dilengkapi penutup",
  "Penutup oil trap dilengkapi kuping untuk pegangan",
  "Oil trap dilakukan perawatan secara berkala",
] as const;

export type ChecklistAnswer = "AMAN" | "TIDAK AMAN" | string;

export interface OilTrapChecklistAnswer {
  itemQuestion: string;
  answer: "AMAN" | "TIDAK AMAN" | "Yang lain";
  customAnswer?: string;
}

export interface WorkAreaInspectionItem {
  id: string;
  inspectionNumber: string; // e.g. "INS-MP-2026-0048"

  // Exact Google Form Fields
  namaKaryawan: string;
  nikKaryawan: string;
  tanggalInspeksi: string; // YYYY-MM-DD
  lokasiInspeksi: LokasiInspeksiType | string;
  shift: ShiftType | string;
  project: ProjectType;

  // Specific for Oil Trap (or other specific area)
  lokasiOilTrap?: string;
  oilTrapAnswers?: OilTrapChecklistAnswer[];
  dokumentasiInspeksi?: string; // photo or drawing url / base64

  // General Metadata for Dashboard & Rekap Table
  jobSite: "MuaraPahu" | "Senyiur";
  areaName: string;
  time: string; // HH:MM
  complianceScore: number; // 0 - 100 (%)
  status: "Compliant" | "Need Follow Up" | "Critical";
  findingsCount: number;
  findingsDescription?: string;
  correctiveAction?: string;
  pic?: string;
  targetCompletionDate?: string;
  createdAt: string;
}

export interface WorkAreaFormSettings {
  isOpen: boolean;
  googleFormUrl: string;
  closedMessage: string;
  updatedAt: string;
}

export interface WorkAreaSummaryStats {
  totalInspections: number;
  compliantCount: number;
  needFollowUpCount: number;
  criticalCount: number;
  averageScore: number;
  totalFindings: number;
  resolvedFindings: number;
  resolutionRate: number;
}

const STORAGE_KEY = "bdp_work_area_inspections_v3";
const FORM_SETTINGS_KEY = "bdp_work_area_form_settings_v1";

const DEFAULT_FORM_SETTINGS: WorkAreaFormSettings = {
  isOpen: true,
  googleFormUrl: GOOGLE_FORM_URL,
  closedMessage:
    "Formulir Inspeksi Area Kerja saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada. Silakan hubungi Safety Officer atau pengawas area untuk koordinasi langsung.",
  updatedAt: new Date().toISOString(),
};

const DEFAULT_INSPECTIONS: WorkAreaInspectionItem[] = (seedData as unknown as WorkAreaInspectionItem[]) || [];

export const workAreaInspectionService = {
  getFormSettings: (): WorkAreaFormSettings => {
    if (typeof window === "undefined") return DEFAULT_FORM_SETTINGS;
    const stored = localStorage.getItem(FORM_SETTINGS_KEY);
    if (!stored) return DEFAULT_FORM_SETTINGS;
    try {
      return { ...DEFAULT_FORM_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_FORM_SETTINGS;
    }
  },

  updateFormSettings: (updates: Partial<WorkAreaFormSettings>): WorkAreaFormSettings => {
    const current = workAreaInspectionService.getFormSettings();
    const next: WorkAreaFormSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(FORM_SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("bdp-work-area-form-settings-changed"));
    }
    return next;
  },

  getAll: async (site?: "MuaraPahu" | "Senyiur" | "ALL"): Promise<WorkAreaInspectionItem[]> => {
    // 1. Try to fetch from Backend API
    try {
      const q = new URLSearchParams();
      if (site && site !== "ALL") q.append("site", site);
      q.append("limit", "5000");

      const res = await fetch(`${API_BASE_URL}/she/inspections?${q.toString()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
            } catch {
              // Ignore localStorage quota errors if large
            }
          }
          return json.data;
        }
      }
    } catch {
      // Backend unavailable or network error, proceed to fallback
    }

    // 2. Fallback to localStorage or Seed Data
    if (typeof window === "undefined") return DEFAULT_INSPECTIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: WorkAreaInspectionItem[] = stored ? JSON.parse(stored) : DEFAULT_INSPECTIONS;
      if (!stored) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INSPECTIONS));
        } catch {}
      }
      if (site && site !== "ALL") {
        list = list.filter((item) => item.jobSite === site);
      }
      return list.sort((a, b) => new Date(b.tanggalInspeksi || b.createdAt).getTime() - new Date(a.tanggalInspeksi || a.createdAt).getTime());
    } catch {
      return DEFAULT_INSPECTIONS;
    }
  },

  getById: async (id: string): Promise<WorkAreaInspectionItem | null> => {
    const all = await workAreaInspectionService.getAll("ALL");
    return all.find((item) => item.id === id) || null;
  },

  create: async (
    data: Omit<WorkAreaInspectionItem, "id" | "inspectionNumber" | "createdAt">
  ): Promise<WorkAreaInspectionItem> => {
    // 1. Try Backend API
    try {
      const res = await fetch(`${API_BASE_URL}/she/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const all = await workAreaInspectionService.getAll("ALL");
          const updated = [json.data, ...all.filter((i) => i.id !== json.data.id)];
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {}
          }
          return json.data;
        }
      }
    } catch {}

    // 2. Fallback Local Create
    const all = await workAreaInspectionService.getAll("ALL");
    const count = all.length + 1;
    const prefix = data.project === "SENYIUR" ? "INS-SN" : "INS-MP";
    const year = new Date().getFullYear();
    const inspectionNumber = `${prefix}-${year}-${String(count).padStart(4, "0")}`;

    const newItem: WorkAreaInspectionItem = {
      ...data,
      id: `ins-${Date.now()}`,
      inspectionNumber,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...all];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
    return newItem;
  },

  update: async (
    id: string,
    data: Partial<WorkAreaInspectionItem>
  ): Promise<WorkAreaInspectionItem> => {
    // 1. Try Backend API
    try {
      const res = await fetch(`${API_BASE_URL}/she/inspections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const all = await workAreaInspectionService.getAll("ALL");
          const idx = all.findIndex((i) => i.id === id);
          if (idx !== -1) {
            all[idx] = { ...all[idx], ...json.data };
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
              } catch {}
            }
          }
          return json.data;
        }
      }
    } catch {}

    // 2. Fallback Local Update
    const all = await workAreaInspectionService.getAll("ALL");
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Inspeksi tidak ditemukan.");

    const updatedItem = { ...all[idx], ...data };
    all[idx] = updatedItem;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {}
    }
    return updatedItem;
  },

  delete: async (id: string): Promise<boolean> => {
    // 1. Try Backend API
    try {
      await fetch(`${API_BASE_URL}/she/inspections/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}

    // 2. Update Local Cache
    const all = await workAreaInspectionService.getAll("ALL");
    const filtered = all.filter((i) => i.id !== id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }
    return true;
  },

  getSummaryStats: async (
    site?: "MuaraPahu" | "Senyiur" | "ALL"
  ): Promise<WorkAreaSummaryStats> => {
    const list = await workAreaInspectionService.getAll(site);
    const total = list.length || 1;
    const compliant = list.filter((i) => i.status === "Compliant").length;
    const needFollowUp = list.filter((i) => i.status === "Need Follow Up").length;
    const critical = list.filter((i) => i.status === "Critical").length;

    const totalScore = list.reduce((acc, curr) => acc + (curr.complianceScore || 0), 0);
    const averageScore = Math.round((totalScore / total) * 10) / 10;

    const totalFindings = list.reduce((acc, curr) => acc + (curr.findingsCount || 0), 0);
    const resolvedFindings = list
      .filter((i) => i.status === "Compliant")
      .reduce((acc, curr) => acc + (curr.findingsCount || 0), 0);
    const resolutionRate = totalFindings > 0 ? Math.round((resolvedFindings / totalFindings) * 100) : 100;

    return {
      totalInspections: list.length,
      compliantCount: compliant,
      needFollowUpCount: needFollowUp,
      criticalCount: critical,
      averageScore,
      totalFindings,
      resolvedFindings,
      resolutionRate,
    };
  },

  resetToDefault: async (): Promise<void> => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INSPECTIONS));
    }
  },
};
