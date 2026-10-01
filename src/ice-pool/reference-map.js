import * as THREE from 'three';
import { referenceLanguage } from './reference-i18n.js';
import { bindMapSelection } from './reference-map-selection.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { SpatialCellCache, ScrollingDepthField } from './reference-performance.js';
import { referenceRoomColumn, isReferenceCorridor } from './environment/RoomArchetypes.js';
import { addChunkLights, applyFixturePreset, PoolLighting, PoolLightPlanCache } from './environment/PoolLighting.js';
import { addChunkPoolAccess, PoolAccessPlanCache } from './environment/PoolAccessFixtures.js';
import { createTileAccentStyle } from './environment/TileAccents.js';
import { bindTileAccentSettings } from './environment/TileAccentSettings.js';
import { isCurvedRoom } from './environment/CurvedRoomProfiles.js';
import { addCurvedRoomGeometry, sampleCurvedRoom, curvedRoomCollision,
  curvedPoolBounds, curvedPoolWall } from './environment/CurvedRooms.js';
import { addSkylightOpenings, createSkylightSky } from './environment/SkylightSky.js';
import { ReflectionCaptureController, ReflectionDebugView,
  ReflectionRoomGraph } from './environment/ReflectionVisibility.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { createPlayerAudioSnapshot, createReferenceAudioEnvironment,
  describeAudioRoom } from './audio/ReferenceAudioAdapter.js';
import { createIceChapterLayer } from './ice-chapter-layer.js';

// A single switch also lets geometry regression tests exercise the original layouts.
const ROOM_LIGHTING_ENABLED = true;

const canvas = document.querySelector('#reference-world');
const entry = document.querySelector('#reference-entry');
const underwaterFilter = document.querySelector('#underwater-filter');
const settingsMenu = document.querySelector('#reference-settings');
const settingsContinue = document.querySelector('#settings-continue');
const settingsReset = document.querySelector('#settings-reset');
const mapSelectionInput = document.querySelector('#map-selection');
const lightBrightnessInput = document.querySelector('#light-brightness');
const surfaceReflectionInput = document.querySelector('#surface-reflection');
const lightBrightnessValue = document.querySelector('#light-brightness-value');
const surfaceReflectionValue = document.querySelector('#surface-reflection-value');
const movementSpeedInput = document.querySelector('#movement-speed');
const gravityStrengthInput = document.querySelector('#gravity-strength');
const movementSpeedValue = document.querySelector('#movement-speed-value');
const gravityStrengthValue = document.querySelector('#gravity-strength-value');
const masterVolumeInput = document.querySelector('#master-volume');
const masterVolumeValue = document.querySelector('#master-volume-value');
const playerSettings = { movementSpeed: 1, gravity: 1 };
const qualityPresetInput = document.querySelector('#quality-preset');
const touchHud = document.querySelector('#touch-hud');
const touchMenu = document.querySelector('#touch-menu');
const touchStickZone = document.querySelector('#touch-stick-zone');
const touchRiseButton = document.querySelector('#touch-rise');
const touchDiveButton = document.querySelector('#touch-dive');
const entryHint = document.querySelector('#entry-hint');
bindMapSelection({ select: mapSelectionInput, location: window.location });
const WATER_LEVEL = -0.12;
const EYE_HEIGHT = 1.7;
const CHUNK_SIZE = 16;
function getViewportSize() {
  const canvasRect = canvas.getBoundingClientRect();
  const visualWidth = window.visualViewport?.width;
  const visualHeight = window.visualViewport?.height;
  return {
    width: Math.max(1, Math.round(canvasRect.width || visualWidth || document.documentElement.clientWidth || window.innerWidth)),
    height: Math.max(1, Math.round(canvasRect.height || visualHeight || document.documentElement.clientHeight || window.innerHeight)),
  };
}
const initialViewport = getViewportSize();
const VIEW_RADIUS = initialViewport.width < 720 ? 1 : 2;
const MODULE_SIZE = 15;
const clock = new THREE.Clock();
const keys = new Set();
const viewForwardVector = new THREE.Vector3();
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();
const userAgent = navigator.userAgent || '';
const isMobilePlatform = Boolean(navigator.userAgentData?.mobile)
  || /Android|iPhone|iPad|iPod|webOS|Mobile/i.test(userAgent)
  // iPadOS can identify itself as Macintosh while still exposing touch points.
  || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
const hasTouchSupport = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
let touchInputEnabled = isMobilePlatform && hasTouchSupport;
const touchMove = new THREE.Vector2();
// The ice chapter opens directly into exploration. Pointer lock still activates
// on the first desktop click, while this flag keeps keyboard/touch movement
// alive before that gesture and prevents the reference entry veil from blocking
// the iframe.
let touchPlaying = true;
let touchRiseHeld = false;
let touchDiveHeld = false;
let lastPointerType = 'mouse';
const isCompactViewport = initialViewport.width < 720;
const PAUSED_RENDER_FPS = 12;
const QUALITY_STORAGE_KEY = 'poolrooms-reference-quality';
// Sharp reflections must track the camera every frame. Reduce capture resolution,
// not temporal cadence, for balanced quality; performance mode skips capture entirely.
const QUALITY_PRESETS = {
  high: {
    pixelRatio: isCompactViewport ? 1.2 : 1.65,
    waterReflectionFps: Infinity,
    waterReflectionScale: isCompactViewport ? 0.68 : 0.78,
    waterReflectionStrength: 1,
    activeLights: isCompactViewport ? 8 : 16,
    bloom: true,
    mistRatio: 1,
  },
  balanced: {
    pixelRatio: isCompactViewport ? 1.1 : 1.35,
    waterReflectionFps: Infinity,
    waterReflectionScale: isCompactViewport ? 0.48 : 0.54,
    waterReflectionStrength: 0.88,
    activeLights: isCompactViewport ? 7 : 12,
    bloom: true,
    mistRatio: 0.78,
  },
  performance: {
    pixelRatio: 1,
    waterReflectionFps: 0,
    waterReflectionScale: 0.4,
    waterReflectionStrength: 0,
    activeLights: isCompactViewport ? 5 : 8,
    bloom: false,
    mistRatio: 0.5,
  },
};

