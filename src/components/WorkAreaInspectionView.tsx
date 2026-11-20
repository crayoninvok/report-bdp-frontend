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
} from "lucide-react";
import {
  workAreaInspectionService,
  WorkAreaInspectionItem,
  InspectionAreaCategory,
  InspectionStatus,
  WorkAreaSummaryStats,
  DEFAULT_CHECKLIST_TEMPLATES,
  InspectionChecklistItem,
} from "../services/workAreaInspectionService";

interface WorkAreaInspectionViewProps {
  user: User;
  onNavigateToDashboard?: () => void;
  onNavigateToHazardReport?: () => void;
}

export const WorkAreaInspectionView: React.FC<WorkAreaInspectionViewProps> = ({
  user,
  onNavigateToDashboard,
  onNavigateToHazardReport,
}) => {
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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"table" | "checklist_standards">("table");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<WorkAreaInspectionItem | null>(null);

  // Create Form State
  const [newSite, setNewSite] = useState<"MuaraPahu" | "Senyiur">(
    user.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu"
  );
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaCategory, setNewAreaCategory] = useState<InspectionAreaCategory>("Workshop");
  const [newAuditorName, setNewAuditorName] = useState(user.name || "");
  const [newAuditorNrp, setNewAuditorNrp] = useState("");
  const [newAuditorRole, setNewAuditorRole] = useState("SHE Inspector");
  const [newShift, setNewShift] = useState<"Siang" | "Malam">("Siang");
  const [newFindings, setNewFindings] = useState("");
  const [newCorrectiveAction, setNewCorrectiveAction] = useState("");
  const [newPic, setNewPic] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [formChecklists, setFormChecklists] = useState<InspectionChecklistItem[]>([]);

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
    } catch (err) {
      console.error("Gagal memuat data inspeksi area:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize form checklists on modal open
  const handleOpenCreateModal = () => {
    setFormChecklists(
      DEFAULT_CHECKLIST_TEMPLATES.map((tmpl, idx) => ({
        id: `chk-${idx}`,
        category: tmpl.category,
        itemDescription: tmpl.itemDescription,
        isCompliant: true,
        notes: "",
      }))
    );
    setNewAreaName("");
    setNewFindings("");
    setNewCorrectiveAction("");
    setNewPic("");
    setNewTargetDate("");
    setIsCreateModalOpen(true);
  };

  const handleToggleChecklist = (id: string) => {
    setFormChecklists((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isCompliant: !item.isCompliant } : item
      )
    );
  };

  const handleUpdateChecklistNote = (id: string, note: string) => {
    setFormChecklists((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: note } : item))
    );
  };

  // Calculate live score in modal
  const formScore = useMemo(() => {
    if (formChecklists.length === 0) return 100;
    const compliant = formChecklists.filter((c) => c.isCompliant).length;
    return Math.round((compliant / formChecklists.length) * 100);
  }, [formChecklists]);

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) {
      alert("Mohon masukkan nama area yang diinspeksi.");
      return;
    }

    const nonCompliantItems = formChecklists.filter((c) => !c.isCompliant);
    const findingsCount = nonCompliantItems.length;
    const status: InspectionStatus =
      findingsCount === 0
        ? "Compliant"
        : formScore < 80
        ? "Critical"
        : "Need Follow Up";

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().substring(0, 5);

    try {
      await workAreaInspectionService.create({
        date: dateStr,
        time: timeStr,
        jobSite: newSite,
        areaName: newAreaName.trim(),
        areaCategory: newAreaCategory,
        auditorName: newAuditorName.trim() || user.name || "Auditor SHE",
        auditorNrp: newAuditorNrp.trim(),
        auditorRole: newAuditorRole.trim(),
        shift: newShift,
        complianceScore: formScore,
        status,
        findingsCount,
        findingsDescription: newFindings.trim() || undefined,
        correctiveAction: newCorrectiveAction.trim() || undefined,
        pic: newPic.trim() || undefined,
        targetCompletionDate: newTargetDate || undefined,
        checklists: formChecklists,
      });

      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Gagal menyimpan inspeksi: ${err.message}`);
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
      if (categoryFilter !== "ALL" && item.areaCategory !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = item.inspectionNumber.toLowerCase().includes(q);
        const matchArea = item.areaName.toLowerCase().includes(q);
        const matchAuditor = item.auditorName.toLowerCase().includes(q);
        const matchFindings = (item.findingsDescription || "").toLowerCase().includes(q);
        if (!matchNumber && !matchArea && !matchAuditor && !matchFindings) {
          return false;
        }
      }
      return true;
    });
  }, [inspections, categoryFilter, statusFilter, searchQuery]);

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
      "Site",
      "Area Kerja",
      "Kategori Area",
      "Auditor",
      "NRP Auditor",
      "Peran Auditor",
      "Shift",
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
      `"${i.date}"`,
      `"${i.time}"`,
      `"${i.jobSite}"`,
      `"${i.areaName}"`,
      `"${i.areaCategory}"`,
      `"${i.auditorName}"`,
      `"${i.auditorNrp || "-"}"`,
      `"${i.auditorRole}"`,
      `"${i.shift}"`,
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

  const areaCategories: InspectionAreaCategory[] = [
    "Workshop",
    "Hauling Road",
    "Coal Pad",
    "Port / Jetty",
    "Fuel Station",
    "Mess & Camp",
    "Office",
  ];

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
                Standar K3L Operasional • 5R
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <ClipboardList size={22} className="text-[#e95623]" />
              <span>Inspeksi Keselamatan Area Kerja (Work Area Inspection)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Monitoring berkala standar K3L, kebersihan &amp; 5R, fasilitas tanggap darurat, serta kondisi infrastruktur operasional PT Batara Dharma Persada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-98"
              title="Catat Formulir Inspeksi Area Kerja Baru"
            >
              <Plus size={15} className="text-white" />
              <span>Catat Inspeksi Baru</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export Rekap CSV"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              <span className="text-[11px] font-bold text-slate-400 ml-1">Sesi</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              Inspeksi area kerja terdata
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
              Kepatuhan standar 5R &amp; K3L
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
              Bebas temuan mayor
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
              Memerlukan tindakan korektif
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
              Laju follow-up pengawas
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
            Daftar Rekap Inspeksi ({filteredInspections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checklist_standards")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "checklist_standards"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Panduan &amp; Standar K3L Area
          </button>
        </div>

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
                placeholder="Cari nomor inspeksi, nama area kerja, auditor, atau rincian temuan..."
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
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <Filter size={13} className="text-slate-400" />
                <span className="text-slate-500 font-semibold text-[11px]">Area:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  {areaCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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
                    <th className="py-3.5 px-4">Site &amp; Area Kerja</th>
                    <th className="py-3.5 px-4">Auditor / Pengawas</th>
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
                        <span className="font-semibold">Memuat rekap inspeksi area kerja...</span>
                      </td>
                    </tr>
                  ) : filteredInspections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <ClipboardList size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">Tidak ada data inspeksi yang sesuai filter.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ubah kata kunci pencarian atau klik tombol &quot;Catat Inspeksi Baru&quot;.
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
                            {item.date} • {item.time} ({item.shift})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{item.areaName}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                item.jobSite === "Senyiur"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.jobSite === "Senyiur" ? "Senyiur" : "Muara Pahu"}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-medium">
                              {item.areaCategory}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">{item.auditorName}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.auditorRole} {item.auditorNrp ? `• ${item.auditorNrp}` : ""}
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
                              {item.checklists.filter((c) => c.isCompliant).length}/
                              {item.checklists.length} Aspek
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
                              Area Bersih &amp; Sesuai Standar
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
                              title="Lihat Detail Checklist"
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
            4. Main Content Tab 2: Standards & Checklist Guidance
        ---------------------------------------------------------- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFAULT_CHECKLIST_TEMPLATES.map((tmpl, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-orange-200 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623]">
                    {tmpl.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Pilar #{idx + 1}</span>
                </div>
                <p className="text-xs font-bold text-slate-800 leading-relaxed">
                  {tmpl.itemDescription}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <span>Standar K3L PT BDP</span>
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <Check size={11} /> Wajib Diperiksa
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------
          5. Modal: Catat Inspeksi Area Kerja Baru
      ---------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl my-6 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#e95623] text-white">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black">Formulir Inspeksi Area Kerja</h3>
                  <p className="text-xs text-slate-300">
                    Pemeriksaan rutin kepatuhan K3L, 5R, dan fasilitas keselamatan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveInspection} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Site, Area Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Job Site <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  >
                    <option value="MuaraPahu">Site Muara Pahu</option>
                    <option value="Senyiur">Site Senyiur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Kategori Area <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newAreaCategory}
                    onChange={(e) => setNewAreaCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  >
                    {areaCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Nama / Lokasi Spesifik Area <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Workshop Bay 2, Hauling KM 14"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  />
                </div>
              </div>

              {/* Auditor Info & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Nama Auditor / Pengawas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap auditor"
                    value={newAuditorName}
                    onChange={(e) => setNewAuditorName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    NRP Auditor
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor Registrasi Pegawai"
                    value={newAuditorNrp}
                    onChange={(e) => setNewAuditorNrp(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Shift Kerja
                  </label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  >
                    <option value="Siang">Shift Siang (Day)</option>
                    <option value="Malam">Shift Malam (Night)</option>
                  </select>
                </div>
              </div>

              {/* Interactive Checklist Section */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs">
                      Pemeriksaan Aspek K3L &amp; Housekeeping (Checklist)
                    </h4>
                    <p className="text-[10.5px] text-slate-400">
                      Klik tombol status untuk menandai Sesuai (Aman) atau Tidak Sesuai (Temuan)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-slate-500">Skor:</span>
                    <span
                      className={`text-sm font-black font-mono ${
                        formScore >= 90
                          ? "text-emerald-600"
                          : formScore >= 80
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formChecklists.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        chk.isCompliant
                          ? "bg-white border-slate-200"
                          : "bg-rose-50/70 border-rose-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="px-1.5 py-0.2 rounded-sm text-[8.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                            {chk.category}
                          </span>
                        </div>
                        <p className="text-[11.5px] font-semibold text-slate-800">
                          {chk.itemDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(chk.id)}
                          className={`px-3 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                            chk.isCompliant
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-600 text-white hover:bg-rose-700"
                          }`}
                        >
                          {chk.isCompliant ? (
                            <>
                              <Check size={12} />
                              <span>Sesuai</span>
                            </>
                          ) : (
                            <>
                              <X size={12} />
                              <span>Temuan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings & Action Section */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Uraian Temuan / Ketidaksesuaian (Bila ada)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan detail temuan kondisi/tindakan tidak aman yang ditemukan selama inspeksi..."
                    value={newFindings}
                    onChange={(e) => setNewFindings(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Rencana Tindakan Korektif / Rekomendasi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pembersihan tumpahan dan perbaikan bund wall"
                      value={newCorrectiveAction}
                      onChange={(e) => setNewCorrectiveAction(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      PIC Perbaikan &amp; Target
                    </label>
                    <input
                      type="text"
                      placeholder="PIC: Foreman / Supervisor"
                      value={newPic}
                      onChange={(e) => setNewPic(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#e95623]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Simpan Laporan Inspeksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          6. Modal: Detail Checklist Hasil Inspeksi
      ---------------------------------------------------------- */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-mono text-orange-400 font-black">
                  {selectedInspection.inspectionNumber}
                </span>
                <h3 className="text-base font-black text-white">{selectedInspection.areaName}</h3>
                <p className="text-xs text-slate-300">
                  {selectedInspection.date} • {selectedInspection.time} ({selectedInspection.shift}) • Site{" "}
                  {selectedInspection.jobSite === "Senyiur" ? "Senyiur" : "Muara Pahu"}
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
                  <span className="text-[11px] font-bold text-slate-500 block">Auditor</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedInspection.auditorName}
                  </span>
                  <span className="text-[10px] text-slate-400">{selectedInspection.auditorRole}</span>
                </div>
              </div>

              {/* Checklist list */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs mb-2">
                  Hasil Rincian Pemeriksaan Checklist
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedInspection.checklists.map((c, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        c.isCompliant
                          ? "bg-emerald-50/50 border-emerald-100"
                          : "bg-rose-50/70 border-rose-200"
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          {c.category}
                        </span>
                        <span className="font-semibold text-slate-800">{c.itemDescription}</span>
                        {c.notes && (
                          <span className="text-[10px] text-rose-600 block mt-0.5">
                            Catatan: {c.notes}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                          c.isCompliant
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {c.isCompliant ? "Sesuai" : "Temuan"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

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
