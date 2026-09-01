// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 "Why This Route?" Tactical Ingress Explainability Panel
// Displays optimal upwind selection and detailed rejection rationale for alternatives
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  Compass,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Flame,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { CandidateRouteEvaluation } from '../../simulation/missionTypes';

interface RouteExplainabilityPanelProps {
  candidateRoutes: CandidateRouteEvaluation[];
  windDirDeg: number;
}

export const RouteExplainabilityPanel: React.FC<RouteExplainabilityPanelProps> = ({
  candidateRoutes,
  windDirDeg,
}) => {
  const recommendedRoute = candidateRoutes.find((r) => r.status === 'RECOMMENDED');
  const rejectedRoutes = candidateRoutes.filter((r) => r.status === 'REJECTED');

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 font-mono text-gray-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] text-sky-400 font-bold uppercase tracking-wider">
              INGRESS VECTOR EVALUATION
            </div>
            <div className="text-xs font-bold text-gray-200">
              Upwind Optimization &amp; Disqualifications
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Route Card */}
      {recommendedRoute && (
        <div className="bg-emerald-950/50 border border-emerald-500/70 rounded-lg p-2.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>LOWER MODELED EXPOSURE: {recommendedRoute.gateName}</span>
            </div>
            <span className="text-[9px] bg-emerald-900/90 text-emerald-200 border border-emerald-600/60 px-1.5 py-0.5 rounded font-bold font-mono">
              {recommendedRoute.headingDeg}° ({recommendedRoute.cardinal})
            </span>
          </div>

          <p className="text-[10px] text-emerald-200/90 leading-relaxed font-sans">
            {recommendedRoute.recommendationRationale}
          </p>

          <div className="grid grid-cols-2 gap-1 text-[9px] pt-0.5 font-mono">
            <div className="bg-slate-950/70 p-1.5 rounded border border-emerald-900/60">
              <span className="text-gray-400 block text-[8px]">LETHAL ZONE PENETRATION:</span>
              <strong className="text-emerald-400 block text-xs font-bold">0% (Upwind Corridor)</strong>
            </div>
            <div className="bg-slate-950/70 p-1.5 rounded border border-emerald-900/60">
              <span className="text-gray-400 block text-[8px]">PEAK THERMAL FLUX:</span>
              <strong className="text-cyan-300 block text-xs font-bold">{recommendedRoute.peakThermalExposureKwM2} kW/m²</strong>
            </div>
          </div>
        </div>
      )}

      {/* Rejected Candidate Routes */}
      <div className="space-y-1.5">
        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
          DISQUALIFIED INGRESS ACCESS GATES
        </div>

        {rejectedRoutes.map((route) => (
          <div
            key={route.gateId}
            className="bg-slate-950/80 border border-red-900/40 rounded-lg p-2 space-y-1 text-[10px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-red-400 font-bold">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{route.gateName} ({route.headingDeg}°)</span>
              </div>
              <span className="text-[8px] bg-red-950 text-red-300 border border-red-800 px-1 py-0.2 rounded font-bold">
                REJECTED
              </span>
            </div>

            <p className="text-[9px] text-gray-300 leading-relaxed">
              {route.rejectionReason}
            </p>

            <div className="flex items-center justify-between text-[8px] text-gray-400 pt-0.5">
              <span>Lethal Crossing: <strong className="text-red-400">{route.lethalZoneCrossingPct}%</strong></span>
              <span>Peak Flux: <strong className="text-amber-400">{route.peakThermalExposureKwM2} kW/m²</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
