import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createNaiwaModel} from '../src/frog-escape-naiwa-model.js';
import {createNaiwaPursuer} from '../src/frog-escape-pursuer.js';
import {createNavigation,createPlayer,advancePlayer} from '../src/frog-escape-navigation.js';
import {createCastleDoor,updateCastleDoor,syncBoxCollider} from '../src/frog-escape-doors.js';
import {NAIWA_HANDWALK} from '../src/frog-escape-naiwa-handwalk.js';

const original={document:globalThis.document,fetch:globalThis.fetch,ProgressEvent:globalThis.ProgressEvent};
const resources=[],boundary=[[-20,-20],[20,-20],[20,20],[-20,20]];
const worldItems={physics:{addActor:()=>({remove(){}}),syncActors(){}}};
const run=(seconds,tick,fps=60)=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(1/fps,rest);tick(dt);rest-=dt;}};
const box=(x,z,halfX,halfZ,minY,maxY)=>({x,z,halfX,halfZ,minY,maxY,axisX:[1,0],axisZ:[0,1]});
try{
  globalThis.document={};globalThis.ProgressEvent??=class{constructor(type,fields){Object.assign(this,{type,...fields});}};
  globalThis.fetch=async()=>new Response(readFileSync('assets/models/naiwa-h25-rigged.glb'));
  const model=createNaiwaModel();resources.push(model);assert(await model.ready);
  model.animate(0,{handWalking:true});
  const {root,skeleton}=model,skin=root.getObjectByProperty('isSkinnedMesh',true),bone=name=>skeleton.getBoneByName(name);
  const position=name=>bone(name).getWorldPosition(new THREE.Vector3());
  const direction=(name,axis)=>axis.clone().applyQuaternion(bone(name).getWorldQuaternion(new THREE.Quaternion()).normalize());
  const update=(options,seconds=.5)=>{run(seconds,dt=>model.animate(dt,options));root.updateMatrixWorld(true);};
  const p=skin.geometry.attributes.position,j=skin.geometry.attributes.skinIndex,w=skin.geometry.attributes.skinWeight;
  const handVertices=['L','R'].map(side=>{const index=skeleton.bones.indexOf(bone(`Hand_${side}`)),indices=[];for(let i=0;i<p.count;i++)for(let c=0;c<4;c++)if(j.array[i*4+c]===index&&w.array[i*4+c]>.9){indices.push(i);break;}return indices;});
  const palmHeights=()=>{root.updateMatrixWorld(true);return handVertices.map(indices=>Math.min(...indices.map(i=>skin.localToWorld(skin.getVertexPosition(i,new THREE.Vector3())).y)));};
  update({handWalking:true});assert.equal(model.activeClip,'HandIdle');
  const chestForward=direction('Chest',new THREE.Vector3(0,0,1));
  assert(position('Head').y<NAIWA_HANDWALK.height&&chestForward.z>.9&&chestForward.y<-.3,'the trunk inclines forward while facing forward');
  assert(position('Head').z>position('Chest').z+.09&&position('Head').z<position('Chest').z+.17,'the head follows the leaning trunk without a long neck reach');
  assert(bone('Chest').quaternion.angleTo(new THREE.Quaternion())<.04,'the upper back does not hunch over');
  assert(direction('Head',new THREE.Vector3(0,0,1)).z>.98,'the face looks ahead instead of down at the floor');
  assert(position('Foot_R').y>position('Foot_L').y+.35,'the left leg is raised in front of the bent right leg');
  assert(direction('Foot_R',new THREE.Vector3(0,-1,0)).z>.85,'the left sole faces forward');
  assert(direction('Foot_L',new THREE.Vector3(0,-1,0)).x>.8,'the right sole faces inward');
  assert(position('Hand_R').x<position('Foot_R').x&&position('Hand_L').x>position('Shin_L').x,'the supporting hands lie inside the raised left foot and the folded right knee');
  assert(palmHeights().every(y=>Math.abs(y)<.015),`both real fingertips rest on the floor: ${palmHeights()}`);
  for(const [h,side]of ['L','R'].entries()){
    const normal=direction(`Hand_${side}`,new THREE.Vector3(0,0,1)),index=skeleton.bones.indexOf(bone(`Hand_${side}`));
    assert(normal.z>.85&&normal.y>-.4,'the palms are raised behind the supporting fingertips');
    const palm=handVertices[h].filter(i=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(skeleton.boneInverses[index]).y>-.04);
    assert(Math.min(...palm.map(i=>skin.localToWorld(skin.getVertexPosition(i,new THREE.Vector3())).y))>.035,'the palm heel is visibly above the floor');
    assert(position(`Hand_${side}`).z>.3,'the supporting wrists advance with the leaning shoulders');
  }
  assert(bone('Eye_L').scale.y<.9&&bone('Eye_R').scale.y<.9,'both eyes have a relaxed, dull gaze');
  assert.equal(skin.userData.neutralMouthVertices.length,264,'the complete original mouth changes expression');
  assert(skin.morphTargetInfluences[2]>.99);
  const lip=skin.geometry.morphAttributes.position[2],mouth=skin.userData.neutralMouthVertices;
  const meanY=ids=>ids.reduce((sum,i)=>sum+lip.getY(i),0)/ids.length;
  assert(Math.abs(meanY(mouth.filter(i=>Math.abs(p.getX(i))>.03))-meanY(mouth.filter(i=>Math.abs(p.getX(i))<.004)))<.0001,'the lip corners are level with the centre instead of smiling');
  const mouthSet=new Set(mouth),bodyIndices=[],faces=skin.geometry.index.array;
  for(let i=0;i<faces.length;i+=3)if(!mouthSet.has(faces[i]))bodyIndices.push(faces[i],faces[i+1],faces[i+2]);
  const posed=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)posed.set(skin.localToWorld(skin.getVertexPosition(i,new THREE.Vector3())).toArray(),i*3);
  const leftIndices=[],otherIndices=[],leftBones=new Set(['Foot_R','Toe_R'].map(name=>skeleton.bones.indexOf(bone(name))));
  for(let i=0;i<p.count;i++){let influence=0;for(let c=0;c<4;c++)if(leftBones.has(j.array[i*4+c]))influence+=w.array[i*4+c];(influence>.9?leftIndices:otherIndices).push(i);}
  const top=ids=>Math.max(...ids.map(i=>posed[i*3+1]));
  assert(top(leftIndices)>top(otherIndices)+.05,'the raised left toes are the highest point of the entire real mesh');
  assert(top(leftIndices)<NAIWA_HANDWALK.height+.015,'the resting foot remains inside the shorter collision height');
  assert(position('Shin_L').y>position('Foot_L').y+.15,'the right knee stays visibly higher than its folded foot');
  assert(position('Foot_L').z>position('Chest').z+.4&&Math.abs(position('Foot_L').x)<.12,'the right foot folds directly in front of the belly');
  assert(position('Shin_L').x<position('Hand_L').x&&position('Foot_L').x>position('Hand_L').x,'the folded right leg encloses the supporting right arm');
  const faceGeometry=new THREE.BufferGeometry();faceGeometry.setAttribute('position',new THREE.BufferAttribute(posed,3));faceGeometry.setIndex(bodyIndices);
  const faceMesh=new THREE.Mesh(faceGeometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));faceMesh.updateMatrixWorld(true);
  const forward=direction('Head',new THREE.Vector3(0,0,1)),ray=new THREE.Raycaster();
  for(const x of [-.03,0,.03]){
    const index=mouth.filter(i=>Math.abs(p.getX(i)-x)<.002).sort((a,b)=>lip.getZ(b)-lip.getZ(a))[0],position=new THREE.Vector3().fromArray(posed,index*3);
    ray.set(position.clone().addScaledVector(forward,.2),forward.clone().negate());const hit=ray.intersectObject(faceMesh)[0];
    assert(hit&&hit.distance-.2>.005,`the entire neutral mouth remains visibly in front of the leaning face: ${JSON.stringify({x,gap:hit?.distance-.2})}`);
  }
  faceGeometry.dispose();faceMesh.material.dispose();

  let minimumPalm=Infinity,maximumSupport=0;
  for(const fps of [30,60,144])for(const speed of [1.55,3.45,6.2]){
    model.reset();update({handWalking:true,speed,state:'chase'});
    let swing=false,previous=position('Hand_L');
    for(let frame=0;frame<fps*2;frame++){
      model.animate(1/fps,{handWalking:true,speed,state:'chase'});root.updateMatrixWorld(true);
      assert.equal(model.activeClip,speed>2.5?'HandRun':'HandWalk');
      const heights=palmHeights();minimumPalm=Math.min(minimumPalm,...heights);maximumSupport=Math.max(maximumSupport,Math.min(...heights));
      swing ||=Math.abs(heights[0]-heights[1])>.035;
      assert(position('Hand_L').distanceTo(previous)<.2*Math.max(1,speed/3.45),`supporting hands move continuously: ${JSON.stringify({fps,speed,frame,distance:position('Hand_L').distanceTo(previous)})}`);previous=position('Hand_L');
      assert(direction('Foot_R',new THREE.Vector3(0,-1,0)).z>.8,'locomotion keeps the raised sole forward');
    }
    assert(swing,'the two hands alternate support rather than moving the feet');
  }
  assert(minimumPalm>-.012,`hand strokes do not cut through the floor (${minimumPalm})`);
  assert(maximumSupport<.08,'at least one hand stays close to the floor, including brief running flight');
  const samples=(state,t,extra={})=>{model.reset();update({handWalking:true,state,actionTime:t,...extra});return {left:position('Foot_R'),right:position('Foot_L'),hands:[position('Hand_L'),position('Hand_R')]};};
  const high=samples('slam',.4),impact=samples('slam',.68);assert(high.left.y-impact.left.y>.65,'the left foot lifts then strikes down for the slam');
  const wind=samples('kick',.12),kick=samples('kick',.28);assert(wind.left.y-kick.left.y>.5,'the left foot makes a quick vertical chair strike');
  assert(high.hands.every((hand,i)=>hand.distanceTo(impact.hands[i])<.02),'slam keeps both hands planted');
  const kickRight=kick.right;assert(kickRight.distanceTo(wind.right)<.02,'the folded right leg is not the kicking leg');
  const target=new THREE.Vector3(0,1.18,1.05);
  samples('pull',.46,{reachAmount:1,reachTargets:{R:target}});
  assert(model.getFootPositions().R.distanceTo(target)<.15,'the left toes physically approach the pull target');
  assert(skin.morphTargetInfluences[1]>.9,'pulling closes the existing left toe surface');
  const handBase=model.getHandPositions();for(let i=0;i<50;i++)model.animate(0,{handWalking:true,state:'pull',actionTime:.46,reachAmount:1,reachTargets:{R:target}});
  for(const side of ['L','R'])assert(model.getHandPositions()[side].distanceTo(handBase[side])<1e-6,'paused foot reach cannot accumulate support-arm changes');
  model.reset();update({handWalking:true,speed:1.55,guardAmount:1,lightAmount:1});
  assert.equal(model.activeClip,'HandWalk');assert(position('Foot_R').y>1.2,'shielding uses the left foot while hands keep walking');
  assert(palmHeights().every(y=>y<.2));
  model.reset();update({handWalking:true,reachAmount:1,reachTargets:{L:new THREE.Vector3(-1,1.7,1),R:new THREE.Vector3(1,1.7,1)},bodyLean:.8});
  assert.equal(model.activeClip,'HandIdle');assert(palmHeights().every(y=>Math.abs(y)<.015),'fixture requests cannot lift hands away from support');
  for(const state of ['down','bed-search','bed-reach','bed-rise']){
    const opts={state,stun:3,actionTime:state==='bed-search'?1.3:.5};
    model.reset();update(opts);const expected=skeleton.bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone().normalize(),s:b.scale.clone()}));
    model.reset();update({...opts,handWalking:true});assert(!/^Hand|^Foot/.test(model.activeClip),'prone/down use the original clips');
    skeleton.bones.forEach((b,i)=>{assert(b.position.distanceTo(expected[i].p)<1e-5);assert(b.quaternion.clone().normalize().angleTo(expected[i].q)<1e-5);assert(b.scale.distanceTo(expected[i].s)<1e-5);});
    assert(skin.morphTargetInfluences[2]<.001,'prone and down restore the original mouth');
  }

  for(const phase of [70,100]){
    const scene=new THREE.Scene(),navigation=createNavigation({solids:[],stairs:[],boundary}),spawn={x:0,y:.15,z:0},player={...createPlayer(),x:12,z:10,hidden:true};
    const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems,player,spawn,patrolRoute:[spawn],random:()=>.99,difficulty:phase===100?'hacker':'hard'});resources.push(npc);assert(await npc.model.ready);
    while(npc.alertness<phase){npc.hit({item:{kind:'bread'},source:'projectile'});npc.reset({keepAlertness:true});}
    run(.5,dt=>npc.tick(dt));assert.equal(npc.model.activeClip,'HandIdle');assert.equal(npc.actor.bodyHeight,NAIWA_HANDWALK.height);assert.equal(npc.actor.eyeHeight,NAIWA_HANDWALK.eyeHeight);
    assert(Math.abs(npc.actor.collider.maxY-npc.actor.collider.minY-NAIWA_HANDWALK.height)<1e-6,'the real projectile/player collision capsule is lower');
    const eyes=npc.model.getEyePositions(),eye=eyes[0].clone().add(eyes[1]).multiplyScalar(.5),origin=new THREE.Vector3(0,1.73,-4);
    npc.setFlashlightSource(()=>({enabled:true,origin,direction:eye.clone().sub(origin).normalize(),angle:.48,range:20}));run(.6,dt=>npc.tick(dt));
    assert.equal(npc.lightExposed,phase===70,'the real lowered eyes receive Ninja light while Transcendent stays blind');
    if(phase===70){const foot=npc.model.root.worldToLocal(npc.model.skeleton.getBoneByName('Foot_R').getWorldPosition(new THREE.Vector3()));assert(foot.y>1.2,'actual eye light raises the left foot rather than either supporting hand');}
    if(phase===70){npc.onPlayerWake();npc.tick(0);assert.equal(npc.actor.bodyHeight,2.1,'dropping below Ninja restores the original collision profile');}
    npc.dispose();
  }
  // The same low ceiling must be reflected in the cached path graph and in
  // actual movement, rather than merely shortening the projectile capsule.
  {
    const scene=new THREE.Scene(),solids=[box(0,0,20,.2,1.95,3)],navigation=createNavigation({solids,stairs:[],boundary}),spawn={x:0,y:.15,z:-2},goal={x:0,y:.15,z:2};
    const npc=createNaiwaPursuer({scene,navigation,doors:[],worldItems,player:{...createPlayer(),x:15,z:15,hidden:true},spawn,patrolRoute:[goal],difficulty:'hacker'});resources.push(npc);assert(await npc.model.ready);
    assert(npc.planner.findPath(spawn,goal).length>0,'the low profile pathfinder finds the route beneath the beam');
    run(7,dt=>npc.tick(dt));assert(npc.actor.z>1,`actual motion passes the same overhead clearance: ${JSON.stringify({x:npc.actor.x,y:npc.actor.y,z:npc.actor.z,state:npc.state,path:npc.path,actorHeight:npc.actor.bodyHeight})}`);npc.dispose();
  }
  // Exercise actual timed damage and ankle contact, including the blind mode;
  // selecting a different animation alone must not silently break either skill.
  for(const phase of [70,100])for(const bed of [false,true]){
    const scene=new THREE.Scene(),platform=box(0,bed?-1:-1.05,bed?1.05:.9,bed?1.1:.4,.15,bed?1.33:1.05),navigation=createNavigation({solids:[platform],stairs:[],boundary});
    const bedRoot=new THREE.Group();bedRoot.position.set(0,.15,-1);scene.add(bedRoot);
    const spawn={x:0,y:.15,z:bed?1.4:0},player={...createPlayer(),x:12,y:.15,z:12,hidden:true},events=[];
    const npc=createNaiwaPursuer({scene,navigation,doors:[],beds:bed?[{id:'test-bed',root:bedRoot,width:2.1}]:[],worldItems,player,spawn,patrolRoute:[spawn],difficulty:phase===100?'hacker':'hard',random:()=>.99});resources.push(npc);assert(await npc.model.ready);
    while(npc.alertness<phase){npc.hit({item:{kind:'bread'},source:'projectile'});npc.reset({keepAlertness:true});}
    scene.addEventListener('escape-pursuer-skill',event=>events.push(event));run(5.1,dt=>npc.tick(dt));
    Object.assign(player,{x:0,y:bed?1.33:1.05,z:bed?-1:-1.05,hidden:false,grounded:true,health:100});
    run(bed?3.2:1.1,dt=>{advancePlayer(player,0,0,dt,navigation);npc.tick(dt);});
    const hit=events.find(event=>event.kind===(bed?'pull':'slam')&&event.stage==='hit');
    assert(hit,`the actual ${phase} ${bed?'toe pull':'foot slam'} lands: ${JSON.stringify(events.map(e=>({kind:e.kind,stage:e.stage,gap:e.contactDistance})))}`);
    if(bed){assert(hit.contactDistance<.55);assert(player.heldBy===npc.actor,'after the ankle pull, nearby contact still immediately catches the player');}
    else assert.equal(player.health,94,'the left-foot slam retains the six-health damage');npc.dispose();
  }
  // Both phases retain real door use, without fixture-reaching arm poses.
  for(const phase of [70,100]){
    const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),parent=new THREE.Group();scene.add(parent);
    const door=createCastleDoor({parent,id:'test',name:'门',x:0,y:.15,z:0,width:1.6,swing:-1,materials:{wood:material,darkWood:material,gold:material,stone:material,iron:material}});
    const solids=[box(-10,0,9.2,.12,.15,3),box(10,0,9.2,.12,.15,3)];for(const part of door.parts){part.collider={dynamic:true};syncBoxCollider(part.leaf,part.collider);solids.push(part.collider);}
    const navigation=createNavigation({solids,stairs:[],doors:[door],boundary}),spawn={x:0,y:.15,z:-1.7},player={...createPlayer(),x:10,z:8,hidden:true};
    const npc=createNaiwaPursuer({scene,navigation,doors:[door],worldItems,player,spawn,patrolRoute:[{x:0,y:.15,z:3.2}],difficulty:phase===100?'hacker':'hard',random:()=>.99});resources.push(npc);assert(await npc.model.ready);
    while(npc.alertness<phase){npc.hit({item:{kind:'bread'},source:'projectile'});npc.reset({keepAlertness:true});}
    let opened=false,closed=false;
    run(12,dt=>{updateCastleDoor(door,dt,[player,npc.actor],navigation);npc.tick(dt);opened ||=door.open;if(opened&&npc.actor.z>.8&&!door.open&&door.amount<.01)closed=true;assert.deepEqual(npc.model.root.userData.interactionHands,[]);});
    assert(opened&&closed&&npc.actor.z>1.5,'Ninja/Transcendent still open, cross and close the actual door');npc.dispose();
  }
  delete globalThis.document;const fallback=createNaiwaModel();resources.push(fallback);assert(!(await fallback.ready));
  run(.5,dt=>fallback.animate(dt,{handWalking:true}));assert.equal(fallback.activeClip,'HandIdle');assert(fallback.getFootPositions().R.y>fallback.getFootPositions().L.y);
  assert(fallback.root.getObjectByName('naiwa:neutral-mouth').visible);
  assert(fallback.root.getObjectByName('naiwa:continuous-body').rotation.x>.3);
  fallback.animate(0,{state:'down',stun:3,handWalking:true});assert.equal(fallback.activeClip,'Down');
  assert(!fallback.root.getObjectByName('naiwa:neutral-mouth').visible);
  console.log(`Hand-walking OK: leaning chest, forward-reaching level head, vacant gaze and complete neutral mouth with real face clearance; raised forward left sole and inward right sole; fingertips support raised palms and alternate at 30/60/144 FPS (min finger ${(minimumPalm*100).toFixed(2)}cm); left-foot skills, stable pause, original prone/down face and pose restoration, real 70/100 capsules, clearance/path graph, door use and fallback.`);
}finally{
  for(const resource of resources)resource.dispose();for(const [key,value]of Object.entries(original))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
