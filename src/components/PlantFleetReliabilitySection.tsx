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

// Initial 10 Equipment Categories matching the design
const DEFAULT_CATEGORIES: EquipmentCategory[] = [
  {
    id: "prime-mover",
    badge: "EXC",
    title: "Prime Mover",
    availabilityPct: 71,
    rfuCount: 5,
    breakdownCount: 2,
    totalUnits: 7,
    mtbf: "12,9h",
    mttr: "8,6h",
    ua: "20,9%",
    defaultSvgType: "excavator",
  },
  {
    id: "dump-truck",
    badge: "MAN",
    title: "Dump Truck",
    availabilityPct: 100,
    rfuCount: 5,
    breakdownCount: 0,
    totalUnits: 5,
    mtbf: "12,9h",
    mttr: "8,6h",
    ua: "20,9%",
    defaultSvgType: "dump-truck",
  },
  {
    id: "generator-set",
    badge: "HINO",
    title: "Generator Set",
    availabilityPct: 83,
    rfuCount: 5,
    breakdownCount: 1,
    totalUnits: 6,
    mtbf: "12,9h",
    mttr: "8,6h",
    ua: "20,9%",
    defaultSvgType: "genset",
  },
  {
    id: "support-truck",
    badge: "DF",
    title: "Support Truck",
    availabilityPct: 100,
    rfuCount: 5,
    breakdownCount: 0,
    totalUnits: 5,
    mtbf: "12,9h",
    mttr: "8,6h",
    ua: "20,9%",
    defaultSvgType: "support-truck",
  },
  {
    id: "air-compressor",
    badge: "SITRAK",
    title: "Air Compressor",
    availabilityPct: 90,
    rfuCount: 17,
    breakdownCount: 2,
    totalUnits: 19,
    mtbf: "12,9h",
    mttr: "8,6h",
    ua: "20,9%",
    defaultSvgType: "compressor",
  },
  {
    id: "excavator",
    badge: "CAT",
    title: "Excavator",
    availabilityPct: 88,
    rfuCount: 7,
    breakdownCount: 1,
    totalUnits: 8,
    mtbf: "14,2h",
    mttr: "6,5h",
    ua: "24,5%",
    defaultSvgType: "excavator",
  },
  {
    id: "fuel-truck",
    badge: "HINO",
    title: "Fuel Truck",
    availabilityPct: 100,
    rfuCount: 4,
    breakdownCount: 0,
    totalUnits: 4,
    mtbf: "18,5h",
    mttr: "4,2h",
    ua: "18,0%",
    defaultSvgType: "fuel-truck",
  },
  {
    id: "water-truck",
    badge: "MITSUBISHI",
    title: "Water Truck",
    availabilityPct: 75,
    rfuCount: 3,
    breakdownCount: 1,
    totalUnits: 4,
    mtbf: "11,8h",
    mttr: "9,0h",
    ua: "22,1%",
    defaultSvgType: "water-truck",
  },
  {
    id: "dozer",
    badge: "KOMATSU",
    title: "Dozer",
    availabilityPct: 80,
    rfuCount: 4,
    breakdownCount: 1,
    totalUnits: 5,
    mtbf: "15,0h",
    mttr: "7,8h",
    ua: "26,0%",
    defaultSvgType: "dozer",
  },
  {
    id: "light-vehicle",
    badge: "TOYOTA",
    title: "Light Vehicle",
    availabilityPct: 95,
    rfuCount: 19,
    breakdownCount: 1,
    totalUnits: 20,
    mtbf: "22,0h",
    mttr: "3,5h",
    ua: "15,4%",
    defaultSvgType: "light-vehicle",
  },
];

