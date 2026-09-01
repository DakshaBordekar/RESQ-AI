import React from 'react';
import { Layers } from 'lucide-react';

interface SplineCanvasViewerProps {
  sceneUrl?: string;
  className?: string;
}

// Spline package removed (broken @splinetool/animation-core dependency).
// Replaced with a neutral placeholder so the rest of the app compiles.
export const SplineCanvasViewer: React.FC<SplineCanvasViewerProps> = ({
  className = 'w-full h-full',
}) => (
  <div className={`relative ${className} bg-slate-950 flex flex-col items-center justify-center text-slate-500 font-mono text-xs`}>
    <Layers className="w-10 h-10 mb-2 text-cyan-500/40" />
    <span className="text-cyan-400 font-bold mb-1">3D CANVAS STANDBY</span>
    <span>Spline viewer not available — use Three.js Digital Twin.</span>
  </div>
);
