"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { authService } from "../services/authService";
import {
  DailyPaActivityItem,
  DailyPaReportData,
  DailyPaUnitRow,
  MasterUnit,
  plantService,
} from "../services/plantService";
import { User } from "../types/auth";
import { LoginScreen } from "./LoginScreen";
import { Sidebar } from "./Sidebar";
import { useNotification } from "../context/NotificationContext";
import {
  formatIndonesianFullDate,
  formatIndonesianShortDate,
  getTodayIsoDate,
  parseIsoDate,
  shiftIsoDate,
} from "../utils/dailyPaHelpers";
import {
  DailyPaActivityModal,
  DailyPaBulkAddUnitsModal,
} from "./DailyPaModals";

type TableFilterMode = "all" | "bd_only" | "below_target" | "missing_hours";

const SOURCE_BADGE_MAP: Record<string, string> = {
  PI: "bg-sky-100 text-sky-700 border-sky-200",
  PS: "bg-orange-100 text-[#e95623] border-orange-200",
  MANUAL: "bg-slate-100 text-slate-600 border-slate-200",
};

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export const DailyPaDateDetailView: React.FC = () => {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const { confirm, showInfo, showSuccess, showError } = useNotification();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur">(
    "MuaraPahu"
  );

  // Report & Master Units states
  const [reportData, setReportData] = useState<DailyPaReportData | null>(null);
  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isSyncingPiPs, setIsSyncingPiPs] = useState(false);

  // Editable settings drafts
  const [calendarHoursDraft, setCalendarHoursDraft] = useState("24");
  const [targetPaDraft, setTargetPaDraft] = useState("93");
  const [inlineHoursDraft, setInlineHoursDraft] = useState<
    Record<string, string>
  >({});

  // Table search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<TableFilterMode>("all");

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [activityModalTarget, setActivityModalTarget] = useState<{
    unitEntryId: string;
    unitCode: string;
    editingActivity: DailyPaActivityItem | null;
  } | null>(null);

  const rawDate = Array.isArray(params?.date) ? params.date[0] : params?.date;
  const parsedDate = useMemo(() => parseIsoDate(rawDate), [rawDate]);
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  useEffect(() => {
    const saved = authService.getCurrentUser();
    if (saved) {
      setCurrentUser(saved);
      setSelectedSite(saved.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu");
    }
    setIsLoadingAuth(false);
  }, []);

  const applyReportPayload = useCallback((payload: DailyPaReportData) => {
    setReportData(payload);
    setCalendarHoursDraft(String(payload.report.calendarHours));
    setTargetPaDraft(String(payload.report.targetPa));
    const draftMap: Record<string, string> = {};
    for (const u of payload.units) {
      for (const act of u.activities) {
        draftMap[act.id] = act.durationHours > 0 ? String(act.durationHours) : "";
      }
    }
    setInlineHoursDraft(draftMap);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser || !parsedDate || !rawDate) return;
    try {
      setIsLoadingReport(true);
      const [paRes, unitsRes] = await Promise.all([
        plantService.getDailyPaReport(rawDate, selectedSite),
        plantService.getMasterUnits({ site: selectedSite, category: "Prime Mover" }),
      ]);
      if (paRes.success) {
        applyReportPayload(paRes.data);
      }
      if (unitsRes.success) {
        setMasterUnits(
          unitsRes.data.filter(
            (u) => u.status === "Active" && u.category === "Prime Mover"
          )
        );
      }
    } catch (err) {
      showError(getErrorMessage(err, "Gagal memuat data Daily PA Report"));
    } finally {
      setIsLoadingReport(false);
    }
  }, [currentUser, parsedDate, rawDate, selectedSite, applyReportPayload, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectMenu = (menu: string) => {
    router.push(`/?menu=${encodeURIComponent(menu)}`);
  };

  const handleLogout = () => {
    confirm({
      title: "Konfirmasi Keluar Akun",
      message: `Apakah Anda yakin ingin keluar dari sistem Report Management Portal PT Batara Dharma Persada? Sesi login ${currentUser?.name || ""} akan diakhiri.`,
      confirmText: "Ya, Keluar Akun",
      cancelText: "Batal",
      type: "danger",
      icon: "logout",
      onConfirm: () => {
        authService.logout();
        setCurrentUser(null);
        showInfo("Anda telah berhasil keluar dari akun.", "Sesi Berakhir");
      },
    });
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!rawDate || !reportData) return;
    const nextCal = Number(calendarHoursDraft.replace(",", "."));
    const nextTarget = Number(targetPaDraft.replace(",", "."));
    if (!Number.isFinite(nextCal) || nextCal <= 0 || nextCal > 24) {
      showError("Jam kalender per hari harus antara 0.1 dan 24 jam.");
      return;
    }
    if (!Number.isFinite(nextTarget) || nextTarget < 0 || nextTarget > 100) {
      showError("Target PA (%) harus antara 0 dan 100.");
      return;
    }
    if (
      nextCal === reportData.report.calendarHours &&
      nextTarget === reportData.report.targetPa
    ) {
      return;
    }
    try {
      setIsMutating(true);
      const res = await plantService.updateDailyPaSettings({
        date: rawDate,
        jobSite: selectedSite,
        calendarHours: nextCal,
        targetPa: nextTarget,
      });
      applyReportPayload(res.data);
      showSuccess("Jam Kalender / Target PA diperbarui.");
    } catch (err) {
      showError(getErrorMessage(err, "Gagal memperbarui pengaturan"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmAddUnits = async (unitCodes: string[]) => {
    if (!rawDate) return;
    try {
      setIsMutating(true);
      const res = await plantService.addUnitsToDailyPa({
        date: rawDate,
        jobSite: selectedSite,
        unitCodes,
      });
      applyReportPayload(res.data);
      setIsBulkModalOpen(false);
      showSuccess(res.message || `${unitCodes.length} unit ditambahkan.`);
    } catch (err) {
      showError(getErrorMessage(err, "Gagal menambahkan unit"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleSyncPiPs = async () => {
    if (!rawDate) return;
    try {
      setIsSyncingPiPs(true);
      const res = await plantService.syncPiPsToDailyPa(rawDate, selectedSite);
      applyReportPayload(res.data);
      showSuccess(res.message || "Sinkronisasi PI & PS selesai.");
    } catch (err) {
      showError(getErrorMessage(err, "Gagal sinkronisasi PI & PS"));
    } finally {
      setIsSyncingPiPs(false);
    }
  };

  const handleRemoveUnit = (row: DailyPaUnitRow) => {
    confirm({
      title: `Hapus Unit ${row.unitCode}?`,
      message: `Unit ${row.unitCode} dan seluruh BD Activity pada tanggal ${rawDate} akan dihapus dari tabel Daily PA ini.`,
      confirmText: "Hapus Unit",
      cancelText: "Batal",
      type: "danger",
      onConfirm: async () => {
        try {
          setIsMutating(true);
          const res = await plantService.removeUnitFromDailyPa(row.id);
          applyReportPayload(res.data);
          showSuccess(`Unit ${row.unitCode} dihapus.`);
        } catch (err) {
          showError(getErrorMessage(err, "Gagal menghapus unit"));
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  const handleSaveInlineHours = async (activity: DailyPaActivityItem) => {
    const rawVal = (inlineHoursDraft[activity.id] ?? "").trim();
    const numericCandidate =
      rawVal === "" ? 0 : Number(rawVal.replace(",", "."));
    const isSame =
      Number.isFinite(numericCandidate) &&
      Math.round(numericCandidate * 100) / 100 === activity.durationHours;
    if (isSame) return;

    try {
      setIsMutating(true);
      const res = await plantService.updateDailyPaActivity(activity.id, {
        durationHours: rawVal === "" ? 0 : rawVal,
      });
      applyReportPayload(res.data);
    } catch (err) {
      showError(getErrorMessage(err, "Format jam tidak valid (contoh: 1.5 atau 01:30)"));
      setInlineHoursDraft((prev) => ({
        ...prev,
        [activity.id]:
          activity.durationHours > 0 ? String(activity.durationHours) : "",
      }));
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveActivityModal = async (values: {
    activityText: string;
    breakdownTime: string;
    durationHours: string;
  }) => {
    if (!activityModalTarget) return;
    try {
      setIsMutating(true);
      const res = activityModalTarget.editingActivity
        ? await plantService.updateDailyPaActivity(
            activityModalTarget.editingActivity.id,
            values
          )
        : await plantService.addDailyPaActivity({
            unitEntryId: activityModalTarget.unitEntryId,
            ...values,
          });
      applyReportPayload(res.data);
      setActivityModalTarget(null);
      showSuccess(
        activityModalTarget.editingActivity
          ? "BD Activity diperbarui."
          : "BD Activity ditambahkan."
      );
    } catch (err) {
      showError(getErrorMessage(err, "Gagal menyimpan BD Activity"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteActivity = (
    unitCode: string,
    activity: DailyPaActivityItem
  ) => {
    confirm({
      title: `Hapus Activity pada ${unitCode}?`,
      message: `Aktivitas "${activity.activityText}" (${activity.durationHours} jam) akan dihapus dan PA/MTTR/MTBF dihitung ulang otomatis.`,
      confirmText: "Hapus Activity",
      cancelText: "Batal",
      type: "danger",
      onConfirm: async () => {
        try {
          setIsMutating(true);
          const res = await plantService.deleteDailyPaActivity(activity.id);
          applyReportPayload(res.data);
          showSuccess("BD Activity dihapus.");
        } catch (err) {
          showError(getErrorMessage(err, "Gagal menghapus BD Activity"));
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  const existingUnitCodes = useMemo(
    () => new Set((reportData?.units || []).map((u) => u.unitCode)),
    [reportData]
  );

  const filteredUnits = useMemo(() => {
    const units = reportData?.units || [];
    const q = searchQuery.trim().toLowerCase();
    return units.filter((row) => {
      if (filterMode === "bd_only" && row.bdCount === 0) return false;
      if (filterMode === "below_target" && !row.isBelowTarget) return false;
      if (filterMode === "missing_hours" && !row.hasMissingPiPsHours) return false;
      if (!q) return true;
      return (
        row.unitCode.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.activities.some((a) =>
          a.activityText.toLowerCase().includes(q)
        )
      );
    });
  }, [reportData, searchQuery, filterMode]);

  const missingPiPsHoursCount = useMemo(
    () =>
      (reportData?.units || []).filter((u) => u.hasMissingPiPsHours).length,
    [reportData]
  );

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-500 tracking-wide">
            Memuat Halaman Daily PA...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setSelectedSite(user.jobSite === "Senyiur" ? "Senyiur" : "MuaraPahu");
        }}
      />
    );
  }

  const prevDateIso = parsedDate && rawDate ? shiftIsoDate(rawDate, -1) : null;
  const nextDateIso = parsedDate && rawDate ? shiftIsoDate(rawDate, 1) : null;
  const prevParsed = parseIsoDate(prevDateIso);
  const nextParsed = parseIsoDate(nextDateIso);

  const navbarDateLabel = parsedDate
    ? formatIndonesianShortDate(parsedDate.date)
    : "Tanggal Tidak Valid";

  const canSwitchSite =
    currentUser.role === "SuperAdmin" || currentUser.jobSite === "HeadOffice";
  const siteDisplayLabel =
    selectedSite === "Senyiur" ? "Senyiur" : "Muara Pahu";

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          user={currentUser}
          activeMenu="daily-pa-report"
          onSelectMenu={handleSelectMenu}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col h-full z-10 w-72 max-w-[85vw] bg-white shadow-2xl">
            <Sidebar
              user={currentUser}
              activeMenu="daily-pa-report"
              onSelectMenu={(menu) => {
                setIsMobileSidebarOpen(false);
                handleSelectMenu(menu);
              }}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/90 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 z-20 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
              aria-label="Buka Menu"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/coa-logo-bdp.png"
                alt="Report Management Portal PT Batara Dharma Persada"
                className="h-8 w-8 object-contain md:hidden shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-md lg:max-w-xl">
                  Daily PA • {navbarDateLabel}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline truncate">
                  Report Management Portal &bull; PT Batara Dharma Persada
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canSwitchSite ? (
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                {(["MuaraPahu", "Senyiur"] as const).map((siteKey) => (
                  <button
                    key={siteKey}
                    type="button"
                    onClick={() => setSelectedSite(siteKey)}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedSite === siteKey
                        ? "bg-white text-sky-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span className="sm:hidden">{siteKey === "MuaraPahu" ? "MPH" : "SNY"}</span>
                    <span className="hidden sm:inline">{siteKey === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                <MapPin size={13} className="text-[#e95623]" />
                <span className="sm:hidden">{siteDisplayLabel === "Muara Pahu" ? "MPH" : siteDisplayLabel === "Senyiur" ? "SNY" : siteDisplayLabel}</span>
                <span className="hidden sm:inline">{siteDisplayLabel}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6">
          <div className="w-full max-w-[1920px] mx-auto space-y-4">
            {!parsedDate ? (
              <div className="bg-white rounded-3xl border border-rose-200 shadow-xs p-6 sm:p-8 max-w-xl mx-auto text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-800">
                    Format Tanggal Tidak Valid
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Parameter tanggal{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {rawDate || "-"}
                    </code>{" "}
                    tidak dikenali. Gunakan format{" "}
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      YYYY-MM-DD
                    </code>
                    .
                  </p>
                </div>
                <Link
                  href="/?menu=daily-pa-report"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold transition-colors"
                >
                  <ArrowLeft size={15} />
                  <span>Kembali ke Kalender Daily PA</span>
                </Link>
              </div>
            ) : (
              <>
                {/* Navigation & Date Bar */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/?menu=daily-pa-report"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
                    >
                      <ArrowLeft size={15} />
                      <span>Kembali ke Kalender</span>
                    </Link>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                        <CalendarCheck size={20} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight">
                            {formatIndonesianFullDate(parsedDate.date)}
                          </h1>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {rawDate}
                          </span>
                          {rawDate === todayIso && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Daily Physical Availability Report &bull; Site{" "}
                          <strong className="text-slate-700">{siteDisplayLabel}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step Prev / Next Day */}
                  <div className="flex flex-wrap items-center gap-2">
                    {prevDateIso && prevParsed && (
                      <Link
                        href={`/daily-pa-report/${prevDateIso}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <ChevronLeft size={15} />
                        <span>{formatIndonesianShortDate(prevParsed.date)}</span>
                      </Link>
                    )}

                    {nextDateIso && nextParsed && (
                      <Link
                        href={`/daily-pa-report/${nextDateIso}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <span>{formatIndonesianShortDate(nextParsed.date)}</span>
                        <ChevronRight size={15} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Spreadsheet-Style Header Parameters + KPI Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left: Report Settings */}
                  <form
                    onSubmit={handleSaveSettings}
                    className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Parameter Report
                      </span>
                      <button
                        type="submit"
                        disabled={isMutating}
                        className="text-[11px] font-bold text-sky-700 hover:text-sky-800 cursor-pointer"
                      >
                        Simpan Parameter
                      </button>
                    </div>

                    <div className="grid grid-cols-2 items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600 uppercase">
                        Tanggal Report
                      </span>
                      <div className="px-3 py-1.5 rounded-xl bg-amber-100/90 border border-amber-200 font-extrabold text-slate-800 text-center">
                        {formatIndonesianFullDate(parsedDate.date)}
                      </div>

                      <label
                        htmlFor="pa-calendar-hours"
                        className="font-bold text-slate-600 uppercase"
                      >
                        Jam Kalender / Hari
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="pa-calendar-hours"
                          type="number"
                          step="0.5"
                          min="1"
                          max="24"
                          value={calendarHoursDraft}
                          onChange={(e) => setCalendarHoursDraft(e.target.value)}
                          onBlur={() => handleSaveSettings()}
                          className="w-full h-8 px-3 rounded-xl bg-amber-100/90 border border-amber-200 font-extrabold text-slate-800 text-center focus:outline-hidden focus:ring-2 focus:ring-sky-300"
                        />
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">
                          jam
                        </span>
                      </div>

                      <label
                        htmlFor="pa-target-pct"
                        className="font-bold text-slate-600 uppercase"
                      >
                        Target PA
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="pa-target-pct"
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={targetPaDraft}
                          onChange={(e) => setTargetPaDraft(e.target.value)}
                          onBlur={() => handleSaveSettings()}
                          className="w-full h-8 px-3 rounded-xl bg-amber-100/90 border border-amber-200 font-extrabold text-slate-800 text-center focus:outline-hidden focus:ring-2 focus:ring-sky-300"
                        />
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">
                          %
                        </span>
                      </div>
                    </div>
                  </form>

                  {/* Right: 3 Summary KPI Cards matching image */}
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
                    <div
                      className={`rounded-2xl border p-4 flex flex-col justify-between ${
                        (reportData?.summary.overallPaPercent ?? 100) >=
                        (reportData?.report.targetPa ?? 93)
                          ? "bg-emerald-50/70 border-emerald-200"
                          : "bg-rose-50/70 border-rose-200"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        PA % Keseluruhan
                      </span>
                      <div
                        className={`text-2xl sm:text-3xl font-black mt-2 ${
                          (reportData?.summary.overallPaPercent ?? 100) >=
                          (reportData?.report.targetPa ?? 93)
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {reportData && reportData.summary.totalUnits > 0
                          ? `${reportData.summary.overallPaPercent.toFixed(1)}%`
                          : "-"}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Target: {reportData?.report.targetPa ?? 93}%
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-sky-50/50 p-4 flex flex-col justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Unit Breakdown Periode
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-slate-800 mt-2">
                        {reportData?.summary.breakdownUnitCount ?? 0}{" "}
                        <span className="text-sm font-bold text-slate-500">
                          dari {reportData?.summary.totalUnits ?? 0} unit
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">
                        Total BD: {reportData?.summary.totalBd ?? 0} aktivitas
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 flex flex-col justify-between ${
                        (reportData?.summary.belowTargetUnitCount ?? 0) > 0
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        PA Di Bawah Target
                      </span>
                      <div
                        className={`text-xl sm:text-2xl font-black mt-2 ${
                          (reportData?.summary.belowTargetUnitCount ?? 0) > 0
                            ? "text-rose-700"
                            : "text-slate-800"
                        }`}
                      >
                        {reportData?.summary.belowTargetUnitCount ?? 0} unit
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1">
                        MTTR:{" "}
                        {reportData?.summary.overallMttr != null
                          ? `${reportData.summary.overallMttr.toFixed(2)}j`
                          : "-"}{" "}
                        &bull; MTBF:{" "}
                        {reportData?.summary.overallMtbf != null
                          ? `${reportData.summary.overallMtbf.toFixed(2)}j`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toolbar: Bulk Add Units, Sync PI & PS, Filters */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(true)}
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus size={16} />
                      <span>Pilih / Tambah Unit (Banyak)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncPiPs}
                      disabled={isSyncingPiPs || (reportData?.units.length ?? 0) === 0}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                    >
                      <RefreshCw
                        size={14}
                        className={isSyncingPiPs ? "animate-spin text-sky-600" : ""}
                      />
                      <span>Tarik Ulang PI &amp; PS</span>
                    </button>

                    {missingPiPsHoursCount > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFilterMode((prev) =>
                            prev === "missing_hours" ? "all" : "missing_hours"
                          )
                        }
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold cursor-pointer hover:bg-amber-100"
                      >
                        <AlertTriangle size={14} />
                        <span>{missingPiPsHoursCount} unit PI/PS belum diisi jam</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                      {(
                        [
                          { id: "all", label: `Semua (${reportData?.units.length ?? 0})` },
                          {
                            id: "bd_only",
                            label: `Unit BD (${reportData?.summary.breakdownUnitCount ?? 0})`,
                          },
                          {
                            id: "below_target",
                            label: `PA < ${reportData?.report.targetPa ?? 93}% (${reportData?.summary.belowTargetUnitCount ?? 0})`,
                          },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFilterMode(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            filterMode === tab.id
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-48">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari unit atau BD activity..."
                        className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Main Daily PA Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  {isLoadingReport ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="h-8 w-8 rounded-full border-3 border-sky-600 border-t-transparent animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-slate-500">
                        Memuat data unit &amp; sinkronisasi PI/PS...
                      </p>
                    </div>
                  ) : !reportData || reportData.units.length === 0 ? (
                    <div className="py-16 px-4 text-center space-y-4">
                      <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto">
                        <Truck size={26} />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
                          Belum Ada Unit pada Tanggal Ini
                        </h2>
                        <p className="text-xs text-slate-500">
                          Klik tombol <strong>Pilih / Tambah Unit (Banyak)</strong> untuk memasukkan unit dari Master Data Unit sekaligus menarik aktivitas PI &amp; PS tanggal ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBulkModalOpen(true)}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        <Plus size={16} />
                        <span>Pilih Unit Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-10">
                              No
                            </th>
                            <th className="py-3 px-3 text-left font-extrabold border-r border-slate-700/80 min-w-24">
                              Unit
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-20">
                              Jumlah BD
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-24">
                              Total Downtime
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-28">
                              Jam Available (Hours)
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-20">
                              PA (%)
                            </th>
                            <th className="py-3 px-3 text-left font-extrabold border-r border-slate-700/80 min-w-80">
                              BD Activity
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 min-w-28">
                              Jam Breakdown
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-16">
                              MTTR
                            </th>
                            <th className="py-3 px-2.5 text-center font-extrabold border-r border-slate-700/80 w-16">
                              MTBF
                            </th>
                            <th className="py-3 px-2 text-center font-extrabold w-12">
                              Aksi
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {filteredUnits.map((row) => (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-50/80 transition-colors align-top"
                            >
                              <td className="py-2.5 px-2.5 text-center font-semibold text-slate-500 border-r border-slate-100">
                                {row.no}
                              </td>

                              <td className="py-2.5 px-3 border-r border-slate-100">
                                <div className="font-extrabold text-slate-800">
                                  {row.unitCode}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {row.category}
                                </div>
                              </td>

                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 border-r border-slate-100">
                                {row.bdCount > 0 ? row.bdCount : "-"}
                              </td>

                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 border-r border-slate-100">
                                {row.totalDowntime > 0
                                  ? row.totalDowntime.toFixed(2)
                                  : "-"}
                              </td>

                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-800 border-r border-slate-100">
                                {row.availableHours.toFixed(2)}
                              </td>

                              <td
                                className={`py-2.5 px-2.5 text-center font-black border-r border-slate-100 ${
                                  row.isBelowTarget
                                    ? "bg-rose-100/75 text-rose-700"
                                    : "bg-emerald-100/75 text-emerald-700"
                                }`}
                              >
                                {row.paPercent.toFixed(1)}%
                              </td>

                              {/* BD ACTIVITY CELL */}
                              <td className="py-2 px-3 border-r border-slate-100 space-y-1.5">
                                {row.activities.map((act) => {
                                  const needsHours =
                                    act.sourceType !== "MANUAL" &&
                                    act.durationHours <= 0;
                                  const badgeStyle =
                                    SOURCE_BADGE_MAP[act.sourceType] ||
                                    SOURCE_BADGE_MAP.MANUAL;

                                  return (
                                    <div
                                      key={act.id}
                                      className={`rounded-xl border px-2.5 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${
                                        needsHours
                                          ? "bg-amber-50/75 border-amber-200"
                                          : "bg-slate-50/80 border-slate-200/80"
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1 flex items-start gap-1.5">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 mt-0.5 ${badgeStyle}`}
                                        >
                                          {act.sourceType}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-700 leading-snug wrap-break-word">
                                          {act.activityText}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          value={inlineHoursDraft[act.id] ?? ""}
                                          onChange={(e) =>
                                            setInlineHoursDraft((prev) => ({
                                              ...prev,
                                              [act.id]: e.target.value,
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              handleSaveInlineHours(act);
                                            }
                                          }}
                                          onBlur={() => handleSaveInlineHours(act)}
                                          placeholder={needsHours ? "Isi jam" : "0"}
                                          aria-label={`Total jam untuk ${act.activityText}`}
                                          className={`w-14 h-7 px-1.5 rounded-lg border text-[11px] font-extrabold text-center focus:outline-hidden focus:ring-2 focus:ring-sky-300 ${
                                            needsHours
                                              ? "border-amber-300 bg-white text-amber-800"
                                              : "border-slate-200 bg-white text-slate-800"
                                          }`}
                                        />
                                        <span className="text-[10px] font-semibold text-slate-400">
                                          jam
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() => handleSaveInlineHours(act)}
                                          title="Simpan jam"
                                          className="h-6 w-6 rounded-md flex items-center justify-center text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                                        >
                                          <Check size={13} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActivityModalTarget({
                                              unitEntryId: row.id,
                                              unitCode: row.unitCode,
                                              editingActivity: act,
                                            })
                                          }
                                          title="Edit detail activity & jam breakdown"
                                          className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 cursor-pointer"
                                        >
                                          <Pencil size={12} />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteActivity(row.unitCode, act)
                                          }
                                          title="Hapus activity"
                                          className="h-6 w-6 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-100 cursor-pointer"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setActivityModalTarget({
                                      unitEntryId: row.id,
                                      unitCode: row.unitCode,
                                      editingActivity: null,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 cursor-pointer transition-colors"
                                >
                                  <Plus size={11} />
                                  <span>Tambah Activity</span>
                                </button>
                              </td>

                              <td className="py-2.5 px-2.5 text-center font-semibold text-slate-600 border-r border-slate-100">
                                {row.breakdownTimesJoined}
                              </td>

                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 border-r border-slate-100">
                                {row.mttr != null ? row.mttr.toFixed(1) : "-"}
                              </td>

                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 border-r border-slate-100">
                                {row.mtbf != null ? row.mtbf.toFixed(1) : "-"}
                              </td>

                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnit(row)}
                                  title={`Hapus unit ${row.unitCode}`}
                                  className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>

                        <tfoot>
                          <tr className="bg-slate-200/85 border-t-2 border-slate-300 text-slate-900 font-black text-xs">
                            <td colSpan={2} className="py-3 px-3 text-center uppercase">
                              Total
                            </td>
                            <td className="py-3 px-2.5 text-center">
                              {reportData.summary.totalBd}
                            </td>
                            <td className="py-3 px-2.5 text-center">
                              {reportData.summary.totalDowntime.toFixed(2)}
                            </td>
                            <td className="py-3 px-2.5 text-center">
                              {reportData.summary.totalAvailableHours.toFixed(2)}
                            </td>
                            <td className="py-3 px-2.5 text-center">
                              {reportData.summary.overallPaPercent.toFixed(1)}%
                            </td>
                            <td
                              colSpan={2}
                              className="py-3 px-3 text-center uppercase tracking-wide"
                            >
                              RUNNING {reportData.summary.totalUnits} UNIT
                            </td>
                            <td className="py-3 px-2.5 text-center">
                              {reportData.summary.overallMttr != null
                                ? reportData.summary.overallMttr.toFixed(2)
                                : "-"}
                            </td>
                            <td className="py-3 px-2.5 text-center">
                              {reportData.summary.overallMtbf != null
                                ? reportData.summary.overallMtbf.toFixed(2)
                                : "-"}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Multi-Select Units Modal */}
      <DailyPaBulkAddUnitsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        masterUnits={masterUnits}
        existingUnitCodes={existingUnitCodes}
        jobSiteLabel={siteDisplayLabel}
        isSubmitting={isMutating}
        onConfirmAdd={handleConfirmAddUnits}
      />

      {/* Add / Edit Single BD Activity Modal */}
      <DailyPaActivityModal
        isOpen={Boolean(activityModalTarget)}
        onClose={() => setActivityModalTarget(null)}
        unitCode={activityModalTarget?.unitCode || ""}
        editingActivity={activityModalTarget?.editingActivity || null}
        isSubmitting={isMutating}
        onSave={handleSaveActivityModal}
      />
    </div>
  );
};
