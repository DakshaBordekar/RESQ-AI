// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Unified Spatial Coordinate & Compass Heading Mathematics
// Single source of truth for 3D world vectors, wind propagation, hazard deflection,
// and upwind emergency safe corridor navigation.
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

/**
 * Converts a compass heading [0, 360) degrees into a normalized 3D world-space vector.
 * Convention:
 * - 0° (North) -> ( 0, 0, -1) [-Z]
 * - 90° (East)  -> ( 1, 0,  0) [+X]
 * - 180° (South) -> ( 0, 0,  1) [+Z]
 * - 270° (West)  -> (-1, 0,  0) [-X]
 */
export const headingToWorldVector = (headingDeg: number): THREE.Vector3 => {
  const rad = (headingDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize();
};

/**
 * Converts a 3D world-space ground vector (X, Z) into a compass heading [0, 360) degrees.
 */
export const worldVectorToHeading = (
  vec: THREE.Vector3 | { x: number; z: number }
): number => {
  const rad = Math.atan2(vec.x, -vec.z);
  let deg = (rad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
};

/**
 * Returns the normalized 3D world-space vector along which the wind pushes
 * smoke, fire tilt, thermal plume, and blast debris (downwind direction).
 */
export const getDownwindVector = (windHeadingDeg: number): THREE.Vector3 => {
  return headingToWorldVector(windHeadingDeg);
};

/**
 * Returns the normalized 3D world-space vector from which emergency responders / fire trucks
 * safely approach the facility (UPWIND direction, directly opposite to hazard propagation).
 */
export const getSafeApproachVector = (windHeadingDeg: number): THREE.Vector3 => {
  const safeHeadingDeg = ((windHeadingDeg + 180) % 360 + 360) % 360;
  return headingToWorldVector(safeHeadingDeg);
};

/**
 * Returns the numeric compass heading [0, 360) degrees for the safe upwind corridor.
 */
export const getSafeApproachHeading = (windHeadingDeg: number): number => {
  return ((windHeadingDeg + 180) % 360 + 360) % 360;
};

/**
 * Converts bearing in degrees and distance in meters into local 3D (x, z) coordinates.
 * Convention: Three.js -Z is North, +X is East.
 */
export const bearingDistanceToLocalXZ = (
  bearingDeg: number,
  distanceM: number
): [number, number] => {
  const rad = (bearingDeg * Math.PI) / 180;
  const x = distanceM * Math.sin(rad);
  const z = -distanceM * Math.cos(rad);
  return [x, z];
};

/**
 * Returns 8-cardinal direction code (N, NE, E, SE, S, SW, W, NW) for any heading.
 */
export const getCardinalDirection = (deg: number): string => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const norm = ((deg % 360) + 360) % 360;
  return dirs[Math.round(norm / 45) % 8];
};
