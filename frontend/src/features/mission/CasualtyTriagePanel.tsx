// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Casualty Triage & Personnel Priority Panel
// Real-time P1/P2/P3 roster with survivability countdowns & extraction status
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  Users,
  Flame,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
} from 'lucide-react';
import { MissionCasualty, CasualtyPriority } from '../../simulation/missionTypes';

interface CasualtyTriagePanelProps {
  casualties: MissionCasualty[];
  selectedCasualtyId: string | null;
  onSelectCasualty: (casualty: MissionCasualty) => void;
  onPrioritizeRescue: (casualtyId: string) => void;
  isMissionRunning: boolean;
}

const PRIORITY_STYLES: Record<CasualtyPriority, string> = {
  P1_CRITICAL: 'bg-red-950/80 text-red-300 border-red-700 animate-pulse',
  P2_URGENT: 'bg-orange-950/80 text-orange-300 border-orange-700',
  P3_STABLE: 'bg-yellow-950/80 text-yellow-300 border-yellow-700',
};

const STATUS_BADGES = {
  TRAPPED: 'bg-red-900/60 text-red-200 border-red-600',
  CRITICAL: 'bg-red-950 text-red-300 border-red-700 animate-pulse',
  INJURED: 'bg-orange-900/60 text-orange-200 border-orange-600',
  EXPOSED: 'bg-yellow-900/60 text-yellow-200 border-yellow-600',
  EVACUATING: 'bg-cyan-900/60 text-cyan-200 border-cyan-600',
  RESCUED: 'bg-emerald-900/80 text-emerald-200 border-emerald-500',
  SAFE: 'bg-emerald-950 text-emerald-300 border-emerald-600',
  LOST: 'bg-gray-900 text-gray-400 border-gray-700',
};

export const CasualtyTriagePanel: React.FC<CasualtyTriagePanelProps> = ({
  casualties,
  selectedCasualtyId,
  onSelectCasualty,
  onPrioritizeRescue,
  isMissionRunning,
}) => {
  const rescuedCount = casualties.filter((c) => c.extracted).length;
  const criticalCount = casualties.filter((c) => !c.extracted && c.priority === 'P1_CRITICAL').length;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 font-mono text-gray-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-950 border border-red-500/40 text-red-400">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
              CASUALTY TRIAGE ROSTER
            </div>
            <div className="text-xs font-bold text-gray-200">
              {rescuedCount}/{casualties.length} Personnel Secured • {criticalCount} Critical
            </div>
          </div>
        </div>
      </div>

      {/* Roster Cards */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {casualties.map((cas) => {
          const isSelected = selectedCasualtyId === cas.id;
          const windowPercent = Math.min(100, Math.max(0, (cas.survivabilityWindowSec / cas.initialWindowSec) * 100));

          return (
            <div
              key={cas.id}
              onClick={() => onSelectCasualty(cas)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-400 shadow-lg'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Line: ID, Name, Priority */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-cyan-400 font-bold">{cas.id}</span>
                  <span className="text-xs font-bold text-gray-200 truncate">{cas.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${
                      cas.extracted ? 'bg-emerald-950 text-emerald-300 border-emerald-600' : PRIORITY_STYLES[cas.priority]
                    }`}
                  >
                    {cas.extracted ? 'SECURED' : cas.priority.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${
                      STATUS_BADGES[cas.status]
                    }`}
                  >
                    {cas.status}
                  </span>
                </div>
              </div>

              {/* Location & Exposure */}
              <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                <span className="truncate max-w-[160px]">{cas.locationName}</span>
                <span className="text-amber-400 font-bold">{cas.exposureKwM2} kW/m² ({cas.distanceFromHazardM}m)</span>
              </div>

              {/* Survivability Window Bar */}
              {!cas.extracted ? (
                <div className="mt-1.5 space-y-0.5">
                  <div className="flex justify-between text-[9px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Survivability Window:
                    </span>
                    <strong
                      className={
                        cas.survivabilityWindowSec < 35
                          ? 'text-red-400 font-bold animate-pulse'
                          : 'text-amber-300'
                      }
                    >
                      {cas.survivabilityWindowSec}s remaining
                    </strong>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        cas.survivabilityWindowSec < 35
                          ? 'bg-red-500'
                          : cas.survivabilityWindowSec < 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${windowPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>CASUALTY EXTRACTED & TRIAGED</span>
                </div>
              )}

              {/* Action Button */}
              {isMissionRunning && !cas.extracted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrioritizeRescue(cas.id);
                  }}
                  className="mt-2 w-full py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded text-[9px] font-bold transition-all shadow"
                >
                  DISPATCH RESCUE TEAM → {cas.id}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