function storedQualityPreset() {
  try {
    const stored = window.localStorage.getItem(QUALITY_STORAGE_KEY);
    if (stored && QUALITY_PRESETS[stored]) return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return 'balanced';
}

let qualityPresetName = storedQualityPreset();
let qualitySettings = QUALITY_PRESETS[qualityPresetName];
qualityPresetInput.value = qualityPresetName;

function enableTouchInput() {
  if (!hasTouchSupport) return;
  touchInputEnabled = true;
  document.body.classList.add('touch-ui-enabled');
  referenceLanguage.localize(entryHint, 'entry.touch');
}

if (touchInputEnabled) enableTouchInput();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setSize(initialViewport.width, initialViewport.height, false);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualitySettings.pixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
// Sixteen shadowed spotlights can exceed mobile GPU shader limits. Pool-light
// reflection visibility is handled by the tile materials instead.
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const aboveWaterBackground = new THREE.Color(0x82abc1);
const underwaterBackground = new THREE.Color(0x235c68);
const aboveWaterFog = new THREE.Color(0x78a8c4);
const underwaterFog = new THREE.Color(0x286a73);
scene.background = aboveWaterBackground.clone();
scene.fog = new THREE.FogExp2(aboveWaterFog.clone(), 0.049);

const camera = new THREE.PerspectiveCamera(71, initialViewport.width / initialViewport.height, 0.055, 150);
camera.position.set(7.5, EYE_HEIGHT, 2.5);
camera.rotation.order = 'YXZ';
scene.add(camera);

const skylightSky = createSkylightSky({ scene, camera });
if (import.meta.hot) import.meta.hot.dispose(() => skylightSky.dispose());

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.72;

const audioSystem = new AudioSystem({
  camera, scene, mobile: isMobilePlatform, quality: qualityPresetName,
  environmentProvider: createReferenceAudioEnvironment({
    columnAt, moduleSize: MODULE_SIZE, waterLevel: WATER_LEVEL,
  }),
});
if (import.meta.hot) import.meta.hot.dispose(() => audioSystem.dispose());

// Avoid a studio environment map here: its invisible bright panels produced a fixed
// directional glare when the player looked back from the starting position.
scene.environment = null;
RectAreaLightUniformsLib.init();

function hash2D(x, y) {
  let value = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function hash01(x, y) {
  return hash2D(x, y) / 4294967296;
}

function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash01(xi, yi);
  const b = hash01(xi + 1, yi);
  const c = hash01(xi, yi + 1);
  const d = hash01(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTileTextures() {
  const size = 512;
  const cell = 64;
  const groutWidth = 4;
  const random = mulberry32(1337);
  const albedoCanvas = document.createElement('canvas');
  const roughnessCanvas = document.createElement('canvas');
  const normalCanvas = document.createElement('canvas');
  albedoCanvas.width = albedoCanvas.height = size;
  roughnessCanvas.width = roughnessCanvas.height = size;
  normalCanvas.width = normalCanvas.height = size;
  const albedoContext = albedoCanvas.getContext('2d');
  const roughnessContext = roughnessCanvas.getContext('2d');
  const normalContext = normalCanvas.getContext('2d');
  const albedo = albedoContext.createImageData(size, size);
  const roughness = roughnessContext.createImageData(size, size);
  const normal = normalContext.createImageData(size, size);
  const height = new Float32Array(size * size);
  const tiles = [];

  for (let tileY = 0; tileY < size / cell; tileY += 1) {
    for (let tileX = 0; tileX < size / cell; tileX += 1) {
      tiles.push({ brightness: 222 + random() * 24, hue: (random() - 0.5) * 6 });
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tileX = Math.floor(x / cell);
      const tileY = Math.floor(y / cell);
      const localX = x % cell;
      const localY = y % cell;
      const grout = localX < groutWidth
        || localY < groutWidth
        || localX >= cell - groutWidth
        || localY >= cell - groutWidth;
      const stain = 0.94 + 0.06 * valueNoise(x * 0.013 + 50, y * 0.013 + 80);
      const index = (y * size + x) * 4;
      let red;
      let green;
      let blue;
      let rough;

      if (grout) {
        height[y * size + x] = -0.9 + random() * 0.1;
        rough = 200 + random() * 20;
        const groutShade = 168 * stain + random() * 10;
        red = groutShade;
        green = groutShade;
        blue = groutShade + 4;
      } else {
        const centerX = (localX - cell * 0.5) / (cell * 0.5);
        const centerY = (localY - cell * 0.5) / (cell * 0.5);
        const distance = Math.min(1, Math.hypot(centerX, centerY));
        height[y * size + x] = 0.55 * (1 - distance * distance * 0.85) + (random() - 0.5) * 0.07;
        const tile = tiles[tileY * (size / cell) + tileX];
        let base = tile.brightness * stain + (random() - 0.5) * 7;
        const wetEdge = Math.max(0, (distance - 0.86) / 0.14);
        base *= 1 - wetEdge * 0.06;
        red = base + tile.hue * 0.4;
        green = base;
        blue = base - tile.hue * 0.3 + 2;
        rough = 38 + random() * 22 + wetEdge * 70;
      }

      albedo.data[index] = red;
      albedo.data[index + 1] = green;
      albedo.data[index + 2] = blue;
      albedo.data[index + 3] = 255;
      roughness.data[index] = rough;
      roughness.data[index + 1] = rough;
      roughness.data[index + 2] = rough;
      roughness.data[index + 3] = 255;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const nx = (left - right) * 2.4;
      const ny = (up - down) * 2.4;
      const inverseLength = 1 / Math.hypot(nx, ny, 1);
      const index = (y * size + x) * 4;
      normal.data[index] = (nx * inverseLength * 0.5 + 0.5) * 255;
      normal.data[index + 1] = (ny * inverseLength * 0.5 + 0.5) * 255;
      normal.data[index + 2] = (inverseLength * 0.5 + 0.5) * 255;
      normal.data[index + 3] = 255;
    }
  }

  albedoContext.putImageData(albedo, 0, 0);
  roughnessContext.putImageData(roughness, 0, 0);
  normalContext.putImageData(normal, 0, 0);

  const makeTexture = (textureCanvas, color = false) => {
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  return {
    albedo: makeTexture(albedoCanvas, true),
    roughness: makeTexture(roughnessCanvas),
    normal: makeTexture(normalCanvas),
  };
}

const tileTextures = makeTileTextures();
const tileAccentStyle = createTileAccentStyle();
const tileAccentSettings = bindTileAccentSettings({
  input: document.querySelector('#multicolor-tiles'),
  onChange: enabled => tileAccentStyle.setEnabled(enabled),
});
if (import.meta.hot) import.meta.hot.dispose(() => {
  tileAccentSettings.dispose();
  tileAccentStyle.dispose();
});

function makeTileMaterial() {
  return tileAccentStyle.bind(new THREE.MeshPhysicalMaterial({
    color: 0x5f6b73,
    map: tileTextures.albedo,
    roughnessMap: tileTextures.roughness,
    normalMap: tileTextures.normal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.18,
    metalness: 0.08,
    vertexColors: true,
    envMapIntensity: 1,
    clearcoat: 0.72,
    clearcoatRoughness: 0.13,
    // The planar mirror camera is below the water plane. Thin floors and walls
    // must render their reverse side so they also write reflection-pass depth.
    side: THREE.DoubleSide,
  }));
}

const floorMaterial = makeTileMaterial();
const wallMaterial = makeTileMaterial();

const glowMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2.2, 3.9, 7.2),
  toneMapped: true,
  side: THREE.DoubleSide,
});

function moduleType(moduleX, moduleZ) {
  const evenX = ((moduleX % 2) + 2) % 2;
  const evenZ = ((moduleZ % 2) + 2) % 2;
  if (evenX === 0 && evenZ === 0) return 0;
  if (evenZ === 0) return 1;
  if (evenX === 0) return 2;
  return 3;
}

const ROOM_CENTER = 7;
const ROOM_LAYOUT_COUNT = 6;
const ROOM_CEILING_HEIGHTS = [5.4, 6.3, 7.2, 6.6];

function roomPlan(moduleX, moduleZ) {
  const seed = hash2D(moduleX * 29 + 137, moduleZ * 31 - 503);
  return {
    seed,
    variant: seed % ROOM_LAYOUT_COUNT,
    rotation: (seed >>> 4) % 4,
    ceiling: ROOM_CEILING_HEIGHTS[(seed >>> 7) % ROOM_CEILING_HEIGHTS.length],
  };
}

function rotateRoomCoordinates(localX, localZ, rotation) {
  const x = localX - ROOM_CENTER;
  const z = localZ - ROOM_CENTER;
  if (rotation === 1) return [ROOM_CENTER - z, ROOM_CENTER + x];
  if (rotation === 2) return [ROOM_CENTER - x, ROOM_CENTER - z];
  if (rotation === 3) return [ROOM_CENTER + z, ROOM_CENTER - x];
  return [localX, localZ];
}

function randomPoolLevel(seed, basinIndex = 0) {
  const random = hash01(seed ^ 0x5f356495, basinIndex * 977 + 0x31a7);
  const depth = THREE.MathUtils.lerp(0.75, 2.8, random);
  return -Math.round(depth * 20) / 20;
}

function poolLevelForRoom(variant, localX, localZ, seed) {
  const xDistance = Math.abs(localX - ROOM_CENTER);
  const zDistance = Math.abs(localZ - ROOM_CENTER);
  const squareDistance = Math.max(xDistance, zDistance);
  let basinIndex = 0;
  let insidePool = false;

  // Broad square pool.
  if (variant === 0) {
    insidePool = squareDistance <= 4;
  }

  // Twin pools separated by a dry bridge.
  else if (variant === 1) {
    const basinDistance = Math.min(
      Math.max(Math.abs(localX - 4), zDistance),
      Math.max(Math.abs(localX - 10), zDistance),
    );
    insidePool = xDistance > 1 && basinDistance <= 3;
    basinIndex = localX < ROOM_CENTER ? 0 : 1;
  }

  // Cross-shaped pool.
  else if (variant === 2) {
    const inHorizontalArm = zDistance <= 1 && xDistance <= 5;
    const inVerticalArm = xDistance <= 1 && zDistance <= 5;
    const besideHorizontalArm = zDistance <= 2 && xDistance <= 4;
    const besideVerticalArm = xDistance <= 2 && zDistance <= 4;
    insidePool = inHorizontalArm || inVerticalArm
      || besideHorizontalArm || besideVerticalArm;
  }

  // A water ring surrounding a dry island.
  else if (variant === 3) {
    insidePool = squareDistance >= 2 && squareDistance <= 4;
  }

  // Four quiet courtyard pools divided by dry paths.
  else if (variant === 4) {
    const basinDistance = Math.min(
      Math.max(Math.abs(localX - 4), Math.abs(localZ - 4)),
      Math.max(Math.abs(localX - 10), Math.abs(localZ - 4)),
      Math.max(Math.abs(localX - 4), Math.abs(localZ - 10)),
      Math.max(Math.abs(localX - 10), Math.abs(localZ - 10)),
    );
    insidePool = basinDistance <= 2;
    basinIndex = Number(localX >= ROOM_CENTER) + Number(localZ >= ROOM_CENTER) * 2;
  }

  // An asymmetric L-shaped pool.
  else {
    const inHorizontalPool = localX >= 2 && localX <= 12 && localZ >= 3 && localZ <= 7;
    const inVerticalPool = localX >= 7 && localX <= 11 && localZ >= 3 && localZ <= 12;
    insidePool = inHorizontalPool || inVerticalPool;
  }

  return insidePool ? randomPoolLevel(seed, basinIndex) : 0;
}

function roomHasPillar(variant, localX, localZ) {
  if (variant === 0) return (localX === 3 || localX === 11) && (localZ === 3 || localZ === 11);
  if (variant === 1) return (localX === 4 || localX === 10) && (localZ === 3 || localZ === 11);
  if (variant === 2) return (localX === 4 || localX === 10) && (localZ === 4 || localZ === 10);
  if (variant === 3) return (localX === 3 || localX === 11) && (localZ === 5 || localZ === 9);
  if (variant === 4) return localX === ROOM_CENTER && localZ === ROOM_CENTER;
  return (localX === 4 || localX === 10) && (localZ === 3 || localZ === 11);
}

function roomHasSkylight(variant, localX, localZ) {
  if (variant === 0) {
    return (localX === 7 && (localZ === 4 || localZ === 10))
      || (localZ === 7 && (localX === 4 || localX === 10))
      || ((localX === 4 || localX === 10) && (localZ === 4 || localZ === 10));
  }
  if (variant === 1) {
    return (localX === 4 || localX === 10) && (localZ === 5 || localZ === 7 || localZ === 9);
  }
  if (variant === 2) {
    return (localX === 7 && (localZ === 3 || localZ === 7 || localZ === 11))
      || (localZ === 7 && (localX === 3 || localX === 11));
  }
  if (variant === 3) {
    return (localX === 4 || localX === 10) && (localZ === 4 || localZ === 10);
  }
  if (variant === 4) {
    return (localX === 4 || localX === 10) && (localZ === 4 || localZ === 10);
  }
  return (localX === 4 && (localZ === 4 || localZ === 7 || localZ === 10))
    || (localZ === 10 && (localX === 7 || localX === 10));
}

function levelAt(ix, iz) {
  const extension = ROOM_LIGHTING_ENABLED ? referenceRoomColumn(ix, iz) : null;
  if (extension) return extension.level;
  const moduleX = Math.floor(ix / MODULE_SIZE);
  const moduleZ = Math.floor(iz / MODULE_SIZE);
  if (moduleType(moduleX, moduleZ) !== 0) return 0;
  const localX = ix - moduleX * MODULE_SIZE;
  const localZ = iz - moduleZ * MODULE_SIZE;
  const plan = roomPlan(moduleX, moduleZ);
  const [orientedX, orientedZ] = rotateRoomCoordinates(localX, localZ, plan.rotation);
  return poolLevelForRoom(plan.variant, orientedX, orientedZ, plan.seed);
}

const columnCache = new SpatialCellCache(256, CHUNK_SIZE);

function columnAt(ix, iz) {
  const cached = columnCache.get(ix, iz);
  if (cached) return cached;
  const extension = ROOM_LIGHTING_ENABLED ? referenceRoomColumn(ix, iz) : null;
  if (extension) {
    columnCache.set(ix, iz, extension);
    return extension;
  }
  const moduleX = Math.floor(ix / MODULE_SIZE);
  const moduleZ = Math.floor(iz / MODULE_SIZE);
  const type = moduleType(moduleX, moduleZ);
  const localX = ix - moduleX * MODULE_SIZE;
  const localZ = iz - moduleZ * MODULE_SIZE;
  const plan = type === 0 ? roomPlan(moduleX, moduleZ) : null;
  const [orientedX, orientedZ] = plan
    ? rotateRoomCoordinates(localX, localZ, plan.rotation)
    : [localX, localZ];
  let solid = false;
  let level = plan ? poolLevelForRoom(plan.variant, orientedX, orientedZ, plan.seed) : 0;
  let skylight = false;
  let skyOpening = false;
  let ceiling = plan?.ceiling ?? 6.3;

  if (type === 3) {
    solid = true;
  } else if (type === 0) {
    const edge = localX === 0 || localX === MODULE_SIZE - 1 || localZ === 0 || localZ === MODULE_SIZE - 1;
    if (edge) {
      const cross = localX === 0 || localX === MODULE_SIZE - 1 ? localZ : localX;
      if (Math.abs(cross - 7) > 1) solid = true;
      else {
        level = 0;
        ceiling = 3.9;
      }
    } else if (roomHasPillar(plan.variant, orientedX, orientedZ)) {
      solid = true;
    } else if (roomHasSkylight(plan.variant, orientedX, orientedZ)) {
      skylight = true;
    }
  } else {
    ceiling = 3.9;
    const cross = type === 1 ? localZ : localX;
    const along = type === 1 ? localX : localZ;
    if (Math.abs(cross - 7) > 1) solid = true;
    else skylight = along % 3 === 1;
  }

  // Keep the original arrival layout and pool depth, but replace its small
  // luminous ceiling accents with one fixed 5x5m view of the real sky.
  if (moduleX === 0 && moduleZ === 0 && type === 0) {
    skyOpening = localX >= 5 && localX <= 9
      && localZ >= 5 && localZ <= 9 && !solid;
    skylight = skyOpening;
  }

  const column = { solid, level, ceiling, skylight, skyOpening };
  columnCache.set(ix, iz, column);
  return column;
}

function pushQuad(output, a, b, c, d, normal, uv, colors) {
  const base = output.positions.length / 3;
  output.positions.push(...a, ...b, ...c, ...d);
  for (let i = 0; i < 4; i += 1) {
    output.normals.push(...normal);
    output.colors.push(colors[i], colors[i], colors[i]);
  }
  output.uvs.push(...uv);
  output.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function pushWall(output, axis, fixedValue, horizontal0, horizontal1, top, bottom, direction) {
  let a;
  let b;
  let c;
  let d;
  let normal;
  let u0;
  let u1;

  if (axis === 'x') {
    if (direction > 0) {
      a = [fixedValue, bottom, horizontal1];
      b = [fixedValue, bottom, horizontal0];
      c = [fixedValue, top, horizontal0];
      d = [fixedValue, top, horizontal1];
      normal = [1, 0, 0];
      u0 = horizontal1;
      u1 = horizontal0;
    } else {
      a = [fixedValue, bottom, horizontal0];
      b = [fixedValue, bottom, horizontal1];
      c = [fixedValue, top, horizontal1];
      d = [fixedValue, top, horizontal0];
      normal = [-1, 0, 0];
      u0 = horizontal0;
      u1 = horizontal1;
    }
  } else if (direction > 0) {
    a = [horizontal0, bottom, fixedValue];
    b = [horizontal1, bottom, fixedValue];
    c = [horizontal1, top, fixedValue];
    d = [horizontal0, top, fixedValue];
    normal = [0, 0, 1];
    u0 = horizontal0;
    u1 = horizontal1;
  } else {
    a = [horizontal1, bottom, fixedValue];
    b = [horizontal0, bottom, fixedValue];
    c = [horizontal0, top, fixedValue];
    d = [horizontal1, top, fixedValue];
    normal = [0, 0, -1];
    u0 = horizontal1;
    u1 = horizontal0;
  }

  const textureScale = 0.5;
  pushQuad(
    output,
    a,
    b,
    c,
    d,
    normal,
    [u0 * textureScale, bottom * textureScale, u1 * textureScale, bottom * textureScale,
      u1 * textureScale, top * textureScale, u0 * textureScale, top * textureScale],
    [0.86, 0.86, 0.95, 0.95],
  );
}

function cornerAo(ix, iz, corner, level) {
  const offsetX = corner[0] === '0' ? -1 : 0;
  const offsetZ = corner[1] === '0' ? -1 : 0;
  let occlusion = 0;
  for (let dx = 0; dx <= 1; dx += 1) {
    for (let dz = 0; dz <= 1; dz += 1) {
      const column = columnAt(ix + offsetX + dx, iz + offsetZ + dz);
      if (column.solid || column.level < level - 0.01) occlusion += 1;
    }
  }
  return 1 - 0.13 * Math.min(occlusion, 3);
}

function makeGeometry(output) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(output.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(output.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(output.uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(output.colors, 3));
  geometry.setIndex(output.indices);
  return geometry;
}

function makeOutput() {
  return { positions: [], normals: [], uvs: [], colors: [], indices: [] };
}

function buildChunk(chunkX, chunkZ, poolAccessPlanCache = null, poolLightPlanCache = null) {
  const floors = makeOutput();
  const ceilings = makeOutput();
  const walls = makeOutput();
  const skylights = makeOutput();
  const skylightPoints = [];
  const skyOpeningCells = [];
  const worldX = chunkX * CHUNK_SIZE;
  const worldZ = chunkZ * CHUNK_SIZE;

  for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
    for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
      const ix = worldX + localX;
      const iz = worldZ + localZ;
      const x0 = ix;
      const x1 = ix + 1;
      const z0 = iz;
      const z1 = iz + 1;
      const column = columnAt(ix, iz);
      if (ROOM_LIGHTING_ENABLED && isCurvedRoom(column.room)) {
        if (column.skylight) skylightPoints.push({ x: ix + 0.5, y: column.ceiling - 0.04, z: iz + 0.5 });
        continue; // The real curves replace these cells; never cover them with voxel faces.
      }
      const originalCorridor = ROOM_LIGHTING_ENABLED
        && isReferenceCorridor(Math.floor(ix / MODULE_SIZE), Math.floor(iz / MODULE_SIZE));

      if (column.solid) {
        const east = columnAt(ix + 1, iz);
        const south = columnAt(ix, iz + 1);
        // Solid cells block the whole neighboring interior, including space above
        // a low wall/arch pier's own ceiling. Seal to the higher adjacent ceiling.
        if (!east.solid) pushWall(walls, 'x', x1, z0, z1, Math.max(column.ceiling, east.ceiling), Math.min(-3.2, east.level), 1);
        if (!south.solid) pushWall(walls, 'z', z1, x0, x1, Math.max(column.ceiling, south.ceiling), Math.min(-3.2, south.level), 1);
        const textureScale = 0.5;
        pushQuad(
          ceilings,
          [x0, column.ceiling, z0], [x0, column.ceiling, z1],
          [x1, column.ceiling, z1], [x1, column.ceiling, z0],
          [0, 1, 0],
          [x0 * textureScale, z0 * textureScale, x0 * textureScale, z1 * textureScale,
            x1 * textureScale, z1 * textureScale, x1 * textureScale, z0 * textureScale],
          [0.93, 0.93, 0.93, 0.93],
        );
        continue;
      }

      const level = column.level;
      const textureScale = 0.5;
      pushQuad(
        floors,
        [x0, level, z0], [x0, level, z1], [x1, level, z1], [x1, level, z0],
        [0, 1, 0],
        [x0 * textureScale, z0 * textureScale, x0 * textureScale, z1 * textureScale,
          x1 * textureScale, z1 * textureScale, x1 * textureScale, z0 * textureScale],
        [cornerAo(ix, iz, '00', level), cornerAo(ix, iz, '01', level),
          cornerAo(ix, iz, '11', level), cornerAo(ix, iz, '10', level)],
      );

      const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dz] of neighbors) {
        const neighbor = columnAt(ix + dx, iz + dz);
        if (neighbor.solid || neighbor.ceiling <= column.ceiling + 0.05) continue;
        if (dx === 1) {
          pushWall(walls, 'x', x1, z0, z1, neighbor.ceiling, column.ceiling, -1);
          pushWall(walls, 'x', x1, z0, z1, neighbor.ceiling, column.ceiling, 1);
        } else if (dx === -1) {
          pushWall(walls, 'x', x0, z0, z1, neighbor.ceiling, column.ceiling, 1);
          pushWall(walls, 'x', x0, z0, z1, neighbor.ceiling, column.ceiling, -1);
        } else if (dz === 1) {
          pushWall(walls, 'z', z1, x0, x1, neighbor.ceiling, column.ceiling, -1);
          pushWall(walls, 'z', z1, x0, x1, neighbor.ceiling, column.ceiling, 1);
        } else {
          pushWall(walls, 'z', z0, x0, x1, neighbor.ceiling, column.ceiling, 1);
          pushWall(walls, 'z', z0, x0, x1, neighbor.ceiling, column.ceiling, -1);
        }
      }

      if (column.skyOpening) {
        skyOpeningCells.push({ x: x0, y: column.ceiling, z: z0 });
        skylightPoints.push({
          x: x0 + 0.5, y: column.ceiling - 0.04, z: z0 + 0.5,
          skyOpening: true, presetName: 'skylight',
        });
      } else if (column.skylight) {
        if (!ROOM_LIGHTING_ENABLED || originalCorridor) {
          pushQuad(
            skylights,
            [x0, column.ceiling, z0], [x1, column.ceiling, z0],
            [x1, column.ceiling, z1], [x0, column.ceiling, z1],
            [0, -1, 0], [0, 0, 1, 0, 1, 1, 0, 1], [1, 1, 1, 1],
          );
        }
        skylightPoints.push({ x: x0 + 0.5, y: column.ceiling - 0.04, z: z0 + 0.5 });
      }
      if (!column.skyOpening && (!column.skylight || (ROOM_LIGHTING_ENABLED && !originalCorridor))) {
        pushQuad(
          ceilings,
          [x0, column.ceiling, z0], [x1, column.ceiling, z0],
          [x1, column.ceiling, z1], [x0, column.ceiling, z1],
          [0, -1, 0],
          [x0 * textureScale, z0 * textureScale, x1 * textureScale, z0 * textureScale,
            x1 * textureScale, z1 * textureScale, x0 * textureScale, z1 * textureScale],
          [0.93, 0.93, 0.93, 0.93],
        );
      }

      const east = columnAt(ix + 1, iz);
      const south = columnAt(ix, iz + 1);
      if (east.solid) pushWall(walls, 'x', x1, z0, z1, Math.max(east.ceiling, column.ceiling), Math.min(-3.2, level), -1);
      else if (east.level < level) pushWall(walls, 'x', x1, z0, z1, level, east.level, 1);
      else if (east.level > level) pushWall(walls, 'x', x1, z0, z1, east.level, level, -1);
      if (south.solid) pushWall(walls, 'z', z1, x0, x1, Math.max(south.ceiling, column.ceiling), Math.min(-3.2, level), -1);
      else if (south.level < level) pushWall(walls, 'z', z1, x0, x1, level, south.level, 1);
      else if (south.level > level) pushWall(walls, 'z', z1, x0, x1, south.level, level, -1);
    }
  }

  const group = new THREE.Group();
  const geometries = [];
  if (floors.positions.length) {
    const geometry = makeGeometry(floors);
    const mesh = new THREE.Mesh(geometry, floorMaterial);
    group.add(mesh);
    geometries.push(geometry);
  }
  if (ceilings.positions.length) {
    const geometry = makeGeometry(ceilings);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    group.add(mesh);
    geometries.push(geometry);
  }
  if (walls.positions.length) {
    const geometry = makeGeometry(walls);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    group.add(mesh);
    geometries.push(geometry);
  }
  if (skylights.positions.length) {
    const geometry = makeGeometry(skylights);
    group.add(new THREE.Mesh(geometry, glowMaterial));
    geometries.push(geometry);
  }
  group.userData.geometries = geometries;
  group.userData.skylights = skylightPoints;
  if (ROOM_LIGHTING_ENABLED) {
    if (skyOpeningCells.length) addSkylightOpenings(group, skyOpeningCells);
    addCurvedRoomGeometry(group, chunkX, chunkZ, floorMaterial, wallMaterial, CHUNK_SIZE);
    // Openings retain their RectAreaLight candidates, but never receive the
    // opaque panel/emitter housing used by luminous ceiling fixtures.
    addChunkLights(group, chunkX, chunkZ, columnAt,
      skylightPoints.filter(point => !point.skyOpening), poolLightPlanCache);
    addChunkPoolAccess(group, chunkX, chunkZ, columnAt, {
      chunkSize: CHUNK_SIZE, moduleSize: MODULE_SIZE, waterLevel: WATER_LEVEL,
      planCache: poolAccessPlanCache,
    });
  }
  scene.add(group);
  return group;
}

