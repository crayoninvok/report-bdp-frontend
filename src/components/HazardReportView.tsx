"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Camera,
  UploadCloud,
  Image as ImageIcon,
  ZoomIn,
  ExternalLink,
  Loader2,
  CloudUpload,
  ClipboardCheck,
  Copy,
  Check,
  Lock,
  Unlock,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  sheService,
  HazardReportItem,
  HazardCategory,
  HazardRiskLevel,
  HazardStatus,
} from "../services/sheService";
import {
  uploadHazardPhoto,
  getCloudinaryThumbnail,
  getCloudinaryFullPreview,
} from "../services/cloudinaryService";
import { HazardReportPdfModal } from "./HazardReportPdfModal";
import { useNotification } from "../context/NotificationContext";

interface HazardReportViewProps {
  user: any;
  onNavigateToDashboard?: () => void;
  onNavigateToForm?: () => void;
}

export const HazardReportView: React.FC<HazardReportViewProps> = ({
  user,
  onNavigateToDashboard,
  onNavigateToForm,
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

  // Lightbox Modal for Photo Preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Public Form Settings & Control (Open / Close Link)
  const [formSettings, setFormSettings] = useState(() => sheService.getFormSettings());
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  // Upload States
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

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
    photoUrl: "",
    photoPublicId: "",
    evidenceUrl: "",
    evidencePublicId: "",
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

  // Sync Form Settings across tabs and storage events
  useEffect(() => {
    const handleSyncSettings = () => {
      setFormSettings(sheService.getFormSettings());
    };
    window.addEventListener("storage", handleSyncSettings);
    window.addEventListener("bdp-she-form-settings-changed", handleSyncSettings);
    return () => {
      window.removeEventListener("storage", handleSyncSettings);
      window.removeEventListener("bdp-she-form-settings-changed", handleSyncSettings);
    };
  }, []);

  const handleToggleFormStatus = () => {
    const nextStatus = !formSettings.isOpen;
    const updated = sheService.updateFormSettings({ isOpen: nextStatus });
    setFormSettings(updated);
    if (nextStatus) {
      showSuccess("Link formulir Hazard Report berhasil DIBUKA untuk umum.");
    } else {
      showInfo("Link formulir Hazard Report berhasil DITUTUP sementara.");
    }
  };

  const handleCopyFormLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/hazard-report/form`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setIsCopiedLink(true);
        showSuccess("Tautan formulir umum berhasil disalin!");
        setTimeout(() => setIsCopiedLink(false), 2500);
      })
      .catch(() => {
        showError("Gagal menyalin tautan.");
      });
  };

  const handleOpenFormInNewTab = () => {
    if (typeof window !== "undefined") {
      window.open("/hazard-report/form", "_blank");
    }
  };

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
      photoUrl: "",
      photoPublicId: "",
      evidenceUrl: "",
      evidencePublicId: "",
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
      photoUrl: item.photoUrl || "",
      photoPublicId: item.photoPublicId || "",
      evidenceUrl: item.evidenceUrl || "",
      evidencePublicId: item.evidencePublicId || "",
    });
    setIsFormModalOpen(true);
  };

  // Handle Photo Upload to Cloudinary
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "photo" | "evidence"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("File harus berupa gambar (JPG, PNG, WebP).");
      return;
    }

    if (target === "photo") {
      setIsUploadingPhoto(true);
    } else {
      setIsUploadingEvidence(true);
    }

    try {
      const res = await uploadHazardPhoto(file, "bdp-reportapp/hse-folder");
      if (res.secure_url) {
        if (target === "photo") {
          setFormData((prev) => ({
            ...prev,
            photoUrl: res.secure_url,
            photoPublicId: res.public_id || "",
          }));
          showSuccess("Foto bukti temuan berhasil disimpan ke Cloudinary (hse-folder).");
        } else {
          setFormData((prev) => ({
            ...prev,
            evidenceUrl: res.secure_url,
            evidencePublicId: res.public_id || "",
          }));
          showSuccess("Foto bukti penyelesaian berhasil disimpan ke Cloudinary (hse-folder).");
        }
      }
    } catch (err: any) {
      showError(err.message || "Gagal mengunggah foto ke Cloudinary.");
    } finally {
      if (target === "photo") {
        setIsUploadingPhoto(false);
      } else {
        setIsUploadingEvidence(false);
      }
      e.target.value = "";
    }
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
      "Foto Bukti Temuan (Cloudinary)": h.photoUrl || "-",
      "Foto Bukti Penyelesaian (Cloudinary)": h.evidenceUrl || "-",
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
          Top Corporate Header & Site Selector
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#e95623] to-[#cf4010] flex items-center justify-center text-white shadow-md shadow-[#e95623]/25">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-[#e95623]">
                  SHE Module
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  PT Batara Dharma Persada
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Hazard Report (Pelaporan Bahaya)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifikasi kondisi/tindakan tidak aman, near miss, dan pemantauan tindakan koreksi di area tambang.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Site Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              {(["MuaraPahu", "Senyiur", "ALL"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedSite(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedSite === st
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st === "ALL" ? "Semua Site" : st === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </button>
              ))}
            </div>

            {/* Excel Export */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 text-xs font-bold transition-colors cursor-pointer"
              title="Download format Excel Spreadsheet"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* PDF Export */}
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Cetak & Export PDF Formal"
            >
              <FileDown size={15} />
              <span>Export PDF</span>
            </button>

            {/* Kontrol Link Publik (Buka / Tutup & Salin Link) */}
            <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              {/* Status Badge & Toggle Button */}
              <button
                type="button"
                onClick={handleToggleFormStatus}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  formSettings.isOpen
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                    : "bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
                }`}
                title={
                  formSettings.isOpen
                    ? "Status: BUKA (Siapapun dapat mengisi form). Klik untuk MENUTUP formulir."
                    : "Status: DITUTUP (Pengisian dinonaktifkan). Klik untuk MEMBUKA formulir."
                }
              >
                {formSettings.isOpen ? <Unlock size={13} /> : <Lock size={13} />}
                <span>{formSettings.isOpen ? "Link: Buka" : "Link: Ditutup"}</span>
              </button>

              {/* Salin Link Button */}
              <button
                type="button"
                onClick={handleCopyFormLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Salin tautan formulir publik (/hazard-report/form) ke clipboard"
              >
                {isCopiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Main Button: Input Hazard Report (New Tab) */}
            <button
              type="button"
              onClick={handleOpenFormInNewTab}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md shadow-[#e95623]/30 transition-all cursor-pointer hover:scale-[1.02]"
              title="Buka Formulir Hazard Report di Tab Baru (/hazard-report/form)"
            >
              <Plus size={16} />
              <span>Input Hazard Report</span>
              <ExternalLink size={13} className="opacity-80" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Summary KPI Cards
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Hazard</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-400">Kasus</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Site {selectedSite}</span>
        </div>

        {/* Open */}
        <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs p-4 flex flex-col justify-between bg-gradient-to-br from-rose-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-rose-600">Open (Belum Selesai)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-700">{stats.open}</span>
            <span className="text-xs font-semibold text-rose-500">Laporan</span>
          </div>
          <span className="text-[10px] text-rose-500 mt-1">Perlu Tindakan</span>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-2xs p-4 flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-amber-600">In Progress</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{stats.inProgress}</span>
            <span className="text-xs font-semibold text-amber-500">Laporan</span>
          </div>
          <span className="text-[10px] text-amber-500 mt-1">Sedang Dikerjakan</span>
        </div>

        {/* Closed */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-2xs p-4 flex flex-col justify-between bg-gradient-to-br from-emerald-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-emerald-600">Closed (Selesai)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{stats.closed}</span>
            <span className="text-xs font-semibold text-emerald-500">Laporan</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">{stats.resolutionRate}% Tingkat Selesai</span>
        </div>

        {/* Critical & High */}
        <div className="bg-white rounded-2xl border border-orange-200/80 shadow-2xs p-4 flex flex-col justify-between bg-gradient-to-br from-orange-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-orange-600">Risiko Tinggi / Kritis</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-orange-700">{stats.critical}</span>
            <span className="text-xs font-semibold text-orange-500">Kasus</span>
          </div>
          <span className="text-[10px] text-orange-500 mt-1">Prioritas Utama</span>
        </div>

        {/* Near Miss */}
        <div className="bg-white rounded-2xl border border-indigo-200/80 shadow-2xs p-4 flex flex-col justify-between bg-gradient-to-br from-indigo-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-indigo-600">Near Miss</span>
          <div className="flex items-baseline justify-between mt-2">
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

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Unsafe Condition">Unsafe Condition</option>
              <option value="Unsafe Action">Unsafe Action</option>
              <option value="Environmental">Environmental</option>
              <option value="Near Miss">Near Miss</option>
              <option value="Health & Hygiene">Health & Hygiene</option>
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Semua Risiko</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <button
              type="button"
              onClick={loadHazards}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Counter Results */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
          <span>
            Menampilkan <strong className="text-slate-700">{filteredHazards.length}</strong> dari {hazards.length} laporan
          </span>
          {(statusFilter !== "ALL" || categoryFilter !== "ALL" || riskFilter !== "ALL" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
                setRiskFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-[#e95623] hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* ---------------------------------------------------------
            Main Data Table with Photo Thumbnails
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
                <th className="py-3 px-3 w-20 text-center">Risiko</th>
                <th className="py-3 px-3 min-w-56">Judul Temuan &amp; Deskripsi</th>
                <th className="py-3 px-3 min-w-44">Tindakan Koreksi</th>
                <th className="py-3 px-3 w-28 text-center">Foto Bukti</th>
                <th className="py-3 px-3 w-28">PIC &amp; Due Date</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
                <th className="py-3 px-3 w-20 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredHazards.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
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

                      {/* Foto Bukti Column (Cloudinary) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(item.photoUrl || null);
                                setLightboxTitle(`Bukti Temuan • ${item.reportNumber}`);
                              }}
                              className="relative group block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-[#e95623] transition-all cursor-pointer shadow-2xs"
                              title="Klik untuk melihat Foto Temuan"
                            >
                              <img
                                src={getCloudinaryThumbnail(item.photoUrl, 80, 80)}
                                alt="Foto Temuan"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <ZoomIn size={12} />
                              </div>
                            </button>
                          ) : (
                            <span
                              className="w-10 h-10 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300"
                              title="Belum ada foto temuan"
                            >
                              <ImageIcon size={14} />
                            </span>
                          )}

                          {item.evidenceUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(item.evidenceUrl || null);
                                setLightboxTitle(`Bukti Perbaikan • ${item.reportNumber}`);
                              }}
                              className="relative group block w-10 h-10 rounded-lg overflow-hidden border border-emerald-300 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer shadow-2xs"
                              title="Klik untuk melihat Foto Bukti Perbaikan"
                            >
                              <img
                                src={getCloudinaryThumbnail(item.evidenceUrl, 80, 80)}
                                alt="Foto Selesai"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                loading="lazy"
                              />
                              <span className="absolute bottom-0 right-0 bg-emerald-600 text-white p-0.5 rounded-tl">
                                <CheckCircle2 size={8} />
                              </span>
                            </button>
                          )}
                        </div>
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
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Job Site <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.jobSite}
                    onChange={(e) => setFormData({ ...formData, jobSite: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="MuaraPahu">Muara Pahu</option>
                    <option value="Senyiur">Senyiur</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Temuan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Waktu (Jam:Menit)
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Lokasi / Area Spesifik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hauling Road KM 14+200, Workshop Bay 2, Jetty Hopper"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
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
                    <option value="Unsafe Condition">Unsafe Condition (Kondisi Tidak Aman)</option>
                    <option value="Unsafe Action">Unsafe Action (Tindakan Tidak Aman)</option>
                    <option value="Environmental">Environmental (Pencemaran/Lingkungan)</option>
                    <option value="Near Miss">Near Miss (Hampir Celaka)</option>
                    <option value="Health & Hygiene">Health & Hygiene (Kesehatan Kerja)</option>
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
                    <option value="Medium">Medium (Sedang - Jadwalkan Perbaikan)</option>
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

              {/* ---------------------------------------------------------
                  Cloudinary Photo Upload Section
              ---------------------------------------------------------- */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera size={14} className="text-[#e95623]" />
                      Dokumentasi Foto Bukti (Cloudinary)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Tersimpan di Cloud: <code className="bg-orange-50 text-[#e95623] px-1 py-0.2 rounded font-bold">bdp-reportapp/hse-folder</code>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Foto Temuan (Before) */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-slate-600 block">
                        1. Foto Temuan (Before)
                      </span>
                      {formData.photoUrl && (
                        <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Cloudinary OK
                        </span>
                      )}
                    </div>

                    {formData.photoUrl ? (
                      <div className="space-y-2">
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-100 flex items-center justify-center">
                          <img
                            src={getCloudinaryThumbnail(formData.photoUrl, 400, 300)}
                            alt="Bukti Temuan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(formData.photoUrl);
                                setLightboxTitle("Pratinjau Foto Temuan");
                              }}
                              className="px-2 py-1 rounded bg-white text-slate-800 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                            >
                              <ZoomIn size={11} /> Lihat
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, photoUrl: "", photoPublicId: "" })}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-rose-700 cursor-pointer"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="w-full py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                          <Pencil size={10} /> Ganti Foto Temuan
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "photo")}
                        />
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-slate-300 hover:border-[#e95623] rounded-xl flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-orange-50/20 transition-all cursor-pointer disabled:opacity-60"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 size={24} className="text-[#e95623] animate-spin" />
                              <span className="text-[11px] font-bold text-slate-600">
                                Mengunggah ke Cloudinary...
                              </span>
                              <span className="text-[9px] text-slate-400">bdp-reportapp/hse-folder</span>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-[#e95623] flex items-center justify-center">
                                <Camera size={16} />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                Ambil / Upload Foto Temuan
                              </span>
                              <span className="text-[10px] text-slate-400">
                                JPG, PNG, atau WebP (Maks 10MB)
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Foto Bukti Perbaikan (After) */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-slate-600 block">
                        2. Foto Bukti Perbaikan (After)
                      </span>
                      {formData.evidenceUrl && (
                        <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Cloudinary OK
                        </span>
                      )}
                    </div>

                    {formData.evidenceUrl ? (
                      <div className="space-y-2">
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-100 flex items-center justify-center">
                          <img
                            src={getCloudinaryThumbnail(formData.evidenceUrl, 400, 300)}
                            alt="Bukti Perbaikan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(formData.evidenceUrl);
                                setLightboxTitle("Pratinjau Foto Perbaikan");
                              }}
                              className="px-2 py-1 rounded bg-white text-slate-800 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                            >
                              <ZoomIn size={11} /> Lihat
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, evidenceUrl: "", evidencePublicId: "" })}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-rose-700 cursor-pointer"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => evidenceInputRef.current?.click()}
                          className="w-full py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                          <Pencil size={10} /> Ganti Foto Perbaikan
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={evidenceInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "evidence")}
                        />
                        <button
                          type="button"
                          disabled={isUploadingEvidence}
                          onClick={() => evidenceInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer disabled:opacity-60"
                        >
                          {isUploadingEvidence ? (
                            <>
                              <Loader2 size={24} className="text-emerald-600 animate-spin" />
                              <span className="text-[11px] font-bold text-slate-600">
                                Mengunggah ke Cloudinary...
                              </span>
                              <span className="text-[9px] text-slate-400">bdp-reportapp/hse-folder</span>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <ShieldCheck size={16} />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                Upload Foto Bukti Perbaikan
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Dilampirkan saat tindakan selesai
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pelapor & PIC */}
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
                  disabled={isUploadingPhoto || isUploadingEvidence}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d84818] text-white shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isUploadingPhoto || isUploadingEvidence ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Sedang Mengunggah...</span>
                    </>
                  ) : itemToEdit ? (
                    "Simpan Perubahan"
                  ) : (
                    "Kirim Laporan Bahaya"
                  )}
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

              {/* Foto Dokumentasi Section in Detail Modal */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-2">
                  Dokumentasi Foto Bukti (Cloudinary)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Foto Temuan */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                      1. Foto Temuan (Before)
                    </span>
                    {detailItem.photoUrl ? (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => {
                            setLightboxUrl(detailItem.photoUrl || null);
                            setLightboxTitle(`Bukti Temuan • ${detailItem.reportNumber}`);
                          }}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 h-36 bg-slate-900 flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={getCloudinaryThumbnail(detailItem.photoUrl, 400, 300)}
                            alt="Bukti Temuan"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn size={18} />
                          </div>
                        </div>
                        <a
                          href={detailItem.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#e95623] hover:underline font-bold flex items-center gap-1 justify-center py-0.5"
                        >
                          <ExternalLink size={10} /> Buka Foto Asli di Cloudinary
                        </a>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon size={20} className="text-slate-300 mb-1" />
                        <span className="text-[10px]">Tidak ada foto temuan</span>
                      </div>
                    )}
                  </div>

                  {/* Foto Perbaikan */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                      2. Foto Bukti Perbaikan (After)
                    </span>
                    {detailItem.evidenceUrl ? (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => {
                            setLightboxUrl(detailItem.evidenceUrl || null);
                            setLightboxTitle(`Bukti Perbaikan • ${detailItem.reportNumber}`);
                          }}
                          className="relative group rounded-xl overflow-hidden border border-emerald-300 h-36 bg-slate-900 flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={getCloudinaryThumbnail(detailItem.evidenceUrl, 400, 300)}
                            alt="Bukti Perbaikan"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn size={18} />
                          </div>
                        </div>
                        <a
                          href={detailItem.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-1 justify-center py-0.5"
                        >
                          <ExternalLink size={10} /> Buka Foto Asli di Cloudinary
                        </a>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <ShieldCheck size={20} className="text-slate-300 mb-1" />
                        <span className="text-[10px]">Belum ada foto penyelesaian</span>
                      </div>
                    )}
                  </div>
                </div>
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
          Lightbox Modal for Zoomed Photo
      ---------------------------------------------------------- */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera size={14} className="text-[#e95623]" />
                <span className="text-xs font-bold">{lightboxTitle || "Foto Bukti"}</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                  Cloudinary: bdp-reportapp/hse-folder
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Buka gambar resolusi penuh di tab baru"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto">
              <img
                src={getCloudinaryFullPreview(lightboxUrl)}
                alt="Foto Bukti Besar"
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-lg"
              />
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
