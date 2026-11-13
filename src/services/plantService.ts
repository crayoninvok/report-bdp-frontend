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
  currentHm?: number | null;
  currentKm?: number | null;
  isLiveTelemetry?: boolean;
  trailers?: {
    vessel1?: MasterUnit;
    dolly?: MasterUnit;
    vessel2?: MasterUnit;
    summary: string;
  };
  buntutSummary?: string;
}

export interface MasterUnitSyncMeta {
  syncedAt: string;
  totalVolvoVehicles: number;
  createdCount: number;
  newPrimeMovers: string[];
  newTrailers: string[];
  skippedCache?: boolean;
  error?: string;
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
    support?: number;
    supportByCategory?: Record<string, number>;
  };
  syncMeta?: MasterUnitSyncMeta;
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
  mechanicName?: string | null;
  mechanicNames?: string[];
  supervisorName?: string | null;
  category?: string | null;
  planStartTime?: string | null;
  planLeadTime?: string | null;
  planHmServis?: string | null;
  actualStartTime?: string | null;
  actualLeadTime?: string | null;
  actualHmServis?: number | null;
  currentKm?: number | null;
  currentHm?: number | null;
  nextDueKm?: number | null;
  nextDueHm?: number | null;
  liveKm?: number | null;
  liveHm?: number | null;
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
  leadInspector?: string | null;
  leadMechanic?: string | null;
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
  telemetryMeta?: {
    onlineCount: number;
    fetchedAt: string;
    error?: string | null;
  };
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
    syncVolvo?: boolean;
  }): Promise<MasterUnitsResponse> => {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.search) query.append("search", params.search);
    if (params?.withTrailers) query.append("withTrailers", "true");
    if (params?.site) query.append("site", params.site);
    if (params?.syncVolvo) query.append("syncVolvo", "true");

    const res = await fetch(`${API_BASE_URL}/plant/units?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch master units: ${res.statusText}`);
    }
    return res.json();
  },

  // 1b. Add New Support Unit
  createUnit: async (payload: {
    unitCode: string;
    category: string;
    brand: string;
    model: string;
    jobSite: "MuaraPahu" | "Senyiur";
    status?: "Active" | "Inactive";
    currentHm?: number | null;
    currentKm?: number | null;
  }): Promise<{ success: boolean; message: string; data: MasterUnit }> => {
    const res = await fetch(`${API_BASE_URL}/plant/units`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || json.error || "Gagal menambahkan unit support");
    }
    return json;
  },

  // 1c. Sync Prime Movers & Auto-paired Vessel/Dolly from Volvo Connect
  syncVolvoUnits: async (): Promise<{
    success: boolean;
    message: string;
    data: MasterUnitSyncMeta;
  }> => {
    const res = await fetch(`${API_BASE_URL}/plant/units/sync-volvo`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || json.error || "Gagal sinkronisasi Volvo Connect");
    }
    return json;
  },

  // 2. Update Unit Status & JobSite (Super Admin only, cascades to trailers if Prime Mover)
  updateUnit: async (
    unitCode: string,
    payload: {
      status?: "Active" | "Inactive";
      jobSite?: "MuaraPahu" | "Senyiur";
      brand?: string;
      model?: string;
      currentHm?: number | null;
      currentKm?: number | null;
    }
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

  // 5. Update Daily Plan Target or Lead Inspector for a specific date
  upsertDailyPlan: async (
    arg1: string | { date: string; targetUnits?: number; leadInspector?: string | null; notes?: string },
    targetUnits?: number,
    notes?: string
  ): Promise<any> => {
    let bodyData: any = {};
    if (typeof arg1 === "string") {
      bodyData = { date: arg1, targetUnits, notes };
    } else {
      bodyData = arg1;
    }
    const res = await fetch(`${API_BASE_URL}/plant/periodic-inspection/plan`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyData),
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

  // 11. Tyre & Rim Usage (from GL Beban Tyre 05110203)
  getTyreRimUsage: async (params?: {
    site?: string;
    itemType?: string;
    specification?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
    periodId?: string;
  }): Promise<TyreRimUsageResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.site) searchParams.set("site", params.site);
    if (params?.itemType) searchParams.set("itemType", params.itemType);
    if (params?.specification) searchParams.set("specification", params.specification);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.periodId) searchParams.set("periodId", params.periodId);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/plant/tyre-rim-usage${query ? `?${query}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch Tyre & Rim usage data");
    }
    return res.json();
  },

  // 12. Preventive Maintenance (PM) Weekly Schedule & Daily Plan
  getPmWeeklySchedule: async (
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
      `${API_BASE_URL}/plant/preventive-maintenance/weekly?${query.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      throw new Error("Failed to fetch Preventive Maintenance schedule");
    }
    const json = await res.json();
    return json.data;
  },

  // 13. Update PM Daily Plan Target or Lead Mechanic
  upsertPmDailyPlan: async (payload: {
    date: string;
    targetUnits?: number;
    leadMechanic?: string | null;
    leadInspector?: string | null;
    notes?: string;
    jobSite?: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/preventive-maintenance/plan`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Failed to update PM daily plan");
    }
    return res.json();
  },

  // 14. Add/Schedule a unit for Periodic Service
  addPmItem: async (payload: {
    date: string;
    unitCode: string;
    serviceType?: string;
    shift?: string;
    status?: string;
    category?: string;
    planStartTime?: string;
    planLeadTime?: string;
    planHmServis?: string;
    actualStartTime?: string | null;
    actualLeadTime?: string | null;
    actualHmServis?: number | null;
    supervisorName?: string;
    mechanicNames?: string[];
    mechanicName?: string;
    buntutSummary?: string | null;
    includedTrailers?: string[];
    currentKm?: number | null;
    currentHm?: number | null;
    nextDueKm?: number | null;
    nextDueHm?: number | null;
    notes?: string;
    jobSite?: string;
  }): Promise<PeriodicInspectionItem> => {
    const res = await fetch(`${API_BASE_URL}/plant/preventive-maintenance/item`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal menjadwalkan unit Periodic Service");
    }
    const json = await res.json();
    return json.data;
  },

  // 15. Bulk add units for Periodic Service on a specific date
  bulkAddPmItems: async (payload: {
    date: string;
    unitCodes: string[];
    serviceType?: string;
    shift?: string;
    jobSite?: string;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/preventive-maintenance/bulk-add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal menjadwalkan unit Periodic Service secara massal");
    }
    return res.json();
  },

  // 16. Update Periodic Service item
  updatePmItem: async (
    id: string,
    payload: {
      serviceType?: string;
      shift?: string;
      status?: string;
      category?: string;
      planStartTime?: string;
      planLeadTime?: string;
      planHmServis?: string;
      actualStartTime?: string | null;
      actualLeadTime?: string | null;
      actualHmServis?: number | null;
      supervisorName?: string;
      mechanicNames?: string[];
      mechanicName?: string;
      buntutSummary?: string | null;
      includedTrailers?: string[];
      currentKm?: number | null;
      currentHm?: number | null;
      nextDueKm?: number | null;
      nextDueHm?: number | null;
      notes?: string;
    }
  ): Promise<PeriodicInspectionItem> => {
    const res = await fetch(`${API_BASE_URL}/plant/preventive-maintenance/item/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error("Gagal memperbarui jadwal Periodic Service");
    }
    const json = await res.json();
    return json.data;
  },

  // 17. Delete Periodic Service item
  deletePmItem: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/plant/preventive-maintenance/item/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Gagal menghapus jadwal Periodic Service");
    }
    return res.json();
  },

  // 18. Auto-schedule Due Soon / Overdue units from Volvo Telemetry Radar
  autoScheduleDuePmUnits: async (
    date?: string,
    jobSite: string = "MuaraPahu"
  ): Promise<{ success: boolean; message: string; scheduledCount?: number }> => {
    const res = await fetch(
      `${API_BASE_URL}/plant/preventive-maintenance/auto-schedule-due`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, jobSite }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal auto-jadwalkan unit Due Soon");
    }
    return res.json();
  },

  // 19. Get Periodic Service Radar (Live Volvo KM/HM + Interval Countdown)
  getPmRadar: async (
    site: string = "MuaraPahu",
    force: boolean = false
  ): Promise<PmRadarResponse> => {
    const query = new URLSearchParams();
    if (site) query.append("site", site);
    if (force) query.append("force", "true");
    const res = await fetch(
      `${API_BASE_URL}/plant/preventive-maintenance/radar?${query.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      throw new Error("Failed to fetch Periodic Service KM/HM Radar");
    }
    return res.json();
  },

  // 20. Get HR Plant Personnel (SPV Plant & Mechanics for dropdowns)
  getPlantPersonnel: async (
    site: string = "MuaraPahu"
  ): Promise<PlantPersonnelResponse> => {
    const query = new URLSearchParams();
    if (site) query.append("site", site);
    const res = await fetch(
      `${API_BASE_URL}/plant/periodic-service/personnel?${query.toString()}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      throw new Error("Gagal memuat data personel Plant dari HR");
    }
    return res.json();
  },

  // 21. Get Dashboard Plant Analytics (GL Plant Cost YTD & MTD + Preventive Maintenance PI & PS)
  getPlantDashboard: async (params?: {
    site?: string;
    glScope?: "all_plant" | "rm_only" | "tyre_oli_grease";
    year?: number;
    month?: number;
    pmPeriod?: "week" | "mtd" | "30d" | "ytd" | "custom";
    pmStartDate?: string;
    pmEndDate?: string;
  }): Promise<PlantDashboardResponse> => {
    const query = new URLSearchParams();
    if (params?.site) query.append("site", params.site);
    if (params?.glScope) query.append("glScope", params.glScope);
    if (params?.year) query.append("year", String(params.year));
    if (params?.month) query.append("month", String(params.month));
    if (params?.pmPeriod) query.append("pmPeriod", params.pmPeriod);
    if (params?.pmStartDate) query.append("pmStartDate", params.pmStartDate);
    if (params?.pmEndDate) query.append("pmEndDate", params.pmEndDate);
    const qs = query.toString();
    const res = await fetch(
      `${API_BASE_URL}/plant/dashboard${qs ? `?${qs}` : ""}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      throw new Error("Gagal memuat data Dashboard Plant");
    }
    return res.json();
  },

  // Daily PA Report endpoints
  getDailyPaReport: async (
    date: string,
    jobSite: string
  ): Promise<DailyPaReportResponse> => {
    const query = new URLSearchParams({ date, jobSite });
    return requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa?${query.toString()}`,
      { headers: getAuthHeaders() },
      "Gagal memuat Daily PA Report"
    );
  },

  getDailyPaMonthlySummary: async (
    year: number,
    month: number,
    jobSite?: string
  ): Promise<{
    success: boolean;
    data: { year: number; month: number; days: DailyPaMonthlyDaySummary[] };
  }> => {
    const query = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (jobSite) query.append("jobSite", jobSite);
    return requestPlantJson(
      `${API_BASE_URL}/plant/daily-pa/monthly-summary?${query.toString()}`,
      { headers: getAuthHeaders() },
      "Gagal memuat ringkasan kalender Daily PA"
    );
  },

  updateDailyPaSettings: async (payload: {
    date: string;
    jobSite: string;
    calendarHours?: number;
    targetPa?: number;
    notes?: string;
  }): Promise<DailyPaReportResponse> =>
    requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa/settings`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      "Gagal menyimpan pengaturan Daily PA"
    ),

  addUnitsToDailyPa: async (payload: {
    date: string;
    jobSite: string;
    unitCodes: string[];
  }): Promise<DailyPaReportResponse & { addedUnitsCount?: number }> =>
    requestPlantJson(
      `${API_BASE_URL}/plant/daily-pa/units`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      "Gagal menambahkan unit ke Daily PA"
    ),

  removeUnitFromDailyPa: async (entryId: string): Promise<DailyPaReportResponse> =>
    requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa/units/${encodeURIComponent(entryId)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
      "Gagal menghapus unit dari Daily PA"
    ),

  syncPiPsToDailyPa: async (
    date: string,
    jobSite: string
  ): Promise<DailyPaReportResponse> =>
    requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa/sync-pi-ps`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, jobSite }),
      },
      "Gagal sinkronisasi PI & PS ke Daily PA"
    ),

  addDailyPaActivity: async (payload: {
    unitEntryId: string;
    activityText: string;
    breakdownTime?: string;
    durationHours: number | string;
  }): Promise<DailyPaReportResponse> =>
    requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa/activities`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      "Gagal menambahkan BD Activity"
    ),

  updateDailyPaActivity: async (
    activityId: string,
    payload: {
      activityText?: string;
      breakdownTime?: string;
      durationHours?: number | string;
    }
  ): Promise<DailyPaReportResponse> =>
    requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa/activities/${encodeURIComponent(activityId)}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      "Gagal memperbarui BD Activity"
    ),

  deleteDailyPaActivity: async (activityId: string): Promise<DailyPaReportResponse> =>
    requestPlantJson<DailyPaReportResponse>(
      `${API_BASE_URL}/plant/daily-pa/activities/${encodeURIComponent(activityId)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
      "Gagal menghapus BD Activity"
    ),

  // Daily Breakdown Report endpoints
  getDailyBreakdownList: async (params?: {
    site?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<DailyBreakdownResponse> => {
    const query = new URLSearchParams();
    if (params?.site) query.append("site", params.site);
    if (params?.date) query.append("date", params.date);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.status) query.append("status", params.status);
    if (params?.category) query.append("category", params.category);
    if (params?.search) query.append("search", params.search);

    const qs = query.toString();
    return requestPlantJson<DailyBreakdownResponse>(
      `${API_BASE_URL}/plant/daily-breakdown${qs ? `?${qs}` : ""}`,
      { headers: getAuthHeaders() },
      "Gagal memuat data Daily Breakdown Report"
    );
  },

  createDailyBreakdown: async (
    payload: DailyBreakdownInput
  ): Promise<{ success: boolean; data: DailyBreakdownItem; message?: string }> =>
    requestPlantJson(
      `${API_BASE_URL}/plant/daily-breakdown`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      "Gagal mencatat data breakdown baru"
    ),

  updateDailyBreakdown: async (
    id: string,
    payload: Partial<DailyBreakdownInput>
  ): Promise<{ success: boolean; data: DailyBreakdownItem; message?: string }> =>
    requestPlantJson(
      `${API_BASE_URL}/plant/daily-breakdown/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      "Gagal memperbarui data breakdown"
    ),

  deleteDailyBreakdown: async (id: string): Promise<{ success: boolean; message?: string }> =>
    requestPlantJson(
      `${API_BASE_URL}/plant/daily-breakdown/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
      "Gagal menghapus data breakdown"
    ),
};