class ReferenceChunkManager {
  constructor() {
    this.chunks = new Map();
    this.centerX = Infinity;
    this.centerZ = Infinity;
    this.skylightFixtures = [];
    this.skylightCandidates = [];
    this.skylightFrustum = new THREE.Frustum();
    this.skylightViewProjection = new THREE.Matrix4();
    this.skylightTestSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    this.poolAccessPlanCache = ROOM_LIGHTING_ENABLED
      ? new PoolAccessPlanCache(columnAt, {
        moduleSize: MODULE_SIZE, waterLevel: WATER_LEVEL,
      }) : null;
    // Keep the browser build on the bounded room-plan path while allowing the
    // source-sliced geometry tests to omit this optional dependency.
    this.poolLightPlanCache = ROOM_LIGHTING_ENABLED
      && typeof PoolLightPlanCache === 'function'
      ? new PoolLightPlanCache(columnAt, 64) : null;
  }

  update(position, force = false) {
    const centerX = Math.floor(position.x / CHUNK_SIZE);
    const centerZ = Math.floor(position.z / CHUNK_SIZE);
    if (!force && centerX === this.centerX && centerZ === this.centerZ) return false;
    this.centerX = centerX;
    this.centerZ = centerZ;
    const needed = new Set();
    for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz += 1) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx += 1) {
        const chunkX = centerX + dx;
        const chunkZ = centerZ + dz;
        const key = `${chunkX}:${chunkZ}`;
        needed.add(key);
        if (!this.chunks.has(key)) {
          this.chunks.set(key, buildChunk(chunkX, chunkZ, this.poolAccessPlanCache,
            this.poolLightPlanCache));
        }
      }
    }
    for (const [key, chunk] of this.chunks) {
      if (needed.has(key)) continue;
      chunk.userData.geometries.forEach((geometry) => geometry.dispose());
      chunk.userData.materials?.forEach(material => material.dispose());
      chunk.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      scene.remove(chunk);
      this.chunks.delete(key);
    }
    this.rebuildSkylightFixtures();
    return true;
  }

  rebuildSkylightFixtures() {
    const cells = new Map();
    for (const chunk of this.chunks.values()) {
      for (const skylight of chunk.userData.skylights) {
        const gridX = Math.floor(skylight.x);
        const gridZ = Math.floor(skylight.z);
        const heightKey = Math.round(skylight.y * 100);
        const kind = skylight.skyOpening ? 'sky-opening' : 'luminous';
        cells.set(`${kind}:${heightKey}:${gridX}:${gridZ}`, {
          gridX,
          gridZ,
          heightKey,
          kind,
          skyOpening: Boolean(skylight.skyOpening),
          presetName: skylight.presetName,
          y: skylight.y,
        });
      }
    }

    const visited = new Set();
    const fixtures = [];
    for (const [cellKey, cell] of cells) {
      if (visited.has(cellKey)) continue;
      visited.add(cellKey);
      const stack = [cell];
      let minX = cell.gridX;
      let maxX = cell.gridX;
      let minZ = cell.gridZ;
      let maxZ = cell.gridZ;

      while (stack.length) {
        const current = stack.pop();
        minX = Math.min(minX, current.gridX);
        maxX = Math.max(maxX, current.gridX);
        minZ = Math.min(minZ, current.gridZ);
        maxZ = Math.max(maxZ, current.gridZ);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const neighborKey = `${current.kind}:${current.heightKey}:${current.gridX + dx}:${current.gridZ + dz}`;
          const neighbor = cells.get(neighborKey);
          if (!neighbor || visited.has(neighborKey)) continue;
          visited.add(neighborKey);
          stack.push(neighbor);
        }
      }

      const x = (minX + maxX + 1) * 0.5;
      const z = (minZ + maxZ + 1) * 0.5;
      const width = maxX - minX + 1;
      const depth = maxZ - minZ + 1;
      const floorY = levelAt(Math.floor(x), Math.floor(z));
      const lightHeight = Math.max(1, cell.y - floorY);
      fixtures.push({
        x,
        y: cell.y,
        z,
        width,
        depth,
        skyOpening: cell.skyOpening,
        presetName: cell.skyOpening ? 'skylight' : cell.presetName,
        influenceY: floorY + lightHeight * 0.5,
        influenceRadius: Math.hypot(width, depth) * 0.5 + lightHeight * 0.58,
      });
    }
    this.skylightFixtures = fixtures;
  }

  activeSkylights(
    activeCamera,
    count,
    streamingFocus,
    retainedRoomFocus = null,
    activeCorridorFocus = null,
  ) {
    activeCamera.updateMatrixWorld();
    this.skylightViewProjection.multiplyMatrices(
      activeCamera.projectionMatrix,
      activeCamera.matrixWorldInverse,
    );
    this.skylightFrustum.setFromProjectionMatrix(this.skylightViewProjection);

    const candidates = this.skylightCandidates;
    candidates.length = 0;
    for (const skylight of this.skylightFixtures) {
      this.skylightTestSphere.center.set(skylight.x, skylight.influenceY, skylight.z);
      this.skylightTestSphere.radius = skylight.influenceRadius;
      skylight.visible = this.skylightFrustum.intersectsSphere(this.skylightTestSphere);
      skylight.cameraDistance = (skylight.x - activeCamera.position.x) ** 2
        + (skylight.z - activeCamera.position.z) ** 2;
      skylight.retainedDistance = retainedRoomFocus
        ? (skylight.x - retainedRoomFocus.x) ** 2 + (skylight.z - retainedRoomFocus.z) ** 2
        : Infinity;
      skylight.focusDistance = (skylight.x - streamingFocus.x) ** 2
        + (skylight.z - streamingFocus.z) ** 2;
      const corridorDistance = activeCorridorFocus
        ? (skylight.x - activeCorridorFocus.x) ** 2 + (skylight.z - activeCorridorFocus.z) ** 2
        : Infinity;
      skylight.corridorFixture = corridorDistance < 9 ** 2;
      skylight.portalDistance = Math.min(skylight.focusDistance, skylight.retainedDistance);
      if (skylight.corridorFixture
        || skylight.visible
        || skylight.cameraDistance < 14 ** 2
        || skylight.focusDistance < 20 ** 2
        || skylight.retainedDistance < 20 ** 2) candidates.push(skylight);
    }
    // Preserve both the corridor reservation and the original stable tie ordering.
    candidates.sort((a, b) => Number(b.corridorFixture) - Number(a.corridorFixture)
        || Number(b.visible) - Number(a.visible)
        || a.portalDistance - b.portalDistance
        || a.cameraDistance - b.cameraDistance);
    candidates.length = Math.min(candidates.length, count);
    return candidates;
  }
}

const chunks = new ReferenceChunkManager();
chunks.update(camera.position, true);

// The one shared planar reflection camera can see beyond dynamically loaded chunks.
// This capture-only enclosure moves with the chunk window and is hidden for the main camera.
const captureTileTexture = tileTextures.albedo.clone();
captureTileTexture.wrapS = captureTileTexture.wrapT = THREE.MirroredRepeatWrapping;
captureTileTexture.repeat.set(12, 12);
captureTileTexture.needsUpdate = true;
const captureWallMaterial = new THREE.MeshBasicMaterial({
  color: 0x40575f,
  map: captureTileTexture,
  side: THREE.BackSide,
  fog: true,
});
const captureCeilingMaterial = new THREE.MeshBasicMaterial({
  color: 0x637b84,
  map: captureTileTexture,
  side: THREE.BackSide,
  fog: true,
});
const captureFloorMaterial = new THREE.MeshBasicMaterial({
  color: 0x354f57,
  map: captureTileTexture,
  side: THREE.BackSide,
  fog: true,
});
[captureWallMaterial, captureCeilingMaterial, captureFloorMaterial].forEach(material => {
  tileAccentStyle.bind(material);
});
const captureSize = CHUNK_SIZE * (VIEW_RADIUS * 2 + 1) + 4;
const waterCaptureSeal = new THREE.Mesh(
  // Enclose the added 13m halls and 8m basins as well as the original rooms.
  new THREE.BoxGeometry(captureSize, 28, captureSize),
  [
    captureWallMaterial,
    captureWallMaterial,
    captureCeilingMaterial,
    captureFloorMaterial,
    captureWallMaterial,
    captureWallMaterial,
  ],
);
waterCaptureSeal.position.y = 3;
waterCaptureSeal.visible = false;
waterCaptureSeal.frustumCulled = false;
scene.add(waterCaptureSeal);

function updateWaterCaptureSeal() {
  waterCaptureSeal.position.x = (chunks.centerX + 0.5) * CHUNK_SIZE;
  waterCaptureSeal.position.z = (chunks.centerZ + 0.5) * CHUNK_SIZE;
  waterCaptureSeal.updateMatrixWorld();
}

updateWaterCaptureSeal();

const WATER_SURFACE_SIZE = CHUNK_SIZE * (VIEW_RADIUS * 2 + 1) + 32;
const WATER_FIELD_RESOLUTION = WATER_SURFACE_SIZE;
const MAX_POOL_DEPTH = 3;
// Roughly one vertex per metre gives the 4-7m geometric waves enough samples without a
// fluid-sized mesh: about 13k desktop vertices or 6.5k compact-device vertices.
const WATER_SURFACE_SEGMENTS = WATER_FIELD_RESOLUTION;
const PLAYER_RIPPLE_COUNT = 10;

function getWaterReflectionSize(viewport = getViewportSize()) {
  const scale = qualitySettings.waterReflectionScale;
  return {
    width: THREE.MathUtils.clamp(Math.round(viewport.width * scale), 384, 1152),
    height: THREE.MathUtils.clamp(Math.round(viewport.height * scale), 240, 720),
  };
}

const initialWaterReflectionSize = getWaterReflectionSize(initialViewport);
const initialPlayerRipples = Array.from(
  { length: PLAYER_RIPPLE_COUNT },
  () => new THREE.Vector4(100000, 100000, -100, 0),
);
const initialPlayerRippleBounds = Array.from(
  { length: PLAYER_RIPPLE_COUNT },
  () => new THREE.Vector4(100000, 100000, 100000, 100000),
);
const initialPlayerRippleDirections = Array.from(
  { length: PLAYER_RIPPLE_COUNT },
  () => new THREE.Vector4(0, 1, 0, 1),
);
const initialPlayerRippleReflections = Array.from(
  { length: PLAYER_RIPPLE_COUNT },
  () => new THREE.Vector4(100000, 100000, 0, 0),
);
const waterDepthField = new ScrollingDepthField(WATER_FIELD_RESOLUTION);
const waterFieldData = waterDepthField.data;
const waterFieldTexture = new THREE.DataTexture(
  waterFieldData,
  WATER_FIELD_RESOLUTION,
  WATER_FIELD_RESOLUTION,
  THREE.RedFormat,
);
waterFieldTexture.minFilter = THREE.LinearFilter;
waterFieldTexture.magFilter = THREE.LinearFilter;
waterFieldTexture.generateMipmaps = false;
waterFieldTexture.needsUpdate = true;

const waterUniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  {
    time: { value: 0 },
    waterField: { value: null },
    waterFieldOrigin: { value: new THREE.Vector2() },
    reflectionMap: { value: null },
    reflectionMatrix: { value: new THREE.Matrix4() },
    reflectionStrength: { value: qualitySettings.waterReflectionStrength },
    shallowColor: { value: new THREE.Color(0x3d8292) },
    deepColor: { value: new THREE.Color(0x245f72) },
    ceilingColor: { value: new THREE.Color(0x8fc6dc) },
    playerRipples: { value: initialPlayerRipples },
    playerRippleBounds: { value: initialPlayerRippleBounds },
    playerRippleDirections: { value: initialPlayerRippleDirections },
    playerRippleReflections: { value: initialPlayerRippleReflections },
  },
]);
// UniformsUtils.merge clones textures; bind the owned dynamic texture after merging
// so sampling and upload invalidation always refer to the same texture instance.
waterUniforms.waterField.value = waterFieldTexture;

const waterShapeShader = /* glsl */`
  float rippleBasinMask(vec2 worldXZ, vec4 bounds) {
    return step(bounds.x, worldXZ.x)
      * step(bounds.y, worldXZ.y)
      * step(worldXZ.x, bounds.z)
      * step(worldXZ.y, bounds.w);
  }

  float wakeDistance(vec2 delta, vec2 direction, float directionalAmount) {
    float radialDistance = length(delta);
    float directionLength = length(direction);
    if (directionLength < 0.1 || directionalAmount < 0.001) return radialDistance;
    direction /= directionLength;
    vec2 sideDirection = vec2(-direction.y, direction.x);
    float forwardDistance = abs(dot(delta, direction)) * 0.72;
    float sideDistance = abs(dot(delta, sideDirection)) * 1.18;
    float ellipseDistance = length(vec2(forwardDistance, sideDistance));
    float pointedEllipse = mix(ellipseDistance, forwardDistance + sideDistance, 0.42);
    return mix(radialDistance, pointedEllipse, directionalAmount);
  }

  vec4 getWaterShape(vec2 worldXZ) {
    float height = 0.0;
    vec2 slope = vec2(0.0);
    float crest = 0.0;

    vec2 direction0 = vec2(0.8192, 0.5735);
    vec2 direction1 = vec2(-0.4472, 0.8944);
    vec2 direction2 = vec2(0.9701, -0.2425);
    float phase0 = dot(worldXZ, direction0) * 0.82 + time * 0.46;
    float phase1 = dot(worldXZ, direction1) * 1.14 - time * 0.38 + 1.7;
    float phase2 = dot(worldXZ, direction2) * 1.52 + time * 0.65 + 3.1;
    height += sin(phase0) * 0.024;
    height += sin(phase1) * 0.014;
    height += sin(phase2) * 0.008;
    slope += cos(phase0) * direction0 * 0.01968;
    slope += cos(phase1) * direction1 * 0.01596;
    slope += cos(phase2) * direction2 * 0.01216;

    for (int i = 0; i < ${PLAYER_RIPPLE_COUNT}; i++) {
      vec4 ripple = playerRipples[i];
      float age = time - ripple.z;
      if (age < 0.0 || age >= 4.8 || ripple.w == 0.0) continue;
      float basinMask = rippleBasinMask(worldXZ, playerRippleBounds[i]);
      if (basinMask == 0.0) continue;
      vec4 directions = playerRippleDirections[i];
      vec4 reflection = playerRippleReflections[i];
      float lifetime = 1.0 - smoothstep(3.2, 4.8, age);
      vec2 delta = worldXZ - ripple.xy;
      float radialDistance = length(delta);
      float ringOffset = wakeDistance(delta, directions.xy, reflection.w) - age * 1.18;
      float envelope = exp(-abs(ringOffset) * 3.8) * lifetime;
      float ripplePhase = ringOffset * 10.5;
      float rippleHeight = sin(ripplePhase) * envelope * ripple.w * 0.018;
      height += rippleHeight;
      slope += delta / max(radialDistance, 0.001)
        * cos(ripplePhase) * envelope * ripple.w * 0.189;
      crest += max(sin(ripplePhase), 0.0) * envelope * ripple.w;

      vec2 reflectedDelta = worldXZ - reflection.xy;
      float reflectedDistance = length(reflectedDelta);
      float reflectedOffset = wakeDistance(
        reflectedDelta,
        directions.zw,
        reflection.w
      ) - age * 1.18;
      float reflectedEnvelope = exp(-abs(reflectedOffset) * 3.5) * lifetime
        * reflection.z;
      float reflectedPhase = reflectedOffset * 10.5 + 0.32;
      height += sin(reflectedPhase) * reflectedEnvelope * ripple.w * 0.018;
      slope += reflectedDelta / max(reflectedDistance, 0.001)
        * cos(reflectedPhase) * reflectedEnvelope * ripple.w * 0.189;
      crest += max(sin(reflectedPhase), 0.0) * reflectedEnvelope * ripple.w;
    }

    return vec4(height, slope, clamp(crest * 0.055, 0.0, 0.085));
  }
`;

