import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createEscapeScene} from '../src/frog-escape-scene.js';
import {createWorldItems} from '../src/frog-escape-items.js';
import {createInventory} from '../src/frog-escape-inventory.js';
import {createNavigation,createPlayer} from '../src/frog-escape-navigation.js';
import {updateFixtureAction} from '../src/frog-escape-interactions.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createPropModel,propItem} from '../src/frog-escape-props.js';
import {inventoryItemIcon} from '../src/frog-escape-inventory-icons.js';
import {itemDamage} from '../src/frog-escape-vitals.js';

const step=(seconds,fps,tick)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
const vector=value=>new THREE.Vector3(value.x,value.y,value.z);
const nested=(node,parent)=>{for(let current=node;current;current=current.parent)if(current===parent)return true;return false;};

for(const fps of [30,60,144]) {
  const scene=new THREE.Scene(),castle=createEscapeScene(scene,{labels:false,random:()=>.4});
  const items=createWorldItems(scene,castle.navigation,castle.pickupSeeds),bag=createInventory();
  const drawers=castle.interactables.filter(action=>action.fixtureKind==='drawer');
  for(const drawer of drawers) {
    const motion=drawer.motions[0];
    assert(!motion.pivot.children.some(mesh=>mesh.isMesh&&mesh.userData.solid===false&&mesh!==motion.handle),'drawers contain no fake paper/grey blocks');
    if(drawer.id.startsWith('desk-'))assert(drawer.loot.anchor.children.every(mesh=>mesh.userData.item?.type==='key'),'desk drawers have no added contents except a possible key');
  }
  assert(!scene.getObjectByName('storage:contents'),'fake kitchen cup cylinders are removed');
  const kitchen=castle.interactables.filter(action=>action.id.startsWith('kitchen-'));
  const stored=items.entries.filter(entry=>entry.mesh.name.startsWith('storage:usable-'));
  assert.equal(stored.length,kitchen.length*2,'each kitchen cupboard/drawer has two real items');
  assert(stored.every(entry=>!entry.available()));
  assert(stored.every(entry=>!items.pickup(entry,bag)),'closed storage cannot be picked through');
  const keyMesh=castle.runClues.keySeed.mesh,oldParent=keyMesh.parent,oldPosition=keyMesh.position.clone(),oldQuaternion=keyMesh.quaternion.clone(),oldScale=keyMesh.scale.clone();
  for(const action of kitchen) {
    // Try the actual key shape at every eligible kitchen anchor, rather than
    // relying on whichever location this particular random run selected.
    action.loot.anchor.add(keyMesh);keyMesh.position.set(0,.019,0);keyMesh.rotation.set(0,0,0);
    const scale=action.loot.anchor.getWorldScale(new THREE.Vector3());keyMesh.scale.set(1/scale.x,1/scale.y,1/scale.z);
    const keyBounds=new THREE.Box3().setFromObject(keyMesh);
    const container=action.fixtureKind==='drawer'?action.motions[0].pivot:action.loot.anchor.parent;
    const contents=stored.filter(entry=>nested(entry.mesh,container));
    for(const entry of contents)assert(!keyBounds.intersectsBox(new THREE.Box3().setFromObject(entry.mesh)),`key remains clear of ${entry.item.kind} in ${action.id}`);
  }
  oldParent.add(keyMesh);keyMesh.position.copy(oldPosition);keyMesh.quaternion.copy(oldQuaternion);keyMesh.scale.copy(oldScale);
  const tracked=stored.filter(entry=>entry.trackContainer),before=tracked.map(entry=>vector(entry.body.position));
  kitchen.forEach(action=>{action.open=true;});
  step(.9,fps,dt=>{kitchen.forEach(action=>updateFixtureAction(action,dt));items.tick(dt);});
  assert(stored.every(entry=>entry.available()));
  tracked.forEach((entry,index)=>{
    assert(vector(entry.body.position).distanceTo(before[index])>.38,'cutlery follows the drawer travel');
    assert(entry.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(vector(entry.body.position))<1e-7,'drawer model and collision body stay aligned');
  });
  const cup=stored.find(entry=>entry.item.kind==='cup'&&!entry.trackContainer),point=cup.mesh.getWorldPosition(new THREE.Vector3());
  const eye=point.clone().add(new THREE.Vector3(0,.14,.7)),direction=point.clone().sub(eye).normalize();
  assert(items.nearby(eye,direction,0)===cup,'an open kitchen cupboard cup is actually aimable');
  assert(items.pickup(cup,bag));assert.equal(bag.remove(0).kind,'cup');
  const fork=tracked.find(entry=>entry.item.kind==='fork');assert(items.pickup(fork,bag));const forkItem=bag.remove(0);
  const dropped=items.drop(forkItem,{...createPlayer(),x:5,y:.15,z:4});assert(dropped&&!dropped.trackContainer&&dropped.body.mass>0,'releasing a drawer utensil restores ordinary dynamic physics');

  const clue=castle.runClues;clue.noteContainer.open=true;
  updateFixtureAction(clue.noteContainer,1);clue.sync();
  assert(clue.paper.visible&&nested(clue.paper,clue.noteContainer.loot.anchor),'the true printed code note is still inside its original drawer');
  const paperPoint=clue.paper.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.005,.055,-.02));
  assert(clue.nearbyNote(paperPoint.clone().add(new THREE.Vector3(0,.5,0)),new THREE.Vector3(0,-1,0),castle.navigation),'the actual note can still be read');
  const keyContainer=clue.keyContainer;keyContainer.open=true;updateFixtureAction(keyContainer,1);clue.sync();items.tick(1/fps);
  const keyEntry=items.entries.find(entry=>entry.item.kind==='shedKey');assert(items.pickup(keyEntry,bag),'the random container key remains usable');bag.remove(0);

  const books=items.entries.filter(entry=>entry.item.kind==='book'),shelf=scene.getObjectByName('furniture:bookcase');
  const compartments=shelf.children.filter(node=>node.name==='bookcase:open-compartment');assert.equal(compartments.length,4);
  assert(compartments.every(node=>node.children.length===8&&node.children.every(book=>book.userData.item?.kind==='book')),'every open compartment holds real book props');
  const shelfFront=shelf.localToWorld(new THREE.Vector3(0,0,-1)).sub(shelf.getWorldPosition(new THREE.Vector3()));
  assert(shelfFront.x>0,'the bookshelf opening faces inward from the west wall');
  for(const compartment of compartments) {
    const inside=compartment.localToWorld(new THREE.Vector3(0,.22,-.02));
    const outside=compartment.localToWorld(new THREE.Vector3(0,.22,-1));
    assert(castle.navigation.lineClear(outside,inside),'each shelf has an actual open front, without a solid panel');
    const book=books.find(entry=>nested(entry.mesh,compartment)),point=book.mesh.getWorldPosition(new THREE.Vector3());
    const eye=point.clone().addScaledVector(shelfFront,.75);
    assert(items.nearby(eye,point.clone().sub(eye).normalize(),0)===book,'books inside every hollow shelf can be picked from the room');
  }
  assert(books.filter(entry=>nested(entry.mesh,shelf)).length>10,'bookcase top and inner shelves contain real books');
  assert.equal(books.filter(entry=>entry.mesh.name==='bookcase:top-book').length,3);
  const deskBooks=books.filter(entry=>!nested(entry.mesh,shelf));assert.equal(deskBooks.length,3);
  assert(!shelf.children.some(mesh=>mesh.isMesh&&mesh.userData.solid===false),'fake bookshelf blocks are gone');
  for(const entry of books) {
    const visual=new THREE.Box3().setFromObject(entry.mesh);
    const q=new THREE.Quaternion(entry.body.quaternion.x,entry.body.quaternion.y,entry.body.quaternion.z,entry.body.quaternion.w);
    const collision=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(...entry.item.size)).applyMatrix4(new THREE.Matrix4().compose(vector(entry.body.position),q,new THREE.Vector3(1,1,1)));
    assert(visual.min.distanceTo(collision.min)<1e-6&&visual.max.distanceTo(collision.max)<1e-6,'standing and flat books have matching visual/physics dimensions');
  }
  const bottom=deskBooks.sort((a,b)=>a.y-b.y)[0],above=deskBooks.slice(1),heights=above.map(entry=>entry.y);
  assert(items.pickup(bottom,bag));const bookItem=bag.remove(0);assert(inventoryItemIcon(bookItem).includes('<svg'));
  step(.5,fps,dt=>items.tick(dt));assert(above.every((entry,i)=>entry.y<heights[i]-.015),'removing the bottom book lets the other books fall onto the desk');
  const player={...createPlayer(),x:5,y:.15,z:5},origin=new THREE.Vector3(4.75,2.2,3.7);
  const placement=items.placement(bookItem,origin,new THREE.Vector3(0,-1,0),player);assert(placement?.valid,'books can be aimed onto the authored desk');
  const placed=items.place(bookItem,placement);assert(placed);step(.3,fps,dt=>items.tick(dt));assert(items.pickup(placed,bag),'a placed book can be picked up again');bag.remove(0);
}

