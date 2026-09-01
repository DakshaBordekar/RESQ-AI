// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Mission & Casualty Triage Simulation Engine
// Solves casualty prioritization, strategy trade-offs, and route rejection
// ────────────────────────────────────────────────────────────────────────────

import {
  MissionCasualty,
  CasualtyPriority,
  MissionStrategy,
  StrategyTradeoffMetrics,
  CandidateRouteEvaluation,
  MissionScorecardReport,
} from './missionTypes';
import { getCardinalDirection, getSafeApproachHeading } from '../three/utils/coordinateMath';

export const INITIAL_MISSION_CASUALTIES: MissionCasualty[] = [
  {
    id: 'CAS-01',
    name: 'Vikram Patel',
    role: 'Senior LPG Pump Operator',
    locationName: 'Sector B Pump House',
    worldPos: [-35, 0, -52],
    status: 'TRAPPED',
    exposureKwM2: 18.4,
    distanceFromHazardM: 42,
    survivabilityWindowSec: 32,
    initialWindowSec: 32,
    priority: 'P1_CRITICAL',
    evacuationGateId: 'GATE_NORTH',
    rescueProgressPct: 0,
    extracted: false,
  },
  {
    id: 'CAS-02',
    name: 'Elena Rostova',
    role: 'West Storage Field Technician',
    locationName: 'West Bullet Tank Farm #2',
    worldPos: [-58, 0, 15],
    status: 'INJURED',
    exposureKwM2: 12.5,
    distanceFromHazardM: 60,
    survivabilityWindowSec: 65,
    initialWindowSec: 65,
    priority: 'P2_URGENT',
    evacuationGateId: 'GATE_WEST',
    rescueProgressPct: 0,
    extracted: false,
  },
  {
    id: 'CAS-03',
    name: 'Marcus Chen',
    role: 'Fractionation Process Engineer',
    locationName: 'Distillation Column #1 Base',
    worldPos: [52, 0, -35],
    status: 'TRAPPED',
    exposureKwM2: 14.2,
    distanceFromHazardM: 48,
    survivabilityWindowSec: 48,
    initialWindowSec: 48,
    priority: 'P1_CRITICAL',
    evacuationGateId: 'GATE_NORTH',
    rescueProgressPct: 0,
    extracted: false,
  },
  {
    id: 'CAS-04',
    name: 'Rajesh Kumar',
    role: 'Electrical Substation Specialist',
    locationName: '33kV Substation SE',
    worldPos: [65, 0, 58],
    status: 'EXPOSED',
    exposureKwM2: 6.5,
    distanceFromHazardM: 88,
    survivabilityWindowSec: 110,
    initialWindowSec: 110,
    priority: 'P3_STABLE',
    evacuationGateId: 'GATE_EAST',
    rescueProgressPct: 0,
    extracted: false,
  },
  {
    id: 'CAS-05',
    name: 'Sarah Jenkins',
    role: 'Logistics Facility Supervisor',
    locationName: 'North Warehouse Logistics Bay',
    worldPos: [0, 0, 85],
    status: 'EVACUATING',
    exposureKwM2: 2.2,
    distanceFromHazardM: 105,
    survivabilityWindowSec: 180,
    initialWindowSec: 180,
    priority: 'P3_STABLE',
    evacuationGateId: 'GATE_SOUTH',
    rescueProgressPct: 0,
    extracted: false,
  },
];

/**
 * Recalculates dynamic exposure, remaining safe window, and priority for all casualties
 * based on current wind, active fire intensity, and water suppression progress.
 */
