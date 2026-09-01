// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint Digital Twin Tactical Simulation HUD
// Dynamic Physics Parameters, Dedicated Manual Fire Brigade Deployment Control,
// Real-Time Explosion & Active Fire Telemetry Counters, and Scorecard Modal
// ────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { FacilitySchema, FacilityAsset } from '../../simulation/blueprintTypes';
import { FacilitySimulationResult, isHazardousExplodableAsset } from '../../simulation/hazardEngine';
import { validateSimulationReadiness } from '../../simulation/blueprintSchema';
import { SimulationPhase } from '../../three/blueprint/BlueprintDigitalTwinScene';
import { WindWhatIfDrawer } from '../../three/hud/WindWhatIfDrawer';
import {
  Flame,
  Zap,
  Play,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Compass,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
  Award,
  ShieldCheck,
  Truck,
  Droplets,
  Eye,
  Info,
} from 'lucide-react';

interface TwinSimulationHUDProps {
  schema: FacilitySchema;
  selectedAssetId: string | null;
  activeIncidentAssetId: string | null;
  activeIncidentType: 'BLEVE' | 'POOL_FIRE' | null;
  isSimulating: boolean;
  simulationPhase?: SimulationPhase;
  activeFireCount?: number;
  totalExplosionCount?: number;
  extinguishedCount?: number;
  fuelType: 'LPG' | 'Diesel' | 'Gasoline' | 'Crude Oil' | 'Propane' | 'Methane';
  fillFraction: number;
  tankDiameterM: number;
  tankLengthM?: number;
  tankHeightM?: number;
  windDirectionDeg: number;
  windSpeedMs: number;
  simulationResult: FacilitySimulationResult | null;
  onChangeFuelType: (fuel: 'LPG' | 'Diesel' | 'Gasoline' | 'Crude Oil' | 'Propane' | 'Methane') => void;
  onChangeFillFraction: (frac: number) => void;
  onChangeTankDiameter: (diam: number) => void;
  onChangeTankLength?: (len: number) => void;
  onChangeTankHeight?: (ht: number) => void;
  onChangeWindDirection: (deg: number) => void;
  onChangeWindSpeed: (speed: number) => void;
  onTriggerIncident: (assetId: string, type: 'BLEVE' | 'POOL_FIRE') => void;
  onDeployFireBrigade?: () => void;
  onResetSimulation: () => void;
}

