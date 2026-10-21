import {Vector3} from 'three';

// Water is a volume above the basin floor, never a walkable solid lid.
export function createWaterVolume({id,root,shape='rectangle',width=1,depth=1,radius=1,surfaceY,bottomY}) {
  const point=new Vector3();
  const contains=(x,z)=>shape==='semicircle'?z<=0&&x*x+z*z<radius*radius:Math.abs(x)<width/2&&Math.abs(z)<depth/2;
  return {id,root,shape,width,depth,radius,surfaceY,bottomY,
    sample(position) {
      root.updateWorldMatrix(true,false);point.set(position.x,position.y,position.z);root.worldToLocal(point);
      if(!contains(point.x,point.z)||point.y<bottomY-.12||point.y>=surfaceY-.015)return null;
      const e=root.matrixWorld.elements,scaleY=Math.hypot(e[4],e[5],e[6]);
      return {volume:this,depth:(surfaceY-point.y)*scaleY};
    },
  };
}

export function waterAt(volumes,position) {
  for(const volume of volumes){const sample=volume.sample(position);if(sample)return sample;}
  return null;
}

export function waterMovementScale(sample) {
  return sample?Math.max(.68,1-Math.min(.32,sample.depth*.75)):1;
}

export function createWaterInteraction({volumes,onDisturb=()=>{}}) {
  let previous=null,last=null,distance=0,wait=0;
  return {
    tick(player,dt) {
      if(dt<=0)return false;
      const sample=waterAt(volumes,player),movement=last?Math.hypot(player.x-last.x,player.z-last.z):0;
      const teleported=last&&Math.hypot(player.x-last.x,player.y-last.y,player.z-last.z)>3;
      wait=Math.max(0,wait-dt);let disturbed=false;
      const emit=(volume,position,strength,kind)=>{onDisturb({volume,position:{x:position.x,y:position.y,z:position.z},strength,kind});disturbed=true;};
      if(sample?.volume!==previous?.volume){
        if(!teleported){
          if(sample)emit(sample.volume,player,.85,'enter');
          else if(previous&&last)emit(previous.volume,last,.45,'exit');
        }
        distance=0;wait=.18;
      }else if(sample&&!teleported){
        distance+=movement;
        if(distance>=.3&&wait===0){emit(sample.volume,player,Math.min(.75,.35+movement/Math.max(dt,.001)*.1),'wade');distance=0;wait=.16;}
      }
      previous=sample;last={x:player.x,y:player.y,z:player.z};return disturbed;
    },
    reset(){previous=null;last=null;distance=wait=0;},
  };
}
