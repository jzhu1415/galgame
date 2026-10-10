import type { Language } from './story'
import { gildedStory, gildedEndingIds, gildedEndingNames, type GildedSave } from './chapter-four-story'
import type { GildedProgress } from './chapter-four-progress'
import { setupStoryMap, type StoryMapPoint } from './story-map'

export const gildedMapWidth = 1100
export const gildedMapHeight = 2270
export const gildedMapNodes: Record<string, StoryMapPoint> = {
  threshold: { x: 480, y: 110 }, welcome: { x: 480, y: 280 }, gallery: { x: 480, y: 460 },
  puzzle: { x: 480, y: 720 }, film: { x: 480, y: 900 },
  report: { x: 900, y: 460 }, 'report-kept': { x: 800, y: 680 }, 'report-burnt': { x: 980, y: 880 },
  confrontation: { x: 480, y: 1110 }, trial: { x: 480, y: 1280 }, tightening: { x: 130, y: 1490 },
  permission: { x: 480, y: 1540 }, release: { x: 700, y: 1780 },
  free: { x: 700, y: 1980 }, bound: { x: 270, y: 1980 }, exhausted: { x: 130, y: 2180 },
}
export function gildedMapLinks() {
  const links: { from: string; to: string; risk: boolean }[] = []
  const add = (from: string, to: string, risk = false) => { if (!links.some(link => link.from === from && link.to === to)) links.push({ from, to, risk }) }
  for (const [id, node] of Object.entries(gildedStory)) {
    if (node.next) add(id, node.next)
    for (const choice of node.choices ?? []) {
      add(id, choice.next, (choice.spirit ?? 0) < 0)
      if ((choice.spirit ?? 0) < 0) add(id, 'exhausted', true)
    }
  }
  return links
}
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const text = {
  zh: { title: '剧情树', close: '关闭', hint: '拖动画布查看剧情。点击已解锁节点可从这里重新开始；灰色节点尚未解锁。', legacy: '旧存档的部分历史节点没有检查点，再次抵达后即可启用回放。', unlocked: '已解锁', locked: '尚未解锁', known: '已抵达 · 重访后可回放', current: '当前节点', gallery: '结局图鉴', zoomIn: '放大剧情树', zoomOut: '缩小剧情树', label: '第四章剧情分支画布', acts: ['来救奶蛙', '拼好画作', '说清楚，再开门', '回到病房'] },
  en: { title: 'Story map', close: 'Close', hint: 'Drag to explore. Select an unlocked node to restart there; dimmed nodes are still locked.', legacy: 'Some older visits have no checkpoint. Revisit those scenes to enable replay.', unlocked: 'Unlocked', locked: 'Locked', known: 'Reached · Revisit to enable replay', current: 'Current node', gallery: 'Ending gallery', zoomIn: 'Zoom in', zoomOut: 'Zoom out', label: 'Chapter four branching story map', acts: ['Helping Naiwa', 'The puzzle and film', 'Talking and opening the door', 'Back to the ward'] },
} as const

