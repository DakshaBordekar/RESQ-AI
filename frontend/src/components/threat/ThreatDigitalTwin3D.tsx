// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Threat Digital Twin 3D Component
// Realistic 3D Industrial Emergency Digital Twin
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { ThreatResponse, ThreatCalculateParams } from '../../simulation/types';
import { DigitalTwinCanvas } from '../../three/DigitalTwinCanvas';

interface ThreatDigitalTwin3DProps {
  threatData: ThreatResponse | null;
  params?: ThreatCalculateParams;
  isImmersive?: boolean;
  onToggleImmersive?: () => void;
  onExit3D: () => void;
}

export const ThreatDigitalTwin3D: React.FC<ThreatDigitalTwin3DProps> = ({
  threatData,
  params,
  isImmersive,
  onToggleImmersive,
  onExit3D,
}) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <DigitalTwinCanvas
        threatData={threatData}
        params={params}
        isImmersive={isImmersive}
        onToggleImmersive={onToggleImmersive}
        onExit3D={onExit3D}
      />
    </div>
  );
};

export default ThreatDigitalTwin3D;
