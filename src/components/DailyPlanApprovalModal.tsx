"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  FileCheck,
  RotateCcw,
  Calendar,
  Building2,
  Check,
  User,
  ShieldCheck,
} from "lucide-react";

export interface DailyPlanApprovalSigner {
  roleTitle: string; // e.g. "Dibuat Oleh :" or "Disetujui Oleh :"
  position: string; // e.g. "Maintenance Planner"
  department: string; // e.g. "Plant & Maintenance"
  name: string; // e.g. "Noffan Amiruddin"
  date: string; // ISO date string "YYYY-MM-DD"
  isApproved: boolean; // green approved stamp toggle
}

export interface DailyPlanApprovalData {
  documentLocation: string; // "Muara Pahu" | "Senyiur"
  documentDate: string; // ISO date string "YYYY-MM-DD"
  planner: DailyPlanApprovalSigner;
  maintenanceSupt: DailyPlanApprovalSigner;
  logisticSupt: DailyPlanApprovalSigner;
  productionSupt: DailyPlanApprovalSigner;
}

export function formatIndoFullDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    if (m >= 0 && m < 12) {
      return `${d} ${months[m]} ${y}`;
    }
  }
  return dateStr;
}

export function getDefaultApprovalData(
  site: "MuaraPahu" | "Senyiur"
): DailyPlanApprovalData {
  const today = new Date().toISOString().slice(0, 10);
  const location = site === "MuaraPahu" ? "Muara Pahu" : "Senyiur";
  return {
    documentLocation: location,
    documentDate: today,
    planner: {
      roleTitle: "Dibuat Oleh :",
      position: "Maintenance Planner",
      department: "Plant & Maintenance",
      name: "Maintenance Planner",
      date: today,
      isApproved: true,
    },
    maintenanceSupt: {
      roleTitle: "Disetujui Oleh :",
      position: "Maintenance Superintendent",
      department: "Plant Department",
      name: "Maintenance Superintendent",
      date: today,
      isApproved: true,
    },
    logisticSupt: {
      roleTitle: "Disetujui Oleh :",
      position: "Logistic Superintendent",
      department: "Supply Chain & Logistics",
      name: "Logistic Superintendent",
      date: today,
      isApproved: true,
    },
    productionSupt: {
      roleTitle: "Disetujui Oleh :",
      position: "Production Superintendent",
      department: "Mining & Hauling Operations",
      name: "Production Superintendent",
      date: today,
      isApproved: true,
    },
  };
}

