// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Unified Physics Engine
// Standards: CCPS 2010 Guidelines, NFPA 58/59A, ALOHA 5.4.7 Calibrated
// ────────────────────────────────────────────────────────────────────────────

import {
  ThreatCalculateParams,
  ThreatResponse,
  ThreatBand,
  SubstancePreset,
} from './types';

export const SUBSTANCE_PRESETS: Record<string, SubstancePreset> = {
  LPG: {
    label: 'LPG (Propane/Butane) — BLEVE',
    SEP: 175,
    eta: 0.10,
    heatOfCombustionMjKg: 46.0,
    liquidDensityKgM3: 500,
    facilityType: 'FACILITY_A_LPG',
  },
  Propane: {
    label: 'Propane — BLEVE',
    SEP: 190,
    eta: 0.12,
    heatOfCombustionMjKg: 46.4,
    liquidDensityKgM3: 493,
    facilityType: 'FACILITY_A_LPG',
  },
  Diesel: {
    label: 'Diesel (Class C) — Pool Fire',
    SEP: 45,
    eta: 0.03,
    heatOfCombustionMjKg: 43.0,
    liquidDensityKgM3: 840,
    facilityType: 'FACILITY_B_POOL_FIRE',
  },
  Petrol: {
    label: 'Petrol/Gasoline — Pool Fire',
    SEP: 65,
    eta: 0.04,
    heatOfCombustionMjKg: 44.0,
    liquidDensityKgM3: 740,
    facilityType: 'FACILITY_B_POOL_FIRE',
  },
  Gasoline: {
    label: 'Gasoline — Pool Fire',
    SEP: 65,
    eta: 0.04,
    heatOfCombustionMjKg: 44.0,
    liquidDensityKgM3: 740,
    facilityType: 'FACILITY_B_POOL_FIRE',
  },
};

// ── Kingery-Bulmash 10-term polynomial coefficients (Kinney & Graham 1985) ──
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

// TNT-equivalent blast overpressure [bar] at scaled distance Z [m / kg^(1/3)]
export const calculateKbOverpressureBar = (Z: number): number => {
  const safeZ = Math.max(Z, 0.05);
  const logZ = Math.log10(safeZ);
  let logP = 0;
  for (let i = 0; i < KB_COEFFS.length; i++) {
    logP += KB_COEFFS[i] * Math.pow(logZ, i);
  }
  return Math.pow(10, logP) / 100; // kPa -> bar
};

// ── Atmospheric transmissivity: Moorhouse (1982) correlation ────────────────
export const calculateTransmissivity = (r: number): number => {
  return Math.exp(-0.09 * Math.sqrt(Math.max(0.1, r)));
};

// ── BLEVE Point-source thermal radiation flux [kW/m²] ───────────────────────
export const calculateThermalFluxBleve = (r: number, SEP: number, r_f: number): number => {
  const safeR = Math.max(r, r_f * 0.5);
  const tau = calculateTransmissivity(safeR);
  const F = Math.pow(r_f / (2 * safeR), 2); // View factor for sphere
  return SEP * F * tau;
};

// ── Pool Fire Solid-Flame cylinder thermal radiation flux [kW/m²] ───────────
export const calculateThermalFluxPool = (
  r: number,
  SEP: number,
  D: number,
  H: number
): number => {
  const safeR = Math.max(r, D * 0.5);
  const tau = calculateTransmissivity(safeR);
  const L = Math.sqrt(safeR * safeR + (H * H) / 4);
  const F = (D * H) / (4 * Math.PI * L * L); // View factor for vertical cylinder
  return SEP * F * tau;
};

// ── BLEVE Blast Overpressure [bar] ──────────────────────────────────────────
export const calculateBleveBlastOverpressureBar = (
  r: number,
  storedEnergyJ: number,
  eta: number
): number => {
  const E_TNT = 4.52e6; // J/kg TNT
  const W_TNT = (storedEnergyJ * eta) / E_TNT;
  if (W_TNT <= 0) return 0;
  const Z = Math.max(0.1, r) / Math.pow(W_TNT, 1 / 3);
  return calculateKbOverpressureBar(Z);
};

