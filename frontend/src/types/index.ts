export type PriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'REPORTED' | 'PARSED' | 'TRIAGED' | 'DISPATCHED' | 'ON_SCENE' | 'RESOLVED' | 'CANCELLED';
export type HazardType = 'FLOOD' | 'FIRE' | 'MEDICAL' | 'STRUCTURAL_COLLAPSE';

export interface Incident {
  id: string;
  title: string;
  raw_text: string;
  location_name: string;
  latitude: number;
  longitude: number;
  hazard_type: HazardType;
  people_affected: number;
  vulnerable_people: number;
  vulnerability_flags: string[];
  medical_need: boolean;
  mobility_status: 'TRAPPED' | 'LIMITED' | 'AMBULATORY';
  urgency: 'IMMEDIATE' | 'URGENT' | 'MODERATE';
  calculated_priority: number;
  priority_tier: PriorityTier;
  status: IncidentStatus;
  reporter_name?: string;
  created_at: string;
}

export type ResourceType = 'AMBULANCE_BLS' | 'AMBULANCE_ALS' | 'RESCUE_BOAT' | 'NDRF_TEAM' | 'FIRE_ENGINE' | 'EVACUATION_BUS';
export type ResourceStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE_INCIDENT' | 'ON_SCENE' | 'TRANSPORTING_HOSPITAL' | 'RETURNING' | 'OFFLINE';

export interface Resource {
  id: string;
  name: string;
  call_sign: string;
  type: ResourceType;
  type_display: string;
  status: ResourceStatus;
  status_display: string;
  latitude: number;
  longitude: number;
  capacity: number;
  capabilities: string[];
  contact_radio?: string;
  base_station?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  total_beds: number;
  available_beds: number;
  total_icu: number;
  available_icu: number;
  has_trauma_bay: boolean;
  has_burn_unit: boolean;
  has_pediatric: boolean;
  status: 'ACCEPTING' | 'DIVERT_SURGE' | 'DIVERT_FULL' | 'OFFLINE';
  status_display: string;
  occupancy_percentage: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  source_node: number;
  target_node: number;
  source_node_index: number;
  target_node_index: number;
  source_coords: [number, number];
  target_coords: [number, number];
  length_km: number;
  base_speed_kmh: number;
  hazard_multiplier: number;
  status: 'CLEAR' | 'CONGESTED' | 'WATERLOGGED' | 'BLOCKED';
  is_two_way: boolean;
}

export interface Dispatch {
  id: string;
  incident: string;
  resource: string;
  target_hospital?: string;
  incident_details: Incident;
  resource_details: Resource;
  hospital_details?: Hospital;
  status: 'PROPOSED' | 'APPROVED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  status_display: string;
  route_geometry: [number, number][];
  distance_km: number;
  eta_minutes: number;
  mathematical_rationale: {
    priority_score?: number;
    priority_tier?: string;
    calculated_eta_minutes?: number;
    distance_km?: number;
    capability_matched?: boolean;
    hospital_assigned?: string;
    cost_metric?: number;
  };
  narrative_explanation: string;
  created_at: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  tick_minutes: number;
  is_active: boolean;
  weather_condition: string;
}

export interface AnalyticsSummary {
  incidents: {
    total: number;
    critical: number;
    high: number;
    resolved: number;
    pending: number;
  };
  fleet: {
    total: number;
    available: number;
    deployed: number;
    active_dispatches: number;
    utilization_rate: number;
  };
  medical: {
    total_beds: number;
    available_beds: number;
    bed_occupancy_rate: number;
    total_icu: number;
    available_icu: number;
    icu_occupancy_rate: number;
  };
  infrastructure: {
    total_road_segments: number;
    blocked_segments: number;
    network_health_pct: number;
  };
}

export interface WeatherTelemetry {
  provider: string;
  is_live: boolean;
  location: string;
  condition: string;
  description: string;
  icon: string;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  rainfall_1h_mm: number;
  pressure_hpa: number;
  timestamp: number;
}
