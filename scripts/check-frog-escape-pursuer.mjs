import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createPlayer} from '../src/frog-escape-navigation.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {propItem} from '../src/frog-escape-props.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';
import {updateCastleDoor} from '../src/frog-escape-doors.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';

assert.equal(createHash('sha256').update(readFileSync('references/naiwa-escape-turnaround.png')).digest('hex'),'e322248de265797af7b60f64fca3546d12b949c753efb51cb8cff0a091d87dcf','the actual supplied turnaround is preserved');
const model=createNaiwaModel(),size=new THREE.Box3().setFromObject(model.root).getSize(new THREE.Vector3());
assert(size.y>2.1&&size.y<2.3&&size.x<1.4,'the real 3D character fits castle doors');
const eyes=[];model.root.traverse(mesh=>{if(mesh.name==='naiwa:green-eye')eyes.push(mesh);});
assert.equal(eyes.length,2);assert(eyes.every(eye=>eye.material.color.getHex()===0x6da84b));
assert(model.root.getObjectByName('naiwa:continuous-body').geometry.getAttribute('color'),'yellow skin and cream belly are part of the curved body');
model.animate(.04,{state:'grab'});model.animate(.04,{state:'down'});

function setup(spawn={x:10,y:.15,z:0},patrolRoute=[spawn]) {
  const scene=new THREE.Scene(),map=createEscapeScene(scene,{labels:false}),items=createWorldItems(scene,map.navigation,map.pickupSeeds);
  const player={...createPlayer(),hidden:true},events=[];let caught=0;
  const npc=createNaiwaPursuer({scene,navigation:map.navigation,doors:map.doors,interactables:map.interactables,worldItems:items,player,spawn,patrolRoute,onCatch:()=>caught++,onState:event=>events.push(event.state)});
  function step(seconds,physics=false,dt=.04) {
    for(let i=0;i<Math.ceil(seconds/dt);i++) {
      for(const door of map.doors)updateCastleDoor(door,dt,[player,npc.actor],map.navigation);
      for(const action of map.interactables)updateFixtureAction(action,dt,[player,npc.actor],map.navigation);
      npc.tick(dt);if(physics||map.navigation.chairs.some(chair=>chair.body.sleepState!==2))items.tick(dt,player);
    }
  }
  return {scene,map,items,player,npc,step,events,get caught(){return caught;}};
}
const targets=[{x:-1,y:-5.05,z:3.7},{x:1,y:5.15,z:-5.2},{x:-2.8,y:5.15,z:3.8},{x:15,y:-.7,z:3.2}];
const touring=setup({x:1.8,y:.15,z:5.6},targets);let reached=0;
for(let frame=0;frame<7000;frame++) {
  touring.step(.04);
  const {actor}=touring.npc,target=targets[reached];
  assert(Number.isFinite(actor.y)&&actor.y>=-5.051,'pursuit movement retains a real floor');
  if(Math.hypot(actor.x-target.x,actor.z-target.z)<.75&&Math.abs(actor.y-target.y)<.3){reached++;if(reached===targets.length)break;}
}
assert.equal(reached,targets.length,`patrol actually walks through cellar stairs, upstairs rooms, exterior steps and shed entrance: ${JSON.stringify({actor:touring.npc.actor,state:touring.npc.state,path:touring.npc.path.slice(0,4),doors:touring.map.doors.map(door=>({id:door.id,amount:door.amount,open:door.open,blocked:door.blocked}))},(key,value)=>['collider','damageable','pressureActor','root','parent','perchedChair'].includes(key)?undefined:value)}`);
assert(touring.map.doors.find(door=>door.id==='bedroom').open&&touring.map.doors.find(door=>door.id==='shed').open,'Naiwa opens the doors needed by its route');
touring.npc.dispose();

const stealth=setup();stealth.step(5.2);
Object.assign(stealth.player,{x:10,y:.15,z:-2.8,hidden:false});
assert(stealth.npc.visiblePlayer(),'unhidden player in the view cone is visible');
stealth.player.z=2.8;assert(!stealth.npc.visiblePlayer(),'distant player behind Naiwa is outside the view cone');
stealth.player.z=-2.8;stealth.player.y=5.15;assert(!stealth.npc.visiblePlayer(),'a different storey is not visible through a slab');
Object.assign(stealth.player,{x:4.5,y:.15,z:-4});stealth.npc.actor.yaw=Math.atan2(stealth.npc.actor.x-stealth.player.x,stealth.npc.actor.z-stealth.player.z);
assert(!stealth.npc.visiblePlayer(),'walls block sight even when facing the player');
Object.assign(stealth.player,{x:10,y:.15,z:-2.8});stealth.npc.actor.yaw=0;stealth.step(.04);assert.equal(stealth.npc.state,'chase');
stealth.player.hidden=true;assert(!stealth.npc.visiblePlayer(),'closed wardrobe hiding removes the player from sight');
stealth.step(3.2);assert.equal(stealth.npc.state,'search','losing sight leads to a search');
stealth.step(8.5);assert.equal(stealth.npc.state,'patrol','search eventually returns to patrol');
stealth.npc.hear({x:stealth.npc.actor.x+1,y:stealth.npc.actor.y+1,z:stealth.npc.actor.z});assert.equal(stealth.npc.state,'search','nearby object noise attracts attention');
stealth.npc.dispose();

