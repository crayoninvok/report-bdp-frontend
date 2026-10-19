import { API_BASE_URL } from "./apiConfig";
import {
  DailyProduction,
  ProductionStats,
  ProductionTargets,
  UACalculatorInput,
  UACalculatorResult,
} from "../types/production";
import { JobSite } from "../types/auth";
import baselineData from "./baselineProductionData.json";

const STORAGE_KEY = "bdp_production_daily_records";

export const DEFAULT_PRODUCTION_TARGETS: ProductionTargets = {
  pa: 0.93,
  ua: 0.88,
  payload: 205.0,
  cycleTime: 7.5,
  fuelRatio: 1.55,
  unitRunning: 43,
  tdp: 2.7,
  dailyProductionBase: 13266.67,
  dailyProductionQ4: 21645.16,
  monthlyProductionBase: 398000,
  monthlyProductionTarget: 671000,
};

function getLocalRecords(): DailyProduction[] {
  if (typeof window === "undefined") return baselineData as unknown as DailyProduction[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load production records from localStorage:", e);
  }
  return baselineData as unknown as DailyProduction[];
}

function saveLocalRecords(records: DailyProduction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("Failed to save production records to localStorage:", e);
  }
}

export const productionService = {
  /**
   * Fetch daily production records
   */
  async getDailyProductions(filters?: {
    site?: JobSite | "all";
    weekNumber?: string;
    month?: string | number;
    year?: string | number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ data: DailyProduction[]; targets: ProductionTargets }> {
    const query = new URLSearchParams();
    if (filters?.site && filters.site !== "all") query.append("site", filters.site);
    if (filters?.weekNumber && filters.weekNumber !== "all") query.append("weekNumber", filters.weekNumber);
    if (filters?.month) query.append("month", String(filters.month));
    if (filters?.year) query.append("year", String(filters.year));
    if (filters?.startDate) query.append("startDate", filters.startDate);
    if (filters?.endDate) query.append("endDate", filters.endDate);
    if (filters?.search) query.append("search", filters.search);

    try {
      const res = await fetch(`${API_BASE_URL}/production/daily?${query.toString()}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          saveLocalRecords(json.data);
          return {
            data: json.data,
            targets: json.targets || DEFAULT_PRODUCTION_TARGETS,
          };
        }
      }
    } catch (e) {
      console.warn("Network error fetching productions, using local fallback:", e);
    }

    // Fallback to local stored records
    let list = getLocalRecords();
    if (filters?.site && filters.site !== "all") {
      list = list.filter((r) => r.jobSite === filters.site);
    }
    if (filters?.weekNumber && filters.weekNumber !== "all") {
      list = list.filter((r) => r.weekNumber.toLowerCase() === filters.weekNumber?.toLowerCase());
    }
    if (filters?.startDate && filters?.endDate) {
      list = list.filter((r) => r.date >= (filters.startDate as string) && r.date <= (filters.endDate as string));
    }
    if (filters?.search && filters.search.trim() !== "") {
      const q = filters.search.toLowerCase();
      list = list.filter((r) =>
        r.date.includes(q) ||
        r.weekNumber.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    return { data: list, targets: DEFAULT_PRODUCTION_TARGETS };
  },

  /**
   * Fetch KPI statistics and weekly aggregates
   */
  async getProductionStats(filters?: {
    site?: JobSite | "all";
    year?: string | number;
    month?: string | number;
    weekNumber?: string;
  }): Promise<ProductionStats> {
    const query = new URLSearchParams();
    if (filters?.site && filters.site !== "all") query.append("site", filters.site);
    if (filters?.year) query.append("year", String(filters.year));
    if (filters?.month) query.append("month", String(filters.month));
    if (filters?.weekNumber && filters.weekNumber !== "all") query.append("weekNumber", filters.weekNumber);

    try {
      const res = await fetch(`${API_BASE_URL}/production/daily/stats?${query.toString()}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn("Network error fetching production stats, calculating locally:", e);
    }

    // Local stats fallback
    const records = getLocalRecords();
    const totalDays = records.length;
    if (totalDays === 0) {
      return {
        totalDays: 0,
        totalProduction: 0,
        avgProductionDaily: 0,
        avgPa: 0,
        avgUa: 0,
        avgPayload: 0,
        avgCycleTime: 0,
        avgFuelRatio: 0,
        avgUnitRunning: 0,
        avgTdp: 0,
        targets: DEFAULT_PRODUCTION_TARGETS,
        achievement: {
          paPercent: 0,
          uaPercent: 0,
          payloadPercent: 0,
          cycleTimePercent: 0,
          fuelRatioPercent: 0,
          tdpPercent: 0,
          productionPercent: 0,
        },
        weeklyKpis: [],
      };
    }

    const totalProd = records.reduce((acc, r) => acc + r.production, 0);
    const avgPa = records.reduce((acc, r) => acc + r.pa, 0) / totalDays;
    const avgUa = records.reduce((acc, r) => acc + r.ua, 0) / totalDays;
    const avgPayload = records.reduce((acc, r) => acc + r.payload, 0) / totalDays;
    const avgCycleTime = records.reduce((acc, r) => acc + r.cycleTime, 0) / totalDays;
    const avgFuelRatio = records.reduce((acc, r) => acc + r.fuelRatio, 0) / totalDays;
    const avgUnitRunning = records.reduce((acc, r) => acc + r.unitRunning, 0) / totalDays;
    const avgTdp = records.reduce((acc, r) => acc + r.tdp, 0) / totalDays;

    // Group by weekNumber for weekly KPI analysis (matching Sheet 'Grafik KPI 2026' & 'Indikator KPI W30-W53')
    const weekMap = new Map<string, typeof records>();
    records.forEach((r) => {
      const list = weekMap.get(r.weekNumber) || [];
      list.push(r);
      weekMap.set(r.weekNumber, list);
    });

    let maxWeek = 41;
    records.forEach((r) => {
      const num = parseInt(r.weekNumber.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > maxWeek) maxWeek = num;
    });

    const weeklyKpis = [];
    for (let i = 30; i <= maxWeek; i++) {
      const wStr = `W${String(i).padStart(2, "0")}`;
      const weekRecords = weekMap.get(wStr);

      if (weekRecords && weekRecords.length > 0) {
        const count = weekRecords.length;
        const wProd = weekRecords.reduce((acc, r) => acc + r.production, 0);
        const wPa = weekRecords.reduce((acc, r) => acc + r.pa, 0) / count;
        const wUa = weekRecords.reduce((acc, r) => acc + r.ua, 0) / count;
        const wPayload = weekRecords.reduce((acc, r) => acc + r.payload, 0) / count;
        const wCycleTime = weekRecords.reduce((acc, r) => acc + r.cycleTime, 0) / count;
        const wFuelRatio = weekRecords.reduce((acc, r) => acc + r.fuelRatio, 0) / count;
        const wUnit = weekRecords.reduce((acc, r) => acc + r.unitRunning, 0) / count;
        const wTdp = weekRecords.reduce((acc, r) => acc + r.tdp, 0) / count;

        weeklyKpis.push({
          weekNumber: wStr,
          daysCount: count,
          startDate: weekRecords[0].date,
          endDate: weekRecords[weekRecords.length - 1].date,
          paActual: Number(wPa.toFixed(4)),
          paTarget: DEFAULT_PRODUCTION_TARGETS.pa,
          uaActual: Number(wUa.toFixed(4)),
          uaTarget: DEFAULT_PRODUCTION_TARGETS.ua,
          payloadActual: Number(wPayload.toFixed(2)),
          payloadTarget: DEFAULT_PRODUCTION_TARGETS.payload,
          cycleTimeActual: Number(wCycleTime.toFixed(2)),
          cycleTimeTarget: DEFAULT_PRODUCTION_TARGETS.cycleTime,
          fuelRatioActual: Number(wFuelRatio.toFixed(3)),
          fuelRatioTarget: DEFAULT_PRODUCTION_TARGETS.fuelRatio,
          unitRunningActual: Number(wUnit.toFixed(1)),
          unitRunningTarget: DEFAULT_PRODUCTION_TARGETS.unitRunning,
          tdpActual: Number(wTdp.toFixed(2)),
          tdpTarget: DEFAULT_PRODUCTION_TARGETS.tdp,
          productionActual: Number(wProd.toFixed(2)),
        });
      } else {
        weeklyKpis.push({
          weekNumber: wStr,
          daysCount: 0,
          startDate: "",
          endDate: "",
          paActual: 0,
          paTarget: DEFAULT_PRODUCTION_TARGETS.pa,
          uaActual: 0,
          uaTarget: DEFAULT_PRODUCTION_TARGETS.ua,
          payloadActual: 0,
          payloadTarget: DEFAULT_PRODUCTION_TARGETS.payload,
          cycleTimeActual: 0,
          cycleTimeTarget: DEFAULT_PRODUCTION_TARGETS.cycleTime,
          fuelRatioActual: 0,
          fuelRatioTarget: DEFAULT_PRODUCTION_TARGETS.fuelRatio,
          unitRunningActual: 0,
          unitRunningTarget: DEFAULT_PRODUCTION_TARGETS.unitRunning,
          tdpActual: 0,
          tdpTarget: DEFAULT_PRODUCTION_TARGETS.tdp,
          productionActual: 0,
        });
      }
    }

    const allWeeksKpis = [];
    for (let i = 1; i <= 53; i++) {
      const wStr = `W${String(i).padStart(2, "0")}`;
      const found = weeklyKpis.find((w) => w.weekNumber === wStr);
      if (found) {
        allWeeksKpis.push(found);
      } else {
        allWeeksKpis.push({
          weekNumber: wStr,
          daysCount: 0,
          startDate: "",
          endDate: "",
          paActual: 0,
          paTarget: DEFAULT_PRODUCTION_TARGETS.pa,
          uaActual: 0,
          uaTarget: DEFAULT_PRODUCTION_TARGETS.ua,
          payloadActual: 0,
          payloadTarget: DEFAULT_PRODUCTION_TARGETS.payload,
          cycleTimeActual: 0,
          cycleTimeTarget: DEFAULT_PRODUCTION_TARGETS.cycleTime,
          fuelRatioActual: 0,
          fuelRatioTarget: DEFAULT_PRODUCTION_TARGETS.fuelRatio,
          unitRunningActual: 0,
          unitRunningTarget: DEFAULT_PRODUCTION_TARGETS.unitRunning,
          tdpActual: 0,
          tdpTarget: DEFAULT_PRODUCTION_TARGETS.tdp,
          productionActual: 0,
        });
      }
    }

    return {
      totalDays,
      totalProduction: Number(totalProd.toFixed(2)),
      avgProductionDaily: Number((totalProd / totalDays).toFixed(2)),
      avgPa: Number(avgPa.toFixed(4)),
      avgUa: Number(avgUa.toFixed(4)),
      avgPayload: Number(avgPayload.toFixed(2)),
      avgCycleTime: Number(avgCycleTime.toFixed(2)),
      avgFuelRatio: Number(avgFuelRatio.toFixed(3)),
      avgUnitRunning: Number(avgUnitRunning.toFixed(1)),
      avgTdp: Number(avgTdp.toFixed(2)),
      targets: DEFAULT_PRODUCTION_TARGETS,
      achievement: {
        paPercent: Number(((avgPa / DEFAULT_PRODUCTION_TARGETS.pa) * 100).toFixed(1)),
        uaPercent: Number(((avgUa / DEFAULT_PRODUCTION_TARGETS.ua) * 100).toFixed(1)),
        payloadPercent: Number(((avgPayload / DEFAULT_PRODUCTION_TARGETS.payload) * 100).toFixed(1)),
        cycleTimePercent: Number(((DEFAULT_PRODUCTION_TARGETS.cycleTime / avgCycleTime) * 100).toFixed(1)),
        fuelRatioPercent: Number(((DEFAULT_PRODUCTION_TARGETS.fuelRatio / avgFuelRatio) * 100).toFixed(1)),
        tdpPercent: Number(((avgTdp / DEFAULT_PRODUCTION_TARGETS.tdp) * 100).toFixed(1)),
        productionPercent: Number((((totalProd / totalDays) / DEFAULT_PRODUCTION_TARGETS.dailyProductionQ4) * 100).toFixed(1)),
      },
      weeklyKpis,
      allWeeksKpis,
    };
  },

  /**
   * Create daily production record
   */
  async createDailyProduction(data: Partial<DailyProduction>): Promise<DailyProduction> {
    try {
      const res = await fetch(`${API_BASE_URL}/production/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = getLocalRecords();
          const existingIdx = list.findIndex((r) => r.date === json.data.date);
          if (existingIdx >= 0) {
            list[existingIdx] = json.data;
          } else {
            list.unshift(json.data);
          }
          saveLocalRecords(list);
          return json.data;
        }
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal menyimpan data produksi");
    } catch (e: any) {
      console.warn("Offline create production:", e);
      const newRec: DailyProduction = {
        id: "local-" + Date.now(),
        jobSite: (data.jobSite as JobSite) || "MuaraPahu",
        date: data.date || new Date().toISOString().slice(0, 10),
        weekNumber: data.weekNumber || "W31",
        pa: data.pa || 0.93,
        ua: data.ua || 0.88,
        payload: data.payload || 205,
        cycleTime: data.cycleTime || 7.5,
        fuelRatio: data.fuelRatio || 1.55,
        unitRunning: data.unitRunning || 43,
        tdp: data.tdp || 2.7,
        production: data.production || (data.unitRunning || 43) * (data.payload || 205) * (data.tdp || 2.7),
        notes: data.notes || null,
      };
      const list = getLocalRecords();
      list.unshift(newRec);
      saveLocalRecords(list);
      return newRec;
    }
  },

  /**
   * Update daily production record
   */
  async updateDailyProduction(id: string, data: Partial<DailyProduction>): Promise<DailyProduction> {
    try {
      const res = await fetch(`${API_BASE_URL}/production/daily/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list = getLocalRecords();
          const idx = list.findIndex((r) => r.id === id);
          if (idx >= 0) {
            list[idx] = json.data;
            saveLocalRecords(list);
          }
          return json.data;
        }
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Gagal memperbarui data produksi");
    } catch (e: any) {
      const list = getLocalRecords();
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data } as DailyProduction;
        saveLocalRecords(list);
        return list[idx];
      }
      throw e;
    }
  },

  /**
   * Delete daily production record
   */
  async deleteDailyProduction(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/production/daily/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const list = getLocalRecords().filter((r) => r.id !== id);
        saveLocalRecords(list);
        return true;
      }
    } catch (e) {
      console.warn("Offline delete production:", e);
    }
    const list = getLocalRecords().filter((r) => r.id !== id);
    saveLocalRecords(list);
    return true;
  },

  /**
   * Sync from bundled Excel file on server
   */
  async syncBundledExcel(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const res = await fetch(`${API_BASE_URL}/production/daily/sync-bundled-excel`, {
        method: "POST",
      });
      const json = await res.json();
      return json;
    } catch (e: any) {
      return {
        success: false,
        message: e.message || "Gagal menyinkronkan file Excel master",
      };
    }
  },

  /**
   * Upload custom Excel file
   */
  async uploadExcel(file: File, jobSite: JobSite): Promise<{ success: boolean; message: string; count?: number }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobSite", jobSite);

    try {
      const res = await fetch(`${API_BASE_URL}/production/daily/upload-excel`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      return json;
    } catch (e: any) {
      return {
        success: false,
        message: e.message || "Gagal mengunggah file Excel",
      };
    }
  },

  /**
   * Calculate UA based on formula from sheet 'Kalkulator UA'
   */
  calculateUAOffline(input: UACalculatorInput): UACalculatorResult {
    const calH = input.calendarHours || 24;
    const delayH = input.plannedDelay !== undefined ? input.plannedDelay : 2.3333333333333335;
    const paVal = input.pa > 1 ? input.pa / 100 : input.pa;
    const tgtTrip = input.targetTrip || 3.0;
    const actTrip = input.actualTrip || 3.03;

    const effectiveHours = Math.max(0, calH - delayH);
    const uaPotential = calH > 0 ? (calH - delayH) / calH : 0;
    const tripAchievement = tgtTrip > 0 ? actTrip / tgtTrip : 0;
    const equivalentWorkingHours = effectiveHours * tripAchievement;
    const lostTimeOperational = effectiveHours - equivalentWorkingHours;
    const uaActual = Math.min(1.0, paVal * uaPotential * tripAchievement);
    const diffToPotential = uaPotential - uaActual;

    return {
      calendarHours: calH,
      plannedDelay: Number(delayH.toFixed(2)),
      effectiveHours: Number(effectiveHours.toFixed(2)),
      pa: Number(paVal.toFixed(4)),
      paPercent: Number((paVal * 100).toFixed(1)),
      targetTrip: tgtTrip,
      actualTrip: actTrip,
      uaPotential: Number(uaPotential.toFixed(4)),
      uaPotentialPercent: Number((uaPotential * 100).toFixed(2)),
      tripAchievement: Number(tripAchievement.toFixed(4)),
      tripAchievementPercent: Number((tripAchievement * 100).toFixed(1)),
      equivalentWorkingHours: Number(equivalentWorkingHours.toFixed(2)),
      lostTimeOperational: Number(lostTimeOperational.toFixed(2)),
      uaActual: Number(uaActual.toFixed(4)),
      uaActualPercent: Number((uaActual * 100).toFixed(2)),
      diffToPotential: Number(diffToPotential.toFixed(4)),
      targetUa: DEFAULT_PRODUCTION_TARGETS.ua,
      isAchieved: uaActual >= DEFAULT_PRODUCTION_TARGETS.ua,
    };
  },
};
