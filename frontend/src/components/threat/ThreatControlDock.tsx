import React from 'react';
import { Flame, Wind, Gauge, ShieldAlert, Compass, RefreshCw } from 'lucide-react';
import { ThreatCalculateParams } from '../../services/threatApi';

interface ThreatControlDockProps {
  params: ThreatCalculateParams;
  onChangeParams: (newParams: ThreatCalculateParams) => void;
  onSelectFacilityA: () => void;
  onSelectFacilityB: () => void;
}

export const ThreatControlDock: React.FC<ThreatControlDockProps> = ({
  params,
  onChangeParams,
  onSelectFacilityA,
  onSelectFacilityB,
}) => {
  const isFacilityA = params.facility_type === 'FACILITY_A_LPG';

  return (
    <div className="w-80 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800 p-4 text-gray-100 font-mono flex flex-col gap-4 overflow-y-auto z-[500]">
      {/* Dock Title Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/40 text-red-400">
          <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
        </div>
        <div>
          <div className="text-xs text-red-400 font-bold tracking-widest uppercase">DER-02 THREAT CONTROL</div>
          <div className="text-xs text-gray-400">Physics &amp; Geometry Engine</div>
        </div>
      </div>

      {/* Preset Scenario Selector Buttons */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">
          Facility Configurations
        </label>
        <button
          onClick={onSelectFacilityA}
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
            isFacilityA
              ? 'bg-red-950/70 border-red-500 text-red-200 font-bold ring-2 ring-red-500/40'
              : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200 hover:bg-slate-850'
          }`}
        >
          <Flame className="w-4 h-4 text-red-400 shrink-0" />
          <div>
            <div className="text-gray-100 font-semibold">Facility A — LPG Sphere</div>
            <div className="text-[10px] opacity-75">40,000 kg BLEVE Fireball &amp; Blast</div>
          </div>
        </button>

        <button
          onClick={onSelectFacilityB}
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
            !isFacilityA
              ? 'bg-amber-950/70 border-amber-500 text-amber-200 font-bold ring-2 ring-amber-500/40'
              : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200 hover:bg-slate-850'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-gray-100 font-semibold">Facility B — Pool Fire</div>
            <div className="text-[10px] opacity-75">D = 30m Gasoline Sustained Pool</div>
          </div>
        </button>
      </div>

      {/* Dynamic Parameters Form */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
        <label className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" />
          Storage &amp; Fuel Inputs
        </label>

        {isFacilityA ? (
          /* Facility A Inputs */
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">LPG Mass (kg):</span>
              <span className="text-red-400 font-bold">{params.mass_kg.toLocaleString()} kg</span>
            </div>
            <input
              type="range"
              min="5000"
              max="100000"
              step="5000"
              value={params.mass_kg}
              onChange={(e) => onChangeParams({ ...params, mass_kg: parseFloat(e.target.value) })}
              className="w-full accent-red-500 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        ) : (
          /* Facility B Inputs */
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Pool Diameter D (m):</span>
              <span className="text-amber-400 font-bold">{params.pool_diameter_m} meters</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={params.pool_diameter_m}
              onChange={(e) => onChangeParams({ ...params, pool_diameter_m: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Wind Telemetry Controls */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
        <label className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5" />
          Prevailing Wind Telemetry
        </label>

        {/* Wind Speed Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Wind Speed (m/s):</span>
            <span className="text-cyan-400 font-bold">{params.wind_speed_ms} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={params.wind_speed_ms}
            onChange={(e) => onChangeParams({ ...params, wind_speed_ms: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
          />
        </div>

        {/* Wind Direction Dial Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              Wind Direction:
            </span>
            <span className="text-cyan-400 font-bold">{params.wind_direction_deg}° SE</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={params.wind_direction_deg}
            onChange={(e) => onChangeParams({ ...params, wind_direction_deg: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
