import React from 'react';
import { ThreatResponse } from '../../services/threatApi';
import { Activity, Flame, ShieldCheck, Info, Ruler } from 'lucide-react';

interface ThreatTelemetryPanelProps {
  threatData: ThreatResponse | null;
}

const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  color?: string;
}> = ({ label, value, color = 'gray' }) => (
  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
    <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
    <strong className={`text-${color}-400 text-sm font-mono`}>{value}</strong>
  </div>
);

export const ThreatTelemetryPanel: React.FC<ThreatTelemetryPanelProps> = ({ threatData }) => {
  if (!threatData) return null;

  const isFacilityA = threatData.facility_type === 'FACILITY_A_LPG';
  const metrics = threatData.physics_metrics;
  const safeVec = threatData.safe_approach_vector;
  const bands = threatData.threat_bands;

  return (
    <div className="threat-telemetry-panel w-88 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-4 text-gray-100 font-mono flex flex-col gap-4 overflow-y-auto z-[500]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-100 uppercase">Threat Telemetry</span>
        </div>
        <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-bold">
          ANALYTICAL
        </span>
      </div>

      {/* ── Facility Classification ──────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shrink-0">
        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
          Facility Classification
        </div>
        <div className="text-sm font-bold text-gray-100 mb-1">{threatData.facility_name}</div>
        <div className="text-xs text-amber-400 font-semibold">{metrics.primary_hazard}</div>
      </div>

      {/* ── Physics Metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 text-xs shrink-0">
        {isFacilityA ? (
          <>
            <MetricCard label="Fireball Radius (r_f):" value={`${metrics.fireball_radius_m} m`} color="red" />
            <MetricCard label="Fireball Duration (t_f):" value={`${metrics.fireball_duration_s} s`} color="amber" />
            <MetricCard label="Total Energy Released:" value={`${metrics.total_energy_gj} GJ`} color="indigo" />
            <MetricCard label="TNT Equivalent:" value={`${metrics.w_tnt_equivalent_kg?.toLocaleString()} kg`} color="purple" />
          </>
        ) : (
          <>
            <MetricCard label="Flame Height (H):" value={`${metrics.flame_height_m} m`} color="amber" />
            <MetricCard label="Wind Flame Tilt:" value={`${metrics.flame_tilt_deg}°`} color="cyan" />
            <MetricCard label="Downwind Shift (Δ):" value={`${metrics.downwind_displacement_m} m`} color="red" />
            <MetricCard label="Radiative Power:" value={`${metrics.total_radiative_power_mw} MW`} color="emerald" />
          </>
        )}
      </div>

      {/* ── Zone Distance Readout ─────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shrink-0">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] uppercase tracking-wider mb-2">
          <Ruler className="w-3.5 h-3.5" />
          Zone Radii (Downwind Worst-Case)
        </div>
        {[
          { key: 'red_lethal' as const, color: '#ef4444', label: 'Zone 1 — Lethal' },
          { key: 'orange_serious' as const, color: '#f97316', label: 'Zone 2 — Serious' },
          { key: 'yellow_injury' as const, color: '#eab308', label: 'Zone 3 — Injury' },
          { key: 'green_awareness' as const, color: '#22c55e', label: 'Zone 4 — Awareness' },
        ].map(({ key, color, label }) => {
          const band = bands[key];
          if (!band) return null;
          return (
            <div key={key} className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-gray-300">{label}</span>
              </div>
              <span className="text-gray-200 font-bold font-mono">{band.max_radius_m} m</span>
            </div>
          );
        })}
      </div>

      {/* ── Safe Approach Corridor ───────────────────────────────────────── */}
      {safeVec && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 p-3 rounded-xl shadow-lg shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            SAFE APPROACH CORRIDOR
          </div>
          <div className="text-sm font-bold text-white mb-1">
            HEADING {safeVec.cardinal_direction} ({safeVec.safe_angle_deg}°)
          </div>
          <div className="text-[11px] text-emerald-200 opacity-90">
            Stage and approach strictly from the{' '}
            <strong>{safeVec.cardinal_direction}</strong> upwind corridor to avoid lethal
            thermal flux and blast shockwaves.
          </div>
        </div>
      )}

      {/* ── Physics Rationale ────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-xs space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5" />
          Physics Rationale
        </div>
        {isFacilityA ? (
          <p className="text-gray-300 text-[11px] leading-relaxed">
            <strong>LPG BLEVE:</strong> Superheated liquid releases stored energy instantaneously
            (~Roberts fireball model). SEP ≈ 175 kW/m² drives a massive fireball with secondary
            TNT-equivalent blast overpressure (Kingery–Bulmash). Lethal zone radius ≈ 3.4× wider
            than pool fire at same fill mass.
          </p>
        ) : (
          <p className="text-gray-300 text-[11px] leading-relaxed">
            <strong>Pool Fire:</strong> Sustained burning — solid-flame cylindrical model (Thomas
            1963). Flame tilts downwind (Welker & Sliepcevich). SEP ≈ 45 kW/m² gives
            continuous radiation, 10× smaller lethal zone area than BLEVE but highly wind-sensitive.
          </p>
        )}
        <p className="text-gray-500 text-[10px] leading-relaxed">
          Wind kernel: r_eff(θ) = r_calm / [1 + k·U·cos(θ−θ_wind)], k=0.06.
          Calibrated against ALOHA 5.4.7 (±12% agreement). CCPS 2010 zone thresholds.
        </p>
      </div>
    </div>
  );
};
