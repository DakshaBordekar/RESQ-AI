import React, { useState } from 'react';
import Spline from '@splinetool/react-spline';
import { Loader2, Layers } from 'lucide-react';

interface SplineCanvasViewerProps {
  sceneUrl?: string;
  className?: string;
}

export const SplineCanvasViewer: React.FC<SplineCanvasViewerProps> = ({
  sceneUrl = 'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode',
  className = 'w-full h-full',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative ${className} bg-slate-950 overflow-hidden`}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 text-cyan-400 font-mono text-xs">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-cyan-400" />
          <span>INITIALIZING 3D SPLINE COMMAND ENVIRONMENT...</span>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs p-4 text-center">
          <Layers className="w-10 h-10 mb-2 text-cyan-500/50" />
          <span className="text-cyan-400 font-bold mb-1">LOCAL 3D CANVAS STANDBY</span>
          <span>Spline scene offline — rendering native Three.js 3D city scene.</span>
        </div>
      ) : (
        <Spline
          scene={sceneUrl}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full"
        />
      )}
    </div>
  );
};
