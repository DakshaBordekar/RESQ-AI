import React from 'react';
import { ThreatResponse } from '../../services/threatApi';
import { Activity, Flame, ShieldCheck, Zap, Info } from 'lucide-react';

interface ThreatTelemetryPanelProps {
  threatData: ThreatResponse | null;
}

export const ThreatTelemetryPanel: React.FC<ThreatTelemetryPanelProps> = ({ threatData }) => {
  if (!threatData) return null;

  const isFacilityA = threatData.facility_type === 'FACILITY_A_LPG';
  const metrics = threatData.physics_metrics;
  const safeVec = threatData.safe_approach_vector;

  return (
    <div className="w-88 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-4 text-gray-100 font-mono flex flex-col gap-4 overflow-y-auto z-[500]">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-100 uppercase">THREAT TELEMETRY &amp; PHYSICS</span>
        </div>
        <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-bold">
          ANALYTICAL
        </span>
      </div>

      {/* Primary Hazard Overview Card */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
          FACILITY CLASSIFICATION
        </div>
        <div className="text-sm font-bold text-gray-100 mb-1">{threatData.facility_name}</div>
        <div className="text-xs text-amber-400 font-semibold">{metrics.primary_hazard}</div>
      </div>

      {/* Physics Metric Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {isFacilityA ? (
          <>
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Fireball Radius (r_f):</div>
              <strong className="text-red-400 text-sm font-mono">{metrics.fireball_radius_m} m</strong>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Fireball Duration (t_f):</div>
              <strong className="text-amber-400 text-sm font-mono">{metrics.fireball_duration_s} s</strong>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Total Energy Released:</div>
              <strong className="text-indigo-300 text-sm font-mono">{metrics.total_energy_gj} GJ</strong>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">TNT Equivalent:</div>
              <strong className="text-purple-400 text-sm font-mono">{metrics.w_tnt_equivalent_kg?.toLocaleString()} kg</strong>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Flame Height (H):</div>
              <strong className="text-amber-400 text-sm font-mono">{metrics.flame_height_m} m</strong>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Wind Flame Tilt:</div>
              <strong className="text-cyan-400 text-sm font-mono">{metrics.flame_tilt_deg}°</strong>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Downwind Shift (Δ):</div>
              <strong className="text-red-400 text-sm font-mono">{metrics.downwind_displacement_m} m</strong>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
              <div className="text-[10px] text-gray-400">Radiative Power:</div>
              <strong className="text-emerald-400 text-sm font-mono">{metrics.total_radiative_power_mw} MW</strong>
            </div>
          </>
        )}
      </div>

      {/* Safe Approach Corridor Recommendation Card */}
      {safeVec && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            RECOMMENDED SAFE APPROACH CORRIDOR
          </div>
          <div className="text-sm font-bold text-white mb-1">
            HEADING {safeVec.cardinal_direction} ({safeVec.safe_angle_deg}°)
          </div>
          <div className="text-[11px] text-emerald-200 opacity-90">
            Fire tenders should stage and approach strictly from the {safeVec.cardinal_direction} upwind/crosswind corridor to avoid lethal thermal flux and blast shockwaves.
          </div>
        </div>
      )}

      {/* Physics Rationale Explanation Card (Defensible Why They Differ) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-xs space-y-2">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5" />
          Physics Rationale &amp; Comparison
        </div>
        {isFacilityA ? (
          <p className="text-gray-300 text-[11px] leading-relaxed">
            <strong>LPG BLEVE Physics:</strong> Pressurized liquid gas releases ~1,800 GJ instantaneously in ~16 seconds, generating a massive 121m fireball and secondary overpressure shockwave (W_TNT equivalent ~17,500 kg). Thermal fireball radiation dominates out to ~430m.
          </p>
        ) : (
          <p className="text-gray-300 text-[11px] leading-relaxed">
            <strong>Petroleum Pool Fire Physics:</strong> Sustained burning radiates ~354 MW continuously — 100x slower rate than BLEVE. Heat release is lower, making threat zones ~10x smaller in area and highly sensitive to wind tilt.
          </p>
        )}
      </div>
    </div>
  );
};
