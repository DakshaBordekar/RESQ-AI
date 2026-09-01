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

// ── Numeric Stepper + Slider Row ───────────────────────────────────────────
const NumericStepperSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit, color = 'cyan', onChange }) => {
  const isMin = value <= min;
  const isMax = value >= max;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const stepDown = () => {
    const val = Math.max(min, parseFloat((value - step).toFixed(2)));
    onChange(val);
  };

  const stepUp = () => {
    const val = Math.min(max, parseFloat((value + step).toFixed(2)));
    onChange(val);
  };

  return (
    <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300 font-medium text-[11px]">{label}:</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={stepDown}
            disabled={isMin}
            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 rounded text-gray-300 font-mono text-xs"
          >
            -
          </button>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}
            onChange={handleTextChange}
            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={stepUp}
            disabled={isMax}
            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 rounded text-gray-300 font-mono text-xs"
          >
            +
          </button>
          <span className="text-gray-400 font-mono text-[10px] ml-0.5">{unit}</span>
        </div>
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
      <div className="flex justify-between text-[9px] text-gray-500 font-mono">
        <span>Min: {min}</span>
        {isMin && <span className="text-amber-400 font-semibold">Boundary Reached</span>}
        {isMax && <span className="text-amber-400 font-semibold">Max Threshold</span>}
        <span>Max: {max}</span>
      </div>
    </div>
  );
};

