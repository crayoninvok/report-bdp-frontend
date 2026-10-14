export type UserRole = "SuperAdmin" | "User";
export type JobSite = "MuaraPahu" | "Senyiur" | "HeadOffice";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jobSite: JobSite;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message?: string;
  user?: User;
  error?: string;
}
