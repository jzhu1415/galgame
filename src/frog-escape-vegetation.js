import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function createOldGardenTrees(parent,circles,boundary) {
  const root=new THREE.Group();root.name='vegetation:old-estate';parent.add(root);
  const bark=[],twigs=[],knots=[],foliage=[],fenceLeaves=[],litter=[];
  const up=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
  let serial=1;
  const random=()=>{const n=Math.sin(serial++*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  const vec=p=>new THREE.Vector3(...p);
  function limb(points,radius,parts=bark) {
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:vec(p))),14,radius,6,false));
  }
  function taper(a,b,bottom,top) {
    const delta=b.clone().sub(a),geometry=new THREE.CylinderGeometry(top,bottom,delta.length(),9);
    dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,delta.normalize());dummy.scale.set(1,1,1);dummy.updateMatrix();
    geometry.applyMatrix4(dummy.matrix);bark.push(geometry);
  }
  function leaf(position,direction,length,width,batch=foliage) {
    dummy.position.copy(position);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.rotateY(random()*Math.PI*2);
    dummy.scale.set(width,length,length);dummy.updateMatrix();batch.push(dummy.matrix.clone());
  }
  function droop(point,drop,spread,batch=foliage) {
    const end=point.clone().add(new THREE.Vector3((random()-.5)*spread,-drop,(random()-.5)*spread));
    if(batch===fenceLeaves)end.y=Math.max(-.62,end.y);
    const middle=point.clone().lerp(end,.48).add(new THREE.Vector3(.15,.12,-.1));
    const curve=new THREE.CatmullRomCurve3([point,middle,end]);
    twigs.push(new THREE.TubeGeometry(curve,7,.009,3,false));
    for(let j=1;j<=7;j++) {
      const p=curve.getPoint(j/8);
      for(const side of [-1,1]) {
        const length=.55+random()*.75;
        leaf(p.clone().add(new THREE.Vector3(side*.1,0,0)),new THREE.Vector3(side*(.15+random()*.25),-1,(random()-.5)*.5),batch===fenceLeaves?Math.min(length,Math.max(.12,p.y+.78)):length,.55+random()*.5,batch);
      }
    }
  }
  const inner=[[-18,-16,-9.4,-7.5],[-19,12,-9.5,6.8],[18,-14,9.5,-7.3],[19,13,9.5,6.8],[-13,18,-5.7,7.9],[13,18,6.7,7.8]];
  const trees=[...inner,...[[-28,-15],[-28,13],[29,-13],[27,18]]];
  root.userData.treeCount=trees.length;root.userData.eaveBranches=inner.length;
  trees.forEach(([x,z,roofX,roofZ],index)=>{
    const sway=Math.sign(x)*.35,height=12.4+(index%3)*.6;
    const points=[[x,-.83,z],[x+sway,2.4,z-.27],[x-.22,5.8,z+.38],[x+sway*1.8,8.8,z-.15],[x+.2,height,z+.2]].map(vec);
    for(let j=0;j<points.length-1;j++)taper(points[j],points[j+1],.86-j*.18,.69-j*.18);
    circles.push({x,z,radius:.92,minY:-.9,maxY:8});
    for(let j=0;j<7;j++) {
      const angle=j*Math.PI*2/7+index*.4,reach=1.4+random()*.8;
      limb([[x,.05,z],[x+Math.cos(angle)*.65,-.36,z+Math.sin(angle)*.65],[x+Math.cos(angle)*reach,-.75,z+Math.sin(angle)*reach]],.105);
    }
    for(let j=0;j<9;j++) {
      const angle=j*Math.PI*2/9;
      limb([[x+Math.cos(angle)*.81,-.5,z+Math.sin(angle)*.81],[x+Math.cos(angle+.12)*.65,2.3,z+Math.sin(angle+.12)*.65],[x+Math.cos(angle-.14)*.43,5.5,z+Math.sin(angle-.14)*.43]],.028);
    }
    for(let j=0;j<3;j++) {
      dummy.position.set(x+(j%2?.51:-.51),1.7+j*1.8,z-.5);dummy.rotation.set(.2,0,j*.7);dummy.scale.set(.16,.26,.08);dummy.updateMatrix();
      const knot=new THREE.SphereGeometry(1,8,6);knot.applyMatrix4(dummy.matrix);knots.push(knot);
      const ring=new THREE.TorusGeometry(.2,.047,5,12);ring.scale(1,1.5,.8);ring.rotateZ(j*.7);ring.translate(dummy.position.x,dummy.position.y,dummy.position.z-.02);bark.push(ring);
    }
    const ends=[];
    for(let branch=0;branch<6;branch++) {
      const angle=branch*Math.PI/3+index*.63,reach=4.6+random()*2.3;
      ends.push(new THREE.Vector3(x+Math.cos(angle)*reach,8.1+random()*2.5,z+Math.sin(angle)*reach));
    }
    if(roofX!==undefined)ends.push(new THREE.Vector3(roofX,8.5,roofZ));
    ends.forEach((end,branch)=>{
      const start=new THREE.Vector3(x+sway,8.1+(branch%3)*.55,z),mid=start.clone().lerp(end,.48);mid.y+=2.1;
      const curve=new THREE.CatmullRomCurve3([start,mid,end]);
      bark.push(new THREE.TubeGeometry(curve,16,branch===6?.2:.15,7,false));
      for(let j=2;j<=8;j++) {
        const p=curve.getPoint(j/8);
        droop(p,branch===6?.65+random()*1.05:1.4+random()*2.5,1.3);
        for(let k=0;k<10;k++) {
          const offset=new THREE.Vector3((random()-.5)*2.1,(random()-.5)*.7,(random()-.5)*2.1);
          leaf(p.clone().add(offset),new THREE.Vector3((random()-.5)*.7,-1,(random()-.5)*.7),.7+random()*.8,.65+random()*.6);
        }
      }
    });
  });
  let vineCount=0;
  for(let i=2;i<boundary.length-1;i+=3) {
    const a=vec([boundary[i][0],0,boundary[i][1]]),b=vec([boundary[(i+1)%boundary.length][0],0,boundary[(i+1)%boundary.length][1]]);
    const tangent=b.clone().sub(a).normalize(),normal=new THREE.Vector3(-tangent.z,0,tangent.x),center=a.clone().lerp(b,.5);
    // Wind stems around both faces of the rail, while keeping the designated escape panel clear.
    for(const side of [-1,1]) {
      const points=Array.from({length:13},(_,j)=>center.clone().addScaledVector(tangent,(j/12-.5)*3).addScaledVector(normal,side*.15+Math.sin(j*1.9)*.11).add(new THREE.Vector3(0,.35+Math.sin(j*.8)*.9,0)));
      limb(points,.019,twigs);vineCount++;
      for(let j=1;j<points.length;j+=2)droop(points[j],.5+random()*.7,.55,fenceLeaves);
    }
  }
  root.userData.fenceVines=vineCount;
  for(let i=0;i<2300;i++) {
    let x,z;
    if(i<1500) {
      const tree=trees[i%trees.length],angle=random()*Math.PI*2,radius=.7+random()*7;
      x=tree[0]+Math.cos(angle)*radius;z=tree[1]+Math.sin(angle)*radius;
    }else {x=(random()-.5)*62;z=(random()-.5)*58;}
    if(Math.abs(x)<11.5&&Math.abs(z)<7.5)continue;
    if(Math.abs(x)<3&&((z>7&&z<12)||(z< -7&&z> -10)))continue;
    const y=x>12.3&&x<17.7&&z>1.5&&z<6.5?-.654:-.816;
    dummy.position.set(x,y+random()*.007,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.rotateOnWorldAxis(up,random()*Math.PI*2);dummy.scale.set(.45+random()*.5,.17+random()*.25,.2);dummy.updateMatrix();litter.push(dummy.matrix.clone());
  }
  const leafGeometry=new THREE.BufferGeometry();
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.12,.38,.025,0,1,0,.12,.38,.025,0,.4,.065],3));
  leafGeometry.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leafGeometry.computeVertexNormals();
  function leafBatch(name,matrices,fallen=false) {
    const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide});
    const mesh=new THREE.InstancedMesh(leafGeometry,material,matrices.length);mesh.name=name;
    // Distribute early instances across the whole garden, so lower densities
    // thin every tree instead of removing the last trees' entire crowns.
    const gcd=(a,b)=>b?gcd(b,a%b):a;let stride=Math.max(1,Math.floor(matrices.length*.618));while(gcd(stride,matrices.length)>1)stride++;
    const color=new THREE.Color();matrices.forEach((matrix,index)=>{const slot=index*stride%matrices.length;mesh.setMatrixAt(slot,matrix);color.setHSL(fallen?.075+random()*.035:.24+random()*.07,.24+random()*.2,fallen?.16+random()*.13:.11+random()*.1);mesh.setColorAt(slot,color);});
    mesh.castShadow=!fallen;mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
  }
  function merge(name,parts,color) {
    const geometry=mergeGeometries(parts,false),material=new THREE.MeshStandardMaterial({color,roughness:1});parts.forEach(part=>part.dispose());
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  merge('vegetation:ancient-bark',bark,0x454236);merge('vegetation:draped-branches',twigs,0x373b2c);merge('vegetation:tree-knots',knots,0x24271e);
  leafBatch('vegetation:long-leaves',foliage);leafBatch('vegetation:fence-leaves',fenceLeaves);leafBatch('vegetation:fallen-leaves',litter,true);
  const ground=new THREE.Shape();ground.moveTo(-40,-40);ground.lineTo(40,-40);ground.lineTo(40,40);ground.lineTo(-40,40);ground.closePath();
  const hole=new THREE.Path();boundary.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();ground.holes.push(hole);
  const geometry=new THREE.ShapeGeometry(ground);geometry.rotateX(-Math.PI/2);
  const outside=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x252e25,roughness:1}));outside.name='vegetation:outer-ground';outside.position.y=-.835;outside.receiveShadow=true;root.add(outside);
  return root;
}
