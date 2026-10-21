import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';

function setup(fps,{difficulty='normal'}={}) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary:[[-40,-40],[40,-40],[40,40],[-40,40]]});
  const player={...createPlayer(),x:12,y:-.83,z:12,hidden:true},spawn={x:16,y:-.83,z:12};
  const messages=[];
  const npc=createNaiwaPursuer({scene,navigation,doors:[],player,spawn,difficulty,onState:message=>messages.push(message),patrolRoute:[{x:29,y:-.83,z:12}],worldItems:{physics:{addActor:()=>({remove(){}}),syncActors(){}}},random:()=>.99});
  const step=dt=>npc.tick(dt);for(let i=0;i<Math.ceil(fps*5.13);i++)step(1/fps);
  assert(npc.hear({x:npc.actor.x+3,y:npc.actor.y+1,z:npc.actor.z},1));step(1/fps);
  return {scene,navigation,player,npc,step,messages};
}
for(const fps of [30,60,144]) {
  const t=setup(fps);t.player.x=t.npc.actor.x-5;t.player.hidden=false;t.npc.actor.yaw=Math.atan2(t.npc.actor.x-t.player.x,t.npc.actor.z-t.player.z);
  assert(t.npc.visiblePlayer());const before={x:t.npc.actor.x,z:t.npc.actor.z};t.step(1/fps);
  assert.equal(t.npc.state,'chase');
  for(let i=1;i<Math.ceil(fps*.3);i++)t.step(1/fps);
  assert(t.npc.actor.x<before.x-.4,`a new visual chase must discard the eastbound sound route immediately (${fps} FPS): ${before.x} -> ${t.npc.actor.x}`);
  assert.equal(t.messages.at(-1).text,'奶蛙发现了你！');
  const seen={x:t.player.x,z:t.player.z};t.player.hidden=true;t.player.x+=16;t.player.z+=12;t.step(1/fps);
  assert.equal(t.npc.state,'chase');assert.equal(t.messages.at(-1).text,'奶蛙正在追踪你最后出现的位置');
  const distance=Math.hypot(t.npc.actor.x-seen.x,t.npc.actor.z-seen.z);for(let i=0;i<fps*.35;i++)t.step(1/fps);
  assert(Math.hypot(t.npc.actor.x-seen.x,t.npc.actor.z-seen.z)<distance-.4,'lost sight follows the known position rather than the hidden player');
  t.player.hidden=false;t.player.x=t.npc.actor.x+5;t.player.z=t.npc.actor.z;t.npc.actor.yaw=-Math.PI/2;
  const reacquired=t.npc.actor.x;t.step(1/fps);for(let i=1;i<Math.ceil(fps*.3);i++)t.step(1/fps);
  assert(t.npc.actor.x>reacquired+.4,'fresh sight immediately supersedes the old last-seen route');assert.equal(t.messages.at(-1).text,'奶蛙发现了你！');
  t.npc.dispose();
}
{
  const t=setup(60,{difficulty:'hacker'});t.npc.setTrackingSource(()=>true);t.step(1/60);assert.equal(t.npc.state,'chase');assert.equal(t.messages.at(-1).text,'奶蛙正在循着气息追踪你！');t.npc.dispose();
}
console.log('Chase direction OK: real outdoor sound-to-sight route reversal and reacquisition at 30/60/144 FPS; live versus last-seen HUD, no hidden-player position leak, and scent-only Transcendent wording.');
