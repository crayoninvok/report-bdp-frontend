"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Camera,
  UploadCloud,
  X,
  ArrowLeft,
  Send,
  RefreshCw,
  MapPin,
  User as UserIcon,
  Calendar,
  Sparkles,
  Check,
  Building2,
  ExternalLink,
  ChevronRight,
  Search,
  Clock,
  ShieldCheck,
  Droplets,
  HardHat,
  FileSpreadsheet,
} from "lucide-react";
import {
  workAreaInspectionService,
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

interface WorkAreaInspectionFormPageProps {
  user?: any;
  onNavigateToList?: () => void;
  onNavigateToDashboard?: () => void;
  isStandalone?: boolean;
}

export const WorkAreaInspectionFormPage: React.FC<WorkAreaInspectionFormPageProps> = ({
  user,
  onNavigateToList,
  onNavigateToDashboard,
  isStandalone = false,
}) => {
  const { showSuccess, showError } = useNotification();

  // Form Fields (Exact Google Form Mapping)
  const [namaKaryawan, setNamaKaryawan] = useState(user?.name || "");
  const [nikKaryawan, setNikKaryawan] = useState("");
  const [tanggalInspeksi, setTanggalInspeksi] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lokasiInspeksi, setLokasiInspeksi] = useState<LokasiInspeksiType>("OIL TRAP");
  const [shift, setShift] = useState<ShiftType>("SHIFT 1");
  const [project, setProject] = useState<ProjectType>(
    user?.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"
  );

  // Oil Trap Specific Section
  const [lokasiOilTrap, setLokasiOilTrap] = useState("");
  const [oilTrapAnswers, setOilTrapAnswers] = useState<Record<string, { answer: "AMAN" | "TIDAK AMAN" | "Yang lain"; customAnswer: string }>>(
    () => {
      const initial: Record<string, { answer: "AMAN" | "TIDAK AMAN" | "Yang lain"; customAnswer: string }> = {};
      OIL_TRAP_CHECKLIST_ITEMS.forEach((item) => {
        initial[item] = { answer: "AMAN", customAnswer: "" };
      });
      return initial;
    }
  );

  // Other Locations Specific Section
  const [lokasiSpesifik, setLokasiSpesifik] = useState("");
  const [kondisiUmum, setKondisiUmum] = useState<"AMAN" | "TIDAK AMAN">("AMAN");
  const [catatanTemuan, setCatatanTemuan] = useState("");
  const [tindakanPerbaikan, setTindakanPerbaikan] = useState("");
  const [picPerbaikan, setPicPerbaikan] = useState("");
  const [targetSelesai, setTargetSelesai] = useState("");

  // Photo / Evidence
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manpower Autocomplete
  const [manpowerList, setManpowerList] = useState<MasterManpowerItem[]>([]);
  const [isManpowerDropdownOpen, setIsManpowerDropdownOpen] = useState(false);
  const [manpowerSearch, setManpowerSearch] = useState("");
  const manpowerRef = useRef<HTMLDivElement>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [createdDocNumber, setCreatedDocNumber] = useState("");

  // Fetch Manpower
  useEffect(() => {
    let active = true;
    const loadManpower = async () => {
      try {
        const data = await manpowerService.getSiteActiveManpower();
        if (active && data.length > 0) {
          setManpowerList(data);
        }
      } catch (err) {
        console.warn("Gagal memuat master manpower:", err);
      }
    };
    loadManpower();
    return () => {
      active = false;
    };
  }, []);

  // Filtered Manpower
  const filteredManpower = useMemo(() => {
    if (!manpowerSearch.trim()) return manpowerList.slice(0, 8);
    const q = manpowerSearch.toLowerCase();
    return manpowerList
      .filter(
        (m) =>
          (m.fullName || "").toLowerCase().includes(q) ||
          (m.employeeId || m.nik || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [manpowerList, manpowerSearch]);

  // Click outside to close manpower dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (manpowerRef.current && !manpowerRef.current.contains(e.target as Node)) {
        setIsManpowerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectManpower = (m: MasterManpowerItem) => {
    setNamaKaryawan(m.fullName || "");
    setNikKaryawan(m.employeeId || m.nik || "");
    setIsManpowerDropdownOpen(false);
  };

  const handleOilTrapChange = (
    item: string,
    answer: "AMAN" | "TIDAK AMAN" | "Yang lain",
    customAnswer = ""
  ) => {
    setOilTrapAnswers((prev) => ({
      ...prev,
      [item]: { answer, customAnswer },
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKaryawan.trim()) {
      alert("Nama Karyawan wajib diisi.");
      return;
    }
    if (!nikKaryawan.trim()) {
      alert("NIK Karyawan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().substring(0, 5);
      const isOilTrap = lokasiInspeksi === "OIL TRAP";

      // Calculate score and findings
      let findingsCount = 0;
      let complianceScore = 100;
      let findingsDesc = "";
      let answersFormatted: OilTrapChecklistAnswer[] | undefined = undefined;

      if (isOilTrap) {
        answersFormatted = OIL_TRAP_CHECKLIST_ITEMS.map((q) => {
          const ans = oilTrapAnswers[q] || { answer: "AMAN", customAnswer: "" };
          if (ans.answer === "TIDAK AMAN") {
            findingsCount++;
            findingsDesc += `${q}: TIDAK AMAN${ans.customAnswer ? ` (${ans.customAnswer})` : ""}; `;
          }
          return {
            itemQuestion: q,
            answer: ans.answer,
            customAnswer: ans.customAnswer || undefined,
          };
        });
        const totalItems = OIL_TRAP_CHECKLIST_ITEMS.length;
        complianceScore = Math.round(((totalItems - findingsCount) / totalItems) * 100);
      } else {
        if (kondisiUmum === "TIDAK AMAN") {
          findingsCount = 1;
          complianceScore = 75;
          findingsDesc = catatanTemuan.trim() || "Kondisi area kerja tidak aman";
        }
      }

      const status =
        findingsCount === 0
          ? "Compliant"
          : complianceScore < 80
          ? "Critical"
          : "Need Follow Up";

      const areaDisplayName = isOilTrap
        ? lokasiOilTrap.trim() || `Oil Trap ${project}`
        : lokasiSpesifik.trim() || `${lokasiInspeksi} ${project}`;

      const created = await workAreaInspectionService.create({
        namaKaryawan: namaKaryawan.trim(),
        nikKaryawan: nikKaryawan.trim(),
        tanggalInspeksi,
        lokasiInspeksi,
        shift,
        project,
        lokasiOilTrap: isOilTrap ? lokasiOilTrap.trim() : undefined,
        oilTrapAnswers: answersFormatted,
        dokumentasiInspeksi: photoPreview || undefined,
        jobSite: project === "SENYIUR" ? "Senyiur" : "MuaraPahu",
        areaName: areaDisplayName,
        time: timeStr,
        complianceScore,
        status,
        findingsCount,
        findingsDescription: findingsDesc.trim() || undefined,
        correctiveAction: tindakanPerbaikan.trim() || undefined,
        pic: picPerbaikan.trim() || undefined,
        targetCompletionDate: targetSelesai || undefined,
      });

      setCreatedDocNumber(created.inspectionNumber);
      setIsSubmittedSuccess(true);
      showSuccess(`Inspeksi Area Kerja ${created.inspectionNumber} berhasil disimpan!`);
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan formulir inspeksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmittedSuccess(false);
    setCreatedDocNumber("");
    setPhotoPreview(null);
    setLokasiOilTrap("");
    setLokasiSpesifik("");
    setCatatanTemuan("");
    setTindakanPerbaikan("");
    setPicPerbaikan("");
    setTargetSelesai("");
    const resetAnswers: Record<string, { answer: "AMAN" | "TIDAK AMAN" | "Yang lain"; customAnswer: string }> = {};
    OIL_TRAP_CHECKLIST_ITEMS.forEach((item) => {
      resetAnswers[item] = { answer: "AMAN", customAnswer: "" };
    });
    setOilTrapAnswers(resetAnswers);
  };

  // Success view
  if (isSubmittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-8 sm:py-16 px-4 animate-in fade-in zoom-in-95 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Inspeksi Berhasil Disimpan
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">
              Laporan Inspeksi Area Kerja Terkirim!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Data inspeksi telah tersimpan ke sistem pemantauan K3L PT Batara Dharma Persada.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">Nomor Registrasi Dokumen:</span>
            <span className="text-base font-black text-slate-800">{createdDocNumber}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md transition-all cursor-pointer"
            >
              Catat Inspeksi Lainnya
            </button>
            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Lihat Rekapitulasi Tabel
              </button>
            )}
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>Buka Google Form Asli</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-4xl mx-auto space-y-5 pb-24 sm:pb-20 animate-in fade-in duration-300 font-sans">
      {/* ---------------------------------------------------------
          Top Corporate Header & Google Form Banner
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#e95623] to-[#cf4010] flex items-center justify-center text-white shadow-md shadow-[#e95623]/25 shrink-0">
              <ClipboardList size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-[#e95623]">
                  SHE Department
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  PT Batara Dharma Persada
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Formulir Inspeksi Area Kerja
              </h1>
              <p className="text-xs text-slate-500">
                Pemeriksaan kepatuhan standar K3L, 5R, fasilitas tanggap darurat, dan lingkungan kerja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              title="Buka langsung tautan resmi Google Form"
            >
              <span>Link Google Form</span>
              <ExternalLink size={13} className="text-[#e95623]" />
            </a>

            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Daftar Rekap</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Main Form
      ---------------------------------------------------------- */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: Identitas & Lokasi Umum */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserIcon size={16} className="text-[#e95623]" />
              <span>Bagian 1: Identitas Karyawan &amp; Waktu Inspeksi</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              * Menunjukkan kolom pertanyaan yang wajib diisi
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Karyawan with Autocomplete */}
            <div className="relative" ref={manpowerRef}>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                NAMA KARYAWAN <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ketik atau pilih dari Master Manpower..."
                  value={namaKaryawan}
                  onChange={(e) => {
                    setNamaKaryawan(e.target.value);
                    setManpowerSearch(e.target.value);
                    setIsManpowerDropdownOpen(true);
                  }}
                  onFocus={() => setIsManpowerDropdownOpen(true)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
                />
                <UserIcon size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {isManpowerDropdownOpen && filteredManpower.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto text-xs p-1">
                  {filteredManpower.map((m) => (
                    <div
                      key={m.id || m.employeeId}
                      onClick={() => handleSelectManpower(m)}
                      className="p-2.5 hover:bg-orange-50/70 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <span className="font-bold text-slate-900 block">{m.fullName}</span>
                      <span className="text-[10px] text-slate-400">
                        NIK/NRP: {m.employeeId || m.nik || "-"} • {m.jobPosition || "-"} ({m.branchName || m.organization || "-"})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NIK Karyawan */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                NIK KARYAWAN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nomor Induk Karyawan / NRP"
                value={nikKaryawan}
                onChange={(e) => setNikKaryawan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
              />
            </div>

            {/* Tanggal Inspeksi */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                TANGGAL INSPEKSI <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggalInspeksi}
                onChange={(e) => setTanggalInspeksi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
              />
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                SHIFT <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SHIFT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      shift === s
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Project */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                PROJECT <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PROJECT_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProject(p)}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      project === p
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <MapPin size={14} className={project === p ? "text-orange-400" : "text-slate-400"} />
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Lokasi Inspeksi (17 Choices from Google Form) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-[#e95623]" />
              <span>Bagian 2: LOKASI INSPEKSI</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Pilih salah satu dari 17 area kerja resmi sesuai Google Form K3L
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {LOKASI_INSPEKSI_OPTIONS.map((loc) => {
              const isSelected = lokasiInspeksi === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLokasiInspeksi(loc)}
                  className={`p-2.5 rounded-xl border text-[11px] font-black text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-orange-50 border-[#e95623] text-orange-950 shadow-2xs ring-1 ring-[#e95623]/30"
                      : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{loc}</span>
                    {isSelected && <Check size={13} className="text-[#e95623] shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Detail Checklist (OIL TRAP or Other Areas) */}
        {lokasiInspeksi === "OIL TRAP" ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623]">
                  Sub-Form Khusus
                </span>
                <span className="text-[10px] font-bold text-slate-400">11 Item Pemeriksaan</span>
              </div>
              <h2 className="text-sm font-black text-slate-900 mt-1 flex items-center gap-2">
                <Droplets size={16} className="text-[#e95623]" />
                <span>INSPEKSI AREA OIL TRAP</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Pemeriksaan kompartemen, dinding bangunan, saluran inlet/outlet, lapisan oli, dan kebersihan trap
              </p>
            </div>

            {/* Lokasi Oil Trap */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                LOKASI OIL TRAP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Oil Trap Workshop Bay 1, Oil Trap Washing Pad MP"
                value={lokasiOilTrap}
                onChange={(e) => setLokasiOilTrap(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
              />
            </div>

            {/* 11 Questions */}
            <div className="space-y-4 pt-2">
              {OIL_TRAP_CHECKLIST_ITEMS.map((itemQuestion, idx) => {
                const currentAnswer = oilTrapAnswers[itemQuestion]?.answer || "AMAN";
                const customAnswer = oilTrapAnswers[itemQuestion]?.customAnswer || "";

                return (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 ${
                      currentAnswer === "AMAN"
                        ? "bg-white border-slate-200/90"
                        : currentAnswer === "TIDAK AMAN"
                        ? "bg-rose-50/60 border-rose-200"
                        : "bg-amber-50/60 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-mono font-black text-slate-400 mt-0.5">
                        #{idx + 1}
                      </span>
                      <p className="text-xs font-extrabold text-slate-800 leading-snug">
                        {itemQuestion} <span className="text-rose-500">*</span>
                      </p>
                    </div>

                    {/* Radio Choices: AMAN, TIDAK AMAN, Yang lain */}
                    <div className="flex flex-wrap items-center gap-2 pl-5">
                      <button
                        type="button"
                        onClick={() => handleOilTrapChange(itemQuestion, "AMAN")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                          currentAnswer === "AMAN"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Check size={13} />
                        <span>AMAN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOilTrapChange(itemQuestion, "TIDAK AMAN")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                          currentAnswer === "TIDAK AMAN"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <X size={13} />
                        <span>TIDAK AMAN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOilTrapChange(itemQuestion, "Yang lain", customAnswer)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          currentAnswer === "Yang lain"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Yang lain:
                      </button>
                    </div>

                    {/* Custom input if "Yang lain" or "TIDAK AMAN" selected */}
                    {(currentAnswer === "Yang lain" || currentAnswer === "TIDAK AMAN") && (
                      <div className="pl-5 pt-1">
                        <input
                          type="text"
                          placeholder={
                            currentAnswer === "TIDAK AMAN"
                              ? "Rincikan ketidaksesuaian/temuan (opsional)..."
                              : "Tuliskan keterangan lainnya..."
                          }
                          value={customAnswer}
                          onChange={(e) =>
                            handleOilTrapChange(itemQuestion, currentAnswer, e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Form for other 16 Locations */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#e95623]" />
                <span>INSPEKSI AREA: {lokasiInspeksi}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Pemeriksaan kebersihan 5R, rambu K3L, fasilitas darurat, dan kelaikan fasilitas area {lokasiInspeksi}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nama Spesifik Area / Unit
                </label>
                <input
                  type="text"
                  placeholder={`Contoh: ${lokasiInspeksi} Utama Site ${project}`}
                  value={lokasiSpesifik}
                  onChange={(e) => setLokasiSpesifik(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Kondisi Keselamatan Keseluruhan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKondisiUmum("AMAN")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      kondisiUmum === "AMAN"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Check size={14} />
                    <span>AMAN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKondisiUmum("TIDAK AMAN")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      kondisiUmum === "TIDAK AMAN"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <X size={14} />
                    <span>TIDAK AMAN</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Catatan Temuan / Uraian Ketidaksesuaian (Bila ada)
                </label>
                <textarea
                  rows={2}
                  placeholder="Rincikan kondisi atau temuan yang ditemukan di lapangan..."
                  value={catatanTemuan}
                  onChange={(e) => setCatatanTemuan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Rencana Tindakan Korektif
                </label>
                <input
                  type="text"
                  placeholder="Langkah perbaikan yang disarankan"
                  value={tindakanPerbaikan}
                  onChange={(e) => setTindakanPerbaikan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  PIC Perbaikan
                </label>
                <input
                  type="text"
                  placeholder="Foreman / Supervisor terkait"
                  value={picPerbaikan}
                  onChange={(e) => setPicPerbaikan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: Dokumentasi Inspeksi (Image / Drawing upload, maks 10MB) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-3">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Camera size={16} className="text-[#e95623]" />
              <span>Dokumentasi Inspeksi</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Upload 1 file yang didukung: drawing atau image (foto kamera / galeri). Maksimal 10 MB.
            </p>
          </div>

          <input
            type="file"
            accept="image/*,.pdf,.drawing"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-w-sm mx-auto">
              <img
                src={photoPreview}
                alt="Dokumentasi Inspeksi"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-rose-600 text-white transition-colors"
                title="Hapus foto"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-orange-50/30"
            >
              <UploadCloud size={32} className="mx-auto text-slate-400 mb-1.5" />
              <p className="text-xs font-bold text-slate-700">
                Klik untuk mengambil foto atau unggah dokumentasi
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Format file didukung: JPG, PNG, WEBP, Drawing (Maks 10 MB)
              </p>
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <span>Pastikan seluruh data terisi dengan benar sesuai pengamatan di lapangan.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d84818] text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Kirim Laporan Inspeksi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
