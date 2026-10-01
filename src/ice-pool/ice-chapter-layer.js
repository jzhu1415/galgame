import * as THREE from 'three';
import { silverMaterial, makeMirrorFragment, makeNote, makeRouteMarker } from './ice-props.js';
import { hasClearEvidencePath } from './ice-interaction.js';
import { ICE_LAYOUT, ICE_ROUTES, currentIceStage, canCollectIceEvidence } from './ice-progression.js';
import { createIceLandmarks } from './ice-landmarks.js';
import { createIceReflections } from './ice-reflections.js';

const MESSAGE_SOURCE = 'naiwa-ice-map';
const ALLOWED_CLUES = new Set(['footage', 'shard', 'echo', 'note', 'routeOne', 'route']);
const CORE_POSITION = ICE_LAYOUT.core;
// A fixed, walkable room owns the route marks. Camera-relative placement could
// send a mark through the Pool map's walls when the player faced a side wall.
export const ROUTE_POINTS = ICE_ROUTES;
const CLUES = [
  {
    id: 'footage', position: ICE_LAYOUT.footage, color: 0xb9dbe6,
    zh: '监控胶片 · 17号', en: 'Surveillance film · 17',
    clue: { zh: '胶片最后一格里，门外的人影比监控时间早一秒。', en: 'In the final frame, the shadow appears one second before the clock.' },
    evidence: { zh: '一段被冰水咬蚀的 8 毫米胶片，金属片框仍留着两帧倒置的走廊影像。', en: 'An ice-bitten 8 mm film strip. Two inverted corridor frames remain in its steel carrier.' },
  },
  {
    id: 'shard', position: ICE_LAYOUT.shard, color: 0x9fd4e3,
    zh: '镜片 · 无编号', en: 'Mirror lens · unmarked',
    clue: { zh: '正面映出空走廊，背面却沾着一根新鲜的黑发。', en: 'The face reflects an empty hall; a fresh dark hair clings to its back.' },
    evidence: { zh: '一块凹面镜片嵌在碎镜框内。银层脱落处留下指纹状擦痕，背面粘着一缕黑发。', en: 'A concave lens in a fractured bezel. Finger-shaped wipes cross the worn silvering; a dark hair is caught on its back.' },
  },
  {
    id: 'echo', position: ICE_LAYOUT.echo, color: 0xc1dce7,
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
    notePrompt: '入口附近有一张压在碎镜下的纸条。它记录了北侧镜门的四位口令。',
    noteAction: '读取纸条', noteTitle: '纸条已展开',
    routeStart: '门锁密码已解开。沿北侧通道穿过镜门，寻找下一件物证。',
    routeApproach: '沿地图向北走，穿过前面的镜门。',
    routeStep: ['穿过结霜的镜门', '沿地面拖痕穿过镜室', '从对面的出口离开', '在下一段长廊查看镜片'],
    routeWrong: '方向不对，镜面没有回应。回到这一步的正确方向再走。',
    routeDone: '已离开冰晶厅。查看长廊架子上的录音蜡盘。', routeProgress: '路线',
    routeOneDone: '第一段路线已完成。寻找路线尽头的镜片。',
    secondCodeTitle: '第二枚碎片 · 密码', secondCodeKey: '第一段尽头的镜片刻着「右 · 前 · 右 · 前」。依次输入，开启第二段路。',
    secondCodeFound: '镜片已收取。读取镜片上的第二密码，再前往第二段路线。', secondCodeSolved: '第二道门锁已解开。穿过长廊，向冰晶厅深处走。',
    secondRouteStart: '右 · 前 · 右 · 前是门锁口令。解锁后，沿北侧长廊进入冰晶厅。',
    secondRouteStep: ['穿过狭长的滴水走廊', '进入有悬冰的大厅', '从镜墙后的出口离开', '在回声长廊查看录音蜡盘'],
    navTitle: '镜馆地图', navYou: '你', navGoal: '当前目标', navCipher: '读取已收取镜片上的第二密码', navRoute: '前方出口', navCore: '镜心室中央镜心',
    core: '三件镜面物证与两段路线均已确认。靠近镜心并按 E。',
    coreTouch: '靠近镜心后点击「进入镜心」', collect: '查看物证', enter: '进入镜心',
    collected: '已归档', locked: '镜心仍封闭：需要三件物证与完整路线。', exit: '离开镜馆',
    hint: 'WASD / 方向键移动 · 触屏摇杆 · E 查看 · Esc 离开',
    noteDecode: '便笺密码', noteCode: '○　●　○　●', noteKey: '霜印旁的注记：空心圆代表「前」，实心圆代表「左」。',
    noteAnswer: '门锁口令：前 · 左 · 前 · 左', notePhysical: '薄纸被水浸透，折痕间夹着一枚发暗的镜粉。',
    cipherForward: '前', cipherLeft: '左', cipherClear: '清除', cipherPrompt: '按纸条顺序选择四个方向。', cipherWrong: '顺序不对。擦去霜痕，再试一次。', cipherSolved: '密码解开。先查看长廊里的胶片，再穿过镜门。',
    archive: '镜面物证档案', archiveHelp: '靠近并收取后，展开条目查看物证细节。', sealed: '尚未取得', noteFound: '入口便笺', routeFound: '通路已走完', routeLocked: '待解码',
    caseFootage: '监控胶片', caseShard: '镜片', caseEcho: '声纹 / 录音',
    routeLabels: ['镜门', '拖痕', '出口', '镜片'], routeShort: '前往下一片区域',
    coreReply: '镜心里映出另一个入口。', wrong: '还差一步。',
  },
  en: {
    title: 'Frozen Mirror Hall · Layer Two',
    subtitle: 'The mirrors remember each passing. Find the evidence note near the entrance.',
    guide: 'Approach an exhibit and press E to inspect', guideTouch: 'Approach an exhibit, then tap “Inspect evidence”.',
    notePrompt: 'A note is pinned beneath broken glass near the entrance. It carries the four-part code for the north mirror door.',
    noteAction: 'Read the note', noteTitle: 'Note unfolded',
    routeStart: 'The lock is open. Follow the north passage through the mirror doorway to the next exhibit.',
    routeApproach: 'Follow the map north, through the mirror doorway.',
    routeStep: ['Pass through the frosted doorway', 'Follow the drag mark across the room', 'Leave through the far doorway', 'Inspect the lens in the next corridor'],
    routeWrong: 'Wrong direction. The mirror stays dark. Correct your course and try this leg again.',
    routeDone: 'You have left the crystal hall. Inspect the recording disc on the corridor stand.', routeProgress: 'Route',
    routeOneDone: 'Route one is complete. Recover the shard at its end.',
    secondCodeTitle: 'SECOND FRAGMENT · CIPHER', secondCodeKey: 'The shard at the end of route one reads RIGHT · FORWARD · RIGHT · FORWARD. Enter the sequence to open route two.',
    secondCodeFound: 'Shard recovered. Read its second cipher, then head to route two.', secondCodeSolved: 'The second lock is open. Follow the passage into the crystal hall.',
    secondRouteStart: 'Right · forward · right · forward opens the lock. Then follow the north passage into the crystal hall.',
    secondRouteStep: ['Cross the dripping corridor', 'Enter the hall of hanging ice', 'Leave through the doorway beyond the mirror wall', 'Inspect the disc in the echo corridor'],
    navTitle: 'HALL MAP', navYou: 'YOU', navGoal: 'NEXT', navCipher: 'Read the recovered shard cipher', navRoute: 'Next doorway', navCore: 'Core room central mirror',
    core: 'Three mirror exhibits and both routes are confirmed. Press E at the core.',
    coreTouch: 'Approach the core, then tap “Enter core”.', collect: 'Inspect evidence', enter: 'Enter core',
    collected: 'archived', locked: 'The core remains sealed: three exhibits and the complete route are required.', exit: 'Leave hall',
    hint: 'WASD / arrows move · touch joystick · E inspect · Esc leave',
    noteDecode: 'NOTE CIPHER', noteCode: '○　●　○　●', noteKey: 'Margin note: an open circle means “forward”; a filled circle means “left”.',
    noteAnswer: 'Lock code: forward · left · forward · left', notePhysical: 'The thin paper is waterlogged; dark mirror dust clings to its folds.',
    cipherForward: 'Forward', cipherLeft: 'Left', cipherClear: 'Clear', cipherPrompt: 'Choose four directions in the note’s order.', cipherWrong: 'That sequence is wrong. Clear the frost and try again.', cipherSolved: 'Lock opened. Inspect the corridor film, then head through the mirror doorway.',
    archive: 'MIRROR EVIDENCE ARCHIVE', archiveHelp: 'Inspect each exhibit in the hall to open its record.', sealed: 'Not recovered', noteFound: 'Entrance note', routeFound: 'Passage explored', routeLocked: 'Awaiting decode',
    caseFootage: 'SURVEILLANCE FILM', caseShard: 'MIRROR LENS', caseEcho: 'VOICEPRINT / RECORDING',
    routeLabels: ['DOOR', 'TRAIL', 'EXIT', 'LENS'], routeShort: 'Continue to the next area',
    coreReply: 'Another entrance appears inside the core.', wrong: 'One step remains.',
  },
};

