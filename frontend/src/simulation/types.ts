// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Simulation & Digital Twin Types
// ────────────────────────────────────────────────────────────────────────────

export type FacilityType = 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE';
export type FuelType = 'LPG' | 'Propane' | 'Diesel' | 'Petrol' | 'Gasoline';
export type HazardMode = 'COMBINED' | 'THERMAL' | 'BLAST';
export type CameraPerspective =
  | 'COMMAND'
  | 'FACILITY'
  | 'HAZARD'
  | 'THERMAL'
  | 'BLAST'
  | 'STREET'
  | 'TANK_HERO'
  | 'FIRE_BRIGADE';
export type LightingMode = 'DAY' | 'DUSK' | 'NIGHT';

export type BlevePhase =
  | 'IDLE'
  | 'IGNITION'
  | 'SUSTAINED_FIRE'
  | 'THERMAL_STRESS'
  | 'CRITICAL_EXPANSION'
  | 'BLAST_IGNITION'
  | 'FIREBALL_PEAK'
  | 'SHOCKWAVE_PROPAGATION'
  | 'DEBRIS_COLLAPSE'
  | 'POST_BLAST'
  | 'EMERGENCY_RESPONSE'
  | 'TRUCK_STAGED'
  | 'WATER_ATTACK'
  | 'SUPPRESSION'
  | 'EXTINGUISHED'
  | 'AFTERMATH';

export interface ThreatCalculateParams {
  facility_type: FacilityType;
  latitude: number;
  longitude: number;
  mass_kg: number;
  pool_diameter_m: number;
  fill_fraction: number;
  tank_diameter_m: number;
  tank_volume_m3: number;
  fuel_type: string;
  wind_speed_ms: number;
  wind_direction_deg: number;
}

export interface ThreatBand {
  threshold_kw_m2?: number;
  threshold_kpa?: number;
  max_radius_m: number;
  polygon: [number, number][]; // [lat, lon][]
  localPolygon?: [number, number][]; // [x, z][] in meters relative to facility
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
    yellow_injury: ThreatBand;
    green_awareness: ThreatBand;
  };
  blast_bands?: {
    red_lethal: ThreatBand;
    orange_serious: ThreatBand;
    yellow_injury: ThreatBand;
    green_awareness: ThreatBand;
  };
  safe_approach_vector: {
    safe_angle_deg: number;
    cardinal_direction: string;
    approach_status: string;
    corridor_vector: [number, number][];
  };
}

export interface SpatialProbePoint {
  x: number;
  z: number;
  distanceM: number;
  heatFluxKwM2: number;
  overpressureBar: number;
  overpressurePsi: number;
  dominantHazard: 'THERMAL' | 'BLAST' | 'NONE';
  severityTier: 'ZONE_1_LETHAL' | 'ZONE_2_SERIOUS' | 'ZONE_3_INJURY' | 'ZONE_4_AWARENESS' | 'SAFE';
}

export interface SectorExposure {
  cardinal: string;
  bearingDeg: number;
  exposureScore: number; // 0 (safest) to 100 (worst)
  classification: 'OPTIMAL' | 'ACCEPTABLE' | 'CAUTION' | 'RESTRICTED' | 'PROHIBITED';
  maxSafeDistanceM: number;
  operationalAdvice: string;
}

export interface SubstancePreset {
  label: string;
  SEP: number; // Surface Emissive Power (kW/m²)
  eta: number; // Explosion yield fraction (0.01 - 0.15)
  heatOfCombustionMjKg: number;
  liquidDensityKgM3: number;
  facilityType: FacilityType;
}

export interface DecisionSupportResponse {
  provenance_hash?: string;
  execution_timestamp_utc?: string;
  operational_summary?: {
    primary_threat_level: string;
    dominant_hazard_mechanism: string;
    max_lethal_radius_m: number;
    max_evacuation_radius_m: number;
    optimal_ingress_bearing_deg: number;
    optimal_ingress_cardinal: string;
    recommended_standoff_distance_m: number;
  };
  severity_breakdown?: Record<
    string,
    {
      tier_name: string;
      nominal_radius_m: number;
      enclosed_area_m2: number;
      thermal_threshold_kw_m2: number;
      blast_threshold_kpa: number;
      tactical_directive: string;
    }
  >;
  directional_intelligence?: {
    optimal_sector: string;
    optimal_bearing_deg: number;
    upwind_bearing_deg: number;
    downwind_bearing_deg: number;
    sectors: Array<SectorExposure>;
  };
  explainability_report?: {
    zone_dimension_rationale: string;
    spatial_asymmetry_rationale: string;
    approach_rationale: string;
    dominant_hazard_rationale: string;
    scenario_comparison_rationale?: string;
  };
}
