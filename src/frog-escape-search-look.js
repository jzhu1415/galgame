// Brief eye/head turns, pauses to inspect, and occasional shoulder checks.
// All offsets are relative to the direction in which the search stopped.
const frames=[
  [0,0,0,-.015],[.55,0,0,-.015],
  [.82,-.15,-.65,.02],[1.65,-.15,-.65,.02],
  [1.9,-.15,0,0],[2.3,-.15,0,0],
  [2.63,.25,.67,-.03],[3.72,.25,.67,-.03],
  [4,.25,.1,0],[4.4,.25,.1,0],
  [4.78,1.45,.65,.025],[5.65,1.45,.65,.025],
  [5.98,.1,0,0],[6.35,.1,0,0],
  [6.7,-1.45,-.65,-.025],[7.45,-1.45,-.65,-.025],
  [7.85,0,0,-.015],[8.5,0,0,-.015],
];
export function searchLookPose(elapsed) {
  const time=Math.max(0,elapsed)%8.5,index=Math.max(1,frames.findIndex(frame=>frame[0]>=time));
  const a=frames[index-1],b=frames[index],u=(time-a[0])/(b[0]-a[0]),blend=u*u*(3-2*u);
  return {body:a[1]+(b[1]-a[1])*blend,head:a[2]+(b[2]-a[2])*blend,pitch:a[3]+(b[3]-a[3])*blend};
}
