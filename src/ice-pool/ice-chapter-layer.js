import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const MESSAGE_SOURCE = 'naiwa-ice-map';
const ALLOWED_CLUES = new Set(['footage', 'shard', 'echo', 'note', 'routeOne', 'route']);
const CORE_POSITION = new THREE.Vector3(7.5, 1.35, 82.5);
const ROUTE_LENGTH = 5.2;
const ROUTES = [['forward', 'left', 'forward', 'left'], ['right', 'forward', 'right', 'forward']];
const CLUES = [
  {
    id: 'footage', position: new THREE.Vector3(7.5, 0.72, 22.5), color: 0xb9dbe6,
    zh: '监控胶片 · 17号', en: 'Surveillance film · 17',
    clue: { zh: '胶片最后一格里，门外的人影比监控时间早一秒。', en: 'In the final frame, the shadow appears one second before the clock.' },
    evidence: { zh: '一段被冰水咬蚀的 8 毫米胶片，金属片框仍留着两帧倒置的走廊影像。', en: 'An ice-bitten 8 mm film strip. Two inverted corridor frames remain in its steel carrier.' },
  },
  {
    id: 'shard', position: new THREE.Vector3(7.5, 0.72, 42.5), color: 0x9fd4e3,
    zh: '镜片 · 无编号', en: 'Mirror lens · unmarked',
    clue: { zh: '正面映出空走廊，背面却沾着一根新鲜的黑发。', en: 'The face reflects an empty hall; a fresh dark hair clings to its back.' },
    evidence: { zh: '一块凹面镜片嵌在碎镜框内。银层脱落处留下指纹状擦痕，背面粘着一缕黑发。', en: 'A concave lens in a fractured bezel. Finger-shaped wipes cross the worn silvering; a dark hair is caught on its back.' },
  },
  {
    id: 'echo', position: new THREE.Vector3(7.5, 0.72, 62.5), color: 0xc1dce7,
    zh: '声纹蜡片 · 02秒', en: 'Voiceprint wax · 02 sec',
    clue: { zh: '两段声纹完全重合，只有第二个心跳没有回声。', en: 'The two voiceprints overlap exactly. Only the second heartbeat has no echo.' },
    evidence: { zh: '一枚裂开的黑色录音蜡片压着银镜碎屑。波纹刻痕在第二次心跳处突然中断。', en: 'A cracked black recording wafer pressed against silvered glass. Its etched waveform stops at the second heartbeat.' },
  },
];