function post(type, id) {
  if (window.parent === window) return;
  const message = { source: MESSAGE_SOURCE, type };
  if (id) message.id = id;
  window.parent.postMessage(message, window.location.origin);
}

function disposeObject(root) {
  const resources = new Set();
  root.traverse(object => {
    const target = object.getRenderTarget?.();
    if (target) resources.add(target);
    if (object.geometry) resources.add(object.geometry);
    for (const material of [].concat(object.material || [])) {
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      resources.add(material);
    }
  });
  resources.forEach(resource => resource.dispose());
}

export function createIceChapterLayer({ scene, camera, canvas, columnAt, renderer }) {
  const landmarks = createIceLandmarks({ scene });
  const found = new Set();
  const groups = new Map();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const coreGroup = new THREE.Group();
  coreGroup.position.copy(CORE_POSITION);
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, .045, 8, 48), new THREE.MeshPhysicalMaterial({ color: 0x8eb6c2, metalness: .88, roughness: .09, emissive: 0x163241, emissiveIntensity: .2 }));
  coreRing.rotation.x = Math.PI / 2; coreRing.position.y = -1.23; coreGroup.add(coreRing);
  const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(.85, 0), new THREE.MeshPhysicalMaterial({
    color: 0xd8f3fa, metalness: 0, roughness: .025, transmission: .9,
    ior: 1.46, thickness: 1.15, attenuationColor: 0xbfe8f2, attenuationDistance: 4,
    envMapIntensity: 1.7, flatShading: true,
  }));
  coreCrystal.position.y = .96; coreCrystal.scale.set(.6, 1.1, .6); coreGroup.add(coreCrystal);
  const coreLight = new THREE.PointLight(0x9be4f2, 1.35, 8, 2); coreLight.position.y = 1; coreGroup.add(coreLight);
  scene.add(coreGroup);

  const exhibits = new Map(CLUES.map(spec => [spec.id, makeMirrorFragment(spec)]));
  for (const [id, group] of exhibits) {
    group.traverse(object => { if (object.isMesh || object.isLineSegments) object.userData.clueId = id; });
    scene.add(group); groups.set(id, group);
  }
  const notePosition = ICE_LAYOUT.note;
  const noteGroup = makeNote(notePosition);
  noteGroup.userData.clueId = 'note';
  noteGroup.traverse(object => { if (object.isMesh || object.isLineSegments) object.userData.clueId = 'note'; });
  scene.add(noteGroup); groups.set('note', noteGroup);
  const reflections = createIceReflections({ renderer, scene,
    roots: [scene.getObjectByName('ice-route-landmarks'), coreGroup, ...groups.values()],
  });

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
  let routeAtStart = false;
  let routeStarted = false;
  let cipherOpen = false;
  let firstCipherSolved = false;
  let initialized = false;
  let cipherInput = [];
  let cipherFeedback = '';
  let lastNavAt = -Infinity;
  let pickup = null;
  let feedbackRemaining = 0;
  const feedback = document.createElement('div');
  feedback.className = 'ice-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  feedback.hidden = true;
  overlay?.append(feedback);
  const focusRing = new THREE.Mesh(new THREE.RingGeometry(.64, .69, 48), new THREE.MeshBasicMaterial({
    color: 0xc7edf4, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false,
  }));
  focusRing.rotation.x = -Math.PI / 2;
  focusRing.visible = false;
  scene.add(focusRing);
  const coreSlots = CLUES.map((spec, index) => {
    const slot = new THREE.Mesh(new THREE.TorusGeometry(.22, .035, 6, 24), silverMaterial({ roughness: .2 }));
    const angle = index * Math.PI * 2 / 3;
    slot.position.set(Math.sin(angle) * .8, -1.2, Math.cos(angle) * .8);
    slot.rotation.x = -Math.PI / 2;
    coreGroup.add(slot);
    return slot;
  });
  function showFeedback(zh, en) {
    feedback.textContent = language === 'zh' ? zh : en;
    feedback.hidden = false;
    feedbackRemaining = 2.8;
  }
  function canInspect(position) {
    return !storyPaused && !pickup && hasClearEvidencePath(camera.position, position, 3.8, columnAt);
  }
  function finishPickup() {
    if (!pickup) return;
    const { id, group, position, scale } = pickup;
    pickup = null;
    group.visible = false;
    group.position.copy(position);
    group.scale.copy(scale);
    if (id === 'shard' && !found.has('route')) {
      cipherOpen = true; cipherInput = []; cipherFeedback = '';
      updateLabels();
    }
    refreshEvidenceVisibility();
    if (id === 'footage' && firstCipherSolved && currentIceStage(found) === 'routeOne') {
      routeStarted = true; routeStep = 0; routeAtStart = true; makeRouteMarkers();
    }
    post('clue', id);
  }
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
  function refreshEvidenceVisibility() {
    const stage = currentIceStage(found);
    for (const spec of CLUES) groups.get(spec.id).visible = pickup?.id === spec.id || (!found.has(spec.id) && spec.id === stage);
    groups.get('note').visible = !found.has('note');
  }
  function routePoint(index) {
    const [x, z] = ROUTE_POINTS[routeIndex()][index];
    return new THREE.Vector3(x, .02, z);
  }
  function floorDistance(position) { return Math.hypot(camera.position.x - position.x, camera.position.z - position.z); }
  function makeRouteMarkers() {
    routeMarkers.forEach(marker => { scene.remove(marker); disposeObject(marker); });
    routeMarkers.length = 0;
    if (!routeStarted || found.has('route')) return;
    const nextPoint = routeAtStart ? routeStep + 1 : 0;
    for (let i = nextPoint; i < ROUTE_POINTS[routeIndex()].length; i += 1) {
      const marker = makeRouteMarker(); marker.position.copy(routePoint(i));
      const direction = routePoint(Math.min(i + 1, 4)).sub(routePoint(i === 4 ? 3 : i));
      marker.rotation.y = Math.atan2(direction.x, direction.z);
      marker.userData.routeIndex = i - 1; marker.visible = i === nextPoint;
      if (i === 0) marker.scale.setScalar(1.3);
      scene.add(marker); routeMarkers.push(marker);
    }
  }
  function updateLabels() {
    const copy = COPY[language];
    if (title) title.textContent = copy.title;
    if (subtitle) subtitle.textContent = copy.subtitle;
    if (hint) hint.textContent = copy.hint;
    if (exit) exit.textContent = copy.exit;
    coreSlots.forEach((slot, index) => {
      const recovered = found.has(CLUES[index].id);
      slot.material.emissiveIntensity = recovered ? .7 : .04;
      slot.material.color.setHex(recovered ? 0xc7edf4 : 0x52636b);
    });
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
    if (routeArchive) routeArchive.textContent = found.has('route') ? copy.routeFound : found.has('routeOne') ? copy.routeOneDone : found.has('note') ? copy.routeStart : copy.routeLocked;
    const noteCipher = document.querySelector('#ice-note-cipher');
    if (noteCipher) noteCipher.hidden = !cipherOpen && !found.has('note');
    const secondCipher = found.has('note') && found.has('shard');
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
    if (cipherControls) cipherControls.hidden = secondCipher ? routeStarted || found.has('route') : !cipherOpen;
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
      : !routeAtStart ? copy.routeApproach
      : `${copy.routeProgress} ${routeIndex() + 1} · ${routeStep + 1}/4 · ${(routeIndex() ? copy.secondRouteStep : copy.routeStep)[routeStep]}`;
    routeReadout.dataset.wrong = 'false';
    const steps = routeReadout.querySelectorAll('[data-route-step]');
    steps.forEach((step, index) => {
      step.textContent = routeIndex() ? (language === 'zh' ? ['长廊', '悬冰', '出口', '录音'] : ['HALL', 'ICE', 'EXIT', 'DISC'])[index] : copy.routeLabels[index];
      step.classList.toggle('is-complete', found.has('route') || index < routeStep);
      step.classList.toggle('is-current', !found.has('route') && index === routeStep && routeStarted && routeAtStart);
      step.setAttribute('aria-label', `${step.textContent} ${index < routeStep || found.has('route') ? '✓' : ''}`);
    });
  }
  function navigationTarget() {
    if (!found.has('note')) return { position: notePosition, label: language === 'zh' ? '入口便笺' : 'Entrance note' };
    const stage = currentIceStage(found);
    if (stage === 'footage' || stage === 'shard' || stage === 'echo') {
      const spec = CLUES.find(entry => entry.id === stage);
      const place = language === 'zh' ? ({ footage: '入口长廊', shard: '镜门后的长廊', echo: '回声长廊' })[stage] : ({ footage: 'Entrance corridor', shard: 'Passage beyond the mirror room', echo: 'Echo corridor' })[stage];
      if (Math.floor(camera.position.z / 15) !== Math.floor(spec.position.z / 15) && Math.abs(spec.position.x - 7.5) > 2) {
        const room = Math.floor(spec.position.z / 15) * 15;
        return { position: new THREE.Vector3(7.5, .02, room + 1.5), label: `${language === 'zh' ? '穿过北侧长廊进入' : 'Enter via the north corridor'} · ${place} · ${text(spec)}` };
      }
      return { position: spec.position, label: `${place} · ${text(spec)}` };
    }
    if (stage === 'routeTwo' && !routeStarted) return { position: camera.position, label: COPY[language].navCipher };
    if (routeStarted && !found.has('route')) {
      const point = routeMarkers[0]?.position;
      if (point) {
        if (Math.floor(camera.position.z / 15) !== Math.floor(point.z / 15) && Math.abs(point.x - 7.5) > 2) {
          const room = Math.floor(point.z / 15) * 15;
          return { position: new THREE.Vector3(7.5, .02, room + 1.5), label: `${language === 'zh' ? (routeIndex() ? '第二镜室 · 穿过北侧长廊进入' : '第一镜室 · 穿过北侧长廊进入') : (routeIndex() ? 'Second mirror room · enter via the north corridor' : 'First mirror room · enter via the north corridor')}` };
        }
        return { position: point, label: (routeIndex() ? COPY[language].secondRouteStep : COPY[language].routeStep)[routeStep] };
      }
    }
    return { position: CORE_POSITION, label: COPY[language].navCore };
  }
  function updateNavigation() {
    if (!navCanvas) return;
    const copy = COPY[language];
    const target = navigationTarget();
    const zone = Math.max(0, Math.min(6, Math.floor(camera.position.z / 15)));
    if (title) title.textContent = (language === 'zh'
      ? ['入口水厅', '胶片长廊', '破镜厅', '裂缝长廊', '悬冰大厅', '回声长廊', '镜心室']
      : ['Entrance pool', 'Film corridor', 'Broken mirror hall', 'Fracture passage', 'Hanging ice hall', 'Echo corridor', 'Mirror core'])[zone];
    if (subtitle) subtitle.textContent = target.label;
    const distance = floorDistance(target.position);
    if (navTitle) navTitle.textContent = copy.navTitle;
    if (navTarget) navTarget.textContent = `${copy.navGoal} · ${target.label}`;
    if (navDistance) navDistance.textContent = distance < .5 ? '●' : `${Math.round(distance)} m`;
    const ctx = navCanvas.getContext('2d');
    if (!ctx) return;
    const width = navCanvas.width; const height = navCanvas.height;
    const minX = Math.min(-34, camera.position.x - 8, target.position.x - 8);
    const maxX = Math.max(49, camera.position.x + 8, target.position.x + 8);
    const minZ = Math.min(-4, camera.position.z - 8, target.position.z - 8);
    const maxZ = Math.max(105, camera.position.z + 8, target.position.z + 8);
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
    const drawFloor = (x0, z0, x1, z1) => {
      const topLeft = mapPoint({ x: x0, z: z1 });
      const bottomRight = mapPoint({ x: x1, z: z0 });
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    };
    ctx.fillStyle = 'rgba(103, 188, 210, .24)';
    drawFloor(0, 0, 15, 15);
    drawFloor(6, 15, 9, 30);
    drawFloor(0, 30, 15, 45);
    drawFloor(6, 45, 9, 60);
    drawFloor(0, 60, 15, 75);
    drawFloor(6, 75, 9, 90);
    drawFloor(0, 90, 15, 105);
    const hallStart = mapPoint({ x: 7.5, z: 2.5 });
    const hallEnd = mapPoint({ x: 7.5, z: 104 });
    ctx.strokeStyle = 'rgba(181, 233, 240, .56)'; ctx.lineWidth = 2; ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(hallStart.x, hallStart.y); ctx.lineTo(hallEnd.x, hallEnd.y); ctx.stroke(); ctx.setLineDash([]);
    if (routeStarted && !found.has('route')) {
      ctx.strokeStyle = 'rgba(236, 247, 187, .88)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
      ROUTE_POINTS[routeIndex()].forEach(([x, z], index) => {
        const point = mapPoint({ x, z });
        if (index === 0) { ctx.beginPath(); ctx.moveTo(point.x, point.y); }
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke(); ctx.setLineDash([]);
    }
    for (const [index, spec] of CLUES.entries()) {
      if (!found.has(spec.id)) continue;
      const point = mapPoint(spec.position);
      if (point.y < 10 || point.y > height - 10) continue;
      ctx.strokeStyle = 'rgba(169, 226, 239, .52)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(point.x - 17, point.y); ctx.lineTo(point.x + 17, point.y); ctx.stroke();
      ctx.fillStyle = found.has(spec.id) ? 'rgba(172, 223, 232, .55)' : '#cceef5';
      ctx.font = '700 13px sans-serif'; ctx.fillText(String(index + 1), point.x + 20, point.y + 4);
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
  function nearbyTarget() {
    if (!found.has('note') && canInspect(notePosition)) {
      return { id: 'note', position: notePosition, zh: '入口取证便笺', en: 'Entrance evidence note' };
    }
    let nearest = null;
    let nearestDistance = 3.8;
    const stage = currentIceStage(found);
    for (const spec of CLUES) {
      if (found.has(spec.id) || spec.id !== stage) continue;
      const distance = camera.position.distanceTo(spec.position);
      if (distance < nearestDistance && canInspect(spec.position)) { nearest = spec; nearestDistance = distance; }
    }
    return nearest;
  }
  function updatePrompt() {
    if (!prompt || !promptText || !interact) return;
    const copy = COPY[language];
    const near = !cipherOpen && !storyPaused && !pickup && (currentTarget ? canInspect(currentTarget.position) : canInspect(CORE_POSITION));
    prompt.hidden = !near;
    if (!near) { interact.hidden = true; return; }
    if (currentTarget?.id === 'note') {
      promptText.textContent = copy.notePrompt;
      interact.textContent = isTouch() ? copy.noteAction : `E · ${copy.noteAction}`;
      interact.hidden = false;
    } else if (currentTarget) {
      promptText.textContent = `${text(currentTarget)} · ${text(currentTarget.evidence)}`;
      interact.textContent = isTouch() ? copy.collect : `E · ${copy.collect}`;
      interact.hidden = false;
    } else if (found.has('note') && routeStarted && !found.has('route')) {
      promptText.textContent = !routeAtStart ? copy.routeApproach : (routeIndex() ? copy.secondRouteStep : copy.routeStep)[routeStep];
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
    if (disposed || storyPaused || pickup || found.has(id)) return;
    if (id === 'note') {
      if (!canInspect(notePosition)) return;
      cipherOpen = true;
      cipherInput = [];
      cipherFeedback = '';
      updateLabels(); updatePrompt();
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    const spec = CLUES.find(entry => entry.id === id);
    if (!canCollectIceEvidence(id, found)) return;
    if (!spec || !canInspect(spec.position)) return;
    found.add(id);
    const group = groups.get(id);
    pickup = { id, group, position: group.position.clone(), scale: group.scale.clone(), age: 0 };
    showFeedback(`已取证 · ${text(spec)}`, `Recovered · ${text(spec)}`);
    if (isTouch()) navigator.vibrate?.(35);
    currentTarget = null;
    refreshEvidenceVisibility();
    updateLabels(); updatePrompt();
  }
  function chooseCipher(direction) {
    if (!cipherOpen || currentIceStage(found) !== (found.has('note') ? (found.has('shard') ? 'routeTwo' : 'routeOne') : 'note') || cipherInput.length >= 4) return;
    cipherInput.push(direction);
    if (cipherInput.length === 4) {
      const second = found.has('note') && found.has('shard');
      if (cipherInput.join(',') === (second ? 'right,forward,right,forward' : 'forward,left,forward,left')) {
        if (!second) { found.add('note'); post('clue', 'note'); firstCipherSolved = true; }
        routeStarted = second ? !found.has('route') : currentIceStage(found) === 'routeOne'; routeStep = 0; routeAtStart = true; cipherOpen = false;
        cipherFeedback = second ? COPY[language].secondCodeSolved : COPY[language].cipherSolved;
        makeRouteMarkers();
        const note = groups.get('note'); if (note) note.visible = false;
        refreshEvidenceVisibility();
        if (!routeStarted) cipherFeedback = COPY[language].cipherSolved;
      } else {
        cipherFeedback = COPY[language].cipherWrong;
        cipherInput = [];
      }
    } else cipherFeedback = '';
    updateLabels(); updatePrompt();
  }
  function triggerCore() {
    if (disposed || coreTriggered || clueCount() !== CLUES.length || !found.has('note') || !found.has('route')) return;
    if (!canInspect(CORE_POSITION)) return;
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
      if (event.code === 'Digit1' || event.code === 'Numpad1') { event.preventDefault(); chooseCipher(found.has('note') && found.has('shard') ? 'right' : 'forward'); return; }
      if (event.code === 'Digit2' || event.code === 'Numpad2') { event.preventDefault(); chooseCipher(found.has('note') && found.has('shard') ? 'forward' : 'left'); return; }
      if (event.code === 'Backspace') { event.preventDefault(); cipherInput.pop(); cipherFeedback = ''; updateCipherInput(); return; }
      if (event.code === 'Escape') { event.preventDefault(); return; }
      return;
    }
    if (event.code === 'KeyE' || event.code === 'Enter') {
      event.preventDefault();
      interactWithTarget();
    } else if (event.code === 'Escape') handleExit();
  }
  function handleClick(event) {
    if (disposed || storyPaused || pickup || cipherOpen || event.target !== canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    ndc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects([...groups.values()].filter(group => group.visible), true)[0];
    const id = hit?.object.userData.clueId;
    if (id === 'note' && camera.position.distanceTo(notePosition) < 3.8) collect('note');
    else if (id && camera.position.distanceTo(groups.get(id).position) < 3.8) collect(id);
    else if (clueCount() === CLUES.length && found.has('route') && raycaster.intersectObject(coreGroup, true).length) triggerCore();
  }
  function setInit(next) {
    finishPickup();
    if (next?.language === 'en' || next?.language === 'zh') language = next.language;
    found.clear();
    for (const id of Array.isArray(next?.found) ? next.found : []) if (ALLOWED_CLUES.has(id)) found.add(id);
    routeStep = 0; routeStarted = false; routeAtStart = false; cipherOpen = false;
    firstCipherSolved = found.has('note'); cipherInput = []; cipherFeedback = ''; coreTriggered = false;
    routeMarkers.forEach(marker => { scene.remove(marker); disposeObject(marker); }); routeMarkers.length = 0;
    const stage = currentIceStage(found);
    if (!initialized && found.size) {
      const resumeZ = { footage: 10.5, routeOne: 23.5, shard: 48, routeTwo: 50.5, echo: 81, core: 84 }[stage];
      if (resumeZ) camera.position.set(7.5, camera.position.y, resumeZ);
    }
    if (!initialized) camera.lookAt(camera.position.x, camera.position.y, camera.position.z + 10);
    initialized = true;
    if (stage === 'routeTwo') cipherOpen = true;
    if (stage === 'routeOne') { routeStarted = true; routeAtStart = true; makeRouteMarkers(); }
    refreshEvidenceVisibility();
    updateLabels(); updatePrompt();
  }
  function setLanguage(nextLanguage) {
    if (nextLanguage !== 'zh' && nextLanguage !== 'en') return;
    language = nextLanguage;
    updateLabels();
    updatePrompt();
  }
  function setStoryPaused(paused) {
    storyPaused = paused;
    window.dispatchEvent(new Event(paused ? 'naiwa-story-pause' : 'naiwa-story-resume'));
    if (paused && document.pointerLockElement) document.exitPointerLock();
  }
  function progressRoute() {
    if (!routeStarted || found.has('route') || !routeMarkers.length) return;
    if (storyPaused || cipherOpen) return;
    const checkpoint = routeMarkers[0].position;
    // Crossing a doorway advances the journey without requiring a precise stop.
    if (camera.position.z < checkpoint.z - .5 || Math.abs(camera.position.x - checkpoint.x) > 1.45) return;
    const moments = routeIndex() ? [
      ['滴水声里混进了一下短促的呼吸。', 'A short breath slips between the drips.'],
      ['冰柱悬在头顶。脚步声先从对面传了回来。', 'Ice hangs overhead. Footsteps return from the far end before yours stop.'],
      ['墙上的倒影晚了一步才跟上。', 'The reflection on the wall follows a step too late.'],
      ['架子上的蜡盘还在。盘心有一个空白的圆。', 'The recording disc is still on its stand, with a blank circle at its centre.'],
    ] : [
      ['胶片里那扇门就在前面。门把上结着白霜。', 'The door from the film stands ahead. Frost coats its handle.'],
      ['地上有一道拖痕，一直延伸到另一侧的门。', 'A drag mark crosses the floor to the far doorway.'],
      ['离开镜室时，身后的门轻轻碰了一下。', 'As you leave, the door behind you taps against its frame.'],
      ['银色镜片压在架子上。边缘像是被人掰断的。', 'A silver lens rests on the stand. Its edge looks snapped by hand.'],
    ];
    showFeedback(...moments[Math.min(routeStep, 3)]);
    if (isTouch()) navigator.vibrate?.(20);
    if (!routeAtStart) {
      routeAtStart = true;
      makeRouteMarkers();
      updateLabels(); updatePrompt();
      return;
    }
    routeStep += 1;
    if (routeStep >= 4) {
      if (!found.has('routeOne')) {
        found.add('routeOne'); post('clue', 'routeOne');
        routeStarted = false; cipherOpen = false; cipherInput = [];
        cipherFeedback = COPY[language].secondCodeFound;
        if (document.pointerLockElement) document.exitPointerLock();
      } else {
        found.add('route'); post('clue', 'route');
        routeStarted = false;
      }
      refreshEvidenceVisibility();
      routeMarkers.forEach(marker => { marker.visible = false; });
    } else makeRouteMarkers();
    updateLabels(); updatePrompt();
  }
  function update(delta, time) {
    if (disposed) return;
    landmarks.update(delta, time, { found, camera });
    const dt = Math.min(delta, .1);
    feedbackRemaining -= dt;
    if (feedbackRemaining <= 0) feedback.hidden = true;
    if (pickup) {
      pickup.age += dt;
      const progress = Math.min(pickup.age / .42, 1);
      pickup.group.position.y = pickup.position.y + Math.sin(progress * Math.PI / 2) * .55;
      pickup.group.scale.copy(pickup.scale).multiplyScalar(1 - progress * .55);
      if (progress === 1) finishPickup();
    }
    coreCrystal.rotation.y += dt * .16;
    coreCrystal.position.y = .96 + Math.sin(time * .8) * .05;
    coreLight.intensity = 1.3 + Math.sin(time * 1.4) * .13;
    for (const marker of routeMarkers) {
      if (marker.userData.pulseMaterial) marker.userData.pulseMaterial.opacity = .55 + Math.sin(time * 2.6) * .18;
    }
    if (time * 1000 - lastNavAt > 100) { lastNavAt = time * 1000; updateNavigation(); }
    for (const group of exhibits.values()) {
      const [front, back] = group.userData.mirrorFaces;
      const nearby = camera.position.distanceToSquared(group.position) < 18 * 18;
      group.updateWorldMatrix(true, true);
      const toCamera = camera.position.clone().sub(front.getWorldPosition(new THREE.Vector3()));
      const frontFacing = toCamera.dot(front.getWorldDirection(new THREE.Vector3())) >= 0;
      front.visible = nearby && frontFacing;
      back.visible = nearby && !frontFacing;
    }
    progressRoute();
    currentTarget = cipherOpen ? null : nearbyTarget();
    focusRing.visible = !!currentTarget && !storyPaused && !pickup;
    if (focusRing.visible) {
      focusRing.position.set(currentTarget.position.x, .18, currentTarget.position.z);
      focusRing.material.opacity = .45 + Math.sin(time * 3) * .1;
    }
    for (const [id, group] of groups) {
      for (const material of group.userData.focusMaterials || []) {
        material.emissiveIntensity = currentTarget?.id === id ? .45 : .08;
      }
    }
    updateRouteReadout(); updatePrompt();
  }
  function dispose() {
    if (disposed) return;
    finishPickup();
    disposed = true;
    reflections.dispose();
    landmarks.dispose();
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
    disposeObject(coreGroup);
    scene.remove(focusRing); disposeObject(focusRing); feedback.remove();
    noteTrail.forEach(disposeObject);
    for (const group of groups.values()) disposeObject(group);
    routeMarkers.forEach(disposeObject);
  }
  function handleExit() { finishPickup(); post('exit'); }
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
  refreshEvidenceVisibility();
  updateLabels(); updatePrompt();
  return { setInit, setLanguage, setStoryPaused, isStoryPaused: () => storyPaused, update, dispose,
    refreshReflections: () => reflections.refresh(camera) };
}
