import React from 'react';
import { Incident, Dispatch } from '../../types';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { Sparkles, MapPin, Users, HeartPulse, Navigation, Clock, Activity } from 'lucide-react';

interface ExplainabilityCardProps {
  incident?: Incident;
  dispatch?: Dispatch;
  onApproveDispatch?: (dispatchId: string) => void;
}

export const ExplainabilityCard: React.FC<ExplainabilityCardProps> = ({
  incident,
  dispatch,
  onApproveDispatch,
}) => {
  if (!incident) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-surface-1 border-l border-gray-800">
        <Activity className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
        <div className="text-xs font-semibold text-gray-400">No Incident Selected</div>
        <div className="text-[11px] text-gray-500 mt-1 max-w-xs">
          Click any emergency incident pin on the map or select from the triage queue to inspect decision rationales.
        </div>
      </div>
    );
  }

  const rationale = dispatch?.mathematical_rationale;

  return (
    <div className="h-full flex flex-col bg-surface-1 border-l border-gray-800 w-80 lg:w-96 flex-shrink-0 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-surface-2/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
            Incident #{incident.id.slice(0, 8)}
          </span>
          <PriorityBadge tier={incident.priority_tier} score={incident.calculated_priority} />
        </div>
        <h2 className="text-sm font-bold text-gray-100 leading-tight">{incident.title}</h2>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="line-clamp-1">{incident.location_name}</span>
        </div>
      </div>

      {/* Incident Telemetry Grid */}
      <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-surface-2/60 p-2 rounded border border-gray-800">
          <div className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" /> People Affected
          </div>
          <div className="text-sm font-bold font-mono text-gray-100 mt-0.5">
            {incident.people_affected} <span className="text-[10px] text-orange-400 font-normal">(V:{incident.vulnerable_people})</span>
          </div>
        </div>

        <div className="bg-surface-2/60 p-2 rounded border border-gray-800">
          <div className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
            <HeartPulse className="w-3 h-3 text-red-400" /> Medical Need
          </div>
          <div className="text-sm font-bold text-gray-100 mt-0.5">
            {incident.medical_need ? 'URGENT' : 'NONE'}
          </div>
        </div>

        <div className="bg-surface-2/60 p-2 rounded border border-gray-800">
          <div className="text-[10px] text-gray-400 uppercase">Mobility</div>
          <div className="text-xs font-semibold text-gray-200 mt-0.5">{incident.mobility_status}</div>
        </div>

        <div className="bg-surface-2/60 p-2 rounded border border-gray-800">
          <div className="text-[10px] text-gray-400 uppercase">Urgency</div>
          <div className="text-xs font-semibold text-red-400 mt-0.5">{incident.urgency}</div>
        </div>
      </div>

      {/* Dispatch Recommendation & Rationale */}
      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          AI &amp; Optimization Rationale
        </div>

        {dispatch ? (
          <div className="space-y-3">
            {/* Natural Language Justification */}
            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs leading-relaxed text-amber-200">
              {dispatch.narrative_explanation}
            </div>

            {/* Mathematical Proof Breakdown */}
            <div className="bg-surface-2/50 border border-gray-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Algorithmic Scoring Matrix</div>
              
              <div className="flex justify-between items-center py-1 border-b border-gray-800/80">
                <span className="text-gray-400">Assigned Asset:</span>
                <span className="font-semibold text-emerald-400 font-mono">{dispatch.resource_details?.call_sign} ({dispatch.resource_details?.name})</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-800/80">
                <span className="text-gray-400">Estimated Travel Time:</span>
                <span className="font-semibold font-mono text-blue-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {dispatch.eta_minutes} mins ({dispatch.distance_km} km)
                </span>
              </div>

              {dispatch.hospital_details && (
                <div className="flex justify-between items-center py-1 border-b border-gray-800/80">
                  <span className="text-gray-400">Receiving Hospital:</span>
                  <span className="font-semibold text-indigo-400">{dispatch.hospital_details.name}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-400">Min-Cost Match Score:</span>
                <span className="font-mono font-bold text-gray-200">{rationale?.cost_metric ?? -12.4}</span>
              </div>
            </div>

            {/* Dispatch Action */}
            {dispatch.status === 'PROPOSED' && onApproveDispatch && (
              <button
                onClick={() => onApproveDispatch(dispatch.id)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" /> Approve &amp; Deploy {dispatch.resource_details?.call_sign}
              </button>
            )}

            {dispatch.status === 'APPROVED' && (
              <div className="w-full py-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold rounded-lg text-xs text-center uppercase tracking-wider">
                ✓ Unit Dispatched &amp; En Route
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-surface-2/30 border border-dashed border-gray-700 rounded-lg text-center text-xs text-gray-400">
            No active dispatch proposed. Click <strong>"Run Smart Dispatch"</strong> in the top header to calculate optimal resource assignments.
          </div>
        )}
      </div>
    </div>
  );
};
