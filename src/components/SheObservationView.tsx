"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, JobSite } from "../types/auth";
import {
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  HardHat,
  ChevronRight,
  Trash2,
  X,
  Sparkles,
  MapPin,
  Check,
  ExternalLink,
  Copy,
  Lock,
  Unlock,
  Camera,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import {
  sheObservationService,
  SheObservationItem,
  SheObservationSummaryStats,
  SheObservationFormSettings,
  GOOGLE_FORM_OBSERVATION_URL,
  LOKASI_OBSERVASI_OPTIONS,
  PENANGGUNG_JAWAB_OPTIONS,
  PROJECT_OBSERVATION_OPTIONS,
  LokasiObservasiType,
  ProjectObservationType,
} from "../services/sheObservationService";
import { SheObservationFormPage } from "./SheObservationFormPage";
import { useNotification } from "../context/NotificationContext";

function getPaginationItems(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

interface SheObservationViewProps {
  user: User;
  onNavigateToDashboard?: () => void;
  onNavigateToHazardReport?: () => void;
  onNavigateToInspection?: () => void;
  onNavigateToForm?: () => void;
}

export const SheObservationView: React.FC<SheObservationViewProps> = ({
  user,
  onNavigateToDashboard,
  onNavigateToHazardReport,
  onNavigateToInspection,
  onNavigateToForm,
}) => {
  const { showSuccess, showError, confirm } = useNotification();

  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur" | "ALL">(
    user.jobSite === "Senyiur"
      ? "Senyiur"
      : user.jobSite === "MuaraPahu"
      ? "MuaraPahu"
      : "ALL"
  );

  const [observations, setObservations] = useState<SheObservationItem[]>([]);
  const [stats, setStats] = useState<SheObservationSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Settings & Public Link
  const [formSettings, setFormSettings] = useState<SheObservationFormSettings>(() =>
    sheObservationService.getFormSettings()
  );
  const [isCopiedWebLink, setIsCopiedWebLink] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Modals & Inline Form
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SheObservationItem | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sheObservationService.getObservations(selectedSite);
      setObservations(data);
      const computedStats = sheObservationService.computeStats(data);
      setStats(computedStats);
    } catch (err: any) {
      showError(err.message || "Gagal memuat data observasi keselamatan");
    } finally {
      setLoading(false);
    }
  }, [selectedSite, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy Link Handler
  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/observation-report/form`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopiedWebLink(true);
      showSuccess("Tautan formulir observasi berhasil disalin!");
      setTimeout(() => setIsCopiedWebLink(false), 3000);
    });
  };

  // Toggle Form Open/Closed
  const handleToggleFormOpen = () => {
    const updated = sheObservationService.saveFormSettings({
      isOpen: !formSettings.isOpen,
    });
    setFormSettings(updated);
    showSuccess(
      updated.isOpen
        ? "Formulir observasi berhasil dibuka untuk umum."
        : "Formulir observasi berhasil ditutup sementara."
    );
  };

  // Delete Handler
  const handleDelete = (id: string, num: string) => {
    confirm({
      title: "Hapus Laporan Observasi?",
      message: `Apakah Anda yakin ingin menghapus laporan ${num}? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: "Hapus Laporan",
      type: "danger",
      onConfirm: async () => {
        try {
          await sheObservationService.deleteObservation(id);
          showSuccess(`Laporan observasi ${num} berhasil dihapus.`);
          loadData();
        } catch (err: any) {
          showError(err.message || "Gagal menghapus laporan observasi");
        }
      },
    });
  };

  // Filtered Observations
  const filteredObservations = useMemo(() => {
    return observations.filter((o) => {
      // Status filter
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;

      // Location filter
      if (locationFilter !== "ALL" && !o.lokasiObservasi.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.observationNumber.toLowerCase().includes(q) ||
          o.judulObservasi.toLowerCase().includes(q) ||
          o.namaObserver.toLowerCase().includes(q) ||
          (o.nikObserver && o.nikObserver.toLowerCase().includes(q)) ||
          o.namaObserved.toLowerCase().includes(q) ||
          o.lokasiObservasi.toLowerCase().includes(q) ||
          (o.detailLokasi && o.detailLokasi.toLowerCase().includes(q)) ||
          (o.penanggungJawabArea && o.penanggungJawabArea.toLowerCase().includes(q)) ||
          (o.catatanObservasi && o.catatanObservasi.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [observations, statusFilter, locationFilter, searchQuery]);

  // Paginated Data
  const totalPages = Math.ceil(filteredObservations.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredObservations.slice(start, start + pageSize);
  }, [filteredObservations, currentPage, pageSize]);

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 min-w-0 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------
          1. Header Banner
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-6 md:p-7 min-w-0">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="space-y-2 min-w-0">
            {/* Top row: Site Selector Pills + Status Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full border border-white/15">
                <button
                  type="button"
                  onClick={() => setSelectedSite("MuaraPahu")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "MuaraPahu"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Muara Pahu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite("Senyiur")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "Senyiur"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Senyiur
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSite("ALL")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "ALL"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Semua Site
                </button>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                Safety Observation Program
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  formSettings.isOpen
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                {formSettings.isOpen ? <Unlock size={10} /> : <Lock size={10} />}
                <span>Form: {formSettings.isOpen ? "DIBUKA" : "DITUTUP"}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Eye size={22} className="text-[#e95623]" />
              <span>Observasi Keselamatan Kerja (Safety Observation)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Program observasi perilaku kerja karyawan, pemantauan kepatuhan SOP lapangan, dan intervensi keselamatan operasional armada PT Batara Dharma Persada.
            </p>
          </div>

          {/* Action Buttons in Banner */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#e95623] hover:bg-[#d44819] text-white text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Input Observasi Baru</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all cursor-pointer"
              title="Salin Tautan Form Publik"
            >
              {isCopiedWebLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{isCopiedWebLink ? "Tersalin!" : "Bagikan Link"}</span>
            </button>

            <a
              href={GOOGLE_FORM_OBSERVATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold border border-white/15 transition-all"
              title="Buka Google Form Asli"
            >
              <FileSpreadsheet size={14} />
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={loadData}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/15 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. KPI Metric Summary Cards
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Observasi */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Total Observasi
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 block tracking-tight">
              {stats?.totalObservations ?? observations.length}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block">
              MP: {stats?.muaraPahuCount ?? 0} &bull; SY: {stats?.senyiurCount ?? 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Eye size={22} />
          </div>
        </div>

        {/* Perilaku Aman */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 block uppercase tracking-wider">
              Perilaku Aman
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 block tracking-tight">
              {stats?.safeObservations ?? 0}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold block">
              {stats?.safePercentage ?? 100}% Kepatuhan Posisi &amp; Alat
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Perilaku Berisiko */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-600 block uppercase tracking-wider">
              Perilaku Berisiko
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 block tracking-tight">
              {stats?.riskyObservations ?? 0}
            </span>
            <span className="text-[10px] text-amber-700 font-bold block">
              Telah Diberikan Intervensi Langsung
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Form Status Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
              Status Form Publik
            </span>
            <span
              className={`text-xl sm:text-2xl font-black block tracking-tight ${
                formSettings.isOpen ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formSettings.isOpen ? "Menerima Data" : "Ditutup"}
            </span>
            <button
              type="button"
              onClick={handleToggleFormOpen}
              className="text-[10px] font-bold text-[#e95623] hover:underline cursor-pointer block text-left"
            >
              {formSettings.isOpen ? "Klik untuk Menutup" : "Klik untuk Membuka"}
            </button>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              formSettings.isOpen
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-rose-50 text-rose-600 border-rose-200"
            }`}
          >
            {formSettings.isOpen ? <Unlock size={20} /> : <Lock size={20} />}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Filter & Search Bar
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nomor, judul aktifitas, observer, yang diobservasi, atau lokasi..."
              className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("AMAN");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "AMAN"
                    ? "bg-emerald-600 text-white shadow-2xs font-black"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                Aman
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("BERISIKO");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "BERISIKO"
                    ? "bg-rose-600 text-white shadow-2xs font-black"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                Berisiko
              </button>
            </div>

            {/* Location Dropdown */}
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Lokasi</option>
              {LOKASI_OBSERVASI_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          4. Observation Data Table
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#e95623] flex items-center justify-center font-black text-xs">
              {filteredObservations.length}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Rekapitulasi Laporan Observasi</h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan {paginatedData.length} dari total {filteredObservations.length} data laporan
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-[#e95623] mx-auto" />
            <p className="text-xs font-bold text-slate-500">Memuat data observasi keselamatan...</p>
          </div>
        ) : filteredObservations.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Eye size={36} className="text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-800">Tidak ada data observasi ditemukan</p>
            <p className="text-xs text-slate-400">Silakan sesuaikan filter atau tambahkan laporan observasi baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">No. Observasi</th>
                  <th className="py-3 px-4">Tanggal &amp; Site</th>
                  <th className="py-3 px-4">Observer &rarr; Observed</th>
                  <th className="py-3 px-4">Aktifitas Observasi</th>
                  <th className="py-3 px-4">Lokasi &amp; PIC</th>
                  <th className="py-3 px-4 text-center">Pengamatan Perilaku</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedData.map((item) => {
                  const isRisky = item.status === "BERISIKO";
                  return (
                    <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                      {/* Nomor Observasi */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-[#e95623] block text-xs">
                          {item.observationNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.jobSite === "Senyiur" ? "Site Senyiur" : "Site Muara Pahu"}
                        </span>
                      </td>

                      {/* Tanggal & Site */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">{item.tanggalObservasi}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{item.project}</span>
                      </td>

                      {/* Observer -> Observed */}
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 flex items-center gap-1">
                          <UserIcon size={12} className="text-[#e95623]" />
                          <span>{item.namaObserver}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-slate-700 font-bold">{item.namaObserved}</span>
                        </div>
                      </td>

                      {/* Aktifitas */}
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-bold text-slate-800 line-clamp-2 block leading-relaxed">
                          {item.judulObservasi}
                        </span>
                        {item.catatanObservasi && (
                          <span className="text-[10.5px] text-slate-500 line-clamp-1 italic mt-0.5">
                            &quot;{item.catatanObservasi}&quot;
                          </span>
                        )}
                      </td>

                      {/* Lokasi & PIC */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-black text-slate-800 block flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" />
                          <span>{item.lokasiObservasi}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          PIC: {item.penanggungJawabArea || "PLANT"}
                        </span>
                      </td>

                      {/* 3 Indikator Perilaku */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Posisi */}
                          <span
                            title={`Posisi: ${item.perubahanPosisi}`}
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${
                              item.perubahanPosisi.includes("BERISIKO")
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            Pos
                          </span>
                          {/* Stop Work */}
                          <span
                            title={`Stop Work: ${item.penghentianPekerjaan}`}
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${
                              item.penghentianPekerjaan.includes("BERISIKO")
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            Stop
                          </span>
                          {/* Tool */}
                          <span
                            title={`Tool: ${item.penggantianTool}`}
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${
                              item.penggantianTool.includes("BERISIKO")
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            Tool
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                            isRisky
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isRisky ? <AlertTriangle size={11} /> : <Check size={11} strokeWidth={3} />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Lihat Detail Observasi"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.observationNumber)}
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus Laporan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredObservations.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {getPaginationItems(currentPage, totalPages).map((item, idx) =>
                item === "..." ? (
                  <span key={`el-${idx}`} className="px-2">
                    ...
                  </span>
                ) : (
                  <button
                    key={`pg-${item}`}
                    type="button"
                    onClick={() => setCurrentPage(Number(item))}
                    className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      currentPage === item
                        ? "bg-[#e95623] text-white border-[#e95623]"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------
          5. Modal: Create Observation
      ---------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl my-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#e95623] flex items-center justify-center">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Input Laporan Observasi Keselamatan</h3>
                  <p className="text-[11px] text-slate-500">Formulir resmi Task &amp; Behavioral Safety Observation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <SheObservationFormPage
              user={user}
              onNavigateToList={() => {
                setIsCreateModalOpen(false);
                loadData();
              }}
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          6. Modal: Detail View
      ---------------------------------------------------------- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-[#e95623]">
                  {selectedItem.observationNumber}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {selectedItem.judulObservasi}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Observer</span>
                <span className="font-black text-slate-800">{selectedItem.namaObserver}</span>
                {selectedItem.nikObserver && (
                  <span className="text-[10px] text-slate-500 font-mono block">NIK: {selectedItem.nikObserver}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Karyawan Diamati</span>
                <span className="font-black text-slate-800">{selectedItem.namaObserved}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Tanggal &amp; Site</span>
                <span className="font-bold text-slate-800">
                  {selectedItem.tanggalObservasi} &bull; {selectedItem.project}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Lokasi &amp; PIC</span>
                <span className="font-bold text-slate-800">
                  {selectedItem.lokasiObservasi} (PIC: {selectedItem.penanggungJawabArea || "-"})
                </span>
                {selectedItem.detailLokasi && (
                  <span className="text-[10px] text-slate-500 block italic">{selectedItem.detailLokasi}</span>
                )}
              </div>
            </div>

            {/* Reaksi Pekerja Badges */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-800 block">Kriteria Pengamatan Reaksi Pekerja:</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block font-bold">Perubahan Posisi</span>
                  <span
                    className={`font-black ${
                      selectedItem.perubahanPosisi.includes("BERISIKO") ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {selectedItem.perubahanPosisi}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block font-bold">Stop Work</span>
                  <span
                    className={`font-black ${
                      selectedItem.penghentianPekerjaan.includes("BERISIKO") ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {selectedItem.penghentianPekerjaan}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block font-bold">Penggantian Tool</span>
                  <span
                    className={`font-black ${
                      selectedItem.penggantianTool.includes("BERISIKO") ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {selectedItem.penggantianTool}
                  </span>
                </div>
              </div>
            </div>

            {/* Foto Evidence */}
            {selectedItem.dokumentasi && (
              <div className="space-y-1.5">
                <span className="text-xs font-black text-slate-800 block">Foto Dokumentasi Temuan:</span>
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center">
                  <img
                    src={selectedItem.dokumentasi}
                    alt="Dokumentasi Observasi"
                    className="max-h-64 max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Catatan Observasi & Tindakan Perbaikan */}
            <div className="space-y-3 text-xs">
              {selectedItem.catatanObservasi && (
                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/60 space-y-1">
                  <span className="font-black text-slate-900 block">Catatan Observasi:</span>
                  <p className="text-slate-700 leading-relaxed">{selectedItem.catatanObservasi}</p>
                </div>
              )}
              {selectedItem.tindakanPerbaikan && (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                  <span className="font-black text-emerald-900 block">Tindakan Perbaikan Langsung (Feedback):</span>
                  <p className="text-emerald-800 leading-relaxed">{selectedItem.tindakanPerbaikan}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
