import React, { useState, useEffect } from 'react';
import { ThreatControlDock } from '../../components/threat/ThreatControlDock';
import { ThreatMap2D } from '../../components/threat/ThreatMap2D';
import { ThreatDigitalTwin3D } from '../../components/threat/ThreatDigitalTwin3D';
import { ThreatTelemetryPanel } from '../../components/threat/ThreatTelemetryPanel';
import { calculateThreatZone, ThreatCalculateParams, ThreatResponse } from '../../services/threatApi';
import { ShieldAlert, Compass, Eye, Map, Box } from 'lucide-react';

export const CommandCenterPage: React.FC = () => {
  const [params, setParams] = useState<ThreatCalculateParams>({
    facility_type: 'FACILITY_A_LPG',
    latitude: 13.0300,
    longitude: 80.2350,
    mass_kg: 40000,
    pool_diameter_m: 30,
    fuel_type: 'LPG',
    wind_speed_ms: 8.5,
    wind_direction_deg: 135,
  });

  const [threatData, setThreatData] = useState<ThreatResponse | null>(null);
  const [viewMode, setViewMode] = useState<'2D_MAP' | '3D_DIGITAL_TWIN'>('2D_MAP');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    calculateThreatZone(params)
      .then((data) => {
        if (isMounted) {
          setThreatData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Threat calculation failed:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [params]);

  const handleSelectFacilityA = () => {
    setParams((prev) => ({
      ...prev,
      facility_type: 'FACILITY_A_LPG',
      mass_kg: 40000,
      fuel_type: 'LPG',
    }));
  };

  const handleSelectFacilityB = () => {
    setParams((prev) => ({
      ...prev,
      facility_type: 'FACILITY_B_POOL_FIRE',
      pool_diameter_m: 30,
      fuel_type: 'Gasoline',
    }));
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-gray-100 overflow-hidden font-sans select-none">
      {/* Top Main Command Header */}
      <header className="h-14 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-4 flex items-center justify-between z-[1000]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-950 border border-red-600/50 text-red-400">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-gray-100 font-mono uppercase">
                RESQ-AI COMMAND — DER-02 THREAT-ZONE ESTIMATION
              </h1>
              <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-bold font-mono">
                PHYSICAL HAZARD MODE
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              Industrial Fire &amp; Explosion Threat Modeling | Chennai Petrochem Complex
            </div>
          </div>
        </div>

        {/* Header Right: 2D GIS / 3D Digital Twin View Switcher */}
        <div className="flex items-center gap-2 font-mono">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1 text-xs">
            <button
              onClick={() => setViewMode('2D_MAP')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                viewMode === '2D_MAP'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-gray-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>2D GIS MAP</span>
            </button>

            <button
              onClick={() => setViewMode('3D_DIGITAL_TWIN')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                viewMode === '3D_DIGITAL_TWIN'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-gray-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D DIGITAL TWIN</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Command Body (Control Dock + Map Viewport + Telemetry Panel) */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Parameter Control Dock */}
        <ThreatControlDock
          params={params}
          onChangeParams={setParams}
          onSelectFacilityA={handleSelectFacilityA}
          onSelectFacilityB={handleSelectFacilityB}
        />

        {/* Center Map / 3D Digital Twin Viewport */}
        <div className="flex-1 relative bg-slate-900">
          {viewMode === '2D_MAP' ? (
            <ThreatMap2D
              threatData={threatData}
              facilityLat={params.latitude}
              facilityLon={params.longitude}
            />
          ) : (
            <ThreatDigitalTwin3D
              threatData={threatData}
              onExit3D={() => setViewMode('2D_MAP')}
            />
          )}

          {/* Loading Overlay Indicator */}
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-slate-950/90 border border-cyan-500/50 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 flex items-center gap-2 shadow-2xl">
              <Compass className="w-4 h-4 animate-spin text-cyan-400" />
              COMPUTING ANALYTICAL PHYSICS PLUME...
            </div>
          )}
        </div>

        {/* Right Threat Telemetry & Physics Rationale Panel */}
        <ThreatTelemetryPanel threatData={threatData} />
      </div>
    </div>
  );
};
export default CommandCenterPage;
