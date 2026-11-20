"use client";

export type InspectionAreaCategory =
  | "Workshop"
  | "Hauling Road"
  | "Coal Pad"
  | "Port / Jetty"
  | "Fuel Station"
  | "Mess & Camp"
  | "Office";

export type InspectionStatus = "Compliant" | "Need Follow Up" | "Critical";

export interface InspectionChecklistItem {
  id: string;
  category:
    | "5R & Housekeeping"
    | "Rambu & Barikade"
    | "Akses & Drainase"
    | "Tanggap Darurat"
    | "Kepatuhan APD"
    | "Kelistrikan & Fasilitas";
  itemDescription: string;
  isCompliant: boolean;
  notes?: string;
}

export interface WorkAreaInspectionItem {
  id: string;
  inspectionNumber: string; // e.g. "INS-MP-2026-0038"
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  jobSite: "MuaraPahu" | "Senyiur";
  areaName: string;
  areaCategory: InspectionAreaCategory;
  auditorName: string;
  auditorNrp?: string;
  auditorRole: string; // e.g. "SHE Inspector", "Supervisor Lapangan"
  shift: "Siang" | "Malam";
  complianceScore: number; // 0 - 100 (%)
  status: InspectionStatus;
  findingsCount: number;
  findingsDescription?: string;
  correctiveAction?: string;
  pic?: string;
  targetCompletionDate?: string;
  checklists: InspectionChecklistItem[];
  createdAt: string;
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

const STORAGE_KEY = "bdp_work_area_inspections_v1";

export const DEFAULT_CHECKLIST_TEMPLATES: Omit<InspectionChecklistItem, "id" | "isCompliant" | "notes">[] = [
  {
    category: "5R & Housekeeping",
    itemDescription: "Area kerja bersih dari ceceran oli, sampah B3, dan sisa material kerja.",
  },
  {
    category: "5R & Housekeeping",
    itemDescription: "Peralatan, tools, dan perkakas tersimpan rapi pada tempatnya (tool box / rak penataan).",
  },
  {
    category: "Rambu & Barikade",
    itemDescription: "Rambu K3L, batas kecepatan, dan instruksi keselamatan terpasang jelas dan terbaca.",
  },
  {
    category: "Rambu & Barikade",
    itemDescription: "Barikade, safety cone, atau safety line terpasang pada area berbahaya atau galian.",
  },
  {
    category: "Akses & Drainase",
    itemDescription: "Jalur evakuasi dan koridor kerja bebas rintangan / hambatan pergerakan personel.",
  },
  {
    category: "Akses & Drainase",
    itemDescription: "Tanggul pengaman (bund wall) dan saluran drainase dalam kondisi baik & tidak tergenang lumpur.",
  },
  {
    category: "Tanggap Darurat",
    itemDescription: "APAR (Alat Pemadam Api Ringan) terpasang, tekanan jarum di zona hijau, dan inspeksi berkala valid.",
  },
  {
    category: "Tanggap Darurat",
    itemDescription: "Kotak P3K, Eye Wash Station, dan Spill Kit bahan kimia tersedia serta siap digunakan.",
  },
  {
    category: "Kepatuhan APD",
    itemDescription: "Seluruh personel & mitra kerja di area wajib mengenakan APD standar (Safety Helmet, Vest, Shoes).",
  },
  {
    category: "Kepatuhan APD",
    itemDescription: "Penggunaan APD khusus (kacamata gerinda, earplug, masker debu, body harness) sesuai potensi bahaya.",
  },
  {
    category: "Kelistrikan & Fasilitas",
    itemDescription: "Panel listrik terkunci, berlabel peringatan bahaya, dan bebas dari bahaya percikan air.",
  },
  {
    category: "Kelistrikan & Fasilitas",
    itemDescription: "Penerangan area kerja memadai untuk aktivitas kerja dan kabel instalasi tertata aman.",
  },
];

const DEFAULT_INSPECTIONS: WorkAreaInspectionItem[] = [
  {
    id: "ins-001",
    inspectionNumber: "INS-MP-2026-0048",
    date: "2026-11-19",
    time: "09:30",
    jobSite: "MuaraPahu",
    areaName: "Workshop Hauling Utama MP",
    areaCategory: "Workshop",
    auditorName: "Ahmad Rizky Pratama",
    auditorNrp: "BDP-2024-089",
    auditorRole: "SHE Officer",
    shift: "Siang",
    complianceScore: 92,
    status: "Compliant",
    findingsCount: 1,
    findingsDescription: "Ceceran grease tipis di bay 3 dekat area ganti oli, perlu segera ditabur serbuk gergaji/spill kit.",
    correctiveAction: "Pembersihan seketika oleh mekanik jaga bay 3 dan pemindahan limbah majun ke drum B3.",
    pic: "Foreman Bay 3",
    targetCompletionDate: "2026-11-19",
    checklists: [
      { id: "c1", category: "5R & Housekeeping", itemDescription: "Area kerja bersih dari ceceran oli & sampah", isCompliant: false, notes: "Ada sisa grease di bay 3" },
      { id: "c2", category: "5R & Housekeeping", itemDescription: "Peralatan & tools tersimpan rapi", isCompliant: true },
      { id: "c3", category: "Rambu & Barikade", itemDescription: "Rambu K3L dan instruksi keselamatan jelas", isCompliant: true },
      { id: "c4", category: "Akses & Drainase", itemDescription: "Jalur evakuasi bebas rintangan", isCompliant: true },
      { id: "c5", category: "Tanggap Darurat", itemDescription: "APAR & Spill Kit siap pakai", isCompliant: true },
      { id: "c6", category: "Kepatuhan APD", itemDescription: "Personel memakai APD lengkap", isCompliant: true },
      { id: "c7", category: "Kelistrikan & Fasilitas", itemDescription: "Panel listrik tertutup aman", isCompliant: true },
    ],
    createdAt: "2026-11-19T09:45:00Z",
  },
  {
    id: "ins-002",
    inspectionNumber: "INS-MP-2026-0047",
    date: "2026-11-18",
    time: "14:15",
    jobSite: "MuaraPahu",
    areaName: "Hauling Road KM 12 - KM 18",
    areaCategory: "Hauling Road",
    auditorName: "Budi Santoso",
    auditorNrp: "BDP-2023-014",
    auditorRole: "Pengawas Hauling & Road Maintenance",
    shift: "Siang",
    complianceScore: 86,
    status: "Need Follow Up",
    findingsCount: 2,
    findingsDescription: "Tanggul pengaman (bund wall) di tikungan KM 14.5 turun akibat hujan lebat; rambu batas kecepatan KM 16 kusam.",
    correctiveAction: "Alokasi Grader & Compactor untuk merapikan bund wall; penggantian stiker rambu reflektif oleh tim SHE.",
    pic: "Supervisor Road Maintenance & SHE",
    targetCompletionDate: "2026-11-20",
    checklists: [
      { id: "c1", category: "Akses & Drainase", itemDescription: "Tanggul pengaman bund wall kokoh", isCompliant: false, notes: "Bundwall KM 14.5 perlu direkonstruksi" },
      { id: "c2", category: "Rambu & Barikade", itemDescription: "Rambu kecepatan jelas & terbaca", isCompliant: false, notes: "Rambu KM 16 kusam" },
      { id: "c3", category: "Kepatuhan APD", itemDescription: "Operator unit patuh safety belt & APD", isCompliant: true },
      { id: "c4", category: "Tanggap Darurat", itemDescription: "Kesiapan radio komunikasi darurat", isCompliant: true },
    ],
    createdAt: "2026-11-18T14:40:00Z",
  },
  {
    id: "ins-003",
    inspectionNumber: "INS-SN-2026-0022",
    date: "2026-11-17",
    time: "10:00",
    jobSite: "Senyiur",
    areaName: "Fuel Station & Tangki Solar Senyiur",
    areaCategory: "Fuel Station",
    auditorName: "Dedy Wijaya",
    auditorNrp: "BDP-2024-045",
    auditorRole: "SHE Inspector",
    shift: "Siang",
    complianceScore: 97,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Semua instalasi bund wall tangki, grounding cable, pompa, dan APAR Foam dalam kondisi prima & terinspeksi.",
    correctiveAction: "Pertahankan rutinitas inspeksi harian dan pengecekan grounding earthing rod berkala.",
    pic: "Fuel Station Officer",
    targetCompletionDate: "2026-11-17",
    checklists: [
      { id: "c1", category: "5R & Housekeeping", itemDescription: "Bebas dari tumpahan solar / BBM", isCompliant: true },
      { id: "c2", category: "Tanggap Darurat", itemDescription: "APAR Foam 50kg & Spill Kit prima", isCompliant: true },
      { id: "c3", category: "Rambu & Barikade", itemDescription: "Rambu Dilarang Merokok & Area Terbatas", isCompliant: true },
      { id: "c4", category: "Kelistrikan & Fasilitas", itemDescription: "Grounding rod & instalasi explosion-proof aman", isCompliant: true },
    ],
    createdAt: "2026-11-17T10:30:00Z",
  },
  {
    id: "ins-004",
    inspectionNumber: "INS-MP-2026-0046",
    date: "2026-11-16",
    time: "16:20",
    jobSite: "MuaraPahu",
    areaName: "Coal Stockpile & Jetty Muara Pahu",
    areaCategory: "Port / Jetty",
    auditorName: "Hendra Gunawan",
    auditorNrp: "BDP-2023-098",
    auditorRole: "Jetty Coordinator & Safety",
    shift: "Siang",
    complianceScore: 94,
    status: "Compliant",
    findingsCount: 1,
    findingsDescription: "Ring buoy (pelampung penyelamat) di dermaga 2 tali tambangnya agak kusut.",
    correctiveAction: "Penaatan ulang gulungan tali ring buoy dan pengecekan lampu suar dermaga.",
    pic: "Jetty Master",
    targetCompletionDate: "2026-11-16",
    checklists: [
      { id: "c1", category: "Tanggap Darurat", itemDescription: "Life jacket & Ring buoy dermaga siap", isCompliant: true },
      { id: "c2", category: "5R & Housekeeping", itemDescription: "Kebersihan dermaga dari tumpahan batubara", isCompliant: true },
      { id: "c3", category: "Kepatuhan APD", itemDescription: "Personel di bibir dermaga wajib life jacket", isCompliant: true },
    ],
    createdAt: "2026-11-16T16:50:00Z",
  },
  {
    id: "ins-005",
    inspectionNumber: "INS-SN-2026-0021",
    date: "2026-11-15",
    time: "08:45",
    jobSite: "Senyiur",
    areaName: "Workshop & Fabrikasi Senyiur",
    areaCategory: "Workshop",
    auditorName: "Dedy Wijaya",
    auditorNrp: "BDP-2024-045",
    auditorRole: "SHE Inspector",
    shift: "Siang",
    complianceScore: 89,
    status: "Need Follow Up",
    findingsCount: 1,
    findingsDescription: "Tutup proteksi roda gerinda tangan di area pengelasan terlepas saat digunakan.",
    correctiveAction: "Pemasangan kembali safety guard gerinda dan briefing Stop Work Authority (SWA) kepada teknisi las.",
    pic: "Foreman Fabrikasi",
    targetCompletionDate: "2026-11-15",
    checklists: [
      { id: "c1", category: "Kepatuhan APD", itemDescription: "Pelindung mata / face shield pengelasan", isCompliant: true },
      { id: "c2", category: "Kelistrikan & Fasilitas", itemDescription: "Safety guard peralatan mekanik/gerinda", isCompliant: false, notes: "Guard dilepas oleh teknisi" },
      { id: "c3", category: "Tanggap Darurat", itemDescription: "APAR area fabrikasi siap", isCompliant: true },
    ],
    createdAt: "2026-11-15T09:15:00Z",
  },
  {
    id: "ins-006",
    inspectionNumber: "INS-MP-2026-0045",
    date: "2026-11-14",
    time: "20:30",
    jobSite: "MuaraPahu",
    areaName: "Camp & Mess Karyawan Muara Pahu",
    areaCategory: "Mess & Camp",
    auditorName: "Ahmad Rizky Pratama",
    auditorNrp: "BDP-2024-089",
    auditorRole: "SHE Officer",
    shift: "Malam",
    complianceScore: 98,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Penerangan jalan perimeter camp terang, kotak P3K klinik terisi lengkap, dan sanitasi dapur rapi.",
    correctiveAction: "Pertahankan jadwal pengasapan nyamuk (fogging) dan kebersihan area makan.",
    pic: "Camp & Mess Supervisor",
    targetCompletionDate: "2026-11-14",
    checklists: [
      { id: "c1", category: "5R & Housekeeping", itemDescription: "Kebersihan lingkungan mess & drainase", isCompliant: true },
      { id: "c2", category: "Tanggap Darurat", itemDescription: "Kotak P3K & APAR mess berfungsi", isCompliant: true },
      { id: "c3", category: "Kelistrikan & Fasilitas", itemDescription: "Penerangan malam & instalasi listrik", isCompliant: true },
    ],
    createdAt: "2026-11-14T21:00:00Z",
  },
  {
    id: "ins-007",
    inspectionNumber: "INS-MP-2026-0044",
    date: "2026-11-13",
    time: "11:00",
    jobSite: "MuaraPahu",
    areaName: "Coal Pad & ROM Stockpile MP",
    areaCategory: "Coal Pad",
    auditorName: "Ahmad Rizky Pratama",
    auditorNrp: "BDP-2024-089",
    auditorRole: "SHE Officer",
    shift: "Siang",
    complianceScore: 91,
    status: "Compliant",
    findingsCount: 1,
    findingsDescription: "Titik genangan air kecil di jalur masuk loader ke timbunan batubara saat hujan rintik.",
    correctiveAction: "Dibuatkan alur parit sementara mengarah ke kolam pengendap sedimen.",
    pic: "Stockpile Foreman",
    targetCompletionDate: "2026-11-14",
    checklists: [
      { id: "c1", category: "Akses & Drainase", itemDescription: "Aliran air ke sediment pond lancar", isCompliant: false, notes: "Genangan di jalur loader" },
      { id: "c2", category: "Rambu & Barikade", itemDescription: "Batas aman timbunan & blind spot", isCompliant: true },
      { id: "c3", category: "Kepatuhan APD", itemDescription: "Operator unit loader & dump truck memakai APD", isCompliant: true },
    ],
    createdAt: "2026-11-13T11:30:00Z",
  },
  {
    id: "ins-008",
    inspectionNumber: "INS-SN-2026-0020",
    date: "2026-11-12",
    time: "15:00",
    jobSite: "Senyiur",
    areaName: "Main Office & Safety Center Senyiur",
    areaCategory: "Office",
    auditorName: "Dedy Wijaya",
    auditorNrp: "BDP-2024-045",
    auditorRole: "SHE Inspector",
    shift: "Siang",
    complianceScore: 100,
    status: "Compliant",
    findingsCount: 0,
    findingsDescription: "Area administrasi tertata rapi, jalur evakuasi bebas barang, APAR lengkap, dan papan keselamatan K3 terupdate.",
    correctiveAction: "Pertahankan budaya 5R di seluruh ruang kerja kantor.",
    pic: "General Affair",
    targetCompletionDate: "2026-11-12",
    checklists: [
      { id: "c1", category: "5R & Housekeeping", itemDescription: "Kerapian berkas & meja kerja", isCompliant: true },
      { id: "c2", category: "Akses & Drainase", itemDescription: "Pintu evakuasi darurat tidak terkunci", isCompliant: true },
      { id: "c3", category: "Tanggap Darurat", itemDescription: "APAR & alarm darurat berfungsi", isCompliant: true },
    ],
    createdAt: "2026-11-12T15:20:00Z",
  },
];

export const workAreaInspectionService = {
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
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    const prefix = data.jobSite === "Senyiur" ? "INS-SN" : "INS-MP";
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
