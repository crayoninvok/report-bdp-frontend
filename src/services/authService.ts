import { User, AuthResponse } from "../types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const STORAGE_KEY = "batara_report_user";

// Seed users fallback for instant standalone demo availability
const DEMO_USERS: Record<string, { name: string; role: "User" | "SuperAdmin"; jobSite: "MuaraPahu" | "Senyiur" | "HeadOffice"; pass: string }> = {
  "priyanto@bataramining.com": {
    name: "PM Muara Pahu 01",
    role: "User",
    jobSite: "MuaraPahu",
    pass: "mp@batara2026",
  },
  "a.oktayudhaperkasa@bataramining.com": {
    name: "PM Senyiur 01",
    role: "User",
    jobSite: "Senyiur",
    pass: "sny@batara2026",
  },
  "dzaky.athariqf@bataramining.com": {
    name: "HO Admin 01",
    role: "SuperAdmin",
    jobSite: "HeadOffice",
    pass: "@Rosdian12",
  },
};

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try to call the actual backend API first
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        if (data.user) {
          authService.saveUser(data.user);
          return data.user;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error(errorData.error || "Email atau password salah");
        }
      }
    } catch (err: any) {
      if (err.message === "Email atau password salah") {
        throw err;
      }
      // If backend is unreachable or network error, fallback to verified local demo users
      console.warn("Backend API unreachable, using local fallback authentication:", err.message);
    }

    // 2. Client-side fallback authentication
    const demo = DEMO_USERS[cleanEmail];
    if (demo && demo.pass === password) {
      const user: User = {
        id: "demo-" + Math.random().toString(36).substring(2, 9),
        name: demo.name,
        email: cleanEmail,
        role: demo.jobSite === "HeadOffice" ? "SuperAdmin" : demo.role,
        jobSite: demo.jobSite,
      };
      authService.saveUser(user);
      return user;
    }

    throw new Error("Email atau kata sandi tidak valid");
  },

  saveUser(user: User): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  },

  getCurrentUser(): User | null {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.jobSite === "HeadOffice" && parsed.role !== "SuperAdmin") {
            parsed.role = "SuperAdmin";
            authService.saveUser(parsed);
          }
          return parsed;
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
};
