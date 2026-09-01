import React, { useRef, useCallback } from 'react';
import { Flame, Wind, Gauge, Compass, FlaskConical, Layers3 } from 'lucide-react';
import { ThreatCalculateParams, SUBSTANCE_PRESETS } from '../../services/threatApi';

interface ThreatControlDockProps {
  params: ThreatCalculateParams;
  onChangeParams: (newParams: ThreatCalculateParams) => void;
  onSelectFacilityA: () => void;
  onSelectFacilityB: () => void;
}

// ── SVG Wind Rose Widget ───────────────────────────────────────────────────
const WindRose: React.FC<{
  bearing: number;
  onChange: (deg: number) => void;
}> = ({ bearing, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const SIZE = 110;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 10;

  // Convert bearing (0=N, 90=E clockwise) → SVG angle (0=right, CCW)
  const bearingToSvgRad = (b: number) => ((b - 90) * Math.PI) / 180;

  const arrowRad = bearingToSvgRad(bearing);
  const arrowTipX = CX + R * Math.cos(arrowRad);
  const arrowTipY = CY + R * Math.sin(arrowRad);
  const arrowBaseX = CX - (R * 0.45) * Math.cos(arrowRad);
  const arrowBaseY = CY - (R * 0.45) * Math.sin(arrowRad);

  const getAngleFromEvent = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current) return 0;
      const rect = svgRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      // atan2(dx, -dy): bearing 0=North, 90=East, clockwise
      const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      return Math.round(deg);
    },
    []
  );

  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDragging.current = true;
    onChange(getAngleFromEvent(e));
  };
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    onChange(getAngleFromEvent(e));
  };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    onChange(getAngleFromEvent(e));
  };

  const cardinalLabels = [
    { label: 'N', deg: 0 },
    { label: 'E', deg: 90 },
    { label: 'S', deg: 180 },
    { label: 'W', deg: 270 },
  ];

  const tickDirs = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => { e.preventDefault(); onChange(getAngleFromEvent(e)); }}
        onTouchMove={handleTouchMove}
      >
        {/* Outer ring */}
        <circle cx={CX} cy={CY} r={R} fill="rgba(15,23,42,0.8)" stroke="#334155" strokeWidth="1.5" />

        {/* Tick marks */}
        {tickDirs.map((deg) => {
          const rad = bearingToSvgRad(deg);
          const inner = R - 6;
          const outer = R - 1;
          return (
            <line
              key={deg}
              x1={CX + inner * Math.cos(rad)}
              y1={CY + inner * Math.sin(rad)}
              x2={CX + outer * Math.cos(rad)}
              y2={CY + outer * Math.sin(rad)}
              stroke="#475569"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Cardinal labels */}
        {cardinalLabels.map(({ label, deg }) => {
          const rad = bearingToSvgRad(deg);
          const lR = R - 14;
          return (
            <text
              key={label}
              x={CX + lR * Math.cos(rad)}
              y={CY + lR * Math.sin(rad) + 4}
              textAnchor="middle"
              fill={label === 'N' ? '#22d3ee' : '#94a3b8'}
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {label}
            </text>
          );
        })}

        {/* Wind arrow shaft */}
        <line
          x1={arrowBaseX}
          y1={arrowBaseY}
          x2={arrowTipX}
          y2={arrowTipY}
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Arrow head */}
        <polygon
          points={`${arrowTipX},${arrowTipY} ${CX + (R - 8) * Math.cos(arrowRad - 0.35)},${
            CY + (R - 8) * Math.sin(arrowRad - 0.35)
          } ${CX + (R - 8) * Math.cos(arrowRad + 0.35)},${
            CY + (R - 8) * Math.sin(arrowRad + 0.35)
          }`}
          fill="#22d3ee"
        />

        {/* Centre dot */}
        <circle cx={CX} cy={CY} r="3" fill="#22d3ee" />
      </svg>

      <div className="flex items-center gap-2 text-xs">
        <Compass className="w-3 h-3 text-cyan-400" />
        <span className="text-gray-400">Wind Direction:</span>
        <span className="text-cyan-300 font-bold font-mono">{bearing}°</span>
      </div>
    </div>
  );
};

