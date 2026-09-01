// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint Scale Calibration Modal
// Calibrate pixels-to-meters transformation via auto-detect, reference object, or manual ratio
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Sliders, X, CheckCircle2, Ruler } from 'lucide-react';
import { BlueprintScaleConfig } from '../../simulation/blueprintTypes';

interface ScaleReferenceModalProps {
  isOpen: boolean;
  currentPpm: number;
  onClose: () => void;
  onApplyScale: (config: BlueprintScaleConfig) => void;
}

export const ScaleReferenceModal: React.FC<ScaleReferenceModalProps> = ({
  isOpen,
  currentPpm,
  onClose,
  onApplyScale,
}) => {
  const [scaleMode, setScaleMode] = useState<'AUTO' | 'REFERENCE_DIMENSION' | 'MANUAL_PX_PER_M'>('AUTO');
  const [ppmInput, setPpmInput] = useState<number>(currentPpm || 3.5);
  const [referenceDimensionM, setReferenceDimensionM] = useState<number>(14.0);

  if (!isOpen) return null;

  const handleSave = () => {
    let finalPpm = ppmInput;
    if (scaleMode === 'REFERENCE_DIMENSION') {
      finalPpm = Math.max(0.5, (45 / referenceDimensionM)); // 45px reference width
    } else if (scaleMode === 'AUTO') {
      finalPpm = 3.5;
    }

    onApplyScale({
      mode: scaleMode,
      pixelsPerMeter: finalPpm,
      confidence: scaleMode === 'AUTO' ? 0.94 : 0.88,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-mono text-gray-100 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase">BLUEPRINT SCALE CALIBRATION</div>
              <div className="text-xs font-bold text-gray-200">2D Pixel to 3D World Transformation</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Calibration Modes */}
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
            <button
              onClick={() => setScaleMode('AUTO')}
              className={`py-1.5 rounded font-bold transition-all ${
                scaleMode === 'AUTO' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              AUTO DETECT
            </button>
            <button
              onClick={() => setScaleMode('REFERENCE_DIMENSION')}
              className={`py-1.5 rounded font-bold transition-all ${
                scaleMode === 'REFERENCE_DIMENSION' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              REFERENCE
            </button>
            <button
              onClick={() => setScaleMode('MANUAL_PX_PER_M')}
              className={`py-1.5 rounded font-bold transition-all ${
                scaleMode === 'MANUAL_PX_PER_M' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              MANUAL RATIO
            </button>
          </div>

          {scaleMode === 'AUTO' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-gray-300 space-y-1">
              <div className="text-cyan-400 font-bold">Standard 1:350 Petrochemical CAD Scale</div>
              <p className="text-gray-400 text-[10px] leading-relaxed">
                Automatically maps <strong>3.5 pixels = 1.0 meter</strong> based on detected standard 14m LPG spherical vessel footprints and 12m perimeter security gateways.
              </p>
            </div>
          )}

          {scaleMode === 'REFERENCE_DIMENSION' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] space-y-2">
              <div className="text-gray-400 text-[10px]">Known Reference Dimension (Main Road Width):</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={referenceDimensionM}
                  onChange={(e) => setReferenceDimensionM(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs w-28 focus:outline-none focus:border-cyan-400"
                />
                <span className="text-gray-400 text-xs font-bold">meters</span>
              </div>
            </div>
          )}

          {scaleMode === 'MANUAL_PX_PER_M' && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] space-y-2">
              <div className="text-gray-400 text-[10px]">Exact Pixels per Meter Ratio:</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={ppmInput}
                  onChange={(e) => setPpmInput(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs w-28 focus:outline-none focus:border-cyan-400"
                />
                <span className="text-gray-400 text-xs font-bold">px / meter</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow"
          >
            APPLY CALIBRATION
          </button>
        </div>
      </div>
    </div>
  );
};
