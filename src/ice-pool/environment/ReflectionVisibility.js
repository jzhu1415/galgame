import * as THREE from 'three';

const CARDINAL_NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function moduleId(moduleX, moduleZ) {
  return `Room_${moduleX}_${moduleZ}`;
}

function chunkBounds(chunksMap, chunkSize) {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const key of chunksMap?.keys?.() ?? []) {
    const [chunkX, chunkZ] = String(key).split(':').map(Number);
    if (!Number.isFinite(chunkX) || !Number.isFinite(chunkZ)) continue;
    minX = Math.min(minX, chunkX * chunkSize);
    minZ = Math.min(minZ, chunkZ * chunkSize);
    maxX = Math.max(maxX, (chunkX + 1) * chunkSize);
    maxZ = Math.max(maxZ, (chunkZ + 1) * chunkSize);
  }
  return Number.isFinite(minX) ? { minX, minZ, maxX, maxZ } : null;
}

function openInterval(a, b) {
  if (a.solid || b.solid) return null;
  const bottom = Math.max(Number(a.level), Number(b.level));
  const top = Math.min(Number(a.ceiling), Number(b.ceiling));
  return top - bottom > 0.25 ? { bottom, top } : null;
}

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

/**
 * Coarse indoor visibility metadata. It deliberately does not replace GPU depth:
 * rooms and portals reject impossible work, while walls and decks still decide
 * pixel-level and partial occlusion in the reflection render pass.
 */
export class ReflectionRoomGraph {
  constructor(sampleCell, {
    moduleSize = 15,
    chunkSize = 16,
    waterLevel = -0.12,
    maxPortalDepth = 4,
    staticCells = false,
  } = {}) {
    this.sampleCell = sampleCell;
    this.moduleSize = moduleSize;
    this.chunkSize = chunkSize;
    this.waterLevel = waterLevel;
    this.maxPortalDepth = maxPortalDepth;
    this.staticCells = staticCells;
    this.rooms = new Map();
    this.portals = [];
    this.revision = 0;
    this._viewProjection = new THREE.Matrix4();
    this._frustum = new THREE.Frustum();
  }

  rebuild(chunksMap) {
    const bounds = chunkBounds(chunksMap, this.chunkSize);
    // Only opt in for immutable procedural maps. Retain loaded rooms, never an
    // unbounded history; callers with editable cells still get a full rebuild.
    const previousRooms = this.rooms;
    this.rooms = new Map();
    this.portals.length = 0;
    this.revision += 1;
    if (!bounds) return this;
    const minModuleX = Math.floor(bounds.minX / this.moduleSize);
    const minModuleZ = Math.floor(bounds.minZ / this.moduleSize);
    const maxModuleX = Math.floor((bounds.maxX - 1) / this.moduleSize);
    const maxModuleZ = Math.floor((bounds.maxZ - 1) / this.moduleSize);

    for (let moduleZ = minModuleZ; moduleZ <= maxModuleZ; moduleZ += 1) {
      for (let moduleX = minModuleX; moduleX <= maxModuleX; moduleX += 1) {
        const id = moduleId(moduleX, moduleZ);
        const retained = this.staticCells && previousRooms.get(id);
        if (retained) {
          retained.portals.length = 0;
          this.rooms.set(id, retained);
          continue;
        }
        const startX = moduleX * this.moduleSize;
        const startZ = moduleZ * this.moduleSize;
        let minY = Infinity;
        let maxY = -Infinity;
        let openCells = 0;
        const wetBounds = new THREE.Box3();
        let hasWater = false;
        for (let z = startZ; z < startZ + this.moduleSize; z += 1) {
          for (let x = startX; x < startX + this.moduleSize; x += 1) {
            const cell = this.sampleCell(x, z);
            if (cell.solid) continue;
            openCells += 1;
            minY = Math.min(minY, Number(cell.level));
            maxY = Math.max(maxY, Number(cell.ceiling));
            if (this.waterLevel - Number(cell.level) <= 0.08) continue;
            wetBounds.min.set(Math.min(wetBounds.min.x, x), this.waterLevel - 0.04,
              Math.min(wetBounds.min.z, z));
            wetBounds.max.set(Math.max(wetBounds.max.x, x + 1), this.waterLevel + 0.04,
              Math.max(wetBounds.max.z, z + 1));
            hasWater = true;
          }
        }
        if (!openCells) continue;
        this.rooms.set(id, {
          id,
          moduleX,
          moduleZ,
          bounds: new THREE.Box3(
            new THREE.Vector3(startX, minY, startZ),
            new THREE.Vector3(startX + this.moduleSize, maxY, startZ + this.moduleSize),
          ),
          objects: [],
          walls: [],
          portals: [],
          reflectionSurfaces: hasWater ? [wetBounds] : [],
          reflectionProbe: null,
          environmentMap: null,
        });
      }
    }

    for (const room of this.rooms.values()) {
      this._connectBoundary(room, room.moduleX + 1, room.moduleZ, 'x');
      this._connectBoundary(room, room.moduleX, room.moduleZ + 1, 'z');
    }
    return this;
  }

