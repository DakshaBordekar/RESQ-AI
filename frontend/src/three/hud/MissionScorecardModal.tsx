// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Automated Emergency Response & Life-Safety Scorecard Modal (F05)
// Displays post-incident debrief, metric breakdown, and tactical Grade (A+ to F)
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Flame,
  Activity,
  X,
} from 'lucide-react';
import { MissionScorecard } from '../../simulation/types';

interface MissionScorecardModalProps {
  scorecard: MissionScorecard | null;
  isOpen: boolean;
  onClose: () => void;
  onReplay: () => void;
  onReset: () => void;
}

const GRADE_COLOR_STYLE = {
  'A+': 'text-emerald-400 border-emerald-500 bg-emerald-950/80',
  A: 'text-emerald-400 border-emerald-500 bg-emerald-950/80',
  'B+': 'text-cyan-400 border-cyan-500 bg-cyan-950/80',
  B: 'text-cyan-400 border-cyan-500 bg-cyan-950/80',
  C: 'text-yellow-400 border-yellow-500 bg-yellow-950/80',
  D: 'text-orange-400 border-orange-500 bg-orange-950/80',
  F: 'text-red-400 border-red-500 bg-red-950/80',
};

export const MissionScorecardModal: React.FC<MissionScorecardModalProps> = ({
  scorecard,
  isOpen,
  onClose,
  onReplay,
  onReset,
}) => {
  if (!isOpen || !scorecard) return null;

  const isSuccess = scorecard.outcome === 'MISSION_SUCCESS';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-mono text-gray-100 animate-in fade-in duration-200 pointer-events-auto">
      <div className="bg-slate-900 border border-cyan-500/60 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Award className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              DER-02 POST-INCIDENT DEBRIEF
            </div>
            <div className="text-lg font-bold text-gray-100">
              Tactical Mission Performance Scorecard
            </div>
          </div>
        </div>

        {/* Grade Banner */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
          <div className="space-y-1">
            <div className="text-[10px] text-gray-400 uppercase">MISSION OUTCOME</div>
            <div
              className={`text-base font-bold flex items-center gap-1.5 ${
                isSuccess ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span>{scorecard.outcome.replace(/_/g, ' ')}</span>
            </div>
            <div className="text-[10px] text-gray-400">
              Evaluation Time: {scorecard.executionTimestamp}
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border-2 flex flex-col items-center justify-center shadow-lg ${
              GRADE_COLOR_STYLE[scorecard.grade]
            }`}
          >
            <span className="text-[9px] font-bold uppercase">TACTICAL GRADE</span>
            <span className="text-3xl font-extrabold">{scorecard.grade}</span>
            <span className="text-[9px] font-bold">{scorecard.overallScore}/100</span>
          </div>
        </div>

        {/* 6 Metric Breakdown Bars */}
        <div className="space-y-2 text-xs">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            PERFORMANCE CRITERIA BREAKDOWN
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* 1. Safe Corridor */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Safe Corridor Ingress (25%)</span>
                <span className="text-emerald-400 font-bold">{scorecard.corridorScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${scorecard.corridorScore}%` }} />
              </div>
            </div>

            {/* 2. Suppression */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Suppression Effectiveness (20%)</span>
                <span className="text-cyan-400 font-bold">{scorecard.suppressionScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${scorecard.suppressionScore}%` }} />
              </div>
            </div>

            {/* 3. Response Time */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Response Speed (20%)</span>
                <span className="text-cyan-400 font-bold">{scorecard.responseScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${scorecard.responseScore}%` }} />
              </div>
            </div>

            {/* 4. Secondary Protection */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Cascading Risk Prevented (15%)</span>
                <span className="text-emerald-400 font-bold">{scorecard.secondaryProtectionScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${scorecard.secondaryProtectionScore}%` }} />
              </div>
            </div>

            {/* 5. Staging Compliance */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Standoff Compliance (15%)</span>
                <span className="text-cyan-400 font-bold">{scorecard.stagingScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${scorecard.stagingScore}%` }} />
              </div>
            </div>

            {/* 6. Critical Assets Protected */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Facility Assets Secured (5%)</span>
                <span className="text-emerald-400 font-bold">{scorecard.assetProtectionScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${scorecard.assetProtectionScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Summary */}
        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-gray-300 leading-relaxed">
          {scorecard.summaryFeedback}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              onClose();
              onReset();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET SCENE</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onReplay();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>REPLAY MISSION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
