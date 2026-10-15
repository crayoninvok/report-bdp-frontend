"use client";

import React, { useState } from "react";
import { User, JobSite } from "../types/auth";
import { reportService } from "../services/reportService";
import { X, Calendar, Plus, AlertCircle } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface CreatePeriodModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReportId: string) => void;
}

export const CreatePeriodModal: React.FC<CreatePeriodModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError } = useNotification();
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const [jobSite, setJobSite] = useState<JobSite>(
    isHeadOffice ? "MuaraPahu" : user.jobSite
  );
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [year, setYear] = useState(2026);
  const [weekNumber, setWeekNumber] = useState(41);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!periodName || !startDate || !endDate) {
      setErrorMsg("Harap lengkapi semua kolom");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await reportService.createReport({
        jobSite,
        periodName,
        startDate,
        endDate,
        year,
        weekNumber,
      });

      showSuccess(
        `Periode baru "${periodName}" (${jobSite}) berhasil dibuat!`,
        "Periode Baru Dibuat"
      );
      onSuccess(result.id);
      onClose();
    } catch (err: any) {
      const msg = err.message || "Gagal membuat periode baru";
      setErrorMsg(msg);
      showError(msg, "Buat Periode Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#e95623]" />
            <h2 className="text-sm font-bold">Buat Periode Laporan Cost Baru</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Site
            </label>
            {isHeadOffice ? (
              <select
                value={jobSite}
                onChange={(e) => setJobSite(e.target.value as JobSite)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white"
              >
                <option value="MuaraPahu">Muara Pahu</option>
                <option value="Senyiur">Senyiur</option>
              </select>
            ) : (
              <div className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center justify-between">
                <span>Site {user.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</span>
                <span className="text-[10px] text-[#e95623] font-bold">Site Anda</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Periode Mingguan (contoh: 09-15 Okt 2026)
            </label>
            <input
              type="text"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              placeholder="09-15 Okt 2026"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minggu Ke (Week #)
              </label>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#e95623] hover:bg-[#d44415] disabled:opacity-50 cursor-pointer"
            >
              <Plus size={15} />
              <span>{isSubmitting ? "Membuat..." : "Buat Periode"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