  _connectBoundary(room, neighborX, neighborZ, axis) {
    const neighbor = this.rooms.get(moduleId(neighborX, neighborZ));
    if (!neighbor) return;
    const fixed = axis === 'x'
      ? (room.moduleX + 1) * this.moduleSize
      : (room.moduleZ + 1) * this.moduleSize;
    const alongStart = axis === 'x'
      ? room.moduleZ * this.moduleSize
      : room.moduleX * this.moduleSize;
    let run = null;
    const finishRun = () => {
      if (!run) return;
      const min = new THREE.Vector3();
      const max = new THREE.Vector3();
      if (axis === 'x') {
        min.set(fixed - 0.025, run.bottom, run.start);
        max.set(fixed + 0.025, run.top, run.end);
      } else {
        min.set(run.start, run.bottom, fixed - 0.025);
        max.set(run.end, run.top, fixed + 0.025);
      }
      const normal = axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
      const portal = {
        id: `Portal_${room.id}_${neighbor.id}_${this.portals.length}`,
        roomA: room.id,
        roomB: neighbor.id,
        bounds: new THREE.Box3(min, max),
        plane: new THREE.Plane(normal, -fixed),
      };
      room.portals.push(portal);
      neighbor.portals.push(portal);
      this.portals.push(portal);
      run = null;
    };

    for (let offset = 0; offset < this.moduleSize; offset += 1) {
      const along = alongStart + offset;
      const a = axis === 'x'
        ? this.sampleCell(fixed - 1, along)
        : this.sampleCell(along, fixed - 1);
      const b = axis === 'x'
        ? this.sampleCell(fixed, along)
        : this.sampleCell(along, fixed);
      const interval = openInterval(a, b);
      if (!interval) {
        finishRun();
        continue;
      }
      if (run && (Math.abs(run.bottom - interval.bottom) > 0.05
        || Math.abs(run.top - interval.top) > 0.05)) finishRun();
      if (!run) run = { start: along, end: along + 1, ...interval };
      else run.end = along + 1;
    }
    finishRun();
  }

  roomAt(position) {
    if (!position) return null;
    const moduleX = Math.floor(Number(position.x) / this.moduleSize);
    const moduleZ = Math.floor(Number(position.z) / this.moduleSize);
    return this.rooms.get(moduleId(moduleX, moduleZ)) ?? null;
  }

  cameraFrustum(camera) {
    camera.updateMatrixWorld();
    this._viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._viewProjection);
    return this._frustum;
  }

  visibleRooms(camera, maxDepth = this.maxPortalDepth) {
    const start = this.roomAt(camera?.position);
    if (!start || !camera) return new Set();
    const frustum = this.cameraFrustum(camera);
    const visible = new Set([start.id]);
    const queue = [{ room: start, depth: 0 }];
    for (let index = 0; index < queue.length; index += 1) {
      const { room, depth } = queue[index];
      if (depth >= maxDepth) continue;
      for (const portal of room.portals) {
        if (!frustum.intersectsBox(portal.bounds)) continue;
        const nextId = portal.roomA === room.id ? portal.roomB : portal.roomA;
        if (visible.has(nextId)) continue;
        const next = this.rooms.get(nextId);
        if (!next) continue;
        visible.add(nextId);
        queue.push({ room: next, depth: depth + 1 });
      }
    }
    return visible;
  }

  visibleWater(camera, visibleRooms) {
    const frustum = this.cameraFrustum(camera);
    let distance = Infinity;
    let count = 0;
    for (const id of visibleRooms) {
      const room = this.rooms.get(id);
      for (const surface of room?.reflectionSurfaces ?? []) {
        if (!frustum.intersectsBox(surface)) continue;
        count += 1;
        distance = Math.min(distance, surface.distanceToPoint(camera.position));
      }
    }
    return { count, distance };
  }
}

