import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Body} from 'cannon-es';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {propItem,createPickupProps} from '../src/frog-escape-props.js';
import {createNavigation} from '../src/frog-escape-navigation.js';

for(const fps of [30,60,144])for(const action of ['pickup','break']) {
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false}),items=createWorldItems(scene,castle.navigation,castle.pickupSeeds),bag=createInventory();
  const bowl=items.entries.find(entry=>entry.item.kind==='bowl'&&entry.mesh.parent.name==='furniture:serving-bowl'),tomatoes=items.entries.filter(entry=>entry.item.kind==='tomato'&&entry.mesh.parent===bowl.mesh.parent);
  assert.equal(tomatoes.length,3);assert(tomatoes.every(entry=>entry.body.sleepState===Body.SLEEPING));
  const heights=tomatoes.map(entry=>entry.y),other=items.entries.find(entry=>entry.item.kind==='plate');
  for(let i=0;i<bag.slots.length;i++)bag.store({id:`filled-${i}`,name:'test'});
  assert(!items.pickup(bowl,bag));assert(tomatoes.every(entry=>entry.body.sleepState===Body.SLEEPING),'a failed full-inventory pickup leaves the supported food alone');
  bag.remove(0);
  if(action==='pickup')assert(items.pickup(bowl,bag));
  else {const point=new THREE.Vector3(bowl.x,bowl.y,bowl.z),hit=items.strike(point.clone().add(new THREE.Vector3(0,0,-.65)),new THREE.Vector3(0,0,1),propItem('crowbar','support-break'));assert(hit.broken&&hit.target===bowl);}
  assert(tomatoes.every(entry=>entry.body.sleepState!==Body.SLEEPING),'removing the real serving bowl wakes every tomato');
  assert.equal(other.body.sleepState,Body.SLEEPING,'unrelated tableware stays asleep');
  for(let frame=0;frame<fps/5;frame++)items.tick(1/fps);
  assert(tomatoes.every((entry,i)=>entry.y<heights[i]-.02),'all food drops naturally instead of floating');
  for(let frame=0;frame<fps*3;frame++)items.tick(1/fps);
  for(const tomato of tomatoes) {
    const p=tomato.mesh.getWorldPosition(new THREE.Vector3());assert(p.distanceTo(new THREE.Vector3(tomato.x,tomato.y,tomato.z))<.002,'rendered food follows its rigid body');
    assert(tomato.y>1.05&&tomato.y<1.19,'tomatoes settle on the actual dining tabletop');
    const ray=items.physics.ray(p.clone().add(new THREE.Vector3(0,.3,0)),p.clone().add(new THREE.Vector3(0,-.15,0)));
    assert.equal(ray?.body.propEntry,tomato,'fallen food remains physically pickable');
  }
  bag.remove(0);assert(items.pickup(tomatoes[0],bag));
}
// Wake the entire support chain, including a tomato several dishes above the
// picked-up base, rather than only the nearest body or all props in the room.
const scene=new THREE.Scene(),root=new THREE.Group(),props=createPickupProps();scene.add(root);
for(let i=0;i<3;i++)props.place(root,'plate',15,-.83+i*.036,15);
props.place(root,'tomato',15,-.83+3*.036+.002,15);
const navigation=createNavigation({solids:[],stairs:[],boundary:[[-30,-30],[30,-30],[30,30],[-30,30]]}),items=createWorldItems(scene,navigation,props.seeds),bag=createInventory();
assert(items.pickup(items.entries[0],bag));assert(items.entries.every(e=>e.body.sleepState!==Body.SLEEPING),'all layers above the removed bottom plate wake');
const tomato=items.entries.find(e=>e.item.kind==='tomato'),before=tomato.y;
for(let i=0;i<180;i++)items.tick(1/60);assert(tomato.y<before-.02,'the uppermost food follows the stack down');
console.log('Support removal OK: real serving-bowl pickup/break at 30/60/144 FPS, full-bag and unrelated-prop isolation, natural tabletop settling, mesh/physics and pickup rays; full multi-plate support chains wake and settle.');
