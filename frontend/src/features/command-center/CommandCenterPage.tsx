import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThreatControlDock } from '../../components/threat/ThreatControlDock';
import { ThreatMap2D } from '../../components/threat/ThreatMap2D';
import { ThreatDigitalTwin3D } from '../../components/threat/ThreatDigitalTwin3D';
import { ThreatTelemetryPanel } from '../../components/threat/ThreatTelemetryPanel';
import {
  calculateThreatZone,
  ThreatCalculateParams,
  ThreatResponse,
} from '../../services/threatApi';
import {
  ShieldAlert,
  Compass,
  Map,
  Box,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Activity,
  Maximize2,
  Minimize2,
  Users,
  FileImage,
} from 'lucide-react';

interface CommandCenterPageProps {
  onNavigateToMission?: () => void;
  onNavigateToBlueprint?: () => void;
}

// ── Default facility presets ───────────────────────────────────────────────
const FACILITY_A_DEFAULTS: Partial<ThreatCalculateParams> = {
  facility_type: 'FACILITY_A_LPG',
  mass_kg: 40000,
  tank_diameter_m: 14,
  tank_volume_m3: 80,
  fill_fraction: 0.85,
  fuel_type: 'LPG',
  latitude: 13.0300,
  longitude: 80.2350,
};

const FACILITY_B_DEFAULTS: Partial<ThreatCalculateParams> = {
  facility_type: 'FACILITY_B_POOL_FIRE',
  pool_diameter_m: 24,
  tank_diameter_m: 20,
  tank_volume_m3: 150,
  fill_fraction: 0.70,
  fuel_type: 'Diesel',
  latitude: 13.0300,
  longitude: 80.2350,
};

