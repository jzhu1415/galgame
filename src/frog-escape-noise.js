import {Vector3} from 'three';

// Gameplay hearing runs even when audio is muted, locked or unsupported.
export function createEscapeNoise({scene,player,doors=[],interactables=[]}) {
  let previous=null,distance=0;
  const panels=new Map(),point=new Vector3();
  const emit=(position,loudness,kind,owner=player)=>scene.dispatchEvent({type:'escape-noise',position:{...position},loudness,kind,owner});
  const bindings=[];
  function bind(type,handler){scene.addEventListener(type,handler);bindings.push([type,handler]);}
  for(const [type,loudness]of [['escape-prop-pickup',.055],['escape-prop-release',.08],['escape-prop-place',.1]])bind(type,event=>emit(event.position,loudness,type));
  bind('escape-player-action',event=>{if(['swing','jump','flashlight'].includes(event.action))emit({x:player.x,y:player.y+1,z:player.z},event.action==='swing'?.12:.04,event.action);});
  bind('escape-door-impact',event=>emit(event.position,.95,'door-impact',event.operator));
  return {
    tick(dt) {
      if(previous) {
        const step=Math.hypot(player.x-previous.x,player.z-previous.z);
        if(player.grounded&&!player.crouched&&!player.hidden&&!player.hidingBed&&!player.heldBy&&step>0&&step<.65&&Math.abs(player.y-previous.y)<.3) {
          distance+=step;
          if(distance>=1.45){distance%=1.45;emit({x:player.x,y:player.y+.12,z:player.z},.48,'footstep');}
        }else distance=0;
      }
      previous={x:player.x,y:player.y,z:player.z};
      for(const panel of [...doors,...interactables]) {
        const last=panels.get(panel),delta=panel.amount-(last?.amount??panel.amount),direction=Math.sign(delta);
        if(last&&Math.abs(delta)>.00001&&(!last.moving||direction!==last.direction)) {
          const position=panel.anchor?panel.anchor.getWorldPosition(point):{x:panel.x,y:panel.y+1,z:panel.z};
          emit(position,panel.fixtureKind==='drawer'?.38:panel.fixtureKind?.55:.8,'panel',panel.noiseOwner??null);
        }
        panels.set(panel,{amount:panel.amount,moving:Math.abs(delta)>.00001,direction});
      }
    },
    reset(){previous=null;distance=0;panels.clear();},
    dispose(){for(const[type,handler]of bindings)scene.removeEventListener(type,handler);panels.clear();},
  };
}
