"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Eye,
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
  HardHat,
  FileSpreadsheet,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import {
  sheObservationService,
  GOOGLE_FORM_OBSERVATION_URL,
  LOKASI_OBSERVASI_OPTIONS,
  PENANGGUNG_JAWAB_OPTIONS,
  PROJECT_OBSERVATION_OPTIONS,
  REAKSI_PEKERJA_OPTIONS,
  LokasiObservasiType,
  PenanggungJawabType,
  ProjectObservationType,
  ReaksiPekerjaOption,
  SheObservationItem,
} from "../services/sheObservationService";
import { manpowerService, MasterManpowerItem } from "../services/manpowerService";
import { useNotification } from "../context/NotificationContext";

interface SheObservationFormPageProps {
  user?: any;
  onNavigateToList?: () => void;
  onNavigateToDashboard?: () => void;
  isStandalone?: boolean;
}

export const SheObservationFormPage: React.FC<SheObservationFormPageProps> = ({
  user,
  onNavigateToList,
  onNavigateToDashboard,
  isStandalone = false,
}) => {
  const { showSuccess, showError } = useNotification();

  // Form Fields
  const [judulObservasi, setJudulObservasi] = useState("");
  const [namaObserver, setNamaObserver] = useState(user?.name || "");
  const [nikObserver, setNikObserver] = useState("");
  const [namaObserved, setNamaObserved] = useState("");
  const [tanggalObservasi, setTanggalObservasi] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [project, setProject] = useState<ProjectObservationType>(
    user?.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"
  );
  const [lokasiObservasi, setLokasiObservasi] = useState<string>("WORKSHOP");
  const [lokasiCustom, setLokasiCustom] = useState("");
  const [detailLokasi, setDetailLokasi] = useState("");
  const [penanggungJawabArea, setPenanggungJawabArea] = useState<string>("PLANT");
  const [penanggungJawabCustom, setPenanggungJawabCustom] = useState("");

  // Reaksi Pekerja
  const [perubahanPosisi, setPerubahanPosisi] = useState<ReaksiPekerjaOption>("AMAN");
  const [perubahanPosisiCustom, setPerubahanPosisiCustom] = useState("");

  const [penghentianPekerjaan, setPenghentianPekerjaan] = useState<ReaksiPekerjaOption>("AMAN");
  const [penghentianPekerjaanCustom, setPenghentianPekerjaanCustom] = useState("");

  const [penggantianTool, setPenggantianTool] = useState<ReaksiPekerjaOption>("AMAN");
  const [penggantianToolCustom, setPenggantianToolCustom] = useState("");

  // Catatan & Tindakan
  const [catatanObservasi, setCatatanObservasi] = useState("");
  const [tindakanPerbaikan, setTindakanPerbaikan] = useState("");

  // Foto / Bukti
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manpower Autocomplete for Observer
  const [manpowerList, setManpowerList] = useState<MasterManpowerItem[]>([]);
  const [isObserverDropdownOpen, setIsObserverDropdownOpen] = useState(false);
  const [observerSearch, setObserverSearch] = useState("");
  const observerRef = useRef<HTMLDivElement>(null);

  // Manpower Autocomplete for Observed
  const [isObservedDropdownOpen, setIsObservedDropdownOpen] = useState(false);
  const [observedSearch, setObservedSearch] = useState("");
  const observedRef = useRef<HTMLDivElement>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedItem, setSubmittedItem] = useState<SheObservationItem | null>(null);

  // Load Manpower
  useEffect(() => {
    let mounted = true;
    manpowerService
      .getSiteActiveManpower()
      .then((data: MasterManpowerItem[]) => {
        if (mounted && Array.isArray(data)) {
          setManpowerList(data);
        }
      })
      .catch((err: any) => console.warn("Failed loading manpower for autocomplete:", err));

    return () => {
      mounted = false;
    };
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (observerRef.current && !observerRef.current.contains(e.target as Node)) {
        setIsObserverDropdownOpen(false);
      }
      if (observedRef.current && !observedRef.current.contains(e.target as Node)) {
        setIsObservedDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered manpower
  const filteredObservers = useMemo(() => {
    if (!observerSearch.trim()) return manpowerList.slice(0, 8);
    const q = observerSearch.toLowerCase();
    return manpowerList
      .filter((m) => {
        return (
          (m.fullName || "").toLowerCase().includes(q) ||
          (m.employeeId || "").toLowerCase().includes(q) ||
          (m.jobPosition || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [manpowerList, observerSearch]);

  const filteredObserveds = useMemo(() => {
    if (!observedSearch.trim()) return manpowerList.slice(0, 8);
    const q = observedSearch.toLowerCase();
    return manpowerList
      .filter((m) => {
        return (
          (m.fullName || "").toLowerCase().includes(q) ||
          (m.employeeId || "").toLowerCase().includes(q) ||
          (m.jobPosition || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [manpowerList, observedSearch]);

  // Handle Photo File Upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Mohon pilih file gambar (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError("Ukuran file maksimal 10MB");
      return;
    }

    setIsUploadingPhoto(true);

    // Create local preview immediately
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPhotoPreview(base64);

      // Try uploading to server endpoint /api/she/upload
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "observations");

        const res = await fetch("/api/she/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.url) {
            setPhotoPreview(json.url);
          }
        }
      } catch (err) {
        console.warn("Upload to /api/she/upload failed, keeping base64", err);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!judulObservasi.trim()) {
      showError("Judul Observasi (Aktifitas yang di Observasi) wajib diisi!");
      return;
    }

    if (!namaObserver.trim()) {
      showError("Nama Karyawan Yang Melakukan Observasi wajib diisi!");
      return;
    }

    if (!namaObserved.trim()) {
      showError("Nama Karyawan yang di Observasi wajib diisi!");
      return;
    }

    const finalLokasi = lokasiObservasi === "Yang lain" ? lokasiCustom.trim() || "Yang lain" : lokasiObservasi;
    const finalPic =
      penanggungJawabArea === "Yang lain" ? penanggungJawabCustom.trim() || "Yang lain" : penanggungJawabArea;

    const finalPerubahan =
      perubahanPosisi === "Yang lain"
        ? `BERISIKO - ${perubahanPosisiCustom.trim() || "Yang lain"}`
        : perubahanPosisi;

    const finalPenghentian =
      penghentianPekerjaan === "Yang lain"
        ? `BERISIKO - ${penghentianPekerjaanCustom.trim() || "Yang lain"}`
        : penghentianPekerjaan;

    const finalPenggantian =
      penggantianTool === "Yang lain"
        ? `BERISIKO - ${penggantianToolCustom.trim() || "Yang lain"}`
        : penggantianTool;

    const isRisky =
      finalPerubahan.includes("BERISIKO") ||
      finalPenghentian.includes("BERISIKO") ||
      finalPenggantian.includes("BERISIKO");

    const payload: Partial<SheObservationItem> = {
      judulObservasi: judulObservasi.trim(),
      namaObserver: namaObserver.trim(),
      nikObserver: nikObserver.trim() || undefined,
      namaObserved: namaObserved.trim(),
      tanggalObservasi,
      lokasiObservasi: finalLokasi,
      detailLokasi: detailLokasi.trim() || undefined,
      penanggungJawabArea: finalPic,
      project,
      jobSite: project === "SENYIUR" ? "Senyiur" : "MuaraPahu",
      perubahanPosisi: finalPerubahan,
      penghentianPekerjaan: finalPenghentian,
      penggantianTool: finalPenggantian,
      status: isRisky ? "BERISIKO" : "AMAN",
      statusGForm: "OPEN",
      catatanObservasi: catatanObservasi.trim() || undefined,
      tindakanPerbaikan: tindakanPerbaikan.trim() || undefined,
      dokumentasi: photoPreview || undefined,
    };

    try {
      setIsSubmitting(true);
      const created = await sheObservationService.createObservation(payload);
      setSubmittedItem(created);
      showSuccess(`Laporan Observasi ${created.observationNumber} berhasil dikirim!`);
    } catch (err: any) {
      showError(err.message || "Gagal mengirim laporan observasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedItem(null);
    setJudulObservasi("");
    setNamaObserved("");
    setDetailLokasi("");
    setLokasiObservasi("WORKSHOP");
    setLokasiCustom("");
    setPenanggungJawabArea("PLANT");
    setPenanggungJawabCustom("");
    setPerubahanPosisi("AMAN");
    setPerubahanPosisiCustom("");
    setPenghentianPekerjaan("AMAN");
    setPenghentianPekerjaanCustom("");
    setPenggantianTool("AMAN");
    setPenggantianToolCustom("");
    setCatatanObservasi("");
    setTindakanPerbaikan("");
    setPhotoPreview(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --------------------------------------------------------------------------
  // SUCCESS VIEW
  // --------------------------------------------------------------------------
  if (submittedItem) {
    const isRisky = submittedItem.status === "BERISIKO";
    return (
      <div className="w-full max-w-2xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center space-y-6">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
              isRisky ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
            }`}
          >
            {isRisky ? <AlertTriangle size={42} /> : <CheckCircle2 size={42} />}
          </div>

          <div className="space-y-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                isRisky ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Observasi Tercatat: {submittedItem.status}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Laporan Observasi Berhasil Dikirim!
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Terima kasih atas kontribusi aktif Anda dalam menjaga keselamatan kerja &amp; kepatuhan perilaku operasional di PT Batara Dharma Persada.
            </p>
          </div>

          {/* Report Number Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Nomor Observasi:</span>
              <span className="font-mono font-black text-[#e95623]">{submittedItem.observationNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Aktifitas:</span>
              <span className="font-bold text-slate-800 truncate max-w-[240px]">{submittedItem.judulObservasi}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Observer / Yang Diobservasi:</span>
              <span className="font-bold text-slate-800">
                {submittedItem.namaObserver} &rarr; {submittedItem.namaObserved}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Lokasi / Project:</span>
              <span className="font-bold text-slate-800">
                {submittedItem.lokasiObservasi} ({submittedItem.project})
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#e95623] hover:bg-[#d44819] text-white text-xs font-black shadow-md cursor-pointer transition-all"
            >
              <Eye size={15} />
              <span>Input Observasi Lainnya</span>
            </button>

            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                <ArrowLeft size={15} />
                <span>Lihat Rekap Observasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FORM VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-7 text-white">
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-56 h-56 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#e95623] text-white shadow-2xs">
                K3L &bull; SHE Safety Observation
              </span>
              <a
                href={GOOGLE_FORM_OBSERVATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              >
                <span>Google Form Asli</span>
                <ExternalLink size={10} />
              </a>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#e95623] shrink-0">
                <Eye size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  Formulir Laporan Observasi Keselamatan
                </h1>
                <p className="text-xs text-slate-300">
                  PT Batara Dharma Persada &bull; Behavioral Safety &amp; Task Observation
                </p>
              </div>
            </div>
          </div>

          {onNavigateToList && (
            <button
              type="button"
              onClick={onNavigateToList}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/15 transition-all self-start md:self-auto cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Daftar</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION A: INFORMASI PELAPOR & OBSERVER */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-[#e95623] flex items-center justify-center">
              <UserIcon size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Bagian 1: Identitas Observer &amp; Karyawan</h2>
              <p className="text-[11px] text-slate-500">Karyawan yang melakukan observasi dan pekerja yang diamati</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Observer with Autocomplete */}
            <div className="relative" ref={observerRef}>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Nama Karyawan Yang Melakukan Observasi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={namaObserver}
                  onChange={(e) => {
                    setNamaObserver(e.target.value);
                    setObserverSearch(e.target.value);
                    setIsObserverDropdownOpen(true);
                  }}
                  onFocus={() => setIsObserverDropdownOpen(true)}
                  placeholder="Ketik nama observer..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
                />
                <Search size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Observer Autocomplete Dropdown */}
              {isObserverDropdownOpen && filteredObservers.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="p-1.5 space-y-1">
                    {filteredObservers.map((m: MasterManpowerItem) => (
                      <div
                        key={m.id || m.employeeId}
                        onClick={() => {
                          setNamaObserver(m.fullName);
                          if (m.employeeId) setNikObserver(m.employeeId);
                          setIsObserverDropdownOpen(false);
                        }}
                        className="px-3 py-2 rounded-xl hover:bg-orange-50/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-800 block">{m.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {m.employeeId || "-"} &bull; {m.jobPosition || m.organization || "Karyawan"}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {m.organization || "BDP"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* NIK Observer */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                NIK Karyawan Yang Melakukan Observasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nikObserver}
                onChange={(e) => setNikObserver(e.target.value)}
                placeholder="Contoh: 98240036"
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none font-mono"
              />
            </div>

            {/* Nama Karyawan Yang Diobservasi with Autocomplete */}
            <div className="relative md:col-span-2" ref={observedRef}>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Nama Karyawan yang di Observasi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={namaObserved}
                  onChange={(e) => {
                    setNamaObserved(e.target.value);
                    setObservedSearch(e.target.value);
                    setIsObservedDropdownOpen(true);
                  }}
                  onFocus={() => setIsObservedDropdownOpen(true)}
                  placeholder="Ketik nama karyawan atau operator/driver yang diamati..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
                />
                <HardHat size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Observed Autocomplete Dropdown */}
              {isObservedDropdownOpen && filteredObserveds.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="p-1.5 space-y-1">
                    {filteredObserveds.map((m: MasterManpowerItem) => (
                      <div
                        key={`obs-${m.id || m.employeeId}`}
                        onClick={() => {
                          setNamaObserved(m.fullName);
                          setIsObservedDropdownOpen(false);
                        }}
                        className="px-3 py-2 rounded-xl hover:bg-orange-50/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-800 block">{m.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {m.employeeId || "-"} &bull; {m.jobPosition || m.organization || "Pekerja Lapangan"}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {m.organization || "BDP"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION B: AKTIFITAS & LOKASI OBSERVASI */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Bagian 2: Aktifitas, Lokasi &amp; Tanggal</h2>
              <p className="text-[11px] text-slate-500">Detail kegiatan dan wilayah kerja yang diobservasi</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Judul Observasi */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Judul Observasi (Aktifitas yang di Observasi) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={judulObservasi}
                onChange={(e) => setJudulObservasi(e.target.value)}
                placeholder="Contoh: Pemeriksaan Tekanan Tyre Volvo FH16, Pengelasan Frame Chasis, Refueling Solar..."
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal Observasi */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tanggal Observasi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={tanggalObservasi}
                    onChange={(e) => setTanggalObservasi(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
                  />
                  <Calendar size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* PROJECT */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  PROJECT <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_OBSERVATION_OPTIONS.map((p) => {
                    const isSelected = project === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setProject(p)}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <Building2 size={13} className={isSelected ? "text-[#e95623]" : "text-slate-400"} />
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lokasi Observasi (16 Options + Yang lain) */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Lokasi Observasi <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {LOKASI_OBSERVASI_OPTIONS.map((loc) => {
                  const isSelected = lokasiObservasi === loc;
                  return (
                    <button
                      type="button"
                      key={loc}
                      onClick={() => setLokasiObservasi(loc)}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-orange-50/80 text-[#e95623] border-[#e95623] ring-1 ring-[#e95623]/30 font-black shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {isSelected && <Check size={12} strokeWidth={3} className="shrink-0" />}
                    </button>
                  );
                })}

                {/* Yang lain option */}
                <button
                  type="button"
                  onClick={() => setLokasiObservasi("Yang lain")}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    lokasiObservasi === "Yang lain"
                      ? "bg-orange-50/80 text-[#e95623] border-[#e95623] ring-1 ring-[#e95623]/30 font-black shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>Yang lain...</span>
                  {lokasiObservasi === "Yang lain" && <Check size={12} strokeWidth={3} className="shrink-0" />}
                </button>
              </div>

              {lokasiObservasi === "Yang lain" && (
                <div className="mt-2.5 animate-in fade-in duration-200">
                  <input
                    type="text"
                    required
                    value={lokasiCustom}
                    onChange={(e) => setLokasiCustom(e.target.value)}
                    placeholder="Sebutkan lokasi spesifik..."
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-[#e95623]/60 bg-white focus:ring-2 focus:ring-[#e95623]/20 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Detail Lokasi Observasi */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Detail Lokasi Observasi (Opsional)
              </label>
              <input
                type="text"
                value={detailLokasi}
                onChange={(e) => setDetailLokasi(e.target.value)}
                placeholder="Contoh: Sisi Selatan Stockpile, Bay 03 Workshop, Ramp Km 12..."
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
              />
            </div>

            {/* Penanggung Jawab Area */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Penanggung Jawab Area <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {PENANGGUNG_JAWAB_OPTIONS.map((pic) => {
                  const isSelected = penanggungJawabArea === pic;
                  return (
                    <button
                      type="button"
                      key={pic}
                      onClick={() => setPenanggungJawabArea(pic)}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-black"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{pic}</span>
                      {isSelected && <Check size={11} strokeWidth={3} className="text-[#e95623]" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPenanggungJawabArea("Yang lain")}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    penanggungJawabArea === "Yang lain"
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-black"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>Yang lain...</span>
                  {penanggungJawabArea === "Yang lain" && <Check size={11} strokeWidth={3} className="text-[#e95623]" />}
                </button>
              </div>

              {penanggungJawabArea === "Yang lain" && (
                <div className="mt-2.5 animate-in fade-in duration-200">
                  <input
                    type="text"
                    required
                    value={penanggungJawabCustom}
                    onChange={(e) => setPenanggungJawabCustom(e.target.value)}
                    placeholder="Sebutkan penanggung jawab area..."
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION C: REAKSI PEKERJA (BEHAVIORAL OBSERVATION CRITERIA) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Bagian 3: Reaksi &amp; Perilaku Pekerja</h2>
              <p className="text-[11px] text-slate-500">Evaluasi pengamatan saat aktivitas berlangsung atau saat disapa</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* 1. Perubahan Posisi */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>1. Perubahan Posisi</span>
                    <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Apakah posisi tubuh pekerja aman dan ergonomis?</p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    perubahanPosisi === "AMAN"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {perubahanPosisi}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["AMAN", "BERISIKO", "Yang lain"] as const).map((opt) => {
                  const isSelected = perubahanPosisi === opt;
                  return (
                    <button
                      type="button"
                      key={`pos-${opt}`}
                      onClick={() => setPerubahanPosisi(opt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? opt === "AMAN"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : opt === "BERISIKO"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {opt === "AMAN" ? <Check size={12} /> : opt === "BERISIKO" ? <AlertTriangle size={12} /> : null}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {perubahanPosisi === "Yang lain" && (
                <input
                  type="text"
                  value={perubahanPosisiCustom}
                  onChange={(e) => setPerubahanPosisiCustom(e.target.value)}
                  placeholder="Keterangan lain untuk perubahan posisi..."
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white outline-none focus:border-[#e95623]"
                />
              )}
            </div>

            {/* 2. Penghentian Pekerjaan */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>2. Penghentian Pekerjaan</span>
                    <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Apakah terdapat tindakan Stop Work / penghentian kerja saat risiko teridentifikasi?</p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    penghentianPekerjaan === "AMAN"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {penghentianPekerjaan}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["AMAN", "BERISIKO", "Yang lain"] as const).map((opt) => {
                  const isSelected = penghentianPekerjaan === opt;
                  return (
                    <button
                      type="button"
                      key={`stop-${opt}`}
                      onClick={() => setPenghentianPekerjaan(opt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? opt === "AMAN"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : opt === "BERISIKO"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {opt === "AMAN" ? <Check size={12} /> : opt === "BERISIKO" ? <AlertTriangle size={12} /> : null}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {penghentianPekerjaan === "Yang lain" && (
                <input
                  type="text"
                  value={penghentianPekerjaanCustom}
                  onChange={(e) => setPenghentianPekerjaanCustom(e.target.value)}
                  placeholder="Keterangan lain untuk penghentian pekerjaan..."
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white outline-none focus:border-[#e95623]"
                />
              )}
            </div>

            {/* 3. Penggantian Tool */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>3. Penggantian Tool</span>
                    <span className="text-rose-500">*</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Apakah alat/perkakas yang digunakan sesuai standar, layak pakai, dan ber-inspeksi?</p>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    penggantianTool === "AMAN"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {penggantianTool}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["AMAN", "BERISIKO", "Yang lain"] as const).map((opt) => {
                  const isSelected = penggantianTool === opt;
                  return (
                    <button
                      type="button"
                      key={`tool-${opt}`}
                      onClick={() => setPenggantianTool(opt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? opt === "AMAN"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : opt === "BERISIKO"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {opt === "AMAN" ? <Check size={12} /> : opt === "BERISIKO" ? <AlertTriangle size={12} /> : null}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {penggantianTool === "Yang lain" && (
                <input
                  type="text"
                  value={penggantianToolCustom}
                  onChange={(e) => setPenggantianToolCustom(e.target.value)}
                  placeholder="Keterangan lain untuk penggantian tool..."
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white outline-none focus:border-[#e95623]"
                />
              )}
            </div>
          </div>
        </div>

        {/* SECTION D: DOKUMENTASI FOTO & TINDAKAN PERBAIKAN */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <Camera size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Bagian 4: Dokumentasi Foto &amp; Feedback Langsung</h2>
              <p className="text-[11px] text-slate-500">Bukti visual kegiatan dan tindakan pembinaan/perbaikan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Photo Upload Area */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Foto Observasi / Bukti Temuan (Opsional)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-video flex items-center justify-center">
                  <img src={photoPreview} alt="Bukti Observasi" className="max-h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#e95623]" />
                      <span>Mengunggah foto...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#e95623] bg-slate-50 hover:bg-orange-50/20 p-6 text-center cursor-pointer transition-colors aspect-video flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#e95623]">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Ambil Foto / Unggah Gambar</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, atau WebP (Maks. 10MB)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Catatan & Tindakan Perbaikan */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Catatan Observasi / Uraian Temuan
                </label>
                <textarea
                  rows={2}
                  value={catatanObservasi}
                  onChange={(e) => setCatatanObservasi(e.target.value)}
                  placeholder="Jelaskan kondisi perilaku pekerja yang diamati..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tindakan Perbaikan Langsung / Feedback (Intervensi)
                </label>
                <textarea
                  rows={2}
                  value={tindakanPerbaikan}
                  onChange={(e) => setTindakanPerbaikan(e.target.value)}
                  placeholder="Contoh: Pekerja diedukasi tentang ergonomi kerja, APD helm dikencangkan, dll..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-[#e95623]" />
            <span>Pastikan seluruh data yang dimasukkan sudah sesuai dengan kondisi aktual di lapangan.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all text-center"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-[#e95623] hover:bg-[#d44819] text-white text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Kirim Laporan Observasi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
