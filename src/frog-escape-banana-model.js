import * as THREE from 'three';

// Small, texture-free meshes: tapered fruit with five soft ribs, and a closed,
// thick peel with a fibrous inner surface. All detail works at every quality.
const yellow=new THREE.Color(0xe8c24b),gold=new THREE.Color(0xb89132),green=new THREE.Color(0x879541),brown=new THREE.Color(0x67502c),cream=new THREE.Color(0xefe1b4);
const noise=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};

export function createBananaModel(peeled=false){
  const group=new THREE.Group();group.name=peeled?'banana:peeled-skin':'banana:whole-fruit';
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:peeled?.88:.64});
  function surface(name,positions,colors,indices){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  function coloredTube(name,curve,radius,startColor,endColor,segments=12,sides=8){
    const geometry=new THREE.TubeGeometry(curve,segments,radius,sides,false),positions=geometry.attributes.position,colors=[];
    for(let i=0;i<positions.count;i++){
      const t=Math.floor(i/(sides+1))/segments,shade=.86+.14*Math.cos((i%(sides+1))/sides*Math.PI*2);
      new THREE.Color().copy(startColor).lerp(endColor,t).multiplyScalar(shade).toArray(colors,i*3);
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  if(!peeled){
    const rings=28,sides=20,positions=[],colors=[],indices=[];
    const curve=new THREE.CatmullRomCurve3([[-.052,.012,-.158],[.016,.022,-.088],[.038,.024,.014],[.001,.018,.104],[-.05,.012,.157]].map(v=>new THREE.Vector3(...v)));
    for(let i=0;i<=rings;i++){
      const t=i/rings,center=curve.getPoint(t),tangent=curve.getTangent(t),axis=new THREE.Vector3(0,1,0).cross(tangent).normalize(),up=tangent.clone().cross(axis).normalize();
      const radius=.035*(.18+.82*Math.sin(Math.PI*t)**.42);
      for(let j=0;j<=sides;j++){
        const angle=j/sides*Math.PI*2,rib=Math.cos(angle*5),r=radius*(1+.055*rib);
        const point=center.clone().addScaledVector(axis,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r*.94);
        positions.push(...point.toArray());
        const color=yellow.clone().lerp(gold,(1-rib)*.1).lerp(green,Math.max(0,1-t/.17)*.56);
        if(noise(i,j%sides)>.955&&t>.16&&t<.9)color.lerp(brown,.65);
        color.multiplyScalar(.96+.04*Math.sin(t*19+angle*3));colors.push(...color.toArray());
        if(i<rings&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
      }
    }
    // Close the small ends rather than leaving the fruit as an open pipe.
    for(const [ring,reverse]of [[0,true],[rings,false]])for(let j=1;j<sides-1;j++){
      const a=ring*(sides+1);indices.push(a,a+(reverse?j+1:j),a+(reverse?j:j+1));
    }
    surface('banana:tapered-five-rib-skin',positions,colors,indices);
    coloredTube('banana:stem',new THREE.CatmullRomCurve3([curve.getPoint(0),new THREE.Vector3(-.067,.014,-.174),new THREE.Vector3(-.072,.021,-.193)]),.0085,green,brown);
    coloredTube('banana:blossom-tip',new THREE.LineCurve3(curve.getPoint(1),new THREE.Vector3(-.061,.013,.17)),.0055,gold,brown,4,7);
  }else{
    const positions=[],colors=[],indices=[],rows=16,columns=6;
    const flaps=[{angle:.16,length:.172,width:.034,curl:.025},{angle:2.22,length:.153,width:.039,curl:.015},{angle:4.24,length:.193,width:.031,curl:.031}];
    function point(flap,t,u,inner){
      const turn=flap.angle+.16*Math.sin(t*Math.PI),curl=THREE.MathUtils.smoothstep(t,.72,1);
      const radius=.006+t*flap.length-.022*curl,width=flap.width*(Math.sin(Math.PI*t)**.72*.92+.08)*(1+.12*u);
      const y=.005+.03*Math.exp(-t*8)+flap.curl*curl+.008*u*u*Math.sin(Math.PI*t)+.002*u*Math.sin(t*8+flap.angle);
      return [Math.cos(turn)*radius-Math.sin(turn)*width*u,y+(inner?.0015:-.0015),Math.sin(turn)*radius+Math.cos(turn)*width*u];
    }
    for(const flap of flaps){
      const start=positions.length/3,layer=(rows+1)*(columns+1);
      for(const inner of [true,false])for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
        const t=i/rows,u=j/columns*2-1;positions.push(...point(flap,t,u,inner));
        const edge=Math.abs(u)**4,color=(inner?cream:yellow).clone().lerp(inner?gold:brown,edge*(inner?.15:.26));
        color.lerp(brown,THREE.MathUtils.smoothstep(t,.86,1)*.52).multiplyScalar(.94+.06*Math.cos(u*17+t*5));colors.push(...color.toArray());
        if(i<rows&&j<columns){const a=start+(inner?0:layer)+i*(columns+1)+j,b=a+columns+1;
          if(inner)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
        }
      }
      // Connect both surfaces along the torn edges: no coplanar double sheets.
      for(let i=0;i<rows;i++)for(const j of [0,columns]){
        const a=start+i*(columns+1)+j,b=a+columns+1;
        if(j===0)indices.push(a,b,a+layer,b,b+layer,a+layer);else indices.push(a,a+layer,b,b,a+layer,b+layer);
      }
      for(const i of [0,rows])for(let j=0;j<columns;j++){
        const a=start+i*(columns+1)+j;
        if(i===0)indices.push(a,a+layer,a+1,a+1,a+layer,a+layer+1);else indices.push(a,a+1,a+layer,a+1,a+layer+1,a+layer);
      }
      // Narrow raised fibres follow the curled inner skin, not straight lines.
      for(const u of [-.45,.12,.55]){
        const fiberStart=positions.length/3;
        for(let i=1;i<rows;i++)for(const side of [-1,1]){
          const p=point(flap,i/rows,u+side*.012,true);p[1]+=.0005;positions.push(...p);colors.push(...cream.clone().multiplyScalar(1.04).toArray());
          if(i<rows-1&&side===1){const a=fiberStart+(i-1)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
        }
      }
    }
    surface('banana:thick-curled-fibrous-peel',positions,colors,indices);
    coloredTube('banana:dry-blossom',new THREE.CatmullRomCurve3([new THREE.Vector3(0,.024,0),new THREE.Vector3(-.003,.038,0),new THREE.Vector3(-.008,.043,.002)]),.007,gold,brown,6,8);
  }
  return group;
}
