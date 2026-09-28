import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Water as FlowWater } from 'three/addons/objects/Water2.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';

const causticFrameModules = import.meta.glob('./assets/caustics/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const causticFrameUrls = Object.entries(causticFrameModules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, url]) => url);

const canvas = document.querySelector('#world');
const entry = document.querySelector('#entry');
const loading = document.querySelector('#loading');
const experience = document.querySelector('#experience');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const WATER_LEVEL = 0.34;
const EYE_HEIGHT = 1.7;
const CHUNK_SIZE = 18;
const CHUNK_RADIUS = window.innerWidth < 720 ? 1 : 2;
const clock = new THREE.Clock();
const keys = new Set();
const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.25 : 1.65));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102d38);
scene.fog = new THREE.FogExp2(0x173945, 0.035);

const camera = new THREE.PerspectiveCamera(69, window.innerWidth / window.innerHeight, 0.06, 105);
camera.position.set(0, EYE_HEIGHT, 1.5);
camera.rotation.order = 'YXZ';
scene.add(camera);

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    zenith: { value: new THREE.Color(0x497da2) },
    horizon: { value: new THREE.Color(0xc0d9e1) },
  },
  vertexShader: /* glsl */`
    varying vec3 vDirection;
    void main() {
      vDirection = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float time;
    uniform vec3 zenith;
    uniform vec3 horizon;
    varying vec3 vDirection;

    float cloudLayer(vec2 p) {
      float t = time * 0.008;
      float n = sin(p.x * 3.1 + t) * sin(p.y * 2.7 - t * 0.7);
      n += sin((p.x + p.y) * 5.4 - t * 1.3) * 0.45;
      n += sin(p.x * 9.2 - p.y * 4.1 + t * 0.6) * 0.2;
      return smoothstep(0.18, 0.82, n * 0.38 + 0.52);
    }

    void main() {
      vec3 direction = normalize(vDirection);
      float heightMix = smoothstep(-0.08, 0.92, direction.y);
      vec3 sky = mix(horizon, zenith, pow(heightMix, 0.72));
      vec2 skyUv = vec2(atan(direction.z, direction.x), direction.y) * vec2(0.72, 2.3);
      float clouds = cloudLayer(skyUv) * smoothstep(0.12, 0.72, direction.y);
      sky = mix(sky, vec3(0.78, 0.88, 0.91), clouds * 0.46);
      float haze = 1.0 - smoothstep(0.02, 0.36, direction.y);
      sky = mix(sky, vec3(0.64, 0.78, 0.83), haze * 0.45);
      gl_FragColor = vec4(sky, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(92, 32, 20), skyMaterial);
skyDome.renderOrder = -10;
scene.add(skyDome);

const controls = new PointerLockControls(camera, canvas);
controls.pointerSpeed = 0.72;

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
scene.environment = pmrem.fromScene(roomEnvironment, 0.035).texture;
roomEnvironment.dispose();
pmrem.dispose();

RectAreaLightUniformsLib.init();

function hash2D(x, z, salt = 0) {
  let h = Math.imul(x ^ 0x6d2b79f5, 0x27d4eb2d) ^ Math.imul(z ^ salt, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvasTexture(size, painter, { color = false, repeat = [4, 4] } = {}) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext('2d');
  painter(ctx, size);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seededNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function makeTileMaps(tone = 'green') {
  const palette = tone === 'cream'
    ? ['#b4bdb4', '#b0bab1', '#bac2b8', '#acb7ae']
    : ['#83a29b', '#7f9f98', '#89a69f', '#7d9b95'];
  const groutColor = tone === 'cream' ? '#7e8c85' : '#59746f';
  const grid = 8;
  const tileInset = 1.15;

  const colorMap = makeCanvasTexture(512, (ctx, s) => {
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, s, s);
    const tile = s / grid;
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        const shade = palette[Math.floor(seededNoise(x + 17, y + 9) * palette.length)];
        ctx.fillStyle = shade;
        ctx.fillRect(
          x * tile + tileInset,
          y * tile + tileInset,
          tile - tileInset * 2,
          tile - tileInset * 2,
        );

        const cloudX = (x + 0.25 + seededNoise(x + 71, y + 13) * 0.5) * tile;
        const cloudY = (y + 0.2 + seededNoise(x + 29, y + 61) * 0.6) * tile;
        const glaze = ctx.createRadialGradient(cloudX, cloudY, 2, cloudX, cloudY, tile * 0.72);
        glaze.addColorStop(0, 'rgba(255,255,250,.075)');
        glaze.addColorStop(0.58, 'rgba(255,255,255,.018)');
        glaze.addColorStop(1, 'rgba(20,45,40,.055)');
        ctx.fillStyle = glaze;
        ctx.fillRect(
          x * tile + tileInset,
          y * tile + tileInset,
          tile - tileInset * 2,
          tile - tileInset * 2,
        );

        ctx.strokeStyle = 'rgba(245,255,250,.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * tile + 2.1, y * tile + 2.1, tile - 4.2, tile - 4.2);
      }
    }
    for (let i = 0; i < 900; i += 1) {
      const a = seededNoise(i, 31);
      ctx.fillStyle = `rgba(20,44,40,${a * 0.026})`;
      ctx.fillRect(seededNoise(i, 1) * s, seededNoise(i, 2) * s, 1, 1);
    }
  }, { color: true, repeat: [3.5, 3.5] });

  const roughnessMap = makeCanvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#c2c2c2';
    ctx.fillRect(0, 0, s, s);
    const tile = s / grid;
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 3;
    for (let i = 0; i <= grid; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(s, i * tile); ctx.stroke();
    }
    for (let i = 0; i < 1200; i += 1) {
      const v = 174 + Math.floor(seededNoise(i, 8) * 48);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(seededNoise(i, 4) * s, seededNoise(i, 5) * s, 1, 1);
    }
  }, { repeat: [3.5, 3.5] });

  const normalMap = makeCanvasTexture(512, (ctx, s) => {
    const tile = s / grid;
    const heightAt = (px, py) => {
      const localX = ((px % tile) + tile) % tile;
      const localY = ((py % tile) + tile) % tile;
      const edgeDistance = Math.min(localX, tile - localX, localY, tile - localY);
      if (edgeDistance <= 1.2) return 0.08;
      if (edgeDistance >= 4.2) {
        return 1 + (seededNoise(Math.floor(px / 5), Math.floor(py / 5)) - 0.5) * 0.018;
      }
      const t = THREE.MathUtils.clamp((edgeDistance - 1.2) / 3, 0, 1);
      return 0.08 + (t * t * (3 - 2 * t)) * 0.92;
    };
    const image = ctx.createImageData(s, s);
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 2.25;
        const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 2.25;
        const length = Math.hypot(dx, dy, 1);
        const offset = (y * s + x) * 4;
        image.data[offset] = Math.round((-dx / length * 0.5 + 0.5) * 255);
        image.data[offset + 1] = Math.round((-dy / length * 0.5 + 0.5) * 255);
        image.data[offset + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
        image.data[offset + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, { repeat: [3.5, 3.5] });

  const aoMap = makeCanvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, s, s);
    const tile = s / grid;
    ctx.strokeStyle = '#c5c5c5';
    ctx.lineWidth = 5.5;
    for (let i = 0; i <= grid; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(s, i * tile); ctx.stroke();
    }
    ctx.strokeStyle = '#858585';
    ctx.lineWidth = 2.2;
    for (let i = 0; i <= grid; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(s, i * tile); ctx.stroke();
    }
  }, { repeat: [3.5, 3.5] });

  return { colorMap, roughnessMap, normalMap, aoMap };
}

function makeConcreteMaps() {
  const colorMap = makeCanvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#6e7770';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 13000; i += 1) {
      const value = 72 + Math.floor(seededNoise(i, 10) * 75);
      const alpha = 0.05 + seededNoise(i, 12) * 0.13;
      ctx.fillStyle = `rgba(${value},${value + 5},${value},${alpha})`;
      const r = seededNoise(i, 15) * 2.4;
      ctx.fillRect(seededNoise(i, 13) * s, seededNoise(i, 14) * s, r, r);
    }
    for (let i = 0; i < 16; i += 1) {
      const x = seededNoise(i, 22) * s;
      const y = seededNoise(i, 23) * s;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 28 + seededNoise(i, 24) * 70);
      gradient.addColorStop(0, 'rgba(19,45,39,.16)');
      gradient.addColorStop(1, 'rgba(19,45,39,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, s, s);
    }
  }, { color: true, repeat: [2.2, 2.2] });
  const roughnessMap = makeCanvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 12000; i += 1) {
      const v = 105 + Math.floor(seededNoise(i, 44) * 140);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(seededNoise(i, 41) * s, seededNoise(i, 42) * s, 2, 2);
    }
  }, { repeat: [2.2, 2.2] });
  return { colorMap, roughnessMap };
}

const greenTiles = makeTileMaps('green');
const creamTiles = makeTileMaps('cream');
const concreteMaps = makeConcreteMaps();

const materials = {
  wallTile: new THREE.MeshPhysicalMaterial({
    map: greenTiles.colorMap,
    roughnessMap: greenTiles.roughnessMap,
    normalMap: greenTiles.normalMap,
    aoMap: greenTiles.aoMap,
    roughness: 0.54,
    metalness: 0,
    normalScale: new THREE.Vector2(0.48, 0.48),
    aoMapIntensity: 0.72,
    clearcoat: 0.64,
    clearcoatRoughness: 0.17,
    specularIntensity: 0.72,
    envMapIntensity: 0.82,
  }),
  creamTile: new THREE.MeshPhysicalMaterial({
    map: creamTiles.colorMap,
    roughnessMap: creamTiles.roughnessMap,
    normalMap: creamTiles.normalMap,
    aoMap: creamTiles.aoMap,
    roughness: 0.57,
    metalness: 0,
    normalScale: new THREE.Vector2(0.46, 0.46),
    aoMapIntensity: 0.68,
    clearcoat: 0.56,
    clearcoatRoughness: 0.19,
    specularIntensity: 0.68,
    envMapIntensity: 0.76,
  }),
  ceilingTile: new THREE.MeshPhysicalMaterial({
    map: creamTiles.colorMap,
    roughnessMap: creamTiles.roughnessMap,
    normalMap: creamTiles.normalMap,
    aoMap: creamTiles.aoMap,
    color: 0xd4ddd5,
    roughness: 0.68,
    metalness: 0,
    normalScale: new THREE.Vector2(0.38, 0.38),
    aoMapIntensity: 0.74,
    clearcoat: 0.38,
    clearcoatRoughness: 0.27,
    specularIntensity: 0.58,
    envMapIntensity: 0.68,
  }),
  concrete: new THREE.MeshStandardMaterial({
    map: concreteMaps.colorMap,
    roughnessMap: concreteMaps.roughnessMap,
    roughness: 0.91,
    metalness: 0,
    envMapIntensity: 0.35,
  }),
  darkPool: new THREE.MeshPhysicalMaterial({
    color: 0x284c4c,
    roughness: 0.76,
    clearcoat: 0.17,
    envMapIntensity: 0.5,
  }),
  trim: new THREE.MeshStandardMaterial({
    color: 0x273a37,
    metalness: 0.42,
    roughness: 0.52,
  }),
  skylightGlass: new THREE.MeshPhysicalMaterial({
    color: 0xc3e5f2,
    roughness: 0.12,
    metalness: 0,
    transmission: 0.58,
    transparent: true,
    opacity: 0.72,
    thickness: 0.08,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.08,
    side: THREE.DoubleSide,
  }),
};

const causticTextureLoader = new THREE.TextureLoader();
const causticFrames = causticFrameUrls.map((url) => {
  const texture = causticTextureLoader.load(url);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
});

const waterLightUniforms = {
  time: { value: 0 },
  color: { value: new THREE.Color(0xa4d6df) },
  mapA: { value: causticFrames[0] },
  mapB: { value: causticFrames[1] },
  frameBlend: { value: 0 },
};

function updateCausticAnimation(time) {
  const framePosition = (time * 7.2) % causticFrames.length;
  const frameIndex = Math.floor(framePosition);
  const nextFrameIndex = (frameIndex + 1) % causticFrames.length;
  const rawBlend = framePosition - frameIndex;
  waterLightUniforms.mapA.value = causticFrames[frameIndex];
  waterLightUniforms.mapB.value = causticFrames[nextFrameIndex];
  waterLightUniforms.frameBlend.value = rawBlend * rawBlend * (3 - 2 * rawBlend);
}

function addWaterLightProjection(material, intensity) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.poolCausticTime = waterLightUniforms.time;
    shader.uniforms.poolCausticColor = waterLightUniforms.color;
    shader.uniforms.poolCausticMapA = waterLightUniforms.mapA;
    shader.uniforms.poolCausticMapB = waterLightUniforms.mapB;
    shader.uniforms.poolCausticFrameBlend = waterLightUniforms.frameBlend;
    shader.uniforms.poolCausticIntensity = { value: intensity };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPoolWorldPosition;
        varying vec3 vPoolWorldNormal;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vPoolWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vPoolWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float poolCausticTime;
        uniform float poolCausticIntensity;
        uniform float poolCausticFrameBlend;
        uniform vec3 poolCausticColor;
        uniform sampler2D poolCausticMapA;
        uniform sampler2D poolCausticMapB;
        varying vec3 vPoolWorldPosition;
        varying vec3 vPoolWorldNormal;

        float poolCausticLayer(vec2 p, float phase) {
          vec2 drift = vec2(poolCausticTime * 0.0032, -poolCausticTime * 0.0021);
          vec2 uv = p * 0.225 + drift + vec2(phase * 0.173, -phase * 0.119);
          float frameA = texture2D(poolCausticMapA, uv).r;
          float frameB = texture2D(poolCausticMapB, uv).r;
          float animatedFrame = mix(frameA, frameB, poolCausticFrameBlend);
          return smoothstep(0.61, 0.94, animatedFrame);
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        `vec3 causticWeights = pow(abs(normalize(vPoolWorldNormal)), vec3(4.0));
        causticWeights /= max(dot(causticWeights, vec3(1.0)), 0.001);
        float causticX = poolCausticLayer(vPoolWorldPosition.yz, 0.0);
        float causticY = poolCausticLayer(vPoolWorldPosition.xz, 2.7);
        float causticZ = poolCausticLayer(vPoolWorldPosition.xy, 5.4);
        float caustic = dot(causticWeights, vec3(causticX, causticY, causticZ));
        float heightAttenuation = mix(1.0, 0.58, smoothstep(0.6, 4.9, vPoolWorldPosition.y));
        outgoingLight += poolCausticColor * caustic * poolCausticIntensity * heightAttenuation;
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `pool-water-light-${intensity}`;
  material.needsUpdate = true;
}

