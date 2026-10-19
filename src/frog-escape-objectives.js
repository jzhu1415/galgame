import * as THREE from 'three';
import {createFixtureAction} from './frog-escape-interactions.js';

// Authored escape props use the same inventory, door animation and collision data as the rooms.
export function createEscapeObjectives(box,mats,pickups,helpers) {
  const breakables=[],actions=[];
  function group(parent,name,x,y,z) {const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function crackedPane(pane,target) {
    const {width,height}=pane.geometry.parameters,points=[];
    for(let i=0;i<7;i++) {
      const angle=i*Math.PI*2/7,tip=new THREE.Vector3(Math.cos(angle)*width*.3,Math.sin(angle)*height*.33,.026);
      const bend=tip.clone().multiplyScalar(.5);bend.x+=Math.sin(i*2)*.055;bend.z=.026;
      points.push(new THREE.Vector3(0,0,.026),bend,bend.clone(),tip);
    }
    const cracks=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xb6c6c6,transparent:true,opacity:.75}));
    cracks.name='window:cracks';cracks.visible=false;pane.add(cracks);target.onDamage=()=>{cracks.visible=true;};
  }
  function cobweb(parent,origin,a,b) {
    const points=[],o=new THREE.Vector3(...origin),va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);
    const rim=Array.from({length:10},(_,i)=>va.clone().lerp(vb,i/9));
    for(const p of rim)points.push(o,p);
    for(let ring=1;ring<=7;ring++)for(let i=0;i<rim.length-1;i++) {
      const amount=ring/7;
      points.push(o.clone().lerp(rim[i],amount),o.clone().lerp(rim[i+1],amount*(.97+Math.sin(i*2+ring)*.025)));
    }
    const web=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xb3b4a4,transparent:true,opacity:.43,depthWrite:false}));
    web.name='shed:cobweb';parent.add(web);
  }
  function shed(parent) {
    const g=group(parent,'shed:weathered-interior',15,-.7,4);
    const timber=mats.darkWood.clone();timber.color.setHex(0x5b5543);timber.roughness=1;
    const rust=mats.iron.clone();rust.color.setHex(0x653c2c);rust.roughness=.92;
    const damp=new THREE.MeshStandardMaterial({color:0x293a2c,roughness:1});
    for(const side of [-1,1]) {
      for(let i=0;i<8;i++) {
        const z=-1.98+i*.56;
        const board=box(g,side*2.355,.1+(i%3)*.025,z,.065,1.6+(i%4)*.13,.43,timber,{solid:false});
        board.rotation.x=Math.sin(i*3.7)*.025;
        box(g,side*2.313,.04,z,.008,.32+(i%3)*.14,.31,damp,{solid:false});
      }
      for(const z of [-2.08,2.08])box(g,side*2.3,0,z,.15,2.5,.15,timber);
      helpers.tube(g,[side*2.28,.3,1.9],[side*2.28,1.65,.45],.033,timber);
      cobweb(g,[side*2.28,2.44,-2.08],[side*1.05,2.44,-2.08],[side*2.28,1.37,-2.08]);
      cobweb(g,[side*2.28,2.44,2.08],[side*.75,2.44,2.08],[side*2.28,1.14,2.08]);
    }
    for(let i=0;i<9;i++) {
      const plank=box(g,-2.05+i*.52,.01,0,.46,.035,3.92-(i%3)*.18,timber,{solid:false});
      plank.rotation.y=Math.sin(i*7)*.008;
      for(const z of [-1.6,1.5])box(g,-2.05+i*.52,.047,z,.018,.006,.018,rust,{solid:false});
    }
    for(const z of [-1.65,0,1.65])box(g,0,2.39,z,4.7,.16,.13,timber);
    for(let i=0;i<5;i++) {
      const board=box(g,-2.1+i*.9,2.69,.06,1.08,.045,4.2-(i%2)*.18,rust,{solid:false});board.rotation.z=Math.sin(i*2.1)*.025;
    }
    cobweb(g,[-2.2,.08,1.9],[-1.4,.08,1.9],[-2.2,.85,1.9]);
    const crowbar=pickups.place(g,'crowbar',-2,.055,.88),tilt=.34;
    const [barWidth,barLength]=crowbar.userData.item.size;
    crowbar.rotation.z=tilt;crowbar.name='quest:leaning-crowbar';
    // Lower end rests on the shed planks; the upper end leans at the left wall.
    crowbar.position.set(-2.30+barWidth/2*Math.cos(tilt)+barLength/2*Math.sin(tilt),
      .055+barLength/2*Math.cos(tilt)+barWidth/2*Math.sin(tilt),.88);
    const chest=group(g,'quest:locked-tool-chest',1.2,0,1.35);chest.rotation.y=Math.PI;
    const w=1.34,d=.82,h=.78;
    box(chest,0,.09,0,w,.075,d,timber);
    for(const side of [-1,1]) {
      box(chest,side*(w/2-.025),.165,0,.05,h-.165,d,timber);
      box(chest,0,.165,side*(d/2-.025),w-.1,h-.165,.05,timber);
      for(const z of [-.29,.29])box(chest,side*.51,0,z,.1,.09,.12,rust);
      box(chest,side*.43,.09,d/2+.012,.065,h-.09,.024,rust,{solid:false});
    }
    const lid=group(chest,'quest:chest-lid',0,h,-d/2);
    box(lid,0,0,d/2,w+.045,.075,d+.045,timber);
    for(const x of [-.43,.43])box(lid,x,.076,d/2,.065,.015,d+.045,rust,{solid:false});
    for(const x of [-.4,.4])box(chest,x,h-.035,-d/2-.02,.16,.075,.065,rust,{solid:false});
    const lock=group(lid,'quest:chest-padlock',0,-.13,d+.06);
    const shackle=helpers.mesh(lock,new THREE.TorusGeometry(.045,.009,6,16,Math.PI),mats.gold,0,.06,0);
    shackle.rotation.z=0;box(lock,0,-.02,0,.12,.09,.055,rust,{solid:false});
    box(lock,0,.012,.029,.012,.025,.004,mats.darkWood,{solid:false});
    const keySocket=group(lock,'quest:chest-key-socket',0,.025,.03);
    const anchor=group(chest,'quest:chest-handle',0,.64,d/2+.12);
    const content=group(chest,'quest:chest-content',0,0,0);content.visible=false;
    const cutters=pickups.place(content,'boltCutters',0,.17,0);cutters.rotation.y=Math.PI/2;
    const action=createFixtureAction({id:'shed-tool-chest',name:'工具箱',kind:'chest',anchor,motions:[{pivot:lid,axis:'x',angle:-Math.PI*.57}],onUpdate:amount=>{content.visible=!action.locked&&amount>.7;lock.visible=action.locked||!!action.insertedKey;}});
    action.locked=true;action.keyKind='shedKey';action.keySocket=keySocket;action.content=content;actions.push(action);
    const seed=pickups.seeds.find(seed=>seed.mesh===cutters);seed.available=()=>!action.locked&&action.amount>.7;
    return action;
  }
  function largeWindow(parent,x,z,foot,width,bottom=.38,top=2.82) {
    const g=group(parent,'quest:rear-bedroom-window',x,foot,z),height=top-bottom;
    const target={id:'rear-bedroom-window',name:'后院侧大窗',kind:'window',escapeRoute:true,width:width*parent.scale.x,broken:false,health:60,colliders:[]};
    const paneGroup=group(g,'quest:window-glass',0,0,0);
    const glass=mats.glass.clone();glass.color.setHex(0x7c9ba7);glass.opacity=.34;glass.side=THREE.DoubleSide;
    const pane=box(paneGroup,0,bottom,0,width,height,.045,glass);pane.userData.breakable=target;
    crackedPane(pane,target);
    for(const face of [-.2,.2])for(const side of [-1,1]) {
      box(g,side*(width/2+.045),bottom-.055,face,.095,height+.13,.1,mats.darkWood);
      box(g,0,(side<0?bottom-.075:top),face,width+.26,.09,.1,mats.stone);
    }
    box(g,0,bottom-.15,.04,width+.36,.075,.48,mats.stone);
    // Leadwork belongs to the glass, leaving a full body-sized opening after shattering.
    for(const ratio of [-.25,.25])box(paneGroup,width*ratio,bottom,.028,.018,height,.015,mats.iron,{solid:false});
    for(const y of [bottom+height*.33,bottom+height*.66])box(paneGroup,0,y,.028,width,.018,.015,mats.iron,{solid:false});
    const remnants=group(g,'quest:window-broken-edges',0,0,0);remnants.visible=false;
    for(let i=0;i<9;i++) {
      const shard=helpers.mesh(remnants,new THREE.TetrahedronGeometry(.085,0),glass,-width/2+(i+.5)*width/9,top-.04,0);
      shard.scale.set(.7,1.5,.15);
    }
    target.center=()=>g.localToWorld(new THREE.Vector3(0,bottom+height/2,0));
    target.break=()=>{if(target.broken)return false;target.broken=true;paneGroup.visible=false;remnants.visible=true;return true;};
    g.traverse(mesh=>{if(mesh.userData.solid)mesh.userData.transparentPassable=true;});
    windowPassage(target,pane,foot,bottom,width,Math.sign(z));
    breakables.push(target);return target;
  }
  function windowPassage(target,pane,foot,bottom,width,sign) {
    const center=pane.getWorldPosition(new THREE.Vector3());
    target.passage={id:target.id,kind:'window',center:{x:center.x,y:center.y,z:center.z},width:width*pane.getWorldScale(new THREE.Vector3()).x,sign,foot,from:{x:center.x,y:foot,z:center.z-sign*1.7},to:{x:center.x,y:-.83,z:center.z+sign*3.8},lift:foot+bottom+.62,bidirectional:foot<1};
  }
  function windowPane(pane,mullions) {
    const target={id:`castle-window-${breakables.length}`,name:'玻璃窗',kind:'window',broken:false,health:60,colliders:[]};
    target.center=()=>pane.getWorldPosition(new THREE.Vector3());
    // Small windows keep their fixed lattice after the glass breaks.
    target.break=()=>{if(target.broken)return false;target.broken=true;pane.visible=false;return true;};
    crackedPane(pane,target);
    pane.userData.breakable=target;
    for(const mesh of [pane,...mullions])mesh.userData.transparentPassable=true;
    const center=pane.getWorldPosition(new THREE.Vector3()),foot=center.y>5?5.15:.15;
    windowPassage(target,pane,foot,pane.position.y-pane.geometry.parameters.height/2-foot, pane.geometry.parameters.width,Math.sign(center.z));
    breakables.push(target);return target;
  }
  return {actions,breakables,shed,largeWindow,windowPane};
}
