"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Search,
  Settings2,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  MasterUnit,
  PeriodicInspectionItem,
  PlantPersonnelItem,
  PmRadarUnit,
} from "../services/plantService";
import {
  computePmTargetsClient,
  formatHm,
  formatKm,
  getPmReadinessStyle,
  PM_SERVICE_TYPES,
  PM_SHIFT_OPTIONS,
  PM_STATUS_OPTIONS,
  PS_CATEGORY_OPTIONS,
  PS_HM_SERVIS_OPTIONS,
  PS_LEAD_TIME_OPTIONS,
  PS_START_TIME_OPTIONS,
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
  supervisorName: string;
  mechanicNames: string[];
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
  const [showTelemetryInputs, setShowTelemetryInputs] = useState(false);

  React.useEffect(() => {
    setForm(initialValues);
    setShowTelemetryInputs(mode === "edit");
  }, [initialValues, isOpen, mode]);

  const siteLabel = selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur";
  const selectedRadar = radarMap.get(form.unitCode);
  const selectedUnitObj = availableUnits.find((u) => u.unitCode === form.unitCode);

  const groupedSupervisors = useMemo(
    () => splitBySiteBranch(supervisors, selectedSite),
    [supervisors, selectedSite]
  );

  const groupedMechanics = useMemo(
    () => splitBySiteBranch(mechanics, selectedSite),
    [mechanics, selectedSite]
  );

  const hmServisChoices = useMemo(() => {
    const opts: string[] = [];
    if (selectedRadar?.targetHm) {
      opts.push(
        `Target ${selectedRadar.targetHm.toLocaleString("id-ID")} HM (${
          selectedRadar.hmServiceLabel || "Live Volvo"
        })`
      );
    }
    for (const preset of PS_HM_SERVIS_OPTIONS) {
      if (!opts.includes(preset)) opts.push(preset);
    }
    if (form.planHmServis && !opts.includes(form.planHmServis)) {
      opts.unshift(form.planHmServis);
    }
    return opts;
  }, [selectedRadar, form.planHmServis]);

  const handleUnitChange = (unitCode: string) => {
    const r = radarMap.get(unitCode);
    const liveKmVal = r?.liveKm ?? null;
    const liveHmVal = r?.liveHm ?? null;
    const recService = r?.recommendedServiceType || form.serviceType;
    const targets = computePmTargetsClient(recService, liveKmVal, liveHmVal);
    const autoPlanHm = r?.targetHm
      ? `Target ${r.targetHm.toLocaleString("id-ID")} HM (${r.hmServiceLabel || "Live Volvo"})`
      : r?.hmServiceLabel || form.planHmServis || PS_HM_SERVIS_OPTIONS[0];

    setForm((prev) => ({
      ...prev,
      unitCode,
      serviceType: recService,
      planHmServis: autoPlanHm,
      currentKm: liveKmVal != null ? String(liveKmVal) : "",
      currentHm: liveHmVal != null ? String(liveHmVal) : "",
      nextDueKm: targets.nextDueKm != null ? String(targets.nextDueKm) : "",
      nextDueHm: targets.nextDueHm != null ? String(targets.nextDueHm) : "",
    }));
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
                Site: <strong className="text-slate-700">{siteLabel}</strong> • Pilih unit
                kepala (Prime Mover)
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

          {/* Pilih Unit Kepala (Prime Mover) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Pilih Unit Kepala (Prime Mover) di {siteLabel}
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                {availableUnits.length} Unit Aktif
              </span>
            </div>
            {mode === "edit" ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 font-mono font-black text-slate-900 text-xs">
                {form.unitCode} •{" "}
                {selectedUnitObj?.trailers?.summary || selectedUnitObj?.buntutSummary || "-"}
              </div>
            ) : (
              <select
                required
                value={form.unitCode}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                <option value="">-- Pilih Unit Kepala (PM) --</option>
                {availableUnits.map((u) => {
                  const r = radarMap.get(u.unitCode);
                  const tag =
                    r && (r.readinessStatus === "Overdue" || r.readinessStatus === "Due Soon")
                      ? ` [${r.readinessStatus} • Sisa ${r.remainingKm ?? "-"} km]`
                      : r?.liveKm
                      ? ` [${r.liveKm.toLocaleString("id-ID")} km]`
                      : "";
                  return (
                    <option key={u.unitCode} value={u.unitCode}>
                      {u.unitCode} • {u.trailers?.summary || u.buntutSummary || "-"}
                      {tag}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Live Volvo Telemetry Preview */}
          {selectedRadar && (
            <div className="px-3.5 py-2.5 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-800">
                <Gauge size={14} className="text-[#e95623]" />
                <span>
                  <strong>Volvo Live:</strong> {formatKm(selectedRadar.liveKm)} |{" "}
                  {formatHm(selectedRadar.liveHm)}
                </span>
              </div>
              <span className="font-bold text-slate-600">
                Buntut:{" "}
                <strong className="font-mono">
                  {selectedUnitObj?.trailers?.summary ||
                    selectedRadar.buntutSummary ||
                    "-"}
                </strong>
              </span>
            </div>
          )}

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
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Plan HM Servis
              </label>
              <select
                value={form.planHmServis}
                onChange={(e) =>
                  setForm((p) => ({ ...p, planHmServis: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
              >
                <option value="">-- Pilih Target HM Servis --</option>
                {hmServisChoices.map((hmOpt) => (
                  <option key={hmOpt} value={hmOpt}>
                    {hmOpt}
                  </option>
                ))}
              </select>
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

          {/* Status & Telemetry Advanced Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTelemetryInputs((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#e95623] cursor-pointer"
            >
              {showTelemetryInputs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>
                {mode === "edit"
                  ? "Status Pengerjaan & Angka KM / HM Detail"
                  : "Atur Angka KM / HM & Status (Opsional)"}
              </span>
            </button>

            {showTelemetryInputs && (
              <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Status Servis
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  >
                    {PM_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

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
  const [onlyDueFilter, setOnlyDueFilter] = useState(false);
  const [serviceType, setServiceType] = useState<string>(PM_SERVICE_TYPES[0]);
  const [shift, setShift] = useState<string>("Shift 1");

  React.useEffect(() => {
    if (isOpen) {
      setSelectedCodes([]);
      setSearch("");
      setOnlyDueFilter(false);
    }
  }, [isOpen, date]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableUnits.filter((u) => {
      const r = radarMap.get(u.unitCode);
      if (onlyDueFilter) {
        if (!r || (r.readinessStatus !== "Overdue" && r.readinessStatus !== "Due Soon")) {
          return false;
        }
      }
      if (!q) return true;
      return (
        u.unitCode.toLowerCase().includes(q) ||
        (u.trailers?.summary || u.buntutSummary || "").toLowerCase().includes(q)
      );
    });
  }, [availableUnits, radarMap, search, onlyDueFilter]);

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
                placeholder="Cari PMxxx atau buntut..."
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
                    {u.trailers?.summary || u.buntutSummary || "-"}
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
  isSaving: boolean;
  onClose: () => void;
  onSaveGlobalTarget: (newTarget: number) => Promise<void>;
  onSaveDayTarget: (date: string, newTarget: number) => Promise<void>;
}

/** Modal to configure global daily Periodic Service target or override a specific day's target. */
export const PmTargetModal: React.FC<PmTargetModalProps> = ({
  isOpen,
  defaultDailyTarget,
  specificDate,
  specificDayTarget,
  isSaving,
  onClose,
  onSaveGlobalTarget,
  onSaveDayTarget,
}) => {
  const [val, setVal] = useState<string>("4");

  React.useEffect(() => {
    if (specificDate && specificDayTarget != null) {
      setVal(String(specificDayTarget));
    } else {
      setVal(String(defaultDailyTarget || 4));
    }
  }, [isOpen, defaultDailyTarget, specificDate, specificDayTarget]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-[#e95623]" />
            <h3 className="text-sm font-black">
              {specificDate
                ? `Atur Plan Periodic Service Harian (${specificDate})`
                : "Atur Target Plan Periodic Service Default"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = Math.max(1, parseInt(val || "4", 10));
            if (specificDate) {
              await onSaveDayTarget(specificDate, parsed);
            } else {
              await onSaveGlobalTarget(parsed);
            }
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jumlah Unit Target Per Hari
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full px-4 py-2.5 text-lg font-mono font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              {specificDate
                ? `Hanya mengubah target plan khusus tanggal ${specificDate}.`
                : "Berlaku sebagai target plan harian standar untuk seluruh hari kerja."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
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
              className="px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Target"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export type PendingConfirmAction =
  | { type: "status"; item: PeriodicInspectionItem; nextStatus: string }
  | { type: "delete"; item: PeriodicInspectionItem };

interface PmConfirmModalProps {
  action: PendingConfirmAction | null;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

/** Confirmation dialog protecting status updates and deletions from accidental clicks. */
export const PmConfirmModal: React.FC<PmConfirmModalProps> = ({
  action,
  isProcessing,
  onCancel,
  onConfirm,
}) => {
  if (!action) return null;

  const isDelete = action.type === "delete";

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
            onClick={onConfirm}
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
