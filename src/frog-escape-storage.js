import * as THREE from 'three';
import {createFixtureAction} from './frog-escape-interactions.js';

export function castleStorage(box,mats,actions,helpers,pickups) {
  let serial=0;
  const wood=mats.furnitureWood??mats.wood,trim=mats.furnitureTrim??mats.darkWood,cabinet=mats.cabinetWood??mats.darkWood,marble=mats.marble??mats.stone;
  function root(parent,name,x,y,z,angle=0) {
    const unit=new THREE.Group();unit.position.set(x,y,z);unit.scale.x=1/parent.scale.x;parent.add(unit);
    const g=new THREE.Group();g.name=name;g.rotation.y=angle;unit.add(g);return g;
  }
  function anchor(parent,x,y,z) {const point=new THREE.Object3D();point.position.set(x,y,z);parent.add(point);return point;}
  function register(id,name,kind,point,motions,onUpdate) {
    const action=createFixtureAction({id,name,kind,anchor:point,motions,onUpdate});actions.push(action);return action;
  }
  function shell(g,w,h,d,material=cabinet,base=.08) {
    box(g,0,base,-d/2+.025,w-.09,h-base,.05,material);
    for(const side of [-1,1])box(g,side*(w/2-.0225),base,0,.045,h-base,d,material);
    box(g,0,base,0,w-.09,.045,d-.05,material);
    box(g,0,h,0,w+.035,.055,d+.04,material);
  }
  function pair(g,id,name,w,bottom,height,front,material=cabinet) {
    const span=(w-.12)/2,motions=[];
    for(const side of [-1,1]) {
      const pivot=new THREE.Group();pivot.position.set(side*span,bottom,front);g.add(pivot);
      const direction=-side;
      box(pivot,direction*span/2,0,0,span-.012,height,.045,material);
      const handle=box(pivot,direction*(span-.09),height*.43,.055,.028,.16,.055,mats.gold,{solid:false});
      box(pivot,direction*span/2,.1,.027,span-.16,height-.2,.018,trim,{solid:false});
      motions.push({pivot,handle,angle:-direction*Math.PI*.52});
    }
    return register(id,name,'cabinet',anchor(g,0,bottom+height*.55,front+.1),motions);
  }
  function drawer(g,{id,name,w,d,front,y,h=.19,travel=.32}) {
    const pivot=new THREE.Group();pivot.position.set(0,y,front-d/2-.025);g.add(pivot);
    box(pivot,0,0,0,w-.06,.025,d,wood);
    for(const side of [-1,1])box(pivot,side*(w/2-.02),.025,0,.035,h-.045,d,wood);
    box(pivot,0,.025,-d/2+.015,w-.06,h-.045,.03,wood);
    box(pivot,0,0,d/2+.025,w,h,.05,cabinet);
    const handle=box(pivot,0,h*.45,d/2+.083,w*.3,.025,.065,mats.gold,{solid:false});
    const action=register(id,name,'drawer',anchor(pivot,0,h*.52,d/2+.12),[{pivot,handle,travel:new THREE.Vector3(0,0,travel)}]);
    action.loot={anchor:anchor(pivot,0,.032,-.035),room:g.name==='furniture:bedside'?'master-bedroom':null};return action;
  }
  function wardrobe(parent,x,z,foot,w=1.8,angle=0) {
    const id=`wardrobe-${serial++}`,g=root(parent,'furniture:wardrobe',x,foot,z,angle),depth=.96; shell(g,w,2.24,depth);
    helpers.tube(g,[-w*.4,2.08,0],[w*.4,2.08,0],.016,mats.gold);
    const action=pair(g,id,'衣柜',w,.14,2.06,depth/2+.02);
    action.hideVolume={root:g,minX:-w/2+.05,maxX:w/2-.05,minZ:-depth/2+.05,maxZ:depth/2-.015,floor:.125,ceiling:2.24};
    for(const px of [-w*.4,w*.4])for(const pz of [-.18,.18])box(g,px,0,pz,.09,.08,.1,cabinet);
    return g;
  }
  function bedside(parent,x,z,foot) {
    const id=`bedside-${serial++}`,g=root(parent,'furniture:bedside',x,foot,z,Math.PI);shell(g,.65,.65,.58);
    box(g,0,.35,.015,.56,.035,.49,wood);
    drawer(g,{id:`${id}-lower`,name:'床头柜下层抽屉',w:.54,d:.43,front:.29,y:.14,h:.18});
    drawer(g,{id:`${id}-upper`,name:'床头柜上层抽屉',w:.54,d:.43,front:.29,y:.4,h:.19});
    helpers.lamp(g,0,0,.71);return g;
  }
  function counter(parent,x,z,foot,w=3,side='厨房柜') {
    const id=`kitchen-${serial++}`,g=root(parent,'furniture:kitchen-counter',x,foot,z),width=w*parent.scale.x;
    shell(g,width,.88,.8);const top=box(g,0,.935,0,width+.08,.035,.87,marble);top.name='furniture:kitchen-marble-top';
    box(g,0,.56,0,width-.09,.035,.73,wood);
    const span=(width-.12)/3;
    for(let i=0;i<3;i++) {
      const bay=new THREE.Group();bay.position.x=(i-1)*span;g.add(bay);
      if(i<2)box(g,(i-.5)*span,.1,0,.035,.77,.73,cabinet);
      const pivot=new THREE.Group();pivot.position.set(-span/2+.025,.12,.42);bay.add(pivot);
      box(pivot,(span-.05)/2,0,0,span-.05,.4,.045,cabinet);
      const handle=box(pivot,span-.16,.24,.05,.03,.12,.055,mats.gold,{solid:false});
      const action=register(`${id}-door-${i}`,`${side}第${i+1}格柜门`,'cabinet',anchor(bay,0,.35,.5),[{pivot,handle,angle:-Math.PI*.52}]);
      action.loot={anchor:anchor(bay,.16,.15,.15),room:'kitchen'};
      const tray=drawer(bay,{id:`${id}-drawer-${i}`,name:`${side}第${i+1}格抽屉`,w:span-.075,d:.61,front:.4,y:.635,h:.185,travel:.39});
      // Keep the central drawer space and the front-right key anchor clear.
      function content(parent,kind,x,y,z,container,moving=false) {
        const mesh=pickups.place(parent,kind,x,y,z),seed=pickups.seeds.at(-1);
        mesh.name=`storage:usable-${kind}`;seed.available=()=>container.amount>.72;
        seed.trackContainer=moving;return mesh;
      }
      content(bay,'plate',-.23,.126,.08,action);
      content(bay,'cup',.24,.126,-.16,action);
      content(tray.loot.anchor,'fork',-.27,0,.02,tray,true);
      content(tray.loot.anchor,i===2?'cup':'knife',.27,0,.02,tray,true);
    }
    return g;
  }
  function vanity(parent,x,z,foot) {
    serial++;const g=root(parent,'fixture:vanity',x,foot,z);shell(g,1.28,.78,.49);
    box(g,0,.835,0,1.36,.025,.57,marble);
    box(g,0,.25,-.04,1.16,.035,.36,wood);
    box(g,-.25,.29,-.03,.32,.12,.23,mats.cloth,{solid:false});
    return g;
  }
  function desk(parent,x,z,foot) {
    const id=`desk-${serial++}`,g=root(parent,'furniture:desk-drawers',x,foot,z);
    for(const side of [-1,1]) {
      const bay=new THREE.Group();bay.position.x=side*.5;g.add(bay);
      shell(bay,.9,.8,.8,cabinet,.55);
      drawer(bay,{id:`${id}-${side}`,name:`书桌${side<0?'左':'右'}抽屉`,w:.8,d:.61,front:.4,y:.6,h:.17});
    }
  }
  function fridge(parent,x,z,foot) {
    const id=`fridge-${serial++}`,g=root(parent,'furniture:fridge',x,foot,z),w=1.38,d=1.08,h=2.12;
    shell(g,w,h,d,mats.enamel,.045);
    box(g,0,.1,-.475,w-.16,1.94,.035,mats.ceramic);
    for(const side of [-1,1])box(g,side*(w/2-.075),.1,0,.055,1.94,d-.12,mats.ceramic);
    for(const y of [.55,1.05,1.52]) {
      box(g,0,y,-.015,w-.2,.022,d-.19,mats.glass);
      box(g,0,y,.45,w-.17,.028,.025,mats.ceramic,{solid:false});
    }
    const food=new THREE.Group();food.name='fridge:food';food.visible=false;g.add(food);
    for(const [px,pz] of [[-.35,-.15],[-.1,.12],[.23,-.12],[.4,.16]]) {
      pickups.place(food,px<0?'tomato':'apple',px,.095,pz);
    }
    box(food,-.3,.573,-.12,.33,.045,.25,wood);
    for(const px of [-.375,-.225])for(const pz of [-.19,-.05])pickups.place(food,'egg',px,.619,pz);
    for(const px of [.12,.38])pickups.place(food,'banana',px,.573,.03);
    pickups.place(food,'milk',.25,1.075,-.18).name='fridge:milk';
    for(const px of [-.35,-.12])pickups.place(food,'jar',px,1.075,.05);
    pickups.place(food,'bread',-.28,1.545,-.06);pickups.place(food,'cheese',.23,1.545,-.1);
    const pivot=new THREE.Group();pivot.position.set(-w/2+.025,.055,d/2+.018);g.add(pivot);
    const doorWidth=w-.05;
    box(pivot,doorWidth/2,0,0,doorWidth,2.025,.095,mats.enamel);
    box(pivot,doorWidth/2,.055,-.063,doorWidth-.1,1.91,.025,mats.ceramic,{solid:false});
    for(const y of [.25,.8]) {
      box(pivot,doorWidth/2,y,-.14,doorWidth-.2,.045,.15,mats.ceramic);
      box(pivot,doorWidth/2,y+.045,-.215,doorWidth-.2,.14,.025,mats.ceramic);
    }
    const handle=box(pivot,doorWidth-.14,.78,.12,.045,.65,.08,mats.steel,{solid:false});
    for(const y of [.17,1.8])box(pivot,.03,y,.06,.08,.12,.055,mats.steel,{solid:false});
    // Mount the visible diffuser and emitter together, under the inner ceiling.
    const lamp=new THREE.Group();lamp.name='fridge:ceiling-lamp';lamp.position.set(0,1.96,-.12);g.add(lamp);
    box(lamp,0,.012,0,.34,.035,.22,mats.steel,{solid:false});
    const glow=box(lamp,0,-.012,0,.28,.025,.17,mats.windowGlow,{solid:false});glow.name='fridge:diffuser';
    const light=new THREE.PointLight(0xffedca,1.8,1.85,2);light.name='fridge:interior-light';light.position.set(0,-.045,0);lamp.add(light);
    light.visible=false;glow.visible=false;
    register(id,'冰箱','fridge',anchor(g,0,1.13,d/2+.15),[{pivot,handle,angle:-Math.PI*.52}],amount=>{food.visible=amount>.1;light.visible=amount>.08;glow.visible=light.visible;});
    return g;
  }
  return {wardrobe,bedside,counter,vanity,desk,fridge};
}
