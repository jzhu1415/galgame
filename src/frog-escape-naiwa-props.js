import * as THREE from 'three';
import {createPropModel,propItem} from './frog-escape-props.js';
import {disposeItemModel} from './frog-escape-items.js';

export function createNaiwaProps({scene,model,actor,navigation}) {
  const item=propItem('rearDoorKey','naiwa-rear-door-key'),key=createPropModel(item);key.name='naiwa:waist-key';scene.add(key);
  const hook=new THREE.Mesh(new THREE.TorusGeometry(.014,.0025,6,18),new THREE.MeshStandardMaterial({color:0x575d61,metalness:.8,roughness:.35}));
  hook.name='naiwa:waist-key-hook';hook.position.set(-.047,-.009,-.006);hook.rotation.x=.58;key.add(hook);
  const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2);
  const pixels=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const i=(y*64+x)*4,r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5);
    pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(220*Math.max(0,1-r)**1.6);
  }
  const texture=new THREE.DataTexture(pixels,64,64);texture.needsUpdate=true;
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x11110e,map:texture,transparent:true,opacity:.34,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  shadow.name='naiwa:contact-shadow';shadow.userData.excludeContactOcclusion=true;shadow.rotation.x=-Math.PI/2;shadow.renderOrder=1;scene.add(shadow);
  let taken=false;
  function update(state) {
    const pose=model.getWaistPose();key.position.copy(pose.position);key.quaternion.copy(pose.quaternion).multiply(turn);key.visible=!taken&&model.root.visible;
    const floor=navigation.support(actor.x,actor.z,actor.y,.04,.25),height=actor.y-floor,down=state==='down';
    if(down)key.position.y=Math.max(key.position.y,actor.y+.14);
    shadow.visible=model.root.visible&&Number.isFinite(floor)&&height<1.2;
    shadow.position.set(actor.x-(down?Math.sin(actor.yaw)*.35:0),Number.isFinite(floor)?floor+.012:actor.y,actor.z-(down?Math.cos(actor.yaw)*.35:0));
    shadow.rotation.z=actor.yaw;shadow.scale.set(down?1.05:1.15,down?1.8:.85,1);shadow.material.opacity=.34*Math.max(0,1-height/1.2);
  }
  function nearby(origin,direction) {
    if(taken||!key.visible)return null;
    const distance=origin.distanceTo(key.position);if(distance>2.25||distance<.02)return null;
    if(key.position.clone().sub(origin).normalize().dot(direction)<.89)return null;
    if(!navigation.lineClear(origin,key.position,[actor.collider]))return null;
    return {kind:'naiwa-key',item,name:item.name,position:key.position.clone()};
  }
  return {item,key,shadow,update,nearby,
    take(inventory,origin,direction){if(!nearby(origin,direction)||inventory.store(item)===-1)return false;taken=true;key.visible=false;return true;},
    reset({keepTaken=false}={}){if(!keepTaken)taken=false;},
    dispose(){key.removeFromParent();disposeItemModel(key);shadow.removeFromParent();shadow.geometry.dispose();shadow.material.dispose();texture.dispose();},
  };
}
