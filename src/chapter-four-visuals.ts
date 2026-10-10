import type { Bilingual } from './story'
import { isGildedPuzzleComplete, type GildedSave } from './chapter-four-story'

const visual = (file: string, zh: string, en: string, position = '50% center') => ({ file: `chapter-04-${file}`, alt: { zh, en } as Bilingual, position })
export const gildedVisuals = {
  room: visual('gilded-room', '奶神在金线围住的油画房间里张开双臂', 'Naishen opening its arms in an oil-painted room of golden threads', '65% center'),
  gallery: visual('puzzle-gallery', '奶神看着缺片的群像金框与桌上散落的画片', 'Naishen looking at the incomplete ensemble painting and scattered pieces'),
  threshold: visual('naiba-threshold', '奶霸用右手的宝石手甲挡住门口', 'Naiba barring the doorway with his right jeweled gauntlet', '65% center'),
  open: visual('open-door', '松下来的金线和向清晨打开的门', 'Slack golden threads and a doorway opening toward morning', '60% center'),
  welcome: visual('naishen-welcome', '奶神微笑伸出手掌的表情近景', 'A close view of Naishen smiling and offering a palm'),
  guarded: visual('naishen-guarded', '奶神收住笑容，握住金线的表情近景', 'Naishen holding a thread with a guarded expression'),
  vulnerable: visual('naishen-vulnerable', '奶神看着细线，抓住红布边缘的犹豫表情', 'Naishen looking at a thread and clutching its red cloth'),
  relieved: visual('naishen-relieved', '晨光里奶神放松肩膀，张开空掌的近景', 'Naishen lowering its shoulders and offering an empty palm in morning light'),
  grip: visual('thread-grip', '金黄色手指牵住连接袖口的细线', 'Rounded yellow fingers holding fine threads attached to a sleeve'),
  release: visual('thread-release', '奶神张开手掌，松下来的细线垂落', 'Naishen opening a palm as a loosened thread falls'),
  gauntlet: visual('gauntlet-key', '奶霸右手的宝石手甲折断发光钥匙', 'Naiba’s right jeweled gauntlet breaking a luminous key'),
  pieces: visual('puzzle-pieces', '奶神金黄色的手旁，桌上的群像画片近景', 'Ensemble puzzle pieces beside Naishen’s yellow hand'),
  assembled: visual('puzzle-assembled', '完整群像画拼入金框，细小拼缝已合拢', 'The completed ensemble painting in its frame with joined seams'),
  bedside: visual('ending-bedside', '病床上的奶蛙仍在沉睡，手指在白被上松开', 'Sleeping Naiwa in the hospital, its fingers relaxed on the sheet', '28% center'),
  bedsideReality: visual('ending-bedside-reality', '清晨的现实病房里，奶蛙安静躺在白色病床上', 'Naiwa resting quietly on the white hospital bed in morning light', '28% center'),
  journal: visual('ending-journal', '病床边的日记里夹入一张金色群像小画', 'A small golden ensemble painting tucked inside the bedside journal'),
  surrender: visual('ending-key-surrender', '奶神双手收起普通黄铜钥匙的近景', 'Naishen’s hands enclosing the ordinary brass key'),
  closedRoom: visual('ending-closed-room', '奶神握着钥匙，金线重新围住关闭的门和椅子', 'Naishen holding the key beside a chair and a door enclosed by golden threads', '68% center'),
  fallenJournal: visual('ending-fallen-journal', '日记滑落在暗处的木地板上，远处的门看不清了', 'The journal fallen onto dark wooden floorboards, with the door lost in the distance'),
  mural: visual('naishen-mural', '金色云层中的奶神、飞翼群像和仰望它的人们', 'Naishen among golden clouds, winged figures and an upturned crowd'),
}
export type GildedVisualId = keyof typeof gildedVisuals

// One camera position per spoken line; puzzle and film have establishing shots.
export const gildedShots: Record<string, GildedVisualId[]> = {
  threshold: ['threshold', 'threshold', 'threshold', 'threshold'],
  welcome: ['room', 'welcome', 'grip', 'gallery', 'guarded', 'vulnerable'],
  gallery: ['gallery', 'vulnerable', 'pieces', 'gallery'],
  puzzle: ['gallery'],
  film: ['assembled'],
  confrontation: ['gauntlet', 'threshold', 'threshold'],
  trial: ['grip', 'guarded', 'vulnerable', 'vulnerable'],
  tightening: ['grip', 'gallery'],
  permission: ['vulnerable', 'vulnerable', 'release'],
  release: ['relieved', 'release', 'open'],
  free: ['journal', 'bedside'],
  bound: ['surrender', 'welcome', 'closedRoom'],
  exhausted: ['fallenJournal', 'vulnerable', 'closedRoom'],
  report: ['threshold', 'gauntlet', 'gallery'],
  'report-kept': ['gallery'],
  'report-burnt': ['gallery'],
}

export function gildedShotFor(save: Pick<GildedSave, 'node' | 'line'>): GildedVisualId {
  const sequence = Object.hasOwn(gildedShots, save.node) ? gildedShots[save.node] : gildedShots.threshold
  return sequence[Math.max(0, Math.min(sequence.length - 1, save.line))] ?? 'room'
}

export const gildedVisualSrc = (id: GildedVisualId) => `/images/${gildedVisuals[id].file}.webp`

// Only show the completed painting after this playthrough has actually assembled it.
export function gildedJournalPaintings(save: Pick<GildedSave, 'visited' | 'puzzle'>): GildedVisualId[] {
  if (!save.visited.includes('gallery')) return []
  return isGildedPuzzleComplete(save) ? ['gallery', 'pieces', 'assembled'] : ['gallery', 'pieces']
}
