import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createPlayer,advancePlayer,jumpPlayer,createNavigation,stairHeight,PLAYER_RADIUS} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {updateCastleDoor} from '../src/frog-escape-doors.js';
import {searchLookPose} from '../src/frog-escape-search-look.js';

const scene=new THREE.Scene(),map=createEscapeScene(scene,{labels:false}),navigation=map.navigation;
const failures=[];
for(const [index,stair] of navigation.stairs.slice(0,3).entries())for(const fraction of [.12,.51,.82,.88])for(const up of [false,true]) {
  for(const door of map.doors){door.pressureActor=null;door.open=false;updateCastleDoor(door,2);}
  const x=(stair.minX+stair.maxX)/2+(fraction===.12?-.25:fraction===.51?.25:0),z=stair.startZ+(stair.endZ-stair.startZ)*fraction;
  const spawn={x,y:stairHeight(stair,z),z},target=index===2?{x:1,y:up?.15:-.83,z:up?-5.4:-10.2}:
    {x:8,y:up?stair.top:stair.bottom,z:up?-5.3:5.3};
  if(index===2&&fraction>.85){const rear=map.doors.find(door=>door.id==='rear');rear.open=true;updateCastleDoor(rear,2);}
  assert(!navigation.blocked(spawn.x,spawn.y,spawn.z,false,2.1,.4),`the regression starts at a real clear stair tread: ${JSON.stringify({index,fraction,up,spawn})}`);
  const player={...createPlayer(),hidden:true},worldItems={physics:{addActor:()=>({remove(){}}),syncActors(){}}};
  const npc=createNaiwaPursuer({scene,navigation,doors:map.doors,interactables:map.interactables,worldItems,player,spawn,patrolRoute:[target]});
  let reached=false;
  for(let frame=0;frame<2000;frame++) {
    for(const door of map.doors)updateCastleDoor(door,.04,[player,npc.actor],navigation);
    npc.tick(.04);
    if(Math.hypot(npc.actor.x-target.x,npc.actor.z-target.z)<.65&&Math.abs(npc.actor.y-target.y)<.3){reached=true;break;}
  }
  if(!reached)failures.push({index,fraction,up,actor:{x:npc.actor.x,y:npc.actor.y,z:npc.actor.z},path:npc.path.slice(0,3)});
  npc.dispose();
}
if(failures.length)console.log(JSON.stringify(failures,null,2));
assert.equal(failures.length,0,'Naiwa resumes both directions from off-center stair treads and passes the rear door');

// Crouching guards both straight and diagonal furniture edges at varied frame rates.
const platform={x:0,z:0,halfX:1,halfZ:1,minY:.15,maxY:1.35,axisX:[1,0],axisZ:[0,1]};
const world=createNavigation({solids:[platform],stairs:[],boundary:[[-20,-20],[20,-20],[20,20],[-20,20]]});
for(const fps of [25,60,144])for(const diagonal of [false,true]) {
  const player={...createPlayer(),x:0,y:1.35,z:0,crouched:true};
  for(let i=0;i<fps*2;i++)advancePlayer(player,2/fps,diagonal?2/fps:0,1/fps,world);
  assert(player.grounded&&Math.abs(player.y-1.35)<.001,'crouching stops at the high edge');
  assert(Number.isFinite(world.support(player.x,player.z,player.y,0,PLAYER_RADIUS)),'a guarded foot keeps real support');
  player.crouched=false;
  for(let i=0;i<fps*2;i++)advancePlayer(player,2/fps,diagonal?2/fps:0,1/fps,world);
  assert(Math.abs(player.y-.15)<.001,'standing allows deliberately walking off the same edge');
}
for(const height of [.75,1.05]) {
  platform.maxY=height;const player={...createPlayer(),x:0,y:height,z:0,crouched:true};
  for(let i=0;i<150;i++)advancePlayer(player,.04,0,1/60,world);
  assert(player.grounded&&Math.abs(player.y-height)<.001,'crouching also guards bed and table edges shorter than one metre');
}
platform.maxY=1.35;
for(const stair of navigation.stairs) {
  const player={...createPlayer(),x:(stair.minX+stair.maxX)/2,y:stair.top,z:stair.endZ,crouched:true};
  for(let i=0;i<600;i++)advancePlayer(player,0,Math.sign(stair.startZ-stair.endZ)*.04,1/60,navigation);
  assert(player.y<=stair.bottom+.25,'edge protection still allows crouched stair descent');
}
const fall={...createPlayer(),x:3,y:2.15,z:0,velocityY:0,grounded:false};
let fallTime=0;
while(!fall.grounded&&fallTime<2){advancePlayer(fall,0,0,1/144,world);fallTime+=1/144;}
assert(fallTime<.49&&fallTime>.4,'the 2m descent is a little faster than the old 15m/s² gravity');
const jump={...createPlayer(),x:3,y:.15,z:0};jumpPlayer(jump);let apex=jump.y;
for(let i=0;i<144;i++){advancePlayer(jump,0,0,1/144,world);apex=Math.max(apex,jump.y);}
assert(apex>1.45&&apex<1.53,'faster falling retains the original jump height');

const scan=Array.from({length:850},(_,i)=>searchLookPose(i/100));
assert(Math.max(...scan.map(pose=>pose.body))-Math.min(...scan.map(pose=>pose.body))<Math.PI,'searching never slowly circles around');
assert(Math.abs(searchLookPose(1).head-searchLookPose(1.5).head)<1e-8,'a glance pauses long enough to inspect');
assert(Math.abs(searchLookPose(.82).head-searchLookPose(.55).head)>.5,'head turns are brief and distinct from the holds');
console.log('Traversal OK: off-center stair recovery in both directions, rear door passage, crouched straight/diagonal ledge guard, crouched stairs, faster descent with unchanged jump height, bounded head turns and observation pauses.');
