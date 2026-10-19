import * as THREE from 'three';

// Procedural surface patterns stay local to the 3D scene; no external image downloads.
export function finishCastleMaterials(materials) {
  if(typeof document==='undefined'||typeof document.createElement!=='function')return;
  const cache=new Map();
  function pattern(kind) {
    if(cache.has(kind))return cache.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'),size=256;
    const noise=(x,y)=>{const n=Math.sin(x*17.13+y*83.71)*43758.5453;return n-Math.floor(n);};
    if(kind==='wood') {
      ctx.fillStyle='#332c25';ctx.fillRect(0,0,size,size);
      for(let plank=0;plank<8;plank++) {
        const x=plank*32,tone=55+noise(plank,1)*24;
        ctx.fillStyle=`rgb(${tone+30},${tone+8},${tone-10})`;ctx.fillRect(x+1,0,30,size);
        for(let line=0;line<13;line++) {
          ctx.strokeStyle=`rgba(30,20,12,${.08+noise(plank,line)*.16})`;ctx.beginPath();
          for(let y=0;y<=size;y+=8){const px=x+2+line*2.1+Math.sin(y*.045+line)*1.5;if(y===0)ctx.moveTo(px,y);else ctx.lineTo(px,y);}ctx.stroke();
        }
        ctx.fillStyle='#372a20';ctx.fillRect(x+1,(plank%3)*75+20,30,1.5);
      }
    } else if(kind==='plaster') {
      ctx.fillStyle='#b3aa96';ctx.fillRect(0,0,size,size);
      for(let i=0;i<850;i++){ctx.fillStyle=`rgba(61,57,45,${noise(i,3)*.06})`;ctx.fillRect(noise(i,4)*size,noise(i,5)*size,2+noise(i,6)*9,2+noise(i,7)*7);}
      for(let i=0;i<9;i++){ctx.strokeStyle='#544c3b28';ctx.beginPath();const x=noise(i,1)*256,y=noise(i,9)*256;ctx.moveTo(x,y);ctx.lineTo(x+5,y+15);ctx.lineTo(x+2,y+31);ctx.stroke();}
    } else {
      ctx.fillStyle=kind==='tile'?'#4d4b46':'#373832';ctx.fillRect(0,0,size,size);
      const width=kind==='tile'?64:kind==='slate'?32:64,height=kind==='tile'?64:32;
      for(let row=0;row<size/height;row++)for(let col=-1;col<=size/width;col++) {
        const x=col*width+(kind==='tile'?0:row%2*width/2),y=row*height;
        const shade=noise(col+9,row)*20;
        ctx.fillStyle=kind==='tile'?((row+col)%2?'#a29984':'#696c67'):kind==='slate'?`rgb(${51+shade},${54+shade},${61+shade})`:`rgb(${104+shade},${103+shade},${95+shade})`;
        ctx.fillRect(x+1.2,y+1.2,width-2.4,height-2.4);
        ctx.strokeStyle='#ffffff0c';ctx.strokeRect(x+2.2,y+2.2,width-4.4,height-4.4);
      }
    }
    for(let i=0;i<1800;i++){ctx.fillStyle=i%2?'#0000000a':'#ffffff09';ctx.fillRect(noise(i,20)*size,noise(i,21)*size,1,1);}
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
    const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=size;
    const bumpCtx=bumpCanvas.getContext('2d'),pixels=ctx.getImageData(0,0,size,size);
    for(let i=0;i<pixels.data.length;i+=4){const gray=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=gray;}
    bumpCtx.putImageData(pixels,0,0);
    const bump=new THREE.CanvasTexture(bumpCanvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;
    const result={map,bump};cache.set(kind,result);return result;
  }
  for(const [key,kind,color,strength] of [
    ['wall','stone',0xc6c0b1,.035],['wallSide','stone',0xa39d91,.035],['stone','stone',0xbcb8ae,.028],['basement','stone',0x95978f,.04],
    ['floor','wood',0xe2cda9,.012],['wood','wood',0xc6af8d,.018],['darkWood','wood',0x91816c,.014],['roof','slate',0xb1b6bf,.025],
    ['plaster','plaster',0xd0c5af,.018],['tile','tile',0xbebba9,.02],
  ]) {
    const material=materials[key];if(!material)continue;
    const maps=pattern(kind);material.map=maps.map;material.bumpMap=maps.bump;material.bumpScale=strength;material.color.setHex(color);material.userData.castleSurface=kind;
  }
}

export function castleSurfaceUV(geometry,scaleX=1) {
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
  const uv=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i)*scaleX,y=positions.getY(i),z=positions.getZ(i);
    if(Math.abs(normals.getY(i))>.5){uv[i*2]=x*.5;uv[i*2+1]=z*.5;}
    else if(Math.abs(normals.getX(i))>.5){uv[i*2]=z*.5;uv[i*2+1]=y*.5;}
    else {uv[i*2]=x*.5;uv[i*2+1]=y*.5;}
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}