// A real thrown book must damage the actual NPC capsule once, survive impact,
// retain its appearance and remain reusable at different refresh rates.
for(const fps of [30,60,144]) {
  const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary:[[-20,-20],[20,-20],[20,20],[-20,20]]});
  const items=createWorldItems(scene,navigation),player={...createPlayer(),x:0,y:.15,z:-3,hidden:true},spawn={x:0,y:.15,z:0};
  const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems:items,player,spawn,patrolRoute:[spawn],random:()=>.99});
  const book=propItem('book',`throw-book-${fps}`),hits=[];scene.addEventListener('escape-pursuer-hit',event=>hits.push(event));
  assert.equal(itemDamage(book),2);assert(!book.fragile&&!book.energy);
  const thrown=items.throw(book,player,new THREE.Vector3(0,1.3,-3),new THREE.Vector3(0,0,1));assert(thrown);
  step(.45,fps,dt=>{npc.tick(dt);items.tick(dt);});
  assert.equal(npc.health,18,'real book collision deals exactly 2 damage');assert.equal(hits.length,1);assert.equal(hits[0].damage,2);
  assert(!thrown.broken&&items.entries.includes(thrown),'books survive their hit');
  const bag=createInventory();assert(items.pickup(thrown,bag));const recovered=bag.remove(0);assert.equal(recovered.id,book.id);
  const fresh=createPropModel(book),again=createPropModel(recovered);
  const cover=model=>model.children[0].children[0].material.color.getHex();assert.equal(cover(fresh),cover(again),'a recovered book retains its cover colour');
  assert(items.throw(recovered,player,new THREE.Vector3(0,1.3,-3),new THREE.Vector3(1,0,0)),'books can be thrown again');
  npc.dispose();
}
console.log('Books/storage OK: fake drawer paper and kitchen cups removed; real tableware, closed-storage gating, moving drawer bodies and key clearance; true code note and key preserved; standing/flat book bounds, desk support, placement, repick, repeat throwing and actual NPC 2-damage impacts at 30/60/144 FPS.');
