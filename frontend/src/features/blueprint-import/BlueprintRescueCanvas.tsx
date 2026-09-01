// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint 2D Rescue Mission Operational Canvas
// Spatial Foundation: 2D Blueprint with Overlaid Casualty Pins, Safe Ingress Corridor,
// Rejected Downwind Axes, Perimeter Access Gates, and Real-Time Responder Kinematics
// ────────────────────────────────────────────────────────────────────────────

import React, { useRef, useState, useMemo } from 'react';
import { FacilitySchema, FacilityAsset } from '../../simulation/blueprintTypes';
import { FacilitySimulationResult } from '../../simulation/hazardEngine';
import {
  MissionCasualty,
  CandidateRouteEvaluation,
  MissionPhase,
} from '../../simulation/missionTypes';
import { worldToBlueprintCoordinates } from '../../simulation/coordinateTransformer';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Users,
  CheckCircle2,
  XCircle,
  HardHat,
  Crosshair,
  HeartPulse,
} from 'lucide-react';

interface BlueprintRescueCanvasProps {
  blueprintImageUrl: string;
  schema: FacilitySchema;
  casualties: MissionCasualty[];
  selectedCasualtyId: string | null;
  onSelectCasualty: (casualty: MissionCasualty) => void;
  activeRescueCasualtyId: string | null;
  candidateRoutes: CandidateRouteEvaluation[];
  missionPhase: MissionPhase;
  elapsedSec: number;
  simulationResult: FacilitySimulationResult | null;
}

const PRIORITY_COLORS = {
  P1_CRITICAL: { bg: 'rgba(239, 68, 68, 0.95)', border: '#f87171', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.6)' },
  P2_URGENT: { bg: 'rgba(249, 115, 22, 0.95)', border: '#fb923c', text: '#ffffff', glow: 'rgba(249, 115, 22, 0.5)' },
  P3_STABLE: { bg: 'rgba(234, 179, 8, 0.95)', border: '#fde047', text: '#18181b', glow: 'rgba(234, 179, 8, 0.4)' },
};