async function requestPlantJson<T>(
  url: string,
  init: RequestInit,
  fallbackError: string
): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || fallbackError);
  }
  return json as T;
}

export interface DailyPaActivityItem {
  id: string;
  unitEntryId: string;
  sourceType: "PI" | "PS" | "MANUAL" | string;
  sourceItemId: string | null;
  activityText: string;
  breakdownTime: string;
  durationHours: number;
  sortOrder: number;
}

export interface DailyPaUnitRow {
  id: string;
  no: number;
  unitCode: string;
  category: string;
  brand: string;
  model: string;
  bdCount: number;
  totalDowntime: number;
  availableHours: number;
  paPercent: number;
  isBelowTarget: boolean;
  breakdownTimesJoined: string;
  mttr: number | null;
  mtbf: number | null;
  hasMissingPiPsHours: boolean;
  activities: DailyPaActivityItem[];
}

export interface DailyPaSummary {
  totalUnits: number;
  totalBd: number;
  totalDowntime: number;
  totalAvailableHours: number;
  totalCalendarHours: number;
  overallPaPercent: number;
  breakdownUnitCount: number;
  belowTargetUnitCount: number;
  overallMttr: number | null;
  overallMtbf: number | null;
}

export interface DailyPaReportMeta {
  id: string | null;
  date: string;
  jobSite: string;
  calendarHours: number;
  targetPa: number;
  notes: string;
}

