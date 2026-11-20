"use client";

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

const STORAGE_KEY = "bdp_work_area_inspections_v2";
const FORM_SETTINGS_KEY = "bdp_work_area_form_settings_v1";

const DEFAULT_FORM_SETTINGS: WorkAreaFormSettings = {
  isOpen: true,
  googleFormUrl: GOOGLE_FORM_URL,
  closedMessage:
    "Formulir Inspeksi Area Kerja saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada. Silakan hubungi Safety Officer atau pengawas area untuk koordinasi langsung.",
  updatedAt: new Date().toISOString(),
};

const DEFAULT_INSPECTIONS: WorkAreaInspectionItem[] = [
  {
    id: "ins-001",
    inspectionNumber: "INS-MP-2026-0048",
    namaKaryawan: "Ahmad Rizky Pratama",
    nikKaryawan: "BDP-2024-089",
    tanggalInspeksi: "2026-11-19",
    lokasiInspeksi: "OIL TRAP",
    shift: "SHIFT 1",
    project: "MUARA PAHU",
    lokasiOilTrap: "Oil Trap Workshop Utama Muara Pahu",
    oilTrapAnswers: [
      { itemQuestion: "Saluran masuk (inlet) lancar/tidak tersumbat", answer: "AMAN" },
      { itemQuestion: "Terdiri dari 3 kompartement/trap", answer: "AMAN" },
      { itemQuestion: "Dinding dan lantai bangunan tidak bocor", answer: "AMAN" },
      { itemQuestion: "Saluran antar kompartemen dilengkapi pipa elbow dan berfungsi dengan baik", answer: "AMAN" },
      { itemQuestion: "Terdapat lapisan minyak dan oli yang terperangkap", answer: "AMAN" },
      { itemQuestion: "Kondisi air buangan (outlet) kualitas baik", answer: "AMAN" },
      { itemQuestion: "Ada endapan lumpur dalam masing-masing trap", answer: "TIDAK AMAN", customAnswer: "Endapan lumpur trap 1 tebal butuh dikuras" },
      { itemQuestion: "Tidak terdapat sampah/benda asing di dalam oil trap", answer: "AMAN" },
      { itemQuestion: "Oil trap dilengkapi penutup", answer: "AMAN" },
      { itemQuestion: "Penutup oil trap dilengkapi kuping untuk pegangan", answer: "AMAN" },
      { itemQuestion: "Oil trap dilakukan perawatan secara berkala", answer: "AMAN" },
    ],
    jobSite: "MuaraPahu",
    areaName: "Oil Trap Workshop Utama MP",
    time: "09:30",
    complianceScore: 91,
    status: "Need Follow Up",
    findingsCount: 1,
    findingsDescription: "Endapan lumpur trap 1 tebal, perlu jadwal pengurasan sedimentasi.",
    correctiveAction: "Pembersihan dan pengurasan lumpur oleh tim maintenance workshop.",
    pic: "Foreman Workshop Bay 1",
    targetCompletionDate: "2026-11-21",
    createdAt: "2026-11-19T09:45:00Z",
  },
  {
    id: "ins-002",
    inspectionNumber: "INS-MP-2026-0047",
    namaKaryawan: "Budi Santoso",
    nikKaryawan: "BDP-2023-014",
    tanggalInspeksi: "2026-11-18",
    lokasiInspeksi: "WASHING PAD",
    shift: "SHIFT 1",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    areaName: "Washing Pad Unit Hauling MP",
    time: "14:15",
    complianceScore: 95,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Saluran drainase pencucian lancar dan pompa steam beroperasi normal.",
    correctiveAction: "Pertahankan kebersihan berkala pasca mencuci unit batubara.",
    pic: "Washing Pad Attendant",
    targetCompletionDate: "2026-11-18",
    createdAt: "2026-11-18T14:40:00Z",
  },
  {
    id: "ins-003",
    inspectionNumber: "INS-SN-2026-0022",
    namaKaryawan: "Dedy Wijaya",
    nikKaryawan: "BDP-2024-045",
    tanggalInspeksi: "2026-11-17",
    lokasiInspeksi: "OIL TRAP",
    shift: "SHIFT 1",
    project: "SENYIUR",
    lokasiOilTrap: "Oil Trap Fuel Station Senyiur",
    oilTrapAnswers: [
      { itemQuestion: "Saluran masuk (inlet) lancar/tidak tersumbat", answer: "AMAN" },
      { itemQuestion: "Terdiri dari 3 kompartement/trap", answer: "AMAN" },
      { itemQuestion: "Dinding dan lantai bangunan tidak bocor", answer: "AMAN" },
      { itemQuestion: "Saluran antar kompartemen dilengkapi pipa elbow dan berfungsi dengan baik", answer: "AMAN" },
      { itemQuestion: "Terdapat lapisan minyak dan oli yang terperangkap", answer: "AMAN" },
      { itemQuestion: "Kondisi air buangan (outlet) kualitas baik", answer: "AMAN" },
      { itemQuestion: "Ada endapan lumpur dalam masing-masing trap", answer: "AMAN" },
      { itemQuestion: "Tidak terdapat sampah/benda asing di dalam oil trap", answer: "AMAN" },
      { itemQuestion: "Oil trap dilengkapi penutup", answer: "AMAN" },
      { itemQuestion: "Penutup oil trap dilengkapi kuping untuk pegangan", answer: "AMAN" },
      { itemQuestion: "Oil trap dilakukan perawatan secara berkala", answer: "AMAN" },
    ],
    jobSite: "Senyiur",
    areaName: "Oil Trap Fuel Station Senyiur",
    time: "10:00",
    complianceScore: 100,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Seluruh kompartemen dalam kondisi prima, siku pipa elbow bersih dan outlet jernih.",
    correctiveAction: "Lanjutkan inspeksi berkala per minggu.",
    pic: "Fuel Station Supervisor",
    targetCompletionDate: "2026-11-17",
    createdAt: "2026-11-17T10:30:00Z",
  },
  {
    id: "ins-004",
    inspectionNumber: "INS-MP-2026-0046",
    namaKaryawan: "Hendra Gunawan",
    nikKaryawan: "BDP-2023-098",
    tanggalInspeksi: "2026-11-16",
    lokasiInspeksi: "TPS LB3",
    shift: "SHIFT 2",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    areaName: "TPS Limbah B3 Muara Pahu",
    time: "16:20",
    complianceScore: 92,
    status: "Compliant",
    findingsCount: 1,
    findingsDescription: "Label simbol B3 pada drum oli bekas nomor 4 agak pudar akibat percikan.",
    correctiveAction: "Pemasangan kembali stiker simbol limbah B3 baru yang tahan cuaca.",
    pic: "Petugas TPS LB3",
    targetCompletionDate: "2026-11-17",
    createdAt: "2026-11-16T16:50:00Z",
  },
  {
    id: "ins-005",
    inspectionNumber: "INS-SN-2026-0021",
    namaKaryawan: "Dedy Wijaya",
    nikKaryawan: "BDP-2024-045",
    tanggalInspeksi: "2026-11-15",
    lokasiInspeksi: "FUEL STATION & FUEL STORAGE",
    shift: "SHIFT 1",
    project: "SENYIUR",
    jobSite: "Senyiur",
    areaName: "Fuel Station & Tangki Solar Senyiur",
    time: "08:45",
    complianceScore: 96,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Grounding rod, APAR Foam 50kg, dan saluran tanggul ceceran dalam kondisi baik.",
    correctiveAction: "Pertahankan checklist harian BBM.",
    pic: "Fuel Station Officer",
    targetCompletionDate: "2026-11-15",
    createdAt: "2026-11-15T09:15:00Z",
  },
  {
    id: "ins-006",
    inspectionNumber: "INS-MP-2026-0045",
    namaKaryawan: "Ahmad Rizky Pratama",
    nikKaryawan: "BDP-2024-089",
    tanggalInspeksi: "2026-11-14",
    lokasiInspeksi: "MESS & CAMP",
    shift: "SHIFT 2",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    areaName: "Mess Karyawan Blok B MP",
    time: "20:30",
    complianceScore: 98,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Penerangan koridor dan drainase air limbah domestik mengalir lancar.",
    correctiveAction: "Pertahankan jadwal kebersihan 5R mingguan.",
    pic: "Camp Officer",
    targetCompletionDate: "2026-11-14",
    createdAt: "2026-11-14T21:00:00Z",
  },
  {
    id: "ins-007",
    inspectionNumber: "INS-MP-2026-0044",
    namaKaryawan: "Ahmad Rizky Pratama",
    nikKaryawan: "BDP-2024-089",
    tanggalInspeksi: "2026-11-13",
    lokasiInspeksi: "COAL PAD",
    shift: "SHIFT 1",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    areaName: "Coal Pad & ROM Stockpile MP",
    time: "11:00",
    complianceScore: 88,
    status: "Need Follow Up",
    findingsCount: 1,
    findingsDescription: "Timbunan batubara dekat jalur loader perlu perapihan kemiringan lereng aman.",
    correctiveAction: "Dozing dan penataan slope timbunan oleh dozer produksi.",
    pic: "Foreman Coal Pad",
    targetCompletionDate: "2026-11-14",
    createdAt: "2026-11-13T11:30:00Z",
  },
];

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
    if (typeof window === "undefined") return DEFAULT_INSPECTIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: WorkAreaInspectionItem[] = stored ? JSON.parse(stored) : DEFAULT_INSPECTIONS;
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INSPECTIONS));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newItem;
  },

  update: async (
    id: string,
    data: Partial<WorkAreaInspectionItem>
  ): Promise<WorkAreaInspectionItem> => {
    const all = await workAreaInspectionService.getAll("ALL");
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Inspeksi tidak ditemukan.");

    const updatedItem = { ...all[idx], ...data };
    all[idx] = updatedItem;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
    return updatedItem;
  },

  delete: async (id: string): Promise<boolean> => {
    const all = await workAreaInspectionService.getAll("ALL");
    const filtered = all.filter((i) => i.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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