const INITIAL_PARAMS: ThreatCalculateParams = {
  ...FACILITY_A_DEFAULTS,
  wind_speed_ms: 8.5,
  wind_direction_deg: 135,
  mass_kg: 40000,
  pool_diameter_m: 24,
  tank_diameter_m: 14,
  tank_volume_m3: 80,
  fill_fraction: 0.85,
  fuel_type: 'LPG',
  facility_type: 'FACILITY_A_LPG',
  latitude: 13.0300,
  longitude: 80.2350,
};

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({
  onNavigateToMission,
  onNavigateToBlueprint,
}) => {
  const [params, setParams] = useState<ThreatCalculateParams>(INITIAL_PARAMS);
  const [threatData, setThreatData] = useState<ThreatResponse | null>(null);
  const [viewMode, setViewMode] = useState<'2D_MAP' | '3D_DIGITAL_TWIN'>('2D_MAP');
  const [loading, setLoading] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileTelemetryOpen, setMobileTelemetryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Desktop Collapsible Panels State
  const [leftDockOpen, setLeftDockOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isImmersive3D, setIsImmersive3D] = useState(false);

  // Shared Leaflet map reference for Export PNG
  const mapRef = useRef<any>(null);

  // ESC key exits immersive mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImmersive3D) {
        setIsImmersive3D(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersive3D]);

  // Compute threat zones on parameter change
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

  const handleSelectFacilityA = () =>
    setParams((prev) => ({ ...prev, ...FACILITY_A_DEFAULTS }));

  const handleSelectFacilityB = () =>
    setParams((prev) => ({ ...prev, ...FACILITY_B_DEFAULTS }));

  const handleFacilityMove = useCallback((lat: number, lon: number) => {
    setParams((prev) => ({ ...prev, latitude: lat, longitude: lon }));
  }, []);

  const handleExportPNG = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      alert('Switch to 2D MAP view before exporting.');
      return;
    }
    setExporting(true);

    try {
      const container = map.getContainer() as HTMLElement;
      const w = container.clientWidth;
      const h = container.clientHeight;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = w;
      finalCanvas.height = h;
      const ctx = finalCanvas.getContext('2d')!;

      const canvases = container.querySelectorAll('canvas');
      canvases.forEach((c) => {
        try {
          ctx.drawImage(c, 0, 0);
        } catch {}
      });

      const legendPad = 12;
      const legendX = legendPad;
      const legendY = h - 200;
      const legendW = 220;
      const bandLabels = threatData
        ? [
            { color: '#ef4444', label: 'Zone 1 — Lethal', r: threatData.threat_bands.red_lethal?.max_radius_m },
            { color: '#f97316', label: 'Zone 2 — Serious', r: threatData.threat_bands.orange_serious?.max_radius_m },
            { color: '#eab308', label: 'Zone 3 — Injury', r: threatData.threat_bands.yellow_injury?.max_radius_m },
            { color: '#22c55e', label: 'Zone 4 — Awareness', r: threatData.threat_bands.green_awareness?.max_radius_m },
          ]
        : [];

      if (bandLabels.length) {
        ctx.fillStyle = 'rgba(9,13,22,0.85)';
        ctx.roundRect?.(legendX, legendY, legendW, 160, 10);
        ctx.fill();

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('HAZARD ZONE LEGEND', legendX + 10, legendY + 20);

        bandLabels.forEach(({ color, label, r }, i) => {
          const ly = legendY + 38 + i * 28;
          ctx.fillStyle = color;
          ctx.fillRect(legendX + 10, ly - 9, 14, 14);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '10px monospace';
          ctx.fillText(`${label} — ${r ?? '—'} m`, legendX + 30, ly + 2);
        });

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Wind: ${params.wind_speed_ms} m/s @ ${params.wind_direction_deg}°`, legendX + 10, legendY + 148);
      }

      ctx.fillStyle = 'rgba(9,13,22,0.90)';
      ctx.fillRect(0, 0, w, 36);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(`RESQ-AI — DER-02 Threat Zone | ${threatData?.facility_name ?? ''}`, 12, 22);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        `${new Date().toLocaleString()} | Lat ${params.latitude.toFixed(4)}, Lon ${params.longitude.toFixed(4)}`,
        12,
        32
      );

      finalCanvas.toBlob((blob) => {
        if (!blob) {
          setExporting(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RESQ-AI_ThreatZone_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExporting(false);
      }, 'image/png');
    } catch (err) {
      console.error('Export failed:', err);
      setExporting(false);
    }
  }, [threatData, params]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-gray-100 overflow-hidden font-sans select-none">
      {/* ── Top Command Header (Hidden when Immersive 3D is active) ────── */}
      {!isImmersive3D && (
        <header className="h-14 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-4 flex items-center justify-between z-[1000] shrink-0 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-red-950 border border-red-600/50 shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold tracking-wider text-gray-100 font-mono uppercase truncate">
                  RESQ-AI — DER-02 THREAT-ZONE
                </h1>
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-bold font-mono hidden sm:inline">
                  PHYSICAL HAZARD MODE
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-mono truncate hidden sm:block">
                Industrial Fire &amp; Explosion | Chennai Petrochem Complex
              </div>
            </div>
          </div>

          {/* Header Right Controls */}
          <div className="flex items-center gap-2 font-mono shrink-0">
            {/* View switcher */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1 text-xs">
              <button
                onClick={() => {
                  setViewMode('2D_MAP');
                  setIsImmersive3D(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                  viewMode === '2D_MAP'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>2D MAP</span>
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
                <span>3D TWIN</span>
              </button>
            </div>

            {/* Export PNG button */}
            <button
              onClick={handleExportPNG}
              disabled={exporting || viewMode !== '2D_MAP'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-xs text-gray-200 font-bold transition-all"
              title="Export map as PNG incident report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export PNG'}</span>
            </button>

            {/* Mission Mode Switcher */}
            {onNavigateToMission && (
              <button
                onClick={onNavigateToMission}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500/60 text-red-300 rounded-lg text-xs font-bold transition-all shadow hover:scale-105"
                title="Launch Mission Mode & Casualty Rescue Simulator"
              >
                <Users className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>MISSION MODE</span>
              </button>
            )}

            {/* Blueprint to Digital Twin Switcher */}
            {onNavigateToBlueprint && (
              <button
                onClick={onNavigateToBlueprint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 rounded-lg text-xs font-bold transition-all shadow hover:scale-105"
                title="Open Blueprint-to-Digital-Twin Importer"
              >
                <FileImage className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>BLUEPRINT IMPORT</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── Main Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* ─ Desktop layout ─ */}
        <div className="hidden md:flex w-full h-full relative">
          {/* Left Control Dock (Collapsible) */}
          {!isImmersive3D && (
            <div
              className={`relative transition-all duration-300 shrink-0 flex ${
                leftDockOpen ? 'w-80' : 'w-12'
              }`}
            >
              {leftDockOpen ? (
                <div className="w-80 h-full relative overflow-hidden">
                  <ThreatControlDock
                    params={params}
                    onChangeParams={setParams}
                    onSelectFacilityA={handleSelectFacilityA}
                    onSelectFacilityB={handleSelectFacilityB}
                  />
                  <button
                    onClick={() => setLeftDockOpen(false)}
                    title="Collapse Controls"
                    className="absolute top-3 right-2 z-[600] p-1 bg-slate-900 border border-slate-700 rounded-lg text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setLeftDockOpen(true)}
                  title="Expand Control Dock"
                  className="w-12 h-full bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-900 transition-colors z-[500]"
                >
                  <Sliders className="w-5 h-5 text-cyan-400 mb-4" />
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest rotate-90 whitespace-nowrap mt-8">
                    CONTROLS
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-auto" />
                </div>
              )}
            </div>
          )}

          {/* Centre Map / 3D Viewport (Dynamically Expands) */}
          <div className="flex-1 relative bg-slate-900 overflow-hidden">
            {viewMode === '2D_MAP' ? (
              <ThreatMap2D
                threatData={threatData}
                facilityLat={params.latitude}
                facilityLon={params.longitude}
                onFacilityMove={handleFacilityMove}
                mapRef={mapRef}
              />
            ) : (
              <ThreatDigitalTwin3D
                threatData={threatData}
                params={params}
                isImmersive={isImmersive3D}
                onToggleImmersive={() => setIsImmersive3D((v) => !v)}
                onExit3D={() => {
                  setViewMode('2D_MAP');
                  setIsImmersive3D(false);
                }}
              />
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-slate-950/90 border border-cyan-500/50 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 flex items-center gap-2 shadow-2xl pointer-events-none">
                <Compass className="w-4 h-4 animate-spin" />
                COMPUTING PHYSICS PLUME…
              </div>
            )}
          </div>

          {/* Right Telemetry Panel (Collapsible) */}
          {!isImmersive3D && (
            <div
              className={`relative transition-all duration-300 shrink-0 flex ${
                rightPanelOpen ? 'w-88' : 'w-12'
              }`}
            >
              {rightPanelOpen ? (
                <div className="w-88 h-full relative overflow-hidden">
                  <ThreatTelemetryPanel threatData={threatData} />
                  <button
                    onClick={() => setRightPanelOpen(false)}
                    title="Collapse Telemetry"
                    className="absolute top-3 left-2 z-[600] p-1 bg-slate-900 border border-slate-700 rounded-lg text-gray-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setRightPanelOpen(true)}
                  title="Expand Telemetry Panel"
                  className="w-12 h-full bg-slate-950 border-l border-slate-800 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-900 transition-colors z-[500]"
                >
                  <Activity className="w-5 h-5 text-cyan-400 mb-4" />
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest rotate-90 whitespace-nowrap mt-8">
                    TELEMETRY
                  </span>
                  <ChevronLeft className="w-4 h-4 text-gray-400 mt-auto" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─ Mobile layout (< 768px) ─ */}
        <div className="flex md:hidden w-full h-full flex-col">
          <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 gap-2 shrink-0 z-[600]">
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setViewMode('2D_MAP')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  viewMode === '2D_MAP' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>MAP</span>
              </button>
              <button
                onClick={() => setViewMode('3D_DIGITAL_TWIN')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  viewMode === '3D_DIGITAL_TWIN' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMobileTelemetryOpen((v) => !v);
                  setMobileDrawerOpen(false);
                }}
                className="text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono"
              >
                TELEMETRY
              </button>
              <button
                onClick={handleExportPNG}
                disabled={exporting}
                className="p-1.5 bg-slate-800 border border-slate-700 rounded text-gray-300 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            className="relative bg-slate-900 transition-all duration-300"
            style={{ flex: 1, minHeight: 0, bottom: mobileDrawerOpen ? '40vh' : 0 }}
          >
            {mobileTelemetryOpen && (
              <div className="absolute inset-0 z-[700] overflow-y-auto bg-slate-950/98 backdrop-blur-xl">
                <div className="flex justify-end p-2">
                  <button onClick={() => setMobileTelemetryOpen(false)} className="text-xs text-gray-400 underline">
                    Close
                  </button>
                </div>
                <ThreatTelemetryPanel threatData={threatData} />
              </div>
            )}

            {viewMode === '2D_MAP' ? (
              <ThreatMap2D
                threatData={threatData}
                facilityLat={params.latitude}
                facilityLon={params.longitude}
                onFacilityMove={handleFacilityMove}
                mapRef={mapRef}
              />
            ) : (
              <ThreatDigitalTwin3D
                threatData={threatData}
                params={params}
                onExit3D={() => setViewMode('2D_MAP')}
              />
            )}

            {loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] bg-slate-950/90 border border-cyan-500/50 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 flex items-center gap-2 pointer-events-none">
                <Compass className="w-3.5 h-3.5 animate-spin" />
                COMPUTING…
              </div>
            )}
          </div>

          <div
            className="h-10 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 cursor-pointer shrink-0 z-[600]"
            onClick={() => {
              setMobileDrawerOpen((v) => !v);
              setMobileTelemetryOpen(false);
            }}
          >
            <span className="text-xs font-mono text-gray-300 font-bold uppercase tracking-wider">
              ⚙ Control Panel
            </span>
            <div className="text-gray-400">
              {mobileDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>

          <div
            className="bg-slate-950 border-t border-slate-800 overflow-y-auto z-[650] transition-all duration-300 shrink-0"
            style={{ height: mobileDrawerOpen ? '40vh' : 0, overflow: mobileDrawerOpen ? 'auto' : 'hidden' }}
          >
            <ThreatControlDock
              params={params}
              onChangeParams={setParams}
              onSelectFacilityA={handleSelectFacilityA}
              onSelectFacilityB={handleSelectFacilityB}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenterPage;