export function withReflectionOccluders(materials, render) {
  const snapshots = [];
  for (const material of materials.flatMap(materialList)) {
    if (!material || snapshots.some(entry => entry.material === material)) continue;
    snapshots.push({
      material,
      side: material.side,
      depthTest: material.depthTest,
      depthWrite: material.depthWrite,
    });
    const changed = material.side !== THREE.DoubleSide
      || material.depthTest !== true || material.depthWrite !== true;
    material.side = THREE.DoubleSide;
    material.depthTest = true;
    material.depthWrite = true;
    if (changed) material.needsUpdate = true;
  }
  try {
    return render();
  } finally {
    for (const snapshot of snapshots) {
      snapshot.material.side = snapshot.side;
      snapshot.material.depthTest = snapshot.depthTest;
      snapshot.material.depthWrite = snapshot.depthWrite;
      if (snapshot.side !== THREE.DoubleSide
        || snapshot.depthTest !== true || snapshot.depthWrite !== true) {
        snapshot.material.needsUpdate = true;
      }
    }
  }
}

export class ReflectionCaptureController {
  constructor({ reflector, graph, water, captureSeal, occluderMaterials = [] }) {
    this.reflector = reflector;
    this.graph = graph;
    this.water = water;
    this.captureSeal = captureSeal;
    this.occluderMaterials = occluderMaterials;
    this._visibilityPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
    this._visibilityQuaternion = new THREE.Quaternion();
    this._visibilityRevision = -1;
    this.currentRoom = null;
    this.reflectionRoom = null;
    this.mainVisibleRooms = new Set();
    this.reflectionVisibleRooms = new Set();
    this.visibleWaterCount = 0;
    this.visibleWaterDistance = Infinity;
    this.captureMs = 0;
    this.drawCalls = 0;
    this.triangles = 0;
    this.reflectionObjects = 0;
    this.occluders = 0;
    for (const material of occluderMaterials.flatMap(materialList)) {
      if (!material) continue;
      material.side = THREE.DoubleSide;
      material.depthTest = true;
      material.depthWrite = true;
    }
  }

  prepare(camera) {
    const positionChanged = this._visibilityPosition.distanceToSquared(camera.position) > 0.04 ** 2;
    const rotationChanged = 1 - Math.abs(this._visibilityQuaternion.dot(camera.quaternion)) > 0.00005;
    if (!positionChanged && !rotationChanged && this._visibilityRevision === this.graph.revision) {
      return this.visibleWaterCount > 0;
    }
    this._visibilityPosition.copy(camera.position);
    this._visibilityQuaternion.copy(camera.quaternion);
    this._visibilityRevision = this.graph.revision;
    this.currentRoom = this.graph.roomAt(camera.position)?.id ?? null;
    this.mainVisibleRooms = this.graph.visibleRooms(camera);
    const water = this.graph.visibleWater(camera, this.mainVisibleRooms);
    this.visibleWaterCount = water.count;
    this.visibleWaterDistance = water.distance;
    return water.count > 0;
  }

  capture(renderer, scene, camera, debugGroup = null, collectDebugStats = false) {
    const waterVisible = this.water.visible;
    const sealVisible = this.captureSeal.visible;
    const debugVisible = debugGroup?.visible;
    this.water.visible = false;
    this.captureSeal.visible = true;
    if (debugGroup) debugGroup.visible = false;
    const startedAt = collectDebugStats ? performance.now() : 0;
    try {
      this.reflector.onBeforeRender(renderer, scene, camera);
      if (collectDebugStats) {
        this.captureMs = performance.now() - startedAt;
        this.drawCalls = renderer.info.render.calls;
        this.triangles = renderer.info.render.triangles;
        const reflectionCamera = this.reflector.getReflectionCamera(camera);
        this.reflectionRoom = this.graph.roomAt(reflectionCamera.position)?.id ?? null;
        this.reflectionVisibleRooms = this.graph.visibleRooms(reflectionCamera);
        this._countScene(scene, debugGroup);
      }
    } finally {
      this.captureSeal.visible = sealVisible;
      this.water.visible = waterVisible;
      if (debugGroup) debugGroup.visible = debugVisible;
    }
  }

  _countScene(scene, debugGroup) {
    this.reflectionObjects = 0;
    this.occluders = 0;
    scene.traverseVisible((object) => {
      if (object === this.water || object === debugGroup || debugGroup?.getObjectById(object.id)) return;
      if (!object.isMesh && !object.isPoints && !object.isLine) return;
      this.reflectionObjects += object.isInstancedMesh ? object.count : 1;
      if (!object.isMesh) return;
      const materials = materialList(object.material);
      if (materials.some(material => material?.depthTest && material?.depthWrite
        && material?.transparent !== true)) this.occluders += 1;
    });
  }
}

export class ReflectionDebugView {
  constructor(scene, reflectionTexture, graph) {
    this.graph = graph;
    this.reflectionTexture = reflectionTexture;
    this.group = new THREE.Group();
    this.group.name = 'ReflectionVisibilityDebug';
    this.group.renderOrder = 1000;
    scene.add(this.group);
    this.roomHelpers = new Map();
    this.portalHelpers = [];
    this.panel = null;
    this.previewScene = null;
    this.previewCamera = null;
    this.preview = null;
    this.disposed = false;
    this.enabled = false;
    const initiallyEnabled = new URLSearchParams(window.location.search).get('reflectionDebug') === '1';
    this.onKeyDown = (event) => {
      if (event.code !== 'F8') return;
      event.preventDefault();
      this.setEnabled(!this.enabled);
    };
    window.addEventListener('keydown', this.onKeyDown);
    this.setEnabled(initiallyEnabled);
  }

