import type { Language } from './story'
import { finaleEndingIds, finaleEndingNames, finaleStories, finaleTitles, type FinaleChapter, type FinaleSave } from './finale-story'
import type { FinaleProgress } from './finale-progress'
import { setupStoryMap, type StoryMapPoint } from './story-map'

export const finaleMapWidth = 1260
export const finaleMapHeights: Record<FinaleChapter, number> = { 5: 2920, 6: 4240 }

const p = (x: number, y: number): StoryMapPoint => ({ x, y })
export const finaleMapNodes: Record<FinaleChapter, Record<string, StoryMapPoint>> = {
  5: {},
  6: {
    'f6-entry': p(630, 100), 'f6-ward': p(630, 250), 'f6-investigation': p(630, 430),
    'f6-medical': p(190, 670), 'f6-waveform': p(630, 670), 'f6-accident-log': p(1070, 670), 'f6-cradle': p(630, 900),
    'f6-medical-kept': p(190, 1120), 'f6-waveform-kept': p(500, 1120), 'f6-accident-kept': p(810, 1120), 'f6-cradle-kept': p(1110, 1120),
    'f6-core-door': p(630, 1320), 'f6-core': p(630, 1490), 'f6-origin': p(630, 1660), 'f6-crash-truth': p(630, 1840),
    'f6-organization': p(630, 2020), 'f6-accountability': p(630, 2200), 'f6-rooftop': p(630, 2390),
    'f6-cut-ready': p(260, 2590), 'f6-cradle-prepare': p(1010, 2590), 'f6-body-awake': p(630, 2780),
    'f6-battle-film': p(630, 2980), 'f6-post-film': p(630, 3180), 'f6-ruin-search': p(630, 3380),
    'f6-ruin-rescue': p(260, 3590), 'f6-ruin-record': p(1010, 3590), 'f6-ruin-relay': p(630, 3780),
    'f6-resolution': p(630, 3980),
    'f6-ending-reconcile': p(180, 4180), 'f6-ending-sever': p(450, 4180), 'f6-ending-captured': p(760, 4180), 'f6-ending-cradle': p(1080, 4180), 'f6-exhausted': p(130, 3980),
  },
}

// Preserve the legacy chapter's canvas; lay out the continuous story from its
// actual branches so added scenes and automatic record sequences stay in order.
for (const point of Object.values(finaleMapNodes[6])) if (point.y >= 2200) point.y += 400
Object.assign(finaleMapNodes[6], { 'f6-core-blockade': p(630, 2200), 'f6-breaker': p(630, 2400) })
finaleMapHeights[6] = 4640
const story = finaleStories[5]
const ranks = new Map<string, number>([['f5-descent', 0]])
const incoming = new Map(Object.keys(story).map(id => [id, 0]))
const targets = (id: string): string[] => [...new Set([story[id].next, ...(story[id].choices ?? []).map(choice => choice.next)].filter((target): target is string => Boolean(target)))]
for (const id of Object.keys(story)) for (const to of targets(id)) incoming.set(to, incoming.get(to)! + 1)
const queue = Object.keys(story).filter(id => incoming.get(id) === 0)
for (let index = 0; index < queue.length; index++) {
  const id = queue[index]
  for (const to of targets(id)) {
    ranks.set(to, Math.max(ranks.get(to) ?? 0, (ranks.get(id) ?? 0) + 1))
    incoming.set(to, incoming.get(to)! - 1)
    if (incoming.get(to) === 0) queue.push(to)
  }
}
const finalRank = Math.max(...ranks.values())
ranks.set('f5-exhausted', finalRank + 1)
const rows = new Map<number, string[]>()
for (const id of Object.keys(story)) {
  const rank = ranks.get(id) ?? 0
  rows.set(rank, [...(rows.get(rank) ?? []), id])
}
for (const [rank, ids] of rows) ids.forEach((id, index) => {
  finaleMapNodes[5][id] = p(finaleMapWidth * (index + 1) / (ids.length + 1), 100 + rank * 165)
})
finaleMapHeights[5] = 200 + (finalRank + 1) * 165

type MapLink = { from: string; to: string; risk: boolean }
export function finaleMapLinks(chapter: FinaleChapter): MapLink[] {
  const links: MapLink[] = []
  const add = (from: string, to: string, risk = false) => {
    if (!links.some(link => link.from === from && link.to === to)) links.push({ from, to, risk })
  }
  for (const [id, node] of Object.entries(finaleStories[chapter])) {
    if (node.next) add(id, node.next)
    for (const choice of node.choices ?? []) {
      const risk = (choice.spirit ?? 0) < 0
      add(id, choice.next, risk)
      if (risk) add(id, chapter === 5 ? 'f5-exhausted' : 'f6-exhausted', true)
    }
  }
  return links
}

