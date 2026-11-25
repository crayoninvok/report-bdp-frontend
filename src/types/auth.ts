export type UserRole = "SuperAdmin" | "User";
export type JobSite = "MuaraPahu" | "Senyiur" | "HeadOffice";

export const DEPARTMENTS = [
  "PLANT",
  "OPERATION",
  "PRODUCTION & ENGINEERING",
  "HSE",
  "HRGA",
  "INFRASTRUCTURE",
  "ACCOUNTING",
  "FINANCE",
  "PROCUREMENT",
  "LOGISTIC",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jobSite: JobSite;
  department?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message?: string;
  user?: User;
  error?: string;
}
