"use client";

import { API_BASE_URL } from "./apiConfig";

export const GOOGLE_FORM_OBSERVATION_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSc3f4JeLVbMYYxqnOsIKGwFop2pW7o3uT_xnhRhcaeaD3uHQg/viewform";

// Exact 16 Locations from Google Form
export const LOKASI_OBSERVASI_OPTIONS = [
  "OFFICE",
  "MESS & CAMP",
  "KANTIN",
  "WORKSHOP",
  "WAREHOUSE",
  "FUEL STATION",
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

export type LokasiObservasiType = (typeof LOKASI_OBSERVASI_OPTIONS)[number] | "Yang lain";

// Exact 9 Area PICs from Google Form
export const PENANGGUNG_JAWAB_OPTIONS = [
  "HR",
  "HSE",
  "MANAGEMENT",
  "PLANT",
  "PRODUKSI",
  "LOGISTIK",
  "GA",
  "INFRA",
  "SUBCONT",
] as const;

export type PenanggungJawabType = (typeof PENANGGUNG_JAWAB_OPTIONS)[number] | "Yang lain";

export const PROJECT_OBSERVATION_OPTIONS = ["SENYIUR", "MUARA PAHU"] as const;
export type ProjectObservationType = (typeof PROJECT_OBSERVATION_OPTIONS)[number];

export const REAKSI_PEKERJA_OPTIONS = ["AMAN", "BERISIKO", "Yang lain"] as const;
export type ReaksiPekerjaOption = (typeof REAKSI_PEKERJA_OPTIONS)[number];

export interface SheObservationItem {
  id: string;
  observationNumber: string; // e.g. "OBS-MP-2026-0001"
  judulObservasi: string; // Aktifitas yang di Observasi
  namaObserver: string; // Nama Karyawan Yang Melakukan Observasi
  nikObserver?: string; // NIK Karyawan Yang Melakukan Observasi
  namaObserved: string; // Nama Karyawan yang di Observasi
  tanggalObservasi: string; // YYYY-MM-DD
  lokasiObservasi: string;
  detailLokasi?: string;
  penanggungJawabArea?: string;
  project: ProjectObservationType | string;
  jobSite: "MuaraPahu" | "Senyiur";
  perubahanPosisi: string; // AMAN / BERISIKO / Custom
  penghentianPekerjaan: string; // AMAN / BERISIKO / Custom
  penggantianTool: string; // AMAN / BERISIKO / Custom
  reaksiPekerjaCustom?: string;
  status: "AMAN" | "BERISIKO" | string;
  statusGForm: "OPEN" | "CLOSE" | string;
  catatanObservasi?: string;
  tindakanPerbaikan?: string;
  dokumentasi?: string; // photo URL or base64
  createdAt: string;
}

export interface SheObservationFormSettings {
  isOpen: boolean;
  googleFormUrl: string;
  closedMessage: string;
  updatedAt: string;
}

export interface SheObservationSummaryStats {
  totalObservations: number;
  safeObservations: number;
  riskyObservations: number;
  safePercentage: number;
  muaraPahuCount: number;
  senyiurCount: number;
}

const SETTINGS_KEY = "bdp_she_observation_form_settings";
const LOCAL_CACHE_KEY = "bdp_she_observations_cache";

export const sheObservationService = {
  getFormSettings(): SheObservationFormSettings {
    if (typeof window === "undefined") {
      return {
        isOpen: true,
        googleFormUrl: GOOGLE_FORM_OBSERVATION_URL,
        closedMessage:
          "Formulir Laporan Observasi saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada.",
        updatedAt: "",
      };
    }
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to load observation settings:", e);
    }
    return {
      isOpen: true,
      googleFormUrl: GOOGLE_FORM_OBSERVATION_URL,
      closedMessage:
        "Formulir Laporan Observasi saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada.",
      updatedAt: "",
    };
  },

  saveFormSettings(settings: Partial<SheObservationFormSettings>): SheObservationFormSettings {
    const current = this.getFormSettings();
    const updated: SheObservationFormSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("bdp-she-observation-form-settings-changed"));
    }
    return updated;
  },

  async getObservations(site: "MuaraPahu" | "Senyiur" | "ALL" = "ALL"): Promise<SheObservationItem[]> {
    try {
      const query = site !== "ALL" ? `?site=${site}` : "";
      const res = await fetch(`${API_BASE_URL}/she/observations${query}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(json.data));
            } catch (e) {
              // ignore quota
            }
          }
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Failed fetching safety observations from API, falling back to cache", err);
    }

    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(LOCAL_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return site === "ALL" ? parsed : parsed.filter((p: any) => p.jobSite === site);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return [];
  },

  async createObservation(data: Partial<SheObservationItem>): Promise<SheObservationItem> {
    try {
      const res = await fetch(`${API_BASE_URL}/she/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Gagal menyimpan laporan observasi ke server");
    } catch (err: any) {
      console.warn("API createObservation failed, falling back to local storage", err);
      const fallbackItem: SheObservationItem = {
        id: `local-obs-${Date.now()}`,
        observationNumber: `OBS-${data.jobSite === "Senyiur" ? "SN" : "MP"}-${new Date().getFullYear()}-${String(
          Math.floor(Math.random() * 9000) + 1000
        )}`,
        judulObservasi: data.judulObservasi || "Observasi Perilaku Kerja",
        namaObserver: data.namaObserver || "Karyawan",
        nikObserver: data.nikObserver,
        namaObserved: data.namaObserved || "Pekerja Lapangan",
        tanggalObservasi: data.tanggalObservasi || new Date().toISOString().slice(0, 10),
        lokasiObservasi: data.lokasiObservasi || "WORKSHOP",
        detailLokasi: data.detailLokasi,
        penanggungJawabArea: data.penanggungJawabArea || "PLANT",
        project: data.project || (data.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"),
        jobSite: data.jobSite || "MuaraPahu",
        perubahanPosisi: data.perubahanPosisi || "AMAN",
        penghentianPekerjaan: data.penghentianPekerjaan || "AMAN",
        penggantianTool: data.penggantianTool || "AMAN",
        reaksiPekerjaCustom: data.reaksiPekerjaCustom,
        status: data.status || "AMAN",
        statusGForm: data.statusGForm || "OPEN",
        catatanObservasi: data.catatanObservasi,
        tindakanPerbaikan: data.tindakanPerbaikan,
        dokumentasi: data.dokumentasi,
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(LOCAL_CACHE_KEY);
          const list = cached ? JSON.parse(cached) : [];
          list.unshift(fallbackItem);
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(list));
        } catch (e) {
          // ignore
        }
      }

      return fallbackItem;
    }
  },

  async updateObservation(id: string, updates: Partial<SheObservationItem>): Promise<SheObservationItem> {
    const res = await fetch(`${API_BASE_URL}/she/observations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error("Gagal mengupdate laporan observasi");
    }
    const json = await res.json();
    return json.data;
  },

  async deleteObservation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/she/observations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Gagal menghapus laporan observasi");
    }
  },

  computeStats(observations: SheObservationItem[]): SheObservationSummaryStats {
    const total = observations.length;
    const safe = observations.filter((o) => o.status === "AMAN").length;
    const risky = observations.filter((o) => o.status === "BERISIKO").length;
    const safePercentage = total > 0 ? Math.round((safe / total) * 100) : 100;
    const muaraPahuCount = observations.filter((o) => o.jobSite === "MuaraPahu").length;
    const senyiurCount = observations.filter((o) => o.jobSite === "Senyiur").length;

    return {
      totalObservations: total,
      safeObservations: safe,
      riskyObservations: risky,
      safePercentage,
      muaraPahuCount,
      senyiurCount,
    };
  },
};
