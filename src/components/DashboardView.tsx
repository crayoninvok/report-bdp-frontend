"use client";

import React, { useState, useEffect } from "react";
import { User } from "../types/auth";
import { ReportSummary } from "../types/report";
import { reportService } from "../services/reportService";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  FileSpreadsheet,
  Waves,
} from "lucide-react";
import { CostTrendCharts } from "./CostTrendCharts";
import { UploadExcelModal } from "./UploadExcelModal";

interface DashboardViewProps {
  user: User;
  onNavigateToReports?: () => void;
  onNavigateToCostDrivers?: () => void;
  onNavigateToRiverJournal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNavigateToReports,
  onNavigateToCostDrivers,
  onNavigateToRiverJournal,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [muaraPahuReports, setMuaraPahuReports] = useState<ReportSummary[]>([]);
  const [senyiurReports, setSenyiurReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isHeadOffice = user.role === "SuperAdmin" || user.jobSite === "HeadOffice";
  const canSeeMuaraPahu = isHeadOffice || user.jobSite === "MuaraPahu";
  const canSeeSenyiur = isHeadOffice || user.jobSite === "Senyiur";

  useEffect(() => {
    async function loadSummaries() {
      try {
        const promises: Promise<any>[] = [];
        if (canSeeMuaraPahu) promises.push(reportService.getReports("MuaraPahu", 2026));
        else promises.push(Promise.resolve([]));

        if (canSeeSenyiur) promises.push(reportService.getReports("Senyiur", 2026));
        else promises.push(Promise.resolve([]));

        const [mp, sny] = await Promise.all(promises);
        setMuaraPahuReports(mp);
        setSenyiurReports(sny);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSummaries();
  }, [canSeeMuaraPahu, canSeeSenyiur]);

  const latestMP = muaraPahuReports[0];
  const latestSNY = senyiurReports[0];

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Welcome Banner with Meeting Image Background */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-slate-900/15 border border-slate-200/80 min-h-55">
        {/* Background Image */}
        <img
          src="/meeting-image.jpeg"
          alt="Cost Analysis Meeting BDP"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Elegant Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/95 via-slate-900/80 to-slate-900/40" />

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-orange-200 mb-3 border border-white/20">
              <span className="h-2 w-2 rounded-full bg-[#18bebc] animate-pulse" />
              <span>Cost Analytics &bull; PT Batara Dharma Persada</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Selamat Datang, {user.name}
            </h1>
            <p className="text-sm text-slate-200 mt-2 leading-relaxed max-w-2xl">
              Monitoring dan analisis perbandingan Budget vs Realisasi biaya operasional site secara transparan dan akurat.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {/* Upload Excel Button */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/30 border border-emerald-400/30 active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>Upload Excel Mingguan</span>
              </button>

              {onNavigateToReports && (
                <button
                  onClick={onNavigateToReports}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d44415] text-white font-bold text-xs transition-all shadow-md shadow-[#e95623]/30 border border-orange-400/30 active:scale-95 cursor-pointer"
                >
                  <span>Buka Laporan Cost Mingguan</span>
                  <ArrowRight size={15} />
                </button>
              )}

              {onNavigateToCostDrivers && (
                <button
                  onClick={onNavigateToCostDrivers}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-xs transition-all border border-[#e95623]/60 active:scale-95 cursor-pointer shadow-md hover:border-[#e95623]"
                >
                  <Gauge size={15} className="text-[#e95623]" />
                  <span>Cost Driver</span>
                </button>
              )}

              {onNavigateToRiverJournal && (
                <button
                  onClick={onNavigateToRiverJournal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-teal-600/30 border border-teal-400/30 active:scale-95 cursor-pointer"
                >
                  <Waves size={15} />
                  <span>River Journal Tabang</span>
                </button>
              )}
            </div>
          </div>

          {/* Official Logo Glass Badge */}
          <div className="hidden lg:flex shrink-0 items-center justify-center p-3 bg-slate-950/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
            <div className="h-20 w-20 rounded-xl bg-white p-2 flex items-center justify-center shadow-inner">
              <img
                src="/coa-logo-bdp.png"
                alt="Cost Analytics PT Batara Dharma Persada"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Cost Trend Charts (Week & Month with Trendlines) */}
      <CostTrendCharts user={user} initialSite={user.jobSite} />

      {/* Sites Overview Cards */}
      <div className={`grid grid-cols-1 ${canSeeMuaraPahu && canSeeSenyiur ? "md:grid-cols-2" : ""} gap-6`}>
        {/* Site Muara Pahu Card */}
        {canSeeMuaraPahu && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Site Muara Pahu</h3>
                <p className="text-[11px] text-slate-500">
                  Periode Aktif: {latestMP ? latestMP.periodName : "01-08 Okt 2026"}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Aktif
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <Layers size={13} className="text-emerald-600" />
                <span>Target Produksi</span>
              </div>
              <p className="text-base font-extrabold text-slate-800 mt-1">
                {latestMP ? Math.round(latestMP.budgetProduksi).toLocaleString("id-ID") : "173.161"} Ton
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <CheckCircle2 size={13} className="text-blue-600" />
                <span>Realisasi Produksi</span>
              </div>
              <p className="text-base font-extrabold text-slate-800 mt-1">
                {latestMP ? Math.round(latestMP.realisasiProduksi).toLocaleString("id-ID") : "0"} Ton
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              13 Akun Beban siap dimonitor
            </span>
            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Detail Laporan</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
        )}

        {/* Site Senyiur Card */}
        {canSeeSenyiur && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Site Senyiur</h3>
                <p className="text-[11px] text-slate-500">
                  Periode Aktif: {latestSNY ? latestSNY.periodName : "01-08 Okt 2026"}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800">
              Aktif
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <Layers size={13} className="text-amber-600" />
                <span>Target Produksi</span>
              </div>
              <p className="text-base font-extrabold text-slate-800 mt-1">
                {latestSNY ? Math.round(latestSNY.budgetProduksi).toLocaleString("id-ID") : "150.000"} Ton
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <CheckCircle2 size={13} className="text-blue-600" />
                <span>Realisasi Produksi</span>
              </div>
              <p className="text-base font-extrabold text-slate-800 mt-1">
                {latestSNY ? Math.round(latestSNY.realisasiProduksi).toLocaleString("id-ID") : "142.000"} Ton
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              13 Akun Beban siap dimonitor
            </span>
            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Detail Laporan</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Workflow Guidance Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Panduan Alur Kerja Pelaporan Cost Mingguan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">
                1
              </span>
              <span>Input Budget (Head Office)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tim Head Office menginput target Budget Produksi (Ton) dan alokasi budget
              untuk 13 akun beban setiap periode minggu baru.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px]">
                2
              </span>
              <span>Input Realisasi (Site)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              PIC Site Muara Pahu dan Site Senyiur menginput aktual tonase produksi yang
              tercapai dan realisasi pengeluaran riil operasional site.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px]">
                3
              </span>
              <span>Kalkulasi Otomatis & YTD</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sistem secara instan menghitung % TC, IDR/Ton, Cost Under/(Over) mingguan,
              serta akumulasi Year-to-Date (YTD) sesuai format Excel.
            </p>
          </div>
        </div>
      </div>

      {isUploadModalOpen && (
        <UploadExcelModal
          user={user}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            // Refresh data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};
