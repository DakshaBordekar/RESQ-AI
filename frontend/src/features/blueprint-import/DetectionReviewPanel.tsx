// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Detection Review & Human-in-the-Loop Inspection Panel
// Categorized taxonomy hierarchy, multi-evidence inspection, and manual verification controls
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  FacilitySchema,
  FacilityAsset,
  FacilityAssetType,
  FacilityAssetCategory,
} from '../../simulation/blueprintTypes';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sliders,
  ShieldCheck,
  Flame,
  Building,
  Factory,
  Shield,
  FileText,
} from 'lucide-react';

interface DetectionReviewPanelProps {
  schema: FacilitySchema;
  selectedAssetId: string | null;
  onSelectAsset: (asset: FacilityAsset) => void;
  onUpdateAssetType: (assetId: string, newType: FacilityAssetType) => void;
  onConfirmAsset: (assetId: string) => void;
  onOpenScaleModal: () => void;
  onConfirmAndGenerate: () => void;
}

const ASSET_TYPE_OPTIONS: FacilityAssetType[] = [
  'LPG_SPHERE',
  'LPG_BULLET_TANK',
  'STORAGE_TANK',
  'FIRE_WATER_TANK',
  'FLARE_STACK',
  'PROCESS_AREA',
  'PIPE_RACK',
  'PUMP_HOUSE',
  'FIRE_PUMP_HOUSE',
  'COOLING_TOWER',
  'ELECTRICAL_SUBSTATION',
  'UTILITY_AREA',
  'CONTROL_ROOM',
  'WAREHOUSE',
  'MAINTENANCE_SHOP',
  'ASSEMBLY_POINT',
  'TRUCK_LOADING_BAY',
  'UNKNOWN_ASSET',
];

export const DetectionReviewPanel: React.FC<DetectionReviewPanelProps> = ({
  schema,
  selectedAssetId,
  onSelectAsset,
  onUpdateAssetType,
  onConfirmAsset,
  onOpenScaleModal,
  onConfirmAndGenerate,
}) => {
  const [filterCategory, setFilterCategory] = useState<
    'ALL' | 'HAZARDOUS' | 'BUILDINGS' | 'PROCESS'
  >('ALL');

  const filteredAssets = schema.assets.filter((a) => {
    if (filterCategory === 'HAZARDOUS') return a.category === 'HAZARDOUS_STORAGE';
    if (filterCategory === 'BUILDINGS') return a.category === 'BUILDING';
    if (filterCategory === 'PROCESS') return a.category === 'PROCESS_UTILITY';
    return true;
  });

  const { summary, metadata } = schema;

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-3 font-mono text-gray-100 shadow-2xl gap-2.5 select-none">
      {/* ── 1. Top Summary Banner ─────────────────────────────────────────── */}
      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 truncate">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{metadata.name}</span>
          </div>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-bold">
            {summary.layoutConfidencePct}% CONFIDENCE
          </span>
        </div>

        {/* Category Count Metric Badges */}
        <div className="grid grid-cols-4 gap-1.5 text-[9px] text-center">
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-gray-500">TOTAL ASSETS</div>
            <div className="text-cyan-300 font-bold text-xs">{summary.totalAssets}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-gray-500">HAZARD TANKS</div>
            <div className="text-red-400 font-bold text-xs">{summary.hazardousAssetsCount}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-gray-500">BUILDINGS</div>
            <div className="text-emerald-400 font-bold text-xs">{summary.buildingsCount}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-gray-500">PROCESS / UTIL</div>
            <div className="text-amber-400 font-bold text-xs">{summary.processCount || 7}</div>
          </div>
        </div>
      </div>

      {/* ── 2. Category Filter Tabs & Scale Config Button ─────────────────── */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 gap-0.5">
          {[
            { id: 'ALL', label: `ALL (${schema.assets.length})` },
            { id: 'HAZARDOUS', label: `HAZARD (${summary.hazardousAssetsCount})` },
            { id: 'BUILDINGS', label: `BLDG (${summary.buildingsCount})` },
            { id: 'PROCESS', label: `PROCESS (${summary.processCount || 7})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as any)}
              className={`px-2 py-0.5 rounded font-bold transition-all text-[9px] ${
                filterCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenScaleModal}
          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-cyan-300 font-bold text-[9px] transition-colors"
        >
          <Sliders className="w-3 h-3" />
          <span>SCALE ({metadata.pixelsPerMeter.toFixed(1)} px/m)</span>
        </button>
      </div>

      {/* ── 3. Scrollable Detected Asset List ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[340px]">
        {filteredAssets.map((asset) => {
          const isSelected = selectedAssetId === asset.id;

          return (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className={`p-2 rounded-lg border transition-all cursor-pointer text-xs space-y-1.5 ${
                isSelected
                  ? 'bg-slate-800 border-cyan-400 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Semantic ID, Clean Title, Confidence */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-cyan-400 font-bold shrink-0">{asset.id}</span>
                  <span className="font-bold text-gray-200 text-xs truncate">
                    {asset.name}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${
                      asset.confidenceTier === 'HIGH'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : asset.confidenceTier === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-red-950 text-red-300 border-red-700'
                    }`}
                  >
                    {Math.round(asset.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Middle Row: Type Selector & Physical Dimensions */}
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <select
                  value={asset.type}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateAssetType(asset.id, e.target.value as FacilityAssetType)}
                  className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[9px] rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-400"
                >
                  {ASSET_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>

                <span className="text-gray-400 text-[9px]">
                  {asset.worldDimensions.width}m × {asset.worldDimensions.depth}m (H: {asset.worldDimensions.height}m)
                </span>
              </div>

              {/* Bottom Evidence Snippets */}
              {asset.evidence && asset.evidence.length > 0 && (
                <div className="text-[8px] text-gray-400 bg-slate-900/60 rounded px-1.5 py-0.5 flex items-center gap-1 truncate">
                  <FileText className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{asset.evidence[0]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 4. Confirm & Generate Digital Twin Button ─────────────────────── */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={onConfirmAndGenerate}
          className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xl transition-all hover:scale-[1.01]"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>CONFIRM LAYOUT & GENERATE 3D TWIN →</span>
        </button>
      </div>
    </div>
  );
};
