import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './frog-escape-map.css';
import { createEscapeScene } from './frog-escape-scene.js';
import { createEscapeExplorer } from './frog-escape-explorer.js';
import { createNaiwaPursuer } from './frog-escape-pursuer.js';
import {createEscapeRenderBatches} from './frog-escape-render-batches.js';
import {createEscapeQuality,bindEscapeQualityControls} from './frog-escape-quality.js';
import {createEscapeFullscreen} from './frog-escape-fullscreen.js';
import { showReleaseNotes } from './release-notes';
import './release-notes.css';
import {tr,escapeLanguage,initEscapeLanguage,setEscapeLanguage,onEscapeLanguageChange,bindEscapeDocument} from './frog-escape-i18n.js';

initEscapeLanguage();
bindEscapeDocument();

const canvas = document.querySelector('#escape-world');
const stage = document.querySelector('.escape-stage');
const status = document.querySelector('#escape-status');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151b2a);
scene.fog = new THREE.Fog(0x202436, 43, 96);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 150);
camera.position.set(30, 27, 34);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, window.matchMedia('(pointer:coarse)').matches?1.3:1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 3.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 17;
controls.maxDistance = 75;
controls.maxPolarAngle = Math.PI * 0.49;
scene.add(new THREE.HemisphereLight(0x8c9bc2, 0x17161e, 1.25));
const moonlight = new THREE.DirectionalLight(0x9eafd6, 2.15);
moonlight.position.set(-18, 35, 20);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(2048, 2048);
moonlight.shadow.normalBias=.025;
moonlight.shadow.bias=-.00012;
moonlight.shadow.camera.left = -35; moonlight.shadow.camera.right = 35; moonlight.shadow.camera.top = 35; moonlight.shadow.camera.bottom = -35;
scene.add(moonlight);
const duskFill = new THREE.DirectionalLight(0xffab75, .38);
duskFill.position.set(24, 9, -26);
scene.add(duskFill);

const castle=createEscapeScene(scene);
createEscapeRenderBatches(castle);
const { groups, roof, navigation, playerPin, doors,interactables,pickupSeeds,beds,rooms,runClues,escapeProgress,refreshLabels } = castle;
const explorer=createEscapeExplorer({scene,canvas,stage,status,groups,roof,navigation,playerPin,doors,interactables,pickupSeeds,beds,runClues,escapeProgress,onMap:()=>setLevel('all')});
const alert=document.querySelector('#escape-pursuer-alert');
let pursuerText='',mapLayer='all';
const pursuer=createNaiwaPursuer({scene,navigation,doors,interactables,beds,rooms,worldItems:explorer.worldItems,player:explorer.player,onCatch:()=>explorer.capture(),onState:({state,text})=>{pursuerText=text;alert.textContent=tr(text);alert.dataset.state=state;}});
explorer.setPursuer(pursuer);
let renderRequested=true;
const quality=createEscapeQuality({renderer,scene,moonlight,flashlight:explorer.flashlight,mobile:window.matchMedia('(pointer:coarse)').matches,onChange:id=>{renderRequested=true;document.querySelector('#app').dataset.quality=id;}});
quality.watchRoot(explorer.camera);quality.watchRoot(pursuer.model.root);
const refreshQuality=bindEscapeQualityControls(quality);
const fullscreen=createEscapeFullscreen({root:document.querySelector('#app'),onChange:()=>{renderRequested=true;quality.invalidate();}});

function setLevel(id) {
  mapLayer=id;
  status.hidden=false;
  pursuer.setMapLayer(id);
  renderer.shadowMap.needsUpdate=true;
  renderRequested=true;
  quality.invalidate();
  const isAll = id === 'all';
  groups.basement.visible = isAll || id === 'basement';
  groups.ground.visible = isAll || id === 'ground';
  groups.upper.visible = isAll || id === 'upper';
  roof.visible = isAll;
  groups.yard.visible = isAll || id === 'yard';
  groups.labels.children.forEach(label => { label.visible = isAll || (id === 'yard' && label.position.y < 4) || (id === 'basement' && label.position.y < -2) || (id === 'ground' && label.position.y > -1 && label.position.y < 4.4) || (id === 'upper' && label.position.y > 4.4); });
  status.textContent = tr(({all:'完整庭院 · 地下室 · 两层别墅',basement:'地下室 · 玩家起点与维修间',ground:'一层 · 门厅、书房、厨房后门',upper:'二层 · 主卧、客房与阳台',yard:'庭院 · 工具棚与北侧铁栅栏'})[id]);
  document.querySelectorAll('[data-level]').forEach(button => {
    const active = button.dataset.level === id;
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{explorer.showMap();setLevel(button.dataset.level);}));
document.querySelector('#escape-home-view').addEventListener('click',()=>{ camera.position.set(30,27,34); controls.target.set(0,3.2,0); controls.update(); setLevel('all'); });
function resize() { const r=stage.getBoundingClientRect();quality.resize(r.width,r.height);renderRequested=true;camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); explorer.camera.aspect=r.width/r.height;explorer.camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage); resize();
let lastTime=performance.now();
renderer.setAnimationLoop(time=>{
  const frameMs=Math.max(time-lastTime,0),dt=Math.min(frameMs/1000,.04);lastTime=time;
  if(document.hidden)return;
  controls.enabled=!explorer.active;
  const dirty=explorer.tick(dt),orbitChanged=!explorer.active&&controls.update();
  const playing=explorer.active&&!explorer.paused&&!explorer.captured&&!explorer.won&&!explorer.gameOver;
  if(playing)castle.flicker.tick(dt);
  if(playing||dirty||orbitChanged||renderRequested||quality.needsShadowUpdate){quality.render(explorer.active?explorer.camera:camera,{dt,frameMs,playing,dirty});renderRequested=false;}
});
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();renderRequested=true;quality.invalidate();});
const app=document.querySelector('#app');
document.querySelector('#escape-release-entry').addEventListener('click',()=>{explorer.showMap();showReleaseNotes(app,escapeLanguage());});
const languageButton=document.querySelector('#escape-language');
function refreshLanguage() {
  languageButton.value=escapeLanguage();fullscreen.refresh();
  explorer.refreshLanguage();refreshLabels();refreshQuality();renderRequested=true;alert.textContent=tr(pursuerText);
  if(!explorer.active)setLevel(mapLayer);
}
onEscapeLanguageChange(refreshLanguage);
languageButton.addEventListener('change',()=>setEscapeLanguage(languageButton.value));
refreshLanguage();
showReleaseNotes(app,escapeLanguage(),true);
