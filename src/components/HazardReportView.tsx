"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Sparkles,
  MapPin,
  Tag,
  ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  sheService,
  HazardReportItem,
  HazardCategory,
  HazardRiskLevel,
  HazardStatus,
} from "../services/sheService";
import { HazardReportPdfModal } from "./HazardReportPdfModal";
import { useNotification } from "../context/NotificationContext";

interface HazardReportViewProps {
  user: any;
  onNavigateToDashboard?: () => void;
}

export const HazardReportView: React.FC<HazardReportViewProps> = ({
  user,
  onNavigateToDashboard,
}) => {
  const { confirm, showSuccess, showError, showInfo } = useNotification();

  const [hazards, setHazards] = useState<HazardReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur" | "ALL">(
    user?.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu"
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<HazardReportItem | null>(null);
  const [detailItem, setDetailItem] = useState<HazardReportItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    jobSite: "MuaraPahu" as "MuaraPahu" | "Senyiur",
    date: new Date().toISOString().slice(0, 10),
    time: "08:30",
    location: "",
    category: "Unsafe Condition" as HazardCategory,
    riskLevel: "Medium" as HazardRiskLevel,
    title: "",
    description: "",
    immediateAction: "",
    correctiveAction: "",
    reporterName: user?.namaLengkap || user?.username || "Safety Patrol",
    reporterDept: "Operations",
    picName: "",
    picDept: "Maintenance",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    status: "Open" as HazardStatus,
  });

  const loadHazards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sheService.getHazards(selectedSite);
      setHazards(data);
    } catch (err: any) {
      showError(err.message || "Gagal memuat data hazard report");
    } finally {
      setLoading(false);
    }
  }, [selectedSite, showError]);

  useEffect(() => {
    loadHazards();
  }, [loadHazards]);

  // Filtered List
  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      if (statusFilter !== "ALL" && h.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && h.category !== categoryFilter) return false;
      if (riskFilter !== "ALL" && h.riskLevel !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = h.title.toLowerCase().includes(q);
        const mNum = h.reportNumber.toLowerCase().includes(q);
        const mLoc = h.location.toLowerCase().includes(q);
        const mRep = h.reporterName.toLowerCase().includes(q);
        const mPic = h.picName.toLowerCase().includes(q);
        const mDesc = h.description.toLowerCase().includes(q);
        if (!mTitle && !mNum && !mLoc && !mRep && !mPic && !mDesc) return false;
      }
      return true;
    });
  }, [hazards, statusFilter, categoryFilter, riskFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = hazards.length;
    const open = hazards.filter((h) => h.status === "Open").length;
    const inProgress = hazards.filter((h) => h.status === "In Progress").length;
    const closed = hazards.filter((h) => h.status === "Closed").length;
    const critical = hazards.filter((h) => h.riskLevel === "Critical" || h.riskLevel === "High").length;
    const nearMiss = hazards.filter((h) => h.category === "Near Miss").length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 100;
    return { total, open, inProgress, closed, critical, nearMiss, resolutionRate };
  }, [hazards]);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setItemToEdit(null);
    setFormData({
      jobSite: selectedSite === "ALL" ? "MuaraPahu" : selectedSite,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      location: "",
      category: "Unsafe Condition",
      riskLevel: "Medium",
      title: "",
      description: "",
      immediateAction: "",
      correctiveAction: "",
      reporterName: user?.namaLengkap || user?.username || "Safety Patrol",
      reporterDept: "Operations",
      picName: "",
      picDept: "Maintenance",
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      status: "Open",
    });
    setIsFormModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditModal = (item: HazardReportItem) => {
    setItemToEdit(item);
    setFormData({
      jobSite: item.jobSite,
      date: item.date,
      time: item.time,
      location: item.location,
      category: item.category,
      riskLevel: item.riskLevel,
      title: item.title,
      description: item.description,
      immediateAction: item.immediateAction,
      correctiveAction: item.correctiveAction,
      reporterName: item.reporterName,
      reporterDept: item.reporterDept,
      picName: item.picName,
      picDept: item.picDept,
      dueDate: item.dueDate,
      status: item.status,
    });
    setIsFormModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      showError("Harap isi judul temuan dan lokasi spesifik.");
      return;
    }

    try {
      if (itemToEdit) {
        await sheService.updateHazard(itemToEdit.id, formData);
        showSuccess(`Hazard ${itemToEdit.reportNumber} berhasil diperbarui.`);
      } else {
        const created = await sheService.createHazard(formData);
        showSuccess(`Hazard Report ${created.reportNumber} berhasil dibuat!`);
      }
      setIsFormModalOpen(false);
      loadHazards();
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan hazard report");
    }
  };

  // Quick Status Toggle
  const handleQuickStatusChange = async (item: HazardReportItem, nextStatus: HazardStatus) => {
    try {
      await sheService.updateHazard(item.id, {
        status: nextStatus,
        completionDate: nextStatus === "Closed" ? new Date().toISOString().slice(0, 10) : undefined,
      });
      showSuccess(`Status ${item.reportNumber} diubah ke ${nextStatus}`);
      loadHazards();
    } catch (err: any) {
      showError(err.message || "Gagal mengubah status");
    }
  };

  // Delete Hazard
  const handleDelete = (item: HazardReportItem) => {
    confirm({
      title: "Hapus Hazard Report?",
      message: `Apakah Anda yakin ingin menghapus laporan ${item.reportNumber} (${item.title})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Hapus Laporan",
      type: "danger",
      onConfirm: async () => {
        try {
          await sheService.deleteHazard(item.id);
          showSuccess(`Laporan ${item.reportNumber} berhasil dihapus.`);
          loadHazards();
        } catch (err: any) {
          showError(err.message || "Gagal menghapus laporan");
        }
      },
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredHazards.length === 0) {
      showError("Tidak ada data hazard untuk diekspor.");
      return;
    }

    const dataRows = filteredHazards.map((h, idx) => ({
      No: idx + 1,
      "No. Hazard": h.reportNumber,
      Jobsite: h.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur",
      Tanggal: h.date,
      Waktu: h.time,
      "Lokasi / Area": h.location,
      Kategori: h.category,
      "Tingkat Risiko": h.riskLevel,
      "Judul Temuan": h.title,
      "Deskripsi Bahaya": h.description,
      "Tindakan Langsung": h.immediateAction,
      "Tindakan Koreksi": h.correctiveAction,
      Pelapor: h.reporterName,
      "Dept Pelapor": h.reporterDept,
      "PIC Penanggung Jawab": h.picName,
      "Dept PIC": h.picDept,
      "Target Selesai (Due Date)": h.dueDate,
      "Tgl Selesai": h.completionDate || "-",
      Status: h.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hazard Reports");
    XLSX.writeFile(
      workbook,
      `BDP_Hazard_Report_${selectedSite}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showSuccess("Laporan Hazard Report berhasil diekspor ke format Excel.");
  };

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------
          Corporate Header Banner
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 shadow-xl p-6 sm:p-7">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#e95623] text-white shadow-xs">
                <ShieldAlert size={13} />
                SAFETY, HEALTH &amp; ENVIRONMENT (SHE)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck size={12} />
                HIRA &bull; Hazard Identification &amp; Risk Assessment
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hazard Report &amp; Observation System
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              Pencatatan dan pemantauan kondisi tidak aman (Unsafe Condition), tindakan tidak aman (Unsafe Action),
              potensi insiden near-miss, serta pengawalan tindakan perbaikan di seluruh area tambang &amp; hauling.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Site Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              {(
                [
                  { key: "MuaraPahu", label: "Muara Pahu" },
                  { key: "Senyiur", label: "Senyiur" },
                  { key: "ALL", label: "Semua Site" },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSite(s.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedSite === s.key
                      ? "bg-[#e95623] text-white shadow-md"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadHazards}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-[#e95623]" : ""} />
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
              title="Download format Spreadsheet Excel"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-white border border-white/15 shadow-md transition-all cursor-pointer"
              title="Export PDF / Cetak Dokumen HIRA"
            >
              <FileDown size={15} />
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-[#e95623] hover:bg-[#d84818] text-white shadow-lg transition-all cursor-pointer active:scale-98"
            >
              <Plus size={16} />
              <span>+ Laporkan Bahaya</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Summary KPI Cards
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            Total Laporan
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-400">Temuan</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Hazard terdata</span>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between bg-rose-50/20">
          <span className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1">
            <AlertCircle size={12} />
            Open (Belum Ditangani)
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-700">{stats.open}</span>
            <span className="text-xs font-semibold text-rose-500">Laporan</span>
          </div>
          <span className="text-[10px] text-rose-600 mt-1 font-semibold">Perlu Tindakan Cepat</span>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1">
            <Clock3 size={12} />
            In Progress (Proses)
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-700">{stats.inProgress}</span>
            <span className="text-xs font-semibold text-amber-500">Laporan</span>
          </div>
          <span className="text-[10px] text-amber-600 mt-1 font-semibold">Sedang Perbaikan</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
            <CheckCircle2 size={12} />
            Closed (Selesai)
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">{stats.closed}</span>
            <span className="text-xs font-semibold text-emerald-500">({stats.resolutionRate}%)</span>
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 font-semibold">Terselesaikan</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-500" />
            Risiko Kritis &amp; High
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-red-600">{stats.critical}</span>
            <span className="text-xs font-semibold text-slate-400">Unit/Area</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Prioritas Utama</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500" />
            Insiden Near Miss
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-700">{stats.nearMiss}</span>
            <span className="text-xs font-semibold text-slate-400">Kejadian</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Hampir Celaka</span>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Filter & Search Toolbar
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari hazard (e.g. HZ-MP-001), lokasi, pelapor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={11} /> Status:
              </span>
              {[
                { id: "ALL", label: "Semua" },
                { id: "Open", label: "Open" },
                { id: "In Progress", label: "Progress" },
                { id: "Closed", label: "Closed" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === s.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Risk Filter */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Risiko:</span>
              {[
                { id: "ALL", label: "Semua" },
                { id: "Critical", label: "Critical" },
                { id: "High", label: "High" },
                { id: "Medium", label: "Medium" },
                { id: "Low", label: "Low" },
              ].map((rk) => (
                <button
                  key={rk.id}
                  type="button"
                  onClick={() => setRiskFilter(rk.id)}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    riskFilter === rk.id
                      ? "bg-[#e95623] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rk.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 px-1">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredHazards.length}</strong> dari{" "}
            <strong>{hazards.length}</strong> laporan bahaya
          </span>
          {(searchQuery || statusFilter !== "ALL" || riskFilter !== "ALL" || categoryFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setRiskFilter("ALL");
                setCategoryFilter("ALL");
              }}
              className="text-[11px] font-bold text-[#e95623] hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* ---------------------------------------------------------
            Main Data Table
        ---------------------------------------------------------- */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-28">No. Hazard</th>
                <th className="py-3 px-3 w-28">Tgl &amp; Waktu</th>
                <th className="py-3 px-3 w-36">Lokasi / Area</th>
                <th className="py-3 px-3 w-28">Kategori</th>
                <th className="py-3 px-3 w-24 text-center">Risiko</th>
                <th className="py-3 px-3 min-w-56">Judul Temuan &amp; Deskripsi</th>
                <th className="py-3 px-3 min-w-48">Tindakan Koreksi</th>
                <th className="py-3 px-3 w-28">PIC &amp; Due Date</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
                <th className="py-3 px-3 w-20 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredHazards.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Tidak ada data hazard report yang sesuai filter.</p>
                  </td>
                </tr>
              ) : (
                filteredHazards.map((item, idx) => {
                  let riskBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                      {item.riskLevel}
                    </span>
                  );
                  if (item.riskLevel === "Critical") {
                    riskBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                        Critical
                      </span>
                    );
                  } else if (item.riskLevel === "High") {
                    riskBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-300">
                        High
                      </span>
                    );
                  } else if (item.riskLevel === "Medium") {
                    riskBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        Medium
                      </span>
                    );
                  } else if (item.riskLevel === "Low") {
                    riskBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Low
                      </span>
                    );
                  }

                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                      {item.status}
                    </span>
                  );
                  if (item.status === "Closed") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Closed
                      </span>
                    );
                  } else if (item.status === "In Progress") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                        In Progress
                      </span>
                    );
                  } else if (item.status === "Open") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        Open
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-black text-slate-900 block">{item.reportNumber}</span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {item.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                        <div>{item.date}</div>
                        <div className="text-[10px] text-slate-400">{item.time} WIB</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div className="flex items-start gap-1">
                          <MapPin size={12} className="text-[#e95623] shrink-0 mt-0.5" />
                          <span>{item.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] font-medium">
                        {item.category}
                      </td>
                      <td className="py-3 px-3 text-center">{riskBadge}</td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 block leading-snug mb-0.5">
                          {item.title}
                        </span>
                        <span className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
                          {item.description}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Pelapor: <strong className="text-slate-600">{item.reporterName}</strong> ({item.reporterDept})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 text-[11px] leading-relaxed">
                        <span className="block">{item.correctiveAction}</span>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-extrabold text-slate-800">{item.picName}</div>
                        <div className="text-[10px] text-slate-400">{item.picDept}</div>
                        <div className="text-[10px] font-bold text-orange-700 mt-1">
                          Due: {item.dueDate}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="space-y-1">
                          {statusBadge}
                          {/* Quick Toggle Select */}
                          <select
                            value={item.status}
                            onChange={(e) => handleQuickStatusChange(item, e.target.value as HazardStatus)}
                            className="block w-full text-[10px] py-0.5 px-1 bg-white border border-slate-200 rounded text-slate-700 focus:outline-hidden cursor-pointer"
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">Progress</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailItem(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                            title="Edit Laporan"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                            title="Hapus Laporan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Modal: Input / Edit Hazard Report
      ---------------------------------------------------------- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#e95623]/20 border border-[#e95623]/40 flex items-center justify-center text-[#e95623]">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {itemToEdit ? `Edit Hazard: ${itemToEdit.reportNumber}` : "Input Laporan Bahaya Baru (Hazard Report)"}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Sistem Pelaporan Keselamatan Pertambangan PT Batara Dharma Persada
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">JobSite</label>
                  <select
                    value={formData.jobSite}
                    onChange={(e) => setFormData({ ...formData, jobSite: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="MuaraPahu">Site Muara Pahu</option>
                    <option value="Senyiur">Site Senyiur</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Temuan</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Waktu (Jam)</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Lokasi / Area Spesifik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hauling Road KM 14+200, Main Workshop Bay 2, Jetty Port"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategori Bahaya</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as HazardCategory })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="Unsafe Condition">Kondisi Tidak Aman (Unsafe Condition)</option>
                    <option value="Unsafe Action">Tindakan Tidak Aman (Unsafe Action)</option>
                    <option value="Environmental">Pencemaran Lingkungan (Environmental)</option>
                    <option value="Near Miss">Kejadian Hampir Celaka (Near Miss)</option>
                    <option value="Health & Hygiene">Kesehatan &amp; Higiene Kerja</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tingkat Risiko</label>
                  <select
                    value={formData.riskLevel}
                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as HazardRiskLevel })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="Critical">Critical (Kritis - Hentikan Operasi)</option>
                    <option value="High">High (Tinggi - Segera Tangani)</option>
                    <option value="Medium">Medium (Sedang - Jadwalkan)</option>
                    <option value="Low">Low (Rendah - Pemantauan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status Penanganan</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as HazardStatus })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="Open">Open (Belum Ditangani)</option>
                    <option value="In Progress">In Progress (Sedang Ditangani)</option>
                    <option value="Closed">Closed (Tindakan Selesai)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Judul Singkat Temuan Bahaya <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Permukaan jalan hauling berlubang sedalam 20 cm"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Detail &amp; Potensi Bahaya</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan secara rinci kondisi atau tindakan yang ditemukan serta potensi dampak bahaya bila tidak segera ditangani..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 leading-relaxed font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tindakan Langsung Dilakukan (Immediate Action)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pasang rambu cone pembatas, hentikan aktivitas sementara"
                    value={formData.immediateAction}
                    onChange={(e) => setFormData({ ...formData, immediateAction: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Rencana Tindakan Koreksi (Corrective Action)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grading & penimbunan batu agregat oleh tim sipil"
                    value={formData.correctiveAction}
                    onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-500 block">Identitas Pelapor</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nama Pelapor</label>
                      <input
                        type="text"
                        value={formData.reporterName}
                        onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Departemen</label>
                      <input
                        type="text"
                        value={formData.reporterDept}
                        onChange={(e) => setFormData({ ...formData, reporterDept: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-500 block">Penanggung Jawab (PIC)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nama PIC</label>
                      <input
                        type="text"
                        placeholder="Nama penanggung jawab"
                        value={formData.picName}
                        onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d84818] text-white shadow-md transition-all cursor-pointer"
                >
                  {itemToEdit ? "Simpan Perubahan" : "Kirim Laporan Bahaya"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          Modal: Detail View
      ---------------------------------------------------------- */}
      {isDetailModalOpen && detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#e95623] block tracking-wider">
                  Detail Hazard Report &bull; {detailItem.jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">{detailItem.reportNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold">Waktu Temuan:</span>
                  <strong className="text-slate-800">
                    {detailItem.date} ({detailItem.time} WIB)
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] font-bold">Tingkat Risiko:</span>
                  <span className="font-black text-rose-700">{detailItem.riskLevel}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Lokasi</span>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
                  {detailItem.location}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Subjek / Judul</span>
                <div className="text-sm font-extrabold text-slate-900">{detailItem.title}</div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Deskripsi Bahaya</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                  {detailItem.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Tindakan Langsung</span>
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 font-medium">
                    {detailItem.immediateAction || "-"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Tindakan Koreksi</span>
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 font-medium">
                    {detailItem.correctiveAction || "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Pelapor</span>
                  <div className="font-black text-slate-900">{detailItem.reporterName}</div>
                  <div className="text-[10px] text-slate-400">{detailItem.reporterDept}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Penanggung Jawab (PIC)</span>
                  <div className="font-black text-slate-900">{detailItem.picName || "-"}</div>
                  <div className="text-[10px] text-slate-400">
                    {detailItem.picDept} &bull; Target: {detailItem.dueDate}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">
                Status: <strong className="text-slate-800">{detailItem.status}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          Modal: Export PDF & Cetak
      ---------------------------------------------------------- */}
      <HazardReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        hazards={filteredHazards}
        selectedSite={selectedSite}
      />
    </div>
  );
};
