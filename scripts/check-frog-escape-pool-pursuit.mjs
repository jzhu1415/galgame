import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createPlayer} from '../src/frog-escape-navigation.js';
import {createPursuitPathfinder} from '../src/frog-escape-pursuit-path.js';

for(const fps of [30,60,144])for(const difficulty of ['normal','hacker']) {
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),volume=castle.waterVolumes.find(volume=>volume.id==='garden-pool');
  const outside=volume.root.localToWorld(new THREE.Vector3(0,-.83,-3.4)),inside=volume.root.localToWorld(new THREE.Vector3(.45,volume.bottomY,-.75));
  const player={...createPlayer(),x:inside.x,y:inside.y,z:inside.z,hidden:true};let caught=0,entered=false;
  const npc=createNaiwaPursuer({scene,navigation:castle.navigation,doors:castle.doors,interactables:castle.interactables,rooms:castle.rooms,beds:castle.beds,player,difficulty,spawn:outside,patrolRoute:[outside],onCatch:()=>caught++,random:()=>.99,worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}}});
  for(let i=0;i<Math.ceil(fps*5.1);i++)npc.tick(1/fps);
  Object.assign(npc.actor,{x:outside.x,y:outside.y,z:outside.z,yaw:Math.PI,velocityY:0,grounded:true});player.hidden=false;
  if(difficulty!=='hacker')assert(npc.visiblePlayer(),'the actual water basin does not hide a visible player');
  const planner=createPursuitPathfinder(castle.navigation,{radius:.44,height:npc.actor.bodyHeight});const path=planner.findPath(npc.actor,player);
  assert(path.length,'A* recognizes the shallow pool entrance');assert(path.some(point=>point.y>-.6),'the path represents raised entry treads rather than flat lawn');
  for(let i=0;i<fps*12&&caught===0;i++){npc.tick(1/fps);entered ||=!!castle.navigation.waterAt(npc.actor);}
  assert(entered,`Naiwa actually enters the pool instead of retreating (${fps} FPS, ${difficulty})`);assert.equal(caught,1,'standing in the pool is not a hiding or invulnerability state');npc.dispose();
}
console.log('Pool pursuit OK: visible player, actual terrain-height A* route, real NPC entry and capture in the garden basin at 30/60/144 FPS for upright and hand-walking Naiwa.');