export interface DailyPaReportData {
  report: DailyPaReportMeta;
  summary: DailyPaSummary;
  units: DailyPaUnitRow[];
}

export interface DailyPaReportResponse {
  success: boolean;
  message?: string;
  data: DailyPaReportData;
  syncMeta?: {
    addedCount: number;
    updatedCount: number;
  };
}

export interface DailyPaMonthlyDaySummary {
  date: string;
  totalUnits: number;
  totalBd: number;
  breakdownUnitCount: number;
  belowTargetUnitCount: number;
  overallPaPercent: number;
  targetPa: number;
}

export type PlantGlScope = "all_plant" | "rm_only" | "tyre_oli_grease";
export type PlantPmPeriodMode = "week" | "mtd" | "30d" | "ytd" | "custom";

export interface PlantDashboardMonthOption {
  month: number;
  label: string;
  periodName: string;
  startDate: string | null;
  endDate: string | null;
}

export interface PlantDashboardMonthlyGlPoint {
  month: number;
  label: string;
  hasData: boolean;
  periodName: string | null;
  tyre: number;
  sparepart: number;
  oliGrease: number;
  consumableTools: number;
  jasaUndercarriage: number;
  total: number;
  mph: number;
  sny: number;
  txCount: number;
}

export interface PlantDashboardDailyMtdPoint {
  date: string;
  label: string;
  tyre: number;
  sparepart: number;
  oliGrease: number;
  consumableTools: number;
  jasaUndercarriage: number;
  total: number;
  txCount: number;
  cumulativeTotal: number;
}

