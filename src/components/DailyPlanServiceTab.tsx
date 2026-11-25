"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Printer,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileEdit,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  X,
  Save,
} from "lucide-react";
import {
  WeeklyScheduleData,
  MasterUnit,
  DaySchedule,
  PeriodicInspectionItem,
  plantService,
} from "../services/plantService";
import {
  DailyPlanServicePdfModal,
  parseWorkOrderDetails,
} from "./DailyPlanServicePdfModal";
import {
  DailyPlanApprovalData,
  DailyPlanApprovalModal,
  getDefaultApprovalData,
  getApprovalStorageKey,
  ApprovedStamp,
  formatIndoFullDate,
} from "./DailyPlanApprovalModal";

interface DailyPlanServiceTabProps {
  scheduleData: WeeklyScheduleData | null;
  selectedSite: "MuaraPahu" | "Senyiur";
  masterUnits: MasterUnit[];
  anchorDate: string;
  onAnchorDateChange: (date: string) => void;
  onEditItem: (item: PeriodicInspectionItem) => void;
  onAddItem: (date: string) => void;
  onDeleteItem: (item: PeriodicInspectionItem) => void;
  onRefresh: () => Promise<void>;
  isMutating: boolean;
  onEditTarget?: (date: string, currentTarget: number) => void;
}

