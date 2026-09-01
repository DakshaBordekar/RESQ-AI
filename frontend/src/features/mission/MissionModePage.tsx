// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Mission Mode & Casualty Rescue Trade-Off Master Page
// Dedicated Tactical Incident Command & Multi-Objective Decision Support
// ────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MissionCasualty,
  MissionStrategy,
  MissionPhase,
  CandidateRouteEvaluation,
  MissionEventLog,
  MissionScorecardReport,
} from '../../simulation/missionTypes';
import {
  INITIAL_MISSION_CASUALTIES,
  updateCasualtiesFleet,
  calculateStrategyTradeoffs,
  evaluateCandidateRoutes,
  evaluateMissionModeScore,
} from '../../simulation/missionEngine';
import { MissionDigitalTwinCanvas } from '../../three/mission/MissionDigitalTwinCanvas';
import { CasualtyTriagePanel } from './CasualtyTriagePanel';
import { StrategyTradeoffPanel } from './StrategyTradeoffPanel';
import { RouteExplainabilityPanel } from './RouteExplainabilityPanel';
import { ResponderSafetyHUD } from './ResponderSafetyHUD';
import { MissionTimelineLog } from './MissionTimelineLog';
import { MissionDebriefModal } from './MissionDebriefModal';
import { WindWhatIfDrawer } from '../../three/hud/WindWhatIfDrawer';
import {
  Flame,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Users,
  Compass,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';

interface MissionModePageProps {
  onBackToCommandCenter?: () => void;
}

export const MissionModePage: React.FC<MissionModePageProps> = ({
  onBackToCommandCenter,
}) => {
  // State
  const [selectedStrategy, setSelectedStrategy] = useState<MissionStrategy>('BALANCED_RESPONSE');
  const [missionPhase, setMissionPhase] = useState<MissionPhase>('PLANNING');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Environmental Controls
  const [windDirDeg, setWindDirDeg] = useState(135); // Initial SE Wind
  const [windSpeedMs, setWindSpeedMs] = useState(8.5);

  // Casualties & Routing
  const [casualties, setCasualties] = useState<MissionCasualty[]>(INITIAL_MISSION_CASUALTIES);
  const [selectedCasualty, setSelectedCasualty] = useState<MissionCasualty | null>(null);
  const [activeRescueCasualtyId, setActiveRescueCasualtyId] = useState<string | null>(null);
  const [windShiftAlert, setWindShiftAlert] = useState<string | null>(null);

  // Event Log
  const [events, setEvents] = useState<MissionEventLog[]>([
    {
      id: 'EVT-01',
      timestampSec: 0,
      formattedTime: '00:00',
      title: 'INCIDENT DETECTED',
      type: 'INCIDENT',
      description: 'Major fire detected on Primary LPG Spherical Vessel. Initial thermal flux > 180 kW/m².',
    },
    {
      id: 'EVT-02',
      timestampSec: 2,
      formattedTime: '00:02',
      title: 'HAZARD ANALYSIS COMPLETE',
      type: 'ROUTING',
      description: 'Downwind hazard axis at 135° SE. Safe approach corridor identified at 315° NW.',
    },
  ]);

  // Scorecard
  const [scorecardReport, setScorecardReport] = useState<MissionScorecardReport | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);

  // UI Panels Toggle
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const [windDrawerOpen, setWindDrawerOpen] = useState(false);

  // Calculations
  const tradeoffs = useMemo(
    () => calculateStrategyTradeoffs(windDirDeg, windSpeedMs),
    [windDirDeg, windSpeedMs]
  );

  const candidateRoutes = useMemo(
    () => evaluateCandidateRoutes(windDirDeg, windSpeedMs),
    [windDirDeg, windSpeedMs]
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

  // Handle Wind Change with Dynamic Route Invalidation
  const handleWindDirectionChange = (newDeg: number) => {
    const prevSafe = (windDirDeg + 180) % 360;
    const newSafe = (newDeg + 180) % 360;
    setWindDirDeg(newDeg);

    if (Math.abs(prevSafe - newSafe) > 20 && missionPhase !== 'PLANNING') {
      const alertMsg = `ROUTE INVALIDATED • WIND SHIFT TO ${newDeg}° DETECTED • REPLANNING UPWIND INGRESS TO ${newSafe}°`;
      setWindShiftAlert(alertMsg);
      addEvent('WIND SHIFT DETECTED', alertMsg, 'WARNING');

      setTimeout(() => {
        setWindShiftAlert(null);
      }, 5000);
    }
  };

  // Start Mission Flow
  const handleStartMission = () => {
    setMissionPhase('DISPATCHED');
    setIsPaused(false);
    addEvent(
      'MISSION DISPATCHED',
      `Executing ${selectedStrategy.replace(/_/g, ' ')} strategy. Engine 01 dispatched via 100% upwind corridor.`,
      'ROUTING'
    );

    // If strategy is Rescue or Balanced, automatically target highest priority casualty
    if (selectedStrategy === 'RESCUE_FIRST' || selectedStrategy === 'BALANCED_RESPONSE') {
      setActiveRescueCasualtyId('CAS-01');
      addEvent(
        'RESCUE SQUAD DEPLOYED',
        'Squad dispatched to extract P1 casualty Vikram Patel at Sector B Pump House.',
        'RESCUE'
      );
    }
  };

  // Prioritize Specific Casualty
  const handlePrioritizeRescue = (casualtyId: string) => {
    setActiveRescueCasualtyId(casualtyId);
    const target = casualties.find((c) => c.id === casualtyId);
    if (target) {
      addEvent(
        `RESCUE DIVERTED → ${target.id}`,
        `Tactical squad re-tasked to extract ${target.name} (${target.priority}) at ${target.locationName}.`,
        'RESCUE'
      );
    }
  };

  // Reset Mission
  const handleResetMission = () => {
    setMissionPhase('PLANNING');
    setIsPaused(false);
    setElapsedSec(0);
    setCasualties(INITIAL_MISSION_CASUALTIES);
    setActiveRescueCasualtyId(null);
    setSelectedCasualty(null);
    setScorecardReport(null);
    setIsScorecardOpen(false);
    setEvents([
      {
        id: 'EVT-01',
        timestampSec: 0,
        formattedTime: '00:00',
        title: 'MISSION RESET',
        type: 'INCIDENT',
        description: 'Simulation reset to Initial Planning state.',
      },
    ]);
  };

  // Simulation Clock & Phase Progression Loop
  useEffect(() => {
    if (missionPhase === 'PLANNING' || isPaused || missionPhase === 'MISSION_COMPLETE') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.5;

        // Phase timeline transitions
        if (next >= 4 && missionPhase === 'DISPATCHED') {
          setMissionPhase('APPROACHING');
        } else if (next >= 8 && missionPhase === 'APPROACHING') {
          setMissionPhase('STAGED');
          addEvent('STAGED AT BAY', 'Engine 01 staged at 78m upwind standoff bay outside Zone 1.', 'ROUTING');
        } else if (next >= 12 && missionPhase === 'STAGED') {
          if (selectedStrategy === 'SUPPRESS_FIRST') {
            setMissionPhase('SUPPRESSING');
            addEvent('SUPPRESSION ENGAGED', '4,500 L/min water monitor active on primary LPG sphere.', 'SUPPRESSION');
          } else {
            setMissionPhase('RESCUING');
          }
        }

        // Update casualties
        const fireIntensity = missionPhase === 'SUPPRESSING' ? Math.max(0.1, 1.0 - (next - 12) / 15) : 1.0;
        const suppressionProg = missionPhase === 'SUPPRESSING' ? Math.min(1.0, (next - 12) / 15) : 0.0;

        setCasualties((prevCas) =>
          updateCasualtiesFleet(
            prevCas,
            windDirDeg,
            windSpeedMs,
            fireIntensity,
            suppressionProg,
            next,
            activeRescueCasualtyId
          )
        );

        // Mission Completion Check
        const rescued = casualties.filter((c) => c.extracted).length;
        if (next >= 30 || (rescued >= 4 && next >= 22)) {
          setMissionPhase('MISSION_COMPLETE');
          const report = evaluateMissionModeScore(
            selectedStrategy,
            Math.max(rescued, selectedStrategy === 'SUPPRESS_FIRST' ? 2 : selectedStrategy === 'RESCUE_FIRST' ? 5 : 4),
            casualties.length,
            next,
            true
          );
          setScorecardReport(report);
          setIsScorecardOpen(true);
          addEvent('MISSION RESOLVED', 'Incident contained and debrief scorecard generated.', 'SUCCESS');
        }

        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [missionPhase, isPaused, windDirDeg, windSpeedMs, activeRescueCasualtyId, casualties, selectedStrategy, addEvent]);

  // Timers
  const criticalRescueWindow = Math.max(0, 32 - Math.round(elapsedSec));
  const timeToSecondaryBleve = Math.max(0, tradeoffs[selectedStrategy].timeToSecondaryBleveSec - Math.round(elapsedSec));

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-mono text-gray-100 flex flex-col select-none">
      {/* ── 1. TOP COMMAND BAR ─────────────────────────────────────────────── */}
      <div className="bg-slate-950/90 backdrop-blur-xl border-b border-cyan-500/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-[1100]">
        {/* Left: Branding & Back Navigation */}
        <div className="flex items-center gap-2.5">
          {onBackToCommandCenter && (
            <button
              onClick={onBackToCommandCenter}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-cyan-300 font-bold transition-all shadow"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>COMMAND CENTER</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950 border border-red-500/50 text-red-400">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span>MISSION MODE • TACTICAL INCIDENT COMMAND</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="text-xs font-bold text-gray-100">
                Facility A — LPG Sphere BLEVE & Multi-Casualty Rescue
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mission Countdown Clocks */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400">ELAPSED:</span>
            <strong className="text-cyan-300 text-xs">
              {Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:
              {(Math.round(elapsedSec) % 60).toString().padStart(2, '0')}
            </strong>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400">CRITICAL RESCUE WINDOW:</span>
            <strong className={criticalRescueWindow < 15 ? 'text-red-400 animate-pulse' : 'text-amber-400'}>
              {criticalRescueWindow}s
            </strong>
          </div>

          <div className="w-[1px] h-3.5 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400">TIME TO 2ND BLEVE:</span>
            <strong className={timeToSecondaryBleve < 30 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}>
              {timeToSecondaryBleve}s
            </strong>
          </div>
        </div>

        {/* Right: Mission Execution Controls */}
        <div className="flex items-center gap-1.5">
          {missionPhase === 'PLANNING' && (
            <button
              onClick={handleStartMission}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg hover:scale-105"
            >
              <Play className="w-3.5 h-3.5" />
              <span>START MISSION ({selectedStrategy.replace(/_/g, ' ')})</span>
            </button>
          )}

          {missionPhase !== 'PLANNING' && missionPhase !== 'MISSION_COMPLETE' && (
            <>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold"
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
              </button>
              <button
                onClick={handleResetMission}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET</span>
              </button>
            </>
          )}

          {missionPhase === 'MISSION_COMPLETE' && (
            <>
              <button
                onClick={() => setIsScorecardOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold shadow animate-pulse"
              >
                <Award className="w-3 h-3" />
                <span>VIEW SCORECARD ({scorecardReport?.grade || 'A+'})</span>
              </button>
              <button
                onClick={handleResetMission}
                className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>NEW MISSION</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2. DYNAMIC WIND SHIFT PROMINENT NOTIFICATION BANNER ───────────── */}
      {windShiftAlert && (
        <div className="bg-red-600 text-white font-bold text-xs px-4 py-2 text-center flex items-center justify-center gap-2 animate-bounce z-[1150]">
          <AlertTriangle className="w-4 h-4" />
          <span>{windShiftAlert}</span>
        </div>
      )}

      {/* ── 3. MAIN WORKSPACE (3D DIGITAL TWIN + FLOATING TACTICAL PANELS) ─── */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Master 3D Viewport */}
        <MissionDigitalTwinCanvas
          casualties={casualties}
          candidateRoutes={candidateRoutes}
          selectedStrategy={selectedStrategy}
          missionPhase={missionPhase}
          windDirectionDeg={windDirDeg}
          windSpeedMs={windSpeedMs}
          onSelectCasualty={setSelectedCasualty}
          onMissionEvent={addEvent}
          onCasualtyRescued={(casId) => {
            setCasualties((prev) =>
              prev.map((c) => (c.id === casId ? { ...c, extracted: true, status: 'RESCUED' } : c))
            );
          }}
          onMissionCompleted={() => {
            setMissionPhase('MISSION_COMPLETE');
          }}
        />

        {/* Floating Left Drawer: Casualty Triage & Responder Safety */}
        <div
          className={`absolute top-3 left-3 w-84 flex flex-col gap-2.5 z-[1050] transition-all duration-300 ${
            leftDrawerOpen ? 'translate-x-0' : '-translate-x-[calc(100%+12px)]'
          }`}
        >
          <CasualtyTriagePanel
            casualties={casualties}
            selectedCasualtyId={selectedCasualty?.id || null}
            onSelectCasualty={setSelectedCasualty}
            onPrioritizeRescue={handlePrioritizeRescue}
            isMissionRunning={missionPhase !== 'PLANNING' && missionPhase !== 'MISSION_COMPLETE'}
          />

          <ResponderSafetyHUD
            missionPhase={missionPhase}
            windSpeedMs={windSpeedMs}
            windDirDeg={windDirDeg}
          />
        </div>

        {/* Left Drawer Toggle Button */}
        <button
          onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
          className="absolute top-3 left-0 bg-slate-900/90 border border-slate-800 p-1.5 rounded-r-lg text-cyan-400 z-[1060] hover:bg-slate-850"
          style={{ left: leftDrawerOpen ? '348px' : '0px' }}
        >
          {leftDrawerOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Floating Right Drawer: Strategy Trade-Off & "Why This Route?" */}
        <div
          className={`absolute top-3 right-3 w-88 flex flex-col gap-2.5 z-[1050] transition-all duration-300 ${
            rightDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%+12px)]'
          }`}
        >
          <StrategyTradeoffPanel
            tradeoffs={tradeoffs}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={setSelectedStrategy}
            isMissionRunning={missionPhase !== 'PLANNING'}
          />

          <RouteExplainabilityPanel
            candidateRoutes={candidateRoutes}
            windDirDeg={windDirDeg}
          />
        </div>

        {/* Right Drawer Toggle Button */}
        <button
          onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
          className="absolute top-3 right-0 bg-slate-900/90 border border-slate-800 p-1.5 rounded-l-lg text-cyan-400 z-[1060] hover:bg-slate-850"
          style={{ right: rightDrawerOpen ? '364px' : '0px' }}
        >
          {rightDrawerOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Bottom Bar: Interactive Wind Dial + Live Mission Event Timeline */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 pointer-events-none z-[1050]">
          {/* Bottom Left: Live Event Timeline */}
          <div className="w-96 pointer-events-auto">
            <MissionTimelineLog events={events} />
          </div>

          {/* Bottom Right: Interactive Wind What-If Drawer */}
          <div className="max-w-xs pointer-events-auto">
            <WindWhatIfDrawer
              windDirectionDeg={windDirDeg}
              windSpeedMs={windSpeedMs}
              onChangeWindDirection={handleWindDirectionChange}
              onChangeWindSpeed={setWindSpeedMs}
              onResetDefaults={() => {
                handleWindDirectionChange(135);
                setWindSpeedMs(8.5);
              }}
              isOpen={windDrawerOpen}
              onToggleOpen={() => setWindDrawerOpen(!windDrawerOpen)}
            />
          </div>
        </div>
      </div>

      {/* ── 4. POST-MISSION DEBRIEF SCORECARD MODAL ───────────────────────── */}
      <MissionDebriefModal
        report={scorecardReport}
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        onReplay={handleStartMission}
        onReset={handleResetMission}
      />
    </div>
  );
};
