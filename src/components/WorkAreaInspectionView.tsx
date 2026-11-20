"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, JobSite } from "../types/auth";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  User as UserIcon,
  ShieldCheck,
  HardHat,
  ChevronRight,
  Eye,
  Trash2,
  X,
  Sparkles,
  MapPin,
  Check,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  Copy,
  Lock,
  Unlock,
  Droplets,
  Camera,
} from "lucide-react";
import {
  workAreaInspectionService,
  WorkAreaInspectionItem,
  WorkAreaSummaryStats,
  WorkAreaFormSettings,
  GOOGLE_FORM_URL,
  LOKASI_INSPEKSI_OPTIONS,
  SHIFT_OPTIONS,
  PROJECT_OPTIONS,
  OIL_TRAP_CHECKLIST_ITEMS,
  LokasiInspeksiType,
  ShiftType,
  ProjectType,
  OilTrapChecklistAnswer,
} from "../services/workAreaInspectionService";
import { manpowerService, MasterManpowerItem } from "../services/manpowerService";
import { useNotification } from "../context/NotificationContext";

interface WorkAreaInspectionViewProps {
  user: User;
  onNavigateToDashboard?: () => void;
  onNavigateToHazardReport?: () => void;
  onNavigateToForm?: () => void;
}

export const WorkAreaInspectionView: React.FC<WorkAreaInspectionViewProps> = ({
  user,
  onNavigateToDashboard,
  onNavigateToHazardReport,
  onNavigateToForm,
}) => {
  const { showSuccess, showError } = useNotification();

  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur" | "ALL">(
    user.jobSite === "Senyiur"
      ? "Senyiur"
      : user.jobSite === "MuaraPahu"
      ? "MuaraPahu"
      : "ALL"
  );
  const [inspections, setInspections] = useState<WorkAreaInspectionItem[]>([]);
  const [stats, setStats] = useState<WorkAreaSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Link & Public Form Settings
  const [formSettings, setFormSettings] = useState<WorkAreaFormSettings>(() =>
    workAreaInspectionService.getFormSettings()
  );
  const [isCopiedGoogleLink, setIsCopiedGoogleLink] = useState(false);
  const [isCopiedWebLink, setIsCopiedWebLink] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"table" | "oil_trap_standards">("table");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<WorkAreaInspectionItem | null>(null);

  // Quick Modal Form State
  const [modalNama, setModalNama] = useState(user.name || "");
  const [modalNik, setModalNik] = useState("");
  const [modalTanggal, setModalTanggal] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [modalLokasi, setModalLokasi] = useState<LokasiInspeksiType>("OIL TRAP");
  const [modalShift, setModalShift] = useState<ShiftType>("SHIFT 1");
  const [modalProject, setModalProject] = useState<ProjectType>(
    user.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"
  );
  const [modalLokasiOilTrap, setModalLokasiOilTrap] = useState("");
  const [modalOilTrapAnswers, setModalOilTrapAnswers] = useState<Record<string, { answer: "AMAN" | "TIDAK AMAN" | "Yang lain"; customAnswer: string }>>(
    () => {
      const initial: Record<string, { answer: "AMAN" | "TIDAK AMAN" | "Yang lain"; customAnswer: string }> = {};
      OIL_TRAP_CHECKLIST_ITEMS.forEach((q) => {
        initial[q] = { answer: "AMAN", customAnswer: "" };
      });
      return initial;
    }
  );
  const [modalCatatan, setModalCatatan] = useState("");
  const [modalTindakan, setModalTindakan] = useState("");
  const [modalPic, setModalPic] = useState("");
  const [modalTargetDate, setModalTargetDate] = useState("");

  // Manpower autocomplete for modal
  const [manpowerList, setManpowerList] = useState<MasterManpowerItem[]>([]);
  const [isManpowerDropdownOpen, setIsManpowerDropdownOpen] = useState(false);
  const [manpowerSearch, setManpowerSearch] = useState("");

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        workAreaInspectionService.getAll(selectedSite),
        workAreaInspectionService.getSummaryStats(selectedSite),
      ]);
      setInspections(list);
      setStats(summary);
      setFormSettings(workAreaInspectionService.getFormSettings());
    } catch (err) {
      console.error("Gagal memuat data inspeksi area:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSite]);

  useEffect(() => {
    loadData();

    // Fetch manpower for modal
    manpowerService.getSiteActiveManpower().then((res) => {
      if (res && res.length > 0) setManpowerList(res);
    });
  }, [loadData]);

  // Copy Google Form Link
  const handleCopyGoogleLink = async () => {
    try {
      await navigator.clipboard.writeText(formSettings.googleFormUrl || GOOGLE_FORM_URL);
      setIsCopiedGoogleLink(true);
      showSuccess("Tautan Google Form Inspeksi Area Kerja disalin ke clipboard!");
      setTimeout(() => setIsCopiedGoogleLink(false), 2500);
    } catch {
      alert("Gagal menyalin tautan.");
    }
  };

  // Copy Internal Web Form Link
  const handleCopyWebLink = async () => {
    try {
      const url = `${window.location.origin}/work-area-inspection/form`;
      await navigator.clipboard.writeText(url);
      setIsCopiedWebLink(true);
      showSuccess("Tautan Web Form (/work-area-inspection/form) disalin ke clipboard!");
      setTimeout(() => setIsCopiedWebLink(false), 2500);
    } catch {
      alert("Gagal menyalin tautan.");
    }
  };

  // Toggle Form Status (Buka / Tutup)
  const handleToggleFormStatus = () => {
    const nextStatus = !formSettings.isOpen;
    const updated = workAreaInspectionService.updateFormSettings({ isOpen: nextStatus });
    setFormSettings(updated);
    if (nextStatus) {
      showSuccess("Status Formulir: DIBUKA (Pekerja dapat mengisi form)");
    } else {
      showError("Status Formulir: DITUTUP SEMENTARA");
    }
  };

  // Open Form Page
  const handleOpenFormInNewTab = () => {
    if (onNavigateToForm) {
      onNavigateToForm();
    } else {
      window.open("/work-area-inspection/form", "_blank");
    }
  };

  // Quick Modal Submit
  const handleSaveModalInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNama.trim() || !modalNik.trim()) {
      alert("Nama Karyawan dan NIK Karyawan wajib diisi.");
      return;
    }

    const isOilTrap = modalLokasi === "OIL TRAP";
    let findingsCount = 0;
    let complianceScore = 100;
    let findingsDesc = "";
    let formattedAnswers: OilTrapChecklistAnswer[] | undefined = undefined;

    if (isOilTrap) {
      formattedAnswers = OIL_TRAP_CHECKLIST_ITEMS.map((q) => {
        const item = modalOilTrapAnswers[q] || { answer: "AMAN", customAnswer: "" };
        if (item.answer === "TIDAK AMAN") {
          findingsCount++;
          findingsDesc += `${q}: TIDAK AMAN${item.customAnswer ? ` (${item.customAnswer})` : ""}; `;
        }
        return {
          itemQuestion: q,
          answer: item.answer,
          customAnswer: item.customAnswer || undefined,
        };
      });
      const totalQ = OIL_TRAP_CHECKLIST_ITEMS.length;
      complianceScore = Math.round(((totalQ - findingsCount) / totalQ) * 100);
    } else {
      if (modalCatatan.trim()) {
        findingsCount = 1;
        complianceScore = 80;
        findingsDesc = modalCatatan.trim();
      }
    }

    const status =
      findingsCount === 0
        ? "Compliant"
        : complianceScore < 80
        ? "Critical"
        : "Need Follow Up";

    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    try {
      await workAreaInspectionService.create({
        namaKaryawan: modalNama.trim(),
        nikKaryawan: modalNik.trim(),
        tanggalInspeksi: modalTanggal,
        lokasiInspeksi: modalLokasi,
        shift: modalShift,
        project: modalProject,
        lokasiOilTrap: isOilTrap ? modalLokasiOilTrap.trim() : undefined,
        oilTrapAnswers: formattedAnswers,
        jobSite: modalProject === "SENYIUR" ? "Senyiur" : "MuaraPahu",
        areaName: isOilTrap
          ? modalLokasiOilTrap.trim() || `Oil Trap ${modalProject}`
          : `${modalLokasi} ${modalProject}`,
        time: timeStr,
        complianceScore,
        status,
        findingsCount,
        findingsDescription: findingsDesc.trim() || undefined,
        correctiveAction: modalTindakan.trim() || undefined,
        pic: modalPic.trim() || undefined,
        targetCompletionDate: modalTargetDate || undefined,
      });

      setIsCreateModalOpen(false);
      loadData();
      showSuccess("Inspeksi Area Kerja berhasil disimpan!");
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  const handleDeleteInspection = async (id: string, num: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data inspeksi ${num}?`)) {
      await workAreaInspectionService.delete(id);
      loadData();
      if (selectedInspection?.id === id) {
        setSelectedInspection(null);
      }
    }
  };

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      if (locationFilter !== "ALL" && item.lokasiInspeksi !== locationFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = item.inspectionNumber.toLowerCase().includes(q);
        const matchArea = item.areaName.toLowerCase().includes(q);
        const matchAuditor = item.namaKaryawan.toLowerCase().includes(q);
        const matchNik = (item.nikKaryawan || "").toLowerCase().includes(q);
        const matchFindings = (item.findingsDescription || "").toLowerCase().includes(q);
        if (!matchNumber && !matchArea && !matchAuditor && !matchNik && !matchFindings) {
          return false;
        }
      }
      return true;
    });
  }, [inspections, locationFilter, statusFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredInspections.length === 0) {
      alert("Tidak ada data inspeksi untuk diekspor.");
      return;
    }

    const headers = [
      "No Inspeksi",
      "Tanggal",
      "Jam",
      "Shift",
      "Project",
      "Lokasi Inspeksi",
      "Rincian Area / Oil Trap",
      "Nama Karyawan",
      "NIK Karyawan",
      "Skor Kepatuhan (%)",
      "Status",
      "Jumlah Temuan",
      "Uraian Temuan",
      "Tindakan Perbaikan",
      "PIC",
      "Target Selesai",
    ];

    const rows = filteredInspections.map((i) => [
      `"${i.inspectionNumber}"`,
      `"${i.tanggalInspeksi}"`,
      `"${i.time}"`,
      `"${i.shift}"`,
      `"${i.project}"`,
      `"${i.lokasiInspeksi}"`,
      `"${i.lokasiOilTrap || i.areaName}"`,
      `"${i.namaKaryawan}"`,
      `"${i.nikKaryawan || "-"}"`,
      i.complianceScore,
      `"${i.status}"`,
      i.findingsCount,
      `"${(i.findingsDescription || "-").replace(/"/g, '""')}"`,
      `"${(i.correctiveAction || "-").replace(/"/g, '""')}"`,
      `"${i.pic || "-"}"`,
      `"${i.targetCompletionDate || "-"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Inspeksi_Area_Kerja_BDP_${selectedSite}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 min-w-0 animate-in fade-in duration-300 font-sans">
      {/* ---------------------------------------------------------
          1. Corporate Header Banner (Aligned with Periodic Service & SHE)
      ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-6 md:p-7 min-w-0">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
          <div className="space-y-1.5 min-w-0">
            {/* Top row: Site Selector Pills & Compliance Badges */}
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

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                Standar K3L Operasional • Oil Trap &amp; 5R
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <ClipboardList size={22} className="text-[#e95623]" />
              <span>Inspeksi Keselamatan Area Kerja (Work Area Inspection)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Monitoring berkala standar K3L, kebersihan 5R, fasilitas tanggap darurat, penampungan limbah, serta kompartemen oil trap PT Batara Dharma Persada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Input Inspeksi Button */}
            <button
              type="button"
              onClick={handleOpenFormInNewTab}
              className="px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-98"
              title="Buka Formulir Input Inspeksi Area Kerja"
            >
              <Plus size={15} className="text-white" />
              <span>Input Inspeksi</span>
            </button>

            {/* Direct Link to Google Form */}
            <a
              href={formSettings.googleFormUrl || GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Buka link resmi Google Form di tab baru"
            >
              <span>Link Google Form</span>
              <ExternalLink size={13} className="text-orange-400" />
            </a>

            {/* Link Control: Open/Close Toggle & Salin Link */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-white/10 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={handleToggleFormStatus}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                  formSettings.isOpen
                    ? "bg-emerald-500 text-white shadow-2xs"
                    : "bg-rose-500 text-white shadow-2xs"
                }`}
                title={
                  formSettings.isOpen
                    ? "Status: BUKA. Klik untuk MENUTUP formulir."
                    : "Status: DITUTUP. Klik untuk MEMBUKA formulir."
                }
              >
                {formSettings.isOpen ? <Unlock size={11} /> : <Lock size={11} />}
                <span>{formSettings.isOpen ? "Buka" : "Ditutup"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyGoogleLink}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1"
                title="Salin tautan Google Form ke clipboard"
              >
                {isCopiedGoogleLink ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span className="text-emerald-400 font-black">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export Rekap CSV"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-orange-400" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. KPI Summary Cards (5 Cards Layout)
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 min-w-0">
        {/* Card 1: Total Inspeksi */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-slate-500">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Total Inspeksi
              </span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <ClipboardList size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {stats?.totalInspections || 0}
              </span>
              <span className="text-[11px] font-bold text-slate-400 ml-1">Laporan</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              Inspeksi area &amp; oil trap
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="h-full bg-slate-700 rounded-full w-full" />
          </div>
        </div>

        {/* Card 2: Skor Rata-rata Kepatuhan */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-emerald-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-emerald-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                Skor Kepatuhan
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-emerald-600">
                {stats?.averageScore || 100}%
              </span>
              <span className="text-[11px] font-bold text-emerald-500 ml-1">Rata-rata</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-700 mt-0.5 truncate">
              Kepatuhan standar K3L &amp; 5R
            </p>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, stats?.averageScore || 0)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Area Aman / Compliant */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-blue-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-blue-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                Area Sesuai
              </span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-blue-600">
                {stats?.compliantCount || 0}
              </span>
              <span className="text-[11px] font-bold text-blue-400 ml-1">Area Aman</span>
            </div>
            <p className="text-[10px] font-bold text-blue-700 mt-0.5 truncate">
              Bebas temuan bahaya
            </p>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: `${
                  stats?.totalInspections
                    ? Math.round(((stats.compliantCount || 0) / stats.totalInspections) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Need Follow Up */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-amber-200 transition-colors min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1 text-amber-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                Perlu Follow Up
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-amber-600">
                {stats?.needFollowUpCount || 0}
              </span>
              <span className="text-[11px] font-bold text-amber-400 ml-1">Temuan</span>
            </div>
            <p className="text-[10px] font-bold text-amber-800 mt-0.5 truncate">
              Memerlukan tindakan perbaikan
            </p>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{
                width: `${
                  stats?.totalInspections
                    ? Math.round(((stats.needFollowUpCount || 0) / stats.totalInspections) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Card 5: Resolusi Temuan */}
        <div className="rounded-2xl p-3.5 sm:p-4 bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-orange-200 transition-colors min-w-0 col-span-2 sm:col-span-1">
          <div>
            <div className="flex items-center justify-between gap-1 text-[#e95623]">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#e95623]">
                Tindakan Selesai
              </span>
              <div className="p-1.5 rounded-lg bg-orange-50 text-[#e95623]">
                <HardHat size={15} />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black font-mono tracking-tight text-[#e95623]">
                {stats?.resolutionRate || 100}%
              </span>
              <span className="text-[11px] font-bold text-orange-400 ml-1">Terselesaikan</span>
            </div>
            <p className="text-[10px] font-bold text-orange-700 mt-0.5 truncate">
              Resolusi tindak lanjut pengawas
            </p>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="h-full bg-[#e95623] rounded-full"
              style={{ width: `${stats?.resolutionRate || 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Quick Links & Tabs
      ---------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "table"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daftar Rekap Hasil Inspeksi ({filteredInspections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("oil_trap_standards")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "oil_trap_standards"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Standar Pemeriksaan Oil Trap (11 Item)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToHazardReport && (
            <button
              type="button"
              onClick={onNavigateToHazardReport}
              className="text-xs font-bold text-[#e95623] hover:text-[#c44114] flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-orange-50 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <ShieldAlert size={14} />
              <span>Lihat Hazard Report Terkait</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------
          4. Main Content Tab 1: Table View
      ---------------------------------------------------------- */}
      {activeTab === "table" ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari no inspeksi, lokasi area kerja, nama karyawan, NIK, atau rincian temuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Location Filter (17 choices from Google Form) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Filter size={13} className="text-slate-400" />
                <span className="text-slate-500 font-semibold text-[11px]">Area:</span>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer max-w-36 truncate"
                >
                  <option value="ALL">Semua 17 Lokasi</option>
                  {LOKASI_INSPEKSI_OPTIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Compliant">Aman (Compliant)</option>
                  <option value="Need Follow Up">Perlu Tindak Lanjut</option>
                  <option value="Critical">Kritis (Critical)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Dokumen &amp; Waktu</th>
                    <th className="py-3.5 px-4">Project &amp; Lokasi Inspeksi</th>
                    <th className="py-3.5 px-4">Karyawan / NIK</th>
                    <th className="py-3.5 px-4 text-center">Skor Kepatuhan</th>
                    <th className="py-3.5 px-4">Temuan &amp; Tindakan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto text-[#e95623] mb-2" />
                        <span className="font-semibold">Memuat data rekap inspeksi area...</span>
                      </td>
                    </tr>
                  ) : filteredInspections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <ClipboardList size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">Tidak ada data inspeksi yang sesuai filter.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ubah kata kunci pencarian atau klik tombol &quot;Input Inspeksi&quot;.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredInspections.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 block font-mono">
                            {item.inspectionNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} className="text-slate-400" />
                            {item.tanggalInspeksi} • {item.time} ({item.shift})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">
                            {item.lokasiOilTrap || item.areaName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                item.project === "SENYIUR"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.project}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-bold">
                              {item.lokasiInspeksi}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">{item.namaKaryawan}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            NIK: {item.nikKaryawan || "-"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${
                                item.complianceScore >= 90
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.complianceScore >= 80
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {item.complianceScore}%
                            </span>
                            <span className="text-[9.5px] text-slate-400 mt-0.5">
                              {item.oilTrapAnswers
                                ? `${item.oilTrapAnswers.filter((a) => a.answer === "AMAN").length}/${item.oilTrapAnswers.length} Aspek`
                                : item.findingsCount === 0
                                ? "Kondisi Aman"
                                : "Ada Temuan"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          {item.findingsCount > 0 ? (
                            <div>
                              <span className="text-amber-700 font-bold block truncate" title={item.findingsDescription}>
                                ⚠️ {item.findingsCount} Temuan: {item.findingsDescription || "Perlu follow-up"}
                              </span>
                              {item.correctiveAction && (
                                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                                  Tindakan: {item.correctiveAction}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              Semua Item Sesuai &amp; Aman
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              item.status === "Compliant"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "Need Follow Up"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {item.status === "Compliant"
                              ? "Aman"
                              : item.status === "Need Follow Up"
                              ? "Perlu Follow-up"
                              : "Kritis"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedInspection(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Lihat Detail Checklist & Dokumentasi"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInspection(item.id, item.inspectionNumber)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Data Inspeksi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------
            4. Main Content Tab 2: Standar Pemeriksaan Oil Trap
        ---------------------------------------------------------- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OIL_TRAP_CHECKLIST_ITEMS.map((itemQ, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-orange-200 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623]">
                    Oil Trap Standard
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                </div>
                <p className="text-xs font-bold text-slate-800 leading-relaxed">
                  {itemQ}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <span>Pilihan: AMAN / TIDAK AMAN</span>
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <Check size={11} /> Standar Google Form K3L
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------
          5. Modal: Detail Checklist Hasil Inspeksi
      ---------------------------------------------------------- */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-mono text-orange-400 font-black">
                  {selectedInspection.inspectionNumber}
                </span>
                <h3 className="text-base font-black text-white">
                  {selectedInspection.lokasiOilTrap || selectedInspection.areaName}
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedInspection.tanggalInspeksi} • {selectedInspection.time} ({selectedInspection.shift}) • Project{" "}
                  {selectedInspection.project} • Lokasi: {selectedInspection.lokasiInspeksi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Score and Status overview */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Skor Kepatuhan</span>
                  <span
                    className={`text-2xl font-black font-mono ${
                      selectedInspection.complianceScore >= 90
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {selectedInspection.complianceScore}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 block">Karyawan / Auditor</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedInspection.namaKaryawan}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    NIK: {selectedInspection.nikKaryawan || "-"}
                  </span>
                </div>
              </div>

              {/* Oil Trap Questions breakdown if available */}
              {selectedInspection.oilTrapAnswers && selectedInspection.oilTrapAnswers.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs mb-2">
                    Hasil Pemeriksaan Oil Trap (11 Item)
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {selectedInspection.oilTrapAnswers.map((ans, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                          ans.answer === "AMAN"
                            ? "bg-emerald-50/50 border-emerald-100"
                            : "bg-rose-50/70 border-rose-200"
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{ans.itemQuestion}</span>
                          {ans.customAnswer && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Keterangan: {ans.customAnswer}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                            ans.answer === "AMAN"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {ans.answer}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentation photo if uploaded */}
              {selectedInspection.dokumentasiInspeksi && (
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs mb-2">
                    Dokumentasi Foto Inspeksi
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-sm">
                    <img
                      src={selectedInspection.dokumentasiInspeksi}
                      alt="Dokumentasi Inspeksi"
                      className="w-full h-44 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Findings & Action Plan */}
              {selectedInspection.findingsDescription && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 font-extrabold">
                    <AlertTriangle size={14} />
                    <span>Temuan &amp; Rencana Tindak Lanjut</span>
                  </div>
                  <p className="text-amber-900 font-semibold">{selectedInspection.findingsDescription}</p>
                  {selectedInspection.correctiveAction && (
                    <p className="text-[11px] text-slate-700">
                      <strong>Tindakan:</strong> {selectedInspection.correctiveAction}
                    </p>
                  )}
                  {selectedInspection.pic && (
                    <p className="text-[10.5px] text-slate-500">
                      <strong>PIC:</strong> {selectedInspection.pic}
                      {selectedInspection.targetCompletionDate
                        ? ` • Target: ${selectedInspection.targetCompletionDate}`
                        : ""}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
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
