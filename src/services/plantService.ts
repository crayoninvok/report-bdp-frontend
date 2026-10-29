import { API_BASE_URL } from "./apiConfig";
import { authService } from "./authService";

export interface MasterUnit {
  id: string;
  unitCode: string;
  unitNumber: number;
  category: "Prime Mover" | "Vessel 1" | "Dolly" | "Vessel 2" | string;
  brand: string;
  model: string;
  headUnitCode: string | null;
  pairIndex: number | null;
  jobSite: string;
  status: string;
  trailers?: {
    vessel1?: MasterUnit;
    dolly?: MasterUnit;
    vessel2?: MasterUnit;
    summary: string;
  };
  buntutSummary?: string;
}

export interface MasterUnitsResponse {
  success: boolean;
  data: MasterUnit[];
  summary: {
    total: number;
    primeMover: number;
    vessel1: number;
    dolly: number;
    vessel2: number;
  };
}

export interface PeriodicInspectionItem {
  id: string;
  planId: string;
  date: string;
  unitCode: string;
  serviceType: string;
  shift: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Pending" | string;
  inspectorName?: string | null;
  notes?: string | null;
  buntutSummary?: string | null;
  unit?: MasterUnit;
  createdAt?: string;
  updatedAt?: string;
}

export interface DaySchedule {
  date: string;
  dayName: string;
  dayDateFormatted: string;
  isToday: boolean;
  targetUnits: number;
  hasCustomTarget: boolean;
  scheduledCount: number;
  completedCount: number;
  inProgressCount: number;
  isTargetAchieved: boolean;
  notes?: string | null;
  items: PeriodicInspectionItem[];
}

export interface WeeklyScheduleData {
  weekRange: {
    startDate: string;
    endDate: string;
    formatted: string;
  };
  defaultDailyTarget: number;
  primeMoverPopulation: number;
  totalPopulationAllSites?: number;
  selectedSite?: string;
  summary: {
    totalWeekPlan: number;
    totalWeekScheduled: number;
    totalWeekCompleted: number;
    scheduledPercent?: number;
    achievementPercent: number;
  };
  days: DaySchedule[];
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

export const plantService = {
  // 1. Get Master Units
  getMasterUnits: async (params?: {
    category?: string;
    search?: string;
    withTrailers?: boolean;
    site?: string;
  }): Promise<MasterUnitsResponse> => {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.search) query.append("search", params.search);
    if (params?.withTrailers) query.append("withTrailers", "true");
    if (params?.site) query.append("site", params.site);

    const res = await fetch(`${API_BASE_URL}/plant/units?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch master units: ${res.statusText}`);
    }
    return res.json();
  },

  // 2. Update Unit Status & JobSite (Super Admin only, cascades to trailers if Prime Mover)
  updateUnit: async (
    unitCode: string,
    payload: { status?: "Active" | "Inactive"; jobSite?: "MuaraPahu" | "Senyiur" }
  ): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/units/${unitCode}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal memperbarui data unit");
    }
    return res.json();
  },

  // 3. Get Plant Settings
  getSettings: async (): Promise<Record<string, string>> => {
    const res = await fetch(`${API_BASE_URL}/plant/settings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch plant settings");
    }
    const json = await res.json();
    return json.data;
  },

  // 4. Update Plant Setting (e.g. daily target)
  updateSetting: async (key: string, value: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/settings`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      throw new Error("Failed to update plant setting");
    }
    return res.json();
  },

  // 5. Get Weekly Schedule (supports optional startDate & endDate for multi-week / fixed date ranges)
  getWeeklySchedule: async (
    date?: string,
    site?: string,
    startDate?: string,
    endDate?: string
  ): Promise<WeeklyScheduleData> => {
    const query = new URLSearchParams();
    if (date) query.append("date", date);
    if (site) query.append("site", site);
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);

    const res = await fetch(
      `${API_BASE_URL}/plant/periodic-inspection/weekly?${query.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      throw new Error("Failed to fetch weekly schedule");
    }
    const json = await res.json();
    return json.data;
  },

  // 5. Update Daily Plan Target for a specific date
  upsertDailyPlan: async (date: string, targetUnits: number, notes?: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/periodic-inspection/plan`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ date, targetUnits, notes }),
    });
    if (!res.ok) {
      throw new Error("Failed to update daily plan target");
    }
    return res.json();
  },

  // 6. Add/Schedule a unit for PI
  addInspectionItem: async (payload: {
    date: string;
    unitCode: string;
    serviceType?: string;
    shift?: string;
    status?: string;
    inspectorName?: string;
    notes?: string;
  }): Promise<PeriodicInspectionItem> => {
    const res = await fetch(`${API_BASE_URL}/plant/periodic-inspection/item`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to schedule unit for inspection");
    }
    const json = await res.json();
    return json.data;
  },

  // 7. Bulk add units for a date
  bulkAddInspectionItems: async (payload: {
    date: string;
    unitCodes: string[];
    serviceType?: string;
    shift?: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/periodic-inspection/bulk-add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to bulk add units");
    }
    return res.json();
  },

  // 8. Update inspection item
  updateInspectionItem: async (
    id: string,
    payload: {
      serviceType?: string;
      shift?: string;
      status?: string;
      inspectorName?: string;
      notes?: string;
    }
  ): Promise<PeriodicInspectionItem> => {
    const res = await fetch(`${API_BASE_URL}/plant/periodic-inspection/item/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Failed to update inspection item");
    }
    const json = await res.json();
    return json.data;
  },

  // 9. Delete inspection item
  deleteInspectionItem: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/periodic-inspection/item/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to delete inspection item");
    }
    return res.json();
  },

  // 10. Apply Standard Weekly Template (65 Units for Muara Pahu)
  applyStandardTemplate: async (
    date: string,
    jobSite: string = "MuaraPahu"
  ): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(
      `${API_BASE_URL}/plant/periodic-inspection/apply-standard-template`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, jobSite }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to apply standard template");
    }
    return res.json();
  },
};
