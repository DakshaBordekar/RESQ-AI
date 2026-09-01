// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Interactive 2D Blueprint Overlay Canvas
// Renders the original blueprint image with synchronized bounding boxes, labels & visual debug mode
// ────────────────────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';
import { FacilitySchema, FacilityAsset } from '../../simulation/blueprintTypes';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Eye, Bug, FileText } from 'lucide-react';

interface BlueprintOverlayCanvasProps {
  blueprintImageUrl: string;
  schema: FacilitySchema;
  selectedAssetId: string | null;
  onSelectAsset: (asset: FacilityAsset) => void;
}

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  HAZARDOUS_STORAGE: 'border-red-500 bg-red-500/15 text-red-300',
  PROCESS_UTILITY: 'border-cyan-400 bg-cyan-500/15 text-cyan-300',
  BUILDING: 'border-emerald-400 bg-emerald-500/15 text-emerald-300',
  INFRASTRUCTURE: 'border-amber-400 bg-amber-500/15 text-amber-300',
  SAFETY: 'border-green-400 bg-green-500/15 text-green-300',
  UNKNOWN: 'border-gray-400 bg-gray-500/15 text-gray-300',
};

export const BlueprintOverlayCanvas: React.FC<BlueprintOverlayCanvasProps> = ({
  blueprintImageUrl,
  schema,
  selectedAssetId,
  onSelectAsset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  const { blueprintWidthPx, blueprintHeightPx } = schema.metadata;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 select-none">
      {/* Top Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 border-b border-slate-800 flex items-center justify-between z-20 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 font-bold uppercase">2D BLUEPRINT VIEW</span>
          <span className="text-[10px] text-gray-400">
            ({blueprintWidthPx} × {blueprintHeightPx} px • {schema.assets.length} Validated Structures)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showOverlays
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            <Eye className="w-3 h-3 inline mr-1" />
            <span>OVERLAYS</span>
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              showLabels
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-gray-400 border-slate-700'
            }`}
          >
            <span>LABELS</span>
          </button>

          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
              debugMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-800 text-gray-400 border-slate-700 hover:text-amber-300'
            }`}
            title="Toggle Visual Debug & OCR Evidence Mode"
          >
            <Bug className="w-3 h-3" />
            <span>DEBUG</span>
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-400 w-10 text-center font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Blueprint Image Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 bg-slate-950/80"
      >
        <div
          className="relative transition-transform duration-100 ease-out origin-center shadow-2xl rounded-lg overflow-hidden border border-slate-800 shrink-0"
          style={{
            width: `${blueprintWidthPx * zoom}px`,
            height: `${blueprintHeightPx * zoom}px`,
          }}
        >
          {/* Blueprint Base Image */}
          <img
            src={blueprintImageUrl}
            alt="Uploaded Blueprint Plan"
            className="w-full h-full object-contain pointer-events-none bg-white"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Interactive Bounding Box Overlays */}
          {showOverlays && (
            <div className="absolute inset-0 w-full h-full">
              {schema.assets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                const styleClass = CATEGORY_BORDER_COLORS[asset.category] || CATEGORY_BORDER_COLORS.UNKNOWN;

                // Scale bounding box by current zoom
                const left = (asset.pixelPos.x - asset.pixelDimensions.width / 2) * zoom;
                const top = (asset.pixelPos.y - asset.pixelDimensions.height / 2) * zoom;
                const width = asset.pixelDimensions.width * zoom;
                const height = asset.pixelDimensions.height * zoom;

                return (
                  <div
                    key={asset.id}
                    onClick={() => onSelectAsset(asset)}
                    className={`absolute rounded transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400/30 ring-2 ring-cyan-300 shadow-xl z-30'
                        : `${styleClass} hover:border-cyan-300 hover:bg-cyan-500/20 z-10`
                    }`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    {/* Floating Header Tag */}
                    {showLabels && (
                      <div className="absolute -top-5 left-0 bg-slate-950/95 border border-slate-700 px-1 py-0.2 rounded text-[8px] font-mono font-bold whitespace-nowrap text-gray-200 shadow-lg flex items-center gap-1">
                        <span className="text-cyan-400">{asset.id}</span>
                        <span className="text-gray-300">{asset.type.replace(/_/g, ' ')}</span>
                        <span className="text-emerald-400">({Math.round(asset.confidence * 100)}%)</span>
                      </div>
                    )}

                    {/* Visual Debug Evidence Card */}
                    {debugMode && (
                      <div className="absolute top-full left-0 mt-1 bg-slate-950/95 border border-amber-500/60 p-1.5 rounded text-[8px] font-mono text-gray-200 shadow-2xl z-40 space-y-0.5 min-w-[160px] pointer-events-none">
                        <div className="text-amber-400 font-bold border-b border-slate-800 pb-0.5">
                          OCR: {asset.nearbyText || 'N/A'}
                        </div>
                        <div className="text-gray-400">
                          Shape: {asset.pixelDimensions.width}×{asset.pixelDimensions.height}px
                        </div>
                        <div className="text-cyan-300">
                          Class: {asset.type} ({Math.round(asset.classificationConfidence * 100)}%)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