const COPY = {
  zh: {
    title: '冰封镜馆 · 第二层',
    subtitle: '镜子记住了每一次经过。先找到入口附近的取证便笺。',
    guide: '靠近物证并按 E 收取', guideTouch: '靠近物证后点击「查看物证」',
    notePrompt: '入口附近有一张压在碎镜下的纸条。它记录了通往镜心的四步口令。',
    noteAction: '读取纸条', noteTitle: '纸条已展开',
    routeStart: '符号已解读：前 · 左 · 前 · 左。按顺序走到四个地面镜记，每一步都要实际移动。',
    routeStep: ['向前走到第一枚镜记', '向左走到第二枚镜记', '再向前走到第三枚镜记', '再向左走到最后一枚镜记'],
    routeWrong: '方向不对，镜面没有回应。回到这一步的正确方向再走。',
    routeDone: '两段镜记已走完。继续寻找远处的镜面物证。', routeProgress: '路线',
    secondCodeTitle: '第二枚碎片 · 密码', secondCodeKey: '第一段尽头的镜片刻着「右 · 前 · 右 · 前」。依次输入，开启第二段路。',
    secondCodeFound: '第一段完成。镜片上出现第二道密码：右 · 前 · 右 · 前。', secondCodeSolved: '第二段密码已解开，继续沿镜记走。',
    secondRouteStart: '第二段：右 · 前 · 右 · 前。请按地面镜记实际行走。',
    secondRouteStep: ['向右走到第一枚镜记', '向前走到第二枚镜记', '再向右走到第三枚镜记', '再向前走到最后一枚镜记'],
    navTitle: '镜馆地图', navYou: '你', navGoal: '当前目标', navCipher: '破解第二枚碎片', navRoute: '地面镜记', navCore: '中央镜心',
    core: '三件镜面物证与两段路线均已确认。靠近镜心并按 E。',
    coreTouch: '靠近镜心后点击「进入镜心」', collect: '查看物证', enter: '进入镜心',
    collected: '已归档', locked: '镜心仍封闭：需要三件物证与完整路线。', exit: '离开镜馆',
    hint: 'WASD / 方向键移动 · 触屏摇杆 · E 查看 · Esc 离开',
    noteDecode: '便笺密码', noteCode: '○　●　○　●', noteKey: '霜印旁的注记：空心圆代表「前」，实心圆代表「左」。',
    noteAnswer: '解码后：前 · 左 · 前 · 左', notePhysical: '薄纸被水浸透，折痕间夹着一枚发暗的镜粉。',
    cipherForward: '前', cipherLeft: '左', cipherClear: '清除', cipherPrompt: '按纸条顺序选择四个方向。', cipherWrong: '顺序不对。擦去霜痕，再试一次。', cipherSolved: '密码解开。沿四枚地面镜记前进。',
    archive: '镜面物证档案', archiveHelp: '靠近并收取后，展开条目查看物证细节。', sealed: '尚未取得', noteFound: '入口便笺', routeFound: '四步路线', routeLocked: '待解码',
    caseFootage: '监控胶片', caseShard: '镜片', caseEcho: '声纹 / 录音',
    routeLabels: ['前', '左', '前', '左'], routeShort: '走到地面镜记',
    coreReply: '镜心里映出另一个入口。', wrong: '还差一步。',
  },
  en: {
    title: 'Frozen Mirror Hall · Layer Two',
    subtitle: 'The mirrors remember each passing. Find the evidence note near the entrance.',
    guide: 'Approach an exhibit and press E to inspect', guideTouch: 'Approach an exhibit, then tap “Inspect evidence”.',
    notePrompt: 'A note is pinned beneath broken glass near the entrance. It records a four-part route to the mirror core.',
    noteAction: 'Read the note', noteTitle: 'Note unfolded',
    routeStart: 'Decoded: forward · left · forward · left. Walk to four floor marks in order; each step requires movement.',
    routeStep: ['Walk forward to the first mirror mark', 'Walk left to the second mirror mark', 'Walk forward to the third mirror mark', 'Walk left to the final mirror mark'],
    routeWrong: 'Wrong direction. The mirror stays dark. Correct your course and try this leg again.',
    routeDone: 'Both mirror routes are complete. Seek the distant exhibits.', routeProgress: 'Route',
    secondCodeTitle: 'SECOND FRAGMENT · CIPHER', secondCodeKey: 'The shard at the end of route one reads RIGHT · FORWARD · RIGHT · FORWARD. Enter the sequence to open route two.',
    secondCodeFound: 'Route one complete. The next shard reveals RIGHT · FORWARD · RIGHT · FORWARD.', secondCodeSolved: 'Second cipher solved. Follow the next floor marks.',
    secondRouteStart: 'Route two: right · forward · right · forward. Walk each floor mark.',
    secondRouteStep: ['Walk right to the first mark', 'Walk forward to the second mark', 'Walk right to the third mark', 'Walk forward to the final mark'],
    navTitle: 'HALL MAP', navYou: 'YOU', navGoal: 'NEXT', navCipher: 'Decode second shard', navRoute: 'Floor mirror mark', navCore: 'Central mirror',
    core: 'Three mirror exhibits and both routes are confirmed. Press E at the core.',
    coreTouch: 'Approach the core, then tap “Enter core”.', collect: 'Inspect evidence', enter: 'Enter core',
    collected: 'archived', locked: 'The core remains sealed: three exhibits and the complete route are required.', exit: 'Leave hall',
    hint: 'WASD / arrows move · touch joystick · E inspect · Esc leave',
    noteDecode: 'NOTE CIPHER', noteCode: '○　●　○　●', noteKey: 'Margin note: an open circle means “forward”; a filled circle means “left”.',
    noteAnswer: 'Decoded: forward · left · forward · left', notePhysical: 'The thin paper is waterlogged; dark mirror dust clings to its folds.',
    cipherForward: 'Forward', cipherLeft: 'Left', cipherClear: 'Clear', cipherPrompt: 'Choose four directions in the note’s order.', cipherWrong: 'That sequence is wrong. Clear the frost and try again.', cipherSolved: 'Cipher solved. Follow the four floor marks.',
    archive: 'MIRROR EVIDENCE ARCHIVE', archiveHelp: 'Inspect each exhibit in the hall to open its record.', sealed: 'Not recovered', noteFound: 'Entrance note', routeFound: 'Four-step route', routeLocked: 'Awaiting decode',
    caseFootage: 'SURVEILLANCE FILM', caseShard: 'MIRROR LENS', caseEcho: 'VOICEPRINT / RECORDING',
    routeLabels: ['FWD', 'LEFT', 'FWD', 'LEFT'], routeShort: 'Walk to the floor mark',
    coreReply: 'Another entrance appears inside the core.', wrong: 'One step remains.',
  },
};

function post(type, id) {
  if (window.parent === window) return;
  const message = { source: MESSAGE_SOURCE, type };
  if (id) message.id = id;
  window.parent.postMessage(message, window.location.origin);
}

function silverMaterial({ color = 0xc7e1e9, roughness = .14 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: .55, roughness, clearcoat: 1, clearcoatRoughness: .045,
    emissive: 0x315368, emissiveIntensity: .18,
    reflectivity: 1, envMapIntensity: 2.2, side: THREE.DoubleSide,
  });
}

