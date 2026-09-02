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

  // Desktop Collapsible Panels State — default to collapsed (clean 100% map view)
  const [leftDockOpen, setLeftDockOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
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

  // Live UTC Clock & Elapsed Timer state
  const [currentTime, setCurrentTime] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(() => {
      updateTime();
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
                  RESQ-AI • INCIDENT COMMAND CENTER
                </h1>
                {currentTime && (
                  <span className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded font-mono hidden md:inline">
                    {currentTime}
                  </span>
                )}
                <span className="text-[10px] bg-slate-900 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded font-mono hidden lg:inline">
                  T+ {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate hidden sm:block">
                Industrial Fire &amp; Explosion • Plume Analysis
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
        {/* ─ Desktop layout (100% Fullscreen Map + Floating Glass Docks) ─ */}
        <div className="hidden md:flex w-full h-full relative">
          {/* Central Map / 3D Twin Viewport — 100% Fullscreen */}
          <div className="w-full h-full relative bg-slate-900 overflow-hidden">
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

            {/* Loading Overlay */}
            {loading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-slate-950/90 border border-cyan-500/50 px-4 py-1.5 rounded-full text-xs font-mono text-cyan-400 flex items-center gap-2 shadow-2xl pointer-events-none">
                <Compass className="w-4 h-4 animate-spin" />
                COMPUTING PHYSICS PLUME…
              </div>
            )}

            {/* Floating Left Control Dock / Pill Toggle */}
            {!isImmersive3D && (
              <div className="absolute top-4 left-4 z-[1000] pointer-events-auto">
                {leftDockOpen ? (
                  <div className="animate-in fade-in slide-in-from-left duration-200">
                    <ThreatControlDock
                      params={params}
                      onChangeParams={setParams}
                      onSelectFacilityA={handleSelectFacilityA}
                      onSelectFacilityB={handleSelectFacilityB}
                      onClose={() => setLeftDockOpen(false)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setLeftDockOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-gray-200 rounded-xl text-xs font-mono font-bold shadow-xl backdrop-blur-md transition-all hover:scale-[1.02]"
                  >
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <span>Scenario Controls</span>
                  </button>
                )}
              </div>
            )}

            {/* Floating Right Telemetry Panel / Pill Toggle */}
            {!isImmersive3D && (
              <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
                {rightPanelOpen ? (
                  <div className="animate-in fade-in slide-in-from-right duration-200">
                    <ThreatTelemetryPanel
                      threatData={threatData}
                      onClose={() => setRightPanelOpen(false)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setRightPanelOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-gray-200 rounded-xl text-xs font-mono font-bold shadow-xl backdrop-blur-md transition-all hover:scale-[1.02]"
                  >
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Threat Telemetry</span>
                  </button>
                )}
              </div>
            )}
          </div>
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
