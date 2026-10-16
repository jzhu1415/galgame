import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { iceQualitySettings } from './ice-quality.js';

// Keep browser-only canvas work lazy: this module can be imported by Node tools.
function filmTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#26363b'; ctx.fillRect(0, 0, 256, 256);
  const gradient = ctx.createLinearGradient(0, 24, 256, 208);
  gradient.addColorStop(0, '#a9c1c2'); gradient.addColorStop(.48, '#405760'); gradient.addColorStop(1, '#c2a995');
  ctx.fillStyle = gradient;
  // A narrow, recognisable corridor with a door and a small human silhouette.
  ctx.beginPath(); ctx.moveTo(67, 24); ctx.lineTo(189, 24); ctx.lineTo(239, 230); ctx.lineTo(18, 230); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#17252a'; ctx.fillRect(94, 61, 67, 143);
  ctx.strokeStyle = 'rgba(214,230,226,.7)'; ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 11, 230); ctx.lineTo(95, 61 + i * 17); ctx.stroke(); }
  ctx.fillStyle = '#101719'; ctx.beginPath(); ctx.arc(136, 126, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(132, 133, 8, 28);
  ctx.fillStyle = 'rgba(230,242,239,.7)'; ctx.fillRect(118, 40, 22, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function silverMaterial(options = 0xc5d9dd, positionalRoughness = .23) {
  const settings = typeof options === 'object'
    ? options
    : { color: options, roughness: positionalRoughness };
  const { color = 0xc5d9dd, roughness = .23 } = settings;
  return new THREE.MeshPhysicalMaterial({ color, metalness: .82, roughness, clearcoat: 1, clearcoatRoughness: .08, reflectivity: .9, emissive: 0x315368, emissiveIntensity: .08, side: THREE.DoubleSide });
}
function makeTray(group, registerLOD) {
  const mat = silverMaterial(0x82979b, .28);
  const supportMat = silverMaterial(0xaebfc0, .24);
  for (const x of [-.39, .39]) for (const z of [-.25, .25]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.018, .024, .68, 6), supportMat);
    post.position.set(x, -.33, z); group.add(post);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.065, .075, .035, 8), supportMat);
    foot.scale.z = .72; foot.position.set(x, -.68, z); group.add(foot);
  }
  const trayGeometry = () => new THREE.LatheGeometry([
    [0, -.0375], [.5, -.0375], [.555, -.022], [.57, .004],
    [.566, .025], [.55, .0375], [.49, .027], [0, .027],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  const base = new THREE.Mesh(trayGeometry(), mat);
  registerLOD(base, trayGeometry, () => new THREE.CylinderGeometry(.52, .57, .075, 12));
  base.scale.z = .68; base.position.y = .06; group.add(base);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.48, .025, 5, 32), silverMaterial(0xd4e2e3, .16));
  lip.rotation.x = Math.PI / 2; lip.scale.set(1, .68, 1); lip.position.y = .105; group.add(lip);
  return [mat];
}
function mirrorOutline(id) {
  const shape = new THREE.Shape();
  if (id === 'footage') {
    shape.moveTo(-.37, -.28); shape.lineTo(.37, -.28); shape.lineTo(.37, .28); shape.lineTo(-.37, .28);
  } else if (id === 'shard') {
    shape.moveTo(-.4, -.24); shape.lineTo(-.16, -.34); shape.lineTo(.02, -.27); shape.lineTo(.36, -.32); shape.lineTo(.4, -.04); shape.lineTo(.26, .31); shape.lineTo(-.1, .34); shape.lineTo(-.38, .2);
  } else {
    shape.moveTo(-.34, -.24); shape.lineTo(.34, -.24); shape.lineTo(.34, .24); shape.lineTo(-.34, .24);
  }
  shape.closePath(); return shape;
}

