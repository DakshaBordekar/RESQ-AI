import axios from 'axios';
import {
  ThreatCalculateParams,
  ThreatResponse,
  DecisionSupportResponse,
} from '../simulation/types';
import {
  computeSimulationThreatZones,
  SUBSTANCE_PRESETS,
} from '../simulation/physicsEngine';

export { SUBSTANCE_PRESETS };
export type {
  ThreatCalculateParams,
  ThreatResponse,
  ThreatBand,
  DecisionSupportResponse,
  HazardMode,
  CameraPerspective,
} from '../simulation/types';

const API_BASE_URL = 'http://localhost:8000/api/threat-zone';

export const calculateThreatZone = async (
  params: ThreatCalculateParams
): Promise<ThreatResponse> => {
  try {
    const res = await axios.post(`${API_BASE_URL}/calculate/`, params, { timeout: 3500 });
    const d = res.data;
    if (!d.threat_bands?.green_awareness || !d.threat_bands?.red_lethal?.localPolygon) {
      // Enrich with local 3D polygons if missing from backend
      return computeSimulationThreatZones(params);
    }
    return d;
  } catch {
    return computeSimulationThreatZones(params);
  }
};

export const fetchDecisionSupport = async (
  params: ThreatCalculateParams
): Promise<DecisionSupportResponse | null> => {
  try {
    const payload = {
      scenario: {
        facility_name:
          params.fuel_type === 'LPG'
            ? 'Facility A — LPG Spherical Tank'
            : 'Facility B — Petroleum Pool Fire',
        latitude: params.latitude,
        longitude: params.longitude,
        tank_geometry: params.fuel_type === 'LPG' ? 'SPHERE' : 'VERTICAL_CYLINDER',
        tank_diameter_m: params.pool_diameter_m || params.tank_diameter_m || 15.0,
        fill_fraction: params.fill_fraction || 0.85,
        fuel_type: params.fuel_type || 'LPG',
        explosion_yield_factor: 0.04,
        wind_speed_ms: params.wind_speed_ms,
        wind_direction_deg: params.wind_direction_deg,
      },
      options: {
        compute_sensitivity: true,
        compute_uncertainty: true,
        generate_explanation: true,
      },
    };
    const res = await axios.post(`${API_BASE_URL}/decision-support/`, payload, {
      timeout: 3500,
    });
    return res.data;
  } catch {
    return null;
  }
};