const waterMaterial = new THREE.ShaderMaterial({
  name: 'PoolroomsInteractiveDisplacedWater',
  uniforms: waterUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: true,
  vertexShader: /* glsl */`
    #include <common>
    #include <fog_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    uniform float time;
    uniform mat4 reflectionMatrix;
    uniform vec4 playerRipples[${PLAYER_RIPPLE_COUNT}];
    uniform vec4 playerRippleBounds[${PLAYER_RIPPLE_COUNT}];
    uniform vec4 playerRippleDirections[${PLAYER_RIPPLE_COUNT}];
    uniform vec4 playerRippleReflections[${PLAYER_RIPPLE_COUNT}];
    varying vec3 vWorldPosition;
    varying vec4 vReflectionCoord;
    ${waterShapeShader}

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      worldPosition.y += getWaterShape(worldPosition.xz).x;
      vWorldPosition = worldPosition.xyz;
      vReflectionCoord = reflectionMatrix * vec4(position, 1.0);
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
    uniform float time;
    uniform sampler2D waterField;
    uniform sampler2D reflectionMap;
    uniform float reflectionStrength;
    uniform vec2 waterFieldOrigin;
    uniform vec3 shallowColor;
    uniform vec3 deepColor;
    uniform vec3 ceilingColor;
    uniform vec4 playerRipples[${PLAYER_RIPPLE_COUNT}];
    uniform vec4 playerRippleBounds[${PLAYER_RIPPLE_COUNT}];
    uniform vec4 playerRippleDirections[${PLAYER_RIPPLE_COUNT}];
    uniform vec4 playerRippleReflections[${PLAYER_RIPPLE_COUNT}];
    varying vec3 vWorldPosition;
    varying vec4 vReflectionCoord;
    ${waterShapeShader}

    void main() {
      #include <logdepthbuf_fragment>
      vec2 fieldUv = clamp(
        (vWorldPosition.xz - waterFieldOrigin) / ${WATER_SURFACE_SIZE.toFixed(1)},
        vec2(0.001),
        vec2(0.999)
      );
      float poolDepth = texture2D(waterField, fieldUv).r * ${MAX_POOL_DEPTH.toFixed(1)};
      poolDepth = max(poolDepth, 0.58);

      vec4 waterShape = getWaterShape(vWorldPosition.xz);
      float viewDistance = distance(cameraPosition, vWorldPosition);
      float detailFade = 1.0 - smoothstep(28.0, 72.0, viewDistance);
      float microPhase0 = dot(vWorldPosition.xz, vec2(0.6, 0.8)) * 4.6 + time * 1.15;
      float microPhase1 = dot(vWorldPosition.xz, vec2(-0.8944, 0.4472)) * 6.8 - time * 0.92;
      vec2 microSlope = cos(microPhase0) * vec2(0.6, 0.8) * 0.022
        + cos(microPhase1) * vec2(-0.8944, 0.4472) * 0.016;
      vec3 surfaceNormal = normalize(vec3(
        -(waterShape.y + microSlope.x * detailFade),
        1.0,
        -(waterShape.z + microSlope.y * detailFade)
      ));
      if (!gl_FrontFacing) surfaceNormal = -surfaceNormal;

      vec3 toEye = normalize(cameraPosition - vWorldPosition);
      float facing = clamp(dot(surfaceNormal, toEye), 0.0, 1.0);
      float fresnel = clamp(0.055 + 0.945 * pow(1.0 - facing, 5.0), 0.055, 0.9);
      float depthBlend = smoothstep(0.32, 2.65, poolDepth);

      vec2 refractedXZ = vWorldPosition.xz + surfaceNormal.xz * mix(0.06, 0.18, depthBlend);
      float floorShimmer = sin(refractedXZ.x * 6.283 + time * 0.23)
        * sin(refractedXZ.y * 6.283 - time * 0.19) * 0.5 + 0.5;
      vec3 transmitted = mix(shallowColor, deepColor, depthBlend);
      transmitted *= 0.82 + floorShimmer * mix(0.08, 0.025, depthBlend);

      vec4 reflectionCoord = vReflectionCoord;
      float reflectionDistortion = mix(0.000008, 0.000025, depthBlend);
      reflectionCoord.xy += vec2(surfaceNormal.x, -surfaceNormal.z)
        * reflectionCoord.w * reflectionDistortion;
      vec3 reflected = ceilingColor * (0.44 + fresnel * 0.24);
      if (reflectionStrength > 0.001) {
        reflected = texture2DProj(reflectionMap, reflectionCoord).rgb;
        reflected *= vec3(0.94, 0.99, 1.025);
      }

      vec3 lightDirection = normalize(vec3(-0.32, 0.91, 0.26));
      vec3 halfDirection = normalize(lightDirection + toEye);
      float specular = pow(max(dot(surfaceNormal, halfDirection), 0.0), 90.0) * 0.48;
      float broadSpecular = pow(max(dot(surfaceNormal, halfDirection), 0.0), 18.0) * 0.055;
      float reflectionMix = clamp(0.84 + fresnel * 0.15, 0.84, 0.98)
        * reflectionStrength;
      vec3 outgoingLight = mix(transmitted, reflected, reflectionMix);
      outgoingLight += ceilingColor * fresnel * 0.14 * (1.0 - reflectionStrength);
      outgoingLight += ceilingColor * (specular + broadSpecular);
      outgoingLight += vec3(0.42, 0.83, 0.94) * waterShape.w;

      if (!gl_FrontFacing) {
        outgoingLight = mix(deepColor * 0.74, ceilingColor * 0.44, fresnel * 0.35);
      }
      float alpha = mix(0.56, 0.66, depthBlend);
      alpha = mix(alpha, 0.86, fresnel);
      if (!gl_FrontFacing) alpha = 0.56;
      gl_FragColor = vec4(outgoingLight, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
});

const waterGeometry = new THREE.PlaneGeometry(
  WATER_SURFACE_SIZE,
  WATER_SURFACE_SIZE,
  WATER_SURFACE_SEGMENTS,
  WATER_SURFACE_SEGMENTS,
);
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI * 0.5;
water.position.set(
  Math.round(camera.position.x / 12) * 12,
  WATER_LEVEL,
  Math.round(camera.position.z / 12) * 12,
);
water.renderOrder = 2;
water.frustumCulled = false;
scene.add(water);
const waterReflector = new Reflector(
  new THREE.PlaneGeometry(WATER_SURFACE_SIZE, WATER_SURFACE_SIZE),
  {
    textureWidth: initialWaterReflectionSize.width,
    textureHeight: initialWaterReflectionSize.height,
    clipBias: 0.002,
    multisample: 0,
  },
);
waterReflector.rotation.x = -Math.PI * 0.5;
waterReflector.position.copy(water.position);
waterReflector.updateMatrixWorld();
waterUniforms.reflectionMap.value = waterReflector.getRenderTarget().texture;
waterUniforms.reflectionMatrix.value = waterReflector.material.uniforms.textureMatrix.value;
const rippleData = waterUniforms.playerRipples.value;
const rippleBoundsData = waterUniforms.playerRippleBounds.value;
const rippleDirectionData = waterUniforms.playerRippleDirections.value;
const rippleReflectionData = waterUniforms.playerRippleReflections.value;

function sampleEncodedWaterDepth(x, z) {
  const column = columnAt(x, z);
  const depth = column.solid ? 0 : Math.max(0, WATER_LEVEL - column.level);
  return depth > 0.08
    ? Math.round(THREE.MathUtils.clamp(depth / MAX_POOL_DEPTH, 0, 1) * 255)
    : 0;
}

function updateWaterField() {
  const originX = Math.floor(water.position.x - WATER_SURFACE_SIZE * 0.5);
  const originZ = Math.floor(water.position.z - WATER_SURFACE_SIZE * 0.5);
  if (!waterDepthField.update(originX, originZ, sampleEncodedWaterDepth)) return;
  waterUniforms.waterFieldOrigin.value.set(originX, originZ);
  waterFieldTexture.needsUpdate = true;
}

updateWaterField();

const hemisphereLight = new THREE.HemisphereLight(0xc2e1ff, 0x5f7e90, 0.74);
const ambientLight = new THREE.AmbientLight(0x76a8c9, 0.22);
scene.add(hemisphereLight);
scene.add(ambientLight);

function sampleWakeDistance(
  deltaX,
  deltaZ,
  directionX,
  directionZ,
  directionalAmount,
) {
  const radialDistance = Math.hypot(deltaX, deltaZ);
  const directionLength = Math.hypot(directionX, directionZ);
  if (directionLength < 0.1 || directionalAmount < 0.001) return radialDistance;
  directionX /= directionLength;
  directionZ /= directionLength;
  const forwardDistance = Math.abs(deltaX * directionX + deltaZ * directionZ) * 0.72;
  const sideDistance = Math.abs(deltaX * -directionZ + deltaZ * directionX) * 1.18;
  const ellipseDistance = Math.hypot(forwardDistance, sideDistance);
  const pointedEllipse = THREE.MathUtils.lerp(
    ellipseDistance,
    forwardDistance + sideDistance,
    0.42,
  );
  return THREE.MathUtils.lerp(radialDistance, pointedEllipse, directionalAmount);
}

function sampleWaterDisplacement(x, z, sampleTime) {
  const phase0 = (x * 0.8192 + z * 0.5735) * 0.82 + sampleTime * 0.46;
  const phase1 = (x * -0.4472 + z * 0.8944) * 1.14 - sampleTime * 0.38 + 1.7;
  const phase2 = (x * 0.9701 + z * -0.2425) * 1.52 + sampleTime * 0.65 + 3.1;
  let height = Math.sin(phase0) * 0.024
    + Math.sin(phase1) * 0.014
    + Math.sin(phase2) * 0.008;

  for (let i = 0; i < PLAYER_RIPPLE_COUNT; i += 1) {
    const ripple = rippleData[i];
    const age = sampleTime - ripple.z;
    if (age < 0 || age >= 4.8 || ripple.w <= 0) continue;
    const bounds = rippleBoundsData[i];
    if (x < bounds.x || z < bounds.y || x > bounds.z || z > bounds.w) continue;
    const lifetime = 1 - THREE.MathUtils.smoothstep(age, 3.2, 4.8);
    const direction = rippleDirectionData[i];
    const reflection = rippleReflectionData[i];
    const deltaX = x - ripple.x;
    const deltaZ = z - ripple.y;
    const ringOffset = sampleWakeDistance(
      deltaX,
      deltaZ,
      direction.x,
      direction.y,
      reflection.w,
    ) - age * 1.18;
    const envelope = Math.exp(-Math.abs(ringOffset) * 3.8) * lifetime;
    height += Math.sin(ringOffset * 10.5) * envelope * ripple.w * 0.018;

    const reflectedDeltaX = x - reflection.x;
    const reflectedDeltaZ = z - reflection.y;
    const reflectedOffset = sampleWakeDistance(
      reflectedDeltaX,
      reflectedDeltaZ,
      direction.z,
      direction.w,
      reflection.w,
    ) - age * 1.18;
    const reflectedEnvelope = Math.exp(-Math.abs(reflectedOffset) * 3.5)
      * lifetime * reflection.z;
    height += Math.sin(reflectedOffset * 10.5 + 0.32)
      * reflectedEnvelope * ripple.w * 0.018;
  }
  return height;
}

const floatingObjects = [];
const floatingUp = new THREE.Vector3(0, 1, 0);
const floatingNormal = new THREE.Vector3();
const floatingTargetQuaternion = new THREE.Quaternion();

function registerFloatingObject(object, options = {}) {
  floatingObjects.push({
    object,
    rideHeight: options.rideHeight ?? 0.06,
    response: options.response ?? 5,
    sampleRadius: options.sampleRadius ?? 0.24,
  });
  scene.add(object);
  return object;
}

function updateFloatingObjects(delta) {
  for (const floating of floatingObjects) {
    const { object, rideHeight, response, sampleRadius } = floating;
    const column = columnAt(Math.floor(object.position.x), Math.floor(object.position.z));
    object.visible = !column.solid && WATER_LEVEL - column.level > 0.08;
    if (!object.visible) continue;
    const centerHeight = sampleWaterDisplacement(object.position.x, object.position.z, elapsed);
    const leftHeight = sampleWaterDisplacement(object.position.x - sampleRadius, object.position.z, elapsed);
    const rightHeight = sampleWaterDisplacement(object.position.x + sampleRadius, object.position.z, elapsed);
    const backHeight = sampleWaterDisplacement(object.position.x, object.position.z - sampleRadius, elapsed);
    const frontHeight = sampleWaterDisplacement(object.position.x, object.position.z + sampleRadius, elapsed);
    floatingNormal.set(
      -(rightHeight - leftHeight) / (sampleRadius * 2),
      1,
      -(frontHeight - backHeight) / (sampleRadius * 2),
    ).normalize();
    object.position.y = THREE.MathUtils.damp(
      object.position.y,
      WATER_LEVEL + centerHeight + rideHeight,
      response,
      delta,
    );
    floatingTargetQuaternion.setFromUnitVectors(floatingUp, floatingNormal);
    object.quaternion.slerp(
      floatingTargetQuaternion,
      1 - Math.exp(-response * 0.75 * delta),
    );
  }
}

const floatRingGeometry = new THREE.TorusGeometry(0.25, 0.052, 8, 24);
floatRingGeometry.rotateX(-Math.PI * 0.5);
const floatingRing = registerFloatingObject(new THREE.Mesh(
  floatRingGeometry,
  new THREE.MeshStandardMaterial({ color: 0xdce7de, roughness: 0.42, metalness: 0.03 }),
), { rideHeight: 0.025, response: 4.5 });
floatingRing.position.set(5.25, WATER_LEVEL + 0.025, 3.65);

const floatingBall = registerFloatingObject(new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 10),
  new THREE.MeshStandardMaterial({ color: 0x4f95ad, roughness: 0.32, metalness: 0.04 }),
), { rideHeight: 0.07, response: 5.4, sampleRadius: 0.18 });
floatingBall.position.set(9.45, WATER_LEVEL + 0.07, 3.55);

const SKYLIGHT_BASE_INTENSITY = 6.4;
// Adjacent luminous tiles are already merged into fixtures, so this pool covers the same
// fog-visible range without paying the fragment-shader cost of 24 separate LTC area lights.
const MAX_ACTIVE_SKYLIGHT_COUNT = isCompactViewport ? 8 : 16;
const SKYLIGHT_POSITION_THRESHOLD_SQ = 0.012 ** 2;
const SKYLIGHT_ROTATION_THRESHOLD = THREE.MathUtils.degToRad(0.15);
const skylightLights = Array.from({ length: MAX_ACTIVE_SKYLIGHT_COUNT }, () => {
  const light = new THREE.RectAreaLight(0xa8d8ff, SKYLIGHT_BASE_INTENSITY, 1, 1);
  // RectAreaLight emits along local -Z. This rotation aims every ceiling panel downward.
  light.rotation.x = -Math.PI * 0.5;
  scene.add(light);
  return light;
});
const visibleSkylightFixtures = [];

const lastSkylightCameraPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
const lastSkylightCameraQuaternion = new THREE.Quaternion();
const skylightStreamingFocus = new THREE.Vector3();
const skylightRetainedRoomFocus = new THREE.Vector3();
const skylightActiveCorridorFocus = new THREE.Vector3();
const initialLightModuleX = Math.floor(camera.position.x / MODULE_SIZE);
const initialLightModuleZ = Math.floor(camera.position.z / MODULE_SIZE);
let lastSkylightRoomX = moduleType(initialLightModuleX, initialLightModuleZ) === 0
  ? initialLightModuleX
  : null;
let lastSkylightRoomZ = moduleType(initialLightModuleX, initialLightModuleZ) === 0
  ? initialLightModuleZ
  : null;
let activeSkylightCorridor = '';
let corridorDestinationX = null;
let corridorDestinationZ = null;
let retainPreviousSkylightRoom = false;
let retainActiveCorridorSkylights = false;

function updateSkylightStreamingFocus() {
  const moduleX = Math.floor(camera.position.x / MODULE_SIZE);
  const moduleZ = Math.floor(camera.position.z / MODULE_SIZE);
  const type = moduleType(moduleX, moduleZ);
  skylightStreamingFocus.copy(camera.position);

  if (type === 0) {
    lastSkylightRoomX = moduleX;
    lastSkylightRoomZ = moduleZ;
    retainPreviousSkylightRoom = false;
    retainActiveCorridorSkylights = false;
    activeSkylightCorridor = '';
    corridorDestinationX = null;
    corridorDestinationZ = null;
    return;
  }

  if (type !== 1 && type !== 2) {
    retainActiveCorridorSkylights = false;
    return;
  }
  const corridorKey = `${moduleX}:${moduleZ}`;
  retainActiveCorridorSkylights = true;
  skylightActiveCorridorFocus.set(
    moduleX * MODULE_SIZE + ROOM_CENTER + 0.5,
    camera.position.y,
    moduleZ * MODULE_SIZE + ROOM_CENTER + 0.5,
  );

  // Entering a corridor is the portal boundary. Remember which room the player came from
  // and hold the opposite room as the destination for the entire corridor traversal.
  if (corridorKey !== activeSkylightCorridor) {
    activeSkylightCorridor = corridorKey;
    retainPreviousSkylightRoom = lastSkylightRoomX !== null && lastSkylightRoomZ !== null;
    if (retainPreviousSkylightRoom) {
      skylightRetainedRoomFocus.set(
        lastSkylightRoomX * MODULE_SIZE + ROOM_CENTER + 0.5,
        camera.position.y,
        lastSkylightRoomZ * MODULE_SIZE + ROOM_CENTER + 0.5,
      );
    }
    if (type === 1) {
      const cameFromLeft = lastSkylightRoomX === moduleX - 1 && lastSkylightRoomZ === moduleZ;
      const cameFromRight = lastSkylightRoomX === moduleX + 1 && lastSkylightRoomZ === moduleZ;
      const localX = camera.position.x - moduleX * MODULE_SIZE;
      const roomDirection = cameFromLeft ? 1 : cameFromRight ? -1 : localX < MODULE_SIZE * 0.5 ? 1 : -1;
      corridorDestinationX = moduleX + roomDirection;
      corridorDestinationZ = moduleZ;
    } else {
      const cameFromTop = lastSkylightRoomX === moduleX && lastSkylightRoomZ === moduleZ - 1;
      const cameFromBottom = lastSkylightRoomX === moduleX && lastSkylightRoomZ === moduleZ + 1;
      const localZ = camera.position.z - moduleZ * MODULE_SIZE;
      const roomDirection = cameFromTop ? 1 : cameFromBottom ? -1 : localZ < MODULE_SIZE * 0.5 ? 1 : -1;
      corridorDestinationX = moduleX;
      corridorDestinationZ = moduleZ + roomDirection;
    }
  }

  skylightStreamingFocus.set(
    corridorDestinationX * MODULE_SIZE + ROOM_CENTER + 0.5,
    camera.position.y,
    corridorDestinationZ * MODULE_SIZE + ROOM_CENTER + 0.5,
  );
}

function hasVisibleSkylightPath(skylight, origin = camera.position) {
  const deltaX = skylight.x - origin.x;
  const deltaY = skylight.y - origin.y;
  const deltaZ = skylight.z - origin.z;
  const distance = Math.hypot(deltaX, deltaY, deltaZ);
  const steps = Math.max(2, Math.ceil(distance / 0.45));

  // RectAreaLight does not cast shadows. Reject a fixture when the straight path
  // from the player crosses a wall, a raised floor or a ceiling, so an upper
  // corridor cannot paint a specular highlight onto tiles seen from a deep pool.
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const x = origin.x + deltaX * t;
    const y = origin.y + deltaY * t;
    const z = origin.z + deltaZ * t;
    const column = columnAt(Math.floor(x), Math.floor(z));
    if (column.solid || y < column.level + 0.06 || y > column.ceiling - 0.06) return false;
  }
  return true;
}

function updateSkylightLights(force = false) {
  const cameraMoved = lastSkylightCameraPosition.distanceToSquared(camera.position)
    >= SKYLIGHT_POSITION_THRESHOLD_SQ;
  const cameraTurned = lastSkylightCameraQuaternion.angleTo(camera.quaternion)
    >= SKYLIGHT_ROTATION_THRESHOLD;
  if (!force && (!cameraMoved && !cameraTurned)) return;

  updateSkylightStreamingFocus();
  const candidates = chunks.activeSkylights(
    camera,
    MAX_ACTIVE_SKYLIGHT_COUNT,
    skylightStreamingFocus,
    retainPreviousSkylightRoom ? skylightRetainedRoomFocus : null,
    retainActiveCorridorSkylights ? skylightActiveCorridorFocus : null,
  );
  visibleSkylightFixtures.length = 0;
  for (const fixture of candidates) {
    if (!hasVisibleSkylightPath(fixture)) continue;
    visibleSkylightFixtures.push(fixture);
    if (visibleSkylightFixtures.length >= qualitySettings.activeLights) break;
  }
  skylightLights.forEach((light, index) => {
    // Zero intensity alone still runs the full LTC shader for that light. Hide only
    // preset-disabled slots so the shader light count stays stable while moving.
    light.visible = index < qualitySettings.activeLights;
    const skylight = visibleSkylightFixtures[index];
    if (!skylight) {
      light.intensity = 0;
      return;
    }
    light.intensity = SKYLIGHT_BASE_INTENSITY * Number(lightBrightnessInput.value) / 100;
    light.width = skylight.width * 0.78;
    light.height = skylight.depth * 0.78;
    light.position.set(skylight.x, skylight.y - 0.05, skylight.z);
    if (ROOM_LIGHTING_ENABLED) applyFixturePreset(light, skylight);
  });
  lastSkylightCameraPosition.copy(camera.position);
  lastSkylightCameraQuaternion.copy(camera.quaternion);
}
updateSkylightLights(true);

const glowBaseColor = new THREE.Color(2.2, 3.9, 7.2);
const poolLighting = new PoolLighting(scene, isCompactViewport);
poolLighting.bindSurfaceMaterials([floorMaterial, wallMaterial]);
poolLighting.setQuality(qualityPresetName);
const reflectionRoomGraph = new ReflectionRoomGraph(columnAt, {
  staticCells: true,
  moduleSize: MODULE_SIZE,
  chunkSize: CHUNK_SIZE,
  waterLevel: WATER_LEVEL,
  maxPortalDepth: 4,
});
reflectionRoomGraph.rebuild(chunks.chunks);
const reflectionCapture = new ReflectionCaptureController({
  reflector: waterReflector,
  graph: reflectionRoomGraph,
  water,
  captureSeal: waterCaptureSeal,
  occluderMaterials: [floorMaterial, wallMaterial],
});
const reflectionDebug = new ReflectionDebugView(
  scene,
  waterReflector.getRenderTarget().texture,
  reflectionRoomGraph,
);
if (import.meta.hot) import.meta.hot.dispose(() => reflectionDebug.dispose());

function applyReflection(material, percentage) {
  const reflection = THREE.MathUtils.clamp(percentage / 100, 0, 1);
  material.roughness = Math.max(0.04, 0.98 - reflection);
  material.clearcoat = reflection * 0.9;
  material.clearcoatRoughness = 0.49 - reflection * 0.45;
  material.envMapIntensity = 0;
  // MeshPhysicalMaterial's clearcoat setter already invalidates the shader when
  // crossing zero. The other slider changes only update uniforms.
}

function applySceneSettings() {
  const lightScale = Number(lightBrightnessInput.value) / 100;
  hemisphereLight.intensity = 0.74 * lightScale;
  ambientLight.intensity = 0.22 * lightScale;
  glowMaterial.color.copy(glowBaseColor).multiplyScalar(lightScale);
  skylightLights.forEach((light) => {
    if (light.intensity > 0) light.intensity = SKYLIGHT_BASE_INTENSITY * lightScale;
  });
  const surfaceReflection = Number(surfaceReflectionInput.value);
  applyReflection(wallMaterial, surfaceReflection);
  applyReflection(floorMaterial, surfaceReflection);
  updateSkylightLights(true);
  poolLighting.setBrightness(lightScale);
  lightBrightnessValue.value = `${lightBrightnessInput.value}%`;
  surfaceReflectionValue.value = `${surfaceReflectionInput.value}%`;
}

applySceneSettings();

function applyPlayerSettings() {
  playerSettings.movementSpeed = THREE.MathUtils.clamp(Number(movementSpeedInput.value) / 100, 0.25, 3);
  playerSettings.gravity = THREE.MathUtils.clamp(Number(gravityStrengthInput.value) / 100, 0.25, 2);
  movementSpeedValue.value = `${Math.round(playerSettings.movementSpeed * 100)}%`;
  gravityStrengthValue.value = `${Math.round(playerSettings.gravity * 100)}%`;
}

applyPlayerSettings();

function applyAudioSettings() {
  const volume = THREE.MathUtils.clamp(Number(masterVolumeInput.value) / 100, 0, 1);
  audioSystem.setVolume('MASTER', volume);
  masterVolumeValue.value = `${Math.round(volume * 100)}%`;
}

applyAudioSettings();

const mistCount = isCompactViewport ? 180 : 360;
const mistPositions = new Float32Array(mistCount * 3);
for (let i = 0; i < mistCount; i += 1) {
  mistPositions[i * 3] = (Math.random() - 0.5) * 56;
  mistPositions[i * 3 + 1] = Math.random() * 6;
  mistPositions[i * 3 + 2] = (Math.random() - 0.5) * 56;
}
const mistGeometry = new THREE.BufferGeometry();
mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
const mist = new THREE.Points(mistGeometry, new THREE.PointsMaterial({
  color: 0xa8d8ee,
  size: 0.052,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
}));
scene.add(mist);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(initialViewport.width, initialViewport.height);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(initialViewport.width, initialViewport.height),
  0.08,
  0.5,
  1.04,
);
bloomPass.enabled = qualitySettings.bloom;
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
mistGeometry.setDrawRange(0, Math.round(mistCount * qualitySettings.mistRatio));

function applyQualityPreset(presetName, persist = true) {
  qualityPresetName = QUALITY_PRESETS[presetName] ? presetName : 'balanced';
  qualitySettings = QUALITY_PRESETS[qualityPresetName];
  qualityPresetInput.value = qualityPresetName;
  const viewport = getViewportSize();
  const pixelRatio = Math.min(window.devicePixelRatio, qualitySettings.pixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(viewport.width, viewport.height, false);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(viewport.width, viewport.height);
  bloomPass.enabled = qualitySettings.bloom;
  mistGeometry.setDrawRange(0, Math.round(mistCount * qualitySettings.mistRatio));
  const reflectionSize = getWaterReflectionSize(viewport);
  waterReflector.getRenderTarget().setSize(reflectionSize.width, reflectionSize.height);
  waterUniforms.reflectionStrength.value = qualitySettings.waterReflectionStrength;
  poolLighting.setQuality(qualityPresetName);
  audioSystem.setQuality(qualityPresetName);
  updateSkylightLights(true);
  lastWaterReflectionAt = -Infinity;
  if (!persist) return;
  try {
    window.localStorage.setItem(QUALITY_STORAGE_KEY, qualityPresetName);
  } catch {
    // The selected quality still applies for this session when storage is unavailable.
  }
}

const playerVelocity = new THREE.Vector3();
const desiredVelocity = new THREE.Vector3();
const lastRipplePosition = new THREE.Vector2(camera.position.x, camera.position.z);
let lastRippleTime = -10;
let nextRipple = 0;
let elapsed = 0;
let bobPhase = 0;
let jumpQueued = false;
let verticalVelocity = 0;
let baseEyeHeight = camera.position.y;
let verticalState = 'grounded';
let keyboardDiveArmed = true;

const SURFACE_EYE_HEIGHT = WATER_LEVEL + 0.53;
const MIN_SWIM_EYE_CLEARANCE = 0.38;
const MIN_SWIMMABLE_DEPTH = 1.2;
const SWIM_VERTICAL_SPEED = 1.45;
const SWIM_SPEED_SCALE = 0.6;
const WADING_SPEED_SCALE = 0.76;
const SWIM_ACCELERATION_RESPONSE = 3.2;
const SWIM_DRAG_RESPONSE = 7;
const WATER_ENTRY_MOMENTUM = 0.46;
const MIN_WATER_ENTRY_SINK_SPEED = 0.95;
const MAX_WATER_ENTRY_SINK_SPEED = 2.65;
const WATER_JUMP_SPEED = 4.15;
const AIR_GRAVITY = 15.8;
let underwaterBlend = 0;

function playerColumnAt(x, z) {
  return sampleCurvedRoom(x, z) ?? columnAt(Math.floor(x), Math.floor(z));
}

function collides(x, z, allowShoreExit = false) {
  const radius = 0.27;
  const curved = curvedRoomCollision(x, z, {
    fromX: camera.position.x, fromZ: camera.position.z, eyeY: baseEyeHeight,
    grounded: verticalState === 'grounded', swimming: verticalState === 'swimming',
    allowShoreExit, sampleFallback: columnAt, waterLevel: WATER_LEVEL, eyeHeight: EYE_HEIGHT, radius,
  });
  if (curved !== null) return curved;
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minZ = Math.floor(z - radius);
  const maxZ = Math.floor(z + radius);
  const currentLevel = columnAt(
    Math.floor(camera.position.x),
    Math.floor(camera.position.z),
  ).level;
  const stepAllowance = verticalState === 'grounded' ? 0.18 : 0.015;
  const blocksMovement = (ix, iz) => {
    const column = columnAt(ix, iz);
    if (column.solid) return true;
    // Deep-room passages are traversable only below their actual ceiling.
    if (column.ceiling < baseEyeHeight + 0.12) return true;
    // Restore the original input-driven step onto land, but only for a surfaced
    // player actively approaching this bank. Walls/low passages never qualify.
    if (allowShoreExit && WATER_LEVEL - column.level < MIN_SWIMMABLE_DEPTH
      && column.level <= WATER_LEVEL + 0.5
      && !(column.ceiling < column.level + EYE_HEIGHT + 0.12)) {
      const bankX = THREE.MathUtils.clamp(camera.position.x, ix, ix + 1) - camera.position.x;
      const bankZ = THREE.MathUtils.clamp(camera.position.z, iz, iz + 1) - camera.position.z;
      // Test the inward input on the axis being resolved. A tangent component or
      // the far corner of an adjacent shore tile must not veto a glancing exit.
      const enteringX = (x - camera.position.x) * bankX > 1e-10
        && desiredVelocity.x * bankX > 1e-10;
      const enteringZ = (z - camera.position.z) * bankZ > 1e-10
        && desiredVelocity.z * bankZ > 1e-10;
      if (enteringX || enteringZ) return false;
    }
    // Same-height and descending terrain must not trap the swimmer's submerged body.
    if (column.level <= currentLevel + 0.001) return false;
    const destinationSupportsSwimming = WATER_LEVEL - column.level >= MIN_SWIMMABLE_DEPTH;
    const eyeClearance = verticalState === 'swimming' && destinationSupportsSwimming
      ? MIN_SWIM_EYE_CLEARANCE
      : EYE_HEIGHT;
    // Outside the eligible surface exit, a raised floor is a wall below its top.
    // Require body clearance so a submerged player cannot enter land and get lifted.
    // Grounded feet follow the supporting floor, not the lagging camera ease.
    // Otherwise successive small steps briefly become walls while sprinting.
    const bodyFloor = verticalState === 'grounded' ? currentLevel : baseEyeHeight - eyeClearance;
    if (column.level <= bodyFloor + stepAllowance) return false;
    // Walking down a ledge lowers the body before its trailing edge clears the bank.
    // Permit reducing an existing overlap, but never entering or deepening one.
    const overlapAt = (centerX, centerZ, cellX = ix, cellZ = iz) => {
      const width = Math.max(0,
        Math.min(centerX + radius, cellX + 1) - Math.max(centerX - radius, cellX));
      const depth = Math.max(0,
        Math.min(centerZ + radius, cellZ + 1) - Math.max(centerZ - radius, cellZ));
      return width * depth;
    };
    // A partially overlapping body may slide along one continuous bank. At tile
    // seams its area transfers between equal-height cells without going deeper.
    // Require the same side face and an already-overlapped neighbor, so a new
    // perpendicular corner or a higher ledge still blocks underwater movement.
    const continuesBank = (cellX, cellZ) => {
      const neighbor = columnAt(cellX, cellZ);
      return !neighbor.solid && Math.abs(neighbor.level - column.level) < 0.001
        && overlapAt(camera.position.x, camera.position.z, cellX, cellZ) > 0;
    };
    if (x === camera.position.x && z !== camera.position.z
      && (camera.position.x < ix || camera.position.x > ix + 1)
      && continuesBank(ix, iz - Math.sign(z - camera.position.z))) return false;
    if (z === camera.position.z && x !== camera.position.x
      && (camera.position.z < iz || camera.position.z > iz + 1)
      && continuesBank(ix - Math.sign(x - camera.position.x), iz)) return false;
    const previousOverlap = overlapAt(camera.position.x, camera.position.z);
    return previousOverlap <= 0 || overlapAt(x, z) > previousOverlap + 1e-8;
  };
  return blocksMovement(minX, minZ)
    || blocksMovement(maxX, minZ)
    || blocksMovement(minX, maxZ)
    || blocksMovement(maxX, maxZ);
}

function waterJumpSpeedAt(x, z) {
  let jumpSpeed = WATER_JUMP_SPEED;
  const reach = 0.55;
  const samples = [
    [x - reach, z], [x + reach, z], [x, z - reach], [x, z + reach],
  ];
  for (const [sampleX, sampleZ] of samples) {
    const column = playerColumnAt(sampleX, sampleZ);
    if (column.solid || WATER_LEVEL - column.level >= MIN_SWIMMABLE_DEPTH) continue;
    // Only an explicit surface jump beside a bank gets enough height to clear it.
    // Keep open-water jumps and the separate water-entry impulse unchanged.
    // Leave clearance for the collider radius and the capped 50ms physics step.
    const rise = Math.max(0, column.level + EYE_HEIGHT - baseEyeHeight + 0.4);
    jumpSpeed = Math.max(jumpSpeed, Math.sqrt(2 * AIR_GRAVITY * playerSettings.gravity * rise));
  }
  return jumpSpeed;
}

const waterBasinBoundsCache = new SpatialCellCache(64, CHUNK_SIZE);

function waterBasinBoundsAt(startX, startZ) {
  const roundBounds = curvedPoolBounds(startX + 0.5, startZ + 0.5);
  if (roundBounds) return roundBounds;
  const cached = waterBasinBoundsCache.get(startX, startZ);
  if (cached) return cached;

  const moduleX = Math.floor(startX / MODULE_SIZE);
  const moduleZ = Math.floor(startZ / MODULE_SIZE);
  const moduleMinX = moduleX * MODULE_SIZE;
  const moduleMinZ = moduleZ * MODULE_SIZE;
  const moduleMaxX = moduleMinX + MODULE_SIZE - 1;
  const moduleMaxZ = moduleMinZ + MODULE_SIZE - 1;
  const queue = [startX, startZ];
  const visited = new Set();
  const basinCells = [];
  const bounds = new THREE.Vector4(startX, startZ, startX + 1, startZ + 1);
  let cursor = 0;
  let foundWater = false;

  while (cursor < queue.length) {
    const x = queue[cursor];
    const z = queue[cursor + 1];
    cursor += 2;
    if (x < moduleMinX || x > moduleMaxX || z < moduleMinZ || z > moduleMaxZ) continue;
    const key = `${x},${z}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const column = columnAt(x, z);
    if (column.solid || column.level >= WATER_LEVEL - 0.08) continue;

    if (!foundWater) bounds.set(x, z, x + 1, z + 1);
    else {
      bounds.x = Math.min(bounds.x, x);
      bounds.y = Math.min(bounds.y, z);
      bounds.z = Math.max(bounds.z, x + 1);
      bounds.w = Math.max(bounds.w, z + 1);
    }
    foundWater = true;
    basinCells.push(x, z);
    queue.push(x - 1, z, x + 1, z, x, z - 1, x, z + 1);
  }

  for (let i = 0; i < basinCells.length; i += 2) {
    waterBasinBoundsCache.set(basinCells[i], basinCells[i + 1], bounds);
  }
  waterBasinBoundsCache.set(startX, startZ, bounds);
  return bounds;
}

