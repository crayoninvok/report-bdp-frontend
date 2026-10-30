"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { VolvoUnit } from "../services/volvoService";
import { Maximize2 } from "lucide-react";

export interface KnownArea {
  id: string;
  name: string;
  shortName: string;
  category: string;
  center: [number, number];
  zoom: number;
  color: string;
  fillColor: string;
  polygon: [number, number][];
  description: string;
}

// Known Key Mining Operational Areas & Facilities (Senyiur & Muara Pahu)
export const KNOWN_AREAS: KnownArea[] = [
  {
    id: "workshop-muara-pahu",
    name: "Area Workshop Muara Pahu",
    shortName: "Workshop Muara Pahu",
    category: "Workshop & Maintenance Pool",
    center: [0.0221, 116.0295],
    zoom: 17,
    color: "#2563eb",
    fillColor: "#3b82f6",
    polygon: [
      [0.0236, 116.0288],
      [0.0236, 116.0305],
      [0.0224, 116.0308],
      [0.0208, 116.0306],
      [0.0205, 116.0294],
      [0.0207, 116.0282],
      [0.0220, 116.0282],
      [0.0232, 116.0286],
    ],
    description: "Fasilitas Workshop, bengkel perawatan, dan pool parkir armada unit Volvo di Site Muara Pahu.",
  },
  {
    id: "workshop-senyiur",
    name: "Area Workshop Senyiur",
    shortName: "Workshop Senyiur",
    category: "Workshop & Maintenance Pool",
    center: [0.2965, 116.5775],
    zoom: 17,
    color: "#ea580c",
    fillColor: "#f97316",
    polygon: [
      [0.2984, 116.5768],
      [0.2982, 116.5786],
      [0.2970, 116.5794],
      [0.2950, 116.5790],
      [0.2946, 116.5776],
      [0.2952, 116.5762],
      [0.2966, 116.5760],
      [0.2978, 116.5764],
    ],
    description: "Fasilitas Workshop, bengkel perawatan, dan pool parkir armada unit Volvo di Site Senyiur.",
  },
];

// Helper: Check if point [lat, lng] is inside a polygon
export function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

interface VolvoMapProps {
  units: VolvoUnit[];
  selectedUnit: VolvoUnit | null;
  onSelectUnit: (unit: VolvoUnit) => void;
  mapLayer: "satellite" | "streets" | "dark";
  onLayerChange: (layer: "satellite" | "streets" | "dark") => void;
}

