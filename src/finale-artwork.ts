import { finaleStories, type FinaleSave, type FinaleSpeaker } from './finale-story'
import { finaleSceneImage } from './finale-visuals'
import { gildedVisualSrc } from './chapter-four-visuals'

type Cut = { from: number; key: string; position?: string; src?: string; memory?: { zh: string; en: string } }
const memory = (from: number, key: string, src: string, zh: string, en: string, position = '50% 35%'): Cut =>
  ({ from, key, src, memory: { zh, en }, position })
/** Only noncombat artwork and labeled earlier-chapter memories.
 * The supplied film provides the final battle imagery. Cuts only read save state. */
export const finaleCuts: Record<string, Cut[]> = {
   'f5-descent': [{ from: 0, key: 'abyss-descent' }, { from: 1, key: 'abyss-journal' }, { from: 2, key: 'abyss-depth' }],
  'f5-voice': [{ from: 0, key: 'abyss-screen' }, { from: 1, key: 'abyss-feidudu-whisper', position: '28% 35%' }, { from: 2, key: 'abyss-feidudu-close', position: '58% 35%' }, { from: 3, key: 'abyss-screen' }, memory(5, 'ward-handover', '/images/chapter-02-cg-ward-handover.webp', '病房里的交班', 'The ward handover'), { from: 6, key: 'abyss-screen' }, { from: 7, key: 'abyss-feidudu-close', position: '58% 35%' }, { from: 9, key: 'abyss-feidudu-whisper', position: '28% 35%' }],
  'f5-chase': [{ from: 0, key: 'abyss-feidudu-close', position: '58% 35%' }],
  'f5-pursuit': [{ from: 0, key: 'abyss-depth' }, { from: 1, key: 'abyss-beacon' }, { from: 2, key: 'abyss-screen' }],
  'f5-call': [{ from: 0, key: 'abyss-feidudu-whisper', position: '28% 35%' }, { from: 1, key: 'abyss-beacon' }, { from: 3, key: 'abyss-feidudu-close', position: '58% 35%' }, { from: 5, key: 'abyss-screen' }],
  'f5-trace': [{ from: 0, key: 'archive-timeline' }, { from: 1, key: 'ledger-close' }, { from: 2, key: 'burned-cradle-photo' }],
  'f5-ledger': [{ from: 0, key: 'ledger-close' }, { from: 1, key: 'extraction-readings' }, { from: 2, key: 'ledger-close' }],
  'f5-ledger-kept': [{ from: 0, key: 'abyss-journal' }, { from: 1, key: 'archive-timeline' }],
  'f5-film': [{ from: 0, key: 'corridor-recording' }, { from: 1, key: 'banana-monitor' }, { from: 2, key: 'roster-signatures' }],
  'f5-film-kept': [{ from: 0, key: 'extraction-readings' }, { from: 1, key: 'naidou-close' }],
  'f5-roster': [{ from: 0, key: 'roster-signatures' }, { from: 1, key: 'banana-monitor' }],
  'f5-roster-kept': [{ from: 0, key: 'roster-signatures' }],
  'f5-cat-ambush': [{ from: 1, key: 'abyss-screen' }, memory(4, 'monitor-attendant', '/images/chapter-02-cg-monitor-attendant.webp', '值班台的录像', 'The duty-desk recording'), { from: 5, key: 'banana-monitor' }, { from: 6, key: 'abyss-screen' }, { from: 7, key: 'banana-monitor' }, { from: 11, key: 'abyss-screen' }, { from: 13, key: 'banana-monitor' }],
  'f5-cradle': [{ from: 0, key: 'burned-cradle-photo' }, { from: 1, key: 'abyss-journal' }],
  'f5-cradle-kept': [{ from: 0, key: 'abyss-journal' }],
  'f5-lab-entry': [{ from: 0, key: 'laboratory-door' }, { from: 1, key: 'niulai-close' }, { from: 2, key: 'laboratory-door' }],
  'f5-naidou': [{ from: 0, key: 'naidou-close' }, { from: 1, key: 'naidou-confession' }, memory(2, 'ward-handover', '/images/chapter-02-cg-ward-handover.webp', '病房里的交班', 'The ward handover'), { from: 3, key: 'naidou-close' }, { from: 5, key: 'naidou-confession' }],
  'f5-bargain': [{ from: 0, key: 'niulai-close' }, { from: 4, key: 'niulai-contract' }, { from: 6, key: 'niulai-close' }],
  'f5-refusal': [{ from: 0, key: 'niulai-close' }],
  'f5-signed': [{ from: 0, key: 'niulai-contract' }],
  'f5-encounter': [{ from: 0, key: 'feidudu-doubt-close' }, { from: 3, key: 'extraction-readings' }, { from: 4, key: 'feidudu-doubt-close' }, { from: 6, key: 'corridor-recording' }, { from: 7, key: 'feidudu-hardening-close' }],
  'f5-feidudu-clash': [{ from: 4, key: 'feidudu-doubt-close' }, { from: 6, key: 'feidudu-hardening-close' }],
  'f5-feidudu-counter': [{ from: 0, key: 'feidudu-hardening-close' }, { from: 3, key: 'extraction-readings' }, { from: 4, key: 'laboratory-door' }],
  'f5-break-lines': [{ from: 3, key: 'feidudu-hardening-close' }, { from: 5, key: 'naidou-close' }],
  'f5-return': [{ from: 1, key: 'ward-naiwa' }],
  'f6-investigation': [{ from: 0, key: 'archive-timeline' }, { from: 1, key: 'extraction-readings' }],
  'f6-medical': [{ from: 0, key: 'extraction-readings' }, { from: 1, key: 'ward-naiwa' }],
  'f6-medical-kept': [{ from: 0, key: 'extraction-readings' }],
  'f6-waveform': [{ from: 0, key: 'extraction-readings' }, { from: 1, key: 'archive-timeline' }],
  'f6-waveform-kept': [{ from: 0, key: 'extraction-readings' }],
  'f6-accident-log': [memory(0, 'rain-headlights', '/images/A03.webp', '雨夜的车灯', 'Rain and headlights'), { from: 1, key: 'abyss-journal' }],
  'f6-accident-kept': [{ from: 0, key: 'archive-timeline' }],
  'f6-core': [{ from: 1, key: 'naiba-confession' }],
  'f6-origin': [memory(0, 'naiba-threshold', '/images/chapter-04-naiba-threshold.webp', '金色门前的奶霸', 'Naiba at the golden door', '73% 30%'), { from: 1, key: 'naiba-confession' }, { from: 3, key: 'naiba-gauntlet' }],
  'f6-crash-truth': [memory(0, 'rain-headlights', '/images/A03.webp', '雨夜的车灯', 'Rain and headlights'), { from: 1, key: 'naiba-confession' }],
  'f6-organization': [{ from: 0, key: 'niulai-close' }],
  'f6-accountability': [{ from: 0, key: 'naiba-confession' }, memory(1, 'memory-gallery', gildedVisualSrc('gallery'), '记忆画廊', 'The memory gallery'), { from: 2, key: 'naiba-confession' }],
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

/** Do not introduce a later speaker before the dialogue reaches them. */
export function finalePortraitSpeaker(save: FinaleSave, portraits: Partial<Record<FinaleSpeaker, string>>) {
  return finaleStories[save.chapter][save.node].lines.slice(0, save.line + 1)
    .reverse().find(line => portraits[line.speaker])?.speaker
}

export function finaleArtwork(save: FinaleSave) {
  const node = finaleStories[save.chapter][save.node]
  const cut = (finaleCuts[save.node] ?? []).filter(item => item.from <= save.line).at(-1)
  return cut
    ? { id: cut.memory ? `memory/${cut.key}` : cut.key, src: cut.src ?? `/images/finale-${cut.key}.webp`, cg: true, position: cut.position ?? '50% 35%', memory: cut.memory ?? null }
    : { id: `${node.art}/${save.node.startsWith('f5-') ? 'deep' : 'core'}`, src: finaleSceneImage(save.chapter, node.art, save.node), cg: false, position: '50% 40%', memory: null }
}
