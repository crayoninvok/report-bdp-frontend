"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  plantService,
  MasterUnit,
  DaySchedule,
  WeeklyScheduleData,
  PeriodicInspectionItem,
} from "../services/plantService";
import { useNotification } from "../context/NotificationContext";
import * as XLSX from "xlsx";
import { PeriodicInspectionPdfExportModal } from "./PeriodicInspectionPdfExportModal";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Search,
  Truck,
  Layers,
  Settings,
  RefreshCw,
  Check,
  ArrowRight,
  ShieldCheck,
  FileText,
  ChevronDown,
  X,
  Sliders,
  Sparkles,
  CalendarDays,
  MapPin,
  Lock,
  FileSpreadsheet,
  Download,
  FileDown,
} from "lucide-react";

const INDO_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

function formatIndoDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${INDO_MONTHS[m] || ""} ${y}`;
  } catch {
    return dateStr;
  }
}

interface PeriodicInspectionViewProps {
  user: User;
  onNavigateToMasterUnit?: () => void;
}

export const PeriodicInspectionView: React.FC<PeriodicInspectionViewProps> = ({
  user,
  onNavigateToMasterUnit,
}) => {
  const { showSuccess, showError, confirm } = useNotification();
  const isSuperAdmin = user.role === "SuperAdmin";

  // Navigation & Data state
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Selected site for Periodic Inspection: "MuaraPahu" | "Senyiur"
  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur">(() => {
    return user.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu";
  });

  const [scheduleData, setScheduleData] = useState<WeeklyScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Tabs: "weekly" | "details"
  const [activeTab, setActiveTab] = useState<"weekly" | "details">("weekly");

  // Master Units
  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>([]);
  const [primeMovers, setPrimeMovers] = useState<MasterUnit[]>([]);
  const [masterUnitsLoading, setMasterUnitsLoading] = useState<boolean>(false);

  // Filter & Search states for Detail Inspeksi (Tab 2)
  const [detailSearch, setDetailSearch] = useState<string>("" );
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>("ALL");
  const [detailShiftFilter, setDetailShiftFilter] = useState<string>("ALL");

  // Fixed Date Range states for Detail Inspeksi (Tab 2) & Excel Download
  const [detailRangeMode, setDetailRangeMode] = useState<"week" | "2weeks" | "month" | "custom">("week");
  const [detailCustomStart, setDetailCustomStart] = useState<string>(() => currentDateStr);
  const [detailCustomEnd, setDetailCustomEnd] = useState<string>(() => currentDateStr);
  const [detailScheduleData, setDetailScheduleData] = useState<WeeklyScheduleData | null>(null);
  const [isDetailRangeLoading, setIsDetailRangeLoading] = useState<boolean>(false);
  // Modals for PI
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<string>("");
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>("");
  const [serviceType, setServiceType] = useState<string>("PI Regular");
  const [shift, setShift] = useState<string>("Shift 1");
  const [inspectorName, setInspectorName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmittingItem, setIsSubmittingItem] = useState<boolean>(false);

  // Modal: Ubah Target Plan Harian
  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [targetModalMode, setTargetModalMode] = useState<"global" | "specific">("global");
  const [targetSpecificDate, setTargetSpecificDate] = useState<string>("");
  const [targetInputNumber, setTargetInputNumber] = useState<number>(9);
  const [isSavingTarget, setIsSavingTarget] = useState<boolean>(false);

  // Modal: Quick Bulk Add
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [bulkDate, setBulkDate] = useState<string>("");
  const [bulkSelectedUnits, setBulkSelectedUnits] = useState<string[]>([]);
  const [bulkShift, setBulkShift] = useState<string>("Shift 1");
  const [bulkServiceType, setBulkServiceType] = useState<string>("PI Regular");
  const [isSubmittingBulk, setIsSubmittingBulk] = useState<boolean>(false);

  // Item Edit State
  const [itemToEdit, setItemToEdit] = useState<PeriodicInspectionItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Modal: PDF Presentation Export (A4 Landscape Weekly Deck)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadSchedule = useCallback(
    async (dateParam?: string, siteParam?: string) => {
      try {
        setIsLoading(true);
        const data = await plantService.getWeeklySchedule(
          dateParam || currentDateStr,
          siteParam || selectedSite
        );
        setScheduleData(data);
      } catch (err: any) {
        showError(err.message || "Gagal memuat jadwal mingguan Periodic Inspection");
      } finally {
        setIsLoading(false);
      }
    },
    [currentDateStr, selectedSite, showError]
  );

  // Fetch data for custom / multi-week date range in Tab 2
  const fetchDetailRange = useCallback(
    async (startStr: string, endStr: string, siteParam?: string) => {
      try {
        setIsDetailRangeLoading(true);
        const data = await plantService.getWeeklySchedule(
          undefined,
          siteParam || selectedSite,
          startStr,
          endStr
        );
        setDetailScheduleData(data);
      } catch (err: any) {
        showError(err.message || "Gagal memuat data inspeksi untuk rentang tanggal tersebut");
      } finally {
        setIsDetailRangeLoading(false);
      }
    },
    [selectedSite, showError]
  );

  const handleSelectDetailRangePreset = (preset: "week" | "2weeks" | "month" | "custom") => {
    setDetailRangeMode(preset);

    if (preset === "week") {
      setDetailScheduleData(null);
      return;
    }

    const today = new Date();
    if (preset === "2weeks") {
      const curMonStr = scheduleData?.weekRange.startDate || today.toISOString().slice(0, 10);
      const curMon = new Date(curMonStr);
      const prevMon = new Date(curMon);
      prevMon.setDate(curMon.getDate() - 7);
      const curSun = new Date(curMon);
      curSun.setDate(curMon.getDate() + 6);

      const sStr = prevMon.toISOString().slice(0, 10);
      const eStr = curSun.toISOString().slice(0, 10);
      setDetailCustomStart(sStr);
      setDetailCustomEnd(eStr);
      fetchDetailRange(sStr, eStr);
    } else if (preset === "month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);

      const sStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const eStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
      setDetailCustomStart(sStr);
      setDetailCustomEnd(eStr);
      fetchDetailRange(sStr, eStr);
    }
  };

  const handleApplyDetailCustomRange = () => {
    if (!detailCustomStart || !detailCustomEnd) return;
    if (detailCustomStart > detailCustomEnd) {
      showError("Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.");
      return;
    }
    fetchDetailRange(detailCustomStart, detailCustomEnd);
  };

  const loadMasterUnits = useCallback(async () => {
    try {
      setMasterUnitsLoading(true);
      const res = await plantService.getMasterUnits({ withTrailers: true });
      setMasterUnits(res.data);
      const pm = res.data.filter((u) => u.category === "Prime Mover");
      setPrimeMovers(pm);
    } catch (err: any) {
      console.error("Failed to load master units:", err);
    } finally {
      setMasterUnitsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule(currentDateStr, selectedSite);
    loadMasterUnits();
  }, [loadSchedule, loadMasterUnits, currentDateStr, selectedSite]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSchedule(currentDateStr, selectedSite), loadMasterUnits()]);
    setIsRefreshing(false);
    showSuccess("Data jadwal & unit berhasil disinkronkan");
  };

  const handleSiteChange = (newSite: "MuaraPahu" | "Senyiur") => {
    setSelectedSite(newSite);
    loadSchedule(currentDateStr, newSite);
  };

  // -------------------------------------------------------------
  // Week Navigation
  // -------------------------------------------------------------
  const navigateWeek = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      const today = new Date().toISOString().slice(0, 10);
      setCurrentDateStr(today);
      loadSchedule(today, selectedSite);
      return;
    }

    const current = new Date(currentDateStr);
    const offset = direction === "next" ? 7 : -7;
    current.setDate(current.getDate() + offset);
    const newDateStr = current.toISOString().slice(0, 10);
    setCurrentDateStr(newDateStr);
    loadSchedule(newDateStr, selectedSite);
  };

  // -------------------------------------------------------------
  // Filtered Prime Movers for Current Site & Active Status
  // -------------------------------------------------------------
  const availableSitePrimeMovers = useMemo(() => {
    return primeMovers.filter(
      (pm) => pm.jobSite === selectedSite && pm.status === "Active"
    );
  }, [primeMovers, selectedSite]);

  // Lookup for already scheduled units in current week
  const scheduledUnitCodesInWeek = useMemo(() => {
    if (!scheduleData) return new Set<string>();
    const set = new Set<string>();
    for (const d of scheduleData.days) {
      for (const it of d.items) {
        set.add(it.unitCode);
      }
    }
    return set;
  }, [scheduleData]);

  // Selected unit trailer buntut preview
  const selectedUnitTrailers = useMemo(() => {
    if (!selectedUnitCode) return null;
    const pm = primeMovers.find((u) => u.unitCode === selectedUnitCode);
    return pm?.trailers || null;
  }, [selectedUnitCode, primeMovers]);

  // -------------------------------------------------------------
  // Add Unit Schedule Handler
  // -------------------------------------------------------------
  const handleOpenAddModal = (dateStr: string) => {
    setSelectedDayForAdd(dateStr);
    setSelectedUnitCode("");
    setServiceType("PI Regular");
    setShift("Shift 1");
    setInspectorName("");
    setNotes("");
    setIsAddModalOpen(true);
  };

  const handleSubmitAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayForAdd || !selectedUnitCode) {
      showError("Harap pilih tanggal dan kode unit kepala");
      return;
    }

    try {
      setIsSubmittingItem(true);
      await plantService.addInspectionItem({
        date: selectedDayForAdd,
        unitCode: selectedUnitCode,
        serviceType,
        shift,
        inspectorName: inspectorName.trim() || undefined,
        notes: notes.trim() || undefined,
        status: "Scheduled",
      });

      showSuccess(`Unit ${selectedUnitCode} berhasil dijadwalkan!`);
      setIsAddModalOpen(false);
      loadSchedule(currentDateStr, selectedSite);
    } catch (err: any) {
      showError(err.message || "Gagal menjadwalkan unit");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // -------------------------------------------------------------
  // Bulk Add Units Handler
  // -------------------------------------------------------------
  const handleOpenBulkAddModal = (dateStr: string) => {
    setBulkDate(dateStr);
    setBulkSelectedUnits([]);
    setBulkShift("Shift 1");
    setBulkServiceType("PI Regular");
    setIsBulkModalOpen(true);
  };

  const handleToggleBulkUnit = (code: string) => {
    setBulkSelectedUnits((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmitBulkAdd = async () => {
    if (!bulkDate || bulkSelectedUnits.length === 0) {
      showError("Harap pilih minimal 1 unit");
      return;
    }

    try {
      setIsSubmittingBulk(true);
      await plantService.bulkAddInspectionItems({
        date: bulkDate,
        unitCodes: bulkSelectedUnits,
        shift: bulkShift,
        serviceType: bulkServiceType,
      });

      showSuccess(`${bulkSelectedUnits.length} unit berhasil ditambahkan ke jadwal!`);
      setIsBulkModalOpen(false);
      loadSchedule(currentDateStr, selectedSite);
    } catch (err: any) {
      showError(err.message || "Gagal menambahkan unit massal");
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // -------------------------------------------------------------
  // Update Item Status Handler (Inline Quick Toggle with Swal Confirmation)
  // -------------------------------------------------------------
  const handleQuickStatusChange = (
    item: PeriodicInspectionItem,
    nextStatus: "Scheduled" | "In Progress" | "Completed" | "Pending",
    event?: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (item.status === nextStatus) return;

    const selectElement = event?.target;

    const statusConfig: Record<
      string,
      { label: string; desc: string; type: "info" | "warning"; icon?: "alert" | "question" }
    > = {
      Scheduled: {
        label: "Scheduled (Terjadwal)",
        desc: `Kembalikan unit ${item.unitCode} ke antrean status 'Scheduled'.`,
        type: "info",
        icon: "question",
      },
      "In Progress": {
        label: "In Progress (Sedang Dikerjakan)",
        desc: `Tandai unit ${item.unitCode} sedang dalam pengerjaan inspeksi.`,
        type: "info",
        icon: "question",
      },
      Completed: {
        label: "Completed (Selesai)",
        desc: `Tandai inspeksi unit ${item.unitCode} telah selesai. Ketercapaian target hari ini akan bertambah (+1 unit).`,
        type: "info",
        icon: "question",
      },
      Pending: {
        label: "Pending (Tertunda)",
        desc: `Tandai inspeksi unit ${item.unitCode} tertunda. Unit tidak dihitung sebagai target selesai.`,
        type: "warning",
        icon: "alert",
      },
    };

    const targetConfig = statusConfig[nextStatus] || {
      label: nextStatus,
      desc: `Ubah status inspeksi unit ${item.unitCode} menjadi ${nextStatus}.`,
      type: "info",
      icon: "question",
    };

    confirm({
      title: "Konfirmasi Perubahan Status",
      message: `Pindahkan status inspeksi unit ${item.unitCode} dari "${item.status}" ke "${nextStatus}"?\n\n${targetConfig.desc}`,
      confirmText: "Ya, Ubah Status",
      cancelText: "Batal",
      type: targetConfig.type,
      icon: targetConfig.icon,
      onConfirm: async () => {
        try {
          await plantService.updateInspectionItem(item.id, { status: nextStatus });
          showSuccess(
            `Status unit ${item.unitCode} berhasil diubah ke ${nextStatus}`,
            "Status Diperbarui"
          );
          loadSchedule(currentDateStr, selectedSite);
        } catch (err: any) {
          showError("Gagal mengubah status: " + err.message);
          if (selectElement) {
            selectElement.value = item.status;
          }
        }
      },
      onCancel: () => {
        if (selectElement) {
          selectElement.value = item.status;
        }
      },
    });
  };

  // -------------------------------------------------------------
  // Delete Item Handler
  // -------------------------------------------------------------
  const handleDeleteItem = (item: PeriodicInspectionItem) => {
    confirm({
      title: "Hapus Unit dari Jadwal PI?",
      message: `Apakah Anda yakin ingin membatalkan jadwal inspeksi unit ${item.unitCode} pada tanggal ${item.date}?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger",
      onConfirm: async () => {
        try {
          await plantService.deleteInspectionItem(item.id);
          showSuccess(`Unit ${item.unitCode} dihapus dari jadwal`);
          loadSchedule(currentDateStr, selectedSite);
        } catch (err: any) {
          showError("Gagal menghapus unit: " + err.message);
        }
      },
    });
  };

  // -------------------------------------------------------------
  // Edit Item Handler
  // -------------------------------------------------------------
  const handleOpenEditModal = (item: PeriodicInspectionItem) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    const originalItem = scheduleData?.days
      .flatMap((d) => d.items)
      .find((i) => i.id === itemToEdit.id);

    const isStatusChanged = originalItem && originalItem.status !== itemToEdit.status;

    if (isStatusChanged) {
      confirm({
        title: "Konfirmasi Perubahan Status",
        message: `Simpan rincian data dan pindahkan status inspeksi unit ${itemToEdit.unitCode} dari "${originalItem?.status}" ke "${itemToEdit.status}"?`,
        confirmText: "Ya, Simpan Perubahan",
        cancelText: "Batal",
        type: itemToEdit.status === "Pending" ? "warning" : "info",
        icon: itemToEdit.status === "Pending" ? "alert" : "question",
        onConfirm: async () => {
          try {
            await plantService.updateInspectionItem(itemToEdit.id, {
              status: itemToEdit.status,
              shift: itemToEdit.shift,
              serviceType: itemToEdit.serviceType,
              inspectorName: itemToEdit.inspectorName || undefined,
              notes: itemToEdit.notes || undefined,
            });
            showSuccess(`Data & status inspeksi unit ${itemToEdit.unitCode} berhasil diperbarui`);
            setIsEditModalOpen(false);
            setItemToEdit(null);
            loadSchedule(currentDateStr, selectedSite);
          } catch (err: any) {
            showError("Gagal memperbarui inspeksi: " + err.message);
          }
        },
      });
      return;
    }

    try {
      await plantService.updateInspectionItem(itemToEdit.id, {
        status: itemToEdit.status,
        shift: itemToEdit.shift,
        serviceType: itemToEdit.serviceType,
        inspectorName: itemToEdit.inspectorName || undefined,
        notes: itemToEdit.notes || undefined,
      });
      showSuccess("Data inspeksi berhasil diperbarui");
      setIsEditModalOpen(false);
      setItemToEdit(null);
      loadSchedule(currentDateStr, selectedSite);
    } catch (err: any) {
      showError("Gagal memperbarui inspeksi: " + err.message);
    }
  };

  // -------------------------------------------------------------
  // Target Plan Modal Handler
  // -------------------------------------------------------------
  const handleOpenTargetModal = (dateStr?: string) => {
    if (dateStr) {
      setTargetModalMode("specific");
      setTargetSpecificDate(dateStr);
      const day = scheduleData?.days.find((d) => d.date === dateStr);
      setTargetInputNumber(day?.targetUnits || scheduleData?.defaultDailyTarget || 9);
    } else {
      setTargetModalMode("global");
      setTargetSpecificDate("");
      setTargetInputNumber(scheduleData?.defaultDailyTarget || 9);
    }
    setIsTargetModalOpen(true);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetInputNumber < 0) {
      showError("Target harus bernilai >= 0");
      return;
    }

    try {
      setIsSavingTarget(true);
      if (targetModalMode === "global") {
        await plantService.updateSetting("daily_pi_target", String(targetInputNumber));
        showSuccess(`Target plan harian default diperbarui ke ${targetInputNumber} Unit/Hari`);
      } else {
        await plantService.upsertDailyPlan(targetSpecificDate, targetInputNumber);
        showSuccess(`Target plan tanggal ${targetSpecificDate} diperbarui ke ${targetInputNumber} Unit`);
      }
      setIsTargetModalOpen(false);
      loadSchedule(currentDateStr, selectedSite);
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan target plan");
    } finally {
      setIsSavingTarget(false);
    }
  };


  // -------------------------------------------------------------
  // Apply Standard 65-Unit Routine Template (Muara Pahu)
  // -------------------------------------------------------------
  const [isApplyingTemplate, setIsApplyingTemplate] = useState<boolean>(false);

  const handleApplyStandardTemplate = () => {
    if (selectedSite !== "MuaraPahu") {
      showError("Jadwal template 65 unit saat ini dikhususkan untuk Site Muara Pahu.");
      return;
    }

    confirm({
      title: "Terapkan Jadwal Standar PI (Template 65 Unit)",
      message: `Terapkan jadwal rutin mingguan standar Site Muara Pahu (65 Prime Mover: Senin 9 unit, Selasa 9 unit, Rabu 9 unit, Kamis 9 unit, Jumat 10 unit, Sabtu 9 unit, Minggu 10 unit) untuk minggu ${scheduleData?.weekRange.formatted || ""}?`,
      type: "info",
      confirmText: "Ya, Terapkan Template",
      cancelText: "Batal",
      onConfirm: async () => {
        try {
          setIsApplyingTemplate(true);
          const res = await plantService.applyStandardTemplate(currentDateStr, "MuaraPahu");
          showSuccess(res.message);
          loadSchedule(currentDateStr, selectedSite);
        } catch (err: any) {
          showError(err.message || "Gagal menerapkan template jadwal rutin");
        } finally {
          setIsApplyingTemplate(false);
        }
      },
    });
  };

  const muaraPahuHeadTotal = useMemo(
    () => masterUnits.filter((u) => u.jobSite === "MuaraPahu" && u.category === "Prime Mover").length,
    [masterUnits]
  );
  const senyiurHeadTotal = useMemo(
    () => masterUnits.filter((u) => u.jobSite === "Senyiur" && u.category === "Prime Mover").length,
    [masterUnits]
  );

  // -------------------------------------------------------------
  // Tab 2: Detail Inspeksi Items & Filter
  // -------------------------------------------------------------
  // Tab 2 Items & Filters (Supporting multi-week / fixed date range)
  // -------------------------------------------------------------
  const activeDetailSchedule = detailScheduleData || scheduleData;

  const allDetailItems = useMemo(() => {
    if (!activeDetailSchedule?.days) return [];
    return activeDetailSchedule.days.flatMap((day) =>
      day.items.map((item) => ({
        ...item,
        dayName: day.dayName,
        dayDateFormatted: day.dayDateFormatted,
      }))
    );
  }, [activeDetailSchedule]);

  const filteredDetailItems = useMemo(() => {
    let list = allDetailItems;
    if (detailStatusFilter !== "ALL") {
      list = list.filter((i) => i.status === detailStatusFilter);
    }
    if (detailShiftFilter !== "ALL") {
      list = list.filter((i) => i.shift === detailShiftFilter);
    }
    if (detailSearch.trim()) {
      const q = detailSearch.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.unitCode.toLowerCase().includes(q) ||
          (i.buntutSummary && i.buntutSummary.toLowerCase().includes(q)) ||
          (i.inspectorName && i.inspectorName.toLowerCase().includes(q)) ||
          i.serviceType.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allDetailItems, detailStatusFilter, detailShiftFilter, detailSearch]);

  // -------------------------------------------------------------
  // Download Detail Inspeksi to Excel (.xlsx) with Fixed Date Range
  // -------------------------------------------------------------
  const handleDownloadExcel = () => {
    const activeSchedule = detailScheduleData || scheduleData;
    if (!activeSchedule || allDetailItems.length === 0) {
      showError("Tidak ada data inspeksi yang tersedia untuk diunduh pada rentang periode ini.");
      return;
    }

    const itemsToExport = filteredDetailItems.length > 0 ? filteredDetailItems : allDetailItems;
    const siteName = selectedSite === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur";
    const rangeText = activeSchedule.weekRange.formatted || `${detailCustomStart} s/d ${detailCustomEnd}`;

    // Header Metadata
    const excelRows: any[][] = [
      ["PT BATARA DHARMA PERSADA"],
      ["LAPORAN DETAIL PERIODIC INSPECTION (PI) ARMADA HAULING"],
      [`Lokasi JobSite : ${siteName}`],
      [`Periode Jadwal : ${rangeText} (${activeSchedule.days.length} Hari Kerja)`],
      [
        `Waktu Ekspor   : ${new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
      ],
      [],
      ["RINGKASAN STATUS INSPEKSI:"],
      [
        `Total Data Diekspor: ${itemsToExport.length} Unit`,
        `Selesai (Completed): ${itemsToExport.filter((i) => i.status === "Completed").length} Unit`,
        `Sedang Dikerjakan (In Progress): ${itemsToExport.filter((i) => i.status === "In Progress").length} Unit`,
        `Belum Dimulai (Scheduled): ${itemsToExport.filter((i) => i.status === "Scheduled").length} Unit`,
        `Tertunda (Pending): ${itemsToExport.filter((i) => i.status === "Pending").length} Unit`,
      ],
      [],
      [
        "No.",
        "Tanggal",
        "Hari",
        "JobSite",
        "Kode Unit Kepala (PM)",
        "Vessel 1",
        "Dolly",
        "Vessel 2",
        "Rangkaian Gandengan Lengkap",
        "Tipe Servis",
        "Shift",
        "Status Inspeksi",
        "Mekanik / PIC",
        "Catatan / Temuan",
      ],
    ];

    itemsToExport.forEach((item, index) => {
      const pmMaster = masterUnits.find((u) => u.unitCode === item.unitCode);
      const v1 = pmMaster?.trailers?.vessel1?.unitCode || "-";
      const dl = pmMaster?.trailers?.dolly?.unitCode || "-";
      const v2 = pmMaster?.trailers?.vessel2?.unitCode || "-";

      excelRows.push([
        index + 1,
        item.date,
        item.dayName || "-",
        selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur",
        item.unitCode,
        v1,
        dl,
        v2,
        item.buntutSummary || (v1 !== "-" ? `V1: ${v1} • DL: ${dl} • V2: ${v2}` : "-"),
        item.serviceType,
        item.shift,
        item.status,
        item.inspectorName || "-",
        item.notes || "-",
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelRows);

    // Set Column Widths for comfortable view in Excel
    ws["!cols"] = [
      { wch: 6 },  // No.
      { wch: 14 }, // Tanggal
      { wch: 12 }, // Hari
      { wch: 14 }, // JobSite
      { wch: 22 }, // Kode Unit Kepala (PM)
      { wch: 14 }, // Vessel 1
      { wch: 14 }, // Dolly
      { wch: 14 }, // Vessel 2
      { wch: 36 }, // Rangkaian Gandengan Lengkap
      { wch: 16 }, // Tipe Servis
      { wch: 12 }, // Shift
      { wch: 18 }, // Status Inspeksi
      { wch: 24 }, // Mekanik / PIC
      { wch: 38 }, // Catatan / Temuan
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Detail Periodic Inspection");

    const sanitizedSite = selectedSite === "MuaraPahu" ? "MuaraPahu" : "Senyiur";
    const sDate = (activeSchedule.weekRange.startDate || detailCustomStart).replace(/-/g, "");
    const eDate = (activeSchedule.weekRange.endDate || detailCustomEnd).replace(/-/g, "");
    const fileName = `Detail_Inspeksi_PI_${sanitizedSite}_${sDate}_sd_${eDate}.xlsx`;

    XLSX.writeFile(wb, fileName);
    showSuccess(`File Excel "${fileName}" berhasil diunduh!`, "Export Excel Berhasil");
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------
          Top Header Banner
      ---------------------------------------------------------- */}
      <div className="relative border border-slate-700/80 rounded-3xl p-6 sm:p-7 text-white shadow-xl overflow-hidden">
        {/* Background Photo from public/bg-plantmaintenance.jpeg */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-102"
          style={{ backgroundImage: "url('/bg-plantmaintenance.jpeg')" }}
        />
        {/* Sleek Dark Gradient & Backdrop Overlay for High Readability */}
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/92 via-slate-900/85 to-slate-950/78 backdrop-blur-[1.5px]" />

        {/* Decorative background watermark */}
        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none">
          <Wrench size={220} className="text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1.5">
                <Wrench size={12} className="text-orange-400" />
                Plant & Maintenance
              </span>

              {/* Site Selector Pills in Banner */}
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full border border-white/15">
                <button
                  onClick={() => handleSiteChange("MuaraPahu")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "MuaraPahu"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Muara Pahu ({muaraPahuHeadTotal || 65} Head)
                </button>
                <button
                  onClick={() => handleSiteChange("Senyiur")}
                  className={`px-3 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                    selectedSite === "Senyiur"
                      ? "bg-[#e95623] text-white shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Site Senyiur ({senyiurHeadTotal || 6} Head)
                </button>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={11} />
                284 Unit Database
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Periodic Inspection (PI)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-3xl leading-relaxed">
              Perencanaan dan monitoring jadwal inspeksi berkala armada hauling{" "}
              <strong className="text-white font-bold underline decoration-[#e95623]/80 decoration-2 underline-offset-4">
                {selectedSite === "MuaraPahu"
                  ? "Site Muara Pahu (65 Prime Mover)"
                  : "Site Senyiur (6 Prime Mover)"}
              </strong>
              . Penjadwalan unit Prime Mover secara otomatis menyinkronkan seluruh rangkaian gandengan (Vessel 1, Dolly, dan Vessel 2).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-98"
              title="Ekspor Jadwal Mingguan ke PDF Presentasi (A4 Landscape)"
            >
              <FileDown size={14} className="text-white" />
              <span>Export PDF Presentasi</span>
            </button>

            <button
              onClick={() => handleOpenTargetModal()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              title="Atur target plan PI harian default"
            >
              <Sliders size={14} className="text-amber-400" />
              <span>Target: {scheduleData?.defaultDailyTarget || 9} Unit/Hari</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-orange-400" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Tab Navigation
      ---------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`pb-3 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "weekly"
                ? "border-[#e95623] text-[#e95623]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CalendarDays size={16} />
            <span>Tabel Jadwal Mingguan</span>
          </button>

          <button
            onClick={() => setActiveTab("details")}
            className={`pb-3 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "details"
                ? "border-[#e95623] text-[#e95623]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={16} />
            <span>Daftar Detail Inspeksi</span>
          </button>
        </div>

        {activeTab === "weekly" && (
          <div className="hidden sm:flex items-center gap-2 pb-2">
            <span className="text-[11px] font-medium text-slate-500">
              Populasi Aktif{" "}
              <strong>{selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</strong>:{" "}
              <strong className="text-slate-800">
                {scheduleData?.primeMoverPopulation ?? 0} Head Unit
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------
          TAB 1: TABEL MINGGUAN (CORE VIEW)
      ---------------------------------------------------------- */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          {/* Week Selector Bar & KPI Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Week Navigation Controls Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#e95623]" />
                  Navigasi Minggu &bull; {selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </span>
                <button
                  onClick={() => navigateWeek("today")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-batara-orange-50 text-[#e95623] border border-batara-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  Minggu Ini
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => navigateWeek("prev")}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Minggu Sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-center">
                  <p className="text-sm font-black text-slate-800">
                    {scheduleData?.weekRange.formatted || "Memuat..."}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Senin &ndash; Minggu
                  </p>
                </div>

                <button
                  onClick={() => navigateWeek("next")}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Minggu Berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Target Plan Harian:</span>
                <span className="font-extrabold text-slate-800 flex items-center gap-1">
                  <span>{scheduleData?.defaultDailyTarget || 9} Unit / Hari</span>
                  <button
                    onClick={() => handleOpenTargetModal()}
                    className="text-[#e95623] hover:underline cursor-pointer text-[11px] ml-1"
                  >
                    (Ubah)
                  </button>
                </span>
              </div>

              {selectedSite === "MuaraPahu" && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleApplyStandardTemplate}
                    disabled={isApplyingTemplate}
                    className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#e95623] text-xs font-bold border border-orange-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                    title="Terapkan jadwal rutin mingguan standar 65 unit (Senin - Minggu)"
                  >
                    <Sparkles size={13} className={isApplyingTemplate ? "animate-spin text-[#e95623]" : "text-[#e95623]"} />
                    <span>{isApplyingTemplate ? "Menerapkan Template..." : "Terapkan Jadwal Rutin PI (Template 65 Unit)"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick KPI Cards */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card 1: Total Plan */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Plan Minggu
                </span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-slate-800">
                    {scheduleData?.summary.totalWeekPlan || 63}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold ml-1">Unit</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  7 hari &times; {scheduleData?.defaultDailyTarget || 9} unit/hari
                </span>
              </div>

              {/* Card 2: Total Scheduled */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Terjadwal
                </span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-slate-800">
                    {scheduleData?.summary.totalWeekScheduled || 0}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold ml-1">Unit</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <span>Masuk Plan:</span>
                  <span className="text-[#e95623]">
                    {scheduleData?.summary.scheduledPercent ?? (scheduleData?.summary.totalWeekPlan ? Math.round((scheduleData.summary.totalWeekScheduled / scheduleData.summary.totalWeekPlan) * 100) : 0)}%
                  </span>
                </div>
              </div>

              {/* Card 3: Selesai */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inspeksi Selesai
                </span>
                <div className="my-1.5">
                  <span
                    className={`text-2xl font-black ${
                      (scheduleData?.summary.achievementPercent || 0) >= 95
                        ? "text-emerald-600"
                        : (scheduleData?.summary.achievementPercent || 0) > 70
                        ? "text-amber-600"
                        : (scheduleData?.summary.achievementPercent || 0) > 0
                        ? "text-rose-600"
                        : "text-slate-800"
                    }`}
                  >
                    {scheduleData?.summary.totalWeekCompleted || 0}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold ml-1">Unit</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span>Ketercapaian:</span>
                  <span
                    className={`font-black ${
                      (scheduleData?.summary.achievementPercent || 0) >= 95
                        ? "text-emerald-600"
                        : (scheduleData?.summary.achievementPercent || 0) > 70
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {scheduleData?.summary.achievementPercent || 0}%
                  </span>
                </div>
              </div>

              {/* Card 4: Populasi Unit */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Populasi Site
                </span>
                <div className="my-1.5">
                  <span className="text-2xl font-black text-slate-800">
                    {scheduleData?.primeMoverPopulation ?? 0}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold ml-1">
                    Head ({selectedSite === "MuaraPahu" ? "MPH" : "SNY"})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Total Semua: {scheduleData?.totalPopulationAllSites || 71} Head
                </span>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------
              7-DAY WEEKLY GRID
          -------------------------------------------------------- */}
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <RefreshCw className="animate-spin text-[#e95623] mx-auto mb-3" size={32} />
              <p className="text-sm font-bold text-slate-700">Memuat Jadwal Mingguan...</p>
              <p className="text-xs text-slate-400 mt-1">Mengambil data inspeksi dari database</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 -mx-1 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-start min-w-310 2xl:min-w-0">
                {scheduleData?.days.map((day) => {
                  const isCompletedMet =
                    day.completedCount >= day.targetUnits && day.targetUnits > 0;
                  const completionPercent =
                    day.targetUnits > 0
                      ? Math.min(
                          100,
                          Math.round((day.completedCount / day.targetUnits) * 100)
                        )
                      : 0;

                  return (
                    <div
                      key={day.date}
                      className={`bg-white border rounded-2xl flex flex-col shadow-xs transition-all overflow-hidden ${
                        day.isToday
                          ? "border-[#e95623] ring-2 ring-orange-200"
                          : "border-slate-200/90 hover:border-slate-300"
                      }`}
                    >
                      {/* Day Column Header */}
                      <div
                        className={`p-3.5 border-b ${
                          day.isToday ? "bg-orange-50/70 border-orange-200" : "bg-slate-50/80 border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-black uppercase tracking-wider ${
                                day.isToday ? "text-[#e95623]" : "text-slate-800"
                              }`}
                            >
                              {day.dayName}
                            </span>
                            {day.isToday && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#e95623] text-white">
                                Hari Ini
                              </span>
                            )}
                          </div>

                          {/* Edit Target for this day */}
                          <button
                            onClick={() => handleOpenTargetModal(day.date)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white px-2 py-0.5 rounded-lg border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                            title="Ubah target plan untuk tanggal ini"
                          >
                            Plan: {day.targetUnits}
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="text-slate-500 font-medium">{day.dayDateFormatted}</span>
                          <span
                            className={`font-black ${
                              completionPercent >= 95
                                ? "text-emerald-600"
                                : completionPercent > 70
                                ? "text-amber-600"
                                : completionPercent > 0
                                ? "text-rose-600"
                                : "text-slate-400"
                            }`}
                          >
                            {day.completedCount} / {day.targetUnits}
                          </span>
                        </div>

                        {/* Mini Progress Bar (Fills as units are completed) */}
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              completionPercent >= 95
                                ? "bg-emerald-500"
                                : completionPercent > 70
                                ? "bg-amber-500"
                                : completionPercent > 0
                                ? "bg-rose-500"
                                : "bg-transparent"
                            }`}
                            style={{
                              width: `${completionPercent}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Day Items Body */}
                      <div className="p-2.5 space-y-2.5 flex-1 min-h-60 max-h-137.5 overflow-y-auto">
                        {day.items.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 space-y-1">
                            <Clock size={22} className="mx-auto opacity-40 mb-1" />
                            <p className="text-xs font-semibold">Belum ada unit</p>
                            <p className="text-[11px] text-slate-400">Target: {day.targetUnits} Unit</p>
                          </div>
                        ) : (
                          day.items.map((item) => {
                            const isCompleted = item.status === "Completed";
                            const isInProgress = item.status === "In Progress";

                            return (
                              <div
                                key={item.id}
                                className={`p-3 rounded-2xl border transition-all text-xs group relative ${
                                  isCompleted
                                    ? "bg-emerald-50/50 border-emerald-200"
                                    : isInProgress
                                    ? "bg-amber-50/50 border-amber-200"
                                    : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                                }`}
                              >
                                {/* Header inside item */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <Truck
                                      size={15}
                                      className={
                                        isCompleted
                                          ? "text-emerald-600"
                                          : isInProgress
                                          ? "text-amber-600"
                                          : "text-[#e95623]"
                                      }
                                    />
                                    <span className="text-sm font-black text-slate-900 tracking-tight">
                                      {item.unitCode}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                      title="Edit rincian inspeksi"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                      title="Hapus unit dari jadwal"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Buntut Summary */}
                                {item.buntutSummary && (
                                  <p
                                    className="text-[11px] text-slate-500 font-medium truncate mt-1.5"
                                    title={`Rangkaian: ${item.buntutSummary}`}
                                  >
                                    &bull; {item.buntutSummary}
                                  </p>
                                )}

                                {/* Service Type & Shift */}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {item.serviceType}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                                    {item.shift}
                                  </span>
                                </div>

                                {/* Status badge & Quick Switch Dropdown */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Status
                                  </span>

                                  <select
                                    value={item.status}
                                    onChange={(e) =>
                                      handleQuickStatusChange(item, e.target.value as any, e)
                                    }
                                    className={`text-[11px] font-black py-1 px-2.5 rounded-lg border transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 ${
                                      isCompleted
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                        : isInProgress
                                        ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                        : item.status === "Pending"
                                        ? "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Pending">Pending</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Day Card Footer: Quick Actions */}
                      <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAddModal(day.date)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-white hover:bg-orange-50 text-slate-700 hover:text-[#e95623] border border-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
                        >
                          <Plus size={14} className="text-[#e95623]" />
                          <span>+ Unit PI</span>
                        </button>

                        <button
                          onClick={() => handleOpenBulkAddModal(day.date)}
                          className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          title="Tambah beberapa unit sekaligus (Bulk Input)"
                        >
                          <Layers size={14} />
                          <span className="hidden xl:inline text-[11px]">Massal</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: DAFTAR DETAIL INSPEKSI
      ---------------------------------------------------------- */}
      {activeTab === "details" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-[#e95623]" />
                <span>
                  Daftar Detail Inspeksi &bull;{" "}
                  {selectedSite === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Semua unit yang terjadwal dan hasil progres inspeksi periode{" "}
                <strong>{activeDetailSchedule?.weekRange.formatted}</strong> ({activeDetailSchedule?.days.length || 7} Hari Kerja)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
                title="Download tabel detail inspeksi ke format file Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} />
                <span>Download Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
                title="Buka dialog Export PDF Presentasi"
              >
                <FileDown size={14} />
                <span>Export PDF Presentasi</span>
              </button>

              <button
                onClick={() => handleOpenAddModal(currentDateStr)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0 active:scale-98"
              >
                <Plus size={14} />
                <span>Jadwalkan Unit PI</span>
              </button>
            </div>
          </div>

          {/* Fixed Date Range Selector Bar for Tab 2 */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
                <CalendarDays size={14} className="text-[#e95623]" />
                Filter Rentang Waktu:
              </span>
              {[
                { id: "week", label: "Minggu Aktif (7 Hari)" },
                { id: "2weeks", label: "2 Minggu (14 Hari)" },
                { id: "month", label: "Bulan Ini" },
                { id: "custom", label: "Fixed Date Range (Kustom)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectDetailRangePreset(p.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    detailRangeMode === p.id
                      ? "bg-[#e95623] text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {detailRangeMode === "custom" && (
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 text-xs font-semibold">Dari:</span>
                <input
                  type="date"
                  value={detailCustomStart}
                  onChange={(e) => setDetailCustomStart(e.target.value)}
                  className="text-xs px-2 py-0.5 rounded border border-slate-200 focus:outline-hidden"
                />
                <span className="text-slate-500 text-xs font-semibold">s/d:</span>
                <input
                  type="date"
                  value={detailCustomEnd}
                  onChange={(e) => setDetailCustomEnd(e.target.value)}
                  className="text-xs px-2 py-0.5 rounded border border-slate-200 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleApplyDetailCustomRange}
                  disabled={isDetailRangeLoading}
                  className="px-3 py-1 rounded-lg bg-[#e95623] text-white text-xs font-bold hover:bg-[#d44818] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDetailRangeLoading ? "Memuat..." : "Terapkan"}
                </button>
              </div>
            )}

            {isDetailRangeLoading && (
              <span className="text-xs text-orange-600 font-semibold flex items-center gap-1.5 animate-pulse">
                <RefreshCw size={12} className="animate-spin" /> Memuat data rentang tanggal...
              </span>
            )}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari unit (e.g. PM401), mekanik, shift, servis..."
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              />
              {detailSearch && (
                <button
                  onClick={() => setDetailSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Status */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter size={11} /> Status:
                </span>
                {[
                  { id: "ALL", label: "Semua" },
                  { id: "Completed", label: "Completed" },
                  { id: "In Progress", label: "In Progress" },
                  { id: "Scheduled", label: "Scheduled" },
                  { id: "Pending", label: "Pending" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setDetailStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      detailStatusFilter === s.id
                        ? s.id === "Completed"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : s.id === "In Progress"
                          ? "bg-amber-500 text-white shadow-2xs"
                          : s.id === "Pending"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-slate-800 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Filter Shift */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Shift:</span>
                {[
                  { id: "ALL", label: "Semua" },
                  { id: "Shift 1", label: "Shift 1" },
                  { id: "Shift 2", label: "Shift 2" },
                ].map((sh) => (
                  <button
                    key={sh.id}
                    onClick={() => setDetailShiftFilter(sh.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      detailShiftFilter === sh.id
                        ? "bg-[#e95623] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Menampilkan <strong className="text-slate-800">{filteredDetailItems.length}</strong> dari{" "}
              <strong>{allDetailItems.length}</strong> unit inspeksi minggu ini
            </span>
            {(detailSearch || detailStatusFilter !== "ALL" || detailShiftFilter !== "ALL") && (
              <button
                onClick={() => {
                  setDetailSearch("");
                  setDetailStatusFilter("ALL");
                  setDetailShiftFilter("ALL");
                }}
                className="text-[11px] font-bold text-[#e95623] hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Kepala (PM)</th>
                  <th className="py-3 px-3">Rangkaian Gandengan (V1, DL, V2)</th>
                  <th className="py-3 px-3">Tipe Servis</th>
                  <th className="py-3 px-3">Shift</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Mekanik / PIC</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDetailItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {allDetailItems.length === 0
                        ? `Belum ada jadwal inspeksi pada minggu ini di ${
                            selectedSite === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur"
                          }.`
                        : "Tidak ada data inspeksi yang sesuai dengan pencarian atau filter."}
                    </td>
                  </tr>
                ) : (
                  filteredDetailItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {formatIndoDate(item.date)}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 flex items-center gap-1.5">
                        <Truck size={14} className="text-[#e95623]" />
                        <span>{item.unitCode}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.buntutSummary || "-"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.serviceType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{item.shift}</td>
                      <td className="py-3 px-3">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleQuickStatusChange(item, e.target.value as any, e)
                          }
                          className={`text-[10px] font-black py-1 px-2.5 rounded-lg border transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 ${
                            item.status === "Completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              : item.status === "In Progress"
                              ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                              : item.status === "Pending"
                              ? "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.inspectorName || "-"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
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
      )}

      {/* ---------------------------------------------------------
          MODAL: TAMBAH 1 UNIT PI
      ---------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wrench size={16} className="text-[#e95623]" />
                  <span>Jadwalkan Unit Periodic Inspection</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Site: <strong>{selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</strong> &bull; Pilih unit kepala (Prime Mover)
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAddUnit} className="space-y-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Inspeksi
                </label>
                <input
                  type="date"
                  value={selectedDayForAdd}
                  onChange={(e) => setSelectedDayForAdd(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  required
                />
              </div>

              {/* Unit Kepala Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Unit Kepala (Prime Mover) di {selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {availableSitePrimeMovers.length} Unit Aktif
                  </span>
                </div>

                <select
                  value={selectedUnitCode}
                  onChange={(e) => setSelectedUnitCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  required
                >
                  <option value="">-- Pilih Unit Kepala (PM) --</option>
                  {availableSitePrimeMovers.map((pm) => {
                    const isAlreadyScheduled = scheduledUnitCodesInWeek.has(pm.unitCode);
                    return (
                      <option key={pm.unitCode} value={pm.unitCode}>
                        {pm.unitCode} - Volvo FH16 #{pm.pairIndex} ({pm.jobSite})
                        {isAlreadyScheduled ? " (Sudah Terjadwal Minggu Ini)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Buntut Rangkaian Preview Card */}
              {selectedUnitCode && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rangkaian Trailer Terhubung (Otomatis Ikut Masuk):
                  </span>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[9px] font-bold text-slate-400 block">Vessel 1</span>
                      <span className="text-xs font-black text-slate-800">
                        {selectedUnitTrailers?.vessel1?.unitCode || "-"}
                      </span>
                      <span className="text-[8px] text-slate-500 block">SDT110</span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[9px] font-bold text-slate-400 block">Dolly</span>
                      <span className="text-xs font-black text-slate-800">
                        {selectedUnitTrailers?.dolly?.unitCode || "-"}
                      </span>
                      <span className="text-[8px] text-slate-500 block">DL</span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[9px] font-bold text-slate-400 block">Vessel 2</span>
                      <span className="text-xs font-black text-slate-800">
                        {selectedUnitTrailers?.vessel2?.unitCode || "-"}
                      </span>
                      <span className="text-[8px] text-slate-500 block">SDT125</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tipe Servis & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipe Inspeksi / Servis
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value="PI Regular">PI Regular</option>
                    <option value="P1 (250 HM)">P1 (250 HM)</option>
                    <option value="P2 (500 HM)">P2 (500 HM)</option>
                    <option value="P3 (1000 HM)">P3 (1000 HM)</option>
                    <option value="P4 (2000 HM)">P4 (2000 HM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value="Shift 1">Shift 1 (Siang)</option>
                    <option value="Shift 2">Shift 2 (Malam)</option>
                  </select>
                </div>
              </div>

              {/* PIC Mekanik & Catatan */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Inspector / PIC Mekanik (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Budi / Workshop Team"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Temuan / Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cek kebocoran seal hidrolik vessel"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingItem ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan ke Jadwal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MODAL: BULK ADD UNITS (INPUT MASSAL S/D 9 UNIT)
      ---------------------------------------------------------- */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers size={16} className="text-[#e95623]" />
                  <span>Input Massal Unit PI (Bulk Selection)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tanggal: <strong>{formatIndoDate(bulkDate)}</strong> &bull; Site:{" "}
                  <strong>{selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                Terpilih:{" "}
                <strong className="text-[#e95623]">{bulkSelectedUnits.length} Unit</strong> (Target:{" "}
                {scheduleData?.defaultDailyTarget || 9} Unit)
              </span>
              <button
                type="button"
                onClick={() => setBulkSelectedUnits([])}
                className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                Reset Pilihan
              </button>
            </div>

            {/* Quick Grid of Available Prime Movers */}
            <div className="max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-2xl grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSitePrimeMovers.map((pm) => {
                const isSelected = bulkSelectedUnits.includes(pm.unitCode);
                const isAlreadyScheduled = scheduledUnitCodesInWeek.has(pm.unitCode);

                return (
                  <button
                    key={pm.unitCode}
                    type="button"
                    onClick={() => handleToggleBulkUnit(pm.unitCode)}
                    className={`p-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-[#e95623] text-white border-[#e95623] shadow-xs"
                        : isAlreadyScheduled
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{pm.unitCode}</span>
                    {isAlreadyScheduled && !isSelected && (
                      <span className="block text-[8px] font-semibold text-amber-600">
                        Minggu Ini
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Service & Shift Selection */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipe Servis Massal
                </label>
                <select
                  value={bulkServiceType}
                  onChange={(e) => setBulkServiceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="PI Regular">PI Regular</option>
                  <option value="P1 (250 HM)">P1 (250 HM)</option>
                  <option value="P2 (500 HM)">P2 (500 HM)</option>
                  <option value="P3 (1000 HM)">P3 (1000 HM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                <select
                  value={bulkShift}
                  onChange={(e) => setBulkShift(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="Shift 1">Shift 1 (Siang)</option>
                  <option value="Shift 2">Shift 2 (Malam)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSubmitBulkAdd}
                disabled={isSubmittingBulk || bulkSelectedUnits.length === 0}
                className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingBulk ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Menambahkan...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Tambahkan {bulkSelectedUnits.length} Unit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MODAL: UBAH TARGET PLAN HARIAN
      ---------------------------------------------------------- */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders size={16} className="text-[#e95623]" />
                  <span>Pengaturan Target Plan PI</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {targetModalMode === "global"
                    ? "Target plan harian default untuk seluruh hari"
                    : `Target plan khusus tanggal ${formatIndoDate(targetSpecificDate)}`}
                </p>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Unit per Hari
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={71}
                    value={targetInputNumber}
                    onChange={(e) => setTargetInputNumber(parseInt(e.target.value, 10) || 0)}
                    className="w-32 px-3 py-2 text-base font-black text-slate-800 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                    required
                  />
                  <span className="text-xs font-bold text-slate-500">Unit / Hari</span>
                </div>
              </div>

              {/* Population explanation */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Kalkulasi Siklus Inspeksi Armada:
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Dengan target <strong>{targetInputNumber} unit/hari</strong> pada{" "}
                  <strong>{selectedSite === "MuaraPahu" ? "Site Muara Pahu (70 Unit)" : "Site Senyiur (1 Unit)"}</strong>,
                  seluruh armada tuntas diinspeksi dalam estimasi{" "}
                  <strong>
                    {targetInputNumber > 0
                      ? Math.ceil((scheduleData?.primeMoverPopulation || 1) / targetInputNumber)
                      : 0}{" "}
                    hari kerja
                  </strong>
                  .
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTarget}
                  className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingTarget ? "Menyimpan..." : "Simpan Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MODAL: EDIT RINCIAN INSPEKSI
      ---------------------------------------------------------- */}
      {isEditModalOpen && itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 size={16} className="text-[#e95623]" />
                  <span>Edit Data Inspeksi: {itemToEdit.unitCode}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tanggal: {formatIndoDate(itemToEdit.date)}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={itemToEdit.status}
                  onChange={(e) => setItemToEdit({ ...itemToEdit, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Servis</label>
                  <select
                    value={itemToEdit.serviceType}
                    onChange={(e) => setItemToEdit({ ...itemToEdit, serviceType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value="PI Regular">PI Regular</option>
                    <option value="P1 (250 HM)">P1 (250 HM)</option>
                    <option value="P2 (500 HM)">P2 (500 HM)</option>
                    <option value="P3 (1000 HM)">P3 (1000 HM)</option>
                    <option value="P4 (2000 HM)">P4 (2000 HM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={itemToEdit.shift}
                    onChange={(e) => setItemToEdit({ ...itemToEdit, shift: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value="Shift 1">Shift 1 (Siang)</option>
                    <option value="Shift 2">Shift 2 (Malam)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mekanik / Inspector
                </label>
                <input
                  type="text"
                  value={itemToEdit.inspectorName || ""}
                  onChange={(e) =>
                    setItemToEdit({ ...itemToEdit, inspectorName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  placeholder="Nama mekanik atau workshop lead"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={itemToEdit.notes || ""}
                  onChange={(e) => setItemToEdit({ ...itemToEdit, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden"
                  placeholder="Keterangan / hasil inspeksi"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          Modal: PDF Presentation Export (A4 Landscape Weekly Deck)
      ---------------------------------------------------------- */}
      <PeriodicInspectionPdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        scheduleData={scheduleData}
        selectedSite={selectedSite}
        masterUnits={masterUnits}
        initialStartDate={detailRangeMode === "custom" ? detailCustomStart : undefined}
        initialEndDate={detailRangeMode === "custom" ? detailCustomEnd : undefined}
      />
    </div>
  );
};
