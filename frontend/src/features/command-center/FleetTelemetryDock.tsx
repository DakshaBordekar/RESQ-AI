import React from 'react';
import { Resource, Hospital, AnalyticsSummary } from '../../types';
import { Truck, Activity, FileText, AlertTriangle, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface FleetTelemetryDockProps {
  resources: Resource[];
  hospitals: Hospital[];
  analytics?: AnalyticsSummary;
  onOpenActionPlan: () => void;
  onInjectBlockage: () => void;
  onInjectHospitalSurge: () => void;
  onInjectIncidentBurst: () => void;
}

export const FleetTelemetryDock: React.FC<FleetTelemetryDockProps> = ({
  resources,
  hospitals,
  analytics,
  onOpenActionPlan,
  onInjectBlockage,
  onInjectHospitalSurge,
  onInjectIncidentBurst,
}) => {
  const availableFleet = resources.filter((r) => r.status === 'AVAILABLE').length;
  const deployedFleet = resources.length - availableFleet;
  
  const totalBeds = hospitals.reduce((acc, h) => acc + h.total_beds, 0);
  const availBeds = hospitals.reduce((acc, h) => acc + h.available_beds, 0);
  const totalIcu = hospitals.reduce((acc, h) => acc + h.total_icu, 0);
  const availIcu = hospitals.reduce((acc, h) => acc + h.available_icu, 0);

  return (
    <div className="h-28 bg-surface-1 border-t border-gray-800 px-4 py-2 flex items-center justify-between gap-4 select-none z-20 overflow-x-auto">
      {/* 1. Fleet Telemetry */}
      <div className="flex items-center gap-3 pr-4 border-r border-gray-800 flex-shrink-0">
        <div className="p-2 bg-blue-950/50 border border-blue-500/30 rounded-lg text-blue-400">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Emergency Fleet</div>
          <div className="text-base font-bold font-mono text-gray-100 flex items-center gap-2">
            <span>{availableFleet} Avail</span>
            <span className="text-xs text-blue-400 font-normal">({deployedFleet} deployed)</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Utilization: <strong className="text-emerald-400">{analytics?.fleet.utilization_rate ?? 0}%</strong>
          </div>
        </div>
      </div>

      {/* 2. Medical & Hospital Capacity Telemetry */}
      <div className="flex items-center gap-3 pr-4 border-r border-gray-800 flex-shrink-0">
        <div className="p-2 bg-indigo-950/50 border border-indigo-500/30 rounded-lg text-indigo-400">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Hospital Bed Capacity</div>
          <div className="text-base font-bold font-mono text-gray-100 flex items-center gap-2">
            <span>{availBeds}/{totalBeds} Beds</span>
            <span className="text-xs text-indigo-400 font-normal">(ICU: {availIcu}/{totalIcu})</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            ICU Saturation: <strong className="text-amber-400">{analytics?.medical.icu_occupancy_rate ?? 65}%</strong>
          </div>
        </div>
      </div>

      {/* 3. Interactive What-If Disruption Injection Shortcuts */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Disaster Sandbox:
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onInjectBlockage}
          className="text-xs border-red-500/40 hover:bg-red-950/30 text-red-300"
        >
          ⚡ Flood Saidapet Bridge
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onInjectHospitalSurge}
          className="text-xs border-amber-500/40 hover:bg-amber-950/30 text-amber-300"
        >
          ⚡ GH Hospital ICU Surge
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onInjectIncidentBurst}
          className="text-xs border-purple-500/40 hover:bg-purple-950/30 text-purple-300"
        >
          ⚡ Spawn Dialysis Burst
        </Button>
      </div>

      {/* 4. Action Plan Briefing Export Button */}
      <div className="pl-4 border-l border-gray-800 flex-shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenActionPlan}
          icon={<FileText className="w-4 h-4 text-emerald-300" />}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          Operational Action Plan
        </Button>
      </div>
    </div>
  );
};
