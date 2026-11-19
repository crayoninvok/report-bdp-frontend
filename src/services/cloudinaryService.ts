"use client";

export interface CloudinaryUploadResponse {
  success: boolean;
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  folder?: string;
  error?: string;
}

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dvkc8sxpf";
const API_KEY = "864916714767455";
const API_SECRET = "WpArqR6GW61DEA8jIc_MDv3t0yg";
const DEFAULT_FOLDER = "bdp-reportapp/hse-folder";

/**
 * Calculates SHA-1 hash in browser environment using Web Crypto API
 */
async function computeSha1Browser(str: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuf = await window.crypto.subtle.digest("SHA-1", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Direct client-side signed upload to Cloudinary (fallback if local API route unavailable)
 */
async function directCloudinaryUpload(
  file: File | Blob | string,
  folder = DEFAULT_FOLDER
): Promise<CloudinaryUploadResponse> {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  const signature = await computeSha1Browser(stringToSign);

  const formData = new FormData();
  if (file instanceof File || file instanceof Blob) {
    formData.append("file", file);
  } else {
    formData.append("file", file);
  }
  formData.append("api_key", API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || "Direct Cloudinary upload failed.");
  }

  return {
    success: true,
    secure_url: data.secure_url,
    public_id: data.public_id,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
    folder,
  };
}

/**
 * Main upload function:
 * First attempts to upload via internal server API route (/api/she/upload).
 * If that fails, falls back directly to signed Cloudinary REST endpoint.
 */
export async function uploadHazardPhoto(
  file: File | Blob | string,
  folder = DEFAULT_FOLDER
): Promise<CloudinaryUploadResponse> {
  try {
    const formData = new FormData();
    if (file instanceof File || file instanceof Blob) {
      formData.append("file", file);
    } else {
      formData.append("file", file);
    }
    formData.append("folder", folder);

    const res = await fetch("/api/she/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.secure_url) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Server-side upload failed, falling back to direct Cloudinary signed upload:", err);
  }

  // Fallback to direct client-side signed upload
  return await directCloudinaryUpload(file, folder);
}

/**
 * Helper to generate an optimized Cloudinary thumbnail URL with auto format and quality
 */
export function getCloudinaryThumbnail(
  url?: string,
  width = 240,
  height = 240
): string {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;

  // Insert transform parameters after /image/upload/
  return url.replace(
    /\/image\/upload\/(?:v\d+\/)?/,
    `/image/upload/c_fill,w_${width},h_${height},g_auto,q_auto,f_auto/`
  );
}

/**
 * Helper to generate a full-screen optimized Cloudinary preview URL
 */
export function getCloudinaryFullPreview(url?: string): string {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;

  return url.replace(
    /\/image\/upload\/(?:v\d+\/)?/,
    `/image/upload/c_limit,w_1600,h_1200,q_auto,f_auto/`
  );
}
