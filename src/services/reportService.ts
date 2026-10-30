import { JobSite, User } from "../types/auth";
import { ReportSummary, ReportDetails } from "../types/report";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiConfig";

function getAuthHeaders(): Record<string, string> {
  const user = authService.getCurrentUser();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (user) {
    headers["x-user-role"] = user.role;
    headers["x-user-jobsite"] = user.jobSite;
    headers["x-user-id"] = user.id;
    headers["x-user-email"] = user.email;
  }
  return headers;
}

export const reportService = {
  async getReports(jobSite?: JobSite, year?: number): Promise<ReportSummary[]> {
    const currentUser = authService.getCurrentUser();
    let effectiveSite = jobSite;

    // Security scope: Non-HeadOffice users can only fetch their own site reports
    if (currentUser && currentUser.role !== "SuperAdmin" && currentUser.jobSite !== "HeadOffice") {
      effectiveSite = currentUser.jobSite;
    }

    const params = new URLSearchParams();
    if (effectiveSite) params.append("jobSite", effectiveSite);
    if (year) params.append("year", year.toString());

    const res = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil daftar laporan");
    }
    return data.data;
  },

  async getReportDetails(id: string): Promise<ReportDetails> {
    const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil detail laporan");
    }
    return data.data;
  },

  async createReport(payload: {
    jobSite: JobSite;
    periodName: string;
    startDate: string;
    endDate: string;
    year: number;
    weekNumber: number;
  }): Promise<any> {
    const currentUser = authService.getCurrentUser();
    const finalPayload = { ...payload };

    // Security scope: Site user cannot create for other sites
    if (currentUser && currentUser.role !== "SuperAdmin" && currentUser.jobSite !== "HeadOffice") {
      finalPayload.jobSite = currentUser.jobSite;
    }

    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(finalPayload),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal membuat periode laporan baru");
    }
    return data.data;
  },

  async updatePeriod(
    id: string,
    payload: {
      periodName?: string;
      weekNumber?: number;
      year?: number;
      startDate?: string;
      endDate?: string;
      budgetProduksi?: number;
      realisasiProduksi?: number;
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/reports/${id}/period`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal memperbarui informasi periode");
    }
    return data.data;
  },

  async updateBudget(
    id: string,
    user: User,
    budgetProduksi: number,
    items: { accountName: string; budgetCost: number }[]
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/reports/${id}/budget`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        userRole: user.role,
        userJobSite: user.jobSite,
        budgetProduksi,
        items,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal memperbarui data Budget");
    }
    return data.data;
  },

  async updateRealisasi(
    id: string,
    user: User,
    realisasiProduksi: number,
    items: { accountName: string; realisasiCost: number }[]
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/reports/${id}/realisasi`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        userRole: user.role,
        userJobSite: user.jobSite,
        realisasiProduksi,
        items,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal memperbarui data Realisasi");
    }
    return data.data;
  },

  async getSummaryOps(jobSite?: JobSite, year?: number): Promise<import("../types/report").PLSummaryOpsData[]> {
    const currentUser = authService.getCurrentUser();
    let effectiveSite = jobSite;

    // Security scope: Non-HeadOffice users can only fetch their own site summary
    if (currentUser && currentUser.role !== "SuperAdmin" && currentUser.jobSite !== "HeadOffice") {
      effectiveSite = currentUser.jobSite;
    }

    const params = new URLSearchParams();
    if (effectiveSite) params.append("jobSite", effectiveSite);
    if (year) params.append("year", year.toString());

    const res = await fetch(`${API_BASE_URL}/reports/summary/ops?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil data summary ops");
    }
    return data.data;
  },

  async deleteReport(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal menghapus laporan");
    }
    return data;
  },

  async previewExcelUpload(
    file: File,
    targetJobSite?: JobSite
  ): Promise<import("../types/report").ExcelParseResult> {
    const user = authService.getCurrentUser();
    const formData = new FormData();
    formData.append("file", file);
    if (targetJobSite) {
      formData.append("targetJobSite", targetJobSite);
    }

    const headers: Record<string, string> = {};
    if (user) {
      headers["x-user-role"] = user.role;
      headers["x-user-jobsite"] = user.jobSite;
      headers["x-user-id"] = user.id;
      headers["x-user-email"] = user.email;
    }

    const res = await fetch(`${API_BASE_URL}/reports/upload/preview`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal memproses file Excel");
    }
    return data.data;
  },

  async commitExcelUpload(
    file: File,
    periodsToImport?: string[],
    targetJobSite?: JobSite
  ): Promise<{ message: string; importedReports: any[] }> {
    const user = authService.getCurrentUser();
    const formData = new FormData();
    formData.append("file", file);
    if (targetJobSite) {
      formData.append("targetJobSite", targetJobSite);
    }
    if (periodsToImport && periodsToImport.length > 0) {
      formData.append("periodsToImport", JSON.stringify(periodsToImport));
    }

    const headers: Record<string, string> = {};
    if (user) {
      headers["x-user-role"] = user.role;
      headers["x-user-jobsite"] = user.jobSite;
      headers["x-user-id"] = user.id;
      headers["x-user-email"] = user.email;
    }

    const res = await fetch(`${API_BASE_URL}/reports/upload/commit`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengimpor data ke database");
    }
    return data;
  },

  async getCostTrends(jobSite?: JobSite, year?: number): Promise<{
    Senyiur: {
      weekly: import("../components/CostTrendCharts").FullPeriodRecord[];
      monthly?: import("../components/CostTrendCharts").FullPeriodRecord[];
    };
    MuaraPahu: {
      weekly: import("../components/CostTrendCharts").FullPeriodRecord[];
      monthly?: import("../components/CostTrendCharts").FullPeriodRecord[];
    };
  }> {
    const params = new URLSearchParams();
    if (jobSite) params.append("jobSite", jobSite);
    if (year) params.append("year", year.toString());

    const res = await fetch(`${API_BASE_URL}/reports/trend?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil data tren biaya");
    }
    return data.data;
  },

  async getCostOverall(site?: string, year?: number, minWeek?: number, maxWeek?: number): Promise<CostOverallData> {
    const params = new URLSearchParams();
    if (site) params.append("jobSite", site);
    if (year) params.append("year", year.toString());
    if (minWeek) params.append("minWeek", minWeek.toString());
    if (maxWeek) params.append("maxWeek", maxWeek.toString());

    const res = await fetch(`${API_BASE_URL}/reports/cost-overall?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil data Dashboard Cost Overall");
    }
    return data.data;
  },

  async getLatestUpdates(): Promise<LatestUpdatesResponse> {
    const res = await fetch(`${API_BASE_URL}/reports/latest-updates`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil data update terbaru");
    }
    return data;
  },
};

