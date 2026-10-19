export const MAX_PLAYER_HEALTH=100;
export const INITIAL_ALERTNESS=10;
export const MAX_ALERTNESS=100;
export const ESCAPE_DIFFICULTIES=Object.freeze({
  easy:Object.freeze({label:'简单模式',en:'Easy',captureDamage:20,initialAlertness:10,naiwaHealth:15,downDuration:8}),
  normal:Object.freeze({label:'普通模式',en:'Normal',captureDamage:30,initialAlertness:10,naiwaHealth:20,downDuration:6.5}),
  hard:Object.freeze({label:'困难模式',en:'Hard',captureDamage:50,initialAlertness:30,naiwaHealth:25,downDuration:5}),
  hacker:Object.freeze({label:'极限模式',en:'Hacker',captureDamage:100,initialAlertness:100,naiwaHealth:30,downDuration:3.5}),
});
export const difficultyRules=id=>ESCAPE_DIFFICULTIES[id]??ESCAPE_DIFFICULTIES.normal;
export const WAKE_ALERTNESS_REDUCTION=10;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function damagePlayer(player,amount,source) {
  if(!Number.isFinite(amount)||amount<=0)return 0;
  if(player.effects?.milk>0)amount/=2;
  const before=clamp(player.health??MAX_PLAYER_HEALTH,0,MAX_PLAYER_HEALTH);
  player.health=clamp(before-amount,0,MAX_PLAYER_HEALTH);
  const damage=before-player.health;
  if(damage)player.onHealthChange?.({health:player.health,damage,source});
  return damage;
}

export function healPlayer(player,amount) {
  if(!Number.isFinite(amount)||amount<=0||player.health<=0)return 0;
  const before=clamp(player.health??MAX_PLAYER_HEALTH,0,MAX_PLAYER_HEALTH);
  player.health=clamp(before+amount,0,MAX_PLAYER_HEALTH);
  const healed=player.health-before;
  if(healed)player.onHealthChange?.({health:player.health,damage:0,healed,source:'food'});
  return healed;
}

// Naiwa takes the item's alertness tier as base damage. Keep drink effects and
// the one-point empty-container penalty; collision speed only determines contact.
export function itemDamage(item,source='projectile',damageScale=1,shattered=false) {
  return Math.max(0,(itemAlertness(item,source)+(item?.kind==='vase'&&shattered?1:0))*damageScale-(item?.empty?1:0));
}
export function projectileDamage(item,speed,damageScale=1) {
  return itemDamage(item,'projectile',damageScale,!!item?.fragile&&speed>(item.breakSpeed??7));
}
export const playerDamageScale=player=>player?.effects?.wine>0?1.5:1;
export const playerMovementScale=player=>player?.effects?.wine>0?.8:1;

export function fallDamage(height) {
  if(!Number.isFinite(height)||height<=3+.000001)return 0;
  // Count support-to-support drop height, without charging extra for a voluntary jump.
  return clamp((Math.round(height)-2)*2,2,MAX_PLAYER_HEALTH);
}

export function alertnessPhase(value) {
  if(value>=100)return {id:'transparent',label:'通透模式',speedScale:6.2/3.45};
  if(value>=70)return {id:'tangwang',label:'唐王模式',speedScale:1.2};
  if(value>=30)return {id:'intelligent',label:'已开智',speedScale:1};
  return {id:'dormant',label:'未开智',speedScale:1};
}

export function isSoftProjectile(item) {
  return ['bread','egg','tomato','apple','cheese','banana'].includes(item?.kind);
}

export function itemAlertness(item,source='projectile') {
  if(item?.kind==='bananaPeel')return 0;
  if(item?.kind==='vase')return 9;
  if(source==='melee'&&!item||item?.kind==='bottle'||item?.kind==='crowbar')return 5;
  if(item?.kind==='glass'||item?.kind==='knife')return 4;
  if(['plate','bowl','cup','jar'].includes(item?.kind))return 3;
  if(item?.kind==='milk'||item?.kind==='fork'||item?.type==='cutlery')return 2;
  if(isSoftProjectile(item)||item?.type==='food'||item?.type==='egg')return 1;
  return 2;
}

export function changeAlertness(current,amount) {
  return clamp(current+amount,0,MAX_ALERTNESS);
}
