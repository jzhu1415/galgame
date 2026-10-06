import type { IceClueId } from './pool-ice-world'
export type Phase = 'hospital' | 'threshold' | 'map' | 'core' | 'ending'
export type FragmentId = 'footage' | 'shard' | 'echo'
export type IceApproach = 'chase' | 'restore' | 'comfort'
export type IceResponse = 'trust' | 'question'
export type IceHistoryEntry = { phase: Exclude<Phase, 'map'>; line: number; approach?: IceApproach | null; response?: IceResponse | null }
export type ChapterSave = { version: 1; phase: Phase; line: number; clues: IceClueId[]; approach: IceApproach | null; response?: IceResponse | null; completed: boolean; pendingFragment: { id: FragmentId; line: number } | null; history: IceHistoryEntry[] }
export type IceCheckpoint = Omit<ChapterSave, 'history'>
export type IceProgress = { version: 1; visited: string[]; checkpoints: Record<string, IceCheckpoint>; endings: string[] }
export const iceSaveKey = 'naiwa-chapter-two-v1'
export const iceProgressKey = 'naiwa-chapter-two-progress-v1'
export const iceClues: IceClueId[] = ['footage', 'shard', 'echo', 'note', 'routeOne', 'route']
export const fragmentIds: FragmentId[] = ['footage', 'shard', 'echo']
export const iceNodeIds = ['hospital', 'threshold', 'chase', 'restore', 'comfort', 'map', ...iceClues, 'core', 'ending-trust', 'ending-question']
export const iceLineCounts = { hospital: 8, threshold: 5, map: 1, core: 10, ending: 5 }
export const newIceSave = (): ChapterSave => ({ version: 1, phase: 'hospital', line: 0, clues: [], approach: null, response: null, completed: false, pendingFragment: null, history: [] })
const index = (value: unknown, length: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(Math.floor(value), length - 1)) : 0
export function normalizeIceSave(raw: unknown): ChapterSave {
  if (!raw || typeof raw !== 'object') return newIceSave()
  const data = raw as Partial<ChapterSave>
  if (data.version !== 1 || !Object.hasOwn(iceLineCounts, data.phase ?? '')) return newIceSave()
  let phase = data.phase!
  const clues = Array.isArray(data.clues) ? iceClues.filter(id => data.clues!.includes(id)) : []
  if (clues.includes('route') && !clues.includes('routeOne')) clues.push('routeOne')
  const approach = ['chase', 'restore', 'comfort'].includes(data.approach ?? '') ? data.approach! : null
  const response = data.response === 'trust' || data.response === 'question' ? data.response : null
  let line = index(data.line, iceLineCounts[phase])
  if ((phase === 'core' || phase === 'ending') && !(['footage', 'shard', 'echo', 'route'] as IceClueId[]).every(id => clues.includes(id))) { phase = 'map'; line = 0 }
  if (phase === 'ending' && !response) { phase = 'core'; line = iceLineCounts.core - 1 }
  if (phase === 'map' && !approach) { phase = 'threshold'; line = iceLineCounts.threshold - 1 }
  const pending = data.pendingFragment
  return {
    ...newIceSave(), phase, clues, line, approach, response,
    completed: phase === 'ending',
    pendingFragment: phase === 'map' && pending && fragmentIds.includes(pending.id) && clues.includes(pending.id) ? { id: pending.id, line: index(pending.line, 4) } : null,
    history: Array.isArray(data.history) ? data.history.filter(entry => entry && ['hospital', 'threshold', 'core', 'ending'].includes(entry.phase) && Object.hasOwn(iceLineCounts, entry.phase) && Number.isInteger(entry.line) && entry.line >= 0 && entry.line < iceLineCounts[entry.phase]).slice(-100).map(entry => ({
      phase: entry.phase, line: entry.line,
      // Earlier saves kept one run's history, with its choices on the save itself.
      approach: Object.hasOwn(entry, 'approach') ? ['chase', 'restore', 'comfort'].includes(entry.approach ?? '') ? entry.approach : null : approach,
      response: Object.hasOwn(entry, 'response') ? entry.response === 'trust' || entry.response === 'question' ? entry.response : null : response,
    })) : [],
  }
}
const snapshot = (save: ChapterSave): IceCheckpoint => {
  const { history: _history, ...state } = save
  return { ...state, line: 0, clues: [...state.clues], pendingFragment: state.pendingFragment ? { ...state.pendingFragment, line: 0 } : null }
}
export const iceCurrentNode = (save: ChapterSave) => save.pendingFragment?.id ?? (save.phase === 'ending' ? `ending-${save.response ?? 'question'}` : save.phase)
export const newIceProgress = (): IceProgress => ({ version: 1, visited: ['hospital'], checkpoints: { hospital: snapshot(newIceSave()) }, endings: [] })
function validCheckpoint(id: string, state: ChapterSave) {
  if (!iceNodeIds.includes(id)) return false
  if ((state.phase === 'core' || state.phase === 'ending') && !(['footage', 'shard', 'echo', 'route'] as IceClueId[]).every(clue => state.clues.includes(clue))) return false
  if (['chase', 'restore', 'comfort'].includes(id)) return state.phase === 'map' && state.approach === id && !state.pendingFragment
  if (iceClues.includes(id as IceClueId)) return state.phase === 'map' && state.clues.includes(id as IceClueId) && (!fragmentIds.includes(id as FragmentId) || state.pendingFragment?.id === id)
  return iceCurrentNode(state) === id
}
export function normalizeIceProgress(raw: unknown, save: ChapterSave): IceProgress {
  const progress = newIceProgress()
  if (raw && typeof raw === 'object') {
    const data = raw as Partial<IceProgress>
    if (data.version === 1) {
      for (const [id, value] of Object.entries(data.checkpoints ?? {})) {
        if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.clues) || !Object.hasOwn(iceLineCounts, value.phase)) continue
        const state = normalizeIceSave(value)
        if (validCheckpoint(id, state)) progress.checkpoints[id] = snapshot(state)
      }
      progress.visited.push(...(Array.isArray(data.visited) ? data.visited.filter(id => iceNodeIds.includes(id)) : []), ...Object.keys(progress.checkpoints))
      progress.endings = Array.isArray(data.endings) ? data.endings.filter(id => ['ending-trust', 'ending-question'].includes(id)) : []
    }
  }
  progress.visited = [...new Set([...progress.visited, ...save.history.map(entry => entry.phase === 'ending' ? iceCurrentNode(save) : entry.phase), ...save.clues, ...(save.approach ? [save.approach] : []), iceCurrentNode(save)])]
  if (save.phase === 'ending') progress.endings.push(iceCurrentNode(save))
  progress.endings = [...new Set(progress.endings)]
  return progress
}
export function recordIceCheckpoint(progress: IceProgress, save: ChapterSave, id: string = iceCurrentNode(save), arrival = true): void {
  if (!progress.visited.includes(id)) progress.visited.push(id)
  if (arrival && !progress.checkpoints[id] && save.line === 0 && (save.pendingFragment?.line ?? 0) === 0 && validCheckpoint(id, save)) progress.checkpoints[id] = snapshot(save)
  if (id.startsWith('ending-') && !progress.endings.includes(id)) progress.endings.push(id)
}
export function restartIceFrom(progress: IceProgress, id: string): ChapterSave | null {
  if (!Object.hasOwn(progress.checkpoints, id)) return null
  const state = normalizeIceSave(progress.checkpoints[id])
  return validCheckpoint(id, state) ? { ...state, line: 0, history: [], clues: [...state.clues] } : null
}
