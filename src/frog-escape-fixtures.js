import * as THREE from 'three';
import {castleStorage} from './frog-escape-storage.js';

export function castleFixtures(box,mats,pickups) {
  const actions=[];
  const beds=[];
  const newels=new Set();
  function group(parent,name,x,y,z,angle=0) {
    const result=new THREE.Group();result.name=name;result.position.set(x,y,z);result.rotation.y=angle;parent.add(result);return result;
  }
  function mesh(parent,geometry,material,x,y,z) {
    const result=new THREE.Mesh(geometry,material);result.position.set(x,y,z);result.castShadow=true;result.receiveShadow=true;parent.add(result);return result;
  }
  function tube(parent,start,end,radius,material) {
    const from=new THREE.Vector3(...start),to=new THREE.Vector3(...end),delta=to.clone().sub(from);
    const result=mesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),10),material,0,0,0);
    result.position.copy(from.add(to).multiplyScalar(.5));result.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return result;
  }
  function rounded(parent,x,y,z,sx,sy,sz,material) {
    const result=mesh(parent,new THREE.SphereGeometry(1,16,10),material,x,y,z);result.scale.set(sx,sy,sz);return result;
  }
  function proxy(parent,x,y,z,w,h,d) {
    const result=box(parent,x,y,z,w,h,d,mats.ceramic);result.visible=false;result.userData.collisionOnly=true;return result;
  }
  function lamp(parent,x,z,foot) {
    mesh(parent,new THREE.CylinderGeometry(.13,.17,.045,14),mats.gold,x,foot+.025,z);
    tube(parent,[x,foot+.04,z],[x,foot+.4,z],.025,mats.gold);
    mesh(parent,new THREE.CylinderGeometry(.12,.23,.28,20,1,true),mats.cloth,x,foot+.47,z);
    const glow=bulb(parent,x,foot+.4,z,.55);
    const light=new THREE.PointLight(0xffc582,1.8,2.5,1.7);light.userData.escapeFlickerGlow=glow;light.position.set(x,foot+.36,z);parent.add(light);
  }
  function bulb(parent,x,y,z,scale=1) {
    const g=group(parent,'light:filament-bulb',x,y,z);g.scale.setScalar(scale);
    const profile=[[0,-.18],[.035,-.175],[.075,-.13],[.083,-.06],[.06,0],[.026,.08],[.026,.13]].map(([r,h])=>new THREE.Vector2(r,h));
    mesh(g,new THREE.LatheGeometry(profile,20),mats.bulbGlass,0,0,0);
    mesh(g,new THREE.CylinderGeometry(.029,.027,.08,14),mats.steel,0,.14,0);
    for(let i=0;i<4;i++) {
      const ring=mesh(g,new THREE.TorusGeometry(.029,.0035,5,16),mats.gold,0,.11+i*.018,0);ring.rotation.x=Math.PI/2;
    }
    const filament=new THREE.CatmullRomCurve3([[-.018,.08,0],[-.018,-.08,0],[-.009,-.11,.01],[0,-.08,-.01],[.01,-.11,.01],[.018,-.08,0],[.018,.08,0]].map(p=>new THREE.Vector3(...p)));
    mesh(g,new THREE.TubeGeometry(filament,24,.0035,5,false),mats.filament,0,0,0);return g;
  }
  function pendant(parent,x,z,foot,ceilingHeight) {
    const g=group(parent,'light:pendant',x,foot,z);g.scale.x=1/parent.scale.x;
    const top=ceilingHeight-.07;
    mesh(g,new THREE.CylinderGeometry(.15,.18,.055,16),mats.gold,0,top,0);
    tube(g,[0,2.72,0],[0,top-.025,0],.014,mats.iron);
    mesh(g,new THREE.CylinderGeometry(.08,.34,.28,24,1,true),mats.gold,0,2.55,0);
    const rim=mesh(g,new THREE.TorusGeometry(.34,.018,6,24),mats.wood,0,2.41,0);rim.rotation.x=Math.PI/2;
    const glow=bulb(g,0,2.4,0);
    const light=new THREE.PointLight(0xffbf7d,14,12,1.6);light.userData.escapeFlickerGlow=glow;light.position.set(0,2.35,0);g.add(light);return g;
  }
  function cabinet(parent,x,z,foot,w=1.8,angle=0) {
    return storage.wardrobe(parent,x,z,foot,w,angle);
  }
  function bedside(parent,x,z,foot) {
    return storage.bedside(parent,x,z,foot);
  }
  function bed(parent,x,z,foot,angle=0,width=2.35) {
    const g=group(parent,'furniture:bed',x,foot,z,angle);
    for(const px of [-width/2+.1,width/2-.1])for(const pz of [-.94,.94])box(g,px,0,pz,.12,.9,.12,mats.darkWood);
    box(g,0,.72,0,width,.19,2.15,mats.wood);
    box(g,0,.91,0,width-.07,.25,2.1,mats.cloth);
    box(g,0,1.168,-.25,width-.025,.055,1.52,mats.rug,{solid:false});
    box(g,0,.82,1.06,width+.08,.87,.12,mats.wood);
    box(g,0,.99,1.135,width-.25,.48,.045,mats.darkWood,{solid:false});
    for(const px of [-width/2,width/2]) {
      box(g,px,0,1.07,.13,1.77,.15,mats.darkWood);
      rounded(g,px,1.82,1.07,.09,.09,.09,mats.gold);
    }
    for(const px of [-width*.23,width*.23])rounded(g,px,1.24,.69,width*.2,.115,.23,mats.ceramic);
    beds.push({id:`bed-${beds.length}`,root:g,width});
    return g;
  }
  function bathroom(parent,foot) {
    const bath=group(parent,'fixture:bathtub',4.75,foot,.95);
    box(bath,0,.13,0,2.08,.49,.83,mats.ceramic);
    box(bath,0,.62,0,1.78,.018,.59,mats.water,{solid:false});
    // Separate rim pieces surround the inset without sharing its top surface.
    for(const side of [-1,1]) {
      box(bath,0,.635,side*.39,2.12,.085,.1,mats.ceramic);
      box(bath,side*1.015,.635,0,.09,.085,.68,mats.ceramic);
      for(const x of [-.78,.78])rounded(bath,x,.13,side*.26,.08,.13,.09,mats.gold);
    }
    tube(bath,[.76,.63,-.3],[.76,.9,-.3],.025,mats.gold);
    tube(bath,[.76,.9,-.3],[.76,.9,-.13],.025,mats.gold);
    const toilet=group(parent,'fixture:toilet',5.7,foot,-1.13);
    proxy(toilet,0,0,.03,.34,.23,.48);
    // Keep the bowl genuinely hollow so a key in the water can be aimed at and picked up.
    for(const side of [-1,1])proxy(toilet,side*.235,.23,.09,.045,.27,.57);
    proxy(toilet,0,.23,.355,.43,.27,.04);
    proxy(toilet,0,.23,-.175,.43,.27,.04);
    proxy(toilet,0,.34,.09,.32,.012,.32);
    rounded(toilet,0,.17,.07,.16,.17,.22,mats.ceramic);
    const profile=[[.07,.2],[.16,.24],[.23,.34],[.26,.43],[.25,.49],[.21,.49],[.19,.44],[.14,.37],[.06,.34],[0,.34]].map(([radius,y])=>new THREE.Vector2(radius,y));
    const bowl=mesh(toilet,new THREE.LatheGeometry(profile,24),mats.ceramic,0,0,.09);bowl.scale.z=1.25;
    const water=mesh(toilet,new THREE.CylinderGeometry(.115,.115,.008,20),mats.water,0,.347,.09);water.scale.z=1.25;
    const key=pickups.place(toilet,'shedKey',0,.352,.09);key.name='quest:toilet-key';
    const seat=mesh(toilet,new THREE.TorusGeometry(.215,.035,8,24),mats.ceramic,0,.51,.09);
    seat.rotation.x=-Math.PI/2;seat.scale.set(1,1.26,.65);
    box(toilet,0,.43,-.27,.48,.56,.21,mats.ceramic);
    box(toilet,0,.99,-.27,.51,.04,.24,mats.ceramic,{solid:false});
    box(toilet,.13,.91,-.143,.12,.035,.045,mats.gold,{solid:false});
    const vanity=storage.vanity(parent,3.65,-1.47,foot);
    const basin=mesh(vanity,new THREE.TorusGeometry(.23,.06,10,24),mats.ceramic,0,.86,.015);basin.rotation.x=-Math.PI/2;basin.scale.set(1.45,.85,.7);
    rounded(vanity,0,.842,.015,.31,.02,.16,mats.water);
    tube(vanity,[0,.84,-.19],[0,1.12,-.19],.022,mats.gold);tube(vanity,[0,1.12,-.19],[0,1.12,-.04],.022,mats.gold);
    const mirror=box(parent,3.65,foot+1.28,-1.762,1.02,.98,.035,mats.mirror,{solid:false});mirror.name='fixture:mirror';
    for(const px of [3.1,4.2])box(parent,px,foot+1.295,-1.722,.055,.955,.045,mats.gold,{solid:false});
    for(const py of [1.24,2.25])box(parent,3.65,foot+py,-1.722,1.15,.055,.045,mats.gold,{solid:false});
    tube(parent,[5.96,foot+1.05,-.22],[5.96,foot+1.05,.38],.023,mats.gold);
    box(parent,5.935,foot+.5,.1,.045,.52,.36,mats.cloth,{solid:false});
    return bath;
  }
  function stairRailing(parent,stair) {
    const g=group(parent,`railing:stair:${stair.floor}`,0,0,0);g.scale.x=1/parent.scale.x;
    const direction=Math.sign(stair.endZ-stair.startZ),depth=Math.abs(stair.endZ-stair.startZ)/stair.steps;
    for(const [x,landingX] of [[stair.minX+.07,stair.minX-.15],[stair.maxX-.07,stair.maxX+.15]]) {
      tube(g,[x,stair.bottom+1.2,stair.startZ],[x,stair.top+1.2,stair.endZ],.055,mats.wood);
      tube(g,[x,stair.bottom+.36,stair.startZ],[x,stair.top+.36,stair.endZ],.018,mats.iron);
      for(const [base,z] of [[stair.bottom,stair.startZ],[stair.top,stair.endZ]]) {
        addNewel(parent,landingX,base,z);tube(g,[landingX,base+1.2,z],[x,base+1.2,z],.055,mats.wood);
      }
      for(let i=1;i<stair.steps;i++) {
        const t=i/stair.steps,z=stair.startZ+direction*depth*i;
        const base=stair.bottom+(stair.top-stair.bottom)*t;
        box(g,x,base,z,.045,1.17,.045,mats.iron);
        if(i%3===0)box(g,x,base+.55,z,.085,.1,.085,mats.gold,{solid:false});
      }
    }
    return g;
  }
  function addNewel(parent,x,base,z) {
    const key=[x,base,z].map(v=>v.toFixed(3)).join('/');if(newels.has(key))return;newels.add(key);
    const g=group(parent,'railing:newel',0,0,0);g.scale.x=1/parent.scale.x;g.userData.joint=key;
    box(g,x,base,z,.13,1.25,.13,mats.darkWood);rounded(g,x,base+1.3,z,.085,.085,.085,mats.gold);
  }
  function landingRailing(parent,foot) {
    const g=group(parent,'railing:landing',0,foot,0);g.scale.x=1/parent.scale.x;
    for(const x of [6.85,9.15]) {
      tube(g,[x,1.2,-4.4],[x,1.2,4.4],.055,mats.wood);
      tube(g,[x,.23,-4.4],[x,.23,4.4],.018,mats.iron);
      for(const z of [-4.4,4.4])addNewel(parent,x,foot,z);
      for(let i=1;i<22;i++)box(g,x,0,-4.4+i*.4,.045,1.17,.045,mats.iron);
    }
  }
  function tableDetails(parent,foot) {
    for(const x of [2.9,4.6])for(const z of [-.55,.25]) {
      const setting=group(parent,'furniture:tableware',x,foot+.902,z);setting.scale.x=1/parent.scale.x;
      pickups.place(setting,'plate',0,0,0);pickups.place(setting,'fork',-.22,.002,-.015);
      box(setting,.225,.003,.04,.13,.012,.19,mats.cloth);
      pickups.place(setting,'knife',.24,.016,.04);pickups.place(setting,'cup',.235,.002,-.19);
    }
    const centerpiece=group(parent,'furniture:serving-bowl',3.8,foot+.903,-.2);centerpiece.scale.x=1/parent.scale.x;
    pickups.place(centerpiece,'bowl',0,0,0);
    for(let i=0;i<3;i++)pickups.place(centerpiece,'tomato',Math.cos(i*Math.PI*2/3)*.11,.122,Math.sin(i*Math.PI*2/3)*.11);
    for(let i=0;i<3;i++)box(parent,3.35+i*.025,foot+.95+i*.055,3.5,.45,.045,.3,i%2?mats.rug:mats.cloth,{solid:false});
  }
  const storage=castleStorage(box,mats,actions,{tube,mesh,rounded,lamp},pickups);
  return {actions,beds,bed,bedside,cabinet,bathroom,lamp,bulb,pendant,stairRailing,landingRailing,tableDetails,tube,mesh,rounded,
    counter:storage.counter,deskDrawers:storage.desk,fridge:storage.fridge};
}
