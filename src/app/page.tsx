"use client";

import React, { useState, useEffect } from "react";
import { User } from "../types/auth";
import { authService } from "../services/authService";
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

import { Menu, Bell, MapPin } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { confirm, showInfo } = useNotification();

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
                    {activeMenu === "input-cost"
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
                      : activeMenu === "gl-data"
                      ? "Cost Analytics • GL Data"
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

            {/* Notification bell */}
            <button
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Notifikasi"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

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
          {activeMenu === "input-cost" ? (
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
          ) : activeMenu === "gl-data" ? (
            <GLDataView user={currentUser} />
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
