"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Camera,
  UploadCloud,
  X,
  ArrowLeft,
  Send,
  RefreshCw,
  MapPin,
  User,
  Calendar,
  Sparkles,
  Check,
  Building2,
  ZoomIn,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronRight,
  Briefcase,
  Layers,
  Search,
  CheckCircle,
  Clock,
  Tag,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  sheService,
  HazardCategory,
  HazardRiskLevel,
  HazardStatus,
} from "../services/sheService";
import {
  uploadHazardPhoto,
  getCloudinaryThumbnail,
  getCloudinaryFullPreview,
} from "../services/cloudinaryService";
import { useNotification } from "../context/NotificationContext";
import {
  manpowerService,
  MasterManpowerItem,
  mapOrganizationToDept,
  mapJobPositionToJabatan,
} from "../services/manpowerService";

interface HazardReportFormPageProps {
  user?: any;
  onNavigateToList?: () => void;
  onNavigateToDashboard?: () => void;
  isStandalone?: boolean;
}

// ----------------------------------------------------------------------
// Exact Google Form Options & Choices
// ----------------------------------------------------------------------
export const DEPARTEMEN_OPTIONS = [
  "PLANT",
  "PRODUKSI",
  "HRGA",
  "HSE",
  "LOGISTIK",
  "INFRAS",
  "MANAGEMENT",
] as const;

export const LOKASI_OPTIONS = [
  "OFFICE",
  "WORKSHOP",
  "TOOL ROOM",
  "WAREHOUSE",
  "RUMAH GENSET",
  "WASHING PAD",
  "TPS LB3",
  "OIL TRAP",
  "FUEL STATION",
  "FUEL STORAGE",
  "MESS",
  "KANTIN",
  "WTP",
  "CHR",
  "COAL PAD",
  "JETTY",
  "KONSTRUKSI",
] as const;

export const PENANGGUNG_JAWAB_OPTIONS = [
  "PLANT",
  "PRODUKSI",
  "LOGISTIK",
  "INFRAS",
  "HRGA",
  "HSE",
  "ARCO",
  "BAYAN & KCB",
  "KONTRAKTOR HAULING",
] as const;

export const JABATAN_OPTIONS = [
  "SITE MANAGEMENT",
  "SUPERINTENDENT",
  "SR. SUPERVISOR",
  "JR. SUPERVISOR",
  "WORKER",
] as const;

// 26 Exact KTA Items from Google Form
export const KTA_ITEMS = [
  "Sistem Pelindung atau Peralatan Pengaman tidak memadai - KTA",
  "Sistem pelindung atau Peralatan Pengaman dalam kondisi rusak - KTA",
  "APD tidak memadai - KTA",
  "APD dalam kondisi rusak - KTA",
  "Sistem tanda peringatan keselamatan tidak memadai - KTA",
  "Sistem tanda peringatan keselamatan dalam kondisi rusak - KTA",
  "Sistem / Mekanisme Isolasi dan peralatan isolasi tidak memadai - KTA",
  "Peralatan Keselamatan yang tidak memadai - KTA",
  "Peralatan Keselamatan dalam kondisi rusak - KTA",
  "SPIP Pertambangan dalam keadaan rusak - KTA",
  "SPIP Pertambangan dalam kondisi tidak memadai / tidak layak - KTA",
  "SPIP Pertambangan tidak dipersiapkan dengan benar - KTA",
  "SPIP Pertambangan tidak memadai untuk tujuan tertentu / tidak dioperasikan sesuai peruntukannya - KTA",
  "Lingkungan Kerja yang tidak sesuai dengan standart (Ex: Pencahayaan, Kebisingan, Suhu, Getaran, etc) - KTA",
  "Sistem Ergonomi yang tidak sesuai standart - KTA",
  "Ventilasi tidak memadai - KTA",
  "Area pekerjaan berisiko tinggi yang tidak dilengkapi peralatan Keselamatan - KTA",
  "Tata letak tempat kerja yang tidak memadai - KTA",
  "Cuaca buruk atau bencana alam - KTA",
  "Area kerja yang sempit atau penuh dengan rintangan, yang dapat mengganggu pergerakan / menimbulkan bahaya - KTA",
  "Tempat berjalan yang licin - KTA",
  "Kondisi area kerja lembek - KTA",
  "Kondisi area kerja tidak memadai - KTA",
  "Kondisi area kerja tergenang air dan becek - KTA",
  "Kegagalam mekanisme sistem yang digerakkan dengan energi listrik - KTA",
  "Kegagalam mekanisme sistem yang digerakkan dengan energi selain energi listrik - KTA",
];

