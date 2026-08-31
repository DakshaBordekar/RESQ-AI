import React from 'react';
import { PriorityTier } from '../../types';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface PriorityBadgeProps {
  tier: PriorityTier;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  tier,
  score,
  showIcon = true,
  size = 'md',
}) => {
  const configs = {
    CRITICAL: {
      bg: 'bg-red-950/70 border-red-500/50 text-red-400',
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />,
      label: 'CRITICAL',
    },
    HIGH: {
      bg: 'bg-orange-950/70 border-orange-500/50 text-orange-400',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
      label: 'HIGH',
    },
    MEDIUM: {
      bg: 'bg-yellow-950/70 border-yellow-500/50 text-yellow-400',
      icon: <Info className="w-3.5 h-3.5 text-yellow-400" />,
      label: 'MEDIUM',
    },
    LOW: {
      bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'LOW',
    },
  };

  const config = configs[tier] || configs.MEDIUM;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded border ${config.bg} ${padding}`}>
      {showIcon && config.icon}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="opacity-90 ml-0.5 border-l border-current/30 pl-1.5">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
};
