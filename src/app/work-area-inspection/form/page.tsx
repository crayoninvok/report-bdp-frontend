import { Metadata } from "next";
import { Suspense } from "react";
import { WorkAreaInspectionPublicPageClient } from "./WorkAreaInspectionPublicPageClient";

export const metadata: Metadata = {
  title: "Formulir Inspeksi Area Kerja - PT Batara Dharma Persada",
  description: "Formulir resmi inspeksi keselamatan area kerja K3L & 5R PT Batara Dharma Persada",
};

export default function WorkAreaInspectionPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-xs font-bold text-slate-400">Memuat Formulir Inspeksi...</div>
        </div>
      }
    >
      <WorkAreaInspectionPublicPageClient />
    </Suspense>
  );
}