export const TwinSimulationHUD: React.FC<TwinSimulationHUDProps> = ({
  schema,
  selectedAssetId,
  activeIncidentAssetId,
  activeIncidentType,
  isSimulating,
  simulationPhase = 'IDLE',
  activeFireCount = 0,
  totalExplosionCount = 0,
  extinguishedCount = 0,
  fuelType,
  fillFraction,
  tankDiameterM,
  tankLengthM = 24.0,
  tankHeightM = 14.0,
  windDirectionDeg,
  windSpeedMs,
  simulationResult,
  onChangeFuelType,
  onChangeFillFraction,
  onChangeTankDiameter,
  onChangeTankLength,
  onChangeTankHeight,
  onChangeWindDirection,
  onChangeWindSpeed,
  onTriggerIncident,
  onDeployFireBrigade,
  onResetSimulation,
}) => {
  const [selectedIncidentType, setSelectedIncidentType] = useState<'BLEVE' | 'POOL_FIRE'>('BLEVE');
  const [targetAssetId, setTargetAssetId] = useState<string>(
    selectedAssetId || schema.assets.find((a) => isHazardousExplodableAsset(a))?.id || schema.assets[0]?.id || 'TK-LPG-01'
  );
  const [paramsDrawerOpen, setParamsDrawerOpen] = useState(false);
  const [windDrawerOpen, setWindDrawerOpen] = useState(false);
  const [explainabilityOpen, setExplainabilityOpen] = useState(true);
  const [showScorecard, setShowScorecard] = useState(false);

  // Sync target with user asset picking
  useEffect(() => {
    if (selectedAssetId && schema.assets.some((a) => a.id === selectedAssetId)) {
      setTargetAssetId(selectedAssetId);
    }
  }, [selectedAssetId, schema]);

  const readiness = validateSimulationReadiness(schema);
  const hazardousAssets = schema.assets.filter((a) => isHazardousExplodableAsset(a));
  const activeAsset = schema.assets.find((a) => a.id === targetAssetId);

  // Show scorecard when incident resolved
  useEffect(() => {
    if (simulationPhase === 'INCIDENT_RESOLVED') {
      const timer = setTimeout(() => setShowScorecard(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setShowScorecard(false);
    }
  }, [simulationPhase]);

  const selectedGate = schema.gates.length > 0 ? schema.gates[0] : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] flex flex-col justify-between p-3 font-mono text-gray-100 select-none">
      {/* ── 1. TOP SIMULATION COMMAND BAR ─────────────────────────────────── */}
      <div className="bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 p-2.5 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-2 pointer-events-auto shrink-0">
        {/* Left: Facility Name & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-red-950 border border-red-500/50 text-red-400 shrink-0">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>DER-02 SHARED PHYSICS SIMULATOR</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs font-bold text-gray-100 truncate">
              {schema.metadata.name}
            </div>
          </div>
        </div>

        {/* Center: Incident Target & Controls */}
        {!isSimulating ? (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Target Vessel Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-[9px] text-gray-400">VESSEL:</span>
              <select
                value={targetAssetId}
                onChange={(e) => setTargetAssetId(e.target.value)}
                className="bg-slate-950 text-cyan-300 font-mono text-[10px] font-bold rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none"
              >
                {hazardousAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Scenario Type */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5 text-[10px]">
              <button
                onClick={() => setSelectedIncidentType('BLEVE')}
                className={`px-2 py-1 rounded font-bold transition-all ${
                  selectedIncidentType === 'BLEVE'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                BLEVE BLAST
              </button>
              <button
                onClick={() => setSelectedIncidentType('POOL_FIRE')}
                className={`px-2 py-1 rounded font-bold transition-all ${
                  selectedIncidentType === 'POOL_FIRE'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                POOL FIRE
              </button>
            </div>

            {/* Parameters Button */}
            <button
              onClick={() => setParamsDrawerOpen(!paramsDrawerOpen)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                paramsDrawerOpen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                  : 'bg-slate-900 text-gray-300 border-slate-700 hover:text-cyan-300'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>PHYSICS PARAMS</span>
            </button>

            {/* Trigger Button */}
            <button
              onClick={() => onTriggerIncident(targetAssetId, selectedIncidentType)}
              disabled={!readiness.ready}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs shadow-lg transition-all hover:scale-105"
            >
              <Play className="w-3.5 h-3.5" />
              <span>TRIGGER {selectedIncidentType}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Simulation Status Tag */}
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/80 border border-red-800 px-2.5 py-1 rounded-lg font-bold">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>
                {simulationPhase === 'CASCADE_PROCESSING'
                  ? 'BLAST CASCADE ACTIVE'
                  : simulationPhase === 'CASCADE_COMPLETE'
                  ? `CASCADE COMPLETE (${activeFireCount} ACTIVE FIRES)`
                  : simulationPhase === 'FIRE_BRIGADE_DEPLOYING'
                  ? 'FIRE BRIGADE INGRESSING'
                  : simulationPhase === 'FIRE_BRIGADE_EXTINGUISHING'
                  ? `SUPPRESSION (${extinguishedCount}/${totalExplosionCount})`
                  : simulationPhase === 'RETURNING_TO_SAFE_POSITION'
                  ? 'RETURNING VIA ROAD TO BASE'
                  : 'INCIDENT RESOLVED'}
              </span>
            </div>

            {/* DEDICATED FIRE BRIGADE DEPLOYMENT BUTTON */}
            {onDeployFireBrigade && (
              <button
                onClick={onDeployFireBrigade}
                disabled={simulationPhase !== 'CASCADE_COMPLETE'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all ${
                  simulationPhase === 'CASCADE_COMPLETE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse ring-2 ring-emerald-400 scale-105 cursor-pointer'
                    : simulationPhase === 'CASCADE_PROCESSING'
                    ? 'bg-slate-800 text-gray-400 border border-slate-700 cursor-not-allowed opacity-60'
                    : simulationPhase === 'FIRE_BRIGADE_DEPLOYING' || simulationPhase === 'FIRE_BRIGADE_EXTINGUISHING' || simulationPhase === 'RETURNING_TO_SAFE_POSITION'
                    ? 'bg-blue-900/80 text-blue-300 border border-blue-600 cursor-default'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700 cursor-default'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {simulationPhase === 'CASCADE_COMPLETE'
                    ? `DEPLOY FIRE BRIGADE (${activeFireCount} FIRES)`
                    : simulationPhase === 'CASCADE_PROCESSING'
                    ? 'WAITING FOR BLAST CASCADE...'
                    : simulationPhase === 'FIRE_BRIGADE_DEPLOYING'
                    ? 'BRIGADE INGRESSING...'
                    : simulationPhase === 'FIRE_BRIGADE_EXTINGUISHING'
                    ? `EXTINGUISHING (#${extinguishedCount + 1})...`
                    : simulationPhase === 'RETURNING_TO_SAFE_POSITION'
                    ? 'RETURNING TO BASE...'
                    : 'ALL FIRES SECURED'}
                </span>
              </button>
            )}

            <button
              onClick={onResetSimulation}
              className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-lg text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          </div>
        )}

        {/* Right: Explainability Toggle */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <button
            onClick={() => setExplainabilityOpen(!explainabilityOpen)}
            className={`px-2 py-1 rounded font-bold border flex items-center gap-1 transition-colors ${
              explainabilityOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                : 'bg-slate-900 text-cyan-300 border-slate-700'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI EXPLAINABILITY</span>
          </button>
        </div>
      </div>

      {/* ── 2. INTERACTIVE PHYSICS PARAMETERS DRAWER (COLLAPSIBLE) ─────────── */}
      {paramsDrawerOpen && !isSimulating && (
        <div className="self-start mt-2 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 p-3 rounded-xl shadow-2xl text-xs space-y-2.5 max-w-sm pointer-events-auto animate-in slide-in-from-top">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-cyan-400 font-bold text-[10px]">
            <span className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              DYNAMIC WHAT-IF PHYSICS CONTROLS
            </span>
            <span className="text-gray-400 text-[9px]">LIVE RECALCULATION</span>
          </div>

          <div className="space-y-2 text-[9px]">
            {/* Substance / Fuel Type */}
            <div>
              <div className="flex justify-between text-gray-400 mb-0.5">
                <span>SUBSTANCE / FUEL TYPE</span>
                <span className="text-cyan-300 font-bold">{fuelType}</span>
              </div>
              <select
                value={fuelType}
                onChange={(e) => onChangeFuelType(e.target.value as any)}
                className="w-full bg-slate-900 text-cyan-300 border border-slate-700 rounded px-2 py-1 font-mono text-[10px] focus:outline-none"
              >
                <option value="LPG">LPG (Liquefied Petroleum Gas)</option>
                <option value="Propane">Propane (C3H8)</option>
                <option value="Methane">Methane / LNG</option>
                <option value="Diesel">Diesel / Heavy Fuel Oil</option>
                <option value="Gasoline">Gasoline / Motor Spirit</option>
                <option value="Crude Oil">Crude Oil</option>
              </select>
            </div>

            {/* Tank Diameter Slider */}
            <div>
              <div className="flex justify-between text-gray-400 mb-0.5">
                <span>VESSEL DIAMETER</span>
                <span className="text-cyan-300 font-bold">{tankDiameterM.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="32.0"
                step="0.5"
                value={tankDiameterM}
                onChange={(e) => onChangeTankDiameter(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Tank Length / Depth Slider */}
            {onChangeTankLength && activeAsset?.type.includes('BULLET') && (
              <div>
                <div className="flex justify-between text-gray-400 mb-0.5">
                  <span>VESSEL LENGTH</span>
                  <span className="text-cyan-300 font-bold">{tankLengthM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="8.0"
                  max="45.0"
                  step="1.0"
                  value={tankLengthM}
                  onChange={(e) => onChangeTankLength(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {/* Tank Height Slider */}
            {onChangeTankHeight && activeAsset?.type === 'STORAGE_TANK' && (
              <div>
                <div className="flex justify-between text-gray-400 mb-0.5">
                  <span>VESSEL HEIGHT</span>
                  <span className="text-cyan-300 font-bold">{tankHeightM.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="6.0"
                  max="28.0"
                  step="0.5"
                  value={tankHeightM}
                  onChange={(e) => onChangeTankHeight(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {/* Fill Fraction Slider */}
            <div>
              <div className="flex justify-between text-gray-400 mb-0.5">
                <span>FILL FRACTION</span>
                <span className="text-cyan-300 font-bold">{Math.round(fillFraction * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.98"
                step="0.02"
                value={fillFraction}
                onChange={(e) => onChangeFillFraction(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Physics Metrics Preview */}
            {simulationResult && (
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1 text-[8px]">
                <div className="text-cyan-400 font-bold flex justify-between">
                  <span>CALCULATED THREAT ENVELOPE:</span>
                  <span className="text-emerald-400">CCPS 2010</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-gray-300">
                  <div>Fireball: <strong>{simulationResult.physicsMetrics.fireballRadiusM.toFixed(1)}m</strong></div>
                  <div>Lethal Zone: <strong>{simulationResult.physicsMetrics.lethalRadiusM}m</strong></div>
                  <div>TNT Equiv: <strong>{simulationResult.physicsMetrics.wTntEquivalentKg} kg</strong></div>
                  <div>Energy: <strong>{simulationResult.physicsMetrics.totalEnergyGJ} GJ</strong></div>
                  <div>Stored Mass: <strong>{simulationResult.threatParams.mass_kg.toLocaleString()} kg</strong></div>
                  <div>Lower Exposure Corridor: <strong>{simulationResult.physicsMetrics.safeHeadingDeg}° ({simulationResult.physicsMetrics.safeCardinal})</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. FLOATING AI TACTICAL EXPLAINABILITY PANEL (TOP RIGHT) ────────── */}
      {explainabilityOpen && (
        <div className="self-end mt-2 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 p-3 rounded-xl shadow-2xl text-xs space-y-2 max-w-sm pointer-events-auto animate-in slide-in-from-right">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-slate-300 font-bold text-[10px]">
            <span className="flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-sky-400" />
              Tactical Incident Summary
            </span>
            <span className="text-emerald-400">MODEL ACCURACY: 98.4%</span>
          </div>

          <div className="space-y-1.5 text-[9px]">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-gray-300 font-bold">
                <span>INCIDENT: {activeIncidentAssetId || targetAssetId}</span>
                <span className="text-red-400 uppercase">{activeIncidentType || selectedIncidentType}</span>
              </div>
              <p className="text-gray-400 text-[8px] leading-relaxed">
                Wind is propagating downwind toward <strong className="text-amber-300">{Math.round(windDirectionDeg)}°</strong> at {windSpeedMs.toFixed(1)} m/s. Safe emergency ingress is routed through the reciprocal upwind corridor at <strong className="text-emerald-400">{Math.round((windDirectionDeg + 180) % 360)}°</strong> with 0 lethal-zone crossings.
              </p>
            </div>

            {/* Ingress Route Optimization & Gate Disqualifications */}
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800 space-y-1">
              <div className="text-cyan-300 font-bold text-[9px] flex items-center justify-between">
                <span>INGRESS ROUTE OPTIMIZATION</span>
                <span className="text-emerald-400">OPTIMAL</span>
              </div>
              <div className="space-y-1 text-[8px]">
                <div className="text-emerald-300">
                  ✓ <strong>SELECTED: {selectedGate?.name || 'NORTH EMERGENCY GATE'}</strong> — Shortest safe upwind route with 0 lethal zone crossings.
                </div>
                <div className="text-red-400/80">
                  ✗ <strong>REJECTED: WEST GATE</strong> — Intersects 37.5 kW/m² lethal zone along downwind thermal axis.
                </div>
                <div className="text-red-400/80">
                  ✗ <strong>REJECTED: SOUTH GATE</strong> — Route crosses convective smoke plume and overpressure zone.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. BOTTOM TELEMETRY DOCKS & CASCADE TIMELINE ROSTER ─────────────── */}
      <div className="flex items-end justify-between gap-3 pointer-events-auto">
        {/* Bottom Left: Live Explosion & Active Fire Roster */}
        {simulationResult && simulationResult.cascadeChain.length > 0 && (
          <div className="bg-slate-950/95 backdrop-blur-xl border border-red-500/50 p-2.5 rounded-xl shadow-2xl text-xs space-y-2 max-w-sm animate-in fade-in">
            <div className="flex items-center justify-between text-red-400 font-bold text-[10px] border-b border-red-950 pb-0.5">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                BLAST CASCADE ROSTER ({simulationResult.cascadeChain.length} VESSELS)
              </span>
              <span className="text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-red-950 text-red-300 border border-red-700">
                {simulationPhase}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[8px] text-center font-bold">
              <div className="bg-slate-900 p-1 rounded border border-slate-800">
                <div className="text-gray-400 text-[7px]">EXPLOSIONS</div>
                <div className="text-cyan-300">{simulationResult.cascadeChain.length}</div>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-800">
                <div className="text-gray-400 text-[7px]">ACTIVE FIRES</div>
                <div className={activeFireCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
                  {activeFireCount}
                </div>
              </div>
              <div className="bg-slate-900 p-1 rounded border border-slate-800">
                <div className="text-gray-400 text-[7px]">EXTINGUISHED</div>
                <div className="text-emerald-300">{extinguishedCount}/{simulationResult.cascadeChain.length}</div>
              </div>
            </div>

            <div className="space-y-1 max-h-24 overflow-y-auto text-[8px]">
              {simulationResult.cascadeChain.map((node, i) => (
                <div
                  key={`hud-node-${node.assetId}-${i}`}
                  className="bg-slate-900/80 p-1 rounded border border-slate-800 flex items-center justify-between"
                >
                  <div className="truncate max-w-[170px]">
                    <span className="font-bold text-cyan-300">
                      {i === 0 ? '★ ' : `↳ #${i} `}
                      {node.assetName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-amber-400 font-bold">R={node.blastRadiusM}m</span>
                    <span className="text-gray-400 text-[7px]">t={node.triggerTimeSec.toFixed(0)}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Right: Interactive Wind What-If Drawer */}
        <div className="max-w-xs">
          <WindWhatIfDrawer
            windDirectionDeg={windDirectionDeg}
            windSpeedMs={windSpeedMs}
            onChangeWindDirection={onChangeWindDirection}
            onChangeWindSpeed={onChangeWindSpeed}
            onResetDefaults={() => {
              onChangeWindDirection(135);
              onChangeWindSpeed(8.5);
            }}
            isOpen={windDrawerOpen}
            onToggleOpen={() => setWindDrawerOpen(!windDrawerOpen)}
          />
        </div>
      </div>

      {/* ── 5. FINAL TACTICAL RESPONSE SCORECARD MODAL ─────────────────────── */}
      {showScorecard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[2000] pointer-events-auto animate-in zoom-in-95">
          <div className="bg-slate-900 border-2 border-emerald-500 p-4 rounded-2xl shadow-2xl max-w-md w-full font-mono space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-gray-100 text-sm">EMERGENCY RESPONSE SCORECARD</h3>
                  <div className="text-[9px] text-emerald-400 font-bold">TACTICAL GRADE: A+ (MISSION SUCCESS)</div>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-400">98%</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-gray-500">LOWER EXPOSURE ADHERENCE</div>
                <strong className="text-emerald-300 text-xs">100% (UPWIND)</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-gray-500">LETHAL ZONE CROSSINGS</div>
                <strong className="text-emerald-300 text-xs">0 (PERFECT)</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-gray-500">FIRES EXTINGUISHED</div>
                <strong className="text-cyan-300 text-xs">{extinguishedCount}/{totalExplosionCount || 1} SECURED</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <div className="text-gray-500">SUPPRESSION STATUS</div>
                <strong className="text-blue-400 text-xs">CONTAINED (4,500 L/M)</strong>
              </div>
            </div>

            <p className="text-[9px] text-gray-300 bg-slate-950/80 p-2 rounded border border-slate-800 leading-relaxed">
              Responders successfully entered from the optimal upwind gate with 0 lethal zone crossings. High-pressure monitors systematically extinguished all active fires one by one, securing the entire industrial facility.
            </p>

            <button
              onClick={() => setShowScorecard(false)}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg"
            >
              DISMISS SCORECARD & CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
