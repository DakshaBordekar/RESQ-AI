// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Mission Event Timeline Log
// Live operational stream of incident detection, dispatch, extraction, and suppression
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Clock, ShieldAlert, CheckCircle2, Flame, AlertTriangle, Compass } from 'lucide-react';
import { MissionEventLog } from '../../simulation/missionTypes';

interface MissionTimelineLogProps {
  events: MissionEventLog[];
}

const TYPE_ICONS = {
  INCIDENT: Flame,
  ROUTING: Compass,
  RESCUE: CheckCircle2,
  SUPPRESSION: ShieldAlert,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
};

const TYPE_STYLES = {
  INCIDENT: 'text-red-400 border-red-800 bg-red-950/40',
  ROUTING: 'text-cyan-400 border-cyan-800 bg-cyan-950/40',
  RESCUE: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
  SUPPRESSION: 'text-blue-400 border-blue-800 bg-blue-950/40',
  WARNING: 'text-amber-400 border-amber-800 bg-amber-950/40',
  SUCCESS: 'text-emerald-300 border-emerald-600 bg-emerald-950/60',
};

export const MissionTimelineLog: React.FC<MissionTimelineLogProps> = ({ events }) => {
  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono text-gray-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px]">
          <Clock className="w-3.5 h-3.5" />
          <span>MISSION INCIDENT TIMELINE</span>
        </div>
        <span className="text-[9px] text-gray-500">{events.length} Events Logged</span>
      </div>

      {/* Events List */}
      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
        {events.map((evt) => {
          const Icon = TYPE_ICONS[evt.type] || Clock;
          const style = TYPE_STYLES[evt.type];

          return (
            <div
              key={evt.id}
              className={`p-1.5 rounded border flex items-start gap-2 text-[10px] ${style}`}
            >
              <span className="text-[9px] font-bold opacity-80 shrink-0 mt-0.5">
                {evt.formattedTime}
              </span>
              <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold text-gray-200">{evt.title}</div>
                <div className="text-[9px] opacity-80 leading-tight text-gray-300">
                  {evt.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
