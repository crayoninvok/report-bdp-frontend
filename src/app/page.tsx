"use client";

import React, { useState, useEffect, useRef } from "react";
import { User } from "../types/auth";
import { authService } from "../services/authService";
import { reportService, LatestDataUpdateItem } from "../services/reportService";
import { LoginScreen } from "../components/LoginScreen";
import { Sidebar } from "../components/Sidebar";
import { DashboardView } from "../components/DashboardView";
import { ReportsView } from "../components/ReportsView";
import { InputCostView } from "../components/InputCostView";
import { SummaryOpsView } from "../components/SummaryOpsView";
import { UserManagementView } from "../components/UserManagementView";
import { CostDriverView } from "../components/CostDriverView";
import { RiverJournalView } from "../components/RiverJournalView";
import { InputProductionView } from "../components/InputProductionView";
import { CoalProductionDashboardView } from "../components/CoalProductionDashboardView";
import { CoalProductionReportView } from "../components/CoalProductionReportView";
import { UnderDevelopmentView } from "../components/UnderDevelopmentView";
import { GLDataView } from "../components/GLDataView";
import { PeriodicInspectionView } from "../components/PeriodicInspectionView";
import { TyreRimUsageView } from "../components/TyreRimUsageView";
import { MasterUnitView } from "../components/MasterUnitView";
import { DashboardCostOverallView } from "../components/DashboardCostOverallView";
import { AssetFindrDashboardView } from "../components/AssetFindrDashboardView";
import { AssetFindrDataView } from "../components/AssetFindrDataView";

