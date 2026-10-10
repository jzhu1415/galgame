import { gildedEndingIds, gildedStory, newGildedSave, normalizeGildedSave, type GildedSave, type GildedEnding } from './chapter-four-story'

export type GildedCheckpoint = Pick<GildedSave, 'node' | 'spirit' | 'puzzle' | 'filmSeen' | 'reportKept'>
export type GildedProgress = { version: 2; visited: string[]; endings: GildedEnding[]; checkpoints: Record<string, GildedCheckpoint> }
const snapshot = (save: GildedCheckpoint): GildedCheckpoint => ({ node: save.node, spirit: save.spirit, puzzle: { order: [...save.puzzle.order], placed: [...save.puzzle.placed] }, filmSeen: save.filmSeen, reportKept: save.reportKept })
export const newGildedProgress = (): GildedProgress => ({ version: 2, visited: [], endings: [], checkpoints: {} })
export function normalizeGildedProgress(raw: unknown): GildedProgress {
  const result = newGildedProgress()
  if (!raw || typeof raw !== 'object') return result
  const data = raw as { version?: number; visited?: unknown[]; endings?: unknown[]; checkpoints?: Record<string, GildedCheckpoint> }
  if (![1, 2].includes(data.version ?? 0)) return result
  const validId = (id: unknown): id is string => typeof id === 'string' && Object.hasOwn(gildedStory, id)
  result.visited = Array.isArray(data.visited) ? [...new Set(data.visited.filter(validId))] : []
  result.endings = Array.isArray(data.endings) ? [...new Set(data.endings.filter((id): id is GildedEnding => gildedEndingIds.includes(id as GildedEnding)))] : []
  // Old snapshots contain different gates and resources. Preserve visits and endings;
  // replay is enabled only after a real arrival under the new gameplay.
  if (data.version === 2 && data.checkpoints && typeof data.checkpoints === 'object' && !Array.isArray(data.checkpoints)) for (const [id, point] of Object.entries(data.checkpoints)) {
    if (!validId(id) || !point || point.node !== id || !Number.isInteger(point.spirit) || point.spirit < 0 || point.spirit > 100 || typeof point.filmSeen !== 'boolean' || ![null, true, false].includes(point.reportKept)) continue
    if (!point.puzzle || !Array.isArray(point.puzzle.order) || !Array.isArray(point.puzzle.placed)) continue
    const normalized = normalizeGildedSave({ ...newGildedSave(), ...point, version: 2 })
    if (normalized.node !== id || JSON.stringify(snapshot(normalized)) !== JSON.stringify(snapshot(point))) continue
    result.checkpoints[id] = snapshot(normalized)
  }
  result.visited = [...new Set([...result.visited, ...Object.keys(result.checkpoints)])]
  return result
}
export function recordGildedCheckpoint(progress: GildedProgress, save: GildedSave, arrival: boolean): GildedProgress {
  return { version: 2, checkpoints: arrival && save.line === 0 && !Object.hasOwn(progress.checkpoints, save.node) ? { ...progress.checkpoints, [save.node]: snapshot(save) } : progress.checkpoints,
    visited: [...new Set([...progress.visited, ...save.visited, save.node])], endings: [...new Set([...progress.endings, ...save.endings])] }
}
export function restartGildedFrom(progress: GildedProgress, id: string): GildedSave | null {
  if (!Object.hasOwn(progress.checkpoints, id)) return null
  const point = snapshot(progress.checkpoints[id])
  return normalizeGildedSave({ ...newGildedSave(progress.endings), ...point, line: 0, visited: [id], history: [] })
}
