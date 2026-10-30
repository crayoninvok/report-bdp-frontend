import { API_BASE_URL } from "./apiConfig";

export interface AssetFindrLocationRoute {
  id: string;
  start_location_id?: string;
  start_location_name?: string;
  end_location_id?: string;
  end_location_name?: string;
  operation_start_date?: string;
  distance_km?: number;
  is_estimation_distance_km?: boolean;
  last_updated_date?: string;
  last_updated_by_name?: string;
  is_latest_combination?: boolean;
  utc_offset?: number;
  utc_label?: string;
}

export interface AssetFindrMaterial {
  id: string;
  name: string;
  description?: string;
  status_code?: string;
}

export interface WeighBridgeTicket {
  id: string;
  reference_id: string;
  vehicle_asset_id?: string;
  vehicle_reference_number?: string;
  vehicle_serial_number?: string;
  vehicle_name?: string;
  inbound_at?: string;
  inbound_weight_kg?: number;
  inbound_weight_bridge_location_id?: string;
  inbound_weight_bridge_location_label?: string;
  inbound_weight_bridge_location_alias?: string;
  inbound_operator_user_id?: string;
  inbound_operator_user_first_name?: string;
  inbound_operator_user_last_name?: string;
  inbound_operator_user_full_name?: string;
  inbound_operator_user_phone_number?: string;
  inbound_location_id?: string;
  inbound_location_label?: string;
  inbound_location_alias?: string;
  outbound_at?: string;
  outbound_weight_kg?: number;
  outbound_weight_bridge_location_id?: string;
  outbound_weight_bridge_location_label?: string;
  outbound_weight_bridge_location_alias?: string;
  outbound_operator_user_id?: string;
  outbound_operator_user_first_name?: string;
  outbound_operator_user_last_name?: string;
  outbound_operator_user_full_name?: string;
  outbound_operator_user_phone_number?: string;
  outbound_location_id?: string;
  outbound_location_label?: string;
  outbound_location_alias?: string;
  net_weight?: number; // kg
  work_shift_id?: string;
  work_shift_alias?: string;
  work_shift_name?: string;
  location_route_id?: string;
  location_route?: AssetFindrLocationRoute;
  material_id?: string;
  material?: AssetFindrMaterial;
  remark?: string;
  ticket_date?: string;
  reconciliation_date?: string;
  reconciliation_time_display?: string;
  created_at?: string;
  created_by?: string;
  created_by_full_name?: string;
  created_by_phone_number?: string;
  created_by_reference_id?: string;
  updated_at?: string;
  updated_by?: string;
  updated_by_full_name?: string;
  updated_by_phone_number?: string;
  updated_by_reference_id?: string;
}

export interface WeighBridgeTicketsQuery {
  client_id?: string;
  page_no?: number;
  page_size?: number;
  search_keyword?: string;
  ticket_date_start?: string;
  ticket_date_end?: string;
  reconciliation_date_start?: string;
  reconciliation_date_end?: string;
}

export interface WeighBridgeTicketsResponse {
  success: boolean;
  isLive: boolean;
  isDemo?: boolean;
  message?: string;
  error?: string;
  total_records: number;
  page_size: number;
  page_no: number;
  data: WeighBridgeTicket[];
}

const TOKEN_STORAGE_KEY = "batara_assetfindr_token";

export const assetfindrService = {
  /**
   * Get stored Bearer token from browser localStorage
   */
  getStoredToken(): string {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  },

  /**
   * Save Bearer token to browser localStorage
   */
  setStoredToken(token: string): void {
    if (typeof window === "undefined") return;
    try {
      if (token && token.trim()) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      console.error("Gagal menyimpan token ke localStorage:", err);
    }
  },

  /**
   * Remove stored token
   */
  removeStoredToken(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (err) {
      console.error("Gagal menghapus token:", err);
    }
  },

  /**
   * Test connection to AssetFindr API
   */
  async testConnection(
    customToken?: string,
    clientId = "batara"
  ): Promise<{ success: boolean; message: string; total_records?: number }> {
    const token = customToken !== undefined ? customToken : this.getStoredToken();
    try {
      const res = await fetch(`${API_BASE_URL}/assetfindr/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-assetfindr-token": token,
        },
        body: JSON.stringify({ token, client_id: clientId }),
      });

      const data = await res.json();
      return data;
    } catch (error: any) {
      return {
        success: false,
        message: "Gagal menghubungi server: " + (error.message || "Network Error"),
      };
    }
  },

  /**
   * Fetch WeighBridge Tickets with parameters
   */
  async getTickets(
    query: WeighBridgeTicketsQuery = {},
    overrideToken?: string
  ): Promise<WeighBridgeTicketsResponse> {
    const token = overrideToken !== undefined ? overrideToken : this.getStoredToken();
    const params = new URLSearchParams();

    if (query.client_id) params.set("client_id", query.client_id);
    if (query.page_no) params.set("page_no", String(query.page_no));
    if (query.page_size) params.set("page_size", String(query.page_size));
    if (query.search_keyword) params.set("search_keyword", query.search_keyword);
    if (query.ticket_date_start) params.set("ticket_date_start", query.ticket_date_start);
    if (query.ticket_date_end) params.set("ticket_date_end", query.ticket_date_end);
    if (query.reconciliation_date_start)
      params.set("reconciliation_date_start", query.reconciliation_date_start);
    if (query.reconciliation_date_end)
      params.set("reconciliation_date_end", query.reconciliation_date_end);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["x-assetfindr-token"] = token;
    }

    const res = await fetch(`${API_BASE_URL}/assetfindr/tickets?${params.toString()}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  },
};
