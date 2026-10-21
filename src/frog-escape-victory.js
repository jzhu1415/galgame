import * as THREE from 'three';
import {FENCE_CUT_SECONDS,FENCE_SNIP_TIMES} from './frog-escape-cutting.js';
import {syncBoxCollider} from './frog-escape-doors.js';

export function createEscapeFence({parent,box,materials,edgeIndex}) {
  const root=new THREE.Group();root.name='quest:north-escape-fence';root.position.set(0,-.83,-22);parent.add(root);
  let clock=0,openingTime=0,openAmount=0;
  const fence={id:'north-escape-fence',name:'北侧逃生栅栏',kind:'escape-fence',root,edgeIndex,cut:false,colliders:[],colliderMeshes:[],halves:[],joints:[],z:-22,halfWidth:.92,minZ:-27,maxZ:-20.8,
    get passable(){return fence.cut&&openAmount>=.74;}};
  const railHeights=[.55,1.22,1.95],fresh=materials.iron.clone();fresh.color.setHex(0xc1c6bd);fresh.roughness=.38;
  for(const side of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.x=side*1.2;root.add(pivot);fence.halves.push({pivot,side});
    for(const y of railHeights)box(pivot,-side*.6,y,0,1.2,.09,.1,materials.red);
    for(let i=1;i<=4;i++)box(pivot,-side*i*.24,.02,0,.065,2.25,.065,materials.iron);
    pivot.traverse(mesh=>{if(mesh.userData.solid){mesh.userData.escapeFence=fence;mesh.userData.transparentPassable=true;}});
  }
  for(const y of railHeights) {
    const link=box(root,0,y-.01,.07,.22,.11,.045,materials.gold,{solid:false}),ends=[];
    for(const {pivot,side} of fence.halves) {
      const end=new THREE.Group();end.position.set(-side*1.2,y,0);pivot.add(end);end.visible=false;
      const face=box(end,side*.008,0,0,.022,.09,.105,fresh,{solid:false});face.rotation.z=side*.12;
      const curl=box(end,side*.04,.03,.075,.11,.035,.025,materials.gold,{solid:false});curl.rotation.z=side*.48;
      ends.push(end);
    }
    const chip=new THREE.Mesh(new THREE.TetrahedronGeometry(.048,0),fresh);chip.scale.set(1,.5,.65);chip.visible=false;root.add(chip);
    fence.joints.push({y,link,ends,chip,born:null});
  }
  // The outside landing matches the physics ground and has bounded navigation.
  const landing=box(parent,0,-1.05,-24.5,2.4,.22,5,materials.lawn,{solid:false});landing.name='escape:outside-landing';
  fence.contains=(x,z,radius=0)=>fence.passable&&Math.abs(x)<fence.halfWidth-radius&&z>fence.minZ+radius&&z<fence.maxZ;
  fence.nearby=(origin,direction,navigation)=>{
    if(fence.cut||origin.z<fence.z+.15||Math.abs(direction.z)<.001)return null;
    const distance=(fence.z-origin.z)/direction.z;if(distance<.1||distance>2.25)return null;
    const point=origin.clone().addScaledVector(direction,distance);
    if(Math.abs(point.x)>.97||point.y<-.65||point.y>1.5||!navigation.lineClear(origin,point,fence.colliders))return null;
    return {...fence,point};
  };
  fence.setCutProgress=elapsed=>{
    for(const [i,joint] of fence.joints.entries()) {
      const severed=elapsed+1e-8>=FENCE_SNIP_TIMES[i];joint.link.visible=!severed;joint.ends.forEach(end=>end.visible=severed);
      if(severed&&joint.born===null){joint.born=clock;joint.chip.visible=true;joint.chip.position.set(0,joint.y,.1);}
      else if(!severed){joint.born=null;joint.chip.visible=false;}
    }
  };
  fence.open=()=>{if(fence.cut)return false;fence.cut=true;fence.setCutProgress(FENCE_CUT_SECONDS);return true;};
  fence.tick=dt=>{
    dt=Math.max(0,dt);clock+=dt;let dirty=false;
    if(fence.cut&&openingTime<2) {
      openingTime=Math.min(2,openingTime+dt);
      openAmount=openingTime===2?1:THREE.MathUtils.clamp(1-Math.exp(-6*openingTime)*(Math.cos(9*openingTime)+2/3*Math.sin(9*openingTime)),0,1.08);
      for(const {pivot,side} of fence.halves) {
        pivot.rotation.set(-.10*openAmount,side*(side<0?1.34:1.46)*openAmount,side*.13*openAmount);
        pivot.position.y=-.045*openAmount;
      }
      for(const {mesh,solid} of fence.colliderMeshes)syncBoxCollider(mesh,solid);
      dirty=true;
    }
    for(const [i,joint] of fence.joints.entries())if(joint.born!==null&&clock-joint.born<1.2) {
      const t=clock-joint.born,side=i%2?-1:1,fall=Math.sqrt(2*(joint.y-.025)/9.82);
      const y=t<fall?joint.y-4.91*t*t:.025+Math.max(0,.06*Math.sin((t-fall)*18))*Math.exp(-(t-fall)*12);
      joint.chip.position.set(side*Math.min(t,.7)*.28,y,.1+Math.min(t,.7)*.18);joint.chip.rotation.set(t*7,side*t*5,t*3);dirty=true;
    }
    return dirty;
  };
  return fence;
}

