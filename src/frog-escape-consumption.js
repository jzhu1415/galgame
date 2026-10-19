import * as THREE from 'three';
import {healPlayer} from './frog-escape-vitals.js';
import {restoreStamina} from './frog-escape-stamina.js';
import {propItem} from './frog-escape-props.js';

export const CONSUMPTION=Object.freeze({duration:1.5,movementScale:.3,milkDuration:15,wineDuration:20});
export const FOOD_HEALTH=Object.freeze({tomato:3,apple:3,banana:3,jar:4,bread:5,cheese:5});
export const foodStaminaFraction=item=>item?.kind==='bottle'?0:item?.kind==='cheese'?1:.4;
const packages=new Set(['milk','jar','bottle']);
export const isDrink=item=>['milk','bottle'].includes(item?.kind);
export const canConsume=item=>!!item&&!item.empty&&!item.broken&&(Object.hasOwn(FOOD_HEALTH,item.kind)||isDrink(item));

export function tickPlayerEffects(player,dt) {
  if(!player.effects)return;
  for(const key of ['milk','wine'])player.effects[key]=Math.max(0,(player.effects[key]??0)-Math.max(0,dt));
}

// Consumption commits only after the entire action. A cancelled action never
// consumes an item or grants a partial heal/effect; the slot's identity matters.
export function createConsumption({player,inventory,onEvent=()=>{}}) {
  let action=null;
  function cancel(){if(!action)return false;const item=action.item;action=null;onEvent({stage:'cancel',item});return true;}
  return {
    start(){
      const item=inventory.slots[inventory.selected];
      if(action||!canConsume(item)||player.heldBy||player.health<=0)return false;
      action={item,slot:inventory.selected,elapsed:0,nextBite:0};onEvent({stage:'start',item});return true;
    },
    tick(dt){
      if(!action)return false;
      const current=action;
      if(player.health<=0||player.heldBy||inventory.selected!==current.slot||inventory.slots[current.slot]!==current.item){cancel();return true;}
      current.elapsed=Math.min(CONSUMPTION.duration,current.elapsed+Math.max(0,dt));
      const times=[.3,.68,1.06];
      while(current.nextBite<times.length&&current.elapsed+1e-8>=times[current.nextBite])onEvent({stage:'bite',item:current.item,bite:current.nextBite++});
      if(current.elapsed+1e-8<CONSUMPTION.duration)return true;
      const item={...current.item};action=null;
      const healed=healPlayer(player,FOOD_HEALTH[item.kind]??0);
      const staminaRestored=restoreStamina(player,foodStaminaFraction(item));
      if(isDrink(item)) {
        player.effects??={milk:0,wine:0};
        player.effects[item.kind==='milk'?'milk':'wine']=item.kind==='milk'?CONSUMPTION.milkDuration:CONSUMPTION.wineDuration;
      }
      if(packages.has(item.kind))inventory.update(current.slot,{empty:true,filledMass:item.filledMass??item.mass,mass:Math.max(.04,item.mass*.4),energy:0});
      else if(item.kind==='banana')inventory.update(current.slot,propItem('bananaPeel',`${item.id}:peel`));
      else inventory.remove(current.slot);
      onEvent({stage:'finish',item,healed,staminaRestored});return true;
    },cancel,get action(){return action;},get active(){return !!action;},
  };
}

export function eatingPose(item,elapsed) {
  const t=Math.max(0,Math.min(CONSUMPTION.duration,elapsed)),raise=THREE.MathUtils.smoothstep(t,0,.26),lower=THREE.MathUtils.smoothstep(t,1.22,1.5),amount=raise*(1-lower);
  const bite=Math.max(0,Math.sin((t-.25)*Math.PI/ .38))*amount,drink=isDrink(item);
  return {amount,position:[.28-.10*amount,-.25+.10*amount-.015*bite,-.5+.12*amount+.025*bite],
    rotation:[.3-(drink?1.5:.4)*amount+.05*bite,-.18+.12*amount,.08+.12*amount],
    scale:.8*(packages.has(item.kind)?1:1-.62*amount*t/1.5)};
}

export function poseEating(held,item,elapsed) {
  const pose=eatingPose(item,elapsed);held.position.fromArray(pose.position);held.rotation.set(...pose.rotation);held.scale.setScalar(pose.scale);
}
