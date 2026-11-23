"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Gauge,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Wrench,
  RotateCcw,
  AlertTriangle,
  Camera,
  Check,
  X,
  Layers,
  Search,
  Filter,
  Truck,
  Upload,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { PlantDashboardData } from "../services/plantService";

interface PlantFleetReliabilitySectionProps {
  site?: string;
  data?: PlantDashboardData | null;
}

// Model Category Definition
interface EquipmentCategory {
  id: string;
  badge: string;
  title: string;
  availabilityPct: number;
  rfuCount: number;
  breakdownCount: number;
  totalUnits: number;
  mtbf: string;
  mttr: string;
  ua: string;
  defaultSvgType: string;
}

// Unit item for the "Papan Catur" (Chessboard Unit Allocation Matrix)
interface ChessboardUnit {
  id: string;
  code: string;
  categoryId: string;
  categoryName: string;
  model: string;
  status: "RFU" | "BREAKDOWN" | "IN_WORKSHOP" | "SERVICE_PS" | "STANDBY";
  location: string;
  hm: number;
  operatorOrDriver?: string;
  issueDescription?: string;
}

// Initial 10 Equipment Categories matching real database assets
const DEFAULT_CATEGORIES: EquipmentCategory[] = [
  {
    id: "prime-mover",
    badge: "VOLVO",
    title: "Prime Mover",
    availabilityPct: 97,
    rfuCount: 69,
    breakdownCount: 2,
    totalUnits: 71,
    mtbf: "71,5h",
    mttr: "1,5h",
    ua: "20,9%",
    defaultSvgType: "prime-mover",
  },
  {
    id: "dump-truck",
    badge: "MAN",
    title: "Dump Truck",
    availabilityPct: 0,
    rfuCount: 0,
    breakdownCount: 0,
    totalUnits: 0,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "dump-truck",
  },
  {
    id: "generator-set",
    badge: "KENT",
    title: "Generator Set",
    availabilityPct: 100,
    rfuCount: 8,
    breakdownCount: 0,
    totalUnits: 8,
    mtbf: "-",
    mttr: "1,0h",
    ua: "-",
    defaultSvgType: "generator-set",
  },
  {
    id: "support-truck",
    badge: "HINO",
    title: "Support Truck",
    availabilityPct: 100,
    rfuCount: 2,
    breakdownCount: 0,
    totalUnits: 2,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "support-truck",
  },
  {
    id: "air-compressor",
    badge: "KAESER",
    title: "Air Compressor",
    availabilityPct: 100,
    rfuCount: 3,
    breakdownCount: 0,
    totalUnits: 3,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "air-compressor",
  },
  {
    id: "excavator",
    badge: "CAT",
    title: "Excavator",
    availabilityPct: 0,
    rfuCount: 0,
    breakdownCount: 0,
    totalUnits: 0,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "excavator",
  },
  {
    id: "fuel-truck",
    badge: "DF",
    title: "Fuel Truck",
    availabilityPct: 100,
    rfuCount: 1,
    breakdownCount: 0,
    totalUnits: 1,
    mtbf: "-",
    mttr: "2,4h",
    ua: "-",
    defaultSvgType: "fuel-truck",
  },
  {
    id: "water-truck",
    badge: "DF",
    title: "Water Truck",
    availabilityPct: 100,
    rfuCount: 1,
    breakdownCount: 0,
    totalUnits: 1,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "water-truck",
  },
  {
    id: "dozer",
    badge: "KOMATSU",
    title: "Dozer",
    availabilityPct: 0,
    rfuCount: 0,
    breakdownCount: 0,
    totalUnits: 0,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "dozer",
  },
  {
    id: "light-vehicle",
    badge: "TOYOTA",
    title: "Light Vehicle",
    availabilityPct: 0,
    rfuCount: 0,
    breakdownCount: 0,
    totalUnits: 0,
    mtbf: "-",
    mttr: "-",
    ua: "-",
    defaultSvgType: "light-vehicle",
  },
];

