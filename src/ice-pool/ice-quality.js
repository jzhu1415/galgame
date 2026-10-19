const normal = Object.freeze({ simpleGeometry: false, crystalRatio: 1, refraction: true, liveMirrors: true, cubeSize: 128, mirrorSize: 256, animateCrystals: true });
const profiles = Object.freeze({
  high: normal,
  balanced: normal,
  performance: Object.freeze({ simpleGeometry: true, crystalRatio: .35, refraction: true, liveMirrors: true, cubeSize: 64, mirrorSize: 128, animateCrystals: true }),
  ultra: Object.freeze({ simpleGeometry: true, crystalRatio: .12, refraction: false, liveMirrors: false, cubeSize: 32, mirrorSize: 32, animateCrystals: false }),
});
export function iceQualitySettings(preset) { return profiles[preset] ?? normal; }
