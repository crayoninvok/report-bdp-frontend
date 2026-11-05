import { API_BASE_URL } from "./apiConfig";

export interface MasterManpowerItem {
  id: string;
  employeeId: string;
  fullName: string;
  statusKeaktifan: string; // Exist / Exit
  barcode?: string | null;
  organization?: string | null;
  jobPosition?: string | null;
  jobLevel?: string | null;
  joinDate?: string | null;
  resignDate?: string | null;
  statusEmployee?: string | null; // Contract / Permanent
  endDate?: string | null;
  signDate?: string | null;
  email?: string | null;
  birthDate?: string | null;
  age?: string | null;
  birthPlace?: string | null;
  citizenIdAddress?: string | null;
  residentialAddress?: string | null;
  npwp?: string | null;
  ptkpStatus?: string | null;
  employeeTaxStatus?: string | null;
  taxConfig?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankAccountHolder?: string | null;
  bpjsKetenagakerjaan?: string | null;
  bpjsKesehatan?: string | null;
  nik?: string | null;
  mobilePhone?: string | null;
  phone?: string | null;
  branchName?: string | null;
  parentBranchName?: string | null;
  religion?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  bloodType?: string | null;
  nationalityCode?: string | null;
  currency?: string | null;
  lengthOfService?: string | null;
  paymentSchedule?: string | null;
  approvalLine?: string | null;
  manager?: string | null;
  grade?: string | null;
  className?: string | null;
  profilePicture?: string | null;
  costCenter?: string | null;
  costCenterCategory?: string | null;
  sbu?: string | null;
  pointOfHire?: string | null;
  tinggiBadan?: string | null;
  beratBadan?: string | null;
  ukuranBaju?: string | null;
  ukuranCelana?: string | null;
  warnaHelm?: string | null;
  safetyShoes?: string | null;
  tglTerakhirMcu?: string | null;
  followUpMcu?: string | null;
  trainingInternal?: string | null;
  trainingExternal?: string | null;
  sertifikasi?: string | null;
  namaIbuKandung?: string | null;
  pendidikan?: string | null;
  jurusan?: string | null;
  kota?: string | null;
  provinsi?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManpowerStats {
  totalAll: number;
  totalExist: number;
  totalExit: number;
  byBranch: { name: string; total: number; exist: number; exit: number }[];
  byOrganization: { name: string; count: number }[];
  byStatusEmployee: { name: string; count: number }[];
  byPOH: { name: string; count: number }[];
  lastSync: string | null;
}

export interface ManpowerListParams {
  search?: string;
  statusKeaktifan?: string;
  branchName?: string;
  organization?: string;
  statusEmployee?: string;
  pointOfHire?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ManpowerListResponse {
  success: boolean;
  data: MasterManpowerItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

export interface ManpowerSyncResponse {
  success: boolean;
  message: string;
  total: number;
  inserted: number;
  updated: number;
  lastSync: string;
  errors?: string[];
}


export interface HRDashboardKPI {
  totalKaryawan: number;
  karyawanAktif: number;
  karyawanResign: number;
  turnoverRate: number;
  pctLokal: number;
  pctNonLokal: number;
  tingkatRetensi: number;
}

export interface StatusKetenagakerjaanRow {
  status: string;
  aktif: number;
  resign: number;
  total: number;
}

export interface DemografiItem {
  label: string;
  count: number;
  ratio: number;
  color?: string;
}

export interface DepartemenRow {
  name: string;
  aktif: number;
  ratio: number;
}

export interface JobLevelRow {
  level: string;
  ho: number;
  mp: number;
  sny: number;
  total: number;
  ratio: number;
}

export interface PendidikanRow {
  name: string;
  count: number;
  ratio: number;
  color: string;
}

export interface BranchComparisonData {
  metrikUtama: Array<{ branch: string; aktif: number; resign: number; turnoverRate: number }>;
  lokalitas: Array<{ branch: string; lokal: number; nonLokal: number; pctLokal: number }>;
  gender: Array<{ branch: string; ratioStr: string; male: number; female: number }>;
  jobLevel: JobLevelRow[];
  statusKerja: Array<{ status: string; ho: number; mp: number; sny: number }>;
  departemen: Array<{ departemen: string; ho: number; mp: number; sny: number }>;
  usia: Array<{ kelompok: string; ho: number; mp: number; sny: number }>;
}

export interface MonthlyManpowerTrendItem {
  period: string;
  year: number;
  month: number;
  label: string;
  joined: number;
  resigned: number;
  netGrowth: number;
  activeEndMonth: number;
  hoActive: number;
  muaraPahuActive: number;
  senyiurActive: number;
  hoJoined: number;
  hoResigned: number;
  mpJoined: number;
  mpResigned: number;
  snyJoined: number;
  snyResigned: number;
  turnoverRate: number;
}

export interface HRDashboardData {
  kpi: HRDashboardKPI;
  statusKetenagakerjaan: StatusKetenagakerjaanRow[];
  demografi: {
    gender: DemografiItem[];
    lokalitas: DemografiItem[];
    usia: DemografiItem[];
  };
  departemen: DepartemenRow[];
  jobLevel: JobLevelRow[];
  pendidikan: PendidikanRow[];
  branchComparison: BranchComparisonData;
  monthlyTrend?: MonthlyManpowerTrendItem[];
  lastSync: string | null;
}

export const manpowerService = {
  /**
   * Fetch paginated manpower records with filters
   */
  async getList(params: ManpowerListParams = {}): Promise<ManpowerListResponse> {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.statusKeaktifan) q.append("statusKeaktifan", params.statusKeaktifan);
    if (params.branchName) q.append("branchName", params.branchName);
    if (params.organization) q.append("organization", params.organization);
    if (params.statusEmployee) q.append("statusEmployee", params.statusEmployee);
    if (params.pointOfHire) q.append("pointOfHire", params.pointOfHire);
    if (params.page) q.append("page", String(params.page));
    if (params.limit) q.append("limit", String(params.limit));
    if (params.sortBy) q.append("sortBy", params.sortBy);
    if (params.sortOrder) q.append("sortOrder", params.sortOrder);

    const res = await fetch(`${API_BASE_URL}/manpower?${q.toString()}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal memuat data manpower.");
    }

    return res.json();
  },

  /**
   * Fetch manpower summary stats
   */
  async getStats(): Promise<{ success: boolean; stats: ManpowerStats }> {
    const res = await fetch(`${API_BASE_URL}/manpower/stats`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal memuat statistik manpower.");
    }

    return res.json();
  },

  /**
   * Trigger sync from Google Sheet
   */
  async sync(csvUrl?: string): Promise<ManpowerSyncResponse> {
    const res = await fetch(`${API_BASE_URL}/manpower/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvUrl }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal menyinkronkan data dari Google Sheet.");
    }

    return res.json();
  },

  /**
   * Get single employee detail dossier
   */
  /**
   * Fetch complete HR analytics dashboard data
   */
  async getDashboard(): Promise<{ success: boolean; data: HRDashboardData }> {
    const res = await fetch(`${API_BASE_URL}/manpower/dashboard`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal memuat analitika dashboard HR.");
    }

    return res.json();
  },

  async getById(id: string): Promise<{ success: boolean; data: MasterManpowerItem }> {
    const res = await fetch(`${API_BASE_URL}/manpower/${id}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal memuat detail karyawan.");
    }

    return res.json();
  },
};

