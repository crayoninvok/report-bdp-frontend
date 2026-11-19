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

  /**
   * Fetch all active manpower for Muara Pahu & Senyiur with localStorage caching
   */
  async getSiteActiveManpower(): Promise<MasterManpowerItem[]> {
    const CACHE_KEY = "bdp_active_site_manpower_cache";
    try {
      const res = await this.getList({
        statusKeaktifan: "Exist",
        limit: 1000,
        sortBy: "fullName",
        sortOrder: "asc",
      });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const filtered = res.data.filter((m) => {
          const branch = (m.branchName || "").toLowerCase();
          return branch.includes("muara pahu") || branch.includes("senyiur");
        });
        if (typeof window !== "undefined" && filtered.length > 0) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
          } catch {}
        }
        return filtered;
      }
    } catch (err) {
      console.warn("Gagal mengambil master manpower aktif dari API, mencoba cache lokal:", err);
    }

    // Fallback to cache if available
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    return [];
  },
};

/**
 * Map organization/department from Master Manpower to standard BDP Hazard Report Departments
 */
export function mapOrganizationToDept(org?: string | null): string {
  if (!org) return "PLANT";
  const upper = org.trim().toUpperCase();
  if (upper.includes("PLANT") || upper.includes("MAINTENANCE") || upper.includes("WORKSHOP")) return "PLANT";
  if (upper.includes("PROD") || upper.includes("OPER") || upper.includes("HAULING") || upper.includes("PIT")) return "PRODUKSI";
  if (upper.includes("HR") || upper.includes("GA") || upper.includes("HUMAN") || upper.includes("GENERAL")) return "HRGA";
  if (upper.includes("HSE") || upper.includes("SAFETY") || upper.includes("K3") || upper.includes("ENV")) return "HSE";
  if (upper.includes("LOGIS") || upper.includes("WAREHOUSE") || upper.includes("SUPPLY") || upper.includes("FUEL")) return "LOGISTIK";
  if (upper.includes("INFRA") || upper.includes("CIVIL") || upper.includes("ROAD")) return "INFRAS";
  if (upper.includes("MANAGE") || upper.includes("DIR") || upper.includes("HEAD") || upper.includes("SITE M")) return "MANAGEMENT";
  return "PLANT";
}

/**
 * Map job position from Master Manpower to standard BDP Hazard Report Jabatan
 */
export function mapJobPositionToJabatan(pos?: string | null): string {
  if (!pos) return "WORKER";
  const upper = pos.trim().toUpperCase();
  if (
    upper.includes("PROJECT MANAGER") ||
    upper.includes("SITE MANAGER") ||
    upper.includes("KTT") ||
    upper.includes("MANAGEMENT") ||
    upper.includes("DEPT HEAD") ||
    upper.includes("HEAD") ||
    upper.includes("MANAGER")
  ) {
    return "SITE MANAGEMENT";
  }
  if (upper.includes("SUPERINTENDENT") || upper.includes("SI ") || upper.includes("SUPERINTEND")) {
    return "SUPERINTENDENT";
  }
  if (
    upper.includes("SR. SPV") ||
    upper.includes("SENIOR SPV") ||
    upper.includes("SR SPV") ||
    upper.includes("SR. SUPERVISOR") ||
    upper.includes("SENIOR SUPERVISOR")
  ) {
    return "SR. SUPERVISOR";
  }
  if (
    upper.includes("SPV") ||
    upper.includes("SUPERVISOR") ||
    upper.includes("FOREMAN") ||
    upper.includes("PENGAWAS") ||
    upper.includes("LEADER") ||
    upper.includes("GROUP LEADER")
  ) {
    return "JR. SUPERVISOR";
  }
  return "WORKER";
}