  _ensureUi() {
    if (this.panel) return;
    this.panel = document.createElement('pre');
    this.panel.id = 'reflection-debug';
    Object.assign(this.panel.style, {
      position: 'fixed', left: '12px', top: '12px', zIndex: '1000', margin: '0',
      padding: '10px 12px', color: '#c9f6ff', background: 'rgba(4, 18, 24, 0.82)',
      border: '1px solid rgba(128, 226, 255, 0.52)', borderRadius: '6px',
      font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
      pointerEvents: 'none', whiteSpace: 'pre-wrap', maxWidth: '42vw',
    });
    document.body.append(this.panel);

    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    this.previewCamera.position.z = 1;
    const preview = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.34),
      new THREE.MeshBasicMaterial({ map: this.reflectionTexture, depthTest: false, depthWrite: false,
        toneMapped: false }),
    );
    preview.position.set(0.68, -0.78, 0);
    this.previewScene.add(preview);
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(preview.geometry),
      new THREE.LineBasicMaterial({ color: 0x79dff4, depthTest: false }),
    );
    preview.add(border);
    this.preview = preview;
  }

  setEnabled(enabled) {
    if (this.disposed) return;
    const changed = this.enabled !== Boolean(enabled);
    this.enabled = Boolean(enabled);
    if (this.enabled) this._ensureUi();
    this.group.visible = this.enabled;
    if (this.panel) this.panel.hidden = !this.enabled;
    if (changed) this.rebuild();
  }

  rebuild() {
    for (const child of [...this.group.children]) {
      child.geometry?.dispose?.();
      child.material?.dispose?.();
      this.group.remove(child);
    }
    this.roomHelpers.clear();
    this.portalHelpers.length = 0;
    // Hidden Box3Helpers still occupy resources and participate in world-matrix
    // updates. Build them only while the F8 overlay is actually in use.
    if (!this.enabled) return;
    for (const room of this.graph.rooms.values()) {
      const helper = new THREE.Box3Helper(room.bounds, 0x48616b);
      helper.userData.roomId = room.id;
      this.group.add(helper);
      this.roomHelpers.set(room.id, helper);
    }
    for (const portal of this.graph.portals) {
      const helper = new THREE.Box3Helper(portal.bounds, 0xffbf5f);
      this.group.add(helper);
      this.portalHelpers.push(helper);
    }
  }

  update(capture) {
    if (!this.enabled) return;
    for (const [id, helper] of this.roomHelpers) {
      helper.material.color.set(id === capture.reflectionRoom
        ? 0x65ff8a : capture.reflectionVisibleRooms.has(id) ? 0x5bd8ff : 0x48616b);
    }
    const visibleRooms = [...capture.reflectionVisibleRooms];
    this.panel.textContent = [
      'REFLECTION DEBUG · F8',
      `Player Room: ${capture.currentRoom ?? 'None'}`,
      `Reflection Room: ${capture.reflectionRoom ?? 'None'}`,
      `Reflection Visible Rooms: ${visibleRooms.join(', ') || 'None'}`,
      `Reflection objects: ${capture.reflectionObjects}`,
      `Occluders: ${capture.occluders}`,
      `Reflection pass: ${capture.captureMs.toFixed(2)} ms`,
      `Draw calls / triangles: ${capture.drawCalls} / ${capture.triangles}`,
      `Visible water surfaces: ${capture.visibleWaterCount}`,
      'RenderTarget preview: lower-right',
    ].join('\n');
  }

  render(renderer) {
    if (!this.enabled) return;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.previewScene, this.previewCamera);
    renderer.autoClear = autoClear;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.enabled = false;
    this.rebuild();
    window.removeEventListener('keydown', this.onKeyDown);
    this.group.removeFromParent();
    this.panel?.remove();
    this.previewScene?.traverse((object) => {
      object.geometry?.dispose?.();
      for (const material of materialList(object.material)) material?.dispose?.();
    });
    this.previewScene?.clear();
    this.roomHelpers.clear();
    this.portalHelpers.length = 0;
    this.graph = null;
    this.reflectionTexture = null;
    this.panel = null;
    this.previewScene = null;
    this.previewCamera = null;
    this.preview = null;
    this.onKeyDown = null;
  }
}

export { moduleId as reflectionRoomId };