// Real units dataset matching MasterUnit in database
const REAL_CHESSBOARD_UNITS: ChessboardUnit[] = [
  // 71 Prime Movers (Volvo FH16)
  ...Array.from({ length: 71 }, (_, i) => {
    const num = 401 + i;
    const code = `PM${num}`;
    const isWorkshop = code === "PM418";
    const isBreakdown = code === "PM451";
    const status: ChessboardUnit["status"] = isWorkshop
      ? "IN_WORKSHOP"
      : isBreakdown
      ? "BREAKDOWN"
      : "RFU";
    const location = isWorkshop
      ? "Workshop Senyiur"
      : isBreakdown
      ? "Km 24 Outbound Senyiur"
      : i % 2 === 0
      ? "Hauling Road Km 12-28"
      : "Pit Muara Pahu";
    const issueDescription = isWorkshop
      ? "Perbaikan Sistem Pendingin Radiator"
      : isBreakdown
      ? "Trouble Transmisi Gear Slip"
      : undefined;

    return {
      id: `u-pm-${num}`,
      code,
      categoryId: "prime-mover",
      categoryName: "Prime Mover",
      model: "Volvo FH16",
      status,
      location,
      hm: 12000 + ((num * 73) % 4500),
      issueDescription,
    };
  }),

  // 8 Generator Sets
  { id: "u-gs-00", code: "GS", categoryId: "generator-set", categoryName: "Generator Set", model: "KENPOWER TG90", status: "RFU", location: "Workshop Senyiur", hm: 6200 },
  { id: "u-gs-01", code: "GS001", categoryId: "generator-set", categoryName: "Generator Set", model: "Perkins PL80KVA", status: "RFU", location: "Camp Senyiur", hm: 5800 },
  { id: "u-gs-02", code: "GS002", categoryId: "generator-set", categoryName: "Generator Set", model: "KENPOWER TG90", status: "RFU", location: "Workshop Senyiur", hm: 7100 },
  { id: "u-gs-05", code: "GS005", categoryId: "generator-set", categoryName: "Generator Set", model: "Kent Power KENT200", status: "RFU", location: "Port Jetty Senyiur", hm: 6400 },
  { id: "u-gs-06", code: "GS006", categoryId: "generator-set", categoryName: "Generator Set", model: "Kent Power KENT500", status: "RFU", location: "Fuel Station Senyiur", hm: 5200 },
  { id: "u-gs-07", code: "GS007", categoryId: "generator-set", categoryName: "Generator Set", model: "Kent Power KENT200", status: "RFU", location: "Sump Pump Pit", hm: 7800 },
  { id: "u-gs-08", code: "GS008", categoryId: "generator-set", categoryName: "Generator Set", model: "Kent Power KENT80", status: "RFU", location: "Office Senyiur", hm: 4900 },
  { id: "u-gs-09", code: "GS009", categoryId: "generator-set", categoryName: "Generator Set", model: "Perkins PL10KVA", status: "RFU", location: "Camp Senyiur", hm: 3500 },

  // 3 Air Compressors
  { id: "u-ac-03", code: "AC003", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Kaeser BSD75", status: "RFU", location: "Tyre Shop Senyiur", hm: 7650 },
  { id: "u-ac-04", code: "AC004", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Kaeser M31", status: "RFU", location: "Workshop Senyiur", hm: 8100 },
  { id: "u-ac-05", code: "AC005", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Puma PUK100-300A", status: "RFU", location: "Workshop Senyiur", hm: 6300 },

  // 1 Fuel Truck
  { id: "u-ft-101", code: "FT101", categoryId: "fuel-truck", categoryName: "Fuel Truck", model: "Dongfeng K24Y", status: "RFU", location: "Pit Mobile Dispenser", hm: 5800 },

  // 1 Water Truck
  { id: "u-wt-301", code: "WT301", categoryId: "water-truck", categoryName: "Water Truck", model: "Dongfeng K36Y", status: "RFU", location: "Hauling Road Km 12", hm: 7200 },

  // 2 Support Trucks (Storing Truck & Telehandler)
  { id: "u-st-101", code: "ST101", categoryId: "support-truck", categoryName: "Support Truck", model: "Hino 135HDL", status: "RFU", location: "Mobile Workshop Senyiur", hm: 4320 },
  { id: "u-th-001", code: "TH001", categoryId: "support-truck", categoryName: "Support Truck", model: "Manitou MXT-840", status: "RFU", location: "Workshop Yard Senyiur", hm: 3950 },
];

// Clean Vector Equipment Illustrations for 10 Heavy Equipment Categories
function EquipmentIllustration({ type }: { type: string }) {
  // 1. Prime Mover (Volvo FH16 6x4 Heavy Hauler COE Tractor Unit)
  if (type === "prime-mover") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        {/* Ground shadow */}
        <ellipse cx="80" cy="74" rx="66" ry="3.5" fill="#e2e8f0" />
        {/* Heavy chassis rail */}
        <rect x="28" y="52" width="102" height="7" rx="1.5" fill="#1e293b" />
        {/* Mudguard quarter fenders */}
        <path d="M28 55 A 11 11 0 0 1 50 55" stroke="#334155" strokeWidth="2.5" fill="none" />
        <path d="M50 55 A 11 11 0 0 1 72 55" stroke="#334155" strokeWidth="2.5" fill="none" />
        {/* Fifth wheel trailer coupling */}
        <rect x="42" y="47" width="14" height="4" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="1" />
        <circle cx="49" cy="49" r="1.5" fill="#f59e0b" />
        {/* Catwalk platform & battery box */}
        <rect x="60" y="46" width="16" height="6" rx="1" fill="#64748b" />
        {/* Vertical exhaust / air snorkel stack behind cab */}
        <rect x="74" y="16" width="3.5" height="36" rx="1" fill="#94a3b8" />
        <path d="M72 16 L79 16 L77 13 L73 13 Z" fill="#64748b" />
        {/* Cab-Over-Engine Sleeper Body */}
        <path d="M78 18 L124 18 L129 27 L132 50 L132 55 L78 55 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        {/* High roof aerodynamic cap */}
        <path d="M80 18 L124 18 L121 14 L84 14 Z" fill="#e2e8f0" />
        {/* Aerodynamic sun visor */}
        <path d="M110 21 L129 26 L126 28 L110 23 Z" fill="#0284c7" />
        {/* Windshield */}
        <path d="M110 24 L127 28 L125 39 L110 39 Z" fill="#38bdf8" fillOpacity="0.35" stroke="#0284c7" strokeWidth="1" />
        {/* Side window */}
        <rect x="88" y="24" width="18" height="15" rx="1" fill="#38bdf8" fillOpacity="0.3" stroke="#0284c7" strokeWidth="0.8" />
        {/* Side orange stripe */}
        <rect x="80" y="44" width="48" height="3" fill="#e95623" />
        {/* Front radiator grille & Volvo diagonal slash */}
        <rect x="127" y="40" width="5" height="13" rx="1" fill="#334155" />
        <line x1="127" y1="41" x2="132" y2="52" stroke="#cbd5e1" strokeWidth="1.2" />
        {/* Headlights */}
        <rect x="128" y="49" width="4" height="4" rx="0.8" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
        {/* Door handle & side step */}
        <rect x="99" y="41" width="4" height="1.2" rx="0.6" fill="#64748b" />
        <rect x="110" y="53" width="7" height="2" rx="0.5" fill="#64748b" />
        {/* Wheels (6x4 Configuration: Tandem dual rear drive + Front steer) */}
        <circle cx="39" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="39" cy="62" r="4.5" fill="#94a3b8" />
        <circle cx="39" cy="62" r="2" fill="#0f172a" />
        <circle cx="61" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="61" cy="62" r="4.5" fill="#94a3b8" />
        <circle cx="61" cy="62" r="2" fill="#0f172a" />
        <circle cx="118" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="118" cy="62" r="4.5" fill="#cbd5e1" />
        <circle cx="118" cy="62" r="2" fill="#0f172a" />
      </svg>
    );
  }

  // 2. Dump Truck (Mining Tipper Truck with FOPS Cab Guard Canopy)
  if (type === "dump-truck") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="66" ry="3.5" fill="#e2e8f0" />
        {/* Chassis */}
        <rect x="26" y="52" width="105" height="7" rx="1.5" fill="#1e293b" />
        {/* Mining Tipper Rock Bed */}
        <path d="M25 24 L103 24 L105 51 L23 51 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
        {/* Overhanging FOPS Cab Canopy */}
        <path d="M103 24 L127 18 L127 22 L103 27 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        {/* Body Stiffener Ribs */}
        <line x1="43" y1="24" x2="41" y2="51" stroke="#94a3b8" strokeWidth="2" />
        <line x1="63" y1="24" x2="61" y2="51" stroke="#94a3b8" strokeWidth="2" />
        <line x1="83" y1="24" x2="81" y2="51" stroke="#94a3b8" strokeWidth="2" />
        {/* Warning safety stripe */}
        <rect x="25" y="44" width="78" height="3" fill="#e95623" />
        {/* Cabin under canopy */}
        <path d="M106 28 L124 28 L129 40 L129 52 L106 52 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M116 31 L123 31 L126 40 L116 40 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
        <rect x="127" y="47" width="3" height="4" fill="#cbd5e1" />
        {/* Hoist hydraulic ram */}
        <line x1="104" y1="36" x2="102" y2="51" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Wheels */}
        <circle cx="42" cy="62" r="10" fill="#0f172a" />
        <circle cx="42" cy="62" r="5" fill="#64748b" />
        <circle cx="65" cy="62" r="10" fill="#0f172a" />
        <circle cx="65" cy="62" r="5" fill="#64748b" />
        <circle cx="118" cy="62" r="10" fill="#0f172a" />
        <circle cx="118" cy="62" r="5" fill="#64748b" />
      </svg>
    );
  }

  // 3. Generator Set (Soundproof Diesel Genset Canopy - Kent Power / Perkins)
  if (type === "generator-set" || type === "genset") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="60" ry="3.5" fill="#e2e8f0" />
        {/* Heavy Skid Base with Forklift Pockets */}
        <rect x="25" y="58" width="110" height="11" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
        <rect x="44" y="61" width="14" height="5" rx="1" fill="#0f172a" />
        <rect x="96" y="61" width="14" height="5" rx="1" fill="#0f172a" />
        {/* Soundproof Acoustic Enclosure */}
        <rect x="28" y="22" width="104" height="36" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Top Lifting Lugs */}
        <circle cx="34" cy="21" r="2.5" stroke="#64748b" strokeWidth="1.5" fill="none" />
        <circle cx="126" cy="21" r="2.5" stroke="#64748b" strokeWidth="1.5" fill="none" />
        {/* Top Exhaust Muffler with Rain Cap */}
        <rect x="42" y="14" width="7" height="8" rx="1" fill="#475569" />
        <line x1="40" y1="14" x2="51" y2="11" stroke="#334155" strokeWidth="1.5" />
        {/* Cooling Ventilation Louvers */}
        <rect x="33" y="28" width="22" height="24" rx="1.5" fill="#0f172a" />
        <line x1="35" y1="32" x2="53" y2="32" stroke="#475569" strokeWidth="1.2" />
        <line x1="35" y1="36" x2="53" y2="36" stroke="#475569" strokeWidth="1.2" />
        <line x1="35" y1="40" x2="53" y2="40" stroke="#475569" strokeWidth="1.2" />
        <line x1="35" y1="44" x2="53" y2="44" stroke="#475569" strokeWidth="1.2" />
        <line x1="35" y1="48" x2="53" y2="48" stroke="#475569" strokeWidth="1.2" />
        {/* Center Maintenance Access Door */}
        <rect x="60" y="26" width="34" height="28" rx="2" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
        <circle cx="64" cy="40" r="1.5" fill="#1e293b" />
        {/* Digital Control Panel */}
        <rect x="100" y="27" width="26" height="20" rx="2" fill="#0f172a" />
        <rect x="103" y="30" width="14" height="8" rx="1" fill="#0284c7" fillOpacity="0.8" />
        <circle cx="120" cy="32" r="1.2" fill="#22c55e" />
        <circle cx="120" cy="36" r="1.2" fill="#f59e0b" />
        {/* Emergency Stop Button */}
        <circle cx="113" cy="42" r="2.5" fill="#ef4444" />
        {/* Corporate Yellow Accent Stripe */}
        <rect x="28" y="53" width="104" height="2.5" fill="#eab308" />
      </svg>
    );
  }

  // 4. Support Truck (Service & Mobile Workshop Crane Truck - Hino 135HDL)
  if (type === "support-truck") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="66" ry="3.5" fill="#e2e8f0" />
        {/* Chassis */}
        <rect x="26" y="52" width="105" height="7" rx="1.5" fill="#1e293b" />
        {/* Day Cab */}
        <path d="M106 28 L124 28 L129 40 L129 52 L106 52 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M116 31 L123 31 L126 40 L116 40 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
        <rect x="113" y="25" width="7" height="3" rx="1" fill="#f59e0b" />
        {/* Tool Shutter Cabinet Body */}
        <rect x="52" y="28" width="52" height="24" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
        <line x1="56" y1="33" x2="100" y2="33" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="56" y1="37" x2="100" y2="37" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="56" y1="41" x2="100" y2="41" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="56" y1="45" x2="100" y2="45" stroke="#cbd5e1" strokeWidth="1.2" />
        <rect x="52" y="47" width="52" height="3" fill="#0284c7" />
        {/* Knuckle Boom Crane on Rear Deck */}
        <path d="M30 48 L32 30 L44 30 L48 38" stroke="#eab308" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="48" y1="38" x2="48" y2="44" stroke="#334155" strokeWidth="1.5" />
        {/* Lube Drum */}
        <rect x="36" y="38" width="9" height="13" rx="1.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
        {/* Wheels */}
        <circle cx="45" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="45" cy="62" r="4.5" fill="#64748b" />
        <circle cx="68" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="68" cy="62" r="4.5" fill="#64748b" />
        <circle cx="118" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="118" cy="62" r="4.5" fill="#64748b" />
      </svg>
    );
  }

  // 5. Air Compressor (Towable Rotary Screw Compressor on Wheels - Kaeser BSD75 / M31)
  if (type === "air-compressor" || type === "compressor") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="55" ry="3.5" fill="#e2e8f0" />
        {/* Tow Drawbar & Hitch Ring */}
        <path d="M102 52 L132 58 L136 58" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="138" cy="58" r="2.5" stroke="#1e293b" strokeWidth="1.5" fill="none" />
        <line x1="124" y1="56" x2="124" y2="67" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="124" cy="68" r="2" fill="#0f172a" />
        {/* Kaeser Aerodynamic Yellow Canopy */}
        <path d="M32 50 L32 30 Q34 22 46 22 L98 22 Q106 22 108 32 L110 50 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
        <rect x="30" y="48" width="82" height="6" rx="1" fill="#1e293b" />
        {/* Gull-wing Side Door */}
        <rect x="42" y="25" width="46" height="21" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        <circle cx="65" cy="36" r="1.5" fill="#1e293b" />
        {/* Cooling Louvers */}
        <line x1="93" y1="28" x2="103" y2="28" stroke="#78350f" strokeWidth="1.2" />
        <line x1="93" y1="32" x2="103" y2="32" stroke="#78350f" strokeWidth="1.2" />
        <line x1="93" y1="36" x2="103" y2="36" stroke="#78350f" strokeWidth="1.2" />
        <line x1="93" y1="40" x2="103" y2="40" stroke="#78350f" strokeWidth="1.2" />
        {/* Top Exhaust */}
        <rect x="46" y="17" width="5" height="5" rx="1" fill="#475569" />
        {/* Pressure Gauge */}
        <circle cx="37" cy="32" r="3" fill="#ffffff" stroke="#1e293b" strokeWidth="0.8" />
        <line x1="37" y1="32" x2="38.5" y2="30.5" stroke="#ef4444" strokeWidth="0.8" />
        {/* Air Hose Outlet Valves */}
        <rect x="27" y="40" width="5" height="3" rx="0.5" fill="#94a3b8" />
        <circle cx="26" cy="41.5" r="1.5" fill="#38bdf8" />
        {/* Pneumatic Trailer Wheel with Mudguard */}
        <path d="M60 52 A 12 12 0 0 1 84 52" stroke="#1e293b" strokeWidth="2.5" fill="none" />
        <circle cx="72" cy="58" r="11" fill="#0f172a" />
        <circle cx="72" cy="58" r="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="72" cy="58" r="2" fill="#1e293b" />
      </svg>
    );
  }

  // 6. Excavator (Hydraulic Crawler Excavator - CAT 336 / 320)
  if (type === "excavator") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="65" ry="3.5" fill="#e2e8f0" />
        {/* Crawler Tracks */}
        <rect x="35" y="58" width="80" height="15" rx="7.5" fill="#1e293b" />
        <rect x="40" y="61" width="70" height="9" rx="4.5" fill="#334155" />
        <circle cx="48" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="62" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="75" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="88" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="102" cy="65.5" r="3.5" fill="#0f172a" />
        {/* Turntable */}
        <rect x="52" y="54" width="46" height="5" rx="1.5" fill="#475569" />
        {/* Rear Engine Counterweight */}
        <path d="M48 40 L50 54 L68 54 L68 34 L54 34 Z" fill="#f59e0b" />
        <rect x="49" y="44" width="19" height="3" fill="#1e293b" />
        {/* Operator Cabin */}
        <path d="M68 31 L68 54 L90 54 L92 40 L86 31 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
        <path d="M72 34 L84 34 L88 43 L72 43 Z" fill="#38bdf8" fillOpacity="0.45" stroke="#0284c7" strokeWidth="1" />
        <line x1="68" y1="31" x2="87" y2="31" stroke="#1e293b" strokeWidth="1.8" />
        {/* Articulated Boom, Arm & Digging Bucket */}
        <path d="M58 46 L82 17 L108 27 L126 50" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="82" cy="17" r="4" fill="#1e293b" />
        <circle cx="108" cy="27" r="3.5" fill="#1e293b" />
        <line x1="62" y1="46" x2="86" y2="28" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="86" y1="28" x2="98" y2="22" stroke="#cbd5e1" strokeWidth="1.8" />
        <path d="M124 49 L134 58 L126 67 L116 63 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
        <path d="M134 58 L138 62" stroke="#0f172a" strokeWidth="1.8" />
      </svg>
    );
  }

  // 7. Fuel Truck (Mobile Fuel Tanker 10KL - Dongfeng K24Y)
  if (type === "fuel-truck") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="66" ry="3.5" fill="#e2e8f0" />
        {/* Chassis */}
        <rect x="26" y="52" width="105" height="7" rx="1.5" fill="#1e293b" />
        {/* Day Cab */}
        <path d="M106 28 L124 28 L129 40 L129 52 L106 52 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M116 31 L123 31 L126 40 L116 40 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
        <rect x="107" y="44" width="21" height="3" fill="#e95623" />
        {/* Fuel Tanker Body */}
        <rect x="28" y="27" width="76" height="25" rx="9" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="29" y="38" width="74" height="5" fill="#ef4444" />
        {/* Flammable Hazard Diamond Placard */}
        <polygon points="65,34 69,38 65,42 61,38" fill="#ffffff" stroke="#ef4444" strokeWidth="0.8" />
        <circle cx="65" cy="38" r="1.2" fill="#ef4444" />
        {/* Top Walkway & Manholes */}
        <line x1="38" y1="23" x2="94" y2="23" stroke="#64748b" strokeWidth="1.2" />
        <line x1="42" y1="23" x2="42" y2="27" stroke="#64748b" strokeWidth="1" />
        <line x1="70" y1="23" x2="70" y2="27" stroke="#64748b" strokeWidth="1" />
        <line x1="90" y1="23" x2="90" y2="27" stroke="#64748b" strokeWidth="1" />
        <ellipse cx="48" cy="26" rx="4" ry="1.5" fill="#475569" />
        <ellipse cx="78" cy="26" rx="4" ry="1.5" fill="#475569" />
        {/* Access Ladder & Dispensing Box */}
        <line x1="32" y1="26" x2="32" y2="52" stroke="#64748b" strokeWidth="1.2" />
        <line x1="30" y1="33" x2="34" y2="33" stroke="#64748b" strokeWidth="1" />
        <line x1="30" y1="41" x2="34" y2="41" stroke="#64748b" strokeWidth="1" />
        <rect x="42" y="44" width="16" height="7" rx="1" fill="#334155" />
        <rect x="88" y="45" width="8" height="6" rx="1" fill="#dc2626" />
        {/* Wheels */}
        <circle cx="45" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="45" cy="62" r="4.5" fill="#64748b" />
        <circle cx="68" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="68" cy="62" r="4.5" fill="#64748b" />
        <circle cx="118" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="118" cy="62" r="4.5" fill="#64748b" />
      </svg>
    );
  }

  // 8. Water Truck (Mining Dust Suppression Water Tanker 20KL - Dongfeng K36Y)
  if (type === "water-truck") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="66" ry="3.5" fill="#e2e8f0" />
        {/* Chassis */}
        <rect x="26" y="52" width="105" height="7" rx="1.5" fill="#1e293b" />
        {/* Day Cab */}
        <path d="M106 28 L124 28 L129 40 L129 52 L106 52 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M116 31 L123 31 L126 40 L116 40 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
        {/* Water Tank with Hydro Wave Graphic */}
        <rect x="28" y="27" width="76" height="25" rx="8" fill="#f1f5f9" stroke="#0284c7" strokeWidth="1.5" />
        <path d="M29 39 Q45 34 62 39 T95 39 T103 40 L103 45 Q85 46 68 43 T29 46 Z" fill="#0284c7" fillOpacity="0.75" />
        {/* Top Water Cannon Monitor Turret */}
        <rect x="94" y="23" width="7" height="4" rx="1" fill="#0f172a" />
        <path d="M98 23 L106 16 L108 17 L100 24 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.8" />
        <path d="M107 16 L113 13 L114 17 Z" fill="#38bdf8" fillOpacity="0.6" />
        <ellipse cx="62" cy="26" rx="5" ry="1.5" fill="#475569" />
        {/* Rear Spray Bar */}
        <line x1="24" y1="44" x2="24" y2="54" stroke="#0284c7" strokeWidth="2" />
        <rect x="22" y="52" width="4" height="3" fill="#0284c7" />
        {/* Wheels */}
        <circle cx="45" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="45" cy="62" r="4.5" fill="#64748b" />
        <circle cx="68" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="68" cy="62" r="4.5" fill="#64748b" />
        <circle cx="118" cy="62" r="9.5" fill="#0f172a" />
        <circle cx="118" cy="62" r="4.5" fill="#64748b" />
      </svg>
    );
  }

  // 9. Dozer (Crawler Track Bulldozer - Komatsu D85 / CAT D8)
  if (type === "dozer") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="66" ry="3.5" fill="#e2e8f0" />
        {/* Heavy Crawler Track Assembly (Elevated Drive Sprocket) */}
        <path d="M36 65 L44 48 L96 48 L106 65 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
        <rect x="34" y="60" width="74" height="10" rx="5" fill="#0f172a" />
        <circle cx="46" cy="53" r="4.5" fill="#334155" />
        <circle cx="94" cy="53" r="4.5" fill="#334155" />
        <circle cx="45" cy="65" r="3" fill="#334155" />
        <circle cx="58" cy="65" r="3" fill="#334155" />
        <circle cx="71" cy="65" r="3" fill="#334155" />
        <circle cx="84" cy="65" r="3" fill="#334155" />
        <circle cx="95" cy="65" r="3" fill="#334155" />
        {/* Engine Hood & Body */}
        <path d="M58 35 L96 35 L106 46 L58 46 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
        <line x1="88" y1="38" x2="98" y2="38" stroke="#78350f" strokeWidth="1" />
        <line x1="90" y1="41" x2="100" y2="41" stroke="#78350f" strokeWidth="1" />
        <rect x="68" y="20" width="3" height="15" rx="0.8" fill="#1e293b" />
        {/* ROPS Cabin */}
        <path d="M48 24 L72 24 L72 46 L48 46 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
        <rect x="52" y="27" width="16" height="12" rx="1" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="0.8" />
        <line x1="48" y1="24" x2="48" y2="46" stroke="#1e293b" strokeWidth="2" />
        <line x1="72" y1="24" x2="72" y2="46" stroke="#1e293b" strokeWidth="2" />
        {/* Bulldozer Push Blade & Push Beam */}
        <path d="M120 40 Q118 55 125 70 L132 70 Q124 55 126 40 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
        <line x1="125" y1="70" x2="132" y2="70" stroke="#f59e0b" strokeWidth="2" />
        <line x1="68" y1="58" x2="120" y2="58" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
        <line x1="94" y1="37" x2="118" y2="48" stroke="#1e293b" strokeWidth="2.5" />
        {/* Rear Ripper Shank */}
        <path d="M46 50 L32 54 L26 68 L29 69 L35 57" stroke="#1e293b" strokeWidth="2.5" fill="#334155" />
        <polygon points="26,68 23,73 29,70" fill="#f59e0b" />
      </svg>
    );
  }

  // 10. Light Vehicle (4x4 Double-Cab Mining Utility Pickup - Toyota Hilux)
  return (
    <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
      <ellipse cx="80" cy="74" rx="64" ry="3.5" fill="#e2e8f0" />
      {/* 4x4 High-Clearance Chassis */}
      <rect x="28" y="52" width="102" height="5" rx="1" fill="#1e293b" />
      {/* Double-Cab Pickup Body */}
      <path d="M30 42 L30 52 L128 52 L128 42 L106 42 L94 28 L58 28 L46 42 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Windshield & Windows */}
      <path d="M93 30 L104 41 L92 41 L85 30 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="0.8" />
      <rect x="74" y="31" width="10" height="9" rx="0.5" fill="#38bdf8" fillOpacity="0.3" stroke="#0284c7" strokeWidth="0.8" />
      <rect x="60" y="31" width="11" height="9" rx="0.5" fill="#38bdf8" fillOpacity="0.3" stroke="#0284c7" strokeWidth="0.8" />
      {/* Reflective Orange Mining Stripe */}
      <rect x="30" y="44" width="98" height="2.5" fill="#f59e0b" />
      {/* Safety Rollbar in Bed */}
      <path d="M58 42 L58 29 L54 29 L46 42" stroke="#1e293b" strokeWidth="2.5" fill="none" />
      {/* Steel Bullbar & Spotlights */}
      <path d="M125 54 L132 54 L132 40 L126 40" stroke="#1e293b" strokeWidth="2.5" fill="none" />
      <circle cx="129" cy="45" r="2" fill="#fef08a" />
      {/* Roof Emergency Strobe Lightbar */}
      <rect x="72" y="24" width="14" height="4" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
      {/* High-Visibility Buggy Whip Safety Flag */}
      <line x1="42" y1="42" x2="42" y2="8" stroke="#475569" strokeWidth="1.2" />
      <circle cx="42" cy="7" r="1.8" fill="#f59e0b" />
      <polygon points="42,9 30,13 42,17" fill="#f97316" />
      {/* Side Rock-Slider Step */}
      <rect x="60" y="53" width="38" height="2" rx="1" fill="#334155" />
      {/* Wheel Arches & All-Terrain Wheels */}
      <path d="M38 52 A 12 12 0 0 1 62 52" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <path d="M96 52 A 12 12 0 0 1 120 52" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="61" r="10.5" fill="#0f172a" />
      <circle cx="50" cy="61" r="5" fill="#cbd5e1" />
      <circle cx="108" cy="61" r="10.5" fill="#0f172a" />
      <circle cx="108" cy="61" r="5" fill="#cbd5e1" />
    </svg>
  );
}

