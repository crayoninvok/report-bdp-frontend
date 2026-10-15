/**
 * Centralized API Configuration for Frontend
 *
 * Normalizes NEXT_PUBLIC_API_URL:
 * - Trims whitespace and strips any trailing slashes
 * - Automatically appends '/api' if the user entered only the base domain (e.g. 'https://my-backend.vercel.app')
 * - Falls back to local dev server ('http://localhost:5000/api') when NEXT_PUBLIC_API_URL is unset
 */
function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return "http://localhost:5000/api";
  }

  const clean = envUrl.trim().replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();