const esc = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const copy = {
  zh: {
    title: '剧情树', close: '关闭', hint: '拖动画布查看完整剧情。点击已解锁节点可从首次抵达时的检查点重玩；灰色节点尚未解锁。',
    legacy: '部分旧存档只记录了抵达记录。再次抵达这些场景后，才会保存回放检查点。', unlocked: '已解锁', locked: '尚未解锁',
    known: '已抵达 · 重访后可回放', current: '当前节点', gallery: '结局图鉴', zoomIn: '放大剧情树', zoomOut: '缩小剧情树',
    label: '终章完整剧情分支画布', acts5: ['进入深渊', '调查组织', '病床转运'], acts6: ['现场调查', '进入核心', '城市决战'],
  },
  en: {
    title: 'Story Map', close: 'Close', hint: 'Drag to explore the full story. Select an unlocked node to replay from its first-arrival checkpoint; dimmed nodes are locked.',
    legacy: 'Some older saves record visits without snapshots. Revisit those scenes to enable replay.', unlocked: 'Unlocked', locked: 'Locked',
    known: 'Reached · Revisit to enable replay', current: 'Current node', gallery: 'Ending Gallery', zoomIn: 'Zoom in on the story map', zoomOut: 'Zoom out on the story map',
    label: 'Complete final chapter branching story map', acts5: ['Into the Deep', 'Investigate the Institute', 'The Transfer'], acts6: ['The Investigation', 'The Core', 'City Battle'],
  },
} as const

const renderPath = (start: StoryMapPoint, end: StoryMapPoint, returning: boolean): string => {
  const side = start.x < finaleMapWidth / 2 ? -1 : 1
  const detour = side < 0 ? 24 : finaleMapWidth - 24
  const bend = Math.max(28, (end.y - start.y - 70) * 0.48)
  return returning
    ? 'M ' + (start.x + side * 96) + ' ' + start.y + ' C ' + detour + ' ' + (start.y + 18) + ', ' + detour + ' ' + (end.y - 18) + ', ' + (end.x + side * 96) + ' ' + end.y
    : 'M ' + start.x + ' ' + (start.y + 35) + ' C ' + start.x + ' ' + (start.y + 35 + bend) + ', ' + end.x + ' ' + (end.y - 35 - bend) + ', ' + end.x + ' ' + (end.y - 35)
}