// Sample Papan Catur units dataset
const MOCK_CHESSBOARD_UNITS: ChessboardUnit[] = [
  // Prime Mover
  { id: "u-pm-01", code: "BDP-PM-01", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "RFU", location: "Hauling Road Km 12", hm: 14210 },
  { id: "u-pm-02", code: "BDP-PM-02", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "RFU", location: "Port Senyiur", hm: 13850 },
  { id: "u-pm-03", code: "BDP-PM-03", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "RFU", location: "Pit Muara Pahu", hm: 15120 },
  { id: "u-pm-04", code: "BDP-PM-04", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "RFU", location: "Hauling Road Km 28", hm: 12940 },
  { id: "u-pm-05", code: "BDP-PM-05", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "RFU", location: "Stockpile", hm: 14600 },
  { id: "u-pm-06", code: "BDP-PM-06", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "IN_WORKSHOP", location: "Workshop Central MPH", hm: 16200, issueDescription: "Ganti Selang Hidrolik Steering" },
  { id: "u-pm-07", code: "BDP-PM-07", categoryId: "prime-mover", categoryName: "Prime Mover", model: "Volvo FMX 440", status: "BREAKDOWN", location: "Km 18 Outbound", hm: 11850, issueDescription: "Trouble Transmisi Low Gear" },

  // Dump Truck
  { id: "u-dt-01", code: "BDP-DT-01", categoryId: "dump-truck", categoryName: "Dump Truck", model: "MAN TGS 40.400", status: "RFU", location: "Hauling Km 05", hm: 9800 },
  { id: "u-dt-02", code: "BDP-DT-02", categoryId: "dump-truck", categoryName: "Dump Truck", model: "MAN TGS 40.400", status: "RFU", location: "Pit Loading Point", hm: 9450 },
  { id: "u-dt-03", code: "BDP-DT-03", categoryId: "dump-truck", categoryName: "Dump Truck", model: "MAN TGS 40.400", status: "RFU", location: "Hauling Road Km 22", hm: 8900 },
  { id: "u-dt-04", code: "BDP-DT-04", categoryId: "dump-truck", categoryName: "Dump Truck", model: "MAN TGS 40.400", status: "RFU", location: "Disposal Area", hm: 10200 },
  { id: "u-dt-05", code: "BDP-DT-05", categoryId: "dump-truck", categoryName: "Dump Truck", model: "MAN TGS 40.400", status: "RFU", location: "Port Senyiur", hm: 9150 },

  // Generator Set
  { id: "u-gs-01", code: "BDP-GS-01", categoryId: "generator-set", categoryName: "Generator Set", model: "Hino 500 / Denyo 150kVA", status: "RFU", location: "Workshop MPH", hm: 6720 },
  { id: "u-gs-02", code: "BDP-GS-02", categoryId: "generator-set", categoryName: "Generator Set", model: "Hino 500 / Denyo 150kVA", status: "RFU", location: "Camp Office", hm: 5890 },
  { id: "u-gs-03", code: "BDP-GS-03", categoryId: "generator-set", categoryName: "Generator Set", model: "Hino 500 / Denyo 150kVA", status: "RFU", location: "Port Jetty", hm: 7120 },
  { id: "u-gs-04", code: "BDP-GS-04", categoryId: "generator-set", categoryName: "Generator Set", model: "Hino 500 / Denyo 150kVA", status: "RFU", location: "Pit Sump Pump", hm: 6450 },
  { id: "u-gs-05", code: "BDP-GS-05", categoryId: "generator-set", categoryName: "Generator Set", model: "Hino 500 / Denyo 150kVA", status: "RFU", location: "Fuel Station", hm: 5200 },
  { id: "u-gs-06", code: "BDP-GS-06", categoryId: "generator-set", categoryName: "Generator Set", model: "Hino 500 / Denyo 150kVA", status: "IN_WORKSHOP", location: "Workshop Central", hm: 7800, issueDescription: "Overhaul Alternator" },

  // Support Truck
  { id: "u-st-01", code: "BDP-ST-01", categoryId: "support-truck", categoryName: "Support Truck", model: "Dongfeng Lube Truck", status: "RFU", location: "Pit Service Bay", hm: 4320 },
  { id: "u-st-02", code: "BDP-ST-02", categoryId: "support-truck", categoryName: "Support Truck", model: "Dongfeng Service Crane", status: "RFU", location: "Hauling Road", hm: 3950 },
  { id: "u-st-03", code: "BDP-ST-03", categoryId: "support-truck", categoryName: "Support Truck", model: "Dongfeng Tyre Truck", status: "RFU", location: "Tyre Shop MPH", hm: 4120 },
  { id: "u-st-04", code: "BDP-ST-04", categoryId: "support-truck", categoryName: "Support Truck", model: "Dongfeng Mobile Crane", status: "RFU", location: "Workshop Yard", hm: 3780 },
  { id: "u-st-05", code: "BDP-ST-05", categoryId: "support-truck", categoryName: "Support Truck", model: "Dongfeng Storing Unit", status: "RFU", location: "Port Area", hm: 4400 },

  // Air Compressor
  { id: "u-ac-01", code: "BDP-AC-01", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Sitrak Airman PDS655", status: "RFU", location: "Pit Drilling Bench", hm: 8100 },
  { id: "u-ac-02", code: "BDP-AC-02", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Sitrak Airman PDS655", status: "RFU", location: "Tyre Shop MPH", hm: 7650 },
  { id: "u-ac-03", code: "BDP-AC-03", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Sitrak Airman PDS655", status: "BREAKDOWN", location: "Workshop Yard", hm: 9400, issueDescription: "Air Filter Clogged & Overheat" },
  { id: "u-ac-04", code: "BDP-AC-04", categoryId: "air-compressor", categoryName: "Air Compressor", model: "Sitrak Airman PDS655", status: "IN_WORKSHOP", location: "Workshop Central", hm: 8850, issueDescription: "Ganti Unloader Valve" },

  // Excavator
  { id: "u-ex-01", code: "BDP-EX-01", categoryId: "excavator", categoryName: "Excavator", model: "CAT 336D2 L", status: "RFU", location: "Pit Loading Bench A", hm: 11450 },
  { id: "u-ex-02", code: "BDP-EX-02", categoryId: "excavator", categoryName: "Excavator", model: "CAT 336D2 L", status: "RFU", location: "Stockpile Loading", hm: 10980 },
  { id: "u-ex-03", code: "BDP-EX-03", categoryId: "excavator", categoryName: "Excavator", model: "CAT 320D", status: "BREAKDOWN", location: "Pit Disposal", hm: 12400, issueDescription: "Bocor O-Ring Boom Cylinder" },

  // Fuel Truck
  { id: "u-ft-01", code: "BDP-FT-01", categoryId: "fuel-truck", categoryName: "Fuel Truck", model: "Hino 500 10KL", status: "RFU", location: "Pit Mobile Dispenser", hm: 5800 },
  { id: "u-ft-02", code: "BDP-FT-02", categoryId: "fuel-truck", categoryName: "Fuel Truck", model: "Hino 500 10KL", status: "RFU", location: "Fuel Storage MPH", hm: 6100 },

  // Water Truck
  { id: "u-wt-01", code: "BDP-WT-01", categoryId: "water-truck", categoryName: "Water Truck", model: "Fuso Fighter 20KL", status: "RFU", location: "Hauling Road Km 10", hm: 7200 },
  { id: "u-wt-02", code: "BDP-WT-02", categoryId: "water-truck", categoryName: "Water Truck", model: "Fuso Fighter 20KL", status: "IN_WORKSHOP", location: "Workshop Yard", hm: 8350, issueDescription: "Pompa Water Cannon Macet" },

  // Dozer
  { id: "u-dz-01", code: "BDP-DZ-01", categoryId: "dozer", categoryName: "Dozer", model: "Komatsu D85ESS-2", status: "RFU", location: "Disposal Muara Pahu", hm: 13900 },
  { id: "u-dz-02", code: "BDP-DZ-02", categoryId: "dozer", categoryName: "Dozer", model: "Komatsu D85ESS-2", status: "BREAKDOWN", location: "Pit Bench 2", hm: 14750, issueDescription: "Track Shoe Baut Lepas" },

  // Light Vehicle
  { id: "u-lv-01", code: "BDP-LV-01", categoryId: "light-vehicle", categoryName: "Light Vehicle", model: "Toyota Hilux 4x4", status: "RFU", location: "Camp / Office", hm: 3200 },
  { id: "u-lv-02", code: "BDP-LV-02", categoryId: "light-vehicle", categoryName: "Light Vehicle", model: "Toyota Hilux 4x4", status: "RFU", location: "Pit Patrol Safety", hm: 3850 },
  { id: "u-lv-03", code: "BDP-LV-03", categoryId: "light-vehicle", categoryName: "Light Vehicle", model: "Toyota Hilux 4x4", status: "IN_WORKSHOP", location: "Workshop LV", hm: 4100, issueDescription: "Ganti Kampas Rem Depan" },
];

// Clean Vector Equipment Illustrations
function EquipmentIllustration({ type }: { type: string }) {
  if (type === "excavator") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        {/* Ground shadow */}
        <ellipse cx="80" cy="74" rx="65" ry="3.5" fill="#e2e8f0" />
        {/* Caterpillar Tracks */}
        <rect x="35" y="58" width="80" height="15" rx="7.5" fill="#1e293b" />
        <rect x="40" y="61" width="70" height="9" rx="4.5" fill="#334155" />
        <circle cx="48" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="62" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="75" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="88" cy="65.5" r="3.5" fill="#0f172a" />
        <circle cx="102" cy="65.5" r="3.5" fill="#0f172a" />
        {/* Revolving Turntable */}
        <rect x="52" y="54" width="46" height="5" rx="1.5" fill="#475569" />
        {/* Cab Body */}
        <path d="M48 40 L50 54 L92 54 L94 40 L88 34 L54 34 Z" fill="#f59e0b" />
        {/* Operator Cabin */}
        <path d="M72 32 L72 54 L92 54 L94 40 L88 32 Z" fill="#fcd34d" />
        <path d="M75 35 L86 35 L89 44 L75 44 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
        {/* Boom & Arm */}
        <path d="M56 46 L82 18 L108 28 L126 50" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="82" cy="18" r="4" fill="#1e293b" />
        <circle cx="108" cy="28" r="3.5" fill="#1e293b" />
        {/* Hydraulic Cylinders */}
        <line x1="62" y1="46" x2="88" y2="28" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="88" y1="28" x2="100" y2="22" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        {/* Bucket */}
        <path d="M124 49 L134 58 L126 67 L116 63 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
        <path d="M134 58 L137 62" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    );
  }

  // Dump Truck (Heavy Hauler)
  if (type === "dump-truck") {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
        <ellipse cx="80" cy="74" rx="65" ry="3.5" fill="#e2e8f0" />
        {/* Chassis */}
        <rect x="30" y="52" width="98" height="7" rx="2" fill="#334155" />
        {/* Tipper Body */}
        <path d="M30 25 L100 25 L103 51 L28 51 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="45" y1="25" x2="44" y2="51" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="65" y1="25" x2="64" y2="51" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="85" y1="25" x2="84" y2="51" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Cabin */}
        <path d="M104 30 L124 30 L130 42 L130 54 L104 54 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Windshield */}
        <path d="M116 33 L122 33 L126 42 L116 42 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
        {/* Side Stripe */}
        <rect x="105" y="47" width="24" height="3" fill="#e95623" />
        {/* Wheels */}
        <circle cx="45" cy="62" r="10" fill="#0f172a" />
        <circle cx="45" cy="62" r="5" fill="#64748b" />
        <circle cx="68" cy="62" r="10" fill="#0f172a" />
        <circle cx="68" cy="62" r="5" fill="#64748b" />
        <circle cx="118" cy="62" r="10" fill="#0f172a" />
        <circle cx="118" cy="62" r="5" fill="#64748b" />
      </svg>
    );
  }

  // Support / Service / Utility Truck
  return (
    <svg viewBox="0 0 160 80" className="w-full h-full object-contain drop-shadow-xs" fill="none">
      <ellipse cx="80" cy="74" rx="65" ry="3.5" fill="#e2e8f0" />
      {/* Chassis */}
      <rect x="28" y="52" width="102" height="7" rx="2" fill="#334155" />
      {/* Box / Tank Body */}
      <rect x="28" y="27" width="74" height="25" rx="3" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Utility Stripes / Decals */}
      <rect x="29" y="38" width="72" height="4" fill="#0284c7" />
      <rect x="42" y="30" width="18" height="6" rx="1" fill="#cbd5e1" />
      <rect x="70" y="30" width="20" height="6" rx="1" fill="#cbd5e1" />
      {/* Cabin */}
      <path d="M104 31 L124 31 L129 42 L129 54 L104 54 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Windshield */}
      <path d="M116 34 L122 34 L126 42 L116 42 Z" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1" />
      <rect x="105" y="47" width="23" height="3" fill="#10b981" />
      {/* Wheels */}
      <circle cx="46" cy="62" r="9.5" fill="#0f172a" />
      <circle cx="46" cy="62" r="4.5" fill="#64748b" />
      <circle cx="68" cy="62" r="9.5" fill="#0f172a" />
      <circle cx="68" cy="62" r="4.5" fill="#64748b" />
      <circle cx="116" cy="62" r="9.5" fill="#0f172a" />
      <circle cx="116" cy="62" r="4.5" fill="#64748b" />
    </svg>
  );
}

