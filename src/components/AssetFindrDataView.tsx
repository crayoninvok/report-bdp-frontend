"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "../types/auth";
import {
  assetfindrService,
  WeighBridgeTicket,
} from "../services/assetfindrService";
import { AssetFindrTokenModal } from "./AssetFindrTokenModal";
import { useNotification } from "../context/NotificationContext";
import * as XLSX from "xlsx";
import {
  Table,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Truck,
  Scale,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileSpreadsheet,
  Layers,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Radio,
  SlidersHorizontal,
} from "lucide-react";

interface AssetFindrDataViewProps {
  user: User;
  onNavigateToDashboard?: () => void;
}

export const AssetFindrDataView: React.FC<AssetFindrDataViewProps> = ({
  user,
  onNavigateToDashboard,
}) => {
  const { showSuccess, showError } = useNotification();
  const [tickets, setTickets] = useState<WeighBridgeTicket[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [pageNo, setPageNo] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [selectedJobsite, setSelectedJobsite] = useState<"all" | "senyiur" | "muara_pahu">("all");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<WeighBridgeTicket | null>(null);

  const hasToken = typeof window !== "undefined" && !!assetfindrService.getStoredToken();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchKeyword.trim());
      setPageNo(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchKeyword]);

  // Load Data from API
  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await assetfindrService.getTickets({
        page_no: pageNo,
        page_size: pageSize,
        search_keyword: debouncedSearch || undefined,
        ticket_date_start: startDate ? `${startDate}T00:00:00+07:00` : undefined,
        ticket_date_end: endDate ? `${endDate}T23:59:59+07:00` : undefined,
        jobsite: selectedJobsite !== "all" ? selectedJobsite : undefined,
      });

      setTickets(res.data || []);
      setTotalRecords(res.total_records || 0);
      setIsLive(res.isLive);
    } catch (err: any) {
      console.error("Gagal mengambil data AssetFindr:", err);
      showError(err.message || "Gagal memuat data dari AssetFindr API");
    } finally {
      setIsLoading(false);
    }
  }, [pageNo, pageSize, debouncedSearch, startDate, endDate, selectedJobsite, showError]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Client-side shift filter
  const displayedTickets = useMemo(() => {
    if (selectedShift === "all") return tickets;
    return tickets.filter((t) => {
      return (
        t.work_shift_alias?.toLowerCase() === selectedShift.toLowerCase() ||
        t.work_shift_name?.toLowerCase().includes(selectedShift.toLowerCase())
      );
    });
  }, [tickets, selectedShift]);

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (tickets.length === 0) {
      showError("Tidak ada data tiket untuk diekspor.");
      return;
    }

    const exportRows = displayedTickets.map((t, idx) => ({
      No: idx + 1,
      "No Tiket (Reference ID)": t.reference_id,
      "Ticket Date": t.ticket_date ? new Date(t.ticket_date).toLocaleString("id-ID") : "-",
      "Vehicle Ref": t.vehicle_reference_number || "-",
      "Vehicle Name": t.vehicle_name || "-",
      Shift: t.work_shift_name || t.work_shift_alias || "-",
      Material: t.material?.name || "-",
      "Inbound (Gross kg)": t.inbound_weight_kg || 0,
      "Inbound WB": t.inbound_weight_bridge_location_label || "-",
      "Outbound (Tare kg)": t.outbound_weight_kg || 0,
      "Outbound WB": t.outbound_weight_bridge_location_label || "-",
      "Net Weight (kg)": t.net_weight || 0,
      "Net Weight (Ton)": ((t.net_weight || 0) / 1000).toFixed(2),
      "Start Location": t.location_route?.start_location_name || t.inbound_location_label || "-",
      "End Location": t.location_route?.end_location_name || t.outbound_location_label || "-",
      "Jarak (KM)": t.location_route?.distance_km || "-",
      Operator: t.inbound_operator_user_full_name || t.outbound_operator_user_full_name || "-",
      Remarks: t.remark || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WeighBridge_Tickets");
    XLSX.writeFile(
      workbook,
      `AssetFindr_WeighBridge_Tickets_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    showSuccess("Data tiket timbang berhasil diekspor ke Excel!");
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (tickets.length === 0) {
      showError("Tidak ada data tiket untuk diekspor.");
      return;
    }

    const exportRows = displayedTickets.map((t, idx) => ({
      No: idx + 1,
      Reference_ID: t.reference_id,
      Ticket_Date: t.ticket_date || "",
      Vehicle_Ref: t.vehicle_reference_number || "",
      Vehicle_Name: t.vehicle_name || "",
      Shift: t.work_shift_alias || "",
      Material: t.material?.name || "",
      Inbound_Gross_KG: t.inbound_weight_kg || 0,
      Outbound_Tare_KG: t.outbound_weight_kg || 0,
      Net_Weight_KG: t.net_weight || 0,
      Net_Weight_Ton: ((t.net_weight || 0) / 1000).toFixed(2),
      Start_Location: t.location_route?.start_location_name || "",
      End_Location: t.location_route?.end_location_name || "",
      Distance_KM: t.location_route?.distance_km || 0,
      Operator: t.inbound_operator_user_full_name || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AssetFindr_WeighBridge_Tickets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showSuccess("Data tiket timbang berhasil diunduh dalam format CSV!");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#e95623]">
              <Table size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  AssetFindr WeighBridge Data
                </h1>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live API
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                    <Radio size={12} className="text-amber-600" />
                    Mode Simulasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tabel Data Penimbangan Jembatan Timbang &bull; Endpoint <code>/weight-bridge/tickets</code>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsTokenModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
          >
            <Key size={14} className="text-orange-400" />
            <span>{hasToken ? "Ganti Token" : "Hubungkan Token"}</span>
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <Scale size={14} />
              <span>Buka Dashboard</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
            title="Download Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            title="Download CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            onClick={loadTickets}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
            title="Segarkan data tabel"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#e95623]" : ""} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari No Tiket, Unit, No Polisi, Operator, Lokasi..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          {/* Secondary Controls: Date Range, Shift, Page Size */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Jobsite Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <MapPin size={13} className="text-[#e95623]" />
              <select
                value={selectedJobsite}
                onChange={(e) => {
                  setSelectedJobsite(e.target.value as any);
                  setPageNo(1);
                }}
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Jobsite</option>
                <option value="senyiur">Jobsite Senyiur</option>
                <option value="muara_pahu">Jobsite Muara Pahu</option>
              </select>
            </div>

            {/* Shift Filter */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Shift</option>
              <option value="ds">Day Shift (DS)</option>
              <option value="ns">Night Shift (NS)</option>
            </select>

            {/* Date Start */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPageNo(1);
                }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Date End */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPageNo(1);
                }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Reset Dates */}
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPageNo(1);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Reset Tanggal
              </button>
            )}

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageNo(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 py-2 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10 Baris</option>
              <option value={25}>25 Baris</option>
              <option value={50}>50 Baris</option>
              <option value={100}>100 Baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tickets Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3.5">No Tiket</th>
                <th className="py-3 px-3">Waktu Tiket</th>
                <th className="py-3 px-3">Unit / Hauler</th>
                <th className="py-3 px-2 text-center">Shift</th>
                <th className="py-3 px-3">Material</th>
                <th className="py-3 px-3 text-right">Gross (In)</th>
                <th className="py-3 px-3 text-right">Tare (Out)</th>
                <th className="py-3 px-3 text-right text-emerald-700">Net Weight</th>
                <th className="py-3 px-3">Rute Pengangkutan</th>
                <th className="py-3 px-3">Operator</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-[#e95623] mx-auto mb-2" />
                    <span className="font-bold">Memuat data tiket timbang...</span>
                  </td>
                </tr>
              ) : displayedTickets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400 space-y-1">
                    <Scale size={28} className="mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-slate-600">Tidak ada data tiket ditemukan</p>
                    <p className="text-[11px] text-slate-400">
                      Coba sesuaikan kata kunci pencarian atau rentang tanggal filter
                    </p>
                  </td>
                </tr>
              ) : (
                displayedTickets.map((ticket) => {
                  const netTon = ((ticket.net_weight || 0) / 1000).toFixed(2);
                  const isNight =
                    ticket.work_shift_alias === "NS" ||
                    (ticket.work_shift_name && ticket.work_shift_name.toLowerCase().includes("night"));

                  return (
                    <tr
                      key={ticket.id || ticket.reference_id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Ticket Ref */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-black text-slate-900 block group-hover:text-[#e95623] transition-colors">
                          {ticket.reference_id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-28 block">
                          {ticket.id}
                        </span>
                      </td>

                      {/* Ticket Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">
                          {ticket.ticket_date
                            ? new Date(ticket.ticket_date).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ticket.ticket_date
                            ? new Date(ticket.ticket_date).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Truck size={13} className="text-slate-400 shrink-0" />
                          <span className="font-extrabold text-slate-900">
                            {ticket.vehicle_reference_number || ticket.vehicle_name || "-"}
                          </span>
                        </div>
                        {ticket.vehicle_name && ticket.vehicle_name !== ticket.vehicle_reference_number && (
                          <span className="text-[10px] text-slate-400 block pl-5 truncate max-w-32">
                            {ticket.vehicle_name}
                          </span>
                        )}
                      </td>

                      {/* Shift Badge */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isNight
                              ? "bg-slate-900 text-white"
                              : "bg-orange-100 text-[#e95623] border border-orange-200"
                          }`}
                        >
                          {ticket.work_shift_alias || (isNight ? "NS" : "DS")}
                        </span>
                      </td>

                      {/* Material */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block truncate max-w-36">
                          {ticket.material?.name || "Batu Bara"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ticket.material?.status_code || "ACTIVE"}
                        </span>
                      </td>

                      {/* Gross Weight */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-slate-700 block">
                          {(ticket.inbound_weight_kg || 0).toLocaleString("id-ID")} kg
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-28 block ml-auto">
                          {ticket.inbound_weight_bridge_location_alias || "WB-In"}
                        </span>
                      </td>

                      {/* Tare Weight */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-slate-700 block">
                          {(ticket.outbound_weight_kg || 0).toLocaleString("id-ID")} kg
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-28 block ml-auto">
                          {ticket.outbound_weight_bridge_location_alias || "WB-Out"}
                        </span>
                      </td>

                      {/* Net Weight */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className="text-sm font-black text-emerald-600 block">
                          {netTon} Ton
                        </span>
                        <span className="text-[10px] text-emerald-700/80 font-semibold">
                          {(ticket.net_weight || 0).toLocaleString("id-ID")} kg
                        </span>
                      </td>

                      {/* Route */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                          <span>
                            {ticket.location_route?.start_location_name || ticket.inbound_location_label || "Pit"}
                          </span>
                          <span className="text-slate-400">&rarr;</span>
                          <span>
                            {ticket.location_route?.end_location_name || ticket.outbound_location_label || "Port"}
                          </span>
                        </div>
                        {ticket.location_route?.distance_km ? (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Jarak: {ticket.location_route.distance_km} km
                          </span>
                        ) : null}
                      </td>

                      {/* Operator */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 block truncate max-w-28">
                          {ticket.inbound_operator_user_full_name ||
                            ticket.outbound_operator_user_full_name ||
                            "-"}
                        </span>
                        {ticket.remark && (
                          <span className="text-[10px] text-slate-400 truncate max-w-28 block">
                            {ticket.remark}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#e95623] hover:bg-orange-50 transition-colors cursor-pointer"
                          title="Lihat Detail Tiket"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            Menampilkan{" "}
            <strong>
              {displayedTickets.length > 0 ? (pageNo - 1) * pageSize + 1 : 0} -{" "}
              {Math.min(pageNo * pageSize, totalRecords)}
            </strong>{" "}
            dari <strong>{totalRecords.toLocaleString("id-ID")}</strong> tiket
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageNo((p) => Math.max(1, p - 1))}
              disabled={pageNo <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 font-mono font-bold text-slate-700">
              Halaman {pageNo} / {totalPages}
            </span>

            <button
              onClick={() => setPageNo((p) => Math.min(totalPages, p + 1))}
              disabled={pageNo >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e95623]/20 border border-orange-400/30 flex items-center justify-center text-[#e95623]">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                    Tiket Timbang {selectedTicket.reference_id}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedTicket.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Highlight Net Weight Card */}
              <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100 block">
                    Berat Bersih Muatan (Net Weight)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono">
                      {(((selectedTicket.net_weight || 0) / 1000)).toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-emerald-100">Ton</span>
                    <span className="text-xs text-emerald-200 font-mono ml-2">
                      ({(selectedTicket.net_weight || 0).toLocaleString("id-ID")} kg)
                    </span>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white font-black uppercase text-[10px] tracking-wide inline-block">
                    {selectedTicket.work_shift_name || selectedTicket.work_shift_alias || "Day Shift"}
                  </span>
                  <span className="text-[10px] text-emerald-100 block">
                    Material: {selectedTicket.material?.name || "Batu Bara"}
                  </span>
                </div>
              </div>

              {/* Weight Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Inbound (Berat Masuk / Gross)
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono block">
                    {(selectedTicket.inbound_weight_kg || 0).toLocaleString("id-ID")} kg
                  </span>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <p>Lokasi WB: {selectedTicket.inbound_weight_bridge_location_label || "-"}</p>
                    <p>
                      Waktu Inbound:{" "}
                      {selectedTicket.inbound_at
                        ? new Date(selectedTicket.inbound_at).toLocaleString("id-ID")
                        : "-"}
                    </p>
                    <p>Operator In: {selectedTicket.inbound_operator_user_full_name || "-"}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Outbound (Berat Keluar / Tare)
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono block">
                    {(selectedTicket.outbound_weight_kg || 0).toLocaleString("id-ID")} kg
                  </span>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <p>Lokasi WB: {selectedTicket.outbound_weight_bridge_location_label || "-"}</p>
                    <p>
                      Waktu Outbound:{" "}
                      {selectedTicket.outbound_at
                        ? new Date(selectedTicket.outbound_at).toLocaleString("id-ID")
                        : "-"}
                    </p>
                    <p>Operator Out: {selectedTicket.outbound_operator_user_full_name || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle & Fleet Info */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={14} className="text-[#e95623]" />
                  Informasi Armada & Unit Hauler
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kode Unit / No Referensi:</span>
                    <span className="font-extrabold text-slate-900">
                      {selectedTicket.vehicle_reference_number || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Unit:</span>
                    <span className="font-bold text-slate-800">{selectedTicket.vehicle_name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Asset ID:</span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      {selectedTicket.vehicle_asset_id || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Serial Number:</span>
                    <span className="font-mono text-slate-600">
                      {selectedTicket.vehicle_serial_number || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Route & Audit Info */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#e95623]" />
                  Rute & Lokasi Pengangkutan
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lokasi Asal (Start):</span>
                    <span className="font-bold text-slate-800">
                      {selectedTicket.location_route?.start_location_name ||
                        selectedTicket.inbound_location_label ||
                        "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lokasi Tujuan (End):</span>
                    <span className="font-bold text-slate-800">
                      {selectedTicket.location_route?.end_location_name ||
                        selectedTicket.outbound_location_label ||
                        "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Estimasi Jarak Tempuh:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedTicket.location_route?.distance_km
                        ? `${selectedTicket.location_route.distance_km} KM`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Catatan / Remark:</span>
                    <span className="text-slate-700">{selectedTicket.remark || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      <AssetFindrTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onTokenUpdated={() => {
          loadTickets();
        }}
      />
    </div>
  );
};
