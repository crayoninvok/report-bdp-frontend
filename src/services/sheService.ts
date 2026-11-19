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

const STORAGE_KEY = "bdp_she_hazards_v1";

const DEFAULT_HAZARDS: HazardReportItem[] = [
  {
    id: "hz-mp-01",
    reportNumber: "HZ-MP-2026-001",
    date: "2026-11-18",
    time: "09:30",
    jobSite: "MuaraPahu",
    location: "Hauling Road KM 12+400",
    category: "Unsafe Condition",
    riskLevel: "High",
    title: "Permukaan Jalan Ambles di Tikungan Hauling",
    description:
      "Terdapat penurunan badan jalan (ambles) sedalam 15 cm di jalur kiri tikungan KM 12. Berpotensi menyebabkan trailer oleng saat muatan penuh.",
    immediateAction: "Pemasangan traffic cone & pita barikade peringatan bahaya.",
    correctiveAction:
      "Penimbunan material agregat dan perataan menggunakan motor grader & compactor.",
    reporterName: "Rudi Hartono",
    reporterDept: "Road Maintenance",
    picName: "Bambang Sutrisno",
    picDept: "Civil & Infrastructure",
    dueDate: "2026-11-20",
    status: "In Progress",
    createdAt: "2026-11-18T09:45:00Z",
    updatedAt: "2026-11-18T10:15:00Z",
  },
  {
    id: "hz-mp-02",
    reportNumber: "HZ-MP-2026-002",
    date: "2026-11-17",
    time: "14:15",
    jobSite: "MuaraPahu",
    location: "Stockpile Jetty 2",
    category: "Unsafe Action",
    riskLevel: "Medium",
    title: "Driver DT Beroperasi Tanpa Safety Helmet di Area Dumping",
    description:
      "Driver keluar kabin memeriksa tailgate di area aktif hopper conveyor tanpa mengenakan helm keselamatan dan rompi reflektor.",
    immediateAction:
      "Teguran lisan langsung dan meminta driver kembali memakai APD standar.",
    correctiveAction:
      "Sosialisasi ulang mandatory APD di safety briefing P5M shift pagi.",
    reporterName: "Hendra Wijaya",
    reporterDept: "HSE Patrol",
    picName: "Arif Kurniawan",
    picDept: "Hauling Operations",
    dueDate: "2026-11-17",
    completionDate: "2026-11-17",
    status: "Closed",
    createdAt: "2026-11-17T14:30:00Z",
    updatedAt: "2026-11-17T16:00:00Z",
  },
  {
    id: "hz-mp-03",
    reportNumber: "HZ-MP-2026-003",
    date: "2026-11-16",
    time: "11:00",
    jobSite: "MuaraPahu",
    location: "Main Workshop Bay 3",
    category: "Environmental",
    riskLevel: "Medium",
    title: "Tetesan Oli Mesin Dekat Saluran Air Hujan Workshop",
    description:
      "Ditemukan kebocoran oli hidrolik dari drum penampung tanpa secondary containment yang berjarak 2 meter dari selokan terbuka.",
    immediateAction:
      "Pembersihan menggunakan serbuk gergaji dan pemasangan oil spill containment.",
    correctiveAction:
      "Penggantian drum penampung berstandar drum spill pallet anti tumpah.",
    reporterName: "Fajar Nugraha",
    reporterDept: "Plant Maintenance",
    picName: "Dedi Prasetyo",
    picDept: "Workshop Maintenance",
    dueDate: "2026-11-18",
    completionDate: "2026-11-17",
    status: "Closed",
    createdAt: "2026-11-16T11:15:00Z",
    updatedAt: "2026-11-17T09:00:00Z",
  },
  {
    id: "hz-mp-04",
    reportNumber: "HZ-MP-2026-004",
    date: "2026-11-15",
    time: "08:10",
    jobSite: "MuaraPahu",
    location: "Fuel Station Pompa 1",
    category: "Unsafe Condition",
    riskLevel: "Critical",
    title: "Kabel Grounding Nozzle Fuel Storage Terkelupas",
    description:
      "Inspeksi menemukan kabel static grounding clamp pada jalur pengisian tangki solar terkelupas dan kendor. Berbahaya memicu percikan listrik statis.",
    immediateAction:
      "Penghentian sementara pengisian bahan bakar di pompa nozzle terkait.",
    correctiveAction:
      "Penggantian clamp kabel grounding baru dan pengetesan nilai resistansi ohm grounding.",
    reporterName: "Agus Pratama",
    reporterDept: "Fuel Management",
    picName: "Lukman Hakim",
    picDept: "Electrical & Instrumentation",
    dueDate: "2026-11-15",
    completionDate: "2026-11-15",
    status: "Closed",
    createdAt: "2026-11-15T08:20:00Z",
    updatedAt: "2026-11-15T13:45:00Z",
  },
  {
    id: "hz-mp-05",
    reportNumber: "HZ-MP-2026-005",
    date: "2026-11-19",
    time: "07:20",
    jobSite: "MuaraPahu",
    location: "Intersection Simpang Hauling KM 4",
    category: "Unsafe Condition",
    riskLevel: "High",
    title: "Lampu Penerangan Tower (Tower Lamp) Padam di Persimpangan",
    description:
      "Tower lamp penerangan utama mati saat shift malam hingga subuh di blind spot persimpangan truk hauling dan kendaraan LV.",
    immediateAction:
      "Pemasangan rambu mata kucing portabel dan peringatan via radio channel operasional.",
    correctiveAction:
      "Perbaikan genset generator tower lamp dan penambahan cadangan unit mobile lamp.",
    reporterName: "Darmawan",
    reporterDept: "Safety Patrol",
    picName: "Bambang Sutrisno",
    picDept: "Electrical Team",
    dueDate: "2026-11-21",
    status: "Open",
    createdAt: "2026-11-19T07:35:00Z",
    updatedAt: "2026-11-19T07:35:00Z",
  },
  {
    id: "hz-mp-06",
    reportNumber: "HZ-MP-2026-006",
    date: "2026-11-14",
    time: "16:40",
    jobSite: "MuaraPahu",
    location: "Camp Mess Batara",
    category: "Health & Hygiene",
    riskLevel: "Low",
    title: "Saluran Drainase Dapur Mess Tersumbat Limbah Lemak",
    description:
      "Penumpukan sisa minyak memasak pada grease trap dapur mess karyawan menimbulkan aroma tidak sedap dan genangan air.",
    immediateAction:
      "Pembersihan manual grease trap dan penyiraman cairan pengurai lemak.",
    correctiveAction:
      "Pemberian jadwal berkala pembersihan grease trap 2 hari sekali oleh tim vendor katering.",
    reporterName: "Siti Rahayu",
    reporterDept: "General Affairs",
    picName: "Wawan Hermawan",
    picDept: "Camp Management",
    dueDate: "2026-11-16",
    completionDate: "2026-11-15",
    status: "Closed",
    createdAt: "2026-11-14T17:00:00Z",
    updatedAt: "2026-11-15T11:00:00Z",
  },
  // Site Senyiur
  {
    id: "hz-sy-01",
    reportNumber: "HZ-SY-2026-001",
    date: "2026-11-18",
    time: "10:00",
    jobSite: "Senyiur",
    location: "Hauling Road Senyiur KM 6",
    category: "Environmental",
    riskLevel: "Medium",
    title: "Sedimentasi Lumpur Masuk ke Saluran Air Alami",
    description:
      "Hujan lebat menyebabkan limpasan lumpur melewati silt trap dan mencemari parit batas perkebunan warga.",
    immediateAction:
      "Pemasangan sandbag darurat dan penambahan sediment fence di titik aliran air.",
    correctiveAction:
      "Pengerukan sediment pond menggunakan excavator mini dan penanaman rumput vetiver penahan erosi.",
    reporterName: "Bayu Permana",
    reporterDept: "Environmental HSE",
    picName: "Dimas Anggara",
    picDept: "Civil Engineering",
    dueDate: "2026-11-22",
    status: "In Progress",
    createdAt: "2026-11-18T10:30:00Z",
    updatedAt: "2026-11-18T11:00:00Z",
  },
  {
    id: "hz-sy-02",
    reportNumber: "HZ-SY-2026-002",
    date: "2026-11-16",
    time: "15:20",
    jobSite: "Senyiur",
    location: "Workshop Senyiur",
    category: "Unsafe Condition",
    riskLevel: "Low",
    title: "Gantungan APAR Rusak & Kartu Inspeksi Kadaluarsa",
    description:
      "Braket tabung pemadam api (APAR 6 kg) di pintu workshop terlepas dan kartu tag inspeksi bulanan belum diperbarui.",
    immediateAction:
      "Mengamankan tabung ke dudukan lantai darurat dan pemeriksaan tekanan jarum indikator.",
    correctiveAction:
      "Pemasangan braket dinding baru dan pelaksanaan inspeksi berkala seluruh APAR di area workshop.",
    reporterName: "Eko Prasetyo",
    reporterDept: "Plant Senyiur",
    picName: "Bayu Permana",
    picDept: "HSE Senyiur",
    dueDate: "2026-11-17",
    completionDate: "2026-11-17",
    status: "Closed",
    createdAt: "2026-11-16T15:40:00Z",
    updatedAt: "2026-11-17T10:00:00Z",
  },
  {
    id: "hz-sy-03",
    reportNumber: "HZ-SY-2026-003",
    date: "2026-11-15",
    time: "13:10",
    jobSite: "Senyiur",
    location: "Stockpile Senyiur KM 0",
    category: "Near Miss",
    riskLevel: "Critical",
    title: "Hampir Tabrakan LV dengan Loader Saat Mundur di Stockpile",
    description:
      "Kendaraan sarana LV melintas tepat di blind spot belakang Wheel Loader yang sedang mundur bermanuver. Alarm mundur loader bunyi namun LV tidak memberi jarak aman 30 meter.",
    immediateAction:
      "Driver loader membunyikan klakson panjang dan menghentikan unit seketika. Tidak ada kontak fisik.",
    correctiveAction:
      "Safety stand-down bagi seluruh pengemudi LV mengenai zona aman blind spot alat berat dan kewajiban kontak radio.",
    reporterName: "Iwan Setiawan",
    reporterDept: "Operations",
    picName: "Bayu Permana",
    picDept: "HSE Senyiur",
    dueDate: "2026-11-16",
    completionDate: "2026-11-16",
    status: "Closed",
    createdAt: "2026-11-15T13:30:00Z",
    updatedAt: "2026-11-16T08:00:00Z",
  },
];

export const sheService = {
  getHazards: async (site?: "MuaraPahu" | "Senyiur" | "ALL"): Promise<HazardReportItem[]> => {
    try {
      if (typeof window === "undefined") return DEFAULT_HAZARDS;
      const raw = localStorage.getItem(STORAGE_KEY);
      let list: HazardReportItem[] = raw ? JSON.parse(raw) : DEFAULT_HAZARDS;
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HAZARDS));
      }
      if (site && site !== "ALL") {
        list = list.filter((h) => h.jobSite === site);
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
