import { finaleStories, type FinaleSave } from './finale-story'
import { finaleSceneImage } from './finale-visuals'

type Cut = { from: number; key: string; position?: string; src?: string; memory?: { zh: string; en: string } }
const memory = (from: number, key: string, src: string, zh: string, en: string, position = '50% 35%'): Cut =>
  ({ from, key, src, memory: { zh, en }, position })
/** Only noncombat artwork and labeled earlier-chapter memories.
 * The supplied film provides the final battle imagery. Cuts only read save state. */
export const finaleCuts: Record<string, Cut[]> = {
   'f5-descent': [{ from: 0, key: 'abyss-descent' }, { from: 1, key: 'abyss-journal' }, { from: 2, key: 'abyss-depth' }],
  'f5-voice': [{ from: 0, key: 'abyss-screen' }, { from: 1, key: 'abyss-feidudu-whisper', position: '28% 35%' }, { from: 2, key: 'abyss-feidudu-close', position: '58% 35%' }, { from: 3, key: 'abyss-screen' }],
  'f5-chase': [{ from: 0, key: 'abyss-feidudu-close', position: '58% 35%' }],
  'f5-pursuit': [{ from: 0, key: 'abyss-depth' }, { from: 1, key: 'abyss-beacon' }],
  'f5-call': [{ from: 0, key: 'abyss-feidudu-whisper', position: '28% 35%' }, { from: 1, key: 'abyss-beacon' }],
  'f5-ledger': [{ from: 0, key: 'ledger-close' }],
  'f5-ledger-kept': [{ from: 0, key: 'ledger-close' }],
  'f5-roster': [{ from: 1, key: 'banana-monitor' }],
  'f5-roster-kept': [{ from: 0, key: 'banana-monitor' }],
  'f5-naidou': [{ from: 0, key: 'naidou-confession' }, { from: 2, key: 'naidou-close' }],
  'f5-bargain': [{ from: 0, key: 'niulai-contract' }, { from: 2, key: 'niulai-close' }],
  'f5-refusal': [{ from: 0, key: 'niulai-close' }],
  'f5-signed': [{ from: 0, key: 'niulai-contract' }],
  'f5-encounter': [{ from: 0, key: 'feidudu-doubt-close' }],
  'f5-return': [{ from: 1, key: 'ward-naiwa' }],
  'f6-medical': [{ from: 1, key: 'ward-naiwa' }],
  'f6-core': [{ from: 1, key: 'naiba-confession' }],
  'f6-origin': [memory(0, 'naiba-threshold', '/images/chapter-04-naiba-threshold.webp', '金色门前的奶霸', 'Naiba at the golden door', '73% 30%'), { from: 1, key: 'naiba-confession' }, { from: 3, key: 'naiba-gauntlet' }],
  'f6-crash-truth': [memory(0, 'rain-headlights', '/images/A03.webp', '雨夜的车灯', 'Rain and headlights'), { from: 1, key: 'naiba-confession' }],
  'f6-organization': [{ from: 0, key: 'niulai-close' }],
  'f6-accountability': [{ from: 0, key: 'naiba-confession' }, memory(1, 'memory-gallery', '/images/chapter-04-memory-gallery.webp', '记忆画廊', 'The memory gallery'), { from: 2, key: 'naiba-confession' }],
  'f6-cut-ready': [{ from: 0, key: 'relay-naidou' }],
  'f6-cradle-prepare': [{ from: 0, key: 'relay-naidou' }],
  'f6-body-awake': [{ from: 0, key: 'naiwa-awake-close' }, memory(1, 'rain-meeting', '/images/P02.webp', '雨夜相遇', 'The rainy-night meeting', '50% 30%'), { from: 2, key: 'naiwa-resolve' }],
  'f6-post-film': [{ from: 1, key: 'ruin-naiwa-injured' }],
  'f6-injury-reveal': [{ from: 0, key: 'naiwa-bisected' }, { from: 3, key: 'ruin-naiwa-injured' }],
  'f6-ruin-search': [{ from: 2, key: 'banana-close', position: '32% 35%' }],
  'f6-naiba-farewell': [
    { from: 0, key: 'naiba-farewell-close' },
    memory(2, 'rain-headlights', '/images/A03.webp', '雨夜的车灯', 'Rain and headlights'),
    { from: 3, key: 'naiba-farewell-close' },
    memory(9, 'quiet-journal', '/images/R04_QUIET.webp', '写日记的夜晚', 'A quiet evening with the journal', '30% 35%'),
    { from: 10, key: 'sacrifice-palm-heart' },
  ],
  'f6-naiba-sacrifice': [
    { from: 0, key: 'sacrifice-life-light' }, { from: 1, key: 'naiba-sacrifice' },
    { from: 2, key: 'sacrifice-shoulder-fading' }, { from: 3, key: 'naiba-hand-fading' },
    { from: 4, key: 'sacrifice-last-eyes' }, { from: 5, key: 'sacrifice-shoulder-fading' },
    memory(6, 'dinner-for-two', '/images/A01.webp', '两人份的晚餐', 'Dinner for two', '65% 35%'),
    { from: 7, key: 'sacrifice-final-mote', position: '45% 30%' },
  ],
  'f6-revival': [
    { from: 0, key: 'sacrifice-first-breath' }, { from: 1, key: 'naiwa-returned' },
    { from: 2, key: 'naiwa-grief-close' },
    { from: 3, key: 'empty-gauntlet-journal' }, { from: 4, key: 'naiwa-grief-close' },
    memory(5, 'naiba-threshold', '/images/chapter-04-naiba-threshold.webp', '金色门前的奶霸', 'Naiba at the golden door', '73% 30%'),
    { from: 6, key: 'naiwa-grief-close' },
    memory(7, 'window-photo', '/images/R03_PHOTO.webp', '窗边合照', 'The window photograph', '50% 30%'),
    { from: 8, key: 'naiwa-grief-close' },
  ],
  'f6-resolution': [{ from: 0, key: 'naiwa-grief-close' }, { from: 1, key: 'naiwa-journal-close' }],
  'f6-ending-reconcile': [{ from: 0, key: 'naiwa-journal-close' }, { from: 1, key: 'empty-gauntlet-journal' }, memory(2, 'quiet-journal', '/images/R04_QUIET.webp', '写日记的夜晚', 'A quiet evening with the journal', '30% 35%'), { from: 3, key: 'dawn-naiwa', position: '32% 35%' }],
  'f6-ending-sever': [{ from: 0, key: 'sever-naiwa', position: '32% 35%' }, { from: 1, key: 'naiwa-grief-close' }, { from: 2, key: 'empty-gauntlet-journal' }],
  'f6-ending-captured': [{ from: 1, key: 'captured-naiwa', position: '32% 35%' }],
  'f6-ending-cradle': [{ from: 0, key: 'naiwa-journal-close' }, { from: 2, key: 'dawn-naiwa', position: '32% 35%' }, memory(3, 'breakfast-together', '/images/R02_KITCHEN.webp', '一起做早餐', 'Breakfast together', '35% 30%'), { from: 4, key: 'naiwa-journal-close' }],
}

export function finaleArtwork(save: FinaleSave) {
  const node = finaleStories[save.chapter][save.node]
  const cut = (finaleCuts[save.node] ?? []).filter(item => item.from <= save.line).at(-1)
  return cut
    ? { id: cut.memory ? `memory/${cut.key}` : cut.key, src: cut.src ?? `/images/finale-${cut.key}.webp`, cg: true, position: cut.position ?? '50% 35%', memory: cut.memory ?? null }
    : { id: `${node.art}/${save.node.startsWith('f5-') ? 'deep' : 'core'}`, src: finaleSceneImage(save.chapter, node.art, save.node), cg: false, position: '50% 40%', memory: null }
}
