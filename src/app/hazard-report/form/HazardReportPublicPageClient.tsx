"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  RefreshCw,
  Building2,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";
import { sheService, SheFormSettings } from "../../../services/sheService";
import { HazardReportFormPage } from "../../../components/HazardReportFormPage";

export const HazardReportPublicPageClient: React.FC = () => {
  const [formSettings, setFormSettings] = useState<SheFormSettings>({
    isOpen: true,
    closedMessage:
      "Formulir Pelaporan Bahaya (Hazard Report) saat ini sedang ditutup sementara oleh Tim SHE PT Batara Dharma Persada. Silakan hubungi Safety Officer atau pengawas area untuk pelaporan langsung.",
    updatedAt: "",
  });
  const [loading, setLoading] = useState(true);

  const checkStatus = () => {
    try {
      const settings = sheService.getFormSettings();
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
    window.addEventListener("bdp-she-form-settings-changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("bdp-she-form-settings-changed", handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2.5 text-slate-500 text-xs font-bold">
          <RefreshCw size={16} className="animate-spin text-[#e95623]" />
          <span>Memuat status formulir...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FORM CLOSED STATE
  // -------------------------------------------------------------
  if (!formSettings.isOpen) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden text-center p-8 sm:p-10 space-y-6 animate-in fade-in zoom-in-95">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs flex items-center justify-center">
              <img
                src="/coa-logo-bdp.png"
                alt="PT Batara Dharma Persada"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-slate-900 block leading-tight">
                PT BATARA DHARMA PERSADA
              </span>
              <span className="text-[10px] font-bold text-[#e95623] block">
                Safety, Health &amp; Environment
              </span>
            </div>
          </div>

          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock size={30} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
              Formulir Ditutup
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pelaporan Bahaya Sedang Ditutup
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              {formSettings.closedMessage ||
                "Formulir ini saat ini tidak menerima tanggapan baru. Silakan hubungi Safety Officer atau pengawas area untuk pelaporan langsung."}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-center gap-2.5 text-left">
            <ShieldAlert size={18} className="text-[#e95623] shrink-0" />
            <span>
              Untuk kondisi darurat tambang atau situasi mengancam jiwa, segera hubungi channel radio darurat atau tim SHE site terkait.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={checkStatus}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} />
              <span>Periksa Status Ulang</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Report Management Portal &bull; PT Batara Dharma Persada
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FORM OPEN STATE (Public Standalone Form)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100/70 py-4 sm:py-8 px-2.5 sm:px-5 md:px-6">
      <div className="max-w-4xl mx-auto">
        <HazardReportFormPage
          user={{
            namaLengkap: "",
            username: "",
            jobSite: "MuaraPahu",
            nik: "",
            department: "PLANT",
          }}
          isStandalone={true}
          onNavigateToList={() => {
            window.location.href = "/";
          }}
        />
      </div>
    </div>
  );
};
