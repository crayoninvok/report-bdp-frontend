"use client";

import React from "react";
import { ReportDetails } from "../types/report";

interface CostReportTableProps {
  data: ReportDetails;
  viewMode?: "week" | "month" | "full";
  customPeriodLabel?: string;
}

export const CostReportTable: React.FC<CostReportTableProps> = ({
  data,
  viewMode = "full",
  customPeriodLabel,
}) => {
  const { report, produksi, biayaProduksi, items } = data;

  const isWeeklyOnly = viewMode === "week";
  const isMonthlyOnly = viewMode === "month";
  const isFull = viewMode === "full";

  // Format currency with standard Indonesian thousand separator (dot)
  const formatIDR = (val: number | null | undefined, isParenthesisForNegative = true) => {
    if (val === null || val === undefined || val === 0) return "-";
    const rounded = Math.round(val);
    const absStr = Math.abs(rounded).toLocaleString("id-ID");
    if (rounded < 0) {
      return isParenthesisForNegative ? `(${absStr})` : `-${absStr}`;
    }
    return absStr;
  };

  // Format tonnage (float or int with dot separator)
  const formatTon = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    return Math.round(val).toLocaleString("id-ID");
  };

  // Format percentage with 2 decimals (return '-' if 0, null, or undefined)
  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    return `${val.toFixed(2).replace(".", ",")}%`;
  };

  // Format IDR per ton (rounded to whole number or 1 decimal)
  const formatPerTon = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    const rounded = Math.round(val);
    if (rounded < 0) {
      return `(${Math.abs(rounded).toLocaleString("id-ID")})`;
    }
    return rounded.toLocaleString("id-ID");
  };

  // Render variance/difference cell (red if negative, standard if positive)
  const renderVariance = (val: number) => {
    const isNegative = val < 0;
    return (
      <span className={isNegative ? "text-red-600 font-semibold" : "text-slate-800"}>
        {formatIDR(val)}
      </span>
    );
  };

  const renderVariancePerTon = (val: number) => {
    const isNegative = val < 0;
    return (
      <span className={isNegative ? "text-red-600 font-semibold" : "text-slate-800"}>
        {formatPerTon(val)}
      </span>
    );
  };

  const periodHeaderLabel =
    customPeriodLabel ||
    (isMonthlyOnly
      ? `Bulan ${report.periodName.split("-")[1]?.trim() || report.periodName}`
      : report.periodName);

  return (
    <div className="w-full overflow-auto max-h-[calc(100vh-210px)] min-h-120 bg-white rounded-xl shadow-md border border-slate-200 relative">
      <table className="w-full text-xs text-left border-collapse select-text">
        {/* Tier 1 Header: AKUN | Weekly / Monthly Period | YTD Period */}
        <thead className="sticky top-0 z-30 shadow-xs">
          <tr className="text-white text-xs font-bold uppercase tracking-wider text-center h-10">
            {/* AKUN column header */}
            <th className="bg-[#8B0000] px-4 py-2.5 border border-slate-300 min-w-70 text-center align-middle sticky top-0 left-0 z-40 shadow-xs">
              AKUN
            </th>

            {/* Weekly / Monthly Header */}
            <th
              colSpan={8}
              className={`${
                isMonthlyOnly ? "bg-[#05605d]" : "bg-[#0F4C81]"
              } px-4 py-2.5 border border-slate-300 tracking-wide text-sm font-bold text-center sticky top-0 z-30`}
            >
              {periodHeaderLabel}
            </th>

            {/* YTD Header (only in full mode) */}
            {isFull && (
              <th
                colSpan={8}
                className="bg-[#991B1B] px-4 py-2.5 border border-slate-300 tracking-wide text-sm font-bold text-center sticky top-0 z-30"
              >
                YTD {report.periodName.split("-")[1] || report.periodName}
              </th>
            )}
          </tr>

          {/* Tier 2 Header: Column Names */}
          <tr className="text-[11px] font-bold text-white text-center h-9">
            {/* AKUN subheader placeholder */}
            <th className="bg-[#8B0000] px-4 py-2 border border-slate-300 sticky top-10 left-0 z-40"></th>

            {/* Period Subheaders */}
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-25 sticky top-10 z-30`}>
              {isMonthlyOnly ? "BUDGET BULAN" : "BUDGET"}
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-16.25 sticky top-10 z-30`}>
              % TC
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-18.75 sticky top-10 z-30`}>
              IDR/Ton
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-25 sticky top-10 z-30`}>
              {isMonthlyOnly ? "REALISASI BULAN" : "REALISASI"}
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-16.25 sticky top-10 z-30`}>
              % TC
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-18.75 sticky top-10 z-30`}>
              IDR/Ton
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-27.5 leading-tight sticky top-10 z-30`}>
              Cost Under/(Over)<br />per Ton
            </th>
            <th className={`${isMonthlyOnly ? "bg-[#0b7470]" : "bg-[#17568F]"} px-2 py-2 border border-slate-300 min-w-27.5 leading-tight sticky top-10 z-30`}>
              Cost Under/(Over)
            </th>

            {/* YTD Subheaders (only in full mode) */}
            {isFull && (
              <>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-27.5 sticky top-10 z-30">BUDGET</th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-16.25 sticky top-10 z-30">% TC</th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-18.75 sticky top-10 z-30">IDR/Ton</th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-27.5 sticky top-10 z-30">REALISASI</th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-16.25 sticky top-10 z-30">% TC</th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-18.75 sticky top-10 z-30">IDR/Ton</th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-27.5 leading-tight sticky top-10 z-30">
                  Cost Under/(Over)<br />per Ton
                </th>
                <th className="bg-[#B91C1C] px-2 py-2 border border-slate-300 min-w-30 leading-tight sticky top-10 z-30">
                  Cost Under/(Over)
                </th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {/* 1. PRODUKSI ROW */}
          <tr className="bg-slate-50 font-bold border-b border-slate-300 text-slate-900 hover:bg-slate-100/80">
            <td className="px-4 py-2 border border-slate-300 font-extrabold sticky left-0 bg-slate-50 z-10 shadow-xs">
              PRODUKSI
            </td>

            {/* Weekly / Monthly Produksi */}
            <td className="px-3 py-2 border border-slate-300 text-right font-bold">
              {formatTon(produksi.weeklyBudget)}
            </td>
            <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
            <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
            <td className="px-3 py-2 border border-slate-300 text-right font-bold">
              {formatTon(produksi.weeklyRealisasi)}
            </td>
            <td className="px-2 py-2 border border-slate-300 text-center font-semibold">
              {formatPercent(produksi.weeklyPercent)}
            </td>
            <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
            <td className="px-3 py-2 border border-slate-300 text-right">
              <span className={produksi.weeklyVariance > 0 ? "text-red-600" : "text-emerald-700"}>
                {produksi.weeklyVariance !== 0 ? `(${formatTon(produksi.weeklyVariance)})` : "-"}
              </span>
            </td>
            <td className="px-3 py-2 border border-slate-300 text-center font-semibold">
              {produksi.weeklyBudget > 0 && produksi.weeklyRealisasi > 0
                ? `${Math.round((produksi.weeklyRealisasi / produksi.weeklyBudget) * 100)}%`
                : "-"}
            </td>

            {/* YTD Produksi (only in full mode) */}
            {isFull && (
              <>
                <td className="px-3 py-2 border border-slate-300 text-right font-bold">
                  {formatTon(produksi.ytdBudget)}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
                <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
                <td className="px-3 py-2 border border-slate-300 text-right font-bold">
                  {formatTon(produksi.ytdRealisasi)}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
                <td className="px-2 py-2 border border-slate-300 text-center text-slate-400">-</td>
                <td className="px-3 py-2 border border-slate-300 text-right">
                  <span className={produksi.ytdVariance > 0 ? "text-red-600 font-bold" : "text-emerald-700 font-bold"}>
                    {produksi.ytdVariance !== 0 ? `(${formatTon(produksi.ytdVariance)})` : "-"}
                  </span>
                </td>
                <td className="px-3 py-2 border border-slate-300 text-center font-bold">
                  {produksi.ytdBudget > 0 && produksi.ytdRealisasi > 0
                    ? `${Math.round((produksi.ytdRealisasi / produksi.ytdBudget) * 100)}%`
                    : "-"}
                </td>
              </>
            )}
          </tr>

          {/* 2. BIAYA PRODUKSI ROW (Lime Green Highlight) */}
          <tr className="bg-[#D9F99D] font-extrabold text-[#14532D] border-y-2 border-slate-400">
            <td className="px-4 py-2.5 border border-slate-300 sticky left-0 bg-[#D9F99D] z-10 shadow-xs tracking-wide">
              BIAYA PRODUKSI
            </td>

            {/* Weekly / Monthly Biaya Produksi */}
            <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
              {formatIDR(biayaProduksi.weeklyBudget)}
            </td>
            <td className="px-2 py-2.5 border border-slate-300 text-center font-bold">
              {formatPercent(biayaProduksi.weeklyPercentTCBudget)}
            </td>
            <td className="px-2 py-2.5 border border-slate-300 text-right font-bold">
              {formatPerTon(biayaProduksi.weeklyIdrPerTonBudget)}
            </td>
            <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
              {formatIDR(biayaProduksi.weeklyRealisasi)}
            </td>
            <td className="px-2 py-2.5 border border-slate-300 text-center font-bold">
              {formatPercent(biayaProduksi.weeklyPercentTCRealisasi)}
            </td>
            <td className="px-2 py-2.5 border border-slate-300 text-right font-bold">
              {formatPerTon(biayaProduksi.weeklyIdrPerTonRealisasi)}
            </td>
            <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
              {renderVariancePerTon(biayaProduksi.weeklyCostUnderOverPerTon)}
            </td>
            <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
              {renderVariance(biayaProduksi.weeklyCostUnderOver)}
            </td>

            {/* YTD Biaya Produksi (only in full mode) */}
            {isFull && (
              <>
                <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
                  {formatIDR(biayaProduksi.ytdBudget)}
                </td>
                <td className="px-2 py-2.5 border border-slate-300 text-center font-bold">
                  {formatPercent(biayaProduksi.ytdPercentTCBudget)}
                </td>
                <td className="px-2 py-2.5 border border-slate-300 text-right font-bold">
                  {formatPerTon(biayaProduksi.ytdIdrPerTonBudget)}
                </td>
                <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
                  {formatIDR(biayaProduksi.ytdRealisasi)}
                </td>
                <td className="px-2 py-2.5 border border-slate-300 text-center font-bold">
                  {formatPercent(biayaProduksi.ytdPercentTCRealisasi)}
                </td>
                <td className="px-2 py-2.5 border border-slate-300 text-right font-bold">
                  {formatPerTon(biayaProduksi.ytdIdrPerTonRealisasi)}
                </td>
                <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
                  {renderVariancePerTon(biayaProduksi.ytdCostUnderOverPerTon)}
                </td>
                <td className="px-3 py-2.5 border border-slate-300 text-right font-bold">
                  {renderVariance(biayaProduksi.ytdCostUnderOver)}
                </td>
              </>
            )}
          </tr>

          {/* 3. 13 AKUN BEBAN ROWS */}
          {items.map((item) => {
            const isSub = !item.isParent;

            return (
              <tr
                key={item.id}
                className={`border-b border-slate-200 hover:bg-blue-50/40 transition-colors ${
                  isSub ? "bg-slate-50/50 text-slate-700" : "bg-white text-slate-900"
                }`}
              >
                {/* Account Name */}
                <td
                  className={`px-4 py-2 border border-slate-300 sticky left-0 z-10 shadow-xs ${
                    isSub ? "bg-slate-50/90 pl-8 font-medium text-slate-700" : "bg-white font-bold text-[#0284C7]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isSub && <span className="text-slate-400 font-mono text-xs">↳</span>}
                    {item.accountCode && (
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                        {item.accountCode}
                      </span>
                    )}
                    <span className="truncate" title={item.accountName}>
                      {item.accountName}
                    </span>
                  </div>
                </td>

                {/* Weekly / Monthly Budget */}
                <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                  {formatIDR(item.weeklyBudget)}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                  {formatPercent(item.weeklyPercentTCBudget)}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                  {formatPerTon(item.weeklyIdrPerTonBudget)}
                </td>

                {/* Weekly / Monthly Realisasi */}
                <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                  {formatIDR(item.weeklyRealisasi)}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                  {formatPercent(item.weeklyPercentTCRealisasi)}
                </td>
                <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                  {formatPerTon(item.weeklyIdrPerTonRealisasi)}
                </td>

                {/* Weekly / Monthly Variances */}
                <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                  {renderVariancePerTon(item.weeklyCostUnderOverPerTon)}
                </td>
                <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                  {renderVariance(item.weeklyCostUnderOver)}
                </td>

                {/* YTD Budget & Realisasi (only in full mode) */}
                {isFull && (
                  <>
                    <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                      {formatIDR(item.ytdBudget)}
                    </td>
                    <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                      {formatPercent(item.ytdPercentTCBudget)}
                    </td>
                    <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                      {formatPerTon(item.ytdIdrPerTonBudget)}
                    </td>

                    <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                      {formatIDR(item.ytdRealisasi)}
                    </td>
                    <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                      {formatPercent(item.ytdPercentTCRealisasi)}
                    </td>
                    <td className="px-2 py-2 border border-slate-300 text-right font-mono">
                      {formatPerTon(item.ytdIdrPerTonRealisasi)}
                    </td>

                    <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                      {renderVariancePerTon(item.ytdCostUnderOverPerTon)}
                    </td>
                    <td className="px-3 py-2 border border-slate-300 text-right font-mono">
                      {renderVariance(item.ytdCostUnderOver)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
