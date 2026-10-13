import { browserStorage } from './browser-storage'
import { iceLineCounts, normalizeIceSave, type ChapterSave } from './chapter-two-progress'

export const iceManualSavesKey = 'naiwa-chapter-two-manual-saves-v1'
export type IceManualSave = { version: 1; savedAt: string; state: ChapterSave }
export function loadIceManualSaves(): Array<IceManualSave | null> {
  try {
    const raw = JSON.parse(browserStorage.getItem(iceManualSavesKey) ?? '[]')
    return [0, 1, 2].map(index => {
      const item = Array.isArray(raw) ? raw[index] : null
      return item?.version === 1 && item.state?.version === 1 && Object.hasOwn(iceLineCounts, item.state.phase ?? '') && typeof item.savedAt === 'string' && Number.isFinite(Date.parse(item.savedAt))
        ? { version: 1, savedAt: item.savedAt, state: normalizeIceSave(item.state) } : null
    })
  } catch { return [null, null, null] }
}
export function writeIceManualSave(slot: number, save: ChapterSave): boolean {
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) return false
  const slots = loadIceManualSaves()
  slots[slot] = { version: 1, savedAt: new Date().toISOString(), state: normalizeIceSave(JSON.parse(JSON.stringify(save))) }
  return browserStorage.setItem(iceManualSavesKey, JSON.stringify(slots))
}
