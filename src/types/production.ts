import { JobSite } from "./auth";

export interface DailyProduction {
  id: string;
  jobSite: JobSite;
  date: string; // YYYY-MM-DD
  weekNumber: string; // e.g. "W31"
  pa: number; // decimal e.g. 0.9577 (95.77%)
  ua: number; // decimal e.g. 0.4789 (47.89%)
  payload: number; // Ton per truck e.g. 205.0
  cycleTime: number; // Jam e.g. 7.5
  fuelRatio: number; // L/Ton e.g. 1.55
  unitRunning: number; // Unit e.g. 43
  tdp: number; // Trip per day per unit e.g. 2.7
  production: number; // Total Tonase e.g. 2199.35
  notes?: string | null; // Keterangan operasional
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionTargets {
  pa: number;
  ua: number;
  payload: number;
  cycleTime: number;
  fuelRatio: number;
  unitRunning: number;
  tdp: number;
  dailyProductionBase: number;
  dailyProductionQ4: number;
  monthlyProductionBase: number;
  monthlyProductionTarget: number;
}

export interface WeeklyKpiSummary {
  weekNumber: string;
  daysCount: number;
  startDate: string;
  endDate: string;
  paActual: number;
  paTarget: number;
  uaActual: number;
  uaTarget: number;
  payloadActual: number;
  payloadTarget: number;
  cycleTimeActual: number;
  cycleTimeTarget: number;
  fuelRatioActual: number;
  fuelRatioTarget: number;
  unitRunningActual: number;
  unitRunningTarget: number;
  tdpActual: number;
  tdpTarget: number;
  productionActual: number;
}

export interface ProductionStats {
  totalDays: number;
  totalProduction: number;
  avgProductionDaily: number;
  avgPa: number;
  avgUa: number;
  avgPayload: number;
  avgCycleTime: number;
  avgFuelRatio: number;
  avgUnitRunning: number;
  avgTdp: number;
  targets: ProductionTargets;
  achievement: {
    paPercent: number;
    uaPercent: number;
    payloadPercent: number;
    cycleTimePercent: number;
    fuelRatioPercent: number;
    tdpPercent: number;
    productionPercent: number;
  };
  weeklyKpis: WeeklyKpiSummary[];
  allWeeksKpis?: (WeeklyKpiSummary & { paActual: number | null; uaActual: number | null; payloadActual: number | null; cycleTimeActual: number | null; fuelRatioActual: number | null; tdpActual: number | null })[];
  monthlyTargets?: {
    monthKey: string;
    monthLabel: string;
    name: string;
    target: number;
    actual: number;
  }[];
}


export interface UACalculatorInput {
  calendarHours: number;
  plannedDelay: number;
  pa: number;
  targetTrip: number;
  actualTrip: number;
}

export interface UACalculatorResult {
  calendarHours: number;
  plannedDelay: number;
  effectiveHours: number;
  pa: number;
  paPercent: number;
  targetTrip: number;
  actualTrip: number;
  uaPotential: number;
  uaPotentialPercent: number;
  tripAchievement: number;
  tripAchievementPercent: number;
  equivalentWorkingHours: number;
  lostTimeOperational: number;
  uaActual: number;
  uaActualPercent: number;
  diffToPotential: number;
  targetUa: number;
  isAchieved: boolean;
}
