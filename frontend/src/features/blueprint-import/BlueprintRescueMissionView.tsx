// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint 2D Rescue Mission Operational Command Center
// Integrated Tactical Incident Command: Casualty Triage, AI Route Explainability,
// Dynamic Strategy Selection, Real-Time Ingress Tracking, and Debrief Scorecard
// ────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FacilitySchema } from '../../simulation/blueprintTypes';
import { FacilitySimulationResult } from '../../simulation/hazardEngine';
import {
  MissionCasualty,
  MissionStrategy,
  MissionPhase,
  CandidateRouteEvaluation,
  MissionEventLog,
  MissionScorecardReport,
} from '../../simulation/missionTypes';
import {
  getFacilityCasualties,
  updateCasualtiesFleet,
  calculateStrategyTradeoffs,
  evaluateCandidateRoutes,
  evaluateMissionModeScore,
} from '../../simulation/missionEngine';
import { BlueprintRescueCanvas } from './BlueprintRescueCanvas';
import { CasualtyTriagePanel } from '../mission/CasualtyTriagePanel';
import { StrategyTradeoffPanel } from '../mission/StrategyTradeoffPanel';
import { RouteExplainabilityPanel } from '../mission/RouteExplainabilityPanel';
import { ResponderSafetyHUD } from '../mission/ResponderSafetyHUD';
import { MissionTimelineLog } from '../mission/MissionTimelineLog';
import { MissionDebriefModal } from '../mission/MissionDebriefModal';
import {
  Flame,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Users,
  Compass,
  Award,
  ChevronLeft,
  ChevronRight,
  Activity,
  HeartPulse,
  HardHat,
  Sliders,
} from 'lucide-react';

interface BlueprintRescueMissionViewProps {
  blueprintImageUrl: string;
  schema: FacilitySchema;
  windDirectionDeg: number;
  windSpeedMs: number;
  simulationResult: FacilitySimulationResult | null;
  onChangeWindDirection?: (deg: number) => void;
  onChangeWindSpeed?: (speed: number) => void;
}

