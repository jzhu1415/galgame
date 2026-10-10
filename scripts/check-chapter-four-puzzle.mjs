import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tsModuleUrl } from './ts-module.mjs'
const { gildedPieceEdges, gildedPiecePath, gildedPieceSvg, gildedSlotAt, renderGildedJigsaw, bindGildedJigsaw, gildedPuzzleImage } = await import(tsModuleUrl('src/chapter-four-puzzle.ts'))
const { createGildedFilm, gildedFilmSrc } = await import(tsModuleUrl('src/chapter-four-film.ts'))
const ids = Array.from({length:12},(_,i)=>i)
for(const id of ids) {
  const e = gildedPieceEdges(id), row=Math.floor(id/4), col=id%4
  if(row===0) assert.equal(e.top,0)
  if(row===2) assert.equal(e.bottom,0)
  if(col===0) assert.equal(e.left,0)
  if(col===3) assert.equal(e.right,0)
  if(col<3) assert.equal(e.right,-gildedPieceEdges(id+1).left,'horizontal edges fit')
  if(row<2) assert.equal(e.bottom,-gildedPieceEdges(id+4).top,'vertical edges fit')
  const svg=gildedPieceSvg(id,'test')
  assert(svg.includes(gildedPuzzleImage) && svg.includes('width="400" height="300"'))
  assert(svg.includes(`x="${-col*100}" y="${-row*100}"`))
  assert(gildedPiecePath(id).startsWith('M 0 0 ') && gildedPiecePath(id).endsWith(' Z'))
}
const rect={left:100,top:100,width:400,height:300}
for(const id of ids) assert.equal(gildedSlotAt(rect,150+(id%4)*100,150+Math.floor(id/4)*100),id)
for(const [x,y] of [[99,100],[500,100],[100,400],[100,99]]) assert.equal(gildedSlotAt(rect,x,y),null)
assert.equal(gildedSlotAt({...rect,width:0},100,100),null)
for(const language of ['zh','en']) {
  const html=renderGildedJigsaw({order:[...ids].reverse(),placed:[1,7]},language)
  assert.equal((html.match(/data-piece=/g)??[]).length,10)
  assert.equal((html.match(/data-slot=/g)??[]).length,12)
  assert.equal((html.match(/class="gilded-fixed-piece"/g)??[]).length,2)
  assert(html.includes('aria-live="polite"') && html.includes('aria-pressed="false"'))
  assert(html.includes('width="1470" height="1070" hidden'))
}
// Drive the actual event bindings without opening a browser.
class Element extends EventTarget {
  constructor(dataset={}) { super(); this.dataset=dataset; this.style={}; this.attrs={}; this.classes=new Set(); this.classList={toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v),remove:v=>this.classes.delete(v)} }
  setAttribute(k,v){this.attrs[k]=v}
  remove(){this.removed=true}
  getBoundingClientRect(){return rect}
  fire(type,fields={}) { const e=new Event(type,{cancelable:true}); Object.assign(e,fields); this.dispatchEvent(e) }
}
const doc=new Element(), win=new Element(), root=new Element(), host=new Element()
doc.defaultView=win; doc.createElement=()=>new Element()
const ghosts=[]; root.append=g=>ghosts.push(g); host.closest=()=>root; host.ownerDocument=doc
const pieces=ids.map(id=>new Element({piece:String(id)})), slots=ids.map(id=>new Element({slot:String(id)}))
const board=new Element(), feedback=new Element(), reference=new Element(), guide=new Element(), guideImage=new Element()
guideImage.hidden=true
host.querySelector=selector=>({'.gilded-jigsaw-board':board,'[data-puzzle-feedback]':feedback,'[data-puzzle-reference]':reference,'[data-puzzle-guide]':guide,'.gilded-jigsaw-guide':guideImage}[selector])
host.querySelectorAll=selector=>selector==='[data-piece]'?pieces:selector==='[data-slot]'?slots:slots.filter(s=>s.classes.has('is-drop-target'))
const placements=[]; let views=0
const dispose=bindGildedJigsaw(host,{order:ids,placed:[]},'zh',(piece,slot)=>placements.push([piece,slot]),()=>views++)
slots[0].fire('click'); assert.equal(placements.length,0)
pieces[2].fire('click',{detail:0}); assert.equal(pieces[2].attrs['aria-pressed'],'true')
slots[0].fire('click'); assert.equal(placements.length,0); assert(feedback.textContent.includes('对不上'))
slots[2].fire('click'); assert.deepEqual(placements,[[2,2]])
pieces[1].fire('click',{detail:0}); host.fire('keydown',{key:'Escape'}); slots[1].fire('click'); assert.equal(placements.length,1)
const drag=(id,x,y)=>{pieces[id].fire('pointerdown',{button:0,pointerId:4,clientX:20,clientY:20}); doc.fire('pointermove',{pointerId:4,clientX:x,clientY:y}); doc.fire('pointerup',{pointerId:4,clientX:x,clientY:y})}
drag(5,250,250); assert.deepEqual(placements.at(-1),[5,5]); assert(ghosts.at(-1).removed)
assert.equal(slots.filter(s=>s.classes.has('is-drop-target')).length,0)
// A keyboard click immediately after a drag must not be swallowed.
pieces[3].fire('click',{detail:0}); slots[3].fire('click'); assert.deepEqual(placements.at(-1),[3,3])
const count=placements.length
drag(0,350,350); assert.equal(placements.length,count,'wrong drag does not place')
drag(0,10,10); assert.equal(placements.length,count,'outside drop does not place')
pieces[0].fire('pointerdown',{button:0,pointerId:4,clientX:20,clientY:20})
doc.fire('pointermove',{pointerId:4,clientX:150,clientY:150}); doc.fire('pointercancel'); assert(ghosts.at(-1).removed)
reference.fire('click'); assert.equal(views,1); assert.equal(placements.length,count)
guide.fire('change')
assert(guideImage.hidden); guide.checked=true; guide.fire('change'); assert(!guideImage.hidden)
dispose(); pieces[0].fire('click',{detail:0}); slots[0].fire('click'); assert.equal(placements.length,count)
assert(ghosts.every(g=>g.removed))

