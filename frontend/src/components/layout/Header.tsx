import React from 'react';
import { Shield, Sparkles, PlusCircle, RefreshCw, Radio, CloudRain, Wind, Thermometer } from 'lucide-react';
import { Button } from '../ui/Button';
import { SimulationScenario, WeatherTelemetry } from '../../types';

interface HeaderProps {
  scenario?: SimulationScenario;
  weather?: WeatherTelemetry;
  onOpenIntake: () => void;
  onRunOptimization: () => void;
  onResetDemo: () => void;
  isOptimizing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  scenario,
  weather,
  onOpenIntake,
  onRunOptimization,
  onResetDemo,
  isOptimizing = false,
}) => {
  return (
    <header className="h-14 bg-surface-1 border-b border-gray-800 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 px-2.5 py-1 rounded">
          <Shield className="w-5 h-5 text-priority-critical" />
          <span className="font-bold text-sm tracking-wider text-white">RESQ-AI</span>
          <span className="text-[10px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded font-bold">COMMAND</span>
        </div>
        <div className="h-4 w-[1px] bg-gray-800" />
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-medium text-gray-200">{scenario?.name || 'Chennai Deluge 2026'}</span>
          <span className="font-mono text-gray-400 bg-surface-2 px-1.5 py-0.5 rounded border border-gray-700">
            T+{scenario?.tick_minutes || 0}m
          </span>
        </div>

        {/* Live Weather Telemetry Pill */}
        {weather && (
          <>
            <div className="h-4 w-[1px] bg-gray-800" />
            <div className="flex items-center gap-2.5 text-xs bg-surface-2/60 border border-gray-700/80 px-2.5 py-1 rounded-md">
              <div className="flex items-center gap-1 text-cyan-400 font-mono font-medium">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                <span>{weather.description}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-300 font-mono text-[11px]">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>{weather.temperature_c}°C</span>
              </div>
              <div className="flex items-center gap-1 text-blue-300 font-mono text-[11px]">
                <Wind className="w-3 h-3 text-blue-400" />
                <span>{weather.wind_speed_kmh} km/h</span>
              </div>
              <span className={`text-[9px] font-mono px-1 rounded font-bold ${weather.is_live ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-surface-3 text-gray-400'}`}>
                {weather.is_live ? 'LIVE API' : 'SIMULATED'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Global Command Actions */}
      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenIntake}
          icon={<PlusCircle className="w-4 h-4 text-blue-400" />}
        >
          AI Incident Intake
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onRunOptimization}
          isLoading={isOptimizing}
          icon={<Sparkles className="w-4 h-4 text-amber-300" />}
        >
          Run Smart Dispatch
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onResetDemo}
          icon={<RefreshCw className="w-3.5 h-3.5 text-gray-400" />}
          title="Reset scenario to clean baseline"
        >
          Reset
        </Button>

        <div className="h-4 w-[1px] bg-gray-800" />
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-gray-400 font-mono">LIVE EOC</span>
        </div>
      </div>
    </header>
  );
};