export function makeMirrorFragment(spec) {
  const group = new THREE.Group(); group.position.copy(spec.position); group.userData.clueId = spec.id;
  const lods = [];
  const surfaceDetails = [];
  const registerLOD = (object, fine, simple) => lods.push({ object, fine, simple });
  const detail = new THREE.Group(); detail.name = 'evidence-closeup-details'; group.add(detail);
  const focusMaterials = [...makeTray(group, registerLOD)];
  const dark = new THREE.MeshStandardMaterial({ color: 0x20282a, metalness: .55, roughness: .4 });
  const darkInset = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, .075, 12), dark);
  darkInset.position.set(0, .14, 0); darkInset.scale.set(1, .65, 1); group.add(darkInset);

  const mirrors = [], reflectionFallbacks = [];
  const fallbackMaterial = silverMaterial({ color: 0xd3e9ed, roughness: .12 });
  for (const side of [1, -1]) {
    // Two small reflective witness tabs flank the physical evidence. This keeps
    // the camera-side mirror behavior without laying a reflective sheet over it.
    const tab = new THREE.Shape(); tab.moveTo(-.09,-.09); tab.lineTo(.09,-.09); tab.lineTo(.09,.09); tab.lineTo(-.09,.09); tab.closePath();
    const mirror = new Reflector(new THREE.ShapeGeometry(spec.id === 'shard' ? mirrorOutline('shard') : tab), { clipBias: .003, textureWidth: 256, textureHeight: 256, color: 0xe6f5f7 });
    if (spec.id === 'shard') {
      mirror.scale.set(.62, .62, 1);
      mirror.position.set(0, side > 0 ? .397 : .39, 0);
      mirror.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      mirror.position.set(.43, .20, side * .035);
      if (side < 0) mirror.rotation.y = Math.PI;
    }
    mirror.userData.clueId = spec.id; group.add(mirror); mirrors.push(mirror);
    // Room maps still give a metallic reflection when live mirror cameras are
    // disabled. This is a real material surface, not a black disabled reflector.
    const fallback = new THREE.Mesh(mirror.geometry, fallbackMaterial);
    fallback.position.copy(mirror.position); fallback.rotation.copy(mirror.rotation); fallback.scale.copy(mirror.scale);
    fallback.userData.clueId = spec.id; fallback.visible = false;
    group.add(fallback); reflectionFallbacks.push(fallback);
  }
  group.userData.mirrorFaces = mirrors;
  group.userData.reflectionFallbacks = reflectionFallbacks;

  // Four recessed screw heads share one draw call, with a single etched-slot
  // line batch. Decorative machining disappears on the two lower presets.
  const screwGeometry = new THREE.CylinderGeometry(.018, .02, .012, 12);
  const screws = new THREE.InstancedMesh(screwGeometry, silverMaterial(0xc1d3d7, .2), 4);
  const slotPoints = [], screwMatrix = new THREE.Matrix4();
  let screwIndex = 0;
  for (const x of [-.32, .32]) for (const z of [-.21, .21]) {
    screwMatrix.makeTranslation(x, .093, z); screws.setMatrixAt(screwIndex++, screwMatrix);
    slotPoints.push(new THREE.Vector3(x - .009, .100, z), new THREE.Vector3(x + .009, .100, z));
  }
  detail.add(screws, new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(slotPoints), new THREE.LineBasicMaterial({ color: 0x3b515a })));

  if (spec.id === 'footage') {
    const frameMat = silverMaterial(0xb4c4c4, .2); focusMaterials.push(frameMat);
    const frameGeometry = () => new RoundedBoxGeometry(.83, .045, .39, 2, .012);
    const frame = new THREE.Mesh(frameGeometry(), frameMat); frame.position.set(0, .34, 0); group.add(frame);
    registerLOD(frame, frameGeometry, () => new THREE.BoxGeometry(.83, .045, .39));
    const texture = filmTexture();
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x172125, roughness: .5 });
    const stripGeometry = () => {
      const shape = new THREE.Shape();
      shape.moveTo(-.39, -.12); shape.lineTo(.39, -.12); shape.lineTo(.39, .12); shape.lineTo(-.39, .12); shape.closePath();
      for (let i = 0; i <= 10; i++) for (const y of [-.105, .105]) {
        const hole = new THREE.Path(); hole.absellipse(-.35 + i * .07, y, .012, .008, 0, Math.PI * 2, true); shape.holes.push(hole);
      }
      return new THREE.ExtrudeGeometry(shape, { depth: .018, bevelEnabled: false, steps: 1, curveSegments: 6 });
    };
    const strip = new THREE.Mesh(stripGeometry(), stripMat); strip.rotation.x = -Math.PI / 2; strip.position.set(0, .38, 0); group.add(strip);
    registerLOD(strip, stripGeometry, () => new THREE.BoxGeometry(.78, .24, .018).translate(0, 0, .009));
    for (let i = 0; i < 3; i++) {
      const imageMat = new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff, side: THREE.DoubleSide });
      const image = new THREE.Mesh(new THREE.PlaneGeometry(.19, .16), imageMat);
      image.position.set(-.24 + i * .24, .403, 0); image.rotation.x = -Math.PI / 2; group.add(image);
    }
    for (const x of [-.42, .42]) for (const z of [-.18, .18]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .2, 6), silverMaterial()); post.position.set(x, .23, z); group.add(post);
    }
  } else if (spec.id === 'shard') {
    const bezelMat = silverMaterial(0xa9bfc3, .18); focusMaterials.push(bezelMat);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(.27, .045, 6, 20), bezelMat); bezel.rotation.x = -Math.PI / 2; bezel.position.set(0, .385, 0); group.add(bezel);
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0xc9e1e4, metalness: .35, roughness: .06, transmission: .48, thickness: .08, clearcoat: 1, side: THREE.DoubleSide }); focusMaterials.push(lensMat);
    const lensShape = mirrorOutline('shard');
    const lensGeometry = () => new THREE.ExtrudeGeometry(lensShape, { depth: .025, bevelEnabled: true, bevelSize: .012, bevelThickness: .008, bevelSegments: 2, steps: 1 });
    const lens = new THREE.Mesh(lensGeometry(), lensMat); lens.rotation.x = -Math.PI / 2; lens.scale.set(.62, .62, 1); lens.position.set(0, .394, 0); group.add(lens);
    lens.name = 'evidence-lens';
    registerLOD(lens, lensGeometry, () => new THREE.ShapeGeometry(lensShape));
    const crackMat = new THREE.LineBasicMaterial({ color: 0xe3eff0, transparent: true, opacity: .82 });
    for (const points of [[[-.02,.66],[.06,.56],[.01,.5],[.12,.4]], [[.03,.56],[-.13,.48],[-.22,.5]]]) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x,y]) => new THREE.Vector3(x,0,-(y-.52)))), crackMat);
      line.name = 'evidence-lens-crack'; line.position.y = .429; group.add(line);
      surfaceDetails.push({ object: line, fineY: .429, simpleY: .401 });
    }
    const hairPoints = [];
    for (let i = 0; i <= 28; i++) { const t = i / 28; hairPoints.push(new THREE.Vector3(-.18 + .36*t, .008*Math.sin(t*9), -.1)); }
    const hair = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hairPoints), 28, .006, 4, false), new THREE.MeshStandardMaterial({ color: 0x111416, roughness: .3 })); group.add(hair);
    hair.position.y = .44; surfaceDetails.push({ object: hair, fineY: .44, simpleY: .414 });
  } else {
    const waxMat = new THREE.MeshPhysicalMaterial({ color: 0x111719, metalness: .45, roughness: .22, clearcoat: .8, clearcoatRoughness: .12 }); focusMaterials.push(waxMat);
    const diskGeometry = () => new THREE.LatheGeometry([[0, -.0425], [.27, -.0425], [.3, -.025], [.3, .025], [.28, .0425], [0, .0425]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
    const disk = new THREE.Mesh(diskGeometry(), waxMat); disk.position.set(0, .205, 0); group.add(disk);
    registerLOD(disk, diskGeometry, () => new THREE.CylinderGeometry(.28, .3, .085, 16));
    for (const r of [.12,.17,.22,.265]) { const groove = new THREE.Mesh(new THREE.TorusGeometry(r, .004, 3, 32), new THREE.MeshStandardMaterial({ color: 0x647174, metalness: .6, roughness: .3 })); groove.rotation.x = Math.PI/2; groove.position.y = .25; group.add(groove); }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.012,8), silverMaterial()); pin.position.set(0,.253,0); group.add(pin);
    // A dark wedge makes a visible interrupted section in the recording grooves.
    const notch = new THREE.Mesh(new THREE.BoxGeometry(.13,.014,.09), new THREE.MeshBasicMaterial({ color: 0x20282a })); notch.position.set(.23,.258,.12); notch.rotation.y = -.65; group.add(notch);
    const waveMat = silverMaterial(0x91a8aa,.31);
    for (let i=0;i<7;i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.025,.018,.06+Math.abs(Math.sin(i*1.2))*.12),waveMat); bar.position.set(-.2+i*.067,.29,-.06); group.add(bar); }
  }
  group.userData.focusMaterials = focusMaterials;
  const transmissions = new Map();
  group.traverse(object => {
    for (const material of [].concat(object.material || [])) if (material.isMeshPhysicalMaterial) transmissions.set(material, material.transmission);
  });
  let simple = false;
  group.userData.setQuality = preset => {
    const settings = iceQualitySettings(preset);
    if (simple !== settings.simpleGeometry) {
      simple = settings.simpleGeometry;
      for (const { object, fine, simple: buildSimple } of lods) {
        const previous = object.geometry;
        object.geometry = simple ? buildSimple() : fine(); previous.dispose();
      }
    }
    detail.visible = !simple;
    for (const { object, fineY, simpleY } of surfaceDetails) object.position.y = simple ? simpleY : fineY;
    for (const mirror of mirrors) mirror.visible = settings.liveMirrors;
    for (const fallback of reflectionFallbacks) fallback.visible = !settings.liveMirrors;
    for (const [material, original] of transmissions) {
      const next = settings.refraction ? original : 0;
      if (material.transmission !== next) { material.transmission = next; material.needsUpdate = true; }
    }
  };
  return group;
}