addWaterLightProjection(materials.wallTile, 0.105);
addWaterLightProjection(materials.creamTile, 0.09);
addWaterLightProjection(materials.ceilingTile, 0.12);
addWaterLightProjection(materials.concrete, 0.075);
addWaterLightProjection(materials.darkPool, 0.15);

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const planeGeometry = new THREE.PlaneGeometry(1, 1);
const skylightBeamTime = { value: 0 };
const skylightBeamColor = { value: new THREE.Color(0xaed9ef) };

function makeSkylightBeamMaterial(density) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: skylightBeamTime,
      color: skylightBeamColor,
      density: { value: density },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform float density;
      uniform vec3 color;
      varying vec2 vUv;
      varying vec3 vWorld;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.7, 289.1))) * 45758.5453);
      }

      void main() {
        vec2 centered = abs(vUv - 0.5) * 2.0;
        float softSide = 1.0 - smoothstep(0.56, 1.0, centered.x);
        float softEnds = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.74, 1.0, vUv.y));
        vec2 driftOffset = vec2(time * 0.035, -time * 0.022);
        float grain = hash(floor(vWorld.xz * 11.0 + driftOffset));
        float mist = 0.74 + 0.26 * sin(vWorld.y * 2.55 + vWorld.x * 0.31 + time * 0.15);
        float alpha = softSide * softEnds * (0.012 + grain * 0.014) * mist * density;
        gl_FragColor = vec4(color * (0.8 + grain * 0.28), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

const skylightBeamMaterials = [0.045, 0.1, 0.19, 0.32].map(makeSkylightBeamMaterial);

function makeBox(group, material, position, scale, { collider = false, castShadow = false } = {}) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (collider) {
    group.userData.colliders.push({
      minX: position[0] - scale[0] * 0.5,
      maxX: position[0] + scale[0] * 0.5,
      minZ: position[2] - scale[2] * 0.5,
      maxZ: position[2] + scale[2] * 0.5,
    });
  }
  return mesh;
}

