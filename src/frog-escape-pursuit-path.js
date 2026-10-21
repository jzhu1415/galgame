import {pointInPolygon,segmentDistance,stairHeight,houseWidthScale} from './frog-escape-navigation.js';

const GRID=.65,CELL=2;
class Heap {
  values=[];
  push(value){const a=this.values;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(a[p].score<=value.score)break;a[i]=a[p];i=p;}a[i]=value;}
  pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let n=i*2+1;if(n+1<a.length&&a[n+1].score<a[n].score)n++;if(a[n].score>=last.score)break;a[i]=a[n];i=n;}a[i]=last;}return first;}
  get size(){return this.values.length;}
}

export function createPursuitPathfinder(navigation,{radius=.4,height=2.1,passages=()=>[]}={}) {
  const layers=[{id:0,y:-5.05,x:11.3,minZ:-7,maxZ:7},{id:1,y:.15,x:11.3,minZ:-7,maxZ:8.7},{id:2,y:5.15,x:9.6,minZ:-7,maxZ:8.8},{id:3,y:-.83,x:30,minZ:-30,maxZ:30}];
  const doorLeaves=new Set(navigation.doors.flatMap(door=>door.parts.map(part=>part.collider)));
  const terrain=navigation.solids.filter(solid=>solid.walkableTerrain);
  let ignoredChairs=[];
  let buckets=new Map(),cache=new Map(),edges=new Map(),links=new Map(),revision=0,avoid=[],portalNodes=[],portalEdges=new Map();
  const geometryState=[];let stateIndex=0,stateChanged=false;
  function remember(value){if(geometryState[stateIndex]!==value)stateChanged=true;geometryState[stateIndex++]=value;}
  function rememberBox(solid) {
    remember(solid);remember(solid.x);remember(solid.z);remember(solid.minY);remember(solid.maxY);
    remember(solid.halfX);remember(solid.halfZ);remember(solid.axisX[0]);remember(solid.axisX[1]);remember(solid.axisZ[0]);remember(solid.axisZ[1]);remember(!solid.enabled||solid.enabled());
    remember(solid.centerY);remember(solid.halfSize?.[0]);remember(solid.halfSize?.[1]);remember(solid.halfSize?.[2]);remember(solid.quaternion?.x);remember(solid.quaternion?.y);remember(solid.quaternion?.z);remember(solid.quaternion?.w);
  }
  // Keep the expensive grid/edge graph while its collision geometry is unchanged.
  // Check actual values rather than an external revision: fixtures, fractured
  // chairs and the phase-specific navigation can change independently.
  function geometryChanged(windowPassages) {
    stateIndex=0;stateChanged=revision===0;remember(navigation.overlapsBox);remember(navigation.support);
    for(const solid of navigation.solids)if(!doorLeaves.has(solid)&&(!solid.movableChair||solid.movableChair.fragment))rememberBox(solid);
    remember(null);
    for(const solid of avoid)rememberBox(solid);
    remember(null);
    for(const circle of navigation.circles)if(!circle.npc){remember(circle);remember(circle.x);remember(circle.z);remember(circle.minY);remember(circle.maxY);remember(circle.radius);remember(!circle.enabled||circle.enabled());}
    remember(null);
    for(const surface of navigation.surfaces){remember(surface);remember(surface.minX);remember(surface.maxX);remember(surface.minZ);remember(surface.maxZ);remember(surface.height);}
    remember(null);
    for(const slab of navigation.slabs){remember(slab);remember(slab.minX);remember(slab.maxX);remember(slab.minZ);remember(slab.maxZ);remember(slab.height);remember(slab.underside);}
    remember(null);
    for(const stair of navigation.stairs){remember(stair);remember(stair.minX);remember(stair.maxX);remember(stair.minZ);remember(stair.maxZ);remember(stair.startZ);remember(stair.endZ);remember(stair.bottom);remember(stair.top);remember(stair.steps);}
    remember(null);
    for(const point of navigation.boundary){remember(point[0]);remember(point[1]);}
    remember(null);
    for(const passage of windowPassages){remember(passage.id);remember(passage.bidirectional);remember(passage.lift);for(const point of [passage.from,passage.to]){remember(point.x);remember(point.y);remember(point.z);}}
    if(stateIndex!==geometryState.length)stateChanged=true;geometryState.length=stateIndex;return stateChanged;
  }
  const stairNodes=[];
  navigation.stairs.forEach((stair,s)=>{
    const nodes=[];
    for(let i=0;i<=stair.steps+1;i++) {
      const direction=Math.sign(stair.endZ-stair.startZ),landing=radius+.15;
      const z=i===0?stair.startZ-direction*landing:i===stair.steps+1?stair.endZ+direction*landing:
        stair.startZ+(stair.endZ-stair.startZ)*(i-.5)/stair.steps;
      const node={key:`s/${s}/${i}`,x:(stair.minX+stair.maxX)/2,y:stairHeight(stair,z),z,stair:true,index:i,chain:nodes};nodes.push(node);stairNodes.push(node);
    }
  });
  function refresh(windowPassages) {
    buckets=new Map();cache=new Map();edges=new Map();links=new Map();portalNodes=[];portalEdges=new Map();revision++;
    for(const solid of navigation.solids) {
      if(doorLeaves.has(solid)||solid.movableChair&&!solid.movableChair.fragment||(solid.enabled&&!solid.enabled()))continue;
      const hx=Math.abs(solid.axisX[0])*solid.halfX+Math.abs(solid.axisZ[0])*solid.halfZ+radius;
      const hz=Math.abs(solid.axisX[1])*solid.halfX+Math.abs(solid.axisZ[1])*solid.halfZ+radius;
      for(let x=Math.floor((solid.x-hx)/CELL);x<=Math.floor((solid.x+hx)/CELL);x++)for(let z=Math.floor((solid.z-hz)/CELL);z<=Math.floor((solid.z+hz)/CELL);z++) {
        const key=`${x}/${z}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(solid);
      }
    }
    for(const node of stairNodes.filter(node=>node.index===0||node.index===node.chain.length-1)) {
      for(const layer of layers)if(Math.abs(node.y-layer.y)<.25) {
        const ix=Math.round(node.x/GRID),iz=Math.round(node.z/GRID);
        for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++) {
          const flat=gridNode(layer.id,ix+dx,iz+dz);if(!flat||Math.hypot(flat.x-node.x,flat.z-node.z)>1.02||!reachableStart(node,flat)||!reachableStart(flat,node))continue;
          if(!links.has(flat.key))links.set(flat.key,[]);links.get(flat.key).push(node);
          if(!links.has(node.key))links.set(node.key,[]);links.get(node.key).push(flat);
        }
      }
    }
    for(const passage of windowPassages) {
      const ends=[passage.from,passage.to].map((point,index)=>({...point,key:`p/${passage.id}/${index}`,portal:true}));
      let valid=true;
      for(const node of ends) {
        if(!freeAt(node.x,node.y,node.z)){valid=false;break;}
        const nearby=[];
        for(const layer of layers)if(Math.abs(layer.y-node.y)<.25) {
          const ix=Math.round(node.x/GRID),iz=Math.round(node.z/GRID);
          for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++) {
            const flat=gridNode(layer.id,ix+dx,iz+dz);
            if(flat&&Math.hypot(flat.x-node.x,flat.z-node.z)<1.25&&reachableStart(node,flat)&&reachableStart(flat,node))nearby.push(flat);
          }
        }
        if(!nearby.length){valid=false;break;}
        node.nearby=nearby;
      }
      if(!valid)continue;
      for(const node of ends) {
        portalNodes.push(node);links.set(node.key,[...node.nearby]);
        for(const flat of node.nearby){if(!links.has(flat.key))links.set(flat.key,[]);links.get(flat.key).push(node);}
      }
      links.get(ends[0].key).push(ends[1]);portalEdges.set(`${ends[0].key}>${ends[1].key}`,{passage,from:passage.from,to:passage.to});
      if(passage.bidirectional){links.get(ends[1].key).push(ends[0]);portalEdges.set(`${ends[1].key}>${ends[0].key}`,{passage,from:passage.to,to:passage.from});}
    }
  }
  function floorAt(x,z,layer) {
    let y=-Infinity;
    if(layer.id===3&&!(Math.abs(x)<=9*houseWidthScale&&Math.abs(z)<=7)&&pointInPolygon(x,z,navigation.boundary))y=-.83;
    for(const surface of navigation.surfaces)if(Math.abs(surface.height-layer.y)<.25&&x>=surface.minX&&x<=surface.maxX&&z>=surface.minZ&&z<=surface.maxZ)y=Math.max(y,surface.height);
    // Authored shallow basin treads are walkable terrain, unlike the pool wall
    // or furniture. Using a flat garden height here made the entrance look
    // impassable to A*, even though the physical player could walk through it.
    for(const solid of terrain)if(Math.abs(solid.maxY-layer.y)<.65){
      const dx=x-solid.x,dz=z-solid.z,ex=Math.max(Math.abs(dx*solid.axisX[0]+dz*solid.axisX[1])-solid.halfX,0),ez=Math.max(Math.abs(dx*solid.axisZ[0]+dz*solid.axisZ[1])-solid.halfZ,0);
      if(ex*ex+ez*ez<radius*radius)y=Math.max(y,solid.maxY);
    }
    return y;
  }
  function freeAt(x,y,z) {
    if(!pointInPolygon(x,z,navigation.boundary))return false;
    for(let i=0;i<navigation.boundary.length;i++)if(segmentDistance(x,z,navigation.boundary[i],navigation.boundary[(i+1)%navigation.boundary.length])<radius+.08)return false;
    if(avoid.some(solid=>navigation.overlapsBox(x,y,z,solid,radius,0,height)))return false;
    for(const solid of buckets.get(`${Math.floor(x/CELL)}/${Math.floor(z/CELL)}`)??[])if(navigation.overlapsBox(x,y,z,solid,radius,.235,height))return false;
    for(const slab of navigation.slabs) {
      if(y>=slab.height-.015||y+height<=slab.underside+.015)continue;
      const dx=Math.max(slab.minX-x,x-slab.maxX,0),dz=Math.max(slab.minZ-z,z-slab.maxZ,0);if(dx*dx+dz*dz<radius*radius)return false;
    }
    for(const c of navigation.circles)if(!c.npc&&(!c.enabled||c.enabled())&&y<c.maxY&&y+height>c.minY&&Math.hypot(x-c.x,z-c.z)<radius+c.radius)return false;
    if(stairsBlock(x,y,z))return false;
    return true;
  }
  function stairsBlock(x,y,z) {
    return navigation.stairs.some(stair=>x>=stair.minX-radius&&x<=stair.maxX+radius&&z>=stair.minZ&&z<=stair.maxZ
      &&stairHeight(stair,z)>y+.25&&y+height>stairHeight(stair,z)-.23+.015);
  }
  function gridNode(layerId,ix,iz) {
    const key=`g/${layerId}/${ix}/${iz}`;if(cache.has(key))return cache.get(key);
    const layer=layers[layerId],x=ix*GRID,z=iz*GRID;
    let node=null;
    if(Math.abs(x)<=layer.x&&z>=layer.minZ&&z<=layer.maxZ) {
      const y=floorAt(x,z,layer);if(Number.isFinite(y)&&freeAt(x,y,z))node={key,x,y,z,layer:layerId,ix,iz};
    }
    cache.set(key,node);return node;
  }
  function clearEdge(a,b) {
    const distance=Math.hypot(a.x-b.x,a.z-b.z),count=Math.ceil(distance/.18);
    for(let i=1;i<count;i++) {
      const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=floorAt(x,z,layers[a.layer]);
      if(!Number.isFinite(y)||Math.abs(y-a.y)>.25||!freeAt(x,y,z))return false;
    }
    return true;
  }
  function neighbors(node) {
    if(edges.has(node.key))return edges.get(node.key);
    const list=[...(links.get(node.key)??[])];
    if(node.portal) { /* explicit links only */ }else if(node.stair) {
      for(const i of [node.index-1,node.index+1])if(node.chain[i])list.push(node.chain[i]);
    }else for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
      if(!dx&&!dz)continue;const next=gridNode(node.layer,node.ix+dx,node.iz+dz);
      if(next&&Math.abs(next.y-node.y)<=.24&&clearEdge(node,next))list.push(next);
    }
    edges.set(node.key,list);return list;
  }
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  function reachableStart(point,node) {
    const count=Math.max(1,Math.ceil(Math.hypot(node.x-point.x,node.z-point.z)/.12));
    // A newly avoided doorway may contain the start. Permit backing out on the
    // same side, but never select a starting node across the blocked threshold.
    for(const solid of avoid)if(navigation.overlapsBox(point.x,point.y,point.z,solid,radius,0,height)) {
      const side=p=>(p.x-solid.x)*solid.axisZ[0]+(p.z-solid.z)*solid.axisZ[1];
      if(side(point)*side(node)<0)return false;
    }
    let y=point.y;
    for(let i=1;i<=count;i++) {
      const t=i/count,x=point.x+(node.x-point.x)*t,z=point.z+(node.z-point.z)*t;
      const floor=navigation.support(x,z,y,.235,radius,ignoredChairs);
      if(!Number.isFinite(floor)||Math.abs(floor-y)>.25)return false;y=floor;
      if(stairsBlock(x,y,z))return false;
      for(const solid of buckets.get(`${Math.floor(x/CELL)}/${Math.floor(z/CELL)}`)??[])if(navigation.overlapsBox(x,y,z,solid,radius,.235,height))return false;
      for(const solid of avoid)if(!navigation.overlapsBox(point.x,point.y,point.z,solid,radius,0,height)&&navigation.overlapsBox(x,y,z,solid,radius,0,height))return false;
    }
    return Math.abs(y-node.y)<.25;
  }
  function nearest(point,from=false) {
    let best=null,score=Infinity;
    for(const layer of layers)if(Math.abs(point.y-layer.y)<2) {
      const ix=Math.round(point.x/GRID),iz=Math.round(point.z/GRID);
      for(let r=0;r<=4;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++) {
        if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;
        const node=gridNode(layer.id,ix+dx,iz+dz);if(!node)continue;
        const value=distance(node,point);if(value<score&&(!from||reachableStart(point,node))){best=node;score=value;}
      }
    }
    for(const node of [...stairNodes,...portalNodes]){const value=distance(node,point);if(value<score&&(!from||reachableStart(point,node))){best=node;score=value;}}
    return best;
  }
  function findPath(from,to,{avoidSolids=[]}={}) {
    avoid=avoidSolids;ignoredChairs=(navigation.chairs??[]).flatMap(chair=>chair.colliders);
    const windowPassages=passages();if(geometryChanged(windowPassages))refresh(windowPassages);
    const start=nearest(from,true),goal=nearest(to);if(!start||!goal)return [];
    const open=new Heap(),cost=new Map([[start.key,0]]),previous=new Map(),closed=new Set();
    open.push({node:start,score:distance(start,goal)});let expanded=0;
    while(open.size&&expanded++<16000) {
      const current=open.pop().node;if(closed.has(current.key))continue;
      if(current.key===goal.key) {
        const path=[current];while(previous.has(path[0].key))path.unshift(previous.get(path[0].key));
        return path.map(({x,y,z,stair},i)=>({x,y,z,stair:!!stair,...(i&&portalEdges.has(`${path[i-1].key}>${path[i].key}`)?{traverse:portalEdges.get(`${path[i-1].key}>${path[i].key}`)}:{})}));
      }
      closed.add(current.key);
      for(const next of neighbors(current)) {
        const nextCost=cost.get(current.key)+distance(current,next);if(nextCost>=(cost.get(next.key)??Infinity))continue;
        cost.set(next.key,nextCost);previous.set(next.key,current);open.push({node:next,score:nextCost+distance(next,goal)});
      }
    }
    return [];
  }
  return {findPath,setHeight(value){if(Number.isFinite(value)&&value>0&&height!==value){height=value;revision=0;}},get revision(){return revision;}};
}
