import * as THREE from 'three';

// A sharply folded limb loses volume when opposite joint matrices are blended
// directly. Three intermediate pivots preserve the existing closed leg surface.
// Outside hand-walking their matrices are the exact old linear average, so the
// weight split reproduces all approved poses rather than changing their skin.
export function createNaiwaRightLegSupport(rig){
  const skin=rig.getObjectByProperty('isSkinnedMesh',true),original=skin.skeleton;
  const bones=[...original.bones],inverses=original.boneInverses.map(matrix=>matrix.clone()),entries=[],stretches=[];
  const joints=skin.geometry.attributes.skinIndex,weights=skin.geometry.attributes.skinWeight;
  // IK lengthens joint offsets. A skin-only proxy must stretch each segment to
  // the same length; moving the joint alone left its surface short and pinched.
  for(const [name,next]of [['Thigh_L','Shin_L'],['Shin_L','Foot_L']]){
    const sourceIndex=bones.findIndex(bone=>bone.name===name),bone=bones[sourceIndex],child=bones.find(bone=>bone.name===next),index=bones.length;
    const helper=new THREE.Bone();helper.name=`Skin${name}`;helper.matrixAutoUpdate=false;helper.matrixWorldAutoUpdate=false;rig.add(helper);
    stretches.push({helper,bone,child,length:child.position.length()});bones.push(helper);inverses.push(inverses[sourceIndex].clone());
    for(let i=0;i<joints.array.length;i++)if(joints.array[i]===sourceIndex)joints.array[i]=index;
  }
  for(const [name,parentName,childName]of [['HipFold_L','Hips','SkinThigh_L'],['KneeFold_L','SkinThigh_L','SkinShin_L'],['AnkleFold_L','SkinShin_L','Foot_L']]){
    const parentIndex=bones.findIndex(bone=>bone.name===parentName),childIndex=bones.findIndex(bone=>bone.name===childName),index=bones.length;
    const helper=new THREE.Bone();helper.name=name;helper.matrixAutoUpdate=false;helper.matrixWorldAutoUpdate=false;rig.add(helper);
    const bind=inverses[childIndex].clone().invert(),centre=new THREE.Vector3().setFromMatrixPosition(bind);
    entries.push({helper,parent:bones[parentIndex],child:bones[childIndex],parentInverse:inverses[parentIndex],childInverse:inverses[childIndex],bind,centre});
    bones.push(helper);inverses.push(inverses[childIndex].clone());
    for(let i=0;i<weights.count;i++){
      let a=0,b=0;const remaining=[];
      for(let c=0;c<4;c++){const joint=joints.array[i*4+c],weight=weights.array[i*4+c];if(joint===parentIndex)a+=weight;else if(joint===childIndex)b+=weight;else if(weight>0)remaining.push([joint,weight]);}
      if(!a||!b)continue;
      const total=a+b,phase=2*b/total;
      if(phase<1)remaining.push([parentIndex,total*(1-phase)]);else if(phase>1)remaining.push([childIndex,total*(phase-1)]);
      remaining.push([index,total*(1-Math.abs(phase-1))]);
      for(let c=0;c<4;c++){joints.array[i*4+c]=remaining[c]?.[0]??0;weights.array[i*4+c]=remaining[c]?.[1]??0;}
    }
  }
  joints.needsUpdate=true;weights.needsUpdate=true;
  skin.skeleton=new THREE.Skeleton(bones,inverses);original.dispose();
  const inverseRig=new THREE.Matrix4(),a=new THREE.Matrix4(),b=new THREE.Matrix4(),rigid=new THREE.Matrix4(),blend=new THREE.Matrix4(),stretch=new THREE.Matrix4();
  const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),centreA=new THREE.Vector3(),centreB=new THREE.Vector3(),offset=new THREE.Vector3(),scaleA=new THREE.Vector3(),scaleB=new THREE.Vector3(),zero=new THREE.Vector3();
  function update(amount){
    rig.updateWorldMatrix(true,true);inverseRig.copy(rig.matrixWorld).invert();amount=THREE.MathUtils.clamp(amount,0,1);
    for(const entry of stretches){
      stretch.makeScale(1,amount>0?entry.child.position.length()/entry.length:1,1);
      entry.helper.matrixWorld.multiplyMatrices(entry.bone.matrixWorld,stretch);entry.helper.matrixWorldNeedsUpdate=false;
    }
    for(const entry of entries){
      a.multiplyMatrices(inverseRig,entry.parent.matrixWorld).multiply(entry.parentInverse);
      b.multiplyMatrices(inverseRig,entry.child.matrixWorld).multiply(entry.childInverse);
      a.decompose(offset,qa,scaleA);b.decompose(offset,qb,scaleB);qa.slerp(qb,.5).normalize();scaleA.add(scaleB).multiplyScalar(.5);
      centreA.copy(entry.centre).applyMatrix4(a);centreB.copy(entry.centre).applyMatrix4(b);centreA.add(centreB).multiplyScalar(.5);
      rigid.compose(zero,qa,scaleA);offset.copy(entry.centre).applyMatrix4(rigid);rigid.setPosition(centreA.sub(offset));
      for(let i=0;i<16;i++)blend.elements[i]=THREE.MathUtils.lerp((a.elements[i]+b.elements[i])*.5,rigid.elements[i],amount);
      entry.helper.matrixWorld.multiplyMatrices(rig.matrixWorld,blend).multiply(entry.bind);entry.helper.matrixWorldNeedsUpdate=false;
    }
  }
  update(0);return {update,reset:()=>update(0)};
}