// Standard TTA Items for Mining
export const TTA_ITEMS = [
  "Mengoperasikan peralatan tanpa otorisasi / SIMPER - TTA",
  "Mengoperasikan peralatan dengan kecepatan melebihi batas (overspeed) - TTA",
  "Tidak menggunakan APD wajib standar - TTA",
  "Menggunakan APD yang rusak atau tidak tepat - TTA",
  "Mengabaikan rambu atau tanda peringatan keselamatan - TTA",
  "Membuat alat pengaman / safety switch tidak berfungsi (bypass) - TTA",
  "Menggunakan peralatan / perkakas yang rusak atau tidak standar - TTA",
  "Bekerja pada posisi atau postur yang tidak aman (titik jepit / blind spot) - TTA",
  "Bekerja pada peralatan yang sedang beroperasi / bergerak tanpa isolasi LOTO - TTA",
  "Bekerja di bawah beban gantung (suspended load) - TTA",
  "Bekerja di ketinggian (> 1.8 m) tanpa Full Body Harness - TTA",
  "Bercanda atau bersenda gurau saat bekerja (horseplay) - TTA",
  "Mengemudi sambil menggunakan handphone atau merokok - TTA",
  "Tidak memasang ganjal ban (wheel choke) saat unit parkir - TTA",
  "Menumpang pada unit yang bukan peruntukannya - TTA",
  "Bekerja dalam kondisi tidak fit / mengantuk (fatigue) - TTA",
];

