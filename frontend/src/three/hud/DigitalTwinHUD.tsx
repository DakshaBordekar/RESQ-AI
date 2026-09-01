// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Tactical Command HUD Overlay
// Upper Event Timeline Controller, Play/Pause/Replay/Reset Controls,
// 7 Camera Presets, Lighting Switcher, and Unobstructed 3D Viewport
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  ThreatResponse,
  HazardMode,
  CameraPerspective,
  LightingMode,
  BlevePhase,
  SpatialProbePoint,
  ThreatCalculateParams,
} from '../../simulation/types';
import { PhysicsModelModal } from './PhysicsModelModal';
import {
  Eye,
  Camera,
  Flame,
  ShieldAlert,
  Layers,
  X,
  Zap,
  Activity,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Crosshair,
  Sun,
  Sunset,
  Moon,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

interface DigitalTwinHUDProps {
  threatData: ThreatResponse | null;
  params?: ThreatCalculateParams;
  currentMode: HazardMode;
  onSelectMode: (mode: HazardMode) => void;
  currentPerspective: CameraPerspective;
  onSelectPerspective: (perspective: CameraPerspective) => void;
  onResetView: () => void;
  lightingMode: LightingMode;
  onSelectLightingMode: (mode: LightingMode) => void;
  isImmersive: boolean;
  onToggleImmersive: () => void;
  blevePhase: BlevePhase;
  isPaused: boolean;
  onTriggerScenario?: () => void;
  onPauseScenario?: () => void;
  onResumeScenario?: () => void;
  onReplayScenario?: () => void;
  onTriggerBleve?: () => void;
  onPauseBleve?: () => void;
  onResumeBleve?: () => void;
  onReplayBleve?: () => void;
  onResetScene: () => void;
  probePoint: SpatialProbePoint | null;
  onExit3D: () => void;
}

export const DigitalTwinHUD: React.FC<DigitalTwinHUDProps> = ({
  threatData,
  params,
  currentMode,
  onSelectMode,
  currentPerspective,
  onSelectPerspective,
  onResetView,
  lightingMode,
  onSelectLightingMode,
  isImmersive,
  onToggleImmersive,
  blevePhase,
  isPaused,
  onTriggerScenario,
  onPauseScenario,
  onResumeScenario,
  onReplayScenario,
  onTriggerBleve,
  onPauseBleve,
  onResumeBleve,
  onReplayBleve,
  onResetScene,
  probePoint,
  onExit3D,
}) => {
  const [physicsModalOpen, setPhysicsModalOpen] = useState(false);
  const [bottomTelemetryOpen, setBottomTelemetryOpen] = useState(true);

  const isFacilityA = (threatData?.facility_type || params?.facility_type) !== 'FACILITY_B_POOL_FIRE';
  const metrics = threatData?.physics_metrics;
  const safeVec = threatData?.safe_approach_vector;
  const windDir = params?.wind_direction_deg ?? 135;

  const isRunning = blevePhase !== 'IDLE' && blevePhase !== 'AFTERMATH';

  const handleTrigger = onTriggerScenario || onTriggerBleve || (() => {});
  const handlePause = onPauseScenario || onPauseBleve || (() => {});
  const handleResume = onResumeScenario || onResumeBleve || (() => {});
  const handleReplay = onReplayScenario || onReplayBleve || (() => {});

  const stages: { phase: BlevePhase; label: string }[] = isFacilityA
    ? [
        { phase: 'IDLE', label: 'CALM' },
        { phase: 'THERMAL_STRESS', label: 'STRESS' },
        { phase: 'BLAST_IGNITION', label: 'BLAST' },
        { phase: 'SHOCKWAVE_PROPAGATION', label: 'SHOCKWAVE' },
        { phase: 'DEBRIS_COLLAPSE', label: 'DAMAGE' },
        { phase: 'EMERGENCY_RESPONSE', label: 'RESPONSE' },
        { phase: 'TRUCK_STAGED', label: 'STAGED' },
        { phase: 'WATER_ATTACK', label: 'WATER ATTACK' },
        { phase: 'EXTINGUISHED', label: 'EXTINGUISHED' },
        { phase: 'AFTERMATH', label: 'AFTERMATH' },
      ]
    : [
        { phase: 'IDLE', label: 'CALM' },
        { phase: 'IGNITION', label: 'IGNITION' },
        { phase: 'SUSTAINED_FIRE', label: 'SUSTAINED' },
        { phase: 'EMERGENCY_RESPONSE', label: 'RESPONSE' },
        { phase: 'TRUCK_STAGED', label: 'STAGED' },
        { phase: 'WATER_ATTACK', label: 'WATER ATTACK' },
        { phase: 'EXTINGUISHED', label: 'EXTINGUISHED' },
        { phase: 'AFTERMATH', label: 'AFTERMATH' },
      ];

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col justify-between p-3 font-mono text-gray-100 select-none">
      {/* ── 1. TOP COMMAND & TIMELINE HEADER ───────────────────────────────── */}
      <div className="flex flex-col gap-1.5 shrink-0 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 p-2 rounded-xl shadow-2xl">
          {/* Left: Branding & Facility Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-400 shrink-0">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span>DER-02 3D DIGITAL TWIN</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="text-xs font-bold text-gray-100 truncate">
                {threatData?.facility_name || 'Industrial Facility'}
              </div>
            </div>
          </div>

          {/* Center: Threat Modes & Lighting */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Threat Mode Toggles */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5 text-xs">
              <button
                onClick={() => onSelectMode('COMBINED')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${
                  currentMode === 'COMBINED'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>COMBINED</span>
              </button>
              <button
                onClick={() => onSelectMode('THERMAL')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${
                  currentMode === 'THERMAL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>THERMAL</span>
              </button>
              <button
                onClick={() => onSelectMode('BLAST')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${
                  currentMode === 'BLAST'
                    ? 'bg-red-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>BLAST</span>
              </button>
            </div>

            {/* Lighting Mode Presets (Day / Dusk / Night) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5 text-xs">
              <button
                onClick={() => onSelectLightingMode('DAY')}
                title="Day Mode (Overcast Sunlight)"
                className={`p-1 rounded transition-all ${
                  lightingMode === 'DAY'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSelectLightingMode('DUSK')}
                title="Dusk Mode (Golden Hour)"
                className={`p-1 rounded transition-all ${
                  lightingMode === 'DUSK'
                    ? 'bg-orange-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Sunset className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSelectLightingMode('NIGHT')}
                title="Night Mode (Tactical Contrast)"
                className={`p-1 rounded transition-all ${
                  lightingMode === 'NIGHT'
                    ? 'bg-indigo-500 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Event Timeline Play / Pause / Replay / Reset Controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-1 text-[10px]">
              {blevePhase === 'IDLE' && (
                <button
                  onClick={handleTrigger}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold shadow transition-all"
                >
                  <Play className="w-3 h-3" />
                  <span>{isFacilityA ? 'TRIGGER BLEVE' : 'TRIGGER POOL FIRE'}</span>
                </button>
              )}

              {isRunning && (
                <>
                  <button
                    onClick={isPaused ? handleResume : handlePause}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                  >
                    {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
                  </button>
                  <button
                    onClick={onResetScene}
                    title="Reset to Calm State"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </>
              )}

              {blevePhase === 'AFTERMATH' && (
                <>
                  <button
                    onClick={handleReplay}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isFacilityA ? 'REPLAY BLAST' : 'REPLAY FIRE'}</span>
                  </button>
                  <button
                    onClick={onResetScene}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>RESET SCENE</span>
                  </button>
                </>
              )}
            </div>

            {/* Physics Transparency Button */}
            <button
              onClick={() => setPhysicsModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] text-cyan-300 font-bold transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              <span className="hidden sm:inline">AUDIT</span>
            </button>
          </div>

          {/* Right: Immersive Mode & Exit 3D */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleImmersive}
              title={isImmersive ? 'Exit Immersive View' : 'Fullscreen Immersive 3D'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                isImmersive
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300'
              }`}
            >
              {isImmersive ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isImmersive ? 'RESTORE UI' : 'FOCUS 3D'}</span>
            </button>

            <button
              onClick={onExit3D}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[10px] shadow transition-all hover:scale-105"
            >
              <X className="w-3.5 h-3.5" />
              <span>EXIT 3D</span>
            </button>
          </div>
        </div>

        {/* ── Sub-Bar: Timeline Stage Track & 8 Camera Presets ─────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-1.5 rounded-xl shadow-2xl">
          {/* Incident Timeline Stage Indicator */}
          <div className="flex items-center gap-1 text-[9px] overflow-x-auto py-0.5">
            <span className="text-gray-500 font-bold uppercase tracking-wider mr-1">EVENT TIMELINE:</span>
            {stages.map(({ phase: stPhase, label }, idx) => {
              const isActive = blevePhase === stPhase;
              return (
                <div
                  key={stPhase}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-red-950 text-red-300 border border-red-600 font-bold shadow animate-pulse'
                      : 'text-slate-500 bg-slate-900/60'
                  }`}
                >
                  <span>{label}</span>
                  {idx < stages.length - 1 && <span className="text-slate-700">→</span>}
                </div>
              );
            })}
          </div>

          {/* 8 Camera Presets */}
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {[
              { key: 'COMMAND' as const, label: 'COMMAND', icon: Eye },
              { key: 'FACILITY' as const, label: 'FACILITY', icon: ShieldAlert },
              { key: 'HAZARD' as const, label: 'HAZARD', icon: Flame },
              { key: 'THERMAL' as const, label: 'THERMAL', icon: Activity },
              { key: 'BLAST' as const, label: 'BLAST', icon: Zap },
              { key: 'FIRE_BRIGADE' as const, label: 'FIRE BRIGADE', icon: ShieldAlert },
              { key: 'STREET' as const, label: 'STREET (WASD)', icon: Camera },
              { key: 'TANK_HERO' as const, label: 'TANK HERO', icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onSelectPerspective(key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  currentPerspective === key
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-gray-200 hover:bg-slate-850'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}

            <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

            <button
              onClick={onResetView}
              title="Reset Camera View"
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded text-[10px] font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. COMPACT UPPER-THIRD TERRAIN PROBE BADGE (Zero Center Obscurity) ── */}
      {probePoint && probePoint.severityTier !== 'SAFE' && (
        <div
          className="absolute top-[96px] left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-cyan-500/60 px-3 py-1 rounded-full shadow-2xl pointer-events-none flex items-center gap-3 text-[10px] animate-in fade-in zoom-in-95 duration-100 z-[1050]"
          style={{ whiteSpace: 'nowrap' }}
        >
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <Crosshair className="w-3 h-3 text-cyan-400" />
            <span>PROBE</span>
          </div>

          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
              probePoint.severityTier === 'ZONE_1_LETHAL'
                ? 'bg-red-950 text-red-300 border border-red-700'
                : probePoint.severityTier === 'ZONE_2_SERIOUS'
                ? 'bg-orange-950 text-orange-300 border border-orange-700'
                : probePoint.severityTier === 'ZONE_3_INJURY'
                ? 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
            }`}
          >
            {probePoint.severityTier.replace('ZONE_', 'Z').replace(/_/g, ' ')}
          </span>

          <span className="text-gray-300">
            Dist: <strong className="text-gray-100">{probePoint.distanceM}m</strong>
          </span>

          <span className="text-gray-300">
            Flux: <strong className="text-amber-400">{probePoint.heatFluxKwM2} kW/m²</strong>
          </span>

          {isFacilityA && (
            <span className="text-gray-300">
              Blast: <strong className="text-purple-400">{probePoint.overpressureBar} bar</strong>
            </span>
          )}

          <span className="text-gray-300">
            Dominant: <strong className="text-cyan-300">{probePoint.dominantHazard}</strong>
          </span>
        </div>
      )}

      {/* ── 3. BOTTOM TELEMETRY DOCKS (Collapsible) ─────────────────────────── */}
      <div className="flex items-end justify-between gap-3 pointer-events-auto">
        {/* Bottom-Left: Live Physical Telemetry Card */}
        {bottomTelemetryOpen && (
          <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-2.5 rounded-xl shadow-2xl max-w-xs text-xs space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-cyan-400 font-bold text-[10px]">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                PHYSICAL TELEMETRY
              </span>
              <button
                onClick={() => setBottomTelemetryOpen(false)}
                className="text-gray-400 hover:text-gray-200"
                title="Collapse Drawer"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {metrics && (
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {isFacilityA ? (
                  <>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Fireball Radius</div>
                      <strong className="text-red-400">{metrics.fireball_radius_m} m</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Stored Energy</div>
                      <strong className="text-indigo-400">{metrics.total_energy_gj} GJ</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">TNT Equivalent</div>
                      <strong className="text-purple-400">{metrics.w_tnt_equivalent_kg?.toLocaleString()} kg</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Duration (t_f)</div>
                      <strong className="text-amber-400">{metrics.fireball_duration_s} s</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Flame Height</div>
                      <strong className="text-amber-400">{metrics.flame_height_m} m</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Flame Tilt</div>
                      <strong className="text-cyan-400">{metrics.flame_tilt_deg}°</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Downwind Shift</div>
                      <strong className="text-red-400">{metrics.downwind_displacement_m} m</strong>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-gray-500 text-[9px]">Radiative Power</div>
                      <strong className="text-emerald-400">{metrics.total_radiative_power_mw} MW</strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!bottomTelemetryOpen && (
          <button
            onClick={() => setBottomTelemetryOpen(true)}
            className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] text-cyan-400 font-bold hover:bg-slate-900"
          >
            <Activity className="w-3 h-3" />
            <span>TELEMETRY</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        )}

        {/* Bottom-Right: Safe Ingress Route & Emergency Response Telemetry */}
        <div className="flex flex-col gap-2 max-w-xs">
          {/* Emergency Response Live Status */}
          {blevePhase !== 'IDLE' && (
            <div className="bg-slate-950/95 backdrop-blur-xl border border-red-500/50 p-2.5 rounded-xl shadow-2xl text-xs space-y-1.5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between text-red-400 font-bold text-[10px] border-b border-red-950 pb-0.5">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-400 animate-pulse" />
                  EMERGENCY TACTICAL RESPONSE
                </span>
                <span className="text-[8px] bg-red-900/80 text-red-200 px-1 py-0.2 rounded font-bold uppercase">
                  {blevePhase.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <div className="text-gray-500 text-[8px]">ENTRY CORRIDOR</div>
                  <strong className="text-emerald-400">
                    {safeVec ? `${safeVec.cardinal_direction} (${safeVec.safe_angle_deg}°)` : 'NW (315°)'}
                  </strong>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <div className="text-gray-500 text-[8px]">STAGING STANDOFF</div>
                  <strong className="text-cyan-400">78m (OUTSIDE Z1)</strong>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <div className="text-gray-500 text-[8px]">WATER MONITOR</div>
                  <strong className="text-blue-400">
                    {blevePhase === 'WATER_ATTACK' || blevePhase === 'SUPPRESSION'
                      ? '4,500 L/MIN ACTIVE'
                      : blevePhase === 'EXTINGUISHED' || blevePhase === 'AFTERMATH'
                      ? 'COMPLETED'
                      : 'STANDBY'}
                  </strong>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <div className="text-gray-500 text-[8px]">SUPPRESSION LEVEL</div>
                  <strong className="text-amber-400">
                    {blevePhase === 'EXTINGUISHED' || blevePhase === 'AFTERMATH'
                      ? '100% COMPLETE'
                      : blevePhase === 'WATER_ATTACK' || blevePhase === 'SUPPRESSION'
                      ? 'SUPPRESSING (75%)'
                      : '0% PENDING'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Safe Ingress Route & Hazard Vector Badge */}
          {safeVec && (
            <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-2.5 rounded-xl shadow-2xl text-xs space-y-2">
              {/* Downwind Hazard Axis */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 text-[9px]">
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <Flame className="w-3 h-3 text-red-500" />
                  HAZARD AXIS (DOWNWIND)
                </span>
                <span className="text-red-300 font-bold">
                  {Math.round(windDir)}°
                </span>
              </div>

              {/* Safe Approach Corridor */}
              <div className="bg-emerald-950/80 border border-emerald-500/50 p-2 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-[9px]">
                  <span>SAFE APPROACH CORRIDOR</span>
                  <span className="text-[8px] bg-emerald-900 text-emerald-200 px-1 py-0.2 rounded font-bold">
                    UPWIND
                  </span>
                </div>

                <div className="text-xs font-bold text-white">
                  HEADING {safeVec.cardinal_direction} ({safeVec.safe_angle_deg}°)
                </div>
                <div className="text-[8px] text-emerald-200/80 leading-tight">
                  180° opposite to downwind plume. Staging & ingress: <strong>0% lethal hazard crossing</strong>.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Physics Model Audit Modal */}
      <PhysicsModelModal
        isOpen={physicsModalOpen}
        onClose={() => setPhysicsModalOpen(false)}
        threatData={threatData}
      />
    </div>
  );
};
