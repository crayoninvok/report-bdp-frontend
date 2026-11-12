"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { User } from "../types/auth";
import {
  DaySchedule,
  MasterUnit,
  PeriodicInspectionItem,
  PlantPersonnelItem,
  plantService,
  PmRadarResponse,
  PmRadarUnit,
  WeeklyScheduleData,
} from "../services/plantService";
import {
  getAchievementTheme,
  PeriodicInspectionPdfExportModal,
} from "./PeriodicInspectionPdfExportModal";
import { PreventiveMaintenanceRadarTab } from "./PreventiveMaintenanceRadarTab";
import { PeriodicServiceKpiSection } from "./PeriodicServiceKpiSection";
import {
  CompletionActualInput,
  PendingConfirmAction,
  PmBulkAddModal,
  PmConfirmModal,
  PmTargetModal,
  PmUnitFormModal,
  PmUnitFormValues,
} from "./PreventiveMaintenanceModals";
import {
  computePmTargetsClient,
  evaluatePmItemKpi,
  exportPmScheduleExcel,
  formatHm,
  formatKm,
  getPmStatusStyle,
  getPresetDateRange,
  parseIncludedTrailers,
  parseLeadTimeHours,
  PM_SERVICE_TYPES,
  PM_SHIFT_OPTIONS,
  PM_STATUS_OPTIONS,
  PS_CATEGORY_OPTIONS,
  PS_LEAD_TIME_OPTIONS,
  PS_START_TIME_OPTIONS,
  resolveMechanicsArray,
  resolvePsUnitCategory,
  resolveTrailerSummary,
} from "../utils/pmHelpers";

interface PreventiveMaintenanceViewProps {
  user: User;
  onNavigateToMasterUnit?: () => void;
}

type ActiveTabType = "weekly" | "detail" | "radar";