function makeMirrorFragment(spec) {
  const group = new THREE.Group();
  group.position.copy(spec.position);
  group.rotation.set(-.11, spec.id === 'shard' ? -.34 : .18, spec.id === 'echo' ? -.2 : .13);
  group.userData.clueId = spec.id;
  const shape = new THREE.Shape();
  shape.moveTo(-.62, -.31); shape.lineTo(-.4, -.7); shape.lineTo(.02, -.53);
  shape.lineTo(.42, -.65); shape.lineTo(.62, -.16); shape.lineTo(.36, .17);
  shape.lineTo(.44, .63); shape.lineTo(-.03, .48); shape.lineTo(-.48, .67); shape.lineTo(-.39, .12);
  shape.closePath();
  const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .035, bevelThickness: .018 }), silverMaterial());
  glass.position.y = .48;
  glass.scale.set(spec.id === 'shard' ? .78 : 1, spec.id === 'shard' ? .9 : .82, 1);
  glass.userData.clueId = spec.id;
  group.add(glass);
  // The extruded glass spans z=0..0.035. Put a live reflection in front of
  // each surface so the glass cannot occlude it from either approach.
  const mirrorFaces = [];
  for (const side of [1, -1]) {
    const mirror = new Reflector(new THREE.ShapeGeometry(shape), {
      clipBias: .003, textureWidth: 256, textureHeight: 256, color: 0xffffff,
    });
    mirror.position.set(0, .48, side > 0 ? .075 : -.065);
    if (side < 0) mirror.rotation.y = Math.PI;
    mirror.scale.copy(glass.scale);
    mirror.userData.clueId = spec.id;
    group.add(mirror);
    mirrorFaces.push(mirror);
  }
  group.userData.mirrorFaces = mirrorFaces;
  const fracture = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry, 26), new THREE.LineBasicMaterial({ color: 0xe7faff, transparent: true, opacity: .8 }));
  fracture.position.copy(glass.position);
  fracture.scale.copy(glass.scale);
  fracture.userData.clueId = spec.id;
  group.add(fracture);

  const backing = new THREE.Mesh(new THREE.BoxGeometry(1.05, .11, .62), new THREE.MeshStandardMaterial({ color: 0x253944, metalness: .82, roughness: .38 }));
  backing.position.set(0, .11, 0);
  group.add(backing);

  if (spec.id === 'footage') {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.76, .09, .18), new THREE.MeshStandardMaterial({ color: 0x11191d, metalness: .32, roughness: .48 }));
    strip.position.set(0, .24, .13); group.add(strip);
    for (let i = 0; i < 3; i += 1) {
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(.16, .115), new THREE.MeshBasicMaterial({ color: i === 2 ? 0xd4a27e : 0x728691, side: THREE.DoubleSide }));
      frame.position.set(-.23 + i * .23, .24, .035); frame.rotation.x = -Math.PI / 2; group.add(frame);
    }
  } else if (spec.id === 'shard') {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xc5e5ee, metalness: .86, roughness: .045, clearcoat: 1, clearcoatRoughness: .025, transparent: true, opacity: .84, side: THREE.DoubleSide }));
    lens.position.set(.08, .35, -.08); lens.scale.set(1, .2, .8); group.add(lens);
    const hair = new THREE.Mesh(new THREE.TorusGeometry(.22, .009, 4, 48, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: 0x17191b }));
    hair.position.set(-.12, .22, .15); hair.rotation.x = -Math.PI / 2; group.add(hair);
  } else {
    const wafer = new THREE.Mesh(new THREE.CylinderGeometry(.19, .2, .08, 8), new THREE.MeshStandardMaterial({ color: 0x161d20, metalness: .72, roughness: .32 }));
    wafer.position.set(0, .2, .12); group.add(wafer);
    const wave = new THREE.Group();
    for (let i = 0; i < 9; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.027, .012, .1 + Math.abs(Math.sin(i * 1.13)) * .19), new THREE.MeshBasicMaterial({ color: 0xc8e5ed }));
      bar.position.set(-.22 + i * .055, .31, .14); wave.add(bar);
    }
    group.add(wave);
  }
  const glint = new THREE.PointLight(spec.color, .16, 2.6, 2);
  glint.position.set(0, 1.05, .6); group.add(glint);
  return group;
}

function makeNote(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(.72, .54), new THREE.MeshStandardMaterial({ color: 0xc8c2a8, roughness: .96, side: THREE.DoubleSide }));
  paper.rotation.x = -Math.PI / 2; paper.position.y = .12;
  group.add(paper);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(.5, .006, .008), new THREE.MeshBasicMaterial({ color: 0x605f55 }));
  fold.position.set(0, .126, .03); group.add(fold);
  const mirrorDust = new THREE.Mesh(new THREE.BoxGeometry(.2, .018, .14), silverMaterial({ color: 0x95bbc6, roughness: .23 }));
  mirrorDust.position.set(.12, .16, -.18); mirrorDust.rotation.y = -.3; group.add(mirrorDust);
  return group;
}

