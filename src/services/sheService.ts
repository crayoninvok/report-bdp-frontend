"use client";

export type HazardCategory =
  | "Unsafe Condition"
  | "Unsafe Action"
  | "Environmental"
  | "Near Miss"
  | "Health & Hygiene";

export type HazardRiskLevel = "Critical" | "High" | "Medium" | "Low";

export type HazardStatus = "Open" | "In Progress" | "Closed";

export interface HazardReportItem {
  id: string;
  reportNumber: string;

  // Exact Google Form Fields
  jenisPelaporan?: "KTA" | "TTA";
  namaPelapor?: string;
  nrpPelapor?: string;
  tanggalPelaporan?: string;
  departemenPelapor?: string;
  lokasiBahaya?: string;
  rincianBahaya?: string;
  penanggungJawabArea?: string;
  penanggungJawabAreaLainnya?: string;
  statusGForm?: "OPEN" | "CLOSE";
  project?: "SENYIUR" | "MUARA PAHU";
  jabatanPelapor?: string;
  jabatanPelaporLainnya?: string;
  identifikasiBahaya?: string;
  tindakanPerbaikan?: string;
  dokumentasiSebelum?: string;
  dokumentasiSesudah?: string;

  // General fields for table, dashboard & reports
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  jobSite: "MuaraPahu" | "Senyiur";
  location: string;
  category: HazardCategory;
  riskLevel: HazardRiskLevel;
  title: string;
  description: string;
  immediateAction: string;
  correctiveAction: string;
  reporterName: string;
  reporterDept: string;
  picName: string;
  picDept: string;
  dueDate: string;
  completionDate?: string;
  status: HazardStatus;
  photoUrl?: string; // Cloudinary secure URL (Bukti Temuan)
  photoPublicId?: string;
  evidenceUrl?: string; // Cloudinary secure URL (Bukti Penyelesaian)
  evidencePublicId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SheDashboardData {
  safeManHours: number;
  daysWithoutLti: number;
  ltifr: number;
  trifr: number;
  totalHazards: number;
  openHazards: number;
  inProgressHazards: number;
  closedHazards: number;
  nearMissCount: number;
  resolutionRate: number;
  monthlyTrends: Array<{
    month: string;
    hazards: number;
    resolved: number;
    inspections: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  riskDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  locationDistribution: Array<{
    name: string;
    count: number;
  }>;
}

const STORAGE_KEY = "bdp_she_hazards_v2";

const DEFAULT_HAZARDS: HazardReportItem[] = [
  {
    id: "hz-mp-01",
    reportNumber: "HZ-MP-2026-001",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    date: "2026-11-18",
    time: "09:30",
    tanggalPelaporan: "2026-11-18",
    jenisPelaporan: "KTA",
    namaPelapor: "Rudi Hartono",
    nrpPelapor: "BDP-MP-042",
    departemenPelapor: "PLANT",
    jabatanPelapor: "SR. SUPERVISOR",
    lokasiBahaya: "WORKSHOP",
    location: "WORKSHOP",
    penanggungJawabArea: "PLANT",
    picName: "PLANT",
    picDept: "PLANT",
    identifikasiBahaya: "Sistem pelindung atau Peralatan Pengaman dalam kondisi rusak - KTA",
    title: "Sistem pelindung atau Peralatan Pengaman dalam kondisi rusak - KTA",
    rincianBahaya:
      "Safety guard cover grinding machine di Workshop Bay 2 retak dan kendor, membahayakan mekanik saat proses fabrikasi komponen.",
    description:
      "Safety guard cover grinding machine di Workshop Bay 2 retak dan kendor, membahayakan mekanik saat proses fabrikasi komponen.",
    immediateAction: "Mematikan saklar power alat dan memasang label tag Out of Service.",
    tindakanPerbaikan:
      "Penggantian cover pelindung baru dan pemasangan interlocking safety switch.",
    correctiveAction:
      "Penggantian cover pelindung baru dan pemasangan interlocking safety switch.",
    reporterName: "Rudi Hartono",
    reporterDept: "PLANT",
    dueDate: "2026-11-20",
    statusGForm: "OPEN",
    status: "Open",
    category: "Unsafe Condition",
    riskLevel: "High",
    createdAt: "2026-11-18T09:45:00Z",
    updatedAt: "2026-11-18T10:15:00Z",
  },
  {
    id: "hz-mp-02",
    reportNumber: "HZ-MP-2026-002",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    date: "2026-11-17",
    time: "14:15",
    tanggalPelaporan: "2026-11-17",
    jenisPelaporan: "TTA",
    namaPelapor: "Hendra Wijaya",
    nrpPelapor: "BDP-MP-105",
    departemenPelapor: "HSE",
    jabatanPelapor: "JR. SUPERVISOR",
    lokasiBahaya: "JETTY",
    location: "JETTY",
    penanggungJawabArea: "PRODUKSI",
    picName: "PRODUKSI",
    picDept: "PRODUKSI",
    identifikasiBahaya: "Bekerja di area hopper conveyor tanpa APD keselamatan lengkap - TTA",
    title: "Bekerja di area hopper conveyor tanpa APD keselamatan lengkap - TTA",
    rincianBahaya:
      "Operator transfer conveyor keluar kabin di area Jetty Hopper tanpa mengenakan helm keselamatan dan rompi reflektor.",
    description:
      "Operator transfer conveyor keluar kabin di area Jetty Hopper tanpa mengenakan helm keselamatan dan rompi reflektor.",
    immediateAction:
      "Teguran lisan langsung dan meminta operator segera memakai helm dan rompi standar.",
    tindakanPerbaikan:
      "Sosialisasi ulang mandatory APD di safety briefing P5M shift pagi dan pengawasan berkala pengawas area.",
    correctiveAction:
      "Sosialisasi ulang mandatory APD di safety briefing P5M shift pagi dan pengawasan berkala pengawas area.",
    reporterName: "Hendra Wijaya",
    reporterDept: "HSE",
    dueDate: "2026-11-17",
    completionDate: "2026-11-17",
    statusGForm: "CLOSE",
    status: "Closed",
    category: "Unsafe Action",
    riskLevel: "Medium",
    createdAt: "2026-11-17T14:30:00Z",
    updatedAt: "2026-11-17T16:00:00Z",
  },
  {
    id: "hz-mp-03",
    reportNumber: "HZ-MP-2026-003",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    date: "2026-11-16",
    time: "11:00",
    tanggalPelaporan: "2026-11-16",
    jenisPelaporan: "KTA",
    namaPelapor: "Fajar Nugraha",
    nrpPelapor: "BDP-MP-078",
    departemenPelapor: "LOGISTIK",
    jabatanPelapor: "WORKER",
    lokasiBahaya: "OIL TRAP",
    location: "OIL TRAP",
    penanggungJawabArea: "HSE",
    picName: "HSE",
    picDept: "HSE",
    identifikasiBahaya: "Kondisi area kerja tidak memadai - KTA",
    title: "Kondisi area kerja tidak memadai - KTA",
    rincianBahaya:
      "Penumpukan endapan oil sludge di kompartemen kedua oil trap melebihi batas 20 cm, berisiko meluap ke parit saat hujan deras.",
    description:
      "Penumpukan endapan oil sludge di kompartemen kedua oil trap melebihi batas 20 cm, berisiko meluap ke parit saat hujan deras.",
    immediateAction:
      "Pembersihan manual lapisan minyak permukaan dan pemasangan oil absorbent boom darurat.",
    tindakanPerbaikan:
      "Penyedotan limbah B3 oleh unit vacuum truck dan pembersihan berkala skimmer oil trap per dua minggu.",
    correctiveAction:
      "Penyedotan limbah B3 oleh unit vacuum truck dan pembersihan berkala skimmer oil trap per dua minggu.",
    reporterName: "Fajar Nugraha",
    reporterDept: "LOGISTIK",
    dueDate: "2026-11-18",
    completionDate: "2026-11-17",
    statusGForm: "CLOSE",
    status: "Closed",
    category: "Environmental",
    riskLevel: "Medium",
    createdAt: "2026-11-16T11:15:00Z",
    updatedAt: "2026-11-17T09:00:00Z",
  },
  {
    id: "hz-mp-04",
    reportNumber: "HZ-MP-2026-004",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    date: "2026-11-15",
    time: "08:10",
    tanggalPelaporan: "2026-11-15",
    jenisPelaporan: "KTA",
    namaPelapor: "Agus Pratama",
    nrpPelapor: "BDP-MP-019",
    departemenPelapor: "LOGISTIK",
    jabatanPelapor: "SUPERINTENDENT",
    lokasiBahaya: "FUEL STATION",
    location: "FUEL STATION",
    penanggungJawabArea: "PLANT",
    picName: "PLANT",
    picDept: "PLANT",
    identifikasiBahaya: "Kegagalam mekanisme sistem yang digerakkan dengan energi listrik - KTA",
    title: "Kegagalam mekanisme sistem yang digerakkan dengan energi listrik - KTA",
    rincianBahaya:
      "Inspeksi menemukan kabel static grounding clamp pada nozzle dispenser pompa solar solar terkelupas dan kendor. Berbahaya memicu percikan listrik statis.",
    description:
      "Inspeksi menemukan kabel static grounding clamp pada nozzle dispenser pompa solar solar terkelupas dan kendor. Berbahaya memicu percikan listrik statis.",
    immediateAction: "Penghentian sementara pengisian bahan bakar di pompa nozzle terkait.",
    tindakanPerbaikan:
      "Penggantian clamp kabel grounding baru dan pengetesan nilai resistansi ohm grounding di bawah 5 ohm.",
    correctiveAction:
      "Penggantian clamp kabel grounding baru dan pengetesan nilai resistansi ohm grounding di bawah 5 ohm.",
    reporterName: "Agus Pratama",
    reporterDept: "LOGISTIK",
    dueDate: "2026-11-15",
    completionDate: "2026-11-15",
    statusGForm: "CLOSE",
    status: "Closed",
    category: "Unsafe Condition",
    riskLevel: "Critical",
    createdAt: "2026-11-15T08:20:00Z",
    updatedAt: "2026-11-15T13:45:00Z",
  },
  {
    id: "hz-mp-05",
    reportNumber: "HZ-MP-2026-005",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    date: "2026-11-19",
    time: "07:20",
    tanggalPelaporan: "2026-11-19",
    jenisPelaporan: "KTA",
    namaPelapor: "Darmawan",
    nrpPelapor: "BDP-MP-112",
    departemenPelapor: "PRODUKSI",
    jabatanPelapor: "JR. SUPERVISOR",
    lokasiBahaya: "COAL PAD",
    location: "COAL PAD",
    penanggungJawabArea: "INFRAS",
    picName: "INFRAS",
    picDept: "INFRAS",
    identifikasiBahaya:
      "Lingkungan Kerja yang tidak sesuai dengan standart (Ex: Pencahayaan, Kebisingan, Suhu, Getaran, etc) - KTA",
    title:
      "Lingkungan Kerja yang tidak sesuai dengan standart (Ex: Pencahayaan, Kebisingan, Suhu, Getaran, etc) - KTA",
    rincianBahaya:
      "Tower lamp penerangan utama di sisi timur Coal Pad padam saat shift malam, menimbulkan blind spot berbahaya bagi manuver wheel loader dan dump truck.",
    description:
      "Tower lamp penerangan utama di sisi timur Coal Pad padam saat shift malam, menimbulkan blind spot berbahaya bagi manuver wheel loader dan dump truck.",
    immediateAction:
      "Pemasangan rambu mata kucing portabel dan peringatan via radio channel operasional.",
    tindakanPerbaikan:
      "Perbaikan genset generator tower lamp dan penambahan cadangan unit mobile lamp.",
    correctiveAction:
      "Perbaikan genset generator tower lamp dan penambahan cadangan unit mobile lamp.",
    reporterName: "Darmawan",
    reporterDept: "PRODUKSI",
    dueDate: "2026-11-21",
    statusGForm: "OPEN",
    status: "Open",
    category: "Unsafe Condition",
    riskLevel: "High",
    createdAt: "2026-11-19T07:35:00Z",
    updatedAt: "2026-11-19T07:35:00Z",
  },
  {
    id: "hz-mp-06",
    reportNumber: "HZ-MP-2026-006",
    project: "MUARA PAHU",
    jobSite: "MuaraPahu",
    date: "2026-11-14",
    time: "16:40",
    tanggalPelaporan: "2026-11-14",
    jenisPelaporan: "KTA",
    namaPelapor: "Budi Santoso",
    nrpPelapor: "BDP-MP-088",
    departemenPelapor: "PLANT",
    jabatanPelapor: "WORKER",
    lokasiBahaya: "TPS LB3",
    location: "TPS LB3",
    penanggungJawabArea: "HSE",
    picName: "HSE",
    picDept: "HSE",
    identifikasiBahaya: "Sistem tanda peringatan keselamatan tidak memadai - KTA",
    title: "Sistem tanda peringatan keselamatan tidak memadai - KTA",
    rincianBahaya:
      "Simbol label B3 pada drum oli bekas di rak penyimpanan TPS LB3 pudar dan lembar MSDS terlepas dari papan informasi.",
    description:
      "Simbol label B3 pada drum oli bekas di rak penyimpanan TPS LB3 pudar dan lembar MSDS terlepas dari papan informasi.",
    immediateAction: "Identifikasi drum oli bekas dengan spidol cat tahan air sementara.",
    tindakanPerbaikan:
      "Pemasangan label B3 standar tahan cuaca dan laminasi dokumen MSDS di pintu TPS LB3.",
    correctiveAction:
      "Pemasangan label B3 standar tahan cuaca dan laminasi dokumen MSDS di pintu TPS LB3.",
    reporterName: "Budi Santoso",
    reporterDept: "PLANT",
    dueDate: "2026-11-16",
    completionDate: "2026-11-15",
    statusGForm: "CLOSE",
    status: "Closed",
    category: "Environmental",
    riskLevel: "Low",
    createdAt: "2026-11-14T17:00:00Z",
    updatedAt: "2026-11-15T11:00:00Z",
  },
  // Site Senyiur
  {
    id: "hz-sy-01",
    reportNumber: "HZ-SY-2026-001",
    project: "SENYIUR",
    jobSite: "Senyiur",
    date: "2026-11-18",
    time: "10:00",
    tanggalPelaporan: "2026-11-18",
    jenisPelaporan: "KTA",
    namaPelapor: "Bayu Permana",
    nrpPelapor: "BDP-SY-023",
    departemenPelapor: "HSE",
    jabatanPelapor: "SR. SUPERVISOR",
    lokasiBahaya: "WTP",
    location: "WTP",
    penanggungJawabArea: "INFRAS",
    picName: "INFRAS",
    picDept: "INFRAS",
    identifikasiBahaya: "Kondisi area kerja tergenang air dan becek - KTA",
    title: "Kondisi area kerja tergenang air dan becek - KTA",
    rincianBahaya:
      "Limpasan air filtrasi WTP menggenangi area pompa transfer kimia, lantai licin dan belum ada grating penutup saluran pembuangan.",
    description:
      "Limpasan air filtrasi WTP menggenangi area pompa transfer kimia, lantai licin dan belum ada grating penutup saluran pembuangan.",
    immediateAction:
      "Penyedotan genangan dengan submersible pump dan pemasangan barikade pita kuning.",
    tindakanPerbaikan:
      "Perbaikan pipa saluran pembuangan backwash dan pemasangan grating galvanis anti selip.",
    correctiveAction:
      "Perbaikan pipa saluran pembuangan backwash dan pemasangan grating galvanis anti selip.",
    reporterName: "Bayu Permana",
    reporterDept: "HSE",
    dueDate: "2026-11-22",
    statusGForm: "OPEN",
    status: "Open",
    category: "Unsafe Condition",
    riskLevel: "Medium",
    createdAt: "2026-11-18T10:30:00Z",
    updatedAt: "2026-11-18T11:00:00Z",
  },
  {
    id: "hz-sy-02",
    reportNumber: "HZ-SY-2026-002",
    project: "SENYIUR",
    jobSite: "Senyiur",
    date: "2026-11-16",
    time: "15:20",
    tanggalPelaporan: "2026-11-16",
    jenisPelaporan: "KTA",
    namaPelapor: "Eko Prasetyo",
    nrpPelapor: "BDP-SY-054",
    departemenPelapor: "PLANT",
    jabatanPelapor: "WORKER",
    lokasiBahaya: "WORKSHOP",
    location: "WORKSHOP",
    penanggungJawabArea: "HSE",
    picName: "HSE",
    picDept: "HSE",
    identifikasiBahaya: "Peralatan Keselamatan dalam kondisi rusak - KTA",
    title: "Peralatan Keselamatan dalam kondisi rusak - KTA",
    rincianBahaya:
      "Braket tabung pemadam api (APAR Powder 6 kg) di workshop patah dan pin pengunci segel terlepas.",
    description:
      "Braket tabung pemadam api (APAR Powder 6 kg) di workshop patah dan pin pengunci segel terlepas.",
    immediateAction:
      "Mengamankan tabung ke dudukan lantai darurat dan pemeriksaan tekanan jarum indikator.",
    tindakanPerbaikan:
      "Pemasangan braket dinding baru dan re-sealing pin pengaman APAR sesuai standar inspeksi.",
    correctiveAction:
      "Pemasangan braket dinding baru dan re-sealing pin pengaman APAR sesuai standar inspeksi.",
    reporterName: "Eko Prasetyo",
    reporterDept: "PLANT",
    dueDate: "2026-11-17",
    completionDate: "2026-11-17",
    statusGForm: "CLOSE",
    status: "Closed",
    category: "Unsafe Condition",
    riskLevel: "Low",
    createdAt: "2026-11-16T15:40:00Z",
    updatedAt: "2026-11-17T10:00:00Z",
  },
  {
    id: "hz-sy-03",
    reportNumber: "HZ-SY-2026-003",
    project: "SENYIUR",
    jobSite: "Senyiur",
    date: "2026-11-15",
    time: "13:10",
    tanggalPelaporan: "2026-11-15",
    jenisPelaporan: "TTA",
    namaPelapor: "Iwan Setiawan",
    nrpPelapor: "BDP-SY-011",
    departemenPelapor: "PRODUKSI",
    jabatanPelapor: "SUPERINTENDENT",
    lokasiBahaya: "CHR",
    location: "CHR",
    penanggungJawabArea: "PRODUKSI",
    picName: "PRODUKSI",
    picDept: "PRODUKSI",
    identifikasiBahaya: "Bekerja tidak sesuai prosedur operasional standar (SOP / JSA) - TTA",
    title: "Bekerja tidak sesuai SOP di area crushing plant - TTA",
    rincianBahaya:
      "Kendaraan sarana LV melintas tepat di blind spot manuver Wheel Loader tanpa memberi jarak aman 30 meter dan tidak melakukan kontak radio.",
    description:
      "Kendaraan sarana LV melintas tepat di blind spot manuver Wheel Loader tanpa memberi jarak aman 30 meter dan tidak melakukan kontak radio.",
    immediateAction:
      "Driver loader membunyikan klakson panjang dan menghentikan unit seketika. Tidak terjadi insiden.",
    tindakanPerbaikan:
      "Safety coaching langsung kepada driver LV dan penegasan aturan radio channel di area aktif Coal Crushing Plant.",
    correctiveAction:
      "Safety coaching langsung kepada driver LV dan penegasan aturan radio channel di area aktif Coal Crushing Plant.",
    reporterName: "Iwan Setiawan",
    reporterDept: "PRODUKSI",
    dueDate: "2026-11-16",
    completionDate: "2026-11-16",
    statusGForm: "CLOSE",
    status: "Closed",
    category: "Unsafe Action",
    riskLevel: "Critical",
    createdAt: "2026-11-15T13:30:00Z",
    updatedAt: "2026-11-16T08:00:00Z",
  },
];

export interface SheFormSettings {
  isOpen: boolean;
  closedMessage: string;
  updatedAt: string;
}

const FORM_SETTINGS_KEY = "bdp_she_form_settings_v1";

const DEFAULT_FORM_SETTINGS: SheFormSettings = {
  isOpen: true,
  closedMessage:
    "Formulir Pelaporan Bahaya (Hazard Report) saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada. Silakan hubungi Safety Officer atau pengawas area untuk pelaporan langsung.",
  updatedAt: new Date().toISOString(),
};

export const sheService = {
  getFormSettings: (): SheFormSettings => {
    if (typeof window === "undefined") return DEFAULT_FORM_SETTINGS;
    const stored = localStorage.getItem(FORM_SETTINGS_KEY);
    if (!stored) return DEFAULT_FORM_SETTINGS;
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_FORM_SETTINGS;
    }
  },

  updateFormSettings: (updates: Partial<SheFormSettings>): SheFormSettings => {
    const current = sheService.getFormSettings();
    const next: SheFormSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(FORM_SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("bdp-she-form-settings-changed"));
    }
    return next;
  },
  getHazards: async (site?: "MuaraPahu" | "Senyiur" | "ALL"): Promise<HazardReportItem[]> => {
    try {
      if (typeof window === "undefined") return DEFAULT_HAZARDS;
      const raw = localStorage.getItem(STORAGE_KEY);
      let list: HazardReportItem[] = raw ? JSON.parse(raw) : DEFAULT_HAZARDS;
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HAZARDS));
      } else {
        // Ensure all Google Form fields exist on every item
        list = list.map((h) => ({
          ...h,
          jenisPelaporan: h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA"),
          lokasiBahaya: h.lokasiBahaya || h.location || "WORKSHOP",
          identifikasiBahaya: h.identifikasiBahaya || h.title || "Kondisi area kerja tidak memadai - KTA",
          rincianBahaya: h.rincianBahaya || h.description || "",
          departemenPelapor: h.departemenPelapor || h.reporterDept || "PLANT",
          penanggungJawabArea: h.penanggungJawabArea || h.picDept || h.picName || "PLANT",
          statusGForm: h.statusGForm || (h.status === "Closed" ? "CLOSE" : "OPEN"),
          project: h.project || (h.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"),
          tindakanPerbaikan: h.tindakanPerbaikan || h.correctiveAction || "",
        }));
      }
      if (site && site !== "ALL") {
        list = list.filter((h) => {
          const s =
            h.project === "SENYIUR"
              ? "Senyiur"
              : h.project === "MUARA PAHU"
              ? "MuaraPahu"
              : h.jobSite;
          return s === site;
        });
      }
      return list;
    } catch {
      return DEFAULT_HAZARDS;
    }
  },

  createHazard: async (
    data: Omit<HazardReportItem, "id" | "reportNumber" | "createdAt" | "updatedAt">
  ): Promise<HazardReportItem> => {
    const list = await sheService.getHazards("ALL");
    const sitePrefix = data.jobSite === "MuaraPahu" ? "MP" : "SY";
    const year = new Date().getFullYear();
    const count = list.filter((i) => i.jobSite === data.jobSite).length + 1;
    const reportNumber = `HZ-${sitePrefix}-${year}-${String(count).padStart(3, "0")}`;
    const now = new Date().toISOString();

    const newItem: HazardReportItem = {
      ...data,
      id: `hz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reportNumber,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newItem, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newItem;
  },

  updateHazard: async (
    id: string,
    updates: Partial<HazardReportItem>
  ): Promise<HazardReportItem> => {
    const list = await sheService.getHazards("ALL");
    const idx = list.findIndex((h) => h.id === id);
    if (idx === -1) {
      throw new Error("Data hazard report tidak ditemukan");
    }

    const updatedItem: HazardReportItem = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updatedItem;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return updatedItem;
  },

  deleteHazard: async (id: string): Promise<boolean> => {
    const list = await sheService.getHazards("ALL");
    const filtered = list.filter((h) => h.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getDashboardData: async (
    site: "MuaraPahu" | "Senyiur" | "ALL" = "ALL"
  ): Promise<SheDashboardData> => {
    const hazards = await sheService.getHazards(site);

    const totalHazards = hazards.length;
    const openHazards = hazards.filter((h) => h.status === "Open").length;
    const inProgressHazards = hazards.filter((h) => h.status === "In Progress").length;
    const closedHazards = hazards.filter((h) => h.status === "Closed").length;
    const nearMissCount = hazards.filter((h) => h.category === "Near Miss").length;
    const resolutionRate =
      totalHazards > 0 ? Math.round((closedHazards / totalHazards) * 100) : 100;

    // Monthly trends calculation
    const monthlyTrends = [
      { month: "Jun 26", hazards: 14, resolved: 14, inspections: 8 },
      { month: "Jul 26", hazards: 18, resolved: 17, inspections: 10 },
      { month: "Agu 26", hazards: 16, resolved: 16, inspections: 9 },
      { month: "Sep 26", hazards: 22, resolved: 20, inspections: 12 },
      { month: "Okt 26", hazards: 19, resolved: 18, inspections: 11 },
      { month: "Nov 26", hazards: totalHazards, resolved: closedHazards, inspections: 14 },
    ];

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    for (const h of hazards) {
      categoryCounts[h.category] = (categoryCounts[h.category] || 0) + 1;
    }

    const categoryColors: Record<string, string> = {
      "Unsafe Condition": "#e95623",
      "Unsafe Action": "#f59e0b",
      Environmental: "#10b981",
      "Near Miss": "#ef4444",
      "Health & Hygiene": "#6366f1",
    };

    const categoryDistribution = Object.keys(categoryCounts).map((cat) => ({
      name: cat,
      value: categoryCounts[cat],
      color: categoryColors[cat] || "#64748b",
    }));

    // Risk distribution
    const riskCounts: Record<string, number> = {
      Critical: hazards.filter((h) => h.riskLevel === "Critical").length,
      High: hazards.filter((h) => h.riskLevel === "High").length,
      Medium: hazards.filter((h) => h.riskLevel === "Medium").length,
      Low: hazards.filter((h) => h.riskLevel === "Low").length,
    };

    const riskColors: Record<string, string> = {
      Critical: "#dc2626",
      High: "#ea580c",
      Medium: "#f59e0b",
      Low: "#10b981",
    };

    const riskDistribution = Object.keys(riskCounts).map((rk) => ({
      name: rk,
      value: riskCounts[rk],
      color: riskColors[rk],
    }));

    // Location distribution top 5
    const locMap: Record<string, number> = {};
    for (const h of hazards) {
      const locPrefix = h.location.split(" KM ")[0] || h.location;
      locMap[locPrefix] = (locMap[locPrefix] || 0) + 1;
    }
    const locationDistribution = Object.entries(locMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Site specific baseline numbers
    const safeManHours =
      site === "Senyiur" ? 420800 : site === "MuaraPahu" ? 1285400 : 1706200;
    const daysWithoutLti = site === "Senyiur" ? 512 : site === "MuaraPahu" ? 435 : 435;

    return {
      safeManHours,
      daysWithoutLti,
      ltifr: 0.0,
      trifr: 0.0,
      totalHazards,
      openHazards,
      inProgressHazards,
      closedHazards,
      nearMissCount,
      resolutionRate,
      monthlyTrends,
      categoryDistribution,
      riskDistribution,
      locationDistribution,
    };
  },

  resetToDefault: async (): Promise<void> => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HAZARDS));
    }
  },
};
