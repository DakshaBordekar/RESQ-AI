import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ThreatResponse } from '../../services/threatApi';
import { getActiveMapTileProvider } from '../../services/mapProvider';

// Fix leaflet default icon asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ThreatMap2DProps {
  threatData: ThreatResponse | null;
  facilityLat: number;
  facilityLon: number;
  onFacilityMove?: (lat: number, lon: number) => void;
  mapRef?: React.MutableRefObject<any>;
}

// Zone rendering config — outermost layers first, innermost last (paint on top)
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
    fillOpacity: 0.22,
    weight: 2,
    label: 'Zone 3 — Injury',
    threshold: '4.7 – 12.5 kW/m²',
  },
  {
    key: 'orange_serious',
    color: '#f97316',
    fillOpacity: 0.32,
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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // ── Initialise Leaflet map once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapInstanceRef.current) return; // already initialised

    // React 18 StrictMode double-mount safeguard
    if ((containerRef.current as any)._leaflet_id) {
      (containerRef.current as any)._leaflet_id = null;
    }

    const map = L.map(containerRef.current, {
      center: [facilityLat, facilityLon],
      zoom: 14,
      zoomControl: false,
    });

    const tileProvider = getActiveMapTileProvider();
    L.tileLayer(tileProvider.url, {
      attribution: tileProvider.attribution,
      maxZoom: tileProvider.maxZoom,
      subdomains: tileProvider.subdomains || ['a', 'b', 'c'],
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Scale bar (bottom-left, metric)
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 150 }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;
    mapInstanceRef.current = map;

    // Expose map instance for Export PNG
    if (mapRef) {
      mapRef.current = map;
    }

    // Force map to compute correct dimensions once mounted
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Click-to-move facility handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onFacilityMove) {
        onFacilityMove(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      map.off();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      if (mapRef) {
        mapRef.current = null;
      }
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

    group.clearLayers();

    // ── Zone polygons — render outermost first (green → red on top) ────────
    if (threatData && threatData.threat_bands) {
      ZONE_STYLES.forEach(({ key, color, fillOpacity, weight, label, threshold }) => {
        const band = threatData.threat_bands[key];
        if (!band || !band.polygon || band.polygon.length < 3) return;

        // Leaflet polygon expects [lat, lon][] coordinates
        const leafletCoords = band.polygon.map(([lat, lon]) => [lat, lon] as [number, number]);

        L.polygon(leafletCoords, {
          color,
          weight,
          fillColor: color,
          fillOpacity,
          dashArray: key === 'green_awareness' ? '6 4' : undefined,
        })
          .addTo(group)
          .bindTooltip(
            `<div style="font-family:monospace;font-size:11px;font-weight:bold;line-height:1.4;">
              <span style="color:${color};font-size:12px;">●</span> ${label}<br/>
              Threshold: ${threshold}<br/>
              Max radius: ${band.max_radius_m} m
             </div>`,
            { sticky: true }
          );
      });
    }

    // ── Safe approach arrow (green dashed polyline toward upwind bearing) ──
    const safeVec = threatData?.safe_approach_vector;
    if (safeVec && safeVec.safe_angle_deg !== undefined) {
      const safeRad = (safeVec.safe_angle_deg * Math.PI) / 180;
      const maxR = threatData?.threat_bands?.green_awareness?.max_radius_m ?? 800;
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
        `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:bold;color:#065f46;">
          ↑ LOWER MODELED EXPOSURE ROUTE<br/>
          ${safeVec.cardinal_direction} — ${safeVec.safe_angle_deg}° (Upwind Corridor)
         </div>`,
        { permanent: true, direction: 'top', className: 'lower-exposure-approach-tooltip' }
      );
    }

    // ── Facility marker (rendered on top of polygons) ─────────────────────
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
      <div style="font-family:monospace;font-size:12px;color:#1e293b;line-height:1.4;">
        <strong>${threatData?.facility_name ?? 'Industrial Storage Facility'}</strong><br/>
        <span style="color:#ef4444;font-weight:bold;">${threatData?.physics_metrics?.primary_hazard ?? 'Fire & Explosion Hazard Origin'}</span><br/>
        <span style="color:#64748b;font-size:10px;">Lat: ${facilityLat.toFixed(4)}, Lon: ${facilityLon.toFixed(4)}</span><br/>
        <span style="color:#2563eb;font-size:10px;">Click anywhere on map to relocate facility</span>
      </div>
    `);
  }, [threatData, facilityLat, facilityLon]);

  const [showLegend, setShowLegend] = React.useState(false);

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

      {/* Collapsible Legend Overlay — bottom-left */}
      {threatData && (
        <div className="absolute bottom-6 left-3 z-[1000] pointer-events-auto">
          {showLegend ? (
            <div
              className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 text-[10px] font-mono space-y-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
              style={{ minWidth: 200 }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                <span className="text-cyan-400 font-bold uppercase tracking-wider text-[9px]">
                  Hazard Zone Legend
                </span>
                <button
                  onClick={() => setShowLegend(false)}
                  className="text-gray-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
              {[...ZONE_STYLES].reverse().map(({ key, color, label }) => {
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
              <div className="pt-1 border-t border-slate-800 text-gray-400 text-[9px]">
                Click map to relocate facility
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLegend(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-gray-300 rounded-xl text-[10px] font-mono font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
            >
              <span>🎨 HAZARD LEGEND</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