function isWaterCell(x, z) {
  const column = columnAt(x, z);
  return !column.solid && column.level < WATER_LEVEL - 0.08;
}

function nearestWaterWall(x, z, bounds) {
  const roundWall = curvedPoolWall(x, z);
  if (roundWall) return roundWall;
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  const candidates = [];

  for (let step = 1; step <= MODULE_SIZE + 1; step += 1) {
    if (!isWaterCell(cellX - step, cellZ)) {
      const coordinate = cellX - step + 1;
      candidates.push({ axis: 'x', coordinate, distance: Math.max(0, x - coordinate) });
      break;
    }
  }
  for (let step = 1; step <= MODULE_SIZE + 1; step += 1) {
    if (!isWaterCell(cellX + step, cellZ)) {
      const coordinate = cellX + step;
      candidates.push({ axis: 'x', coordinate, distance: Math.max(0, coordinate - x) });
      break;
    }
  }
  for (let step = 1; step <= MODULE_SIZE + 1; step += 1) {
    if (!isWaterCell(cellX, cellZ - step)) {
      const coordinate = cellZ - step + 1;
      candidates.push({ axis: 'z', coordinate, distance: Math.max(0, z - coordinate) });
      break;
    }
  }
  for (let step = 1; step <= MODULE_SIZE + 1; step += 1) {
    if (!isWaterCell(cellX, cellZ + step)) {
      const coordinate = cellZ + step;
      candidates.push({ axis: 'z', coordinate, distance: Math.max(0, coordinate - z) });
      break;
    }
  }

  if (candidates.length > 0) {
    return candidates.reduce((nearest, candidate) => (
      candidate.distance < nearest.distance ? candidate : nearest
    ));
  }

  const fallbackCandidates = [
    { axis: 'x', coordinate: bounds.x, distance: x - bounds.x },
    { axis: 'x', coordinate: bounds.z, distance: bounds.z - x },
    { axis: 'z', coordinate: bounds.y, distance: z - bounds.y },
    { axis: 'z', coordinate: bounds.w, distance: bounds.w - z },
  ];
  return fallbackCandidates.reduce((nearest, candidate) => (
    candidate.distance < nearest.distance ? candidate : nearest
  ));
}