function makeRouteMarker() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(.38, .47, 32), new THREE.MeshBasicMaterial({ color: 0xaed8e1, transparent: true, opacity: .44, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .035; group.add(ring);
  const sliver = new THREE.Mesh(new THREE.BoxGeometry(.09, .025, .45), silverMaterial({ color: 0xb6d9e2 }));
  sliver.position.y = .05; group.add(sliver);
  const pivot = new THREE.Mesh(new THREE.ConeGeometry(.12, .24, 4), new THREE.MeshBasicMaterial({ color: 0xe5faff }));
  pivot.position.set(.27, .13, 0); pivot.rotation.z = -Math.PI / 2; group.add(pivot);
  return group;
}

export function createIceChapterLayer({ scene, camera, canvas }) {
  const found = new Set();
  const groups = new Map();
  const animated = [];
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const coreGroup = new THREE.Group();
  coreGroup.position.copy(CORE_POSITION);
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(2.35, .065, 8, 48), new THREE.MeshPhysicalMaterial({ color: 0x8eb6c2, metalness: .88, roughness: .09, emissive: 0x163241, emissiveIntensity: .2 }));
  coreRing.rotation.x = Math.PI / 2; coreGroup.add(coreRing);
  const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(.85, 1), silverMaterial({ color: 0xc7ecf4 }));
  coreCrystal.position.y = .96; coreCrystal.scale.set(.7, 1.55, .7); coreGroup.add(coreCrystal);
  const coreLight = new THREE.PointLight(0x9be4f2, 1.35, 8, 2); coreLight.position.y = 1; coreGroup.add(coreLight);
  scene.add(coreGroup); animated.push(coreCrystal);

  const exhibits = new Map(CLUES.map(spec => [spec.id, makeMirrorFragment(spec)]));
  for (const [id, group] of exhibits) {
    group.traverse(object => { if (object.isMesh || object.isLineSegments) object.userData.clueId = id; });
    scene.add(group); groups.set(id, group);
  }
  const notePosition = new THREE.Vector3(7.5, .05, 9.35);
  const noteGroup = makeNote(notePosition);
  noteGroup.userData.clueId = 'note';
  noteGroup.traverse(object => { if (object.isMesh || object.isLineSegments) object.userData.clueId = 'note'; });
  scene.add(noteGroup); groups.set('note', noteGroup);

  const title = document.querySelector('#ice-map-title');
  const subtitle = document.querySelector('#ice-map-subtitle');
  const clueState = document.querySelector('#ice-map-clues');
  const prompt = document.querySelector('#ice-map-prompt');
  const promptText = document.querySelector('#ice-map-prompt-text');
  const interact = document.querySelector('#ice-interact');
  const exit = document.querySelector('#ice-exit');
  const hint = document.querySelector('#ice-map-hint');
  const routeReadout = document.querySelector('#ice-route-readout');
  const routeStatus = document.querySelector('#ice-route-status');
  const archive = document.querySelector('#ice-archive');
  const archiveToggle = document.querySelector('#ice-archive-toggle');
  const overlay = document.querySelector('#ice-map-overlay');
  const navCanvas = document.querySelector('#ice-nav-canvas');
  const navTarget = document.querySelector('#ice-nav-target');
  const navDistance = document.querySelector('#ice-nav-distance');
  const navTitle = document.querySelector('#ice-nav-title');
  let language = 'zh';
  let currentTarget = null;
  let coreTriggered = false;
  let disposed = false;
  let storyPaused = false;
  let routeStep = 0;
  let routeOrigin = null;
  let routeForward = null;
  let routeStarted = false;
  let cipherOpen = false;
  let cipherInput = [];
  let cipherFeedback = '';
  let routeWrongDistance = 0;
  let lastPosition = camera.position.clone();
  let wrongFeedbackUntil = 0;
  let lastNavAt = -Infinity;
  const routeMarkers = [];
  const noteTrail = [];
  for (const [x, z, angle] of [[7.5, 4.25, 0], [7.8, 6.25, -.28], [7.1, 7.95, -.55], [7.5, 9.05, -.8]]) {
    const flake = new THREE.Mesh(new THREE.OctahedronGeometry(.21, 0), silverMaterial({ color: 0x9ebdc6, roughness: .23 }));
    flake.position.set(x, .11, z); flake.rotation.set(.2, angle, .3); flake.scale.set(1.2, .16, .72);
    scene.add(flake); noteTrail.push(flake);
  }

  function text(spec) { return language === 'zh' ? spec.zh : spec.en; }
  function isTouch() { return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches; }
  function clueCount() { return CLUES.reduce((count, item) => count + Number(found.has(item.id)), 0); }
  function routeIndex() { return found.has('routeOne') ? 1 : 0; }
  function routeTurns() { return ROUTES[routeIndex()]; }
  function routeDirection(step) {
    const forward = routeForward.clone();
    const turn = routeTurns()[step];
    return turn === 'left' || turn === 'right'
      ? forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn === 'left' ? Math.PI / 2 : -Math.PI / 2).normalize()
      : forward;
  }
  function makeRouteMarkers() {
    routeMarkers.forEach(marker => scene.remove(marker));
    routeMarkers.length = 0;
    if (!routeStarted || found.has('route') || !routeOrigin || !routeForward) return;
    const point = routeOrigin.clone();
    for (let i = routeStep; i < routeTurns().length; i += 1) {
      point.addScaledVector(routeDirection(i), ROUTE_LENGTH);
      const marker = makeRouteMarker(); marker.position.set(point.x, .02, point.z);
      marker.userData.routeIndex = i; marker.visible = i === routeStep;
      scene.add(marker); routeMarkers.push(marker);
    }
  }
  function updateLabels() {
    const copy = COPY[language];
    if (title) title.textContent = copy.title;
    if (subtitle) subtitle.textContent = copy.subtitle;
    if (hint) hint.textContent = copy.hint;
    if (exit) exit.textContent = copy.exit;
    if (clueState) {
      clueState.textContent = `${copy.collected} ${clueCount()}/3`;
      clueState.dataset.complete = String(clueCount() === CLUES.length);
    }
    for (const spec of CLUES) {
      const rowLabel = copy[`case${spec.id[0].toUpperCase()}${spec.id.slice(1)}`];
      for (const row of document.querySelectorAll(`[data-ice-clue="${spec.id}"]`)) {
        row.textContent = rowLabel;
        row.classList.toggle('is-found', found.has(spec.id));
        row.setAttribute('aria-label', `${row.textContent} · ${found.has(spec.id) ? copy.collected : copy.sealed}`);
      }
      const detail = document.querySelector(`[data-ice-detail="${spec.id}"]`);
      if (detail) {
        detail.textContent = `${text(spec.evidence)}\n\n${text(spec.clue)}`;
        detail.hidden = !found.has(spec.id);
      }
      const state = document.querySelector(`[data-ice-clue="${spec.id}"]`)?.closest('summary')?.querySelector('.record-state');
      if (state) state.textContent = found.has(spec.id) ? copy.collected : copy.sealed;
    }
    const noteStatus = document.querySelector('#ice-note-status');
    if (noteStatus) noteStatus.textContent = found.has('note') ? copy.noteFound : copy.sealed;
    const routeArchive = document.querySelector('#ice-route-archive');
    if (routeArchive) routeArchive.textContent = found.has('route') ? copy.routeFound : found.has('routeOne') ? copy.secondCodeFound : found.has('note') ? copy.routeStart : copy.routeLocked;
    const noteCipher = document.querySelector('#ice-note-cipher');
    if (noteCipher) noteCipher.hidden = !cipherOpen && !found.has('note');
    const secondCipher = found.has('routeOne');
    const cipherTitle = document.querySelector('#ice-cipher-title');
    const cipherCode = document.querySelector('#ice-cipher-code');
    if (cipherTitle) cipherTitle.textContent = secondCipher ? copy.secondCodeTitle : copy.noteDecode;
    if (cipherCode) cipherCode.textContent = secondCipher ? '◁　○　◁　○' : copy.noteCode;
    const noteCipherLabel = noteCipher?.querySelector('.cipher-label');
    const noteCipherHint = noteCipher?.querySelector('[data-cipher-hint]');
    const noteCipherAnswer = noteCipher?.querySelector('[data-cipher-answer]');
    if (noteCipherLabel) noteCipherLabel.textContent = secondCipher ? copy.secondCodeTitle : copy.noteDecode;
    if (noteCipherHint) noteCipherHint.textContent = secondCipher ? copy.secondCodeKey : copy.noteKey;
    if (noteCipherAnswer) { noteCipherAnswer.textContent = secondCipher ? copy.secondRouteStart : copy.noteAnswer; noteCipherAnswer.hidden = secondCipher ? !routeStarted && !found.has('route') : !found.has('note'); }
    const cipherControls = document.querySelector('#ice-cipher-input');
    if (cipherControls) cipherControls.hidden = secondCipher ? routeStarted || found.has('route') : found.has('note');
    for (const button of document.querySelectorAll('[data-cipher-dir]')) {
      button.textContent = button.dataset.cipherDir === 'forward' ? copy.cipherForward : button.dataset.cipherDir === 'left' ? copy.cipherLeft : language === 'zh' ? '右' : 'Right';
      button.hidden = secondCipher ? button.dataset.cipherDir === 'left' : button.dataset.cipherDir === 'right';
    }
    const clearCipher = document.querySelector('#ice-cipher-clear');
    if (clearCipher) clearCipher.textContent = copy.cipherClear;
    updateCipherInput();
    if (archive) { archive.classList.toggle('has-note', found.has('note')); archive.classList.toggle('is-solving', cipherOpen); }
    overlay?.classList.toggle('is-solving', cipherOpen);
    overlay?.classList.toggle('is-archive-open', !!archive?.classList.contains('is-mobile-open') || cipherOpen);
    if (archiveToggle) {
      const open = archive?.classList.contains('is-mobile-open') || cipherOpen;
      archiveToggle.textContent = open ? language === 'zh' ? '收起线索' : 'Close clues' : language === 'zh' ? '查看线索' : 'Clues';
      archiveToggle.setAttribute('aria-expanded', String(!!open));
    }
    const archiveTitle = document.querySelector('#ice-archive-title');
    const archiveIntro = document.querySelector('.ice-archive-intro');
    if (archiveTitle) archiveTitle.textContent = copy.archive;
    if (archiveIntro) archiveIntro.textContent = copy.archiveHelp;
    updateRouteReadout();
    updateNavigation();
  }
  function updateCipherInput() {
    const copy = COPY[language];
    const slots = document.querySelector('#ice-cipher-slots');
    if (slots) slots.textContent = Array.from({ length: 4 }, (_, index) => cipherInput[index] ? (cipherInput[index] === 'forward' ? copy.cipherForward : cipherInput[index] === 'left' ? copy.cipherLeft : language === 'zh' ? '右' : 'Right') : '□').join(' · ');
    const feedback = document.querySelector('#ice-cipher-feedback');
    if (feedback) feedback.textContent = cipherFeedback || (found.has('routeOne') ? copy.secondCodeFound : copy.cipherPrompt);
  }
  function updateRouteReadout() {
    if (!routeReadout || !routeStatus) return;
    const copy = COPY[language];
    routeReadout.hidden = !routeStarted || found.has('route');
    routeStatus.textContent = found.has('route')
      ? copy.routeDone
      : performance.now() < wrongFeedbackUntil ? copy.routeWrong
      : `${copy.routeProgress} ${routeIndex() + 1} · ${routeStep + 1}/4 · ${(routeIndex() ? copy.secondRouteStep : copy.routeStep)[routeStep]}`;
    routeReadout.dataset.wrong = String(performance.now() < wrongFeedbackUntil);
    const steps = routeReadout.querySelectorAll('[data-route-step]');
    steps.forEach((step, index) => {
      step.textContent = routeIndex() ? (language === 'zh' ? ['右', '前', '右', '前'] : ['RIGHT', 'FWD', 'RIGHT', 'FWD'])[index] : copy.routeLabels[index];
      step.classList.toggle('is-complete', found.has('route') || index < routeStep);
      step.classList.toggle('is-current', !found.has('route') && index === routeStep && routeStarted);
      step.setAttribute('aria-label', `${copy.routeLabels[index]} ${index < routeStep || found.has('route') ? '✓' : ''}`);
    });
  }
  function navigationTarget() {
    if (!found.has('note')) return { position: notePosition, label: language === 'zh' ? '入口便笺' : 'Entrance note' };
    if (routeStarted && !found.has('route')) {
      const marker = routeMarkers[0];
      if (marker) return { position: marker.position, label: COPY[language].navRoute };
    }
    if (found.has('routeOne') && !found.has('route')) return { position: camera.position, label: COPY[language].navCipher };
    for (const id of ['footage', 'shard', 'echo']) {
      const spec = CLUES.find(entry => entry.id === id);
      if (!found.has(id) && spec) return { position: spec.position, label: text(spec) };
    }
    return { position: CORE_POSITION, label: COPY[language].navCore };
  }
  function updateNavigation() {
    if (!navCanvas) return;
    const copy = COPY[language];
    const target = navigationTarget();
    const distance = camera.position.distanceTo(target.position);
    if (navTitle) navTitle.textContent = copy.navTitle;
    if (navTarget) navTarget.textContent = `${copy.navGoal} · ${target.label}`;
    if (navDistance) navDistance.textContent = distance < .5 ? '●' : `${Math.round(distance)} m`;
    const ctx = navCanvas.getContext('2d');
    if (!ctx) return;
    const width = navCanvas.width; const height = navCanvas.height;
    const minX = Math.min(-34, camera.position.x - 8, target.position.x - 8);
    const maxX = Math.max(49, camera.position.x + 8, target.position.x + 8);
    const minZ = Math.min(-4, camera.position.z - 8, target.position.z - 8);
    const maxZ = Math.max(88, camera.position.z + 8, target.position.z + 8);
    const scale = Math.min((width - 30) / (maxX - minX), (height - 30) / (maxZ - minZ));
    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (height - (maxZ - minZ) * scale) / 2;
    const mapPoint = position => ({
      x: offsetX + (position.x - minX) * scale,
      y: height - offsetY - (position.z - minZ) * scale,
    });
    const player = mapPoint(camera.position);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(5, 22, 33, .94)'; ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(140, 213, 225, .16)';
    for (let worldX = Math.floor(minX / 15) * 15; worldX <= maxX; worldX += 15) {
      const x = mapPoint({ x: worldX, z: 0 }).x;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let worldZ = Math.floor(minZ / 15) * 15; worldZ <= maxZ; worldZ += 15) {
      const y = mapPoint({ x: 0, z: worldZ }).y;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    const hallStart = mapPoint({ x: 7.5, z: 2.5 });
    const hallEnd = mapPoint(CORE_POSITION);
    ctx.strokeStyle = 'rgba(103, 188, 210, .24)'; ctx.lineWidth = 34;
    ctx.beginPath(); ctx.moveTo(hallStart.x, hallStart.y); ctx.lineTo(hallEnd.x, hallEnd.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(181, 233, 240, .56)'; ctx.lineWidth = 2; ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(hallStart.x, hallStart.y); ctx.lineTo(hallEnd.x, hallEnd.y); ctx.stroke(); ctx.setLineDash([]);
    for (const [index, spec] of CLUES.entries()) {
      const point = mapPoint(spec.position);
      if (point.y < 10 || point.y > height - 10) continue;
      ctx.strokeStyle = 'rgba(169, 226, 239, .52)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(point.x - 17, point.y); ctx.lineTo(point.x + 17, point.y); ctx.stroke();
      ctx.fillStyle = found.has(spec.id) ? 'rgba(172, 223, 232, .55)' : '#cceef5';
      ctx.font = '700 13px sans-serif'; ctx.fillText(String(index + 1), point.x + 20, point.y + 4);
    }
    for (const spec of CLUES) {
      if (found.has(spec.id)) continue;
      const point = mapPoint(spec.position);
      if (point.x < 8 || point.x > width - 8 || point.y < 8 || point.y > height - 8) continue;
      ctx.fillStyle = 'rgba(142, 206, 220, .48)';
      ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
    }
    const raw = mapPoint(target.position);
    const tx = raw.x;
    const ty = raw.y;
    ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255, 227, 143, .68)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffe398'; ctx.shadowColor = '#ffe398'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe398'; ctx.font = '700 17px sans-serif';
    ctx.fillText(copy.navGoal, Math.min(tx + 10, width - 62), Math.max(20, ty - 10));
    const facing = camera.getWorldDirection(new THREE.Vector3());
    const angle = Math.atan2(facing.x, facing.z);
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(angle);
    ctx.fillStyle = '#e9fcff'; ctx.strokeStyle = '#24758c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-8, 10); ctx.lineTo(0, 5); ctx.lineTo(8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#e9fcff'; ctx.font = '700 16px sans-serif'; ctx.fillText(copy.navYou, player.x + 11, player.y + 19);
    ctx.strokeStyle = 'rgba(209, 239, 245, .8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, height - 17); ctx.lineTo(18 + 10 * scale, height - 17); ctx.stroke();
    ctx.fillStyle = '#cdeaf0'; ctx.font = '11px sans-serif'; ctx.fillText('10 m', 20 + 10 * scale, height - 13);
  }
  function targetDistance(target) {
    if (target?.id === 'note') return camera.position.distanceTo(notePosition);
    return target ? camera.position.distanceTo(target.position) : camera.position.distanceTo(CORE_POSITION);
  }
  function nearbyTarget() {
    if (!found.has('note') && camera.position.distanceTo(notePosition) < 3.8) {
      return { id: 'note', position: notePosition, zh: '入口取证便笺', en: 'Entrance evidence note' };
    }
    let nearest = null;
    let nearestDistance = 3.8;
    for (const spec of CLUES) {
      if (found.has(spec.id) || spec.id === 'shard' && !found.has('route')) continue;
      const distance = camera.position.distanceTo(spec.position);
      if (distance < nearestDistance) { nearest = spec; nearestDistance = distance; }
    }
    return nearest;
  }
  function updatePrompt() {
    if (!prompt || !promptText || !interact) return;
    const copy = COPY[language];
    const near = targetDistance(currentTarget) < 3.8;
    prompt.hidden = !near;
    if (!near) { interact.hidden = true; return; }
    if (currentTarget?.id === 'note') {
      promptText.textContent = copy.notePrompt;
      interact.textContent = isTouch() ? copy.noteAction : `E · ${copy.noteAction}`;
      interact.hidden = false;
    } else if (currentTarget) {
      promptText.textContent = `${text(currentTarget)} · ${text(currentTarget.clue)}`;
      interact.textContent = isTouch() ? copy.collect : `E · ${copy.collect}`;
      interact.hidden = false;
    } else if (found.has('note') && routeStarted && !found.has('route')) {
      promptText.textContent = performance.now() < wrongFeedbackUntil ? copy.routeWrong : copy.routeStep[routeStep];
      interact.hidden = true;
    } else if (clueCount() === CLUES.length && found.has('route') && found.has('note')) {
      promptText.textContent = isTouch() ? copy.coreTouch : copy.core;
      interact.textContent = isTouch() ? copy.enter : `E · ${copy.enter}`;
      interact.hidden = false;
    } else {
      promptText.textContent = copy.locked;
      interact.hidden = true;
    }
  }
  function collect(id) {
    if (disposed || found.has(id)) return;
    if (id === 'note') {
      if (camera.position.distanceTo(notePosition) > 3.8) return;
      cipherOpen = true;
      cipherInput = [];
      cipherFeedback = '';
      updateLabels(); updatePrompt();
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    const spec = CLUES.find(entry => entry.id === id);
    if (id === 'shard' && !found.has('route')) return;
    if (!spec || camera.position.distanceTo(spec.position) > 3.8) return;
    found.add(id);
    const group = groups.get(id); if (group) group.visible = false;
    post('clue', id); currentTarget = null;
    updateLabels(); updatePrompt();
  }
  function chooseCipher(direction) {
    if (!cipherOpen || found.has('route') || cipherInput.length >= 4) return;
    cipherInput.push(direction);
    if (cipherInput.length === 4) {
      const second = found.has('routeOne');
      if (cipherInput.join(',') === (second ? 'right,forward,right,forward' : 'forward,left,forward,left')) {
        if (!second) { found.add('note'); post('clue', 'note'); }
        routeStarted = true; routeStep = 0; cipherOpen = false;
        routeOrigin = camera.position.clone();
        routeForward = camera.getWorldDirection(new THREE.Vector3()); routeForward.y = 0; routeForward.normalize();
        if (routeForward.lengthSq() < .5) routeForward.set(0, 0, -1);
        lastPosition.copy(camera.position); routeWrongDistance = 0;
        cipherFeedback = second ? COPY[language].secondCodeSolved : COPY[language].cipherSolved;
        makeRouteMarkers();
        const note = groups.get('note'); if (note) note.visible = false;
      } else {
        cipherFeedback = COPY[language].cipherWrong;
        cipherInput = [];
      }
    } else cipherFeedback = '';
    updateLabels(); updatePrompt();
  }
  function triggerCore() {
    if (disposed || coreTriggered || clueCount() !== CLUES.length || !found.has('note') || !found.has('route')) return;
    if (camera.position.distanceTo(CORE_POSITION) > 3.8) return;
    coreTriggered = true; post('core');
    if (promptText) promptText.textContent = COPY[language].coreReply;
    if (interact) interact.hidden = true;
    coreCrystal.material.emissiveIntensity = .5;
  }
  function interactWithTarget() {
    currentTarget = nearbyTarget();
    if (currentTarget) collect(currentTarget.id);
    else if (clueCount() === CLUES.length && found.has('note') && found.has('route')) triggerCore();
  }
  function handleKey(event) {
    if (storyPaused) return;
    if (event.repeat) return;
    if (cipherOpen) {
      if (event.code === 'Digit1' || event.code === 'Numpad1') { event.preventDefault(); chooseCipher(found.has('routeOne') ? 'right' : 'forward'); return; }
      if (event.code === 'Digit2' || event.code === 'Numpad2') { event.preventDefault(); chooseCipher(found.has('routeOne') ? 'forward' : 'left'); return; }
      if (event.code === 'Backspace') { event.preventDefault(); cipherInput.pop(); cipherFeedback = ''; updateCipherInput(); return; }
      if (event.code === 'Escape') { event.preventDefault(); return; }
      return;
    }
    if (event.code === 'KeyE' || event.code === 'Enter') {
      event.preventDefault();
      interactWithTarget();
    } else if (event.code === 'Escape') post('exit');
  }
  function handleClick(event) {
    if (disposed || cipherOpen || event.target !== canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    ndc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects([...groups.values()], true)[0];
    const id = hit?.object.userData.clueId;
    if (id === 'note' && camera.position.distanceTo(notePosition) < 3.8) collect('note');
    else if (id && camera.position.distanceTo(groups.get(id).position) < 3.8) collect(id);
    else if (clueCount() === CLUES.length && found.has('route') && raycaster.intersectObject(coreGroup, true).length) triggerCore();
  }
  function setInit(next) {
    if (next?.language === 'en' || next?.language === 'zh') language = next.language;
    found.clear();
    for (const id of Array.isArray(next?.found) ? next.found : []) if (ALLOWED_CLUES.has(id)) found.add(id);
    if (found.has('route')) found.add('routeOne');
    for (const spec of CLUES) groups.get(spec.id).visible = !found.has(spec.id);
    groups.get('shard').visible = found.has('route') && !found.has('shard');
    groups.get('note').visible = !found.has('note');
    if (found.has('route')) { routeStep = 4; routeStarted = true; }
    else if (found.has('routeOne')) { routeStep = 0; routeStarted = false; cipherOpen = true; }
    else if (found.has('note')) {
      routeStarted = true; routeStep = 0; routeOrigin = camera.position.clone();
      routeForward = camera.getWorldDirection(new THREE.Vector3()); routeForward.y = 0; routeForward.normalize();
      if (routeForward.lengthSq() < .5) routeForward.set(0, 0, -1);
      lastPosition.copy(camera.position); makeRouteMarkers();
    }
    updateLabels(); updatePrompt();
  }
  function setStoryPaused(paused) {
    storyPaused = paused;
    window.dispatchEvent(new Event(paused ? 'naiwa-story-pause' : 'naiwa-story-resume'));
    if (paused && document.pointerLockElement) document.exitPointerLock();
  }
  function progressRoute() {
    if (!routeStarted || found.has('route') || !routeOrigin || !routeForward) return;
    const displacement = camera.position.clone().sub(routeOrigin); displacement.y = 0;
    const direction = routeDirection(routeStep);
    const along = displacement.dot(direction);
    const lateral = displacement.clone().addScaledVector(direction, -along).length();
    const moved = camera.position.distanceTo(lastPosition);
    if (moved > .004 && lateral > 2.35) {
      wrongFeedbackUntil = performance.now() + 2600;
      routeWrongDistance = 0;
      updateRouteReadout(); updatePrompt();
    } else if (moved > .004 && along < -.9) {
      wrongFeedbackUntil = performance.now() + 2600;
      routeWrongDistance = 0;
      updateRouteReadout(); updatePrompt();
    } else if (along >= ROUTE_LENGTH && lateral < 1.85) {
      routeStep += 1; routeOrigin.copy(camera.position); routeWrongDistance = 0;
      if (routeStep >= routeTurns().length) {
        if (!found.has('routeOne')) {
          found.add('routeOne'); post('clue', 'routeOne');
          routeStarted = false; cipherOpen = true; cipherInput = [];
          cipherFeedback = COPY[language].secondCodeFound;
          updateLabels(); updatePrompt();
          if (document.pointerLockElement) document.exitPointerLock();
        } else {
          found.add('route'); post('clue', 'route');
          groups.get('shard').visible = !found.has('shard');
        }
        routeMarkers.forEach(marker => { marker.visible = false; });
      } else {
        makeRouteMarkers();
      }
      updateLabels(); updatePrompt();
    } else if (moved > .004 && lateral > 1.1) {
      wrongFeedbackUntil = performance.now() + 2600;
      updateRouteReadout(); updatePrompt();
    }
    lastPosition.copy(camera.position);
  }
  function update(delta, time) {
    if (disposed) return;
    coreLight.intensity = 1.3 + Math.sin(time * 1.4) * .13;
    if (time * 1000 - lastNavAt > 100) { lastNavAt = time * 1000; updateNavigation(); }
    for (const group of exhibits.values()) {
      const [front, back] = group.userData.mirrorFaces;
      const nearby = camera.position.distanceToSquared(group.position) < 18 * 18;
      const localCamera = group.worldToLocal(camera.position.clone());
      front.visible = nearby && localCamera.z >= 0;
      back.visible = nearby && localCamera.z < 0;
    }
    progressRoute();
    currentTarget = nearbyTarget();
    updateRouteReadout(); updatePrompt();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('keydown', handleKey);
    canvas.removeEventListener('click', handleClick);
    interact?.removeEventListener('click', interactWithTarget);
    exit?.removeEventListener('click', handleExit);
    archiveToggle?.removeEventListener('click', handleArchiveToggle);
    cipherButtons.forEach(button => button.removeEventListener('click', handleCipherClick));
    clearCipher?.removeEventListener('click', clearCipherInput);
    scene.remove(coreGroup); scene.remove(noteGroup);
    noteTrail.forEach(flake => scene.remove(flake));
    for (const group of groups.values()) scene.remove(group);
    routeMarkers.forEach(marker => scene.remove(marker));
    const disposeObject = root => root.traverse(object => {
      object.getRenderTarget?.().dispose();
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else if (object.material) object.material.dispose();
    });
    disposeObject(coreGroup); disposeObject(noteGroup);
    noteTrail.forEach(disposeObject);
    for (const group of groups.values()) disposeObject(group);
    routeMarkers.forEach(disposeObject);
  }
  function handleExit() { post('exit'); }
  function handleArchiveToggle() {
    archive?.classList.toggle('is-mobile-open');
    updateLabels();
  }
  const cipherButtons = [...document.querySelectorAll('[data-cipher-dir]')];
  const clearCipher = document.querySelector('#ice-cipher-clear');
  function handleCipherClick(event) { chooseCipher(event.currentTarget.dataset.cipherDir); }
  function clearCipherInput() { cipherInput = []; cipherFeedback = ''; updateCipherInput(); }
  cipherButtons.forEach(button => button.addEventListener('click', handleCipherClick));
  clearCipher?.addEventListener('click', clearCipherInput);
  window.addEventListener('keydown', handleKey);
  canvas.addEventListener('click', handleClick);
  interact?.addEventListener('click', interactWithTarget);
  exit?.addEventListener('click', handleExit);
  archiveToggle?.addEventListener('click', handleArchiveToggle);
  updateLabels(); updatePrompt();
  return { setInit, setStoryPaused, isStoryPaused: () => storyPaused, update, dispose };
}
