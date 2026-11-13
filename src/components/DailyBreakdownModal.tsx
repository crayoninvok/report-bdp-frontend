"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Save, AlertTriangle, Clock, Wrench, CheckCircle, Calculator } from "lucide-react";
import { DailyBreakdownItem, DailyBreakdownInput, MasterUnit, plantService } from "../services/plantService";
import { useNotification } from "../context/NotificationContext";

export const BREAKDOWN_CATEGORIES = [
  { value: "SCM", label: "SCM - Scheduled Corrective Maintenance", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "USM", label: "USM - Unscheduled Corrective Maintenance", badge: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "TSM", label: "TSM - Tyre Scheduled Maintenance", badge: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "TUM", label: "TUM - Tyre Unscheduled Maintenance", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "ICM", label: "ICM - Inspection Corrective Maintenance", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
];

export const BREAKDOWN_COMPONENTS = [
  "Engine",
  "Clutch",
  "Transmission",
  "Axle",
  "Steering",
  "Frame",
  "Undercarriage",
  "Electrical",
  "Brake",
  "Suspension",
  "Hydraulic",
  "Pneumatic",
  "Attachment",
  "Generator",
  "Optional",
  "250 Hrs Service",
  "500 Hrs Service",
  "1000 Hrs Service",
  "2000 Hrs Service",
  "12000 Km Service",
  "24000 Km Service",
  "36000 Km Service",
  "48000 Km Service",
  "Periodical Service",
  "Lainnya",
];

interface DailyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit: DailyBreakdownItem | null;
  defaultSite: "MuaraPahu" | "Senyiur";
  masterUnits: MasterUnit[];
}

