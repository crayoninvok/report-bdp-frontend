"use client";

import React, { useState, useRef } from "react";
import { User, JobSite } from "../types/auth";
import { ExcelParseResult, ParsedPeriodReport } from "../types/report";
import { reportService } from "../services/reportService";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface UploadExcelModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedReportId?: string) => void;
}

export const UploadExcelModal: React.FC<UploadExcelModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const [selectedSite, setSelectedSite] = useState<JobSite | "ALL">(
    isHeadOffice ? "ALL" : user.jobSite
  );
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, boolean>>({});
  const [expandedPeriodKey, setExpandedPeriodKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls")
      ) {
        setFile(droppedFile);
        setParseResult(null);
        setErrorMsg(null);
      } else {
        setErrorMsg("Harap unggah file dengan format Excel (.xlsx atau .xls)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setParseResult(null);
      setErrorMsg(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setErrorMsg("Harap pilih file Excel terlebih dahulu");
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);
    try {
      const targetSiteParam = selectedSite === "ALL" ? undefined : selectedSite;
      const result = await reportService.previewExcelUpload(file, targetSiteParam);
      setParseResult(result);

      // Default selection: select the latest period or newly detected periods
      const initialSelection: Record<string, boolean> = {};
      if (result.reports.length > 0) {
        // If there are new periods, select only new periods by default; otherwise select all
        const hasNew = result.reports.some((r) => !r.isExistingInDb);
        result.reports.forEach((r, idx) => {
          const key = `${r.jobSite}_${r.periodName}`;
          if (hasNew) {
            initialSelection[key] = !r.isExistingInDb || idx === result.reports.length - 1;
          } else {
            // Default select all if updating
            initialSelection[key] = true;
          }
        });
      }
      setSelectedPeriods(initialSelection);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memproses file Excel");
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!parseResult) return;
    const newSel: Record<string, boolean> = {};
    parseResult.reports.forEach((r) => {
      const key = `${r.jobSite}_${r.periodName}`;
      newSel[key] = checked;
    });
    setSelectedPeriods(newSel);
  };

  const handleTogglePeriod = (key: string) => {
    setSelectedPeriods((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCommit = async () => {
    if (!file || !parseResult) return;

    // Filter reports selected by user
    const periodsToImport = parseResult.reports
      .filter((r) => selectedPeriods[`${r.jobSite}_${r.periodName}`])
      .map((r) => r.periodName);

    if (periodsToImport.length === 0) {
      setErrorMsg("Harap pilih setidaknya satu periode untuk diimpor");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const targetSiteParam = selectedSite === "ALL" ? undefined : selectedSite;
      const res = await reportService.commitExcelUpload(
        file,
        periodsToImport,
        targetSiteParam
      );

      setSuccessMsg(res.message || "Data mingguan berhasil disimpan ke database!");
      setTimeout(() => {
        onSuccess(res.importedReports?.[0]?.id);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data ke database");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.values(selectedPeriods).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Upload Excel Data Mingguan</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auto Delta Week-by-Week
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Template Laporan Keuangan BDP (Hitung otomatis nilai bersih dengan pengurang kumulatif)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Explanation Box */}
          <div className="p-4 rounded-xl bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-900 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <Info size={15} className="text-blue-600" />
              <span>Mekanisme Otomatis Perhitungan Week-by-Week:</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              File Excel berisi data kumulatif dari awal bulan (contoh: <strong>01-08</strong>, <strong>01-15</strong>, <strong>01-22</strong>, <strong>01-30</strong>).
              Saat Anda mengupload periode <strong>01-15</strong>, sistem otomatis menggunakan data kumulatif <strong>01-08</strong> sebagai <em>pengurang</em> sehingga yang tersimpan di sistem adalah nilai murni minggu tersebut (09-15).
            </p>
          </div>

          {/* Section: Upload & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Site selector */}
            <div className="md:col-span-1 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Target Job Site
              </label>
              {isHeadOffice ? (
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                >
                  <option value="ALL">Auto Detect (Semua Site di Excel)</option>
                  <option value="MuaraPahu">Site Muara Pahu (MPH)</option>
                  <option value="Senyiur">Site Senyiur (SNY)</option>
                </select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                  <Building2 size={15} className="text-emerald-600" />
                  <span>Site {user.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Pilih site yang akan diproses atau biarkan Auto Detect.
              </p>
            </div>

            {/* Dropzone */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                File Excel (.xlsx / .xls)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-24 ${
                  isDragging
                    ? "border-[#e95623] bg-orange-50"
                    : file
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                      <FileSpreadsheet size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Klik atau drag file lain untuk mengganti
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-500">
                    <Upload size={22} className="text-slate-400" />
                    <p className="text-xs font-medium">
                      <span className="font-bold text-[#e95623]">Pilih file</span> atau tarik file Excel ke sini
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Mendukung format .xlsx dan .xls (maks 35MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action to Preview */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!file || isParsing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                file && !isParsing
                  ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-slate-900/20"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <RefreshCw size={14} className={isParsing ? "animate-spin" : ""} />
              <span>{isParsing ? "Menganalisis Format Excel..." : "Preview & Hitung Delta"}</span>
            </button>
            {parseResult && (
              <span className="text-xs text-slate-500">
                Ditemukan <strong>{parseResult.reports.length}</strong> periode laporan
              </span>
            )}
          </div>

          {/* Preview Section */}
          {parseResult && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">Total Periode</span>
                  <span className="text-base font-extrabold text-slate-800">
                    {parseResult.summary.totalPeriodsFound}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 block font-medium">Periode Baru</span>
                  <span className="text-base font-extrabold text-emerald-800">
                    {parseResult.summary.newPeriodsCount}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <span className="text-[11px] text-blue-700 block font-medium">Sudah Ada di DB</span>
                  <span className="text-base font-extrabold text-blue-800">
                    {parseResult.summary.updatePeriodsCount}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-700 block font-medium">Dipilih</span>
                  <span className="text-base font-extrabold text-amber-800">
                    {selectedCount} dari {parseResult.reports.length}
                  </span>
                </div>
              </div>

              {/* Table header control */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={
                      parseResult.reports.length > 0 &&
                      selectedCount === parseResult.reports.length
                    }
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-[#e95623] focus:ring-[#e95623] cursor-pointer"
                  />
                  <label htmlFor="selectAll" className="font-semibold cursor-pointer">
                    Pilih Semua Periode
                  </label>
                </div>
                <span className="text-[11px] text-slate-500">
                  Klik baris atau tombol chevron untuk melihat rincian akun
                </span>
              </div>

              {/* Reports list cards */}
              <div className="space-y-3 max-h-95 overflow-y-auto pr-1">
                {parseResult.reports.map((rep) => {
                  const key = `${rep.jobSite}_${rep.periodName}`;
                  const isChecked = !!selectedPeriods[key];
                  const isExpanded = expandedPeriodKey === key;

                  return (
                    <div
                      key={key}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isChecked
                          ? "border-emerald-300 bg-white shadow-xs"
                          : "border-slate-200 bg-slate-50/60 opacity-80"
                      }`}
                    >
                      {/* Row Card Header */}
                      <div className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePeriod(key)}
                            className="w-4 h-4 rounded text-[#e95623] focus:ring-[#e95623] cursor-pointer shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {rep.periodName}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  rep.jobSite === "MuaraPahu"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}
                              >
                                Site {rep.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                W{rep.weekNumber}
                              </span>
                              {rep.isExistingInDb ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                                  Update DB
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                                  Baru
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <span>Pengurang:</span>
                              {rep.pengurangPeriodName ? (
                                <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold text-[10px]">
                                  Kumulatif {rep.pengurangPeriodName}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-medium italic">
                                  Minggu Pertama Bulan Ini (Tanpa Pengurang)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Calculations preview columns */}
                        <div className="flex items-center gap-4 text-xs shrink-0 self-end lg:self-center">
                          {/* Produksi */}
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Produksi Bersih
                            </span>
                            <span className="font-extrabold text-slate-800">
                              {Math.round(rep.produksi.weeklyBudget).toLocaleString("id-ID")} Ton
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Excel: {Math.round(rep.produksi.rawBudget).toLocaleString("id-ID")} Ton
                            </span>
                          </div>

                          {/* Total Biaya */}
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Total Biaya Bersih
                            </span>
                            <span className="font-extrabold text-[#e95623]">
                              Rp {(rep.biayaProduksi.weeklyBudget / 1e6).toFixed(1)} Jt
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Excel: Rp {(rep.biayaProduksi.rawBudget / 1e6).toFixed(1)} Jt
                            </span>
                          </div>

                          {/* Toggle details button */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPeriodKey(isExpanded ? null : key)
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Lihat detail perhitungan per akun"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
                          <p className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                            <Layers size={13} className="text-[#e95623]" />
                            <span>Rincian Akun Induk (Delta = Nilai Excel Kumulatif - Pengurang):</span>
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="py-1">Akun Beban</th>
                                  <th className="py-1 text-right">Excel Kumulatif</th>
                                  <th className="py-1 text-right">Pengurang</th>
                                  <th className="py-1 text-right font-bold text-slate-700">
                                    Hasil Mingguan
                                  </th>
                                  <th className="py-1 text-right">YTD</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {rep.items
                                  .filter((it) => it.isParent)
                                  .map((it) => (
                                    <tr key={it.accountName} className="hover:bg-slate-100/60">
                                      <td className="py-1 font-semibold text-slate-800">
                                        {it.accountName}
                                      </td>
                                      <td className="py-1 text-right text-slate-600">
                                        Rp {(it.rawBudgetCost / 1e6).toFixed(2)} Jt
                                      </td>
                                      <td className="py-1 text-right text-slate-500">
                                        Rp {(it.pengurangBudgetCost / 1e6).toFixed(2)} Jt
                                      </td>
                                      <td className="py-1 text-right font-bold text-emerald-700">
                                        Rp {(it.weeklyBudgetCost / 1e6).toFixed(2)} Jt
                                      </td>
                                      <td className="py-1 text-right text-slate-500">
                                        {it.ytdBudgetCost !== null
                                          ? `Rp ${(it.ytdBudgetCost / 1e6).toFixed(2)} Jt`
                                          : "-"}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center gap-3">
            {parseResult && (
              <button
                type="button"
                onClick={handleCommit}
                disabled={isSubmitting || selectedCount === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  selectedCount > 0 && !isSubmitting
                    ? "bg-[#e95623] hover:bg-[#d44415] text-white shadow-[#e95623]/20 cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Konfirmasi & Simpan ({selectedCount} Periode)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
