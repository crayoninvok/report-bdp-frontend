"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Menu,
} from "lucide-react";
import { authService } from "../services/authService";
import { User } from "../types/auth";
import { LoginScreen } from "./LoginScreen";
import { Sidebar } from "./Sidebar";
import { useNotification } from "../context/NotificationContext";
import {
  formatIndonesianFullDate,
  formatIndonesianShortDate,
  getTodayIsoDate,
  parseIsoDate,
  shiftIsoDate,
} from "../utils/dailyPaHelpers";

export const DailyPaDateDetailView: React.FC = () => {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const { confirm, showInfo } = useNotification();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const rawDate = Array.isArray(params?.date) ? params.date[0] : params?.date;
  const parsedDate = useMemo(() => parseIsoDate(rawDate), [rawDate]);
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  useEffect(() => {
    const saved = authService.getCurrentUser();
    if (saved) {
      setCurrentUser(saved);
    }
    setIsLoadingAuth(false);
  }, []);

  const handleSelectMenu = (menu: string) => {
    router.push(`/?menu=${encodeURIComponent(menu)}`);
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
            Memuat Halaman Daily PA...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const prevDateIso = parsedDate && rawDate ? shiftIsoDate(rawDate, -1) : null;
  const nextDateIso = parsedDate && rawDate ? shiftIsoDate(rawDate, 1) : null;
  const prevParsed = parseIsoDate(prevDateIso);
  const nextParsed = parseIsoDate(nextDateIso);

  const navbarDateLabel = parsedDate
    ? formatIndonesianShortDate(parsedDate.date)
    : "Tanggal Tidak Valid";

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          user={currentUser}
          activeMenu="daily-pa-report"
          onSelectMenu={handleSelectMenu}
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
              activeMenu="daily-pa-report"
              onSelectMenu={(menu) => {
                setIsMobileSidebarOpen(false);
                handleSelectMenu(menu);
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
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Buka Menu"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/coa-logo-bdp.png"
                alt="Report Management Portal PT Batara Dharma Persada"
                className="h-8 w-8 object-contain md:hidden"
              />
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-slate-800">
                  Plant &amp; Maintenance • Daily PA Report • {navbarDateLabel}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                  Report Management Portal &bull; PT Batara Dharma Persada
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
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
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6">
          <div className="w-full max-w-[1920px] mx-auto space-y-5">
            {!parsedDate ? (
              <div className="bg-white rounded-3xl border border-rose-200 shadow-xs p-6 sm:p-8 max-w-xl mx-auto text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-800">
                    Format Tanggal Tidak Valid
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Parameter tanggal <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{rawDate || "-"}</code> tidak dikenali. Gunakan format <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">YYYY-MM-DD</code>.
                  </p>
                </div>
                <Link
                  href="/?menu=daily-pa-report"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold transition-colors"
                >
                  <ArrowLeft size={15} />
                  <span>Kembali ke Kalender Daily PA</span>
                </Link>
              </div>
            ) : (
              <>
                {/* Date Page Top Bar */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/?menu=daily-pa-report"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
                    >
                      <ArrowLeft size={15} />
                      <span>Kembali ke Kalender</span>
                    </Link>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                        <CalendarCheck size={20} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight">
                            {formatIndonesianFullDate(parsedDate.date)}
                          </h1>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {rawDate}
                          </span>
                          {rawDate === todayIso && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Halaman Daily PA Report per tanggal
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step Prev/Next Day */}
                  <div className="flex items-center gap-2">
                    {prevDateIso && prevParsed && (
                      <Link
                        href={`/daily-pa-report/${prevDateIso}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <ChevronLeft size={15} />
                        <span>{formatIndonesianShortDate(prevParsed.date)}</span>
                      </Link>
                    )}

                    {nextDateIso && nextParsed && (
                      <Link
                        href={`/daily-pa-report/${nextDateIso}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <span>{formatIndonesianShortDate(nextParsed.date)}</span>
                        <ChevronRight size={15} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Empty Content Workspace (ready to be designed) */}
                <div className="min-h-96" />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
