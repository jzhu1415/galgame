import {MAX_PLAYER_HEALTH,damagePlayer,fallDamage} from './frog-escape-vitals.js';
import {waterAt} from './frog-escape-water.js';

// Shared dimensions for the rendered building and its walkable surfaces (metres).
export const houseWidthScale = 1.25;
export const upperWidthScale = houseWidthScale * .85;
export const escapeFloors = [
  { id: 'basement', base: -5.4, top: -5.05, scale: houseWidthScale, wallHeight: 4.85 },
  { id: 'ground', base: -.2, top: .15, scale: houseWidthScale, wallHeight: 4.65 },
  { id: 'upper', base: 4.8, top: 5.15, scale: upperWidthScale, wallHeight: 2.95 },
];
export const stairWell = { minX: 7, maxX: 9, minZ: -4.4, maxZ: 4.4 };
export const frontPorch = {minX:-2.4,maxX:2.4,minZ:7,maxZ:8.6,base:-.2,top:.15};
export const upperBalcony = {minX:-2.15,maxX:2.15,minZ:7,maxZ:8.75,base:4.95,top:5.15,railHeight:1.55};
export const escapeStairs = [
  { ...stairWell, bottom: -5.05, top: .15, startZ: 4.4, endZ: -4.4, steps: 26, floor: 'basement' },
  { ...stairWell, bottom: .15, top: 5.15, startZ: 4.4, endZ: -4.4, steps: 25, floor: 'ground' },
  { minX: .1, maxX: 1.9, minZ: -9.4, maxZ: -7, bottom: -.83, top: .15, startZ: -9.4, endZ: -7, steps: 5, floor: 'yard' },
  { minX: -1.8, maxX: 1.8, minZ: 8.6, maxZ: 11.2, bottom: -.83, top: .15, startZ: 11.2, endZ: 8.6, steps: 6, floor: 'yard' },
];
export const playerStart = { x: -6.25, y: -5.05, z: 3.7, yaw: -Math.PI / 2, pitch: 0 };
export const PLAYER_RADIUS = .27;
export const PLAYER_HEIGHT = 1.72;
export const EYE_HEIGHT = 1.58;
export const CROUCH_HEIGHT = 1.02;
export const CROUCH_EYE_HEIGHT = .9;
export const BED_HIDE_HEIGHT = .6;
export const BED_HIDE_EYE_HEIGHT = .42;
export const WALK_SPEED = 3.4 * 1.3 / 1.5;
export const SPRINT_SPEED = WALK_SPEED * 1.7;
export const CROUCH_SPEED = 3.4 * 1.3 * .55;
export const JUMP_SPEED = 6.4;
const GRAVITY = 15;
const FALL_GRAVITY = 19.5;
const MAX_STEP = .235;
const EPS = .015;

