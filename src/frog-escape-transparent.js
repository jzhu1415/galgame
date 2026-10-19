import {createNavigation} from './frog-escape-navigation.js';

export const TRANSPARENT=Object.freeze({alertness:100,speed:6.2,smellRange:5});
export const isTransparent=value=>value>=TRANSPARENT.alertness;

// Only this actor gets the filtered navigation. Player collision and the
// original glass/fence geometry remain intact, including locked windows.
export function createTransparentNavigation(original,enabled) {
  let phase=null,solidCount=-1;
  function world() {
    if(!enabled())return original;
    if(!phase||solidCount!==original.solids.length) {
      solidCount=original.solids.length;
      phase={...original,...createNavigation({solids:original.solids.filter(s=>!s.transparentPassable),circles:original.circles,doors:original.doors,chairs:original.chairs,stairs:original.stairs,boundary:[[-30,-30],[30,-30],[30,30],[-30,30]]})};
    }
    return phase;
  }
  const view={};
  for(const key of Object.keys(original))Object.defineProperty(view,key,{enumerable:true,get:()=>world()[key]});
  return view;
}

export function resolveWindowPassages(navigation,passages,ignore=[],standingHeight=2.1) {
  const result=[];
  for(const raw of passages) {
    let chosen=null;
    for(const depth of [1.7,2.5,3.5]) {
      for(const {offset,delta}of [0,-.07].flatMap(delta=>[0,.42,-.42].map(offset=>({offset,delta})))) {
        if(Math.abs(offset)+.2>raw.width/2-.01)continue;
        const p={...raw,lift:raw.lift+delta,from:{...raw.from,x:raw.center.x+offset,z:raw.center.z-raw.sign*depth},to:{...raw.to,x:raw.center.x+offset}};
        if(navigation.blocked(p.from.x,p.from.y,p.from.z,false,standingHeight,.44,ignore)||navigation.blocked(p.to.x,p.to.y,p.to.z,false,standingHeight,.44,ignore))continue;
        const points=[p.from,{...p.from,y:p.lift},{...p.to,y:p.lift},p.to];let clear=true;
        for(let k=0;k<3&&clear;k++)for(let i=0;i<=60;i++) {
          const a=points[k],b=points[k+1],t=i/60,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
          if(navigation.blocked(x,y,z,false,.9,.2,ignore)){clear=false;break;}
        }
        if(clear){chosen=p;break;}
      }
      if(chosen)break;
    }
    if(chosen)result.push(chosen);
  }
  return result;
}

// Off-mesh edges are explicit window apertures, never arbitrary wall shortcuts.
// Lift to the sill, dive through in a compact pose, then fall to the landing.
export function createWindowTraversal({actor,navigation,onEvent=()=>{}}) {
  let current=null,clock=0;
  const banned=new Map();
  function cancel() {
    if(current) {
      if(navigation.blocked(actor.x,actor.y,actor.z,false,actor.standingHeight??2.1,.4,[actor.collider])) {
        const safe=current.elapsed<current.liftTime+current.crossTime/2?current.from:current.to;Object.assign(actor,safe);
      }
      actor.bodyHeight=actor.standingHeight??2.1;actor.grounded=false;actor.velocityY=0;
    }
    current=null;
  }
  function positionAt(c,elapsed) {
    if(elapsed<c.liftTime){const t=elapsed/c.liftTime;return {...c.from,y:c.from.y+(c.height-c.from.y)*(1-(1-t)**2)};}
    if(elapsed<c.liftTime+c.crossTime){const t=(elapsed-c.liftTime)/c.crossTime;return {x:c.from.x+(c.to.x-c.from.x)*t,y:c.height,z:c.from.z+(c.to.z-c.from.z)*t};}
    const t=Math.min(1,(elapsed-c.liftTime-c.crossTime)/c.fallTime);return {...c.to,y:c.height+(c.to.y-c.height)*t*t};
  }
  return {
    get active(){return !!current;},get lean(){return current?Math.min(1,current.elapsed/.18,(current.liftTime+current.crossTime+current.fallTime-current.elapsed)/.2)*1.2:0;},
    allowed(passage){return (banned.get(passage.id)??0)<=clock;},
    begin(edge) {
      const {passage,from,to}=edge,height=passage.lift;
      const c={passage,from:{x:actor.x,y:actor.y,z:actor.z},to:{x:to.x,y:to.y,z:to.z},height,elapsed:0,liftTime:.2,crossTime:Math.hypot(to.x-actor.x,to.z-actor.z)/TRANSPARENT.speed,fallTime:Math.max(.18,Math.sqrt(Math.max(0,2*(height-to.y)/19.5)))};
      // Both landings and the full compact path must avoid ordinary walls,
      // slabs, furniture and pillars. Permeable panes and fences were filtered.
      const duration=c.liftTime+c.crossTime+c.fallTime;
      for(let t=0;t<=duration+.001;t+=.025) {
        const p=positionAt(c,Math.min(t,duration));
        if(navigation.blocked(p.x,p.y,p.z,false,.9,.2,[actor.collider])){banned.set(passage.id,clock+5);return false;}
      }
      if(navigation.blocked(to.x,to.y,to.z,false,actor.standingHeight??2.1,.4,[actor.collider])){banned.set(passage.id,clock+5);return false;}
      current=c;actor.bodyHeight=.9;actor.grounded=false;actor.velocityY=0;actor.yaw=Math.atan2(actor.x-to.x,actor.z-to.z);
      onEvent({stage:'start',passage});return true;
    },
    tick(dt) {
      clock+=dt;if(!current)return false;
      const c=current;c.elapsed+=dt;Object.assign(actor,positionAt(c,c.elapsed));actor.bodyHeight=.9;actor.grounded=false;actor.velocityY=0;
      if(c.elapsed>=c.liftTime+c.crossTime+c.fallTime){Object.assign(actor,c.to);actor.bodyHeight=actor.standingHeight??2.1;actor.grounded=true;current=null;onEvent({stage:'end',passage:c.passage});}
      return true;
    },cancel,
    reset(){cancel();banned.clear();clock=0;},
  };
}
