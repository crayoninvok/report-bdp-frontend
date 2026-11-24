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
  ShieldAlert,
  Activity,
  ClipboardCheck,
  Wrench,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import {
  sheObservationService,
  GOOGLE_FORM_OBSERVATION_URL,
  LOKASI_OBSERVASI_OPTIONS,
  PENANGGUNG_JAWAB_OPTIONS,
  PROJECT_OBSERVATION_OPTIONS,
  OBSERVATION_SECTIONS,
  ObservationCategorySection,
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

type EvalOption = "AMAN" | "BERESIKO" | "Yang lain";

interface ItemEvalState {
  value: EvalOption;
  custom: string;
}

export const SheObservationFormPage: React.FC<SheObservationFormPageProps> = ({
  user,
  onNavigateToList,
  onNavigateToDashboard,
  isStandalone = false,
}) => {
  const { showSuccess, showError } = useNotification();

  // Basic Information
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

  // 6 Evaluation Sections (29 total items)
  const [evaluations, setEvaluations] = useState<Record<string, ItemEvalState>>(() => {
    const initial: Record<string, ItemEvalState> = {};
    OBSERVATION_SECTIONS.forEach((sec) => {
      sec.items.forEach((item) => {
        initial[item.key] = { value: "AMAN", custom: "" };
      });
    });
    return initial;
  });

  // Tindak Lanjut Observasi
  const [saranObserver, setSaranObserver] = useState("");
  const [feedbackObjek, setFeedbackObjek] = useState("");
  const [kesepakatan, setKesepakatan] = useState("");
  const [catatanObservasi, setCatatanObservasi] = useState("");

  // Foto / Dokumentasi (Drawing / Image, max 10MB)
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
      .filter((m: MasterManpowerItem) => {
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
      .filter((m: MasterManpowerItem) => {
        return (
          (m.fullName || "").toLowerCase().includes(q) ||
          (m.employeeId || "").toLowerCase().includes(q) ||
          (m.jobPosition || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [manpowerList, observedSearch]);

  // Overall Statistics on Current Form
  const evaluationStats = useMemo(() => {
    let safeCount = 0;
    let riskyCount = 0;
    Object.values(evaluations).forEach((ev) => {
      if (ev.value === "AMAN") {
        safeCount++;
      } else {
        riskyCount++;
      }
    });
    return { safeCount, riskyCount, total: safeCount + riskyCount };
  }, [evaluations]);

  // Handlers for Question Evaluation
  const setItemEvaluation = (key: string, value: EvalOption) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  const setItemCustomText = (key: string, custom: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: { ...prev[key], custom },
    }));
  };

  const setAllSectionSafe = (section: ObservationCategorySection) => {
    setEvaluations((prev) => {
      const next = { ...prev };
      section.items.forEach((item) => {
        next[item.key] = { value: "AMAN", custom: "" };
      });
      return next;
    });
  };

  const setAllCategoriesSafe = () => {
    setEvaluations((prev) => {
      const next = { ...prev };
      OBSERVATION_SECTIONS.forEach((sec) => {
        sec.items.forEach((item) => {
          next[item.key] = { value: "AMAN", custom: "" };
        });
      });
      return next;
    });
    showSuccess("Seluruh 29 kriteria observasi telah ditandai AMAN.");
  };

  // Handle Photo File Upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Mohon pilih file gambar atau dokumen drawing (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError("Ukuran file maksimal 10MB");
      return;
    }

    setIsUploadingPhoto(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPhotoPreview(base64);

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
        console.warn("Upload to /api/she/upload failed, keeping base64 preview", err);
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

    // Helper to format each answer
    const formatAnswer = (key: string): string => {
      const item = evaluations[key];
      if (!item) return "AMAN";
      if (item.value === "Yang lain") {
        return `BERISIKO - ${item.custom.trim() || "Yang lain"}`;
      }
      return item.value === "BERESIKO" ? "BERISIKO" : item.value;
    };

    // Calculate if any answer is Risky
    let hasRisk = false;
    const rawAnswers: Record<string, string> = {};

    OBSERVATION_SECTIONS.forEach((sec) => {
      sec.items.forEach((it) => {
        const formatted = formatAnswer(it.key);
        rawAnswers[it.key] = formatted;
        if (formatted.includes("BERISIKO") || formatted.includes("BERESIKO")) {
          hasRisk = true;
        }
      });
    });

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

      // Category 1: Reaksi Pekerja
      perubahanPosisi: formatAnswer("perubahanPosisi"),
      penghentianPekerjaan: formatAnswer("penghentianPekerjaan"),
      penggantianTool: formatAnswer("penggantianTool"),

      // Category 2: Posisi Manusia
      posisiMenabrak: formatAnswer("posisiMenabrak"),
      posisiTerjepit: formatAnswer("posisiTerjepit"),
      posisiTerhirup: formatAnswer("posisiTerhirup"),
      posisiTerseret: formatAnswer("posisiTerseret"),
      posisiTerkenaListrik: formatAnswer("posisiTerkenaListrik"),
      posisiTerjatuh: formatAnswer("posisiTerjatuh"),
      posisiTerpukul: formatAnswer("posisiTerpukul"),

      // Category 3: APD
      apdKepala: formatAnswer("apdKepala"),
      apdTelingaMata: formatAnswer("apdTelingaMata"),
      apdMukaPernafasan: formatAnswer("apdMukaPernafasan"),
      apdTanganLengan: formatAnswer("apdTanganLengan"),
      apdKakiTungkai: formatAnswer("apdKakiTungkai"),

      // Category 4: Prosedur
      prosedurStandard: formatAnswer("prosedurStandard"),
      prosedurPengawasan: formatAnswer("prosedurPengawasan"),
      prosedurIjinKerja: formatAnswer("prosedurIjinKerja"),
      prosedurEmergency: formatAnswer("prosedurEmergency"),

      // Category 5: Perkakas Tangan
      perkakasSesuai: formatAnswer("perkakasSesuai"),
      perkakasBenar: formatAnswer("perkakasBenar"),
      perkakasAmanInspeksi: formatAnswer("perkakasAmanInspeksi"),
      perkakasPengaman: formatAnswer("perkakasPengaman"),
      perkakasSafetyDevice: formatAnswer("perkakasSafetyDevice"),

      // Category 6: Ketertiban / Kerapihan
      kerapihanRuangJalan: formatAnswer("kerapihanRuangJalan"),
      kerapihanPenempatan: formatAnswer("kerapihanPenempatan"),
      kerapihanPenyimpanan: formatAnswer("kerapihanPenyimpanan"),
      kerapihanHambatan: formatAnswer("kerapihanHambatan"),
      kerapihanPijakanLantai: formatAnswer("kerapihanPijakanLantai"),

      // Tindak Lanjut
      saranObserver: saranObserver.trim() || undefined,
      feedbackObjek: feedbackObjek.trim() || undefined,
      kesepakatan: kesepakatan.trim() || undefined,
      catatanObservasi: catatanObservasi.trim() || undefined,
      tindakanPerbaikan: saranObserver.trim() || undefined,
      dokumentasi: photoPreview || undefined,
      rawAnswersJson: rawAnswers,

      status: hasRisk ? "BERISIKO" : "AMAN",
      statusGForm: "OPEN",
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
    setSaranObserver("");
    setFeedbackObjek("");
    setKesepakatan("");
    setCatatanObservasi("");
    setPhotoPreview(null);

    const resetEval: Record<string, ItemEvalState> = {};
    OBSERVATION_SECTIONS.forEach((sec) => {
      sec.items.forEach((it) => {
        resetEval[it.key] = { value: "AMAN", custom: "" };
      });
    });
    setEvaluations(resetEval);
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
              isRisky
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-emerald-50 text-emerald-600 border border-emerald-200"
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
              Laporan Observasi Terkirim!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Terima kasih atas kontribusi aktif Anda dalam memantau dan menciptakan lingkungan kerja yang aman dan produktif di PT Batara Dharma Persada.
            </p>
          </div>

          {/* Ticket Information */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                No. Registrasi Observasi
              </span>
              <span className="text-xs sm:text-sm font-black font-mono text-[#e95623]">
                {submittedItem.observationNumber}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Observer</span>
                <span className="font-bold text-slate-800">{submittedItem.namaObserver}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Karyawan Diamati</span>
                <span className="font-bold text-slate-800">{submittedItem.namaObserved}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Aktifitas</span>
                <span className="font-bold text-slate-800 truncate block">{submittedItem.judulObservasi}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Lokasi &amp; Site</span>
                <span className="font-bold text-slate-800 truncate block">
                  {submittedItem.lokasiObservasi} &bull; {submittedItem.project}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer transition-all"
            >
              <RefreshCw size={14} />
              <span>Kirim Observasi Baru</span>
            </button>

            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black cursor-pointer transition-all"
              >
                <span>Lihat Rekapitulasi Observasi</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Section Icon Helper
  const getSectionIcon = (id: string) => {
    switch (id) {
      case "reaksiPekerja":
        return <ShieldCheck size={16} />;
      case "posisiManusia":
        return <Activity size={16} />;
      case "apd":
        return <HardHat size={16} />;
      case "prosedur":
        return <ClipboardCheck size={16} />;
      case "perkakas":
        return <Wrench size={16} />;
      case "kerapihan":
        return <Sparkles size={16} />;
      default:
        return <CheckSquare size={16} />;
    }
  };

  const getSectionColorClass = (id: string) => {
    switch (id) {
      case "reaksiPekerja":
        return "bg-emerald-50 border-emerald-200 text-emerald-600";
      case "posisiManusia":
        return "bg-blue-50 border-blue-200 text-blue-600";
      case "apd":
        return "bg-amber-50 border-amber-200 text-amber-600";
      case "prosedur":
        return "bg-indigo-50 border-indigo-200 text-indigo-600";
      case "perkakas":
        return "bg-orange-50 border-orange-200 text-orange-600";
      case "kerapihan":
        return "bg-teal-50 border-teal-200 text-teal-600";
      default:
        return "bg-slate-50 border-slate-200 text-slate-600";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-6 space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#e95623]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#e95623] text-white">
                BDP Safety Observation
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 backdrop-blur-xs">
                SHE Department
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Formulir Laporan Observasi Keselamatan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Catat observasi perilaku kerja karyawan (Reaksi Pekerja, Posisi Manusia, APD, Prosedur, Perkakas, dan Kerapihan) untuk mewujudkan budaya <i>Zero Harm</i> di Site BDP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={GOOGLE_FORM_OBSERVATION_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs transition-all border border-white/10"
            >
              <span>Buka Google Form Asli</span>
              <ExternalLink size={12} />
            </a>

            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-[11px] font-black transition-all shadow-sm cursor-pointer"
              >
                <ArrowLeft size={12} />
                <span>Kembali ke Rekap</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Evaluation Summary Pill */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-bold">Ringkasan Kriteria:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
              {evaluationStats.safeCount} AMAN
            </span>
            {evaluationStats.riskyCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black border border-rose-500/30 animate-pulse">
                {evaluationStats.riskyCount} BERISIKO
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Semua kriteria aman</span>
            )}
          </div>

          <button
            type="button"
            onClick={setAllCategoriesSafe}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black cursor-pointer shadow-xs transition-all"
          >
            <Check size={12} strokeWidth={3} />
            <span>Tandai Semua Kriteria AMAN (1-Klik)</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =========================================================================
            SECTION 1: INFORMASI OBSERVER & KARYAWAN DIOBSERVASI
        ========================================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-[#e95623] flex items-center justify-center">
              <UserIcon size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Bagian 1: Data Observer &amp; Objek Observasi</h2>
              <p className="text-[11px] text-slate-500">Pemberi laporan dan pekerja yang sedang melakukan aktivitas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Observer */}
            <div className="relative" ref={observerRef}>
              <label className="block text-xs font-black text-slate-700 mb-1">
                Nama Karyawan Yang Melakukan Observasi (Observer) <span className="text-rose-500">*</span>
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
                  placeholder="Ketik nama atau pilih dari daftar karyawan..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
                />
                <Search size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Observer Autocomplete Dropdown */}
              {isObserverDropdownOpen && filteredObservers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="p-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Manpower BDP
                  </div>
                  {filteredObservers.map((m: MasterManpowerItem) => (
                    <button
                      key={m.id || m.employeeId}
                      type="button"
                      onClick={() => {
                        setNamaObserver(m.fullName);
                        if (m.employeeId) setNikObserver(m.employeeId);
                        setIsObserverDropdownOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-orange-50/60 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-black text-slate-800 block">{m.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          NIK: {m.employeeId || "-"} &bull; {m.jobPosition || "Karyawan"}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {m.organization || "BDP"}
                      </span>
                    </button>
                  ))}
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
                placeholder="Contoh: 20240101"
                className="w-full px-3.5 py-2.5 text-xs font-bold font-mono rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Nama Karyawan yang di Observasi */}
          <div className="relative" ref={observedRef}>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Nama Karyawan yang di Observasi (Objek Observasi) <span className="text-rose-500">*</span>
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
                placeholder="Ketik nama karyawan atau operator/mekanik yang diobservasi..."
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none"
              />
              <Search size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
            </div>

            {/* Observed Autocomplete Dropdown */}
            {isObservedDropdownOpen && filteredObserveds.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                <div className="p-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Karyawan Lapangan BDP
                </div>
                {filteredObserveds.map((m: MasterManpowerItem) => (
                  <button
                    key={m.id || m.employeeId}
                    type="button"
                    onClick={() => {
                      setNamaObserved(m.fullName);
                      setIsObservedDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-orange-50/60 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-800 block">{m.fullName}</span>
                      <span className="text-[10px] text-slate-500">
                        {m.jobPosition || "Staff Lapangan"} &bull; NIK: {m.employeeId || "-"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {m.organization || "BDP"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: AKTIFITAS, LOKASI & PROJECT
        ========================================================================== */}
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

        {/* =========================================================================
            6 EVALUATION CATEGORIES FROM GOOGLE FORM
            1. Reaksi Pekerja
            2. Posisi Manusia
            3. Peralatan Pelindung Diri (APD)
            4. Prosedur
            5. Perkakas Tangan dan Peralatan
            6. Ketertiban / Kerapihan
        ========================================================================== */}
        {OBSERVATION_SECTIONS.map((section, secIdx) => {
          const sectionColor = getSectionColorClass(section.id);
          const sectionIcon = getSectionIcon(section.id);

          // Check how many are risky in this section
          const sectionRiskyCount = section.items.filter((it) => {
            const val = evaluations[it.key]?.value;
            return val === "BERESIKO" || val === "Yang lain";
          }).length;

          return (
            <div
              key={section.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-4"
            >
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${sectionColor}`}>
                    {sectionIcon}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      Bagian {secIdx + 3}: {section.title}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Evaluasi kesesuaian keselamatan untuk aspek {section.title.toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      sectionRiskyCount > 0
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {sectionRiskyCount > 0 ? `${sectionRiskyCount} Berisiko` : "Semua Aman"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllSectionSafe(section)}
                    className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Semua Aman
                  </button>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {section.items.map((item) => {
                  const currentEval = evaluations[item.key] || { value: "AMAN", custom: "" };
                  const isSafe = currentEval.value === "AMAN";
                  const isRisky = currentEval.value === "BERESIKO";
                  const isOther = currentEval.value === "Yang lain";

                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSafe
                          ? "bg-slate-50/70 border-slate-200/80"
                          : isRisky
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-amber-50/50 border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800">{item.label}</span>
                        <span
                          className={`text-[9.5px] font-black px-2 py-0.5 rounded-md ${
                            isSafe
                              ? "bg-emerald-100 text-emerald-800"
                              : isRisky
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-900 text-white"
                          }`}
                        >
                          {currentEval.value}
                        </span>
                      </div>

                      {/* 3 Buttons: AMAN, BERESIKO, Yang lain */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemEvaluation(item.key, "AMAN")}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isSafe
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isSafe && <Check size={11} strokeWidth={3} />}
                          <span>AMAN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemEvaluation(item.key, "BERESIKO")}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isRisky
                              ? "bg-rose-600 text-white border-rose-600 shadow-2xs font-black"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isRisky && <AlertTriangle size={11} strokeWidth={2.5} />}
                          <span>BERESIKO</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemEvaluation(item.key, "Yang lain")}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isOther
                              ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-black"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span>Yang lain:</span>
                        </button>
                      </div>

                      {/* Custom Text input when 'Yang lain' is active */}
                      {isOther && (
                        <div className="mt-2 animate-in fade-in duration-200">
                          <input
                            type="text"
                            value={currentEval.custom}
                            onChange={(e) => setItemCustomText(item.key, e.target.value)}
                            placeholder="Tuliskan catatan khusus..."
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:border-[#e95623] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* =========================================================================
            SECTION 9: TINDAK LANJUT OBSERVASI & DOKUMENTASI
            - Saran yang diberikan observer
            - Feedback dari objek observasi
            - Kesepakatan yang disepakati
            - Dokumentasi Observasi (drawing / image max 10MB)
        ========================================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Bagian 9: Tindak Lanjut Observasi &amp; Dokumentasi
              </h2>
              <p className="text-[11px] text-slate-500">
                Saran pembinaan, feedback objek, kesepakatan bersama, dan foto/drawing
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Saran, Feedback, Kesepakatan */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Saran yang diberikan observer
                </label>
                <textarea
                  rows={2}
                  value={saranObserver}
                  onChange={(e) => setSaranObserver(e.target.value)}
                  placeholder="Tuliskan saran perbaikan / intervensi positif yang Anda sampaikan..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Feedback dari objek observasi
                </label>
                <textarea
                  rows={2}
                  value={feedbackObjek}
                  onChange={(e) => setFeedbackObjek(e.target.value)}
                  placeholder="Tanggapan atau respon dari karyawan yang diobservasi..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Kesepakatan yang disepakati
                </label>
                <textarea
                  rows={2}
                  value={kesepakatan}
                  onChange={(e) => setKesepakatan(e.target.value)}
                  placeholder="Komitmen tindakan aman yang disepakati kedua belah pihak..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#e95623] focus:ring-2 focus:ring-[#e95623]/20 transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Right Column: Dokumentasi Observasi & Catatan Tambahan */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Dokumentasi Observasi (Drawing atau Image, Maks. 10 MB)
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
                    <img
                      src={photoPreview}
                      alt="Dokumentasi Observasi"
                      className="max-h-full max-w-full object-contain"
                    />
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
                        <span>Mengunggah dokumen foto...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#e95623] bg-slate-50 hover:bg-orange-50/20 p-5 text-center cursor-pointer transition-colors aspect-video flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#e95623]">
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        Ambil Foto Kamera / Unggah Gambar
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Format Drawing atau Gambar (Maksimal 10 MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Catatan Observasi Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatanObservasi}
                  onChange={(e) => setCatatanObservasi(e.target.value)}
                  placeholder="Catatan tambahan mengenai kondisi cuaca, lingkungan, atau unit..."
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
            <span>
              Laporan ini terekam di sistem SHE BDP dan disinkronkan dengan rekapitulasi KPI keselamatan kerja.
            </span>
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
