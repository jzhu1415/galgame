import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createIceChapterLayer } from '../src/ice-pool/ice-chapter-layer.js';
import { ICE_LAYOUT } from '../src/ice-pool/ice-progression.js';
import { TestElement, noop } from './ice-lifecycle-test-utils.mjs';
import * as performanceTools from '../src/ice-pool/reference-performance.js';

const mapSource = readFileSync(new URL('../src/ice-pool/reference-map.js', import.meta.url), 'utf8');
const mapAst = ts.createSourceFile('map.js', mapSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const definitions = ['pushQuad', 'pushWall', 'makeGeometry', 'makeOutput', 'buildChunk'].map(name =>
  mapAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(mapAst)).join('\n');

function setup() {
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, querySelector: () => null, querySelectorAll: () => [],
    pointerLockElement: null, createElement: tag => new TestElement(tag) });
  globalThis.window = Object.assign(new EventTarget(), { devicePixelRatio: 1, location: { origin: 'https://game.example' },
    parent: { postMessage: noop }, matchMedia: () => ({ matches: false }) });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
  const layer = createIceChapterLayer({ scene, camera, canvas: new TestElement('canvas'), columnAt: () => ({ solid: false, level: 0, ceiling: 5 }) });
  layer.setInit({ found: ['note'] });
  camera.position.set(ICE_LAYOUT.footage.x, 1.7, ICE_LAYOUT.footage.z + 2);
  camera.lookAt(ICE_LAYOUT.footage.x, 1, ICE_LAYOUT.footage.z);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  return { scene, camera, layer };
}

// Execute the installed Three.js Reflector camera/matrix logic. Only GPU work is
// replaced; the renderer boundary counts actual requests to render a reflection.
function gpuBoundary() {
  let target = null, captures = 0;
  return {
    xr: { enabled: false }, shadowMap: { autoUpdate: false },
    state: { buffers: { depth: { setMask: noop } }, viewport: noop },
    autoClear: true, getRenderTarget: () => target, setRenderTarget: next => { target = next; },
    render: () => { captures++; }, captures: () => captures,
  };
}

test('a visible clue mirror captures once across transmission and final passes, then refreshes next frame', () => {
  const { scene, camera, layer } = setup();
  const renderer = gpuBoundary();
  try {
    layer.update(.016, 1);
    const exhibit = scene.children.find(object => object.userData.clueId === 'footage');
    const mirror = exhibit.userData.mirrorFaces.find(face => face.visible);
    assert(mirror, 'The current evidence keeps a live mirror');
    mirror.onBeforeRender(renderer, scene, camera);
    mirror.onBeforeRender(renderer, scene, camera);
    assert.equal(renderer.captures(), 1, 'Transmission and final opaque passes must share the same reflection capture');
    camera.position.x += .1;
    camera.updateMatrixWorld(true);
    layer.update(.016, 1.016);
    mirror.onBeforeRender(renderer, scene, camera);
    assert.equal(renderer.captures(), 2, 'The next frame follows the player without lowering mirror cadence');
    const secondary = camera.clone(); secondary.position.x += .2; secondary.updateMatrixWorld(true);
    mirror.onBeforeRender(renderer, scene, secondary);
    mirror.onBeforeRender(renderer, scene, camera);
    assert.equal(renderer.captures(), 4, 'A different view must not overwrite a texture then leave the main view stale');
  } finally { layer.dispose(); }
});

test('leaving the hall releases every instance buffer once, including water-crystal batches and prop screws', () => {
  const { scene, layer } = setup();
  const instances = [];
  scene.traverse(object => {
    if (!object.isInstancedMesh) return;
    const record = { name: object.name || 'prop-screws', disposed: 0 };
    object.addEventListener('dispose', () => record.disposed++); instances.push(record);
  });
  assert(instances.length > 3);
  layer.dispose(); layer.dispose();
  assert(instances.every(record => record.disposed === 1), `Unreleased instance buffers: ${JSON.stringify(instances.filter(record => record.disposed !== 1))}`);
});

test('reference Reflector really issues two captures for two passes without the hall guard', () => {
  const mirror = new Reflector(new THREE.PlaneGeometry());
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const renderer = gpuBoundary();
  scene.add(mirror); camera.position.z = 5;
  camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  mirror.onBeforeRender(renderer, scene, camera); mirror.onBeforeRender(renderer, scene, camera);
  assert.equal(renderer.captures(), 2, 'Characterize the installed r185 duplicate opaque callback cost');
  mirror.geometry.dispose(); mirror.dispose();
});

