import { JobSite } from "./auth";

export interface ReportSummary {
  id: string;
  jobSite: JobSite;
  periodName: string;
  startDate: string;
  endDate: string;
  year: number;
  weekNumber: number;
  status: string;
  budgetProduksi: number;
  realisasiProduksi: number;
  updatedAt: string;
}

export interface EnrichedReportItem {
  id: string;
  accountCode?: string | null;
  accountName: string;
  costBehavior?: string | null;
  accountGroup?: string | null;
  subCategory?: string | null;
  orderIndex: number;
  isParent: boolean;
  parentName: string | null;
  // Weekly
  weeklyBudget: number;
  weeklyPercentTCBudget: number;
  weeklyIdrPerTonBudget: number;
  weeklyRealisasi: number;
  weeklyPercentTCRealisasi: number;
  weeklyIdrPerTonRealisasi: number;
  weeklyCostUnderOverPerTon: number;
  weeklyCostUnderOver: number;
  // YTD
  ytdBudget: number;
  ytdPercentTCBudget: number;
  ytdIdrPerTonBudget: number;
  ytdRealisasi: number;
  ytdPercentTCRealisasi: number;
  ytdIdrPerTonRealisasi: number;
  ytdCostUnderOverPerTon: number;
  ytdCostUnderOver: number;
}

export interface BiayaProduksiSummary {
  weeklyBudget: number;
  weeklyPercentTCBudget: number;
  weeklyIdrPerTonBudget: number;
  weeklyRealisasi: number;
  weeklyPercentTCRealisasi: number;
  weeklyIdrPerTonRealisasi: number;
  weeklyCostUnderOverPerTon: number;
  weeklyCostUnderOver: number;
  ytdBudget: number;
  ytdPercentTCBudget: number;
  ytdIdrPerTonBudget: number;
  ytdRealisasi: number;
  ytdPercentTCRealisasi: number;
  ytdIdrPerTonRealisasi: number;
  ytdCostUnderOverPerTon: number;
  ytdCostUnderOver: number;
}

export interface ProduksiSummary {
  weeklyBudget: number;
  weeklyRealisasi: number;
  weeklyVariance: number;
  weeklyPercent: number;
  ytdBudget: number;
  ytdRealisasi: number;
  ytdVariance: number;
  ytdPercent: number;
}

export interface ReportDetails {
  report: {
    id: string;
    jobSite: JobSite;
    periodName: string;
    startDate: string;
    endDate: string;
    year: number;
    weekNumber: number;
    status: string;
    updatedAt: string;
  };
  produksi: ProduksiSummary;
  biayaProduksi: BiayaProduksiSummary;
  items: EnrichedReportItem[];
}

export interface PLSummaryOpsItemData {
  id: string;
  summaryId: string;
  accountName: string;
  orderIndex: number;
  budgetCost: number;
  budgetPercentNS: number;
  budgetIdrPerTon: number;
  realisasiCost: number;
  realisasiPercentNS: number;
  realisasiIdrPerTon: number;
  achPercent: number;
  costUnderOverPerTon: number;
  costUnderOver: number;
}

export interface PLSummaryOpsData {
  id: string;
  jobSite: JobSite;
  year: number;
  month: number;
  monthLabel: string;
  periodName: string;
  budgetProduksi: number;
  realisasiProduksi: number;
  achProduksiPercent: number;
  items: PLSummaryOpsItemData[];
  createdAt: string;
  updatedAt: string;
}

