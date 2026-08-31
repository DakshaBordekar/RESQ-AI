import axios from 'axios';
import { Incident, Resource, Hospital, RoadSegment, Dispatch, SimulationScenario, AnalyticsSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Incidents
export const getIncidents = async (): Promise<Incident[]> => {
  const res = await apiClient.get('/incidents/');
  return res.data.results || res.data;
};

export const createIncident = async (payload: Partial<Incident>): Promise<Incident> => {
  const res = await apiClient.post('/incidents/', payload);
  return res.data;
};

export const analyzeTextAI = async (raw_text: string) => {
  const res = await apiClient.post('/incidents/analyze-text/', { raw_text });
  return res.data;
};

export const recalculateIncidentPriority = async (id: string) => {
  const res = await apiClient.post(`/incidents/${id}/recalculate-priority/`);
  return res.data;
};

export const bulkInjectIncidents = async () => {
  const res = await apiClient.post('/incidents/bulk-inject/');
  return res.data;
};

// Resources & Fleet
export const getResources = async (): Promise<Resource[]> => {
  const res = await apiClient.get('/resources/');
  return res.data.results || res.data;
};

export const updateResourceStatus = async (id: string, status: string): Promise<Resource> => {
  const res = await apiClient.patch(`/resources/${id}/status/`, { status });
  return res.data;
};

// Hospitals
export const getHospitals = async (): Promise<Hospital[]> => {
  const res = await apiClient.get('/hospitals/');
  return res.data.results || res.data;
};

// Road Network & Routing
export const getRoadSegments = async (): Promise<RoadSegment[]> => {
  const res = await apiClient.get('/roads/');
  return res.data.results || res.data;
};

export const toggleRoadBlockage = async (id: string): Promise<RoadSegment> => {
  const res = await apiClient.post(`/roads/${id}/toggle-blockage/`);
  return res.data;
};

export const calculateRoute = async (origin_lat: number, origin_lon: number, dest_lat: number, dest_lon: number) => {
  const res = await apiClient.post('/routes/calculate/', {
    origin_lat, origin_lon, dest_lat, dest_lon
  });
  return res.data;
};

// Optimization & Dispatches
export const getDispatches = async (): Promise<Dispatch[]> => {
  const res = await apiClient.get('/dispatches/');
  return res.data.results || res.data;
};

export const runOptimization = async () => {
  const res = await apiClient.post('/optimization/run/');
  return res.data;
};

export const approveDispatch = async (id: string): Promise<Dispatch> => {
  const res = await apiClient.post(`/dispatches/${id}/approve/`);
  return res.data;
};

export const cancelDispatch = async (id: string): Promise<Dispatch> => {
  const res = await apiClient.post(`/dispatches/${id}/cancel/`);
  return res.data;
};

// Simulation
export const getActiveScenario = async (): Promise<SimulationScenario> => {
  const res = await apiClient.get('/simulation/active/');
  return res.data;
};

export const injectSimulationEvent = async (event_type: string, details: any) => {
  const res = await apiClient.post('/simulation/inject-event/', { event_type, details });
  return res.data;
};

export const stepSimulation = async (step_minutes: number = 5) => {
  const res = await apiClient.post('/simulation/step/', { step_minutes });
  return res.data;
};

export const resetSimulation = async () => {
  const res = await apiClient.post('/simulation/reset/');
  return res.data;
};

// Analytics & EAP
export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const res = await apiClient.get('/analytics/summary/');
  return res.data;
};

export const getActionPlan = async () => {
  const res = await apiClient.get('/action-plan/generate/');
  return res.data;
};
