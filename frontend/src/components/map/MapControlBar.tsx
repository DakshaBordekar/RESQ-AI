import React from 'react';
import { Compass, ShieldAlert, Building2, Truck, Waves, GitCommit, Layers, Map } from 'lucide-react';

export interface MapLayerState {
  incidents: boolean;
  hospitals: boolean;
  vehicles: boolean;
  flood: boolean;
  routes: boolean;
}

interface MapControlBarProps {
  is3DMode: boolean;
  onToggle3DMode: () => void;
  layers: MapLayerState;
  onToggleLayer: (layer: keyof MapLayerState) => void;
  onResetView: () => void;
}

export const MapControlBar: React.FC<MapControlBarProps> = ({
  is3DMode,
  onToggle3DMode,
  layers,
  onToggleLayer,
  onResetView,
}) => {
  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 p-1.5 rounded-lg shadow-2xl shadow-cyan-950/40 text-xs font-mono select-none">
      {/* 2D / 3D Mode Toggle */}
      <button
        onClick={onToggle3DMode}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-all duration-200 ${
          is3DMode
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/30'
            : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'
        }`}
      >
        {is3DMode ? <Layers className="w-4 h-4 animate-pulse" /> : <Map className="w-4 h-4" />}
        <span>{is3DMode ? '3D COMMAND SCENE' : '2D GIS MAP'}</span>
      </button>

      <div className="h-4 w-px bg-slate-800 my-auto" />

      {/* Reset Camera View */}
      <button
        onClick={onResetView}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-slate-300 bg-slate-900/80 hover:bg-slate-800 hover:text-cyan-400 border border-slate-800 transition-colors"
        title="Reset Camera View to Chennai Command Center"
      >
        <Compass className="w-3.5 h-3.5" />
        <span>RESET VIEW</span>
      </button>

      <div className="h-4 w-px bg-slate-800 my-auto" />

      {/* Layer Toggles */}
      <div className="flex items-center gap-1">
        {/* Incidents Toggle */}
        <button
          onClick={() => onToggleLayer('incidents')}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
            layers.incidents
              ? 'bg-red-950/60 border-red-500/50 text-red-400 font-semibold'
              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>INCIDENTS</span>
        </button>

        {/* Hospitals Toggle */}
        <button
          onClick={() => onToggleLayer('hospitals')}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
            layers.hospitals
              ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300 font-semibold'
              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>HOSPITALS</span>
        </button>

        {/* Vehicles Toggle */}
        <button
          onClick={() => onToggleLayer('vehicles')}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
            layers.vehicles
              ? 'bg-blue-950/60 border-blue-500/50 text-blue-300 font-semibold'
              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>FLEET</span>
        </button>

        {/* Flood Layer Toggle */}
        <button
          onClick={() => onToggleLayer('flood')}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
            layers.flood
              ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold'
              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>FLOOD ZONES</span>
        </button>

        {/* Routes Toggle */}
        <button
          onClick={() => onToggleLayer('routes')}
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
            layers.routes
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-semibold'
              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>ROUTES</span>
        </button>
      </div>
    </div>
  );
};
