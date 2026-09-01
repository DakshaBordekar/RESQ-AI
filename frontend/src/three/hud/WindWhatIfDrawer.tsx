// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Live Interactive Wind & Environmental What-If Controls (F01)
// Interactive 0–360° circular SVG wind compass dial and 0–25 m/s speed slider
// ────────────────────────────────────────────────────────────────────────────

import React, { useRef, useCallback } from 'react';
import { Wind, Compass, Sliders, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { getCardinalDirection } from '../utils/coordinateMath';

interface WindWhatIfDrawerProps {
  windDirectionDeg: number;
  windSpeedMs: number;
  onChangeWindDirection: (deg: number) => void;
  onChangeWindSpeed: (ms: number) => void;
  onResetDefaults: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const WindWhatIfDrawer: React.FC<WindWhatIfDrawerProps> = ({
  windDirectionDeg,
  windSpeedMs,
  onChangeWindDirection,
  onChangeWindSpeed,
  onResetDefaults,
  isOpen,
  onToggleOpen,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const SIZE = 120;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 12;

  // Convert wind bearing (0=N, 90=E clockwise) → SVG angle (0=right, CCW)
  const bearingToSvgRad = (b: number) => ((b - 90) * Math.PI) / 180;

  const arrowRad = bearingToSvgRad(windDirectionDeg);
  const arrowTipX = CX + R * Math.cos(arrowRad);
  const arrowTipY = CY + R * Math.sin(arrowRad);
  const arrowBaseX = CX - R * 0.45 * Math.cos(arrowRad);
  const arrowBaseY = CY - R * 0.45 * Math.sin(arrowRad);

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
      const deg = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360);
      return deg;
    },
    []
  );

  const isDragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDragging.current = true;
    onChangeWindDirection(getAngleFromEvent(e));
  };
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    onChangeWindDirection(getAngleFromEvent(e));
  };
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    onChangeWindDirection(getAngleFromEvent(e));
  };

  const cardinalLabels = [
    { label: 'N', deg: 0, x: CX, y: CY - R + 10 },
    { label: 'E', deg: 90, x: CX + R - 10, y: CY + 3 },
    { label: 'S', deg: 180, x: CX, y: CY + R - 6 },
    { label: 'W', deg: 270, x: CX - R + 10, y: CY + 3 },
  ];

  const tickDirs = [0, 45, 90, 135, 180, 225, 270, 315];
  const cardinal = getCardinalDirection(windDirectionDeg);
  const safeHeading = (windDirectionDeg + 180) % 360;
  const safeCardinal = getCardinalDirection(safeHeading);

  return (
    <div className="bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden font-mono pointer-events-auto transition-all">
      {/* Header Bar */}
      <div
        onClick={onToggleOpen}
        className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 cursor-pointer hover:bg-slate-850 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-100">WHAT-IF WIND CONTROLS</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded font-bold">
            {windDirectionDeg}° {cardinal}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expandable Controls Body */}
      {isOpen && (
        <div className="p-3 space-y-3">
          {/* Compass & Angle Info */}
          <div className="flex items-center justify-around gap-2">
            {/* SVG Compass */}
            <div className="flex flex-col items-center">
              <svg
                ref={svgRef}
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="cursor-crosshair touch-none select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onChangeWindDirection(getAngleFromEvent(e));
                }}
                onTouchMove={handleTouchMove}
              >
                {/* Outer dial */}
                <circle cx={CX} cy={CY} r={R} fill="rgba(15,23,42,0.85)" stroke="#06b6d4" strokeWidth="1.2" />

                {/* Tick marks */}
                {tickDirs.map((deg) => {
                  const rad = bearingToSvgRad(deg);
                  const isMajor = deg % 90 === 0;
                  const inner = R - (isMajor ? 8 : 4);
                  return (
                    <line
                      key={deg}
                      x1={CX + inner * Math.cos(rad)}
                      y1={CY + inner * Math.sin(rad)}
                      x2={CX + R * Math.cos(rad)}
                      y2={CY + R * Math.sin(rad)}
                      stroke={isMajor ? '#38bdf8' : '#475569'}
                      strokeWidth={isMajor ? 1.5 : 1}
                    />
                  );
                })}

                {/* Cardinal text */}
                {cardinalLabels.map(({ label, x, y }) => (
                  <text
                    key={label}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#94a3b8"
                  >
                    {label}
                  </text>
                ))}

                {/* Wind direction pointer arrow */}
                <line
                  x1={arrowBaseX}
                  y1={arrowBaseY}
                  x2={arrowTipX}
                  y2={arrowTipY}
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx={arrowTipX} cy={arrowTipY} r="3" fill="#f87171" />
                <circle cx={CX} cy={CY} r="3.5" fill="#06b6d4" />
              </svg>
              <div className="text-[9px] text-gray-400 mt-1">Drag Dial to Rotate</div>
            </div>

            {/* Live Angle & Corridor Telemetry */}
            <div className="flex flex-col gap-1.5 text-[10px] min-w-[130px]">
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                <div className="text-gray-500 text-[9px]">Downwind Hazard Axis</div>
                <div className="text-red-400 font-bold text-xs flex items-center gap-1">
                  <span>{windDirectionDeg}°</span>
                  <span>({cardinal})</span>
                </div>
              </div>

              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                <div className="text-gray-500 text-[9px]">Upwind Safe Corridor</div>
                <div className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <span>{safeHeading}°</span>
                  <span>({safeCardinal})</span>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[
                  { label: 'N', deg: 0 },
                  { label: 'E', deg: 90 },
                  { label: 'S', deg: 180 },
                  { label: 'W', deg: 270 },
                ].map(({ label, deg }) => (
                  <button
                    key={label}
                    onClick={() => onChangeWindDirection(deg)}
                    className={`py-0.5 rounded text-[9px] font-bold border transition-colors ${
                      windDirectionDeg === deg
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-gray-300 border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Wind Speed Slider */}
          <div className="space-y-1 pt-1 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">WIND VELOCITY</span>
              <span className="text-cyan-400 font-bold">{windSpeedMs.toFixed(1)} m/s ({Math.round(windSpeedMs * 3.6)} km/h)</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="0.5"
              value={windSpeedMs}
              onChange={(e) => onChangeWindSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[8px] text-gray-500">
              <span>0 m/s (Calm)</span>
              <span>12.5 m/s (Breeze)</span>
              <span>25 m/s (Gale)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
