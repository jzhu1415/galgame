import type { Language } from './story'
import { theatreStory, theatreEndingIds, theatreEndingNames, type TheatreSave } from './chapter-three-story'
import type { TheatreProgress } from './chapter-three-progress'
import { setupStoryMap, type StoryMapPoint } from './story-map'

export const theatreMapWidth = 1100
export const theatreMapHeight = 2390
export const theatreMapNodes: Record<string, StoryMapPoint> = {
  invitation: { x: 550, y: 100 }, threshold: { x: 550, y: 245 }, meeting: { x: 550, y: 390 }, explore: { x: 550, y: 540 },
  rain: { x: 140, y: 710 }, 'rain-kept': { x: 140, y: 870 },
  breakfast: { x: 410, y: 710 }, 'breakfast-kept': { x: 410, y: 870 },
  film: { x: 690, y: 710 }, 'film-kept': { x: 690, y: 870 },
  route: { x: 970, y: 710 }, 'route-kept': { x: 970, y: 870 }, trap: { x: 970, y: 1020 }, rehearsal: { x: 410, y: 1020 },
  confrontation: { x: 550, y: 1190 }, bargain: { x: 550, y: 1350 },
  'real-trade': { x: 300, y: 1510 }, 'fake-trade': { x: 800, y: 1510 },
  comfort: { x: 800, y: 1680 }, resistance: { x: 990, y: 1840 },
  bargained: { x: 300, y: 2100 }, saved: { x: 800, y: 2100 }, exhausted: { x: 140, y: 2260 },
}
export function theatreMapLinks() {
  const links: { from: string; to: string; risk: boolean }[] = []
  for (const [id, node] of Object.entries(theatreStory)) {
    if (node.next) links.push({ from: id, to: node.next, risk: false })
    for (const choice of node.choices ?? []) {
      links.push({ from: id, to: choice.next, risk: (choice.spirit ?? 0) < 0 || (choice.pollution ?? 0) > 0 })
      if ((choice.spirit ?? 0) < 0 && !links.some(link => link.from === id && link.to === 'exhausted')) links.push({ from: id, to: 'exhausted', risk: true })
    }
  }
  for (const id of ['rain', 'breakfast', 'film', 'route', 'confrontation']) links.push({ from: 'explore', to: id, risk: false })
  links.push({ from: 'explore', to: 'exhausted', risk: true })
  return links
}
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const text = {
  zh: { title: '剧情树', close: '关闭', hint: '拖动画布查看剧情。点击已解锁节点可从这里重新开始；灰色节点尚未解锁。', legacy: '旧存档的部分历史节点没有检查点，再次抵达后即可启用回放。', unlocked: '已解锁', locked: '尚未解锁', known: '已抵达 · 重访后可回放', current: '当前节点', gallery: '结局图鉴', zoomIn: '放大剧情树', zoomOut: '缩小剧情树', label: '第三章剧情分支画布', acts: ['入场', '三幕记忆', '血色交易', '落幕'] },
  en: { title: 'Story map', close: 'Close', hint: 'Drag to explore. Select an unlocked node to restart there; dimmed nodes are still locked.', legacy: 'Some older visits have no checkpoint. Revisit those scenes to enable replay.', unlocked: 'Unlocked', locked: 'Locked', known: 'Reached · Revisit to enable replay', current: 'Current node', gallery: 'Ending gallery', zoomIn: 'Zoom in', zoomOut: 'Zoom out', label: 'Chapter three branching story map', acts: ['Arrival', 'Three memories', 'The bargain', 'Curtain'] },
} as const

