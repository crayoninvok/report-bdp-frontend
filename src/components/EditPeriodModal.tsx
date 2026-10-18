"use client";

import React, { useState, useEffect } from "react";
import { User } from "../types/auth";
import { ReportDetails } from "../types/report";
import { reportService } from "../services/reportService";
import { X, Calendar, Edit3, Save, AlertCircle, CheckCircle2, Layers } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface EditPeriodModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  reportDetails: ReportDetails;
  onSuccess: () => void;
}

export const EditPeriodModal: React.FC<EditPeriodModalProps> = ({
  user,
  isOpen,
  onClose,
  reportDetails,
  onSuccess,
}) => {
  const { showSuccess, showError } = useNotification();
  const rep = reportDetails.report;

  // Format Date to YYYY-MM-DD for <input type="date">
  const formatDateForInput = (dStr?: string) => {
    if (!dStr) return "";
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [periodName, setPeriodName] = useState(rep.periodName || "");
  const [weekNumber, setWeekNumber] = useState(rep.weekNumber || 1);
  const [year, setYear] = useState(rep.year || 2026);
  const [startDate, setStartDate] = useState(formatDateForInput(rep.startDate));
  const [endDate, setEndDate] = useState(formatDateForInput(rep.endDate));
  const [budgetProduksi, setBudgetProduksi] = useState<number>(reportDetails.produksi?.weeklyBudget ?? 0);
  const [realisasiProduksi, setRealisasiProduksi] = useState<number>(reportDetails.produksi?.weeklyRealisasi ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when reportDetails changes
  useEffect(() => {
    if (reportDetails && reportDetails.report) {
      const r = reportDetails.report;
      setPeriodName(r.periodName || "");
      setWeekNumber(r.weekNumber || 1);
      setYear(r.year || 2026);
      setStartDate(formatDateForInput(r.startDate));
      setEndDate(formatDateForInput(r.endDate));
      setBudgetProduksi(reportDetails.produksi?.weeklyBudget ?? 0);
      setRealisasiProduksi(reportDetails.produksi?.weeklyRealisasi ?? 0);
      setErrorMsg(null);
    }
  }, [reportDetails]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!periodName.trim()) {
      setErrorMsg("Nama periode tidak boleh kosong.");
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg("Tanggal mulai dan tanggal selesai wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await reportService.updatePeriod(rep.id, {
        periodName: periodName.trim(),
        weekNumber: Number(weekNumber),
        year: Number(year),
        startDate,
        endDate,
        budgetProduksi: Number(budgetProduksi) || 0,
        realisasiProduksi: Number(realisasiProduksi) || 0,
      });

      showSuccess(
        `Informasi periode "${periodName}" (W${weekNumber}) berhasil disimpan!`,
        "Periode Berhasil Diperbarui"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || "Gagal memperbarui informasi periode";
      setErrorMsg(msg);
      showError(msg, "Gagal Edit Periode");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e95623]/20 text-[#e95623] border border-[#e95623]/30">
              <Edit3 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Edit Informasi Periode Laporan</h2>
              <p className="text-[11px] text-slate-300">
                Site {rep.jobSite} &bull; Periode W{rep.weekNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Site Badge Info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Job Site
              </span>
              <p className="text-xs font-extrabold text-slate-800">
                Site {rep.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-800">
              ID: {rep.id.slice(0, 8)}...
            </span>
          </div>

          {/* Nama Periode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Periode Laporan
            </label>
            <input
              type="text"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              placeholder="Contoh: 01-15 Okt 2026 atau 09-15 Okt 2026"
              className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white shadow-2xs"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Nama ini akan tampil pada dropdown pilihan periode dan header laporan.
            </span>
          </div>

          {/* Minggu Ke & Tahun */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Minggu (W)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400">
                  W
                </span>
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white shadow-2xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tahun
              </label>
              <input
                type="number"
                min={2020}
                max={2035}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Rentang Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Volume Produksi Mingguan */}
          <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#e95623]">
              <Layers size={14} />
              <span>Volume Produksi Batubara (Ton)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Target Budget (Ton)
                </label>
                <input
                  type="number"
                  step="any"
                  value={budgetProduksi}
                  onChange={(e) => setBudgetProduksi(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Aktual Realisasi (Ton)
                </label>
                <input
                  type="number"
                  step="any"
                  value={realisasiProduksi}
                  onChange={(e) => setRealisasiProduksi(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#e95623] to-[#d44415] hover:opacity-90 shadow-md shadow-[#e95623]/25 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Save size={14} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan Periode"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