export interface PlantDashboardCategoryItem {
  categoryKey: string;
  categoryLabel: string;
  ytdTotal: number;
  mtdTotal: number;
  ytdSharePercent: number;
  mtdSharePercent: number;
}

export interface PlantDashboardAccountItem {
  accountCode: string;
  accountName: string;
  categoryKey: string;
  categoryLabel: string;
  ytdTotal: number;
  mtdTotal: number;
  ytdMph: number;
  ytdSny: number;
  mtdMph: number;
  mtdSny: number;
  txCountYtd: number;
  txCountMtd: number;
}

export interface PlantDashboardCostCenterItem {
  costCenter: string;
  tyre: number;
  sparepartRm: number;
  oliGrease: number;
  total: number;
  txCount: number;
}

export interface PlantDashboardPlMonthlyPoint {
  month: number;
  label: string;
  budget: number;
  realisasi: number;
  tyreBudget: number;
  tyreReal: number;
  rmBudget: number;
  rmReal: number;
  achPercent: number;
  variance: number;
}

export interface PlantDashboardPmDailyPoint {
  date: string;
  label: string;
  plan: number;
  scheduled: number;
  completed: number;
  inProgress: number;
  openCount: number;
  achievementPercent: number;
}

export interface PlantDashboardPmPlanSummary {
  totalPlan: number;
  totalScheduled: number;
  totalCompleted: number;
  inProgressCount: number;
  scheduledOpenCount: number;
  pendingCount: number;
  achievementPercent: number;
  scheduleFillPercent: number;
  daysCount: number;
}

