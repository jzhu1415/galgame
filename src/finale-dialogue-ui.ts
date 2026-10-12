import { finaleStories, type FinaleSave } from './finale-story'

// Derive the aftermath from the actual story graph, rather than the artwork or
// historical visit list: replaying an earlier checkpoint restores its intact UI.
const aftermath = new Set<string>()
const queue = ['f6-post-film']
for (let index = 0; index < queue.length; index++) {
  const id = queue[index]
  if (aftermath.has(id)) continue
  const node = finaleStories[5][id]
  if (!node) continue
  aftermath.add(id)
  if (node.next) queue.push(node.next)
  for (const choice of node.choices ?? []) queue.push(choice.next)
}

export function finaleDialogueTheme(save: Pick<FinaleSave, 'node' | 'flags'>) {
  const damaged = save.flags.includes('film-completed') && aftermath.has(save.node)
  return { damaged, tone: damaged ? 'ash' : 'midnight' } as const
}

export function renderFinaleDialogueFrame(save: Pick<FinaleSave, 'node' | 'flags'>): string {
  const { damaged } = finaleDialogueTheme(save)
  return `<div class="finale-frame-skin" aria-hidden="true"></div><div class="finale-frame-rail" aria-hidden="true"><i></i><i></i><i></i></div>${damaged ? `<svg class="finale-frame-fractures" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M810 0 792 18 819 31 789 51 803 63 M792 18 768 25 762 44 M975 0 957 18 976 35 953 57 M0 229 18 235 8 252 35 264 M18 235 36 220 M642 300 659 282 641 272 665 259 M659 282 682 280"/><path class="fracture-faint" d="M890 0 873 12 893 23 M998 146 979 160 992 176 M64 300 81 286 68 273"/></svg>` : ''}`
}

export function renderFinaleMapDamage(save: Pick<FinaleSave, 'node' | 'flags'>): string {
  if (!finaleDialogueTheme(save).damaged) return ''
  return `<svg class="finale-map-scars" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M735 0 718 9 740 15 724 24 M718 9 700 13 M1000 71 985 78 998 89 M1000 226 986 233 996 244 M0 92 13 101 4 112 M0 237 14 242 6 255 M438 300 452 289 435 281"/></svg>`
}
