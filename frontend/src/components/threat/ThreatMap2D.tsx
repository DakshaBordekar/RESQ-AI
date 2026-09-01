import React, { useEffect, useRef } from 'react';
import { ThreatResponse } from '../../services/threatApi';

interface ThreatMap2DProps {
  threatData: ThreatResponse | null;
  facilityLat: number;
  facilityLon: number;
}

export const ThreatMap2D: React.FC<ThreatMap2DProps> = ({ threatData, facilityLat, facilityLon }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [facilityLat, facilityLon],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. Render Industrial Storage Facility Marker
    const icon = L.divIcon({
      className: 'custom-facility-icon',
      html: `
        <div style="background-color: #ef4444; border: 2px solid #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px #ef4444;">
          <span style="color: white; font-weight: bold; font-size: 11px;">🏭</span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([facilityLat, facilityLon], { icon }).addTo(group);
    marker.bindPopup(`
      <div style="font-family: monospace; font-size: 12px; color: #1e293b;">
        <strong>${threatData?.facility_name || 'Industrial Storage Tank'}</strong><br/>
        Primary Hazard: ${threatData?.physics_metrics?.primary_hazard || 'Thermal & Blast'}
      </div>
    `);

    if (!threatData) return;

    // 2. Render 3-Tier Graded Threat Polygons (Yellow -> Orange -> Red)
    const bands = threatData.threat_bands;

    // Yellow Band (Evacuate / Caution)
    if (bands.yellow_evacuate && bands.yellow_evacuate.polygon.length > 0) {
      L.polygon(bands.yellow_evacuate.polygon, {
        color: '#eab308',
        weight: 2,
        fillColor: '#eab308',
        fillOpacity: 0.18,
      }).addTo(group).bindTooltip(`Yellow Band (Caution): > 1.6 kW/m²`);
    }

    // Orange Band (Serious Threat)
    if (bands.orange_serious && bands.orange_serious.polygon.length > 0) {
      L.polygon(bands.orange_serious.polygon, {
        color: '#f97316',
        weight: 2,
        fillColor: '#f97316',
        fillOpacity: 0.28,
      }).addTo(group).bindTooltip(`Orange Band (Serious): 4.7 - 12.5 kW/m²`);
    }

    // Red Band (Lethal Zone)
    if (bands.red_lethal && bands.red_lethal.polygon.length > 0) {
      L.polygon(bands.red_lethal.polygon, {
        color: '#ef4444',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.45,
      }).addTo(group).bindTooltip(`Red Band (Lethal): > 12.5 kW/m²`);
    }

    // 3. Render Green Safe Approach Vector Corridor
    const safeVec = threatData.safe_approach_vector;
    if (safeVec && safeVec.safe_angle_deg !== undefined) {
      const safeRad = (safeVec.safe_angle_deg * Math.PI) / 180;
      const vecLen = 800; // meters
      const dx = vecLen * Math.sin(safeRad);
      const dy = vecLen * Math.cos(safeRad);
      const endLat = facilityLat + dy / 111320;
      const endLon = facilityLon + dx / (111320 * Math.cos((facilityLat * Math.PI) / 180));

      const line = L.polyline([[facilityLat, facilityLon], [endLat, endLon]], {
        color: '#10b981',
        weight: 5,
        dashArray: '10, 8',
      }).addTo(group);

      line.bindTooltip(`RECOMMENDED SAFE APPROACH: ${safeVec.cardinal_direction} (${safeVec.safe_angle_deg}°)`, { permanent: true, direction: 'top' });
    }
  }, [threatData, facilityLat, facilityLon]);

  return <div ref={mapContainerRef} className="w-full h-full relative select-none" />;
};
