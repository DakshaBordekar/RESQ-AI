import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Incident, Resource, Hospital, RoadSegment, Dispatch } from '../../types';
import { getActiveMapTileProvider } from '../../services/mapProvider';

// Fix leaflet default icon asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon Generators
const createIncidentIcon = (tier: string) => {
  const colorMap: Record<string, string> = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MEDIUM: '#EAB308',
    LOW: '#10B981',
  };
  const color = colorMap[tier] || '#EAB308';
  const pulse = tier === 'CRITICAL' ? '<div class="pulse-ring bg-red-500"></div>' : '';

  return L.divIcon({
    className: 'custom-pulse-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${pulse}
        <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
          !
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createResourceIcon = (type: string, status: string) => {
  const isBoat = type.includes('BOAT') || type.includes('NDRF');
  const iconSymbol = isBoat ? '⛵' : '🚑';
  const isDeployed = status !== 'AVAILABLE';

  return L.divIcon({
    className: 'custom-resource-marker',
    html: `
      <div style="background-color: ${isDeployed ? '#3B82F6' : '#10B981'}; width: 26px; height: 26px; border-radius: 6px; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 13px;">
        ${iconSymbol}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const createHospitalIcon = (availableBeds: number, status: string) => {
  const isFull = status === 'DIVERT_FULL' || availableBeds === 0;
  return L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="background-color: ${isFull ? '#DC2626' : '#6366F1'}; width: 24px; height: 24px; border-radius: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 0 6px rgba(99,102,241,0.5);">
        H
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface SituationMapProps {
  incidents: Incident[];
  resources: Resource[];
  hospitals: Hospital[];
  roadSegments: RoadSegment[];
  dispatches: Dispatch[];
  selectedIncidentId?: string;
  onSelectIncident: (inc: Incident) => void;
  onToggleRoad: (roadId: string) => void;
}

export const SituationMap: React.FC<SituationMapProps> = ({
  incidents,
  resources,
  hospitals,
  roadSegments,
  dispatches,
  selectedIncidentId,
  onSelectIncident,
  onToggleRoad,
}) => {
  const chennaiCenter: [number, number] = [13.0300, 80.2350];
  const tileProvider = getActiveMapTileProvider();

  return (
    <div className="w-full h-full relative overflow-hidden bg-canvas">
      <MapContainer
        center={chennaiCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* OpenStreetMap Standard Tile Layer */}
        <TileLayer
          attribution={tileProvider.attribution}
          url={tileProvider.url}
          maxZoom={tileProvider.maxZoom}
        />

        {/* 1. Road Network Layer */}
        {roadSegments.map((road) => {
          const isBlocked = road.status === 'BLOCKED';
          const isWaterlogged = road.status === 'WATERLOGGED';
          const roadColor = isBlocked ? '#EF4444' : (isWaterlogged ? '#06B6D4' : '#374151');
          const roadWeight = isBlocked ? 5 : (isWaterlogged ? 4 : 2.5);

          return (
            <Polyline
              key={road.id}
              positions={[road.source_coords, road.target_coords]}
              pathOptions={{
                color: roadColor,
                weight: roadWeight,
                dashArray: isBlocked ? '6, 6' : undefined,
                opacity: isBlocked ? 0.9 : 0.6,
              }}
              eventHandlers={{
                click: () => onToggleRoad(road.id),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 text-xs">
                  <div className="font-bold text-gray-100">{road.name}</div>
                  <div className="text-gray-300 mt-0.5">Status: <span className="font-semibold font-mono text-amber-400">{road.status}</span></div>
                  <div className="text-gray-400">Length: {road.length_km} km | Speed: {road.base_speed_kmh} km/h</div>
                  <button
                    onClick={() => onToggleRoad(road.id)}
                    className="mt-2 w-full py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold"
                  >
                    {isBlocked ? 'Clear Road' : 'Simulate Blockage'}
                  </button>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 2. Active Dispatch Routes Overlay (Computed by local Dijkstra backend engine) */}
        {dispatches.map((disp) => {
          if (!disp.route_geometry || disp.route_geometry.length < 2) return null;
          const isApproved = disp.status === 'APPROVED' || disp.status === 'DISPATCHED';

          return (
            <Polyline
              key={disp.id}
              positions={disp.route_geometry}
              pathOptions={{
                color: isApproved ? '#10B981' : '#3B82F6',
                weight: 4,
                dashArray: isApproved ? undefined : '8, 8',
                opacity: 0.9,
              }}
            />
          );
        })}

        {/* 3. Hospital & Shelter Markers */}
        {hospitals.map((hosp) => (
          <Marker
            key={hosp.id}
            position={[hosp.latitude, hosp.longitude]}
            icon={createHospitalIcon(hosp.available_beds, hosp.status)}
          >
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-indigo-400">{hosp.name}</div>
                <div className="text-gray-200 mt-1">Available Beds: <strong>{hosp.available_beds}/{hosp.total_beds}</strong></div>
                <div className="text-gray-200">ICU Vacancy: <strong>{hosp.available_icu}/{hosp.total_icu}</strong></div>
                <div className="text-gray-400 mt-0.5">Status: {hosp.status_display}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Emergency Fleet Markers (Ambulances ALS/BLS, Boats, NDRF) */}
        {resources.map((res) => (
          <Marker
            key={res.id}
            position={[res.latitude, res.longitude]}
            icon={createResourceIcon(res.type, res.status)}
          >
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-emerald-400">{res.call_sign} — {res.name}</div>
                <div className="text-gray-200 mt-0.5">Type: {res.type_display}</div>
                <div className="text-gray-200">Status: <span className="font-bold">{res.status_display}</span></div>
                <div className="text-gray-400 text-[10px] mt-1">Capabilities: {res.capabilities.join(', ')}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 5. Incident Markers (Color-coded by Priority Tier) */}
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            icon={createIncidentIcon(inc.priority_tier)}
            eventHandlers={{
              click: () => onSelectIncident(inc),
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-bold text-red-400">[{inc.priority_tier}] {inc.title}</div>
                <div className="text-gray-200 mt-1">Location: {inc.location_name}</div>
                <div className="text-gray-200">Victims: <strong>{inc.people_affected}</strong> (Vulnerable: {inc.vulnerable_people})</div>
                <div className="text-gray-200">Priority Score: <strong className="font-mono">{inc.calculated_priority.toFixed(1)}</strong></div>
                <div className="text-gray-400 text-[10px] mt-0.5">Mobility: {inc.mobility_status} | Urgency: {inc.urgency}</div>
                <button
                  onClick={() => onSelectIncident(inc)}
                  className="mt-2 w-full py-1 bg-blue-600 text-white rounded text-[11px] font-semibold"
                >
                  View in Action Hub
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
