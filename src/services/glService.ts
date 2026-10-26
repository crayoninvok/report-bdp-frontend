import { authService } from "./authService";
import { API_BASE_URL } from "./apiConfig";

export interface GLPeriodItem {
  id: string;
  fileName: string;
  periodName: string;
  year: number;
  month: number;
  startDate?: string;
  endDate?: string;
  totalDebet: number;
  totalTransactions: number;
  createdAt: string;
}

export interface GLExpenseSummaryItem {
  id: string;
  periodId: string;
  accountCode: string;
  accountName: string;
  hofAmount: number;
  mphAmount: number;
  snyAmount: number;
  grandTotal: number;
}

export interface GLTransactionItem {
  id: string;
  periodId: string;
  date: string;
  regNo?: string;
  controlNo?: string;
  accountCode: string;
  accountName: string;
  accountGroup?: string;
  currency: string;
  costCenter?: string;
  debet: number;
  credit: number;
  saldo?: number;
  projectArea?: string;
  materialCode?: string;
  specification?: string;
  qty?: number;
  supplierName?: string;
  remark?: string;
}

export interface GLPreviewData {
  fileName: string;
  periodName: string;
  startDate?: string;
  endDate?: string;
  year: number;
  month: number;
  totalDebet: number;
  totalCredit: number;
  totalTransactions: number;
  siteTotals: {
    HOF: number;
    MPH: number;
    SNY: number;
    grandTotal: number;
  };
  reconciliationMatch: boolean;
  discrepancy: number;
  summaries: Array<{
    accountCode: string;
    accountName: string;
    hofAmount: number;
    mphAmount: number;
    snyAmount: number;
    grandTotal: number;
  }>;
  sampleTransactions: any[];
}

function getAuthHeaders(isFormData = false): Record<string, string> {
  const user = authService.getCurrentUser();
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (user) {
    headers["x-user-role"] = user.role;
    headers["x-user-jobsite"] = user.jobSite;
    headers["x-user-id"] = user.id;
    headers["x-user-email"] = user.email;
  }
  return headers;
}

export const glService = {
  async getPeriods(): Promise<GLPeriodItem[]> {
    const res = await fetch(`${API_BASE_URL}/gl/periods`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil daftar periode GL");
    }
    return data.data;
  },

  async getExpenseSummaries(periodId?: string, search?: string): Promise<{
    period: GLPeriodItem | null;
    totals: { HOF: number; MPH: number; SNY: number; grandTotal: number };
    data: GLExpenseSummaryItem[];
  }> {
    const params = new URLSearchParams();
    if (periodId) params.append("periodId", periodId);
    if (search) params.append("search", search);

    const res = await fetch(`${API_BASE_URL}/gl/summary?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil ringkasan kode beban GL");
    }
    return data;
  },

  async getTransactions(paramsObj: {
    periodId?: string;
    site?: string;
    accountCode?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: GLTransactionItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams();
    if (paramsObj.periodId) params.append("periodId", paramsObj.periodId);
    if (paramsObj.site) params.append("site", paramsObj.site);
    if (paramsObj.accountCode) params.append("accountCode", paramsObj.accountCode);
    if (paramsObj.startDate) params.append("startDate", paramsObj.startDate);
    if (paramsObj.endDate) params.append("endDate", paramsObj.endDate);
    if (paramsObj.q) params.append("q", paramsObj.q);
    if (paramsObj.page) params.append("page", paramsObj.page.toString());
    if (paramsObj.limit) params.append("limit", paramsObj.limit.toString());

    const res = await fetch(`${API_BASE_URL}/gl/transactions?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil daftar transaksi GL");
    }
    return data;
  },

  async previewUpload(file: File): Promise<GLPreviewData> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/gl/upload/preview`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData,
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal memproses pratinjau file GL");
    }
    return data.data;
  },

  async commitUpload(file: File): Promise<{
    periodId: string;
    periodName: string;
    totalDebet: number;
    totalTransactions: number;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/gl/upload/commit`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData,
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal menyimpan data GL");
    }
    return data.data;
  },
};
