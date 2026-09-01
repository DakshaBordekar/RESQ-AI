// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 AI Tactical Decision Support & Explainability HUD Card (F02)
// Structured natural-language operational rationales and NFPA / TNO citations
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  ShieldAlert,
  Compass,
  Flame,
  CheckCircle2,
  HelpCircle,
  X,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';
import { TacticalExplainabilityReport } from '../../simulation/types';

interface ExplainabilityCardProps {
  report: TacticalExplainabilityReport;
  isOpen: boolean;
  onClose: () => void;
}

export const ExplainabilityCard: React.FC<ExplainabilityCardProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-[88px] right-3 w-96 max-h-[82vh] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-xl shadow-2xl p-3.5 flex flex-col gap-3 font-mono text-gray-100 z-[1100] pointer-events-auto overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              AI TACTICAL DECISION SUPPORT
            </div>
            <div className="text-xs font-bold text-gray-200">
              Operational Ingress Rationale
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Key Tactical Metrics Summary */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-gray-500 text-[9px]">PRIMARY HAZARD</div>
          <div className="text-red-400 font-bold text-xs truncate">{report.primaryHazard}</div>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-gray-500 text-[9px]">{report.peakMetricLabel}</div>
          <div className="text-amber-400 font-bold text-xs truncate">{report.peakMetricValue}</div>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-gray-500 text-[9px]">RECOMMENDED INGRESS</div>
          <div className="text-emerald-400 font-bold text-xs">
            {report.safeHeadingDeg}° ({report.safeCardinal})
          </div>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-gray-500 text-[9px]">TACTICAL STANDOFF</div>
          <div className="text-cyan-300 font-bold text-xs">{report.stagingDistanceM}m (Safe Bay)</div>
        </div>
      </div>

      {/* Domain Rationale 1: Ingress Route Selection */}
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px]">
          <Compass className="w-3.5 h-3.5" />
          <span>CORRIDOR SELECTION JUSTIFICATION</span>
        </div>
        <p className="text-[10px] text-gray-300 leading-relaxed">
          {report.ingressRationale}
        </p>
      </div>

      {/* Domain Rationale 2: Standoff Distance Compliance */}
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px]">
          <Activity className="w-3.5 h-3.5" />
          <span>TACTICAL STANDOFF MARGIN</span>
        </div>
        <p className="text-[10px] text-gray-300 leading-relaxed">
          {report.standoffRationale}
        </p>
      </div>

      {/* Domain Rationale 3: Thermal Quenching Flow */}
      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
        <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[10px]">
          <Flame className="w-3.5 h-3.5" />
          <span>SUPPRESSION FLOW SPECIFICATION</span>
        </div>
        <p className="text-[10px] text-gray-300 leading-relaxed">
          {report.coolingRationale}
        </p>
      </div>

      {/* Regulatory Standard Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[9px] text-gray-400">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-cyan-400" />
          <span className="truncate max-w-[240px]">{report.regulatoryStandard}</span>
        </div>
        <span className="text-emerald-400 font-bold">Confidence {report.confidenceScorePct}%</span>
      </div>
    </div>
  );
};
