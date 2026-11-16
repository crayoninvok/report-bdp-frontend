"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Check,
} from "lucide-react";
import { OilSampleItem, OIL_COMPONENTS_LIST } from "./OilAnalysisModal";

interface OilSamplingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (items: OilSampleItem[]) => void;
}

export const OilSamplingUploadModal: React.FC<OilSamplingUploadModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<OilSampleItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download Sample Template Excel
  const handleDownloadTemplate = () => {
    const headers = [
      "NO_UNIT",
      "COMPONENT",
      "BARCODE_LAB",
      "TGL_SAMPLE",
      "HM_UNIT",
      "GRADE_PELUMAS",
      "RATING",
      "SI",
      "AL",
      "NA",
      "FE",
      "CU",
      "CR",
      "PB",
      "PQ_INDEX",
      "VISC_100",
      "OXI_OR_ISO6",
      "SOOT_OR_ISO14",
      "WATER_OR_TBN",
      "INTERPRETASI",
    ];

    const sampleRow1 = [
      "ST-002",
      "ENGINE",
      "LAB-17825",
      "14-Nov-26",
      968,
      "15W-40",
      "NORMAL",
      4,
      2,
      5,
      12,
      3,
      1,
      0,
      15,
      14.2,
      8.5,
      0.3,
      9.1,
      "All Test Results Appear Acceptable. Take Oil Samples At 250 Hour Intervals To Monitor Condition.",
    ];

    const sampleRow2 = [
      "ST-002",
      "HYDRAULIC SYSTEM",
      "LAB-17826",
      "14-Nov-26",
      968,
      "TELLUS 46",
      "NORMAL",
      3,
      1,
      2,
      8,
      1,
      0,
      0,
      10,
      46.1,
      16,
      13,
      0.02,
      "Normal inspection. Cleanliness level ISO 4406 within target.",
    ];

    const sampleRow3 = [
      "ST-002",
      "TRANSMISSION",
      "LAB-17827",
      "14-Nov-26",
      968,
      "TO-4 SAE 30",
      "WARNING",
      12,
      5,
      6,
      45,
      8,
      2,
      1,
      28,
      11.2,
      12.1,
      0.8,
      6.2,
      "Caution: Moderate increase in iron (Fe) wear metal. Resample at 100 hours.",
    ];

    const wsData = [headers, sampleRow1, sampleRow2, sampleRow3];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // NO_UNIT
      { wch: 20 }, // COMPONENT
      { wch: 15 }, // BARCODE_LAB
      { wch: 14 }, // TGL_SAMPLE
      { wch: 10 }, // HM_UNIT
      { wch: 15 }, // GRADE_PELUMAS
      { wch: 12 }, // RATING
      { wch: 8 },  // SI
      { wch: 8 },  // AL
      { wch: 8 },  // NA
      { wch: 8 },  // FE
      { wch: 8 },  // CU
      { wch: 8 },  // CR
      { wch: 8 },  // PB
      { wch: 10 }, // PQ_INDEX
      { wch: 12 }, // VISC_100
      { wch: 14 }, // OXI_OR_ISO6
      { wch: 15 }, // SOOT_OR_ISO14
      { wch: 15 }, // WATER_OR_TBN
      { wch: 45 }, // INTERPRETASI
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oil_Sampling_Template");
    XLSX.writeFile(wb, "Template_Import_Oil_Sampling_BDP.xlsx");
  };

  // Handle file upload and parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg("");
    parseExcel(selected);
  };

  const parseExcel = async (fileToParse: File) => {
    try {
      setIsProcessing(true);
      const data = await fileToParse.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rows.length === 0) {
        setErrorMsg("File Excel kosong atau format tidak sesuai!");
        setParsedItems([]);
        return;
      }

      const results: OilSampleItem[] = [];

      rows.forEach((r, idx) => {
        // Find keys case-insensitively
        const getVal = (possibleKeys: string[]) => {
          for (const k of Object.keys(r)) {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (const pk of possibleKeys) {
              if (cleanKey === pk.toLowerCase().replace(/[^a-z0-9]/g, "")) {
                return r[k];
              }
            }
          }
          return "";
        };

        const unitCode = String(getVal(["NO_UNIT", "UNIT", "UNITCODE", "NOUNIT"]) || "").trim().toUpperCase();
        if (!unitCode) return; // skip row without unit code

        let component = String(getVal(["COMPONENT", "KOMPARTEMEN", "KOMPONEN"]) || "ENGINE").trim().toUpperCase();
        const barcodeLab = String(getVal(["BARCODE_LAB", "BARCODE", "KODELAB", "LAB_CODE"]) || `LAB-${Date.now() + idx}`).trim();
        const sampleDate = String(getVal(["TGL_SAMPLE", "SAMPLE_DATE", "TANGGAL"]) || new Date().toISOString().slice(0, 10)).trim();
        const hmUnit = parseFloat(getVal(["HM_UNIT", "HM", "RUNNING_HM"])) || 0;
        const gradePelumas = String(getVal(["GRADE_PELUMAS", "GRADE", "OIL_GRADE"]) || "15W-40").trim().toUpperCase();

        const rawRating = String(getVal(["RATING", "STATUS", "HASIL"]) || "NORMAL").trim().toUpperCase();
        let rating: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
        if (rawRating.includes("CRIT") || rawRating === "X" || rawRating === "C") {
          rating = "CRITICAL";
        } else if (rawRating.includes("WARN") || rawRating.includes("ALERT") || rawRating === "B") {
          rating = "WARNING";
        } else {
          rating = "NORMAL";
        }

        const si = parseFloat(getVal(["SI", "SILICON"])) || 0;
        const al = parseFloat(getVal(["AL", "ALUMINIUM"])) || 0;
        const na = parseFloat(getVal(["NA", "SODIUM"])) || 0;

        const fe = parseFloat(getVal(["FE", "BESI"])) || 0;
        const cu = parseFloat(getVal(["CU", "TEMBAGA"])) || 0;
        const cr = parseFloat(getVal(["CR", "KROMIUM"])) || 0;
        const pb = parseFloat(getVal(["PB", "TIMBAL"])) || 0;
        const pqIndex = parseFloat(getVal(["PQ_INDEX", "PQ"])) || 0;

        const visc100 = parseFloat(getVal(["VISC_100", "VISC", "VISCOSITY"])) || 0;
        const oxiOrIso6 = parseFloat(getVal(["OXI_OR_ISO6", "OXI", "ISO6"])) || 0;
        const sootOrIso14 = parseFloat(getVal(["SOOT_OR_ISO14", "SOOT", "ISO14"])) || 0;
        const waterOrTbn = parseFloat(getVal(["WATER_OR_TBN", "WATER", "TBN", "W"])) || 0;

        const interpretation = String(
          getVal(["INTERPRETASI", "REKOMENDASI", "INTERPRETATION", "CATATAN"]) ||
            "Normal inspection. Take oil samples at regular intervals."
        ).trim();

        results.push({
          id: `oil-${Date.now()}-${idx}`,
          unitCode,
          component,
          barcodeLab,
          sampleDate,
          hmUnit,
          gradePelumas,
          rating,
          si,
          al,
          na,
          fe,
          cu,
          cr,
          pb,
          pqIndex,
          visc100,
          oxiOrIso6,
          sootOrIso14,
          waterOrTbn,
          interpretation,
          createdAt: new Date().toISOString(),
        });
      });

      if (results.length === 0) {
        setErrorMsg("Tidak ada baris data valid yang berhasil dibaca. Pastikan nama kolom sesuai template.");
      }
      setParsedItems(results);
    } catch (err: any) {
      console.error("Error parsing Excel:", err);
      setErrorMsg("Gagal membaca file: " + (err?.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportSubmit = () => {
    if (parsedItems.length === 0) return;
    onSaveBatch(parsedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-xs">
              <UploadCloud size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Upload Data Oil Sampling (Excel / CSV)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Impor data laboratorium pelumas secara massal tanpa harus mengetik manual
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto grow">
          {/* Top Actions: Template Download & Drag-drop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#e95623] flex items-center justify-center shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  Gunakan Template Resmi (.xlsx)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Format tabel Excel yang sudah disesuaikan dengan parameter laboratorium SOS
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Download size={14} className="text-[#e95623]" />
              <span>Download Template Excel</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#e95623] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-orange-50/20 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#e95623] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud size={24} />
            </div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
              {file ? (
                <span className="text-[#e95623]">{file.name}</span>
              ) : (
                "Pilih atau Seret Berkas Excel / CSV ke Sini"
              )}
            </h5>
            <p className="text-[11px] text-slate-500">
              Mendukung format .xlsx, .xls, atau .csv (Maksimal 1.000 baris per unggahan)
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Pratinjau Data ({parsedItems.length} Baris Siap Diimpor)</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Periksa data sebelum disimpan ke sistem
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                      <th className="p-2 text-center w-10">NO</th>
                      <th className="p-2 text-center">NO. UNIT</th>
                      <th className="p-2">KOMPONEN</th>
                      <th className="p-2 text-center">TGL</th>
                      <th className="p-2 text-center">HM</th>
                      <th className="p-2 text-center">RATING</th>
                      <th className="p-2 text-center">Fe</th>
                      <th className="p-2 text-center">Si</th>
                      <th className="p-2 text-center">Visc</th>
                      <th className="p-2">REKOMENDASI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="p-2 text-center font-black text-slate-900">{item.unitCode}</td>
                        <td className="p-2 font-bold text-slate-800">{item.component}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{item.sampleDate}</td>
                        <td className="p-2 text-center font-mono">{item.hmUnit}</td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.rating === "NORMAL"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.rating === "WARNING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.rating}
                          </span>
                        </td>
                        <td className="p-2 text-center font-mono">{item.fe}</td>
                        <td className="p-2 text-center font-mono">{item.si}</td>
                        <td className="p-2 text-center font-mono">{item.visc100}</td>
                        <td className="p-2 text-slate-600 truncate max-w-44" title={item.interpretation}>
                          {item.interpretation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedItems.length === 0 || isProcessing}
            onClick={handleImportSubmit}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check size={16} />
            <span>Impor {parsedItems.length} Data Sampling</span>
          </button>
        </div>
      </div>
    </div>
  );
};