function writePlayerRipple(strength, directionX, directionZ, directionalAmount = 0) {
  const directionLength = Math.hypot(directionX, directionZ);
  if (directionLength > 0.001) {
    directionX /= directionLength;
    directionZ /= directionLength;
  } else {
    directionX = 0;
    directionZ = 0;
  }
  const bounds = waterBasinBoundsAt(
    Math.floor(camera.position.x),
    Math.floor(camera.position.z),
  );
  const wall = nearestWaterWall(camera.position.x, camera.position.z, bounds);
  let reflectedX = camera.position.x;
  let reflectedZ = camera.position.z;
  let reflectedDirectionX = directionX;
  let reflectedDirectionZ = directionZ;
  if (wall.axis === 'x') {
    reflectedX = wall.coordinate * 2 - camera.position.x;
    reflectedDirectionX *= -1;
  } else if (wall.axis === 'radial') {
    reflectedX += 2 * wall.distance * wall.normalX;
    reflectedZ += 2 * wall.distance * wall.normalZ;
    const projection = directionX * wall.normalX + directionZ * wall.normalZ;
    reflectedDirectionX -= 2 * projection * wall.normalX;
    reflectedDirectionZ -= 2 * projection * wall.normalZ;
  } else {
    reflectedZ = wall.coordinate * 2 - camera.position.z;
    reflectedDirectionZ *= -1;
  }

  rippleData[nextRipple].set(camera.position.x, camera.position.z, elapsed, strength);
  rippleBoundsData[nextRipple].copy(bounds);
  rippleDirectionData[nextRipple].set(
    directionX,
    directionZ,
    reflectedDirectionX,
    reflectedDirectionZ,
  );
  rippleReflectionData[nextRipple].set(
    reflectedX,
    reflectedZ,
    0.13,
    THREE.MathUtils.clamp(directionalAmount, 0, 1),
  );
  nextRipple = (nextRipple + 1) % PLAYER_RIPPLE_COUNT;
  lastRippleTime = elapsed;
  lastRipplePosition.set(camera.position.x, camera.position.z);
}

function emitRipple(inWater, strengthScale = 1) {
  const speed = Math.hypot(playerVelocity.x, playerVelocity.z);
  if (!(controls.isLocked || touchPlaying) || !inWater || speed < 0.18) return;
  const distance = Math.hypot(
    camera.position.x - lastRipplePosition.x,
    camera.position.z - lastRipplePosition.y,
  );
  const interval = THREE.MathUtils.lerp(0.82, 0.56, THREE.MathUtils.clamp(speed / 4.5, 0, 1));
  if (distance < interval || elapsed - lastRippleTime < 0.32) return;
  const strength = THREE.MathUtils.clamp(0.58 + speed * 0.12, 0.62, 1.05) * strengthScale;
  const directionalAmount = THREE.MathUtils.smoothstep(speed, 0.72, 2.25);
  writePlayerRipple(
    strength,
    playerVelocity.x / speed,
    playerVelocity.z / speed,
    directionalAmount,
  );
}

function updatePlayer(delta) {
  if (window.__naiwaIceLayer?.isStoryPaused() || !(controls.isLocked || touchPlaying)) {
    playerVelocity.multiplyScalar(Math.exp(-10 * delta));
    return;
  }
  const keyboardForward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const keyboardRight = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const forward = THREE.MathUtils.clamp(keyboardForward + touchMove.y, -1, 1);
  const right = THREE.MathUtils.clamp(keyboardRight + touchMove.x, -1, 1);
  const inputScale = 1 / Math.max(1, Math.hypot(forward, right));
  const moveForward = forward * inputScale;
  const moveRight = right * inputScale;
  const swimming = verticalState === 'swimming';
  camera.getWorldDirection(viewForwardVector);
  rightVector.crossVectors(viewForwardVector, camera.up).normalize();
  forwardVector.copy(viewForwardVector);
  forwardVector.y = 0;
  if (!swimming) forwardVector.normalize();
  const currentColumn = playerColumnAt(camera.position.x, camera.position.z);
  const currentWaterDepth = WATER_LEVEL - currentColumn.level;
  const wading = currentColumn.level < WATER_LEVEL - 0.08
    && currentWaterDepth < MIN_SWIMMABLE_DEPTH;
  const shiftHeld = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (!shiftHeld) keyboardDiveArmed = true;
  const riseHeld = keys.has('Space') || touchRiseHeld;
  const sprinting = shiftHeld && !swimming;
  let speed = sprinting ? 4.45 : 2.45;
  if (swimming) speed *= SWIM_SPEED_SCALE;
  else if (wading) speed *= WADING_SPEED_SCALE;
  const touchStrength = THREE.MathUtils.clamp(touchMove.length(), 0, 1);
  if (touchStrength > 0 && keyboardForward === 0 && keyboardRight === 0) {
    const slowSpeed = swimming ? 0.3 : 0.55;
    const fastSpeed = swimming ? 1.86 : wading ? 3.35 : 4.45;
    speed = THREE.MathUtils.lerp(slowSpeed, fastSpeed, touchStrength ** 1.45);
  }
  // Apply after the touch curve so keyboard and joystick share the same setting.
  speed *= playerSettings.movementSpeed;
  const swimVerticalSpeed = SWIM_VERTICAL_SPEED * playerSettings.movementSpeed;
  const viewVerticalSpeed = swimming
    ? THREE.MathUtils.clamp(
      viewForwardVector.y * moveForward * speed,
      -swimVerticalSpeed,
      swimVerticalSpeed,
    )
    : 0;
  const desired = desiredVelocity.set(0, 0, 0)
    .addScaledVector(forwardVector, moveForward)
    .addScaledVector(rightVector, moveRight);
  desired.multiplyScalar(speed);
  const hasMovementInput = Math.abs(moveForward) + Math.abs(moveRight) > 0.01;
  // Shift sprints while standing/wading; only swimming gives it dive semantics.
  const diveHeld = swimming && (touchDiveHeld || (shiftHeld && keyboardDiveArmed));
  // This is a collision permission for this frame, not a movement animation.
  // Keep both eye tests so camera bob alone cannot lift an underwater swimmer.
  const allowShoreExit = hasMovementInput && !jumpQueued && !diveHeld
    && (swimming || verticalState === 'grounded')
    && !currentColumn.solid && currentColumn.level < WATER_LEVEL - 0.08
    && Math.min(baseEyeHeight, camera.position.y) > WATER_LEVEL + 0.005
    && verticalVelocity >= -0.45;
  const horizontalResponse = swimming
    ? hasMovementInput ? SWIM_ACCELERATION_RESPONSE : SWIM_DRAG_RESPONSE
    : wading ? hasMovementInput ? 4.8 : 8.2
      : 7.8;
  playerVelocity.lerp(desired, 1 - Math.exp(-horizontalResponse * delta));
  const nextX = camera.position.x + playerVelocity.x * delta;
  if (!collides(nextX, camera.position.z, allowShoreExit)) camera.position.x = nextX;
  else playerVelocity.x = 0;
  const nextZ = camera.position.z + playerVelocity.z * delta;
  if (!collides(camera.position.x, nextZ, allowShoreExit)) camera.position.z = nextZ;
  else playerVelocity.z = 0;
  const updatedColumn = playerColumnAt(camera.position.x, camera.position.z);
  const inWaterColumn = updatedColumn.level < WATER_LEVEL - 0.08;
  const waterDepth = WATER_LEVEL - updatedColumn.level;
  const swimmableWater = inWaterColumn && waterDepth >= MIN_SWIMMABLE_DEPTH;

  if (swimmableWater) {
    const minimumSwimEyeHeight = Math.min(
      SURFACE_EYE_HEIGHT,
      updatedColumn.level + MIN_SWIM_EYE_CLEARANCE,
    );

    // Entering a water tile does not mean the player has touched the water.
    // Keep normal airborne physics until the falling body reaches the surface.
    if (verticalState === 'grounded') {
      verticalState = baseEyeHeight > SURFACE_EYE_HEIGHT + 0.04 ? 'airborne' : 'swimming';
      verticalVelocity = Math.min(verticalVelocity, 0);
      if (verticalState === 'swimming') keyboardDiveArmed = !shiftHeld;
    }

    if (verticalState === 'airborne') {
      verticalVelocity -= AIR_GRAVITY * playerSettings.gravity * delta;
      baseEyeHeight += verticalVelocity * delta;
      if (verticalVelocity <= 0 && baseEyeHeight <= SURFACE_EYE_HEIGHT) {
        baseEyeHeight = SURFACE_EYE_HEIGHT;
        const entrySinkSpeed = THREE.MathUtils.clamp(
          Math.abs(verticalVelocity) * WATER_ENTRY_MOMENTUM,
          MIN_WATER_ENTRY_SINK_SPEED,
          MAX_WATER_ENTRY_SINK_SPEED,
        );
        verticalVelocity = -entrySinkSpeed;
        verticalState = 'swimming';
        keyboardDiveArmed = !shiftHeld;
        writePlayerRipple(1.02, 0, 0, 0);
      }
    } else {
      const diveHeld = touchDiveHeld || (shiftHeld && keyboardDiveArmed);
      const atSurface = baseEyeHeight >= SURFACE_EYE_HEIGHT - 0.035;
      if (jumpQueued && atSurface && !diveHeld) {
        verticalState = 'airborne';
        verticalVelocity = waterJumpSpeedAt(camera.position.x, camera.position.z);
        writePlayerRipple(0.9, 0, 0, 0);
      } else {
        const verticalInput = Number(riseHeld) - Number(diveHeld);
        const desiredVerticalSpeed = verticalInput === 0
          ? viewVerticalSpeed
          : verticalInput * swimVerticalSpeed;
        const verticalResponse = verticalInput !== 0
          ? 6.5
          : Math.abs(viewVerticalSpeed) > 0.01 ? 4.5 : 2.2;
        verticalVelocity = THREE.MathUtils.damp(
          verticalVelocity,
          desiredVerticalSpeed,
          verticalResponse,
          delta,
        );
        baseEyeHeight += verticalVelocity * delta;
        if (baseEyeHeight >= SURFACE_EYE_HEIGHT) {
          baseEyeHeight = SURFACE_EYE_HEIGHT;
          verticalVelocity = Math.min(verticalVelocity, 0);
        } else if (baseEyeHeight <= minimumSwimEyeHeight) {
          baseEyeHeight = minimumSwimEyeHeight;
          verticalVelocity = Math.max(verticalVelocity, 0);
        }
      }
    }
  } else {
    const groundEyeHeight = updatedColumn.level + EYE_HEIGHT;
    if (verticalState === 'swimming') {
      verticalState = 'grounded';
      verticalVelocity = 0;
      keyboardDiveArmed = !shiftHeld;
    }

    if (verticalState === 'grounded') {
      baseEyeHeight = THREE.MathUtils.damp(baseEyeHeight, groundEyeHeight, 8, delta);
      if (jumpQueued) {
        verticalVelocity = 5.15;
        verticalState = 'airborne';
      }
    } else {
      verticalVelocity -= AIR_GRAVITY * playerSettings.gravity * delta;
      baseEyeHeight += verticalVelocity * delta;
      if (baseEyeHeight <= groundEyeHeight) {
        if (inWaterColumn) writePlayerRipple(0.9, 0, 0, 0);
        baseEyeHeight = groundEyeHeight;
        verticalVelocity = 0;
        verticalState = 'grounded';
      }
    }
  }

  jumpQueued = false;

  const moving = playerVelocity.length() > 0.18;
  const nowSwimming = verticalState === 'swimming';
  updateTouchSwimmingState(nowSwimming);
  if (moving) bobPhase += delta * (sprinting ? 8.7 : 6.2) * (nowSwimming ? 0.45 : 1);
  const bob = moving ? Math.sin(bobPhase) * (nowSwimming ? 0.022 : 0.035) : 0;
  camera.position.y = baseEyeHeight + bob;
  const nowWading = inWaterColumn && !swimmableWater;
  const touchingSurface = nowWading || (nowSwimming && baseEyeHeight > WATER_LEVEL + 0.08);
  emitRipple(touchingSurface, nowWading ? 0.92 : 1);

  // Read-only audio handoff: reuse this tick's resolved water/ground state.
  return {
    column: updatedColumn, waterDepth, inWaterColumn, nowSwimming, nowWading,
    grounded: verticalState === 'grounded', sprinting,
  };
}

function updateUnderwaterEffects(delta) {
  const currentColumn = playerColumnAt(camera.position.x, camera.position.z);
  const insidePool = currentColumn.level < WATER_LEVEL - 0.08;
  const depth = WATER_LEVEL - camera.position.y;
  const targetBlend = insidePool
    ? THREE.MathUtils.smoothstep(depth, -0.015, 0.26)
    : 0;
  const nextBlend = THREE.MathUtils.damp(underwaterBlend, targetBlend, 10, delta);
  if (nextBlend === underwaterBlend) return;
  underwaterBlend = nextBlend;

  scene.background.lerpColors(aboveWaterBackground, underwaterBackground, underwaterBlend);
  scene.fog.color.lerpColors(aboveWaterFog, underwaterFog, underwaterBlend);
  scene.fog.density = THREE.MathUtils.lerp(0.049, 0.105, underwaterBlend);
  underwaterFilter.style.opacity = String(underwaterBlend * 0.82);
}

let touchStickPointerId = null;
let touchStickCaptureTarget = null;
let touchStickOriginX = 0;
let touchStickOriginY = 0;
let touchLookPointerId = null;
let touchLookX = 0;
let touchLookY = 0;
let touchSwimming = false;
const touchHoldResets = [];

function updateTouchSwimmingState(swimming) {
  if (!touchInputEnabled || touchSwimming === swimming) return;
  touchSwimming = swimming;
  touchHud.classList.toggle('is-swimming', swimming);
  referenceLanguage.localize(touchRiseButton, swimming ? 'touch.rise' : 'touch.jump', 'aria-label');
}

function resetTouchStickVisual() {
  touchStickZone.classList.remove('is-active');
  touchStickZone.style.setProperty('--stick-x', '0px');
  touchStickZone.style.setProperty('--stick-y', '0px');
  touchStickZone.style.setProperty('--stick-scale', '.34');
  touchStickZone.style.setProperty('--stick-opacity', '.34');
}

function resetTouchInputs() {
  touchMove.set(0, 0);
  touchRiseHeld = false;
  touchDiveHeld = false;
  jumpQueued = false;
  releaseTouchStick({ pointerId: touchStickPointerId });
  releaseTouchLook({ pointerId: touchLookPointerId });
  resetTouchStickVisual();
  touchHoldResets.forEach((reset) => reset());
}

function setTouchPlaying(playing) {
  touchPlaying = playing;
  touchHud.classList.toggle('is-playing', playing);
  touchHud.setAttribute('aria-hidden', String(!playing));
  if (!playing) resetTouchInputs();
}

