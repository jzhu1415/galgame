import * as THREE from 'three';

export function createEscapeFence({parent,box,materials,edgeIndex}) {
  const root=new THREE.Group();root.name='quest:north-escape-fence';root.position.set(0,-.83,-22);parent.add(root);
  const fence={id:'north-escape-fence',name:'北侧逃生栅栏',kind:'escape-fence',root,edgeIndex,cut:false,colliders:[],halves:[],z:-22,halfWidth:.92,minZ:-27,maxZ:-20.8};
  for(const side of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.x=side*1.2;root.add(pivot);fence.halves.push({pivot,side});
    for(const y of [.55,1.95])box(pivot,-side*.6,y,0,1.2,.09,.1,materials.red);
    for(let i=1;i<=4;i++)box(pivot,-side*i*.24,.02,0,.065,2.25,.065,materials.iron);
    pivot.traverse(mesh=>{if(mesh.userData.solid){mesh.userData.escapeFence=fence;mesh.userData.transparentPassable=true;}});
    for(const y of [.55,1.95])box(root,side*.045,y,.07,.12,.06,.035,materials.gold,{solid:false});
  }
  // The outside landing matches the physics ground and has bounded navigation.
  const landing=box(parent,0,-1.05,-24.5,2.4,.22,5,materials.lawn,{solid:false});landing.name='escape:outside-landing';
  fence.contains=(x,z,radius=0)=>fence.cut&&Math.abs(x)<fence.halfWidth-radius&&z>fence.minZ+radius&&z<fence.maxZ;
  fence.nearby=(origin,direction,navigation)=>{
    if(fence.cut||origin.z<fence.z+.15||Math.abs(direction.z)<.001)return null;
    const distance=(fence.z-origin.z)/direction.z;if(distance<.1||distance>2.25)return null;
    const point=origin.clone().addScaledVector(direction,distance);
    if(Math.abs(point.x)>.97||point.y<-.65||point.y>1.5||!navigation.lineClear(origin,point,fence.colliders))return null;
    return {...fence,point};
  };
  fence.open=()=>{if(fence.cut)return false;fence.cut=true;return true;};
  fence.tick=dt=>{
    let dirty=false;
    for(const {pivot,side} of fence.halves) {
      const wanted=fence.cut?side*1.4:0,next=THREE.MathUtils.damp(pivot.rotation.y,wanted,12,dt);
      if(Math.abs(next-pivot.rotation.y)>.00001){pivot.rotation.y=next;dirty=true;}
    }
    return dirty;
  };
  return fence;
}

export function createEscapeProgress({scene,clues,fence,chest,cuttersSeed,rearDoor,window}) {
  let cuttersClaimed=false,rearRoute=null,previous=null,crossedExit=false;
  const onPickup=event=>{
    if(event.item.id===cuttersSeed.item.id&&clues.codeKnown&&!chest.locked&&chest.insertedKey&&chest.amount>.7){cuttersClaimed=true;scene.dispatchEvent({type:'escape-bolt-cutters-acquired'});}
  };
  scene.addEventListener('escape-prop-pickup',onPickup);
  chest.beforeUnlock=()=>clues.codeKnown;
  function missingStep(item=null) {
    if(!clues.codeKnown)return '先阅读正门密码线索。二楼有线索。';
    if(!cuttersClaimed)return '先用工具箱钥匙开箱，拿到里面的断线钳。';
    if(!rearRoute)return '先持后门钥匙通过后门，或打碎二楼大窗进入后院。';
    if(item?.kind!=='boltCutters'||item.id!==cuttersSeed.item.id)return '选中断线钳，对准北侧逃生栅栏按右键。';
    return null;
  }
  function observe(player,inventory) {
    if(previous) {
      const dz=player.z-previous.z,travel=Math.hypot(player.x-previous.x,dz);
      if(travel<1&&dz<0) {
        const crossZ=z=>previous.z>=z&&player.z<z;
        if(clues.codeKnown&&cuttersClaimed&&!rearRoute) {
          if(rearDoor.open&&crossZ(rearDoor.z)&&Math.abs(player.x-rearDoor.x)<rearDoor.width/2&&Math.abs(player.y-rearDoor.y)<.5&&inventory.slots.some(item=>item?.kind==='rearDoorKey'))rearRoute='door';
          const center=window.center(),half=window.width/2;
          if(window.broken&&crossZ(center.z)&&Math.abs(player.x-center.x)<half-.15&&previous.y>4.9&&player.y>4.7)rearRoute='window';
        }
        if(fence.cut&&crossZ(fence.z)&&fence.contains(player.x,player.z,.27))crossedExit=true;
      }
    }
    previous={x:player.x,y:player.y,z:player.z};
    return !!(clues.codeKnown&&cuttersClaimed&&rearRoute&&fence.cut&&crossedExit&&fence.contains(player.x,player.z,.27)&&player.z<fence.z-.8&&player.grounded&&Math.abs(player.y+.83)<.15&&player.health>0);
  }
  return {fence,missingStep,observe,get cuttersClaimed(){return cuttersClaimed;},get rearRoute(){return rearRoute;},
    tryCut(item,origin,direction,navigation){
      if(missingStep(item)||!fence.nearby(origin,direction,navigation))return false;
      if(!fence.open())return false;
      const position={x:0,y:.2,z:fence.z};scene.dispatchEvent({type:'escape-fence-cut',position,item});
      scene.dispatchEvent({type:'escape-noise',position,loudness:2,kind:'fence-cut'});
      return true;
    },
    resetPosition(player){previous={x:player.x,y:player.y,z:player.z};crossedExit=false;},
    dispose(){scene.removeEventListener('escape-prop-pickup',onPickup);},
  };
}