export const VolvoMap: React.FC<VolvoMapProps> = ({
  units,
  selectedUnit,
  onSelectUnit,
  mapLayer,
  onLayerChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const areasLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around Kutai Barat / Mahakam Ulu / Muara Pahu mining hauling corridor
      const map = L.map(mapContainerRef.current, {
        center: [0.1401, 116.2968],
        zoom: 10,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Create Layer Group for Geofenced Areas
      const areasGroup = L.layerGroup().addTo(map);
      areasLayerGroupRef.current = areasGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when mapLayer changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    let attribution = "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

    if (mapLayer === "streets") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      attribution = "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";
    } else if (mapLayer === "dark") {
      url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      attribution = "&copy; OpenStreetMap &copy; CARTO";
    }

    tileLayerRef.current = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [mapLayer]);

  // Render & Update Known Areas (Geofences) on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const areasGroup = areasLayerGroupRef.current;
    if (!map || !areasGroup) return;

    areasGroup.clearLayers();

    KNOWN_AREAS.forEach((area) => {
      // Find units currently inside this area
      const insideUnits = units.filter(
        (u) =>
          u.latitude !== null &&
          u.longitude !== null &&
          isPointInPolygon([u.latitude, u.longitude], area.polygon)
      );

      // 1. Draw boundary polygon
      const polygon = L.polygon(area.polygon, {
        color: area.color,
        weight: 2.5,
        dashArray: "6, 6",
        fillColor: area.fillColor,
        fillOpacity: 0.16,
      }).addTo(areasGroup);

      // 2. Area Popup Content
      const popupHtml = `
        <div class="p-3 text-slate-900 font-sans min-w-64" style="font-family: inherit;">
          <div class="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
            <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
              🏭
            </span>
            <div>
              <h3 class="font-black text-sm text-slate-900 leading-tight">${area.name}</h3>
              <p class="text-[10px] text-slate-500">${area.category}</p>
            </div>
          </div>

          <p class="text-xs text-slate-600 mb-2 leading-relaxed">
            ${area.description}
          </p>

          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div class="flex items-center justify-between font-bold">
              <span class="text-slate-600">Unit di Area:</span>
              <span class="px-2 py-0.5 rounded-full font-black text-[11px] bg-slate-900 text-white">
                ${insideUnits.length} Unit
              </span>
            </div>
            ${
              insideUnits.length > 0
                ? `<div class="text-[11px] text-slate-700 font-mono font-medium pt-1 border-t border-slate-200">
                    ${insideUnits.map((u) => u.pmNumber).join(", ")}
                   </div>`
                : `<div class="text-[11px] text-slate-400 italic pt-1">Tidak ada unit di area saat ini</div>`
            }
          </div>

          <div class="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Koordinat Pusat:</span>
            <code class="text-slate-600 font-mono">${area.center[0].toFixed(4)}, ${area.center[1].toFixed(4)}</code>
          </div>
        </div>
      `;

      polygon.bindPopup(popupHtml, { maxWidth: 300 });

      // 3. Floating area title badge on map
      const labelHtml = `
        <div class="cursor-pointer group pointer-events-auto" style="transform: translate(-50%, -50%);">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 backdrop-blur-md text-white border-2 shadow-xl transition-all group-hover:scale-105 group-hover:border-white" style="border-color: ${area.color};">
            <span class="text-xs">🏭</span>
            <span class="font-black text-[11px] tracking-tight whitespace-nowrap">${area.name}</span>
            <span class="px-1.5 py-0.2 rounded-md text-white text-[9px] font-black uppercase font-mono" style="background-color: ${area.color};">
              ${insideUnits.length} Unit
            </span>
          </div>
        </div>
      `;

      const labelIcon = L.divIcon({
        html: labelHtml,
        className: "custom-area-label",
        iconSize: [170, 30],
        iconAnchor: [85, 15],
      });

      const labelMarker = L.marker([area.center[0] + 0.0014, area.center[1]], {
        icon: labelIcon,
      }).addTo(areasGroup);

      labelMarker.bindPopup(popupHtml, { maxWidth: 300 });
    });
  }, [units]);

  // Create custom HTML icon for each unit
  const createUnitIcon = (unit: VolvoUnit, isSelected: boolean) => {
    const isMoving = unit.isMoving;
    const speed = unit.speed;
    const heading = unit.heading || 0;

    // Colors: Moving = Emerald / Green, Idle = Amber / Orange
    const borderColor = isMoving ? "#10b981" : "#f59e0b";
    const bgBadge = isMoving ? "bg-emerald-600" : "bg-amber-600";
    const selectedRing = isSelected ? "ring-4 ring-white shadow-2xl scale-125" : "hover:scale-110";

    const html = `
      <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${selectedRing}" style="transform-origin: center bottom;">
        <!-- Top Label: Unit PM & Speed -->
        <div class="px-1.5 py-0.5 rounded-md ${bgBadge} text-white font-mono font-black text-[9px] shadow-md whitespace-nowrap flex items-center gap-1 border border-white/40 mb-1">
          <span>${unit.pmNumber}</span>
          ${isMoving ? `<span class="opacity-90 font-bold">${speed}km/h</span>` : ""}
        </div>

        <!-- Vehicle Directional Marker -->
        <div class="relative w-7 h-7 rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-lg text-white" style="border-color: ${borderColor};">
          ${
            isMoving
              ? `
              <!-- Heading Arrow -->
              <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${borderColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                </svg>
              </div>
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            `
              : `
              <!-- Stopped/Idle Dot -->
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            `
          }
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "custom-unit-marker",
      iconSize: [60, 50],
      iconAnchor: [30, 48],
      popupAnchor: [0, -48],
    });
  };

  // Build Popup Content HTML for a unit
  const createPopupContent = (unit: VolvoUnit) => {
    const isMoving = unit.isMoving;
    const dateFormatted = unit.positionDateTime
      ? new Date(unit.positionDateTime).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WITA"
      : "Tidak ada timestamp";

    const gmapsUrl =
      unit.latitude && unit.longitude
        ? `https://www.google.com/maps?q=${unit.latitude},${unit.longitude}`
        : "#";

    // Check which workshop area the unit is currently inside
    const currentArea = KNOWN_AREAS.find(
      (area) =>
        unit.latitude !== null &&
        unit.longitude !== null &&
        isPointInPolygon([unit.latitude, unit.longitude], area.polygon)
    );

    return `
      <div class="p-3 text-slate-900 font-sans min-w-56" style="font-family: inherit;">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
          <div>
            <h3 class="font-black text-sm text-slate-900 leading-tight">${unit.pmNumber}</h3>
            <p class="text-[10px] text-slate-500 font-mono">${unit.chassisNumber || unit.vin}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isMoving
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-amber-100 text-amber-800 border border-amber-300"
          }">
            ${isMoving ? "Bergerak" : "Berhenti"}
          </span>
        </div>

        ${
          currentArea
            ? `<div class="mb-2 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-extrabold flex items-center gap-1.5">
                <span>🏭</span>
                <span>Berada di ${currentArea.name}</span>
               </div>`
            : ""
        }

        <div class="space-y-1.5 text-xs">
          <div class="flex items-center justify-between py-0.5">
            <span class="text-slate-500">Kecepatan:</span>
            <strong class="font-mono text-sm ${isMoving ? "text-emerald-700 font-black" : "text-slate-700"}">
              ${unit.speed} km/h
            </strong>
          </div>

          <div class="flex items-center justify-between py-0.5">
            <span class="text-slate-500">Arah (Heading):</span>
            <span class="font-mono font-bold text-slate-800">${unit.heading}&deg;</span>
          </div>

          <div class="flex items-center justify-between py-0.5">
            <span class="text-slate-500">Ketinggian (Altitude):</span>
            <span class="font-mono font-bold text-slate-800">${unit.altitude} m dpl</span>
          </div>

          <div class="flex items-center justify-between py-0.5">
            <span class="text-slate-500">Model Unit:</span>
            <span class="font-bold text-slate-800">${unit.brand} ${unit.model}</span>
          </div>

          <div class="pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
            <div>Koordinat: <code class="text-slate-600 font-mono">${unit.latitude?.toFixed(5)}, ${unit.longitude?.toFixed(5)}</code></div>
            <div class="mt-0.5">Update: <span class="text-slate-600 font-medium">${dateFormatted}</span></div>
          </div>

          <div class="pt-2">
            <a 
              href="${gmapsUrl}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-all shadow-xs"
            >
              <span>Buka di Google Maps</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  };

  // Sync Markers with Units
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const activeVins = new Set<string>();

    units.forEach((unit) => {
      if (unit.latitude === null || unit.longitude === null) return;

      activeVins.add(unit.vin);
      const isSelected = selectedUnit?.vin === unit.vin;
      const icon = createUnitIcon(unit, isSelected);

      if (currentMarkers.has(unit.vin)) {
        // Update existing marker position & icon
        const marker = currentMarkers.get(unit.vin)!;
        marker.setLatLng([unit.latitude, unit.longitude]);
        marker.setIcon(icon);
        marker.setPopupContent(createPopupContent(unit));
      } else {
        // Create new marker
        const marker = L.marker([unit.latitude, unit.longitude], { icon }).addTo(map);
        marker.bindPopup(createPopupContent(unit), {
          className: "custom-leaflet-popup",
          maxWidth: 280,
        });

        marker.on("click", () => {
          onSelectUnit(unit);
        });

        currentMarkers.set(unit.vin, marker);
      }
    });

    // Remove markers that are no longer present
    currentMarkers.forEach((marker, vin) => {
      if (!activeVins.has(vin)) {
        map.removeLayer(marker);
        currentMarkers.delete(vin);
      }
    });
  }, [units, selectedUnit]);

  // Fly to selected unit if selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedUnit) return;

    if (selectedUnit.latitude && selectedUnit.longitude) {
      map.flyTo([selectedUnit.latitude, selectedUnit.longitude], 16, {
        duration: 1.2,
      });

      const marker = markersRef.current.get(selectedUnit.vin);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedUnit]);

  // Fit bounds to all units helper
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const coords: [number, number][] = units
      .filter((u) => u.latitude !== null && u.longitude !== null)
      .map((u) => [u.latitude!, u.longitude!]);

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Fly to a specific Known Area (Workshop Senyiur or Muara Pahu)
  const handleFlyToArea = (area: KnownArea) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(area.center, area.zoom, {
      duration: 1.5,
    });
  };

  // Count units in each workshop area
  const getAreaUnitsCount = (area: KnownArea) => {
    return units.filter(
      (u) =>
        u.latitude !== null &&
        u.longitude !== null &&
        isPointInPolygon([u.latitude, u.longitude], area.polygon)
    ).length;
  };

  return (
    <div className="relative w-full h-full min-h-125 rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 min-h-125" />

      {/* Floating Map Controls Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        {/* Layer Switcher */}
        <div className="flex items-center p-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80">
          <button
            onClick={() => onLayerChange("satellite")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapLayer === "satellite"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🛰️ Satelit</span>
          </button>
          <button
            onClick={() => onLayerChange("streets")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapLayer === "streets"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🗺️ Jalan</span>
          </button>
          <button
            onClick={() => onLayerChange("dark")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapLayer === "dark"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🌙 Dark</span>
          </button>
        </div>

        {/* Quick Fly Buttons for Workshops */}
        {KNOWN_AREAS.map((area) => {
          const count = getAreaUnitsCount(area);
          return (
            <button
              key={area.id}
              onClick={() => handleFlyToArea(area)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 text-xs font-extrabold hover:bg-slate-50 transition-all shadow-md cursor-pointer border border-slate-200"
              title={`Fokus ke ${area.name}`}
            >
              <span>🏭 {area.shortName}</span>
              <span
                className="px-1.5 py-0.2 rounded-md text-white font-mono text-[10px] font-black"
                style={{ backgroundColor: area.color }}
              >
                {count} Unit
              </span>
            </button>
          );
        })}

        {/* Fit All Units Button */}
        <button
          onClick={handleFitAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 text-slate-800 text-xs font-extrabold hover:bg-slate-50 transition-all shadow-md cursor-pointer"
          title="Zoom ke seluruh armada unit"
        >
          <Maximize2 size={13} className="text-[#e95623]" />
          <span>Lihat Semua ({units.length})</span>
        </button>
      </div>

      {/* Map Legend Overlay at Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-lg border border-slate-800 text-[11px] space-y-1.5 max-w-xs pointer-events-none">
        <span className="font-extrabold block text-slate-300 uppercase tracking-wider text-[10px]">
          Status Armada Real-time
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Bergerak (&gt;1.5 km/h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="font-bold">Berhenti / Parkir</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolvoMap;