const tiledMaterials = new Set([materials.wallTile, materials.creamTile, materials.ceilingTile]);

function applyWorldTileUvs(geometry) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const tileScale = 0.11;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));

    if (ny >= nx && ny >= nz) uv.setXY(i, x * tileScale, z * tileScale);
    else if (nx >= nz) uv.setXY(i, z * tileScale, y * tileScale);
    else uv.setXY(i, x * tileScale, y * tileScale);
  }
  uv.needsUpdate = true;
  geometry.setAttribute('uv1', uv.clone());
}

function batchStaticBoxes(group) {
  const buckets = new Map();
  const candidates = group.children.filter((child) => child.isMesh && child.geometry === boxGeometry);

  for (const mesh of candidates) {
    mesh.updateMatrix();
    const bucket = buckets.get(mesh.material.uuid) ?? {
      material: mesh.material,
      geometries: [],
      castShadow: false,
    };
    const geometry = boxGeometry.clone();
    geometry.applyMatrix4(mesh.matrix);
    if (tiledMaterials.has(mesh.material)) applyWorldTileUvs(geometry);
    bucket.geometries.push(geometry);
    bucket.castShadow ||= mesh.castShadow;
    buckets.set(mesh.material.uuid, bucket);
    group.remove(mesh);
  }

  for (const bucket of buckets.values()) {
    const geometry = mergeGeometries(bucket.geometries, false);
    bucket.geometries.forEach((item) => item.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    group.userData.ownedGeometries.push(geometry);
  }
}

const causticMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    intensity: { value: 0.25 },
    causticMapA: waterLightUniforms.mapA,
    causticMapB: waterLightUniforms.mapB,
    frameBlend: waterLightUniforms.frameBlend,
  },
  vertexShader: /* glsl */`
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      vec4 mvPosition = viewMatrix * world;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */`
    uniform float time;
    uniform float intensity;
    uniform float frameBlend;
    uniform sampler2D causticMapA;
    uniform sampler2D causticMapB;
    varying vec3 vWorld;

    float sampleCaustic(vec2 uv) {
      float frameA = texture2D(causticMapA, uv).r;
      float frameB = texture2D(causticMapB, uv).r;
      return smoothstep(0.61, 0.94, mix(frameA, frameB, frameBlend));
    }

    void main() {
      vec2 drift = vec2(time * 0.0032, -time * 0.0021);
      float caustic = sampleCaustic(vWorld.xz * 0.225 + drift);
      float alpha = caustic * intensity * 0.58;
      gl_FragColor = vec4(vec3(0.64, 0.86, 0.92) * alpha, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

function addCausticPlane(group, x, z, width, depth, y = 0.012, strength = 0.22) {
  const mesh = new THREE.Mesh(planeGeometry, causticMaterial.clone());
  mesh.material.uniforms = THREE.UniformsUtils.clone(causticMaterial.uniforms);
  mesh.material.uniforms.intensity.value = strength;
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.position.set(x, y, z);
  mesh.scale.set(width, depth, 1);
  mesh.renderOrder = 1;
  group.add(mesh);
  group.userData.caustics.push(mesh.material);
}

function addWallSection(group, axis, coordinate, center, span, height, thickness, material) {
  const makeSectionBox = (along, y, alongSize, boxHeight, boxMaterial, collider = false, normalSize = thickness) => {
    if (axis === 'x') {
      return makeBox(group, boxMaterial, [along, y, coordinate], [alongSize, boxHeight, normalSize], { collider });
    }
    return makeBox(group, boxMaterial, [coordinate, y, along], [normalSize, boxHeight, alongSize], { collider });
  };
  makeSectionBox(center, height * 0.5, span, height, material, true);
}

function addPortalWall(group, axis, coordinate, center, rng, material = materials.wallTile) {
  const opening = 3.4 + rng() * 1.6;
  const thickness = 0.34;
  const height = 4.75;
  const side = (CHUNK_SIZE - opening) * 0.5;
  const offset = opening * 0.5 + side * 0.5;

  addWallSection(group, axis, coordinate, center - offset, side, height, thickness, material);
  addWallSection(group, axis, coordinate, center + offset, side, height, thickness, material);

  if (axis === 'x') {
    makeBox(group, material, [center, 4.18, coordinate], [opening, 1.14, thickness + 0.06]);
  } else {
    makeBox(group, material, [coordinate, 4.18, center], [thickness + 0.06, 1.14, opening]);
  }
}

function addColumns(group, cx, cz, rng) {
  const count = rng() > 0.45 ? 4 : 2;
  const positions = count === 4
    ? [[-4.4, -4.4], [4.4, -4.4], [-4.4, 4.4], [4.4, 4.4]]
    : [[-4.8, 0], [4.8, 0]];
  positions.forEach(([x, z]) => {
    makeBox(group, materials.creamTile, [cx + x, 2.35, cz + z], [1.15, 4.7, 1.15], { collider: true, castShadow: true });
  });
}

function addPlatform(group, cx, cz, rng) {
  const width = 7 + rng() * 2.2;
  const depth = 5.5 + rng() * 2.5;
  const platformY = 0.49;
  makeBox(group, materials.creamTile, [cx, platformY * 0.5, cz - 0.6], [width, platformY, depth], { collider: false });
  group.userData.zones.push({
    minX: cx - width * 0.5,
    maxX: cx + width * 0.5,
    minZ: cz - 0.6 - depth * 0.5,
    maxZ: cz - 0.6 + depth * 0.5,
    height: platformY,
    mode: 'platform',
  });
  const stepDepth = 0.55;
  for (let i = 0; i < 3; i += 1) {
    const h = (i + 1) * (platformY / 3);
    const z = cz + depth * 0.5 + 0.25 + i * stepDepth;
    makeBox(group, materials.creamTile, [cx, h * 0.5, z], [width * 0.58, h, stepDepth + 0.06]);
    group.userData.zones.push({
      minX: cx - width * 0.29,
      maxX: cx + width * 0.29,
      minZ: z - stepDepth * 0.5,
      maxZ: z + stepDepth * 0.5,
      height: h,
      mode: 'stairs',
    });
  }
  if (rng() > 0.5) {
    makeBox(group, materials.wallTile, [cx - width * 0.25, 2.65, cz - 0.6], [0.44, 4.3, depth * 0.7], { collider: true });
  }
}

function addDeepPool(group, cx, cz, rng) {
  const width = 7.4 + rng() * 1.2;
  const depth = 6.2 + rng() * 1.4;
  const rim = 0.62;
  const bottom = -1.32;
  const halfChunk = CHUNK_SIZE * 0.5;
  const sideWidth = (CHUNK_SIZE - width) * 0.5;
  const sideDepth = (CHUNK_SIZE - depth) * 0.5;

  makeBox(group, materials.creamTile, [cx - (width * 0.5 + sideWidth * 0.5), -0.07, cz], [sideWidth, 0.18, CHUNK_SIZE], {});
  makeBox(group, materials.creamTile, [cx + (width * 0.5 + sideWidth * 0.5), -0.07, cz], [sideWidth, 0.18, CHUNK_SIZE], {});
  makeBox(group, materials.creamTile, [cx, -0.07, cz - (depth * 0.5 + sideDepth * 0.5)], [width, 0.18, sideDepth], {});
  makeBox(group, materials.creamTile, [cx, -0.07, cz + (depth * 0.5 + sideDepth * 0.5)], [width, 0.18, sideDepth], {});
  makeBox(group, materials.darkPool, [cx, bottom - 0.06, cz], [width, 0.14, depth], {});
  makeBox(group, materials.wallTile, [cx - width * 0.5, bottom * 0.5, cz], [0.22, Math.abs(bottom), depth], {});
  makeBox(group, materials.wallTile, [cx + width * 0.5, bottom * 0.5, cz], [0.22, Math.abs(bottom), depth], {});
  makeBox(group, materials.wallTile, [cx, bottom * 0.5, cz - depth * 0.5], [width, Math.abs(bottom), 0.22], {});
  makeBox(group, materials.wallTile, [cx, bottom * 0.5, cz + depth * 0.5], [width, Math.abs(bottom), 0.22], {});
  makeBox(group, materials.creamTile, [cx - width * 0.5, 0.06, cz], [rim, 0.18, depth + rim], {});
  makeBox(group, materials.creamTile, [cx + width * 0.5, 0.06, cz], [rim, 0.18, depth + rim], {});
  makeBox(group, materials.creamTile, [cx, 0.06, cz - depth * 0.5], [width + rim, 0.18, rim], {});
  makeBox(group, materials.creamTile, [cx, 0.06, cz + depth * 0.5], [width + rim, 0.18, rim], {});

  group.userData.zones.push({
    minX: cx - width * 0.5 + 0.32,
    maxX: cx + width * 0.5 - 0.32,
    minZ: cz - depth * 0.5 + 0.32,
    maxZ: cz + depth * 0.5 - 0.32,
    height: bottom,
    mode: 'deep',
  });
  addCausticPlane(group, cx, cz, width - 0.3, depth - 0.3, bottom + 0.03, 0.34);

  if (rng() > 0.46) {
    for (let i = 0; i < 4; i += 1) {
      const h = -0.2 - i * 0.23;
      const stepZ = cz + depth * 0.5 - 0.4 - i * 0.38;
      makeBox(group, materials.creamTile, [cx, h, stepZ], [2.1, 0.22, 0.48], {});
    }
  }

  void halfChunk;
}

function addInnerPartitions(group, cx, cz, rng) {
  const horizontal = rng() > 0.5;
  const offset = (rng() - 0.5) * 4;
  if (horizontal) {
    const z = cz + offset;
    makeBox(group, materials.wallTile, [cx - 5.4, 2.35, z], [5.3, 4.7, 0.32], { collider: true });
    makeBox(group, materials.wallTile, [cx + 5.4, 2.35, z], [5.3, 4.7, 0.32], { collider: true });
    makeBox(group, materials.wallTile, [cx, 4.25, z], [5.5, 0.9, 0.38]);
  } else {
    const x = cx + offset;
    makeBox(group, materials.wallTile, [x, 2.35, cz - 5.4], [0.32, 4.7, 5.3], { collider: true });
    makeBox(group, materials.wallTile, [x, 2.35, cz + 5.4], [0.32, 4.7, 5.3], { collider: true });
    makeBox(group, materials.wallTile, [x, 4.25, cz], [0.38, 0.9, 5.5]);
  }
}

function addCeiling(group, cx, cz, hasSkylight, rng) {
  const ceilingY = 4.95;
  const ceilingThickness = 0.34;
  if (!hasSkylight) {
    makeBox(group, materials.ceilingTile, [cx, ceilingY, cz], [CHUNK_SIZE, ceilingThickness, CHUNK_SIZE]);
    return;
  }

  const openingSize = 5.25 + rng() * 0.9;
  const openingWidth = openingSize;
  const openingDepth = openingSize;
  const openingX = cx + (rng() - 0.5) * 2.2;
  const openingZ = cz + (rng() - 0.5) * 2.2;
  const chunkMinX = cx - CHUNK_SIZE * 0.5;
  const chunkMaxX = cx + CHUNK_SIZE * 0.5;
  const chunkMinZ = cz - CHUNK_SIZE * 0.5;
  const chunkMaxZ = cz + CHUNK_SIZE * 0.5;
  const openingMinX = openingX - openingWidth * 0.5;
  const openingMaxX = openingX + openingWidth * 0.5;
  const openingMinZ = openingZ - openingDepth * 0.5;
  const openingMaxZ = openingZ + openingDepth * 0.5;
  const leftWidth = openingMinX - chunkMinX;
  const rightWidth = chunkMaxX - openingMaxX;
  const northDepth = openingMinZ - chunkMinZ;
  const southDepth = chunkMaxZ - openingMaxZ;

  makeBox(group, materials.ceilingTile, [chunkMinX + leftWidth * 0.5, ceilingY, cz], [leftWidth, ceilingThickness, CHUNK_SIZE]);
  makeBox(group, materials.ceilingTile, [openingMaxX + rightWidth * 0.5, ceilingY, cz], [rightWidth, ceilingThickness, CHUNK_SIZE]);
  makeBox(group, materials.ceilingTile, [openingX, ceilingY, chunkMinZ + northDepth * 0.5], [openingWidth, ceilingThickness, northDepth]);
  makeBox(group, materials.ceilingTile, [openingX, ceilingY, openingMaxZ + southDepth * 0.5], [openingWidth, ceilingThickness, southDepth]);

  const frameThickness = 0.18;
  const frameDepth = 0.26;
  makeBox(group, materials.trim, [openingMinX, 4.78, openingZ], [frameThickness, frameDepth, openingDepth + 0.22]);
  makeBox(group, materials.trim, [openingMaxX, 4.78, openingZ], [frameThickness, frameDepth, openingDepth + 0.22]);
  makeBox(group, materials.trim, [openingX, 4.78, openingMinZ], [openingWidth + 0.22, frameDepth, frameThickness]);
  makeBox(group, materials.trim, [openingX, 4.78, openingMaxZ], [openingWidth + 0.22, frameDepth, frameThickness]);
  makeBox(group, materials.skylightGlass, [openingX, 5.16, openingZ], [openingWidth - 0.22, 0.045, openingDepth - 0.22]);

  const layerCount = 9;
  for (let i = 0; i < layerCount; i += 1) {
    const normalized = i / (layerCount - 1) - 0.5;
    const offset = normalized * openingSize * 0.84;
    const densityIndex = Math.min(3, Math.floor((1 - Math.abs(normalized) * 2) * 3.99));
    const material = skylightBeamMaterials[Math.max(0, densityIndex)];

    const zLayer = new THREE.Mesh(planeGeometry, material);
    zLayer.position.set(openingX, 2.48, openingZ + offset);
    zLayer.scale.set(openingSize * 1.16, 4.7, 1);
    zLayer.renderOrder = 3;
    group.add(zLayer);

    const xLayer = new THREE.Mesh(planeGeometry, material);
    xLayer.position.set(openingX + offset, 2.48, openingZ);
    xLayer.rotation.y = Math.PI * 0.5;
    xLayer.scale.set(openingSize * 1.16, 4.7, 1);
    xLayer.renderOrder = 3;
    group.add(xLayer);
  }
  group.userData.skylights.push({ x: openingX, y: 4.75, z: openingZ, width: openingWidth, depth: openingDepth });
}

function createChunk(gx, gz) {
  const group = new THREE.Group();
  group.name = `poolroom-${gx}:${gz}`;
  group.userData.colliders = [];
  group.userData.zones = [];
  group.userData.caustics = [];
  group.userData.ownedGeometries = [];
  group.userData.skylights = [];
  const rng = mulberry32(hash2D(gx, gz, 91));
  const skylightRng = mulberry32(hash2D(gx, gz, 1201));
  const cx = gx * CHUNK_SIZE;
  const cz = gz * CHUNK_SIZE;
  const type = Math.floor(rng() * 5);

  if (type === 3) {
    addDeepPool(group, cx, cz, rng);
  } else {
    makeBox(group, materials.creamTile, [cx, -0.09, cz], [CHUNK_SIZE, 0.22, CHUNK_SIZE]);
    addCausticPlane(group, cx, cz, CHUNK_SIZE - 0.3, CHUNK_SIZE - 0.3, 0.025, type === 1 ? 0.14 : 0.22);
  }

  const hasSkylight = (gx === 0 && gz === 0) || skylightRng() > 0.64;
  addCeiling(group, cx, cz, hasSkylight, skylightRng);

  const northRng = mulberry32(hash2D(gx, gz, 301));
  const westRng = mulberry32(hash2D(gx, gz, 701));
  addPortalWall(group, 'x', cz - CHUNK_SIZE * 0.5, cx, northRng, rng() > 0.75 ? materials.creamTile : materials.wallTile);
  addPortalWall(group, 'z', cx - CHUNK_SIZE * 0.5, cz, westRng, rng() > 0.75 ? materials.creamTile : materials.wallTile);

  if (type === 0) addColumns(group, cx, cz, rng);
  if (type === 1) addPlatform(group, cx, cz, rng);
  if (type === 2) addInnerPartitions(group, cx, cz, rng);
  if (type === 4) {
    addColumns(group, cx, cz, rng);
    if (rng() > 0.42) addInnerPartitions(group, cx, cz, rng);
  }

  batchStaticBoxes(group);
  scene.add(group);
  return group;
}

class ChunkManager {
  constructor() {
    this.chunks = new Map();
    this.centerX = Infinity;
    this.centerZ = Infinity;
  }

  update(position, force = false) {
    const centerX = Math.round(position.x / CHUNK_SIZE);
    const centerZ = Math.round(position.z / CHUNK_SIZE);
    if (!force && centerX === this.centerX && centerZ === this.centerZ) return;
    this.centerX = centerX;
    this.centerZ = centerZ;
    const needed = new Set();

    for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz += 1) {
      for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx += 1) {
        const gx = centerX + dx;
        const gz = centerZ + dz;
        const key = `${gx}:${gz}`;
        needed.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, createChunk(gx, gz));
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (!needed.has(key)) {
        chunk.userData.caustics.forEach((material) => material.dispose());
        chunk.userData.ownedGeometries.forEach((geometry) => geometry.dispose());
        scene.remove(chunk);
        this.chunks.delete(key);
      }
    }
  }

  getZone(x, z) {
    let best = null;
    for (const chunk of this.chunks.values()) {
      for (const zone of chunk.userData.zones) {
        if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
          if (!best || zone.mode === 'deep' || zone.height > best.height) best = zone;
        }
      }
    }
    return best;
  }

  collides(x, z, radius = 0.32) {
    for (const chunk of this.chunks.values()) {
      for (const box of chunk.userData.colliders) {
        if (
          x + radius > box.minX &&
          x - radius < box.maxX &&
          z + radius > box.minZ &&
          z - radius < box.maxZ
        ) return true;
      }
    }
    return false;
  }

  getNearestSkylights(position, count = 4) {
    const candidates = [];
    for (const chunk of this.chunks.values()) {
      for (const skylight of chunk.userData.skylights) {
        const dx = skylight.x - position.x;
        const dz = skylight.z - position.z;
        candidates.push({ ...skylight, distanceSq: dx * dx + dz * dz });
      }
    }
    candidates.sort((a, b) => a.distanceSq - b.distanceSq);
    return candidates.slice(0, count);
  }

  updateCaustics(time) {
    for (const chunk of this.chunks.values()) {
      for (const material of chunk.userData.caustics) {
        material.uniforms.time.value = time;
        material.uniforms.causticMapA.value = waterLightUniforms.mapA.value;
        material.uniforms.causticMapB.value = waterLightUniforms.mapB.value;
        material.uniforms.frameBlend.value = waterLightUniforms.frameBlend.value;
      }
    }
  }
}