export function inRect(x,z,r) { return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ; }
export function pointInPolygon(x,z,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i], b=polygon[j];
    if((a[1]>z)!==(b[1]>z) && x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1], lengthSq=dx*dx+dz*dz;
  const t=lengthSq ? Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/lengthSq)) : 0;
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
export function stairHeight(stair,z) {
  const t=Math.max(0,Math.min(1,(z-stair.startZ)/(stair.endZ-stair.startZ)));
  return stair.bottom+(stair.top-stair.bottom)*Math.ceil(t*stair.steps-1e-7)/stair.steps;
}
// Split a slab around an opening, also used for the room flooring above it.
export function subtractRect(rect,hole) {
  const cut={minX:Math.max(rect.minX,hole.minX),maxX:Math.min(rect.maxX,hole.maxX),minZ:Math.max(rect.minZ,hole.minZ),maxZ:Math.min(rect.maxZ,hole.maxZ)};
  if(cut.minX>=cut.maxX || cut.minZ>=cut.maxZ) return [rect];
  return [
    {...rect,maxX:cut.minX}, {...rect,minX:cut.maxX},
    {minX:cut.minX,maxX:cut.maxX,minZ:rect.minZ,maxZ:cut.minZ},
    {minX:cut.minX,maxX:cut.maxX,minZ:cut.maxZ,maxZ:rect.maxZ},
  ].filter(part=>part.maxX-part.minX>.001 && part.maxZ-part.minZ>.001);
}
export function createNavigation({solids=[],circles=[],boundary,doors=[],chairs=[],stairs=escapeStairs,exits=[],waterVolumes=[]}) {
  const slabs=escapeFloors.flatMap(floor=>{
    const rect={minX:-9*floor.scale,maxX:9*floor.scale,minZ:-7,maxZ:7};
    return (floor.id==='basement'?[rect]:subtractRect(rect,stairWell)).map(part=>({...part,height:floor.top,underside:floor.base}));
  });
  slabs.push({...frontPorch,height:frontPorch.top,underside:frontPorch.base});
  const surfaces=slabs.map(slab=>({...slab}));
  const ceilings=slabs.map(slab=>({...slab,height:slab.underside}));
  ceilings.push({minX:-9.35*upperWidthScale,maxX:9.35*upperWidthScale,minZ:-7.35,maxZ:7.35,height:8.1});
  for(const side of [-1,1]) ceilings.push({minX:side<0?-9*houseWidthScale:9*upperWidthScale,maxX:side<0?-9*upperWidthScale:9*houseWidthScale,minZ:-7,maxZ:7,height:4.62});
  surfaces.push({...upperBalcony,height:upperBalcony.top});
  ceilings.push({...upperBalcony,height:upperBalcony.base});
  surfaces.push({minX:12.3,maxX:17.7,minZ:1.5,maxZ:6.5,height:-.7});
  const house={minX:-9*houseWidthScale,maxX:9*houseWidthScale,minZ:-7,maxZ:7};
  function support(x,z,y,allowance=MAX_STEP,radius=0,ignore=[]) {
    let height=-Infinity;
    const add=value=>{ if(value<=y+allowance+EPS && value>height) height=value; };
    if((pointInPolygon(x,z,boundary)||exits.some(exit=>exit.contains(x,z))) && !inRect(x,z,house)) add(-.83);
    for(const surface of surfaces) if(overlapsRectXZ(x,z,surface,radius)) add(surface.height);
    for(const stair of stairs) if(inRect(x,z,stair)) add(stairHeight(stair,z));
    for(const solid of solids) if(!ignore.includes(solid)&&(!solid.enabled||solid.enabled()) && overlapsBoxXZ(x,z,solid,radius)) add(solid.maxY);
    for(const circle of circles) if(!circle.npc&&(!circle.enabled||circle.enabled())&&Math.hypot(x-circle.x,z-circle.z)<circle.radius+radius) add(circle.maxY);
    return height;
  }
  function overlapsRectXZ(x,z,rect,radius=0) {
    const dx=Math.max(rect.minX-x,x-rect.maxX,0),dz=Math.max(rect.minZ-z,z-rect.maxZ,0);
    return radius ? dx*dx+dz*dz<radius*radius : dx===0&&dz===0;
  }
  function overlapsBoxXZ(x,z,solid,radius=0) {
    const dx=x-solid.x,dz=z-solid.z;
    const ex=Math.max(Math.abs(dx*solid.axisX[0]+dz*solid.axisX[1])-solid.halfX,0);
    const ez=Math.max(Math.abs(dx*solid.axisZ[0]+dz*solid.axisZ[1])-solid.halfZ,0);
    return radius ? ex*ex+ez*ez<radius*radius : ex===0&&ez===0;
  }
  function ceiling(x,z,headY,radius=PLAYER_RADIUS) {
    let height=Infinity;
    const add=value=>{if(value>=headY-EPS && value<height) height=value;};
    for(const slab of ceilings) if(overlapsRectXZ(x,z,slab,radius)) add(slab.height);
    for(const solid of solids) if((!solid.enabled||solid.enabled()) && overlapsBoxXZ(x,z,solid,radius)) add(solid.minY);
    for(const stair of stairs) if(inRect(x,z,stair)) add(stairHeight(stair,z)-.23);
    return height;
  }
  function overlapsBox(x,y,z,solid,radius=PLAYER_RADIUS,stepAllowance=MAX_STEP,bodyHeight=PLAYER_HEIGHT) {
    if(solid.enabled && !solid.enabled()) return false;
    if(y+bodyHeight<=solid.minY+EPS || solid.maxY<=y+stepAllowance+EPS) return false;
    return overlapsBoxXZ(x,z,solid,radius);
  }
  function blocked(x,y,z,allowStep=true,bodyHeight=PLAYER_HEIGHT,radius=PLAYER_RADIUS,ignore=[]) {
    if(!pointInPolygon(x,z,boundary)&&!exits.some(exit=>exit.contains(x,z,radius))) return true;
    for(let i=0;i<boundary.length;i++) if(segmentDistance(x,z,boundary[i],boundary[(i+1)%boundary.length])<radius+.08&&!exits.some(exit=>exit.edgeIndex===i&&exit.contains(x,z,radius+.08))) return true;
    for(const slab of slabs) {
      if(y>=slab.height-EPS||y+bodyHeight<=slab.underside+EPS) continue;
      const dx=Math.max(slab.minX-x,x-slab.maxX,0),dz=Math.max(slab.minZ-z,z-slab.maxZ,0);
      if(dx*dx+dz*dz<radius*radius) return true;
    }
    for(const solid of solids) if(!ignore.includes(solid)&&overlapsBox(x,y,z,solid,radius,allowStep?MAX_STEP:0,bodyHeight)) return true;
    for(const circle of circles) if(!ignore.includes(circle)&&(!circle.enabled||circle.enabled())&&y<circle.maxY && y+bodyHeight>circle.minY && Math.hypot(x-circle.x,z-circle.z)<circle.radius+radius) return true;
    for(const stair of stairs) {
      if(!inRect(x,z,stair)) continue;
      const top=stairHeight(stair,z);
      if(top>y+(allowStep?MAX_STEP:0)+EPS && y+bodyHeight>top-.24+EPS) return true;
    }
    return false;
  }
  function lineClear(from,to,ignore=[]) {
    for(const solid of solids) {
      if(ignore.includes(solid))continue;
      if(solid.enabled&&!solid.enabled()) continue;
      const local=p=>({x:(p.x-solid.x)*solid.axisX[0]+(p.z-solid.z)*solid.axisX[1],y:p.y,z:(p.x-solid.x)*solid.axisZ[0]+(p.z-solid.z)*solid.axisZ[1]});
      if(segmentHitsBox(local(from),local(to),{minX:-solid.halfX,maxX:solid.halfX,minY:solid.minY,maxY:solid.maxY,minZ:-solid.halfZ,maxZ:solid.halfZ})) return false;
    }
    for(const slab of slabs) if(segmentHitsBox(from,to,{...slab,minY:slab.underside,maxY:slab.height})) return false;
    for(const circle of circles) {
      if(ignore.includes(circle)||(circle.enabled&&!circle.enabled()))continue;
      const dx=to.x-from.x,dz=to.z-from.z,length=dx*dx+dz*dz;
      const t=length?Math.max(0,Math.min(1,((circle.x-from.x)*dx+(circle.z-from.z)*dz)/length)):0;
      const y=from.y+(to.y-from.y)*t;
      if(t>.002&&t<.998&&y>circle.minY&&y<circle.maxY&&Math.hypot(from.x+dx*t-circle.x,from.z+dz*t-circle.z)<circle.radius)return false;
    }
    return true;
  }
  return {solids,circles,doors,chairs,stairs,slabs,surfaces,ceilings,boundary,support,ceiling,blocked,overlapsBox,lineClear,waterVolumes,waterAt:position=>waterAt(waterVolumes,position)};
}
function segmentHitsBox(a,b,box) {
  let enter=0,leave=1;
  for(const [axis,min,max] of [['x',box.minX,box.maxX],['y',box.minY,box.maxY],['z',box.minZ,box.maxZ]]) {
    const d=b[axis]-a[axis];
    if(Math.abs(d)<1e-8) {if(a[axis]<min||a[axis]>max)return false;continue;}
    let t0=(min-a[axis])/d,t1=(max-a[axis])/d;
    if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);leave=Math.min(leave,t1);
    if(enter>leave)return false;
  }
  return leave>.002&&enter<.998;
}
export function createPlayer() { return {...playerStart,health:MAX_PLAYER_HEALTH,stamina:20,staminaMax:20,sprintExhausted:false,sprinting:false,velocityY:0,grounded:true,crouched:false,hidingBed:null,jumpOriginY:null,fallStartY:null,heldBy:null}; }
export function playerHeight(player) {return player.hidingBed?BED_HIDE_HEIGHT:player.bodyHeight??(player.crouched?CROUCH_HEIGHT:PLAYER_HEIGHT);}
export function setCrouch(player,wanted,world) {
  if(wanted) player.crouched=true;
  else if(!world.blocked(player.x,player.y,player.z,false,PLAYER_HEIGHT)&&world.ceiling(player.x,player.z,player.y+CROUCH_HEIGHT)>=player.y+PLAYER_HEIGHT-EPS) player.crouched=false;
  return player.crouched;
}
export function jumpPlayer(player) {
  if(!player.grounded||player.hidingBed||player.heldBy||player.health<=0) return false;
  player.fallStartY=player.jumpOriginY=player.y;player.grounded=false; player.velocityY=JUMP_SPEED;
  player.onJump?.({position:{x:player.x,y:player.y,z:player.z}});
  return true;
}
export function advancePlayer(player,dx,dz,dt,world,{forced=false}={}) {
  if(player.hidingBed)return player;
  dt=Math.max(0,Math.min(dt,.05));
  const startY=player.y;
  let landingSpeed=0;
  // A hold stops walking and rising; gravity still settles both feet naturally.
  if(player.heldBy&&!forced){dx=dz=0;player.velocityY=Math.min(0,player.velocityY);}
  const bodyHeight=playerHeight(player),radius=player.radius??PLAYER_RADIUS;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.06));
  for(let step=0;step<count;step++) {
    for(const [axis,amount] of [['x',dx/count],['z',dz/count]]) {
      if(!amount) continue;
      const x=player.x+(axis==='x'?amount:0), z=player.z+(axis==='z'?amount:0);
      // Use the same footprint for landing and side collisions, including partial edge contact.
      const floor=world.support(x,z,player.y,player.grounded?MAX_STEP:0,radius);
      // Small stair risers remain walkable; crouching stops at unsupported lips.
      if(!forced&&player.kind!=='pursuer'&&player.crouched&&player.grounded&&floor<player.y-MAX_STEP-EPS)continue;
      const snapping=player.grounded && floor>=player.y-MAX_STEP && floor<=player.y+MAX_STEP+EPS;
      const y=snapping?floor:player.y;
      let blocked=world.blocked(x,y,z,player.grounded,bodyHeight);
      if(blocked&&!forced&&dt>0)world.pushObstacles?.(player,{x:axis==='x'?amount:0,z:axis==='z'?amount:0},dt/count);
      if(blocked&&world.overlapsBox) {
        const leaving=(world.chairs??[]).filter(chair=>{
          const center=chair.body?.position??chair.colliders[0];
          return chair.colliders.some(solid=>world.overlapsBox(player.x,player.y,player.z,solid,radius,0,bodyHeight))
            &&Math.hypot(x-center.x,z-center.z)>Math.hypot(player.x-center.x,player.z-center.z)+.000001;
        }).flatMap(chair=>chair.colliders);
        if(leaving.length)blocked=world.blocked(x,y,z,player.grounded,bodyHeight,radius,leaving);
      }
      if(blocked&&player.kind!=='pursuer') {
        // A moving NPC can overlap the footprint before its hold resolves.
        // Permit only steps that leave that overlap; all walls still collide.
        const escaping=(world.circles??[]).filter(circle=>circle.npc&&(!circle.enabled||circle.enabled())&&y<circle.maxY&&y+bodyHeight>circle.minY
          &&Math.hypot(player.x-circle.x,player.z-circle.z)<circle.radius+radius
          &&Math.hypot(x-circle.x,z-circle.z)>Math.hypot(player.x-circle.x,player.z-circle.z)+.000001);
        if(escaping.length)blocked=world.blocked(x,y,z,player.grounded,bodyHeight,radius,escaping);
      }
      if(!blocked) { player[axis]+=amount; if(snapping) player.y=y; }
    }
  }
  const floor=world.support(player.x,player.z,player.y,player.grounded?MAX_STEP:0,radius);
  if(player.grounded && Math.abs(floor-player.y)<=MAX_STEP+EPS) {
    player.y=floor; player.velocityY=0;
  } else {
    player.fallStartY??=startY;
    player.grounded=false; player.velocityY-=(player.kind!=='pursuer'&&player.velocityY<=0?FALL_GRAVITY:GRAVITY)*dt;
    const nextY=player.y+player.velocityY*dt;
    if(player.velocityY>0) {
      const limit=world.ceiling(player.x,player.z,player.y+bodyHeight)-bodyHeight;
      player.y=Math.min(nextY,limit);
      if(nextY>=limit) player.velocityY=0;
    } else if(nextY<=floor) {
      landingSpeed=Math.max(0,-player.velocityY);
      player.y=floor; player.velocityY=0; player.grounded=true;
    } else player.y=nextY;
  }
  if(player.grounded) {
    const drop=player.fallStartY==null?0:player.fallStartY-player.y;
    player.jumpOriginY=player.fallStartY=null;
    if(player.kind!=='pursuer') {
      if(landingSpeed>0)player.onLand?.({height:Math.max(0,drop),speed:landingSpeed,position:{x:player.x,y:player.y,z:player.z}});
      damagePlayer(player,fallDamage(drop),'fall');
    }
  }
  return player;
}
