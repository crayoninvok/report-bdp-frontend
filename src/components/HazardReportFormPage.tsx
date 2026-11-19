"use client";

import React, { useState, useRef } from "react";
import {
  CheckCircle2,
  Camera,
  Upload,
  X,
  ArrowLeft,
  RefreshCw,
  ZoomIn,
  Trash2,
  Loader2,
  ExternalLink,
  Plus,
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

// ----------------------------------------------------------------------
// Exact Google Form Choices & Options
// ----------------------------------------------------------------------
const DEPARTEMEN_OPTIONS = [
  "PLANT",
  "PRODUKSI",
  "HRGA",
  "HSE",
  "LOGISTIK",
  "INFRAS",
  "MANAGEMENT",
] as const;

const LOKASI_OPTIONS = [
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

const PENANGGUNG_JAWAB_OPTIONS = [
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

const JABATAN_OPTIONS = [
  "SITE MANAGEMENT",
  "SUPERINTENDENT",
  "SR. SUPERVISOR",
  "JR. SUPERVISOR",
  "WORKER",
] as const;

// 26 Exact KTA Items from Google Form
const KTA_ITEMS = [
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
const TTA_ITEMS = [
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
  const [tanggalPelaporan, setTanggalPelaporan] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [departemenPelapor, setDepartemenPelapor] = useState<string>("PLANT");
  const [lokasiBahaya, setLokasiBahaya] = useState<string>("WORKSHOP");
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
    setRincianBahaya("");
    setIdentifikasiBahaya(KTA_ITEMS[0]);
    setIdentifikasiBahayaLainnya("");
    setTindakanPerbaikan("");
    setDokumentasiSebelum("");
    setDokumentasiSebelumPublicId("");
    setDokumentasiSesudah("");
    setDokumentasiSesudahPublicId("");
    setPenanggungJawabAreaLainnya("");
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
        lokasiBahaya,
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
        location: lokasiBahaya,
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
  // SUBMISSION CONFIRMATION (Google Form Style)
  // --------------------------------------------------------------------
  if (submittedReportNumber) {
    return (
      <div className="min-h-[85vh] bg-[#f0ebf8] py-10 px-4 flex flex-col items-center">
        <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Top Google Form Purple/Orange Header Bar */}
          <div className="h-2.5 bg-[#673ab7]" />

          <div className="p-8 space-y-4">
            <h1 className="text-3xl font-normal text-slate-900 font-sans tracking-tight">
              HAZARD REPORT
            </h1>
            <p className="text-sm text-slate-800">Tanggapan Anda telah direkam.</p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <span className="font-bold text-slate-500 uppercase block text-[10px]">
                Nomor Registrasi Laporan
              </span>
              <span className="text-base font-black text-slate-900 font-mono block">
                {submittedReportNumber}
              </span>
              <span className="text-slate-500 block text-[11px]">
                Project: <strong>{project}</strong> &bull; Jenis: <strong>{jenisPelaporan}</strong> &bull; Lokasi: <strong>{lokasiBahaya}</strong>
              </span>
            </div>

            {dokumentasiSebelum && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Foto bukti dokumentasi tersimpan aman di Cloudinary (hse-folder).</span>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleClearForm}
                className="text-xs text-[#1a73e8] hover:underline font-medium cursor-pointer"
              >
                Kirim tanggapan lain
              </button>
              <span className="hidden sm:inline text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={onNavigateToList}
                className="text-xs text-[#1a73e8] hover:underline font-medium cursor-pointer"
              >
                Lihat Daftar Hazard Report (Monitoring)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>Konten ini dibuat oleh Departemen SHE PT Batara Dharma Persada.</p>
          <span className="text-[11px] text-slate-400">Google Formulir - Form Identik</span>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // MAIN GOOGLE FORM CLONE UI
  // --------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f0ebf8] py-8 px-4 flex flex-col items-center">
      {/* Top Navbar Actions */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onNavigateToList}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Monitoring</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Formulir Pelaporan Bahaya (KTA &bull; TTA)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
        {/* =========================================================
            HEADER CARD (Google Form Title)
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-2.5 bg-[#673ab7]" />
          <div className="p-6 sm:p-7 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight font-sans">
              HAZARD REPORT
            </h1>
            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              FORMULIR PELAPORAN BAHAYA
            </p>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span>{user?.email || "dathariqf@gmail.com"}</span>
                <span className="text-[#1a73e8] ml-2 cursor-pointer hover:underline">
                  Ganti akun
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Nama, alamat email, dan foto yang terkait dengan Akun Google Anda akan direkam saat Anda mengupload file dan mengirimkan formulir ini.
            </p>

            <div className="text-xs text-rose-600 font-medium border-t border-slate-100 pt-2">
              * Menunjukkan pertanyaan yang wajib diisi
            </div>
          </div>
        </div>

        {/* =========================================================
            QUESTION 1: JENIS PELAPORAN BAHAYA*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            JENIS PELAPORAN BAHAYA <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-2.5 pt-1">
            {(["KTA", "TTA"] as const).map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="jenisPelaporan"
                  value={opt}
                  checked={jenisPelaporan === opt}
                  onChange={() => {
                    setJenisPelaporan(opt);
                    setIdentifikasiBahaya(opt === "KTA" ? KTA_ITEMS[0] : TTA_ITEMS[0]);
                  }}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================
            QUESTION 2: NAMA PELAPOR*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            NAMA PELAPOR <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Jawaban Anda"
            value={namaPelapor}
            onChange={(e) => setNamaPelapor(e.target.value)}
            required
            className="w-full text-sm py-2 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden transition-colors"
          />
        </div>

        {/* =========================================================
            QUESTION 3: NRP PELAPOR*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            NRP PELAPOR <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Jawaban Anda"
            value={nrpPelapor}
            onChange={(e) => setNrpPelapor(e.target.value)}
            required
            className="w-full text-sm py-2 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden transition-colors"
          />
        </div>

        {/* =========================================================
            QUESTION 4: TANGGAL PELAPORAN*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            TANGGAL PELAPORAN <span className="text-rose-600">*</span>
          </label>
          <input
            type="date"
            value={tanggalPelaporan}
            onChange={(e) => setTanggalPelaporan(e.target.value)}
            required
            className="text-sm py-1.5 px-3 border border-slate-300 rounded-md focus:border-[#673ab7] focus:outline-hidden bg-white"
          />
        </div>

        {/* =========================================================
            QUESTION 5: DEPARTEMEN PELAPOR*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            DEPARTEMEN PELAPOR <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-2.5 pt-1">
            {DEPARTEMEN_OPTIONS.map((dept) => (
              <label
                key={dept}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="departemenPelapor"
                  value={dept}
                  checked={departemenPelapor === dept}
                  onChange={(e) => setDepartemenPelapor(e.target.value)}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{dept}</span>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================
            QUESTION 6: LOKASI BAHAYA*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            LOKASI BAHAYA <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {LOKASI_OPTIONS.map((loc) => (
              <label
                key={loc}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="lokasiBahaya"
                  value={loc}
                  checked={lokasiBahaya === loc}
                  onChange={(e) => setLokasiBahaya(e.target.value)}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{loc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================
            QUESTION 7: RINCIAN IDENTIFIKASI BAHAYA
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            RINCIAN IDENTIFIKASI BAHAYA
          </label>
          <textarea
            rows={3}
            placeholder="Jawaban Anda"
            value={rincianBahaya}
            onChange={(e) => setRincianBahaya(e.target.value)}
            className="w-full text-sm p-2 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden transition-colors"
          />
        </div>

        {/* =========================================================
            QUESTION 8: PENANGGUNG JAWAB AREA*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            PENANGGUNG JAWAB AREA <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-2.5 pt-1">
            {PENANGGUNG_JAWAB_OPTIONS.map((pic) => (
              <label
                key={pic}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="penanggungJawabArea"
                  value={pic}
                  checked={penanggungJawabArea === pic}
                  onChange={(e) => setPenanggungJawabArea(e.target.value)}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{pic}</span>
              </label>
            ))}

            {/* Yang lain: */}
            <div className="flex items-center gap-3 text-sm text-slate-800">
              <input
                type="radio"
                name="penanggungJawabArea"
                value="Yang lain"
                checked={penanggungJawabArea === "Yang lain"}
                onChange={() => setPenanggungJawabArea("Yang lain")}
                className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
              />
              <span className="shrink-0">Yang lain:</span>
              <input
                type="text"
                value={penanggungJawabAreaLainnya}
                onChange={(e) => {
                  setPenanggungJawabArea("Yang lain");
                  setPenanggungJawabAreaLainnya(e.target.value);
                }}
                className="flex-1 text-sm py-1 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            QUESTION 9: STATUS*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            STATUS <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-2.5 pt-1">
            {(["OPEN", "CLOSE"] as const).map((st) => (
              <label
                key={st}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="statusGForm"
                  value={st}
                  checked={statusGForm === st}
                  onChange={() => setStatusGForm(st)}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{st}</span>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================
            QUESTION 10: PROJECT*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            PROJECT <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-2.5 pt-1">
            {(["SENYIUR", "MUARA PAHU"] as const).map((proj) => (
              <label
                key={proj}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="project"
                  value={proj}
                  checked={project === proj}
                  onChange={() => setProject(proj)}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{proj}</span>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================
            QUESTION 11: JABATAN PELAPOR*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            JABATAN PELAPOR <span className="text-rose-600">*</span>
          </label>
          <div className="space-y-2.5 pt-1">
            {JABATAN_OPTIONS.map((jab) => (
              <label
                key={jab}
                className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="jabatanPelapor"
                  value={jab}
                  checked={jabatanPelapor === jab}
                  onChange={(e) => setJabatanPelapor(e.target.value)}
                  className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
                />
                <span>{jab}</span>
              </label>
            ))}

            {/* Yang lain: */}
            <div className="flex items-center gap-3 text-sm text-slate-800">
              <input
                type="radio"
                name="jabatanPelapor"
                value="Yang lain"
                checked={jabatanPelapor === "Yang lain"}
                onChange={() => setJabatanPelapor("Yang lain")}
                className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
              />
              <span className="shrink-0">Yang lain:</span>
              <input
                type="text"
                value={jabatanPelaporLainnya}
                onChange={(e) => {
                  setJabatanPelapor("Yang lain");
                  setJabatanPelaporLainnya(e.target.value);
                }}
                className="flex-1 text-sm py-1 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            QUESTION 12: IDENTIFIKASI BAHAYA (DIISI SESUAI DENGAN JENIS PELAPORAN KTA/TTA)*
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <div>
            <span className="text-xs font-black uppercase text-[#673ab7] tracking-wider block mb-0.5">
              {jenisPelaporan === "KTA" ? "KONDISI TIDAK AMAN" : "TINDAKAN TIDAK AMAN"}
            </span>
            <label className="text-sm font-medium text-slate-900 block leading-snug">
              IDENTIFIKASI BAHAYA - DIISI SESUAI DENGAN JENIS PELAPORAN ({jenisPelaporan}) <span className="text-rose-600">*</span>
            </label>
          </div>

          <div className="space-y-3 pt-2">
            {(jenisPelaporan === "KTA" ? KTA_ITEMS : TTA_ITEMS).map((item, idx) => (
              <label
                key={idx}
                className="flex items-start gap-3 text-xs sm:text-sm text-slate-800 cursor-pointer"
              >
                <input
                  type="radio"
                  name="identifikasiBahaya"
                  value={item}
                  checked={identifikasiBahaya === item}
                  onChange={() => setIdentifikasiBahaya(item)}
                  className="mt-0.5 w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300 shrink-0"
                />
                <span className="leading-snug">{item}</span>
              </label>
            ))}

            {/* Yang lain: */}
            <div className="flex items-center gap-3 text-sm text-slate-800 pt-1">
              <input
                type="radio"
                name="identifikasiBahaya"
                value="Yang lain"
                checked={identifikasiBahaya === "Yang lain"}
                onChange={() => setIdentifikasiBahaya("Yang lain")}
                className="w-4 h-4 text-[#673ab7] focus:ring-[#673ab7] border-slate-300"
              />
              <span className="shrink-0">Yang lain:</span>
              <input
                type="text"
                placeholder="Tuliskan temuan lainnya..."
                value={identifikasiBahayaLainnya}
                onChange={(e) => {
                  setIdentifikasiBahaya("Yang lain");
                  setIdentifikasiBahayaLainnya(e.target.value);
                }}
                className="flex-1 text-sm py-1 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* =========================================================
            QUESTION 13: TINDAKAN PERBAIKAN YANG DIPERLUKAN
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <label className="text-sm font-medium text-slate-900 block">
            TINDAKAN PERBAIKAN YANG DIPERLUKAN
          </label>
          <textarea
            rows={3}
            placeholder="Jawaban Anda"
            value={tindakanPerbaikan}
            onChange={(e) => setTindakanPerbaikan(e.target.value)}
            className="w-full text-sm p-2 border-b border-slate-300 focus:border-[#673ab7] focus:outline-hidden transition-colors"
          />
        </div>

        {/* =========================================================
            QUESTION 14: DOKUMENTASI SEBELUM (Cloudinary Upload)
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-900 block">
              DOKUMENTASI SEBELUM
            </label>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Upload 1 file yang didukung. Maks 10 MB (Tersimpan di Cloudinary: bdp-reportapp/hse-folder)
            </span>
          </div>

          {dokumentasiSebelum ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={getCloudinaryThumbnail(dokumentasiSebelum, 100, 80)}
                  alt="Dokumentasi Sebelum"
                  className="w-16 h-12 rounded object-cover border border-slate-300 cursor-pointer"
                  onClick={() => setLightboxUrl(dokumentasiSebelum)}
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Foto Temuan Sebelum
                  </span>
                  <a
                    href={dokumentasiSebelum}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#1a73e8] hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink size={10} /> Lihat foto di Cloudinary
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDokumentasiSebelum("");
                  setDokumentasiSebelumPublicId("");
                }}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                title="Hapus foto"
              >
                <Trash2 size={16} />
              </button>
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
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-[#1a73e8] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isUploadingSebelum ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#1a73e8]" />
                    <span>Mengupload ke Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Tambahkan file</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* =========================================================
            QUESTION 15: DOKUMENTASI SESUDAH (Cloudinary Upload)
        ========================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-900 block">
              DOKUMENTASI SESUDAH
            </label>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Upload 1 file yang didukung. Maks 10 MB (Tersimpan di Cloudinary: bdp-reportapp/hse-folder)
            </span>
          </div>

          {dokumentasiSesudah ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={getCloudinaryThumbnail(dokumentasiSesudah, 100, 80)}
                  alt="Dokumentasi Sesudah"
                  className="w-16 h-12 rounded object-cover border border-slate-300 cursor-pointer"
                  onClick={() => setLightboxUrl(dokumentasiSesudah)}
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Foto Bukti Sesudah
                  </span>
                  <a
                    href={dokumentasiSesudah}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#1a73e8] hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink size={10} /> Lihat foto di Cloudinary
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDokumentasiSesudah("");
                  setDokumentasiSesudahPublicId("");
                }}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                title="Hapus foto"
              >
                <Trash2 size={16} />
              </button>
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
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-[#1a73e8] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isUploadingSesudah ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#1a73e8]" />
                    <span>Mengupload ke Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Tambahkan file</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* =========================================================
            BOTTOM ACTIONS (Google Form Style)
        ========================================================== */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={isSubmitting || isUploadingSebelum || isUploadingSesudah}
            className="px-6 py-2.5 rounded-lg bg-[#673ab7] hover:bg-[#5b32a3] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <span>Kirim</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleClearForm}
            className="text-xs font-semibold text-[#1a73e8] hover:bg-white/60 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Kosongkan formulir
          </button>
        </div>
      </form>

      {/* Lightbox Preview */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Pratinjau Foto Cloudinary</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black">
              <img
                src={getCloudinaryFullPreview(lightboxUrl)}
                alt="Dokumentasi Full"
                className="max-h-[75vh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