export const HazardReportFormPage: React.FC<HazardReportFormPageProps> = ({
  user,
  onNavigateToList,
  onNavigateToDashboard,
  isStandalone = false,
}) => {
  const { showSuccess, showError } = useNotification();

  // --------------------------------------------------------------------
  // Form State (Exact Google Form Fields)
  // --------------------------------------------------------------------
  const [jenisPelaporan, setJenisPelaporan] = useState<"KTA" | "TTA">("KTA");
  const [namaPelapor, setNamaPelapor] = useState<string>(
    user?.namaLengkap || user?.username || ""
  );
  const [nrpPelapor, setNrpPelapor] = useState<string>(user?.nik || "");
  const [tanggalPelaporan, setTanggalPelaporan] = useState<string>("");

  useEffect(() => {
    if (!tanggalPelaporan) {
      setTanggalPelaporan(new Date().toISOString().slice(0, 10));
    }
  }, [tanggalPelaporan]);
  const [departemenPelapor, setDepartemenPelapor] = useState<string>("PLANT");
  const [lokasiBahaya, setLokasiBahaya] = useState<string>("WORKSHOP");
  const [lokasiBahayaLainnya, setLokasiBahayaLainnya] = useState<string>("");
  const [rincianBahaya, setRincianBahaya] = useState<string>("");

  const [penanggungJawabArea, setPenanggungJawabArea] = useState<string>("PLANT");
  const [penanggungJawabAreaLainnya, setPenanggungJawabAreaLainnya] = useState<string>("");

  const [statusGForm, setStatusGForm] = useState<"OPEN" | "CLOSE">("OPEN");
  const [project, setProject] = useState<"SENYIUR" | "MUARA PAHU">(
    user?.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"
  );

  const [jabatanPelapor, setJabatanPelapor] = useState<string>("WORKER");
  const [jabatanPelaporLainnya, setJabatanPelaporLainnya] = useState<string>("");

  // Section 2: Identifikasi Bahaya KTA / TTA
  const [identifikasiBahaya, setIdentifikasiBahaya] = useState<string>(KTA_ITEMS[0]);
  const [identifikasiBahayaLainnya, setIdentifikasiBahayaLainnya] = useState<string>("");
  const [searchIdentifikasi, setSearchIdentifikasi] = useState<string>("");

  // Tindakan Perbaikan
  const [tindakanPerbaikan, setTindakanPerbaikan] = useState<string>("");

  // Cloudinary Photos
  const [dokumentasiSebelum, setDokumentasiSebelum] = useState<string>("");
  const [dokumentasiSebelumPublicId, setDokumentasiSebelumPublicId] = useState<string>("");
  const [dokumentasiSesudah, setDokumentasiSesudah] = useState<string>("");
  const [dokumentasiSesudahPublicId, setDokumentasiSesudahPublicId] = useState<string>("");

  const [isUploadingSebelum, setIsUploadingSebelum] = useState<boolean>(false);
  const [isUploadingSesudah, setIsUploadingSesudah] = useState<boolean>(false);
  const inputSebelumRef = useRef<HTMLInputElement>(null);
  const inputSesudahRef = useRef<HTMLInputElement>(null);

  // Lightbox Modal
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Submission Flow
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedReportNumber, setSubmittedReportNumber] = useState<string | null>(null);

  // Master Manpower Auto-complete (Muara Pahu & Senyiur Exist)
  const [manpowerList, setManpowerList] = useState<MasterManpowerItem[]>([]);
  const [loadingManpower, setLoadingManpower] = useState<boolean>(false);
  const [isManpowerDropdownOpen, setIsManpowerDropdownOpen] = useState<boolean>(false);
  const [manpowerSearchQuery, setManpowerSearchQuery] = useState<string>("");
  const manpowerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchManpower = async () => {
      try {
        setLoadingManpower(true);
        const data = await manpowerService.getSiteActiveManpower();
        if (!isCancelled && data.length > 0) {
          setManpowerList(data);
        }
      } catch (err) {
        console.warn("Gagal mengambil data master manpower:", err);
      } finally {
        if (!isCancelled) setLoadingManpower(false);
      }
    };
    fetchManpower();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        manpowerDropdownRef.current &&
        !manpowerDropdownRef.current.contains(e.target as Node)
      ) {
        setIsManpowerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered Manpower (Muara Pahu & Senyiur exist - not restricted by project)
  const filteredManpower = useMemo(() => {
    if (!manpowerSearchQuery.trim()) {
      return manpowerList.slice(0, 30);
    }
    const q = manpowerSearchQuery.toLowerCase();
    return manpowerList.filter((m) => {
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchNrp = (m.employeeId || "").toLowerCase().includes(q);
      const matchDept = (m.organization || "").toLowerCase().includes(q);
      const matchPos = (m.jobPosition || "").toLowerCase().includes(q);
      return matchName || matchNrp || matchDept || matchPos;
    });
  }, [manpowerList, manpowerSearchQuery]);

  const handleSelectManpower = (m: MasterManpowerItem) => {
    setNamaPelapor(m.fullName);
    setNrpPelapor(m.employeeId || m.nik || "");
    const mappedDept = mapOrganizationToDept(m.organization);
    setDepartemenPelapor(mappedDept);
    const mappedJabatan = mapJobPositionToJabatan(m.jobPosition);
    setJabatanPelapor(mappedJabatan);
    setIsManpowerDropdownOpen(false);
    setManpowerSearchQuery("");
    showSuccess(`Data ${m.fullName} dipilih. NRP (${m.employeeId}) & Departemen (${mappedDept}) terisi otomatis.`);
  };

  // Filtered Identifikasi Items
  const currentItems = jenisPelaporan === "KTA" ? KTA_ITEMS : TTA_ITEMS;
  const filteredIdentifikasiItems = useMemo(() => {
    if (!searchIdentifikasi.trim()) return currentItems;
    const q = searchIdentifikasi.toLowerCase();
    return currentItems.filter((i) => i.toLowerCase().includes(q));
  }, [currentItems, searchIdentifikasi]);

  // Upload handler to Cloudinary: bdp-reportapp/hse-folder
  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "sebelum" | "sesudah"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Berkas harus berupa gambar (JPG, PNG, WebP).");
      return;
    }

    if (field === "sebelum") setIsUploadingSebelum(true);
    else setIsUploadingSesudah(true);

    try {
      const res = await uploadHazardPhoto(file, "bdp-reportapp/hse-folder");
      if (res.secure_url) {
        if (field === "sebelum") {
          setDokumentasiSebelum(res.secure_url);
          setDokumentasiSebelumPublicId(res.public_id);
          showSuccess("Foto Dokumentasi Sebelum berhasil diunggah ke Cloudinary.");
        } else {
          setDokumentasiSesudah(res.secure_url);
          setDokumentasiSesudahPublicId(res.public_id);
          showSuccess("Foto Dokumentasi Sesudah berhasil diunggah ke Cloudinary.");
        }
      }
    } catch (err: any) {
      showError(err.message || "Gagal mengunggah foto ke Cloudinary.");
    } finally {
      if (field === "sebelum") setIsUploadingSebelum(false);
      else setIsUploadingSesudah(false);
      e.target.value = "";
    }
  };

  // Reset / Clear Form
  const handleClearForm = () => {
    setJenisPelaporan("KTA");
    setLokasiBahaya("WORKSHOP");
    setLokasiBahayaLainnya("");
    setRincianBahaya("");
    setIdentifikasiBahaya(KTA_ITEMS[0]);
    setIdentifikasiBahayaLainnya("");
    setTindakanPerbaikan("");
    setDokumentasiSebelum("");
    setDokumentasiSebelumPublicId("");
    setDokumentasiSesudah("");
    setDokumentasiSesudahPublicId("");
    setPenanggungJawabArea("PLANT");
    setPenanggungJawabAreaLainnya("");
    setJabatanPelapor("WORKER");
    setJabatanPelaporLainnya("");
    setStatusGForm("OPEN");
    setSubmittedReportNumber(null);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaPelapor.trim()) {
      showError("Harap isi Nama Pelapor.");
      return;
    }
    if (!nrpPelapor.trim()) {
      showError("Harap isi NRP Pelapor.");
      return;
    }
    if (!tanggalPelaporan) {
      showError("Harap pilih Tanggal Pelaporan.");
      return;
    }

    const finalLokasi =
      lokasiBahaya === "Lainnya"
        ? lokasiBahayaLainnya.trim() || "Lainnya"
        : lokasiBahaya;

    const finalPic =
      penanggungJawabArea === "Yang lain"
        ? penanggungJawabAreaLainnya.trim() || "Yang lain"
        : penanggungJawabArea;

    const finalJabatan =
      jabatanPelapor === "Yang lain"
        ? jabatanPelaporLainnya.trim() || "Yang lain"
        : jabatanPelapor;

    const finalIdentifikasi =
      identifikasiBahaya === "Yang lain"
        ? identifikasiBahayaLainnya.trim() || "Temuan Khusus"
        : identifikasiBahaya;

    const siteValue: "MuaraPahu" | "Senyiur" =
      project === "SENYIUR" ? "Senyiur" : "MuaraPahu";

    const categoryValue: HazardCategory =
      jenisPelaporan === "KTA" ? "Unsafe Condition" : "Unsafe Action";

    const statusValue: HazardStatus =
      statusGForm === "CLOSE" ? "Closed" : "Open";

    try {
      setIsSubmitting(true);
      const created = await sheService.createHazard({
        // Exact GForm fields
        jenisPelaporan,
        namaPelapor: namaPelapor.trim(),
        nrpPelapor: nrpPelapor.trim(),
        tanggalPelaporan,
        departemenPelapor,
        lokasiBahaya: finalLokasi,
        rincianBahaya: rincianBahaya.trim(),
        penanggungJawabArea: finalPic,
        statusGForm,
        project,
        jabatanPelapor: finalJabatan,
        identifikasiBahaya: finalIdentifikasi,
        tindakanPerbaikan: tindakanPerbaikan.trim(),
        dokumentasiSebelum: dokumentasiSebelum || undefined,
        dokumentasiSesudah: dokumentasiSesudah || undefined,

        // Legacy compatibility fields
        jobSite: siteValue,
        date: tanggalPelaporan,
        time: new Date().toTimeString().slice(0, 5),
        location: finalLokasi,
        category: categoryValue,
        riskLevel: "Medium",
        title: finalIdentifikasi,
        description: rincianBahaya.trim() || finalIdentifikasi,
        immediateAction: rincianBahaya.trim() || "-",
        correctiveAction: tindakanPerbaikan.trim() || "-",
        reporterName: `${namaPelapor.trim()} (${nrpPelapor.trim()})`,
        reporterDept: departemenPelapor,
        picName: finalPic,
        picDept: finalPic,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        status: statusValue,
        photoUrl: dokumentasiSebelum || undefined,
        photoPublicId: dokumentasiSebelumPublicId || undefined,
        evidenceUrl: dokumentasiSesudah || undefined,
        evidencePublicId: dokumentasiSesudahPublicId || undefined,
      });

      setSubmittedReportNumber(created.reportNumber);
      showSuccess(`Hazard Report ${created.reportNumber} berhasil dikirim!`);
    } catch (err: any) {
      showError(err.message || "Gagal mengirim Hazard Report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------
  // SUBMISSION CONFIRMATION (Custom Batara Modern Card)
  // --------------------------------------------------------------------
  if (submittedReportNumber) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-12 px-3 sm:px-4 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden text-center p-5 sm:p-8 md:p-10 space-y-4 sm:space-y-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} className="sm:hidden" />
            <CheckCircle2 size={36} className="hidden sm:block" />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Laporan Terdaftar
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hazard Report Berhasil Dikirim!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Terima kasih atas laporan Anda. Data telah tersimpan ke sistem pemantauan keselamatan kerja PT Batara Dharma Persada.
            </p>
          </div>

          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-400 font-bold text-[10px] uppercase">No. Laporan:</span>
              <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                {submittedReportNumber}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10.5px] sm:text-[11px]">
              <div>
                <span className="text-slate-400 block">Project:</span>
                <strong className="text-slate-800">{project}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Jenis:</span>
                <strong className="text-slate-800">{jenisPelaporan}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Lokasi:</span>
                <strong className="text-slate-800">
                  {lokasiBahaya === "Lainnya" ? (lokasiBahayaLainnya || "Lainnya") : lokasiBahaya}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <strong className={statusGForm === "OPEN" ? "text-rose-600" : "text-emerald-600"}>
                  {statusGForm}
                </strong>
              </div>
            </div>
          </div>

          {dokumentasiSebelum && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] sm:text-xs font-bold text-[#e95623]">
              <Sparkles size={12} />
              <span>Foto bukti tersimpan di Cloudinary: bdp-reportapp/hse-folder</span>
            </div>
          )}

          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleClearForm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl sm:rounded-2xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md shadow-[#e95623]/25 transition-all cursor-pointer"
            >
              Kirim Hazard Report Lainnya
            </button>
            {onNavigateToList ? (
              <button
                type="button"
                onClick={onNavigateToList}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Lihat Daftar Laporan (Monitoring)
              </button>
            ) : isStandalone ? (
              <a
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center inline-block"
              >
                Kembali ke Portal Batara
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // MAIN CUSTOM DESIGN (Batara Dharma Persada Design System)
  // --------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 sm:pb-20">
      {/* ---------------------------------------------------------
          Top Corporate Header & Navigation
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-linear-to-br from-[#e95623] to-[#cf4010] flex items-center justify-center text-white shadow-md shadow-[#e95623]/25 shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert size={22} className="sm:hidden" />
              <ShieldAlert size={26} className="hidden sm:block" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md bg-orange-100 text-[#e95623]">
                  SHE Department
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-400">
                  PT Batara Dharma Persada
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Formulir Pelaporan Bahaya (Hazard Report)
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                Pelaporan resmi Kondisi Tidak Aman (KTA) &amp; Tindakan Tidak Aman (TTA) operasional tambang.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {onNavigateToList ? (
              <button
                type="button"
                onClick={onNavigateToList}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl sm:rounded-2xl border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Daftar Laporan</span>
              </button>
            ) : isStandalone ? (
              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl sm:rounded-2xl border border-slate-200 transition-colors cursor-pointer text-center"
              >
                <ArrowLeft size={14} />
                <span>Portal Batara</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* =========================================================
            CARD 1: Project & Jenis Pelaporan Bahaya
        ========================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#e95623] text-white flex items-center justify-center font-black text-xs shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Klasifikasi Pelaporan &amp; Project Site
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                Pilih job site dan jenis kondisi atau tindakan bahaya yang ditemukan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* PROJECT* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                PROJECT SITE <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["MUARA PAHU", "SENYIUR"] as const).map((proj) => (
                  <button
                    key={proj}
                    type="button"
                    onClick={() => setProject(proj)}
                    className={`py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl sm:rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                      project === proj
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/10"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Building2 size={13} className="shrink-0" />
                    <span>{proj}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* JENIS PELAPORAN BAHAYA* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                JENIS PELAPORAN BAHAYA <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "KTA" as const, label: "KTA", desc: "Kondisi Tidak Aman" },
                    { id: "TTA" as const, label: "TTA", desc: "Tindakan Tidak Aman" },
                  ] as const
                ).map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => {
                      setJenisPelaporan(j.id);
                      setIdentifikasiBahaya(j.id === "KTA" ? KTA_ITEMS[0] : TTA_ITEMS[0]);
                    }}
                    className={`p-2.5 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer ${
                      jenisPelaporan === j.id
                        ? "bg-linear-to-br from-[#e95623] to-[#cf4010] text-white border-[#e95623] shadow-sm ring-2 ring-[#e95623]/25"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-black block">{j.label}</span>
                    <span
                      className={`text-[9.5px] sm:text-[10px] block font-medium mt-0.5 truncate ${
                        jenisPelaporan === j.id ? "text-orange-100" : "text-slate-400"
                      }`}
                    >
                      {j.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            CARD 2: Identitas Pelapor & Tanggal
        ========================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Identitas Pelapor &amp; Waktu
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                Informasi pihak yang mengamati atau menemukan bahaya di lapangan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {/* NAMA PELAPOR* with Master Manpower Autocomplete */}
            <div className="relative sm:col-span-2 lg:col-span-1" ref={manpowerDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  NAMA PELAPOR <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-semibold text-slate-400">
                  {loadingManpower ? "Memuat manpower..." : `${manpowerList.length} Manpower (MP & SY)`}
                </span>
              </div>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama atau NRP pelapor..."
                  value={namaPelapor}
                  onFocus={() => {
                    setManpowerSearchQuery(namaPelapor);
                    setIsManpowerDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setNamaPelapor(e.target.value);
                    setManpowerSearchQuery(e.target.value);
                    setIsManpowerDropdownOpen(true);
                  }}
                  required
                  autoComplete="off"
                  className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 bg-white"
                />
                {namaPelapor && (
                  <button
                    type="button"
                    onClick={() => {
                      setNamaPelapor("");
                      setNrpPelapor("");
                      setManpowerSearchQuery("");
                      setIsManpowerDropdownOpen(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title="Hapus / Cari Ulang"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {isManpowerDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 sm:right-auto sm:w-95 md:w-105 max-w-[calc(100vw-2rem)] top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Search size={12} className="text-[#e95623]" />
                      Master Manpower Aktif ({filteredManpower.length} hasil)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManpowerDropdownOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredManpower.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        <p className="font-semibold">Tidak ditemukan di Master Manpower.</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Anda tetap dapat menggunakan nama manual ini.
                        </p>
                      </div>
                    ) : (
                      filteredManpower.map((m) => {
                        const isMp = (m.branchName || "").toLowerCase().includes("muara pahu");
                        return (
                          <div
                            key={m.id || m.employeeId}
                            onClick={() => handleSelectManpower(m)}
                            className="p-2.5 hover:bg-orange-50/70 transition-colors cursor-pointer group text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-slate-900 group-hover:text-[#e95623] transition-colors">
                                {m.fullName}
                              </span>
                              <span
                                className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                                  isMp
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {m.branchName || "Jobsite"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                              <span className="font-mono font-bold text-slate-700">
                                NRP: {m.employeeId || "-"}
                              </span>
                              <span>&bull;</span>
                              <span className="font-semibold text-slate-600">
                                Dept: {m.organization || "-"}
                              </span>
                              <span>&bull;</span>
                              <span className="text-slate-400 truncate max-w-44">
                                {m.jobPosition || "-"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {namaPelapor && (
                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setIsManpowerDropdownOpen(false)}
                        className="w-full text-left px-2 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>Gunakan nama manual: "{namaPelapor}"</span>
                        <ChevronRight size={12} className="text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NRP PELAPOR* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                NRP PELAPOR <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. BDP-2024-001"
                  value={nrpPelapor}
                  onChange={(e) => setNrpPelapor(e.target.value)}
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>

            {/* TANGGAL PELAPORAN* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                TANGGAL PELAPORAN <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={tanggalPelaporan}
                  onChange={(e) => setTanggalPelaporan(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* DEPARTEMEN PELAPOR* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                DEPARTEMEN PELAPOR <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {DEPARTEMEN_OPTIONS.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setDepartemenPelapor(dept)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                      departemenPelapor === dept
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* JABATAN PELAPOR* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                JABATAN PELAPOR <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {JABATAN_OPTIONS.map((jab) => (
                  <button
                    key={jab}
                    type="button"
                    onClick={() => setJabatanPelapor(jab)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                      jabatanPelapor === jab
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {jab}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setJabatanPelapor("Yang lain")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                    jabatanPelapor === "Yang lain"
                      ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Yang lain
                </button>
              </div>

              {jabatanPelapor === "Yang lain" && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Sebutkan jabatan pelapor..."
                    value={jabatanPelaporLainnya}
                    onChange={(e) => setJabatanPelaporLainnya(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            CARD 3: Lokasi Bahaya & Penanggung Jawab Area
        ========================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
              3
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Lokasi Bahaya &amp; Penanggung Jawab Area
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                Pilih area spesifik lokasi bahaya dan pihak pengawas yang bertanggung jawab.
              </p>
            </div>
          </div>

          {/* LOKASI BAHAYA* (17 Options + Lainnya) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              LOKASI BAHAYA <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {LOKASI_OPTIONS.map((loc) => {
                const isSelected = lokasiBahaya === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLokasiBahaya(loc)}
                    className={`py-2 sm:py-2.5 px-2 rounded-lg sm:rounded-xl border text-[10.5px] sm:text-[11px] font-bold text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setLokasiBahaya("Lainnya")}
                className={`col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1 py-2 sm:py-2.5 px-2 rounded-lg sm:rounded-xl border text-[10.5px] sm:text-[11px] font-bold text-center transition-all cursor-pointer ${
                  lokasiBahaya === "Lainnya"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900/20"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Lainnya : (diisi sendiri)
              </button>
            </div>

            {lokasiBahaya === "Lainnya" && (
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="Tuliskan lokasi lainnya (misal: Hauling Road KM 14, Pit, Disposal, dll)..."
                  value={lokasiBahayaLainnya}
                  onChange={(e) => setLokasiBahayaLainnya(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2 border-t border-slate-100">
            {/* PENANGGUNG JAWAB AREA* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                PENANGGUNG JAWAB AREA <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {PENANGGUNG_JAWAB_OPTIONS.map((pic) => (
                  <button
                    key={pic}
                    type="button"
                    onClick={() => setPenanggungJawabArea(pic)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                      penanggungJawabArea === pic
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pic}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPenanggungJawabArea("Yang lain")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
                    penanggungJawabArea === "Yang lain"
                      ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Yang lain
                </button>
              </div>

              {penanggungJawabArea === "Yang lain" && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Sebutkan penanggung jawab area..."
                    value={penanggungJawabAreaLainnya}
                    onChange={(e) => setPenanggungJawabAreaLainnya(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                </div>
              )}
            </div>

            {/* STATUS* */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                STATUS PENANGANAN <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "OPEN" as const,
                    label: "OPEN",
                    desc: "Belum Ditangani",
                    color: "bg-rose-50 text-rose-700 border-rose-200",
                    active: "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-200",
                  },
                  {
                    id: "CLOSE" as const,
                    label: "CLOSE",
                    desc: "Tindakan Selesai",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    active: "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200",
                  },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusGForm(st.id)}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all cursor-pointer ${
                      statusGForm === st.id ? st.active : `${st.color} hover:opacity-90`
                    }`}
                  >
                    <span className="text-xs font-black block">{st.label}</span>
                    <span
                      className={`text-[9.5px] sm:text-[10px] block mt-0.5 ${
                        statusGForm === st.id ? "text-white/90" : "opacity-80"
                      }`}
                    >
                      {st.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            CARD 4: IDENTIFIKASI BAHAYA (KTA / TTA Options)
        ========================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#e95623] text-white flex items-center justify-center font-black text-xs shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  IDENTIFIKASI BAHAYA - {jenisPelaporan === "KTA" ? "KONDISI TIDAK AMAN" : "TINDAKAN TIDAK AMAN"} <span className="text-rose-500">*</span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                  Pilih salah satu temuan spesifik dari daftar resmi K3 Pertambangan berikut:
                </p>
              </div>
            </div>

            {/* Quick Search inside KTA/TTA options */}
            <div className="relative w-full sm:w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari opsi bahaya..."
                value={searchIdentifikasi}
                onChange={(e) => setSearchIdentifikasi(e.target.value)}
                className="w-full text-xs pl-8 pr-7 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#e95623] bg-white"
              />
              {searchIdentifikasi && (
                <button
                  type="button"
                  onClick={() => setSearchIdentifikasi("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List of KTA / TTA items */}
          <div className="space-y-1.5 sm:space-y-2 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
            {filteredIdentifikasiItems.map((item, idx) => {
              const isSelected = identifikasiBahaya === item;
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-[11.5px] sm:text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-orange-50/80 border-[#e95623] text-slate-900 font-bold shadow-2xs ring-1 ring-[#e95623]/25"
                      : "bg-slate-50/60 border-slate-200/90 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="identifikasiBahaya"
                    value={item}
                    checked={isSelected}
                    onChange={() => setIdentifikasiBahaya(item)}
                    className="mt-0.5 text-[#e95623] focus:ring-[#e95623] cursor-pointer shrink-0"
                  />
                  <span className="leading-relaxed flex-1">{item}</span>
                  {isSelected && (
                    <CheckCircle2 size={16} className="text-[#e95623] shrink-0 mt-0.5" />
                  )}
                </label>
              );
            })}

            {/* Yang lain: */}
            <label
              className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-[11.5px] sm:text-xs cursor-pointer transition-all ${
                identifikasiBahaya === "Yang lain"
                  ? "bg-orange-50/80 border-[#e95623] text-slate-900 font-bold shadow-2xs ring-1 ring-[#e95623]/25"
                  : "bg-slate-50/60 border-slate-200/90 text-slate-700 hover:bg-slate-100/70"
              }`}
            >
              <input
                type="radio"
                name="identifikasiBahaya"
                value="Yang lain"
                checked={identifikasiBahaya === "Yang lain"}
                onChange={() => setIdentifikasiBahaya("Yang lain")}
                className="mt-0.5 text-[#e95623] focus:ring-[#e95623] cursor-pointer shrink-0"
              />
              <div className="flex-1 space-y-1.5">
                <span>Yang lain:</span>
                {identifikasiBahaya === "Yang lain" && (
                  <input
                    type="text"
                    placeholder="Tuliskan temuan identifikasi bahaya lainnya..."
                    value={identifikasiBahayaLainnya}
                    onChange={(e) => setIdentifikasiBahayaLainnya(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        {/* =========================================================
            CARD 5: Uraian Rincian Bahaya & Tindakan Perbaikan
        ========================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
              5
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Rincian Temuan &amp; Tindakan Perbaikan
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                Deskripsi kondisi riil di lapangan dan rencana tindak lanjut perbaikan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* RINCIAN IDENTIFIKASI BAHAYA */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                RINCIAN IDENTIFIKASI BAHAYA
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan secara rinci kondisi atau tindakan yang ditemukan serta potensi dampak bahaya bila tidak segera ditangani..."
                value={rincianBahaya}
                onChange={(e) => setRincianBahaya(e.target.value)}
                className="w-full text-xs p-3 rounded-xl sm:rounded-2xl border border-slate-300 leading-relaxed font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              />
            </div>

            {/* TINDAKAN PERBAIKAN YANG DIPERLUKAN */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                TINDAKAN PERBAIKAN YANG DIPERLUKAN
              </label>
              <textarea
                rows={4}
                placeholder="Rekomendasi tindakan pencegahan, perbaikan langsung di tempat, atau instruksi perbaikan teknis..."
                value={tindakanPerbaikan}
                onChange={(e) => setTindakanPerbaikan(e.target.value)}
                className="w-full text-xs p-3 rounded-xl sm:rounded-2xl border border-slate-300 leading-relaxed font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            CARD 6: DOKUMENTASI FOTO (Sebelum & Sesudah) - Cloudinary
        ========================================================== */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#e95623] text-white flex items-center justify-center font-black text-xs shrink-0">
                6
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  DOKUMENTASI FOTO BUKTI (CLOUDINARY)
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
                  Foto bukti temuan kondisi sebelum perbaikan &amp; sesudah tindakan penanganan.
                </p>
              </div>
            </div>

            <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-200 self-start sm:self-auto">
              Folder: <code className="text-[#e95623] font-bold">bdp-reportapp/hse-folder</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* DOKUMENTASI SEBELUM */}
            <div className="p-3 sm:p-4 bg-slate-50/70 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  DOKUMENTASI SEBELUM (BEFORE)
                </span>
                {dokumentasiSebelum && (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Cloudinary OK
                  </span>
                )}
              </div>

              {dokumentasiSebelum ? (
                <div className="space-y-2">
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-36 sm:h-40 bg-slate-900 flex items-center justify-center">
                    <img
                      src={getCloudinaryThumbnail(dokumentasiSebelum, 400, 300)}
                      alt="Foto Sebelum"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 via-black/40 to-transparent sm:inset-0 sm:bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(dokumentasiSebelum)}
                        className="px-2.5 py-1 rounded bg-white text-slate-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <ZoomIn size={12} /> Lihat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDokumentasiSebelum("");
                          setDokumentasiSebelumPublicId("");
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                  <a
                    href={dokumentasiSebelum}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#e95623] hover:underline font-bold flex items-center gap-1 justify-center"
                  >
                    <ExternalLink size={10} /> Buka Foto Asli di Cloudinary
                  </a>
                </div>
              ) : (
                <div>
                  <input
                    ref={inputSebelumRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadPhoto(e, "sebelum")}
                  />
                  <button
                    type="button"
                    disabled={isUploadingSebelum}
                    onClick={() => inputSebelumRef.current?.click()}
                    className="w-full h-28 sm:h-32 border-2 border-dashed border-slate-300 hover:border-[#e95623] rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 bg-white hover:bg-orange-50/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isUploadingSebelum ? (
                      <>
                        <Loader2 size={20} className="text-[#e95623] animate-spin" />
                        <span className="text-xs font-bold text-slate-700">
                          Mengunggah ke Cloudinary...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-[#e95623] flex items-center justify-center">
                          <Camera size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          Ambil / Unggah Foto Temuan
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Format JPG, PNG, WebP (Maks 10MB)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* DOKUMENTASI SESUDAH */}
            <div className="p-3 sm:p-4 bg-slate-50/70 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  DOKUMENTASI SESUDAH (AFTER)
                </span>
                {dokumentasiSesudah && (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Cloudinary OK
                  </span>
                )}
              </div>

              {dokumentasiSesudah ? (
                <div className="space-y-2">
                  <div className="relative group rounded-xl overflow-hidden border border-emerald-300 h-36 sm:h-40 bg-slate-900 flex items-center justify-center">
                    <img
                      src={getCloudinaryThumbnail(dokumentasiSesudah, 400, 300)}
                      alt="Foto Sesudah"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 via-black/40 to-transparent sm:inset-0 sm:bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(dokumentasiSesudah)}
                        className="px-2.5 py-1 rounded bg-white text-slate-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <ZoomIn size={12} /> Lihat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDokumentasiSesudah("");
                          setDokumentasiSesudahPublicId("");
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                  <a
                    href={dokumentasiSesudah}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-1 justify-center"
                  >
                    <ExternalLink size={10} /> Buka Foto Asli di Cloudinary
                  </a>
                </div>
              ) : (
                <div>
                  <input
                    ref={inputSesudahRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadPhoto(e, "sesudah")}
                  />
                  <button
                    type="button"
                    disabled={isUploadingSesudah}
                    onClick={() => inputSesudahRef.current?.click()}
                    className="w-full h-28 sm:h-32 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isUploadingSesudah ? (
                      <>
                        <Loader2 size={20} className="text-emerald-600 animate-spin" />
                        <span className="text-xs font-bold text-slate-700">
                          Mengunggah ke Cloudinary...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <ShieldCheck size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          Unggah Foto Bukti Perbaikan
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Dilampirkan saat tindakan telah selesai
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            BOTTOM SUBMIT BAR (Responsive Sticky Navigation)
        ========================================================== */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-lg p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 sticky bottom-2 sm:bottom-4 z-30">
          <div className="text-[10.5px] sm:text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 text-center sm:text-left">
            <ShieldCheck size={15} className="text-[#e95623] shrink-0" />
            <span>
              Laporan terkirim otomatis ke sistem pengawasan K3 PT Batara Dharma Persada.
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearForm}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-center"
            >
              Kosongkan Formulir
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingSebelum || isUploadingSesudah}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md shadow-[#e95623]/25 transition-all cursor-pointer disabled:opacity-60 hover:scale-[1.01] text-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Kirim Hazard Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <span className="text-[11px] sm:text-xs font-bold truncate">Pratinjau Foto Dokumentasi (Cloudinary)</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto">
              <img
                src={getCloudinaryFullPreview(lightboxUrl)}
                alt="Foto Penuh"
                className="max-h-[75vh] max-w-full rounded-lg sm:rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