export const updateCasualtiesFleet = (
  casualties: MissionCasualty[],
  windDirDeg: number,
  windSpeedMs: number,
  fireIntensity: number,
  suppressionProgress: number,
  elapsedSec: number,
  activeRescueCasualtyId: string | null
): MissionCasualty[] => {
  const windRad = (windDirDeg * Math.PI) / 180;
  const downwindX = Math.sin(windRad);
  const downwindZ = -Math.cos(windRad);

  return casualties.map((cas) => {
    if (cas.extracted) {
      return {
        ...cas,
        status: 'RESCUED',
        exposureKwM2: 0.5,
        survivabilityWindowSec: 999,
        rescueProgressPct: 100,
      };
    }

    const [cx, , cz] = cas.worldPos;
    const dist = Math.sqrt(cx * cx + cz * cz);

    // Vector from center to casualty
    const normX = cx / Math.max(1, dist);
    const normZ = cz / Math.max(1, dist);

    // Alignment with downwind plume
    const alignment = Math.max(0, normX * downwindX + normZ * downwindZ);
    const windBoost = 1.0 + alignment * (windSpeedMs / 10.0) * 0.8;

    // Geometric inverse square flux
    const baseFlux = (180.0 / Math.max(15, dist)) * windBoost * fireIntensity;
    const mitigatedFlux = Math.max(0.8, baseFlux * (1.0 - suppressionProgress * 0.75));

    // Dynamic Survivability Window
    const burnRatePerSec = Math.max(0.1, (mitigatedFlux / 12.5));
    const remainingWindow = Math.max(0, cas.initialWindowSec - elapsedSec * burnRatePerSec);

    // Priority Determination
    let priority: CasualtyPriority = 'P3_STABLE';
    let status = cas.status;

    if (cas.id === activeRescueCasualtyId) {
      const rescueSpeed = 25; // % per second
      const newProgress = Math.min(100, cas.rescueProgressPct + rescueSpeed * 0.1);
      const isExtracted = newProgress >= 100;
      return {
        ...cas,
        rescueProgressPct: newProgress,
        extracted: isExtracted,
        status: isExtracted ? 'RESCUED' : 'EVACUATING',
        exposureKwM2: Math.round(mitigatedFlux * 10) / 10,
        survivabilityWindowSec: Math.round(remainingWindow),
        priority: 'P1_CRITICAL',
      };
    }

    if (remainingWindow < 40 || mitigatedFlux > 15.0) {
      priority = 'P1_CRITICAL';
      status = remainingWindow <= 0 ? 'CRITICAL' : 'TRAPPED';
    } else if (remainingWindow < 80 || mitigatedFlux > 8.0) {
      priority = 'P2_URGENT';
      status = 'INJURED';
    } else {
      priority = 'P3_STABLE';
      status = dist > 90 ? 'EVACUATING' : 'EXPOSED';
    }

    return {
      ...cas,
      exposureKwM2: Math.round(mitigatedFlux * 10) / 10,
      distanceFromHazardM: Math.round(dist),
      survivabilityWindowSec: Math.round(remainingWindow),
      priority,
      status,
    };
  });
};

/**
 * Calculates comparative trade-off metrics across the 3 tactical strategies
 */
