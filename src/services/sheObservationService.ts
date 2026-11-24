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

export const REAKSI_PEKERJA_OPTIONS = ["AMAN", "BERESIKO", "Yang lain"] as const;
export type ReaksiPekerjaOption = (typeof REAKSI_PEKERJA_OPTIONS)[number];

export interface ObservationQuestionItem {
  key: string;
  label: string;
  description?: string;
}

export interface ObservationCategorySection {
  id: string;
  title: string;
  items: ObservationQuestionItem[];
}

export const OBSERVATION_SECTIONS: ObservationCategorySection[] = [
  {
    id: "reaksiPekerja",
    title: "Reaksi Pekerja",
    items: [
      { key: "perubahanPosisi", label: "Perubahan Posisi" },
      { key: "penghentianPekerjaan", label: "Penghentian Pekerjaan" },
      { key: "penggantianTool", label: "Penggantian tool" },
    ],
  },
  {
    id: "posisiManusia",
    title: "Posisi Manusia",
    items: [
      { key: "posisiMenabrak", label: "Menabrak" },
      { key: "posisiTerjepit", label: "Terjepit" },
      { key: "posisiTerhirup", label: "Terhirup" },
      { key: "posisiTerseret", label: "Terseret" },
      { key: "posisiTerkenaListrik", label: "Terkena Listrik" },
      { key: "posisiTerjatuh", label: "Terjatuh" },
      { key: "posisiTerpukul", label: "Terpukul" },
    ],
  },
  {
    id: "apd",
    title: "Peralatan Pelindung Diri (APD)",
    items: [
      { key: "apdKepala", label: "Kepala" },
      { key: "apdTelingaMata", label: "Telinga dan Mata" },
      { key: "apdMukaPernafasan", label: "Muka dan Pernafasan" },
      { key: "apdTanganLengan", label: "Tangan dan Lengan" },
      { key: "apdKakiTungkai", label: "Kaki dan Tungkai" },
    ],
  },
  {
    id: "prosedur",
    title: "Prosedur",
    items: [
      { key: "prosedurStandard", label: "Standard Memadai" },
      { key: "prosedurPengawasan", label: "Pengawasan" },
      { key: "prosedurIjinKerja", label: "Ijin Kerja" },
      { key: "prosedurEmergency", label: "Ketentuan Emergency" },
    ],
  },
  {
    id: "perkakas",
    title: "Perkakas Tangan dan Peralatan",
    items: [
      { key: "perkakasSesuai", label: "Sesuai dengan pekerjaan" },
      { key: "perkakasBenar", label: "Digunakan dengan benar" },
      { key: "perkakasAmanInspeksi", label: "Kondisi aman di inspeksi" },
      { key: "perkakasPengaman", label: "Terdapat pengaman" },
      { key: "perkakasSafetyDevice", label: "Terdapat safety device" },
    ],
  },
  {
    id: "kerapihan",
    title: "Ketertiban / Kerapihan",
    items: [
      { key: "kerapihanRuangJalan", label: "Ruang dan Jalan untuk pekerja" },
      { key: "kerapihanPenempatan", label: "Penempatan peralatan" },
      { key: "kerapihanPenyimpanan", label: "Penyimpanan Barang" },
      { key: "kerapihanHambatan", label: "Terdapat hambatan / gangguan" },
      { key: "kerapihanPijakanLantai", label: "Pijakan dan lantai kerja" },
    ],
  },
];

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

  // 1. Reaksi Pekerja
  perubahanPosisi: string; // AMAN / BERESIKO / Custom
  penghentianPekerjaan: string; // AMAN / BERESIKO / Custom
  penggantianTool: string; // AMAN / BERESIKO / Custom
  reaksiPekerjaCustom?: string;

  // 2. Posisi Manusia
  posisiMenabrak?: string;
  posisiTerjepit?: string;
  posisiTerhirup?: string;
  posisiTerseret?: string;
  posisiTerkenaListrik?: string;
  posisiTerjatuh?: string;
  posisiTerpukul?: string;

  // 3. APD
  apdKepala?: string;
  apdTelingaMata?: string;
  apdMukaPernafasan?: string;
  apdTanganLengan?: string;
  apdKakiTungkai?: string;

  // 4. Prosedur
  prosedurStandard?: string;
  prosedurPengawasan?: string;
  prosedurIjinKerja?: string;
  prosedurEmergency?: string;

  // 5. Perkakas Tangan dan Peralatan
  perkakasSesuai?: string;
  perkakasBenar?: string;
  perkakasAmanInspeksi?: string;
  perkakasPengaman?: string;
  perkakasSafetyDevice?: string;

  // 6. Ketertiban / Kerapihan
  kerapihanRuangJalan?: string;
  kerapihanPenempatan?: string;
  kerapihanPenyimpanan?: string;
  kerapihanHambatan?: string;
  kerapihanPijakanLantai?: string;

  // 7. Tindak Lanjut Observasi
  saranObserver?: string;
  feedbackObjek?: string;
  kesepakatan?: string;
  catatanObservasi?: string;
  tindakanPerbaikan?: string;
  dokumentasi?: string; // photo URL or base64
  rawAnswersJson?: string | Record<string, any>;

  status: "AMAN" | "BERISIKO" | string;
  statusGForm: "OPEN" | "CLOSE" | string;
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
        posisiMenabrak: data.posisiMenabrak || "AMAN",
        posisiTerjepit: data.posisiTerjepit || "AMAN",
        posisiTerhirup: data.posisiTerhirup || "AMAN",
        posisiTerseret: data.posisiTerseret || "AMAN",
        posisiTerkenaListrik: data.posisiTerkenaListrik || "AMAN",
        posisiTerjatuh: data.posisiTerjatuh || "AMAN",
        posisiTerpukul: data.posisiTerpukul || "AMAN",
        apdKepala: data.apdKepala || "AMAN",
        apdTelingaMata: data.apdTelingaMata || "AMAN",
        apdMukaPernafasan: data.apdMukaPernafasan || "AMAN",
        apdTanganLengan: data.apdTanganLengan || "AMAN",
        apdKakiTungkai: data.apdKakiTungkai || "AMAN",
        prosedurStandard: data.prosedurStandard || "AMAN",
        prosedurPengawasan: data.prosedurPengawasan || "AMAN",
        prosedurIjinKerja: data.prosedurIjinKerja || "AMAN",
        prosedurEmergency: data.prosedurEmergency || "AMAN",
        perkakasSesuai: data.perkakasSesuai || "AMAN",
        perkakasBenar: data.perkakasBenar || "AMAN",
        perkakasAmanInspeksi: data.perkakasAmanInspeksi || "AMAN",
        perkakasPengaman: data.perkakasPengaman || "AMAN",
        perkakasSafetyDevice: data.perkakasSafetyDevice || "AMAN",
        kerapihanRuangJalan: data.kerapihanRuangJalan || "AMAN",
        kerapihanPenempatan: data.kerapihanPenempatan || "AMAN",
        kerapihanPenyimpanan: data.kerapihanPenyimpanan || "AMAN",
        kerapihanHambatan: data.kerapihanHambatan || "AMAN",
        kerapihanPijakanLantai: data.kerapihanPijakanLantai || "AMAN",
        saranObserver: data.saranObserver,
        feedbackObjek: data.feedbackObjek,
        kesepakatan: data.kesepakatan,
        catatanObservasi: data.catatanObservasi,
        tindakanPerbaikan: data.tindakanPerbaikan,
        dokumentasi: data.dokumentasi,
        rawAnswersJson: data.rawAnswersJson,
        status: data.status || "AMAN",
        statusGForm: data.statusGForm || "OPEN",
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