export function makeNote(position) {
  const group = new THREE.Group(); group.position.copy(position);
  const texture = noteTexture();
  const geometry = new THREE.PlaneGeometry(.72,.54,12,8);
  const pos = geometry.attributes.position;
  for (let i=0;i<pos.count;i++) { const x=pos.getX(i), y=pos.getY(i); pos.setZ(i, .018*Math.sin((x+.36)*13) + .012*Math.sin((y+.27)*17) + (Math.abs(x)>.31 ? .025 : 0)); }
  geometry.computeVertexNormals();
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: .93, side: THREE.DoubleSide });
  const paper = new THREE.Mesh(geometry,paperMat); paper.rotation.x=-Math.PI/2; paper.position.y=.12; group.add(paper);
  const paperEdge = new THREE.Mesh(new THREE.BoxGeometry(.52,.008,.008),silverMaterial(0x66777a,.38));
  paperEdge.position.set(0,.13,-.04); group.add(paperEdge);
  const paperweight = new THREE.Mesh(new THREE.SphereGeometry(.105,10,7),new THREE.MeshPhysicalMaterial({color:0xc2dadd,metalness:.65,roughness:.12,clearcoat:1,transparent:true,opacity:.9})); paperweight.scale.set(1,.42,.78); paperweight.position.set(.16,.19,-.18); group.add(paperweight);
  group.userData.focusMaterials=[paperMat,paperweight.material];
  return group;
}