function formatDateDmy(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function shiftDateString(iso: string, deltaDays: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export const DailyPlanServiceTab: React.FC<DailyPlanServiceTabProps> = ({
  scheduleData,
  selectedSite,
  masterUnits,
  anchorDate,
  onAnchorDateChange,
  onEditItem,
  onAddItem,
  onDeleteItem,
  onRefresh,
  isMutating,
  onEditTarget,
}) => {
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Quick edit modal state for WO / MR / Backlog Activity
  const [quickEditItem, setQuickEditItem] = useState<PeriodicInspectionItem | null>(null);
  const [editWo, setEditWo] = useState<string>("");
  const [editMr, setEditMr] = useState<string>("");
  const [editActivity, setEditActivity] = useState<string>("");
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState<boolean>(false);

  // Approval & Signature state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [approvalData, setApprovalData] = useState<DailyPlanApprovalData>(() =>
    getDefaultApprovalData(selectedSite)
  );

  // Sync / Load approvals from localStorage when selectedSite or week range changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = getApprovalStorageKey(
      selectedSite,
      scheduleData?.weekRange.startDate
    );
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setApprovalData(JSON.parse(saved));
        return;
      }
    } catch {
      // fallback
    }
    setApprovalData(getDefaultApprovalData(selectedSite));
  }, [selectedSite, scheduleData?.weekRange.startDate]);

  const handleSaveApproval = (newData: DailyPlanApprovalData) => {
    setApprovalData(newData);
    if (typeof window !== "undefined") {
      const storageKey = getApprovalStorageKey(
        selectedSite,
        scheduleData?.weekRange.startDate
      );
      try {
        localStorage.setItem(storageKey, JSON.stringify(newData));
      } catch {
        // ignore
      }
    }
  };

  const siteLabel = selectedSite === "MuaraPahu" ? "MUARA PAHU" : "SENYIUR";
  const siteProperCase = selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur";

  // Build model map from masterUnits
  const unitModelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of masterUnits) {
      map.set(u.unitCode, u.model || u.brand || "FH16");
    }
    return map;
  }, [masterUnits]);

  // Days filtered by selection and search query
  const filteredDays = useMemo(() => {
    if (!scheduleData?.days) return [];

    const baseDays =
      selectedDateFilter === "ALL"
        ? scheduleData.days
        : scheduleData.days.filter((d) => d.date === selectedDateFilter);

    if (!searchTerm.trim()) {
      return baseDays;
    }

    const q = searchTerm.toLowerCase();
    return baseDays.map((day) => {
      const matchingItems = day.items.filter((item) => {
        const model = unitModelMap.get(item.unitCode) || item.unit?.model || "";
        const details = parseWorkOrderDetails(item.notes, item.category);
        return (
          item.unitCode.toLowerCase().includes(q) ||
          model.toLowerCase().includes(q) ||
          (item.serviceType || "").toLowerCase().includes(q) ||
          details.woNumber.toLowerCase().includes(q) ||
          details.mrNumber.toLowerCase().includes(q) ||
          details.backlogActivity.toLowerCase().includes(q) ||
          details.remark.toLowerCase().includes(q) ||
          (item.supervisorName || "").toLowerCase().includes(q)
        );
      });
      return {
        ...day,
        items: matchingItems,
      };
    });
  }, [scheduleData, selectedDateFilter, searchTerm, unitModelMap]);

  const totalFilteredUnits = useMemo(() => {
    return filteredDays.reduce((sum, d) => sum + d.items.length, 0);
  }, [filteredDays]);

  const totalTargetPlan = useMemo(() => {
    return filteredDays.reduce((sum, d) => sum + (d.targetUnits || 0), 0);
  }, [filteredDays]);

  const todayFormatted = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return `${siteProperCase}, ${formatIndoFullDate(today)}`;
  }, [siteProperCase]);

  // Open quick edit for WO / MR / Backlog Activity
  const openQuickEdit = (item: PeriodicInspectionItem) => {
    const details = parseWorkOrderDetails(item.notes, item.category);
    setEditWo(details.woNumber !== "-" ? details.woNumber : "");
    setEditMr(details.mrNumber !== "-" ? details.mrNumber : "");
    setEditActivity(details.backlogActivity !== "-" ? details.backlogActivity : "");
    setQuickEditItem(item);
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditItem) return;

    try {
      setIsSavingQuickEdit(true);

      const parts: string[] = [];
      if (editWo.trim()) parts.push(`WO: ${editWo.trim()}`);
      if (editMr.trim()) parts.push(`MR: ${editMr.trim()}`);
      if (editActivity.trim()) parts.push(editActivity.trim());

      const newNotes = parts.join(" | ");

      await plantService.updatePmItem(quickEditItem.id, {
        notes: newNotes,
      });

      setQuickEditItem(null);
      await onRefresh();
    } catch (err: any) {
      alert("Gagal memperbarui WO/MR: " + (err?.message || err));
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controls Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Week & Date Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Shift Navigation */}
          <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => onAnchorDateChange(shiftDateString(anchorDate, -7))}
              className="p-1.5 rounded-xl hover:bg-white hover:shadow-xs text-slate-700 cursor-pointer transition-all"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-black text-slate-800 whitespace-nowrap">
              {scheduleData?.weekRange.formatted || "Memuat minggu..."}
            </span>
            <button
              type="button"
              onClick={() => onAnchorDateChange(shiftDateString(anchorDate, 7))}
              className="p-1.5 rounded-xl hover:bg-white hover:shadow-xs text-slate-700 cursor-pointer transition-all"
              title="Minggu Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAnchorDateChange(new Date().toISOString().slice(0, 10))}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
          >
            Minggu Ini
          </button>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">
                Semua Hari Minggu Ini ({scheduleData?.days?.length || 7} Hari)
              </option>
              {(scheduleData?.days || []).map((d) => (
                <option key={d.date} value={d.date}>
                  {d.dayName}, {formatIndoFullDate(d.date)} ({d.items.length} unit)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari unit / model / WO / MR..."
              className="pl-8.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 w-52 sm:w-60 font-medium"
            />
          </div>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d54918] text-white shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
          >
            <Printer size={15} />
            <span>Export PDF / Cetak</span>
          </button>

          {/* Quick Add Schedule Unit */}
          <button
            type="button"
            onClick={() =>
              onAddItem(
                selectedDateFilter !== "ALL"
                  ? selectedDateFilter
                  : scheduleData?.weekRange.startDate || anchorDate
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Jadwal PS</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Unit Terjadwal
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {totalFilteredUnits} Unit
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#e95623] flex items-center justify-center font-bold">
            PS
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Target Plan
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {totalTargetPlan} Unit
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-bold">
            Target
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Job Site Terpilih
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {siteProperCase}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
            {selectedSite === "MuaraPahu" ? "MPH" : "SNY"}
          </div>
        </div>
      </div>

      {/* Document View Layout matching Template */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-start gap-3.5 mb-2">
            {/* Batara Double Chevron Arrow Logo */}
            <div className="shrink-0 flex items-center pt-0.5">
              <svg width="40" height="36" viewBox="0 0 42 38" fill="none">
                <path d="M3 35L17 19L3 3H10L24 19L10 35H3Z" fill="#0ea5e9" />
                <path d="M17 35L31 19L17 3H24L38 19L24 35H17Z" fill="#e95623" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Periodic Service – Daily Plan Service
              </h1>
              <div className="text-xs leading-relaxed mt-1">
                <div className="font-black tracking-wide text-slate-900 uppercase">
                  PT BATARA DHARMA PERSADA
                </div>
                <div className="font-extrabold text-[#e95623] tracking-wide uppercase">
                  PLANT &amp; MAINTENANCE DEPARTMENT - {siteLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-3 pt-3 border-t border-slate-100">
            <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 underline underline-offset-4 decoration-2">
              DAILY MAINTENANCE SERVICE
            </h2>
          </div>
        </div>

        {/* Date Tables */}
        {filteredDays.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Tidak ada hari atau jadwal servis yang cocok dengan kriteria filter.
          </div>
        ) : (
          filteredDays.map((day: DaySchedule) => {
            const items = day.items;
            return (
              <div key={day.date} className="space-y-2">
                {/* Date Header */}
                <div className="flex flex-wrap items-center justify-between text-xs font-black text-slate-900 bg-slate-100/70 px-4 py-2 rounded-xl border border-slate-200">
                  <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#e95623]" />
                    <span>Tanggal : {formatIndoFullDate(day.date)}</span>
                  </span>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                    <span>{day.dayName}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span>• Target Plan: <strong className="text-slate-900">{day.targetUnits} Unit</strong></span>
                      {onEditTarget && (
                        <button
                          type="button"
                          onClick={() => onEditTarget(day.date, day.targetUnits)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-[#e95623] bg-orange-50 hover:bg-orange-100 border border-orange-200 inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          title={`Ubah target plan untuk ${day.dayName}, ${day.date}`}
                        >
                          <Pencil size={10} />
                          <span>Ubah Plan</span>
                        </button>
                      )}
                    </span>
                    <span>• Terjadwal: <strong className="text-[#e95623]">{items.length} Unit</strong></span>
                    <button
                      type="button"
                      onClick={() => onAddItem(day.date)}
                      className="inline-flex items-center gap-1 text-[#e95623] hover:underline cursor-pointer ml-1"
                    >
                      <Plus size={12} />
                      <span>Tambah Unit</span>
                    </button>
                  </div>
                </div>

                {/* Table with Soft Green Header */}
                <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-2xs">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#c6e0b4] text-slate-900 font-extrabold text-center uppercase tracking-tight text-[10px]">
                        <th className="border border-slate-700 px-1.5 py-2 w-8">NO</th>
                        <th className="border border-slate-700 px-2 py-2 w-20">CODE NUMBER</th>
                        <th className="border border-slate-700 px-1.5 py-2 w-16">MODEL</th>
                        <th className="border border-slate-700 px-2 py-2 w-20">PLAN DATE PS</th>
                        <th className="border border-slate-700 px-2 py-2 w-18">
                          PLAN<br />START TIME
                        </th>
                        <th className="border border-slate-700 px-2 py-2 w-20">PLAN HM PS</th>
                        <th className="border border-slate-700 px-2 py-2 w-24">TYPE SERVICE</th>
                        <th className="border border-slate-700 px-1.5 py-2 w-16">DURATION</th>
                        <th className="border border-slate-700 px-2 py-2 w-28">WORK ORDER/MR</th>
                        <th className="border border-slate-700 px-2 py-2 w-18">LOCATION</th>
                        <th className="border border-slate-700 px-2.5 py-2 min-w-36 text-left">
                          BACKLOG, MIDLIFE, REPAIR ACTIVITY
                        </th>
                        <th className="border border-slate-700 px-2.5 py-2 min-w-32 text-left">REMARK</th>
                        <th className="border border-slate-700 px-2 py-2 w-20 text-center bg-[#b2d89b]">
                          AKSI
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            className="border border-slate-700 px-4 py-4 text-center text-slate-500 italic bg-white"
                          >
                            Belum ada unit terjadwal pada tanggal ini.
                          </td>
                        </tr>
                      ) : (
                        items.map((item: PeriodicInspectionItem, idx: number) => {
                          const model = unitModelMap.get(item.unitCode) || item.unit?.model || "FH16";
                          const leadHrs = item.planLeadTime
                            ? item.planLeadTime.replace(/jam/i, "").trim()
                            : "8";
                          const hmVal =
                            item.planHmServis != null && item.planHmServis !== ""
                              ? item.planHmServis.replace(/hm/i, "").trim()
                              : item.currentHm != null
                              ? String(item.currentHm)
                              : "-";

                          const details = parseWorkOrderDetails(item.notes, item.category);

                          return (
                            <tr
                              key={item.id}
                              className="text-slate-900 font-semibold hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="border border-slate-700 px-1 py-1.5 text-center font-bold">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-bold font-mono text-slate-900">
                                {item.unitCode}
                              </td>
                              <td className="border border-slate-700 px-1.5 py-1.5 text-center font-bold text-slate-700">
                                {model}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-mono">
                                {formatDateDmy(item.date)}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-mono font-bold text-slate-800">
                                {item.planStartTime || "07:00"}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-mono font-bold text-slate-900">
                                {hmVal}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-bold text-[#c74315]">
                                {item.serviceType || "P1 (250 HM)"}
                              </td>
                              <td className="border border-slate-700 px-1.5 py-1.5 text-center font-mono">
                                {leadHrs}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 font-mono text-[10px] leading-tight">
                                <div>WO : {details.woNumber}</div>
                                <div>MR : {details.mrNumber}</div>
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center font-bold">
                                {siteLabel}
                              </td>
                              <td className="border border-slate-700 px-2.5 py-1.5 text-[10.5px] font-medium leading-tight">
                                {details.backlogActivity}
                              </td>
                              <td className="border border-slate-700 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-800 leading-tight">
                                {details.remark}
                              </td>
                              <td className="border border-slate-700 px-2 py-1.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Quick edit WO / MR button */}
                                  <button
                                    type="button"
                                    onClick={() => openQuickEdit(item)}
                                    className="p-1 rounded-md text-sky-600 hover:bg-sky-50 cursor-pointer"
                                    title="Edit WO / MR / Backlog Activity"
                                  >
                                    <FileEdit size={13} />
                                  </button>
                                  {/* Full edit schedule modal */}
                                  <button
                                    type="button"
                                    onClick={() => onEditItem(item)}
                                    className="p-1 rounded-md text-amber-600 hover:bg-amber-50 cursor-pointer"
                                    title="Edit Jadwal Servis Lengkap"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  {/* Delete unit schedule */}
                                  <button
                                    type="button"
                                    onClick={() => onDeleteItem(item)}
                                    className="p-1 rounded-md text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    title="Hapus Jadwal Unit"
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
            );
          })
        )}

        {/* Signature & Approval Block */}
        <div className="mt-8 pt-6 border-t border-slate-300 space-y-4">
          {/* Header Location & Date + Action Edit Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              <span>
                {approvalData.documentLocation},{" "}
                {formatIndoFullDate(approvalData.documentDate)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsApprovalModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-98"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Edit Tanda Tangan &amp; Cap Approved</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center text-xs">
            {/* Column 1: Planner */}
            <div
              onClick={() => setIsApprovalModalOpen(true)}
              className={`p-4 rounded-2xl border flex flex-col justify-between min-h-43.75 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden ${
                approvalData.planner.isApproved
                  ? "bg-white border-emerald-300 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {approvalData.planner.roleTitle}
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-600 transition-opacity flex items-center gap-1">
                  <Pencil size={11} /> Edit
                </span>
              </div>

              {/* Stamp Area */}
              <div className="my-2 flex items-center justify-center">
                {approvalData.planner.isApproved ? (
                  <ApprovedStamp dateStr={approvalData.planner.date} />
                ) : (
                  <div className="h-10 w-full flex items-center justify-center border border-dashed border-slate-300 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-50">
                    (Belum Ada Cap Approved)
                  </div>
                )}
              </div>

              <div>
                <div className="font-black text-slate-900 underline underline-offset-2">
                  {approvalData.planner.name || approvalData.planner.position}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {approvalData.planner.position}
                </div>
                <div className="text-[10px] text-slate-500">
                  {approvalData.planner.department}
                </div>
                <div className="text-[9px] text-emerald-700 font-bold mt-1">
                  Tgl: {formatIndoFullDate(approvalData.planner.date)}
                </div>
              </div>
            </div>

            {/* Column 2: Maintenance Superintendent */}
            <div
              onClick={() => setIsApprovalModalOpen(true)}
              className={`p-4 rounded-2xl border flex flex-col justify-between min-h-43.75 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden ${
                approvalData.maintenanceSupt.isApproved
                  ? "bg-white border-emerald-300 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {approvalData.maintenanceSupt.roleTitle}
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-600 transition-opacity flex items-center gap-1">
                  <Pencil size={11} /> Edit
                </span>
              </div>

              {/* Stamp Area */}
              <div className="my-2 flex items-center justify-center">
                {approvalData.maintenanceSupt.isApproved ? (
                  <ApprovedStamp dateStr={approvalData.maintenanceSupt.date} />
                ) : (
                  <div className="h-10 w-full flex items-center justify-center border border-dashed border-slate-300 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-50">
                    (Belum Ada Cap Approved)
                  </div>
                )}
              </div>

              <div>
                <div className="font-black text-slate-900 underline underline-offset-2">
                  {approvalData.maintenanceSupt.name ||
                    approvalData.maintenanceSupt.position}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {approvalData.maintenanceSupt.position}
                </div>
                <div className="text-[10px] text-slate-500">
                  {approvalData.maintenanceSupt.department}
                </div>
                <div className="text-[9px] text-emerald-700 font-bold mt-1">
                  Tgl: {formatIndoFullDate(approvalData.maintenanceSupt.date)}
                </div>
              </div>
            </div>

            {/* Column 3: Logistic Superintendent */}
            <div
              onClick={() => setIsApprovalModalOpen(true)}
              className={`p-4 rounded-2xl border flex flex-col justify-between min-h-43.75 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden ${
                approvalData.logisticSupt.isApproved
                  ? "bg-white border-emerald-300 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {approvalData.logisticSupt.roleTitle}
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-600 transition-opacity flex items-center gap-1">
                  <Pencil size={11} /> Edit
                </span>
              </div>

              {/* Stamp Area */}
              <div className="my-2 flex items-center justify-center">
                {approvalData.logisticSupt.isApproved ? (
                  <ApprovedStamp dateStr={approvalData.logisticSupt.date} />
                ) : (
                  <div className="h-10 w-full flex items-center justify-center border border-dashed border-slate-300 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-50">
                    (Belum Ada Cap Approved)
                  </div>
                )}
              </div>

              <div>
                <div className="font-black text-slate-900 underline underline-offset-2">
                  {approvalData.logisticSupt.name ||
                    approvalData.logisticSupt.position}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {approvalData.logisticSupt.position}
                </div>
                <div className="text-[10px] text-slate-500">
                  {approvalData.logisticSupt.department}
                </div>
                <div className="text-[9px] text-emerald-700 font-bold mt-1">
                  Tgl: {formatIndoFullDate(approvalData.logisticSupt.date)}
                </div>
              </div>
            </div>

            {/* Column 4: Production Superintendent */}
            <div
              onClick={() => setIsApprovalModalOpen(true)}
              className={`p-4 rounded-2xl border flex flex-col justify-between min-h-43.75 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden ${
                approvalData.productionSupt.isApproved
                  ? "bg-white border-emerald-300 shadow-2xs"
                  : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {approvalData.productionSupt.roleTitle}
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-emerald-600 transition-opacity flex items-center gap-1">
                  <Pencil size={11} /> Edit
                </span>
              </div>

              {/* Stamp Area */}
              <div className="my-2 flex items-center justify-center">
                {approvalData.productionSupt.isApproved ? (
                  <ApprovedStamp dateStr={approvalData.productionSupt.date} />
                ) : (
                  <div className="h-10 w-full flex items-center justify-center border border-dashed border-slate-300 rounded-xl text-[11px] font-medium text-slate-400 bg-slate-50">
                    (Belum Ada Cap Approved)
                  </div>
                )}
              </div>

              <div>
                <div className="font-black text-slate-900 underline underline-offset-2">
                  {approvalData.productionSupt.name ||
                    approvalData.productionSupt.position}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {approvalData.productionSupt.position}
                </div>
                <div className="text-[10px] text-slate-500">
                  {approvalData.productionSupt.department}
                </div>
                <div className="text-[9px] text-emerald-700 font-bold mt-1">
                  Tgl: {formatIndoFullDate(approvalData.productionSupt.date)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Edit Modal for WO / MR / Backlog Activity */}
      {quickEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileEdit size={18} className="text-[#e95623]" />
                <h3 className="text-sm font-black">
                  Edit WO, MR &amp; Backlog • {quickEditItem.unitCode} ({formatDateDmy(quickEditItem.date)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditItem(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Work Order (WO)
                  </label>
                  <input
                    type="text"
                    value={editWo}
                    onChange={(e) => setEditWo(e.target.value)}
                    placeholder="e.g. 1234567"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Material Request (MR)
                  </label>
                  <input
                    type="text"
                    value={editMr}
                    onChange={(e) => setEditMr(e.target.value)}
                    placeholder="e.g. MR01100030"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Backlog, Midlife, Repair Activity
                </label>
                <textarea
                  rows={2}
                  value={editActivity}
                  onChange={(e) => setEditActivity(e.target.value)}
                  placeholder="e.g. BL001 - HOSE BRAKE LEAK, Ganti seal oli turbocharge"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickEditItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-[#e95623] hover:bg-[#d54918] text-white cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSavingQuickEdit ? "Menyimpan..." : "Simpan Data"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Export & Print Modal */}
      <DailyPlanServicePdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        scheduleData={scheduleData}
        selectedSite={selectedSite}
        masterUnits={masterUnits}
        approvalData={approvalData}
        onUpdateApprovalData={handleSaveApproval}
      />

      {/* Approval & Signature Modal */}
      <DailyPlanApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        initialData={approvalData}
        onSave={handleSaveApproval}
        selectedSite={selectedSite}
      />
    </div>
  );
};