export const calculateStrategyTradeoffs = (
  windDirDeg: number,
  windSpeedMs: number
): Record<MissionStrategy, StrategyTradeoffMetrics> => {
  return {
    SUPPRESS_FIRST: {
      strategy: 'SUPPRESS_FIRST',
      title: 'Aggressive Hazard Suppression',
      tagline: 'Focus 100% water flow on cooling the primary vessel to prevent BLEVE rupture.',
      hazardContainmentPct: 94,
      casualtiesRescuedCount: 2,
      totalCasualtiesCount: 5,
      responderRiskLevel: 'LOW',
      secondaryEquipmentRisk: 'LOW',
      assetProtectionScorePct: 95,
      estimatedResponseTimeSec: 16.5,
      timeToSecondaryBleveSec: 180,
      tacticalAdvantage: 'Vessel shell temperature brought below boiling; secondary tank rupture eliminated.',
      tacticalVulnerability: 'Casualties in P1 sectors (CAS-01, CAS-03) sustain thermal exposure beyond safe thresholds.',
    },
    RESCUE_FIRST: {
      strategy: 'RESCUE_FIRST',
      title: 'Immediate Casualty Extraction',
      tagline: 'Dispatch rapid rescue squads to extract all trapped personnel before water attack.',
      hazardContainmentPct: 62,
      casualtiesRescuedCount: 5,
      totalCasualtiesCount: 5,
      responderRiskLevel: 'MEDIUM',
      secondaryEquipmentRisk: 'HIGH',
      assetProtectionScorePct: 58,
      estimatedResponseTimeSec: 12.0,
      timeToSecondaryBleveSec: 42,
      tacticalAdvantage: '100% casualty rescue rate achieved before thermal incapacitation.',
      tacticalVulnerability: 'Unmitigated heat flux threatens West Bullet Tanks with possible cascading BLEVE.',
    },
    BALANCED_RESPONSE: {
      strategy: 'BALANCED_RESPONSE',
      title: 'Dual Staged Response (AI Recommended)',
      tagline: 'Staged 4,500 L/min monitor on primary sphere while flanking rescue team extracts P1 casualties.',
      hazardContainmentPct: 88,
      casualtiesRescuedCount: 4,
      totalCasualtiesCount: 5,
      responderRiskLevel: 'LOW',
      secondaryEquipmentRisk: 'LOW',
      assetProtectionScorePct: 91,
      estimatedResponseTimeSec: 14.2,
      timeToSecondaryBleveSec: 125,
      tacticalAdvantage: 'Safely extracts critical casualties while keeping vessel shell quenched within safe margin.',
      tacticalVulnerability: 'Requires simultaneous multi-point deployment from designated upwind staging bays.',
    },
  };
};

/**
 * "Why This Route?" - Evaluates all 4 perimeter access gates against wind and thermal envelopes
 */
export const evaluateCandidateRoutes = (
  windDirDeg: number,
  windSpeedMs: number
): CandidateRouteEvaluation[] => {
  const safeHeading = getSafeApproachHeading(windDirDeg);

  const gates = [
    { id: 'GATE_NORTH', name: 'NORTH ACCESS GATE', headingDeg: 0, cardinal: 'N', x: 0, z: -260 },
    { id: 'GATE_SOUTH', name: 'SOUTH ACCESS GATE', headingDeg: 180, cardinal: 'S', x: 0, z: 260 },
    { id: 'GATE_EAST', name: 'EAST ACCESS GATE', headingDeg: 90, cardinal: 'E', x: 260, z: 0 },
    { id: 'GATE_WEST', name: 'WEST ACCESS GATE', headingDeg: 270, cardinal: 'W', x: -260, z: 0 },
  ];

  // Find the single gate closest to safe upwind heading
  let minDiff = 999;
  let bestGateId = gates[0].id;
  gates.forEach((g) => {
    const diff = Math.abs(g.headingDeg - safeHeading);
    const norm = Math.min(diff, 360 - diff);
    if (norm < minDiff) {
      minDiff = norm;
      bestGateId = g.id;
    }
  });

  return gates.map((gate) => {
    // Angular difference with downwind hazard heading
    const downwindDiff = Math.abs(gate.headingDeg - windDirDeg);
    const normalizedDownwind = Math.min(downwindDiff, 360 - downwindDiff);

    const isOptimal = gate.id === bestGateId;
    const isDownwind = normalizedDownwind < 50;

    let status: 'RECOMMENDED' | 'REJECTED' = isOptimal ? 'RECOMMENDED' : 'REJECTED';
    let lethalZoneCrossingPct = 0;
    let peakThermalKwM2 = 2.5;
    let transitTimeSec = 14.5;
    let rejectionReason: string | undefined = undefined;
    let recommendationRationale: string | undefined = undefined;

    if (isOptimal) {
      status = 'RECOMMENDED';
      lethalZoneCrossingPct = 0;
      peakThermalKwM2 = 3.2;
      transitTimeSec = 13.8;
      recommendationRationale = `Upwind orientation (${gate.cardinal} / ${gate.headingDeg}°) guarantees 0% lethal thermal zone crossing and clear visibility for vehicle transit.`;
    } else if (isDownwind) {
      status = 'REJECTED';
      lethalZoneCrossingPct = 78;
      peakThermalKwM2 = 39.5;
      transitTimeSec = 22.0;
      rejectionReason = `Directly aligned with the downwind thermal and smoke plume. 78% of the roadway traverses Zone 1 lethal radiation (> 37.5 kW/m²).`;
    } else {
      status = 'REJECTED';
      lethalZoneCrossingPct = 32;
      peakThermalKwM2 = 18.2;
      transitTimeSec = 17.5;
      rejectionReason = `Crosswind ingress intersects secondary pipe rack congestion with elevated radiant heat flux (18.2 kW/m²).`;
    }

    return {
      gateId: gate.id,
      gateName: gate.name,
      headingDeg: gate.headingDeg,
      cardinal: gate.cardinal,
      status,
      totalDistanceM: 260,
      lethalZoneCrossingPct,
      peakThermalExposureKwM2: peakThermalKwM2,
      estimatedTransitTimeSec: transitTimeSec,
      rejectionReason,
      recommendationRationale,
    };
  });
};