// ── Wind Kernel: Downwind elongation and upwind contraction ─────────────────
// r_eff(theta) = r_calm * [1 + k * U * cos(theta - theta_wind)]
export const calculateWindRadius = (
  rCalm: number,
  U: number,
  windDirDeg: number,
  bearingDeg: number,
  k = 0.06
): number => {
  const dTheta = ((bearingDeg - windDirDeg) * Math.PI) / 180;
  const factor = 1 + k * U * Math.cos(dTheta);
  return rCalm * Math.max(0.1, factor);
};

// ── Binary search for r_calm at a given target threshold ────────────────────
export const binarySearchCalmRadius = (
  evalFn: (r: number) => number,
  threshold: number,
  rLo = 1,
  rHi = 6000,
  iters = 36
): number => {
  for (let i = 0; i < iters; i++) {
    const rMid = (rLo + rHi) / 2;
    const v = evalFn(rMid);
    if (v > threshold) {
      rLo = rMid;
    } else {
      rHi = rMid;
    }
  }
  return (rLo + rHi) / 2;
};

// ── Geographic conversion helpers ───────────────────────────────────────────
export const bearingDistanceToLatLon = (
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

export const bearingDistanceToLocalXZ = (
  bearingDeg: number,
  distanceM: number
): [number, number] => {
  const rad = (bearingDeg * Math.PI) / 180;
  const x = distanceM * Math.sin(rad);
  const z = -distanceM * Math.cos(rad); // Three.js -Z is North
  return [x, z];
};

// ── CCPS 2010 Standard 4-Zone Thresholds ────────────────────────────────────
export const THERMAL_THRESHOLDS = {
  lethal: 37.5,    // Zone 1: Red (> 37.5 kW/m²) - 100% lethality in 10s
  serious: 12.5,   // Zone 2: Orange (12.5 - 37.5 kW/m²) - 1% lethality, 1st degree burn in 10s
  injury: 4.7,     // Zone 3: Yellow (4.7 - 12.5 kW/m²) - Pain threshold in 15s
  awareness: 1.6,  // Zone 4: Green (1.6 - 4.7 kW/m²) - Safe for public, no discomfort
};

export const BLAST_THRESHOLDS_BAR = {
  lethal: 0.35,    // Zone 1: Red (> 0.35 bar / 5.0 psi) - Heavy structural destruction, 50% eardrum rupture
  serious: 0.07,   // Zone 2: Orange (0.07 - 0.35 bar / 1.0 - 5.0 psi) - Moderate structural damage
  injury: 0.035,   // Zone 3: Yellow (0.035 - 0.07 bar / 0.5 - 1.0 psi) - Glass breakage, flying debris
  awareness: 0.014,// Zone 4: Green (0.014 - 0.035 bar / 0.2 - 0.5 psi) - Safe public threshold
};

// ── Build both Geo and Local 3D wind-warped polygon contours ────────────────
export const generateHazardPolygon = (
  originLat: number,
  originLon: number,
  rCalm: number,
  windSpeedMs: number,
  windDirDeg: number,
  k = 0.06,
  steps = 120
): { geo: [number, number][]; local: [number, number][] } => {
  const geo: [number, number][] = [];
  const local: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const deg = (i * 360) / steps;
    const rEff = calculateWindRadius(rCalm, windSpeedMs, windDirDeg, deg, k);
    geo.push(bearingDistanceToLatLon(originLat, originLon, deg, rEff));
    local.push(bearingDistanceToLocalXZ(deg, rEff));
  }

  return { geo, local };
};

// ── Cardinal direction helper ───────────────────────────────────────────────
export const getCardinalDirection = (deg: number): string => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const norm = ((deg % 360) + 360) % 360;
  return dirs[Math.round(norm / 45) % 8];
};

