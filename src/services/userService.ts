import { User, JobSite, UserRole } from "../types/auth";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiConfig";
const LOCAL_USERS_KEY = "batara_managed_users_cache";

function getAuthHeaders(): Record<string, string> {
  const user = authService.getCurrentUser();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (user) {
    headers["x-user-role"] = user.role;
    headers["x-user-jobsite"] = user.jobSite;
    headers["x-user-id"] = user.id;
    headers["x-user-email"] = user.email;
  }
  return headers;
}

const DEFAULT_DEMO_USERS: User[] = [
  {
    id: "usr-01",
    name: "HO Admin 01",
    email: "dzaky.athariqf@bataramining.com",
    role: "SuperAdmin",
    jobSite: "HeadOffice",
    createdAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "usr-02",
    name: "PM Muara Pahu 01",
    email: "priyanto@bataramining.com",
    role: "User",
    jobSite: "MuaraPahu",
    createdAt: "2026-01-02T08:00:00.000Z",
  },
  {
    id: "usr-03",
    name: "PM Senyiur 01",
    email: "a.oktayudhaperkasa@bataramining.com",
    role: "User",
    jobSite: "Senyiur",
    createdAt: "2026-01-03T08:00:00.000Z",
  },
];

export const userService = {
  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(data.data));
          }
          return data.data;
        }
      }
    } catch (err: any) {
      console.warn("API unreachable, loading cached/fallback users:", err.message);
    }

    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(LOCAL_USERS_KEY);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // fall through
        }
      }
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_DEMO_USERS));
    }
    return DEFAULT_DEMO_USERS;
  },

  async createUser(payload: {
    name: string;
    email: string;
    password: string;
    jobSite: JobSite;
    role?: UserRole;
  }): Promise<User> {
    const resolvedRole: UserRole =
      payload.jobSite === "HeadOffice" ? "SuperAdmin" : payload.role || "User";

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...payload,
          role: resolvedRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
      if (!res.ok) {
        throw new Error(data.message || "Gagal membuat pengguna baru");
      }
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch")) {
        throw err;
      }
      console.warn("Backend unavailable, saving locally:", err.message);
    }

    // Local fallback
    const currentUsers = await this.getUsers();
    if (currentUsers.some((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase())) {
      throw new Error("Email sudah terdaftar pada sistem");
    }

    const newUser: User = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      jobSite: payload.jobSite,
      role: resolvedRole,
      createdAt: new Date().toISOString(),
    };

    const updated = [newUser, ...currentUsers];
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
    }
    return newUser;
  },

  async updateUser(
    id: string,
    payload: {
      name?: string;
      email?: string;
      password?: string;
      jobSite?: JobSite;
      role?: UserRole;
    }
  ): Promise<User> {
    const resolvedRole: UserRole | undefined =
      payload.jobSite === "HeadOffice" ? "SuperAdmin" : payload.role;

    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...payload,
          role: resolvedRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return data.data;
      }
      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui data pengguna");
      }
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch")) {
        throw err;
      }
      console.warn("Backend unavailable, updating locally:", err.message);
    }

    // Local fallback
    const currentUsers = await this.getUsers();
    const index = currentUsers.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error("Pengguna tidak ditemukan");
    }

    const updatedUser: User = {
      ...currentUsers[index],
      name: payload.name ? payload.name.trim() : currentUsers[index].name,
      email: payload.email ? payload.email.trim().toLowerCase() : currentUsers[index].email,
      jobSite: payload.jobSite || currentUsers[index].jobSite,
      role:
        (payload.jobSite === "HeadOffice"
          ? "SuperAdmin"
          : payload.role || currentUsers[index].role) as UserRole,
      updatedAt: new Date().toISOString(),
    };

    currentUsers[index] = updatedUser;
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(currentUsers));
    }
    return updatedUser;
  },

  async deleteUser(id: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
      if (!res.ok) {
        throw new Error(data.message || "Gagal menghapus pengguna");
      }
    } catch (err: any) {
      if (err.message && !err.message.includes("fetch")) {
        throw err;
      }
      console.warn("Backend unavailable, deleting locally:", err.message);
    }

    // Local fallback
    const currentUsers = await this.getUsers();
    const filtered = currentUsers.filter((u) => u.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
    }
    return { success: true };
  },
};
