import * as THREE from 'three';
import {slipPose} from './frog-escape-naiwa-slip.js';
import {attachNaiwaRig} from './frog-escape-naiwa-rig.js';
import {blockPoseAmount,bedPullPose} from './frog-escape-naiwa-skills.js';
import {NAIWA_DEFENSE} from './frog-escape-naiwa-defense.js';
import {constrainNaiwaWrist} from './frog-escape-naiwa-pose.js';
import {solveNaiwaLimb} from './frog-escape-naiwa-actions.js';
import {handwalkFootMotion,footGripAmount,orientNaiwaSupportArm} from './frog-escape-naiwa-handwalk.js';
import {NAIWA_TOES} from './frog-escape-naiwa-toes.js';

// Identity reference: references/naiwa-escape-turnaround.png (the user's supplied NaiLong.png).
export function createNaiwaModel() {
  return attachNaiwaRig(createProceduralNaiwaModel());
}

function createProceduralNaiwaModel() {
  const root=new THREE.Group();root.name='character:naiwa';
  root.userData.reference='references/naiwa-escape-turnaround.png';
  const rig=new THREE.Group();root.add(rig);rig.scale.set(.8,1,.9);
  const skin=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.66,side:THREE.DoubleSide});
  const yellow=new THREE.MeshStandardMaterial({color:0xeac132,roughness:.66,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x555347,roughness:.83,side:THREE.DoubleSide});
  const green=new THREE.MeshStandardMaterial({color:0x6da84b,roughness:.53});
  const black=new THREE.MeshStandardMaterial({color:0x101910,roughness:.36});
  const mouthMaterial=new THREE.MeshStandardMaterial({color:0x73612e,roughness:.85});
  const lemon=new THREE.Color(0xf0d543),gold=new THREE.Color(0xe6ad2f),cream=new THREE.Color(0xe7dfc5);
  function add(parent,geometry,material,x=0,y=0,z=0) {const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function ellipsoid(parent,x,y,z,sx,sy,sz,material) {const m=add(parent,new THREE.SphereGeometry(1,24,16),material,x,y,z);m.scale.set(sx,sy,sz);return m;}
  const profile=new THREE.SplineCurve([[0,.52],[.34,.56],[.51,.69],[.61,.91],[.64,1.12],[.59,1.36],[.45,1.55],[.30,1.72],[.24,1.91],[.21,2.04],[.13,2.13],[0,2.16]].map(([x,y])=>new THREE.Vector2(x,y)));
  const bodyGeometry=new THREE.LatheGeometry(profile.getPoints(90),72);
  const positions=bodyGeometry.getAttribute('position'),colors=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),shift=Math.max(0,1-Math.abs(y-1.16)/.7)*.075;
    positions.setZ(i,z*.82+shift);
    const color=gold.clone().lerp(lemon,THREE.MathUtils.smoothstep(y,.65,2.05));
    const oval=(x/.535)**2+((y-1.23)/.335)**2;
    if(z>0)color.lerp(cream,1-THREE.MathUtils.smoothstep(oval,.94,1.035));
    colors.push(color.r,color.g,color.b);
  }
  bodyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));bodyGeometry.computeVertexNormals();
  const body=add(rig,bodyGeometry,skin);body.name='naiwa:continuous-body';
  const arms=[],forearms=[],hands=[],legs=[],eyes=[],legToeSets=[];
  const face=new THREE.Group();face.name='naiwa:face';face.position.y=1.84;rig.add(face);
  for(const side of [-1,1]) {
    const eyeGroup=new THREE.Group();eyeGroup.name=side<0?'naiwa:right-eye':'naiwa:left-eye';eyeGroup.position.set(side*.145,.155,.175);face.add(eyeGroup);eyes.push(eyeGroup);
    const eye=ellipsoid(eyeGroup,0,0,0,.085,.09,.065,green);eye.name='naiwa:green-eye';
    ellipsoid(eyeGroup,0,-.001,.057,.047,.058,.021,black);
    ellipsoid(eyeGroup,-side*.013,.018,.076,.011,.014,.004,new THREE.MeshStandardMaterial({color:0xc7d7a2,roughness:.3}));
    const arm=new THREE.Group();arm.name=side>0?'naiwa:left-upper-arm':'naiwa:right-upper-arm';arm.position.set(side*.49,1.5,.015);rig.add(arm);arms.push(arm);
    const elbow=new THREE.Group();elbow.position.set(side*.22,-.51,.03);arm.add(elbow);forearms.push(elbow);
    const hand=new THREE.Group();hand.name=side>0?'naiwa:left-hand':'naiwa:right-hand';hand.position.set(-side*.05,-.32,.015);elbow.add(hand);hands.push(hand);
    function armSegment(parent,points,depth=0) {
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      const geometry=new THREE.TubeGeometry(curve,16,.105,12,false),p=geometry.getAttribute('position'),c=[];
      for(let j=0;j<p.count;j++){const color=yellow.color.clone().lerp(dark.color,THREE.MathUtils.smoothstep(depth-p.getY(j),.66,.81));c.push(color.r,color.g,color.b);}
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));add(parent,geometry,skin);
    }
    armSegment(arm,[[0,0,0],[side*.16,-.22,.015],[side*.22,-.51,.03]]);
    armSegment(elbow,[[0,0,0],[-side*.01,-.15,.007],[-side*.04,-.30,.015]],.51);
    ellipsoid(elbow,0,0,0,.105,.105,.105,yellow);
    ellipsoid(hand,0,0,0,.075,.11,.06,dark);
    for(let finger=0;finger<3;finger++) {
      const fingerCurve=new THREE.CatmullRomCurve3([[(finger-1)*.033,-.01,.015],[side*.01+(finger-1)*.034,-.11,.025],[-side*.02+(finger-1)*.032,-.12,.055]].map(p=>new THREE.Vector3(...p)));
      add(hand,new THREE.TubeGeometry(fingerCurve,8,.016,6,false),dark);
    }
    const leg=new THREE.Group();leg.position.set(side*.285,.64,.025);rig.add(leg);legs.push(leg);
    const legShape=new THREE.LatheGeometry([[0,0],[.07,0],[.085,.1],[.105,.36],[.14,.56],[0,.63]].map(([r,y])=>new THREE.Vector2(r,y)),20);legShape.translate(0,-.59,0);add(leg,legShape,yellow);
    ellipsoid(leg,0,-.585,.075,.155,.053,.2,dark);
    const normal=new THREE.Group(),extra=new THREE.Group(),toeCount=side>0?NAIWA_TOES.left:NAIWA_TOES.right;leg.add(normal,extra);extra.visible=false;leg.userData.toeCount=3;
    for(let toe=0;toe<3;toe++)ellipsoid(normal,(toe-1)*.071,-.598,.205+(.035-Math.abs(toe-1)*.025),.052,.032,.105,dark);
    for(let toe=0;toe<toeCount;toe++)ellipsoid(extra,(toe-(toeCount-1)/2)*(.24/toeCount),-.598,.205+(.025-Math.abs(toe-(toeCount-1)/2)*.01),.24/toeCount*.43,.032,.105,dark);
    legToeSets.push({normal,extra,count:toeCount});
  }
  const smile=new THREE.CatmullRomCurve3([[-.115,.035,.185],[0,.022,.211],[.115,.035,.185]].map(p=>new THREE.Vector3(...p)));
  const smileMouth=add(face,new THREE.TubeGeometry(smile,18,.007,5,false),mouthMaterial);
  const neutralCurve=new THREE.CatmullRomCurve3([[-.115,.029,.191],[0,.029,.217],[.115,.029,.191]].map(p=>new THREE.Vector3(...p)));
  const neutralMouth=add(face,new THREE.TubeGeometry(neutralCurve,18,.007,5,false),mouthMaterial);neutralMouth.name='naiwa:neutral-mouth';neutralMouth.visible=false;
  root.userData.height=2.16;root.userData.palette={yellow:0xeac132,cream:0xe7dfc5,green:0x6da84b,handsFeet:0x555347};
  const rightFist=ellipsoid(hands[0],0,-.03,.035,.095,.11,.095,dark);rightFist.name='naiwa:right-fist';rightFist.visible=false;
  const palm=new THREE.Object3D();palm.name='naiwa:left-palm';palm.position.set(0,-.055,.015);hands[1].add(palm);
  const wristAxes=hands.map(hand=>hand.position.clone().normalize());
  const supportLegs=[-1,1].map(sign=>{
    const group=new THREE.Group();group.visible=false;rig.add(group);
    const upper=add(group,new THREE.CylinderGeometry(.115,.13,1,12),yellow),lower=add(group,new THREE.CylinderGeometry(.10,.115,1,12),yellow);
    const knee=ellipsoid(group,0,0,0,.125,.125,.125,yellow),foot=new THREE.Group();group.add(foot);foot.name=sign>0?'naiwa:left-foot':'naiwa:right-foot';
    ellipsoid(foot,0,-.03,.035,.155,.053,.16,dark);const toes=[];
    const toeCount=sign>0?NAIWA_TOES.left:NAIWA_TOES.right;foot.userData.toeCount=toeCount;
    for(let toe=0;toe<toeCount;toe++)toes.push(ellipsoid(foot,(toe-(toeCount-1)/2)*(.24/toeCount),-.045,.14,.24/toeCount*.43,.032,.105,dark));
    return {sign,group,upper,lower,knee,foot,toes};
  });
  function segment(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.scale.y=a.distanceTo(b);}
  function blockLeftArm(amount) {
    const upper=arms[1],forearm=forearms[1],hand=hands[1];
    upper.rotation.set(.7*amount,0,2.6*amount);forearm.rotation.set(0,0,1.55*amount);
    const palmOrientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.45*amount,0,4.15*amount));
    hand.quaternion.copy(upper.quaternion).multiply(forearm.quaternion).invert().multiply(palmOrientation);
  }
  let phase=0,time=0,nerdAmount=0;
  function animate(dt,{speed=0,state='patrol',stun=0,lookYaw=0,lookPitch=0,lookTarget=null,actionTime=0,variant=null,guardAmount=0,lightAmount=0,reachTargets=null,reachAmount=0,bodyLean=0,kickAmount=0,slipElapsed=null,intelligent=false,handWalking=false}={}) {
    time+=dt;phase+=speed*dt*3.35;
    const down=state==='down',hurt=state==='stunned',grabbing=state==='grab';
    rig.position.y=Math.sin(phase*2)*Math.min(.022,speed*.012)+Math.sin(time*1.7)*.006;
    rig.position.z=0;
    rig.rotation.z=down?-.95:hurt?Math.sin(time*18)*.065:Math.sin(phase)*Math.min(.022,speed*.01);
    rig.rotation.x=down?-.35:hurt?-.16:grabbing?.07:lookPitch*.2;
    rig.rotation.y=lookYaw*.15;
    face.rotation.y=NAIWA_DEFENSE.lightHeadYaw*lightAmount;
    face.rotation.x=0;
    face.position.set(0,1.84,0);body.position.set(0,0,0);body.rotation.set(0,0,0);
    eyes.forEach(eye=>{eye.scale.set(1,1,1);eye.quaternion.identity();});
    if(down){rig.position.y=-.4;rig.position.x=.2;}else rig.position.x=0;
    arms.forEach((arm,i)=>{arm.position.set((i?1:-1)*.49,1.5,.015);arm.rotation.set((down?-.5:hurt?-.4:grabbing?-1.1:Math.sin(phase+(i?Math.PI:0))*.25*Math.min(1,speed)),0,(i?1:-1)*(hurt?.12:.025));forearms[i].quaternion.identity();hands[i].quaternion.identity();});
    legs.forEach((leg,i)=>{leg.position.set((i?1:-1)*.285,.64,.025);leg.rotation.set(down?.16:Math.sin(phase+(i?0:Math.PI))*.31*Math.min(1,speed),0,0);});
    hands.forEach(hand=>hand.scale.set(1,1,1));
    const supported=handWalking&&!down&&!['bed-search','bed-reach','bed-rise'].includes(state);
    legToeSets.forEach(({normal,extra,count},i)=>{normal.visible=!handWalking;extra.visible=handWalking;legs[i].userData.toeCount=handWalking?count:3;});
    smileMouth.visible=!supported;neutralMouth.visible=supported;
    legs.forEach(leg=>leg.visible=!supported);supportLegs.forEach(leg=>leg.group.visible=supported);root.userData.handwalkAmount=supported?1:0;
    if(supported){
      nerdAmount=0;root.userData.nerdStanceAmount=0;root.userData.actionLimb='left-foot';rightFist.visible=false;
      rig.position.y-=.51;rig.rotation.set(0,0,hurt?Math.sin(time*26)*.085:0);face.rotation.y=lookYaw+NAIWA_DEFENSE.lightHeadYaw*lightAmount;
      body.rotation.x=.345;body.position.set(0,.52*(1-Math.cos(.345)),-.52*Math.sin(.345));
      face.position.set(0,.52+1.32*Math.cos(.345),1.32*Math.sin(.345)+.006);
      eyes.forEach((eye,i)=>{eye.scale.y=(i===0?.86:.82)*THREE.MathUtils.lerp(1,i===0?NAIWA_DEFENSE.rightEyeOpen:NAIWA_DEFENSE.leftEyeOpen,lightAmount);eye.rotation.set(.07,i===0?-.045:.045,0);});
      const clip=state==='slam'?'FootSlam':state==='pull'?(variant==='bed'?'FootBedPull':'FootPull'):state==='grab'||state==='caught'?'FootGrab':state==='block'?'FootBlock':state==='kick'||kickAmount>.01?'FootKick':'HandIdle';
      const motion=handwalkFootMotion(clip,actionTime),grip=footGripAmount(state,actionTime,variant);
      for(const leg of supportLegs){
        const left=leg.sign>0,hip=new THREE.Vector3(leg.sign*.25,left?.70:.66,0),knee=new THREE.Vector3(left?.8:-.5,left?1.05:1.55,left?.3:.37);
        const end=new THREE.Vector3(left?.3:.02,(left?1.40+motion.lift:.82)+.51,left?.6+motion.forward:.75);
        if(left&&guardAmount>0&&state!=='pull')end.lerp(new THREE.Vector3(.22,1.65+.51,.42),guardAmount);
        if(left&&state==='pull'&&reachTargets?.R){root.updateWorldMatrix(true,true);end.lerp(rig.worldToLocal(new THREE.Vector3().copy(reachTargets.R)),reachAmount);}
        segment(leg.upper,hip,knee);segment(leg.lower,knee,end);leg.knee.position.copy(knee);leg.foot.position.copy(end);
        leg.foot.rotation.set(left?-Math.PI/2+motion.turn:0,0,left?0:Math.PI/2);
        leg.toes.forEach((toe,i)=>{toe.position.x=(i-(leg.toes.length-1)/2)*(.24/leg.toes.length)*(left?1-.65*grip:1);toe.position.z=.14+(left?.03*grip:0);});
      }
      for(let i=0;i<2;i++){
        root.updateWorldMatrix(true,true);const swing=phase+(i?Math.PI:0),moving=speed>.06;
        arms[i].position.set((i?1:-1)*.49,.52+.98*Math.cos(.345),.98*Math.sin(.345)+.015);
        const target=root.localToWorld(new THREE.Vector3(i?.18:-.22,.145+(moving?.1*Math.max(0,Math.sin(swing)):0),.36+(moving?.25*Math.cos(swing):0)));
        solveNaiwaLimb(arms[i],forearms[i],hands[i],target,root.localToWorld(new THREE.Vector3((i?1:-1)*.3,.5,.5)));
        orientNaiwaSupportArm(arms[i],forearms[i],hands[i],root);
      }
      return;
    }
    if(down&&slipElapsed!==null){
      const {fall,kick}=slipPose(slipElapsed);
      rig.rotation.set(-.35*fall,0,-.95*fall);rig.position.set(.2*fall,-.4*fall,0);
      legs.forEach((leg,i)=>{leg.rotation.x=.16*fall-(i?.47:.85)*kick;});
      arms.forEach(arm=>{arm.rotation.x=-.5*fall-.42*kick;});
    }
    const bedPose=variant==='bed'?bedPullPose(actionTime):null,handTime=bedPose?.actionTime??actionTime;
    const nerd=intelligent&&['patrol','chase','search'].includes(state)&&reachAmount<.01&&bodyLean<.01&&kickAmount<.01;
    nerdAmount=nerd?THREE.MathUtils.damp(nerdAmount,1,12,dt):0;root.userData.nerdStanceAmount=nerdAmount;
    if(nerdAmount>0){
      const depth=nerdAmount*(1-.35*THREE.MathUtils.smoothstep(speed,.05,2.6));rig.position.y-=.1*depth;
      rig.rotation.y-=.5*nerdAmount;
      const counter=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.5*nerdAmount);
      legs.forEach((leg,i)=>{leg.position.set((i?1:-1)*(.285+.1*depth),.64+.1*depth,.025+(i?.28:-.22)*nerdAmount).applyQuaternion(counter);leg.rotation.x*=1-.65*nerdAmount;leg.rotation.y=(.5-(i?0:1.1))*nerdAmount;});
      arms[1].quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(.1,-.35,1.25)),nerdAmount);forearms[1].rotation.z=1.6*nerdAmount;
      arms[0].quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.05,.9,-.12,'YXZ')),nerdAmount);forearms[0].rotation.set(-.8*nerdAmount,0,-.12*nerdAmount);
    }
    rightFist.visible=nerd&&nerdAmount>.1||state==='slam'||state==='pull'&&handTime>.42&&handTime<1.06;
    if(state==='slam'||state==='pull') {
      const slam=state==='slam',reach=THREE.MathUtils.smoothstep(handTime,0,slam?.42:.30),recover=1-THREE.MathUtils.smoothstep(handTime,slam?.88:.85,slam?1.28:1.2);
      const strike=THREE.MathUtils.smoothstep(handTime,slam?.48:.46,slam?.72:.84);
      arms[0].rotation.x=-(slam?2.8-1.05*strike:1.8-.45*strike)*reach*recover;
      arms[1].rotation.x=.25*reach*recover;rig.rotation.x=(slam?-.08+.24*strike:.1-.15*strike)*reach*recover;
      rig.rotation.y=.12*reach*recover;rig.position.y-=.025*reach*recover;
      if(bedPose){rig.rotation.x+=.22*bedPose.lean;legs.forEach(leg=>{leg.rotation.x-=.18*bedPose.lean;});}
    }
    if(state==='block') {
      const amount=blockPoseAmount(actionTime);
      rig.position.set(-.012*amount,-.022*amount,-.014*amount);rig.rotation.set(-.07*amount,-.08*amount,.018*amount);
      arms[0].rotation.set(-.16*amount,0,-.07*amount);
      blockLeftArm(amount);legs.forEach(leg=>{leg.rotation.x=.035*amount;});
    }
    else if(guardAmount>0&&state!=='down'&&state!=='caught')blockLeftArm(guardAmount);
    eyes.forEach((eye,i)=>{eye.scale.y=(hurt?.68:1)*THREE.MathUtils.lerp(1,i===0?NAIWA_DEFENSE.rightEyeOpen:NAIWA_DEFENSE.leftEyeOpen,lightAmount);});
    if(['bed-search','bed-reach','bed-rise'].includes(state)) {
      const lowering=state==='bed-search'?actionTime:state==='bed-reach'?1.05:1.05-actionTime;
      const amount=THREE.MathUtils.smoothstep(lowering,0,1.05);
      rig.rotation.set(1.39*amount,0,0);rig.position.set(0,.49*amount,-.14*amount);
      face.rotation.x=-.84*amount;
      arms.forEach((arm,i)=>{arm.rotation.set(-1.3*amount,0,(i?1:-1)*.25*amount);forearms[i].rotation.x=-.8*amount;hands[i].rotation.set(.3*amount,0,0);});
      legs.forEach(leg=>{leg.rotation.x=-.65*amount;});
      if(state==='bed-reach')arms[0].rotation.x-=.65*THREE.MathUtils.smoothstep(actionTime,0,.62);
    }
    if(bodyLean>0){rig.rotation.x+=bodyLean*.5;rig.position.z+=bodyLean*.15;}
    if(kickAmount>0){legs[0].rotation.x-=kickAmount;rig.rotation.x-=.12*kickAmount;}
    if(reachTargets&&reachAmount>0)for(const [i,side]of ['L','R'].entries())if(reachTargets[side]) {
      root.updateWorldMatrix(true,true);const pole=root.localToWorld(new THREE.Vector3(i===0?-.75:.75,1.1,.55));
      solveNaiwaLimb(arms[i],forearms[i],hands[i],new THREE.Vector3().copy(reachTargets[side]),pole,reachAmount);
    }
    hands.forEach((hand,i)=>constrainNaiwaWrist(hand.quaternion,wristAxes[i]));
  }
  return {root,animate};
}
