"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  MapPin,
  Wrench,
  Truck,
  Check,
} from "lucide-react";
import {
  DailyBreakdownItem,
  DailyBreakdownSummary,
  MasterUnit,
  plantService,
} from "../services/plantService";
import { useNotification } from "../context/NotificationContext";
import { DailyBreakdownModal, BREAKDOWN_CATEGORIES } from "./DailyBreakdownModal";

export const DailyBreakdownReportView: React.FC = () => {
  const { showSuccess, showError, confirm } = useNotification();

  // Filter States
  const [selectedSite, setSelectedSite] = useState<"MuaraPahu" | "Senyiur">("MuaraPahu");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [breakdownList, setBreakdownList] = useState<DailyBreakdownItem[]>([]);
  const [summary, setSummary] = useState<DailyBreakdownSummary | null>(null);
  const [masterUnits, setMasterUnits] = useState<MasterUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<DailyBreakdownItem | null>(null);

  // Load Breakdown Data
  const loadData = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setIsLoading(true);
        else setIsRefreshing(true);

        const res = await plantService.getDailyBreakdownList({
          site: selectedSite,
          date: selectedDate || undefined,
          status: statusFilter,
          category: categoryFilter,
          search: searchQuery.trim() || undefined,
        });

        if (res.success) {
          setBreakdownList(res.data || []);
          setSummary(res.summary || null);
        }
      } catch (err: any) {
        console.error("Gagal memuat Daily Breakdown Report:", err);
        showError(err.message || "Gagal memuat data Daily Breakdown Report");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedSite, selectedDate, statusFilter, categoryFilter, searchQuery, showError]
  );

  // Load Master Units for the picker in modal
  const loadMasterUnits = useCallback(async () => {
    try {
      const res = await plantService.getMasterUnits({ withTrailers: true });
      if (res.success) {
        setMasterUnits(res.data || []);
      }
    } catch (err) {
      console.warn("Gagal memuat master unit:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadMasterUnits();
  }, [loadMasterUnits]);

  // Handle Quick Date Filters
  const handleSetQuickDate = (mode: "today" | "all") => {
    if (mode === "today") {
      const todayIso = new Date().toISOString().split("T")[0];
      setSelectedDate(todayIso);
    } else {
      setSelectedDate("");
    }
  };

  // Toggle Status directly from table (Open <-> Close)
  const handleToggleStatus = async (item: DailyBreakdownItem) => {
    const nextStatus = item.status === "Close" ? "Open" : "Close";
    try {
      await plantService.updateDailyBreakdown(item.id, { status: nextStatus });
      showSuccess(`Status breakdown unit ${item.unitCode} diubah menjadi ${nextStatus}.`);
      loadData(true);
    } catch (err: any) {
      showError(err.message || "Gagal memperbarui status breakdown");
    }
  };

  // Delete Breakdown
  const handleDeleteItem = (item: DailyBreakdownItem) => {
    confirm({
      title: "Hapus Data Breakdown?",
      message: `Apakah Anda yakin ingin menghapus data breakdown unit ${item.unitCode} (${item.breakdownDescription}) pada tanggal ${formatIndoDate(item.date)}?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      type: "danger",
      onConfirm: async () => {
        try {
          await plantService.deleteDailyBreakdown(item.id);
          showSuccess(`Data breakdown unit ${item.unitCode} berhasil dihapus.`);
          loadData(true);
        } catch (err: any) {
          showError(err.message || "Gagal menghapus data breakdown");
        }
      },
    });
  };

  // Export to Excel matching the exact columns of the spreadsheet image
  const handleExportExcel = () => {
    if (breakdownList.length === 0) {
      showError("Tidak ada data breakdown untuk diexport.");
      return;
    }

    const rows = breakdownList.map((item, idx) => ({
      No: idx + 1,
      Tanggal: formatIndoDate(item.date),
      "Vechicle Number": item.unitCode,
      Type: item.unitType || item.unit?.model || "-",
      "No WO": item.woNumber || "-",
      HM: item.hm != null ? item.hm : "-",
      KM: item.km != null ? item.km : "-",
      "Category Breakdown": item.category,
      "Start Breakdown": item.startTime || "-",
      "Finish Breakdown": item.finishTime || "-",
      Durasi: item.durationHours != null ? item.durationHours.toFixed(2).replace(".", ",") : "0,00",
      "Breakdown Description": item.breakdownDescription,
      "Detail Activity": item.detailActivity || "-",
      Component: item.component || "-",
      Mechanic: item.mechanic || "-",
      Supervisor: item.supervisor || "-",
      Location: item.location || "-",
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Breakdown");

    const dateTag = selectedDate ? selectedDate : "Semua_Tanggal";
    const fileName = `Daily_Breakdown_Report_${selectedSite}_${dateTag}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showSuccess(`File Excel ${fileName} berhasil didownload.`);
  };

  const getCategoryBadge = (cat: string) => {
    const found = BREAKDOWN_CATEGORIES.find((c) => c.value === cat.toUpperCase());
    return found ? found.badge : "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto space-y-6 animate-in fade-in duration-300 pb-24">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-orange-100/50 via-rose-50/30 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#e95623] border border-orange-200 flex items-center gap-1.5">
                <Wrench size={11} />
                Plant &amp; Maintenance
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Breakdown &amp; Downtime Monitoring
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                Coal Hauling Fleet
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Daily Breakdown Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Pencatatan dan pemantauan data harian breakdown unit armada, rincian aktivitas perbaikan, durasi downtime, jam kerja (HM/KM), serta status perbaikan operasional.
            </p>
          </div>

          {/* Action Strip: Site Switcher & Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Site Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
              {(["MuaraPahu", "Senyiur"] as const).map((site) => (
                <button
                  key={site}
                  type="button"
                  onClick={() => setSelectedSite(site)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedSite === site
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {site === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}
                </button>
              ))}
            </div>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={breakdownList.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Download format Spreadsheet Excel"
            >
              <Download size={13} className="text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-[#e95623]" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Input Breakdown Baru Button */}
            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#e95623] hover:bg-[#d84818] text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Input Breakdown Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Breakdown */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Total Insiden
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {summary?.total ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1.5">Insiden</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Total unit tercatat mengalami breakdown
          </p>
        </div>

        {/* Card 2: Open Breakdown */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
              <AlertCircle size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
              Perlu Perhatian
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">
              {summary?.open ?? 0}
            </span>
            <span className="text-xs text-rose-400 font-bold ml-1.5">Unit Open</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Sedang dalam perbaikan / belum selesai
          </p>
        </div>

        {/* Card 3: Close Breakdown */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
              <CheckCircle size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Selesai Diperbaiki
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {summary?.close ?? 0}
            </span>
            <span className="text-xs text-emerald-500 font-bold ml-1.5">Unit Close</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Telah kembali beroperasi normal
          </p>
        </div>

        {/* Card 4: Total Downtime Duration */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#e95623] border border-orange-200 flex items-center justify-center shadow-xs">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#e95623]">
              Akumulasi Downtime
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {summary?.totalDurationHours ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1.5">Jam</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Total waktu henti breakdown unit
          </p>
        </div>
      </div>

      {/* 3. Filters & Search Strip */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Filter inputs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tanggal Picker & Quick Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSetQuickDate("today")}
              className={`h-9 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split("T")[0]
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Hari Ini
            </button>
            {selectedDate && (
              <button
                type="button"
                onClick={() => handleSetQuickDate("all")}
                className="h-9 px-2.5 rounded-xl text-xs font-bold text-[#e95623] hover:bg-orange-50 cursor-pointer"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 pl-0 sm:pl-2 border-l-0 sm:border-l border-slate-200">
            <span className="text-xs font-bold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="All">Semua Status</option>
              <option value="Open">Open</option>
              <option value="Close">Close</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 pl-0 sm:pl-2 border-l-0 sm:border-l border-slate-200">
            <span className="text-xs font-bold text-slate-400">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="All">Semua Kategori</option>
              {BREAKDOWN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Search Box */}
        <div className="w-full sm:w-72 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Unit, WO, Komponen, Mekanik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* 4. Main Spreadsheet Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#1e40af] text-white font-extrabold uppercase text-[10px] tracking-wider border-b border-blue-900">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3 whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-3 whitespace-nowrap">Vehicle Number</th>
                <th className="py-3 px-3 whitespace-nowrap">Type</th>
                <th className="py-3 px-3 whitespace-nowrap">No WO</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">HM</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">KM</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Category Breakdown</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Start Breakdown</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Finish Breakdown</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Durasi (Jam)</th>
                <th className="py-3 px-4 min-w-45">Breakdown Description</th>
                <th className="py-3 px-4 min-w-45">Detail Activity</th>
                <th className="py-3 px-3 whitespace-nowrap">Component</th>
                <th className="py-3 px-3 whitespace-nowrap">Mechanic</th>
                <th className="py-3 px-3 whitespace-nowrap">Supervisor</th>
                <th className="py-3 px-3 whitespace-nowrap">Location</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={19} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-3 border-[#e95623]/20 border-t-[#e95623] rounded-full animate-spin" />
                      <span className="font-bold text-xs text-slate-500">Memuat data Daily Breakdown Report...</span>
                    </div>
                  </td>
                </tr>
              ) : breakdownList.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#e95623] flex items-center justify-center border border-orange-200">
                        <AlertTriangle size={24} />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm mt-1">Tidak Ada Data Breakdown</h3>
                      <p className="text-xs text-slate-400">
                        Tidak ditemukan catatan breakdown pada kriteria filter saat ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setItemToEdit(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#e95623] text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        <Plus size={13} />
                        <span>Input Breakdown Baru</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                breakdownList.map((item, index) => {
                  const categoryBadge = getCategoryBadge(item.category);
                  const isClose = item.status === "Close";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group text-xs"
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{index + 1}</td>

                      {/* Tanggal */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900">
                        {formatIndoDate(item.date)}
                      </td>

                      {/* Vehicle Number */}
                      <td className="py-3 px-3 whitespace-nowrap font-black text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {item.unitCode}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 whitespace-nowrap font-semibold text-slate-600">
                        {item.unitType || item.unit?.model || "-"}
                      </td>

                      {/* No WO */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600">
                        {item.woNumber || "-"}
                      </td>

                      {/* HM */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {item.hm != null ? item.hm.toLocaleString("id-ID") : "-"}
                      </td>

                      {/* KM */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {item.km != null ? item.km.toLocaleString("id-ID") : "-"}
                      </td>

                      {/* Category Breakdown */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-black text-[10px] border ${categoryBadge}`}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Start Breakdown */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {item.startTime || "-"}
                      </td>

                      {/* Finish Breakdown */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {item.finishTime || "-"}
                      </td>

                      {/* Durasi Jam */}
                      <td className="py-3 px-3 text-right font-mono font-black text-orange-600">
                        {item.durationHours != null ? item.durationHours.toFixed(2).replace(".", ",") : "0,00"}
                      </td>

                      {/* Breakdown Description */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.breakdownDescription}
                      </td>

                      {/* Detail Activity */}
                      <td className="py-3 px-4 text-slate-600">
                        {item.detailActivity || "-"}
                      </td>

                      {/* Component */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/60">
                          {item.component || "-"}
                        </span>
                      </td>

                      {/* Mechanic */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                        {item.mechanic || "-"}
                      </td>

                      {/* Supervisor */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                        {item.supervisor || "-"}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {item.location || "-"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title="Klik untuk mengubah status (Open / Close)"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer shadow-2xs ${
                            isClose
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {isClose ? <Check size={11} /> : <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                          <span>{item.status}</span>
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setItemToEdit(item);
                              setIsModalOpen(true);
                            }}
                            title="Edit data breakdown"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            title="Hapus breakdown"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Footer info strip */}
        <div className="p-3 sm:p-4 bg-slate-50/70 border-t border-slate-200/70 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Menampilkan <strong>{breakdownList.length}</strong> data breakdown unit pada Site{" "}
            <strong>{selectedSite === "MuaraPahu" ? "Muara Pahu" : "Senyiur"}</strong>
          </span>
          <span className="text-[11px] text-slate-400">
            Klik status pada baris tabel untuk mengubah secara cepat (Open / Close).
          </span>
        </div>
      </div>

      {/* 5. Modal Input / Edit Breakdown */}
      <DailyBreakdownModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setItemToEdit(null);
        }}
        onSuccess={() => loadData(true)}
        itemToEdit={itemToEdit}
        defaultSite={selectedSite}
        masterUnits={masterUnits}
      />
    </div>
  );
};

function formatIndoDate(isoDate: string): string {
  if (!isoDate) return "-";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export default DailyBreakdownReportView;