import {
  Menu,
  Bell,
  MapPin,
  X,
  Clock,
  RefreshCw,
  Database,
  FileText,
  TableProperties,
  Truck,
  Waves,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { confirm, showInfo } = useNotification();

  // Notification Bell State & Latest Updates Tracking
  const [latestUpdates, setLatestUpdates] = useState<LatestDataUpdateItem[]>([]);
  const [latestTimestamp, setLatestTimestamp] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isNotifLoading, setIsNotifLoading] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const NOTIF_STORAGE_KEY = "report_bdp_last_notif_seen";

  const fetchLatestUpdates = async () => {
    try {
      setIsNotifLoading(true);
      const res = await reportService.getLatestUpdates();
      if (res.success) {
        setLatestUpdates(res.updates);
        setLatestTimestamp(res.latestTimestamp);

        // Check if there is a new update compared to last seen
        const lastSeen = typeof window !== "undefined" ? localStorage.getItem(NOTIF_STORAGE_KEY) : null;
        if (res.latestTimestamp) {
          if (!lastSeen) {
            setHasUnread(true);
          } else {
            const hasNew = new Date(res.latestTimestamp).getTime() > new Date(lastSeen).getTime();
            setHasUnread(hasNew);
          }
        } else {
          setHasUnread(false);
        }
      }
    } catch (err) {
      console.error("Error loading latest updates:", err);
    } finally {
      setIsNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestUpdates();
    // Poll updates every 60 seconds
    const interval = setInterval(fetchLatestUpdates, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotifOpen]);

  const handleToggleNotif = () => {
    if (!isNotifOpen) {
      setIsNotifOpen(true);
      if (latestTimestamp) {
        localStorage.setItem(NOTIF_STORAGE_KEY, latestTimestamp);
      }
      setHasUnread(false);
      fetchLatestUpdates();
    } else {
      setIsNotifOpen(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 1) return "Baru saja";
      if (diffMin < 60) return `${diffMin} mnt lalu`;
      if (diffHour < 24) return `${diffHour} jam lalu`;
      if (diffDay === 1) return "Kemarin";
      if (diffDay < 7) return `${diffDay} hr lalu`;

      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatExactDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    // Check if user session exists in localStorage
    const saved = authService.getCurrentUser();
    if (saved) {
      setCurrentUser(saved);
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const menuParam = params.get("menu");
      if (menuParam) {
        setActiveMenu(menuParam);
      }
    }
    setIsLoadingAuth(false);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveMenu("dashboard");
  };

  const handleLogout = () => {
    confirm({
      title: "Konfirmasi Keluar Akun",
      message: `Apakah Anda yakin ingin keluar dari sistem Report Management Portal PT Batara Dharma Persada? Sesi login ${currentUser?.name || ""} akan diakhiri.`,
      confirmText: "Ya, Keluar Akun",
      cancelText: "Batal",
      type: "danger",
      icon: "logout",
      onConfirm: () => {
        authService.logout();
        setCurrentUser(null);
        showInfo("Anda telah berhasil keluar dari akun.", "Sesi Berakhir");
      },
    });
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-500 tracking-wide">
            Memuat Sistem Batara...
          </span>
        </div>
      </div>
    );
  }

  // If not logged in, immediately render the Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Dashboard with Sidebar system once logged in
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Desktop & Collapsible Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          user={currentUser}
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col h-full z-10 w-72 bg-white shadow-2xl">
            <Sidebar
              user={currentUser}
              activeMenu={activeMenu}
              onSelectMenu={(menu) => {
                setActiveMenu(menu);
                setIsMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Buka Menu"
            >
              <Menu size={18} />
            </button>

            {/* Title with Logo */}
            <div className="flex items-center gap-2.5">
              <img
                src="/coa-logo-bdp.png"
                alt="Report Management Portal PT Batara Dharma Persada"
                className="h-8 w-8 object-contain md:hidden"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-800">
                    {activeMenu === "dashboard-overall"
                      ? "Cost Analytics • Dashboard Cost Overall"
                      : activeMenu === "input-cost"
                      ? "Input Cost"
                      : activeMenu === "reports"
                      ? "Laporan Cost"
                      : activeMenu === "summary"
                      ? "Laporan Summary Operasional (PL Summary 1 OPS)"
                      : activeMenu === "users"
                      ? "Manajemen Pengguna (Super Admin)"
                      : activeMenu === "cost-drivers"
                      ? "Cost Driver"
                      : activeMenu === "river-journal"
                      ? "River Journal • Kedalaman Sungai Project Tabang"
                      : activeMenu === "coal-dashboard"
                      ? "Coal Hauling • Dashboard Produksi"
                      : activeMenu === "coal-input"
                      ? "Coal Hauling • Input Data Produksi"
                      : activeMenu === "coal-reports"
                      ? "Coal Hauling • Laporan Produksi"
                      : activeMenu === "assetfindr-dashboard"
                      ? "Coal Hauling • AssetFindr Dashboard"
                      : activeMenu === "assetfindr-data"
                      ? "Coal Hauling • AssetFindr Data"
                      : activeMenu === "gl-data"
                      ? "Cost Analytics • GL Raw Data"
                      : activeMenu === "plant-dashboard"
                      ? "Plant & Maintenance • Dashboard Plant"
                      : activeMenu === "periodic-inspection"
                      ? "Plant & Maintenance • Periodic Inspection"
                      : activeMenu === "tyre-rim-usage"
                      ? "Plant & Maintenance • Tyre & Rim Usage"
                      : activeMenu === "master-unit"
                      ? "Plant & Maintenance • Master Data Unit"
                      : "Dashboard Cost"}
                  </span>
                  {activeMenu.startsWith("coal-") && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Maintenance
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                  Report Management Portal &bull; PT Batara Dharma Persada
                </span>
              </div>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Site indicator badge in header */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
              <MapPin size={13} className="text-[#e95623]" />
              <span>
                {currentUser.jobSite === "MuaraPahu"
                  ? "Muara Pahu"
                  : currentUser.jobSite === "Senyiur"
                  ? "Senyiur"
                  : "Head Office"}
              </span>
            </div>

            {/* Notification Bell with Latest Updates Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleToggleNotif}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                  isNotifOpen
                    ? "bg-orange-50 border-orange-300 text-[#e95623]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                title={hasUnread ? "Ada data update baru!" : "Riwayat Update Data"}
                aria-label="Riwayat Update Data"
              >
                <Bell size={16} />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 top-10 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header */}
                  <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-orange-100 text-[#e95623] flex items-center justify-center">
                        <Bell size={14} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">
                          Riwayat Update Data
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Waktu data terakhir diunggah ke sistem
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Tutup"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Popover Content */}
                  <div className="max-h-84 overflow-y-auto divide-y divide-slate-100 p-1">
                    {isNotifLoading && latestUpdates.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <RefreshCw size={18} className="animate-spin text-[#e95623] mx-auto mb-2" />
                        <span>Memeriksa pembaruan data...</span>
                      </div>
                    ) : latestUpdates.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <span>Belum ada data yang diunggah.</span>
                      </div>
                    ) : (
                      latestUpdates.map((item) => {
                        const Icon =
                          item.category === "gl-data"
                            ? Database
                            : item.category === "reports"
                            ? FileText
                            : item.category === "summary"
                            ? TableProperties
                            : item.category === "coal-dashboard"
                            ? Truck
                            : Waves;

                        const badgeClass =
                          item.category === "gl-data"
                            ? "bg-orange-50 text-[#e95623] border-orange-200"
                            : item.category === "reports"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : item.category === "summary"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : item.category === "coal-dashboard"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-cyan-50 text-cyan-700 border-cyan-200";

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setActiveMenu(item.category);
                              setIsNotifOpen(false);
                            }}
                            className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-2.5"
                          >
                            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-orange-50 group-hover:text-[#e95623] flex items-center justify-center shrink-0 transition-colors border border-slate-200/60 mt-0.5">
                              <Icon size={14} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badgeClass}`}
                                >
                                  {item.module}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                  {formatTimeAgo(item.timestamp)}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-slate-800 group-hover:text-[#e95623] transition-colors truncate mt-1">
                                {item.title}
                              </p>

                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>

                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                                <Clock size={10} />
                                <span>{formatExactDate(item.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Popover Footer */}
                  <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">
                      Klik item untuk membuka menu
                    </span>
                    <button
                      onClick={() => {
                        if (latestTimestamp) {
                          localStorage.setItem(NOTIF_STORAGE_KEY, latestTimestamp);
                        }
                        setHasUnread(false);
                        setIsNotifOpen(false);
                      }}
                      className="text-xs font-bold text-[#e95623] hover:text-[#d44818] cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Quick Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-batara-orange-50 text-[#e95623] font-bold text-xs border border-batara-orange-200">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activeMenu === "dashboard-overall" ? (
            <DashboardCostOverallView user={currentUser} />
          ) : activeMenu === "input-cost" ? (
            <InputCostView
              user={currentUser}
              onNavigateToReports={() => setActiveMenu("reports")}
            />
          ) : activeMenu === "reports" ? (
            <ReportsView
              user={currentUser}
              onNavigateToInput={() => setActiveMenu("input-cost")}
            />
          ) : activeMenu === "summary" ? (
            <SummaryOpsView user={currentUser} />
          ) : activeMenu === "users" ? (
            <UserManagementView user={currentUser} />
          ) : activeMenu === "cost-drivers" ? (
            <CostDriverView user={currentUser} />
          ) : activeMenu === "river-journal" ? (
            <RiverJournalView user={currentUser} />
          ) : activeMenu === "coal-dashboard" ? (
            <CoalProductionDashboardView
              user={currentUser}
              onNavigateToInput={() => setActiveMenu("coal-input")}
              onNavigateToReports={() => setActiveMenu("coal-reports")}
            />
          ) : activeMenu === "coal-input" ? (

            <InputProductionView
              user={currentUser}
              onNavigateToDashboard={() => setActiveMenu("dashboard")}
            />
          ) : activeMenu === "coal-reports" ? (
            <CoalProductionReportView
              user={currentUser}
              onNavigateToInput={() => setActiveMenu("coal-input")}
              onNavigateToDashboard={() => setActiveMenu("coal-dashboard")}
            />
          ) : activeMenu === "assetfindr-dashboard" ? (
            <AssetFindrDashboardView
              user={currentUser}
              onNavigateToData={() => setActiveMenu("assetfindr-data")}
            />
          ) : activeMenu === "assetfindr-data" ? (
            <AssetFindrDataView
              user={currentUser}
              onNavigateToDashboard={() => setActiveMenu("assetfindr-dashboard")}
            />
          ) : activeMenu === "gl-data" ? (
            <GLDataView user={currentUser} />
          ) : activeMenu === "plant-dashboard" ? (
            <UnderDevelopmentView
              user={currentUser}
              moduleName="Dashboard Plant"
              moduleCategory="Plant & Maintenance"
              onBackToDashboard={() => setActiveMenu("dashboard")}
            />
          ) : activeMenu === "periodic-inspection" ? (
            <PeriodicInspectionView
              user={currentUser}
              onNavigateToMasterUnit={() => setActiveMenu("master-unit")}
            />
          ) : activeMenu === "tyre-rim-usage" ? (
            <TyreRimUsageView user={currentUser} />
          ) : activeMenu === "master-unit" ? (
            <MasterUnitView
              user={currentUser}
              onNavigateToPI={() => setActiveMenu("periodic-inspection")}
            />
          ) : (
            <DashboardView
              user={currentUser}
              onNavigateToReports={() => setActiveMenu("reports")}
              onNavigateToCostDrivers={() => setActiveMenu("cost-drivers")}
              onNavigateToRiverJournal={() => setActiveMenu("river-journal")}
            />
          )}
        </main>
      </div>
    </div>
  );
}
