import React from 'react';
import { Cpu, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface DispatchToastProps {
  step: number; // 0 = idle, 1..4 = progress steps, 5 = completed
  message: string;
}

export const DispatchToast: React.FC<DispatchToastProps> = ({ step, message }) => {
  if (step === 0) return null;

  const isComplete = step === 5;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 p-4 rounded-xl shadow-2xl shadow-cyan-950/80 min-w-[340px] text-gray-100 font-mono animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 w-full border-b border-slate-800 pb-2">
        <div className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
          {isComplete ? (
            <Sparkles className="w-5 h-5 text-emerald-400 animate-bounce" />
          ) : (
            <Cpu className="w-5 h-5 animate-pulse text-cyan-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold flex items-center justify-between">
            <span>RESQ-AI DISPATCH ENGINE</span>
            <span>{isComplete ? 'OPTIMIZED' : `STEP ${Math.min(step, 4)} / 4`}</span>
          </div>
          <div className="text-sm font-semibold text-gray-100 mt-0.5 flex items-center gap-2">
            {!isComplete && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
            {message}
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-4 gap-1.5 w-full pt-1">
        {[1, 2, 3, 4].map((i) => {
          const isActive = step >= i;
          return (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isComplete
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : isActive
                  ? 'bg-cyan-400 shadow-sm shadow-cyan-500/50'
                  : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>

      {isComplete && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>Optimal SciPy Hungarian & Dijkstra Routes Deployed to 3D Scene</span>
        </div>
      )}
    </div>
  );
};