export function renderFinaleMindMap(save: FinaleSave, progress: FinaleProgress, language: Language): string {
  const chapter = save.chapter
  const words = copy[language]
  const mapNodes = finaleMapNodes[chapter]
  const links = finaleMapLinks(chapter).map(({ from, to, risk }) => {
    const start = mapNodes[from], end = mapNodes[to]
    if (!start || !end) return ''
    const returning = end.y <= start.y
    const open = progress.visited.includes(from) && progress.visited.includes(to)
    const attrs = ' data-map-edge="' + esc(from + '→' + to) + '"'
    return '<path d="' + renderPath(start, end, returning) + '" class="map-link ' + (open ? 'is-open' : 'is-locked') + (returning ? ' is-return' : '') + (risk ? ' is-risk' : '') + '"' + attrs + '/>'
  }).join('')
  const chapterTags = (chapter === 5
    ? [{ y: mapNodes['f5-descent'].y - 45, label: words.acts5[0] }, { y: mapNodes['f5-trace'].y - 65, label: words.acts5[1] }, { y: mapNodes['f5-return'].y - 65, label: words.acts5[2] }, { y: mapNodes['f6-entry'].y - 65, label: words.acts6[0] }, { y: mapNodes['f6-core'].y - 65, label: words.acts6[1] }, { y: mapNodes['f6-rooftop'].y - 65, label: words.acts6[2] }]
    : [{ y: 55, label: words.acts6[0] }, { y: 1280, label: words.acts6[1] }, { y: 2370, label: words.acts6[2] }]
  ).map((item, index) => '<span class="map-chapter" style="top:' + item.y + 'px">0' + (index + 1) + ' / ' + esc(item.label) + '</span>').join('')
  const nodes = Object.entries(finaleStories[chapter]).map(([id, node]) => {
    const point = mapNodes[id]
    if (!point) return ''
    const unlocked = Object.hasOwn(progress.checkpoints, id)
    const known = progress.visited.includes(id)
    const current = save.node === id
    const status = current ? words.current : unlocked ? words.unlocked : known ? words.known : words.locked
    const label = (known ? node.title[language] : id.toUpperCase()) + ' · ' + status
    const code = esc(id.toUpperCase())
    const title = esc(known ? node.title[language] : '???')
    const mark = node.ending ? '<span class="mind-ending-mark" aria-hidden="true">✦</span>' : node.kind === 'film' ? '<span class="mind-return-mark" aria-hidden="true">▶</span>' : ''
    return '<button type="button" class="mind-node ' + (unlocked ? 'is-unlocked' : 'is-locked') + (node.ending ? ' is-ending' : '') + (current ? ' is-current' : '') + '" style="left:' + point.x + 'px;top:' + point.y + 'px" data-route="' + esc(id) + '"' + (unlocked ? '' : ' disabled') + (current ? ' aria-current="step"' : '') + ' aria-label="' + esc(label) + '" title="' + esc(status) + '"><span class="mind-code">' + code + '</span><span class="mind-title">' + title + '</span>' + mark + '</button>'
  }).join('')
  const legacy = progress.visited.some(id => !Object.hasOwn(progress.checkpoints, id))
  const height = finaleMapHeights[chapter]
  const width = finaleMapWidth
  const endingIds = finaleEndingIds[chapter]
  const unlockedCount = endingIds.filter(id => progress.endings.includes(id)).length
  const gallery = endingIds.map(id => {
    const unlocked = progress.endings.includes(id)
    const endingName = finaleEndingNames[id]?.[language] ?? id
    return '<div class="ending-badge ' + (unlocked ? 'is-unlocked' : 'is-locked') + '"><span aria-hidden="true">' + (unlocked ? '✦' : '◇') + '</span><span>' + esc(unlocked ? endingName : '???') + '</span></div>'
  }).join('')
  return '<div class="routes-content"><div class="map-intro"><p class="routes-hint">' + words.hint + (legacy ? '<br>' + words.legacy : '') + '</p><div class="map-zoom-tools"><button type="button" class="small-btn" id="zoom-out" aria-label="' + words.zoomOut + '">−</button><span id="map-zoom" aria-live="polite">90%</span><button type="button" class="small-btn" id="zoom-in" aria-label="' + words.zoomIn + '">+</button></div></div><div class="map-viewport" id="map-viewport" role="region" tabindex="0" aria-label="' + words.label + '"><div class="map-scaled" id="map-scaled"><div class="mindmap" id="mindmap" style="width:' + width + 'px;height:' + height + 'px"><div class="map-grid"></div><svg class="map-lines" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">' + links + '</svg>' + chapterTags + nodes + '</div></div></div><section class="ending-gallery"><h3>' + words.gallery + ' <small>' + unlockedCount + '/' + endingIds.length + '</small></h3><div class="ending-grid">' + gallery + '</div></section></div>'
}

const finaleTitlesafe = (save: FinaleSave, language: Language): string => finaleTitles[save.chapter][language]

export function showFinaleStoryMap(root: HTMLElement, language: Language, save: FinaleSave, progress: FinaleProgress, onSelect: (id: string) => void): HTMLDialogElement {
  const words = copy[language]
  const returnFocus = document.activeElement as HTMLElement | null
  const host = document.getElementById('app') ?? root
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog route-dialog'
  dialog.dataset.kind = 'routes'
  dialog.setAttribute('aria-labelledby', 'finale-map-title')
  dialog.innerHTML = '<div class="dialog-head"><h2 id="finale-map-title">' + esc(words.title + ' · ' + finaleTitlesafe(save, language)) + '</h2><button type="button" class="small-btn" data-map-close>' + words.close + ' ×</button></div>' + renderFinaleMindMap(save, progress, language)
  host.append(dialog)
  dialog.querySelector('[data-map-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => {
    dialog.remove()
    if (returnFocus?.isConnected) returnFocus.focus()
  }, { once: true })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
  })
  dialog.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.addEventListener('click', () => {
    if (!button.disabled && button.dataset.route) onSelect(button.dataset.route)
  }))
  dialog.showModal()
  const current = finaleMapNodes[save.chapter][save.node] ?? finaleMapNodes[save.chapter][initialMapNode(save.chapter)]
  setupStoryMap(dialog, { width: finaleMapWidth, height: finaleMapHeights[save.chapter], current })
  return dialog
}

const initialMapNode = (chapter: FinaleChapter): string => chapter === 5 ? 'f5-descent' : 'f6-entry'
