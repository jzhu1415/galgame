import { firstScene, story, type Language, type MemoryId, type Scene } from './story'

export type LogEntry = { sceneId: string; index: number; sourceIndex?: number }
export type GameState = {
  version: 1; sceneId: string; lineIndex: number; language: Language
  affection: number; anxiety: number; spirit: number; danger: number
  memories: MemoryId[]; history: LogEntry[]
}
export type Checkpoint = Pick<GameState, 'sceneId' | 'affection' | 'anxiety' | 'spirit' | 'danger' | 'memories'>
export type Progress = { version: 1; checkpoints: Record<string, Checkpoint>; visited: string[]; endings: string[] }
const finite = (value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(value, max)) : fallback
const memories = (value: unknown): MemoryId[] => Array.isArray(value) ? [...new Set(value.filter((id): id is MemoryId => id === 'toy' || id === 'gift' || id === 'photo'))] : []
export const originLines = (scene: Scene, anxiety: number) => scene.lines.filter(line => !line.when || (line.when === 'uneasy' ? anxiety >= 20 : anxiety < 20))
const needsAllMemories = ['m07', 'm08', 'e01', 'e02']
const recoveredMemory: Record<string, MemoryId> = { find_toy: 'toy', find_gift: 'gift', find_photo: 'photo' }
const allowedCheckpoint = (value: Checkpoint) =>
  (!needsAllMemories.includes(value.sceneId) || value.memories.length === 3) &&
  (!recoveredMemory[value.sceneId] || value.memories.includes(recoveredMemory[value.sceneId])) &&
  (value.sceneId === 'exhausted' ? value.spirit === 0 : value.spirit > 0)
export function newOriginSave(language: Language): GameState {
  return { version: 1, sceneId: firstScene, lineIndex: 0, language, affection: 0, anxiety: 0, spirit: 100, danger: 0, memories: [], history: [] }
}
export function normalizeOriginSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<GameState>
  const sceneId = data.sceneId === 'false_trail' ? 'm06' : data.sceneId
  if (data.version !== 1 || typeof sceneId !== 'string' || !Object.hasOwn(story, sceneId) || !Number.isInteger(data.lineIndex) || !['zh', 'en'].includes(data.language ?? '')) return null
  const anxiety = finite(data.anxiety, 0)
  const history = Array.isArray(data.history) ? data.history.filter(entry => entry && Object.hasOwn(story, entry.sceneId) && Number.isInteger(entry.index) && entry.index >= 0 && entry.index < story[entry.sceneId].lines.length).slice(-120).map(entry => ({
    sceneId: entry.sceneId, index: entry.index,
    ...(Number.isInteger(entry.sourceIndex) && entry.sourceIndex! >= 0 && entry.sourceIndex! < story[entry.sceneId].lines.length ? { sourceIndex: entry.sourceIndex } : {}),
  })) : []
  const save: GameState = {
    ...newOriginSave(data.language!), sceneId, anxiety,
    lineIndex: data.sceneId === 'false_trail' ? 0 : Math.max(0, Math.min(data.lineIndex!, originLines(story[sceneId], anxiety).length - 1)),
    affection: finite(data.affection, 0), spirit: finite(data.spirit, 100, 100), danger: finite(data.danger, 0),
    memories: memories(data.memories), history,
  }
  if (save.sceneId === 'exhausted') save.spirit = 0
  if (save.spirit === 0 && save.sceneId !== 'exhausted') { save.sceneId = 'exhausted'; save.lineIndex = 0 }
  else if (needsAllMemories.includes(save.sceneId) && save.memories.length < 3) { save.sceneId = 'm06'; save.lineIndex = 0 }
  else if (recoveredMemory[save.sceneId] && !save.memories.includes(recoveredMemory[save.sceneId])) { save.sceneId = save.sceneId.replace('find_', 'explore_'); save.lineIndex = 0 }
  return save
}
const snapshot = (save: GameState): Checkpoint => ({ sceneId: save.sceneId, affection: save.affection, anxiety: save.anxiety, spirit: save.spirit, danger: save.danger, memories: [...save.memories] })
export function newOriginProgress(): Progress {
  return { version: 1, checkpoints: { [firstScene]: snapshot(newOriginSave('zh')) }, visited: [firstScene], endings: [] }
}
export function normalizeOriginProgress(raw: unknown, save: GameState | null): Progress {
  const progress = newOriginProgress()
  if (raw && typeof raw === 'object') {
    const data = raw as Partial<Progress>
    if (data.version === 1) {
      for (const [id, value] of Object.entries(data.checkpoints ?? {})) {
        if (!Object.hasOwn(story, id) || !value || value.sceneId !== id || !['affection', 'anxiety', 'spirit', 'danger'].every(key => Number.isFinite(value[key as keyof Checkpoint]))) continue
        if (!Array.isArray(value.memories) || memories(value.memories).length !== value.memories.length) continue
        const normalized = { ...value, affection: finite(value.affection, 0), anxiety: finite(value.anxiety, 0), spirit: finite(value.spirit, 100, 100), danger: finite(value.danger, 0), memories: memories(value.memories) }
        if (allowedCheckpoint(normalized)) progress.checkpoints[id] = normalized
      }
      progress.visited.push(...(Array.isArray(data.visited) ? data.visited.filter(id => Object.hasOwn(story, id)) : []), ...Object.keys(progress.checkpoints))
      progress.endings = Array.isArray(data.endings) ? data.endings.filter(id => Object.hasOwn(story, id) && !!story[id].ending) : []
    }
  }
  // History proves arrival, but cannot reconstruct the resources at that arrival.
  if (save) progress.visited.push(save.sceneId, ...save.history.map(entry => entry.sceneId))
  progress.visited = [...new Set(progress.visited)]
  progress.endings = [...new Set([...progress.endings, ...progress.visited.filter(id => !!story[id].ending)])]
  return progress
}
export function recordOriginCheckpoint(progress: Progress, save: GameState): void {
  if (!progress.visited.includes(save.sceneId)) progress.visited.push(save.sceneId)
  if (save.lineIndex === 0 && !progress.checkpoints[save.sceneId] && allowedCheckpoint(save)) progress.checkpoints[save.sceneId] = snapshot(save)
  if (story[save.sceneId].ending && !progress.endings.includes(save.sceneId)) progress.endings.push(save.sceneId)
}
export function originLogLine(entry: LogEntry, progress: Progress) {
  const scene = story[entry.sceneId]
  return Number.isInteger(entry.sourceIndex) ? scene.lines[entry.sourceIndex!] : originLines(scene, progress.checkpoints[entry.sceneId]?.anxiety ?? 0)[entry.index]
}