/** Shifts a YYYY-MM-DD date string by N days safely in local calendar time. */
function shiftDateString(dateStr: string, deltaDays: number): string {
  const parts = dateStr.split("-").map((n) => parseInt(n, 10));
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Extracts friendly Indonesian error messages from async API calls. */
function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Normalizes Actual Lead Time input (e.g. "9" -> "9 Jam") and parses Actual HM Servis. */
function buildActualKpiPayload(input?: {
  actualStartTime?: string;
  actualLeadTime?: string;
  actualHmServis?: string;
}) {
  const leadRaw = (input?.actualLeadTime || "").trim();
  const leadFormatted = leadRaw
    ? /jam|hr/i.test(leadRaw)
      ? leadRaw
      : `${leadRaw} Jam`
    : null;
  const hmRaw = (input?.actualHmServis || "").trim().replace(",", ".");
  const hmNum = hmRaw ? Number(hmRaw) : null;
  return {
    actualStartTime: (input?.actualStartTime || "").trim() || null,
    actualLeadTime: leadFormatted,
    actualHmServis: hmNum != null && Number.isFinite(hmNum) ? hmNum : null,
  };
}

export const PreventiveMaintenanceView: React.FC<
  PreventiveMaintenanceViewProps
> = ({ user, onNavigateToMasterUnit }) => {
  const defaultSite: "MuaraPahu" | "Senyiur" =
    user.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu";

  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur">(
    defaultSite
  );
  const [activeTab, setActiveTab] = useState<ActiveTabType>("weekly");
  const [anchorDate, setAnchorDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Core data states
  const [scheduleData, setScheduleData] = useState<WeeklyScheduleData | null>(null);
  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>([]);
  const [radarData, setRadarData] = useState<PmRadarUnit[]>([]);
  const [radarSummary, setRadarSummary] = useState<PmRadarResponse["summary"] | null>(
    null
  );
  const [telemetryMeta, setTelemetryMeta] = useState<
    PmRadarResponse["telemetryMeta"] | null
  >(null);

  // HR Plant Personnel (SPV Plant & Mechanics)
  const [hrSupervisors, setHrSupervisors] = useState<PlantPersonnelItem[]>([]);
  const [hrMechanics, setHrMechanics] = useState<PlantPersonnelItem[]>([]);

  const [isLoadingWeekly, setIsLoadingWeekly] = useState<boolean>(true);
  const [isLoadingRadar, setIsLoadingRadar] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);

  // Detail tab states
  const [detailPreset, setDetailPreset] = useState<
    "current" | "2weeks" | "month" | "custom"
  >("current");
  const [detailStart, setDetailStart] = useState<string>("");
  const [detailEnd, setDetailEnd] = useState<string>("");
  const [detailScheduleData, setDetailScheduleData] =
    useState<WeeklyScheduleData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailSearch, setDetailSearch] = useState<string>("");
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>("ALL");
  const [detailShiftFilter, setDetailShiftFilter] = useState<string>("ALL");
  const [detailServiceFilter, setDetailServiceFilter] = useState<string>("ALL");

  // Lead mechanic drafts per day
  const [leadDrafts, setLeadDrafts] = useState<Record<string, string>>({});

  // Toast notification state
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 4500);
    },
    []
  );

  // Modal states
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [kpiActiveRange, setKpiActiveRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [pdfRangeOverride, setPdfRangeOverride] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [unitModalState, setUnitModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    editItemId?: string;
    initialValues: PmUnitFormValues;
  }>({
    isOpen: false,
    mode: "add",
    initialValues: {
      date: new Date().toISOString().slice(0, 10),
      unitCode: "",
      serviceType: PM_SERVICE_TYPES[0],
      shift: "Shift 1",
      status: "Scheduled",
      category: PS_CATEGORY_OPTIONS[0],
      planStartTime: PS_START_TIME_OPTIONS[1],
      planLeadTime: PS_LEAD_TIME_OPTIONS[3],
      planHmServis: "",
      actualStartTime: "",
      actualLeadTime: "",
      actualHmServis: "",
      supervisorName: "",
      mechanicNames: [],
      includedTrailers: [],
      currentKm: "",
      currentHm: "",
      nextDueKm: "",
      nextDueHm: "",
      notes: "",
    },
  });

  const [bulkModalDate, setBulkModalDate] = useState<string | null>(null);
  const [targetModalState, setTargetModalState] = useState<{
    isOpen: boolean;
    specificDate: string | null;
    specificDayTarget: number | null;
  }>({
    isOpen: false,
    specificDate: null,
    specificDayTarget: null,
  });
  const [confirmAction, setConfirmAction] =
    useState<PendingConfirmAction | null>(null);

  // Load weekly schedule & master units
  const fetchWeeklyAndUnits = useCallback(async () => {
    try {
      setIsLoadingWeekly(true);
      const [weeklyRes, unitsRes] = await Promise.all([
        plantService.getPmWeeklySchedule(anchorDate, selectedSite),
        plantService.getMasterUnits({
          withTrailers: true,
          site: selectedSite,
        }),
      ]);
      setScheduleData(weeklyRes);
      setMasterUnits(unitsRes.data || []);

      const drafts: Record<string, string> = {};
      weeklyRes.days.forEach((d) => {
        drafts[d.date] = d.leadMechanic || d.leadInspector || "";
      });
      setLeadDrafts(drafts);
    } catch (err) {
      showToast(
        "error",
        getErrorMessage(err, "Gagal memuat jadwal Periodic Service")
      );
    } finally {
      setIsLoadingWeekly(false);
    }
  }, [anchorDate, selectedSite, showToast]);

  // Load live Volvo KM/HM Radar
  const fetchRadar = useCallback(
    async (forceSync = false) => {
      try {
        setIsLoadingRadar(true);
        const res = await plantService.getPmRadar(selectedSite, forceSync);
        setRadarData(res.data || []);
        setRadarSummary(res.summary || null);
        setTelemetryMeta(res.telemetryMeta || null);
      } catch (err) {
        console.error("Failed to fetch Periodic Service radar:", err);
      } finally {
        setIsLoadingRadar(false);
      }
    },
    [selectedSite]
  );

  // Load HR Plant Supervisors & Mechanics
  const fetchPersonnel = useCallback(async () => {
    try {
      const res = await plantService.getPlantPersonnel(selectedSite);
      setHrSupervisors(res.data?.supervisors || []);
      setHrMechanics(res.data?.mechanics || []);
    } catch (err) {
      console.error("Failed to fetch HR Plant personnel:", err);
    }
  }, [selectedSite]);

  useEffect(() => {
    fetchWeeklyAndUnits();
  }, [fetchWeeklyAndUnits]);

  useEffect(() => {
    fetchRadar(false);
  }, [fetchRadar]);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  // Keep detail date range synced with active week when preset is "current"
  useEffect(() => {
    if (detailPreset === "current" && scheduleData?.weekRange) {
      setDetailStart(scheduleData.weekRange.startDate);
      setDetailEnd(scheduleData.weekRange.endDate);
      setDetailScheduleData(scheduleData);
    }
  }, [detailPreset, scheduleData]);

  const fetchDetailRange = useCallback(
    async (startStr: string, endStr: string) => {
      if (!startStr || !endStr) return;
      try {
        setIsLoadingDetail(true);
        const data = await plantService.getPmWeeklySchedule(
          undefined,
          selectedSite,
          startStr,
          endStr
        );
        setDetailScheduleData(data);
      } catch (err) {
        showToast(
          "error",
          getErrorMessage(err, "Gagal memuat detail periode servis")
        );
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [selectedSite, showToast]
  );

  const handleSelectDetailPreset = (preset: "current" | "2weeks" | "month") => {
    setDetailPreset(preset);
    if (preset === "current" && scheduleData?.weekRange) {
      setDetailStart(scheduleData.weekRange.startDate);
      setDetailEnd(scheduleData.weekRange.endDate);
      setDetailScheduleData(scheduleData);
      return;
    }
    const { startDate, endDate } = getPresetDateRange(
      preset,
      scheduleData?.weekRange.startDate,
      scheduleData?.weekRange.endDate
    );
    setDetailStart(startDate);
    setDetailEnd(endDate);
    fetchDetailRange(startDate, endDate);
  };

  // All active service units (Head Prime Mover, Vessel 1, Dolly, Vessel 2) can be scheduled independently
  const activeServiceUnits = useMemo(
    () => masterUnits.filter((u) => u.status === "Active"),
    [masterUnits]
  );

  const radarMap = useMemo(() => {
    const map = new Map<string, PmRadarUnit>();
    radarData.forEach((u) => map.set(u.unitCode, u));
    return map;
  }, [radarData]);

  // Flattened Detail Rows with filtering
  const activeDetailSource = detailScheduleData || scheduleData;
  const filteredDetailRows = useMemo(() => {
    if (!activeDetailSource?.days) return [];
    const q = detailSearch.trim().toLowerCase();
    const rows: Array<
      PeriodicInspectionItem & { dayName: string; leadName?: string | null }
    > = [];

    for (const day of activeDetailSource.days) {
      for (const item of day.items) {
        if (detailStatusFilter !== "ALL" && item.status !== detailStatusFilter) continue;
        if (detailShiftFilter !== "ALL" && item.shift !== detailShiftFilter) continue;
        if (detailServiceFilter !== "ALL" && item.serviceType !== detailServiceFilter) {
          continue;
        }
        const buntut = resolveTrailerSummary(item, masterUnits);
        if (q) {
          const hay = `${item.unitCode} ${buntut} ${item.serviceType} ${
            item.category || ""
          } ${item.supervisorName || ""} ${item.mechanicName || ""} ${
            item.notes || ""
          }`.toLowerCase();
          if (!hay.includes(q)) continue;
        }
        rows.push({
          ...item,
          dayName: day.dayName,
          leadName: day.leadMechanic || day.leadInspector,
        });
      }
    }
    return rows;
  }, [
    activeDetailSource,
    masterUnits,
    detailSearch,
    detailStatusFilter,
    detailShiftFilter,
    detailServiceFilter,
  ]);

  // Refresh helper after any mutation
  const refreshAll = async () => {
    await Promise.all([
      fetchWeeklyAndUnits(),
      fetchRadar(false),
      detailPreset !== "current" && detailStart && detailEnd
        ? fetchDetailRange(detailStart, detailEnd)
        : Promise.resolve(),
    ]);
  };

  // Handlers
  const openAddModal = (date: string, prefillRadar?: PmRadarUnit) => {
    if (hrSupervisors.length === 0 || hrMechanics.length === 0) {
      void fetchPersonnel();
    }
    const km = prefillRadar?.liveKm ?? null;
    const hm = prefillRadar?.liveHm ?? null;
    const serviceType =
      prefillRadar?.recommendedServiceType || PM_SERVICE_TYPES[0];
    const targets = computePmTargetsClient(serviceType, km, hm);
    const autoPlanHm = prefillRadar?.targetHm
      ? `Target ${prefillRadar.targetHm.toLocaleString("id-ID")} HM (${
          prefillRadar.hmServiceLabel || "Live Volvo"
        })`
      : "";

    setUnitModalState({
      isOpen: true,
      mode: "add",
      initialValues: {
        date,
        unitCode: prefillRadar?.unitCode || "",
        serviceType,
        shift: "Shift 1",
        status: "Scheduled",
        category: PS_CATEGORY_OPTIONS[0],
        planStartTime: PS_START_TIME_OPTIONS[1],
        planLeadTime: PS_LEAD_TIME_OPTIONS[3],
        planHmServis: autoPlanHm,
        actualStartTime: "",
        actualLeadTime: "",
        actualHmServis: "",
        supervisorName: "",
        mechanicNames: [],
        includedTrailers: [],
        currentKm: km != null ? String(km) : "",
        currentHm: hm != null ? String(hm) : "",
        nextDueKm: targets.nextDueKm != null ? String(targets.nextDueKm) : "",
        nextDueHm: targets.nextDueHm != null ? String(targets.nextDueHm) : "",
        notes: "",
      },
    });
  };

  const openEditModal = (item: PeriodicInspectionItem) => {
    if (hrSupervisors.length === 0 || hrMechanics.length === 0) {
      void fetchPersonnel();
    }
    const existingActualLead = parseLeadTimeHours(item.actualLeadTime);
    setUnitModalState({
      isOpen: true,
      mode: "edit",
      editItemId: item.id,
      initialValues: {
        date: item.date,
        unitCode: item.unitCode,
        serviceType: item.serviceType || PM_SERVICE_TYPES[0],
        shift: item.shift || "Shift 1",
        status: item.status || "Scheduled",
        category: item.category || PS_CATEGORY_OPTIONS[0],
        planStartTime: item.planStartTime || "",
        planLeadTime: item.planLeadTime || "",
        planHmServis: item.planHmServis || "",
        actualStartTime: item.actualStartTime || "",
        actualLeadTime: existingActualLead != null ? String(existingActualLead) : "",
        actualHmServis:
          item.actualHmServis != null ? String(item.actualHmServis) : "",
        supervisorName: item.supervisorName || "",
        mechanicNames: resolveMechanicsArray(item),
        includedTrailers: parseIncludedTrailers(item.buntutSummary),
        currentKm:
          item.currentKm != null
            ? String(item.currentKm)
            : item.liveKm != null
            ? String(item.liveKm)
            : "",
        currentHm:
          item.currentHm != null
            ? String(item.currentHm)
            : item.liveHm != null
            ? String(item.liveHm)
            : "",
        nextDueKm: item.nextDueKm != null ? String(item.nextDueKm) : "",
        nextDueHm: item.nextDueHm != null ? String(item.nextDueHm) : "",
        notes: item.notes || "",
      },
    });
  };

  const handleSubmitUnitModal = async (values: PmUnitFormValues) => {
    try {
      setIsMutating(true);
      const actualPayload = buildActualKpiPayload({
        actualStartTime: values.actualStartTime,
        actualLeadTime: values.actualLeadTime,
        actualHmServis: values.actualHmServis,
      });
      const payload = {
        serviceType: values.serviceType,
        shift: values.shift,
        status: values.status,
        category: values.category,
        planStartTime: values.planStartTime,
        planLeadTime: values.planLeadTime,
        planHmServis: values.planHmServis,
        ...actualPayload,
        supervisorName: values.supervisorName,
        mechanicNames: values.mechanicNames,
        mechanicName: values.mechanicNames.join(", "),
        includedTrailers: values.includedTrailers,
        buntutSummary: values.includedTrailers.join(", "),
        currentKm: values.currentKm ? Number(values.currentKm) : null,
        currentHm: values.currentHm ? Number(values.currentHm) : null,
        nextDueKm: values.nextDueKm ? Number(values.nextDueKm) : null,
        nextDueHm: values.nextDueHm ? Number(values.nextDueHm) : null,
        notes: values.notes,
      };

      if (unitModalState.mode === "add") {
        await plantService.addPmItem({
          date: values.date,
          unitCode: values.unitCode,
          jobSite: selectedSite,
          ...payload,
        });
        showToast(
          "success",
          `Unit ${values.unitCode} berhasil dijadwalkan Periodic Service.`
        );
      } else if (unitModalState.editItemId) {
        await plantService.updatePmItem(unitModalState.editItemId, payload);
        showToast(
          "success",
          `Jadwal Periodic Service ${values.unitCode} berhasil diperbarui.`
        );
      }

      setUnitModalState((prev) => ({ ...prev, isOpen: false }));
      await refreshAll();
    } catch (err) {
      showToast(
        "error",
        getErrorMessage(err, "Gagal menyimpan jadwal Periodic Service")
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleBulkAddSubmit = async (payload: {
    date: string;
    unitCodes: string[];
    serviceType: string;
    shift: string;
  }) => {
    try {
      setIsMutating(true);
      await plantService.bulkAddPmItems({ ...payload, jobSite: selectedSite });
      showToast(
        "success",
        `${payload.unitCodes.length} unit ditambahkan ke jadwal Periodic Service ${payload.date}.`
      );
      setBulkModalDate(null);
      await refreshAll();
    } catch (err) {
      showToast(
        "error",
        getErrorMessage(err, "Gagal menjadwalkan unit massal")
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmAction = async (actualInput?: CompletionActualInput) => {
    if (!confirmAction) return;
    try {
      setIsMutating(true);
      if (confirmAction.type === "status") {
        const actualPayload = actualInput
          ? buildActualKpiPayload(actualInput)
          : undefined;
        await plantService.updatePmItem(confirmAction.item.id, {
          status: confirmAction.nextStatus,
          ...(actualPayload || {}),
        });
        showToast(
          "success",
          `Status ${confirmAction.item.unitCode} diubah ke ${confirmAction.nextStatus}.`
        );
      } else {
        await plantService.deletePmItem(confirmAction.item.id);
        showToast(
          "success",
          `Jadwal Periodic Service ${confirmAction.item.unitCode} dihapus.`
        );
      }
      setConfirmAction(null);
      await refreshAll();
    } catch (err) {
      showToast("error", getErrorMessage(err, "Gagal memproses perubahan"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveLeadMechanic = async (date: string) => {
    const draft = (leadDrafts[date] || "").trim();
    const dayObj = scheduleData?.days.find((d) => d.date === date);
    const existing = (dayObj?.leadMechanic || dayObj?.leadInspector || "").trim();
    if (draft === existing) return;

    try {
      await plantService.upsertPmDailyPlan({
        date,
        leadMechanic: draft || null,
        jobSite: selectedSite,
      });
      showToast("success", `Lead Pengawas tanggal ${date} disimpan.`);
      await fetchWeeklyAndUnits();
    } catch (err) {
      showToast("error", getErrorMessage(err, "Gagal menyimpan Lead Pengawas"));
    }
  };

  const handleAutoScheduleDueUnits = async () => {
    try {
      setIsMutating(true);
      const res = await plantService.autoScheduleDuePmUnits(
        scheduleData?.weekRange.startDate || anchorDate,
        selectedSite
      );
      showToast(
        "success",
        res.message || "Unit Overdue & Due Soon berhasil dijadwalkan."
      );
      await refreshAll();
    } catch (err) {
      showToast(
        "error",
        getErrorMessage(err, "Gagal auto-jadwalkan unit Due Soon")
      );
    } finally {
      setIsMutating(false);
    }
  };

  const bulkExistingCodes = useMemo(() => {
    if (!bulkModalDate || !scheduleData) return new Set<string>();
    const day = scheduleData.days.find((d) => d.date === bulkModalDate);
    return new Set((day?.items || []).map((i) => i.unitCode));
  }, [bulkModalDate, scheduleData]);

  const achievementPct = scheduleData?.summary?.achievementPercent || 0;
  const kpiTheme = getAchievementTheme(achievementPct);

  return (
    <div className="space-y-6 pb-10">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* HERO BANNER                                                         */}
      {/* =================================================================== */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg-plantmaintenance.jpeg')" }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/95 via-slate-900/88 to-slate-900/70" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#e95623] text-white shadow-sm">
                <ShieldCheck size={13} />
                Plant &amp; Maintenance • Periodic Service (PS)
              </span>
              {telemetryMeta && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  <Radio size={12} className="animate-pulse text-emerald-300" />
                  Volvo Live: {telemetryMeta.onlineCount} Unit Online
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Periodic Service Unit Hauling
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Penjadwalan servis berkala{" "}
              <strong className="text-white">Head, Dolly &amp; Vessel</strong>{" "}
              secara mandiri berbasis interval{" "}
              <strong className="text-white">KM (PS1/PS2/PS3)</strong> &amp;{" "}
              <strong className="text-white">HM (P1/P2/P3/P4)</strong>.
            </p>
          </div>

          {/* Controls Strip */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Site Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              {(["MuaraPahu", "Senyiur"] as const).map((site) => (
                <button
                  key={site}
                  type="button"
                  onClick={() => setSelectedSite(site)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedSite === site
                      ? "bg-[#e95623] text-white shadow-md"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {site === "MuaraPahu" ? "Site Muara Pahu" : "Site Senyiur"}
                </button>
              ))}
            </div>

            {/* Export PDF Presentasi */}
            <button
              type="button"
              onClick={() => {
                setPdfRangeOverride(
                  activeTab === "detail"
                    ? { startDate: detailStart, endDate: detailEnd }
                    : kpiActiveRange
                );
                setIsPdfModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-all cursor-pointer"
            >
              <FileText size={15} className="text-[#e95623]" />
              <span>Export PDF Presentasi</span>
            </button>

            {/* Target Plan Harian */}
            <button
              type="button"
              onClick={() =>
                setTargetModalState({
                  isOpen: true,
                  specificDate: null,
                  specificDayTarget: null,
                })
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/12 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            >
              <Settings2 size={15} className="text-orange-300" />
              <span>
                Target: {scheduleData?.defaultDailyTarget ?? 4} Unit/Hari
              </span>
            </button>

            {onNavigateToMasterUnit && (
              <button
                type="button"
                onClick={onNavigateToMasterUnit}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all cursor-pointer"
              >
                <Database size={14} />
                <span>Master Unit</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => refreshAll()}
              disabled={isLoadingWeekly || isLoadingRadar}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white/12 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isLoadingWeekly || isLoadingRadar ? "animate-spin" : ""}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* KPI PERIODIC SERVICE (PM COMPLIANCE & AKURASI FORMULA)              */}
      {/* =================================================================== */}
      <PeriodicServiceKpiSection
        scheduleData={scheduleData}
        selectedSite={selectedSite}
        isLoadingWeekly={isLoadingWeekly}
        masterUnits={masterUnits}
        onRangeChange={setKpiActiveRange}
        onExportPdf={(range) => {
          setPdfRangeOverride(range);
          setIsPdfModalOpen(true);
        }}
        onJumpToDetail={({ startDate, endDate }) => {
          setActiveTab("detail");
          setDetailPreset("custom");
          setDetailStart(startDate);
          setDetailEnd(endDate);
          fetchDetailRange(startDate, endDate);
        }}
      />

      {/* =================================================================== */}
      {/* TAB SWITCHER BAR                                                    */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "weekly"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={15} className={activeTab === "weekly" ? "text-[#e95623]" : ""} />
            <span>Tabel Jadwal Mingguan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("detail")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "detail"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wrench size={15} className={activeTab === "detail" ? "text-[#e95623]" : ""} />
            <span>Daftar Detail Periodic Service</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "radar"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gauge size={15} className={activeTab === "radar" ? "text-[#e95623]" : ""} />
            <span>Radar KM/HM Volvo</span>
            {(radarSummary?.overdueCount || 0) + (radarSummary?.dueSoonCount || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                {(radarSummary?.overdueCount || 0) + (radarSummary?.dueSoonCount || 0)}
              </span>
            )}
          </button>
        </div>

        {/* Week Navigation on Weekly Tab */}
        {activeTab === "weekly" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setAnchorDate((d) => shiftDateString(d, -7))}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Minggu Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs font-black text-slate-800 whitespace-nowrap">
                {scheduleData?.weekRange.formatted || "Memuat minggu..."}
              </span>
              <button
                type="button"
                onClick={() => setAnchorDate((d) => shiftDateString(d, 7))}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Minggu Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAnchorDate(new Date().toISOString().slice(0, 10))}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              Minggu Ini
            </button>

            <button
              type="button"
              disabled={isMutating}
              onClick={handleAutoScheduleDueUnits}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Auto-Jadwalkan Unit Due Soon</span>
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: TABEL JADWAL MINGGUAN (SAMA SEPERTI PI TABEL UNIT)           */}
      {/* =================================================================== */}
      {activeTab === "weekly" && (
        <div className="space-y-5">
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Total Plan Minggu</span>
                <Calendar size={16} className="text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {scheduleData?.summary.totalWeekPlan ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-500">Unit Servis</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Default target: {scheduleData?.defaultDailyTarget ?? 4} unit / hari kerja
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Total Unit Terjadwal</span>
                <Truck size={16} className="text-[#e95623]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {scheduleData?.summary.totalWeekScheduled ?? 0}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ({scheduleData?.summary.scheduledPercent ?? 0}% dari Plan)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Populasi aktif {selectedSite}: {scheduleData?.primeMoverPopulation ?? 0}{" "}
                Prime Mover
              </p>
            </div>

            <div
              className={`${kpiTheme.cardBg} border ${kpiTheme.border} rounded-2xl p-4 shadow-2xs`}
            >
              <div
                className={`flex items-center justify-between text-xs font-bold ${kpiTheme.titleText} uppercase tracking-wider`}
              >
                <span>Servis Selesai (Completed)</span>
                <Activity size={16} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${kpiTheme.valText} font-mono`}>
                  {scheduleData?.summary.totalWeekCompleted ?? 0}
                </span>
                <span className={`text-xs font-bold ${kpiTheme.subText}`}>
                  / {scheduleData?.summary.totalWeekPlan ?? 0} ({achievementPct}%)
                </span>
              </div>
              <div
                className={`w-full ${kpiTheme.barTrack} rounded-full h-1.5 mt-2 overflow-hidden`}
              >
                <div
                  className={`h-1.5 rounded-full ${kpiTheme.barFill} transition-all`}
                  style={{ width: `${Math.min(100, achievementPct)}%` }}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Radar Kesiapan Armada</span>
                <Gauge size={16} className="text-amber-600" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-rose-100 text-rose-700 font-mono">
                  {radarSummary?.overdueCount ?? 0} Overdue
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800 font-mono">
                  {radarSummary?.dueSoonCount ?? 0} Due Soon
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("radar")}
                className="text-[11px] font-bold text-[#e95623] hover:underline mt-2 cursor-pointer"
              >
                Buka Radar KM/HM Unit &rarr;
              </button>
            </div>
          </div>

          {/* HR SPV Plant Datalist for Quick Day Lead Selection */}
          <datalist id="ps-lead-spv-options">
            {hrSupervisors.map((spv) => (
              <option key={spv.id} value={spv.fullName} />
            ))}
          </datalist>

          {/* 7-Day Monday-Sunday Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {(scheduleData?.days || []).map((day: DaySchedule) => {
              const pct =
                day.targetUnits > 0
                  ? Math.round((day.completedCount / day.targetUnits) * 100)
                  : 0;
              const dayTheme = getAchievementTheme(pct);

              return (
                <div
                  key={day.date}
                  className={`flex flex-col rounded-2xl border bg-white shadow-2xs overflow-hidden min-h-112 ${
                    day.isToday
                      ? "border-[#e95623] ring-2 ring-orange-500/20"
                      : "border-slate-200"
                  }`}
                >
                  {/* Day Column Header */}
                  <div
                    className={`p-3 border-b ${
                      day.isToday
                        ? "bg-orange-50/70 border-orange-200"
                        : "bg-slate-50/80 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">
                            {day.dayName}
                          </span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#e95623] text-white uppercase">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {day.dayDateFormatted}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setTargetModalState({
                            isOpen: true,
                            specificDate: day.date,
                            specificDayTarget: day.targetUnits,
                          })
                        }
                        title="Klik untuk ubah plan target hari ini"
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono cursor-pointer border transition-all ${
                          day.completedCount >= day.targetUnits && day.targetUnits > 0
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-white text-slate-700 border-slate-200 hover:border-[#e95623]"
                        }`}
                      >
                        {day.completedCount}/{day.targetUnits}
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          day.completedCount === 0 ? "bg-transparent" : dayTheme.barFill
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* Lead Pengawas Inline Input */}
                    <div className="mt-2 flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
                      <UserCheck size={12} className="text-[#e95623] shrink-0" />
                      <input
                        type="text"
                        list="ps-lead-spv-options"
                        value={leadDrafts[day.date] ?? ""}
                        onChange={(e) =>
                          setLeadDrafts((p) => ({
                            ...p,
                            [day.date]: e.target.value,
                          }))
                        }
                        onBlur={() => handleSaveLeadMechanic(day.date)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder="Lead Pengawas..."
                        className="w-full text-[10px] font-bold text-slate-700 bg-transparent focus:outline-none truncate"
                      />
                    </div>

                    {/* Action Strip */}
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openAddModal(day.date)}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-black bg-[#e95623] hover:bg-[#d44818] text-white cursor-pointer transition-all"
                      >
                        <Plus size={11} />
                        <span>Unit Servis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkModalDate(day.date)}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-all"
                      >
                        <Layers size={11} />
                        <span>Massal</span>
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Unit Cards */}
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto bg-slate-50/40">
                    {isLoadingWeekly && day.items.length === 0 ? (
                      <div className="py-10 text-center text-[11px] text-slate-400">
                        Memuat...
                      </div>
                    ) : day.items.length === 0 ? (
                      <div className="py-10 text-center text-[11px] text-slate-400 px-2">
                        Belum ada jadwal Periodic Service hari ini
                      </div>
                    ) : (
                      day.items.map((item) => {
                        const style = getPmStatusStyle(item.status);
                        const unitCat = resolvePsUnitCategory(item, masterUnits);
                        const trailerText = resolveTrailerSummary(item, masterUnits);
                        const hasExplicitBuntut = Boolean(item.buntutSummary?.trim());
                        const radar =
                          unitCat === "Prime Mover"
                            ? radarMap.get(item.unitCode)
                            : undefined;
                        const displayKm = item.currentKm ?? item.liveKm ?? radar?.liveKm;
                        const displayHm = item.currentHm ?? item.liveHm ?? radar?.liveHm;
                        const mechList = resolveMechanicsArray(item);
                        const kpiEval = evaluatePmItemKpi(item);
                        const hasAnyActual =
                          item.actualHmServis != null ||
                          Boolean(item.actualStartTime) ||
                          Boolean(item.actualLeadTime);

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border transition-all shadow-2xs space-y-1.5 ${style.card}`}
                          >
                            {/* Header Row: Unit + Status */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Truck size={13} className={`${style.icon} shrink-0`} />
                                <span className="font-mono font-black text-xs text-slate-900 truncate">
                                  {item.unitCode}
                                </span>
                              </div>

                              <select
                                value={item.status}
                                onChange={(e) => {
                                  const nextStatus = e.target.value;
                                  if (nextStatus !== item.status) {
                                    setConfirmAction({
                                      type: "status",
                                      item,
                                      nextStatus,
                                    });
                                  }
                                }}
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border cursor-pointer focus:outline-none ${style.select}`}
                              >
                                {PM_STATUS_OPTIONS.map((st) => (
                                  <option
                                    key={st}
                                    value={st}
                                    className="bg-white text-slate-900"
                                  >
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Category / Optional Companion Buntut */}
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              •{" "}
                              {hasExplicitBuntut
                                ? `Ikut PS: ${trailerText}`
                                : unitCat === "Prime Mover"
                                ? "Head Only (Buntut terpisah)"
                                : trailerText}
                            </div>

                            {/* Service Type + Shift */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-orange-100/80 text-[#c74315] text-[9.5px] font-extrabold truncate">
                                {item.serviceType}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold shrink-0">
                                {item.shift === "Shift 2" ? "S2" : "S1"}
                              </span>
                            </div>

                            {/* Kategori + Plan Start Time / Lead Time */}
                            {(item.category || item.planStartTime || item.planLeadTime) && (
                              <div className="flex flex-wrap items-center gap-1 text-[9px] text-slate-600">
                                {item.category && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold truncate max-w-24">
                                    {item.category}
                                  </span>
                                )}
                                {(item.planStartTime || item.planLeadTime) && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-mono font-bold">
                                    <Clock size={9} />
                                    {item.planStartTime || "--:--"}
                                    {item.planLeadTime ? ` • ${item.planLeadTime}` : ""}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Actual KPI Mini Badges */}
                            {item.status === "Completed" && hasAnyActual && (
                              <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono font-bold">
                                {kpiEval.hm.actualVal != null && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded ${
                                      kpiEval.hm.pass === true
                                        ? "bg-emerald-100 text-emerald-700"
                                        : kpiEval.hm.pass === false
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    HM {kpiEval.hm.actualVal}
                                    {kpiEval.hm.pass === true
                                      ? " ✓"
                                      : kpiEval.hm.pass === false
                                      ? " ✗"
                                      : ""}
                                  </span>
                                )}
                                {item.actualStartTime && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded ${
                                      kpiEval.startTime.pass === true
                                        ? "bg-emerald-100 text-emerald-700"
                                        : kpiEval.startTime.pass === false
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    Start {item.actualStartTime}
                                    {kpiEval.startTime.pass === true
                                      ? " ✓"
                                      : kpiEval.startTime.pass === false
                                      ? " ✗"
                                      : ""}
                                  </span>
                                )}
                                {item.actualLeadTime && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded ${
                                      kpiEval.leadTime.pass === true
                                        ? "bg-emerald-100 text-emerald-700"
                                        : kpiEval.leadTime.pass === false
                                        ? "bg-rose-100 text-rose-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    Lead {item.actualLeadTime}
                                    {kpiEval.leadTime.pass === true
                                      ? " ✓"
                                      : kpiEval.leadTime.pass === false
                                      ? " ✗"
                                      : ""}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Live / Recorded KM & HM Pill */}
                            {(displayKm != null || displayHm != null) && (
                              <div className="px-2 py-1 rounded-lg bg-slate-900/5 text-[9.5px] font-mono text-slate-700 flex items-center justify-between gap-1">
                                <span>{formatKm(displayKm)}</span>
                                <span className="text-slate-400">|</span>
                                <span>{formatHm(displayHm)}</span>
                              </div>
                            )}

                            {/* Pengawas + Mekanik summary */}
                            {(item.supervisorName || mechList.length > 0) && (
                              <div className="text-[9.5px] text-slate-600 space-y-0.5">
                                {item.supervisorName && (
                                  <div className="truncate font-semibold">
                                    SPV: {item.supervisorName}
                                  </div>
                                )}
                                {mechList.length > 0 && (
                                  <div className="flex items-center gap-1 truncate text-slate-500">
                                    <Users size={10} className="shrink-0 text-[#e95623]" />
                                    <span className="truncate">
                                      {mechList.join(", ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Footer Notes + Actions */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="text-[9.5px] text-slate-500 truncate max-w-28">
                                {item.notes || item.planHmServis || "Workshop Team"}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  title="Edit Detail Servis"
                                  className="p-1 rounded-md hover:bg-slate-200/70 text-slate-600 cursor-pointer"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmAction({ type: "delete", item })
                                  }
                                  title="Hapus Jadwal Servis"
                                  className="p-1 rounded-md hover:bg-rose-100 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: DAFTAR DETAIL PERIODIC SERVICE & EXPORT EXCEL                */}
      {/* =================================================================== */}
      {activeTab === "detail" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
            {/* Fixed Date Range Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "current", label: "Minggu Aktif" },
                    { id: "2weeks", label: "2 Minggu" },
                    { id: "month", label: "Bulan Ini" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectDetailPreset(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      detailPreset === p.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="date"
                    value={detailStart}
                    onChange={(e) => {
                      setDetailPreset("custom");
                      setDetailStart(e.target.value);
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <span className="text-xs text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={detailEnd}
                    onChange={(e) => {
                      setDetailPreset("custom");
                      setDetailEnd(e.target.value);
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fetchDetailRange(detailStart, detailEnd)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-[#e95623] border border-orange-200 hover:bg-orange-100 cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportPmScheduleExcel({
                      days: activeDetailSource?.days || [],
                      filteredRows: filteredDetailRows,
                      masterUnits,
                      selectedSite,
                      startDate: detailStart,
                      endDate: detailEnd,
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfRangeOverride({ startDate: detailStart, endDate: detailEnd });
                    setIsPdfModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white shadow-xs cursor-pointer"
                >
                  <FileText size={15} />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  placeholder="Cari unit, buntut, pengawas, mekanik..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <select
                value={detailStatusFilter}
                onChange={(e) => setDetailStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ALL">Semua Status</option>
                {PM_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <select
                value={detailServiceFilter}
                onChange={(e) => setDetailServiceFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ALL">Semua Tipe Servis</option>
                {PM_SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <select
                value={detailShiftFilter}
                onChange={(e) => setDetailShiftFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="ALL">Semua Shift</option>
                {PM_SHIFT_OPTIONS.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detail Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Tanggal &amp; Hari</th>
                    <th className="py-3 px-4">Unit Head &amp; Buntut</th>
                    <th className="py-3 px-4">Tipe, Kategori &amp; Plan</th>
                    <th className="py-3 px-4">KM / HM &amp; Target</th>
                    <th className="py-3 px-4">Shift, Pengawas &amp; Mekanik</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingDetail ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Memuat data periode Periodic Service...
                      </td>
                    </tr>
                  ) : filteredDetailRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada jadwal Periodic Service pada rentang tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    filteredDetailRows.map((row) => {
                      const stStyle = getPmStatusStyle(row.status);
                      const unitCat = resolvePsUnitCategory(row, masterUnits);
                      const trailerText = resolveTrailerSummary(row, masterUnits);
                      const hasExplicitBuntut = Boolean(row.buntutSummary?.trim());
                      const mechList = resolveMechanicsArray(row);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">
                              {row.date}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {row.dayName}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-slate-900">
                                {row.unitCode}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                {unitCat}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {hasExplicitBuntut
                                ? `Ikut PS: ${trailerText}`
                                : trailerText}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-[#c74315] font-extrabold text-[11px] border border-orange-200">
                                {row.serviceType}
                              </span>
                              {row.category && (
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  {row.category}
                                </span>
                              )}
                            </div>
                            {(row.planStartTime || row.planLeadTime || row.planHmServis) && (
                              <div className="text-[11px] text-slate-600 mt-1 font-mono">
                                Plan: {row.planStartTime ? `Start ${row.planStartTime}` : "-"}
                                {row.planLeadTime ? ` • Lead ${row.planLeadTime}` : ""}
                                {row.planHmServis ? ` • ${row.planHmServis}` : ""}
                              </div>
                            )}
                            {(row.actualStartTime ||
                              row.actualLeadTime ||
                              row.actualHmServis != null) && (() => {
                              const rowKpi = evaluatePmItemKpi(row);
                              return (
                                <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] font-mono font-bold">
                                  {row.actualStartTime && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded ${
                                        rowKpi.startTime.pass === true
                                          ? "bg-emerald-100 text-emerald-700"
                                          : rowKpi.startTime.pass === false
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      Act Start {row.actualStartTime}
                                      {rowKpi.startTime.pass === true
                                        ? " ✓"
                                        : rowKpi.startTime.pass === false
                                        ? " ✗"
                                        : ""}
                                    </span>
                                  )}
                                  {row.actualLeadTime && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded ${
                                        rowKpi.leadTime.pass === true
                                          ? "bg-emerald-100 text-emerald-700"
                                          : rowKpi.leadTime.pass === false
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      Act Lead {row.actualLeadTime}
                                      {rowKpi.leadTime.pass === true
                                        ? " ✓"
                                        : rowKpi.leadTime.pass === false
                                        ? " ✗"
                                        : ""}
                                    </span>
                                  )}
                                  {row.actualHmServis != null && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded ${
                                        rowKpi.hm.pass === true
                                          ? "bg-emerald-100 text-emerald-700"
                                          : rowKpi.hm.pass === false
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      Act HM {row.actualHmServis}
                                      {rowKpi.hm.pass === true
                                        ? " ✓"
                                        : rowKpi.hm.pass === false
                                        ? " ✗"
                                        : ""}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                            {row.notes && (
                              <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate">
                                {row.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div>
                              <strong>{formatKm(row.currentKm ?? row.liveKm)}</strong>
                              {row.nextDueKm ? (
                                <span className="text-slate-400">
                                  {" "}
                                  &rarr; {formatKm(row.nextDueKm)}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-slate-500">
                              {formatHm(row.currentHm ?? row.liveHm)}
                              {row.nextDueHm ? ` -> ${formatHm(row.nextDueHm)}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{row.shift}</div>
                            {(row.supervisorName || row.leadName) && (
                              <div className="text-[11px] text-slate-600 font-semibold">
                                Pengawas: {row.supervisorName || row.leadName}
                              </div>
                            )}
                            {mechList.length > 0 && (
                              <div className="text-[11px] text-slate-500 max-w-52">
                                Mekanik: {mechList.join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={row.status}
                              onChange={(e) => {
                                const nextStatus = e.target.value;
                                if (nextStatus !== row.status) {
                                  setConfirmAction({
                                    type: "status",
                                    item: row,
                                    nextStatus,
                                  });
                                }
                              }}
                              className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border cursor-pointer ${stStyle.select}`}
                            >
                              {PM_STATUS_OPTIONS.map((st) => (
                                <option
                                  key={st}
                                  value={st}
                                  className="bg-white text-slate-900"
                                >
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmAction({ type: "delete", item: row })
                                }
                                className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer"
                              >
                                <Trash2 size={13} />
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
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: RADAR KM/HM VOLVO                                            */}
      {/* =================================================================== */}
      {activeTab === "radar" && (
        <PreventiveMaintenanceRadarTab
          radarData={radarData}
          radarSummary={radarSummary}
          telemetryMeta={telemetryMeta}
          isLoading={isLoadingRadar}
          onRefreshForce={() => fetchRadar(true)}
          onQuickScheduleUnit={(unit) => {
            const targetDate = new Date().toISOString().slice(0, 10);
            openAddModal(targetDate, unit);
          }}
        />
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}
      <PmUnitFormModal
        key={`${unitModalState.mode}:${unitModalState.editItemId || unitModalState.initialValues.date}:${unitModalState.isOpen ? "open" : "closed"}`}
        isOpen={unitModalState.isOpen}
        mode={unitModalState.mode}
        selectedSite={selectedSite}
        initialValues={unitModalState.initialValues}
        availableUnits={activeServiceUnits}
        radarMap={radarMap}
        supervisors={hrSupervisors}
        mechanics={hrMechanics}
        isSaving={isMutating}
        onClose={() => setUnitModalState((p) => ({ ...p, isOpen: false }))}
        onSubmit={handleSubmitUnitModal}
      />

      <PmBulkAddModal
        isOpen={bulkModalDate !== null}
        date={bulkModalDate || ""}
        availableUnits={activeServiceUnits}
        existingUnitCodesOnDate={bulkExistingCodes}
        radarMap={radarMap}
        isSaving={isMutating}
        onClose={() => setBulkModalDate(null)}
        onSubmit={handleBulkAddSubmit}
      />

      <PmTargetModal
        isOpen={targetModalState.isOpen}
        defaultDailyTarget={scheduleData?.defaultDailyTarget ?? 4}
        specificDate={targetModalState.specificDate}
        specificDayTarget={targetModalState.specificDayTarget}
        isSaving={isMutating}
        onClose={() =>
          setTargetModalState({
            isOpen: false,
            specificDate: null,
            specificDayTarget: null,
          })
        }
        onSaveGlobalTarget={async (newTarget) => {
          try {
            setIsMutating(true);
            await plantService.updateSetting("daily_pm_target", String(newTarget));
            showToast(
              "success",
              `Target default Periodic Service diubah menjadi ${newTarget} unit/hari.`
            );
            setTargetModalState({
              isOpen: false,
              specificDate: null,
              specificDayTarget: null,
            });
            await refreshAll();
          } catch (err) {
            showToast("error", getErrorMessage(err, "Gagal mengubah target servis"));
          } finally {
            setIsMutating(false);
          }
        }}
        onSaveDayTarget={async (date, newTarget) => {
          try {
            setIsMutating(true);
            await plantService.upsertPmDailyPlan({
              date,
              targetUnits: newTarget,
              jobSite: selectedSite,
            });
            showToast(
              "success",
              `Target Periodic Service tanggal ${date} diatur menjadi ${newTarget} unit.`
            );
            setTargetModalState({
              isOpen: false,
              specificDate: null,
              specificDayTarget: null,
            });
            await refreshAll();
          } catch (err) {
            showToast(
              "error",
              getErrorMessage(err, "Gagal mengubah target harian")
            );
          } finally {
            setIsMutating(false);
          }
        }}
      />

      <PmConfirmModal
        action={confirmAction}
        isProcessing={isMutating}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      <PeriodicInspectionPdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        scheduleData={scheduleData}
        selectedSite={selectedSite}
        masterUnits={masterUnits}
        initialStartDate={
          pdfRangeOverride?.startDate ||
          (activeTab === "detail" ? detailStart : kpiActiveRange?.startDate)
        }
        initialEndDate={
          pdfRangeOverride?.endDate ||
          (activeTab === "detail" ? detailEnd : kpiActiveRange?.endDate)
        }
        mode="pm"
      />
    </div>
  );
};