export const BlueprintRescueCanvas: React.FC<BlueprintRescueCanvasProps> = ({
  blueprintImageUrl,
  schema,
  casualties,
  selectedCasualtyId,
  onSelectCasualty,
  activeRescueCasualtyId,
  candidateRoutes,
  missionPhase,
  elapsedSec,
  simulationResult,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [showHazardZones, setShowHazardZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showCasualtyLabels, setShowCasualtyLabels] = useState(true);
  const [showGates, setShowGates] = useState(true);

  const { blueprintWidthPx, blueprintHeightPx, pixelsPerMeter } = schema.metadata;
  const transformConfig = {
    blueprintWidthPx,
    blueprintHeightPx,
    pixelsPerMeter,
  };

  const recommendedRoute = candidateRoutes.find((r) => r.status === 'RECOMMENDED');
  const rejectedRoutes = candidateRoutes.filter((r) => r.status === 'REJECTED');

  // Map Casualty World Coordinates to 2D Blueprint Pixels
  const casualtyPixels = useMemo(() => {
    return casualties.map((cas) => {
      const p = worldToBlueprintCoordinates(cas.worldPos[0], cas.worldPos[2], transformConfig);
      return {
        casualty: cas,
        pixelX: p.x,
        pixelY: p.y,
      };
    });
  }, [casualties, transformConfig]);

  // Map Access Gates to 2D Blueprint Pixels
  const gatePixels = useMemo(() => {
    const activeGates = schema.gates.length > 0 ? schema.gates : [
      { id: 'GATE_NORTH', name: 'NORTH ACCESS GATE', worldPos: { x: 0, z: -150 }, headingDeg: 0, cardinal: 'N' },
      { id: 'GATE_SOUTH', name: 'SOUTH ACCESS GATE', worldPos: { x: 0, z: 150 }, headingDeg: 180, cardinal: 'S' },
      { id: 'GATE_EAST', name: 'EAST ACCESS GATE', worldPos: { x: 150, z: 0 }, headingDeg: 90, cardinal: 'E' },
      { id: 'GATE_WEST', name: 'WEST ACCESS GATE', worldPos: { x: -150, z: 0 }, headingDeg: 270, cardinal: 'W' },
    ];

    return activeGates.map((g) => {
      const p = worldToBlueprintCoordinates(g.worldPos.x, g.worldPos.z, transformConfig);
      const evalMatch = candidateRoutes.find(
        (cr) => cr.gateId === g.id || cr.gateName.toLowerCase().includes(g.name.toLowerCase().split(' ')[0])
      );
      return {
        gate: g,
        pixelX: p.x,
        pixelY: p.y,
        isRecommended: evalMatch?.status === 'RECOMMENDED',
        rejectionReason: evalMatch?.rejectionReason,
      };
    });
  }, [schema.gates, candidateRoutes, transformConfig]);

  // Active Rescue Target Pixel Position
  const activeTargetPixel = useMemo(() => {
    if (!activeRescueCasualtyId) return null;
    const match = casualtyPixels.find((cp) => cp.casualty.id === activeRescueCasualtyId);
    return match ? { x: match.pixelX, y: match.pixelY } : null;
  }, [activeRescueCasualtyId, casualtyPixels]);

  // Safe Entry Gate Pixel Position
  const selectedGatePixel = useMemo(() => {
    const recGate = gatePixels.find((gp) => gp.isRecommended);
    return recGate ? { x: recGate.pixelX, y: recGate.pixelY } : gatePixels[0] ? { x: gatePixels[0].pixelX, y: gatePixels[0].pixelY } : null;
  }, [gatePixels]);

  // Dynamic Responder Position along Safe Route
  const responderPixel = useMemo(() => {
    if (!selectedGatePixel || !activeTargetPixel || missionPhase === 'PLANNING') {
      return selectedGatePixel || { x: 100, y: 100 };
    }

    if (missionPhase === 'MISSION_COMPLETE') {
      return selectedGatePixel;
    }

    // Interpolate responder movement based on active rescue progress
    const activeCas = casualties.find((c) => c.id === activeRescueCasualtyId);
    const progress = activeCas ? activeCas.rescueProgressPct / 100 : Math.min(1.0, (elapsedSec % 15) / 15);

    return {
      x: selectedGatePixel.x * (1 - progress) + activeTargetPixel.x * progress,
      y: selectedGatePixel.y * (1 - progress) + activeTargetPixel.y * progress,
    };
  }, [selectedGatePixel, activeTargetPixel, missionPhase, casualties, activeRescueCasualtyId, elapsedSec]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none">
      {/* ── TOP CONTROL TOOLBAR ────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 border-b border-slate-800 flex items-center justify-between z-20 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            2D BLUEPRINT RESCUE MAP
          </span>
          <span className="text-[10px] text-gray-400">
            ({casualties.filter((c) => !c.extracted).length} At-Risk • {casualties.filter((c) => c.extracted).length} Secured)
          </span>
          {missionPhase !== 'PLANNING' && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold animate-pulse">
              <HardHat className="w-3 h-3" />
              <span>SQUAD ACTIVE: {missionPhase}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHazardZones(!showHazardZones)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showHazardZones
                ? 'bg-red-500 text-slate-950 border-red-400 shadow'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            <Flame className="w-3 h-3 inline mr-1" />
            <span>HAZARDS</span>
          </button>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showRoutes
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            <Compass className="w-3 h-3 inline mr-1" />
            <span>ROUTES</span>
          </button>

          <button
            onClick={() => setShowGates(!showGates)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showGates
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            <ShieldCheck className="w-3 h-3 inline mr-1" />
            <span>GATES</span>
          </button>

          <button
            onClick={() => setShowCasualtyLabels(!showCasualtyLabels)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showCasualtyLabels
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            <span>CASUALTIES</span>
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-400 w-10 text-center font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── MAIN 2D RESCUE BLUEPRINT MAP VIEWPORT ───────────────────────────── */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4 cursor-crosshair"
      >
        <div
          className="relative transition-transform duration-100 ease-out shadow-2xl"
          style={{
            width: `${blueprintWidthPx}px`,
            height: `${blueprintHeightPx}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Layer 1: Background Blueprint Image */}
          <img
            src={blueprintImageUrl}
            alt="Facility Blueprint"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none filter brightness-95 contrast-105"
          />

          {/* Layer 2: Master SVG Overlay (Threat Zones, Routes, Gate Vectors) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox={`0 0 ${blueprintWidthPx} ${blueprintHeightPx}`}
          >
            <defs>
              {/* Radial Gradients for Master Threat Zones */}
              <radialGradient id="rescue-lethal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
              </radialGradient>
              <radialGradient id="rescue-serious" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.18" />
              </radialGradient>
              <radialGradient id="rescue-injury" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0.10" />
              </radialGradient>
              <radialGradient id="rescue-awareness" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
              </radialGradient>

              {/* Animated Glow Filters */}
              <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 2A. CCPS 2010 Wind-Deformed Hazard Contours */}
            {showHazardZones && simulationResult && (
              <g id="rescue-hazard-zones">
                {/* Zone 4: Awareness (Green) */}
                {simulationResult.zones.awareness.pixelPolygon.length > 0 && (
                  <polygon
                    points={simulationResult.zones.awareness.pixelPolygon.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="url(#rescue-awareness)"
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.8"
                  />
                )}

                {/* Zone 3: Injury (Yellow) */}
                {simulationResult.zones.injury.pixelPolygon.length > 0 && (
                  <polygon
                    points={simulationResult.zones.injury.pixelPolygon.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="url(#rescue-injury)"
                    stroke="#eab308"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                    opacity="0.85"
                  />
                )}

                {/* Zone 2: Serious Thermal (Orange) */}
                {simulationResult.zones.serious.pixelPolygon.length > 0 && (
                  <polygon
                    points={simulationResult.zones.serious.pixelPolygon.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="url(#rescue-serious)"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
                )}

                {/* Zone 1: Lethal Blast & Fireball (Red) */}
                {simulationResult.zones.lethal.pixelPolygon.length > 0 && (
                  <polygon
                    points={simulationResult.zones.lethal.pixelPolygon.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="url(#rescue-lethal)"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    opacity="0.95"
                  />
                )}
              </g>
            )}

            {/* 2B. Safe Ingress Route & Rejected Downwind Corridors */}
            {showRoutes && selectedGatePixel && (
              <g id="rescue-routes">
                {/* Rejected Candidate Gate Corridors (Red Dashed Line passing through lethal area) */}
                {gatePixels
                  .filter((gp) => !gp.isRecommended)
                  .map((gp, i) => (
                    <g key={`rejected-line-${i}`}>
                      <line
                        x1={gp.pixelX}
                        y1={gp.pixelY}
                        x2={simulationResult ? simulationResult.originPixel.x : blueprintWidthPx / 2}
                        y2={simulationResult ? simulationResult.originPixel.y : blueprintHeightPx / 2}
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="6 6"
                        opacity="0.5"
                      />
                    </g>
                  ))}

                {/* Recommended Safe Upwind Ingress Route (Glowing Green Animated Polyline) */}
                {activeTargetPixel && (
                  <g>
                    {/* Route Background Glow */}
                    <line
                      x1={selectedGatePixel.x}
                      y1={selectedGatePixel.y}
                      x2={activeTargetPixel.x}
                      y2={activeTargetPixel.y}
                      stroke="#10b981"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                      filter="url(#glow-green)"
                    />
                    {/* Animated Dashed Core */}
                    <line
                      x1={selectedGatePixel.x}
                      y1={selectedGatePixel.y}
                      x2={activeTargetPixel.x}
                      y2={activeTargetPixel.y}
                      stroke="#34d399"
                      strokeWidth="2.5"
                      strokeDasharray="8 6"
                      className="animate-pulse"
                    />
                  </g>
                )}
              </g>
            )}

            {/* 2C. Live Responder Unit Marker along Route */}
            {missionPhase !== 'PLANNING' && responderPixel && (
              <g id="rescue-responder-marker">
                <circle
                  cx={responderPixel.x}
                  cy={responderPixel.y}
                  r="12"
                  fill="#065f46"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
                <circle
                  cx={responderPixel.x}
                  cy={responderPixel.y}
                  r="18"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.8"
                />
                <text
                  x={responderPixel.x}
                  y={responderPixel.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  🚒
                </text>
              </g>
            )}
          </svg>

          {/* Layer 3: Perimeter Access Gate Badges */}
          {showGates && (
            <div className="absolute inset-0 pointer-events-auto">
              {gatePixels.map(({ gate, pixelX, pixelY, isRecommended, rejectionReason }) => {
                return (
                  <div
                    key={gate.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-30"
                    style={{ left: `${pixelX}px`, top: `${pixelY}px` }}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold shadow-lg transition-transform hover:scale-110 cursor-pointer ${
                        isRecommended
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500 ring-2 ring-emerald-400/50'
                          : 'bg-red-950 text-red-300 border-red-700 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {isRecommended ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400" />
                      )}
                      <span>{gate.name}</span>
                    </div>

                    {/* Hover Rationale Card */}
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-2 rounded-lg text-[8px] font-mono text-gray-200 w-44 shadow-2xl z-40">
                      <div className="font-bold text-cyan-300">{gate.name}</div>
                      <div className="text-[7px] text-gray-400">Heading: {gate.headingDeg}° ({gate.cardinal})</div>
                      <div className="mt-1">
                        {isRecommended ? (
                          <span className="text-emerald-300">
                            ✓ RECOMMENDED: Optimal upwind corridor with 0% lethal zone crossing.
                          </span>
                        ) : (
                          <span className="text-red-400">
                            ✗ REJECTED: {rejectionReason || 'Crosses convective plume / lethal thermal zone.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Layer 4: Interactive Casualty Pins & Triage Badges */}
          <div className="absolute inset-0 pointer-events-auto">
            {casualtyPixels.map(({ casualty: cas, pixelX, pixelY }) => {
              const isSelected = selectedCasualtyId === cas.id;
              const isActiveRescue = activeRescueCasualtyId === cas.id;
              const style = PRIORITY_COLORS[cas.priority];

              return (
                <div
                  key={cas.id}
                  onClick={() => onSelectCasualty(cas)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-40 transition-transform hover:scale-125"
                  style={{ left: `${pixelX}px`, top: `${pixelY}px` }}
                >
                  {/* Pin Pulse Ring */}
                  {!cas.extracted && (
                    <div
                      className="absolute -inset-2 rounded-full animate-ping opacity-60 pointer-events-none"
                      style={{ backgroundColor: style.glow }}
                    />
                  )}

                  {/* Casualty Pin Head */}
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold shadow-2xl transition-all ${
                      cas.extracted
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : isSelected || isActiveRescue
                        ? 'ring-2 ring-cyan-400 scale-110 shadow-cyan-500/50'
                        : ''
                    }`}
                    style={{
                      backgroundColor: cas.extracted ? undefined : style.bg,
                      borderColor: cas.extracted ? undefined : style.border,
                      color: cas.extracted ? undefined : style.text,
                    }}
                  >
                    <span className="text-[8px] font-black">{cas.id}</span>
                    {cas.extracted ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />
                    ) : (
                      <Users className="w-2.5 h-2.5" />
                    )}
                  </div>

                  {/* Expanded Detail Badge (Optional Toggle) */}
                  {showCasualtyLabels && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-1.5 py-0.5 rounded text-[7px] text-gray-200 whitespace-nowrap shadow-xl">
                      <div className="font-bold text-cyan-300">{cas.name}</div>
                      <div className="flex items-center gap-1 text-[6px]">
                        <span className="text-red-400 font-bold">{cas.exposureKwM2} kW/m²</span>
                        <span>•</span>
                        <span className={cas.extracted ? 'text-emerald-400' : 'text-amber-300'}>
                          {cas.extracted ? 'SECURED' : `${Math.round(cas.survivabilityWindowSec)}s`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
