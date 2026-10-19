export const MAX_STAMINA=20;

export function syncStamina(player) {
  player.staminaMax=MAX_STAMINA;
  player.stamina=Math.max(0,Math.min(player.stamina??player.staminaMax,player.staminaMax));
  return player.staminaMax;
}

export function restoreStamina(player,fraction){
  syncStamina(player);const before=player.stamina;
  player.stamina=Math.min(player.staminaMax,before+player.staminaMax*Math.max(0,fraction));
  if(player.stamina>before)player.sprintExhausted=false;
  return player.stamina-before;
}

export function sprintFraction(player,dt,requested,moving) {
  syncStamina(player);
  if(!requested)player.sprintExhausted=false;
  return requested&&moving&&!player.crouched&&!player.heldBy&&!player.hidingBed&&!player.sprintExhausted&&dt>0?Math.min(1,player.stamina/dt):0;
}

export function tickStamina(player,dt,running=false) {
  syncStamina(player);player.sprinting=!!running;
  if(running){player.stamina=Math.max(0,player.stamina-dt);if(player.stamina<1e-8){player.stamina=0;player.sprintExhausted=true;}}
  else player.stamina=Math.min(player.staminaMax,player.stamina+Math.max(0,Math.min(100,player.health??100))/25*dt);
}