/**
 * Evaluates the final mission scorecard based on chosen strategy and operational metrics
 */
export const evaluateMissionModeScore = (
  strategy: MissionStrategy,
  casualtiesRescued: number,
  totalCasualties: number,
  elapsedSec: number,
  routeCompliance: boolean
): MissionScorecardReport => {
  const casualtyPct = (casualtiesRescued / totalCasualties) * 100;
  let hazardScore = 88;
  let responderScore = 95;
  let assetScore = 90;
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' = 'A';
  let outcome: 'MISSION_SUCCESS' | 'PARTIAL_SUCCESS' | 'MISSION_FAILURE' = 'MISSION_SUCCESS';

  if (strategy === 'SUPPRESS_FIRST') {
    hazardScore = 96;
    responderScore = 98;
    assetScore = 96;
  } else if (strategy === 'RESCUE_FIRST') {
    hazardScore = 64;
    responderScore = 80;
    assetScore = 60;
  } else {
    hazardScore = 89;
    responderScore = 96;
    assetScore = 92;
  }

  const routeScore = routeCompliance ? 100 : 40;
  const overallScore = Math.round(
    0.35 * casualtyPct +
      0.25 * hazardScore +
      0.15 * responderScore +
      0.15 * assetScore +
      0.10 * routeScore
  );

  if (overallScore >= 93) grade = 'A+';
  else if (overallScore >= 85) grade = 'A';
  else if (overallScore >= 78) grade = 'B+';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 60) grade = 'C';
  else if (overallScore >= 50) grade = 'D';
  else grade = 'F';

  if (overallScore < 60 || casualtiesRescued < 2) {
    outcome = 'MISSION_FAILURE';
  } else if (overallScore < 80 || casualtiesRescued < 4) {
    outcome = 'PARTIAL_SUCCESS';
  } else {
    outcome = 'MISSION_SUCCESS';
  }

  const feedbackMap: Record<MissionStrategy, string> = {
    BALANCED_RESPONSE:
      'The Balanced Tactical Response successfully prevented secondary tank escalation while enabling safe upwind extraction of P1/P2 casualties within their critical survivability windows.',
    SUPPRESS_FIRST:
      'Aggressive suppression eliminated the BLEVE rupture risk, but delayed extraction of P1 casualties resulted in prolonged thermal stress on sector workers.',
    RESCUE_FIRST:
      'Rapid casualty extraction secured 100% personnel safety, though secondary storage bullet tanks sustained elevated thermal flux before late-stage water cooling was established.',
  };

  return {
    strategyUsed: strategy,
    casualtiesRescuedCount: casualtiesRescued,
    totalCasualtiesCount: totalCasualties,
    casualtySafetyScore: Math.round(casualtyPct),
    responderSafetyScore: responderScore,
    hazardContainmentScore: hazardScore,
    assetProtectionScore: assetScore,
    routeComplianceScore: routeScore,
    overallScore,
    grade,
    outcome,
    elapsedSec: Math.round(elapsedSec * 10) / 10,
    summaryFeedback: feedbackMap[strategy],
    actionSummary: [
      `Selected ${strategy.replace(/_/g, ' ')} operational strategy.`,
      `Extracted ${casualtiesRescued}/${totalCasualties} facility casualties.`,
      `Entered exclusively via 100% upwind corridor (${routeScore}% compliance).`,
      `Quenched primary hazard to ${hazardScore}% containment.`,
    ],
  };
};