export interface PlantDashboardPmSection {
  summary: PlantDashboardPmPlanSummary;
  statusBreakdown: Array<{ name: string; value: number; key: string }>;
  shiftBreakdown: Array<{ shift: string; total: number; completed: number; pending: number }>;
  dailySeries: PlantDashboardPmDailyPoint[];
}

export interface PlantDashboardData {
  filters: {
    site: string;
    glProjectArea: string;
    glScope: PlantGlScope;
    year: number;
    month: number;
    availableYears: number[];
    availableMonths: PlantDashboardMonthOption[];
    pmPeriod: PlantPmPeriodMode;
    pmRange: {
      startDate: string;
      endDate: string;
      label: string;
    };
  };
  fleet: {
    primeMoverPopulation: number;
    totalUnitsCount: number;
  };
  glCost: {
    ytd: {
      totalCost: number;
      rmCost: number;
      tyreOliGreaseCost: number;
      mphCost: number;
      snyCost: number;
      hofCost: number;
      transactionCount: number;
      uploadedMonthsCount: number;
      uploadedPeriodNames: string[];
      uploadedMonthsLabel: string;
    };
    mtd: {
      hasData: boolean;
      periodName: string;
      startDate: string | null;
      endDate: string | null;
      daysElapsed: number;
      totalCost: number;
      rmCost: number;
      tyreOliGreaseCost: number;
      mphCost: number;
      snyCost: number;
      hofCost: number;
      avgDailyCost: number;
      prevMonthPeriodName: string | null;
      prevMonthAvgDaily: number;
      dailyRunRateDeltaPercent: number | null;
      transactionCount: number;
    };
    monthlyGlTrend: PlantDashboardMonthlyGlPoint[];
    dailyMtdTrend: PlantDashboardDailyMtdPoint[];
    categoryBreakdown: PlantDashboardCategoryItem[];
    accountBreakdown: PlantDashboardAccountItem[];
    topCostCentersYtd: PlantDashboardCostCenterItem[];
    topCostCentersMtd: PlantDashboardCostCenterItem[];
    plReference: {
      totals: {
        ytdBudget: number;
        ytdRealisasi: number;
        ytdVariance: number;
        ytdAchPercent: number;
        mtdBudget: number;
        mtdRealisasi: number;
      };
      monthlyTrend: PlantDashboardPlMonthlyPoint[];
    };
  };
  pm: {
    pi: PlantDashboardPmSection;
    ps: PlantDashboardPmSection & {
      intervalBreakdown: Array<{
        interval: string;
        Completed: number;
        "In Progress": number;
        Scheduled: number;
        Pending: number;
        total: number;
      }>;
      assetBreakdown: Array<{
        assetCategory: string;
        total: number;
        completed: number;
      }>;
      kpiItems: PeriodicInspectionItem[];
    };
  };
}