// Circular Percentage Gauge
function CircularGauge({ pct }: { pct: number }) {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  let strokeColor = "#10b981"; // green
  if (pct < 75) strokeColor = "#f59e0b"; // amber
  else if (pct < 85) strokeColor = "#eab308"; // gold
  else if (pct < 95) strokeColor = "#059669"; // teal green

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
      </svg>
      <span className="absolute text-[11px] font-black text-slate-800 tracking-tight">
        {pct}%
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
    return MOCK_CHESSBOARD_UNITS.filter((u) => {
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
              Target 85%
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              80.57%
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-flex items-center">
              Needs Focus
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">
              MOHH: 31,104h
            </span>
            <span className="font-bold text-rose-600">
              BD: 6,042.3h
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
              Target 88%
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              46.38%
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Operating Fleet
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400">
              Operating: 5,226.4h
            </span>
            <span className="font-bold text-slate-600">
              UA: 20.9%
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
              81.5% Ready
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              44 RFU
            </span>
            <span className="text-xs font-bold text-slate-500">
              / 54 Units
            </span>
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
              12.9 <span className="text-sm font-semibold text-slate-500">Hrs</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Target &gt; 20h
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
              12.9 <span className="text-sm font-semibold text-slate-500">Hrs</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Target &gt; 20h
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
              8.6 <span className="text-sm font-semibold text-slate-500">Hrs</span>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Target &lt; 4h
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
              Target 10%
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              10
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Action Req.
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="text-3xl font-black text-rose-600 tracking-tight">
              12 <span className="text-sm font-bold text-rose-600">%</span>
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
          {DEFAULT_CATEGORIES.map((cat) => {
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
                    </div>
                  </div>

                  <CircularGauge pct={cat.availabilityPct} />
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
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
              />
            </div>
          </div>
        </div>

        {/* Units Chess Grid */}
        {filteredChessboardUnits.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Tidak ada unit yang cocok dengan filter atau kata kunci pencarian.
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
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e95623]"
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