// ────────────────────────────────────────────────────────────────────────────
// Master Simulation Solver
// ────────────────────────────────────────────────────────────────────────────
export const computeSimulationThreatZones = (
  params: ThreatCalculateParams
): ThreatResponse => {
  const {
    facility_type,
    latitude,
    longitude,
    mass_kg,
    pool_diameter_m,
    fill_fraction,
    tank_diameter_m,
    tank_volume_m3,
    wind_speed_ms,
    wind_direction_deg,
    fuel_type,
  } = params;

  const preset = SUBSTANCE_PRESETS[fuel_type] ?? SUBSTANCE_PRESETS['LPG'];
  const SEP = preset.SEP;
  const eta = preset.eta;
  const U = wind_speed_ms;
  const safe_angle_deg = (wind_direction_deg + 180) % 360;

  if (facility_type === 'FACILITY_A_LPG') {
    // ── Facility A: Pressurized LPG Sphere BLEVE ───────────────────────────
    const M = Math.max(100, mass_kg);
    const fillFrac = fill_fraction ?? 0.85;
    const rho_liq = preset.liquidDensityKgM3;
    const computedVolume = tank_volume_m3 || (M / (rho_liq * fillFrac));

    // Roberts (1982) Fireball Correlations
    const r_f = 3.86 * Math.pow(M, 0.325);
    const t_f = 0.825 * Math.pow(M, 0.26);

    // Stored chemical and physical energy
    const storedEnergyJ = M * (preset.heatOfCombustionMjKg * 1e6);
    const W_TNT = (storedEnergyJ * eta) / 4.52e6;
    const totalEnergyGJ = Math.round((storedEnergyJ / 1e9) * 100) / 100;

    // Thermal flux evaluator
    const thermalFn = (r: number) => calculateThermalFluxBleve(r, SEP, r_f);
    // Blast overpressure evaluator
    const blastFn = (r: number) => calculateBleveBlastOverpressureBar(r, storedEnergyJ, eta);

    // Calm radii for thermal thresholds
    const rLethalTherm = binarySearchCalmRadius(thermalFn, THERMAL_THRESHOLDS.lethal);
    const rSeriousTherm = binarySearchCalmRadius(thermalFn, THERMAL_THRESHOLDS.serious);
    const rInjuryTherm = binarySearchCalmRadius(thermalFn, THERMAL_THRESHOLDS.injury);
    const rAwarenessTherm = binarySearchCalmRadius(thermalFn, THERMAL_THRESHOLDS.awareness);

    // Calm radii for blast thresholds
    const rLethalBlast = binarySearchCalmRadius(blastFn, BLAST_THRESHOLDS_BAR.lethal);
    const rSeriousBlast = binarySearchCalmRadius(blastFn, BLAST_THRESHOLDS_BAR.serious);
    const rInjuryBlast = binarySearchCalmRadius(blastFn, BLAST_THRESHOLDS_BAR.injury);
    const rAwarenessBlast = binarySearchCalmRadius(blastFn, BLAST_THRESHOLDS_BAR.awareness);

    // Combined hazard envelopes (max envelope of thermal and blast)
    const rLethal = Math.max(rLethalTherm, rLethalBlast);
    const rSerious = Math.max(rSeriousTherm, rSeriousBlast);
    const rInjury = Math.max(rInjuryTherm, rInjuryBlast);
    const rAwareness = Math.max(rAwarenessTherm, rAwarenessBlast);

    const kBleve = 0.055;

    const polyLethal = generateHazardPolygon(latitude, longitude, rLethal, U, wind_direction_deg, kBleve);
    const polySerious = generateHazardPolygon(latitude, longitude, rSerious, U, wind_direction_deg, kBleve);
    const polyInjury = generateHazardPolygon(latitude, longitude, rInjury, U, wind_direction_deg, kBleve);
    const polyAwareness = generateHazardPolygon(latitude, longitude, rAwareness, U, wind_direction_deg, kBleve);

    // Blast-specific polygons for blast mode
    const polyBlastLethal = generateHazardPolygon(latitude, longitude, rLethalBlast, U, wind_direction_deg, 0.015);
    const polyBlastSerious = generateHazardPolygon(latitude, longitude, rSeriousBlast, U, wind_direction_deg, 0.015);
    const polyBlastInjury = generateHazardPolygon(latitude, longitude, rInjuryBlast, U, wind_direction_deg, 0.015);
    const polyBlastAwareness = generateHazardPolygon(latitude, longitude, rAwarenessBlast, U, wind_direction_deg, 0.015);

    return {
      facility_name: 'Facility A — LPG Spherical Tank (BLEVE)',
      facility_type: 'FACILITY_A_LPG',
      physics_metrics: {
        fireball_radius_m: Math.round(r_f * 10) / 10,
        fireball_duration_s: Math.round(t_f * 10) / 10,
        total_energy_gj: totalEnergyGJ,
        w_tnt_equivalent_kg: Math.round(W_TNT),
        primary_hazard: 'Instantaneous Fireball + Blast Shockwave (BLEVE)',
      },
      threat_bands: {
        red_lethal: {
          threshold_kw_m2: THERMAL_THRESHOLDS.lethal,
          threshold_kpa: BLAST_THRESHOLDS_BAR.lethal * 100,
          max_radius_m: Math.round(rLethal),
          polygon: polyLethal.geo,
          localPolygon: polyLethal.local,
        },
        orange_serious: {
          threshold_kw_m2: THERMAL_THRESHOLDS.serious,
          threshold_kpa: BLAST_THRESHOLDS_BAR.serious * 100,
          max_radius_m: Math.round(rSerious),
          polygon: polySerious.geo,
          localPolygon: polySerious.local,
        },
        yellow_injury: {
          threshold_kw_m2: THERMAL_THRESHOLDS.injury,
          threshold_kpa: BLAST_THRESHOLDS_BAR.injury * 100,
          max_radius_m: Math.round(rInjury),
          polygon: polyInjury.geo,
          localPolygon: polyInjury.local,
        },
        green_awareness: {
          threshold_kw_m2: THERMAL_THRESHOLDS.awareness,
          threshold_kpa: BLAST_THRESHOLDS_BAR.awareness * 100,
          max_radius_m: Math.round(rAwareness),
          polygon: polyAwareness.geo,
          localPolygon: polyAwareness.local,
        },
      },
      blast_bands: {
        red_lethal: {
          threshold_kpa: BLAST_THRESHOLDS_BAR.lethal * 100,
          max_radius_m: Math.round(rLethalBlast),
          polygon: polyBlastLethal.geo,
          localPolygon: polyBlastLethal.local,
        },
        orange_serious: {
          threshold_kpa: BLAST_THRESHOLDS_BAR.serious * 100,
          max_radius_m: Math.round(rSeriousBlast),
          polygon: polyBlastSerious.geo,
          localPolygon: polyBlastSerious.local,
        },
        yellow_injury: {
          threshold_kpa: BLAST_THRESHOLDS_BAR.injury * 100,
          max_radius_m: Math.round(rInjuryBlast),
          polygon: polyBlastInjury.geo,
          localPolygon: polyBlastInjury.local,
        },
        green_awareness: {
          threshold_kpa: BLAST_THRESHOLDS_BAR.awareness * 100,
          max_radius_m: Math.round(rAwarenessBlast),
          polygon: polyBlastAwareness.geo,
          localPolygon: polyBlastAwareness.local,
        },
      },
      safe_approach_vector: {
        safe_angle_deg,
        cardinal_direction: getCardinalDirection(safe_angle_deg),
        approach_status: 'OPTIMAL_UPWIND_ENTRY',
        corridor_vector: [],
      },
    };
  } else {
    // ── Facility B: Petroleum Pool Fire ─────────────────────────────────────
    const D = Math.max(2, pool_diameter_m || tank_diameter_m || 20);

    // Thomas (1963) Flame Height Correlation
    const m_dot = 0.055; // kg/(m²·s)
    const H = 42.0 * D * Math.pow(m_dot / (1.2 * Math.sqrt(9.81 * D)), 0.61);
    const H_safe = Math.max(H, 1.0);

    // Welker & Sliepcevich (1966) Flame Tilt
    const U_star = U / Math.sqrt(9.81 * D);
    const tilt_deg = Math.min(80, Math.atan(0.7 * Math.pow(U_star, 0.49)) * (180 / Math.PI) * 2.5);
    const tiltRad = (tilt_deg * Math.PI) / 180;
    const delta = (H_safe / 2) * Math.sin(tiltRad); // Centroid downwind shift

    // Radiative power: Q_rad = SEP * Area
    const surfaceArea = Math.PI * D * H_safe + Math.PI * (D / 2) ** 2;
    const totalRadiativePowerMW = Math.round(((SEP * surfaceArea) / 1e3) * 10) / 10;

    const poolFluxFn = (r: number) => calculateThermalFluxPool(r, SEP, D, H_safe);

    const rLethal = binarySearchCalmRadius(poolFluxFn, THERMAL_THRESHOLDS.lethal);
    const rSerious = binarySearchCalmRadius(poolFluxFn, THERMAL_THRESHOLDS.serious);
    const rInjury = binarySearchCalmRadius(poolFluxFn, THERMAL_THRESHOLDS.injury);
    const rAwareness = binarySearchCalmRadius(poolFluxFn, THERMAL_THRESHOLDS.awareness);

    const poolK = 0.085; // Extra wind elongation for tilted pool flame

    const polyLethal = generateHazardPolygon(latitude, longitude, rLethal, U, wind_direction_deg, poolK);
    const polySerious = generateHazardPolygon(latitude, longitude, rSerious, U, wind_direction_deg, poolK);
    const polyInjury = generateHazardPolygon(latitude, longitude, rInjury, U, wind_direction_deg, poolK);
    const polyAwareness = generateHazardPolygon(latitude, longitude, rAwareness, U, wind_direction_deg, poolK);

    return {
      facility_name: 'Facility B — Petroleum Pool Fire',
      facility_type: 'FACILITY_B_POOL_FIRE',
      physics_metrics: {
        flame_height_m: Math.round(H_safe * 10) / 10,
        flame_tilt_deg: Math.round(tilt_deg * 10) / 10,
        downwind_displacement_m: Math.round(delta * 10) / 10,
        total_radiative_power_mw: totalRadiativePowerMW,
        primary_hazard: 'Sustained Thermal Radiation (Wind-Tilted Pool Fire)',
      },
      threat_bands: {
        red_lethal: {
          threshold_kw_m2: THERMAL_THRESHOLDS.lethal,
          max_radius_m: Math.round(rLethal),
          polygon: polyLethal.geo,
          localPolygon: polyLethal.local,
        },
        orange_serious: {
          threshold_kw_m2: THERMAL_THRESHOLDS.serious,
          max_radius_m: Math.round(rSerious),
          polygon: polySerious.geo,
          localPolygon: polySerious.local,
        },
        yellow_injury: {
          threshold_kw_m2: THERMAL_THRESHOLDS.injury,
          max_radius_m: Math.round(rInjury),
          polygon: polyInjury.geo,
          localPolygon: polyInjury.local,
        },
        green_awareness: {
          threshold_kw_m2: THERMAL_THRESHOLDS.awareness,
          max_radius_m: Math.round(rAwareness),
          polygon: polyAwareness.geo,
          localPolygon: polyAwareness.local,
        },
      },
      safe_approach_vector: {
        safe_angle_deg,
        cardinal_direction: getCardinalDirection(safe_angle_deg),
        approach_status: 'OPTIMAL_UPWIND_ENTRY',
        corridor_vector: [],
      },
    };
  }
};
