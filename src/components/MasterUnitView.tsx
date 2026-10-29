"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "../types/auth";
import {
  plantService,
  MasterUnit,
} from "../services/plantService";
import { useNotification } from "../context/NotificationContext";
import {
  Database,
  Truck,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Sparkles,
  MapPin,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";

interface MasterUnitViewProps {
  user: User;
  onNavigateToPI?: (unitCode?: string) => void;
}

export const MasterUnitView: React.FC<MasterUnitViewProps> = ({
  user,
  onNavigateToPI,
}) => {
  const { showSuccess, showError, confirm } = useNotification();
  const isSuperAdmin = user.role === "SuperAdmin";

  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [unitCategoryFilter, setUnitCategoryFilter] = useState<string>("ALL");
  const [unitSiteFilter, setUnitSiteFilter] = useState<string>("ALL");
  const [unitSearch, setUnitSearch] = useState<string>("");

  // Edit Modal (Super Admin only)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [unitForEdit, setUnitForEdit] = useState<MasterUnit | null>(null);
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editJobSite, setEditJobSite] = useState<"MuaraPahu" | "Senyiur">("MuaraPahu");
  const [isSavingUnit, setIsSavingUnit] = useState<boolean>(false);

  const loadUnits = async () => {
    try {
      setIsLoading(true);
      const res = await plantService.getMasterUnits({ withTrailers: true });
      if (res.success && res.data) {
        setMasterUnits(res.data);
      }
    } catch (err: any) {
      showError(err.message || "Gagal memuat database unit");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUnits();
    setIsRefreshing(false);
    showSuccess("Database unit berhasil disinkronkan");
  };

  // Calculations
  const muaraPahuTotal = useMemo(
    () => masterUnits.filter((u) => u.jobSite === "MuaraPahu").length,
    [masterUnits]
  );
  const senyiurTotal = useMemo(
    () => masterUnits.filter((u) => u.jobSite === "Senyiur").length,
    [masterUnits]
  );
  const muaraPahuHeadTotal = useMemo(
    () =>
      masterUnits.filter(
        (u) => u.jobSite === "MuaraPahu" && u.category === "Prime Mover"
      ).length,
    [masterUnits]
  );
  const senyiurHeadTotal = useMemo(
    () =>
      masterUnits.filter(
        (u) => u.jobSite === "Senyiur" && u.category === "Prime Mover"
      ).length,
    [masterUnits]
  );

  const pmCount = useMemo(
    () => masterUnits.filter((u) => u.category === "Prime Mover").length,
    [masterUnits]
  );
  const v1Count = useMemo(
    () => masterUnits.filter((u) => u.category === "Vessel 1").length,
    [masterUnits]
  );
  const dlCount = useMemo(
    () => masterUnits.filter((u) => u.category === "Dolly").length,
    [masterUnits]
  );
  const v2Count = useMemo(
    () => masterUnits.filter((u) => u.category === "Vessel 2").length,
    [masterUnits]
  );

  // Filtered Units
  const filteredUnits = useMemo(() => {
    let list = masterUnits;
    if (unitCategoryFilter !== "ALL") {
      list = list.filter((u) => u.category === unitCategoryFilter);
    }
    if (unitSiteFilter !== "ALL") {
      list = list.filter((u) => u.jobSite === unitSiteFilter);
    }
    if (unitSearch.trim()) {
      const q = unitSearch.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.unitCode.toLowerCase().includes(q) ||
          (u.headUnitCode && u.headUnitCode.toLowerCase().includes(q)) ||
          u.brand.toLowerCase().includes(q) ||
          u.model.toLowerCase().includes(q) ||
          u.status.toLowerCase().includes(q) ||
          String(u.unitNumber).includes(q) ||
          (u.pairIndex && String(u.pairIndex).includes(q))
      );
    }
    return list;
  }, [masterUnits, unitCategoryFilter, unitSiteFilter, unitSearch]);

  // Edit Modal Handlers
  const handleOpenEdit = (unit: MasterUnit) => {
    if (!isSuperAdmin) {
      showError("Hanya Super Admin yang berwenang mengubah status atau jobsite unit");
      return;
    }
    setUnitForEdit(unit);
    setEditStatus((unit.status as any) === "Inactive" ? "Inactive" : "Active");
    setEditJobSite((unit.jobSite as any) === "Senyiur" ? "Senyiur" : "MuaraPahu");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForEdit) return;

    const isStatusChanged = unitForEdit.status !== editStatus;
    const isJobSiteChanged = unitForEdit.jobSite !== editJobSite;

    if (isStatusChanged || isJobSiteChanged) {
      const changes: string[] = [];
      if (isStatusChanged) changes.push(`Status: "${unitForEdit.status}" → "${editStatus}"`);
      if (isJobSiteChanged) changes.push(`JobSite: "${unitForEdit.jobSite}" → "${editJobSite}"`);

      confirm({
        title: "Konfirmasi Perubahan Master Unit",
        message: `Apakah Anda yakin ingin memperbarui data unit ${unitForEdit.unitCode}?\n\n${changes.join("\n")}${
          unitForEdit.category === "Prime Mover"
            ? "\n\n⚠️ Perubahan ini akan otomatis disinkronkan ke seluruh rangkaian gandengannya."
            : ""
        }`,
        confirmText: "Ya, Simpan Perubahan",
        cancelText: "Batal",
        type: editStatus === "Inactive" ? "warning" : "info",
        icon: editStatus === "Inactive" ? "alert" : "question",
        onConfirm: async () => {
          try {
            setIsSavingUnit(true);
            const res = await plantService.updateUnit(unitForEdit.unitCode, {
              status: editStatus,
              jobSite: editJobSite,
            });

            showSuccess(res.message || "Data unit berhasil diperbarui!");
            setIsEditModalOpen(false);
            setUnitForEdit(null);
            await loadUnits();
          } catch (err: any) {
            showError(err.message || "Gagal memperbarui unit");
          } finally {
            setIsSavingUnit(false);
          }
        },
      });
      return;
    }

    setIsEditModalOpen(false);
    setUnitForEdit(null);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------
          Top Header Banner with bg-plantmaintenance.jpeg
      ---------------------------------------------------------- */}
      <div className="relative border border-slate-700/80 rounded-3xl p-6 sm:p-7 text-white shadow-xl overflow-hidden">
        {/* Background Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-102"
          style={{ backgroundImage: "url('/bg-plantmaintenance.jpeg')" }}
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/92 via-slate-900/85 to-slate-950/78 backdrop-blur-[1.5px]" />

        {/* Decorative Watermark */}
        <div className="absolute -right-6 -bottom-10 opacity-10 pointer-events-none">
          <Database size={220} className="text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1.5">
                <Truck size={12} className="text-orange-400" />
                Plant & Maintenance
              </span>

              {/* Site Breakdown Pills */}
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-full border border-white/15">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-[#e95623] text-white shadow-xs">
                  Site Muara Pahu: {muaraPahuHeadTotal || 65} Head ({muaraPahuTotal || 260} Unit)
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black text-slate-300">
                  Site Senyiur: {senyiurHeadTotal || 6} Head ({senyiurTotal || 24} Unit)
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={11} />
                284 Unit Terdaftar
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Master Data Unit Armada</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-3xl leading-relaxed">
              Pusat database master armada hauling PT Batara Dharma Persada:{" "}
              <strong className="text-white font-bold underline decoration-[#e95623]/80 decoration-2 underline-offset-4">
                71 Rangkaian Terintegrasi (Prime Mover, Vessel 1, Dolly, dan Vessel 2)
              </strong>
              . Super Admin berwenang mengelola penempatan Jobsite dan status operasional armada dengan sinkronisasi otomatis ke seluruh rangkaian gandengan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onNavigateToPI && (
              <button
                onClick={() => onNavigateToPI()}
                className="px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 text-xs font-bold border border-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CalendarCheck size={14} className="text-orange-400" />
                <span>Buka Jadwal PI</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan Data Master Unit"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-orange-400" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Quick KPI Cards by Category
      ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Truck size={13} className="text-[#e95623]" />
            Prime Mover (Volvo FH16)
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-800">{pmCount || 71}</span>
            <span className="text-xs text-slate-400 font-semibold ml-1">Head Unit</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Kode: <strong>PM401 &ndash; PM471</strong>
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-blue-600" />
            Vessel 1 (Korindo SDT110)
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-blue-700">{v1Count || 71}</span>
            <span className="text-xs text-slate-400 font-semibold ml-1">Trailer Unit</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Kode: <strong>ST801 &ndash; ST871</strong>
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-purple-600" />
            Dolly (Korindo DL)
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-purple-700">{dlCount || 71}</span>
            <span className="text-xs text-slate-400 font-semibold ml-1">Unit</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Kode: <strong>DL601 &ndash; DL671</strong>
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-emerald-600" />
            Vessel 2 (Korindo SDT125)
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-emerald-700">{v2Count || 71}</span>
            <span className="text-xs text-slate-400 font-semibold ml-1">Trailer Unit</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Kode: <strong>ST901 &ndash; ST971</strong>
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------
          Main Content Table & Filters Card
      ---------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Database size={18} className="text-[#e95623]" />
              <span>Daftar Master Unit & Penempatan JobSite</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredUnits.length} dari total {masterUnits.length} unit
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode unit (e.g. 401, PM401, Volvo, DL)..."
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#e95623]/40 shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Bar: Category & Site */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `Semua (${masterUnits.length})` },
              { id: "Prime Mover", label: `Prime Mover (${pmCount})` },
              { id: "Vessel 1", label: `Vessel 1 (${v1Count})` },
              { id: "Dolly", label: `Dolly (${dlCount})` },
              { id: "Vessel 2", label: `Vessel 2 (${v2Count})` },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setUnitCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  unitCategoryFilter === cat.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* JobSite Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setUnitSiteFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unitSiteFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua Site ({masterUnits.length})
            </button>
            <button
              onClick={() => setUnitSiteFilter("MuaraPahu")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unitSiteFilter === "MuaraPahu"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Muara Pahu ({muaraPahuTotal})
            </button>
            <button
              onClick={() => setUnitSiteFilter("Senyiur")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unitSiteFilter === "Senyiur"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Senyiur ({senyiurTotal})
            </button>
          </div>
        </div>

        {/* Super Admin Notice */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-[#e95623] shrink-0" />
            <span>
              {isSuperAdmin ? (
                <>
                  Sebagai <strong>Super Admin</strong>, Anda memiliki wewenang untuk mengubah{" "}
                  <strong>Status Operasional (Active / Inactive)</strong> dan <strong>Penempatan JobSite (Muara Pahu / Senyiur)</strong>. Mengubah unit kepala (Prime Mover) akan otomatis menyinkronkan seluruh rangkaian gandengannya.
                </>
              ) : (
                <>
                  Status Unit dan Penempatan JobSite hanya dapat diubah oleh <strong>Super Admin</strong>.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-160 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3.5">No. Set</th>
                <th className="py-3 px-3.5">Kode Unit</th>
                <th className="py-3 px-3.5">Kategori</th>
                <th className="py-3 px-3.5">Brand / Merk</th>
                <th className="py-3 px-3.5">Model</th>
                <th className="py-3 px-3.5">JobSite</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Rangkaian Gandengan</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin text-[#e95623] mx-auto mb-2" size={24} />
                    Memuat data master unit...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada unit yang cocok dengan filter / pencarian.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-slate-400">
                      #{u.pairIndex || "-"}
                    </td>
                    <td className="py-3 px-3.5 font-black text-slate-900 flex items-center gap-2">
                      <Truck size={14} className="text-[#e95623]" />
                      <span className="text-sm">{u.unitCode}</span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          u.category === "Prime Mover"
                            ? "bg-orange-50 text-[#e95623] border border-orange-200"
                            : u.category === "Vessel 1"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : u.category === "Dolly"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {u.category}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-800">{u.brand}</td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">{u.model}</td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          u.jobSite === "Senyiur"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {u.jobSite === "Senyiur" ? "Site Senyiur" : "Site Muara Pahu"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          u.status === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                      {u.buntutSummary || (u.category !== "Prime Mover" ? `Ikut ${u.headUnitCode}` : "-")}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Super Admin: Ubah Site / Status Unit"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        )}
                        {u.category === "Prime Mover" && u.status === "Active" && onNavigateToPI && (
                          <button
                            onClick={() => onNavigateToPI(u.unitCode)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-50 text-[#e95623] hover:bg-orange-100 text-[11px] font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                            title="Jadwalkan unit di Periodic Inspection"
                          >
                            <span>Jadwal PI</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------
          MODAL: SUPER ADMIN EDIT MASTER UNIT (STATUS & JOBSITE)
      ---------------------------------------------------------- */}
      {isEditModalOpen && unitForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#e95623]" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Edit Unit: {unitForEdit.unitCode}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  {unitForEdit.category} &bull; {unitForEdit.brand} {unitForEdit.model}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {unitForEdit.category === "Prime Mover" && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-1 text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    Unit Kepala (Prime Mover)
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Perubahan <strong>JobSite</strong> dan <strong>Status</strong> pada unit kepala
                    ini akan <strong>OTOMATIS diterapkan</strong> ke seluruh rangkaian gandengannya:
                  </p>
                  <p className="font-mono text-[11px] font-bold text-amber-900">
                    {unitForEdit.buntutSummary || "Vessel 1, Dolly, Vessel 2"}
                  </p>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Operasional Unit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus("Active")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editStatus === "Active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 size={13} className={editStatus === "Active" ? "text-emerald-600" : "text-slate-400"} />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus("Inactive")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editStatus === "Inactive"
                        ? "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-200"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <AlertCircle size={13} className={editStatus === "Inactive" ? "text-rose-600" : "text-slate-400"} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* JobSite Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Penempatan JobSite Unit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditJobSite("MuaraPahu")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editJobSite === "MuaraPahu"
                        ? "bg-orange-50 text-[#e95623] border-orange-300 ring-2 ring-orange-200"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Site Muara Pahu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditJobSite("Senyiur")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editJobSite === "Senyiur"
                        ? "bg-orange-50 text-[#e95623] border-orange-300 ring-2 ring-orange-200"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Site Senyiur</span>
                  </button>
                </div>
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
                  disabled={isSavingUnit}
                  className="px-5 py-2 rounded-xl bg-[#e95623] hover:bg-[#d44818] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingUnit ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
