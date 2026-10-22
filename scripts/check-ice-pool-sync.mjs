import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createSkylightSky, SKYLIGHT_SKY_SHADER } from '../src/ice-pool/environment/SkylightSky.js';
const renderingPath = new URL('../src/ice-pool/reference-rendering.js', import.meta.url);
const { referencePixelRatio, ReferenceBloomPass } = existsSync(renderingPath)
  ? await import(renderingPath) : { ReferenceBloomPass: UnrealBloomPass };
const source = readFileSync(new URL('../src/ice-pool/reference-map.js', import.meta.url), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
}
class SizingRenderer {
  constructor() { this.ratio = 1; this.size = new THREE.Vector2(); }
  getPixelRatio() { return this.ratio; }
  setPixelRatio(ratio) { this.ratio = ratio; }
  getSize(out) { return out.copy(this.size); }
  setSize(width, height) { this.size.set(width, height); }
}

function sizingScene(preset = 'balanced', width = 3840, height = 2160) {
  let viewport = { width, height };
  const frames = [], layerQualities = [], audioQualities = [];
  const target = new THREE.WebGLRenderTarget(1152, 720);
  const api = runInNewContext(
    section('const QUALITY_PRESETS =', 'function storedQualityPreset()')
      + '\nlet qualityPresetName = preset; let qualitySettings = QUALITY_PRESETS[preset];'
      + section('const renderer = new THREE.WebGLRenderer(', 'renderer.outputColorSpace =')
      + section('function getWaterReflectionSize(', 'const initialWaterReflectionSize =')
      + section('const composer = new EffectComposer(', 'const playerVelocity =')
      + '\nlet lastWaterReflectionAt = 123;'
      + section('function resize()', 'let hasEntered =')
      + '\n({renderer, composer, bloomPass, camera, resize, requestResize, applyQualityPreset,'
      + ' lastCapture: () => lastWaterReflectionAt})', {
      THREE: { ...THREE, WebGLRenderer: SizingRenderer },
      EffectComposer, RenderPass, UnrealBloomPass, ReferenceBloomPass, OutputPass, referencePixelRatio,
      scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(),
      canvas: {}, preset, isCompactViewport: width < 720,
      initialViewport: { width, height }, getViewportSize: () => viewport,
      qualityPresetInput: {}, mistCount: 360, mistGeometry: new THREE.BufferGeometry(),
      waterReflector: { getRenderTarget: () => target },
      waterUniforms: { reflectionStrength: { value: 1 } },
      poolLighting: { setQuality() {} }, audioSystem: { setQuality: value => audioQualities.push(value) },
      updateSkylightLights() {}, QUALITY_STORAGE_KEY: 'test-quality',
      window: { __naiwaIceLayer: { setQuality: value => layerQualities.push(value) }, devicePixelRatio: 2, requestAnimationFrame: fn => frames.push(fn),
        localStorage: { setItem() {} } },
    });
  return {
    ...api, target, frames, layerQualities, audioQualities, setViewport(value) { viewport = value; },
    dispose() {
      for (const pass of api.composer.passes) pass.dispose?.();
      api.composer.dispose(); target.dispose();
    },
  };
}

for (const [preset, maxPixels] of [
  ['balanced', 2560 * 1440], ['high', 3840 * 2160], ['performance', 1920 * 1080], ['ultra', 1280 * 720],
]) {
  test(`${preset} bounds postprocessing pixels on a large high-DPI viewport`, () => {
    const scene = sizingScene(preset);
    try {
      const target = scene.composer.renderTarget1;
      assert.ok(target.width * target.height <= maxPixels + 1,
        `rendering ${target.width}x${target.height} exceeds ${maxPixels} pixels`);
      assert.equal(scene.renderer.getPixelRatio(), scene.composer._pixelRatio);
    } finally { scene.dispose(); }
  });
}

test('unused pixel budget does not supersample small or low-DPI viewports', () => {
  const scene = sizingScene('balanced', 360, 780);
  try {
    assert.deepEqual([scene.composer.renderTarget1.width, scene.composer.renderTarget1.height].map(Math.floor),
      [396, 858]);
    assert.equal(referencePixelRatio({ width: 640, height: 360 },
      { pixelRatio: 1.35, maxPixels: 2560 * 1440 }, 1), 1);
  } finally { scene.dispose(); }
});

test('resizing shrinks reflection capture and refreshes its projection on the next frame', () => {
  const scene = sizingScene();
  try {
    scene.setViewport({ width: 640, height: 360 });
    scene.resize();
    assert.deepEqual([scene.target.width, scene.target.height], [384, 240]);
    assert.equal(scene.lastCapture(), -Infinity);
    assert.equal(scene.camera.aspect, 16 / 9);
    assert.deepEqual([scene.composer.renderTarget1.width, scene.composer.renderTarget1.height].map(Math.floor), [864, 486]);
  } finally { scene.dispose(); }
});