class Video extends Element {
  constructor(){super(); this.paused=true; this.ended=false; this.currentTime=0; this.src=gildedFilmSrc; this.plays=0; this.loads=0}
  play(){this.plays++; this.paused=false; this.fire('play'); return this.behavior?.()??Promise.resolve()}
  pause(){this.paused=true; this.fire('pause')}
  load(){this.loads++}
  removeAttribute(){this.src=''}
}
let completions=0
const video=new Video(), states=[], film=createGildedFilm(video,s=>states.push(s),()=>completions++)
let fullscreenRequests=0, fullscreenExits=0
video.ownerDocument=doc
doc.exitFullscreen=()=>{fullscreenExits++; doc.fullscreenElement=null; return Promise.resolve()}
video.requestFullscreen=()=>{fullscreenRequests++; doc.fullscreenElement=video; return Promise.resolve()}
assert.equal(video.plays,0,'constructing a video controller does not play')
assert(await film.enterFullscreen()); assert.equal(fullscreenRequests,1)
assert(await film.enterFullscreen()); assert.equal(fullscreenRequests,1,'already fullscreen does not request again')
film.syncAudio(false,.35); assert(video.muted); assert.equal(video.volume,.35)
film.syncAudio(true,2); assert(!video.muted); assert.equal(video.volume,1)
video.behavior=()=>Promise.reject({name:'NotAllowedError'})
film.play(); await Promise.resolve(); assert.equal(film.status,'blocked'); assert.equal(completions,0,'blocked autoplay cannot advance the story')
video.behavior=null; film.play(); await Promise.resolve(); assert.equal(film.status,'playing')
video.currentTime=6; film.pause(); assert.equal(film.status,'paused'); assert.equal(video.currentTime,6); assert.equal(completions,0,'pause cannot advance the story')
film.play(); assert.equal(video.currentTime,6)
video.ended=true; video.fire('ended'); assert.equal(film.status,'finished')
assert.equal(fullscreenExits,1); assert.equal(doc.fullscreenElement,null,'ending leaves video fullscreen'); assert.equal(completions,1,'natural end continues the story automatically exactly once')
video.fire('ended'); assert.equal(completions,1,'duplicate ended event cannot advance twice')
film.play(); assert.equal(video.currentTime,0,'explicit replay starts at the beginning')
video.requestFullscreen=()=>Promise.reject({name:'NotAllowedError'})
assert.equal(await film.enterFullscreen(),false); assert.equal(film.status,'playing','denied fullscreen leaves the full-page player usable')
video.requestFullscreen=()=>{fullscreenRequests++; doc.fullscreenElement=video; return Promise.resolve()}
assert(await film.enterFullscreen())
video.ended=false; video.fire('error'); assert.equal(film.status,'error')
film.play(); assert.equal(video.loads,1,'retry reloads failed media')
let rejectOld
video.behavior=()=>new Promise((_resolve,reject)=>rejectOld=reject)
film.play(); film.pause(); rejectOld({name:'NotAllowedError'}); await Promise.resolve(); assert.equal(film.status,'paused','old autoplay result cannot override a pause')
film.dispose(); assert(video.paused && video.src===''); const before=states.length,plays=video.plays
assert.equal(fullscreenExits,2,'leaving the scene closes its video fullscreen')
video.fire('ended'); film.play(); film.pause(); film.syncAudio(false,0)
assert.equal(states.length,before); assert.equal(video.plays,plays); assert.equal(completions,1,'departed media cannot advance again')
assert.equal(await film.enterFullscreen(),false)
const autoVideo=new Video(); let autoNext=0
const autoFilm=createGildedFilm(autoVideo,()=>{},()=>{autoNext++; autoFilm.dispose()})
autoVideo.fire('ended'); autoVideo.fire('ended'); assert.equal(autoNext,1); assert.equal(autoVideo.src,'')
const mobileVideo=new Video()
mobileVideo.webkitEnterFullscreen=()=>mobileVideo.webkitDisplayingFullscreen=true
mobileVideo.webkitExitFullscreen=()=>mobileVideo.webkitDisplayingFullscreen=false
const mobileFilm=createGildedFilm(mobileVideo,()=>{})
assert(await mobileFilm.enterFullscreen()); assert(mobileVideo.webkitDisplayingFullscreen)
mobileVideo.fire('ended'); assert(!mobileVideo.webkitDisplayingFullscreen); mobileFilm.dispose()
const lateVideo=new Video(), lateFilm=createGildedFilm(lateVideo,()=>{})
lateVideo.ownerDocument=doc
let grantFullscreen
lateVideo.requestFullscreen=()=>new Promise(resolve=>grantFullscreen=()=>{doc.fullscreenElement=lateVideo;resolve()})
const pendingFullscreen=lateFilm.enterFullscreen(); lateFilm.dispose(); grantFullscreen()
assert.equal(await pendingFullscreen,false); assert.equal(doc.fullscreenElement,null,'late fullscreen grants are cleaned up after departure')
const otherVideo=new Video(), otherFilm=createGildedFilm(otherVideo,()=>{})
otherVideo.ownerDocument=doc; doc.fullscreenElement=root; otherFilm.dispose()
assert.equal(doc.fullscreenElement,root,'cleanup must not exit the chapter’s existing fullscreen')
const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',`public${gildedFilmSrc}`]))
assert(metadata.streams.some(s=>s.codec_name==='h264' && s.width===1280 && s.height===720))
assert(metadata.streams.some(s=>s.codec_name==='aac'))
assert(Math.abs(Number(metadata.format.duration)-27.422812)<.1)
assert(statSync(`public${gildedFilmSrc}`).size>5_000_000)
const css=readFileSync('src/chapter-four.css','utf8')
assert(css.includes('aspect-ratio: 4410 / 4280') && css.includes('aspect-ratio: 1470 / 1070'))
console.log('Chapter four puzzle/film OK: 12 matching piece edges, full mural, hit regions, keyboard/tap/drag/cancel, read-only reference and guide, cleanup, video codecs, autoplay retry, native/mobile fullscreen and fallback, pause/replay, mute and stale events.')
