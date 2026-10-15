"use client";

import React, { useState } from "react";
import { User, JobSite } from "../types/auth";
import {
  LayoutDashboard,
  FileText,
  TableProperties,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  Gauge,
  FileEdit,
  Waves,
} from "lucide-react";

interface SidebarProps {
  user: User;
  activeMenu: string;
  onSelectMenu: (menu: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeMenu,
  onSelectMenu,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isSuperAdmin = user.role === "SuperAdmin";

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: "Cost Analytics",
      items: [
        { id: "dashboard", label: "Dashboard Cost", icon: LayoutDashboard },
        { id: "cost-drivers", label: "Cost Driver", icon: Gauge },
        { id: "input-cost", label: "Input Cost", icon: FileEdit },
        { id: "reports", label: "Laporan Cost", icon: FileText },
        { id: "summary", label: "Laporan Summary", icon: TableProperties },
      ],
    },
    {
      title: "Water Depth",
      items: [
        {
          id: "river-journal",
          label: "River Journal",
          icon: Waves,
          badge: "Tabang",
        },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Administrasi",
            items: [
              {
                id: "users",
                label: "Manajemen User",
                icon: Users,
              },
            ],
          },
        ]
      : []),
  ];

  const getSiteBadge = (site: JobSite) => {
    switch (site) {
      case "MuaraPahu":
        return {
          label: "Site Muara Pahu",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "Senyiur":
        return {
          label: "Site Senyiur",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };
      case "HeadOffice":
        return {
          label: "Head Office",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
        };
      default:
        return {
          label: site,
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
        };
    }
  };

  const siteInfo = getSiteBadge(user.jobSite);

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out z-30 select-none shadow-sm ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Toggle button on the sidebar edge */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-7 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-[#e95623] transition-all"
        title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        aria-label="Toggle Sidebar"
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Header & Logo */}
      <div className="flex h-18 items-center px-4 border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
            <img
              src="/coa-logo-bdp.png"
              alt="Cost Analytics PT Batara Dharma Persada"
              className="h-full w-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                COST ANALYTICS
              </span>
              <span className="text-[10px] font-bold text-[#e95623] tracking-wide truncate">
                PT Batara Dharma Persada
              </span>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Info Card */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/60">
        <div
          className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
            isCollapsed ? "justify-center p-1.5" : "bg-white border border-slate-200/80 shadow-xs"
          }`}
        >
          <div className="relative shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-batara-orange-50 text-[#e95623] font-black text-sm border border-batara-orange-200 shadow-xs">
            {user.name.slice(0, 2).toUpperCase()}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#18bebc] ring-2 ring-white" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-800 truncate" title={user.name}>
                  {user.name}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 truncate" title={user.email}>
                {user.email}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${siteInfo.bg}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${siteInfo.dot}`} />
                  {siteInfo.label}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {user.role}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1">
            {sIdx > 0 && (
              <div
                className={`border-t border-slate-200 ${
                  isCollapsed ? "my-2.5 mx-2" : "my-2.5 mx-1"
                }`}
              />
            )}
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
            )}

            {section.items.map((item) => {
              const isActive = activeMenu === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectMenu(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-batara-orange-50 text-[#e95623] font-bold shadow-xs border-r-2 border-[#e95623]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? "text-[#e95623]"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />

                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-batara-orange-50 text-[#e95623] border border-batara-orange-200 shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}

                  {isActive && !isCollapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e95623]" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / System Status & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/40 space-y-2">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
            <span className="text-[10px] text-slate-400">v1.2.0</span>
          </div>
        )}

        <button
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors ${
            isCollapsed ? "justify-center px-0" : ""
          }`}
          title="Keluar dari Akun"
        >
          <LogOut size={17} className="shrink-0 text-rose-500" />
          {!isCollapsed && <span>Keluar / Logout</span>}
        </button>
      </div>
    </aside>
  );
};
