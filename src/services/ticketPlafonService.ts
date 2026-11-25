import { API_BASE_URL } from "./apiConfig";

export interface TicketPlafonItem {
  id: string;
  employeeId: string;
  fullName: string;
  branchName: string | null;
  site: string;
  jobPosition: string | null;
  organization: string | null;
  jobStatus: string | null;
  pointOfHire: string | null;
  plafonAmount: number;
  usedAmount: number;
  remainingAmount: number;
  lastDepartureDate: string | null;
  nextResetDate: string | null;
  daysUntilReset: number | null;
  isResetEligible: boolean;
  ticketCount: number;
  notes: string | null;
  resetCycleDays?: number;
  plafonId: string | null;
}

export interface TicketPlafonSummary {
  totalEmployees: number;
  totalNonLokalAll: number;
  totalSenyiur: number;
  totalMuaraPahu: number;
  totalHoJakarta?: number;
  totalPlafonAllocated: number;
  totalPlafonUsed: number;
  totalPlafonRemaining: number;
  countDueForReset: number;
  countActiveTicketUsage: number;
}

export interface TicketUsageHistoryItem {
  id: string;
  employeeId: string;
  ticketNumber: string | null;
  destination: string | null;
  airline: string | null;
  departureDate: string;
  returnDate: string | null;
  ticketCost: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface TicketPlafonResponse {
  success: boolean;
  data: TicketPlafonItem[];
  summary: TicketPlafonSummary;
  message?: string;
}

export async function getTicketPlafonList(params?: {
  site?: string;
  search?: string;
  department?: string;
}): Promise<TicketPlafonResponse> {
  const query = new URLSearchParams();
  if (params?.site) query.append("site", params.site);
  if (params?.search) query.append("search", params.search);
  if (params?.department) query.append("department", params.department);

  const res = await fetch(`${API_BASE_URL}/ticket-plafon?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat data Ticket Plafon: ${res.statusText}`);
  }
  return res.json();
}

export async function recordTicketUsage(payload: {
  employeeId: string;
  ticketNumber?: string;
  destination?: string;
  airline?: string;
  departureDate: string;
  returnDate?: string;
  ticketCost: number;
  notes?: string;
}): Promise<{ success: boolean; message: string; data: any }> {
  const res = await fetch(`${API_BASE_URL}/ticket-plafon/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gagal mencatat tiket: ${res.statusText}`);
  }
  return res.json();
}

export async function getTicketHistory(
  employeeId: string
): Promise<{ success: boolean; data: { history: TicketUsageHistoryItem[]; plafon: any } }> {
  const res = await fetch(`${API_BASE_URL}/ticket-plafon/history/${encodeURIComponent(employeeId)}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat riwayat tiket: ${res.statusText}`);
  }
  return res.json();
}

export async function updatePlafonConfig(
  employeeId: string,
  payload: { plafonAmount: number; notes?: string }
): Promise<{ success: boolean; message: string; data: any }> {
  const res = await fetch(`${API_BASE_URL}/ticket-plafon/config/${encodeURIComponent(employeeId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gagal mengubah plafon: ${res.statusText}`);
  }
  return res.json();
}

export async function resetPlafonManual(
  employeeId: string
): Promise<{ success: boolean; message: string; data: any }> {
  const res = await fetch(`${API_BASE_URL}/ticket-plafon/reset/${encodeURIComponent(employeeId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gagal reset plafon: ${res.statusText}`);
  }
  return res.json();
}
