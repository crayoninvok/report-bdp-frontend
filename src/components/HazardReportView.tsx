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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import {
  KTA_ITEMS,
  TTA_ITEMS,
  DEPARTEMEN_OPTIONS,
  JABATAN_OPTIONS,
} from "./HazardReportFormPage";
import {
  manpowerService,
  MasterManpowerItem,
  mapOrganizationToDept,
  mapJobPositionToJabatan,
} from "../services/manpowerService";

// Predefined Choices from BDP Hazard Report Google Form
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

const PJ_OPTIONS = [
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

function getPaginationItems(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

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

  // Filters aligned with Google Form
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // "ALL" | "OPEN" | "CLOSE"
  const [jenisFilter, setJenisFilter] = useState<string>("ALL"); // "ALL" | "KTA" | "TTA"
  const [lokasiFilter, setLokasiFilter] = useState<string>("ALL");
  const [pjFilter, setPjFilter] = useState<string>("ALL");

  // Pagination (default 15 rows)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

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

  // Master Manpower Auto-complete (Muara Pahu & Senyiur Exist)
  const [manpowerList, setManpowerList] = useState<MasterManpowerItem[]>([]);
  const [loadingManpower, setLoadingManpower] = useState<boolean>(false);
  const [isModalManpowerOpen, setIsModalManpowerOpen] = useState<boolean>(false);
  const [modalManpowerQuery, setModalManpowerQuery] = useState<string>("");
  const modalManpowerRef = useRef<HTMLDivElement>(null);

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
        console.warn("Gagal memuat master manpower:", err);
      } finally {
        if (!isCancelled) setLoadingManpower(false);
      }
    };
    fetchManpower();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Click outside to close modal manpower dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modalManpowerRef.current &&
        !modalManpowerRef.current.contains(e.target as Node)
      ) {
        setIsModalManpowerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered Manpower for modal
  const filteredModalManpower = useMemo(() => {
    if (!modalManpowerQuery.trim()) {
      return manpowerList.slice(0, 30);
    }
    const q = modalManpowerQuery.toLowerCase();
    return manpowerList.filter((m) => {
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchNrp = (m.employeeId || "").toLowerCase().includes(q);
      const matchDept = (m.organization || "").toLowerCase().includes(q);
      const matchPos = (m.jobPosition || "").toLowerCase().includes(q);
      return matchName || matchNrp || matchDept || matchPos;
    });
  }, [manpowerList, modalManpowerQuery]);

  const handleSelectModalManpower = (m: MasterManpowerItem) => {
    const mappedDept = mapOrganizationToDept(m.organization);
    const mappedJabatan = mapJobPositionToJabatan(m.jobPosition);
    setFormData((prev) => ({
      ...prev,
      namaPelapor: m.fullName,
      reporterName: m.fullName,
      nrpPelapor: m.employeeId || m.nik || "",
      departemenPelapor: mappedDept,
      reporterDept: mappedDept,
      jabatanPelapor: mappedJabatan,
    }));
    setIsModalManpowerOpen(false);
    setModalManpowerQuery("");
    showSuccess(`Data ${m.fullName} dipilih. NRP (${m.employeeId}) & Departemen (${mappedDept}) terisi otomatis.`);
  };

  // Form State (Exact Google Form Fields & Compatibility)
  const [isCustomIdentifikasi, setIsCustomIdentifikasi] = useState(false);
  const [customIdentifikasiText, setCustomIdentifikasiText] = useState("");
  const [isCustomLokasi, setIsCustomLokasi] = useState(false);
  const [customLokasiText, setCustomLokasiText] = useState("");
  const [formData, setFormData] = useState({
    jenisPelaporan: "KTA" as "KTA" | "TTA",
    namaPelapor: user?.namaLengkap || user?.username || "",
    nrpPelapor: user?.nik || "",
    tanggalPelaporan: new Date().toISOString().slice(0, 10),
    departemenPelapor: "PLANT",
    jabatanPelapor: "WORKER",
    lokasiBahaya: "WORKSHOP",
    penanggungJawabArea: "PLANT",
    identifikasiBahaya: "",
    rincianBahaya: "",
    tindakanPerbaikan: "",
    statusGForm: "OPEN" as "OPEN" | "CLOSE",
    project: (user?.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU") as "MUARA PAHU" | "SENYIUR",
    dokumentasiSebelum: "",
    dokumentasiSesudah: "",

    // Compatibility
    jobSite: (user?.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu") as "MuaraPahu" | "Senyiur",
    date: new Date().toISOString().slice(0, 10),
    time: "08:30",
    location: "WORKSHOP",
    category: "Unsafe Condition" as HazardCategory,
    riskLevel: "Medium" as HazardRiskLevel,
    title: "",
    description: "",
    immediateAction: "",
    correctiveAction: "",
    reporterName: user?.namaLengkap || user?.username || "Safety Patrol",
    reporterDept: "PLANT",
    picName: "PLANT",
    picDept: "PLANT",
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

  // Filtered List (Exact Google Form Fields)
  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      // Status Filter: "ALL" | "OPEN" | "CLOSE"
      const statusG = (h.statusGForm || (h.status === "Closed" ? "CLOSE" : "OPEN")).toUpperCase();
      if (statusFilter !== "ALL" && statusG !== statusFilter.toUpperCase()) return false;

      // Jenis Pelaporan Filter: "ALL" | "KTA" | "TTA"
      const jenis = (h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA")).toUpperCase();
      if (jenisFilter !== "ALL" && jenis !== jenisFilter.toUpperCase()) return false;

      // Lokasi Bahaya Filter
      const lokasi = (h.lokasiBahaya || h.location || "").toUpperCase();
      if (lokasiFilter !== "ALL" && lokasi !== lokasiFilter.toUpperCase()) return false;

      // Penanggung Jawab Area Filter
      const pj = (h.penanggungJawabArea || h.picDept || h.picName || "").toUpperCase();
      if (pjFilter !== "ALL" && pj !== pjFilter.toUpperCase()) return false;

      // Fulltext Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mNum = (h.reportNumber || "").toLowerCase().includes(q);
        const mNama = (h.namaPelapor || h.reporterName || "").toLowerCase().includes(q);
        const mNrp = (h.nrpPelapor || "").toLowerCase().includes(q);
        const mIdent = (h.identifikasiBahaya || h.title || "").toLowerCase().includes(q);
        const mRincian = (h.rincianBahaya || h.description || "").toLowerCase().includes(q);
        const mLok = (h.lokasiBahaya || h.location || "").toLowerCase().includes(q);
        const mPj = (h.penanggungJawabArea || h.picDept || h.picName || "").toLowerCase().includes(q);
        const mTind = (h.tindakanPerbaikan || h.correctiveAction || "").toLowerCase().includes(q);
        if (!mNum && !mNama && !mNrp && !mIdent && !mRincian && !mLok && !mPj && !mTind) return false;
      }
      return true;
    });
  }, [hazards, statusFilter, jenisFilter, lokasiFilter, pjFilter, searchQuery]);

  // Pagination Calculations
  const totalRecords = filteredHazards.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const effectiveCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedHazards = useMemo(() => {
    const start = (effectiveCurrentPage - 1) * pageSize;
    return filteredHazards.slice(start, start + pageSize);
  }, [filteredHazards, effectiveCurrentPage, pageSize]);

  // Reset pagination to page 1 whenever any filter, search query, site or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, jenisFilter, lokasiFilter, pjFilter, selectedSite, pageSize]);

  // Statistics aligned with Google Form
  const stats = useMemo(() => {
    const total = hazards.length;
    const open = hazards.filter(
      (h) => (h.statusGForm || (h.status === "Closed" ? "CLOSE" : "OPEN")) === "OPEN"
    ).length;
    const closed = hazards.filter(
      (h) => (h.statusGForm || (h.status === "Closed" ? "CLOSE" : "OPEN")) === "CLOSE"
    ).length;
    const kta = hazards.filter(
      (h) => (h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA")) === "KTA"
    ).length;
    const tta = hazards.filter(
      (h) => (h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA")) === "TTA"
    ).length;
    const withPhoto = hazards.filter(
      (h) => Boolean(h.dokumentasiSebelum || h.photoUrl || h.dokumentasiSesudah || h.evidenceUrl)
    ).length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 100;
    return { total, open, closed, kta, tta, withPhoto, resolutionRate };
  }, [hazards]);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setIsCustomIdentifikasi(false);
    setCustomIdentifikasiText("");
    setIsCustomLokasi(false);
    setCustomLokasiText("");
    setItemToEdit(null);
    setFormData({
      jenisPelaporan: "KTA",
      namaPelapor: user?.namaLengkap || user?.username || "",
      nrpPelapor: user?.nik || "",
      tanggalPelaporan: new Date().toISOString().slice(0, 10),
      departemenPelapor: "PLANT",
      jabatanPelapor: "WORKER",
      lokasiBahaya: "WORKSHOP",
      penanggungJawabArea: "PLANT",
      identifikasiBahaya: KTA_ITEMS[0],
      rincianBahaya: "",
      tindakanPerbaikan: "",
      statusGForm: "OPEN",
      project: (selectedSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU") as "MUARA PAHU" | "SENYIUR",
      dokumentasiSebelum: "",
      dokumentasiSesudah: "",

      jobSite: (selectedSite === "Senyiur" ? "Senyiur" : "MuaraPahu") as "MuaraPahu" | "Senyiur",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      location: "WORKSHOP",
      category: "Unsafe Condition",
      riskLevel: "Medium",
      title: KTA_ITEMS[0],
      description: "",
      immediateAction: "",
      correctiveAction: "",
      reporterName: user?.namaLengkap || user?.username || "Safety Patrol",
      reporterDept: "PLANT",
      picName: "PLANT",
      picDept: "PLANT",
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
    const isClose = item.statusGForm === "CLOSE" || item.status === "Closed";
    const currentJenis = item.jenisPelaporan || (item.category === "Unsafe Action" ? "TTA" : "KTA");
    const currentList = currentJenis === "KTA" ? KTA_ITEMS : TTA_ITEMS;
    const rawIdent = item.identifikasiBahaya || item.title || "";
    const inList = currentList.includes(rawIdent as any);

    if (!inList && rawIdent) {
      setIsCustomIdentifikasi(true);
      setCustomIdentifikasiText(rawIdent);
    } else {
      setIsCustomIdentifikasi(false);
      setCustomIdentifikasiText("");
    }

    const rawLokasi = item.lokasiBahaya || item.location || "WORKSHOP";
    const inLokasiList = LOKASI_OPTIONS.includes(rawLokasi as any);
    if (!inLokasiList && rawLokasi) {
      setIsCustomLokasi(true);
      setCustomLokasiText(rawLokasi);
    } else {
      setIsCustomLokasi(false);
      setCustomLokasiText("");
    }

    const rawJabatan = (item.jabatanPelapor || "WORKER").toUpperCase();
    const matchedJabatan = JABATAN_OPTIONS.find((j) => j === rawJabatan) || item.jabatanPelapor || "WORKER";
    const rawDept = (item.departemenPelapor || item.reporterDept || "PLANT").toUpperCase();
    const matchedDept = DEPARTEMEN_OPTIONS.find((d) => d === rawDept) || item.departemenPelapor || "PLANT";

    setIsModalManpowerOpen(false);
    setModalManpowerQuery("");

    setFormData({
      jenisPelaporan: currentJenis,
      namaPelapor: item.namaPelapor || item.reporterName || "",
      nrpPelapor: item.nrpPelapor || "",
      tanggalPelaporan: item.tanggalPelaporan || item.date || new Date().toISOString().slice(0, 10),
      departemenPelapor: matchedDept,
      jabatanPelapor: matchedJabatan,
      lokasiBahaya: item.lokasiBahaya || item.location || "WORKSHOP",
      penanggungJawabArea: item.penanggungJawabArea || item.picDept || item.picName || "PLANT",
      identifikasiBahaya: rawIdent,
      rincianBahaya: item.rincianBahaya || item.description || "",
      tindakanPerbaikan: item.tindakanPerbaikan || item.correctiveAction || "",
      statusGForm: isClose ? "CLOSE" : "OPEN",
      project: (item.project || (item.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU")) as "MUARA PAHU" | "SENYIUR",
      dokumentasiSebelum: item.dokumentasiSebelum || item.photoUrl || "",
      dokumentasiSesudah: item.dokumentasiSesudah || item.evidenceUrl || "",

      jobSite: item.jobSite,
      date: item.date,
      time: item.time,
      location: item.lokasiBahaya || item.location,
      category: item.category,
      riskLevel: item.riskLevel,
      title: item.identifikasiBahaya || item.title,
      description: item.rincianBahaya || item.description,
      immediateAction: item.immediateAction,
      correctiveAction: item.tindakanPerbaikan || item.correctiveAction,
      reporterName: item.namaPelapor || item.reporterName,
      reporterDept: item.departemenPelapor || item.reporterDept,
      picName: item.penanggungJawabArea || item.picName,
      picDept: item.penanggungJawabArea || item.picDept,
      dueDate: item.dueDate,
      status: item.status,
      photoUrl: item.dokumentasiSebelum || item.photoUrl || "",
      photoPublicId: item.photoPublicId || "",
      evidenceUrl: item.dokumentasiSesudah || item.evidenceUrl || "",
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
            dokumentasiSebelum: res.secure_url,
          }));
          showSuccess("Foto bukti temuan berhasil disimpan ke Cloudinary (hse-folder).");
        } else {
          setFormData((prev) => ({
            ...prev,
            evidenceUrl: res.secure_url,
            evidencePublicId: res.public_id || "",
            dokumentasiSesudah: res.secure_url,
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
    const ident = (isCustomIdentifikasi ? customIdentifikasiText : formData.identifikasiBahaya).trim() || formData.title.trim();
    if (!ident) {
      showError("Harap pilih atau tuliskan identifikasi bahaya.");
      return;
    }

    const finalLokasi = (isCustomLokasi ? customLokasiText : formData.lokasiBahaya).trim() || "WORKSHOP";
    if (isCustomLokasi && !customLokasiText.trim()) {
      showError("Harap tuliskan lokasi bahaya.");
      return;
    }

    if (!itemToEdit && !(formData.dokumentasiSebelum || formData.photoUrl)) {
      showError("Dokumentasi Sebelum (Foto Temuan) wajib diisi / diunggah.");
      return;
    }

    try {
      const isClose = formData.statusGForm === "CLOSE";
      const legacyStatus: HazardStatus = isClose ? "Closed" : "Open";
      const payload: Partial<HazardReportItem> = {
        ...formData,
        namaPelapor: itemToEdit
          ? (itemToEdit.namaPelapor || itemToEdit.reporterName || formData.namaPelapor)
          : (formData.namaPelapor || "").trim(),
        reporterName: itemToEdit
          ? (itemToEdit.reporterName || itemToEdit.namaPelapor || formData.namaPelapor)
          : (formData.namaPelapor || "").trim(),
        nrpPelapor: itemToEdit ? (itemToEdit.nrpPelapor || formData.nrpPelapor) : (formData.nrpPelapor || "").trim(),
        departemenPelapor: itemToEdit
          ? (itemToEdit.departemenPelapor || itemToEdit.reporterDept || formData.departemenPelapor)
          : formData.departemenPelapor,
        reporterDept: itemToEdit
          ? (itemToEdit.reporterDept || itemToEdit.departemenPelapor || formData.departemenPelapor)
          : formData.departemenPelapor,
        jabatanPelapor: itemToEdit ? (itemToEdit.jabatanPelapor || formData.jabatanPelapor) : formData.jabatanPelapor,
        identifikasiBahaya: ident,
        title: ident,
        lokasiBahaya: finalLokasi,
        location: finalLokasi,
        description: formData.rincianBahaya || formData.description,
        correctiveAction: formData.tindakanPerbaikan || formData.correctiveAction,
        picName: formData.penanggungJawabArea,
        picDept: formData.penanggungJawabArea,
        status: legacyStatus,
        photoUrl: formData.dokumentasiSebelum || formData.photoUrl,
        evidenceUrl: formData.dokumentasiSesudah || formData.evidenceUrl,
        completionDate: isClose ? new Date().toISOString().slice(0, 10) : undefined,
      };

      if (itemToEdit) {
        await sheService.updateHazard(itemToEdit.id, payload);
        showSuccess(`Hazard ${itemToEdit.reportNumber} berhasil diperbarui.`);
      } else {
        const created = await sheService.createHazard(payload as any);
        showSuccess(`Hazard Report ${created.reportNumber} berhasil dibuat!`);
      }
      setIsFormModalOpen(false);
      loadHazards();
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan hazard report");
    }
  };

  // Quick Status Toggle (OPEN <-> CLOSE)
  const handleQuickGFormStatusChange = async (item: HazardReportItem, nextStatus: "OPEN" | "CLOSE") => {
    try {
      const legacyStatus: HazardStatus = nextStatus === "CLOSE" ? "Closed" : "Open";
      await sheService.updateHazard(item.id, {
        statusGForm: nextStatus,
        status: legacyStatus,
        completionDate: nextStatus === "CLOSE" ? new Date().toISOString().slice(0, 10) : undefined,
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
      message: `Apakah Anda yakin ingin menghapus laporan ${item.reportNumber} (${item.identifikasiBahaya || item.title})? Tindakan ini tidak dapat dibatalkan.`,
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

  // Export Excel (Google Form Format)
  const handleExportExcel = () => {
    if (filteredHazards.length === 0) {
      showError("Tidak ada data hazard untuk diekspor.");
      return;
    }

    const dataRows = filteredHazards.map((h, idx) => ({
      No: idx + 1,
      "No. Laporan": h.reportNumber,
      Project: h.project || (h.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU"),
      "Tanggal Pelaporan": h.tanggalPelaporan || h.date,
      "Jenis Pelaporan": h.jenisPelaporan || (h.category === "Unsafe Action" ? "TTA" : "KTA"),
      "Lokasi Bahaya": h.lokasiBahaya || h.location,
      "Identifikasi Bahaya": h.identifikasiBahaya || h.title,
      "Rincian Bahaya": h.rincianBahaya || h.description || "-",
      "Nama Pelapor": h.namaPelapor || h.reporterName,
      "NRP Pelapor": h.nrpPelapor || "-",
      "Departemen Pelapor": h.departemenPelapor || h.reporterDept,
      "Jabatan Pelapor": h.jabatanPelapor || "-",
      "Penanggung Jawab Area": h.penanggungJawabArea || h.picDept || h.picName || "PLANT",
      "Tindakan Perbaikan": h.tindakanPerbaikan || h.correctiveAction || "-",
      Status: h.statusGForm || (h.status === "Closed" ? "CLOSE" : "OPEN"),
      "Dokumentasi Sebelum (Foto Temuan)": h.dokumentasiSebelum || h.photoUrl || "-",
      "Dokumentasi Sesudah (Foto Selesai)": h.dokumentasiSesudah || h.evidenceUrl || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hazard Reports");
    XLSX.writeFile(
      workbook,
      `BDP_Hazard_Report_${selectedSite}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showSuccess("Laporan Hazard Report berhasil diekspor ke Excel!");
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 min-w-0 animate-in fade-in duration-300">
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
          Summary KPI Cards (Exact Google Form Metrics)
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Hazard */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Hazard</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-400">Laporan</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Site {selectedSite}</span>
        </div>

        {/* Status OPEN */}
        <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs p-4 flex flex-col justify-between bg-linear-to-br from-rose-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-rose-600">Open (Belum Selesai)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-700">{stats.open}</span>
            <span className="text-xs font-semibold text-rose-500">Laporan</span>
          </div>
          <span className="text-[10px] text-rose-500 mt-1">Perlu Tindakan Koreksi</span>
        </div>

        {/* Status CLOSE */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-2xs p-4 flex flex-col justify-between bg-linear-to-br from-emerald-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-emerald-600">Close (Selesai)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{stats.closed}</span>
            <span className="text-xs font-semibold text-emerald-500">Laporan</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">
            {stats.resolutionRate}% Tingkat Selesai
          </span>
        </div>

        {/* Kondisi Tidak Aman (KTA) */}
        <div className="bg-white rounded-2xl border border-orange-200/80 shadow-2xs p-4 flex flex-col justify-between bg-linear-to-br from-orange-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-orange-600">KTA (Kondisi Bahaya)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-orange-700">{stats.kta}</span>
            <span className="text-xs font-semibold text-orange-500">Temuan</span>
          </div>
          <span className="text-[10px] text-orange-500 mt-1">Fasilitas / Lingkungan</span>
        </div>

        {/* Tindakan Tidak Aman (TTA) */}
        <div className="bg-white rounded-2xl border border-purple-200/80 shadow-2xs p-4 flex flex-col justify-between bg-linear-to-br from-purple-50/40 to-transparent">
          <span className="text-[10px] font-bold uppercase text-purple-600">TTA (Tindakan Bahaya)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-purple-700">{stats.tta}</span>
            <span className="text-xs font-semibold text-purple-500">Temuan</span>
          </div>
          <span className="text-[10px] text-purple-500 mt-1">Perilaku / Prosedur</span>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Filter & Search Toolbar (Exact Form Fields)
      ---------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari hazard (e.g. HZ-MP-001), pelapor, NRP, rincian..."
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
                { id: "OPEN", label: "OPEN" },
                { id: "CLOSE", label: "CLOSE" },
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

            {/* Jenis Pelaporan Filter */}
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Jenis (KTA &amp; TTA)</option>
              <option value="KTA">Kondisi Tidak Aman (KTA)</option>
              <option value="TTA">Tindakan Tidak Aman (TTA)</option>
            </select>

            {/* Lokasi Bahaya Filter */}
            <select
              value={lokasiFilter}
              onChange={(e) => setLokasiFilter(e.target.value)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Lokasi Bahaya</option>
              {LOKASI_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Penanggung Jawab Area Filter */}
            <select
              value={pjFilter}
              onChange={(e) => setPjFilter(e.target.value)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Penanggung Jawab (PJ)</option>
              {PJ_OPTIONS.map((pj) => (
                <option key={pj} value={pj}>
                  {pj}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadHazards}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Counter Results & Page Size Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{" "}
              <strong className="text-slate-800 font-mono">
                {totalRecords === 0
                  ? 0
                  : `${(effectiveCurrentPage - 1) * pageSize + 1} - ${Math.min(
                      effectiveCurrentPage * pageSize,
                      totalRecords
                    )}`}
              </strong>{" "}
              dari{" "}
              <strong className="text-slate-800 font-mono">
                {totalRecords.toLocaleString("id-ID")}
              </strong>{" "}
              laporan{" "}
              {totalRecords !== hazards.length && (
                <span className="text-slate-400">
                  (difilter dari {hazards.length.toLocaleString("id-ID")})
                </span>
              )}
            </span>
            {(statusFilter !== "ALL" || jenisFilter !== "ALL" || lokasiFilter !== "ALL" || pjFilter !== "ALL" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setJenisFilter("ALL");
                  setLokasiFilter("ALL");
                  setPjFilter("ALL");
                  setSearchQuery("");
                }}
                className="text-[11px] font-bold text-[#e95623] hover:underline cursor-pointer ml-1"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400">Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer shadow-2xs"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* ---------------------------------------------------------
            Main Data Table (Exact Google Form Columns)
        ---------------------------------------------------------- */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-32">No. Hazard</th>
                <th className="py-3 px-3 w-28">Tgl &amp; Waktu</th>
                <th className="py-3 px-3 w-24 text-center">Jenis</th>
                <th className="py-3 px-3 w-32">Lokasi Bahaya</th>
                <th className="py-3 px-3 min-w-64">Identifikasi &amp; Rincian Bahaya</th>
                <th className="py-3 px-3 w-40">Pelapor</th>
                <th className="py-3 px-3 w-32">Penanggung Jawab Area</th>
                <th className="py-3 px-3 min-w-44">Tindakan Perbaikan</th>
                <th className="py-3 px-3 w-28 text-center">Foto Bukti</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
                <th className="py-3 px-3 w-20 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedHazards.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Tidak ada data hazard report yang sesuai filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedHazards.map((item, idx) => {
                  const isKta = (item.jenisPelaporan || (item.category === "Unsafe Action" ? "TTA" : "KTA")) === "KTA";
                  const isClose = item.statusGForm === "CLOSE" || item.status === "Closed";
                  const rowNumber = (effectiveCurrentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{rowNumber}</td>
                      <td className="py-3 px-3">
                        <span className="font-black text-slate-900 block">{item.reportNumber}</span>
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          Project: {item.project || (item.jobSite === "Senyiur" ? "SENYIUR" : "MUARA PAHU")}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                        <div className="font-semibold">{item.tanggalPelaporan || item.date}</div>
                        <div className="text-[10px] text-slate-400">{item.time || "08:00"} WIB</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isKta ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-[#e95623] border border-orange-200">
                            KTA
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            TTA
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div className="flex items-start gap-1">
                          <MapPin size={12} className="text-[#e95623] shrink-0 mt-0.5" />
                          <span className="text-xs font-bold text-slate-900">{item.lokasiBahaya || item.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 block leading-snug mb-1 text-xs">
                          {item.identifikasiBahaya || item.title}
                        </span>
                        {(item.rincianBahaya || item.description) && (
                          <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
                            {item.rincianBahaya || item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block text-xs">
                          {item.namaPelapor || item.reporterName}
                        </span>
                        {item.nrpPelapor && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            NRP: {item.nrpPelapor}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-500 block">
                          {item.departemenPelapor || item.reporterDept} &bull; {item.jabatanPelapor || "Worker"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-[11px]">
                          <Building2 size={11} className="text-slate-500" />
                          <span>{item.penanggungJawabArea || item.picDept || item.picName || "PLANT"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 text-[11px] leading-relaxed">
                        <span className="line-clamp-3">{item.tindakanPerbaikan || item.correctiveAction || "-"}</span>
                      </td>

                      {/* Foto Bukti Column (Cloudinary Pre & Post) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Foto Sebelum */}
                          {(item.dokumentasiSebelum || item.photoUrl) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(item.dokumentasiSebelum || item.photoUrl || null);
                                setLightboxTitle(`Foto Sebelum (Temuan) • ${item.reportNumber}`);
                              }}
                              className="relative group block w-10 h-10 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-[#e95623] transition-all cursor-pointer shadow-2xs"
                              title="Lihat Foto Sebelum (Temuan)"
                            >
                              <img
                                src={getCloudinaryThumbnail(item.dokumentasiSebelum || item.photoUrl || "", 80, 80)}
                                alt="Sebelum"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                loading="lazy"
                              />
                              <span className="absolute bottom-0 left-0 bg-slate-900/80 text-white text-[7px] font-black px-1 rounded-tr">
                                PRE
                              </span>
                            </button>
                          ) : (
                            <span
                              className="w-10 h-10 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[8px] font-bold"
                              title="Belum ada foto temuan"
                            >
                              No Foto
                            </span>
                          )}

                          {/* Foto Sesudah */}
                          {(item.dokumentasiSesudah || item.evidenceUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(item.dokumentasiSesudah || item.evidenceUrl || null);
                                setLightboxTitle(`Foto Sesudah (Perbaikan) • ${item.reportNumber}`);
                              }}
                              className="relative group block w-10 h-10 rounded-xl overflow-hidden border border-emerald-300 hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer shadow-2xs"
                              title="Lihat Foto Sesudah (Penyelesaian)"
                            >
                              <img
                                src={getCloudinaryThumbnail(item.dokumentasiSesudah || item.evidenceUrl || "", 80, 80)}
                                alt="Sesudah"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                loading="lazy"
                              />
                              <span className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[7px] font-black px-1 rounded-tl">
                                POST
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status OPEN / CLOSE */}
                      <td className="py-3 px-3 text-center">
                        <div className="space-y-1">
                          {isClose ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              CLOSE
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                              OPEN
                            </span>
                          )}
                          <select
                            value={isClose ? "CLOSE" : "OPEN"}
                            onChange={(e) => handleQuickGFormStatusChange(item, e.target.value as "OPEN" | "CLOSE")}
                            className="block w-full text-[10px] font-bold py-0.5 px-1 bg-white border border-slate-200 rounded text-slate-700 focus:outline-hidden cursor-pointer"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSE">CLOSE</option>
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
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="Edit Laporan"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/70 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 mt-2">
            <div className="flex items-center gap-3">
              <span>
                Halaman <strong className="text-slate-900 font-bold">{effectiveCurrentPage}</strong> dari{" "}
                <strong className="text-slate-900 font-bold">{totalPages}</strong>{" "}
                <span className="text-slate-400">({totalRecords.toLocaleString("id-ID")} total laporan)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={effectiveCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={15} />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={effectiveCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              {/* Numeric Page Buttons with Smart Ellipsis */}
              <div className="flex items-center gap-1">
                {getPaginationItems(effectiveCurrentPage, totalPages).map((p, i) => {
                  if (p === "...") {
                    return (
                      <span
                        key={`dots-${i}`}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold"
                      >
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(p);
                  const isActive = pageNum === effectiveCurrentPage;

                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        isActive
                          ? "bg-[#e95623] text-white shadow-xs font-black"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={effectiveCurrentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={effectiveCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={15} />
              </button>

              {/* Quick Jump Input */}
              {totalPages > 5 && (
                <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-200 ml-1 text-slate-400">
                  <span>Ke:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    defaultValue={effectiveCurrentPage}
                    key={effectiveCurrentPage}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Number((e.target as HTMLInputElement).value);
                        if (val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= totalPages && val !== effectiveCurrentPage) {
                        setCurrentPage(val);
                      }
                    }}
                    className="w-12 px-1.5 py-1 text-center bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:outline-hidden focus:border-[#e95623]"
                  />
                </div>
              )}
            </div>
          </div>
        )}
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
              {/* Project & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Project Site <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        project: e.target.value as any,
                        jobSite: e.target.value === "SENYIUR" ? "Senyiur" : "MuaraPahu",
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  >
                    <option value="MUARA PAHU">MUARA PAHU</option>
                    <option value="SENYIUR">SENYIUR</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Pelaporan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalPelaporan}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggalPelaporan: e.target.value, date: e.target.value })
                    }
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Status Laporan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.statusGForm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statusGForm: e.target.value as "OPEN" | "CLOSE",
                        status: e.target.value === "CLOSE" ? "Closed" : "Open",
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  >
                    <option value="OPEN">OPEN (Belum Selesai)</option>
                    <option value="CLOSE">CLOSE (Selesai)</option>
                  </select>
                </div>
              </div>

              {/* Jenis & Lokasi & PJ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Jenis Pelaporan Bahaya <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.jenisPelaporan}
                    onChange={(e) => {
                      const nextJenis = e.target.value as "KTA" | "TTA";
                      const nextList = nextJenis === "KTA" ? KTA_ITEMS : TTA_ITEMS;
                      setIsCustomIdentifikasi(false);
                      setCustomIdentifikasiText("");
                      setFormData({
                        ...formData,
                        jenisPelaporan: nextJenis,
                        category: nextJenis === "KTA" ? "Unsafe Condition" : "Unsafe Action",
                        identifikasiBahaya: nextList[0],
                        title: nextList[0],
                      });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  >
                    <option value="KTA">KTA (Kondisi Tidak Aman)</option>
                    <option value="TTA">TTA (Tindakan Tidak Aman)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lokasi Bahaya <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={isCustomLokasi ? "Lainnya" : formData.lokasiBahaya}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Lainnya") {
                        setIsCustomLokasi(true);
                        const fallback = customLokasiText.trim();
                        setFormData({
                          ...formData,
                          lokasiBahaya: fallback,
                          location: fallback,
                        });
                      } else {
                        setIsCustomLokasi(false);
                        setFormData({
                          ...formData,
                          lokasiBahaya: val,
                          location: val,
                        });
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 cursor-pointer"
                  >
                    {LOKASI_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="Lainnya">Lainnya : (diisi sendiri)...</option>
                  </select>

                  {/* Input Teks Tambahan Jika Memilih 'Lainnya' */}
                  {isCustomLokasi && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Tuliskan lokasi lainnya..."
                        value={customLokasiText}
                        onChange={(e) => {
                          const txt = e.target.value;
                          setCustomLokasiText(txt);
                          setFormData({
                            ...formData,
                            lokasiBahaya: txt,
                            location: txt,
                          });
                        }}
                        required
                        className="w-full text-xs px-3 py-2 rounded-xl border border-orange-300 font-semibold bg-orange-50/40 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Penanggung Jawab Area (PJ) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.penanggungJawabArea}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        penanggungJawabArea: e.target.value,
                        picName: e.target.value,
                        picDept: e.target.value,
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  >
                    {PJ_OPTIONS.map((pj) => (
                      <option key={pj} value={pj}>
                        {pj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Identifikasi Bahaya (Dropdown Choices based on KTA / TTA) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Identifikasi Bahaya ({formData.jenisPelaporan}) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {formData.jenisPelaporan === "KTA" ? "26 Pilihan KTA (Google Form)" : "16 Pilihan TTA"}
                  </span>
                </div>
                <select
                  value={isCustomIdentifikasi ? "Yang lain" : formData.identifikasiBahaya}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Yang lain") {
                      setIsCustomIdentifikasi(true);
                      const fallback = customIdentifikasiText.trim();
                      setFormData({
                        ...formData,
                        identifikasiBahaya: fallback,
                        title: fallback,
                      });
                    } else {
                      setIsCustomIdentifikasi(false);
                      setFormData({
                        ...formData,
                        identifikasiBahaya: val,
                        title: val,
                      });
                    }
                  }}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Identifikasi Bahaya --</option>
                  {(formData.jenisPelaporan === "KTA" ? KTA_ITEMS : TTA_ITEMS).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="Yang lain">Yang lain (Tulis Manual / Kustom)...</option>
                </select>

                {/* Input Teks Tambahan Jika Memilih 'Yang lain' */}
                {isCustomIdentifikasi && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Tuliskan temuan identifikasi bahaya lainnya..."
                      value={customIdentifikasiText}
                      onChange={(e) => {
                        const txt = e.target.value;
                        setCustomIdentifikasiText(txt);
                        setFormData({
                          ...formData,
                          identifikasiBahaya: txt,
                          title: txt,
                        });
                      }}
                      required
                      className="w-full text-xs px-3 py-2 rounded-xl border border-orange-300 font-semibold bg-orange-50/40 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      *Tuliskan identifikasi bahaya spesifik jika tidak tersedia pada pilihan standar di atas.
                    </span>
                  </div>
                )}
              </div>

              {/* Rincian Bahaya */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Rincian Identifikasi Bahaya
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan secara rinci kondisi atau tindakan yang ditemukan serta potensi dampaknya..."
                  value={formData.rincianBahaya || formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, rincianBahaya: e.target.value, description: e.target.value })
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 leading-relaxed font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              {/* Tindakan Perbaikan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tindakan Perbaikan Yang Diperlukan
                </label>
                <textarea
                  rows={3}
                  placeholder="Rekomendasi perbaikan atau tindakan koreksi yang harus dilakukan..."
                  value={formData.tindakanPerbaikan || formData.correctiveAction}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tindakanPerbaikan: e.target.value,
                      correctiveAction: e.target.value,
                    })
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 leading-relaxed font-medium focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
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
                    {/* Always rendered hidden file input so Ganti Foto always works */}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "photo")}
                    />

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1">
                        1. Dokumentasi Sebelum (Foto Temuan) <span className="text-rose-500 font-bold">*</span>
                      </span>
                      {(formData.dokumentasiSebelum || formData.photoUrl) && (
                        <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Cloudinary OK
                        </span>
                      )}
                    </div>

                    {(formData.dokumentasiSebelum || formData.photoUrl) ? (
                      <div className="space-y-2">
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-100 flex items-center justify-center">
                          <img
                            src={getCloudinaryThumbnail(formData.dokumentasiSebelum || formData.photoUrl, 400, 300)}
                            alt="Bukti Temuan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(formData.dokumentasiSebelum || formData.photoUrl);
                                setLightboxTitle("Pratinjau Foto Temuan");
                              }}
                              className="px-2 py-1 rounded bg-white text-slate-800 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                            >
                              <ZoomIn size={11} /> Lihat
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  dokumentasiSebelum: "",
                                  photoUrl: "",
                                  photoPublicId: "",
                                })
                              }
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-rose-700 cursor-pointer"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          className="w-full py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 size={12} className="text-[#e95623] animate-spin" />
                              <span>Mengunggah foto baru...</span>
                            </>
                          ) : (
                            <>
                              <Pencil size={10} /> Ganti Foto Temuan
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div>
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
                    {/* Always rendered hidden file input so Ganti Foto always works */}
                    <input
                      ref={evidenceInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "evidence")}
                    />

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-slate-600 block">
                        2. Dokumentasi Sesudah (Foto Selesai)
                      </span>
                      {(formData.dokumentasiSesudah || formData.evidenceUrl) && (
                        <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Cloudinary OK
                        </span>
                      )}
                    </div>

                    {(formData.dokumentasiSesudah || formData.evidenceUrl) ? (
                      <div className="space-y-2">
                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-100 flex items-center justify-center">
                          <img
                            src={getCloudinaryThumbnail(formData.dokumentasiSesudah || formData.evidenceUrl, 400, 300)}
                            alt="Bukti Perbaikan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxUrl(formData.dokumentasiSesudah || formData.evidenceUrl);
                                setLightboxTitle("Pratinjau Foto Perbaikan");
                              }}
                              className="px-2 py-1 rounded bg-white text-slate-800 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                            >
                              <ZoomIn size={11} /> Lihat
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  dokumentasiSesudah: "",
                                  evidenceUrl: "",
                                  evidencePublicId: "",
                                })
                              }
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-rose-700 cursor-pointer"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isUploadingEvidence}
                          onClick={() => evidenceInputRef.current?.click()}
                          className="w-full py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          {isUploadingEvidence ? (
                            <>
                              <Loader2 size={12} className="text-emerald-600 animate-spin" />
                              <span>Mengunggah foto baru...</span>
                            </>
                          ) : (
                            <>
                              <Pencil size={10} /> Ganti Foto Perbaikan
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div>
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

              {/* Identitas Pelapor (Exact GForm Fields) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                    Identitas Pelapor
                    {itemToEdit && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Lock size={9} /> Terkunci (Tidak dapat diubah saat edit)
                      </span>
                    )}
                  </span>
                  {!itemToEdit && (
                    <span className="text-[9px] text-slate-400">
                      {loadingManpower ? "..." : `${manpowerList.length} MP/SY`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {itemToEdit ? (
                    /* Read-Only Nama Pelapor on Edit */
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nama Pelapor</label>
                      <input
                        type="text"
                        value={formData.namaPelapor}
                        readOnly
                        disabled
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-bold cursor-not-allowed select-none"
                      />
                    </div>
                  ) : (
                    /* Searchable Combobox on Create */
                    <div className="relative" ref={modalManpowerRef}>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-bold text-slate-500">Nama Pelapor</label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ketik cari nama..."
                          value={formData.namaPelapor}
                          onFocus={() => {
                            setModalManpowerQuery(formData.namaPelapor);
                            setIsModalManpowerOpen(true);
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              namaPelapor: val,
                              reporterName: val,
                            }));
                            setModalManpowerQuery(val);
                            setIsModalManpowerOpen(true);
                          }}
                          autoComplete="off"
                          className="w-full text-xs px-2.5 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                        />
                        {formData.namaPelapor && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                namaPelapor: "",
                                reporterName: "",
                                nrpPelapor: "",
                              }));
                              setModalManpowerQuery("");
                              setIsModalManpowerOpen(true);
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown suggestions */}
                      {isModalManpowerOpen && (
                        <div className="absolute z-50 left-0 -right-24 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1">
                              <Search size={11} className="text-[#e95623]" />
                              Master Manpower ({filteredModalManpower.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsModalManpowerOpen(false)}
                              className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                            >
                              Tutup
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {filteredModalManpower.length === 0 ? (
                              <div className="p-3 text-center text-slate-400 text-[11px]">
                                Tidak ditemukan. Tekan tutup untuk simpan nama manual.
                              </div>
                            ) : (
                              filteredModalManpower.map((m) => {
                                const isMp = (m.branchName || "").toLowerCase().includes("muara pahu");
                                return (
                                  <div
                                    key={m.id || m.employeeId}
                                    onClick={() => handleSelectModalManpower(m)}
                                    className="p-2 hover:bg-orange-50/70 transition-colors cursor-pointer text-left group"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[11px] font-black text-slate-900 group-hover:text-[#e95623]">
                                        {m.fullName}
                                      </span>
                                      <span
                                        className={`text-[8.5px] font-black px-1 py-0.2 rounded border ${
                                          isMp
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}
                                      >
                                        {m.branchName || "Site"}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                      <span className="font-mono font-bold text-slate-700">NRP: {m.employeeId}</span>
                                      <span>&bull;</span>
                                      <span>Dept: {m.organization}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">NRP Pelapor</label>
                    <input
                      type="text"
                      value={formData.nrpPelapor}
                      readOnly={Boolean(itemToEdit)}
                      disabled={Boolean(itemToEdit)}
                      onChange={(e) => setFormData({ ...formData, nrpPelapor: e.target.value })}
                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg border ${
                        itemToEdit
                          ? "border-slate-200 bg-slate-100 text-slate-600 font-semibold cursor-not-allowed select-none"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Departemen</label>
                    {itemToEdit ? (
                      <input
                        type="text"
                        value={formData.departemenPelapor}
                        readOnly
                        disabled
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-bold cursor-not-allowed select-none"
                      />
                    ) : (
                      <select
                        value={formData.departemenPelapor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            departemenPelapor: e.target.value,
                            reporterDept: e.target.value,
                          })
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                      >
                        {DEPARTEMEN_OPTIONS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        {!DEPARTEMEN_OPTIONS.includes(formData.departemenPelapor as any) && formData.departemenPelapor && (
                          <option value={formData.departemenPelapor}>{formData.departemenPelapor}</option>
                        )}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Jabatan Pelapor</label>
                    {itemToEdit ? (
                      <input
                        type="text"
                        value={formData.jabatanPelapor}
                        readOnly
                        disabled
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-bold cursor-not-allowed select-none"
                      />
                    ) : (
                      <select
                        value={formData.jabatanPelapor}
                        onChange={(e) => setFormData({ ...formData, jabatanPelapor: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                      >
                        {JABATAN_OPTIONS.map((jab) => (
                          <option key={jab} value={jab}>
                            {jab}
                          </option>
                        ))}
                        {!JABATAN_OPTIONS.includes(formData.jabatanPelapor as any) && formData.jabatanPelapor && (
                          <option value={formData.jabatanPelapor}>{formData.jabatanPelapor}</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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
          Modal: Detail View (Exact Google Form Fields)
      ---------------------------------------------------------- */}
      {isDetailModalOpen && detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#e95623] block tracking-wider">
                  Detail Hazard Report &bull; Project: {detailItem.project || detailItem.jobSite}
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
              {/* Status & Jenis */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black ${
                      (detailItem.jenisPelaporan || (detailItem.category === "Unsafe Action" ? "TTA" : "KTA")) === "KTA"
                        ? "bg-orange-100 text-[#e95623] border border-orange-200"
                        : "bg-purple-100 text-purple-800 border border-purple-200"
                    }`}
                  >
                    Jenis: {detailItem.jenisPelaporan || (detailItem.category === "Unsafe Action" ? "TTA" : "KTA")}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black ${
                      detailItem.statusGForm === "CLOSE" || detailItem.status === "Closed"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    Status: {detailItem.statusGForm || (detailItem.status === "Closed" ? "CLOSE" : "OPEN")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] font-bold">Tanggal Pelaporan:</span>
                  <strong className="text-slate-800">
                    {detailItem.tanggalPelaporan || detailItem.date} ({detailItem.time || "08:00"} WIB)
                  </strong>
                </div>
              </div>

              {/* Lokasi & PJ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Lokasi Bahaya</span>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800 flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#e95623]" />
                    <span>{detailItem.lokasiBahaya || detailItem.location}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Penanggung Jawab Area</span>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Building2 size={13} className="text-slate-500" />
                    <span>{detailItem.penanggungJawabArea || detailItem.picDept || detailItem.picName || "PLANT"}</span>
                  </div>
                </div>
              </div>

              {/* Identifikasi Bahaya */}
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Identifikasi Bahaya</span>
                <div className="text-sm font-extrabold text-slate-900 bg-orange-50/40 p-3 rounded-xl border border-orange-200/60">
                  {detailItem.identifikasiBahaya || detailItem.title}
                </div>
              </div>

              {/* Rincian Identifikasi Bahaya */}
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Rincian Bahaya</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                  {detailItem.rincianBahaya || detailItem.description || "-"}
                </p>
              </div>

              {/* Tindakan Perbaikan Yang Diperlukan */}
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">Tindakan Perbaikan Yang Diperlukan</span>
                <p className="text-slate-700 leading-relaxed bg-emerald-50/40 p-3 rounded-xl border border-emerald-200 font-medium">
                  {detailItem.tindakanPerbaikan || detailItem.correctiveAction || "-"}
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
                      1. Dokumentasi Sebelum (Foto Temuan)
                    </span>
                    {(detailItem.dokumentasiSebelum || detailItem.photoUrl) ? (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => {
                            setLightboxUrl(detailItem.dokumentasiSebelum || detailItem.photoUrl || null);
                            setLightboxTitle(`Foto Sebelum • ${detailItem.reportNumber}`);
                          }}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 h-36 bg-slate-900 flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={getCloudinaryThumbnail(detailItem.dokumentasiSebelum || detailItem.photoUrl || "", 400, 300)}
                            alt="Bukti Temuan"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn size={18} />
                          </div>
                        </div>
                        <a
                          href={detailItem.dokumentasiSebelum || detailItem.photoUrl}
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
                      2. Dokumentasi Sesudah (Foto Selesai)
                    </span>
                    {(detailItem.dokumentasiSesudah || detailItem.evidenceUrl) ? (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => {
                            setLightboxUrl(detailItem.dokumentasiSesudah || detailItem.evidenceUrl || null);
                            setLightboxTitle(`Foto Sesudah • ${detailItem.reportNumber}`);
                          }}
                          className="relative group rounded-xl overflow-hidden border border-emerald-300 h-36 bg-slate-900 flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={getCloudinaryThumbnail(detailItem.dokumentasiSesudah || detailItem.evidenceUrl || "", 400, 300)}
                            alt="Bukti Perbaikan"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn size={18} />
                          </div>
                        </div>
                        <a
                          href={detailItem.dokumentasiSesudah || detailItem.evidenceUrl}
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

              {/* Identitas Pelapor */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Pelapor Bahaya</span>
                <div className="font-black text-slate-900 text-xs">
                  {detailItem.namaPelapor || detailItem.reporterName}
                  {detailItem.nrpPelapor && (
                    <span className="text-slate-500 font-mono font-medium ml-1.5">
                      (NRP: {detailItem.nrpPelapor})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Departemen: <strong className="text-slate-700">{detailItem.departemenPelapor || detailItem.reporterDept}</strong> &bull; Jabatan: <strong className="text-slate-700">{detailItem.jabatanPelapor || "-"}</strong>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">
                Status: <strong className={detailItem.statusGForm === "CLOSE" || detailItem.status === "Closed" ? "text-emerald-700" : "text-rose-700"}>
                  {detailItem.statusGForm || (detailItem.status === "Closed" ? "CLOSE" : "OPEN")}
                </strong>
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