export function createEscapeProgress({scene,clues,fence,chest,cuttersSeed,rearDoor,window}) {
  let cuttersClaimed=false,rearRoute=null,previous=null,crossedExit=false,cutting=null;
  const onPickup=event=>{
    if(event.item.id===cuttersSeed.item.id){cuttersClaimed=true;scene.dispatchEvent({type:'escape-bolt-cutters-acquired'});}
  };
  scene.addEventListener('escape-prop-pickup',onPickup);
  function missingStep(item=null) {
    if(!cuttersClaimed)return '先用工具箱钥匙开箱，拿到里面的断线钳。';
    if(item?.kind!=='boltCutters'||item.id!==cuttersSeed.item.id)return '选中断线钳，对准北侧逃生栅栏按右键。';
    return null;
  }
  function observe(player,inventory) {
    if(previous) {
      const dz=player.z-previous.z,travel=Math.hypot(player.x-previous.x,dz);
      if(travel<1&&dz<0) {
        const crossZ=z=>previous.z>=z&&player.z<z;
        if(!rearRoute) {
          if(rearDoor.open&&crossZ(rearDoor.z)&&Math.abs(player.x-rearDoor.x)<rearDoor.width/2&&Math.abs(player.y-rearDoor.y)<.5)rearRoute='door';
          const center=window.center(),half=window.width/2;
          if(window.broken&&crossZ(center.z)&&Math.abs(player.x-center.x)<half-.15&&previous.y>4.9&&player.y>4.7)rearRoute='window';
        }
        if(fence.cut&&crossZ(fence.z)&&fence.contains(player.x,player.z,.27))crossedExit=true;
      }
    }
    if(!rearRoute&&player.z<-8&&player.y>-1.5&&player.y<1.5)rearRoute='yard';
    previous={x:player.x,y:player.y,z:player.z};
    return !!(cuttersClaimed&&fence.cut&&crossedExit&&fence.contains(player.x,player.z,.27)&&player.z<fence.z-.8&&player.grounded&&Math.abs(player.y+.83)<.15&&player.health>0);
  }
  function cancelCut(){if(!cutting)return false;cutting=null;fence.setCutProgress(0);return true;}
  return {fence,missingStep,observe,cancelCut,get cutting(){return cutting;},get cuttersClaimed(){return cuttersClaimed;},get rearRoute(){return rearRoute;},
    tryCut(item,origin,direction,navigation){
      if(cutting||missingStep(item)||!fence.nearby(origin,direction,navigation))return false;
      cutting={item,elapsed:0,nextSnip:0,origin:origin.clone()};
      return true;
    },
    tickCut(dt,item,origin,direction,navigation,interrupted=false){
      if(!cutting)return null;
      if(interrupted||item!==cutting.item||missingStep(item)||!fence.nearby(origin,direction,navigation)||origin.distanceTo(cutting.origin)>.3){cancelCut();return 'cancelled';}
      cutting.elapsed=Math.min(FENCE_CUT_SECONDS,cutting.elapsed+Math.max(0,dt));fence.setCutProgress(cutting.elapsed);
      while(cutting.nextSnip<2&&cutting.elapsed+1e-8>=FENCE_SNIP_TIMES[cutting.nextSnip]){
        const index=cutting.nextSnip++,position={x:0,y:-.83+fence.joints[index].y,z:fence.z};
        scene.dispatchEvent({type:'escape-fence-snip',position,item,index});scene.dispatchEvent({type:'escape-noise',position,loudness:.9,kind:'fence-snip'});
      }
      if(cutting.elapsed+1e-8<FENCE_CUT_SECONDS)return 'cutting';
      cutting=null;if(!fence.open())return 'cancelled';
      const position={x:0,y:.2,z:fence.z};scene.dispatchEvent({type:'escape-fence-cut',position,item});scene.dispatchEvent({type:'escape-noise',position,loudness:2,kind:'fence-cut'});
      return 'complete';
    },
    resetPosition(player){previous={x:player.x,y:player.y,z:player.z};crossedExit=false;},
    dispose(){cancelCut();scene.removeEventListener('escape-prop-pickup',onPickup);},
  };
}
