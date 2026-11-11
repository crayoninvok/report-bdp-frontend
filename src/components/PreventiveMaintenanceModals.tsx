"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Gauge,
  Layers,
  Plus,
  Search,
  Settings2,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  MasterUnit,
  PeriodicInspectionItem,
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
} from "../utils/pmHelpers";

export interface PmUnitFormValues {
  date: string;
  unitCode: string;
  serviceType: string;
  shift: string;
  status: string;
  mechanicName: string;
  currentKm: string;
  currentHm: string;
  nextDueKm: string;
  nextDueHm: string;
  notes: string;
}

interface PmUnitFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialValues: PmUnitFormValues;
  availableUnits: MasterUnit[];
  radarMap: Map<string, PmRadarUnit>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: PmUnitFormValues) => Promise<void>;
}

/** Unified Add & Edit modal with live Volvo KM/HM auto-fill and target calculation. */
export const PmUnitFormModal: React.FC<PmUnitFormModalProps> = ({
  isOpen,
  mode,
  initialValues,
  availableUnits,
  radarMap,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<PmUnitFormValues>(initialValues);

  React.useEffect(() => {
    setForm(initialValues);
  }, [initialValues, isOpen]);

  const selectedRadar = radarMap.get(form.unitCode);
  const selectedUnitObj = availableUnits.find((u) => u.unitCode === form.unitCode);

  const handleUnitChange = (unitCode: string) => {
    const r = radarMap.get(unitCode);
    const liveKmVal = r?.liveKm ?? null;
    const liveHmVal = r?.liveHm ?? null;
    const recService = r?.recommendedServiceType || form.serviceType;
    const targets = computePmTargetsClient(recService, liveKmVal, liveHmVal);

    setForm((prev) => ({
      ...prev,
      unitCode,
      serviceType: recService,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10">
              <Truck size={18} className="text-[#e95623]" />
            </div>
            <div>
              <h3 className="text-base font-black">
                {mode === "add"
                  ? "Jadwalkan Unit Preventive Maintenance"
                  : `Edit Jadwal PM • ${form.unitCode}`}
              </h3>
              <p className="text-xs text-slate-300">
                Tanggal Rencana: {form.date}
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

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(form);
          }}
          className="p-6 space-y-4 max-h-[78vh] overflow-y-auto"
        >
          {/* Unit & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Unit Prime Mover
              </label>
              {mode === "edit" ? (
                <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono font-black text-slate-900 text-sm">
                  {form.unitCode}
                </div>
              ) : (
                <select
                  required
                  value={form.unitCode}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
                >
                  <option value="">-- Pilih Unit Head --</option>
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

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Tanggal Schedule
              </label>
              <input
                type="date"
                required
                disabled={mode === "edit"}
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 focus:outline-none focus:border-[#e95623]"
              />
            </div>
          </div>

          {/* Live Telemetry Preview Strip */}
          {selectedRadar && (
            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-800">
                <Gauge size={15} className="text-[#e95623]" />
                <span>
                  <strong>Volvo Live:</strong> {formatKm(selectedRadar.liveKm)} |{" "}
                  {formatHm(selectedRadar.liveHm)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600">
                Buntut:{" "}
                <strong className="font-mono">
                  {selectedUnitObj?.trailers?.summary ||
                    selectedRadar.buntutSummary ||
                    "-"}
                </strong>
              </span>
            </div>
          )}

          {/* Service Type, Shift, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Jenis Service (PM)
              </label>
              <select
                value={form.serviceType}
                onChange={(e) => handleServiceTypeChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              >
                {PM_SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Shift
              </label>
              <select
                value={form.shift}
                onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              >
                {PM_SHIFT_OPTIONS.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              >
                {PM_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KM & HM Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      targets.nextDueKm != null ? String(targets.nextDueKm) : p.nextDueKm,
                  }));
                }}
                placeholder="161000"
                className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Target KM Next
              </label>
              <input
                type="number"
                value={form.nextDueKm}
                onChange={(e) => setForm((p) => ({ ...p, nextDueKm: e.target.value }))}
                placeholder="173000"
                className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
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
                      targets.nextDueHm != null ? String(targets.nextDueHm) : p.nextDueHm,
                  }));
                }}
                placeholder="6275.5"
                className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
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
                onChange={(e) => setForm((p) => ({ ...p, nextDueHm: e.target.value }))}
                placeholder="6525.5"
                className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              />
            </div>
          </div>

          {/* Mechanic & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Mekanik Pelaksana
              </label>
              <input
                type="text"
                value={form.mechanicName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, mechanicName: e.target.value }))
                }
                placeholder="Nama mekanik / tim pit..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Catatan Pekerjaan / Part
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Ganti oli engine, filter solar, greasing..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.unitCode}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d44818] text-white shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Plus size={14} />
              <span>
                {isSaving
                  ? "Menyimpan..."
                  : mode === "add"
                  ? "Simpan Jadwal PM"
                  : "Perbarui Jadwal PM"}
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
              <h3 className="text-base font-black">Tambah Unit PM Massal</h3>
              <p className="text-xs text-slate-300">
                Tanggal Target: <strong className="text-white">{date}</strong>
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
                Jenis Service Default
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl"
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
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl"
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
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
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

/** Modal to configure global daily PM target or override a specific day's target. */
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
                ? `Atur Plan PM Harian (${specificDate})`
                : "Atur Target Plan PM Harian Default"}
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
              className="w-full px-4 py-2.5 text-lg font-mono font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e95623]"
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
              {isDelete ? "Hapus Jadwal Unit PM?" : "Konfirmasi Perubahan Status"}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {isDelete ? (
                <>
                  Unit <strong className="font-mono">{action.item.unitCode}</strong> (
                  {action.item.serviceType}) tanggal{" "}
                  <strong>{action.item.date}</strong> akan dihapus dari jadwal PM.
                </>
              ) : (
                <>
                  Ubah status PM unit{" "}
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

