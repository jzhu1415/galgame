import { packingItems, romanceEpisodes, romanceStory, romanceTrailResult, trailOrder } from './romance-dlc-story'
export type RomanceSave = { version: 1; node: string | null; line: number; completed: string[]; choices: Record<string, string>; history: { node: string; line: number; blanket?: boolean }[]; gear: string[]; trail: string[]; treasure: boolean; endings: string[] }
export const newRomanceSave = (): RomanceSave => ({ version: 1, node: null, line: 0, completed: [], choices: {}, history: [], gear: [], trail: [], treasure: false, endings: [] })
export function normalizeRomanceSave(raw: unknown): RomanceSave {
  if (!raw || typeof raw !== 'object') return newRomanceSave()
  const data = raw as Partial<RomanceSave>
  if (data.version !== 1) return newRomanceSave()
  const completed: string[] = []
  for (const episode of romanceEpisodes) {
    if (!Array.isArray(data.completed) || !data.completed.includes(episode.id)) break
    completed.push(episode.id)
  }
  const candidate = typeof data.node === 'string' && Object.hasOwn(romanceStory, data.node) ? data.node : null
  const episodeIndex = candidate ? romanceEpisodes.findIndex(ep => ep.id === romanceStory[candidate].episode) : -1
  const node = candidate && (episodeIndex === 0 || completed.includes(romanceEpisodes[episodeIndex - 1].id)) ? candidate : null
  const choices = Object.fromEntries(romanceEpisodes.flatMap(ep => {
    const choice = data.choices?.[ep.id]
    return typeof choice === 'string' && Object.values(romanceStory).some(scene => scene.episode === ep.id && scene.choices?.some(option => option.next === choice)) ? [[ep.id, choice]] : []
  }))
  const history = Array.isArray(data.history) ? data.history.filter(entry => entry && Object.hasOwn(romanceStory, entry.node) && Number.isInteger(entry.line) && entry.line >= 0 && entry.line < romanceStory[entry.node].lines.length).slice(-180).map(entry => ({ node: entry.node, line: entry.line, ...(typeof entry.blanket === 'boolean' ? { blanket: entry.blanket } : {}) })) : []
  const gear = packingItems.filter(item => Array.isArray(data.gear) && data.gear.includes(item.id)).map(item => item.id).slice(0, 2)
  const trail = Array.isArray(data.trail) ? [...new Set(data.trail.filter(id => trailOrder.includes(id as typeof trailOrder[number])))].slice(0, 3) : []
  const endings = ['dawn-tide', 'dawn-sound', 'dawn-promise'].filter(id => Array.isArray(data.endings) && data.endings.includes(id))
  return { version: 1, node, completed, choices, history, gear, trail, endings, treasure: data.treasure === true && romanceTrailResult(trail) === 'found', line: node && Number.isInteger(data.line) ? Math.max(0, Math.min(data.line!, romanceStory[node].lines.length - 1)) : 0 }
}