export interface PlantDashboardResponse {
  success: boolean;
  data: PlantDashboardData;
}

export interface PlantPersonnelItem {
  id: string;
  employeeId: string;
  fullName: string;
  jobPosition: string | null;
  jobLevel: string | null;
  branchName: string | null;
}

export interface PlantPersonnelResponse {
  success: boolean;
  targetBranch: string;
  data: {
    supervisors: PlantPersonnelItem[];
    mechanics: PlantPersonnelItem[];
  };
}

export interface PmRadarUnit {
  unitCode: string;
  unitNumber: number;
  jobSite: string;
  status: string;
  model: string;
  vin?: string | null;
  buntutSummary: string;
  hasTelemetry: boolean;
  liveKm: number | null;
  liveHm: number | null;
  fuelLevel: number | null;
  lastTelemetryAt: string | null;
  targetKm: number | null;
  targetHm: number | null;
  remainingKm: number | null;
  remainingHm: number | null;
  kmServiceLabel: string | null;
  hmServiceLabel: string | null;
  recommendedServiceType: string;
  readinessStatus: "Overdue" | "Due Soon" | "Safe" | "No Telemetry" | string;
  lastCompletedPm?: {
    id: string;
    date: string;
    serviceType: string;
    currentKm: number | null;
    currentHm: number | null;
    mechanicName?: string | null;
  } | null;
  activeSchedule?: {
    id: string;
    date: string;
    serviceType: string;
    shift: string;
    status: string;
  } | null;
}