test('real chunk builder preserves geometry and bounds without recomposing static transforms in each render pass', () => {
  const scene = new THREE.Scene();
  const columnAt = (x, z) => ({ solid: x < 0 || x > 15 || z < 0 || z > 15, level: 0, ceiling: 5 });
  const build = new Function('THREE', 'scene', 'columnAt', 'freezeStaticWorld', `
    const CHUNK_SIZE=16, MODULE_SIZE=15, ROOM_LIGHTING_ENABLED=false;
    const floorMaterial=new THREE.MeshStandardMaterial(), wallMaterial=new THREE.MeshStandardMaterial(), glowMaterial=new THREE.MeshBasicMaterial();
    const cornerAo=()=>1;
    ${definitions}
    return buildChunk;
  `)(THREE, scene, columnAt, performanceTools.freezeStaticWorld);
  const chunk = build(0, 0);
  scene.updateMatrixWorld(true);
  const matrices = new Map(); let compositions = 0, products = 0;
  chunk.traverse(object => {
    matrices.set(object, object.matrixWorld.clone());
    const compose = object.matrix.compose, multiply = object.matrixWorld.multiplyMatrices;
    object.matrix.compose = function (...args) { compositions++; return compose.apply(this, args); };
    object.matrixWorld.multiplyMatrices = function (...args) { products++; return multiply.apply(this, args); };
  });
  const before = new THREE.Box3().setFromObject(chunk);
  const moving = new THREE.Object3D(); scene.add(moving); moving.position.x = 9;
  for (let pass = 0; pass < 6; pass++) scene.updateMatrixWorld(true);
  assert.equal(compositions, 0, 'Static chunk transforms should not be recomposed for each reflection and main pass');
  assert.equal(products, 0, 'Static chunk world matrices should not be multiplied again for each camera');
  assert.equal(moving.matrixWorld.elements[12], 9, 'Dynamic objects outside chunks still update');
  assert(new THREE.Box3().setFromObject(chunk).equals(before), 'World-space chunk bounds remain unchanged');
  for (const [object, matrix] of matrices) assert(object.matrixWorld.equals(matrix));
  assert.equal(chunk.userData.geometries.length, 3, 'The room keeps floor, ceiling and wall batches');
  const ray = new THREE.Raycaster(new THREE.Vector3(7.5, 2, 7.5), new THREE.Vector3(0, -1, 0));
  assert(ray.intersectObject(chunk, true).length > 0, 'Frozen matrices still support ground intersections');
  for (const geometry of chunk.userData.geometries) geometry.dispose();
  chunk.traverse(object => object.material?.dispose());
});

test('the actual render gate maintains 30 fps at 60/120/144 Hz without drift, and keeps menus throttled', () => {
  // Exercise the real production early-return path up to GPU work.
  const gate = mapSource.slice(mapSource.indexOf('function render(frameTime'), mapSource.indexOf('  const delta = Math.min(clock.getDelta()', mapSource.indexOf('function render(frameTime')));
  const qualitySettings = { maxFps: 30 }, controls = { isLocked: true }, document = { hidden: false };
  const makeGate = () => new Function('FrameCadence', 'qualitySettings', 'controls', 'document', `
    const frameCadence = FrameCadence ? new FrameCadence() : null;
    let lastRenderedAt=-Infinity;
    const iceChapterLayer={isStoryPaused:()=>false}, touchPlaying=false, PAUSED_RENDER_FPS=12;
    const requestAnimationFrame=()=>{};
    ${gate}
      return true;
    }
    return render;
  `)(performanceTools.FrameCadence, qualitySettings, controls, document);
  for (const hz of [60, 120, 144]) {
    const render = makeGate(); let frames = 0;
    for (let i = 1; i <= hz * 10; i++) if (render(i * 1000 / hz)) frames++;
    assert(Math.abs(frames - 300) <= 1, `${hz} Hz should produce about 300 frames in ten seconds, got ${frames}`);
  }
  qualitySettings.maxFps = undefined;
  const render = makeGate();
  for (let i = 1; i <= 60; i++) assert(render(i * 1000 / 60), 'High and Balanced keep unrestricted cadence');
  qualitySettings.maxFps = 30; controls.isLocked = false;
  let menuFrames = 0;
  for (let i = 1; i <= 600; i++) if (render(1000 + i * 1000 / 60)) menuFrames++;
  assert(Math.abs(menuFrames - 120) <= 1, 'Menus retain the 12 fps budget');
  document.hidden = true; assert(!render(20_000), 'Hidden pages still skip all rendering');
});
