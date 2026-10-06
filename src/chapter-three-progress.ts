import { theatreStory, theatreEndingIds, theatreMemoryIds, newTheatreSave, normalizeTheatreSave, type TheatreSave, type TheatreEnding } from './chapter-three-story'

export type TheatreCheckpoint = Pick<TheatreSave, 'node' | 'spirit' | 'pollution' | 'memories' | 'routeVerified' | 'trade'>
export type TheatreProgress = { version: 1; checkpoints: Record<string, TheatreCheckpoint>; visited: string[]; endings: TheatreEnding[] }
const checkpoint = (save: TheatreSave): TheatreCheckpoint => ({ node: save.node, spirit: save.spirit, pollution: save.pollution, memories: [...save.memories], routeVerified: save.routeVerified, trade: save.trade })
export function newTheatreProgress(): TheatreProgress {
  return { version: 1, checkpoints: { invitation: checkpoint(newTheatreSave()) }, visited: ['invitation'], endings: [] }
}
export function normalizeTheatreProgress(raw: unknown): TheatreProgress {
  const progress = newTheatreProgress()
  if (!raw || typeof raw !== 'object') return progress
  const data = raw as Partial<TheatreProgress>
  if (data.version !== 1) return progress
  if (data.checkpoints && typeof data.checkpoints === 'object' && !Array.isArray(data.checkpoints)) {
    for (const [id, value] of Object.entries(data.checkpoints)) {
      if (!Object.hasOwn(theatreStory, id) || !value || typeof value !== 'object' || value.node !== id) continue
      if (!Number.isFinite(value.spirit) || value.spirit < 0 || value.spirit > 100 || !Number.isFinite(value.pollution) || value.pollution < 0 || value.pollution > 100) continue
      if (!Array.isArray(value.memories) || value.memories.some(memory => !theatreMemoryIds.includes(memory)) || new Set(value.memories).size !== value.memories.length) continue
      if (typeof value.routeVerified !== 'boolean' || ![null, 'real', 'fake'].includes(value.trade)) continue
      if (['fake-trade', 'comfort', 'resistance', 'saved'].includes(id) && (!value.routeVerified || value.trade !== 'fake')) continue
      if (['real-trade', 'bargained'].includes(id) && value.trade !== 'real') continue
      const save = normalizeTheatreSave({ ...newTheatreSave(), ...value })
      if (save.node === id) progress.checkpoints[id] = checkpoint(save)
    }
  }
  progress.visited = [...new Set(['invitation', ...Object.keys(progress.checkpoints), ...(Array.isArray(data.visited) ? data.visited.filter(id => typeof id === 'string' && Object.hasOwn(theatreStory, id)) : [])])]
  progress.endings = Array.isArray(data.endings) ? [...new Set(data.endings.filter(id => theatreEndingIds.includes(id)))] : []
  return progress
}
export function recordTheatreCheckpoint(progress: TheatreProgress, save: TheatreSave, arrival = true): TheatreProgress {
  // Keep the first arrival's state, rather than today's memories and resources.
  return {
    version: 1,
    checkpoints: arrival && save.line === 0 && !progress.checkpoints[save.node] ? { ...progress.checkpoints, [save.node]: checkpoint(save) } : progress.checkpoints,
    visited: [...new Set([...progress.visited, ...save.visited, save.node])],
    endings: [...new Set([...progress.endings, ...save.endings])],
  }
}
export function restartTheatreFrom(progress: TheatreProgress, id: string): TheatreSave | null {
  const snapshot = Object.hasOwn(progress.checkpoints, id) ? progress.checkpoints[id] : null
  if (!snapshot) return null
  return normalizeTheatreSave({ ...newTheatreSave(progress.endings), ...snapshot, memories: [...snapshot.memories], visited: [id], line: 0, history: [] })
}