// ── Slider Row component ───────────────────────────────────────────────────
const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit, color = 'cyan', onChange }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-400">{label}:</span>
      <span className={`text-${color}-400 font-bold font-mono`}>
        {typeof value === 'number' && !Number.isInteger(value)
          ? value.toFixed(2)
          : value.toLocaleString()}{' '}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full accent-${color}-500 bg-slate-800 h-1.5 rounded cursor-pointer`}
    />
  </div>
);

// ── Main Dock ──────────────────────────────────────────────────────────────
export const ThreatControlDock: React.FC<ThreatControlDockProps> = ({
  params,
  onChangeParams,
  onSelectFacilityA,
  onSelectFacilityB,
}) => {
  const isFacilityA = params.facility_type === 'FACILITY_A_LPG';

  const set = (partial: Partial<ThreatCalculateParams>) =>
    onChangeParams({ ...params, ...partial });

  const handleSubstanceChange = (fuel_type: string) => {
    const preset = SUBSTANCE_PRESETS[fuel_type];
    if (!preset) return;
    onChangeParams({
      ...params,
      fuel_type,
      facility_type: preset.facilityType,
    });
  };

  return (
    <div
      className="
        threat-control-dock
        w-80 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800
        p-4 text-gray-100 font-mono flex flex-col gap-4 overflow-y-auto z-[500]
      "
    >
      {/* ── Facility Configuration Buttons ──────────────────────────────── */}
      <div className="flex flex-col gap-2 shrink-0">
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
            <div className="text-[10px] opacity-75">BLEVE Fireball & Blast</div>
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
            <div className="text-[10px] opacity-75">Sustained Thermal Radiation</div>
          </div>
        </button>
      </div>

      {/* ── Substance Dropdown ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 shrink-0">
        <label className="text-[11px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" />
          Stored Substance
        </label>
        <select
          value={params.fuel_type}
          onChange={(e) => handleSubstanceChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
        >
          {Object.entries(SUBSTANCE_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Tank Geometry Sliders ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800 shrink-0">
        <label className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" />
          Tank Geometry & Fuel Load
        </label>

        {isFacilityA ? (
          <>
            <SliderRow
              label="Tank Diameter"
              value={params.tank_diameter_m}
              min={2}
              max={30}
              step={0.5}
              unit="m"
              color="red"
              onChange={(v) => set({ tank_diameter_m: v })}
            />
            <SliderRow
              label="Tank Volume"
              value={params.tank_volume_m3}
              min={10}
              max={500}
              step={10}
              unit="m³"
              color="red"
              onChange={(v) => {
                const rho = 500;
                const mass = rho * v * (params.fill_fraction ?? 0.85);
                set({ tank_volume_m3: v, mass_kg: Math.round(mass) });
              }}
            />
            <SliderRow
              label="Fill Fraction"
              value={params.fill_fraction ?? 0.85}
              min={0.1}
              max={0.95}
              step={0.05}
              unit=""
              color="red"
              onChange={(v) => {
                const mass = 500 * params.tank_volume_m3 * v;
                set({ fill_fraction: v, mass_kg: Math.round(mass) });
              }}
            />
            <div className="text-[10px] text-gray-500 text-right font-mono">
              LPG Mass: <span className="text-red-400 font-bold">{params.mass_kg.toLocaleString()} kg</span>
            </div>
          </>
        ) : (
          <>
            <SliderRow
              label="Pool Diameter D"
              value={params.pool_diameter_m}
              min={5}
              max={80}
              step={1}
              unit="m"
              color="amber"
              onChange={(v) => set({ pool_diameter_m: v })}
            />
            <SliderRow
              label="Tank Volume"
              value={params.tank_volume_m3}
              min={10}
              max={500}
              step={10}
              unit="m³"
              color="amber"
              onChange={(v) => set({ tank_volume_m3: v })}
            />
            <SliderRow
              label="Fill Fraction"
              value={params.fill_fraction ?? 0.70}
              min={0.1}
              max={0.95}
              step={0.05}
              unit=""
              color="amber"
              onChange={(v) => set({ fill_fraction: v })}
            />
          </>
        )}
      </div>

      {/* ── Wind Telemetry ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800 shrink-0">
        <label className="text-[11px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5" />
          Prevailing Wind Telemetry
        </label>

        {/* SVG Wind Rose */}
        <div className="flex justify-center py-1">
          <WindRose
            bearing={params.wind_direction_deg}
            onChange={(deg) => set({ wind_direction_deg: deg })}
          />
        </div>

        {/* Wind Speed Slider */}
        <SliderRow
          label="Wind Speed"
          value={params.wind_speed_ms}
          min={0}
          max={30}
          step={0.5}
          unit="m/s"
          color="cyan"
          onChange={(v) => set({ wind_speed_ms: v })}
        />

        {/* Numeric bearing input for precision */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Bearing (precise):</span>
            <span className="text-cyan-400 font-bold">{params.wind_direction_deg}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={params.wind_direction_deg}
            onChange={(e) => set({ wind_direction_deg: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* ── Zones Info Footer ─────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-slate-800 shrink-0">
        <label className="text-[11px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5 mb-2">
          <Layers3 className="w-3.5 h-3.5" />
          Active Zone Thresholds
        </label>
        {[
          { color: '#ef4444', label: 'Zone 1 — Lethal', val: '> 37.5 kW/m² | No Entry' },
          { color: '#f97316', label: 'Zone 2 — Serious', val: '12.5–37.5 kW/m² | Evacuate' },
          { color: '#eab308', label: 'Zone 3 — Injury', val: '4.7–12.5 kW/m² | First Aid Limit' },
          { color: '#22c55e', label: 'Zone 4 — Awareness', val: '1.6–4.7 kW/m² | Command Post' },
        ].map(({ color, label, val }) => (
          <div key={label} className="flex items-start gap-2 text-[10px] mb-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0"
              style={{ background: color }}
            />
            <div>
              <div className="text-gray-300 font-semibold">{label}</div>
              <div className="text-gray-500">{val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
