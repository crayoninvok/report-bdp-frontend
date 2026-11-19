import { Metadata } from "next";
import { Suspense } from "react";
import { HazardReportPublicPageClient } from "./HazardReportPublicPageClient";

export const metadata: Metadata = {
  title: "Formulir Pelaporan Bahaya (Hazard Report) - PT Batara Dharma Persada",
  description: "Formulir resmi pelaporan Kondisi Tidak Aman (KTA) & Tindakan Tidak Aman (TTA) PT Batara Dharma Persada",
};

export default function HazardReportPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-xs font-bold text-slate-400">Memuat Formulir...</div>
        </div>
      }
    >
      <HazardReportPublicPageClient />
    </Suspense>
  );
}
