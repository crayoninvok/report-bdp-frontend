"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  DaySchedule,
  MasterUnit,
  PeriodicInspectionItem,
  PlantPersonnelItem,
  PmRadarUnit,
} from "../services/plantService";
import {
  circularClockDiffMinutes,
  computePmTargetsClient,
  formatHm,
  formatKm,
  getPmReadinessStyle,
  HM_TOLERANCE_HOURS,
  isSupportCategory,
  LEAD_TIME_TOLERANCE_HOURS,
  parseClockTimeMinutes,
  parseLeadTimeHours,
  parsePlanHmHours,
  PM_SERVICE_TYPES,
  PM_SHIFT_OPTIONS,
  PM_STATUS_OPTIONS,
  PS_CATEGORY_OPTIONS,
  PS_LEAD_TIME_OPTIONS,
  PS_START_TIME_OPTIONS,
  START_TIME_TOLERANCE_MINUTES,
} from "../utils/pmHelpers";

export interface PmUnitFormValues {
  date: string;
  unitCode: string;
  serviceType: string;
  shift: string;
  status: string;
  category: string;
  planStartTime: string;
  planLeadTime: string;
  planHmServis: string;
  actualStartTime: string;
  actualLeadTime: string;
  actualHmServis: string;
  supervisorName: string;
  mechanicNames: string[];
  includedTrailers: string[];
  currentKm: string;
  currentHm: string;
  nextDueKm: string;
  nextDueHm: string;
  notes: string;
}

interface PmUnitFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  selectedSite: "MuaraPahu" | "Senyiur";
  initialValues: PmUnitFormValues;
  availableUnits: MasterUnit[];
  radarMap: Map<string, PmRadarUnit>;
  supervisors: PlantPersonnelItem[];
  mechanics: PlantPersonnelItem[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: PmUnitFormValues) => Promise<void>;
}

const MAX_MECHANICS = 5;
const UNIT_CATEGORY_FILTERS = [
  "ALL",
  "Prime Mover",
  "Vessel 1",
  "Dolly",
  "Vessel 2",
  "Unit Support",
] as const;

type UnitCategoryFilter = (typeof UNIT_CATEGORY_FILTERS)[number];

/** Groups HR personnel by whether their branch matches the active job site. */
function splitBySiteBranch(
  list: PlantPersonnelItem[],
  selectedSite: "MuaraPahu" | "Senyiur"
) {
  const siteBranch = selectedSite === "Senyiur" ? "senyiur" : "muara pahu";
  const inSite: PlantPersonnelItem[] = [];
  const otherSite: PlantPersonnelItem[] = [];

  for (const person of list) {
    if ((person.branchName || "").toLowerCase() === siteBranch) {
      inSite.push(person);
    } else {
      otherSite.push(person);
    }
  }
  return { inSite, otherSite };
}

