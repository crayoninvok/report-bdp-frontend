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
  emoji?: string;
  center: [number, number];
  zoom: number;
  color: string;
  fillColor: string;
  polygon?: [number, number][];
  radiusMeters?: number;
  description: string;
}

// Known Key Mining Operational Areas, Workshops & Jetty Facilities (Senyiur & Muara Pahu)
export const KNOWN_AREAS: KnownArea[] = [
  {
    id: "workshop-muara-pahu",
    name: "Area Workshop Muara Pahu",
    shortName: "Workshop Muara Pahu",
    category: "Workshop & Maintenance Pool",
    emoji: "🏭",
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
    emoji: "🏭",
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
  {
    id: "jetty-muara-pahu",
    name: "Area Jetty Muara Pahu",
    shortName: "Jetty Muara Pahu",
    category: "Jetty & Loading Terminal (Radius 3 km)",
    emoji: "⚓",
    // 0°14'36.5"S = -0.2434722, 116°01'09.6"E = 116.0193333
    center: [-0.2434722, 116.0193333],
    zoom: 13,
    color: "#0d9488",
    fillColor: "#14b8a6",
    radiusMeters: 3000,
    description:
      "Geofence Area Jetty Muara Pahu radius 3 km dari titik pusat 0°14'36.5\"S 116°01'09.6\"E.",
  },
  {
    id: "jetty-senyiur",
    name: "Area Jetty Senyiur",
    shortName: "Jetty Senyiur",
    category: "Jetty & Loading Terminal (Radius 3 km)",
    emoji: "⚓",
    center: [0.295934, 116.620546],
    zoom: 13,
    color: "#7c3aed",
    fillColor: "#8b5cf6",
    radiusMeters: 3000,
    description:
      "Geofence Area Jetty Senyiur radius 3 km dari titik pusat 0.295934, 116.620546.",
  },
  {
    id: "fajar-sakti-prima",
    name: "Area Fajar Sakti Prima",
    shortName: "Fajar Sakti Prima",
    category: "Mining Concession / Pit Area",
    emoji: "⛏️",
    center: [0.5363334, 116.1093473],
    zoom: 13,
    color: "#dc2626",
    fillColor: "#ef4444",
    polygon: [
      [0.5703889, 116.0954444],
      [0.5703889, 116.1330556],
      [0.5022778, 116.1330556],
      [0.5022778, 116.0856389],
      [0.5471667, 116.0856389],
      [0.5471667, 116.0906111],
      [0.5575833, 116.0906111],
      [0.5575833, 116.0954444],
    ],
    description:
      "Geofence polygon Area Fajar Sakti Prima (FSP) dari batas konsesi KML.",
  },
  {
    id: "tanur-jaya",
    name: "Area Tanur Jaya",
    shortName: "Tanur Jaya",
    category: "Mining Concession / Pit Area",
    emoji: "⛏️",
    center: [0.4834459, 116.2017973],
    zoom: 12,
    color: "#db2777",
    fillColor: "#ec4899",
    polygon: [
      [0.4500011, 116.2241917],
      [0.4500011, 116.1985278],
      [0.4335917, 116.1985278],
      [0.4335917, 116.1794028],
      [0.5333, 116.1794028],
      [0.5333, 116.2241917],
    ],
    description:
      "Geofence polygon Area PT Tanur Jaya dari batas konsesi KML.",
  },
  {
    id: "tiwa-abadi",
    name: "Area Tiwa Abadi",
    shortName: "Tiwa Abadi",
    category: "Mining Concession / Pit Area",
    emoji: "⛏️",
    center: [0.4834459, 116.1563625],
    zoom: 12,
    color: "#ca8a04",
    fillColor: "#eab308",
    polygon: [
      [0.4500111, 116.1333222],
      [0.5333, 116.1333222],
      [0.5333, 116.1794028],
      [0.4335917, 116.1794028],
      [0.4335917, 116.1658],
      [0.4500111, 116.1658],
    ],
    description:
      "Geofence polygon Area PT Tiwa Abadi dari batas konsesi KML.",
  },
  {
    id: "bara-tabang",
    name: "Area Bara Tabang",
    shortName: "Bara Tabang",
    category: "Mining Concession / Pit Area",
    emoji: "⛏️",
    center: [0.5528915, 116.172917],
    zoom: 13,
    color: "#0284c7",
    fillColor: "#0ea5e9",
    polygon: [
      [0.533333, 116.133056],
      [0.57245, 116.133056],
      [0.57245, 116.155433],
      [0.5606, 116.155433],
      [0.5606, 116.212778],
      [0.533333, 116.212778],
    ],
    description:
      "Geofence polygon Area PT Bara Tabang dari batas konsesi KML.",
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

/** Computes Haversine distance in meters between two [lat, lng] points. */
export function haversineDistanceMeters(
  a: [number, number],
  b: [number, number]
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Checks whether a unit coordinate falls within either a circular radius or polygon geofence. */
export function isPointInKnownArea(
  point: [number, number],
  area: KnownArea
): boolean {
  if (area.radiusMeters != null) {
    return haversineDistanceMeters(point, area.center) <= area.radiusMeters;
  }
  if (area.polygon && area.polygon.length > 0) {
    return isPointInPolygon(point, area.polygon);
  }
  return false;
}

interface VolvoMapProps {
  units: VolvoUnit[];
  selectedUnit: VolvoUnit | null;
  focusRequestId?: number;
  onSelectUnit: (unit: VolvoUnit) => void;
  mapLayer: "satellite" | "streets" | "dark";
  onLayerChange: (layer: "satellite" | "streets" | "dark") => void;
}

export const VolvoMap: React.FC<VolvoMapProps> = ({
  units,
  selectedUnit,
  focusRequestId = 0,
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
          isPointInKnownArea([u.latitude, u.longitude], area)
      );

      const emoji = area.emoji || "🏭";

      // 1. Draw boundary shape (circle radius or polygon)
      const boundaryLayer =
        area.radiusMeters != null
          ? L.circle(area.center, {
              radius: area.radiusMeters,
              color: area.color,
              weight: 2.5,
              dashArray: "6, 6",
              fillColor: area.fillColor,
              fillOpacity: 0.14,
            }).addTo(areasGroup)
          : area.polygon
          ? L.polygon(area.polygon, {
              color: area.color,
              weight: 2.5,
              dashArray: "6, 6",
              fillColor: area.fillColor,
              fillOpacity: 0.16,
            }).addTo(areasGroup)
          : null;

      // 2. Area Popup Content
      const popupHtml = `
        <div class="p-3 text-slate-900 font-sans min-w-64" style="font-family: inherit;">
          <div class="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
            <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
              ${emoji}
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
            <span>Koordinat Pusat${area.radiusMeters ? ` (r = ${(area.radiusMeters / 1000).toFixed(1)} km)` : ""}:</span>
            <code class="text-slate-600 font-mono">${area.center[0].toFixed(4)}, ${area.center[1].toFixed(4)}</code>
          </div>
        </div>
      `;

      if (boundaryLayer) {
        boundaryLayer.bindPopup(popupHtml, { maxWidth: 300 });
      }

      // 3. Floating area title badge on map
      const labelHtml = `
        <div class="cursor-pointer group pointer-events-auto" style="transform: translate(-50%, -50%);">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 backdrop-blur-md text-white border-2 shadow-xl transition-all group-hover:scale-105 group-hover:border-white" style="border-color: ${area.color};">
            <span class="text-xs">${emoji}</span>
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

      const labelPos: [number, number] =
        area.radiusMeters != null
          ? area.center
          : [area.center[0] + 0.0014, area.center[1]];

      const labelMarker = L.marker(labelPos, {
        icon: labelIcon,
      }).addTo(areasGroup);

      labelMarker.bindPopup(popupHtml, { maxWidth: 300 });
    });
  }, [units]);

  const prevSelectedVinRef = useRef<string | null>(null);
  const prevFocusRequestIdRef = useRef<number>(0);
  const selectedUnitRef = useRef<VolvoUnit | null>(selectedUnit);
  selectedUnitRef.current = selectedUnit;
  const onSelectUnitRef = useRef(onSelectUnit);
  onSelectUnitRef.current = onSelectUnit;
  const selectedVin = selectedUnit?.vin ?? null;

  // Create custom HTML icon for each unit (stable geometry to prevent jitter)
  const createUnitIcon = (unit: VolvoUnit) => {
    const isMoving = unit.isMoving;
    const speed = unit.speed;
    const heading = unit.heading || 0;

    // Colors: Moving = Emerald / Green, Idle = Amber / Orange
    const borderColor = isMoving ? "#10b981" : "#f59e0b";
    const bgBadge = isMoving ? "bg-emerald-600" : "bg-amber-600";

    const html = `
      <div class="unit-marker-container relative flex flex-col items-center cursor-pointer select-none">
        <!-- Top Label: Unit PM & Speed -->
        <div class="unit-marker-badge px-1.5 py-0.5 rounded-md ${bgBadge} text-white font-mono font-black text-[9px] shadow-md whitespace-nowrap flex items-center gap-1 border border-white/40 mb-1 transition-colors">
          <span>${unit.pmNumber}</span>
          ${isMoving ? `<span class="opacity-90 font-bold">${speed}km/h</span>` : ""}
        </div>

        <!-- Vehicle Directional Marker -->
        <div class="unit-marker-pin relative w-7 h-7 rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-md text-white transition-colors" style="border-color: ${borderColor};">
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
      className: "custom-unit-marker border-0 bg-transparent",
      iconSize: [64, 52],
      iconAnchor: [32, 50],
      popupAnchor: [0, -50],
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

    // Check which geofence area the unit is currently inside
    const currentArea = KNOWN_AREAS.find(
      (area) =>
        unit.latitude !== null &&
        unit.longitude !== null &&
        isPointInKnownArea([unit.latitude, unit.longitude], area)
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
                <span>${currentArea.emoji || "🏭"}</span>
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

  // Sync Markers with Units data (independent of selection state to prevent re-rendering loops)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const activeVins = new Set<string>();

    units.forEach((unit) => {
      if (unit.latitude === null || unit.longitude === null) return;

      activeVins.add(unit.vin);

      if (currentMarkers.has(unit.vin)) {
        // Update existing marker position & popup content smoothly without recreating DOM
        const marker = currentMarkers.get(unit.vin)!;
        (marker as any)._unitData = unit;

        const prevLatLng = marker.getLatLng();
        if (prevLatLng.lat !== unit.latitude || prevLatLng.lng !== unit.longitude) {
          marker.setLatLng([unit.latitude, unit.longitude]);
        }

        const currentVisualKey = `${unit.isMoving}-${unit.speed}-${unit.heading}`;
        const currentPopupKey = `${currentVisualKey}-${unit.latitude}-${unit.longitude}-${unit.positionDateTime || ""}`;
        if ((marker as any)._popupKey !== currentPopupKey) {
          marker.setPopupContent(createPopupContent(unit));
          (marker as any)._popupKey = currentPopupKey;
        }

        // Only update icon if movement/heading state actually changed
        const prevVisual = (marker as any)._visualKey;
        if (prevVisual !== currentVisualKey) {
          marker.setIcon(createUnitIcon(unit));
          (marker as any)._visualKey = currentVisualKey;

          // Re-apply selection state if this unit is currently selected
          if (selectedUnitRef.current?.vin === unit.vin) {
            marker.setZIndexOffset(1000);
            marker.getElement()?.classList.add("is-unit-selected");
          }
        }
      } else {
        // Create new marker with stable geometry
        const icon = createUnitIcon(unit);
        const marker = L.marker([unit.latitude, unit.longitude], { icon }).addTo(map);
        const currentVisualKey = `${unit.isMoving}-${unit.speed}-${unit.heading}`;
        (marker as any)._unitData = unit;
        (marker as any)._visualKey = currentVisualKey;
        (marker as any)._popupKey = `${currentVisualKey}-${unit.latitude}-${unit.longitude}-${unit.positionDateTime || ""}`;

        marker.bindPopup(createPopupContent(unit), {
          className: "custom-leaflet-popup",
          maxWidth: 290,
          autoPan: false,
        });

        // Click handler on map marker: notify parent cleanly without triggering flyTo
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          const latestUnit: VolvoUnit = (marker as any)._unitData || unit;
          onSelectUnitRef.current(latestUnit);
        });

        if (selectedUnitRef.current?.vin === unit.vin) {
          marker.setZIndexOffset(1000);
          marker.getElement()?.classList.add("is-unit-selected");
        }

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
  }, [units]);

  // Handle Selected Unit changes (Highlighting & camera only on explicit sidebar selection, never on refresh)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const shouldFlyToUnit = focusRequestId > prevFocusRequestIdRef.current;
    prevFocusRequestIdRef.current = focusRequestId;

    const prevVin = prevSelectedVinRef.current;
    const currentVin = selectedVin;
    const activeUnit = selectedUnitRef.current;

    // 1. Remove highlight & reset z-index on previously selected marker
    if (prevVin && prevVin !== currentVin) {
      const prevMarker = markersRef.current.get(prevVin);
      if (prevMarker) {
        prevMarker.setZIndexOffset(0);
        prevMarker.getElement()?.classList.remove("is-unit-selected");
      }
    }

    // 2. Add highlight & elevate z-index on newly selected marker
    if (currentVin) {
      const currentMarker = markersRef.current.get(currentVin);
      if (currentMarker) {
        currentMarker.setZIndexOffset(1000);
        currentMarker.getElement()?.classList.add("is-unit-selected");
      }
    }

    prevSelectedVinRef.current = currentVin;

    // 3. Handle camera & popup: ONLY fly when user clicked a unit from the sidebar list
    if (
      !shouldFlyToUnit ||
      !activeUnit ||
      activeUnit.latitude === null ||
      activeUnit.longitude === null
    ) {
      return;
    }

    const currentMarker = markersRef.current.get(activeUnit.vin);
    const targetZoom = Math.max(map.getZoom(), 16);

    const onFlyComplete = () => {
      map.off("zoomstart", cancelPendingPopup);
      map.off("dragstart", cancelPendingPopup);
      if (currentMarker && !currentMarker.isPopupOpen()) {
        currentMarker.openPopup();
      }
    };

    const cancelPendingPopup = () => {
      map.off("moveend", onFlyComplete);
      map.off("zoomstart", cancelPendingPopup);
      map.off("dragstart", cancelPendingPopup);
    };

    map.stop();
    map.once("moveend", onFlyComplete);
    map.once("zoomstart", cancelPendingPopup);
    map.once("dragstart", cancelPendingPopup);
    map.flyTo([activeUnit.latitude, activeUnit.longitude], targetZoom, {
      duration: 0.6,
    });

    return () => {
      cancelPendingPopup();
    };
  }, [selectedVin, focusRequestId]);

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

  // Count units in each geofence area
  const getAreaUnitsCount = (area: KnownArea) => {
    return units.filter(
      (u) =>
        u.latitude !== null &&
        u.longitude !== null &&
        isPointInKnownArea([u.latitude, u.longitude], area)
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

        {/* Quick Fly Buttons for Known Areas */}
        {KNOWN_AREAS.map((area) => {
          const count = getAreaUnitsCount(area);
          return (
            <button
              key={area.id}
              onClick={() => handleFlyToArea(area)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md text-slate-800 text-xs font-extrabold hover:bg-slate-50 transition-all shadow-md cursor-pointer border border-slate-200"
              title={`Fokus ke ${area.name}`}
            >
              <span>{area.emoji || "🏭"} {area.shortName}</span>
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
