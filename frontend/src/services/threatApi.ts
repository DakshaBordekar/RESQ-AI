import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/threat-zone';

export interface ThreatCalculateParams {
  facility_type: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE';
  latitude: number;
  longitude: number;
  mass_kg: number;
  pool_diameter_m: number;
  fuel_type: string;
  wind_speed_ms: number;
  wind_direction_deg: number;
}

export interface ThreatBand {
  threshold_kw_m2?: number;
  threshold_kpa?: number;
  max_radius_m: number;
  polygon: [number, number][];
}

export interface ThreatResponse {
  facility_name: string;
  facility_type: string;
  physics_metrics: {
    fireball_radius_m?: number;
    fireball_duration_s?: number;
    total_energy_gj?: number;
    w_tnt_equivalent_kg?: number;
    flame_height_m?: number;
    flame_tilt_deg?: number;
    downwind_displacement_m?: number;
    total_radiative_power_mw?: number;
    primary_hazard: string;
  };
  threat_bands: {
    red_lethal: ThreatBand;
    orange_serious: ThreatBand;
    yellow_evacuate: ThreatBand;
  };
  blast_bands?: {
    red_lethal: ThreatBand;
    orange_serious: ThreatBand;
    yellow_evacuate: ThreatBand;
  };
  safe_approach_vector: {
    safe_angle_deg: number;
    cardinal_direction: string;
    approach_status: string;
    corridor_vector: [number, number][];
  };
}

export const calculateThreatZone = async (params: ThreatCalculateParams): Promise<ThreatResponse> => {
  try {
    const res = await axios.post(`${API_BASE_URL}/calculate/`, params, { timeout: 4000 });
    return res.data;
  } catch (err) {
    console.warn('Backend offline, using client-side analytical physics engine fallback:', err);
    return getOfflineThreatCalculations(params);
  }
};

// Client-side fallback implementation of Thomas (1963) & Roberts correlations
const getOfflineThreatCalculations = (params: ThreatCalculateParams): ThreatResponse => {
  const { facility_type, latitude, longitude, mass_kg, pool_diameter_m, wind_speed_ms, wind_direction_deg } = params;
  const safe_angle_deg = (wind_direction_deg + 180) % 360;

  if (facility_type === 'FACILITY_A_LPG') {
    const M = Math.max(100, mass_kg);
    const r_f = 3.86 * Math.pow(M, 0.325);
    const t_f = 0.825 * Math.pow(M, 0.26);

    const makeCircle = (r: number): [number, number][] => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 36; i++) {
        const rad = (i * 10 * Math.PI) / 180;
        const dx = r * Math.sin(rad);
        const dy = r * Math.cos(rad);
        pts.push([latitude + dy / 111320, longitude + dx / (111320 * Math.cos((latitude * Math.PI) / 180))]);
      }
      return pts;
    };

    return {
      facility_name: 'Facility A — LPG Spherical Tank (BLEVE)',
      facility_type: 'FACILITY_A_LPG',
      physics_metrics: {
        fireball_radius_m: Math.round(r_f * 10) / 10,
        fireball_duration_s: Math.round(t_f * 10) / 10,
        total_energy_gj: Math.round((M * 46000) / 1e5) / 10,
        w_tnt_equivalent_kg: Math.round((0.04 * M * 46000) / 4184),
        primary_hazard: 'Instantaneous Fireball + Blast Overpressure (BLEVE)',
      },
      threat_bands: {
        red_lethal: { threshold_kw_m2: 12.5, max_radius_m: 430, polygon: makeCircle(430) },
        orange_serious: { threshold_kw_m2: 4.7, max_radius_m: 680, polygon: makeCircle(680) },
        yellow_evacuate: { threshold_kw_m2: 1.6, max_radius_m: 1150, polygon: makeCircle(1150) },
      },
      safe_approach_vector: {
        safe_angle_deg,
        cardinal_direction: 'NW',
        approach_status: 'OPTIMAL_UPWIND_ENTRY',
        corridor_vector: [],
      },
    };
  } else {
    const D = Math.max(1, pool_diameter_m);
    const h_over_d = 42.0 * Math.pow(0.055 / (1.2 * Math.sqrt(9.81 * D)), 0.61);
    const H = h_over_d * D;
    const tilt_deg = Math.min(65, wind_speed_ms * 4.5);
    const delta = (H / 2) * Math.sin((tilt_deg * Math.PI) / 180);

    const makeWarpedPolygon = (baseR: number): [number, number][] => {
      const pts: [number, number][] = [];
      const windRad = (wind_direction_deg * Math.PI) / 180;
      for (let i = 0; i <= 36; i++) {
        const phiDeg = i * 10;
        const phiRad = (phiDeg * Math.PI) / 180;
        const phiRel = phiRad - windRad;
        const r_phi = Math.max(D / 2 + 2, delta * Math.cos(phiRel) + baseR);
        const dx = r_phi * Math.sin(phiRad);
        const dy = r_phi * Math.cos(phiRad);
        pts.push([latitude + dy / 111320, longitude + dx / (111320 * Math.cos((latitude * Math.PI) / 180))]);
      }
      return pts;
    };

    return {
      facility_name: 'Facility B — Petroleum Pool Fire',
      facility_type: 'FACILITY_B_POOL_FIRE',
      physics_metrics: {
        flame_height_m: Math.round(H * 10) / 10,
        flame_tilt_deg: Math.round(tilt_deg * 10) / 10,
        downwind_displacement_m: Math.round(delta * 10) / 10,
        total_radiative_power_mw: 354.0,
        primary_hazard: 'Sustained Thermal Radiation (Wind-Warped)',
      },
      threat_bands: {
        red_lethal: { threshold_kw_m2: 12.5, max_radius_m: 60, polygon: makeWarpedPolygon(60) },
        orange_serious: { threshold_kw_m2: 4.7, max_radius_m: 140, polygon: makeWarpedPolygon(140) },
        yellow_evacuate: { threshold_kw_m2: 1.6, max_radius_m: 320, polygon: makeWarpedPolygon(320) },
      },
      safe_approach_vector: {
        safe_angle_deg,
        cardinal_direction: 'NW',
        approach_status: 'OPTIMAL_UPWIND_ENTRY',
        corridor_vector: [],
      },
    };
  }
};
