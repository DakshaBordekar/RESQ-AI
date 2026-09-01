// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Procedural VFX Texture Generator
// High-quality procedural textures for soft embers, spark streaks,
// volumetric soft smoke puffs, and flame gradients (Zero White Squares)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

/**
 * Creates a soft glowing circular ember particle texture
 */
export const createEmberTexture = (): THREE.CanvasTexture => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const center = size / 2;
  const rad = size / 2;
  const grad = ctx.createRadialGradient(center, center, 0, center, center, rad);

  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)'); // Hot white core
  grad.addColorStop(0.2, 'rgba(254, 240, 138, 0.95)'); // Yellow glow
  grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.6)');  // Orange heat rim
  grad.addColorStop(0.8, 'rgba(220, 38, 38, 0.2)');   // Red outer rim
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');       // Soft transparent edge

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

/**
 * Creates an elongated high-velocity spark streak texture
 */
export const createSparkTexture = (): THREE.CanvasTexture => {
  const width = 64;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(width / 2, 0, width / 2, height);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(254, 215, 170, 0.9)');
  grad.addColorStop(0.7, 'rgba(249, 115, 22, 0.4)');
  grad.addColorStop(1.0, 'rgba(185, 28, 28, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, width / 4, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

/**
 * Creates a soft-edged multi-lobed volumetric smoke puff texture
 */
export const createSmokePuffTexture = (): THREE.CanvasTexture => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const center = size / 2;

  // Draw 5 overlapping soft sub-puffs for organic cloudiness
  const lobes = [
    { x: center, y: center, r: size * 0.42 },
    { x: center - 24, y: center - 18, r: size * 0.32 },
    { x: center + 28, y: center - 12, r: size * 0.3 },
    { x: center - 16, y: center + 24, r: size * 0.28 },
    { x: center + 20, y: center + 20, r: size * 0.34 },
  ];

  lobes.forEach(({ x, y, r }) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0.0, 'rgba(200, 200, 210, 0.35)');
    grad.addColorStop(0.5, 'rgba(120, 120, 135, 0.22)');
    grad.addColorStop(0.8, 'rgba(60, 65, 80, 0.08)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

/**
 * Creates a flame color ramp texture for shader lookups
 */
export const createFlameGradientTexture = (): THREE.CanvasTexture => {
  const width = 256;
  const height = 16;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.0, '#ffffff'); // White core
  grad.addColorStop(0.2, '#fef08a'); // Bright yellow
  grad.addColorStop(0.5, '#f97316'); // Vibrant orange
  grad.addColorStop(0.8, '#dc2626'); // Deep red
  grad.addColorStop(1.0, '#1c1917'); // Dark soot

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};
