import { API_BASE_URL } from "./apiConfig";

export interface VolvoUnit {
  vin: string;
  customerVehicleName: string;
  pmNumber: string;
  chassisNumber: string;
  brand: string;
  model: string;
  type: string;
  emissionLevel?: string;
  productionDate?: {
    day?: number;
    month?: number;
    year?: number;
  };
  latitude: number | null;
  longitude: number | null;
  heading: number;
  altitude: number;
  speed: number;
  wheelBasedSpeed: number;
  tachographSpeed: number;
  positionDateTime: string | null;
  receivedDateTime: string | null;
  triggerType?: string | null;
  isMoving: boolean;
  hasGps: boolean;
  status: "moving" | "idle" | "offline";
}

export interface VolvoSummary {
  totalUnits: number;
  movingUnits: number;
  idleUnits: number;
  offlineUnits: number;
  averageMovingSpeed: number;
  serverTime: string;
}

export interface VolvoMonitoringResponse {
  success: boolean;
  summary: VolvoSummary;
  data: VolvoUnit[];
  cached?: boolean;
  cacheAgeMs?: number;
}

export const volvoService = {
  /**
   * Get live monitoring units from backend API
   */
  async getLiveMonitoring(force = false): Promise<VolvoMonitoringResponse> {
    const url = `${API_BASE_URL}/volvo/monitoring${force ? "?force=true" : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Gagal mengambil data Live Monitoring (${res.status})`);
    }

    return res.json();
  },
};