function updateTouchStick(clientX, clientY) {
  const bounds = touchStickZone.getBoundingClientRect();
  const dx = clientX - touchStickOriginX;
  const dy = clientY - touchStickOriginY;
  const distance = Math.hypot(dx, dy);
  const maxDistance = Math.max(1, Math.min(bounds.width, bounds.height) * 0.32);
  const rawStrength = THREE.MathUtils.clamp(distance / maxDistance, 0, 1);
  const movementStrength = rawStrength <= 0.07 ? 0 : (rawStrength - 0.07) / 0.93;
  const directionX = distance > 0 ? dx / distance : 0;
  const directionY = distance > 0 ? dy / distance : 0;
  const coreTravel = rawStrength * 2.25 * 16;

  touchMove.set(directionX * movementStrength, -directionY * movementStrength);
  touchStickZone.style.setProperty('--stick-x', `${(directionX * coreTravel).toFixed(1)}px`);
  touchStickZone.style.setProperty('--stick-y', `${(directionY * coreTravel).toFixed(1)}px`);
  touchStickZone.style.setProperty('--stick-angle', `${THREE.MathUtils.radToDeg(Math.atan2(dy, dx)) + 90}deg`);
  touchStickZone.style.setProperty('--stick-scale', (0.38 + rawStrength * 0.68).toFixed(3));
  touchStickZone.style.setProperty('--stick-opacity', (0.34 + rawStrength * 0.28).toFixed(3));
}

function startTouchStick(event) {
  if (!touchPlaying || event.pointerType === 'mouse' || touchStickPointerId !== null) return;
  event.preventDefault();
  touchStickPointerId = event.pointerId;
  touchStickCaptureTarget = event.currentTarget;
  // Use the initial contact as neutral, even far away from the visible ring.
  touchStickOriginX = event.clientX;
  touchStickOriginY = event.clientY;
  touchStickCaptureTarget.setPointerCapture(event.pointerId);
  touchStickZone.classList.add('is-active');
  updateTouchStick(event.clientX, event.clientY);
}
touchStickZone.addEventListener('pointerdown', startTouchStick);
function moveTouchStick(event) {
  if (event.pointerId !== touchStickPointerId) return;
  event.preventDefault();
  updateTouchStick(event.clientX, event.clientY);
}
touchStickZone.addEventListener('pointermove', moveTouchStick);
function releaseTouchStick(event) {
  if (touchStickPointerId === null || event.pointerId !== touchStickPointerId) return;
  const captureTarget = touchStickCaptureTarget;
  touchMove.set(0, 0);
  touchStickPointerId = null;
  touchStickCaptureTarget = null;
  if (captureTarget?.hasPointerCapture(event.pointerId)) captureTarget.releasePointerCapture(event.pointerId);
  resetTouchStickVisual();
}
touchStickZone.addEventListener('pointerup', releaseTouchStick);
touchStickZone.addEventListener('pointercancel', releaseTouchStick);
touchStickZone.addEventListener('lostpointercapture', releaseTouchStick);

function bindTouchHoldButton(button, setHeld, queueJump = false) {
  let activePointerId = null;
  const queueTouchJump = () => {
    if (queueJump && touchPlaying) jumpQueued = true;
  };
  touchHoldResets.push(() => {
    activePointerId = null;
    button.classList.remove('is-pressed');
    setHeld(false);
  });
  button.addEventListener('pointerdown', (event) => {
    if (!touchPlaying || activePointerId !== null) return;
    event.preventDefault();
    event.stopPropagation();
    activePointerId = event.pointerId;
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-pressed');
    setHeld(true);
    queueTouchJump();
  });
  const release = (event) => {
    if (event.pointerId !== activePointerId) return;
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    activePointerId = null;
    button.classList.remove('is-pressed');
    setHeld(false);
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  if (queueJump) {
    // Some mobile browsers omit pointerdown during a viewport transition. Keep
    // native touch and compatibility click fallbacks for the one-shot jump.
    button.addEventListener('touchstart', (event) => {
      if (!touchPlaying) return;
      queueTouchJump();
      if (event.cancelable) event.preventDefault();
    }, { passive: false });
    button.addEventListener('click', queueTouchJump);
  }
}
bindTouchHoldButton(touchRiseButton, (held) => { touchRiseHeld = held; }, true);
bindTouchHoldButton(touchDiveButton, (held) => { touchDiveHeld = held; });

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') activateTouchGameplay();
  if (!touchPlaying || event.pointerType === 'mouse') return;
  const bounds = canvas.getBoundingClientRect();
  if (event.clientX < bounds.left + bounds.width * 0.5) {
    startTouchStick(event);
    return;
  }
  if (touchLookPointerId !== null) return;
  event.preventDefault();
  touchLookPointerId = event.pointerId;
  touchLookX = event.clientX;
  touchLookY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId === touchStickPointerId) {
    moveTouchStick(event);
    return;
  }
  if (event.pointerId !== touchLookPointerId) return;
  event.preventDefault();
  const dx = event.clientX - touchLookX;
  const dy = event.clientY - touchLookY;
  touchLookX = event.clientX;
  touchLookY = event.clientY;
  camera.rotation.y -= dx * 0.0038;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 0.0034, -Math.PI * 0.48, Math.PI * 0.48);
});
function releaseTouchLook(event) {
  if (touchLookPointerId === null || event.pointerId !== touchLookPointerId) return;
  touchLookPointerId = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener('pointerup', releaseTouchStick);
canvas.addEventListener('pointercancel', releaseTouchStick);
canvas.addEventListener('lostpointercapture', releaseTouchStick);
canvas.addEventListener('pointerup', releaseTouchLook);
canvas.addEventListener('pointercancel', releaseTouchLook);
canvas.addEventListener('lostpointercapture', releaseTouchLook);

function resize() {
  const viewport = getViewportSize();
  camera.aspect = viewport.width / viewport.height;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.width, viewport.height, false);
  composer.setSize(viewport.width, viewport.height);
}

let resizeFrame = 0;
function requestResize() {
  if (resizeFrame) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    resize();
  });
}

let hasEntered = true;
let suppressUnlockSettings = false;

function hideSettings() {
  settingsMenu.hidden = true;
}

function showSettings() {
  settingsMenu.hidden = false;
  settingsContinue.focus({ preventScroll: true });
}

function requestGameFullscreen() {
  // The chapter owns fullscreen. Fullscreening this iframe hides its parent UI.
  if (window.self !== window.top) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const root = document.documentElement;
  try {
    if (root.requestFullscreen) {
      const request = root.requestFullscreen({ navigationUI: 'hide' });
      request?.catch(() => {});
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    }
  } catch {
    // Fullscreen is optional; browsers such as iOS Safari may reject it.
  }
}

function activateTouchGameplay() {
  if (!hasTouchSupport) return;
  enableTouchInput();
  if (!hasEntered || !settingsMenu.hidden) return;
  requestGameFullscreen();
  if (!touchPlaying && controls.isLocked) {
    suppressUnlockSettings = true;
    controls.unlock();
    window.setTimeout(() => { suppressUnlockSettings = false; }, 500);
  }
  setTouchPlaying(true);
}

function enterExperience() {
  requestGameFullscreen();
  if (touchInputEnabled) {
    hasEntered = true;
    entry.classList.add('is-hidden');
    hideSettings();
    setTouchPlaying(true);
    return;
  }
  controls.lock();
}

entry.addEventListener('click', enterExperience);
entry.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') enableTouchInput();
});
window.addEventListener('pointerdown', (event) => {
  lastPointerType = event.pointerType || 'mouse';
  if ((event.pointerType === 'touch' || event.pointerType === 'pen') && event.target === canvas) activateTouchGameplay();
}, { passive: true });
settingsContinue.addEventListener('click', enterExperience);
touchMenu.addEventListener('click', () => {
  setTouchPlaying(false);
  showSettings();
});
settingsReset.addEventListener('click', () => {
  tileAccentSettings.reset();
  lightBrightnessInput.value = '100';
  surfaceReflectionInput.value = '80';
  movementSpeedInput.value = '100';
  gravityStrengthInput.value = '100';
  masterVolumeInput.value = '65';
  applyQualityPreset('balanced');
  applySceneSettings();
  applyPlayerSettings();
  applyAudioSettings();
});
[lightBrightnessInput, surfaceReflectionInput].forEach((input) => {
  input.addEventListener('input', applySceneSettings);
});
qualityPresetInput.addEventListener('change', () => {
  applyQualityPreset(qualityPresetInput.value);
});
[movementSpeedInput, gravityStrengthInput].forEach((input) => {
  input.addEventListener('input', applyPlayerSettings);
});
masterVolumeInput.addEventListener('input', applyAudioSettings);
controls.addEventListener('lock', () => {
  hasEntered = true;
  entry.classList.add('is-hidden');
  hideSettings();
  if (touchPlaying) setTouchPlaying(false);
});
controls.addEventListener('unlock', () => {
  keys.clear();
  if (touchPlaying) setTouchPlaying(false);
  if (window.__naiwaIceLayer?.isStoryPaused() || document.querySelector('#ice-archive.is-solving')) {
    hideSettings();
    return;
  }
  if (hasEntered) {
    if (!suppressUnlockSettings) showSettings();
    return;
  }
  entry.classList.remove('is-hidden');
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && !event.repeat) {
    event.preventDefault();
    if (!settingsMenu.hidden) {
      // Close from the keyboard. Pointer-lock requests can be rejected from keydown,
      // so suppress the unlock callback and allow a canvas click to resume the game.
      suppressUnlockSettings = true;
      hideSettings();
      controls.lock();
      window.setTimeout(() => { suppressUnlockSettings = false; }, 500);
    } else if (hasEntered && controls.isLocked) {
      // During gameplay, the browser unlock event opens the settings overlay.
      controls.unlock();
    }
    return;
  }
  keys.add(event.code);
  if (event.code === 'Space' && !event.repeat) jumpQueued = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) event.preventDefault();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('naiwa-story-pause', () => {
  keys.clear();
  resetTouchInputs();
  if (touchPlaying) setTouchPlaying(false);
});
window.addEventListener('naiwa-story-resume', () => {
  if (touchInputEnabled && hasEntered && settingsMenu.hidden) setTouchPlaying(true);
});
window.addEventListener('blur', () => {
  keys.clear();
  resetTouchInputs();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetTouchInputs();
});
window.addEventListener('resize', requestResize, { passive: true });
window.addEventListener('orientationchange', requestResize, { passive: true });
window.visualViewport?.addEventListener('resize', requestResize, { passive: true });
screen.orientation?.addEventListener('change', requestResize, { passive: true });
canvas.addEventListener('click', () => {
  if (hasEntered && settingsMenu.hidden && !controls.isLocked && lastPointerType !== 'touch' && lastPointerType !== 'pen') controls.lock();
});

let lastRenderedAt = -Infinity;
let lastWaterReflectionAt = -Infinity;
const iceChapterLayer = createIceChapterLayer({ scene, camera, canvas, columnAt, renderer });
window.__naiwaIceLayer = iceChapterLayer;
window.addEventListener('pagehide', () => iceChapterLayer.dispose(), { once: true });

function render(frameTime = performance.now()) {
  requestAnimationFrame(render);
  const isPlaying = !iceChapterLayer.isStoryPaused() && (controls.isLocked || touchPlaying);
  const renderInterval = isPlaying ? 0 : 1000 / PAUSED_RENDER_FPS;
  if (frameTime - lastRenderedAt < renderInterval) return;
  lastRenderedAt = frameTime;
  const delta = Math.min(clock.getDelta(), 0.05);
  elapsed += delta;
  iceChapterLayer.update(delta, elapsed);
  const impactVelocity = verticalVelocity;
  const playerAudioState = updatePlayer(delta);
  const ceiling = playerColumnAt(camera.position.x, camera.position.z).ceiling;
  if (camera.position.y > ceiling - 0.12) {
    camera.position.y = ceiling - 0.12;
    baseEyeHeight = camera.position.y;
    verticalVelocity = Math.min(0, verticalVelocity);
  }
  updateUnderwaterEffects(delta);
  skylightSky.update(elapsed, camera);
  audioSystem.setPaused(!isPlaying || !settingsMenu.hidden || document.hidden);
  if (playerAudioState) {
    const roomX = Math.floor(camera.position.x / MODULE_SIZE);
    const roomZ = Math.floor(camera.position.z / MODULE_SIZE);
    audioSystem.updatePlayerState(createPlayerAudioSnapshot({
      position: camera.position, velocity: playerVelocity, verticalVelocity, impactVelocity,
      baseEyeHeight, eyeHeight: EYE_HEIGHT, waterLevel: WATER_LEVEL,
      playerState: playerAudioState,
      currentRoom: describeAudioRoom(playerAudioState.column, roomX, roomZ),
      moving: desiredVelocity.lengthSq() > 0.01,
      paused: audioSystem.paused,
    }), delta);
  }
  updateFloatingObjects(delta);
  const chunksChanged = chunks.update(camera.position);
  updateSkylightLights(chunksChanged);
  poolLighting.update(delta, camera, chunks.chunks, chunksChanged,
    Number(lightBrightnessInput.value) / 100);
  const waterX = Math.round(camera.position.x / 12) * 12;
  const waterZ = Math.round(camera.position.z / 12) * 12;
  const waterMoved = water.position.x !== waterX || water.position.z !== waterZ;
  if (waterMoved) {
    water.position.x = waterX;
    water.position.z = waterZ;
    water.updateMatrixWorld();
    waterReflector.position.copy(water.position);
    waterReflector.updateMatrixWorld();
    updateWaterField();
  }
  waterUniforms.time.value = elapsed;
  mist.position.x = Math.round(camera.position.x / 28) * 28;
  mist.position.z = Math.round(camera.position.z / 28) * 28;
  mist.rotation.y += delta * 0.004;
  if (chunksChanged) updateWaterCaptureSeal();
  if (chunksChanged) {
    reflectionRoomGraph.rebuild(chunks.chunks);
    reflectionDebug.rebuild();
  }
  const reflectionEnabled = qualitySettings.waterReflectionFps > 0
    && qualitySettings.waterReflectionStrength > 0;
  const reflectionInterval = reflectionEnabled
    ? 1000 / qualitySettings.waterReflectionFps
    : Infinity;
  const hasVisibleWater = reflectionEnabled && reflectionCapture.prepare(camera);
  const shouldCaptureReflection = hasVisibleWater
    && camera.position.y > WATER_LEVEL - 0.04
    && (chunksChanged || waterMoved || frameTime - lastWaterReflectionAt >= reflectionInterval);
  if (shouldCaptureReflection) {
    reflectionCapture.capture(renderer, scene, camera, reflectionDebug.group,
      reflectionDebug.enabled);
    reflectionDebug.update(reflectionCapture);
    lastWaterReflectionAt = frameTime;
  }
  iceChapterLayer.refreshReflections();
  composer.render(delta);
  reflectionDebug.render(renderer);
}

renderer.compileAsync(scene, camera).finally(render);
