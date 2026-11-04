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


export interface GLFuelSummary {
  totalProduction: number;
  totalFuelConsumption: number;
  totalCost: number;
  avgCostPerDay?: number;
  totalTransactions?: number;
  avgPricePerLiter?: number;
  avgCostPerTon?: number;
  actFuelRatio: number;
  planFuelRatio: number;
  totalLiters?: number;
  siteBreakdown?: Array<{
    projectArea: string;
    liters: number;
    cost: number;
    transactionCount: number;
  }>;
  accountBreakdown?: Array<{
    accountCode: string;
    accountName: string;
    liters: number;
    cost: number;
    transactionCount: number;
  }>;
}

export interface GLFuelDailyItem {
  date: string;
  dateLabel: string;
  fuelLiters: number;
  fuelCost?: number;
  cost?: number;
  costPerLiter?: number;
  costPerTon?: number;
  production: number;
  frGL: number;
  planFR: number;
  liters?: number;
  transactionCount?: number;
  avgPrice?: number;
}

export interface GLFuelWeeklyItem {
  week: string;
  frAktual: number | null;
  frTarget: number;
  linearTrend: number;
}

export interface GLFuelFleetItem {
  costCenter: string;
  projectArea: string;
  totalLiters: number;
  totalCost: number;
  transactionCount: number;
}

export interface GLFuelRecentTransaction {
  id: string;
  date: string;
  regNo?: string;
  costCenter?: string;
  projectArea?: string;
  specification?: string;
  qty?: number;
  debet: number;
  remark?: string;
  accountName?: string;
}

export interface GLProfitCenterData {
  period: {
    id: string;
    fileName: string;
    periodName: string;
    year: number;
    month: number;
    startDate?: string;
    endDate?: string;
  };
  tariffs: {
    mph: number;
    sny: number;
  };
  production: {
    totalTon: number;
    mphTon: number;
    snyTon: number;
  };
  revenue: {
    total: number;
    mph: number;
    sny: number;
  };
  opex: {
    total: number;
    directSite: number;
    mph: number;
    sny: number;
    hof: number;
  };
  profit: {
    grossMph: number;
    grossSny: number;
    netConsolidated: number;
    marginPercentMph: number;
    marginPercentSny: number;
    marginPercentConsolidated: number;
    costPerTonMph: number;
    costPerTonSny: number;
    costPerTonConsolidated: number;
    profitPerTonMph: number;
    profitPerTonSny: number;
    profitPerTonConsolidated: number;
  };
  accountGroups: Array<{
    group: string;
    hof: number;
    mph: number;
    sny: number;
    total: number;
  }>;
  topCostCenters: Array<{
    costCenter: string;
    projectArea: string;
    totalCost: number;
    transactionCount: number;
  }>;
  summaries: Array<{
    accountCode: string;
    accountName: string;
    hofAmount: number;
    mphAmount: number;
    snyAmount: number;
    grandTotal: number;
  }>;
}

export interface GLProfitCenterResponse {
  success: boolean;
  data: GLProfitCenterData | null;
  message?: string;
}

export interface GLFuelConsumptionResponse {
  success: boolean;
  period?: {
    startDate: string;
    endDate: string;
  };
  summary: GLFuelSummary;
  dailyData: GLFuelDailyItem[];
  weeklyData?: GLFuelWeeklyItem[];
  topFleets?: GLFuelFleetItem[];
  recentTransactions?: GLFuelRecentTransaction[];
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
    voucherType?: string;
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
    if (paramsObj.voucherType) params.append("voucherType", paramsObj.voucherType);
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

  async getFuelConsumption(paramsObj?: {
    periodId?: string;
    site?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<GLFuelConsumptionResponse> {
    const params = new URLSearchParams();
    if (paramsObj?.periodId) params.append("periodId", paramsObj.periodId);
    if (paramsObj?.site) params.append("site", paramsObj.site);
    if (paramsObj?.startDate) params.append("startDate", paramsObj.startDate);
    if (paramsObj?.endDate) params.append("endDate", paramsObj.endDate);

    const res = await fetch(`${API_BASE_URL}/gl/fuel-consumption?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengambil data konsumsi BBM dari GL");
    }
    return data;
  },

  async getProfitCenter(paramsObj?: {
    periodId?: string;
    tariffMph?: number;
    tariffSny?: number;
  }): Promise<GLProfitCenterResponse> {
    const params = new URLSearchParams();
    if (paramsObj?.periodId) params.append("periodId", paramsObj.periodId);
    if (paramsObj?.tariffMph) params.append("tariffMph", paramsObj.tariffMph.toString());
    if (paramsObj?.tariffSny) params.append("tariffSny", paramsObj.tariffSny.toString());

    const res = await fetch(`${API_BASE_URL}/gl/profit-center?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data;
  },
};