test('bloom keeps its color-only buffers within a smaller pixel budget', () => {
  const scene = sizingScene();
  try {
    const bloomTargets = [scene.bloomPass.renderTargetBright,
      ...scene.bloomPass.renderTargetsHorizontal, ...scene.bloomPass.renderTargetsVertical];
    assert.ok(bloomTargets.every(target => target.depthBuffer === false));
    const targets = [scene.composer.renderTarget1, scene.composer.renderTarget2, ...bloomTargets];
    const colorBytes = targets.reduce((sum, target) => sum + target.width * target.height * 8, 0);
    assert.ok(colorBytes < 64 * 1024 * 1024, `${colorBytes} bytes exceeds the balanced color budget`);
  } finally { scene.dispose(); }
});

test('quality changes and coalesced viewport events use the same sizing policy', () => {
  const scene = sizingScene('high');
  try {
    scene.applyQualityPreset('performance', false);
    assert.equal(scene.bloomPass.enabled, false);
    assert.ok(scene.composer.renderTarget1.width * scene.composer.renderTarget1.height <= 1920 * 1080 + 1);
    scene.setViewport({ width: 640, height: 360 });
    scene.requestResize(); scene.requestResize(); scene.requestResize();
    assert.equal(scene.frames.length, 1);
    scene.frames.shift()();
    assert.deepEqual([scene.target.width, scene.target.height], [384, 240]);
    assert.equal(scene.lastCapture(), -Infinity);
  } finally { scene.dispose(); }
});

test('quality changes preserve ice-specific refraction and layer settings', () => {
  const scene = sizingScene();
  try {
    scene.applyQualityPreset('ultra', false);
    assert.equal(scene.renderer.transmissionResolutionScale, .25);
    assert.equal(scene.bloomPass.enabled, false);
    scene.applyQualityPreset('high', false);
    assert.equal(scene.renderer.transmissionResolutionScale, 1);
    assert.equal(scene.bloomPass.enabled, true);
    assert.deepEqual(scene.layerQualities, ['ultra', 'high']);
    assert.deepEqual(scene.audioQualities, ['performance', 'high']);
  } finally { scene.dispose(); }
});

test('sky uses opaque roof depth before cloud shading without blocking glass', () => {
  const sky = createSkylightSky();
  try {
    assert.equal(sky.material.depthTest, true);
    assert.equal(sky.material.depthWrite, false);
    assert(sky.mesh.renderOrder > new THREE.Mesh().renderOrder);
    assert.equal(sky.material.transparent, false);
    assert.match(SKYLIGHT_SKY_SHADER.vertex, /gl_Position\.z\s*=\s*gl_Position\.w/);
  } finally { sky.dispose(); }
});

test('streamed fog boundary leaves skylights open, follows chunks and releases once', async () => {
  const path = new URL('../src/ice-pool/reference-fog.js', import.meta.url);
  assert(existsSync(path), 'Pool fog boundary has been adapted');
  const { createFogBoundary } = await import(path);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x789abc);
  const boundary = createFogBoundary(scene, { chunkSize: 16, viewRadius: 1 });
  let geometries = 0, materials = 0;
  boundary.mesh.geometry.addEventListener('dispose', () => geometries++);
  boundary.mesh.material.addEventListener('dispose', () => materials++);
  boundary.update(-2, 3); scene.updateMatrixWorld(true);
  assert.deepEqual(boundary.mesh.position.toArray(), [-24, 3, 56]);
  const ray = new THREE.Raycaster(new THREE.Vector3(-24, 2, 56), new THREE.Vector3(1, 0, 0));
  const hits = ray.intersectObject(boundary.mesh);
  assert(hits.length > 0 && hits[0].distance > 24);
  ray.ray.direction.set(0, 1, 0);
  assert.equal(ray.intersectObject(boundary.mesh).length, 0);
  scene.fog.color.set(0x286a73); boundary.update(-1, 3);
  assert(boundary.mesh.material.color.equals(scene.fog.color));
  boundary.dispose(); boundary.dispose();
  assert.equal(geometries, 1); assert.equal(materials, 1);
  assert(!scene.children.includes(boundary.mesh));
});

// Actual render target descriptors; no GPU allocation or frame-rate claim.
const measured = sizingScene();
const bloomTargets = [measured.bloomPass.renderTargetBright,
  ...measured.bloomPass.renderTargetsHorizontal, ...measured.bloomPass.renderTargetsVertical];
console.log('Balanced 3840x2160 DPR2 target sizes:', JSON.stringify({
  main: [measured.composer.renderTarget1.width, measured.composer.renderTarget1.height],
  bloomColorPixels: bloomTargets.reduce((sum, t) => sum + t.width * t.height, 0),
  bloomDepthPixels: bloomTargets.filter(t => t.depthBuffer).reduce((sum, t) => sum + t.width * t.height, 0),
}));
measured.dispose();