// ── Main Dock ──────────────────────────────────────────────────────────────
export const ThreatControlDock: React.FC<ThreatControlDockProps> = ({
  params,
  onChangeParams,
  onSelectFacilityA,
  onSelectFacilityB,
}) => {
  const isFacilityA = params.facility_type === 'FACILITY_A_LPG';

  const [openSections, setOpenSections] = React.useState({
    facility: true,
    geometry: true,
    wind: true,
    thresholds: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
        p-3 text-gray-100 font-mono flex flex-col gap-3 overflow-y-auto z-[500]
      "
    >
      {/* ── Section 1: Facility & Substance ────────────────────────────── */}
      <div className="border border-slate-800/90 rounded-xl bg-slate-900/40 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('facility')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <span className="text-[11px] text-gray-200 font-bold uppercase tracking-wider">
              1. Facility & Substance
            </span>
          </div>
          <span className="text-gray-400 text-xs">{openSections.facility ? '▼' : '▶'}</span>
        </button>

        {openSections.facility && (
          <div className="p-3 flex flex-col gap-2.5 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSelectFacilityA}
                className={`flex flex-col gap-1 p-2 rounded-lg border text-left transition-all ${
                  isFacilityA
                    ? 'bg-red-950/80 border-red-500 text-red-100 font-bold ring-1 ring-red-500/50'
                    : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  Facility A
                </div>
                <div className="text-[9px] opacity-75 leading-tight">LPG BLEVE Fireball</div>
              </button>

              <button
                onClick={onSelectFacilityB}
                className={`flex flex-col gap-1 p-2 rounded-lg border text-left transition-all ${
                  !isFacilityA
                    ? 'bg-amber-950/80 border-amber-500 text-amber-100 font-bold ring-1 ring-amber-500/50'
                    : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Facility B
                </div>
                <div className="text-[9px] opacity-75 leading-tight">Pool Fire</div>
              </button>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <label className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                Stored Chemical Compound
              </label>
              <select
                value={params.fuel_type}
                onChange={(e) => handleSubstanceChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {Object.entries(SUBSTANCE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Storage Geometry & Fuel Load ─────────────────────── */}
      <div className="border border-slate-800/90 rounded-xl bg-slate-900/40 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('geometry')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] text-gray-200 font-bold uppercase tracking-wider">
              2. Geometry & Fuel Load
            </span>
          </div>
          <span className="text-gray-400 text-xs">{openSections.geometry ? '▼' : '▶'}</span>
        </button>

        {openSections.geometry && (
          <div className="p-3 flex flex-col gap-2.5 border-t border-slate-800/80">
            {isFacilityA ? (
              <>
                <NumericStepperSlider
                  label="Tank Diameter"
                  value={params.tank_diameter_m}
                  min={2}
                  max={30}
                  step={0.5}
                  unit="m"
                  color="red"
                  onChange={(v) => set({ tank_diameter_m: v })}
                />
                <NumericStepperSlider
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
                <NumericStepperSlider
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
                <div className="bg-slate-900/90 border border-slate-800 p-2 rounded flex justify-between items-center text-xs">
                  <span className="text-gray-400 text-[10px]">Calculated Mass:</span>
                  <span className="text-red-400 font-bold font-mono">{params.mass_kg.toLocaleString()} kg</span>
                </div>
              </>
            ) : (
              <>
                <NumericStepperSlider
                  label="Pool Diameter D"
                  value={params.pool_diameter_m}
                  min={5}
                  max={80}
                  step={1}
                  unit="m"
                  color="amber"
                  onChange={(v) => set({ pool_diameter_m: v })}
                />
                <NumericStepperSlider
                  label="Tank Volume"
                  value={params.tank_volume_m3}
                  min={10}
                  max={500}
                  step={10}
                  unit="m³"
                  color="amber"
                  onChange={(v) => set({ tank_volume_m3: v })}
                />
                <NumericStepperSlider
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
        )}
      </div>

      {/* ── Section 3: Wind & Meteorology ───────────────────────────────── */}
      <div className="border border-slate-800/90 rounded-xl bg-slate-900/40 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('wind')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] text-gray-200 font-bold uppercase tracking-wider">
              3. Wind & Meteorology
            </span>
          </div>
          <span className="text-gray-400 text-xs">{openSections.wind ? '▼' : '▶'}</span>
        </button>

        {openSections.wind && (
          <div className="p-3 flex flex-col gap-2.5 border-t border-slate-800/80">
            <div className="flex justify-center py-1">
              <WindRose
                bearing={params.wind_direction_deg}
                onChange={(deg) => set({ wind_direction_deg: deg })}
              />
            </div>

            <NumericStepperSlider
              label="Wind Speed"
              value={params.wind_speed_ms}
              min={0}
              max={30}
              step={0.5}
              unit="m/s"
              color="cyan"
              onChange={(v) => set({ wind_speed_ms: v })}
            />

            <NumericStepperSlider
              label="Wind Bearing (Precise)"
              value={params.wind_direction_deg}
              min={0}
              max={360}
              step={1}
              unit="°"
              color="cyan"
              onChange={(v) => set({ wind_direction_deg: v })}
            />
          </div>
        )}
      </div>

      {/* ── Section 4: Zone Threshold Reference ─────────────────────────── */}
      <div className="border border-slate-800/90 rounded-xl bg-slate-900/40 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('thresholds')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers3 className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] text-gray-200 font-bold uppercase tracking-wider">
              4. Zone Threshold Tiers
            </span>
          </div>
          <span className="text-gray-400 text-xs">{openSections.thresholds ? '▼' : '▶'}</span>
        </button>

        {openSections.thresholds && (
          <div className="p-3 border-t border-slate-800/80 space-y-2">
            {[
              { color: '#ef4444', label: 'Zone 1 — Lethal', val: '> 37.5 kW/m² | Extreme Hazard' },
              { color: '#f97316', label: 'Zone 2 — Serious', val: '12.5–37.5 kW/m² | Evacuate' },
              { color: '#eab308', label: 'Zone 3 — Injury', val: '4.7–12.5 kW/m² | First Aid Limit' },
              { color: '#22c55e', label: 'Zone 4 — Awareness', val: '1.6–4.7 kW/m² | Staging Line' },
            ].map(({ color, label, val }) => (
              <div key={label} className="flex items-start gap-2 text-[10px]">
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
        )}
      </div>
    </div>
  );
};

