"use client";

import React, { useState } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { JobSite } from "../types/auth";
import { productionService } from "../services/productionService";
import { useNotification } from "../context/NotificationContext";

interface UploadProductionExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSite?: JobSite;
}

export const UploadProductionExcelModal: React.FC<UploadProductionExcelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSite = "MuaraPahu",
}) => {
  const { showSuccess, showError } = useNotification();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobSite, setJobSite] = useState<JobSite>(defaultSite);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        showError("File harus berformat Excel (.xlsx atau .xls)!");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("Silakan pilih file Excel terlebih dahulu!");
      return;
    }

    setIsUploading(true);
    try {
      const res = await productionService.uploadExcel(selectedFile, jobSite);
      if (res.success) {
        showSuccess(res.message || "File Excel berhasil diimpor!");
        onSuccess();
        onClose();
      } else {
        showError(res.message || "Gagal mengimpor file Excel");
      }
    } catch (err: any) {
      showError(err.message || "Terjadi kesalahan saat mengunggah file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-slate-800 to-[#1e232b] text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#e95623] to-[#f97316] text-white shadow-md">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Upload File Excel Data Produksi
              </h3>
              <p className="text-xs text-slate-300">
                Impor Data Harian KPI Produksi Coal Hauling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Job Site Tujuan
            </label>
            <select
              value={jobSite}
              onChange={(e) => setJobSite(e.target.value as JobSite)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e95623]"
            >
              <option value="MuaraPahu">Site Muara Pahu</option>
              <option value="Senyiur">Site Senyiur</option>
            </select>
          </div>

          {/* File Dropzone */}
          <div className="border-2 border-dashed border-slate-200 hover:border-[#e95623] rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-batara-orange-50/20 transition-all">
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="excel-file-input"
              className="flex flex-col items-center cursor-pointer space-y-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-batara-orange-100 text-[#e95623]">
                <FileSpreadsheet size={24} />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {selectedFile ? selectedFile.name : "Klik untuk memilih file Excel (.xlsx)"}
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                  : "Mendukung format 'KPI . Anual 2026 Wajib Input Daily + UA.xlsx'"}
              </span>
            </label>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 block">Struktur Sheet yang Didukung:</span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Sheet <strong>'Input Data Daily'</strong> dengan header pada baris ke-4.</li>
              <li>Kolom: Tanggal, PA, UA, Payload, Cycle Time, Fuel Ratio, Unit Running, TDP, Produksi.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-[#e95623] to-[#d44415] hover:opacity-95 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all"
          >
            <Upload size={15} />
            <span>{isUploading ? "Mengimpor..." : "Mulai Impor Data"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