export const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  itemToEdit,
  defaultSite,
  masterUnits,
}) => {
  const { showSuccess, showError } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState<string>("");
  const [jobSite, setJobSite] = useState<string>(defaultSite);
  const [unitCode, setUnitCode] = useState<string>("");
  const [unitType, setUnitType] = useState<string>("");
  const [woNumber, setWoNumber] = useState<string>("");
  const [hm, setHm] = useState<string>("");
  const [km, setKm] = useState<string>("");
  const [category, setCategory] = useState<string>("SCM");
  const [startTime, setStartTime] = useState<string>("");
  const [finishTime, setFinishTime] = useState<string>("");
  const [durationHours, setDurationHours] = useState<string>("");
  const [breakdownDescription, setBreakdownDescription] = useState<string>("");
  const [detailActivity, setDetailActivity] = useState<string>("");
  const [component, setComponent] = useState<string>("Suspension");
  const [mechanic, setMechanic] = useState<string>("");
  const [supervisor, setSupervisor] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [status, setStatus] = useState<string>("Open");
  const [notes, setNotes] = useState<string>("");

  // Initialize form when opening or editing
  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      setDate(itemToEdit.date || "");
      setJobSite(itemToEdit.jobSite || defaultSite);
      setUnitCode(itemToEdit.unitCode || "");
      setUnitType(itemToEdit.unitType || "");
      setWoNumber(itemToEdit.woNumber || "");
      setHm(itemToEdit.hm != null ? String(itemToEdit.hm) : "");
      setKm(itemToEdit.km != null ? String(itemToEdit.km) : "");
      setCategory(itemToEdit.category || "SCM");
      setStartTime(itemToEdit.startTime || "");
      setFinishTime(itemToEdit.finishTime || "");
      setDurationHours(itemToEdit.durationHours != null ? String(itemToEdit.durationHours) : "");
      setBreakdownDescription(itemToEdit.breakdownDescription || "");
      setDetailActivity(itemToEdit.detailActivity || "");
      setComponent(itemToEdit.component || "Suspension");
      setMechanic(itemToEdit.mechanic || "");
      setSupervisor(itemToEdit.supervisor || "");
      setLocation(itemToEdit.location || (defaultSite === "Senyiur" ? "Senyiur" : "Muara Pahu"));
      setStatus(itemToEdit.status || "Open");
      setNotes(itemToEdit.notes || "");
    } else {
      const todayIso = new Date().toISOString().split("T")[0];
      setDate(todayIso);
      setJobSite(defaultSite);
      setUnitCode("");
      setUnitType("");
      setWoNumber("");
      setHm("");
      setKm("");
      setCategory("SCM");
      setStartTime("07:00");
      setFinishTime("");
      setDurationHours("");
      setBreakdownDescription("");
      setDetailActivity("");
      setComponent("Suspension");
      setMechanic("");
      setSupervisor("");
      setLocation(defaultSite === "Senyiur" ? "Senyiur" : "Muara Pahu");
      setStatus("Open");
      setNotes("");
    }
  }, [isOpen, itemToEdit, defaultSite]);

  // Handle unit selection change -> auto-fill unitType, hm, km
  const handleUnitCodeChange = (selectedCode: string) => {
    setUnitCode(selectedCode);
    const found = masterUnits.find((u) => u.unitCode.toLowerCase() === selectedCode.toLowerCase());
    if (found) {
      if (!unitType || !itemToEdit) setUnitType(found.model || "");
      if (found.currentHm != null && (!hm || !itemToEdit)) setHm(String(found.currentHm));
      if (found.currentKm != null && (!km || !itemToEdit)) setKm(String(found.currentKm));
    }
  };

  // Auto-calculate duration from start & finish time
  const autoCalculateDuration = () => {
    if (!startTime || !finishTime) return;
    const sParts = startTime.split(":");
    const fParts = finishTime.split(":");
    if (sParts.length < 2 || fParts.length < 2) return;
    const sMin = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
    const fMin = parseInt(fParts[0], 10) * 60 + parseInt(fParts[1], 10);
    let diff = fMin - sMin;
    if (diff < 0) diff += 24 * 60; // Over midnight
    const dur = Math.round((diff / 60) * 100) / 100;
    setDurationHours(String(dur));
  };

  // Filter master unit suggestions
  const filteredUnits = useMemo(() => {
    return masterUnits.filter((u) => u.jobSite === jobSite || !u.jobSite);
  }, [masterUnits, jobSite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      showError("Tanggal breakdown wajib diisi");
      return;
    }
    if (!unitCode.trim()) {
      showError("Vehicle Number / Unit Code wajib diisi");
      return;
    }
    if (!breakdownDescription.trim()) {
      showError("Breakdown Description wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: DailyBreakdownInput = {
        date,
        jobSite,
        unitCode: unitCode.trim().toUpperCase(),
        unitType: unitType.trim() || undefined,
        woNumber: woNumber.trim() || undefined,
        hm: hm ? Number(hm) : null,
        km: km ? Number(km) : null,
        category,
        startTime: startTime.trim() || undefined,
        finishTime: finishTime.trim() || undefined,
        durationHours: durationHours ? Number(durationHours) : 0,
        breakdownDescription: breakdownDescription.trim(),
        detailActivity: detailActivity.trim() || undefined,
        component: component.trim() || undefined,
        mechanic: mechanic.trim() || undefined,
        supervisor: supervisor.trim() || undefined,
        location: location.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      };

      if (itemToEdit) {
        await plantService.updateDailyBreakdown(itemToEdit.id, payload);
        showSuccess(`Data breakdown unit ${payload.unitCode} berhasil diperbarui.`);
      } else {
        await plantService.createDailyBreakdown(payload);
        showSuccess(`Data breakdown unit ${payload.unitCode} berhasil dicatat.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error submitting breakdown:", err);
      showError(err.message || "Gagal menyimpan data breakdown");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-orange-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-orange-100 text-[#e95623] flex items-center justify-center shrink-0 border border-orange-200">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {itemToEdit ? "Edit Daily Breakdown Report" : "Input Daily Breakdown Report Baru"}
              </h2>
              <p className="text-xs text-slate-500">
                Formulir pencatatan breakdown unit, riwayat downtime, aktivitas perbaikan &amp; komponen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section 1: Basic Identitas & Unit */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#e95623]" />
              Identitas Unit &amp; Pelaksanaan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
              {/* Tanggal */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tanggal Breakdown <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Site */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Job Site</label>
                <select
                  value={jobSite}
                  onChange={(e) => setJobSite(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  <option value="MuaraPahu">Muara Pahu</option>
                  <option value="Senyiur">Senyiur</option>
                </select>
              </div>

              {/* Vehicle Number (Unit Code) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Vehicle Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PM401"
                    list="breakdown-unit-suggestions"
                    value={unitCode}
                    onChange={(e) => handleUnitCodeChange(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                  />
                  <datalist id="breakdown-unit-suggestions">
                    {filteredUnits.map((u) => (
                      <option key={u.id} value={u.unitCode}>
                        {u.unitCode} - {u.category} ({u.model})
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Type / Model */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Type / Model Unit
                </label>
                <input
                  type="text"
                  placeholder="Contoh: FH16"
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* No WO */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">No WO</label>
                <input
                  type="text"
                  placeholder="Nomor Work Order (XXX)"
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* HM */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">HM (Hour Meter)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Contoh: 2000"
                  value={hm}
                  onChange={(e) => setHm(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* KM */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">KM (Odometer)</label>
                <input
                  type="number"
                  placeholder="Contoh: 124000"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Status Breakdown
                </label>
                <div className="flex items-center gap-2 h-9">
                  <button
                    type="button"
                    onClick={() => setStatus("Open")}
                    className={`flex-1 h-full rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === "Open"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("Close")}
                    className={`flex-1 h-full rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      status === "Close"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <CheckCircle size={13} />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Waktu Breakdown & Klasifikasi */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Waktu Downtime &amp; Kategori Kerusakan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
              {/* Category Breakdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category Breakdown <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  {BREAKDOWN_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Breakdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Start Breakdown
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Finish Breakdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Finish Breakdown
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={finishTime}
                    onChange={(e) => setFinishTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                  />
                  {startTime && finishTime && (
                    <button
                      type="button"
                      onClick={autoCalculateDuration}
                      title="Hitung Durasi Otomatis"
                      className="h-9 px-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#e95623] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Calculator size={13} />
                      <span className="text-[10px]">Hitung</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Durasi Jam */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Durasi Downtime (Jam)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Contoh: 3.00"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-black text-orange-600 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Deskripsi, Aktivitas & Komponen */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Detail Kerusakan, Aktivitas &amp; Komponen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
              {/* Breakdown Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Breakdown Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Spring Broken, Kebocoran Oli, dll."
                  value={breakdownDescription}
                  onChange={(e) => setBreakdownDescription(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Detail Activity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Detail Activity
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Replace Spring, Bleeding Brake, dll."
                  value={detailActivity}
                  onChange={(e) => setDetailActivity(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Component */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Component / Sistem
                </label>
                <select
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  {BREAKDOWN_COMPONENTS.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="Contoh: Muara Pahu, Senyiur, Workshop, KM 20"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Mechanic */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mechanic (PIC)
                </label>
                <input
                  type="text"
                  placeholder="Nama Mekanik (Contoh: Sandi)"
                  value={mechanic}
                  onChange={(e) => setMechanic(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Supervisor</label>
                <input
                  type="text"
                  placeholder="Nama Supervisor (Contoh: Bambang)"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{itemToEdit ? "Simpan Perubahan" : "Simpan Breakdown"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DailyBreakdownModal;
