import * as THREE from 'three';

// One byte per tile over 256m, rather than four colored tiles repeating every 2m.
// The small existing maps still provide all glaze, bevel, grout and stain detail.
export const ACCENT_FIELD_SIZE = 1024;
const srgb = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const blueA = srgb(0.43, 0.69, 0.87), blueB = srgb(0.50, 0.73, 0.90);
const blackA = srgb(0.19, 0.22, 0.25), blackB = srgb(0.23, 0.26, 0.29);

export function tileAccentCode(x, y) {
  let hash = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + 0x51f28b) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash ^ (hash >>> 16)) >>> 24;
}

export function tileAccentTint(code) {
  if (code < 4) return blackA.clone().lerp(blackB, code / 3);
  if (code < 16) return blueA.clone().lerp(blueB, (code - 4) / 11);
  return new THREE.Color(1, 1, 1);
}

const declarations = `
#ifdef USE_MAP
uniform sampler2D tileAccentField;
uniform float tileAccentsEnabled;
uniform vec3 tileAccentBlueA;
uniform vec3 tileAccentBlueB;
uniform vec3 tileAccentBlackA;
uniform vec3 tileAccentBlackB;
uniform vec3 tileAccentAverage;
#endif
`;

const colorFragment = `
#ifdef USE_MAP
  if (tileAccentsEnabled > 0.5) {
    // Use unwrapped UVs: only glaze repeats every eight tiles, not their colors.
    // Keep all derivative/edge work inside the switch so disabling accents is
    // also cheap in the reflection pass, rather than just skipping one sample.
    vec2 accentTileUV = vMapUv * 8.0;
    vec2 accentLocal = fract(accentTileUV);
    vec2 accentDerivatives = fwidth(accentTileUV);
    float accentFootprint = max(accentDerivatives.x, accentDerivatives.y);
    float accentEdgeAA = max(0.0001, min(0.0625, accentFootprint * 0.5));
    vec2 accentEdge = min(accentLocal, 1.0 - accentLocal);
    float accentInterior = smoothstep(0.0625 - accentEdgeAA, 0.0625 + accentEdgeAA,
      min(accentEdge.x, accentEdge.y));
    float accentCode = floor(texture2D(tileAccentField,
      (floor(accentTileUV) + 0.5) / ${ACCENT_FIELD_SIZE.toFixed(1)}).r * 255.0 + 0.5);
    vec3 accentTint = vec3(1.0);
    if (accentCode < 4.0) {
      accentTint = mix(tileAccentBlackA, tileAccentBlackB, accentCode / 3.0);
    } else if (accentCode < 16.0) {
      accentTint = mix(tileAccentBlueA, tileAccentBlueB, (accentCode - 4.0) / 11.0);
    }
    // Fade subpixel patterns to their mean instead of letting distant tiles sparkle.
    float accentDetail = 1.0 - smoothstep(0.4, 1.5, accentFootprint);
    diffuseColor.rgb *= mix(tileAccentAverage,
      mix(vec3(1.0), accentTint, accentInterior), accentDetail);
  }
#endif
`;

export function createTileAccentStyle() {
  const size = ACCENT_FIELD_SIZE;
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    data[y * size + x] = tileAccentCode(x, y);
  }
  const field = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  field.wrapS = field.wrapT = THREE.RepeatWrapping;
  field.magFilter = field.minFilter = THREE.NearestFilter;
  field.generateMipmaps = false;
  field.needsUpdate = true;
  const average = new THREE.Color(0, 0, 0);
  for (let code = 0; code < 256; code++) average.add(tileAccentTint(code));
  average.multiplyScalar(1 / 256);
  // The neutral grout occupies the remaining area of every tile.
  average.lerp(new THREE.Color(1, 1, 1), 1 - 0.875 ** 2);
  const uniforms = {
    tileAccentField: { value: field }, tileAccentsEnabled: { value: 1 },
    tileAccentBlueA: { value: blueA }, tileAccentBlueB: { value: blueB },
    tileAccentBlackA: { value: blackA }, tileAccentBlackB: { value: blackB },
    tileAccentAverage: { value: average },
  };
  const bound = new WeakSet();
  return {
    field, uniforms,
    setEnabled(enabled) { uniforms.tileAccentsEnabled.value = enabled ? 1 : 0; },
    bind(material) {
      if (bound.has(material)) return material;
      bound.add(material);
      const previousCompile = material.onBeforeCompile.bind(material);
      const previousKey = material.customProgramCacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        previousCompile(shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.fragmentShader = declarations + shader.fragmentShader.replace(
          '#include <map_fragment>', '#include <map_fragment>\n' + colorFragment);
      };
      material.customProgramCacheKey = () => `${previousKey}|tile-accents-v1`;
      material.needsUpdate = true;
      return material;
    },
    dispose() { field.dispose(); },
  };
}