/** Unified Add & Edit modal for Periodic Service with HR SPV/Mechanic pickers & telemetry auto-fill. */
export const PmUnitFormModal: React.FC<PmUnitFormModalProps> = ({
  isOpen,
  mode,
  selectedSite,
  initialValues,
  availableUnits,
  radarMap,
  supervisors,
  mechanics,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<PmUnitFormValues>(initialValues);
  const [unitCategoryFilter, setUnitCategoryFilter] =
    useState<UnitCategoryFilter>("ALL");
  const [showTelemetryInputs, setShowTelemetryInputs] = useState(false);

  // Live KPI pass/fail previews against Plan values
  const kpiPreview = useMemo(() => {
    const planHm = parsePlanHmHours(form.planHmServis);
    const actualHm = form.actualHmServis.trim()
      ? Number(form.actualHmServis.replace(",", "."))
      : null;
    const hmOk =
      planHm != null && actualHm != null && Number.isFinite(actualHm)
        ? Math.abs(actualHm - planHm) <= HM_TOLERANCE_HOURS
        : null;

    const planStart = parseClockTimeMinutes(form.planStartTime);
    const actualStart = parseClockTimeMinutes(form.actualStartTime);
    const startOk =
      planStart != null && actualStart != null
        ? circularClockDiffMinutes(planStart, actualStart) <=
          START_TIME_TOLERANCE_MINUTES
        : null;

    const planLead = parseLeadTimeHours(form.planLeadTime);
    const actualLead = parseLeadTimeHours(form.actualLeadTime);
    const leadOk =
      planLead != null && actualLead != null
        ? Math.abs(actualLead - planLead) <= LEAD_TIME_TOLERANCE_HOURS
        : null;

    return { planHm, hmOk, startOk, leadOk };
  }, [
    form.planHmServis,
    form.actualHmServis,
    form.planStartTime,
    form.actualStartTime,
    form.planLeadTime,
    form.actualLeadTime,
  ]);

  React.useEffect(() => {
    setForm(initialValues);
    setUnitCategoryFilter("ALL");
    setShowTelemetryInputs(mode === "edit");
  }, [initialValues, isOpen, mode]);

  const siteLabel = selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur";
  const selectedRadar = radarMap.get(form.unitCode);
  const selectedUnitObj = availableUnits.find((u) => u.unitCode === form.unitCode);
  const isHeadUnit =
    !selectedUnitObj || selectedUnitObj.category === "Prime Mover";

  const attachedTrailerChoices = useMemo(() => {
    const tr = selectedUnitObj?.trailers;
    if (!tr) return [];
    const list: Array<{ label: string; unitCode: string }> = [];
    if (tr.vessel1) list.push({ label: "Vessel 1", unitCode: tr.vessel1.unitCode });
    if (tr.dolly) list.push({ label: "Dolly", unitCode: tr.dolly.unitCode });
    if (tr.vessel2) list.push({ label: "Vessel 2", unitCode: tr.vessel2.unitCode });
    return list;
  }, [selectedUnitObj]);

  const filteredUnitsByCategory = useMemo(() => {
    if (unitCategoryFilter === "ALL") return availableUnits;
    if (unitCategoryFilter === "Unit Support") {
      return availableUnits.filter((u) => isSupportCategory(u.category));
    }
    return availableUnits.filter((u) => u.category === unitCategoryFilter);
  }, [availableUnits, unitCategoryFilter]);

  const unitsGroupedByCategory = useMemo(() => {
    const groups: Array<{ category: string; items: MasterUnit[] }> = [
      { category: "Prime Mover", items: [] },
      { category: "Vessel 1", items: [] },
      { category: "Dolly", items: [] },
      { category: "Vessel 2", items: [] },
    ];
    const dynamicGroups = new Map<string, MasterUnit[]>();
    for (const u of filteredUnitsByCategory) {
      const target = groups.find((g) => g.category === u.category);
      if (target) {
        target.items.push(u);
      } else {
        const list = dynamicGroups.get(u.category) || [];
        list.push(u);
        dynamicGroups.set(u.category, list);
      }
    }
    const supportGroups = Array.from(dynamicGroups.entries()).map(
      ([category, items]) => ({ category, items })
    );
    return [...groups.filter((g) => g.items.length > 0), ...supportGroups];
  }, [filteredUnitsByCategory]);

  const groupedSupervisors = useMemo(
    () => splitBySiteBranch(supervisors, selectedSite),
    [supervisors, selectedSite]
  );

  const groupedMechanics = useMemo(
    () => splitBySiteBranch(mechanics, selectedSite),
    [mechanics, selectedSite]
  );

  const handleUnitChange = (unitCode: string) => {
    const unitObj = availableUnits.find((u) => u.unitCode === unitCode);
    const isHead = !unitObj || unitObj.category === "Prime Mover";
    const headCode = isHead ? unitCode : unitObj?.headUnitCode || "";
    const r = headCode ? radarMap.get(headCode) : undefined;
    const liveKmVal = r?.liveKm ?? unitObj?.currentKm ?? null;
    const liveHmVal = r?.liveHm ?? unitObj?.currentHm ?? null;
    const recService =
      isHead && r?.recommendedServiceType
        ? r.recommendedServiceType
        : isHead
        ? form.serviceType
        : "Greasing & PS";
    const targets = isHead
      ? computePmTargetsClient(recService, liveKmVal, liveHmVal)
      : { nextDueKm: null, nextDueHm: null };
    const autoPlanHm =
      form.planHmServis ||
      (isHead && r?.targetHm
        ? `${r.targetHm.toLocaleString("id-ID")} HM`
        : isHead
        ? "250 HM"
        : "");

    setForm((prev) => ({
      ...prev,
      unitCode,
      serviceType: recService,
      planHmServis: autoPlanHm,
      includedTrailers: [],
      currentKm: liveKmVal != null ? String(liveKmVal) : "",
      currentHm: liveHmVal != null ? String(liveHmVal) : "",
      nextDueKm: targets.nextDueKm != null ? String(targets.nextDueKm) : "",
      nextDueHm: targets.nextDueHm != null ? String(targets.nextDueHm) : "",
    }));
  };

  const toggleIncludedTrailer = (trailerCode: string) => {
    setForm((prev) => {
      const exists = prev.includedTrailers.includes(trailerCode);
      return {
        ...prev,
        includedTrailers: exists
          ? prev.includedTrailers.filter((c) => c !== trailerCode)
          : [...prev.includedTrailers, trailerCode],
      };
    });
  };

  const handleServiceTypeChange = (serviceType: string) => {
    const kmNum = form.currentKm ? Number(form.currentKm) : null;
    const hmNum = form.currentHm ? Number(form.currentHm) : null;
    const targets = computePmTargetsClient(serviceType, kmNum, hmNum);

    setForm((prev) => ({
      ...prev,
      serviceType,
      nextDueKm: targets.nextDueKm != null ? String(targets.nextDueKm) : prev.nextDueKm,
      nextDueHm: targets.nextDueHm != null ? String(targets.nextDueHm) : prev.nextDueHm,
    }));
  };

  const handleAddMechanic = (name: string) => {
    if (!name) return;
    setForm((prev) => {
      if (prev.mechanicNames.includes(name) || prev.mechanicNames.length >= MAX_MECHANICS) {
        return prev;
      }
      return {
        ...prev,
        mechanicNames: [...prev.mechanicNames, name],
      };
    });
  };

  const handleRemoveMechanic = (name: string) => {
    setForm((prev) => ({
      ...prev,
      mechanicNames: prev.mechanicNames.filter((m) => m !== name),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-[#e95623]">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {mode === "add"
                  ? "Jadwalkan Unit Periodic Service"
                  : `Edit Jadwal Periodic Service • ${form.unitCode}`}
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Site: <strong className="text-slate-700">{siteLabel}</strong> • Head, Dolly
                &amp; Vessel dapat dijadwalkan terpisah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(form);
          }}
          className="px-6 py-5 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {/* Tanggal Servis */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Tanggal Servis
            </label>
            <input
              type="date"
              required
              disabled={mode === "edit"}
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
            />
          </div>

          {/* Pilih Unit Servis (Head / Vessel 1 / Dolly / Vessel 2 Mandiri) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Pilih Unit Servis di {siteLabel}
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                {filteredUnitsByCategory.length} Unit Aktif
              </span>
            </div>
            {mode === "edit" ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 font-mono font-black text-slate-900 text-xs flex items-center justify-between gap-2">
                <span>
                  {form.unitCode} • {selectedUnitObj?.category || "Unit"}
                </span>
                {selectedUnitObj?.headUnitCode && !isHeadUnit && (
                  <span className="text-[10px] font-sans font-bold text-slate-500">
                    Pasangan: {selectedUnitObj.headUnitCode}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {UNIT_CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setUnitCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                        unitCategoryFilter === cat
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {cat === "ALL" ? "Semua Unit" : cat}
                    </button>
                  ))}
                </div>
                <select
                  required
                  value={form.unitCode}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                >
                  <option value="">-- Pilih Unit (Head / Dolly / Vessel / Support) --</option>
                  {unitsGroupedByCategory.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.items.map((u) => {
                        const r =
                          u.category === "Prime Mover"
                            ? radarMap.get(u.unitCode)
                            : undefined;
                        const tag =
                          r &&
                          (r.readinessStatus === "Overdue" ||
                            r.readinessStatus === "Due Soon")
                            ? ` [${r.readinessStatus} • Sisa ${r.remainingKm ?? "-"} km]`
                            : r?.liveKm
                            ? ` [${r.liveKm.toLocaleString("id-ID")} km]`
                            : u.category !== "Prime Mover" && u.headUnitCode
                            ? ` [Pasangan ${u.headUnitCode}]`
                            : "";
                        return (
                          <option key={u.unitCode} value={u.unitCode}>
                            {u.unitCode} • {u.category} ({u.model}){tag}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Live Volvo Telemetry Preview (Prime Mover) & Opsional Buntut / Unit Mandiri Info */}
          {form.unitCode && isHeadUnit && (
            <div className="space-y-2">
              {selectedRadar && (
                <div className="px-3.5 py-2 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Gauge size={14} className="text-[#e95623]" />
                    <span>
                      <strong>Volvo Live (Head):</strong> {formatKm(selectedRadar.liveKm)}{" "}
                      | {formatHm(selectedRadar.liveHm)}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#c74315]">
                    {form.includedTrailers.length > 0
                      ? `Ikut PS: ${form.includedTrailers.join(", ")}`
                      : "Head Only (Buntut terpisah)"}
                  </span>
                </div>
              )}

              {attachedTrailerChoices.length > 0 && (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700">
                      Buntut Ikut PS (Opsional — Default Tidak Ikut)
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {form.includedTrailers.length}/{attachedTrailerChoices.length} dipilih
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Dolly &amp; Vessel tidak otomatis ikut PS saat Head diservis. Centang
                    hanya jika ikut PS bersamaan:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {attachedTrailerChoices.map((tr) => {
                      const checked = form.includedTrailers.includes(tr.unitCode);
                      return (
                        <label
                          key={tr.unitCode}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                            checked
                              ? "bg-orange-50 border-[#e95623] text-[#c74315]"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleIncludedTrailer(tr.unitCode)}
                            className="accent-[#e95623]"
                          />
                          <span>
                            {tr.label} ({tr.unitCode})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {form.unitCode && !isHeadUnit && selectedUnitObj && (() => {
            const pairedHeadRadar = selectedUnitObj.headUnitCode
              ? radarMap.get(selectedUnitObj.headUnitCode)
              : undefined;
            const displayHm = pairedHeadRadar?.liveHm ?? selectedUnitObj.currentHm ?? null;
            const displayKm = pairedHeadRadar?.liveKm ?? selectedUnitObj.currentKm ?? null;
            return (
              <div className="px-3.5 py-2.5 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-sky-900">
                <span>
                  <strong>Unit Mandiri:</strong> {selectedUnitObj.category} (
                  {selectedUnitObj.model}) &bull; Jadwal PS terpisah dari Head
                  {(displayHm != null || displayKm != null) && (
                    <>
                      {" "}
                      &bull; {pairedHeadRadar ? `Volvo (${selectedUnitObj.headUnitCode})` : "Meter"}:{" "}
                      <strong>
                        {displayHm != null ? `${displayHm.toLocaleString("id-ID")} HM` : "- HM"}
                      </strong>{" "}
                      /{" "}
                      <strong>
                        {displayKm != null ? `${displayKm.toLocaleString("id-ID")} KM` : "- KM"}
                      </strong>
                    </>
                  )}
                </span>
                {selectedUnitObj.headUnitCode && (
                  <span className="font-mono font-bold text-sky-700">
                    Gandengan Head: {selectedUnitObj.headUnitCode}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Row 1: Tipe Servis & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Tipe Servis
              </label>
              <select
                value={form.serviceType}
                onChange={(e) => handleServiceTypeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                {PM_SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Shift
              </label>
              <select
                value={form.shift}
                onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                <option value="Shift 1">Shift 1 (Siang)</option>
                <option value="Shift 2">Shift 2 (Malam)</option>
              </select>
            </div>
          </div>

          {/* 2x2 Grid: Kategori, Plan Start Time, Plan Lead Time, Plan HM Servis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                {PS_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Plan Start Time
              </label>
              <select
                value={form.planStartTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, planStartTime: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                <option value="">-- Pilih Jam Mulai --</option>
                {PS_START_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t} WITA
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Plan Lead Time
              </label>
              <select
                value={form.planLeadTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, planLeadTime: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                <option value="">-- Pilih Estimasi Durasi --</option>
                {PS_LEAD_TIME_OPTIONS.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Plan HM Servis
                </label>
                {selectedRadar?.targetHm != null && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        planHmServis: `${selectedRadar.targetHm!.toLocaleString("id-ID")} HM`,
                      }))
                    }
                    className="text-[10px] font-bold text-[#e95623] hover:underline cursor-pointer"
                    title="Gunakan Target HM dari Live Volvo"
                  >
                    Target: {selectedRadar.targetHm.toLocaleString("id-ID")} HM
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.planHmServis}
                onChange={(e) =>
                  setForm((p) => ({ ...p, planHmServis: e.target.value }))
                }
                placeholder="e.g. 5250 HM atau 250 HM"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Nama Pengawas (SPV Plant - Data HR) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Nama Pengawas (SPV Plant)
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Data HR ({supervisors.length})
              </span>
            </div>
            <select
              value={form.supervisorName}
              onChange={(e) =>
                setForm((p) => ({ ...p, supervisorName: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
            >
              <option value="">-- Pilih Pengawas / SPV Plant --</option>
              {form.supervisorName &&
                !supervisors.some((s) => s.fullName === form.supervisorName) && (
                  <option value={form.supervisorName}>{form.supervisorName}</option>
                )}
              {groupedSupervisors.inSite.length > 0 && (
                <optgroup label={`SPV Plant • Site ${siteLabel}`}>
                  {groupedSupervisors.inSite.map((spv) => (
                    <option key={spv.id} value={spv.fullName}>
                      {spv.fullName} ({spv.jobPosition})
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedSupervisors.otherSite.length > 0 && (
                <optgroup label="SPV Plant • Site Lainnya">
                  {groupedSupervisors.otherSite.map((spv) => (
                    <option key={spv.id} value={spv.fullName}>
                      {spv.fullName} ({spv.jobPosition} • {spv.branchName || "-"})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Nama Mekanik (Multi-select Maks. 5 Orang dari HR) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users size={13} className="text-[#e95623]" />
                <span>Nama Mekanik (Maks. {MAX_MECHANICS} Orang)</span>
              </label>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  form.mechanicNames.length >= MAX_MECHANICS
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {form.mechanicNames.length} / {MAX_MECHANICS} Dipilih
              </span>
            </div>

            <select
              value=""
              disabled={form.mechanicNames.length >= MAX_MECHANICS}
              onChange={(e) => handleAddMechanic(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
            >
              <option value="">
                {form.mechanicNames.length >= MAX_MECHANICS
                  ? "Maksimal 5 mekanik sudah dipilih"
                  : `-- Tambah Mekanik dari HR (${mechanics.length} tersedia) --`}
              </option>
              {groupedMechanics.inSite.length > 0 && (
                <optgroup label={`Mekanik • Site ${siteLabel}`}>
                  {groupedMechanics.inSite
                    .filter((m) => !form.mechanicNames.includes(m.fullName))
                    .map((mech) => (
                      <option key={mech.id} value={mech.fullName}>
                        {mech.fullName} ({mech.jobPosition})
                      </option>
                    ))}
                </optgroup>
              )}
              {groupedMechanics.otherSite.length > 0 && (
                <optgroup label="Mekanik • Site Lainnya">
                  {groupedMechanics.otherSite
                    .filter((m) => !form.mechanicNames.includes(m.fullName))
                    .map((mech) => (
                      <option key={mech.id} value={mech.fullName}>
                        {mech.fullName} ({mech.jobPosition} • {mech.branchName || "-"})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            {form.mechanicNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.mechanicNames.map((name, idx) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-50 text-[#c74315] border border-orange-200"
                  >
                    <span className="text-[10px] font-black text-orange-400">
                      #{idx + 1}
                    </span>
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMechanic(name)}
                      className="hover:text-rose-700 cursor-pointer"
                      title={`Hapus ${name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Catatan Temuan / Keterangan (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Catatan Temuan / Keterangan (Opsional)
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Cek kebocoran seal hidrolik vessel"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
            />
          </div>

          {/* Status & Realisasi Aktual Servis (Input KPI) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-800">
                Status &amp; Realisasi Aktual Servis (KPI)
              </span>
              {form.currentHm && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      actualHmServis: p.currentHm,
                    }))
                  }
                  className="text-[10px] font-bold text-[#e95623] hover:underline cursor-pointer"
                >
                  Isi Actual HM dari Current HM ({form.currentHm})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Status Servis
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-2.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                >
                  {PM_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Actual HM
                  </label>
                  {kpiPreview.hmOk !== null && (
                    <span
                      className={`text-[9.5px] font-black px-1.5 py-0.5 rounded ${
                        kpiPreview.hmOk
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {kpiPreview.hmOk ? "✓ ±50 HM" : "✗ >50 HM"}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={form.actualHmServis}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, actualHmServis: e.target.value }))
                  }
                  placeholder={
                    kpiPreview.planHm != null
                      ? `Plan ${kpiPreview.planHm}`
                      : "e.g. 525"
                  }
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Actual Start
                  </label>
                  {kpiPreview.startOk !== null && (
                    <span
                      className={`text-[9.5px] font-black px-1.5 py-0.5 rounded ${
                        kpiPreview.startOk
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {kpiPreview.startOk ? "✓ ±1 Jam" : "✗ >1 Jam"}
                    </span>
                  )}
                </div>
                <input
                  type="time"
                  value={form.actualStartTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, actualStartTime: e.target.value }))
                  }
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Actual Lead (Jam)
                  </label>
                  {kpiPreview.leadOk !== null && (
                    <span
                      className={`text-[9.5px] font-black px-1.5 py-0.5 rounded ${
                        kpiPreview.leadOk
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {kpiPreview.leadOk ? "✓ ±2 Jam" : "✗ >2 Jam"}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.actualLeadTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, actualLeadTime: e.target.value }))
                  }
                  placeholder="e.g. 8"
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>
          </div>

          {/* Telemetry & Next Due KM / HM Advanced Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTelemetryInputs((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#e95623] cursor-pointer"
            >
              {showTelemetryInputs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>Atur Angka Odometer KM / HM &amp; Target Berikutnya (Opsional)</span>
            </button>

            {showTelemetryInputs && (
              <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      KM Saat Ini
                    </label>
                    <input
                      type="number"
                      value={form.currentKm}
                      onChange={(e) => {
                        const val = e.target.value;
                        const targets = computePmTargetsClient(
                          form.serviceType,
                          val ? Number(val) : null,
                          form.currentHm ? Number(form.currentHm) : null
                        );
                        setForm((p) => ({
                          ...p,
                          currentKm: val,
                          nextDueKm:
                            targets.nextDueKm != null
                              ? String(targets.nextDueKm)
                              : p.nextDueKm,
                        }));
                      }}
                      placeholder="161000"
                      className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Target KM Next
                    </label>
                    <input
                      type="number"
                      value={form.nextDueKm}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nextDueKm: e.target.value }))
                      }
                      placeholder="173000"
                      className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      HM Saat Ini
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.currentHm}
                      onChange={(e) => {
                        const val = e.target.value;
                        const targets = computePmTargetsClient(
                          form.serviceType,
                          form.currentKm ? Number(form.currentKm) : null,
                          val ? Number(val) : null
                        );
                        setForm((p) => ({
                          ...p,
                          currentHm: val,
                          nextDueHm:
                            targets.nextDueHm != null
                              ? String(targets.nextDueHm)
                              : p.nextDueHm,
                        }));
                      }}
                      placeholder="6275.5"
                      className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Target HM Next
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.nextDueHm}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nextDueHm: e.target.value }))
                      }
                      placeholder="6525.5"
                      className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.unitCode}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} />
              <span>
                {isSaving
                  ? "Menyimpan..."
                  : mode === "add"
                  ? "Simpan ke Jadwal"
                  : "Perbarui Jadwal Servis"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PmBulkAddModalProps {
  isOpen: boolean;
  date: string;
  availableUnits: MasterUnit[];
  existingUnitCodesOnDate: Set<string>;
  radarMap: Map<string, PmRadarUnit>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    date: string;
    unitCodes: string[];
    serviceType: string;
    shift: string;
  }) => Promise<void>;
}

/** Multi-unit selector modal with Due Soon / Overdue radar highlights. */
export const PmBulkAddModal: React.FC<PmBulkAddModalProps> = ({
  isOpen,
  date,
  availableUnits,
  existingUnitCodesOnDate,
  radarMap,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<UnitCategoryFilter>("ALL");
  const [onlyDueFilter, setOnlyDueFilter] = useState(false);
  const [serviceType, setServiceType] = useState<string>(PM_SERVICE_TYPES[0]);
  const [shift, setShift] = useState<string>("Shift 1");

  React.useEffect(() => {
    if (isOpen) {
      setSelectedCodes([]);
      setSearch("");
      setCategoryFilter("ALL");
      setOnlyDueFilter(false);
    }
  }, [isOpen, date]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableUnits.filter((u) => {
      if (categoryFilter === "Unit Support") {
        if (!isSupportCategory(u.category)) return false;
      } else if (categoryFilter !== "ALL" && u.category !== categoryFilter) {
        return false;
      }
      const r =
        u.category === "Prime Mover" ? radarMap.get(u.unitCode) : undefined;
      if (onlyDueFilter) {
        if (!r || (r.readinessStatus !== "Overdue" && r.readinessStatus !== "Due Soon")) {
          return false;
        }
      }
      if (!q) return true;
      return (
        u.unitCode.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q) ||
        (u.headUnitCode || "").toLowerCase().includes(q)
      );
    });
  }, [availableUnits, radarMap, search, categoryFilter, onlyDueFilter]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10">
              <Layers size={18} className="text-[#e95623]" />
            </div>
            <div>
              <h3 className="text-base font-black">Tambah Unit Periodic Service Massal</h3>
              <p className="text-xs text-slate-300">
                Tanggal Servis: <strong className="text-white">{date}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tipe Servis Default
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                {PM_SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Shift
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                {PM_SHIFT_OPTIONS.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {UNIT_CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat === "ALL" ? "Semua Kategori" : cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari PMxxx, DLxxx, STxxx..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyDueFilter((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                onlyDueFilter
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Prioritas Due Soon / Overdue
            </button>

            <button
              type="button"
              onClick={() => {
                const selectable = filteredUnits
                  .filter((u) => !existingUnitCodesOnDate.has(u.unitCode))
                  .map((u) => u.unitCode);
                setSelectedCodes(selectable);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer"
            >
              Pilih Semua
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredUnits.map((u) => {
            const alreadyScheduled = existingUnitCodesOnDate.has(u.unitCode);
            const checked = selectedCodes.includes(u.unitCode);
            const radar = radarMap.get(u.unitCode);
            const readinessStyle = radar
              ? getPmReadinessStyle(radar.readinessStatus)
              : null;

            return (
              <label
                key={u.unitCode}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                  alreadyScheduled
                    ? "bg-slate-100 border-slate-200 opacity-55 cursor-not-allowed"
                    : checked
                    ? "bg-orange-50 border-[#e95623] cursor-pointer"
                    : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={alreadyScheduled}
                  checked={checked}
                  onChange={() => toggleCode(u.unitCode)}
                  className="mt-1 accent-[#e95623]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-black text-xs text-slate-900">
                      {u.unitCode}
                    </span>
                    {alreadyScheduled ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                        Sudah Terjadwal
                      </span>
                    ) : readinessStyle &&
                      (radar?.readinessStatus === "Overdue" ||
                        radar?.readinessStatus === "Due Soon") ? (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${readinessStyle.badge}`}
                      >
                        {readinessStyle.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {u.category} • {u.model}
                    {u.category !== "Prime Mover" && u.headUnitCode
                      ? ` (Head ${u.headUnitCode})`
                      : " (Buntut terpisah)"}
                  </div>
                  {radar?.hasTelemetry && (
                    <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                      {formatKm(radar.liveKm)} • Sisa{" "}
                      {radar.remainingKm?.toLocaleString("id-ID") ?? "-"} km
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">
            {selectedCodes.length} unit dipilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSaving || selectedCodes.length === 0}
              onClick={() =>
                onSubmit({
                  date,
                  unitCodes: selectedCodes,
                  serviceType,
                  shift,
                })
              }
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} />
              <span>
                {isSaving
                  ? "Menyimpan..."
                  : `Jadwalkan ${selectedCodes.length} Unit`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PmTargetModalProps {
  isOpen: boolean;
  defaultDailyTarget: number;
  specificDate: string | null;
  specificDayTarget: number | null;
  days?: DaySchedule[];
  isSaving: boolean;
  onClose: () => void;
  onSaveGlobalTarget: (newTarget: number) => Promise<void>;
  onSaveDayTarget: (date: string, newTarget: number) => Promise<void>;
  onSaveMultipleDayTargets?: (
    targets: { date: string; targetUnits: number }[]
  ) => Promise<void>;
}

/** Modal to configure global daily Periodic Service target or override a specific day's target. */
export const PmTargetModal: React.FC<PmTargetModalProps> = ({
  isOpen,
  defaultDailyTarget,
  specificDate,
  specificDayTarget,
  days = [],
  isSaving,
  onClose,
  onSaveGlobalTarget,
  onSaveDayTarget,
  onSaveMultipleDayTargets,
}) => {
  // Modal mode: "single" (focused on one date), "weekly" (per-day table for all 7 days), or "global" (system default target)
  const [activeTab, setActiveTab] = useState<"weekly" | "global" | "single">(
    "weekly"
  );
  const [globalVal, setGlobalVal] = useState<string>("4");
  const [singleVal, setSingleVal] = useState<number>(4);
  const [dailyMap, setDailyMap] = useState<Record<string, number>>({});

  // Initialize or reset state when opening modal
  React.useEffect(() => {
    if (!isOpen) return;

    const baseDefault =
      defaultDailyTarget != null && !isNaN(defaultDailyTarget)
        ? defaultDailyTarget
        : 4;
    setGlobalVal(String(baseDefault));

    // Initialize per-day map from days array
    const map: Record<string, number> = {};
    days.forEach((d) => {
      map[d.date] =
        d.targetUnits !== undefined && !isNaN(d.targetUnits)
          ? d.targetUnits
          : baseDefault;
    });
    setDailyMap(map);

    if (specificDate) {
      setActiveTab("single");
      const dayExisting =
        specificDayTarget != null
          ? specificDayTarget
          : map[specificDate] ?? baseDefault;
      setSingleVal(dayExisting);
    } else {
      setActiveTab("weekly");
    }
  }, [isOpen, defaultDailyTarget, specificDate, specificDayTarget, days]);

  if (!isOpen) return null;

  const currentDayInfo = days.find((d) => d.date === specificDate);
  const totalWeeklyPlan = days.reduce(
    (sum, d) => sum + (dailyMap[d.date] ?? d.targetUnits ?? defaultDailyTarget),
    0
  );

  const handleDayValueChange = (date: string, delta: number) => {
    setDailyMap((prev) => {
      const current = prev[date] ?? defaultDailyTarget;
      const next = Math.max(0, Math.min(50, current + delta));
      return { ...prev, [date]: next };
    });
  };

  const handleDayValueDirect = (date: string, valStr: string) => {
    const parsed = parseInt(valStr || "0", 10);
    const next = isNaN(parsed) ? 0 : Math.max(0, Math.min(50, parsed));
    setDailyMap((prev) => ({ ...prev, [date]: next }));
  };

  const applyPresetAll = (targetVal: number) => {
    const nextMap: Record<string, number> = {};
    days.forEach((d) => {
      nextMap[d.date] = targetVal;
    });
    setDailyMap(nextMap);
  };

  const applyPresetWorkdays = (workdayTarget: number, weekendTarget: number) => {
    const nextMap: Record<string, number> = {};
    days.forEach((d) => {
      const isWeekend =
        d.dayName?.toLowerCase().includes("sab") ||
        d.dayName?.toLowerCase().includes("min");
      nextMap[d.date] = isWeekend ? weekendTarget : workdayTarget;
    });
    setDailyMap(nextMap);
  };

  const handleSaveWeeklyAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = days.map((d) => ({
      date: d.date,
      targetUnits: dailyMap[d.date] ?? d.targetUnits ?? defaultDailyTarget,
    }));

    if (onSaveMultipleDayTargets) {
      await onSaveMultipleDayTargets(payload);
    } else {
      await Promise.all(
        payload.map((p) => onSaveDayTarget(p.date, p.targetUnits))
      );
    }
  };

  const handleSaveSingleDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificDate) return;
    await onSaveDayTarget(specificDate, Math.max(0, singleVal));
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.max(0, parseInt(globalVal || "0", 10));
    await onSaveGlobalTarget(parsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#e95623]">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {activeTab === "single"
                  ? `Atur Plan Servis (${currentDayInfo?.dayName || specificDate})`
                  : activeTab === "weekly"
                  ? "Atur Plan Periodic Service Per Hari"
                  : "Atur Target Default Global"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {activeTab === "single"
                  ? `${currentDayInfo?.dayDateFormatted || specificDate} • Default: ${defaultDailyTarget} Unit/Hari`
                  : activeTab === "weekly"
                  ? `Rencana target unit per hari (Default sistem: ${defaultDailyTarget} unit)`
                  : "Target acuan otomatis untuk hari baru"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "weekly"
                ? "bg-[#e95623] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Calendar size={13} />
            <span>Target Per Hari (7 Hari)</span>
          </button>

          {specificDate && (
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "single"
                  ? "bg-[#e95623] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Pencil size={13} />
              <span>Khusus {currentDayInfo?.dayName || specificDate}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("global")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "global"
                ? "bg-[#e95623] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Target Default ({defaultDailyTarget} Unit)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: WEEKLY PER-DAY TARGETS */}
          {activeTab === "weekly" && (
            <form onSubmit={handleSaveWeeklyAll} className="space-y-4">
              {/* Presets & Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-orange-50/60 border border-orange-200/80 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#e95623] shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    Preset Cepat:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPresetAll(defaultDailyTarget)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 hover:border-[#e95623] text-slate-700 rounded-lg cursor-pointer transition-all shadow-2xs"
                  >
                    Semua {defaultDailyTarget} Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetWorkdays(defaultDailyTarget, 0)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 hover:border-[#e95623] text-slate-700 rounded-lg cursor-pointer transition-all shadow-2xs"
                  >
                    Sen-Jum: {defaultDailyTarget}, Sab-Min: 0
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPresetWorkdays(
                        defaultDailyTarget,
                        Math.max(1, Math.floor(defaultDailyTarget / 2))
                      )
                    }
                    className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 hover:border-[#e95623] text-slate-700 rounded-lg cursor-pointer transition-all shadow-2xs"
                  >
                    Sen-Sab: {defaultDailyTarget}, Min: 0
                  </button>
                </div>
              </div>

              {/* Day-by-Day Table */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
                  Target Plan Per Hari (Minggu Berjalan)
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {days.map((day) => {
                    const currentVal =
                      dailyMap[day.date] ?? day.targetUnits ?? defaultDailyTarget;
                    const isCustom = currentVal !== defaultDailyTarget;
                    const isSelected = day.date === specificDate;

                    return (
                      <div
                        key={day.date}
                        className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                          isSelected
                            ? "bg-orange-50/70"
                            : day.isToday
                            ? "bg-slate-50/80"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Day Label */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-[#e95623]" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {day.dayName}
                              </span>
                              {day.isToday && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#e95623] text-white uppercase">
                                  Hari Ini
                                </span>
                              )}
                              {isCustom ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Kustom
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {day.dayDateFormatted}
                            </span>
                          </div>
                        </div>

                        {/* Counter Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleDayValueChange(day.date, -1)}
                              className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer font-bold transition-colors"
                              title="Kurang 1 unit"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={currentVal}
                              onChange={(e) =>
                                handleDayValueDirect(day.date, e.target.value)
                              }
                              className="w-12 text-center text-xs font-mono font-black bg-white py-1 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleDayValueChange(day.date, 1)}
                              className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer font-bold transition-colors"
                              title="Tambah 1 unit"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-500 w-8">
                            Unit
                          </span>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                setDailyMap((prev) => ({
                                  ...prev,
                                  [day.date]: defaultDailyTarget,
                                }))
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Kembalikan ke default"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Total Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Plan Minggu Ini
                  </div>
                  <div className="text-2xl font-black font-mono text-orange-400 mt-0.5">
                    {totalWeeklyPlan}{" "}
                    <span className="text-sm font-semibold text-slate-300">
                      Unit Servis
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Rata-rata: </span>
                  <strong className="text-white font-mono">
                    {(totalWeeklyPlan / Math.max(1, days.length)).toFixed(1)}{" "}
                    unit/hari
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Target Mingguan"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SPECIFIC SINGLE DAY TARGET */}
          {activeTab === "single" && specificDate && (
            <form onSubmit={handleSaveSingleDay} className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                <div className="text-xs font-black text-slate-900">
                  {currentDayInfo?.dayName || "Hari"}, {currentDayInfo?.dayDateFormatted || specificDate}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Target default sistem adalah <strong>{defaultDailyTarget} Unit/Hari</strong>. Mengubah input ini hanya akan berlaku khusus untuk tanggal ini saja.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jumlah Target Plan Unit Hari Ini
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setSingleVal((p) => Math.max(0, p - 1))}
                      className="px-3.5 py-2 text-slate-700 hover:bg-slate-200 cursor-pointer font-bold"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      required
                      value={singleVal}
                      onChange={(e) =>
                        setSingleVal(Math.max(0, parseInt(e.target.value || "0", 10)))
                      }
                      className="w-20 text-center text-lg font-mono font-black bg-white py-1.5 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setSingleVal((p) => p + 1)}
                      className="px-3.5 py-2 text-slate-700 hover:bg-slate-200 cursor-pointer font-bold"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    Unit Servis
                  </span>
                </div>

                {/* Quick Chips */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">
                    Cepat:
                  </span>
                  {[0, 1, 2, 3, 4, 5, 6, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSingleVal(n)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        singleVal === n
                          ? "bg-[#e95623] text-white border-[#e95623]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSingleVal(defaultDailyTarget)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#e95623] hover:underline cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Gunakan Default ({defaultDailyTarget} Unit)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Target Tanggal Ini"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: GLOBAL DEFAULT TARGET */}
          {activeTab === "global" && (
            <form onSubmit={handleSaveGlobal} className="space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl">
                <div className="text-xs font-black text-sky-950">
                  Target Standar / Default Global
                </div>
                <p className="text-[11px] text-sky-800 mt-1">
                  Target ini digunakan otomatis untuk hari-hari kerja baru yang belum memiliki target kustom. Mengubah nilai ini <strong>tidak akan</strong> menimpa hari yang targetnya sudah Anda atur secara spesifik.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Standar Default Per Hari
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={globalVal}
                    onChange={(e) => setGlobalVal(e.target.value)}
                    className="w-32 px-4 py-2.5 text-lg font-mono font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                  <span className="text-xs font-bold text-slate-600">
                    Unit / Hari
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Target Default"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export type PendingConfirmAction =
  | { type: "status"; item: PeriodicInspectionItem; nextStatus: string }
  | { type: "delete"; item: PeriodicInspectionItem };

export interface CompletionActualInput {
  actualHmServis: string;
  actualStartTime: string;
  actualLeadTime: string;
}

interface PmConfirmModalProps {
  action: PendingConfirmAction | null;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: (actualInput?: CompletionActualInput) => Promise<void>;
}

const PmConfirmModalBody: React.FC<{
  action: PendingConfirmAction;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: (actualInput?: CompletionActualInput) => Promise<void>;
}> = ({ action, isProcessing, onCancel, onConfirm }) => {
  const isDelete = action.type === "delete";
  const isCompleting = action.type === "status" && action.nextStatus === "Completed";
  const existingLead = parseLeadTimeHours(action.item.actualLeadTime);
  const [actualHmServis, setActualHmServis] = useState(
    action.item.actualHmServis != null ? String(action.item.actualHmServis) : ""
  );
  const [actualStartTime, setActualStartTime] = useState(
    action.item.actualStartTime || ""
  );
  const [actualLeadTime, setActualLeadTime] = useState(
    existingLead != null ? String(existingLead) : ""
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-2xl ${
              isDelete ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isDelete ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {isDelete ? "Hapus Jadwal Periodic Service?" : "Konfirmasi Perubahan Status"}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {isDelete ? (
                <>
                  Unit <strong className="font-mono">{action.item.unitCode}</strong> (
                  {action.item.serviceType}) tanggal{" "}
                  <strong>{action.item.date}</strong> akan dihapus dari jadwal Periodic Service.
                </>
              ) : (
                <>
                  Ubah status servis unit{" "}
                  <strong className="font-mono">{action.item.unitCode}</strong> dari{" "}
                  <strong>{action.item.status}</strong> menjadi{" "}
                  <strong className="text-[#e95623]">{action.nextStatus}</strong>?
                </>
              )}
            </p>
          </div>
        </div>

        {isCompleting && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-[11px] font-extrabold text-slate-700">
              Input Realisasi Aktual Servis (Opsional untuk KPI)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Actual HM
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualHmServis}
                  onChange={(e) => setActualHmServis(e.target.value)}
                  placeholder="e.g. 525"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Actual Start
                </label>
                <input
                  type="time"
                  value={actualStartTime}
                  onChange={(e) => setActualStartTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Lead (Jam)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={actualLeadTime}
                  onChange={(e) => setActualLeadTime(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>
            </div>
            {(action.item.planHmServis ||
              action.item.planStartTime ||
              action.item.planLeadTime) && (
              <p className="text-[10px] text-slate-500 font-mono">
                Plan: {action.item.planHmServis || "-"} •{" "}
                {action.item.planStartTime || "--:--"} •{" "}
                {action.item.planLeadTime || "-"}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              onConfirm(
                isCompleting
                  ? {
                      actualHmServis,
                      actualStartTime,
                      actualLeadTime,
                    }
                  : undefined
              )
            }
            className={`px-5 py-2 rounded-xl text-xs font-black text-white cursor-pointer disabled:opacity-50 ${
              isDelete
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[#e95623] hover:bg-[#d44818]"
            }`}
          >
            {isProcessing
              ? "Memproses..."
              : isDelete
              ? "Ya, Hapus"
              : "Ya, Ubah Status"}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Confirmation dialog protecting status updates and deletions from accidental clicks. */
export const PmConfirmModal: React.FC<PmConfirmModalProps> = ({
  action,
  isProcessing,
  onCancel,
  onConfirm,
}) => {
  if (!action) return null;
  const actionKey = `${action.type}:${action.item.id}:${
    action.type === "status" ? action.nextStatus : "del"
  }`;
  return (
    <PmConfirmModalBody
      key={actionKey}
      action={action}
      isProcessing={isProcessing}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