export function renderTheatreMindMap(save: TheatreSave, progress: TheatreProgress, language: Language) {
  const copy = text[language]
  const paths = theatreMapLinks().map(({ from, to, risk }) => {
    const start = theatreMapNodes[from], end = theatreMapNodes[to]
    const returning = end.y <= start.y
    const side = start.x < 550 ? -1 : 1
    const detour = side < 0 ? 22 : 1078
    const bend = Math.max(28, (end.y - start.y - 70) * .48)
    const path = returning
      ? `M ${start.x + side * 96} ${start.y} C ${detour} ${start.y + 18}, ${detour} ${end.y - 18}, ${end.x + side * 96} ${end.y}`
      : `M ${start.x} ${start.y + 35} C ${start.x} ${start.y + 35 + bend}, ${end.x} ${end.y - 35 - bend}, ${end.x} ${end.y - 35}`
    return `<path d="${path}" class="map-link ${progress.visited.includes(from) && progress.visited.includes(to) ? 'is-open' : 'is-locked'} ${returning ? 'is-return' : ''} ${risk ? 'is-risk' : ''}"/>`
  }).join('')
  const tags = [60, 620, 1110, 2000].map((y, i) => `<span class="map-chapter" style="top:${y}px">${String(i + 1).padStart(2, '0')} / ${copy.acts[i]}</span>`).join('')
  const nodes = Object.entries(theatreMapNodes).map(([id, point]) => {
    const unlocked = Object.hasOwn(progress.checkpoints, id)
    const known = progress.visited.includes(id)
    const current = save.node === id
    const node = theatreStory[id]
    const status = current ? copy.current : unlocked ? copy.unlocked : known ? copy.known : copy.locked
    return `<button type="button" class="mind-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${node.ending ? 'is-ending' : ''} ${current ? 'is-current' : ''}" style="left:${point.x}px;top:${point.y}px" data-route="${id}" ${unlocked ? '' : 'disabled'} ${current ? 'aria-current="step"' : ''} aria-label="${esc(`${known ? node.title[language] : id.toUpperCase()} · ${status}`)}" title="${esc(status)}"><span class="mind-code">${esc(id.toUpperCase())}</span><span class="mind-title">${esc(known ? node.title[language] : '???')}</span>${node.ending ? '<span class="mind-ending-mark" aria-hidden="true">✦</span>' : node.next === 'explore' ? '<span class="mind-return-mark" aria-hidden="true">↻</span>' : ''}</button>`
  }).join('')
  const legacy = progress.visited.some(id => !Object.hasOwn(progress.checkpoints, id))
  return `<div class="routes-content"><div class="map-intro"><p class="routes-hint">${copy.hint}${legacy ? `<br>${copy.legacy}` : ''}</p><div class="map-zoom-tools"><button type="button" class="small-btn" id="zoom-out" aria-label="${copy.zoomOut}">−</button><span id="map-zoom" aria-live="polite">90%</span><button type="button" class="small-btn" id="zoom-in" aria-label="${copy.zoomIn}">+</button></div></div><div class="map-viewport" id="map-viewport" role="region" tabindex="0" aria-label="${copy.label}"><div class="map-scaled" id="map-scaled"><div class="mindmap" id="mindmap" style="width:${theatreMapWidth}px;height:${theatreMapHeight}px"><div class="map-grid"></div><svg class="map-lines" width="${theatreMapWidth}" height="${theatreMapHeight}" viewBox="0 0 ${theatreMapWidth} ${theatreMapHeight}" aria-hidden="true">${paths}</svg>${tags}${nodes}</div></div></div><section class="ending-gallery"><h3>${copy.gallery} <small>${progress.endings.length}/3</small></h3><div class="ending-grid">${theatreEndingIds.map(id => `<div class="ending-badge ${progress.endings.includes(id) ? 'is-unlocked' : 'is-locked'}"><span aria-hidden="true">${progress.endings.includes(id) ? '✦' : '◇'}</span><span>${esc(progress.endings.includes(id) ? theatreEndingNames[id][language] : '???')}</span></div>`).join('')}</div></section></div>`
}

export function showTheatreStoryMap(root: HTMLElement, language: Language, save: TheatreSave, progress: TheatreProgress, onSelect: (id: string) => void) {
  const copy = text[language]
  const focus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog route-dialog'
  dialog.dataset.kind = 'routes'
  dialog.setAttribute('aria-labelledby', 'theatre-map-title')
  dialog.innerHTML = `<div class="dialog-head"><h2 id="theatre-map-title">${copy.title}</h2><button type="button" class="small-btn" data-map-close>${copy.close} ×</button></div>${renderTheatreMindMap(save, progress, language)}`
  root.append(dialog)
  dialog.querySelector('[data-map-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { dialog.remove(); if (focus?.isConnected) focus.focus() }, { once: true })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
  })
  dialog.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.addEventListener('click', () => { if (!button.disabled) onSelect(button.dataset.route!) }))
  dialog.showModal()
  setupStoryMap(dialog, { width: theatreMapWidth, height: theatreMapHeight, current: theatreMapNodes[save.node] })
  return dialog
}
