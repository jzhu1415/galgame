import type { Language } from './story'
import { setupStoryMap } from './story-map'
import { iceCurrentNode, type ChapterSave, type IceProgress } from './chapter-two-progress'

export const iceMapNodes: Record<string, { x: number; y: number }> = {
  hospital: { x: 550, y: 80 }, threshold: { x: 550, y: 210 },
  chase: { x: 240, y: 350 }, restore: { x: 550, y: 350 }, comfort: { x: 860, y: 350 },
  map: { x: 550, y: 500 }, note: { x: 200, y: 660 }, footage: { x: 550, y: 660 }, routeOne: { x: 900, y: 660 },
  shard: { x: 200, y: 810 }, route: { x: 550, y: 810 }, echo: { x: 900, y: 810 },
  core: { x: 550, y: 1020 }, 'ending-trust': { x: 330, y: 1180 }, 'ending-question': { x: 770, y: 1180 },
}
export const iceMapLinks = [
  ['hospital', 'threshold'], ...['chase', 'restore', 'comfort'].flatMap(id => [['threshold', id], [id, 'map']]),
  ...['note', 'footage', 'routeOne', 'shard', 'route', 'echo'].flatMap(id => [['map', id], [id, 'map']]),
  ['routeOne', 'route'], ['map', 'core'], ['core', 'ending-trust'], ['core', 'ending-question'],
]
const titles: Record<string, [string, string]> = { hospital: ['医院病房', 'Hospital ward'], threshold: ['镜馆入口', 'Hall entrance'], chase: ['追上紫色背影', 'Follow the purple figure'], restore: ['捡起散落镜片', 'Collect the mirror pieces'], comfort: ['去找墙里的声音', 'Find the voice in the wall'], map: ['镜馆探索', 'Hall exploration'], note: ['入口便笺', 'Entrance note'], footage: ['残缺监控', 'Incomplete footage'], routeOne: ['第一段路线', 'First passage'], shard: ['冰蓝晶片', 'Ice-blue shard'], route: ['第二段路线', 'Second passage'], echo: ['被封住的声音', 'Sealed voice'], core: ['镜心对质', 'Confrontation'], 'ending-trust': ['先听奶鼠说完', 'Let Naishu finish'], 'ending-question': ['追问奶霸', 'Question Naiba'] }
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
export function renderIceMindMap(save: ChapterSave, progress: IceProgress, language: Language): string {
  const zh = language === 'zh'
  const title = (id: string) => titles[id][zh ? 0 : 1]
  const paths = iceMapLinks.map(([from, to]) => {
    const a = iceMapNodes[from], b = iceMapNodes[to], returning = b.y <= a.y
    const side = a.x < 550 ? -1 : 1, detour = side < 0 ? 20 : 1080
    const bend = Math.max(28, (b.y - a.y - 70) * .48)
    const d = returning ? `M ${a.x + side * 96} ${a.y} C ${detour} ${a.y + 18}, ${detour} ${b.y - 18}, ${b.x + side * 96} ${b.y}` : `M ${a.x} ${a.y + 35} C ${a.x} ${a.y + 35 + bend}, ${b.x} ${b.y - 35 - bend}, ${b.x} ${b.y - 35}`
    return `<path d="${d}" class="map-link ${progress.visited.includes(from) && progress.visited.includes(to) ? 'is-open' : 'is-locked'} ${returning ? 'is-return' : ''}"/>`
  }).join('')
  const nodes = Object.entries(iceMapNodes).map(([id, point]) => {
    const known = progress.visited.includes(id), unlocked = Object.hasOwn(progress.checkpoints, id), current = id === iceCurrentNode(save)
    const status = unlocked ? zh ? '已解锁' : 'Unlocked' : known ? zh ? '已抵达 · 重访后可回放' : 'Visited · Revisit to enable replay' : zh ? '未解锁' : 'Locked'
    return `<button type="button" class="mind-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${current ? 'is-current' : ''} ${id.startsWith('ending-') ? 'is-ending' : ''}" style="left:${point.x}px;top:${point.y}px" data-route="${id}" ${unlocked ? '' : 'disabled'} ${current ? 'aria-current="step"' : ''} title="${status}" aria-label="${esc(`${known ? title(id) : id.toUpperCase()} · ${status}`)}"><span class="mind-code">${id.toUpperCase()}</span><span class="mind-title">${esc(known ? title(id) : '???')}</span>${id.startsWith('ending-') ? '<span class="mind-ending-mark" aria-hidden="true">✦</span>' : ''}</button>`
  }).join('')
  return `<div class="routes-content"><div class="map-intro"><p class="routes-hint">${zh ? '拖动画布查看分支。确认重玩会恢复首次抵达时的线索。已抵达但没有检查点的旧节点，重访后可回放。' : 'Drag to explore. Confirm a replay to restore the clues recorded on arrival. Older visited nodes require a revisit to enable replay.'}</p><div class="map-zoom-tools"><button type="button" class="small-btn" id="zoom-out" aria-label="${zh ? '缩小' : 'Zoom out'}">−</button><span id="map-zoom" aria-live="polite">90%</span><button type="button" class="small-btn" id="zoom-in" aria-label="${zh ? '放大' : 'Zoom in'}">+</button></div></div><div class="map-viewport" id="map-viewport" role="region" tabindex="0" aria-label="${zh ? '第二章剧情分支思维导图' : 'Chapter two story mind map'}"><div class="map-scaled" id="map-scaled"><div class="mindmap" id="mindmap" style="width:1100px;height:1330px"><div class="map-grid"></div><svg class="map-lines" width="1100" height="1330" viewBox="0 0 1100 1330" aria-hidden="true">${paths}</svg>${nodes}</div></div></div><section class="ending-gallery"><h3>${zh ? '结局图鉴' : 'Ending gallery'} <small>${progress.endings.length}/2</small></h3><div class="ending-grid">${['ending-trust', 'ending-question'].map(id => `<div class="ending-badge ${progress.endings.includes(id) ? 'is-unlocked' : 'is-locked'}"><span>${progress.endings.includes(id) ? '✦' : '◇'}</span><span>${progress.endings.includes(id) ? title(id) : '???'}</span></div>`).join('')}</div></section></div>`
}
export function showIceStoryMap(root: HTMLElement, language: Language, save: ChapterSave, progress: IceProgress, onSelect: (id: string) => void) {
  const focus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog route-dialog'
  dialog.setAttribute('aria-labelledby', 'ice-map-title')
  dialog.innerHTML = `<header class="dialog-head"><h2 id="ice-map-title">${language === 'zh' ? '冰镜剧情树' : 'Ice hall story map'}</h2><button class="small-btn" type="button" data-map-close>${language === 'zh' ? '关闭' : 'Close'} ×</button></header>${renderIceMindMap(save, progress, language)}`
  root.append(dialog)
  dialog.querySelector('[data-map-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { dialog.remove(); if (focus?.isConnected) focus.focus() }, { once: true })
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const b = dialog.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close() })
  dialog.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) onSelect(button.dataset.route!) }))
  dialog.showModal()
  setupStoryMap(dialog, { width: 1100, height: 1330, current: iceMapNodes[iceCurrentNode(save)] })
  return dialog
}
