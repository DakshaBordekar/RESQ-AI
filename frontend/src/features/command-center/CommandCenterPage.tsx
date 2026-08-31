import React, { useState, useEffect } from 'react';
import {
  getIncidents,
  getResources,
  getHospitals,
  getRoadSegments,
  getDispatches,
  getActiveScenario,
  getAnalyticsSummary,
  runOptimization,
  approveDispatch,
  toggleRoadBlockage,
  injectSimulationEvent,
  resetSimulation,
} from '../../services/api';
import { Incident, Resource, Hospital, RoadSegment, Dispatch, SimulationScenario, AnalyticsSummary } from '../../types';
import { Header } from '../../components/layout/Header';
import { IncidentQueuePanel } from './IncidentQueuePanel';
import { SituationMap } from '../../components/map/SituationMap';
import { ExplainabilityCard } from './ExplainabilityCard';
import { FleetTelemetryDock } from './FleetTelemetryDock';
import { IncidentIntakeModal } from '../intake/IncidentIntakeModal';
import { ActionPlanViewer } from '../action-plan/ActionPlanViewer';

export const CommandCenterPage: React.FC = () => {
  // Master State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [roadSegments, setRoadSegments] = useState<RoadSegment[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [scenario, setScenario] = useState<SimulationScenario | undefined>();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | undefined>();

  // Selected Item State
  const [selectedIncident, setSelectedIncident] = useState<Incident | undefined>();
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Modals State
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isActionPlanOpen, setIsActionPlanOpen] = useState(false);

  // Fetch all live data
  const fetchData = async () => {
    try {
      const [inc, res, hosp, roads, disp, scen, ana] = await Promise.all([
        getIncidents(),
        getResources(),
        getHospitals(),
        getRoadSegments(),
        getDispatches(),
        getActiveScenario().catch(() => undefined),
        getAnalyticsSummary().catch(() => undefined),
      ]);
      setIncidents(inc);
      setResources(res);
      setHospitals(hosp);
      setRoadSegments(roads);
      setDispatches(disp);
      if (scen) setScenario(scen);
      if (ana) setAnalytics(ana);

      // Auto-select first critical incident if none selected
      if (!selectedIncident && inc.length > 0) {
        setSelectedIncident(inc[0]);
      }
    } catch (err) {
      console.error('Failed to fetch command center telemetry:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3500); // 3.5s live polling loop
    return () => clearInterval(interval);
  }, []);

  // Actions
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      await runOptimization();
      await fetchData();
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApproveDispatch = async (dispatchId: string) => {
    try {
      await approveDispatch(dispatchId);
      await fetchData();
    } catch (err) {
      console.error('Failed to approve dispatch:', err);
    }
  };

  const handleToggleRoad = async (roadId: string) => {
    try {
      await toggleRoadBlockage(roadId);
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle road:', err);
    }
  };

  // Disruption Simulation Triggers
  const handleInjectBlockage = async () => {
    try {
      await injectSimulationEvent('ROAD_BLOCKED', { road_name: 'Saidapet', title: 'Saidapet Bridge Submerged & Blocked' });
      await fetchData();
    } catch (err) {
      console.error('Blockage injection failed:', err);
    }
  };

  const handleInjectHospitalSurge = async () => {
    try {
      await injectSimulationEvent('HOSPITAL_SURGE', { hospital_name: 'Government', title: 'Rajiv Gandhi GH ICU Saturated' });
      await fetchData();
    } catch (err) {
      console.error('Hospital surge injection failed:', err);
    }
  };

  const handleInjectIncidentBurst = async () => {
    try {
      await injectSimulationEvent('NEW_INCIDENT', {
        title: 'Emergency: 4 Dialysis Patients Trapped on 2nd Floor',
        location_name: 'Velachery South Sector',
        latitude: 12.9790,
        longitude: 80.2150,
        people_affected: 4,
        vulnerable_people: 2,
        vulnerability_flags: ['ELDERLY', 'DIALYSIS'],
      });
      await fetchData();
    } catch (err) {
      console.error('Incident burst injection failed:', err);
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetSimulation();
      await fetchData();
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const activeDispatchForSelected = dispatches.find(
    (d) => selectedIncident && (d.incident === selectedIncident.id || d.incident_details?.id === selectedIncident.id)
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-gray-100 overflow-hidden font-sans">
      {/* 1. Global Header */}
      <Header
        scenario={scenario}
        onOpenIntake={() => setIsIntakeOpen(true)}
        onRunOptimization={handleRunOptimization}
        onResetDemo={handleResetDemo}
        isOptimizing={isOptimizing}
      />

      {/* 2. Main 3-Zone Body (Left Queue, Center Map, Right Explainability Hub) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Incident Queue */}
        <IncidentQueuePanel
          incidents={incidents}
          selectedIncidentId={selectedIncident?.id}
          onSelectIncident={(inc) => setSelectedIncident(inc)}
        />

        {/* Center: Leaflet Situation GIS Map */}
        <div className="flex-1 h-full relative">
          <SituationMap
            incidents={incidents}
            resources={resources}
            hospitals={hospitals}
            roadSegments={roadSegments}
            dispatches={dispatches}
            selectedIncidentId={selectedIncident?.id}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onToggleRoad={handleToggleRoad}
          />
        </div>

        {/* Right: Explainability & Action Card */}
        <ExplainabilityCard
          incident={selectedIncident}
          dispatch={activeDispatchForSelected}
          onApproveDispatch={handleApproveDispatch}
        />
      </div>

      {/* 3. Bottom Fleet & Telemetry Dock */}
      <FleetTelemetryDock
        resources={resources}
        hospitals={hospitals}
        analytics={analytics}
        onOpenActionPlan={() => setIsActionPlanOpen(true)}
        onInjectBlockage={handleInjectBlockage}
        onInjectHospitalSurge={handleInjectHospitalSurge}
        onInjectIncidentBurst={handleInjectIncidentBurst}
      />

      {/* 4. Modals */}
      <IncidentIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onIncidentCreated={fetchData}
      />

      <ActionPlanViewer
        isOpen={isActionPlanOpen}
        onClose={() => setIsActionPlanOpen(false)}
      />
    </div>
  );
};
