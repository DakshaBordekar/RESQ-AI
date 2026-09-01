// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Industrial Asset Health & Inspection Modal (F04)
// Compact real-time asset telemetry card for clicked equipment
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { X, ShieldAlert, Activity, Flame, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AssetRiskProfile } from '../../simulation/types';

interface AssetInspectionModalProps {
  asset: AssetRiskProfile | null;
  onClose: () => void;
}

const RISK_BADGE_STYLE = {
  CRITICAL: 'bg-red-950 text-red-300 border-red-700 animate-pulse',
  HIGH: 'bg-orange-950 text-orange-300 border-orange-700',
  ELEVATED: 'bg-yellow-950 text-yellow-300 border-yellow-700',
  LOW: 'bg-cyan-950 text-cyan-300 border-cyan-700',
  SAFE: 'bg-emerald-950 text-emerald-300 border-emerald-700',
};

export const AssetInspectionModal: React.FC<AssetInspectionModalProps> = ({
  asset,
  onClose,
}) => {
  if (!asset) return null;

  return (
    <div className="absolute top-20 left-3 w-80 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 font-mono text-gray-100 z-[1100] pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-cyan-400 font-bold uppercase">{asset.id}</div>
            <div className="text-xs font-bold text-gray-200 truncate max-w-[200px]">{asset.name}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary Status Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">RISK STATUS</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                RISK_BADGE_STYLE[asset.riskState]
              }`}
            >
              {asset.riskState}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">THERMAL FLUX</div>
          <div className="text-amber-400 font-bold text-xs mt-0.5">
            {asset.thermalFluxKwM2} kW/m²
          </div>
        </div>

        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">DISTANCE / BEARING</div>
          <div className="text-cyan-300 font-bold text-xs mt-0.5">
            {asset.distanceM}m ({asset.bearingDeg}°)
          </div>
        </div>

        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
          <div className="text-gray-500 text-[8px]">TIME TO CRITICAL</div>
          <div className="text-xs font-bold mt-0.5 flex items-center gap-1">
            {asset.timeToCriticalSec !== null ? (
              <span className={asset.timeToCriticalSec < 30 ? 'text-red-400 animate-pulse' : 'text-orange-400'}>
                {asset.timeToCriticalSec}s
              </span>
            ) : (
              <span className="text-emerald-400">SAFE</span>
            )}
          </div>
        </div>
      </div>

      {/* Cooling & Integrity Bar */}
      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">STRUCTURAL INTEGRITY</span>
          <span className="text-emerald-400 font-bold">{asset.structuralIntegrityPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              asset.structuralIntegrityPct > 85 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${asset.structuralIntegrityPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-[9px]">
          <span className="text-gray-400">COOLING STATUS:</span>
          <span
            className={`font-bold ${
              asset.coolingStatus === 'QUENCHED'
                ? 'text-emerald-400'
                : asset.coolingStatus === 'COOLING_ENGAGED'
                ? 'text-cyan-400 animate-pulse'
                : 'text-gray-400'
            }`}
          >
            {asset.coolingStatus.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};
