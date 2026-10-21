import * as THREE from 'three';
import {createBananaModel} from './frog-escape-banana-model.js';

export const propTypes={
  plate:{name:'瓷盘',type:'plate',size:[.34,.036,.34],mass:.4,fragile:true,breakSpeed:7,shape:'cylinder',icon:'◉'},
  bowl:{name:'瓷碗',type:'plate',size:[.42,.12,.42],mass:.5,fragile:true,breakSpeed:7.5,shape:'cylinder',icon:'◡'},
  cup:{name:'陶瓷杯',type:'cup',size:[.15,.115,.11],mass:.22,fragile:true,breakSpeed:6.5,icon:'☕'},
  glass:{name:'玻璃酒杯',type:'glass',size:[.13,.23,.13],mass:.16,fragile:true,breakSpeed:5.8,shape:'cylinder',icon:'♧'},
  fork:{name:'金属叉',type:'cutlery',size:[.04,.014,.24],mass:.08,icon:'⋔'},
  knife:{name:'餐刀',type:'cutlery',size:[.03,.016,.24],mass:.09,icon:'╱'},
  book:{name:'书籍',type:'book',size:[.22,.035,.3],mass:.38,icon:'▤'},
  egg:{name:'奶蛋',type:'egg',size:[.1,.135,.1],mass:.065,fragile:true,breakSpeed:1.8,shape:'sphere',energy:8,icon:'●'},
  apple:{name:'苹果',type:'food',size:[.15,.17,.15],mass:.16,shape:'sphere',energy:12,icon:'●'},
  tomato:{name:'番茄',type:'food',size:[.15,.15,.15],mass:.12,shape:'sphere',energy:8,icon:'●'},
  banana:{name:'香蕉',type:'food',size:[.14,.11,.36],mass:.15,energy:12,icon:'☽'},
  bananaPeel:{name:'香蕉皮',type:'peel',size:[.34,.045,.34],mass:.045,energy:0,icon:'✧'},
  bread:{name:'面包',type:'food',size:[.38,.17,.23],mass:.3,energy:28,icon:'▰'},
  cheese:{name:'奶酪',type:'food',size:[.28,.1,.22],mass:.22,energy:22,icon:'◩'},
  milk:{name:'野生狗奶',type:'food',size:[.2,.4,.18],mass:.45,energy:18,icon:'▣'},
  jar:{name:'果酱罐',type:'food',size:[.16,.19,.16],mass:.3,fragile:true,breakSpeed:7.5,shape:'cylinder',energy:16,icon:'▤'},
  bottle:{name:'酒瓶',type:'glass',size:[.13,.3,.13],mass:.4,fragile:true,breakSpeed:8,shape:'cylinder',icon:'♧'},
  crowbar:{name:'撬棍',type:'tool',size:[.16,1.4,.12],mass:1.3,icon:'⌝',melee:true,damage:5},
  boltCutters:{name:'断线钳',type:'tool',size:[.32,.085,.82],mass:1.6,icon:'⋈',action:'cut-fence'},
  shedKey:{name:'工具箱钥匙',type:'key',size:[.16,.03,.065],mass:.055,icon:'⚿'},
  rearDoorKey:{name:'后门钥匙',type:'key',size:[.19,.03,.075],mass:.07,icon:'⚿'},
  vase:{name:'阳台花瓶',type:'ceramic',size:[.32,.62,.32],mass:.9,fragile:true,breakSpeed:6.4,shape:'cylinder',icon:'♜'},
};

export function propItem(kind,id) {return {id,kind,...propTypes[kind],on:false,stackLimit:1};}

export function windowDamage(item,{speed=0,melee=false}={}) {
  if(melee)return item?.kind==='crowbar'?35:0;
  if(!['crowbar','bottle','vase'].includes(item?.kind)||speed<9)return 0;
  return (item.mass??0)*speed*speed/2>=16?65:0;
}

