// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Master Application Root
// Seamless routing between Threat-Zone Digital Twin (DER-02) and Mission Mode
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { CommandCenterPage } from './features/command-center/CommandCenterPage';
import { MissionModePage } from './features/mission/MissionModePage';

export default function App() {
  const [activePage, setActivePage] = useState<'COMMAND_CENTER' | 'MISSION_MODE'>('COMMAND_CENTER');

  return (
    <>
      {activePage === 'COMMAND_CENTER' ? (
        <CommandCenterPage onNavigateToMission={() => setActivePage('MISSION_MODE')} />
      ) : (
        <MissionModePage onBackToCommandCenter={() => setActivePage('COMMAND_CENTER')} />
      )}
    </>
  );
}