export function renderGildedMindMap(save: GildedSave, progress: GildedProgress, language: Language) {
  const copy = text[language]
  const paths = gildedMapLinks().map(({ from, to, risk }) => {
    const start = gildedMapNodes[from], end = gildedMapNodes[to]
    const returning = end.y <= start.y
    const side = start.x < 550 ? -1 : 1
    const detour = side < 0 ? 22 : 1078
    const bend = Math.max(28, (end.y - start.y - 70) * .48)
    const path = returning
      ? `M ${start.x + side * 96} ${start.y} C ${detour} ${start.y + 18}, ${detour} ${end.y - 18}, ${end.x + side * 96} ${end.y}`
      : `M ${start.x} ${start.y + 35} C ${start.x} ${start.y + 35 + bend}, ${end.x} ${end.y - 35 - bend}, ${end.x} ${end.y - 35}`
    return `<path d="${path}" class="map-link ${progress.visited.includes(from) && progress.visited.includes(to) ? 'is-open' : 'is-locked'} ${returning ? 'is-return' : ''} ${risk ? 'is-risk' : ''}"/>`
  }).join('')
  const tags = [60, 590, 1040, 1910].map((y, i) => `<span class="map-chapter" style="top:${y}px">${String(i + 1).padStart(2, '0')} / ${copy.acts[i]}</span>`).join('')
  const nodes = Object.entries(gildedMapNodes).map(([id, point]) => {
    const unlocked = Object.hasOwn(progress.checkpoints, id)
    const known = progress.visited.includes(id)
    const current = save.node === id
    const node = gildedStory[id]
    const status = current ? copy.current : unlocked ? copy.unlocked : known ? copy.known : copy.locked
    return `<button type="button" class="mind-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${node.ending ? 'is-ending' : ''} ${current ? 'is-current' : ''}" style="left:${point.x}px;top:${point.y}px" data-route="${id}" ${unlocked ? '' : 'disabled'} ${current ? 'aria-current="step"' : ''} aria-label="${esc(`${known ? node.title[language] : id.toUpperCase()} · ${status}`)}" title="${esc(status)}"><span class="mind-code">${esc(id.toUpperCase())}</span><span class="mind-title">${esc(known ? node.title[language] : '???')}</span>${node.ending ? '<span class="mind-ending-mark" aria-hidden="true">✦</span>' : node.next === 'gallery' ? '<span class="mind-return-mark" aria-hidden="true">↻</span>' : ''}</button>`
  }).join('')
  const legacy = progress.visited.some(id => !Object.hasOwn(progress.checkpoints, id))
  return `<div class="routes-content"><div class="map-intro"><p class="routes-hint">${copy.hint}${legacy ? `<br>${copy.legacy}` : ''}</p><div class="map-zoom-tools"><button type="button" class="small-btn" id="zoom-out" aria-label="${copy.zoomOut}">−</button><span id="map-zoom" aria-live="polite">90%</span><button type="button" class="small-btn" id="zoom-in" aria-label="${copy.zoomIn}">+</button></div></div><div class="map-viewport" id="map-viewport" role="region" tabindex="0" aria-label="${copy.label}"><div class="map-scaled" id="map-scaled"><div class="mindmap" id="mindmap" style="width:${gildedMapWidth}px;height:${gildedMapHeight}px"><div class="map-grid"></div><svg class="map-lines" width="${gildedMapWidth}" height="${gildedMapHeight}" viewBox="0 0 ${gildedMapWidth} ${gildedMapHeight}" aria-hidden="true">${paths}</svg>${tags}${nodes}</div></div></div><section class="ending-gallery"><h3>${copy.gallery} <small>${progress.endings.length}/3</small></h3><div class="ending-grid">${gildedEndingIds.map(id => `<div class="ending-badge ${progress.endings.includes(id) ? 'is-unlocked' : 'is-locked'}"><span aria-hidden="true">${progress.endings.includes(id) ? '✦' : '◇'}</span><span>${esc(progress.endings.includes(id) ? gildedEndingNames[id][language] : '???')}</span></div>`).join('')}</div></section></div>`
}

export function showGildedStoryMap(root: HTMLElement, language: Language, save: GildedSave, progress: GildedProgress, onSelect: (id: string) => void) {
  const copy = text[language]
  const focus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog route-dialog'
  dialog.dataset.kind = 'routes'
  dialog.setAttribute('aria-labelledby', 'gilded-map-title')
  dialog.innerHTML = `<div class="dialog-head"><h2 id="gilded-map-title">${copy.title}</h2><button type="button" class="small-btn" data-map-close>${copy.close} ×</button></div>${renderGildedMindMap(save, progress, language)}`
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
  setupStoryMap(dialog, { width: gildedMapWidth, height: gildedMapHeight, current: gildedMapNodes[save.node] })
  return dialog
}
