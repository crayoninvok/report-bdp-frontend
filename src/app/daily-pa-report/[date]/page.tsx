import { Suspense } from "react";
import type { Metadata } from "next";
import { DailyPaDateDetailView } from "../../../components/DailyPaDateDetailView";

export const metadata: Metadata = {
  title: "Daily PA Report • PT Batara Dharma Persada",
};

export default function DailyPaReportDatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="h-9 w-9 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <DailyPaDateDetailView />
    </Suspense>
  );
}

