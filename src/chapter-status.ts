import { browserStorage } from './browser-storage'
import { iceSaveKey, normalizeIceSave } from './chapter-two-progress'

const read = (key: string, versions = [1]): Record<string, unknown> | null => {
  try {
    const value = JSON.parse(browserStorage.getItem(key) ?? 'null')
    return value && typeof value === 'object' && versions.includes(value.version) ? value : null
  } catch { return null }
}
// The chapter picker reads only save metadata. Full story/UI code loads on entry.
export function chapterTwoStatus() {
  const save = normalizeIceSave(read(iceSaveKey))
  return { started: save.phase !== 'hospital' || save.line > 0, completed: save.completed, clues: save.clues.length }
}
export function chapterThreeStatus() {
  const save = read('naiwa-chapter-three-v1')
  return { started: !!save && typeof save.node === 'string' && (save.node !== 'invitation' || typeof save.line === 'number' && save.line > 0 || Array.isArray(save.history) && save.history.length > 0), completed: !!save && Array.isArray(save.endings) && save.endings.some(id => ['saved', 'bargained', 'exhausted'].includes(id)) }
}
export function chapterFourStatus() {
  const save = read('naiwa-chapter-four-v1', [1, 2])
  return { started: !!save && typeof save.node === 'string' && (save.node !== 'threshold' || typeof save.line === 'number' && save.line > 0 || Array.isArray(save.history) && save.history.length > 0), completed: !!save && Array.isArray(save.endings) && save.endings.some(id => ['free', 'bound', 'exhausted'].includes(id)) }
}
export function romanceDlcStatus() {
  const save = read('naiwa-romance-coastal-v1')
  const completed = ['departure', 'shore', 'rain', 'dawn'].filter(id => Array.isArray(save?.completed) && save.completed.includes(id)).length
  return { started: !!save?.node || completed > 0, completed }
}