const capture=setup();capture.step(5.2);Object.assign(capture.player,{x:10,y:.15,z:-.82,hidden:false});
capture.step(.32);assert.equal(capture.npc.state,'grab');assert.equal(capture.caught,0,'grabbing has an escape window');
capture.player.hidden=true;capture.step(.5);assert.equal(capture.caught,0,'successful hiding interrupts the grab');
capture.npc.reset();capture.player.hidden=true;capture.step(5.2);Object.assign(capture.player,{x:10,y:.15,z:-.82,hidden:false});capture.step(1.6);
assert.equal(capture.caught,1);assert.equal(capture.npc.state,'caught');capture.step(1);assert.equal(capture.caught,1,'capture fires once');capture.npc.dispose();

const combat=setup();Object.assign(combat.player,{x:10,y:.15,z:-1.8,hidden:true});
const hand=new THREE.Vector3(10,1.73,-1.8),aim=new THREE.Vector3(0,0,1),bar=propItem('crowbar','test-melee');
for(const expected of [15,10,5,0]) {
  const result=combat.items.strike(hand,aim,bar);assert(result?.hit&&result.target===combat.npc.actor);
  assert.equal(combat.npc.health,expected);combat.step(.4);
}
assert.equal(combat.npc.state,'down');assert(combat.npc.stunTime>8&&combat.npc.stunTime<=8.5);
combat.step(7.8);assert.equal(combat.npc.state,'down','the first Normal knockdown lasts 8.5 seconds');
combat.step(.4);assert.equal(combat.npc.health,20);assert.notEqual(combat.npc.state,'down','Naiwa recovers after the first Normal knockdown');
combat.npc.reset();
const fork=combat.items.throw(propItem('fork','physics-fork'),combat.player,hand,aim);assert(fork);combat.step(.65,true);
assert(combat.npc.health<20&&combat.npc.state==='stunned','a real thrown fork damages and staggers Naiwa');assert(!fork.broken);
combat.step(1,true);const bag=createInventory();assert(combat.items.pickup(fork,bag),'the metal fork can be recovered after hitting Naiwa');
combat.npc.reset();
const bottle=combat.items.throw(propItem('bottle','physics-bottle'),combat.player,hand,aim);assert(bottle);combat.step(.65,true);
assert(combat.npc.health<20&&bottle.broken,'the bottle shatters on the character and causes a hit reaction');
combat.npc.dispose();

const covered=setup({x:-.9,y:.15,z:4.85});const attacker={...covered.player,x:1,y:.15,z:4.85};
const behindWall=new THREE.Vector3(1,1.73,4.85),west=new THREE.Vector3(-1,0,0);
covered.items.strike(behindWall,west,bar);assert.equal(covered.npc.health,20,'a wall shields Naiwa from melee');
covered.items.throw(propItem('bottle','blocked-bottle'),attacker,behindWall,west);covered.step(.8,true);
assert.equal(covered.npc.health,20,'a physical throw cannot damage Naiwa through the wall');covered.npc.dispose();
const looking=setup();looking.step(5.2);
looking.npc.hear({x:looking.npc.actor.x,y:looking.npc.actor.y+.2,z:looking.npc.actor.z});
looking.step(1.3);const heldYaw=looking.npc.actor.yaw;
looking.step(.25);assert(Math.abs(looking.npc.actor.yaw-heldYaw)<.001,'searching pauses to inspect instead of turning continuously');
assert(Math.abs(looking.npc.model.root.children[0].rotation.y)>.04,'the head/upper body looks sideways while the feet hold direction');
const headings=[];for(let i=0;i<140;i++){looking.step(.04);headings.push(looking.npc.actor.yaw);}
assert(Math.max(...headings)-Math.min(...headings)<Math.PI,'stationary searches use bounded shoulder checks rather than full circles');looking.npc.dispose();
console.log('Naiwa OK: supplied identity reference, animated 3D body, real multi-floor patrol and doors, vision/occlusion/hiding, head turns and search pauses, grab interruption and capture, crowbar tier damage/8.5-second first Normal knockdown/recovery, physical bottle and reusable fork hits, wall shielding.');