export const ApprovedStamp: React.FC<{
  dateStr: string;
  isCompact?: boolean;
}> = ({ dateStr, isCompact = false }) => {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center border-2 border-emerald-600 bg-emerald-50/95 rounded-lg select-none transform -rotate-2 ring-1 ring-emerald-500/40 text-center shadow-xs ${
        isCompact ? "px-2.5 py-1" : "px-3.5 py-1.5"
      }`}
      style={{
        boxShadow: "0 1px 3px rgba(16, 185, 129, 0.25)",
      }}
    >
      <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-black text-xs sm:text-[13px] tracking-widest uppercase">
        <CheckCircle2
          size={isCompact ? 12 : 14}
          className="text-emerald-600 stroke-[3]"
        />
        <span>APPROVED</span>
      </div>
      <div className="text-[9px] font-extrabold text-emerald-800 tracking-tight mt-0.5">
        {formatIndoFullDate(dateStr) || dateStr}
      </div>
    </div>
  );
};

export function getApprovalStorageKey(site: string, weekDate?: string): string {
  return `bdp_daily_plan_approvals_${site}_${weekDate || "default"}`;
}

interface DailyPlanApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: DailyPlanApprovalData;
  onSave: (newData: DailyPlanApprovalData) => void;
  selectedSite: "MuaraPahu" | "Senyiur";
}

export const DailyPlanApprovalModal: React.FC<DailyPlanApprovalModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  selectedSite,
}) => {
  const [formData, setFormData] = useState<DailyPlanApprovalData>(initialData);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleApproveAll = () => {
    const today = formData.documentDate || new Date().toISOString().slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      planner: { ...prev.planner, isApproved: true, date: today },
      maintenanceSupt: { ...prev.maintenanceSupt, isApproved: true, date: today },
      logisticSupt: { ...prev.logisticSupt, isApproved: true, date: today },
      productionSupt: { ...prev.productionSupt, isApproved: true, date: today },
    }));
  };

  const handleUnapproveAll = () => {
    setFormData((prev) => ({
      ...prev,
      planner: { ...prev.planner, isApproved: false },
      maintenanceSupt: { ...prev.maintenanceSupt, isApproved: false },
      logisticSupt: { ...prev.logisticSupt, isApproved: false },
      productionSupt: { ...prev.productionSupt, isApproved: false },
    }));
  };

  const handleResetDefault = () => {
    setFormData(getDefaultApprovalData(selectedSite));
  };

  const handleSignerChange = (
    key: "planner" | "maintenanceSupt" | "logisticSupt" | "productionSupt",
    field: keyof DailyPlanApprovalSigner,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const signerKeys: Array<{
    key: "planner" | "maintenanceSupt" | "logisticSupt" | "productionSupt";
    title: string;
    badgeBg: string;
    placeholder: string;
  }> = [
    {
      key: "planner",
      title: "Maintenance Planner (Dibuat Oleh)",
      badgeBg: "bg-orange-50 text-[#e95623] border-orange-200",
      placeholder: "e.g. Noffan Amiruddin",
    },
    {
      key: "maintenanceSupt",
      title: "Maintenance Superintendent (Disetujui Oleh)",
      badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
      placeholder: "e.g. Maintenance Superintendent",
    },
    {
      key: "logisticSupt",
      title: "Logistic Superintendent (Disetujui Oleh)",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      placeholder: "e.g. Logistic Superintendent",
    },
    {
      key: "productionSupt",
      title: "Production Superintendent (Disetujui Oleh)",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      placeholder: "e.g. Production Superintendent",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                Edit Tanda Tangan &amp; Cap Approved Dokumen
              </h3>
              <p className="text-xs text-slate-400">
                Atur nama penandatangan, tanggal persetujuan, dan cap hijau APPROVED resmi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto grow">
          {/* Document Header Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building2 size={15} className="text-[#e95623]" />
              <span>Lokasi &amp; Tanggal Dokumen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Lokasi Job Site
                </label>
                <input
                  type="text"
                  value={formData.documentLocation}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      documentLocation: e.target.value,
                    }))
                  }
                  placeholder="e.g. Muara Pahu"
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tanggal Dokumen (Header Tanda Tangan)
                </label>
                <input
                  type="date"
                  value={formData.documentDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      documentDate: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                />
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Aksi Cepat Cap Approved:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleApproveAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>Cap Approved Semua (4 Bagian)</span>
              </button>

              <button
                type="button"
                onClick={handleUnapproveAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
              >
                <X size={13} />
                <span>Hapus Semua Cap</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-all cursor-pointer"
                title="Reset ke Template Default"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 4 Signer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signerKeys.map(({ key, title, badgeBg, placeholder }) => {
              const signer = formData[key];
              return (
                <div
                  key={key}
                  className={`p-4 rounded-2xl border transition-all ${
                    signer.isApproved
                      ? "bg-emerald-50/30 border-emerald-300 shadow-2xs"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {/* Card Title & Stamp Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider mb-1 ${badgeBg}`}
                      >
                        {signer.roleTitle.replace(":", "").trim()}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {signer.position}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {signer.department}
                      </p>
                    </div>

                    {/* Cap Approved Toggle Switch */}
                    <div className="shrink-0 flex flex-col items-end">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={signer.isApproved}
                          onChange={(e) =>
                            handleSignerChange(key, "isApproved", e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="text-[11px] font-extrabold text-slate-700">
                          {signer.isApproved ? "Cap Approved" : "Belum Cap"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Live Stamp Preview if Approved */}
                  {signer.isApproved && (
                    <div className="my-2.5 p-2 bg-emerald-100/50 rounded-xl border border-emerald-200 flex items-center justify-center">
                      <ApprovedStamp dateStr={signer.date} isCompact />
                    </div>
                  )}

                  {/* Input Fields */}
                  <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nama Penandatangan
                      </label>
                      <div className="relative">
                        <User
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={signer.name}
                          onChange={(e) =>
                            handleSignerChange(key, "name", e.target.value)
                          }
                          placeholder={placeholder}
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tanggal Tanda Tangan / Approved
                      </label>
                      <div className="relative">
                        <Calendar
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="date"
                          value={signer.date}
                          onChange={(e) =>
                            handleSignerChange(key, "date", e.target.value)
                          }
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>Simpan &amp; Terapkan Cap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