export interface PmRadarResponse {
  success: boolean;
  telemetryMeta: {
    onlineCount: number;
    fetchedAt: string;
    error?: string | null;
  };
  summary: {
    totalUnits: number;
    activeUnits: number;
    onlineTelemetry: number;
    overdueCount: number;
    dueSoonCount: number;
    safeCount: number;
    scheduledCount: number;
  };
  data: PmRadarUnit[];
}

export interface TyreRimTransactionItem {
  id: string;
  date: string;
  regNo?: string;
  accountCode: string;
  accountName: string;
  specification: string;
  materialCode: string;
  itemType: "Tyre" | "Rim";
  qty: number;
  debet: number;
  unitPrice: number;
  costCenter: string;
  targetUnit: string;
  position: string;
  remark: string;
  projectArea: string;
}

export interface TyreRimKPIs {
  totalTransactions: number;
  totalQty: number;
  totalCost: number;
  tyreCount: number;
  tyreQty: number;
  tyreCost: number;
  avgTyreCost: number;
  rimCount: number;
  rimQty: number;
  rimCost: number;
  avgRimCost: number;
}

export interface TyreRimSpecSummary {
  specification: string;
  itemType: "Tyre" | "Rim" | string;
  count: number;
  qty: number;
  totalCost: number;
  avgPrice: number;
  percentQty: number;
  percentCost: number;
}

export interface TyreRimUnitSummary {
  unitCode: string;
  count: number;
  qty: number;
  tyreQty: number;
  rimQty: number;
  totalCost: number;
}

export interface TyreRimDailyPoint {
  date: string;
  tyreQty: number;
  rimQty: number;
  totalQty: number;
  totalCost: number;
}

export interface TyreRimUsageResponse {
  success: boolean;
  period?: {
    id: string;
    periodName: string;
    startDate?: string;
    endDate?: string;
  };
  kpis: TyreRimKPIs;
  specBreakdown: TyreRimSpecSummary[];
  topUnits: TyreRimUnitSummary[];
  dailyTimeline: TyreRimDailyPoint[];
  positionSummary: {
    PrimeMover: number;
    Dolly: number;
    Vessel1: number;
    Vessel2: number;
    Other: number;
  };
  transactions: TyreRimTransactionItem[];
}

export interface DailyBreakdownItem {
  id: string;
  jobSite: string;
  date: string; // YYYY-MM-DD
  unitCode: string;
  unitType?: string | null;
  woNumber?: string | null;
  hm?: number | null;
  km?: number | null;
  category: "SCM" | "USM" | "TSM" | "TUM" | "ICM" | string;
  startTime?: string | null;
  finishTime?: string | null;
  durationHours: number;
  breakdownDescription: string;
  detailActivity?: string | null;
  component?: string | null;
  mechanic?: string | null;
  supervisor?: string | null;
  location?: string | null;
  status: "Open" | "Close" | string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: {
    unitCode: string;
    brand: string;
    model: string;
    category: string;
    status: string;
    currentHm?: number | null;
    currentKm?: number | null;
  } | null;
}

export interface DailyBreakdownSummary {
  total: number;
  open: number;
  close: number;
  totalDurationHours: number;
  categories: {
    SCM: number;
    USM: number;
    TSM: number;
    TUM: number;
    ICM: number;
  };
}

export interface DailyBreakdownResponse {
  success: boolean;
  data: DailyBreakdownItem[];
  summary: DailyBreakdownSummary;
}

export interface DailyBreakdownInput {
  date: string;
  jobSite?: string;
  unitCode: string;
  unitType?: string;
  woNumber?: string;
  hm?: number | null;
  km?: number | null;
  category: string;
  startTime?: string;
  finishTime?: string;
  durationHours?: number;
  breakdownDescription: string;
  detailActivity?: string;
  component?: string;
  mechanic?: string;
  supervisor?: string;
  location?: string;
  status?: string;
  notes?: string;
}

