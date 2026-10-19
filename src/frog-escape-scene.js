import * as THREE from 'three';
import {createEscapeFlicker} from './frog-escape-flicker.js';
import { houseWidthScale, upperWidthScale, escapeFloors, escapeStairs, stairWell, frontPorch, upperBalcony, subtractRect, createNavigation } from './frog-escape-navigation.js';
import {finishCastleMaterials,castleSurfaceUV} from './frog-escape-materials.js';
import {createCastleDoor,syncBoxCollider} from './frog-escape-doors.js';
import {castleFixtures} from './frog-escape-fixtures.js';
import {createPickupProps} from './frog-escape-props.js';
import {createEscapeObjectives} from './frog-escape-objectives.js';
import {createOldGardenTrees} from './frog-escape-vegetation.js';
import {castleSearchRooms} from './frog-escape-investigation.js';
import {tr} from './frog-escape-i18n.js';
import {createRunClues} from './frog-escape-run-clues.js';
import {createEscapeFence,createEscapeProgress} from './frog-escape-victory.js';

export function createEscapeScene(scene, { labels = true, random = Math.random, difficulty = 'normal' } = {}) {
const circles = [], doors = [],chairs=[];
const labelUpdates=[];
const furnitureTargets=[];
const groups = { yard: new THREE.Group(), basement: new THREE.Group(), ground: new THREE.Group(), upper: new THREE.Group(), labels: new THREE.Group() };
Object.values(groups).forEach(group => scene.add(group));
const mats = {
  lawn: new THREE.MeshStandardMaterial({ color: 0x27352f, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x625f5a, roughness: .96 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x77766f, roughness: .94 }),
  wallSide: new THREE.MeshStandardMaterial({ color: 0x4c4b49, roughness: .98 }),
  basement: new THREE.MeshStandardMaterial({ color: 0x37383b, roughness: 1 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x66584b, roughness: .9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x644936, roughness: .75 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x392a20, roughness: .8 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x292d39, roughness: .96 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x171b22, metalness: .7, roughness: .48 }),
  gold: new THREE.MeshStandardMaterial({ color: 0x88704b, metalness: .34, roughness: .62 }),
  water: new THREE.MeshStandardMaterial({ color: 0x354957, roughness: .32, metalness: .15 }),
  red: new THREE.MeshStandardMaterial({ color: 0x713d36, roughness: .82 }),
  green: new THREE.MeshStandardMaterial({ color: 0x3c4a3c, roughness: .98 }),
  windowGlow: new THREE.MeshStandardMaterial({ color: 0xdca96a, emissive: 0xc36c2a, emissiveIntensity: 1.15, roughness: .35 }),
  plaster: new THREE.MeshStandardMaterial({color:0xaaa18e,roughness:.96}),
  tile: new THREE.MeshStandardMaterial({color:0x8d8e80,roughness:.72}),
  glass: new THREE.MeshStandardMaterial({color:0x637d87,transparent:true,opacity:.38,roughness:.21,metalness:.12}),
  cloth: new THREE.MeshStandardMaterial({color:0x6f7567,roughness:1}),
  rug: new THREE.MeshStandardMaterial({color:0x583b37,roughness:1}),
  ceramic: new THREE.MeshStandardMaterial({color:0xb3b3a5,roughness:.35}),
  mirror: new THREE.MeshStandardMaterial({color:0x889fa5,metalness:.88,roughness:.12}),
  enamel: new THREE.MeshStandardMaterial({color:0xc9c5aa,metalness:.16,roughness:.32}),
  steel: new THREE.MeshStandardMaterial({color:0xa8b0b4,metalness:.9,roughness:.24}),
  bulbGlass: new THREE.MeshPhysicalMaterial({color:0xffe5b0,transparent:true,opacity:.3,roughness:.08,metalness:.05,side:THREE.DoubleSide,depthWrite:false}),
  filament: new THREE.MeshStandardMaterial({color:0xffd898,emissive:0xffb153,emissiveIntensity:3.5,roughness:.45}),
};
finishCastleMaterials(mats);
for(const [name,material] of Object.entries(mats))material.userData.audioMaterial=
  ['wood','darkWood','floor'].includes(name)?'wood':['iron','gold','steel','mirror'].includes(name)?'metal':
  ['glass','bulbGlass','windowGlow'].includes(name)?'glass':['ceramic','enamel'].includes(name)?'ceramic':['cloth','rug'].includes(name)?'soft':'stone';
const floorGroups = ['basement', 'ground', 'upper'];
// Keep the wider frontage adjustable as the castle layout evolves.
floorGroups.forEach(id => { groups[id].scale.x = id === 'upper' ? upperWidthScale : houseWidthScale; });
function box(parent, x, y, z, w, h, d, material, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  if(material.map)castleSurfaceUV(mesh.geometry,parent.scale.x);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = true;
  mesh.userData.solid = opts.solid !== false;
  parent.add(mesh);
  return mesh;
}
const pickups=createPickupProps(),fixtures=castleFixtures(box,mats,pickups);
const objectives=createEscapeObjectives(box,mats,pickups,fixtures);
function moulding(parent,x,y,z,w,h,d,material,bevel) {
  const shape=new THREE.Shape();
  shape.moveTo(-w/2+bevel,-d/2+bevel);shape.lineTo(w/2-bevel,-d/2+bevel);
  shape.lineTo(w/2-bevel,d/2-bevel);shape.lineTo(-w/2+bevel,d/2-bevel);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:h-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1});
  geometry.rotateX(-Math.PI/2);if(material.map)castleSurfaceUV(geometry,parent.scale.x);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y+bevel,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  return mesh;
}
function floorSlab(parent, y, material, floorId) {
  const shape=new THREE.Shape(); shape.moveTo(-9,-7); shape.lineTo(9,-7); shape.lineTo(9,7); shape.lineTo(-9,7); shape.closePath();
  if(floorId!=='basement') {
    const hole=new THREE.Path(), a=stairWell.minX/parent.scale.x, b=stairWell.maxX/parent.scale.x;
    hole.moveTo(a,-stairWell.minZ); hole.lineTo(b,-stairWell.minZ); hole.lineTo(b,-stairWell.maxZ); hole.lineTo(a,-stairWell.maxZ); hole.closePath(); shape.holes.push(hole);
  }
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:false}); geometry.rotateX(-Math.PI/2);
  if(material.map)castleSurfaceUV(geometry,parent.scale.x);
  const slab=new THREE.Mesh(geometry,material); slab.position.y=y; slab.receiveShadow=true; parent.add(slab);
}
function wall(parent, x, z, width, depth, y, h, material = mats.wall) { return box(parent, x, y, z, width, h, depth, material); }
function partition(parent, a, b, y, h, material = mats.wallSide, opening, trim=true) {
  if(opening) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]), dx=(b[0]-a[0])/length, dz=(b[1]-a[1])/length;
    const t=opening.at, half=opening.width/2;
    const before=[a[0]+dx*(t-half),a[1]+dz*(t-half)], after=[a[0]+dx*(t+half),a[1]+dz*(t+half)];
    partition(parent,a,before,y,h,material); partition(parent,after,b,y,h,material);
    const openingHeight=opening.height??2.65,headerHeight=h-openingHeight;
    if(headerHeight>.001)partition(parent,before,after,y+openingHeight,headerHeight,material,undefined,false);
    return;
  }
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const width=Math.abs(dx)>Math.abs(dz)?Math.abs(dx):.18,depth=Math.abs(dz)>=Math.abs(dx)?Math.abs(dz):.18;
  const segment=box(parent,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,h,depth,material);
  if(trim&&material===mats.plaster&&h>1) {
    moulding(parent,(a[0]+b[0])/2,y+.012,(a[1]+b[1])/2,width+.025,.14,depth+.025,mats.darkWood,.018);
    moulding(parent,(a[0]+b[0])/2,y+.82,(a[1]+b[1])/2,width+.02,.055,depth+.02,mats.wood,.013);
    moulding(parent,(a[0]+b[0])/2,y+h-.14,(a[1]+b[1])/2,width+.06,.12,depth+.06,mats.stone,.035);
  }
  return segment;
}
function roomLabel(parent, title, x, y, z) {
  if (!labels) return;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const redraw=()=>{
    ctx.clearRect(0,0,c.width,c.height);ctx.beginPath();
    ctx.fillStyle='rgba(27,30,26,.78)';ctx.roundRect(4,10,504,108,20);ctx.fill();
    ctx.fillStyle='#f4e9cd';ctx.font='500 48px "Noto Sans SC", sans-serif';
    const text=tr(title),size=Math.min(48,48*470/Math.max(1,ctx.measureText(text).width));
    ctx.font=`500 ${size}px "Noto Sans SC", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);texture.needsUpdate=true;
  };
  labelUpdates.push(redraw);redraw();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(x, y, z); sprite.scale.set(5.1, 1.28, 1); parent.add(sprite);
}
function addRoom(parent, name, x, z, w, d, y, material = mats.floor) {
  roomLabel(groups.labels, name, x * parent.scale.x, y + 2.45, z);
}
function floorPatch(parent,rect,foot,material) {
  const bounds={minX:rect[0]*parent.scale.x,maxX:rect[1]*parent.scale.x,minZ:rect[2],maxZ:rect[3]};
  for(const part of subtractRect(bounds,stairWell)){
    const finish=box(parent,(part.minX+part.maxX)/2/parent.scale.x,foot+.002,(part.minZ+part.maxZ)/2,(part.maxX-part.minX)/parent.scale.x,.008,part.maxZ-part.minZ,material,{castShadow:false});
    finish.name='floor:finish';finish.userData.floorFinish=true;
  }
}
function door(parent,id,name,x,z,y,w,h=2.48,options={}) {
  const rotation=options.rotation??0;
  const width=w*Math.hypot(Math.cos(rotation)*parent.scale.x,Math.sin(rotation));
  const state=createCastleDoor({parent,id,name,x,z,y,width,height:h,materials:mats,...options});
  doors.push(state);return state;
}
function facade(parent,z,foot,height,opening) {
  const apertures=[-6.2,-3.1,3.1,6.2].map(x=>({x,width:1.15,bottom:1.1,top:2.65}));
  if(parent===groups.upper&&z<0) {
    apertures.splice(1,1,{x:-3.1,width:3.4,bottom:.38,top:2.82,escape:true});
  }
  if(opening)apertures.push({x:opening.x,width:opening.width,bottom:0,top:opening.height??2.65});
  apertures.sort((a,b)=>a.x-b.x);let cursor=-9;
  for(const hole of apertures) {
    const left=hole.x-hole.width/2,right=hole.x+hole.width/2;
    box(parent,(cursor+left)/2,foot,z,left-cursor,height,.34,mats.wall);
    if(hole.bottom)box(parent,hole.x,foot,z,hole.width,hole.bottom,.34,mats.wall);
    if(height>hole.top)box(parent,hole.x,foot+hole.top,z,hole.width,height-hole.top,.34,mats.wall);
    if(hole.escape)objectives.largeWindow(parent,hole.x,z,foot,hole.width,hole.bottom,hole.top);
    else if(hole.bottom) {
      const pane=box(parent,hole.x,foot+hole.bottom,z,hole.width,hole.top-hole.bottom,.045,mats.glass);
      for(const x of [left,right])box(parent,x,foot+hole.bottom-.04,z,.085,hole.top-hole.bottom+.13,.23,mats.darkWood,{solid:false});
      for(const y of [hole.bottom,hole.top])box(parent,hole.x,foot+y,z,hole.width+.2,.09,.25,mats.stone,{solid:false});
      const mullions=[-1,1].map(side=>box(parent,hole.x+side*hole.width/6,foot+hole.bottom,z,.055,hole.top-hole.bottom,.1,mats.iron));
      mullions.push(box(parent,hole.x,foot+hole.bottom+.73,z,hole.width,.055,.1,mats.iron));
      objectives.windowPane(pane,mullions);
      const arch=new THREE.Mesh(new THREE.TorusGeometry(.5,.035,5,16,Math.PI),mats.stone);
      arch.position.set(hole.x,foot+hole.top+.04,z);arch.scale.set(hole.width*1.12,Math.min(1,(height-hole.top-.06)/.5),1);parent.add(arch);
    }
    cursor=right;
  }
  box(parent,(cursor+9)/2,foot,z,9-cursor,height,.34,mats.wall);
}
function chair(parent,x,z,foot,angle=0) {
  const group=new THREE.Group();group.position.set(x,foot,z);group.rotation.y=angle;parent.add(group);
  box(group,0,.43,0,.58,.055,.55,mats.wood);
  box(group,0,.485,0,.53,.045,.5,mats.cloth);
  for(const px of [-.22,.22])for(const pz of [-.21,.21])box(group,px,0,pz,.055,.45,.055,mats.darkWood);
  for(const px of [-.24,.24])box(group,px,.5,.22,.055,.64,.06,mats.darkWood);
  box(group,0,.86,.22,.53,.23,.065,mats.wood);
  box(group,0,.895,.176,.43,.13,.018,mats.cloth,{solid:false});
  for(const px of [-.24,.24])fixtures.rounded(group,px,1.16,.22,.045,.045,.045,mats.gold);
  const chair={id:`chair-${chairs.length}`,root:group,colliders:[],meshes:[]};chairs.push(chair);
  group.traverse(mesh=>{if(mesh.userData.solid&&mesh.geometry?.type==='BoxGeometry')mesh.userData.chair=chair;});
  furnitureTargets.push({type:'chair',x:x*parent.scale.x,z,top:foot+.53});
  return group;
}
function bookcase(parent,x,z,foot,angle=0) {
  const group=new THREE.Group();group.position.set(x,foot,z);group.rotation.y=angle;parent.add(group);
  box(group,0,0,.16,2.25,2.35,.08,mats.darkWood);
  for(const side of [-1,1])box(group,side*1.12,0,0,.1,2.35,.44,mats.wood);
  for(let y=.12;y<2.4;y+=.55) {
    box(group,0,y,0,2.14,.055,.44,mats.wood);
    for(let i=0;i<9;i++)box(group,-.96+i*.23,y+.055,-.04,.12,.28+(i%3)*.06,.24,i%3?mats.rug:mats.cloth,{solid:false});
  }
}

// Recesses and diagonal corners follow the old estate boundary. The lawn shares its outline.
const fenceBoundary = [
  [-1.2,-22],[-9,-22],[-12,-24],[-19,-24],[-23,-19],[-23,-10],
  [-21,-10],[-21,-5],[-25,-2],[-25,6],[-23,6],[-23,16],
  [-18,21],[-10,21],[-7,24],[-2.2,24],[2.2,24],[8,24],
  [11,21],[20,21],[24,16],[24,9],[21,9],[21,1],[24,-2],
  [24,-12],[19,-18],[12,-18],[12,-22],[6,-24],[1.2,-22],
];
const gardenOutline = new THREE.Shape();
fenceBoundary.forEach(([x,z],index) => index ? gardenOutline.lineTo(x,-z) : gardenOutline.moveTo(x,-z));
gardenOutline.closePath();
const houseOpening=new THREE.Path();
houseOpening.moveTo(-9*houseWidthScale,-7); houseOpening.lineTo(9*houseWidthScale,-7);
houseOpening.lineTo(9*houseWidthScale,7); houseOpening.lineTo(-9*houseWidthScale,7); houseOpening.closePath();
gardenOutline.holes.push(houseOpening);
const gardenGeometry = new THREE.ExtrudeGeometry(gardenOutline,{depth:.22,bevelEnabled:false});
gardenGeometry.rotateX(-Math.PI/2);
const gardenGround = new THREE.Mesh(gardenGeometry,mats.lawn);
gardenGround.position.y = -1.05;
gardenGround.receiveShadow = true;
groups.yard.add(gardenGround);
const exteriorShape=new THREE.Shape();exteriorShape.moveTo(-30,-30);exteriorShape.lineTo(30,-30);exteriorShape.lineTo(30,30);exteriorShape.lineTo(-30,30);exteriorShape.closePath();
const exteriorHole=new THREE.Path();fenceBoundary.forEach(([x,z],i)=>i?exteriorHole.lineTo(x,-z):exteriorHole.moveTo(x,-z));exteriorHole.closePath();exteriorShape.holes.push(exteriorHole);
const exteriorGeometry=new THREE.ShapeGeometry(exteriorShape);exteriorGeometry.rotateX(-Math.PI/2);
const exteriorGround=new THREE.Mesh(exteriorGeometry,mats.lawn);exteriorGround.position.y=-.83;exteriorGround.receiveShadow=true;exteriorGround.name='yard:exterior-ground';groups.yard.add(exteriorGround);
function gardenBeam(a,b,base,height,depth,material) {
  const dx=b[0]-a[0], dz=b[1]-a[1];
  const beam=box(groups.yard,(a[0]+b[0])/2,base,(a[1]+b[1])/2,Math.hypot(dx,dz),height,depth,material);
  beam.rotation.y=-Math.atan2(dz,dx);
  return beam;
}
function fenceSection(a,b,index,material=mats.iron,stoneFooting=true) {
  const first=groups.yard.children.length;
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const bars=Math.ceil(length/.62);
  if (stoneFooting) gardenBeam(a,b,-.84,.24,.36,mats.wallSide);
  gardenBeam(a,b,.05,.09,.11,material);
  gardenBeam(a,b,1.12,.1,.13,material);
  for(let bar=1;bar<bars;bar++) {
    const t=bar/bars, x=THREE.MathUtils.lerp(a[0],b[0],t), z=THREE.MathUtils.lerp(a[1],b[1],t);
    const height=2.25+Math.sin(index*3.7+bar)*.08;
    box(groups.yard,x,-.8,z,.07,height,.07,material);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.1,.23,4),material);
    spike.position.set(x,height-.685,z); spike.castShadow=true; groups.yard.add(spike);
  }
  for(const child of groups.yard.children.slice(first))child.traverse(mesh=>{mesh.userData.transparentPassable=true;});
}
let escapeFence;
fenceBoundary.forEach((point,index)=>{
  const next=fenceBoundary[(index+1)%fenceBoundary.length];
  const frontGate=point[0]===-2.2 && point[1]===24 && next[0]===2.2;
  const escapePanel=index===fenceBoundary.length-1;
  if(escapePanel)escapeFence=createEscapeFence({parent:groups.yard,box,materials:mats,edgeIndex:index});
  else fenceSection(point,next,index,mats.iron,!frontGate);
  // Weathered stone piers anchor each change of direction.
  box(groups.yard,point[0],-.84,point[1],.48,2.48,.48,mats.wallSide).userData.transparentPassable=true;
  box(groups.yard,point[0],1.64,point[1],.64,.16,.64,mats.stone).userData.transparentPassable=true;
});
// The house and two continuous side fences divide the estate. The larger
// positive-Z yard contains the shed; passage to the rear goes through the house.
const yardDivider={z:-4,segments:[[-22.6,-11.15],[11.15,24.05]]};
for(const [left,right] of yardDivider.segments) {
  const span=right-left,bars=Math.ceil(span/.34);
  const root=new THREE.Group();root.name='yard:front-rear-divider';groups.yard.add(root);
  for(const y of [.1,1.35,2.35])box(root,(left+right)/2,y,-4,span,.09,.095,mats.iron);
  for(let i=0;i<=bars;i++) {
    const x=THREE.MathUtils.lerp(left,right,i/bars);
    box(root,x,-.83,-4,.075,3.35,.075,mats.iron);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.09,.19,4),mats.iron);spike.position.set(x,2.61,-4);root.add(spike);
  }
  for(const x of [left,right])box(root,x,-.83,-4,.18,3.5,.18,mats.iron);
  root.traverse(mesh=>{mesh.userData.transparentPassable=true;});
}
// The rusted north panel remains the designated escape point, with a locked south gate.
for (const x of [-1.1, 1.1]) box(groups.yard, x, -.75, -21.82, .1, 2.15, .18, mats.gold).userData.transparentPassable=true;
roomLabel(groups.labels, '北侧剪栅栏点', 0, 2.45, -19.2);
// Front gate and paths.
box(groups.yard,0,.16,24,.12,.75,.14,mats.iron).userData.transparentPassable=true;
box(groups.yard,0,.39,24.12,.22,.25,.12,mats.gold).userData.transparentPassable=true;
box(groups.yard, 0, -.825, 15.5, 3.2, .035, 17, mats.stone, { castShadow: false, solid:false });
// Tall planting, ruined walls and supplies form pockets of cover with more than one approach.
const hedgeMat=new THREE.MeshStandardMaterial({color:0x283b30,roughness:1});
for (const [x,z,spread] of [[-19,-20,2],[-18,-8,1.4],[-22,3,1.7],[-18,17,1.9],[-8,20,1.5],[18,18,1.8],[19,10,1.2],[18,-15,1.8],[8,-20,1.5],[-6,-20,1.3]]) {
  for(let clump=0;clump<4;clump++) {
    const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),hedgeMat);
    shrub.position.set(x+Math.sin(clump*2.1)*spread*.5,.1+clump%2*.12,z+Math.cos(clump*1.7)*spread*.4);
    shrub.scale.set(spread*.8,1.05+(clump%3)*.22,spread*.65);
    shrub.castShadow=true; shrub.receiveShadow=true; groups.yard.add(shrub);
  }
}
for(const [a,b,h] of [
  [[-19,-6],[-15,-6],1.85],[[-19,-6],[-19,-1],1.55],
  [[12,-15],[16,-15],1.7],[[16,-15],[16,-12],1.3],
  [[-16,14],[-12,14],1.35],[[-16,14],[-16,17],1.7],
]) {
  gardenBeam(a,b,-.82,h,.5,mats.wallSide);
  const blocks=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.1);
  for(let i=0;i<blocks;i++) {
    const t=(i+.5)/blocks;
    box(groups.yard,THREE.MathUtils.lerp(a[0],b[0],t),h-.83,THREE.MathUtils.lerp(a[1],b[1],t),.65,.15+(i%3)*.12,.65,mats.stone);
  }
}
for(const [x,z,w,h,d,angle] of [[17,10.6,1.4,1.45,1.2,.12],[15.5,11,1.3,1,1,-.15],[17.4,12.1,1.2,1.9,1.2,-.08],[-16,-3,1.6,1.2,1.1,.2]]) {
  const crate=box(groups.yard,x,-.82,z,w,h,d,mats.darkWood); crate.rotation.y=angle;
  for(const band of [-.3,.3]) {
    const strap=box(groups.yard,x+band*w,-.81,z,.06,h+.03,d+.04,mats.iron); strap.rotation.y=angle;
  }
  furnitureTargets.push({type:'crate',x,z,top:-.82+h});
}
// Fountain, trees, benches and tool shed.
const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.65, .48, 32), mats.stone); fountain.position.set(-8, -.56, -7); fountain.castShadow = true; groups.yard.add(fountain);
circles.push({x:-8,z:-7,radius:2.65,minY:-.83,maxY:.1});
const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2, .12, 32), mats.water); pool.position.set(-8, -.28, -7); groups.yard.add(pool);
box(groups.yard, -8, -.19, -7, .38, 2.3, .38, mats.stone);
createOldGardenTrees(groups.yard,circles,fenceBoundary);
// Tool shed and its high-contrast bolt-cutter pickup marker.
box(groups.yard, 15, -.95, 4, 5.4, .25, 5, mats.stone);
wall(groups.yard,12.5,4,.22,4.6,-.7,2.6,mats.wallSide);
wall(groups.yard,17.5,4,.22,4.6,-.7,2.6,mats.wallSide);
wall(groups.yard,15,6.3,5,.22,-.7,2.6,mats.wallSide);
partition(groups.yard,[12.5,1.7],[17.5,1.7],-.7,2.6,mats.wallSide,{at:2.5,width:1.5,height:2.5});
box(groups.yard,15,1.95,4,5.5,.38,5.1,mats.roof);
door(groups.yard,'shed','工具棚门',15,1.7,-.7,1.3,2.35,{openingHeight:2.5});
objectives.shed(groups.yard);
roomLabel(groups.labels, '工具棚 · 断线钳', 15, 2.9, 7.5);
// Small player marker and route markers make the escape objective legible at a glance.
const markerMat = new THREE.MeshStandardMaterial({ color: 0xe4c27d, emissive: 0x52330d, emissiveIntensity: .7 });
const playerPin = new THREE.Mesh(new THREE.ConeGeometry(.52, 1.6, 20), markerMat); playerPin.position.set(-3, -.05, -16); playerPin.rotation.x = Math.PI; playerPin.castShadow = true; groups.yard.add(playerPin);

// Three stacked floor plates keep every interior visible in overview and selectable on demand.
const levelData = [
  { id: 'basement', y: -5.4, name: '地下室', wall: mats.basement, rooms: [
    ['旧储藏间 · 起点', -5, 3.7, 5.6, 4.2], ['酒窖', 1.25, 3.7, 6.7, 4.2], ['锅炉房', -5, -2.9, 5.6, 6.4], ['维修间', 2.7, -2.9, 7.4, 6.4],
  ] },
  { id: 'ground', y: -.2, name: '一层', wall: mats.wallSide, rooms: [
    ['门厅', -3.3, 3.7, 5.8, 4.2], ['书房', 4.7, 3.7, 7.6, 4.2], ['中央走廊', -3.3, -.55, 5.8, 4], ['餐厅', 4.7, -.55, 7.6, 4], ['厨房 · 后门', .7, -4.8, 9.2, 4.1],
  ] },
  { id: 'upper', y: 4.8, name: '二层', wall: mats.wall, rooms: [
    ['主卧', -4.6, 3.8, 7, 4.2], ['二层走廊', 3.3, 3.8, 8.2, 4.2], ['客房', -4.6, -.7, 7, 4.3], ['浴室', 4.9, -.7, 5, 4.3], ['楼梯厅', 0, -4.8, 7.5, 3.4],
  ] },
];
for (const level of levelData) {
  const group = groups[level.id];
  const profile=escapeFloors.find(floor=>floor.id===level.id), foot=profile.top;
  floorSlab(group, profile.base, level.id === 'basement' ? mats.basement : mats.floor,level.id);
  // Continuous floors meet the full-height walls; only designed doorways remain open.
  level.rooms.forEach(([name, x, z, w, d]) => addRoom(group, name, x, z, w, d, level.y));
  for(const x of [-8.9,8.9]) wall(group,x,0,.34,14,foot,profile.wallHeight,level.wall);
  if(level.id==='basement') {
    wall(group,0,-6.9,18,.34,foot,profile.wallHeight,level.wall);
    wall(group,0,6.9,18,.34,foot,profile.wallHeight,level.wall);
  } else {
    facade(group,6.9,foot,profile.wallHeight,level.id==='ground'?{x:0,width:2.65,height:3.15}:{x:0,width:1.65});
    if(level.id==='ground') {
      facade(group,-6.9,foot,profile.wallHeight,{x:.8,width:1.6});
      door(group,'rear','厨房后门',.8,-6.9,foot,1.42,2.48,{wallDepth:.34,swing:-1}).playerKeyKind='rearDoorKey';
      const front=door(group,'front','城堡双开大门',0,6.9,foot,2.35,2.96,{double:true,wallDepth:.34,openingHeight:3.15});
      for(const side of [-1,1]) {
        const panel=box(front.frame,front.width/2+.25,1.12,side*.22,.24,.36,.075,mats.iron,{solid:false});panel.name='front-door:keypad';
        for(let row=0;row<4;row++)for(let column=0;column<3;column++)box(front.frame,front.width/2+.18+column*.07,1.15+row*.072,side*.265,.045,.046,.018,mats.steel,{solid:false});
      }
    } else {
      facade(group,-6.9,foot,profile.wallHeight);
      door(group,'balcony','阳台门',0,6.9,foot,1.43,2.48,{wallDepth:.34});
    }
  }
  for(const z of [-6.9,6.9])box(group,0,foot+profile.wallHeight-.14,z,18.22,.16,.46,mats.stone,{solid:false});
  // Shallow exterior corner trim replaces floating rows of cubes inside rooms.
  for(const sx of [-1,1])for(const sz of [-1,1]) {
    const height=profile.wallHeight-.18;
    const side=box(group,sx*9.085,foot+.04,sz*6.76,.035,height,.58,mats.stone,{solid:false});
    const front=box(group,sx*8.78,foot+.04,sz*7.085,.58,height,.035,mats.stone,{solid:false});
    side.name=front.name='castle:exterior-corner-trim';
  }
  if (level.id === 'basement') {
    partition(group,[-2.1,1.6],[-2.1,6.9],foot,profile.wallHeight,mats.wallSide,{at:2.1,width:1.4});
    partition(group,[-2.1,1.6],[4.7,1.6],foot,profile.wallHeight,mats.wallSide,{at:3.1,width:1.5});
    partition(group,[-8.9,1.6],[-2.1,1.6],foot,profile.wallHeight,mats.wallSide,{at:3.9,width:1.5});
    partition(group,[-2.1,-6.9],[-2.1,1.6],foot,profile.wallHeight,mats.wallSide,{at:4.5,width:1.4});
    // Starting cell bars.
    for (let x=-7.3; x<=-4.3; x+=.6) box(group,x,foot,5.65,.07,2.05,.07,mats.iron).userData.transparentPassable=true;
    box(group,2.5,foot,-4.1,3,1.1,.8,mats.wood);
    box(group,-6.5,foot,-3.7,1.4,1.15,1.5,mats.darkWood);
    box(group,.7,foot,6.35,3,.9,.4,mats.darkWood);
    for(const x of [-.2,.7,1.6])pickups.place(group,'glass',x,foot+.902,6.35);
    for(const x of [-.55,1.95])pickups.place(group,'bottle',x,foot+.902,6.35);
    furnitureTargets.push({type:'crate',x:-6.5*group.scale.x,z:-3.7,top:foot+1.15});
    for(const x of [-7.6,-5.4]) {
      box(group,x,foot,-6.4,1.6,2.4,.65,mats.darkWood);
      for(let shelf=0;shelf<4;shelf++)for(let bottle=0;bottle<5;bottle++) {
        const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.28,7),mats.green);mesh.position.set(x-.55+bottle*.27,foot+.2+shelf*.53,-6.0);group.add(mesh);
      }
    }
  }
  if (level.id === 'ground') {
    // End the divider before the entrance so the double door opens onto a clear vestibule.
    partition(group,[0,.8],[0,5.1],foot,profile.wallHeight,mats.plaster,{at:2.9,width:1.5});
    partition(group,[0,-2.7],[0,.8],foot,profile.wallHeight,mats.plaster,{at:1.5,width:1.4});
    partition(group,[-8.9,.8],[0,.8],foot,profile.wallHeight,mats.plaster,{at:5.6,width:1.5});
    partition(group,[-8.9,-2.7],[0,-2.7],foot,profile.wallHeight,mats.plaster,{at:5.6,width:1.5});
    partition(group,[0,-2.7],[5.3,-2.7],foot,profile.wallHeight,mats.plaster,{at:4,width:1.5});
    floorPatch(group,[-8.72,5.3,-6.72,-2.8],foot,mats.tile);
    // Kitchen table, dining table and study shelves.
    box(group,3.8,foot+.82,-.2,3.2,.08,1.4,mats.wood);
    for(const x of [2.45,5.15])for(const z of [-.7,.3])box(group,x,foot,z,.14,.82,.14,mats.darkWood);
    chair(group,2.8,1.2,foot);chair(group,4.7,1.2,foot);
    box(group,3.8,foot+.82,3.6,2.2,.12,1.1,mats.darkWood);
    for (let x=3;x<=4.6;x+=1.6) for (const z of [3.15,4.05]) box(group,x,foot,z,.12,.82,.12,mats.wood);
    chair(group,3.8,4.75,foot);
    fixtures.deskDrawers(group,3.8,3.6,foot);
    fixtures.tableDetails(group,foot);
    bookcase(group,-8.45,3.8,foot,Math.PI/2);
    fixtures.counter(group,-5.4,-6.3,foot,3,'厨房左柜');
    fixtures.counter(group,3.8,-6.3,foot,3,'厨房右柜');
    fixtures.fridge(group,-7.9,-5.95,foot);
    box(group,3.8,foot+.95,-6.28,1.1,.06,.53,mats.iron,{solid:false});
    box(group,3.8,foot+1.01,-6.58,.04,.29,.04,mats.iron,{solid:false});
    floorPatch(group,[-5.9,-.9,2,5.8],foot,mats.rug);
  }
  if (level.id === 'upper') {
    partition(group,[-1.1,1.65],[-1.1,6.9],foot,profile.wallHeight,mats.plaster,{at:2.15,width:1.4});
    partition(group,[-8.9,1.65],[-1.1,1.65],foot,profile.wallHeight,mats.plaster);
    partition(group,[-8.9,-1.9],[-1.1,-1.9],foot,profile.wallHeight,mats.plaster);
    partition(group,[-1.1,-1.9],[-1.1,1.65],foot,profile.wallHeight,mats.plaster,{at:1.2,width:1.4});
    partition(group,[2.5,-1.9],[6.3,-1.9],foot,profile.wallHeight,mats.plaster);
    partition(group,[2.5,-1.9],[2.5,1.65],foot,profile.wallHeight,mats.plaster,{at:1.2,width:1.4});
    partition(group,[2.5,1.65],[6.3,1.65],foot,profile.wallHeight,mats.plaster);
    partition(group,[6.3,-1.9],[6.3,1.65],foot,profile.wallHeight,mats.plaster);
    door(group,'bedroom','主卧门',-1.1,3.8,foot,1.2,2.48,{rotation:Math.PI/2,swing:-1});
    door(group,'guestroom','客房门',-1.1,-.7,foot,1.2,2.48,{rotation:Math.PI/2,swing:-1});
    door(group,'bathroom','卫生间门',2.5,-.7,foot,1.2,2.48,{rotation:Math.PI/2});
    floorPatch(group,[2.6,6.3,-1.8,1.55],foot,mats.tile);
    fixtures.bed(group,-5.3,5.35,foot);
    fixtures.bedside(group,-6.9,5.9,foot);fixtures.bedside(group,-3.7,5.9,foot);
    fixtures.cabinet(group,-8.25,3.05,foot,2.1,Math.PI/2);
    fixtures.bed(group,-7.05,-.1,foot,-Math.PI/2,2.05);
    fixtures.cabinet(group,-4.6,-1.21,foot,1.8);
    fixtures.bathroom(group,foot);
    floorPatch(group,[-.5,1.6,-5.9,5.6],foot,mats.rug);
    // One shared platform stops before the adjacent windows and their ledges.
    const b=upperBalcony,width=b.maxX-b.minX,depth=b.maxZ-b.minZ,middle=(b.minZ+b.maxZ)/2;
    const platform=box(group,0,b.base,middle,width/group.scale.x,b.top-b.base,depth,mats.stone,{solid:false});platform.name='balcony:platform';
    const balconyFirst=group.children.length;
    box(group,0,foot+b.railHeight-.07,b.maxZ-.07,width/group.scale.x,.07,.08,mats.gold);
    for(let x=b.minX+.07;x<=b.maxX-.03;x+=.28)box(group,x/group.scale.x,foot,b.maxZ-.07,.055/group.scale.x,b.railHeight,.055,mats.iron);
    for(const side of [-1,1]) {
      const x=side*(width/2-.035)/group.scale.x;
      box(group,x,foot+b.railHeight-.07,middle,.075/group.scale.x,.07,depth,mats.gold);
      for(let z=b.minZ+.08;z<b.maxZ;z+=.28)box(group,x,foot,z,.055/group.scale.x,b.railHeight,.055,mats.iron);
    }
    for(const child of group.children.slice(balconyFirst))child.traverse(mesh=>{mesh.userData.transparentPassable=true;});
    pickups.place(group,'vase',1.55/group.scale.x,foot+.005,8.05).name='balcony:throwable-vase';
  }
  if(level.id!=='basement')fixtures.landingRailing(group,foot);
  for(const [x,z] of [[-4,3],[3,-4]])fixtures.pendant(group,x,z,foot,profile.wallHeight);
  roomLabel(groups.labels, level.name, 0, level.y+3.25, 0);
}
for(const stair of escapeStairs) {
  const parent=groups[stair.floor], scale=parent.scale.x;
  const depth=Math.abs(stair.endZ-stair.startZ)/stair.steps;
  for(let i=1;i<=stair.steps;i++) {
    const height=stair.bottom+(stair.top-stair.bottom)*i/stair.steps;
    const z=stair.startZ+(stair.endZ-stair.startZ)*(i-.5)/stair.steps;
    box(parent,(stair.minX+stair.maxX)/2/scale,height-.23,z,(stair.maxX-stair.minX)/scale,.23,depth,mats.stone,{solid:false});
  }
  if(stair.floor!=='yard')fixtures.stairRailing(parent,stair);
}
// The wider lower floor keeps a roof on both shoulders of the narrower upper storey.
const shoulderWidth=9*(houseWidthScale-upperWidthScale);
for(const side of [-1,1]) box(groups.ground,side*(9*upperWidthScale+shoulderWidth/2)/houseWidthScale,4.62,0,shoulderWidth/houseWidthScale+.12,.2,14.24,mats.roof);
// Roof and cornice details are separate so floor buttons can reveal room interiors.
const roof = new THREE.Group(); groups.upper.add(roof);
box(roof,0,8.1,0,18.7,.35,14.7,mats.roof);
const pediment = new THREE.Mesh(new THREE.ConeGeometry(11.5,4.6,4),mats.roof); pediment.rotation.y=Math.PI/4; pediment.position.set(0,10.35,0); pediment.scale.set(1,.55,.8); pediment.castShadow=true; roof.add(pediment);
// Crenellations keep the old-castle silhouette without towers protruding into corner rooms.
for (let x=-8.4; x<=8.4; x+=1.45) {
  box(roof,x,7.75,-6.85,.72,.66,.48,mats.wallSide);
  box(roof,x,7.75,6.85,.72,.66,.48,mats.wallSide);
}
for (let z=-5.7; z<=5.7; z+=1.45) {
  box(roof,-8.85,7.75,z,.48,.66,.72,mats.wallSide);
  box(roof,8.85,7.75,z,.48,.66,.72,mats.wallSide);
}
for (const x of [-7.8,-5.2,-2.6,2.6,5.2,7.8]) box(groups.ground,x,.15,7.28,.42,4.45,.42,mats.wallSide);
// The upper balcony also shelters the portico. Its level landing leaves room for both leaves.
const porchWidth=frontPorch.maxX-frontPorch.minX,porchDepth=frontPorch.maxZ-frontPorch.minZ;
const porch=box(groups.ground,0,frontPorch.base,(frontPorch.minZ+frontPorch.maxZ)/2,porchWidth/houseWidthScale,frontPorch.top-frontPorch.base,porchDepth,mats.stone,{solid:false});
porch.name='entrance:landing';
for(const side of [-1,1]) {
  const px=side*1.5;
  box(groups.ground,px,.15,7.14,.25,3.1,.24,mats.stone);
  box(groups.ground,px,.15,7.16,.4,.2,.4,mats.wallSide);
  box(groups.ground,px,3.25,7.16,.43,.18,.4,mats.stone);
  const columnX=side*2.17;
  box(groups.ground,columnX/houseWidthScale,.15,8.28,.44/houseWidthScale,.2,.44,mats.wallSide);
  const column=fixtures.mesh(groups.ground,new THREE.CylinderGeometry(.14,.175,4.4,12),mats.stone,columnX/houseWidthScale,2.55,8.28);
  column.scale.x=1/houseWidthScale;column.name='entrance:column';
  circles.push({x:columnX,z:8.28,radius:.175,minY:.35,maxY:4.75});
  box(groups.ground,columnX/houseWidthScale,4.75,8.28,.48/houseWidthScale,.2,.48,mats.stone);
  box(groups.ground,side*2.31/houseWidthScale,.15,7.65,.14/houseWidthScale,.59,1.22,mats.wallSide);
  const lx=side*1.97;
  const lantern=new THREE.Group();lantern.name='entrance:lantern';lantern.position.set(lx,2.2,7.33);groups.ground.add(lantern);
  lantern.scale.x=1/houseWidthScale;
  box(lantern,0,-.12,-.16,.11,.46,.08,mats.iron,{solid:false});
  fixtures.tube(lantern,[0,.28,-.16],[0,.28,.02],.024,mats.iron);
  const lanternGlow=fixtures.bulb(lantern,0,.015,.03,.9);
  for(const side of [-1,1]) {
    box(lantern,0,-.16,.03+side*.1,.19,.32,.006,mats.bulbGlass,{solid:false});
    box(lantern,side*.1,-.16,.03,.006,.32,.19,mats.bulbGlass,{solid:false});
  }
  for(const x of [-.11,.11])for(const z of [-.08,.14])box(lantern,x,-.18,z,.022,.36,.022,mats.iron,{solid:false});
  fixtures.mesh(lantern,new THREE.ConeGeometry(.2,.17,4),mats.iron,0,.265,.03);
  fixtures.mesh(lantern,new THREE.CylinderGeometry(.17,.13,.045,8),mats.iron,0,-.2,.03);
  const light=new THREE.PointLight(0xffba75,9,7,1.6);light.userData.escapeFlickerGlow=lanternGlow;light.position.set(0,.05,.35);lantern.add(light);
}
box(groups.ground,0,3.43,7.15,3.55,.2,.42,mats.stone);
for(const side of [-1,1])box(groups.ground,-3.2+side*.65,.15,6.2,.12,.42,.5,mats.darkWood);
box(groups.ground,-3.2,.57,6.2,1.7,.09,.6,mats.wood);
box(groups.ground,-3.2,.66,6.2,1.62,.055,.54,mats.cloth,{solid:false});
// Worn paths bend around planting and walls, rather than drawing a bright line across the garden.
function gardenPath(points,width) {
  // This is a flush surface treatment, not a raised platform. A former 2cm
  // visual offset covered thin props even though their physics rested correctly.
  const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,-.8295,z)));
  const vertices=[], indices=[], samples=80;
  for(let i=0;i<=samples;i++) {
    const t=i/samples, point=curve.getPoint(t), tangent=curve.getTangent(t);
    const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    const halfWidth=width*.5+Math.sin(i*1.73)*.06;
    vertices.push(point.x+side.x*halfWidth,point.y,point.z+side.z*halfWidth);
    vertices.push(point.x-side.x*halfWidth,point.y,point.z-side.z*halfWidth);
    if(i<samples) indices.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const pathMaterial=mats.stone.clone();pathMaterial.polygonOffset=true;pathMaterial.polygonOffsetFactor=-1;pathMaterial.polygonOffsetUnits=-1;
  const path=new THREE.Mesh(geometry,pathMaterial);path.name='yard:flush-path';path.receiveShadow=true;groups.yard.add(path);
}
gardenPath([[.8*houseWidthScale,-7.7],[5,-10],[12,-10],[16,-7],[16,-5]],1.15);
gardenPath([[15,-2.8],[15,-.2],[15,1]],1.15);
gardenPath([[.8*houseWidthScale,-7.7],[-2,-12],[-2,-17],[0,-21.5]],.95);
gardenPath([[-12.6,1],[-15,4],[-18,8],[-18,12],[-13,18],[-6,18],[0,14]],.85);
roomLabel(groups.labels,'主别墅',0,13,0);


const runClues=createRunClues({seeds:pickups.seeds,actions:fixtures.actions,frontDoor:doors.find(door=>door.id==='front'),random,difficulty});
scene.updateMatrixWorld(true);
const solids = [];
scene.traverse(mesh => {
  if (!mesh.userData.solid || mesh.geometry?.type !== 'BoxGeometry') return;
  let ancestor=mesh,railing=false;while(ancestor){if(ancestor.name.startsWith('railing:'))railing=true;ancestor=ancestor.parent;}
  const e = mesh.matrixWorld.elements, shape = mesh.geometry.parameters;
  const sx = Math.hypot(e[0], e[2]), sy = Math.abs(e[5]), sz = Math.hypot(e[8], e[10]);
  const solid={ x: e[12], z: e[14], halfX: shape.width*sx/2, halfZ: shape.depth*sz/2,
    transparentPassable:!!mesh.userData.transparentPassable||railing,
    audioMaterial:mesh.material?.userData.audioMaterial??'stone',
    doorFrame:mesh.userData.doorFrame,
    minY: e[13]-shape.height*sy/2, maxY: e[13]+shape.height*sy/2,
    axisX: [e[0]/sx,e[2]/sx], axisZ: [e[8]/sz,e[10]/sz],
  };
  solids.push(solid);
  if(mesh.userData.chair) {
    const chair=mesh.userData.chair;chair.colliders.push(solid);chair.meshes.push(mesh);
    solid.movableChair=chair;solid.dynamic=true;solid.fullRotation=true;syncBoxCollider(mesh,solid);
  }
  if(mesh.userData.door){mesh.userData.door.parts.find(part=>part.leaf===mesh).collider=solid;solid.dynamic=true;}
  if(mesh.userData.fixtureMotion) {
    const {action,motion}=mesh.userData.fixtureMotion;
    motion.colliders.push({mesh,solid});action.colliders.push(solid);
    solid.dynamic=true;
    if(motion.axis!=='y'){solid.fullRotation=true;syncBoxCollider(mesh,solid);}
  }
  if(mesh.userData.escapeFence){const target=mesh.userData.escapeFence;target.colliders.push(solid);solid.dynamic=true;solid.enabled=()=>!target.cut;}
  if(mesh.userData.breakable) {
    const target=mesh.userData.breakable;target.colliders.push(solid);solid.breakable=target;
    solid.dynamic=true;solid.enabled=()=>!target.broken;
  }
});
const navigation = createNavigation({solids,circles,boundary:fenceBoundary,doors,chairs,exits:[escapeFence]});
navigation.windowPassages=objectives.breakables.map(target=>target.passage).filter(Boolean);
const escapeProgress=createEscapeProgress({scene,clues:runClues,fence:escapeFence,chest:objectives.actions.find(action=>action.id==='shed-tool-chest'),cuttersSeed:pickups.seeds.find(seed=>seed.item.kind==='boltCutters'),rearDoor:doors.find(door=>door.id==='rear'),window:objectives.breakables.find(target=>target.escapeRoute)});
const flicker=createEscapeFlicker(scene);
return { groups, roof, fenceBoundary, yardDivider, runClues, escapeProgress, navigation, playerPin, doors, furnitureTargets, flicker, rooms:castleSearchRooms(groups), interactables:[...fixtures.actions,...objectives.actions], pickupSeeds:pickups.seeds,breakables:objectives.breakables,beds:fixtures.beds,refreshLabels(){labelUpdates.forEach(redraw=>redraw());} };
}
