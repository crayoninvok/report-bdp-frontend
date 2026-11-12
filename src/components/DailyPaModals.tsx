"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Clock,
  Plus,
  Search,
  Square,
  Truck,
  X,
} from "lucide-react";
import { DailyPaActivityItem, MasterUnit } from "../services/plantService";

interface DailyPaBulkAddUnitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterUnits: MasterUnit[];
  existingUnitCodes: Set<string>;
  jobSiteLabel: string;
  isSubmitting: boolean;
  onConfirmAdd: (unitCodes: string[]) => Promise<void>;
}

const CATEGORY_TABS = [
  "Semua",
  "Prime Mover",
  "Vessel 1",
  "Dolly",
  "Vessel 2",
  "Unit Support",
] as const;

const HAULING_SET = new Set(["Prime Mover", "Vessel 1", "Dolly", "Vessel 2"]);

export const DailyPaBulkAddUnitsModal: React.FC<DailyPaBulkAddUnitsModalProps> = ({
  isOpen,
  onClose,
  masterUnits,
  existingUnitCodes,
  jobSiteLabel,
  isSubmitting,
  onConfirmAdd,
}) => {
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] =
    useState<(typeof CATEGORY_TABS)[number]>("Prime Mover");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setCategoryTab("Prime Mover");
      setSelectedCodes(new Set());
    }
  }, [isOpen]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return masterUnits.filter((u) => {
      if (categoryTab === "Unit Support") {
        if (HAULING_SET.has(u.category)) return false;
      } else if (categoryTab !== "Semua") {
        if (u.category !== categoryTab) return false;
      }

      if (!q) return true;
      return (
        u.unitCode.toLowerCase().includes(q) ||
        u.brand.toLowerCase().includes(q) ||
        u.model.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q)
      );
    });
  }, [masterUnits, categoryTab, search]);

  const selectableFiltered = useMemo(
    () => filteredUnits.filter((u) => !existingUnitCodes.has(u.unitCode)),
    [filteredUnits, existingUnitCodes]
  );

  const toggleCode = (code: string) => {
    if (existingUnitCodes.has(code)) return;
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const u of selectableFiltered) {
        next.add(u.unitCode);
      }
      return next;
    });
  };

  const handleSelectAllPrimeMovers = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const u of masterUnits) {
        if (u.category === "Prime Mover" && !existingUnitCodes.has(u.unitCode)) {
          next.add(u.unitCode);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCodes.size === 0 || isSubmitting) return;
    await onConfirmAdd(Array.from(selectedCodes));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/45 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
                Pilih Unit untuk Daily PA Report ({jobSiteLabel})
              </h2>
              <p className="text-xs text-slate-500">
                Centang banyak unit sekaligus. Data PI &amp; PS pada tanggal ini otomatis ditarik ke BD Activity.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Quick Select Controls */}
        <div className="px-5 py-3.5 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCategoryTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  categoryTab === tab
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode unit, brand, model, atau kategori..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllPrimeMovers}
                className="h-9 px-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-700 cursor-pointer transition-colors"
              >
                + Semua Prime Mover
              </button>
              <button
                type="button"
                onClick={handleSelectAllVisible}
                disabled={selectableFiltered.length === 0}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
              >
                Pilih Tampil ({selectableFiltered.length})
              </button>
              {selectedCodes.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCodes(new Set())}
                  className="h-9 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 cursor-pointer transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Unit Grid List */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {filteredUnits.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-slate-400">
                Tidak ada unit yang sesuai filter pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredUnits.map((unit) => {
                  const alreadyIn = existingUnitCodes.has(unit.unitCode);
                  const isChecked = alreadyIn || selectedCodes.has(unit.unitCode);

                  return (
                    <button
                      key={unit.id}
                      type="button"
                      disabled={alreadyIn}
                      onClick={() => toggleCode(unit.unitCode)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        alreadyIn
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : isChecked
                          ? "bg-sky-50 border-sky-400 ring-1 ring-sky-300 cursor-pointer"
                          : "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer"
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare
                          size={18}
                          className={
                            alreadyIn ? "text-slate-400 shrink-0" : "text-sky-600 shrink-0"
                          }
                        />
                      ) : (
                        <Square size={18} className="text-slate-300 shrink-0" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                            {unit.unitCode}
                          </span>
                          {alreadyIn ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                              Sudah Masuk
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                              {unit.model}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {unit.category} &bull; {unit.brand}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">
              Terpilih:{" "}
              <strong className="text-sky-700">{selectedCodes.size} unit baru</strong>{" "}
              <span className="text-slate-400">
                ({existingUnitCodes.size} sudah masuk hari ini)
              </span>
            </span>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={selectedCodes.size === 0 || isSubmitting}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Plus size={15} />
                <span>
                  {isSubmitting
                    ? "Menambahkan..."
                    : `Tambahkan ${selectedCodes.size} Unit`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DailyPaActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitCode: string;
  editingActivity: DailyPaActivityItem | null;
  isSubmitting: boolean;
  onSave: (values: {
    activityText: string;
    breakdownTime: string;
    durationHours: string;
  }) => Promise<void>;
}

export const DailyPaActivityModal: React.FC<DailyPaActivityModalProps> = ({
  isOpen,
  onClose,
  unitCode,
  editingActivity,
  isSubmitting,
  onSave,
}) => {
  const [activityText, setActivityText] = useState("");
  const [breakdownTime, setBreakdownTime] = useState("");
  const [durationHours, setDurationHours] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setActivityText(editingActivity.activityText);
        setBreakdownTime(editingActivity.breakdownTime || "");
        setDurationHours(
          editingActivity.durationHours > 0
            ? String(editingActivity.durationHours)
            : ""
        );
      } else {
        setActivityText("");
        setBreakdownTime("");
        setDurationHours("");
      }
    }
  }, [isOpen, editingActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityText.trim() || isSubmitting) return;
    await onSave({
      activityText: activityText.trim(),
      breakdownTime: breakdownTime.trim(),
      durationHours: durationHours.trim() || "0",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/45 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {editingActivity ? "Edit BD Activity" : "Tambah BD Activity"} &bull; {unitCode}
              </h3>
              <p className="text-[11px] text-slate-500">
                Total jam akan otomatis masuk ke Jumlah BD, Downtime, Hour Available, PA, MTTR &amp; MTBF.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {editingActivity && editingActivity.sourceType !== "MANUAL" && (
            <div className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-800 font-semibold">
              Sumber otomatis dari <strong>{editingActivity.sourceType}</strong>. Anda dapat langsung melengkapi atau menyesuaikan total jam &amp; keterangan di sini.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Deskripsi BD Activity *
            </label>
            <textarea
              rows={3}
              required
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              placeholder="Contoh: SCHEDULE GREASING & INSPECTION, TYRE LEAK V1 NO.26, dll."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Total Downtime (Jam) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                placeholder="Contoh: 1.5 atau 01:30"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jam Breakdown (Opsional)
              </label>
              <input
                type="text"
                value={breakdownTime}
                onChange={(e) => setBreakdownTime(e.target.value)}
                placeholder="Contoh: 08:30"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-300"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!activityText.trim() || isSubmitting}
              className="h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
