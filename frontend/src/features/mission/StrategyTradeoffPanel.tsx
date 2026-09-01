// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Mission Strategy & Tactical Trade-Off Panel
// Interactive selector for Suppress First vs Rescue First vs Balanced Response
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  Flame,
  Users,
  ShieldAlert,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { MissionStrategy, StrategyTradeoffMetrics } from '../../simulation/missionTypes';

interface StrategyTradeoffPanelProps {
  tradeoffs: Record<MissionStrategy, StrategyTradeoffMetrics>;
  selectedStrategy: MissionStrategy;
  onSelectStrategy: (strategy: MissionStrategy) => void;
  isMissionRunning: boolean;
}

export const StrategyTradeoffPanel: React.FC<StrategyTradeoffPanelProps> = ({
  tradeoffs,
  selectedStrategy,
  onSelectStrategy,
  isMissionRunning,
}) => {
  const activeMetrics = tradeoffs[selectedStrategy];

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 flex flex-col gap-3 font-mono text-gray-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
              TACTICAL OBJECTIVE & TRADE-OFF
            </div>
            <div className="text-xs font-bold text-gray-200">
              Operational Strategy Selection
            </div>
          </div>
        </div>
      </div>

      {/* 3-Way Strategy Switcher */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
        {[
          { key: 'SUPPRESS_FIRST' as const, label: 'SUPPRESS FIRST', icon: Flame },
          { key: 'BALANCED_RESPONSE' as const, label: 'BALANCED (AI)', icon: Scale },
          { key: 'RESCUE_FIRST' as const, label: 'RESCUE FIRST', icon: Users },
        ].map(({ key, label, icon: Icon }) => {
          const isSelected = selectedStrategy === key;
          return (
            <button
              key={key}
              disabled={isMissionRunning}
              onClick={() => onSelectStrategy(key)}
              className={`flex flex-col items-center justify-center p-2 rounded-md transition-all text-center gap-1 ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-900 disabled:opacity-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[9px] leading-tight font-bold">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Strategy Details & Comparative Trade-Off Bars */}
      <div className="space-y-2 text-xs">
        <div className="text-[10px] text-gray-300 font-bold leading-tight">
          {activeMetrics.title}
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          {activeMetrics.tagline}
        </p>

        {/* 4 Trade-Off Progress Bars */}
        <div className="space-y-1.5 pt-1 text-[10px]">
          {/* 1. Hazard Containment */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-gray-400">
              <span>Primary Hazard Containment:</span>
              <strong className="text-cyan-400">{activeMetrics.hazardContainmentPct}%</strong>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${activeMetrics.hazardContainmentPct}%` }}
              />
            </div>
          </div>

          {/* 2. Casualties Rescued */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-gray-400">
              <span>Casualties Secured:</span>
              <strong className="text-emerald-400">
                {activeMetrics.casualtiesRescuedCount} / {activeMetrics.totalCasualtiesCount}
              </strong>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(activeMetrics.casualtiesRescuedCount / activeMetrics.totalCasualtiesCount) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 3. Responder Risk */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-gray-400">
              <span>Responder Exposure Risk:</span>
              <strong
                className={
                  activeMetrics.responderRiskLevel === 'LOW'
                    ? 'text-emerald-400'
                    : activeMetrics.responderRiskLevel === 'MEDIUM'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }
              >
                {activeMetrics.responderRiskLevel}
              </strong>
            </div>
          </div>

          {/* 4. Secondary Equipment Risk */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-gray-400">
              <span>Cascading Equipment Risk:</span>
              <strong
                className={
                  activeMetrics.secondaryEquipmentRisk === 'LOW'
                    ? 'text-emerald-400'
                    : 'text-red-400 font-bold'
                }
              >
                {activeMetrics.secondaryEquipmentRisk}
              </strong>
            </div>
          </div>
        </div>

        {/* Advantage & Vulnerability Callouts */}
        <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1 text-[9px]">
          <div className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>ADVANTAGE: {activeMetrics.tacticalAdvantage}</span>
          </div>
          <div className="text-amber-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>VULNERABILITY: {activeMetrics.tacticalVulnerability}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