export interface CostTimelinePoint {
  weekNumber: number;
  label: string;
  periodName: string;
  budgetCost: number;
  realisasiCost: number;
  deviasiCost: number;
  prodBudget: number;
  prodReal: number;
  budgetIdrPerTon: number;
  realisasiIdrPerTon: number;
  deviasiIdrPerTon: number;
}

export interface CostCategoryEntity {
  id: string;
  name: string;
  type: "parent" | "subcategory" | "account";
  accountCode?: string | null;
  accountName?: string;
  parentName?: string | null;
  subCategory?: string | null;
  subCategories?: string[];
  accountCodes?: string[];
  accountCount?: number;
  costBehavior?: string | null;
  totalBudget: number;
  totalRealisasi: number;
  totalDeviasi: number;
  avgBudgetIdrPerTon: number;
  avgRealisasiIdrPerTon: number;
  avgDeviasiIdrPerTon: number;
  timeline: CostTimelinePoint[];
}

export interface CostOverallData {
  site: string;
  year: number;
  totalBudgetProduksi: number;
  totalRealisasiProduksi: number;
  availableWeeks: string[];
  productionTimeline: {
    weekNumber: number;
    label: string;
    periodName: string;
    budgetProduksi: number;
    realisasiProduksi: number;
    deviasiProduksi: number;
  }[];
  summaryTotal: {
    name: string;
    totalBudget: number;
    totalRealisasi: number;
    totalDeviasi: number;
    avgBudgetIdrPerTon: number;
    avgRealisasiIdrPerTon: number;
    avgDeviasiIdrPerTon: number;
    timeline: CostTimelinePoint[];
  };
  parentCategories: CostCategoryEntity[];
  subCategories: CostCategoryEntity[];
  accounts: CostCategoryEntity[];
}

export interface LatestDataUpdateItem {
  id: string;
  module: string;
  category: string;
  title: string;
  description: string;
  timestamp: string;
  type: string;
}

export interface LatestUpdatesResponse {
  success: boolean;
  latestTimestamp: string | null;
  updates: LatestDataUpdateItem[];
}


