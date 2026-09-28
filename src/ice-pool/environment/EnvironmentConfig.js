export const ENVIRONMENT_CONFIG = { seed: 1847 };

// Local lighting only: no preset changes the reference map's fog, exposure or materials.
export const LIGHTING_PRESETS = {
  warm: { color: '#fff0d7', intensity: 1.65, fixture: 'strip' },
  cyan: { color: '#c2eced', intensity: 1.35, fixture: 'panel' },
  skylight: { color: '#fffaf0', intensity: 1.85, fixture: 'recess' },
  dim: { color: '#93cec9', intensity: 0.48, fixture: 'wall' },
  sparse: { color: '#dce5dd', intensity: 0.70, fixture: 'panel' },
  spa: { color: '#ffe6c6', intensity: 0.90, fixture: 'round' },
};

export const THEMES = {
  white: { lighting: 'warm', depth: [0.7, 1.05] },
  green: { lighting: 'spa', depth: [0.75, 1.8] },
  blue: { lighting: 'cyan', depth: [1.6, 2.7] },
  sky: { lighting: 'skylight', depth: [0.8, 2.5] },
  dark: { lighting: 'dim', depth: [1.7, 2.8] },
};

export function seedHash(x, z, seed = ENVIRONMENT_CONFIG.seed) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}
