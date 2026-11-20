"use client";

import React, { useState, useEffect } from "react";
import { Lock, RefreshCw, ClipboardList, ExternalLink } from "lucide-react";
import { workAreaInspectionService, WorkAreaFormSettings, GOOGLE_FORM_URL } from "../../../services/workAreaInspectionService";
import { WorkAreaInspectionFormPage } from "../../../components/WorkAreaInspectionFormPage";

export const WorkAreaInspectionPublicPageClient: React.FC = () => {
  const [formSettings, setFormSettings] = useState<WorkAreaFormSettings>({
    isOpen: true,
    googleFormUrl: GOOGLE_FORM_URL,
    closedMessage:
      "Formulir Inspeksi Area Kerja saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada. Silakan hubungi Safety Officer atau pengawas area untuk koordinasi langsung.",
    updatedAt: "",
  });
  const [loading, setLoading] = useState(true);

  const checkStatus = () => {
    try {
      const settings = workAreaInspectionService.getFormSettings();
      setFormSettings(settings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    const handleStorageChange = () => {
      checkStatus();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("bdp-work-area-form-settings-changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("bdp-work-area-form-settings-changed", handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="animate-spin text-[#e95623]" />
          <span className="text-xs font-bold text-slate-500">Memeriksa status formulir...</span>
        </div>
      </div>
    );
  }

  // If closed by Safety Officer
  if (!formSettings.isOpen) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-100 to-slate-200 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock size={30} />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              Formulir Ditutup
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-2.5">
              Inspeksi Area Kerja Sedang Tidak Menerima Respon
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {formSettings.closedMessage}
          </p>

          <div className="pt-2">
            <a
              href={formSettings.googleFormUrl || GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <span>Buka Alternatif Google Form</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 font-sans">
      <WorkAreaInspectionFormPage isStandalone />
    </div>
  );
};
