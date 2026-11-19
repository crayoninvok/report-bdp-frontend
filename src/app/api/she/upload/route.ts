import { NextResponse } from "next/server";
import crypto from "crypto";

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUDINARY_CLOUD_NAME ||
  "dvkc8sxpf";
const API_KEY = process.env.CLOUDINARY_API_KEY || "864916714767455";
const API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "WpArqR6GW61DEA8jIc_MDv3t0yg";
const DEFAULT_FOLDER =
  process.env.CLOUDINARY_FOLDER || "bdp-reportapp/hse-folder";

/**
 * Generates Cloudinary signature according to official spec:
 * All parameters to sign sorted alphabetically, concatenated as 'param1=val1&param2=val2' + api_secret
 */
function generateSignature(params: Record<string, string | number>, secret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  return crypto
    .createHash("sha1")
    .update(`${serialized}${secret}`)
    .digest("hex");
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileToUpload: File | string | null = null;
    let targetFolder = DEFAULT_FOLDER;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const fileEntry = formData.get("file");
      const folderEntry = formData.get("folder");

      if (folderEntry && typeof folderEntry === "string") {
        targetFolder = folderEntry.trim();
      }

      if (fileEntry instanceof File) {
        fileToUpload = fileEntry;
      } else if (typeof fileEntry === "string") {
        fileToUpload = fileEntry;
      }
    } else {
      // JSON body
      const body = await req.json();
      fileToUpload = body.file || body.image || null;
      if (body.folder && typeof body.folder === "string") {
        targetFolder = body.folder.trim();
      }
    }

    if (!fileToUpload) {
      return NextResponse.json(
        { success: false, error: "File atau data gambar tidak ditemukan." },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(
      {
        folder: targetFolder,
        timestamp,
      },
      API_SECRET
    );

    const uploadFormData = new FormData();
    if (fileToUpload instanceof File) {
      uploadFormData.append("file", fileToUpload);
    } else {
      uploadFormData.append("file", fileToUpload);
    }
    uploadFormData.append("api_key", API_KEY);
    uploadFormData.append("timestamp", String(timestamp));
    uploadFormData.append("folder", targetFolder);
    uploadFormData.append("signature", signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: uploadFormData,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Cloudinary upload failed:", data.error);
      return NextResponse.json(
        {
          success: false,
          error: data.error?.message || "Gagal mengunggah foto ke Cloudinary.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      secure_url: data.secure_url,
      public_id: data.public_id,
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
      folder: targetFolder,
    });
  } catch (error: any) {
    console.error("API /api/she/upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Terjadi kesalahan internal pada server upload.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get("public_id");

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: "public_id parameter is required." },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(
      {
        public_id: publicId,
        timestamp,
      },
      API_SECRET
    );

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("api_key", API_KEY);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    const destroyUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`;
    const response = await fetch(destroyUrl, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    console.error("API /api/she/upload DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal menghapus foto." },
      { status: 500 }
    );
  }
}
