import { Metadata } from "next";
import { Suspense } from "react";
import { ObservationReportPublicPageClient } from "../../observation-report/form/ObservationReportPublicPageClient";

export const metadata: Metadata = {
  title: "Formulir Laporan Observasi Keselamatan - PT Batara Dharma Persada",
  description: "Formulir resmi observasi tugas & kepatuhan perilaku K3L PT Batara Dharma Persada",
};

export default function SheObservationPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-xs font-bold text-slate-400">Memuat Formulir Observasi...</div>
        </div>
      }
    >
      <ObservationReportPublicPageClient />
    </Suspense>
  );
}