function noteTexture() {
  if (typeof document === 'undefined') return null;
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=384;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#c8c1a8'; ctx.fillRect(0,0,512,384);
  ctx.fillStyle='rgba(67,102,106,.13)';
  for (const [x,y,rx,ry] of [[92,286,52,33],[396,86,43,28],[321,306,35,22]]) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.3,0,Math.PI*2);ctx.fill(); }
  ctx.fillStyle='#343c39'; ctx.strokeStyle='#343c39'; ctx.lineWidth=5;
  // Ordinary field notes, rather than the removed direction-code symbols.
  ctx.font='600 30px serif'; ctx.fillText('MIRROR HALL / 17',64,96);
  for(const [y,width] of [[150,350],[192,290],[234,325],[276,215]]) { ctx.beginPath();ctx.moveTo(64,y);ctx.lineTo(64+width,y+3);ctx.stroke(); }
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; return texture;
}

export function makeRouteMarker() {
  const group = new THREE.Group();
  const pulseMat = new THREE.MeshPhysicalMaterial({color:0x9fbec1,metalness:.82,roughness:.16,transparent:true,opacity:.52,side:THREE.DoubleSide,clearcoat:1});
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.37,.035,5,32),pulseMat); ring.rotation.x=Math.PI/2; ring.position.y=.045; group.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(.25,.009,4,24),silverMaterial(0x607579,.22)); inner.rotation.x=Math.PI/2; inner.position.y=.047; group.add(inner);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(.035,.018,.36),silverMaterial(0xb3c8ca,.18)); shaft.position.set(0,.055,0); group.add(shaft);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(.09,.19,5),silverMaterial(0xd1e0e1,.16)); arrow.rotation.x=Math.PI/2; arrow.position.set(0,.06,.25); group.add(arrow);
  group.userData.pulseMaterial=pulseMat; group.userData.focusMaterials=[pulseMat,inner.material,shaft.material,arrow.material];
  return group;
}
