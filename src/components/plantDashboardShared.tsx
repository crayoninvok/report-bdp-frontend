"use client";

import React from "react";

export const PLANT_CATEGORY_COLORS = {
  TYRE: "#e95623",
  SPAREPART: "#0284c7",
  OLI_GREASE: "#f59e0b",
  CONSUMABLE_TOOLS: "#8b5cf6",
  JASA_UNDERCARRIAGE: "#10b981",
} as const;

export const PM_STATUS_COLORS: Record<string, string> = {
  Completed: "#10b981",
  "In Progress": "#f59e0b",
  Scheduled: "#0ea5e9",
  Pending: "#ef4444",
};

/** Formats IDR amounts concisely for KPI cards & chart axes (e.g. Rp 4,57 M / Rp 741,5 Jt). */
export function formatIdrCompact(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000_000).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000).toLocaleString("id-ID")} Rb`;
  }
  return `${sign}Rp ${Math.round(abs).toLocaleString("id-ID")}`;
}

/** Formats axis tick ticks compactly without currency prefix (e.g. 2,5 M / 500 Jt). */
export function formatIdrAxis(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs === 0) return "0";
  if (abs >= 1_000_000_000) {
    const num = abs / 1_000_000_000;
    return `${sign}${num.toLocaleString("id-ID", {
      maximumFractionDigits: num >= 10 ? 0 : 1,
    })} M`;
  }
  if (abs >= 1_000_000) {
    const num = abs / 1_000_000;
    return `${sign}${num.toLocaleString("id-ID", {
      maximumFractionDigits: num >= 10 ? 0 : 1,
    })} Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)} Rb`;
  }
  return `${sign}${Math.round(abs)}`;
}

/** Formats full exact IDR tooltip label. */
export function formatIdrExact(val: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(val));
}

export function stripBebanPrefix(name: string): string {
  return name.replace(/^BEBAN\s+/i, "").trim();
}

interface PlantChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "orange" | "sky" | "emerald" | "slate" | "violet";
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const BADGE_CLASSES: Record<NonNullable<PlantChartCardProps["badgeTone"]>, string> = {
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export const PlantChartCard: React.FC<PlantChartCardProps> = ({
  title,
  subtitle,
  badge,
  badgeTone = "slate",
  rightSlot,
  children,
  className = "",
}) => (
  <div
    className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col ${className}`}
  >
    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          {badge && (
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${BADGE_CLASSES[badgeTone]}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

export const EmptyChartState: React.FC<{ message?: string; heightClass?: string }> = ({
  message = "Belum ada data grafik untuk filter periode yang dipilih.",
  heightClass = "h-64",
}) => (
  <div
    className={`${heightClass} w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center px-6 text-center`}
  >
    <p className="text-xs font-medium text-slate-400">{message}</p>
  </div>
);

interface SwitchPillOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SwitchPillOption<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              active
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
