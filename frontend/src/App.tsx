// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Master Application Root
// Seamless routing between Threat-Zone Digital Twin (DER-02), Mission Mode, and Blueprint Import
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { CommandCenterPage } from './features/command-center/CommandCenterPage';
import { MissionModePage } from './features/mission/MissionModePage';
import { BlueprintImportPage } from './features/blueprint-import/BlueprintImportPage';

export default function App() {
  const [activePage, setActivePage] = useState<
    'COMMAND_CENTER' | 'MISSION_MODE' | 'BLUEPRINT_IMPORT'
  >('COMMAND_CENTER');

  return (
    <>
      {activePage === 'COMMAND_CENTER' && (
        <CommandCenterPage
          onNavigateToMission={() => setActivePage('MISSION_MODE')}
          onNavigateToBlueprint={() => setActivePage('BLUEPRINT_IMPORT')}
        />
      )}

      {activePage === 'MISSION_MODE' && (
        <MissionModePage
          onBackToCommandCenter={() => setActivePage('COMMAND_CENTER')}
          onNavigateToBlueprint={() => setActivePage('BLUEPRINT_IMPORT')}
        />
      )}

      {activePage === 'BLUEPRINT_IMPORT' && (
        <BlueprintImportPage
          onBackToCommandCenter={() => setActivePage('COMMAND_CENTER')}
          onNavigateToMission={() => setActivePage('MISSION_MODE')}
        />
      )}
    </>
  );
}
