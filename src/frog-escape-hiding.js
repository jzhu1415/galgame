import * as THREE from 'three';
import {PLAYER_HEIGHT,CROUCH_HEIGHT,BED_HIDE_HEIGHT} from './frog-escape-navigation.js';

export function bedEntrances(bed) {
  bed.root.updateWorldMatrix(true,false);
  const w=bed.width/2+.43;
  return [[0,0,-1.55],[-w,0,-.4],[w,0,-.4],[-w,0,.3],[w,0,.3]].map(p=>bed.root.localToWorld(new THREE.Vector3(...p)));
}
export function nearestBed(beds,player,camera,navigation) {
  if(!player.grounded||player.hidingBed)return null;
  let selected=null,best=.9;
  for(const bed of beds)for(const point of bedEntrances(bed)) {
    if(Math.abs(player.y-point.y)>.12)continue;
    const distance=Math.hypot(player.x-point.x,player.z-point.z);if(distance>=best)continue;
    if(navigation.blocked(point.x,point.y,point.z,false,player.crouched?CROUCH_HEIGHT:PLAYER_HEIGHT))continue;
    if(!navigation.lineClear(camera.position,{x:point.x,y:point.y+1.3,z:point.z}))continue;
    selected={kind:'bed',name:'床底',bed};best=distance;
  }
  return selected;
}
export function hideUnderBed(bed,player,navigation) {
  const point=bed.root.localToWorld(new THREE.Vector3(0,0,-.12));
  if(navigation.blocked(point.x,point.y,point.z,false,BED_HIDE_HEIGHT))return null;
  const state={bed,exit:{x:player.x,y:player.y,z:player.z,crouched:player.crouched}};
  Object.assign(player,{x:point.x,y:point.y,z:point.z,hidingBed:bed.id,crouched:false,grounded:true,velocityY:0,hidden:true,hidingWardrobe:null});
  return state;
}
export function leaveBed(state,player,navigation) {
  const candidates=[state.exit,...bedEntrances(state.bed)];
  for(const point of candidates) {
    if(Math.abs(navigation.support(point.x,point.z,point.y,0)-point.y)>.08)continue;
    let crouched=!!state.exit.crouched;
    if(navigation.blocked(point.x,point.y,point.z,false,crouched?CROUCH_HEIGHT:PLAYER_HEIGHT)) {
      if(navigation.blocked(point.x,point.y,point.z,false,CROUCH_HEIGHT))continue;
      crouched=true;
    }
    Object.assign(player,{x:point.x,y:point.y,z:point.z,crouched,hidingBed:null,hidden:false,grounded:true,velocityY:0});return true;
  }
  return false;
}
