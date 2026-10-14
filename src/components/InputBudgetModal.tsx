"use client";

import React, { useState, useEffect } from "react";
import { User } from "../types/auth";
import { ReportDetails } from "../types/report";
import { reportService } from "../services/reportService";
import { X, Save, AlertCircle, Calculator } from "lucide-react";

interface InputBudgetModalProps {
  user: User;
  reportDetails: ReportDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InputBudgetModal: React.FC<InputBudgetModalProps> = ({
  user,
  reportDetails,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [budgetProduksi, setBudgetProduksi] = useState<number>(0);
  const [itemBudgets, setItemBudgets] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (reportDetails) {
      setBudgetProduksi(reportDetails.produksi.weeklyBudget || 0);
      const initialMap: Record<string, number> = {};
      for (const it of reportDetails.items) {
        initialMap[it.accountName] = it.weeklyBudget || 0;
      }
      setItemBudgets(initialMap);
    }
  }, [reportDetails]);

  if (!isOpen) return null;

  // Calculate live Total Biaya Produksi Budget from parent categories
  const parentAccountNames = new Set(
    reportDetails.items.filter((it) => it.isParent).map((it) => it.accountName)
  );

  let liveTotalBiayaBudget = 0;
  for (const [acc, val] of Object.entries(itemBudgets)) {
    if (parentAccountNames.has(acc)) {
      liveTotalBiayaBudget += Number(val) || 0;
    }
  }

  const liveIdrPerTon =
    budgetProduksi > 0 ? liveTotalBiayaBudget / budgetProduksi : 0;

  const handleInputChange = (accountName: string, valStr: string) => {
    const cleanNum = Number(valStr.replace(/[^0-9]/g, "")) || 0;
    setItemBudgets((prev) => ({
      ...prev,
      [accountName]: cleanNum,
    }));
  };

  const handleProduksiChange = (valStr: string) => {
    const cleanNum = Number(valStr.replace(/[^0-9]/g, "")) || 0;
    setBudgetProduksi(cleanNum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const itemsPayload = Object.entries(itemBudgets).map(([acc, val]) => ({
        accountName: acc,
        budgetCost: val,
      }));

      await reportService.updateBudget(
        reportDetails.report.id,
        user,
        budgetProduksi,
        itemsPayload
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-[#e95623] to-[#d44415] text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                {user.jobSite === "HeadOffice" ? "Head Office" : `Site ${reportDetails.report.jobSite}`}
              </span>
              <span className="text-xs text-orange-100">
                Site: {reportDetails.report.jobSite === "MuaraPahu" ? "Muara Pahu" : reportDetails.report.jobSite === "Senyiur" ? "Senyiur" : reportDetails.report.jobSite}
              </span>
            </div>
            <h2 className="text-base font-bold mt-0.5">
              Input Data Budget – {reportDetails.report.periodName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-orange-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Summary Bar */}
        <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-batara-orange-50/80 border-b border-batara-orange-100 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">Budget Produksi</span>
            <span className="text-sm font-bold text-slate-800">
              {budgetProduksi.toLocaleString("id-ID")} Ton
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">Total Biaya Produksi (Budget)</span>
            <span className="text-sm font-bold text-[#e95623]">
              Rp {liveTotalBiayaBudget.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">Estimasi IDR / Ton</span>
            <span className="text-sm font-bold text-[#595f6b]">
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
                Budget Produksi (Ton)
              </label>
              <div className="relative max-w-xs">
                <input
                  type="text"
                  value={budgetProduksi.toLocaleString("id-ID")}
                  onChange={(e) => handleProduksiChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#e95623]"
                  placeholder="0"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  Ton
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Target tonase produksi tambang untuk periode ini.
              </p>
            </div>

            {/* Cost Accounts Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Alokasi Akun Beban (Budget)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Semua nilai dalam Rupiah (IDR)
                </span>
              </div>

              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
                {reportDetails.items.map((item) => {
                  const isSub = !item.isParent;
                  const currentVal = itemBudgets[item.accountName] || 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg transition-colors ${
                        isSub ? "bg-slate-50/60 pl-6 border-l-2 border-[#e95623]" : "bg-slate-100/70 font-semibold"
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
                            isSub ? "text-slate-700" : "text-slate-900 font-bold"
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
                          className="w-full pl-9 pr-3 py-1.5 text-xs font-mono text-right text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#e95623]"
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
              Perubahan budget akan mengkalkulasi ulang % TC, IDR/Ton, dan YTD.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#e95623] hover:bg-[#d44415] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save size={15} />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Data Budget"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