export const BlueprintRescueMissionView: React.FC<BlueprintRescueMissionViewProps> = ({
  blueprintImageUrl,
  schema,
  windDirectionDeg,
  windSpeedMs,
  simulationResult,
  onChangeWindDirection,
  onChangeWindSpeed,
}) => {
  // Strategy & Phase
  const [selectedStrategy, setSelectedStrategy] = useState<MissionStrategy>('BALANCED_RESPONSE');
  const [missionPhase, setMissionPhase] = useState<MissionPhase>('PLANNING');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Casualties derived from actual blueprint assets
  const initialCasualties = useMemo(
    () => getFacilityCasualties(schema.assets),
    [schema.assets]
  );
  const [casualties, setCasualties] = useState<MissionCasualty[]>(initialCasualties);
  const [selectedCasualty, setSelectedCasualty] = useState<MissionCasualty | null>(null);
  const [activeRescueCasualtyId, setActiveRescueCasualtyId] = useState<string | null>(null);

  // Event Log
  const [events, setEvents] = useState<MissionEventLog[]>([
    {
      id: 'EVT-01',
      timestampSec: 0,
      formattedTime: '00:00',
      title: 'INCIDENT DETECTED',
      type: 'INCIDENT',
      description: 'Major fire detected on Primary LPG Vessel. High thermal flux recorded on blueprint equipment.',
    },
    {
      id: 'EVT-02',
      timestampSec: 2,
      formattedTime: '00:02',
      title: '2D BLUEPRINT HAZARD ANALYSIS',
      type: 'ROUTING',
      description: `Downwind hazard vector at ${Math.round(windDirectionDeg)}°. Safe reciprocal upwind entry identified at ${Math.round((windDirectionDeg + 180) % 360)}°.`,
    },
  ]);

  // Scorecard
  const [scorecardReport, setScorecardReport] = useState<MissionScorecardReport | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);

  // UI Drawers
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const [bottomLogOpen, setBottomLogOpen] = useState(false);

  // Dynamic Route & Tradeoff Calculations
  const tradeoffs = useMemo(
    () => calculateStrategyTradeoffs(windDirectionDeg, windSpeedMs),
    [windDirectionDeg, windSpeedMs]
  );

  const candidateRoutes = useMemo(
    () => evaluateCandidateRoutes(windDirectionDeg, windSpeedMs),
    [windDirectionDeg, windSpeedMs]
  );

  const addEvent = useCallback(
    (
      title: string,
      description: string,
      type: 'INCIDENT' | 'ROUTING' | 'RESCUE' | 'SUPPRESSION' | 'WARNING' | 'SUCCESS'
    ) => {
      const nowSec = Math.round(elapsedSec);
      const mins = Math.floor(nowSec / 60).toString().padStart(2, '0');
      const secs = (nowSec % 60).toString().padStart(2, '0');

      setEvents((prev) => [
        {
          id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestampSec: nowSec,
          formattedTime: `${mins}:${secs}`,
          title,
          type,
          description,
        },
        ...prev,
      ]);
    },
    [elapsedSec]
  );

  // Start Mission
  const handleStartMission = () => {
    if (missionPhase === 'PLANNING') {
      const rec = candidateRoutes.find((r) => r.status === 'RECOMMENDED');
      addEvent(
        'MISSION DISPATCHED',
        `Engine 01 dispatched via ${rec?.gateName || 'NORTH GATE'} using ${selectedStrategy.replace(/_/g, ' ')} strategy.`,
        'ROUTING'
      );

      // Prioritize first P1 critical casualty
      const firstTarget = casualties.find((c) => !c.extracted && c.priority === 'P1_CRITICAL') || casualties.find((c) => !c.extracted);
      if (firstTarget) {
        setActiveRescueCasualtyId(firstTarget.id);
        addEvent('EXTRACTION INITIATED', `Squad routed to ${firstTarget.name} (${firstTarget.locationName}).`, 'RESCUE');
      }

      setMissionPhase('DISPATCHED');
      setIsPaused(false);
    } else {
      setIsPaused(false);
    }
  };

  const handlePauseMission = () => {
    setIsPaused(true);
  };

  const handleResetMission = () => {
    setMissionPhase('PLANNING');
    setIsPaused(false);
    setElapsedSec(0);
    setCasualties(getFacilityCasualties(schema.assets));
    setSelectedCasualty(null);
    setActiveRescueCasualtyId(null);
    setScorecardReport(null);
    setIsScorecardOpen(false);

    setEvents([
      {
        id: `EVT-${Date.now()}`,
        timestampSec: 0,
        formattedTime: '00:00',
        title: 'MISSION RESET',
        type: 'ROUTING',
        description: 'Casualty triage roster and responder staging restored to standby.',
      },
    ]);
  };

  // Prioritize Specific Casualty Rescue
  const handlePrioritizeCasualty = (casualtyId: string) => {
    const target = casualties.find((c) => c.id === casualtyId);
    if (!target || target.extracted) return;

    setActiveRescueCasualtyId(casualtyId);
    setSelectedCasualty(target);

    if (missionPhase !== 'PLANNING') {
      addEvent('TACTICAL RE-PRIORITIZATION', `Response squad redirected to ${target.name} (${target.locationName}).`, 'RESCUE');
    }
  };

  // Master Simulation Timer Loop
  useEffect(() => {
    if (missionPhase === 'PLANNING' || missionPhase === 'MISSION_COMPLETE' || isPaused) return;

    const interval = setInterval(() => {
      setElapsedSec((prev) => {
        const nextTime = prev + 0.2;

        // Current Fire Suppression progress
        const suppressionProgress =
          selectedStrategy === 'SUPPRESS_FIRST'
            ? Math.min(1.0, nextTime / 35.0)
            : selectedStrategy === 'BALANCED_RESPONSE'
            ? Math.min(1.0, nextTime / 50.0)
            : Math.min(1.0, nextTime / 75.0);

        const fireIntensity = Math.max(0.1, 1.0 - suppressionProgress * 0.85);

        // Update Casualties Telemetry
        setCasualties((prevCasualties) => {
          let updated = updateCasualtiesFleet(
            prevCasualties,
            windDirectionDeg,
            windSpeedMs,
            fireIntensity,
            suppressionProgress,
            nextTime,
            activeRescueCasualtyId
          );

          // Advance active extraction progress
          if (activeRescueCasualtyId) {
            updated = updated.map((cas) => {
              if (cas.id === activeRescueCasualtyId && !cas.extracted) {
                const extractionSpeed = selectedStrategy === 'RESCUE_FIRST' ? 3.5 : 2.5;
                const newProgress = Math.min(100, cas.rescueProgressPct + extractionSpeed);

                if (newProgress >= 100) {
                  addEvent('CASUALTY SECURED', `${cas.name} extracted to safe triage area.`, 'SUCCESS');
                  return {
                    ...cas,
                    extracted: true,
                    status: 'RESCUED',
                    rescueProgressPct: 100,
                  };
                }
                return {
                  ...cas,
                  status: newProgress > 30 ? 'EVACUATING' : 'TRAPPED',
                  rescueProgressPct: newProgress,
                };
              }
              return cas;
            });
          }

          // Automatically shift to next unrescued casualty
          const activeCas = updated.find((c) => c.id === activeRescueCasualtyId);
          if (activeCas && activeCas.extracted) {
            const nextTarget =
              updated.find((c) => !c.extracted && c.priority === 'P1_CRITICAL') ||
              updated.find((c) => !c.extracted && c.priority === 'P2_URGENT') ||
              updated.find((c) => !c.extracted);

            if (nextTarget) {
              setActiveRescueCasualtyId(nextTarget.id);
              addEvent('NEXT TARGET ENGAGED', `Squad transitioning to ${nextTarget.name} (${nextTarget.locationName}).`, 'RESCUE');
            } else {
              setActiveRescueCasualtyId(null);
            }
          }

          // Check if all casualties rescued
          const allRescued = updated.every((c) => c.extracted);
          if (allRescued) {
            setMissionPhase('MISSION_COMPLETE');
            const score = evaluateMissionModeScore(
              selectedStrategy,
              updated.filter((c) => c.extracted).length,
              updated.length,
              nextTime,
              true
            );
            setScorecardReport(score);
            setIsScorecardOpen(true);
            addEvent('ALL CASUALTIES SECURED', `Mission complete in ${Math.round(nextTime)}s. Grade: ${score.grade}.`, 'SUCCESS');
          }

          return updated;
        });

        return nextTime;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [
    missionPhase,
    isPaused,
    windDirectionDeg,
    windSpeedMs,
    selectedStrategy,
    activeRescueCasualtyId,
    addEvent,
  ]);

  const activeMetrics = tradeoffs[selectedStrategy];
  const criticalCount = casualties.filter((c) => !c.extracted && c.priority === 'P1_CRITICAL').length;
  const rescuedCount = casualties.filter((c) => c.extracted).length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 font-mono text-gray-100 select-none overflow-hidden">
      {/* ── 1. TOP RESCUE MISSION COMMAND BAR ──────────────────────────────── */}
      <div className="bg-slate-950/90 backdrop-blur-xl border-b border-cyan-500/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950 border border-red-500/50 text-red-400">
              <HeartPulse className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>BLUEPRINT RESCUE MISSION COMMAND</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-gray-100 truncate">
                {schema.metadata.name} • {rescuedCount}/{casualties.length} Secured
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mission Timers & Strategy Switcher */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Strategy Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5 text-[10px]">
            {[
              { key: 'SUPPRESS_FIRST' as const, label: 'SUPPRESS FIRST', icon: Flame },
              { key: 'BALANCED_RESPONSE' as const, label: 'BALANCED (AI)', icon: ShieldAlert },
              { key: 'RESCUE_FIRST' as const, label: 'RESCUE FIRST', icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedStrategy(key)}
                disabled={missionPhase !== 'PLANNING'}
                className={`px-2 py-1 rounded font-bold transition-all flex items-center gap-1 ${
                  selectedStrategy === key
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Mission Timer */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[9px] text-gray-400">ELAPSED:</span>
            <span className="text-cyan-300 font-bold font-mono">{formatTime(elapsedSec)}</span>
          </div>

          {/* Secondary BLEVE Countdown */}
          <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-800/80 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[9px] text-red-300">BLEVE WINDOW:</span>
            <span className="text-red-400 font-bold font-mono">
              {Math.max(0, activeMetrics.timeToSecondaryBleveSec - Math.round(elapsedSec))}s
            </span>
          </div>

          {/* Start / Pause / Reset Mission Buttons */}
          {missionPhase === 'PLANNING' ? (
            <button
              onClick={handleStartMission}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-lg transition-all hover:scale-105"
            >
              <Play className="w-3.5 h-3.5" />
              <span>START RESCUE MISSION</span>
            </button>
          ) : missionPhase === 'MISSION_COMPLETE' ? (
            <button
              onClick={() => setIsScorecardOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg font-bold text-xs shadow-lg"
            >
              <Award className="w-3.5 h-3.5" />
              <span>VIEW DEBRIEF REPORT</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {isPaused ? (
                <button
                  onClick={handleStartMission}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                  title="Resume"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handlePauseMission}
                  className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleResetMission}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-lg text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>
        </div>

        {/* Right: Drawer Toggles */}
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
            className={`px-2 py-1 rounded font-bold border ${
              leftDrawerOpen ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900 text-cyan-300 border-slate-700'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            <span>ROSTER</span>
          </button>

          <button
            onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
            className={`px-2 py-1 rounded font-bold border ${
              rightDrawerOpen ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900 text-cyan-300 border-slate-700'
            }`}
          >
            <Compass className="w-3 h-3 inline mr-1" />
            <span>AI TACTICAL</span>
          </button>
        </div>
      </div>

      {/* ── 2. MAIN WORKSPACE VIEWPORT ────────────────────────────────────── */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Drawer: Casualty Triage Panel */}
        {leftDrawerOpen && (
          <div className="w-80 border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl z-20 flex flex-col p-2 overflow-y-auto animate-in slide-in-from-left duration-200">
            <CasualtyTriagePanel
              casualties={casualties}
              selectedCasualtyId={selectedCasualty?.id || null}
              onSelectCasualty={(cas) => {
                setSelectedCasualty(cas);
                handlePrioritizeCasualty(cas.id);
              }}
              onPrioritizeRescue={handlePrioritizeCasualty}
              isMissionRunning={missionPhase !== 'PLANNING' && missionPhase !== 'MISSION_COMPLETE'}
            />
          </div>
        )}

        {/* Center: Interactive 2D Blueprint Rescue Map */}
        <div className="flex-1 relative h-full">
          <BlueprintRescueCanvas
            blueprintImageUrl={blueprintImageUrl}
            schema={schema}
            casualties={casualties}
            selectedCasualtyId={selectedCasualty?.id || null}
            onSelectCasualty={(cas) => {
              setSelectedCasualty(cas);
              handlePrioritizeCasualty(cas.id);
            }}
            activeRescueCasualtyId={activeRescueCasualtyId}
            candidateRoutes={candidateRoutes}
            missionPhase={missionPhase}
            elapsedSec={elapsedSec}
            simulationResult={simulationResult}
          />
        </div>

        {/* Right Drawer: AI Route Explainability, Tactical Tradeoffs & Responder HUD */}
        {rightDrawerOpen && (
          <div className="w-84 border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl z-20 flex flex-col p-2 gap-2 overflow-y-auto animate-in slide-in-from-right duration-200">
            <ResponderSafetyHUD
              missionPhase={missionPhase}
              windSpeedMs={windSpeedMs}
              windDirDeg={windDirectionDeg}
            />

            <RouteExplainabilityPanel
              candidateRoutes={candidateRoutes}
              windDirDeg={windDirectionDeg}
            />

            <StrategyTradeoffPanel
              tradeoffs={tradeoffs}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={setSelectedStrategy}
              isMissionRunning={missionPhase !== 'PLANNING'}
            />
          </div>
        )}
      </div>

      {/* ── 3. BOTTOM CHRONOLOGICAL TIMELINE DOCK ──────────────────────────── */}
      <div className="border-t border-slate-800 bg-slate-950/90 z-20">
        <div className="flex items-center justify-between px-3 py-1 text-[10px] text-gray-400 border-b border-slate-900 cursor-pointer" onClick={() => setBottomLogOpen(!bottomLogOpen)}>
          <span className="font-bold text-cyan-400">MISSION INCIDENT TIMELINE ({events.length} EVENTS)</span>
          <span className="text-[9px] hover:text-cyan-300">{bottomLogOpen ? '▼ HIDE LOG' : '▲ EXPAND LOG'}</span>
        </div>
        {bottomLogOpen && (
          <div className="max-h-36 overflow-y-auto p-2">
            <MissionTimelineLog events={events} />
          </div>
        )}
      </div>

      {/* ── 4. MISSION DEBRIEF SCORECARD MODAL ─────────────────────────────── */}
      {scorecardReport && (
        <MissionDebriefModal
          isOpen={isScorecardOpen}
          onClose={() => setIsScorecardOpen(false)}
          onReplay={handleResetMission}
          onReset={handleResetMission}
          report={scorecardReport}
        />
      )}
    </div>
  );
};
