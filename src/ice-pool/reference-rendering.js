import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Limit absolute work as well as DPR: a DPR cap alone still supersamples a
// large desktop viewport. CSS/UI sizing remains independent of this budget.
export function referencePixelRatio(viewport, quality, devicePixelRatio = 1) {
  const nominal = Math.min(devicePixelRatio || 1, quality.pixelRatio);
  const budgetRatio = Math.sqrt(quality.maxPixels / (viewport.width * viewport.height));
  return Math.min(nominal, budgetRatio);
}

/** Bloom needs color only, and can be filtered at less than scene resolution. */
export class ReferenceBloomPass extends UnrealBloomPass {
  constructor(resolution, strength, radius, threshold) {
    super(resolution, strength, radius, threshold);
    this.resolutionScale = 1;
    for (const target of [this.renderTargetBright,
      ...this.renderTargetsHorizontal, ...this.renderTargetsVertical]) {
      target.depthBuffer = false;
    }
  }

  setSize(width, height) {
    const scale = this.resolutionScale ?? 1;
    super.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  }
}