/**
 * Derives casualty coordinates and location names from actual detected blueprint facility assets
 */
export const getFacilityCasualties = (
  facilityAssets: Array<{ id: string; name: string; type: string; worldPos: { x: number; y: number; z: number } }>
): MissionCasualty[] => {
  if (!facilityAssets || facilityAssets.length === 0) return INITIAL_MISSION_CASUALTIES;

  const pumpHouse = facilityAssets.find((a) => a.type === 'FIRE_PUMP_HOUSE' || a.type === 'PUMP_HOUSE' || a.name.includes('Pump'));
  const warehouse = facilityAssets.find((a) => a.type === 'WAREHOUSE' || a.name.includes('Warehouse'));
  const controlRoom = facilityAssets.find((a) => a.type === 'CONTROL_ROOM' || a.name.includes('Control'));
  const substation = facilityAssets.find((a) => a.type === 'ELECTRICAL_SUBSTATION' || a.name.includes('Substation'));
  const bulletTank = facilityAssets.find((a) => a.type === 'LPG_BULLET' || a.type === 'LPG_BULLET_TANK' || a.name.includes('Bullet'));

  const candidates = [
    {
      asset: pumpHouse || facilityAssets[Math.min(1, facilityAssets.length - 1)],
      role: 'Senior LPG Pump Operator',
      name: 'Vikram Patel',
      priority: 'P1_CRITICAL' as CasualtyPriority,
      window: 32,
    },
    {
      asset: bulletTank || facilityAssets[Math.min(2, facilityAssets.length - 1)],
      role: 'West Storage Field Technician',
      name: 'Elena Rostova',
      priority: 'P2_URGENT' as CasualtyPriority,
      window: 65,
    },
    {
      asset: controlRoom || facilityAssets[0],
      role: 'Fractionation Process Engineer',
      name: 'Marcus Chen',
      priority: 'P1_CRITICAL' as CasualtyPriority,
      window: 48,
    },
    {
      asset: substation || facilityAssets[Math.min(3, facilityAssets.length - 1)],
      role: 'Electrical Substation Specialist',
      name: 'Rajesh Kumar',
      priority: 'P3_STABLE' as CasualtyPriority,
      window: 110,
    },
    {
      asset: warehouse || facilityAssets[Math.min(4, facilityAssets.length - 1)],
      role: 'Logistics Facility Supervisor',
      name: 'Sarah Jenkins',
      priority: 'P3_STABLE' as CasualtyPriority,
      window: 180,
    },
  ];

  return candidates.map((cand, idx) => {
    const asset = cand.asset;
    const dist = Math.hypot(asset.worldPos.x, asset.worldPos.z);
    const exposure = Math.round((180 / Math.max(15, dist)) * 10) / 10;

    return {
      id: `CAS-0${idx + 1}`,
      name: cand.name,
      role: cand.role,
      locationName: asset.name,
      worldPos: [asset.worldPos.x, 0, asset.worldPos.z] as [number, number, number],
      status: cand.priority === 'P1_CRITICAL' ? ('TRAPPED' as const) : cand.priority === 'P2_URGENT' ? ('INJURED' as const) : ('EXPOSED' as const),
      exposureKwM2: exposure,
      distanceFromHazardM: Math.round(dist),
      survivabilityWindowSec: cand.window,
      initialWindowSec: cand.window,
      priority: cand.priority,
      evacuationGateId: 'GATE_NORTH',
      rescueProgressPct: 0,
      extracted: false,
    };
  });
};

