"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Save,
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle,
  Calculator,
  Search,
  Check,
  Plus,
  Users,
  User,
  ChevronDown,
  Truck,
  Sparkles,
} from "lucide-react";
import {
  DailyBreakdownItem,
  DailyBreakdownInput,
  MasterUnit,
  PlantPersonnelItem,
  plantService,
} from "../services/plantService";
import { useNotification } from "../context/NotificationContext";
import { SUPPORT_UNIT_TYPES, isSupportCategory } from "../utils/pmHelpers";

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
  const [supervisor, setSupervisor] = useState<string>("");
  const [location, setLocation] = useState<string>("Muara Pahu");
  const [status, setStatus] = useState<string>("Open");
  const [notes, setNotes] = useState<string>("");

  // Multi-Select Mechanics State
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([]);
  const [mechanicSearchQuery, setMechanicSearchQuery] = useState<string>("");
  const [mechanicRoleFilter, setMechanicRoleFilter] = useState<string>("ALL");
  const [customMechanicName, setCustomMechanicName] = useState<string>("");
  const [isMechanicPickerOpen, setIsMechanicPickerOpen] = useState<boolean>(false);

  // HR Manpower Personnel
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [supervisorsList, setSupervisorsList] = useState<PlantPersonnelItem[]>([]);
  const [mechanicsList, setMechanicsList] = useState<PlantPersonnelItem[]>([]);

  // Fetch HR Manpower Personnel on modal open or site change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const fetchPersonnel = async () => {
      try {
        setPersonnelLoading(true);
        const res = await plantService.getPlantPersonnel(jobSite);
        if (!isCancelled && res.success && res.data) {
          setSupervisorsList(res.data.supervisors || []);
          setMechanicsList(res.data.mechanics || []);
        }
      } catch (err) {
        console.warn("Gagal mengambil data HR Manpower personnel:", err);
      } finally {
        if (!isCancelled) setPersonnelLoading(false);
      }
    };

    fetchPersonnel();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, jobSite]);

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
      setSupervisor(itemToEdit.supervisor || "");

      // Location strictly Muara Pahu or Senyiur
      const loc = itemToEdit.location?.trim();
      if (loc && (loc.toLowerCase().includes("senyiur") || loc.toLowerCase() === "senyiur")) {
        setLocation("Senyiur");
      } else {
        setLocation("Muara Pahu");
      }

      setStatus(itemToEdit.status || "Open");
      setNotes(itemToEdit.notes || "");

      // Parse comma-separated mechanics
      if (itemToEdit.mechanic) {
        const parsed = itemToEdit.mechanic
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        setSelectedMechanics(parsed);
      } else {
        setSelectedMechanics([]);
      }
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
      setSupervisor("");
      setLocation(defaultSite === "Senyiur" ? "Senyiur" : "Muara Pahu");
      setStatus("Open");
      setNotes("");
      setSelectedMechanics([]);
    }

    setMechanicSearchQuery("");
    setCustomMechanicName("");
    setIsMechanicPickerOpen(false);
  }, [isOpen, itemToEdit, defaultSite]);

  // Categorize MasterUnits: Hauling Prime Movers, Support Units, and Trailers
  const { primeMovers, supportUnitsList, trailersList } = useMemo(() => {
    const pm: MasterUnit[] = [];
    const sup: MasterUnit[] = [];
    const tr: MasterUnit[] = [];

    masterUnits.forEach((u) => {
      if (u.category === "Prime Mover") {
        pm.push(u);
      } else if (isSupportCategory(u.category)) {
        sup.push(u);
      } else {
        tr.push(u);
      }
    });

    return {
      primeMovers: pm.sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0)),
      supportUnitsList: sup.sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
      trailersList: tr.sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
    };
  }, [masterUnits]);

  // Handle unit selection change -> auto-fill unitType, hm, km
  const handleUnitCodeChange = (selectedCode: string) => {
    const upper = selectedCode.toUpperCase();
    setUnitCode(upper);

    // Look for exact match in MasterUnit
    const found = masterUnits.find((u) => u.unitCode.toUpperCase() === upper);
    if (found) {
      if (!unitType || !itemToEdit) setUnitType(found.model || found.category || "");
      if (found.currentHm != null && (!hm || !itemToEdit)) setHm(String(found.currentHm));
      if (found.currentKm != null && (!km || !itemToEdit)) setKm(String(found.currentKm));
    } else {
      // Check if code starts with a support unit prefix (e.g. LV, TH, FT, ST, WT, GS, etc.)
      const matchedSupport = SUPPORT_UNIT_TYPES.find((t) => upper.startsWith(t.prefix));
      if (matchedSupport && (!unitType || !itemToEdit)) {
        setUnitType(matchedSupport.category);
      }
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

  // Mechanics Filtered by search and role chip
  const filteredMechanics = useMemo(() => {
    return mechanicsList.filter((m) => {
      const q = mechanicSearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        (m.jobPosition && m.jobPosition.toLowerCase().includes(q)) ||
        (m.branchName && m.branchName.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (mechanicRoleFilter === "ALL") return true;
      const pos = (m.jobPosition || "").toLowerCase();
      if (mechanicRoleFilter === "MECHANIC") return pos.includes("mechanic") || pos.includes("mekanik");
      if (mechanicRoleFilter === "TYREMAN") return pos.includes("tyre");
      if (mechanicRoleFilter === "ELECTRICIAN") return pos.includes("electric");
      if (mechanicRoleFilter === "WELDER") return pos.includes("welder");

      return true;
    });
  }, [mechanicsList, mechanicSearchQuery, mechanicRoleFilter]);

  // Mechanic Selection Handlers
  const handleToggleMechanic = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSelectedMechanics((prev) =>
      prev.includes(trimmed) ? prev.filter((m) => m !== trimmed) : [...prev, trimmed]
    );
  };

  const handleRemoveMechanic = (name: string) => {
    setSelectedMechanics((prev) => prev.filter((m) => m !== name));
  };

  const handleAddCustomMechanic = () => {
    const trimmed = customMechanicName.trim();
    if (!trimmed) return;
    if (!selectedMechanics.includes(trimmed)) {
      setSelectedMechanics((prev) => [...prev, trimmed]);
    }
    setCustomMechanicName("");
  };

  // Submit Handler
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
        hm: hm !== "" ? parseFloat(hm) : undefined,
        km: km !== "" ? parseFloat(km) : undefined,
        category,
        startTime: startTime.trim() || "00:00",
        finishTime: finishTime.trim() || "00:00",
        durationHours: durationHours !== "" ? parseFloat(durationHours) : 0,
        breakdownDescription: breakdownDescription.trim(),
        detailActivity: detailActivity.trim() || undefined,
        component,
        mechanic: selectedMechanics.length > 0 ? selectedMechanics.join(", ") : undefined,
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
        showSuccess(`Data breakdown unit ${payload.unitCode} berhasil ditambahkan.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message || "Gagal menyimpan data Daily Breakdown Report");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {itemToEdit ? "Edit Daily Breakdown Report" : "Input Daily Breakdown Report Baru"}
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan breakdown unit, downtime, aktivitas perbaikan, komponen, &amp; personel perbaikan.
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

              {/* Job Site */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Job Site</label>
                <select
                  value={jobSite}
                  onChange={(e) => {
                    const nextSite = e.target.value;
                    setJobSite(nextSite);
                    setLocation(nextSite === "Senyiur" ? "Senyiur" : "Muara Pahu");
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  <option value="MuaraPahu">Muara Pahu</option>
                  <option value="Senyiur">Senyiur</option>
                </select>
              </div>

              {/* Vehicle Number (Unit Code) */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Vehicle Number (Hauling / Unit Support) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {primeMovers.length} PM &bull; {supportUnitsList.length} Support
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PM401, TH001, FT101, WT301, GS005, LV..."
                    list="breakdown-unit-suggestions"
                    value={unitCode}
                    onChange={(e) => handleUnitCodeChange(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                  />
                  <datalist id="breakdown-unit-suggestions">
                    {/* Unit Support Terdaftar */}
                    {supportUnitsList.map((u) => (
                      <option key={u.id} value={u.unitCode}>
                        [Support] {u.unitCode} - {u.category} ({u.brand} {u.model})
                      </option>
                    ))}
                    {/* Template Unit Support Standar */}
                    {SUPPORT_UNIT_TYPES.map((t) => (
                      <option key={t.prefix} value={`${t.prefix}-`}>
                        [Template Support] {t.label} ({t.category})
                      </option>
                    ))}
                    {/* Prime Mover Hauling */}
                    {primeMovers.map((u) => (
                      <option key={u.id} value={u.unitCode}>
                        [Hauling] {u.unitCode} - Prime Mover ({u.model})
                      </option>
                    ))}
                    {/* Trailer & Dolly */}
                    {trailersList.map((u) => (
                      <option key={u.id} value={u.unitCode}>
                        [Trailer] {u.unitCode} - {u.category} ({u.model})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Quick Support Unit Selector Pills */}
                {supportUnitsList.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">Pilih Cepat Support:</span>
                    {supportUnitsList.slice(0, 7).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleUnitCodeChange(u.unitCode)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                          unitCode === u.unitCode
                            ? "bg-orange-500 text-white border-orange-600"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                      >
                        {u.unitCode} ({u.category})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Type Unit */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Type / Model Unit
                </label>
                <input
                  type="text"
                  placeholder="Contoh: FH16, MXT-840, K24Y, SDT110"
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
                  placeholder="Contoh: WO-00123 / XXX"
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 uppercase focus:outline-hidden focus:ring-2 focus:ring-orange-400"
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
                  step="1"
                  placeholder="Contoh: 124000"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Waktu Breakdown & Durasi */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1e40af]" />
              Kategori &amp; Durasi Waktu Breakdown
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
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  {BREAKDOWN_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.value} ({c.label.split(" - ")[1]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Breakdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Start Breakdown (HH:mm)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onBlur={autoCalculateDuration}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Finish Breakdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Finish Breakdown (HH:mm)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={finishTime}
                    onChange={(e) => setFinishTime(e.target.value)}
                    onBlur={autoCalculateDuration}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Durasi (Jam) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">Durasi Downtime (Jam)</label>
                  <button
                    type="button"
                    onClick={autoCalculateDuration}
                    className="text-[10px] font-bold text-[#e95623] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator size={11} /> Hitung
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-black text-[#1e40af] focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Detail Breakdown & Komponen */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Detail Breakdown &amp; Tindakan
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
                  placeholder="Contoh: Spring Broken, Engine Overheat, Flat Tyre"
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
                  placeholder="Contoh: Replace Spring, Flushing Radiator, Patch Tyre"
                  value={detailActivity}
                  onChange={(e) => setDetailActivity(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Component */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Component <span className="text-rose-500">*</span>
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

              {/* Location (Dropdown Muara Pahu & Senyiur) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  <option value="Muara Pahu">Muara Pahu</option>
                  <option value="Senyiur">Senyiur</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Personel Perbaikan (Mekanik Multi-Select & SPV dari Database Manpower) */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Personel Penanggung Jawab (Database Manpower)
              </div>
              {personnelLoading && (
                <span className="text-[10px] text-slate-400 font-semibold animate-pulse">
                  Memuat data personel...
                </span>
              )}
            </h3>

            <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
              {/* Supervisor Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Supervisor (SPV) <span className="text-slate-400 font-normal">&bull; Database Manpower</span>
                </label>
                <select
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  <option value="">-- Pilih SPV dari Database Manpower --</option>
                  {supervisorsList.map((s) => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} ({s.jobPosition || "SPV"} - {s.branchName || "Site"})
                    </option>
                  ))}
                  {/* Keep custom value if not in list */}
                  {supervisor && !supervisorsList.some((s) => s.fullName === supervisor) && (
                    <option value={supervisor}>{supervisor} (Manual)</option>
                  )}
                </select>
              </div>

              {/* Mechanic Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Users size={13} className="text-slate-500" />
                    <span>Mekanik / Crew Perbaikan</span>
                    <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.2 rounded-full">
                      Bisa Lebih Dari 1
                    </span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {mechanicsList.length} Personel Manpower (Mekanik, Tyreman, Electrician, Welder)
                  </span>
                </div>

                {/* Selected Mechanics Tag Pills */}
                {selectedMechanics.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white rounded-xl border border-slate-200 mb-2">
                    {selectedMechanics.map((name) => {
                      const person = mechanicsList.find(
                        (m) => m.fullName.toLowerCase() === name.toLowerCase()
                      );
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-900 text-xs font-bold border border-orange-200 shadow-2xs"
                        >
                          <User size={12} className="text-[#e95623]" />
                          <span>{name}</span>
                          {person?.jobPosition && (
                            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-orange-200/70 text-orange-950">
                              {person.jobPosition}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMechanic(name)}
                            className="text-orange-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                            title="Hapus mekanik ini"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedMechanics([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-500 ml-auto cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs text-center mb-2">
                    Belum ada mekanik yang dipilih. Pilih satu atau beberapa mekanik di bawah ini.
                  </div>
                )}

                {/* Mechanic Picker Dropdown / Search Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="flex-1 relative min-w-[200px]">
                      <Search
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Cari nama mekanik, tyreman, welder, electrician..."
                        value={mechanicSearchQuery}
                        onChange={(e) => setMechanicSearchQuery(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    {/* Filter Role Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-bold">
                      {[
                        { id: "ALL", label: "Semua" },
                        { id: "MECHANIC", label: "Mechanic" },
                        { id: "TYREMAN", label: "Tyreman" },
                        { id: "ELECTRICIAN", label: "Electrician" },
                        { id: "WELDER", label: "Welder" },
                      ].map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setMechanicRoleFilter(chip.id)}
                          className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                            mechanicRoleFilter === chip.id
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable list of mechanics */}
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {filteredMechanics.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        Tidak ada mekanik yang cocok dengan pencarian.
                      </div>
                    ) : (
                      filteredMechanics.map((m) => {
                        const isSelected = selectedMechanics.includes(m.fullName);
                        return (
                          <div
                            key={m.id}
                            onClick={() => handleToggleMechanic(m.fullName)}
                            className={`flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer transition-colors ${
                              isSelected ? "bg-orange-50/70" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-[#e95623] border-[#e95623] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span className="font-bold text-slate-800">{m.fullName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-600">
                                {m.jobPosition || "Mekanik"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700">
                                {m.branchName || "Site"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Custom / External Mechanic */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Tambah nama mekanik manual (jika dari subcon/baru)..."
                      value={customMechanicName}
                      onChange={(e) => setCustomMechanicName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomMechanic();
                        }
                      }}
                      className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMechanic}
                      className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Status Breakdown
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-extrabold cursor-pointer">
                    <input
                      type="radio"
                      name="breakdown-status"
                      value="Open"
                      checked={status === "Open"}
                      onChange={() => setStatus("Open")}
                      className="text-rose-600 focus:ring-rose-400"
                    />
                    <span>Open (Dalam Penanganan / Belum Selesai)</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-extrabold cursor-pointer">
                    <input
                      type="radio"
                      name="breakdown-status"
                      value="Close"
                      checked={status === "Close"}
                      onChange={() => setStatus("Close")}
                      className="text-emerald-600 focus:ring-emerald-400"
                    />
                    <span>Close (Selesai Dikerjakan)</span>
                  </label>
                </div>
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
