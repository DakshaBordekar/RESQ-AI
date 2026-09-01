import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/threat-zone';

// ── Substance constants (SEP kW/m², eta yield fraction) ────────────────────
export const SUBSTANCE_PRESETS: Record<
  string,
  { label: string; SEP: number; eta: number; facilityType: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE' }
> = {
  LPG: {
    label: 'LPG (Propane/Butane) — BLEVE',
    SEP: 175,
    eta: 0.10,
    facilityType: 'FACILITY_A_LPG',
  },
  Propane: {
    label: 'Propane — BLEVE',
    SEP: 190,
    eta: 0.12,
    facilityType: 'FACILITY_A_LPG',
  },
  Diesel: {
    label: 'Diesel (Class C) — Pool Fire',
    SEP: 45,
    eta: 0.03,
    facilityType: 'FACILITY_B_POOL_FIRE',
  },
  Petrol: {
    label: 'Petrol/Gasoline — Pool Fire',
    SEP: 65,
    eta: 0.04,
    facilityType: 'FACILITY_B_POOL_FIRE',
  },
  Gasoline: {
    label: 'Gasoline — Pool Fire',
    SEP: 65,
    eta: 0.04,
    facilityType: 'FACILITY_B_POOL_FIRE',
  },
};

// ── Kingery-Bulmash 10-term polynomial coefficients for peak overpressure ──
// Kinney & Graham (1985), Table A-2. Input: log10(Z), Output: log10(Ps_kPa)
const KB_COEFFS = [
  2.611368,
  -1.69012,
  0.15289,
  0.45546,
  -0.76517,
  0.31484,
  0.08456,
  -0.10509,
  0.02726,
  0.0,
];

// TNT-equivalent blast overpressure [bar] at scaled distance Z [m/kg^(1/3)]
const kbOverpressureBar = (Z: number): number => {
  const logZ = Math.log10(Math.max(Z, 0.05));
  let logP = 0;
  for (let i = 0; i < KB_COEFFS.length; i++) {
    logP += KB_COEFFS[i] * Math.pow(logZ, i);
  }
  return Math.pow(10, logP) / 100; // kPa → bar
};

// ── Atmospheric transmissivity — Moorhouse correlation ─────────────────────
const transmissivity = (r: number): number => Math.exp(-0.09 * Math.sqrt(r));

// ── Thermal flux: Point-source approximation for fireball (kW/m²) ──────────
// Simplified for browser speed — tracks with solid-flame at r > 3D
const thermalFluxBleve = (r: number, SEP: number, r_f: number): number => {
  const tau = transmissivity(r);
  const F = Math.pow(r_f / (2 * r), 2); // View factor — sphere at distance r
  return SEP * F * tau;
};

// ── Thermal flux: Cylinder pool fire (kW/m²) ───────────────────────────────
const thermalFluxPool = (r: number, SEP: number, D: number, H: number): number => {
  const tau = transmissivity(r);
  // Simplified solid-flame view factor for vertical cylinder
  const L = Math.sqrt(r * r + H * H / 4);
  const F = (D * H) / (4 * Math.PI * L * L);
  return SEP * F * tau;
};

// ── Blast overpressure [bar] from BLEVE ────────────────────────────────────
const blastOverpressureBar = (r: number, storedEnergyJ: number, eta: number): number => {
  const E_TNT = 4.52e6; // J/kg
  const W_TNT = (storedEnergyJ * eta) / E_TNT;
  if (W_TNT <= 0) return 0;
  const Z = r / Math.pow(W_TNT, 1 / 3);
  return kbOverpressureBar(Z);
};

// ── Wind kernel: Gaussian anisotropic deformation ──────────────────────────
// r_eff(θ) = r_calm / [1 + k·U·cos(θ − θ_wind)]
const windKernel = (
  rCalm: number,
  U: number,
  thetaWindDeg: number,
  thetaBearingDeg: number,
  k = 0.06
): number => {
  const dTheta = ((thetaBearingDeg - thetaWindDeg) * Math.PI) / 180;
  const factor = 1 + k * U * Math.cos(dTheta);
  return rCalm / Math.max(0.01, factor);
};

// ── Binary search for r_calm at a given thermal threshold (kW/m²) ──────────
const binarySearchRadius = (
  fluxFn: (r: number) => number,
  threshold: number,
  rLo = 1,
  rHi = 8000,
  iters = 40
): number => {
  for (let i = 0; i < iters; i++) {
    const rMid = (rLo + rHi) / 2;
    const f = fluxFn(rMid);
    if (f > threshold) {
      rLo = rMid; // flux still high, go further out
    } else {
      rHi = rMid; // flux too low, come in
    }
  }
  return (rLo + rHi) / 2;
};

// ── Convert (bearing, distance_m) to [lat, lon] ───────────────────────────
const toLatLon = (
  originLat: number,
  originLon: number,
  bearingDeg: number,
  distanceM: number
): [number, number] => {
  const rad = (bearingDeg * Math.PI) / 180;
  const dx = distanceM * Math.sin(rad);
  const dy = distanceM * Math.cos(rad);
  const lat = originLat + dy / 111320;
  const lon = originLon + dx / (111320 * Math.cos((originLat * Math.PI) / 180));
  return [lat, lon];
};

// ── Build wind-deformed polygon (360 bearings) ─────────────────────────────
const buildPolygon = (
  lat: number,
  lon: number,
  rCalm: number,
  U: number,
  windDirDeg: number,
  k = 0.06
): [number, number][] => {
  const pts: [number, number][] = [];
  for (let deg = 0; deg <= 360; deg++) {
    const rEff = windKernel(rCalm, U, windDirDeg, deg, k);
    pts.push(toLatLon(lat, lon, deg, rEff));
  }
  return pts;
};

// ── 4-Zone thresholds (CCPS 2010 Guidelines) ──────────────────────────────
// Zone 1 (Red/Lethal):    > 37.5 kW/m²  |  > 0.35 bar
// Zone 2 (Orange/Serious):12.5–37.5      |  0.07–0.35 bar
// Zone 3 (Yellow/Injury): 4.7–12.5       |  0.035–0.07 bar
// Zone 4 (Green/Awareness):1.6–4.7       |  0.014–0.035 bar
const THERMAL_THRESHOLDS = {
  lethal: 37.5,
  serious: 12.5,
  injury: 4.7,
  awareness: 1.6,
};

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC API TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ThreatCalculateParams {
  facility_type: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE';
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

// ────────────────────────────────────────────────────────────────────────────
// API CALL (falls back to client-side engine if backend is offline)
// ────────────────────────────────────────────────────────────────────────────

export const calculateThreatZone = async (
  params: ThreatCalculateParams
): Promise<ThreatResponse> => {
  try {
    const res = await axios.post(`${API_BASE_URL}/calculate/`, params, { timeout: 4000 });
    // Normalize backend response to 4-band format if needed
    const d = res.data;
    if (!d.threat_bands?.green_awareness) {
      return getOfflineThreatCalculations(params);
    }
    return d;
  } catch {
    return getOfflineThreatCalculations(params);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE PHYSICS ENGINE
// Blueprint Section 2 — Solid Flame + TNT Blast + Gaussian Wind Kernel
// ────────────────────────────────────────────────────────────────────────────

const cardinalFromDeg = (deg: number): string => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
};

const getOfflineThreatCalculations = (params: ThreatCalculateParams): ThreatResponse => {
  const {
    facility_type,
    latitude,
    longitude,
    mass_kg,
    pool_diameter_m,
    fill_fraction,
    wind_speed_ms,
    wind_direction_deg,
    fuel_type,
  } = params;

  const safe_angle_deg = (wind_direction_deg + 180) % 360;
  const preset = SUBSTANCE_PRESETS[fuel_type] ?? SUBSTANCE_PRESETS['LPG'];
  const SEP = preset.SEP;
  const eta = preset.eta;
  const U = wind_speed_ms;
  const k = 0.06; // Wind kernel coupling constant

  if (facility_type === 'FACILITY_A_LPG') {
    // ── Facility A: BLEVE + Fireball ─────────────────────────────────────
    const M = Math.max(100, mass_kg);
    const fillFrac = fill_fraction ?? 0.85;
    const rho_liq = 500; // kg/m³ for LPG
    const V = M / (rho_liq * fillFrac);

    // Roberts correlation: fireball radius and duration
    const r_f = 3.86 * Math.pow(M, 0.325);
    const t_f = 0.825 * Math.pow(M, 0.26);

    // Stored energy for BLEVE (superheat enthalpy approximation)
    const storedEnergyJ = M * 46e6; // LPG lower heating value ~46 MJ/kg
    const W_TNT = (storedEnergyJ * eta) / 4.52e6;
    const totalEnergyGJ = Math.round((storedEnergyJ / 1e9) * 100) / 100;

    // Binary search: find calm-wind radius for each thermal threshold
    // Combined hazard = max(thermal, blast) — use thermal as primary driver
    const fluxAtR = (r: number) =>
      Math.max(
        thermalFluxBleve(r, SEP, r_f),
        blastOverpressureBar(r, storedEnergyJ, eta) * 5 // Approx kW/m² equivalent for blast
      );

    const rLethal   = binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.lethal);
    const rSerious  = binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.serious);
    const rInjury   = binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.injury);
    const rAwareness= binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.awareness);

    return {
      facility_name: 'Facility A — LPG Spherical Tank (BLEVE)',
      facility_type: 'FACILITY_A_LPG',
      physics_metrics: {
        fireball_radius_m: Math.round(r_f * 10) / 10,
        fireball_duration_s: Math.round(t_f * 10) / 10,
        total_energy_gj: totalEnergyGJ,
        w_tnt_equivalent_kg: Math.round(W_TNT),
        primary_hazard: 'Instantaneous Fireball + Blast Overpressure (BLEVE)',
      },
      threat_bands: {
        red_lethal: {
          threshold_kw_m2: THERMAL_THRESHOLDS.lethal,
          max_radius_m: Math.round(rLethal),
          polygon: buildPolygon(latitude, longitude, rLethal, U, wind_direction_deg, k),
        },
        orange_serious: {
          threshold_kw_m2: THERMAL_THRESHOLDS.serious,
          max_radius_m: Math.round(rSerious),
          polygon: buildPolygon(latitude, longitude, rSerious, U, wind_direction_deg, k),
        },
        yellow_injury: {
          threshold_kw_m2: THERMAL_THRESHOLDS.injury,
          max_radius_m: Math.round(rInjury),
          polygon: buildPolygon(latitude, longitude, rInjury, U, wind_direction_deg, k),
        },
        green_awareness: {
          threshold_kw_m2: THERMAL_THRESHOLDS.awareness,
          max_radius_m: Math.round(rAwareness),
          polygon: buildPolygon(latitude, longitude, rAwareness, U, wind_direction_deg, k),
        },
      },
      safe_approach_vector: {
        safe_angle_deg,
        cardinal_direction: cardinalFromDeg(safe_angle_deg),
        approach_status: 'OPTIMAL_UPWIND_ENTRY',
        corridor_vector: [],
      },
    };
  } else {
    // ── Facility B: Sustained Pool Fire ──────────────────────────────────
    const D = Math.max(1, pool_diameter_m);

    // Thomas (1963) flame height correlation
    const m_dot = 0.055; // kg/(m²·s) — diesel burning rate
    const H = 42.0 * D * Math.pow(m_dot / (1.2 * Math.sqrt(9.81 * D)), 0.61);
    const H_safe = Math.max(H, 0.5);

    // Wind flame tilt — Welker & Sliepcevich correlation
    const U_star = U / Math.sqrt(9.81 * D);
    const tilt_deg = Math.min(80, Math.atan(0.7 * Math.pow(U_star, 0.49)) * (180 / Math.PI) * 2.5);
    const tiltRad = (tilt_deg * Math.PI) / 180;
    const delta = (H_safe / 2) * Math.sin(tiltRad); // downwind displacement of flame centroid

    // Total radiative power: Q_rad = SEP × surface_area × chi_rad
    const surfaceArea = Math.PI * D * H_safe + Math.PI * (D / 2) ** 2;
    const totalRadiativePowerMW = Math.round((SEP * surfaceArea) / 1e3 * 10) / 10;

    // Flux at radius r — pool fire solid-flame model
    const fluxAtR = (r: number) => thermalFluxPool(r, SEP, D, H_safe);

    const rLethal   = binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.lethal);
    const rSerious  = binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.serious);
    const rInjury   = binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.injury);
    const rAwareness= binarySearchRadius(fluxAtR, THERMAL_THRESHOLDS.awareness);

    // Downwind elongation for pool fires is more pronounced (flame tilts)
    const poolWindK = k * 1.4; // Pool fire extra elongation from flame tilt
    return {
      facility_name: 'Facility B — Petroleum Pool Fire',
      facility_type: 'FACILITY_B_POOL_FIRE',
      physics_metrics: {
        flame_height_m: Math.round(H_safe * 10) / 10,
        flame_tilt_deg: Math.round(tilt_deg * 10) / 10,
        downwind_displacement_m: Math.round(delta * 10) / 10,
        total_radiative_power_mw: totalRadiativePowerMW,
        primary_hazard: 'Sustained Thermal Radiation (Wind-Warped Pool Fire)',
      },
      threat_bands: {
        red_lethal: {
          threshold_kw_m2: THERMAL_THRESHOLDS.lethal,
          max_radius_m: Math.round(rLethal),
          polygon: buildPolygon(latitude, longitude, rLethal, U, wind_direction_deg, poolWindK),
        },
        orange_serious: {
          threshold_kw_m2: THERMAL_THRESHOLDS.serious,
          max_radius_m: Math.round(rSerious),
          polygon: buildPolygon(latitude, longitude, rSerious, U, wind_direction_deg, poolWindK),
        },
        yellow_injury: {
          threshold_kw_m2: THERMAL_THRESHOLDS.injury,
          max_radius_m: Math.round(rInjury),
          polygon: buildPolygon(latitude, longitude, rInjury, U, wind_direction_deg, poolWindK),
        },
        green_awareness: {
          threshold_kw_m2: THERMAL_THRESHOLDS.awareness,
          max_radius_m: Math.round(rAwareness),
          polygon: buildPolygon(latitude, longitude, rAwareness, U, wind_direction_deg, poolWindK),
        },
      },
      safe_approach_vector: {
        safe_angle_deg,
        cardinal_direction: cardinalFromDeg(safe_angle_deg),
        approach_status: 'OPTIMAL_UPWIND_ENTRY',
        corridor_vector: [],
      },
    };
  }
};
