// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Live Responder Safety & Tactical Standoff HUD
// Real-time responder exposure monitoring, PPE recommendation, and safety margin
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { ShieldCheck, Activity, Flame, ShieldAlert, Heart, HardHat } from 'lucide-react';
import { MissionPhase } from '../../simulation/missionTypes';

interface ResponderSafetyHUDProps {
  missionPhase: MissionPhase;
  windSpeedMs: number;
  windDirDeg: number;
}

export const ResponderSafetyHUD: React.FC<ResponderSafetyHUDProps> = ({
  missionPhase,
  windSpeedMs,
  windDirDeg,
}) => {
  const isEnRoute = missionPhase !== 'PLANNING';

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 flex flex-col gap-2 font-mono text-gray-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-950 border border-blue-500/40 text-blue-400">
            <HardHat className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
              RESPONDER LIFE-SAFETY TELEMETRY
            </div>
            <div className="text-xs font-bold text-gray-200">
              Primary Ingress Squad • Engine 01
            </div>
          </div>
        </div>
        <span
          className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${
            isEnRoute
              ? 'bg-emerald-950 text-emerald-300 border-emerald-600 animate-pulse'
              : 'bg-slate-800 text-gray-400 border-slate-700'
          }`}
        >
          {isEnRoute ? 'TACTICAL ACTIVE' : 'STAGED STANDBY'}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">THERMAL EXPOSURE</div>
          <div className="text-emerald-400 font-bold text-xs mt-0.5">3.2 kW/m²</div>
          <div className="text-[8px] text-emerald-300/80">Below 4.0 kW/m² threshold</div>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">BLAST OVERPRESSURE</div>
          <div className="text-cyan-300 font-bold text-xs mt-0.5">&lt; 0.02 bar</div>
          <div className="text-[8px] text-cyan-300/80">Outside lethal envelope</div>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">TACTICAL STANDOFF</div>
          <div className="text-cyan-300 font-bold text-xs mt-0.5">78m Staging Bay</div>
          <div className="text-[8px] text-gray-400">Outside Zone 1 hazard</div>
        </div>

        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">PPE COMPLIANCE</div>
          <div className="text-amber-400 font-bold text-xs mt-0.5">Category 4 Turnout</div>
          <div className="text-[8px] text-amber-300/80">Positive-Pressure SCBA</div>
        </div>
      </div>
    </div>
  );
};