// Circular Percentage Gauge
function CircularGauge({ pct, totalUnits }: { pct: number; totalUnits?: number }) {
  const isZeroOrEmpty = totalUnits === 0 || pct === null || pct === undefined;
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isZeroOrEmpty ? circumference : circumference - (pct / 100) * circumference;

  let strokeColor = "#10b981"; // green
  if (!isZeroOrEmpty) {
    if (pct < 75) strokeColor = "#f59e0b"; // amber
    else if (pct < 85) strokeColor = "#eab308"; // gold
    else if (pct < 95) strokeColor = "#059669"; // teal green
  }

  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        {/* Background track */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          className="stroke-slate-200"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Animated colored progress bar */}
        {!isZeroOrEmpty && (
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      <span className="absolute text-[11px] font-black text-slate-800 tracking-tight">
        {isZeroOrEmpty ? "-" : `${pct}%`}
      </span>
    </div>
  );
}

export const PlantFleetReliabilitySection: React.FC<PlantFleetReliabilitySectionProps> = ({
  site = "ALL",
  data,
}) => {
  // Selected category for filtering "Papan Catur"
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Custom equipment image map saved in localStorage
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [activeEditingCategory, setActiveEditingCategory] = useState<string>("prime-mover");
  const [imageUrlInput, setImageUrlInput] = useState<string>("");

  // Papan Catur status filter
  const [chessboardStatusFilter, setChessboardStatusFilter] = useState<string>("ALL");
  const [chessboardSearch, setChessboardSearch] = useState<string>("");

  // Load custom images from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("plant_equipment_custom_images");
      if (saved) {
        setCustomImages(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load custom equipment images from storage", e);
    }
  }, []);

  // Save image to localStorage
  const handleSaveCustomImage = (categoryId: string, url: string) => {
    const updated = { ...customImages, [categoryId]: url };
    setCustomImages(updated);
    try {
      localStorage.setItem("plant_equipment_custom_images", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist custom image to storage", e);
    }
    setImageUrlInput("");
  };

  const handleResetImages = () => {
    setCustomImages({});
    try {
      localStorage.removeItem("plant_equipment_custom_images");
    } catch (e) {
      console.warn("Failed to clear custom images", e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleSaveCustomImage(categoryId, result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Filtered units for the interactive "Papan Catur"
  const filteredChessboardUnits = useMemo(() => {
    return REAL_CHESSBOARD_UNITS.filter((u) => {
      // Category filter
      if (selectedCategoryId && u.categoryId !== selectedCategoryId) return false;
      // Status filter
      if (chessboardStatusFilter !== "ALL" && u.status !== chessboardStatusFilter) return false;
      // Search query
      if (chessboardSearch.trim()) {
        const q = chessboardSearch.toLowerCase();
        return (
          u.code.toLowerCase().includes(q) ||
          u.model.toLowerCase().includes(q) ||
          u.location.toLowerCase().includes(q) ||
          (u.issueDescription && u.issueDescription.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCategoryId, chessboardStatusFilter, chessboardSearch]);

  const activeCategoryObj = useMemo(() => {
    return DEFAULT_CATEGORIES.find((c) => c.id === selectedCategoryId) || null;
  }, [selectedCategoryId]);

  // Real Fleet Reliability metrics from database via PlantDashboardData
  const rel = data?.fleetReliability;

  // Real category counts from MasterUnit if available
  const categoriesWithRealCounts = useMemo(() => {
    if (!rel?.categoryCounts || rel.categoryCounts.length === 0) {
      return DEFAULT_CATEGORIES;
    }

    return DEFAULT_CATEGORIES.map((cat) => {
      // Find matching items in categoryCounts
      const matching = rel.categoryCounts?.filter((c) => {
        const cLower = c.category.toLowerCase();
        if (cat.id === "prime-mover" && cLower.includes("prime mover")) return true;
        if (cat.id === "dump-truck" && cLower.includes("dump truck")) return true;
        if (cat.id === "generator-set" && (cLower.includes("genset") || cLower.includes("generator"))) return true;
        if (cat.id === "support-truck" && (cLower.includes("support") || cLower.includes("storing") || cLower.includes("telehandler"))) return true;
        if (cat.id === "air-compressor" && cLower.includes("compressor")) return true;
        if (cat.id === "excavator" && cLower.includes("excavator")) return true;
        if (cat.id === "fuel-truck" && (cLower.includes("fuel truck") || cLower.includes("fuel"))) return true;
        if (cat.id === "water-truck" && cLower.includes("water truck")) return true;
        if (cat.id === "dozer" && cLower.includes("dozer")) return true;
        if (cat.id === "light-vehicle" && (cLower.includes("light vehicle") || cLower.includes("lv"))) return true;
        return false;
      }) || [];

      if (matching.length === 0) {
        return {
          ...cat,
          rfuCount: 0,
          breakdownCount: 0,
          totalUnits: 0,
          availabilityPct: 0,
          mtbf: "-",
          mttr: "-",
          ua: "-",
        };
      }

      const rfuCount = matching
        .filter((m) => m.status === "Active")
        .reduce((sum, m) => sum + m.count, 0);
      const totalUnits = matching.reduce((sum, m) => sum + m.count, 0);
      const breakdownCount = Math.max(0, totalUnits - rfuCount);
      const availabilityPct = totalUnits > 0 ? Math.round((rfuCount / totalUnits) * 100) : 0;

      return {
        ...cat,
        rfuCount,
        breakdownCount,
        totalUnits,
        availabilityPct,
      };
    });
  }, [rel?.categoryCounts]);

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* =========================================================================
          PART 1: 8 Fleet KPI Cards (Physical Availability, Reliability, Maintenance)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: PHYSICAL AVAILABILITY (PA) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Gauge className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                PHYSICAL AVAILABILITY (PA)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Target {rel?.pa?.targetPa != null ? `${rel.pa.targetPa}%` : "85%"}
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {rel?.pa?.paPercent != null ? `${rel.pa.paPercent}%` : "-"}
            </div>
            {rel?.pa?.paPercent != null ? (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md border inline-flex items-center ${
                  rel.pa.statusText === "Needs Focus" || rel.pa.paPercent < (rel.pa.targetPa ?? 85)
                    ? "text-amber-700 bg-amber-50 border-amber-200/60"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200/60"
                }`}
              >
                {rel.pa.statusText || (rel.pa.paPercent >= (rel.pa.targetPa ?? 85) ? "On Target" : "Needs Focus")}
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">-</span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">
              MOHH: {rel?.pa?.mohhHours != null ? `${rel.pa.mohhHours.toLocaleString("id-ID")}h` : "-"}
            </span>
            <span className="font-bold text-rose-600">
              BD: {rel?.pa?.bdHours != null ? `${rel.pa.bdHours.toLocaleString("id-ID")}h` : "-"}
            </span>
          </div>
        </div>

        {/* Card 2: MECHANICAL AVAILABILITY (MA) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Activity className="w-4 h-4 text-orange-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                MECHANICAL AVAILABILITY (MA)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
              Target {rel?.ma?.targetMa != null ? `${rel.ma.targetMa}%` : "88%"}
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {rel?.ma?.maPercent != null ? `${rel.ma.maPercent}%` : "-"}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Operating Fleet
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">
              Operating: {rel?.ma?.operatingHours != null ? `${rel.ma.operatingHours.toLocaleString("id-ID")}h` : "-"}
            </span>
            <span className="font-bold text-slate-600">
              UA: {rel?.ma?.uaPercent != null ? `${rel.ma.uaPercent}%` : "-"}
            </span>
          </div>
        </div>

        {/* Card 3: FLEET READINESS (RFU) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                FLEET READINESS (RFU)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {rel?.fleetReadiness?.readinessPercent != null
                ? `${rel.fleetReadiness.readinessPercent}% Ready`
                : "-"}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {rel?.fleetReadiness?.rfuUnits != null ? `${rel.fleetReadiness.rfuUnits} RFU` : "-"}
            </span>
            {rel?.fleetReadiness?.totalUnits != null && (
              <span className="text-xs font-bold text-slate-500">
                / {rel.fleetReadiness.totalUnits} Units
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400">
            Ready for Immediate Production
          </div>
        </div>

        {/* Card 4: MTBS (RELIABILITY) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                MTBS (RELIABILITY)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              In Workshop
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {rel?.mtbs?.inWorkshopUnits != null ? `${rel.mtbs.inWorkshopUnits}` : "-"}
              {rel?.mtbs?.inWorkshopUnits != null && (
                <span className="text-sm font-semibold text-slate-500 ml-1">Jobs</span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Target &gt; {rel?.mtbs?.targetHours ?? 20}h
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 truncate">
            Mean Operating Time Between Shutdown
          </div>
        </div>

        {/* Card 5: MTBF (RELIABILITY) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-4 h-4 text-sky-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                MTBF (RELIABILITY)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              HM / Freq
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {rel?.mtbf?.valueHours != null ? (
                <>
                  {rel.mtbf.valueHours} <span className="text-sm font-semibold text-slate-500">Hrs</span>
                </>
              ) : (
                "-"
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Target &gt; {rel?.mtbf?.targetHours ?? 20}h
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 truncate">
            Mean Operating Time Between Failures
          </div>
        </div>

        {/* Card 6: MTTR (MAINTAINABILITY) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                MTTR (MAINTAINABILITY)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Closed Only
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {rel?.mttr?.valueHours != null ? (
                <>
                  {rel.mttr.valueHours} <span className="text-sm font-semibold text-slate-500">Hrs</span>
                </>
              ) : (
                "-"
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Target &lt; {rel?.mttr?.targetHours ?? 4}h
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 truncate">
            Average Closed Repair Duration
          </div>
        </div>

        {/* Card 7: Redo PS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <RotateCcw className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Redo PS
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Target {rel?.redoPs?.targetPercent ?? 10}%
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {rel?.redoPs?.openJobsCount != null ? rel.redoPs.openJobsCount : "-"}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Open Jobs
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 truncate">
            Breakdown USM after Service &lt;3 hari
          </div>
        </div>

        {/* Card 8: PM COMPLIANCE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                PM COMPLIANCE
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                rel?.pmCompliance?.compliancePercent != null && rel.pmCompliance.compliancePercent >= 90
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {rel?.pmCompliance?.compliancePercent != null && rel.pmCompliance.compliancePercent >= 90
                ? "On Track"
                : "Action Req."}
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div
              className={`text-3xl font-black tracking-tight ${
                rel?.pmCompliance?.compliancePercent != null
                  ? rel.pmCompliance.compliancePercent >= 90
                    ? "text-emerald-600"
                    : "text-rose-600"
                  : "text-slate-400"
              }`}
            >
              {rel?.pmCompliance?.compliancePercent != null ? (
                <>
                  {rel.pmCompliance.compliancePercent} <span className="text-sm font-bold">%</span>
                </>
              ) : (
                "-"
              )}
            </div>
            <Link
              href="/?menu=preventive-maintenance"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 cursor-pointer inline-flex items-center gap-1 transition-colors"
            >
              <span>Input Service</span>
              <ExternalLink size={10} />
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 truncate">
            Compliance Periodical Service
          </div>
        </div>
      </div>

      {/* =========================================================================
          PART 2: Fleet Availability & Reliability Overview (10 Category Cards)
          ========================================================================= */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Fleet Availability &amp; Reliability Overview</span>
              {selectedCategoryId && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#e95623] border border-orange-200">
                  Filter: {activeCategoryObj?.title}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              10 Model Kategori Alat Berat &bull; Klik kartu untuk filter Papan Catur
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategoryId && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsImageModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/90 border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-amber-700" />
              <span>Ganti Gambar Alat</span>
            </button>
          </div>
        </div>

        {/* 10 Category Cards Grid (Responsive 2 to 5 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {categoriesWithRealCounts.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const customImg = customImages[cat.id];

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategoryId(isSelected ? null : cat.id);
                }}
                className={`group relative bg-white rounded-2xl border p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
                  isSelected
                    ? "border-[#e95623] ring-2 ring-[#e95623]/30 shadow-md bg-orange-50/15"
                    : "border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300"
                }`}
              >
                {/* Header inside card: Badge + Title + Circular Gauge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">
                      {cat.badge}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-[#e95623] transition-colors leading-tight">
                      {cat.title}
                    </h3>
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      {cat.totalUnits === 0 ? (
                        <span className="text-slate-400 font-semibold">-</span>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                            <Check size={11} strokeWidth={3} /> {cat.rfuCount}
                          </span>
                          <span>/</span>
                          <span className="text-rose-500 font-extrabold flex items-center gap-0.5">
                            <X size={11} strokeWidth={3} /> {cat.breakdownCount}
                          </span>
                          <span className="text-slate-400 font-semibold">
                            ({cat.totalUnits}u)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <CircularGauge pct={cat.availabilityPct} totalUnits={cat.totalUnits} />
                </div>

                {/* Central Equipment Illustration / Custom Image */}
                <div className="my-3 h-20 w-full flex items-center justify-center relative overflow-hidden rounded-xl bg-slate-50/50 group-hover:bg-slate-50 transition-colors">
                  {customImg ? (
                    <img
                      src={customImg}
                      alt={cat.title}
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  ) : (
                    <EquipmentIllustration type={cat.defaultSvgType} />
                  )}
                </div>

                {/* Bottom 3-Column Performance Stats */}
                <div className="grid grid-cols-3 bg-slate-50/90 rounded-xl p-1.5 border border-slate-200/70 text-center">
                  <div className="px-1 border-r border-slate-200">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      MTBF
                    </div>
                    <div className="text-[11px] font-black text-slate-800">
                      {cat.mtbf}
                    </div>
                  </div>
                  <div className="px-1 border-r border-slate-200">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      MTTR
                    </div>
                    <div className="text-[11px] font-black text-slate-800">
                      {cat.mttr}
                    </div>
                  </div>
                  <div className="px-1">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      UA
                    </div>
                    <div className="text-[11px] font-black text-slate-800">
                      {cat.ua}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          PART 3: Papan Catur (Interactive Unit Allocation Matrix)
          ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-200 text-[#e95623] flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Papan Catur Status Armada (Fleet Matrix)
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredChessboardUnits.length} Unit
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Papan posisi kesiapan fisik, alokasi kerja, dan status pemeliharaan unit per kategori
              </p>
            </div>
          </div>

          {/* Quick Status Pill Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              {(["ALL", "RFU", "BREAKDOWN", "IN_WORKSHOP"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setChessboardStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chessboardStatusFilter === st
                      ? "bg-white text-slate-900 shadow-2xs font-black"
                      : "hover:text-slate-900"
                  }`}
                >
                  {st === "ALL"
                    ? "Semua"
                    : st === "RFU"
                    ? "RFU"
                    : st === "BREAKDOWN"
                    ? "Breakdown"
                    : "In Workshop"}
                </button>
              ))}
            </div>

            <div className="relative min-w-40">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari unit / lokasi..."
                value={chessboardSearch}
                onChange={(e) => setChessboardSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
              />
            </div>
          </div>
        </div>

        {/* Units Chess Grid */}
        {filteredChessboardUnits.length === 0 ? (
          <div className="py-12 text-center text-xs space-y-1 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="font-bold text-slate-600">
              {selectedCategoryId
                ? `Tidak ada unit terdaftar pada database untuk kategori ${activeCategoryObj?.title || ""}.`
                : "Tidak ada unit yang cocok dengan filter atau kata kunci pencarian."}
            </div>
            <div className="text-[11px] text-slate-400">
              {selectedCategoryId
                ? "Data populasi armada untuk model alat berat ini saat ini kosong pada database."
                : "Silakan ubah filter status atau kata kunci pencarian Anda."}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
            {filteredChessboardUnits.map((u) => {
              const isRfu = u.status === "RFU";
              const isBd = u.status === "BREAKDOWN";
              const isWorkshop = u.status === "IN_WORKSHOP";

              return (
                <div
                  key={u.id}
                  className={`rounded-xl border p-2.5 flex flex-col justify-between transition-all hover:shadow-xs ${
                    isRfu
                      ? "bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300"
                      : isBd
                      ? "bg-rose-50/60 border-rose-200/90 hover:border-rose-300"
                      : isWorkshop
                      ? "bg-amber-50/50 border-amber-200/80 hover:border-amber-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      {u.categoryName}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        isRfu
                          ? "bg-emerald-600 text-white"
                          : isBd
                          ? "bg-rose-600 text-white"
                          : isWorkshop
                          ? "bg-amber-600 text-white"
                          : "bg-slate-600 text-white"
                      }`}
                    >
                      {isRfu ? "RFU" : isBd ? "BD" : isWorkshop ? "WS" : "PS"}
                    </span>
                  </div>

                  <div className="my-1.5">
                    <div className="text-xs font-black text-slate-900 tracking-tight">
                      {u.code}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate" title={u.model}>
                      {u.model}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
                    <span className="truncate max-w-22.5" title={u.location}>
                      {u.location}
                    </span>
                    <span className="font-bold text-slate-700">
                      {u.hm.toLocaleString("id-ID")}h
                    </span>
                  </div>

                  {u.issueDescription && (
                    <div className="mt-1 text-[9px] font-semibold text-rose-700 line-clamp-1" title={u.issueDescription}>
                      &bull; {u.issueDescription}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: Ganti Gambar Alat
          ========================================================================= */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                <Camera className="w-5 h-5 text-[#e95623]" />
                <span>Kustomisasi Gambar Kategori Alat Berat</span>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Pilih Kategori Alat Berat
                </label>
                <select
                  value={activeEditingCategory}
                  onChange={(e) => setActiveEditingCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.badge} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Preview */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Pratinjau Saat Ini
                </div>
                <div className="h-28 w-full bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center p-3 relative">
                  {customImages[activeEditingCategory] ? (
                    <img
                      src={customImages[activeEditingCategory]}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-48">
                      <EquipmentIllustration
                        type={
                          DEFAULT_CATEGORIES.find((c) => c.id === activeEditingCategory)?.defaultSvgType || "excavator"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Unggah Gambar dari Komputer (PNG / JPG / WebP)
                </label>
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#e95623] bg-slate-50 hover:bg-orange-50/20 text-slate-600 hover:text-[#e95623] cursor-pointer transition-colors text-xs font-bold">
                  <Upload size={16} />
                  <span>Pilih File Gambar</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, activeEditingCategory)}
                  />
                </label>
              </div>

              {/* Enter Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Atau Masukkan Tautan URL Gambar
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/unit-image.png"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (imageUrlInput.trim()) {
                        handleSaveCustomImage(activeEditingCategory, imageUrlInput.trim());
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#e95623] text-white text-xs font-bold hover:bg-[#d54918] transition-colors cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetImages}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
              >
                <RefreshCw size={13} />
                <span>Reset Semua ke Default</span>
              </button>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
