"use client";

import React, { useState, useRef } from "react";
import {
  ClipboardCheck,
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
  Clock,
  Calendar,
  Sparkles,
  Check,
  Building2,
  ZoomIn,
  Trash2,
  Loader2,
  FileText,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
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

interface HazardReportFormPageProps {
  user: any;
  onNavigateToList: () => void;
  onNavigateToDashboard?: () => void;
}

// Checklist Options for KTA (Kondisi Tidak Aman)
const KTA_CHECKLIST = [
  "Jalan hauling rusak, berlubang, licin, atau amblas",
  "Tanggul pengaman (bund wall / safety berm) tidak standar / rusak",
  "Penerangan kurang memadai / tower lamp padam di titik rawan (blind spot)",
  "Rambu keselamatan rusak, pudar, tertutup debu, atau hilang",
  "Housekeeping area kerja buruk, ceceran oli, solar, atau limbah B3",
  "Penutup pengaman mesin (machine guard / v-belt guard) tidak terpasang",
  "Peralatan / perkakas kerja rusak, modifikasi tidak standar, atau tanpa tagging",
  "Kabel listrik terkelupas, sambungan tidak standar, grounding kendor",
  "Kondisi lereng tambang rawan longsor / retakan tanah aktif",
  "Fasilitas sanitasi / air minum tidak higienis di lokasi kerja",
];

// Checklist Options for TTA (Tindakan Tidak Aman)
const TTA_CHECKLIST = [
  "Tidak menggunakan APD wajib lengkap (Helm, Rompi reflektor, Kacamata, Sepatu)",
  "Mengoperasikan kendaraan / unit melebihi batas kecepatan (overspeed)",
  "Mengemudi kendaraan sambil menggunakan HP atau merokok",
  "Tidak melakukan pemeriksaan harian (P2H) sebelum unit dioperasikan",
  "Bekerja di ketinggian (> 1.8 meter) tanpa menggunakan Full Body Harness",
  "Berada di area titik jepit (pinch point) atau blind spot manuver alat berat",
  "Menyalip di tikungan atau jarak iring kendaraan tidak aman (< 50 meter)",
  "Tidak memasang ganjal ban (wheel choke) saat parkir",
  "Menumpang pada unit yang bukan peruntukannya (misal di bak dump truck)",
  "Membypass safety switch atau safety device instalasi peralatan",
];

// Checklist Options for Environmental / Lingkungan
const ENV_CHECKLIST = [
  "Tumpahan minyak / oli / solar ke tanah terbuka atau saluran air",
  "Limbah B3 (filter bekas, aki, kain majun) dibuang sembarangan",
  "Kolam pengendap lumpur (settling pond) meluap / tanggul jebol",
  "Debu berlebih di jalur hauling akibat penyiraman road water truck kurang",
  "Emisi gas buang hitam pekat pada unit alat berat / genset",
];

// Standard Locations
const SITE_LOCATIONS = {
  MuaraPahu: [
    "Hauling Road KM 0 - KM 10",
    "Hauling Road KM 11 - KM 20",
    "Hauling Road KM 21 - KM 30",
    "Hauling Road KM 31+",
    "Stockpile Jetty & Hopper Crusher",
    "Main Workshop & Tire Bay MP",
    "Fuel Storage & Dispenser MP",
    "Central Control Room (CCR)",
    "Mess Karyawan & Camp Area MP",
    "Office Site Muara Pahu",
  ],
  Senyiur: [
    "Hauling Road Senyiur KM 0 - KM 15",
    "Hauling Road Senyiur KM 16+",
    "Stockpile Jetty Senyiur",
    "Workshop & Maintenance Bay Senyiur",
    "Fuel Station Senyiur",
    "Office Site Senyiur",
    "Mess & Camp Karyawan Senyiur",
  ],
};

export const HazardReportFormPage: React.FC<HazardReportFormPageProps> = ({
  user,
  onNavigateToList,
  onNavigateToDashboard,
}) => {
  const { showSuccess, showError, showInfo } = useNotification();

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportNumber, setSubmittedReportNumber] = useState<string | null>(null);

  // Form Fields State
  const [jobSite, setJobSite] = useState<"MuaraPahu" | "Senyiur">(
    user?.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu"
  );
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [reporterName, setReporterName] = useState<string>(
    user?.namaLengkap || user?.username || ""
  );
  const [reporterDept, setReporterDept] = useState<string>(user?.department || "Operations");
  const [reporterNik, setReporterNik] = useState<string>(user?.nik || "");

  // Location
  const [locationPreset, setLocationPreset] = useState<string>("");
  const [locationDetail, setLocationDetail] = useState<string>("");

  // Category & Checklists
  const [category, setCategory] = useState<HazardCategory>("Unsafe Condition");
  const [selectedChecklistItems, setSelectedChecklistItems] = useState<string[]>([]);
  const [customChecklistText, setCustomChecklistText] = useState<string>("");

  // Risk Level
  const [riskLevel, setRiskLevel] = useState<HazardRiskLevel>("Medium");

  // Title & Description
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Immediate Action & Corrective Action
  const [immediateAction, setImmediateAction] = useState<string>("");
  const [correctiveAction, setCorrectiveAction] = useState<string>("");

  // PIC & Due Date
  const [picName, setPicName] = useState<string>("");
  const [picDept, setPicDept] = useState<string>("Maintenance");
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<HazardStatus>("Open");

  // Photos (Cloudinary)
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoPublicId, setPhotoPublicId] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [evidencePublicId, setEvidencePublicId] = useState<string>("");

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Toggle Checklist Item
  const toggleChecklistItem = (itemText: string) => {
    setSelectedChecklistItems((prev) => {
      const exists = prev.includes(itemText);
      const next = exists ? prev.filter((i) => i !== itemText) : [...prev, itemText];

      // Auto-populate Title if empty and first item is checked
      if (!exists && !title.trim()) {
        setTitle(itemText);
      }
      return next;
    });
  };

  // Upload handler to Cloudinary
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "photo" | "evidence"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Berkas harus berupa gambar (JPG, PNG, WebP).");
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
          setPhotoUrl(res.secure_url);
          setPhotoPublicId(res.public_id);
          showSuccess("Foto bukti temuan berhasil disimpan di Cloudinary (hse-folder).");
        } else {
          setEvidenceUrl(res.secure_url);
          setEvidencePublicId(res.public_id);
          showSuccess("Foto bukti perbaikan berhasil disimpan di Cloudinary (hse-folder).");
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

  // Reset Form
  const handleResetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedChecklistItems([]);
    setCustomChecklistText("");
    setLocationDetail("");
    setImmediateAction("");
    setCorrectiveAction("");
    setPicName("");
    setPhotoUrl("");
    setPhotoPublicId("");
    setEvidenceUrl("");
    setEvidencePublicId("");
    setStatus("Open");
    setSubmittedReportNumber(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const finalLocation = [locationPreset, locationDetail].filter(Boolean).join(" - ").trim();
    if (!finalLocation) {
      showError("Harap tentukan lokasi temuan bahaya.");
      return;
    }

    const finalTitle = title.trim() || selectedChecklistItems[0] || customChecklistText.trim();
    if (!finalTitle) {
      showError("Harap isi judul atau pilih checklist temuan bahaya.");
      return;
    }

    // Build comprehensive description including checklist items
    const checklistSummary =
      selectedChecklistItems.length > 0
        ? `\n\nChecklist Teridentifikasi:\n- ${selectedChecklistItems.join("\n- ")}`
        : "";
    const customSummary = customChecklistText.trim()
      ? `\n- Catatan Khusus: ${customChecklistText.trim()}`
      : "";
    const reporterInfo = reporterNik ? ` [NIK/NRP: ${reporterNik}]` : "";

    const combinedDescription = `${description.trim() || finalTitle}${checklistSummary}${customSummary}`;

    try {
      setIsSubmitting(true);
      const created = await sheService.createHazard({
        jobSite,
        date,
        time,
        location: finalLocation,
        category,
        riskLevel,
        title: finalTitle,
        description: combinedDescription,
        immediateAction: immediateAction.trim() || "Sudah dilaporkan kepada pengawas area.",
        correctiveAction: correctiveAction.trim() || "Perlu inspeksi dan perbaikan menyeluruh.",
        reporterName: `${reporterName.trim() || "Safety Patrol"}${reporterInfo}`,
        reporterDept: reporterDept.trim() || "Operations",
        picName: picName.trim() || "Pengawas Area Terkait",
        picDept: picDept.trim() || "Maintenance",
        dueDate,
        status,
        photoUrl: photoUrl || undefined,
        photoPublicId: photoPublicId || undefined,
        evidenceUrl: evidenceUrl || undefined,
        evidencePublicId: evidencePublicId || undefined,
      });

      setSubmittedReportNumber(created.reportNumber);
      showSuccess(`Laporan Bahaya ${created.reportNumber} berhasil disimpan ke sistem!`);
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan Hazard Report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // Confirmation Screen (Google Form Style)
  // ---------------------------------------------------------
  if (submittedReportNumber) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
          {/* Top Brand Banner */}
          <div className="h-4 bg-linear-to-r from-[#e95623] via-[#ff7844] to-[#e95623]" />

          <div className="p-8 sm:p-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-[#e95623] tracking-wider">
                Laporan Bahaya Berhasil Dikirim
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Terima Kasih Atas Kepedulian Anda!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                Tanggapan Anda telah tercatat dengan nomor laporan resmi:
              </p>
              <div className="inline-block mt-2 px-4 py-1.5 rounded-2xl bg-slate-900 text-white font-mono font-black text-base tracking-wider shadow-sm">
                {submittedReportNumber}
              </div>
            </div>

            {photoUrl && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <Check size={13} /> Foto bukti temuan tersimpan aman di Cloudinary (hse-folder)
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-2xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Kirim Laporan Hazard Lainnya
              </button>
              <button
                type="button"
                onClick={onNavigateToList}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Lihat Daftar Laporan (Monitoring)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // Main Questionnaire Page (Google Form Style)
  // ---------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateToList}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Daftar Laporan</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">
            Formulir Resmi K3 Pertambangan
          </span>
          <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[#e95623] text-[10px] font-black">
            BDP HSE SYSTEM
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* =========================================================
            HEADER CARD: Google Form Banner & Welcome Info
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Top Decorative Stripe */}
          <div className="h-3.5 bg-linear-to-r from-[#e95623] via-[#ff7c47] to-[#d84818]" />

          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                    PT BATARA DHARMA PERSADA
                  </span>
                  <span className="text-xs font-bold text-[#e95623]">
                    Safety, Health &amp; Environment
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Formulir Pelaporan Bahaya (Hazard Report)
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Gunakan formulir ini untuk melaporkan setiap temuan{" "}
                  <strong>Kondisi Tidak Aman (KTA)</strong>,{" "}
                  <strong>Tindakan Tidak Aman (TTA)</strong>, maupun kejadian{" "}
                  <strong>Hampir Celaka (Near Miss)</strong> di area tambang dan fasilitas pendukung.
                  Partisipasi Anda menyelamatkan nyawa dan mewujudkan <strong>Zero Harm</strong>.
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-[#e95623]/10 border border-[#e95623]/30 flex items-center justify-center text-[#e95623] shrink-0">
                <ShieldAlert size={32} />
              </div>
            </div>

            {/* Cloudinary Integration Alert */}
            <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-2xl flex items-center justify-between text-xs text-orange-950">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#e95623] shrink-0" />
                <span>
                  <strong>Cloud Storage Aktif:</strong> Foto bukti temuan &amp; perbaikan otomatis tersimpan langsung ke Cloudinary folder{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-orange-300 font-bold text-[#e95623]">
                    bdp-reportapp/hse-folder
                  </code>
                </span>
              </div>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                Connected
              </span>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
              <span>* Wajib diisi</span>
              <span>Kerahasiaan data pelapor dijamin oleh Tim SHE BDP</span>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 1: Data Pelapor & Waktu Temuan
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              1
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Data Identitas Pelapor &amp; Waktu Temuan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Job Site <span className="text-rose-500">*</span>
              </label>
              <select
                value={jobSite}
                onChange={(e) => {
                  setJobSite(e.target.value as any);
                  setLocationPreset("");
                }}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-[#e95623]/30"
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#e95623]/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Waktu Temuan (Jam)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#e95623]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nama Lengkap Pelapor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nama Anda"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#e95623]/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                NIK / NRP / ID Karyawan
              </label>
              <input
                type="text"
                placeholder="e.g. BDP-2024-089"
                value={reporterNik}
                onChange={(e) => setReporterNik(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#e95623]/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Departemen / Perusahaan
              </label>
              <input
                type="text"
                placeholder="e.g. Hauling, Plant, SHE, Logistik"
                value={reporterDept}
                onChange={(e) => setReporterDept(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#e95623]/30"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 2: Lokasi Spesifik Temuan
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              2
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Lokasi Temuan Bahaya
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pilih Area Utama (Site {jobSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"})
              </label>
              <select
                value={locationPreset}
                onChange={(e) => setLocationPreset(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-[#e95623]/30"
              >
                <option value="">-- Pilih Area / Zona --</option>
                {SITE_LOCATIONS[jobSite].map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
                <option value="Area Lainnya">Area Lainnya</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Detail Titik Lokasi Spesifik <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tikungan KM 14+300 jalur kiri, Bay 3 Workshop, Dekat genset tower"
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                required={!locationPreset}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#e95623]/30"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Sebutkan titik patok kilometer (KM), nama gedung/bay, atau penanda terdekat agar mudah ditemukan tim SHE.
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 3: Klasifikasi & CHECKLIST BAHAYA (GForm Style!)
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              3
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Klasifikasi &amp; Checklist Temuan Bahaya
              </h3>
              <p className="text-[11px] text-slate-400">
                Pilih jenis bahaya dan centang checklist yang sesuai dengan temuan Anda di lapangan.
              </p>
            </div>
          </div>

          {/* Kategori Tab Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Jenis Kategori Utama <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { id: "Unsafe Condition", label: "KTA (Kondisi)", desc: "Kondisi fisik bahaya" },
                  { id: "Unsafe Action", label: "TTA (Tindakan)", desc: "Perilaku tidak aman" },
                  { id: "Near Miss", label: "Near Miss", desc: "Hampir celaka" },
                  { id: "Environmental", label: "Lingkungan", desc: "Ceceran / limbah" },
                  { id: "Health & Hygiene", label: "Kesehatan", desc: "Higienitas / ergonomi" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    category === cat.id
                      ? "bg-[#e95623] text-white border-[#e95623] shadow-sm ring-2 ring-[#e95623]/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-extrabold block">{cat.label}</span>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      category === cat.id ? "text-orange-100" : "text-slate-400"
                    }`}
                  >
                    {cat.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CHECKLIST ITEMS BASED ON CATEGORY */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ClipboardCheck size={15} className="text-[#e95623]" />
                Daftar Checklist Temuan (Centang yang sesuai):
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {selectedChecklistItems.length} opsi terpilih
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {(category === "Unsafe Action"
                ? TTA_CHECKLIST
                : category === "Environmental"
                ? ENV_CHECKLIST
                : KTA_CHECKLIST
              ).map((item, idx) => {
                const isChecked = selectedChecklistItems.includes(item);
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? "bg-orange-50/80 border-[#e95623] text-slate-900 font-bold shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60 font-medium"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecklistItem(item)}
                      className="mt-0.5 rounded text-[#e95623] focus:ring-[#e95623] cursor-pointer"
                    />
                    <span className="leading-snug">{item}</span>
                  </label>
                );
              })}
            </div>

            {/* Custom Checklist / Other */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Lainnya / Keterangan Temuan Tambahan:
              </label>
              <input
                type="text"
                placeholder="Tuliskan temuan lain jika tidak tercantum pada checklist di atas..."
                value={customChecklistText}
                onChange={(e) => setCustomChecklistText(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          {/* RISK LEVEL MATRIX */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Tingkat Risiko Bahaya (Risk Level) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: "Critical" as const,
                  label: "Critical (Kritis)",
                  desc: "Potensi fatalitas / Hentikan alat segera!",
                  badge: "bg-rose-50 border-rose-200 text-rose-800",
                  active: "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-300",
                },
                {
                  id: "High" as const,
                  label: "High (Tinggi)",
                  desc: "Potensi cedera serius / Penanganan segera",
                  badge: "bg-orange-50 border-orange-200 text-orange-800",
                  active: "bg-[#e95623] text-white border-[#e95623] ring-2 ring-orange-300",
                },
                {
                  id: "Medium" as const,
                  label: "Medium (Sedang)",
                  desc: "Cedera ringan / Penanganan terjadwal 1-3 hari",
                  badge: "bg-amber-50 border-amber-200 text-amber-800",
                  active: "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300",
                },
                {
                  id: "Low" as const,
                  label: "Low (Rendah)",
                  desc: "Tidak ada cedera / Pemantauan rutin",
                  badge: "bg-emerald-50 border-emerald-200 text-emerald-800",
                  active: "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300",
                },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRiskLevel(r.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    riskLevel === r.id ? r.active : `${r.badge} hover:opacity-90`
                  }`}
                >
                  <span className="text-xs font-extrabold block">{r.label}</span>
                  <span
                    className={`text-[10px] block mt-0.5 leading-tight ${
                      riskLevel === r.id ? "text-white/90" : "opacity-80"
                    }`}
                  >
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 4: Deskripsi Rinci & Upload Foto Temuan
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              4
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Uraian Bahaya &amp; Foto Bukti Temuan (Before)
            </h3>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Judul Singkat Temuan Bahaya <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Tanggul pengaman ambles di tikungan KM 14"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-[#e95623]/30"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Uraian Rinci Temuan &amp; Potensi Dampak Bahaya
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan secara detail kondisi atau tindakan bahaya yang ditemukan serta potensi dampaknya bagi pekerja atau peralatan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 font-medium leading-relaxed focus:ring-2 focus:ring-[#e95623]/30"
            />
          </div>

          {/* CLOUDINARY PHOTO UPLOAD: TEMUAN (BEFORE) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera size={14} className="text-[#e95623]" />
                  Upload Foto Bukti Temuan (Before)
                </span>
                <span className="text-[10px] text-slate-400">
                  Foto langsung disimpan ke Cloudinary folder:{" "}
                  <code className="text-[#e95623] font-bold">bdp-reportapp/hse-folder</code>
                </span>
              </div>
              {photoUrl && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} /> Tersimpan di Cloudinary
                </span>
              )}
            </div>

            {photoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                <div className="relative group w-32 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-900">
                  <img
                    src={getCloudinaryThumbnail(photoUrl, 300, 200)}
                    alt="Foto Temuan"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(photoUrl)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
                <div className="flex-1 min-w-0 space-y-1 text-xs">
                  <p className="font-bold text-slate-800 truncate">Foto Temuan Bahaya</p>
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#e95623] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> Buka resolusi penuh di Cloudinary
                  </a>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl("");
                        setPhotoPublicId("");
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
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
                  className="w-full h-28 border-2 border-dashed border-slate-300 hover:border-[#e95623] rounded-2xl flex flex-col items-center justify-center gap-1 bg-white hover:bg-orange-50/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 size={24} className="text-[#e95623] animate-spin" />
                      <span className="text-xs font-bold text-slate-700">
                        Mengunggah foto ke Cloudinary...
                      </span>
                      <span className="text-[10px] text-slate-400">bdp-reportapp/hse-folder</span>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-[#e95623] flex items-center justify-center">
                        <Camera size={18} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Ambil Foto atau Pilih Berkas Gambar
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Mendukung kamera HP / format JPG, PNG, WebP
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            SECTION 5: Tindakan Perbaikan & Bukti Penyelesaian (After)
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              5
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Tindakan Perbaikan &amp; Penanggung Jawab
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tindakan Langsung Dilakukan (Immediate Action)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Memasang pita barikade keselamatan, memberikan teguran lisan, menghentikan sementara aktivitas"
                value={immediateAction}
                onChange={(e) => setImmediateAction(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Rencana Tindakan Koreksi Lanjutan (Corrective Action)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Grading dan pemadatan ulang badan jalan oleh tim Sipil, perbaikan instalasi kabel oleh Elektrikal"
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 font-medium leading-relaxed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Penanggung Jawab (PIC)
              </label>
              <input
                type="text"
                placeholder="Nama PIC penanganan"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Departemen PIC
              </label>
              <input
                type="text"
                placeholder="e.g. Maintenance, Hauling, Civil"
                value={picDept}
                onChange={(e) => setPicDept(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Selesai (Due Date)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">Status Laporan</label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "Open", label: "Open (Belum Selesai)", color: "text-rose-700 bg-rose-50 border-rose-300" },
                { id: "In Progress", label: "In Progress (Sedang Dikerjakan)", color: "text-amber-700 bg-amber-50 border-amber-300" },
                { id: "Closed", label: "Closed (Sudah Tuntas)", color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id as HazardStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    status === st.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : st.color
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* CLOUDINARY PHOTO UPLOAD: PERBAIKAN (AFTER) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  Foto Bukti Penyelesaian / Perbaikan (After - Opsional)
                </span>
                <span className="text-[10px] text-slate-400">
                  Lampirkan jika tindakan perbaikan sudah tuntas dilakukan di lapangan.
                </span>
              </div>
              {evidenceUrl && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} /> Tersimpan di Cloudinary
                </span>
              )}
            </div>

            {evidenceUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-white rounded-xl border border-emerald-200">
                <div className="relative group w-32 h-24 rounded-lg overflow-hidden border border-emerald-300 shrink-0 bg-slate-900">
                  <img
                    src={getCloudinaryThumbnail(evidenceUrl, 300, 200)}
                    alt="Foto Perbaikan"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(evidenceUrl)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
                <div className="flex-1 min-w-0 space-y-1 text-xs">
                  <p className="font-bold text-emerald-800 truncate">Foto Bukti Perbaikan Selesai</p>
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> Buka resolusi penuh di Cloudinary
                  </a>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => evidenceInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceUrl("");
                        setEvidencePublicId("");
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
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
                  className="w-full h-24 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-1 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isUploadingEvidence ? (
                    <>
                      <Loader2 size={24} className="text-emerald-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-700">
                        Mengunggah foto ke Cloudinary...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <UploadCloud size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        Upload Bukti Kondisi Setelah Perbaikan
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Disimpan ke folder Cloudinary: bdp-reportapp/hse-folder
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            BOTTOM SUBMIT BAR
        ========================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-30">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#e95623]" />
            <span>
              Laporan akan diverifikasi oleh Safety Officer &amp; SHE Supervisor Site.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto || isUploadingEvidence}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md shadow-[#e95623]/25 transition-all cursor-pointer disabled:opacity-60 hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Menyimpan Laporan...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Kirim Laporan Bahaya</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Lightbox Modal */}
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
              <span className="text-xs font-bold">Pratinjau Foto Bukti (Cloudinary)</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/60 overflow-auto">
              <img
                src={getCloudinaryFullPreview(lightboxUrl)}
                alt="Foto Bukti Penuh"
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
