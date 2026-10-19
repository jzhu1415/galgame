import * as THREE from 'three';
import {setCastleDoorOpen} from './frog-escape-doors.js';

export const FRONT_DOOR_CLOSE_SECONDS=5;

// This state belongs to one run: waking, map mode and pausing never reroll it.
export function createRunClues({seeds,actions,frontDoor,random=Math.random,difficulty='normal'}) {
  const choose=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
  const code=String(Math.min(9999,Math.floor(random()*10000))).padStart(4,'0');
  const keySeed=seeds.find(seed=>seed.item.kind==='shedKey');
  const home={parent:keySeed.mesh.parent,position:keySeed.mesh.position.clone(),scale:keySeed.mesh.scale.clone()};
  const containers=actions.filter(action=>action.loot);
  const noteContainer=choose(containers.filter(action=>action.loot.room==='master-bedroom'));
  const keyContainers=containers.filter(action=>action!==noteContainer);
  let keyContainer=null,configured=null,started=false,codeKnown=false;
  const paper=new THREE.Group();paper.name='clue:front-door-code';
  const sheet=new THREE.Mesh(new THREE.BoxGeometry(.23,.003,.145),new THREE.MeshStandardMaterial({color:0xe9dfbf,roughness:1}));paper.add(sheet);
  // The small sheet is legible in the enlarged view; these are ink strokes, not collision boxes.
  for(let i=0;i<4;i++) {
    const ink=new THREE.Mesh(new THREE.PlaneGeometry(.135-i*.014,.003),new THREE.MeshBasicMaterial({color:0x474038,side:THREE.DoubleSide}));
    ink.rotation.x=-Math.PI/2;ink.position.set(-.015,.002,-.038+i*.024);paper.add(ink);
  }
  const anchor=new THREE.Object3D();anchor.position.set(.005,.055,-.02);paper.add(anchor);
  noteContainer.loot.anchor.add(paper);paper.position.y=.003;
  // A real printed code is visible on the sheet as well as in the E-to-read dialog.
  if(globalThis.document?.createElement) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;
    const ctx=canvas.getContext?.('2d');
    if(ctx) {
      ctx.fillStyle='#e9dfbf';ctx.fillRect(0,0,512,320);ctx.fillStyle='#40382f';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 110px monospace';ctx.fillText(code,256,160);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const print=new THREE.Mesh(new THREE.PlaneGeometry(.225,.14),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
      print.rotation.x=-Math.PI/2;print.position.y=.003;paper.add(print);
    }
  }
  keySeed.trackContainer=true;
  keySeed.available=()=>!keyContainer||keyContainer.amount>.72;
  frontDoor.codeRequired=true;frontDoor.autoCloseDelay=FRONT_DOOR_CLOSE_SECONDS;
  function configureDifficulty(id) {
    if(started)return false;
    if(configured===id)return true;
    const wasEasy=configured==='easy';configured=id;
    if(id==='easy') {
      keyContainer=null;home.parent.add(keySeed.mesh);keySeed.mesh.position.copy(home.position);keySeed.mesh.scale.copy(home.scale);keySeed.mesh.name='quest:toilet-key';
    } else if(!keyContainer||wasEasy) {
      keyContainer=choose(keyContainers);keyContainer.loot.anchor.add(keySeed.mesh);
      keySeed.mesh.position.set(0,keySeed.item.size[1]/2+.004,0);keySeed.mesh.rotation.set(0,0,0);
      const scale=keyContainer.loot.anchor.getWorldScale(new THREE.Vector3());keySeed.mesh.scale.set(1/scale.x,1/scale.y,1/scale.z);keySeed.mesh.name='quest:container-tool-key';
    }
    sync();return true;
  }
  function sync() {
    paper.visible=noteContainer.amount>.72;
    if(keySeed.mesh.parent)keySeed.mesh.visible=keySeed.available();
  }
  function nearbyNote(origin,direction,navigation) {
    if(!paper.visible)return null;
    const point=anchor.getWorldPosition(new THREE.Vector3()),delta=point.clone().sub(origin),distance=delta.length();
    if(distance>2.25||distance<.05||delta.dot(direction)/distance<.985)return null;
    // The note sits in an open drawer: its sides, shelves and furniture still occlude it.
    if(!navigation.lineClear(origin,point))return null;
    return {kind:'code-note',name:'大门密码纸条',point};
  }
  function submit(value,owner=null) {
    if(!/^[0-9]{4}$/.test(value)||value!==code)return false;
    if(!setCastleDoorOpen(frontDoor,true,owner))return false;
    frontDoor.autoCloseRemaining=FRONT_DOOR_CLOSE_SECONDS;return true;
  }
  configureDifficulty(difficulty);
  return {code,paper,noteContainer,keySeed,containers,frontDoor,configureDifficulty,sync,nearbyNote,submit,
    readNote(){codeKnown=true;},get codeKnown(){return codeKnown;},beginRun(){started=true;},get keyContainer(){return keyContainer;}};
}
