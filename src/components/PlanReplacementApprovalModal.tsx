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
import { ApprovedStamp, formatIndoFullDate } from "./DailyPlanApprovalModal";

export interface PlanReplacementSigner {
  roleTitle: string; // "Dibuat Oleh :" | "Diperiksa Oleh :" | "Disetujui Oleh :"
  position: string; // "Maintenance Planner" | "Maintenance Supervisor" | "Maintenance Superintendent"
  department: string; // e.g. "Plant & Maintenance"
  name: string;
  date: string; // ISO date "YYYY-MM-DD"
  isApproved: boolean;
}

export interface PlanReplacementApprovalData {
  documentLocation: string; // "Senyiur" | "Muara Pahu"
  documentDate: string; // ISO date "YYYY-MM-DD"
  planner: PlanReplacementSigner;
  supervisor: PlanReplacementSigner;
  superintendent: PlanReplacementSigner;
}

export function getDefaultPlanApprovalData(
  site: string = "Senyiur"
): PlanReplacementApprovalData {
  const today = new Date().toISOString().slice(0, 10);
  const location = site.toUpperCase().includes("MUARA") ? "Muara Pahu" : "Senyiur";
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
    supervisor: {
      roleTitle: "Diperiksa Oleh :",
      position: "Maintenance Supervisor",
      department: "Plant Department",
      name: "Maintenance Supervisor",
      date: today,
      isApproved: true,
    },
    superintendent: {
      roleTitle: "Disetujui Oleh :",
      position: "Maintenance Superintendent",
      department: "Plant Department",
      name: "Maintenance Superintendent",
      date: today,
      isApproved: true,
    },
  };
}

export function getPlanApprovalStorageKey(site: string): string {
  return `bdp_plan_replacement_approvals_${site || "default"}`;
}

interface PlanReplacementApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: PlanReplacementApprovalData;
  onSave: (newData: PlanReplacementApprovalData) => void;
  selectedSite: string;
}

export const PlanReplacementApprovalModal: React.FC<PlanReplacementApprovalModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  selectedSite,
}) => {
  const [formData, setFormData] = useState<PlanReplacementApprovalData>(initialData);

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
      supervisor: { ...prev.supervisor, isApproved: true, date: today },
      superintendent: { ...prev.superintendent, isApproved: true, date: today },
    }));
  };

  const handleUnapproveAll = () => {
    setFormData((prev) => ({
      ...prev,
      planner: { ...prev.planner, isApproved: false },
      supervisor: { ...prev.supervisor, isApproved: false },
      superintendent: { ...prev.superintendent, isApproved: false },
    }));
  };

  const handleResetDefault = () => {
    setFormData(getDefaultPlanApprovalData(selectedSite));
  };

  const handleSignerChange = (
    key: "planner" | "supervisor" | "superintendent",
    field: keyof PlanReplacementSigner,
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

  const signersConfig: Array<{
    key: "planner" | "supervisor" | "superintendent";
    title: string;
    badgeBg: string;
    defaultName: string;
  }> = [
    {
      key: "planner",
      title: "Maintenance Planner (Dibuat Oleh)",
      badgeBg: "bg-orange-50 text-[#e95623] border-orange-200",
      defaultName: "Maintenance Planner",
    },
    {
      key: "supervisor",
      title: "Maintenance Supervisor (Diperiksa Oleh)",
      badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
      defaultName: "Maintenance Supervisor",
    },
    {
      key: "superintendent",
      title: "Maintenance Superintendent (Disetujui Oleh)",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      defaultName: "Maintenance Superintendent",
    },
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
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
                Atur nama penandatangan, tanggal pengesahan, dan cap hijau APPROVED resmi.
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
                  placeholder="e.g. Senyiur"
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

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApproveAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Cap Approved Semua (3/3)</span>
              </button>

              <button
                type="button"
                onClick={handleUnapproveAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
              >
                <span>Hapus Semua Cap (Tanda Tangan Manual)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset ke Standar</span>
            </button>
          </div>

          {/* Signers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signersConfig.map(({ key, title, badgeBg, defaultName }) => {
              const signer = formData[key];
              return (
                <div
                  key={key}
                  className={`p-4 rounded-2xl border transition-all ${
                    signer.isApproved
                      ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/30"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {/* Card Header & Toggle */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wide ${badgeBg}`}
                    >
                      {title}
                    </span>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={signer.isApproved}
                        onChange={(e) =>
                          handleSignerChange(key, "isApproved", e.target.checked)
                        }
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-slate-700">
                        Cap Approved
                      </span>
                    </label>
                  </div>

                  {/* Stamp Live Preview */}
                  <div className="py-2.5 mb-3 flex items-center justify-center bg-slate-100/60 rounded-xl border border-dashed border-slate-200 min-h-16">
                    {signer.isApproved ? (
                      <ApprovedStamp dateStr={signer.date} isCompact />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        (Tanda Tangan Manual / Basah)
                      </span>
                    )}
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) =>
                          handleSignerChange(key, "name", e.target.value)
                        }
                        placeholder={defaultName}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Jabatan / Posisi
                      </label>
                      <input
                        type="text"
                        value={signer.position}
                        onChange={(e) =>
                          handleSignerChange(key, "position", e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Departemen
                      </label>
                      <input
                        type="text"
                        value={signer.department}
                        onChange={(e) =>
                          handleSignerChange(key, "department", e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tanggal Tanda Tangan
                      </label>
                      <input
                        type="date"
                        value={signer.date}
                        onChange={(e) =>
                          handleSignerChange(key, "date", e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              <span>Terapkan Tanda Tangan &amp; Cap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
