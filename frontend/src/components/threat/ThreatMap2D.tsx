import React, { useEffect, useRef, useCallback } from 'react';
import { ThreatResponse } from '../../services/threatApi';

interface ThreatMap2DProps {
  threatData: ThreatResponse | null;
  facilityLat: number;
  facilityLon: number;
  onFacilityMove?: (lat: number, lon: number) => void;
  mapRef?: React.MutableRefObject<any>;
}

// Zone rendering config — innermost layers last (paint on top)
const ZONE_STYLES: Array<{
  key: keyof ThreatResponse['threat_bands'];
  color: string;
  fillOpacity: number;
  weight: number;
  label: string;
  threshold: string;
}> = [
  {
    key: 'green_awareness',
    color: '#22c55e',
    fillOpacity: 0.12,
    weight: 1.5,
    label: 'Zone 4 — Awareness',
    threshold: '> 1.6 kW/m²',
  },
  {
    key: 'yellow_injury',
    color: '#eab308',
    fillOpacity: 0.20,
    weight: 2,
    label: 'Zone 3 — Injury',
    threshold: '4.7 – 12.5 kW/m²',
  },
  {
    key: 'orange_serious',
    color: '#f97316',
    fillOpacity: 0.30,
    weight: 2,
    label: 'Zone 2 — Serious',
    threshold: '12.5 – 37.5 kW/m²',
  },
  {
    key: 'red_lethal',
    color: '#ef4444',
    fillOpacity: 0.48,
    weight: 3,
    label: 'Zone 1 — Lethal',
    threshold: '> 37.5 kW/m²',
  },
];

export const ThreatMap2D: React.FC<ThreatMap2DProps> = ({
  threatData,
  facilityLat,
  facilityLon,
  onFacilityMove,
  mapRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // ── Initialise Leaflet map once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;
    if (mapInstanceRef.current) return; // already initialised

    const map = L.map(containerRef.current, {
      center: [facilityLat, facilityLon],
      zoom: 14,
      zoomControl: false,
    });

    // Satellite layer via CartoDB Voyager (best free satellite-ish tile)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Scale bar (bottom-left, metric)
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 150 }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Expose map instance for Export PNG
    if (mapRef) mapRef.current = map;

    // Click-to-move facility handler
    map.on('click', (e: any) => {
      if (onFacilityMove) {
        onFacilityMove(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.off();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recentre when facility moves ─────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([facilityLat, facilityLon], map.getZoom(), { animate: true });
  }, [facilityLat, facilityLon]);

  // ── Redraw zone polygons whenever threatData changes ─────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    const L = (window as any).L;
    if (!L) return;

    group.clearLayers();

    // ── Facility marker ────────────────────────────────────────────────────
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#ef4444;border:2.5px solid #fff;
        width:28px;height:28px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 18px 4px rgba(239,68,68,0.6);
        font-size:13px;cursor:crosshair;
      " title="Click map to move facility">🏭</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([facilityLat, facilityLon], { icon }).addTo(group);
    marker.bindPopup(`
      <div style="font-family:monospace;font-size:12px;color:#1e293b;">
        <strong>${threatData?.facility_name ?? 'Industrial Facility'}</strong><br/>
        ${threatData?.physics_metrics?.primary_hazard ?? ''}<br/>
        <span style="color:#6b7280;font-size:10px;">Click map to relocate facility</span>
      </div>
    `);

    if (!threatData) return;

    // ── Zone polygons — render outermost first (green → red on top) ────────
    ZONE_STYLES.forEach(({ key, color, fillOpacity, weight, label, threshold }) => {
      const band = threatData.threat_bands[key];
      if (!band || band.polygon.length < 3) return;

      L.polygon(band.polygon, {
        color,
        weight,
        fillColor: color,
        fillOpacity,
        dashArray: key === 'green_awareness' ? '6 4' : undefined,
      })
        .addTo(group)
        .bindTooltip(
          `<span style="font-family:monospace;font-size:11px;font-weight:bold;">
            ${label}<br/>
            Threshold: ${threshold}<br/>
            Max radius: ${band.max_radius_m} m
           </span>`,
          { sticky: true }
        );
    });

    // ── Safe approach arrow (green dashed polyline toward upwind bearing) ──
    const safeVec = threatData.safe_approach_vector;
    if (safeVec && safeVec.safe_angle_deg !== undefined) {
      const safeRad = (safeVec.safe_angle_deg * Math.PI) / 180;
      const maxR = threatData.threat_bands.green_awareness?.max_radius_m ?? 800;
      const vecLen = maxR * 1.25; // extend arrow beyond outermost zone
      const dx = vecLen * Math.sin(safeRad);
      const dy = vecLen * Math.cos(safeRad);
      const endLat = facilityLat + dy / 111320;
      const endLon = facilityLon + dx / (111320 * Math.cos((facilityLat * Math.PI) / 180));

      const arrowLine = L.polyline([[facilityLat, facilityLon], [endLat, endLon]], {
        color: '#10b981',
        weight: 4,
        dashArray: '14 8',
        lineCap: 'round',
      }).addTo(group);

      arrowLine.bindTooltip(
        `<span style="font-family:monospace;font-size:11px;font-weight:bold;color:#065f46;">
          ↑ SAFE APPROACH<br/>
          ${safeVec.cardinal_direction} — ${safeVec.safe_angle_deg}° (Upwind)
         </span>`,
        { permanent: true, direction: 'top', className: 'safe-approach-tooltip' }
      );
    }
  }, [threatData, facilityLat, facilityLon]);

  return (
    <div className="w-full h-full relative select-none">
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* North Arrow — top-right overlay */}
      <div
        className="absolute top-3 right-3 z-[1000] flex flex-col items-center gap-0.5 pointer-events-none"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
      >
        <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Arrow up (North - white) */}
          <polygon points="16,2 22,22 16,18 10,22" fill="white" stroke="#1e293b" strokeWidth="1" />
          {/* Arrow down (South - slate) */}
          <polygon points="16,42 22,22 16,26 10,22" fill="#475569" stroke="#1e293b" strokeWidth="1" />
          {/* Center dot */}
          <circle cx="16" cy="22" r="2.5" fill="#e2e8f0" />
        </svg>
        <span
          className="text-white font-bold text-[10px] tracking-widest"
          style={{ fontFamily: 'monospace', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          N
        </span>
      </div>

      {/* Legend — bottom-left overlay */}
      {threatData && (
        <div
          className="absolute bottom-10 left-2 z-[1000] bg-slate-950/90 backdrop-blur border border-slate-700 rounded-xl p-2.5 text-[10px] font-mono space-y-1.5 pointer-events-none"
          style={{ minWidth: 180 }}
        >
          <div className="text-cyan-400 font-bold uppercase tracking-wider text-[9px] mb-1">
            Hazard Zone Legend
          </div>
          {[...ZONE_STYLES].reverse().map(({ key, color, label, threshold }) => {
            const band = threatData.threat_bands[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: color, opacity: 0.85 }}
                />
                <div className="text-gray-200">
                  <span className="font-semibold">{label}</span>
                  <span className="text-gray-400 ml-1">({band?.max_radius_m ?? '—'} m)</span>
                </div>
              </div>
            );
          })}
          <div className="pt-1 border-t border-slate-700 text-gray-400 text-[9px]">
            Click map to relocate facility
          </div>
        </div>
      )}
    </div>
  );
};