export function createPropModel(item) {
  const kind=item.kind,def=propTypes[kind];if(!def)throw new Error(`Unknown prop: ${kind}`);
  const g=new THREE.Group(),model=new THREE.Group();model.add(g);
  const porcelain=new THREE.MeshStandardMaterial({color:0xc9c6b5,roughness:.32});
  const metal=new THREE.MeshStandardMaterial({color:0xb5b9b7,metalness:.92,roughness:.23});
  const gold=new THREE.MeshStandardMaterial({color:0x9a804d,metalness:.7,roughness:.3});
  const glass=new THREE.MeshPhysicalMaterial({color:0xc0d5d8,transparent:true,opacity:.42,roughness:.09,metalness:.04,depthWrite:false,side:THREE.DoubleSide});
  function mesh(geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  function box(x,y,z,w,h,d,material){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y+h/2,z);}
  function lathe(points,material,x=0,y=0,z=0){return mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),24),material,x,y,z);}
  function sphere(x,y,z,sx,sy,sz,material){const m=mesh(new THREE.SphereGeometry(1,16,10),material,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function tube(a,b,r,material){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),material);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());}
  if(kind==='plate'||kind==='bowl') {
    const bowl=kind==='bowl';lathe(bowl?[[0,0],[.075,0],[.2,.085],[.21,.105],[.2,.112],[.183,.085],[.06,.018],[0,.018]]:[[0,0],[.095,0],[.13,.009],[.165,.026],[.17,.029],[.17,.036],[.162,.034],[.126,.016],[.09,.009],[0,.009]],porcelain);
    const rim=mesh(new THREE.TorusGeometry(bowl?.2:.165,.0025,5,28),gold,0,bowl?.112:.035);rim.rotation.x=Math.PI/2;
  } else if(kind==='cup') {
    lathe([[0,0],[.042,0],[.051,.08],[.052,.105],[.044,.105],[.041,.018],[0,.018]],porcelain);
    const handle=mesh(new THREE.TorusGeometry(.032,.008,8,16),porcelain,.058,.06);handle.scale.x=.8;
  } else if(kind==='glass') {
    lathe([[0,0],[.055,0],[.058,.006],[.016,.014],[.006,.025],[.006,.115],[.025,.12],[.055,.155],[.062,.22],[.058,.225],[.053,.16],[.019,.129],[0,.125]],glass);
  } else if(kind==='fork') {
    tube([0,.01,.12],[0,.01,-.055],.007,metal);
    for(let i=0;i<4;i++)tube([-.0195+i*.013,.01,-.045],[-.0195+i*.013,.01,-.12],.003,metal);
  } else if(kind==='knife') {
    box(0,0,-.06,.025,.012,.12,metal);box(0,0,.055,.029,.016,.11,gold);
  } else if(kind==='book') {
    const palette=[0x596977,0x86584a,0x657254,0x92794e,0x635670,0x407775];
    const tint=[...item.id].reduce((value,char)=>(value+char.charCodeAt(0))%palette.length,0);
    const cover=new THREE.MeshStandardMaterial({color:palette[tint],roughness:.88});
    const pages=new THREE.MeshStandardMaterial({color:0xe2d7b9,roughness:1});
    box(0,0,0,.22,.0035,.3,cover);box(0,.0315,0,.22,.0035,.3,cover);
    box(.001,.0035,.001,.208,.028,.287,pages);box(-.107,.0035,0,.006,.028,.3,cover);
    // One fine line mesh depicts page edges without adding a mesh per page.
    const lines=[];
    for(let i=1;i<9;i++) {
      const y=.0035+i*.0031;
      lines.push(-.102,y,.1446,.105,y,.1446,.1056,y,-.142,.1056,y,.144);
    }
    const edges=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3)),new THREE.LineBasicMaterial({color:0xb8ab8e}));
    g.add(edges);
    for(const z of [-.105,.105])box(-.1102,.006,z,.001,.022,.005,gold);
    box(0,.0351,-.025,.11,.0004,.065,gold);
  } else if(kind==='egg') {
    // Model the supplied yellow egg reference directly: tapered crown, broad
    // rounded base, green oval eyes and the small upturned smile.
    const yellow=new THREE.MeshStandardMaterial({color:0xffd83e,roughness:.3});
    const rim=new THREE.MeshStandardMaterial({color:0x97ad4a,roughness:.45});
    const iris=new THREE.MeshStandardMaterial({color:0x425e25,roughness:.35});
    const pupil=new THREE.MeshStandardMaterial({color:0x111b0b,roughness:.18});
    const shine=new THREE.MeshBasicMaterial({color:0xfffbd7});
    const profile=Array.from({length:33},(_,i)=>{const angle=i*Math.PI/32;return [.052*Math.sin(angle)*(1+.2*Math.cos(angle)),.07*(1-Math.cos(angle))];});
    const shell=lathe(profile,yellow);shell.name='egg:yellow-shell';
    function front(x,y) {
      const angle=Math.acos(1-y/.07),radius=.052*Math.sin(angle)*(1+.2*Math.cos(angle));
      return Math.sqrt(Math.max(0,radius*radius-x*x));
    }
    for(const side of [-1,1]) {
      const x=side*.0205,y=.105,z=front(x,y);
      sphere(x,y,z+.0015,.009,.012,.004,rim).name='egg:eye';
      sphere(x,y,z+.0042,.0068,.0095,.0022,iris);
      sphere(x,y,z+.0061,.0045,.007,.0015,pupil);
      sphere(x-.0018,y+.003,z+.0075,.0017,.0021,.0008,shine);
    }
    const smilePoints=Array.from({length:13},(_,i)=>{const x=-.016+i*.032/12,y=.082+.005*(x/.016)**2;return new THREE.Vector3(x,y,front(x,y)+.001);});
    const smile=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePoints),16,.001,6,false),new THREE.MeshStandardMaterial({color:0x77501b,roughness:.8}));smile.name='egg:smile';
  }
  else if(kind==='apple'||kind==='tomato') {
    sphere(0,.075,0,.075,.075,.075,new THREE.MeshStandardMaterial({color:kind==='apple'?0x809d43:0xa54232,roughness:.65}));
    tube([0,.135,0],[.009,.17,0],.007,gold);
  } else if(kind==='banana'||kind==='bananaPeel') {
    g.add(createBananaModel(kind==='bananaPeel'));
  } else if(kind==='bread') {
    const brown=new THREE.MeshStandardMaterial({color:0xa87c40,roughness:.96});sphere(0,.085,0,.19,.085,.115,brown);
    for(let i=0;i<3;i++)box((i-1)*.075,.157,0,.025,.005,.11,porcelain);
  } else if(kind==='cheese') {
    box(0,0,0,.28,.1,.22,new THREE.MeshStandardMaterial({color:0xd9b35d,roughness:.7}));
    for(let i=0;i<3;i++)sphere((i-1)*.065,.101,.02,.014,.002,.014,gold);
  } else if(kind==='milk') {
    const blue=new THREE.MeshStandardMaterial({color:0x65859c,roughness:.7});
    box(0,0,0,.2,.08,.18,porcelain);box(0,.08,0,.2,.12,.18,blue);box(0,.2,0,.2,.13,.18,porcelain);
    const s=new THREE.Shape();s.moveTo(-.1,0);s.lineTo(0,.07);s.lineTo(.1,0);s.closePath();mesh(new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false}),porcelain,0,.33,-.09);
  } else if(kind==='jar') {
    mesh(new THREE.CylinderGeometry(.075,.075,.16,16),item.empty?glass:new THREE.MeshStandardMaterial({color:0x984d42,roughness:.35}),0,.08);
    mesh(new THREE.CylinderGeometry(.08,.08,.025,16),gold,0,.1775);
  } else if(kind==='crowbar') {
    const rust=new THREE.MeshStandardMaterial({color:0x5b3026,metalness:.65,roughness:.8});
    const points=[[-.055,.49,0],[.035,.52,0],[.07,.47,0],[.052,.4,0],[.015,.36,0],[.015,-.4,0],[-.035,-.49,.012]].map(p=>new THREE.Vector3(...p));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),42,.018,8,false),rust);
    tube([-.04,-.49,.012],[-.075,-.51,.018],.019,metal);
    const gripMaterial=new THREE.MeshStandardMaterial({color:0x292c29,roughness:.97});
    for(let i=0;i<7;i++)tube([.015,-.435+i*.027,0],[.015,-.42+i*.027,0],.021,gripMaterial);
    tube([-.055,.49,0],[-.07,.475,0],.014,metal);
    for(const [name,position] of [['head',[-.055,.49,0]],['grip',[.015,-.355,0]],['tail',[-.075,-.51,.018]]]) {
      const marker=new THREE.Object3D();marker.name=`crowbar:${name}`;marker.position.fromArray(position);g.add(marker);
    }
  } else if(kind==='boltCutters') {
    const grips=new THREE.MeshStandardMaterial({color:0x763a2c,roughness:.92});
    const rig={handles:[],jaws:[]};model.userData.cutterRig=rig;
    function articulated(name,side,build) {
      const pivot=new THREE.Group();pivot.name=`cutters:${name}:${side}`;pivot.position.set(0,.025,-.14);g.add(pivot);
      const first=g.children.length;build();for(const child of g.children.slice(first))pivot.attach(child);
      rig[name].push({pivot,side});
    }
    for(const side of [-1,1]) {
      articulated('handles',side,()=>{
        tube([side*.125,.025,.37],[side*.045,.025,-.14],.017,metal);
        tube([side*.125,.025,.37],[side*.095,.025,.2],.026,grips);
      });
      articulated('jaws',side,()=>{
        tube([side*.045,.025,-.14],[side*.075,.025,-.29],.027,metal);
        tube([side*.075,.025,-.29],[side*.018,.025,-.4],.032,metal);
      });
    }
    mesh(new THREE.CylinderGeometry(.036,.036,.07,12),gold,0,.025,-.14);
  } else if(kind==='shedKey'||kind==='rearDoorKey') {
    const material=kind==='rearDoorKey'?metal:gold;
    const ring=mesh(new THREE.TorusGeometry(.027,.006,8,20),material,-.047,.007,0);ring.rotation.x=Math.PI/2;
    tube([-.025,.007,0],[.076,.007,0],.007,material);
    for(const x of [.045,.069])box(x,0,.014,.012,.016,.031,material);
    if(kind==='rearDoorKey')box(-.047,.002,0,.025,.012,.025,new THREE.MeshStandardMaterial({color:0x416577,roughness:.5}));
  } else if(kind==='vase') {
    const glaze=new THREE.MeshStandardMaterial({color:0x567b95,metalness:.12,roughness:.23,side:THREE.DoubleSide});
    lathe([[0,0],[.09,0],[.11,.035],[.16,.18],[.14,.32],[.075,.43],[.065,.55],[.09,.59],[.085,.62],[.072,.615],[.054,.55],[.064,.44],[.125,.31],[.145,.18],[.095,.04],[0,.04]],glaze);
    for(const [radius,y]of[[.09,.035],[.15,.23],[.085,.61]]){const band=mesh(new THREE.TorusGeometry(radius,.006,6,32),gold,0,y,0);band.rotation.x=Math.PI/2;}
  } else if(kind==='bottle') {
    const green=new THREE.MeshPhysicalMaterial({color:0x345137,roughness:.2,metalness:.1,transparent:true,opacity:item.empty?.42:.7,depthWrite:false});
    lathe([[0,0],[.065,0],[.065,.19],[.027,.225],[.022,.29],[.02,.3],[0,.3]],green);
    if(!item.empty)mesh(new THREE.CylinderGeometry(.057,.057,.16,16),new THREE.MeshStandardMaterial({color:0x662a2c,roughness:.35}),0,.09);
    mesh(new THREE.CylinderGeometry(.024,.024,.025,12),gold,0,.29);
  }
  const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  g.scale.set(def.size[0]/size.x,def.size[1]/size.y,def.size[2]/size.z);g.position.copy(center).multiply(g.scale).multiplyScalar(-1);
  model.name=`prop:${kind}`;model.userData.item=item;return model;
}

export function createPickupProps() {
  const seeds=[];let serial=0;
  function place(parent,kind,x,y,z,{rotation=null}={}) {
    const item=propItem(kind,`prop-${serial++}-${kind}`),mesh=createPropModel(item);
    parent.updateWorldMatrix(true,false);
    if(rotation)mesh.rotation.set(...rotation);
    mesh.position.set(x,y,z);parent.add(mesh);
    // Cancel the room stretch along the rotated prop's axes. This also keeps
    // upright books on turned shelves aligned with their rigid-body bounds.
    const scale=mesh.getWorldScale(new THREE.Vector3());mesh.scale.set(1/scale.x,1/scale.y,1/scale.z);
    const bottom=mesh.getWorldPosition(new THREE.Vector3()).y,bounds=new THREE.Box3().setFromObject(mesh);
    mesh.position.y+=(bottom-bounds.min.y)/parent.getWorldScale(new THREE.Vector3()).y;
    seeds.push({item,mesh});return mesh;
  }
  return {seeds,place};
}
