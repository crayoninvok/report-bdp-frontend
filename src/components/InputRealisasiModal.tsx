"use client";

import React, { useState, useEffect } from "react";
import { User } from "../types/auth";
import { ReportDetails } from "../types/report";
import { reportService } from "../services/reportService";
import { X, Save, AlertCircle } from "lucide-react";

interface InputRealisasiModalProps {
  user: User;
  reportDetails: ReportDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InputRealisasiModal: React.FC<InputRealisasiModalProps> = ({
  user,
  reportDetails,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [realisasiProduksi, setRealisasiProduksi] = useState<number>(0);
  const [itemRealisasi, setItemRealisasi] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (reportDetails) {
      setRealisasiProduksi(reportDetails.produksi.weeklyRealisasi || 0);
      const initialMap: Record<string, number> = {};
      for (const it of reportDetails.items) {
        initialMap[it.accountName] = it.weeklyRealisasi || 0;
      }
      setItemRealisasi(initialMap);
    }
  }, [reportDetails]);

  if (!isOpen) return null;

  // Calculate live Total Biaya Produksi Realisasi from parent categories
  const parentAccountNames = new Set(
    reportDetails.items.filter((it) => it.isParent).map((it) => it.accountName)
  );

  let liveTotalBiayaRealisasi = 0;
  for (const [acc, val] of Object.entries(itemRealisasi)) {
    if (parentAccountNames.has(acc)) {
      liveTotalBiayaRealisasi += Number(val) || 0;
    }
  }

  const liveIdrPerTon =
    realisasiProduksi > 0 ? liveTotalBiayaRealisasi / realisasiProduksi : 0;

  const handleInputChange = (accountName: string, valStr: string) => {
    const cleanNum = Number(valStr.replace(/[^0-9]/g, "")) || 0;
    setItemRealisasi((prev) => ({
      ...prev,
      [accountName]: cleanNum,
    }));
  };

  const handleProduksiChange = (valStr: string) => {
    const cleanNum = Number(valStr.replace(/[^0-9]/g, "")) || 0;
    setRealisasiProduksi(cleanNum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const itemsPayload = Object.entries(itemRealisasi).map(([acc, val]) => ({
        accountName: acc,
        realisasiCost: val,
      }));

      await reportService.updateRealisasi(
        reportDetails.report.id,
        user,
        realisasiProduksi,
        itemsPayload
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data realisasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-emerald-600 to-teal-700 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 uppercase tracking-wider">
                Wewenang Site {reportDetails.report.jobSite}
              </span>
              <span className="text-xs text-emerald-100">
                Oleh: {user.name} ({user.jobSite})
              </span>
            </div>
            <h2 className="text-base font-bold mt-0.5">
              Input Data Realisasi Cost – {reportDetails.report.periodName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Summary Bar */}
        <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">Realisasi Produksi</span>
            <span className="text-sm font-bold text-slate-800">
              {realisasiProduksi.toLocaleString("id-ID")} Ton
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">Total Biaya Produksi (Realisasi)</span>
            <span className="text-sm font-bold text-emerald-700">
              Rp {liveTotalBiayaRealisasi.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">Realisasi IDR / Ton</span>
            <span className="text-sm font-bold text-teal-700">
              Rp {Math.round(liveIdrPerTon).toLocaleString("id-ID")} / Ton
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Produksi Input */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Realisasi Produksi (Ton)
              </label>
              <div className="relative max-w-xs">
                <input
                  type="text"
                  value={realisasiProduksi.toLocaleString("id-ID")}
                  onChange={(e) => handleProduksiChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  Ton
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total tonase produksi aktual yang tercapai pada periode ini.
              </p>
            </div>

            {/* Cost Accounts Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Realisasi Akun Beban (Cost Aktual)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Input pengeluaran riil operasional site
                </span>
              </div>

              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
                {reportDetails.items.map((item) => {
                  const isSub = !item.isParent;
                  const currentVal = itemRealisasi[item.accountName] || 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg transition-colors ${
                        isSub ? "bg-slate-50/60 pl-6 border-l-2 border-emerald-400" : "bg-slate-100/70 font-semibold"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {isSub && (
                          <span className="text-slate-400 font-mono text-xs">↳</span>
                        )}
                        {item.accountCode && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 shrink-0">
                            {item.accountCode}
                          </span>
                        )}
                        <span
                          className={`text-xs truncate ${
                            isSub ? "text-slate-700" : "text-emerald-900 font-bold"
                          }`}
                          title={item.accountName}
                        >
                          {item.accountName}
                        </span>
                      </div>

                      <div className="relative w-full sm:w-56 shrink-0">
                        <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={currentVal > 0 ? currentVal.toLocaleString("id-ID") : ""}
                          onChange={(e) => handleInputChange(item.accountName, e.target.value)}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-1.5 text-xs font-mono text-right text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <span className="text-[11px] text-slate-500">
              Data realisasi akan langsung dicompare dengan Budget Head Office.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
              >
                <Save size={15} />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Data Realisasi"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