const chunks = new ChunkManager();
chunks.update(camera.position, true);

function makeWaterNormalTexture(size = 256, phaseShift = 0) {
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const ctx = normalCanvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const tau = Math.PI * 2;
  const waves = [
    [1, 2, 0.46, 0.15],
    [3, -1, 0.28, 1.7],
    [4, 5, 0.15, 3.1],
    [-7, 3, 0.08, 4.2],
    [9, 8, 0.045, 2.4],
    [13, -11, 0.025, 5.6],
    [21, 17, 0.013, 0.8],
    [-31, 27, 0.008, 4.85],
  ];

  function height(u, v) {
    let value = 0;
    for (let waveIndex = 0; waveIndex < waves.length; waveIndex += 1) {
      const [xFrequency, yFrequency, amplitude, phase] = waves[waveIndex];
      const shiftedPhase = phase + phaseShift * (waveIndex * 0.61 + 1);
      value += Math.sin(tau * (xFrequency * u + yFrequency * v) + shiftedPhase) * amplitude;
    }
    return value;
  }

  const step = 1 / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const dx = (height(u + step, v) - height(u - step, v)) * size * 0.34;
      const dz = (height(u, v + step) - height(u, v - step)) * size * 0.34;
      const inverseLength = 1 / Math.hypot(dx, 1, dz);
      const normalX = -dx * inverseLength;
      const normalY = inverseLength;
      const normalZ = -dz * inverseLength;
      const index = (y * size + x) * 4;
      image.data[index] = Math.round((normalX * 0.5 + 0.5) * 255);
      image.data[index + 1] = Math.round((normalZ * 0.5 + 0.5) * 255);
      image.data[index + 2] = Math.round((normalY * 0.5 + 0.5) * 255);
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(normalCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const PLAYER_RIPPLE_COUNT = 8;
const waterNormalTextureA = makeWaterNormalTexture(256, 0);
const waterNormalTextureB = makeWaterNormalTexture(256, 1.93);
const initialPlayerRippleData = Array.from(
  { length: PLAYER_RIPPLE_COUNT },
  () => new THREE.Vector4(100000, 100000, -100, 0),
);

const waterReflectionWidth = window.innerWidth < 720
  ? 352
  : Math.min(768, Math.max(448, Math.round(window.innerWidth * 0.38)));
const waterReflectionHeight = window.innerWidth < 720
  ? 224
  : Math.min(512, Math.max(288, Math.round(window.innerHeight * 0.38)));

const poolWaterShader = {
  name: 'PoolroomsFlowWater',
  uniforms: {
    color: { value: new THREE.Color(0x2b747c) },
    reflectivity: { value: 0.02 },
    tReflectionMap: { value: null },
    tRefractionMap: { value: null },
    tNormalMap0: { value: null },
    tNormalMap1: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    config: { value: new THREE.Vector4() },
    reflectionTexel: { value: new THREE.Vector2(1 / waterReflectionWidth, 1 / waterReflectionHeight) },
    playerRippleTime: { value: 0 },
    playerRipples: { value: initialPlayerRippleData },
  },
  vertexShader: /* glsl */`
    #include <common>
    #include <fog_pars_vertex>
    #include <logdepthbuf_pars_vertex>

    uniform mat4 textureMatrix;
    varying vec4 vCoord;
    varying vec2 vWorldXZ;
    varying vec3 vToEye;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vCoord = textureMatrix * vec4(position, 1.0);
      vWorldXZ = worldPosition.xz;
      vToEye = cameraPosition - worldPosition.xyz;
      vec4 mvPosition = viewMatrix * worldPosition;
      gl_Position = projectionMatrix * mvPosition;
      #include <logdepthbuf_vertex>
      #include <fog_vertex>
    }
  `,
  fragmentShader: /* glsl */`
    #include <common>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>

    uniform sampler2D tReflectionMap;
    uniform sampler2D tRefractionMap;
    uniform sampler2D tNormalMap0;
    uniform sampler2D tNormalMap1;
    uniform vec2 flowDirection;
    uniform vec3 color;
    uniform float reflectivity;
    uniform vec4 config;
    uniform vec2 reflectionTexel;
    uniform float playerRippleTime;
    uniform vec4 playerRipples[${PLAYER_RIPPLE_COUNT}];

    varying vec4 vCoord;
    varying vec2 vWorldXZ;
    varying vec3 vToEye;

    vec2 getPlayerRippleSlope(vec2 worldXZ) {
      vec2 totalSlope = vec2(0.0);
      for (int i = 0; i < ${PLAYER_RIPPLE_COUNT}; i++) {
        vec4 ripple = playerRipples[i];
        float age = playerRippleTime - ripple.z;
        float lifetime = step(0.0, age) * (1.0 - smoothstep(3.0, 5.2, age));
        vec2 delta = worldXZ - ripple.xy;
        float radialDistance = length(delta);
        float expandingRadius = age * 1.42;
        float ringOffset = radialDistance - expandingRadius;
        float envelope = exp(-abs(ringOffset) * 2.65) * lifetime;
        float waveSlope = cos(ringOffset * 12.5) * envelope * ripple.w;
        totalSlope += delta / max(radialDistance, 0.001) * waveSlope;
      }
      return totalSlope * 0.115;
    }

    vec3 sampleSoftReflection(vec2 uv) {
      vec2 mirrorUv = vec2(1.0 - uv.x, uv.y);
      vec2 blur = reflectionTexel * 1.2;
      vec3 reflected = texture2D(tReflectionMap, mirrorUv).rgb * 0.48;
      reflected += texture2D(tReflectionMap, mirrorUv + vec2(blur.x, 0.0)).rgb * 0.13;
      reflected += texture2D(tReflectionMap, mirrorUv - vec2(blur.x, 0.0)).rgb * 0.13;
      reflected += texture2D(tReflectionMap, mirrorUv + vec2(0.0, blur.y)).rgb * 0.13;
      reflected += texture2D(tReflectionMap, mirrorUv - vec2(0.0, blur.y)).rgb * 0.13;
      return reflected;
    }

    void main() {
      #include <logdepthbuf_fragment>

      float flowMapOffset0 = config.x;
      float flowMapOffset1 = config.y;
      float halfCycle = config.z;
      float normalScale = config.w;
      vec2 flow = normalize(flowDirection);
      flow.x *= -1.0;

      vec2 normalUv0 = vWorldXZ * normalScale + flow * flowMapOffset0;
      vec2 normalUv1 = vWorldXZ.yx * vec2(-normalScale * 1.73, normalScale * 1.73)
        + flow.yx * flowMapOffset1;
      vec4 normalColor0 = texture2D(tNormalMap0, normalUv0);
      vec4 normalColor1 = texture2D(tNormalMap1, normalUv1);
      float flowLerp = abs(halfCycle - flowMapOffset0) / halfCycle;
      vec4 normalColor = mix(normalColor0, normalColor1, flowLerp);
      vec3 surfaceNormal = normalize(vec3(
        normalColor.r * 2.0 - 1.0,
        max(normalColor.b, 0.18),
        normalColor.g * 2.0 - 1.0
      ));
      vec2 playerRippleSlope = getPlayerRippleSlope(vWorldXZ);
      surfaceNormal = normalize(surfaceNormal + vec3(playerRippleSlope.x, 0.0, playerRippleSlope.y));

      vec3 toEye = normalize(vToEye);
      float theta = clamp(dot(toEye, surfaceNormal), 0.0, 1.0);
      float grazing = 1.0 - theta;
      float fresnel = reflectivity + (1.0 - reflectivity) * pow(grazing, 5.0);
      fresnel = clamp(fresnel, 0.02, 0.88);

      vec3 projected = vCoord.xyz / max(vCoord.w, 0.0001);
      float distortionStrength = mix(0.0042, 0.0105, grazing);
      vec2 waterUv = clamp(projected.xy + surfaceNormal.xz * distortionStrength, vec2(0.003), vec2(0.997));
      vec3 reflected = sampleSoftReflection(waterUv) * vec3(0.93, 0.985, 1.035);
      vec3 refracted = texture2D(tRefractionMap, waterUv).rgb;

      vec3 absorption = mix(vec3(0.94, 0.995, 1.0), vec3(0.56, 0.82, 0.87), 0.28 + grazing * 0.42);
      vec3 transmitted = refracted * absorption + color * (0.045 + grazing * 0.055);

      vec3 lightDirection = normalize(vec3(-0.35, 0.92, 0.22));
      vec3 halfDirection = normalize(lightDirection + toEye);
      float highlight = max(dot(surfaceNormal, halfDirection), 0.0);
      float broadHighlight = pow(highlight, 42.0) * 0.035;
      float tightHighlight = pow(highlight, 220.0) * 0.26;

      vec3 outgoingLight = mix(transmitted, reflected, fresnel);
      outgoingLight += vec3(0.64, 0.84, 0.96) * (broadHighlight + tightHighlight) * (0.4 + fresnel * 0.6);
      gl_FragColor = vec4(outgoingLight, 0.96);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
};

const water = new FlowWater(new THREE.PlaneGeometry(150, 150), {
  textureWidth: waterReflectionWidth,
  textureHeight: waterReflectionHeight,
  color: 0x2b747c,
  flowDirection: new THREE.Vector2(0.86, 0.28),
  flowSpeed: 0.022,
  reflectivity: 0.02,
  scale: 0.082,
  normalMap0: waterNormalTextureA,
  normalMap1: waterNormalTextureB,
  shader: poolWaterShader,
});
const playerRippleData = water.material.uniforms.playerRipples.value;
water.rotation.x = -Math.PI * 0.5;
water.position.y = WATER_LEVEL;
water.material.transparent = true;
water.material.depthWrite = false;
water.material.side = THREE.DoubleSide;
water.renderOrder = 2;
scene.add(water);

// The post-processing stack renders the scene several times. Keep the water's
// planar capture to one deliberate update per frame so its reflection stays
// stable and does not multiply the rendering cost.
const updateWaterReflection = water.onBeforeRender.bind(water);
water.onBeforeRender = () => {};

let nextPlayerRipple = 0;
let lastPlayerRippleTime = -10;
const lastPlayerRipplePosition = new THREE.Vector2(camera.position.x, camera.position.z);

function emitPlayerRipple(zone) {
  const speed = playerVelocity.length();
  const movingThroughWater = controls.isLocked
    && speed > 0.48
    && zone?.mode !== 'platform'
    && zone?.mode !== 'stairs'
    && currentGround < WATER_LEVEL - 0.08;
  if (!movingThroughWater) return;

  const dx = camera.position.x - lastPlayerRipplePosition.x;
  const dz = camera.position.z - lastPlayerRipplePosition.y;
  const distanceMoved = Math.hypot(dx, dz);
  const interval = THREE.MathUtils.lerp(0.31, 0.2, THREE.MathUtils.clamp(speed / 4.5, 0, 1));
  if (distanceMoved < interval || elapsed - lastPlayerRippleTime < 0.12) return;

  const strength = THREE.MathUtils.clamp(0.48 + speed * 0.13, 0.52, 1.08);
  playerRippleData[nextPlayerRipple].set(camera.position.x, camera.position.z, elapsed, strength);
  nextPlayerRipple = (nextPlayerRipple + 1) % PLAYER_RIPPLE_COUNT;
  lastPlayerRippleTime = elapsed;
  lastPlayerRipplePosition.set(camera.position.x, camera.position.z);
}

const hemiLight = new THREE.HemisphereLight(0xb9dbed, 0x092931, 0.72);
scene.add(hemiLight);
scene.add(new THREE.AmbientLight(0x719cac, 0.16));

const areaLights = [];
for (let i = 0; i < 4; i += 1) {
  const light = new THREE.RectAreaLight(0xb8ddf2, 5.2, 4.8, 5.8);
  light.rotation.x = -Math.PI * 0.5;
  areaLights.push(light);
  scene.add(light);
}

function makeSoftSquareLightCookie(size = 256) {
  const cookieCanvas = document.createElement('canvas');
  cookieCanvas.width = size;
  cookieCanvas.height = size;
  const ctx = cookieCanvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = Math.abs((x + 0.5) / size - 0.5) * 2;
      const py = Math.abs((y + 0.5) / size - 0.5) * 2;
      const squareDistance = Math.max(px, py);
      const t = THREE.MathUtils.clamp((squareDistance - 0.58) / 0.42, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      const value = Math.round((1 - smooth) ** 1.25 * 255);
      const index = (y * size + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(cookieCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

const shadowLight = new THREE.SpotLight(0xb3d9ef, 26, 17, Math.PI * 0.38, 0.9, 1.35);
shadowLight.position.set(0, 4.5, 0);
shadowLight.target.position.set(0, 0, 0);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(512, 512);
shadowLight.shadow.bias = -0.00035;
shadowLight.map = makeSoftSquareLightCookie();
scene.add(shadowLight, shadowLight.target);

function updateLocalLights() {
  const gx = Math.round(camera.position.x / CHUNK_SIZE);
  const gz = Math.round(camera.position.z / CHUNK_SIZE);
  const offsets = [[0, 0], [1, 0], [0, 1], [-1, 0]];
  const nearbySkylights = chunks.getNearestSkylights(camera.position, areaLights.length);
  offsets.forEach(([dx, dz], i) => {
    const skylight = nearbySkylights[i];
    if (skylight) {
      areaLights[i].position.set(skylight.x, skylight.y, skylight.z);
      areaLights[i].width = skylight.width;
      areaLights[i].height = skylight.depth;
      areaLights[i].intensity = 5.2;
    } else {
      const x = (gx + dx) * CHUNK_SIZE + (i % 2 ? -2.2 : 2.2);
      const z = (gz + dz) * CHUNK_SIZE + (i > 1 ? 1.7 : -1.7);
      areaLights[i].position.set(x, 4.58, z);
      areaLights[i].width = 3.8;
      areaLights[i].height = 0.7;
      areaLights[i].intensity = 0;
    }
    areaLights[i].lookAt(areaLights[i].position.x, 0, areaLights[i].position.z);
  });
  const primarySkylight = nearbySkylights[0];
  if (primarySkylight) {
    shadowLight.intensity = 26;
    shadowLight.position.set(primarySkylight.x, 5.45, primarySkylight.z);
    shadowLight.target.position.set(primarySkylight.x, -0.15, primarySkylight.z);
  } else {
    shadowLight.intensity = 0;
    shadowLight.position.set(gx * CHUNK_SIZE + 2.2, 4.55, gz * CHUNK_SIZE - 1.7);
    shadowLight.target.position.set(camera.position.x, 0, camera.position.z);
  }
  shadowLight.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
}
updateLocalLights();

const particleCount = window.innerWidth < 720 ? 180 : 420;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i += 1) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 48;
  particlePositions[i * 3 + 1] = Math.random() * 4.6 + 0.25;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 48;
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const moisture = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
  color: 0xc4e4f0,
  size: 0.043,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
}));
scene.add(moisture);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.08,
  0.52,
  1.05,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const playerVelocity = new THREE.Vector3();
let currentGround = 0;
let bobPhase = 0;
let lastChunkX = chunks.centerX;
let lastChunkZ = chunks.centerZ;
let elapsed = 0;
let frameSamples = [];
let qualityLevel = 2;
let ambientAudio = null;

function createAmbientAudio() {
  if (ambientAudio) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const length = context.sampleRate * 3;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.97 + white * 0.03;
    data[i] = last;
  }
  const source = context.createBufferSource();
  const lowpass = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 680;
  gain.gain.value = 0.035;
  source.connect(lowpass).connect(gain).connect(context.destination);
  source.start();
  ambientAudio = { context, gain };
}

function updatePlayer(delta) {
  if (!controls.isLocked) {
    playerVelocity.multiplyScalar(Math.exp(-10 * delta));
    return;
  }

  const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const right = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  camera.getWorldDirection(tmpVec);
  tmpVec.y = 0;
  tmpVec.normalize();
  tmpVec2.crossVectors(tmpVec, camera.up).normalize();

  const zone = chunks.getZone(camera.position.x, camera.position.z);
  const inDeepWater = zone?.mode === 'deep';
  const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
  let maxSpeed = sprinting ? 4.45 : 2.45;
  if (inDeepWater) maxSpeed *= 0.64;
  const desired = new THREE.Vector3()
    .addScaledVector(tmpVec, forward)
    .addScaledVector(tmpVec2, right);
  if (desired.lengthSq() > 1) desired.normalize();
  desired.multiplyScalar(maxSpeed);
  const response = 1 - Math.exp(-(inDeepWater ? 4.2 : 7.8) * delta);
  playerVelocity.lerp(desired, response);

  const nextX = camera.position.x + playerVelocity.x * delta;
  if (!chunks.collides(nextX, camera.position.z)) camera.position.x = nextX;
  else playerVelocity.x = 0;
  const nextZ = camera.position.z + playerVelocity.z * delta;
  if (!chunks.collides(camera.position.x, nextZ)) camera.position.z = nextZ;
  else playerVelocity.z = 0;

  const updatedZone = chunks.getZone(camera.position.x, camera.position.z);
  const groundTarget = updatedZone?.height ?? 0;
  currentGround = THREE.MathUtils.damp(currentGround, groundTarget, updatedZone?.mode === 'deep' ? 2.5 : 9, delta);
  const moving = playerVelocity.length() > 0.18;
  if (moving) bobPhase += delta * (sprinting ? 8.7 : 6.2) * (inDeepWater ? 0.45 : 1);
  const bobAmount = reducedMotion ? 0 : (inDeepWater ? 0.022 : 0.035);
  const eyeTarget = updatedZone?.mode === 'deep' ? WATER_LEVEL + 0.53 : currentGround + EYE_HEIGHT;
  camera.position.y = THREE.MathUtils.damp(
    camera.position.y,
    eyeTarget + (moving ? Math.sin(bobPhase) * bobAmount : 0),
    8,
    delta,
  );
  emitPlayerRipple(updatedZone);
}

function updateWorld(delta) {
  chunks.update(camera.position);
  if (chunks.centerX !== lastChunkX || chunks.centerZ !== lastChunkZ) {
    lastChunkX = chunks.centerX;
    lastChunkZ = chunks.centerZ;
    updateLocalLights();
  }
  water.position.x = Math.round(camera.position.x / 12) * 12;
  water.position.z = Math.round(camera.position.z / 12) * 12;
  water.material.uniforms.playerRippleTime.value = elapsed;
  skyDome.position.copy(camera.position);
  skyMaterial.uniforms.time.value = elapsed;
  skylightBeamTime.value = elapsed;
  waterLightUniforms.time.value = elapsed;
  updateCausticAnimation(elapsed);
  chunks.updateCaustics(elapsed);
  moisture.position.x = Math.round(camera.position.x / 24) * 24;
  moisture.position.z = Math.round(camera.position.z / 24) * 24;
  moisture.rotation.y += delta * 0.006;
}

function adaptQuality(frameMs) {
  frameSamples.push(frameMs);
  if (frameSamples.length < 120) return;
  const avg = frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length;
  frameSamples = [];
  if (avg > 22 && qualityLevel > 0) {
    qualityLevel -= 1;
    const ratio = Math.max(0.9, renderer.getPixelRatio() - 0.18);
    renderer.setPixelRatio(ratio);
    composer.setPixelRatio(ratio);
    if (qualityLevel === 0) shadowLight.castShadow = false;
  } else if (avg < 15.2 && qualityLevel < 2) {
    qualityLevel += 1;
    const cap = Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.25 : 1.65);
    const ratio = Math.min(cap, renderer.getPixelRatio() + 0.12);
    renderer.setPixelRatio(ratio);
    composer.setPixelRatio(ratio);
    shadowLight.castShadow = qualityLevel > 0;
  }
}

function render() {
  requestAnimationFrame(render);
  const frameStart = performance.now();
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  updatePlayer(delta);
  updateWorld(delta);
  water.updateMatrixWorld();
  updateWaterReflection(renderer, scene, camera);
  composer.render(delta);
  adaptQuality(performance.now() - frameStart);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
}

entry.addEventListener('click', () => {
  controls.lock();
  createAmbientAudio();
});

controls.addEventListener('lock', () => {
  entry.classList.add('is-hidden');
  experience.classList.add('is-playing');
  ambientAudio?.context.resume();
});

controls.addEventListener('unlock', () => {
  entry.classList.remove('is-hidden');
  experience.classList.remove('is-playing');
});

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) event.preventDefault();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', resize, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clock.stop();
  else clock.start();
});

renderer.compileAsync(scene, camera).finally(() => {
  loading.classList.add('is-ready');
});

render();
