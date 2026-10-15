import { browserStorage } from './browser-storage'
import type { Language } from './story'

export const readingSettingsKey = 'naiwa-reading-settings-v1'
export type ReadingSettings = { textSpeed: number; voiceVolume: number }
const clamp = (value: unknown, fallback: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback
export function normalizeReadingSettings(raw: unknown): ReadingSettings {
  const data = raw && typeof raw === 'object' ? raw as Partial<ReadingSettings> : {}
  return { textSpeed: clamp(data.textSpeed, 0, 60), voiceVolume: clamp(data.voiceVolume, 1, 1) }
}
export function getReadingSettings(): ReadingSettings {
  try { return normalizeReadingSettings(JSON.parse(browserStorage.getItem(readingSettingsKey) ?? 'null')) }
  catch { return normalizeReadingSettings(null) }
}
const listeners = new Set<() => void>()
export function updateReadingSettings(update: Partial<ReadingSettings>) {
  const next = normalizeReadingSettings({ ...getReadingSettings(), ...update })
  browserStorage.setItem(readingSettingsKey, JSON.stringify(next))
  for (const listener of listeners) listener()
}
export function onReadingSettingsChange(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export const readingDelay = (text: string) => Math.max(2600, Math.min(9000, Array.from(text).length * 90))
const speedLabel = (speed: number, language: Language) => speed === 0 ? language === 'zh' ? '立即显示' : 'Instant' : `${speed} ${language === 'zh' ? '字／秒' : 'chars/sec'}`
export function renderReadingControls(language: Language, prefix: string) {
  const settings = getReadingSettings(), zh = language === 'zh'
  return `<div class="reading-settings-controls"><label for="${prefix}-text-speed">${zh ? '文字显示速度' : 'Text speed'}<output id="${prefix}-text-value" for="${prefix}-text-speed">${speedLabel(settings.textSpeed, language)}</output></label><input type="range" id="${prefix}-text-speed" min="0" max="60" step="5" value="${settings.textSpeed}"><p>${zh ? '0 为立即显示。逐字显示时，点继续先显示整句，再点进入下一句。' : '0 shows the whole line immediately. During typing, Continue reveals the line first; press again to advance.'}</p><label for="${prefix}-voice-volume">${zh ? '对白音量' : 'Dialogue volume'}<output id="${prefix}-voice-value" for="${prefix}-voice-volume">${Math.round(settings.voiceVolume * 100)}%</output></label><input type="range" id="${prefix}-voice-volume" min="0" max="100" step="1" value="${Math.round(settings.voiceVolume * 100)}"><p>${zh ? '文字与对白设置在第一、第二章共用，独立保存，不影响剧情进度。' : 'Text and dialogue settings are shared by chapters one and two and saved separately from story progress.'}</p></div>`
}
export function bindReadingControls(container: HTMLElement, language: Language, prefix: string) {
  container.querySelector<HTMLInputElement>(`#${prefix}-text-speed`)?.addEventListener('input', event => {
    const speed = Number((event.target as HTMLInputElement).value)
    updateReadingSettings({ textSpeed: speed })
    const value = container.querySelector(`#${prefix}-text-value`)
    if (value) value.textContent = speedLabel(speed, language)
  })
  container.querySelector<HTMLInputElement>(`#${prefix}-voice-volume`)?.addEventListener('input', event => {
    const volume = Number((event.target as HTMLInputElement).value) / 100
    updateReadingSettings({ voiceVolume: volume })
    const value = container.querySelector(`#${prefix}-voice-value`)
    if (value) value.textContent = `${Math.round(volume * 100)}%`
  })
}

// Rebinding the same line (e.g. an audio-status update) keeps its typing position.
export function createDialogueReader() {
  let timer: ReturnType<typeof setTimeout> | null = null
  let paused = false
  let element: HTMLElement | null = null, key = '', characters: string[] = [], count = 0
  const clearTimer = () => { if (timer !== null) clearTimeout(timer); timer = null }
  const draw = () => { if (element) element.textContent = characters.slice(0, count).join('') }
  const tick = () => {
    timer = null
    if (paused || !element || count >= characters.length) return
    count++; draw()
    schedule()
  }
  const schedule = () => {
    clearTimer()
    if (paused) return
    const speed = getReadingSettings().textSpeed
    if (!speed) { count = characters.length; draw() }
    else if (count < characters.length) timer = setTimeout(tick, 1000 / speed)
  }
  return {
    bind(next: HTMLElement | null, nextKey: string, text: string) {
      if (nextKey !== key) { key = nextKey; characters = Array.from(text); count = 0 }
      element = next; draw(); schedule()
    },
    finish() { const incomplete = count < characters.length; clearTimer(); count = characters.length; draw(); return incomplete },
    get complete() { return count >= characters.length },
    pause() { paused = true; clearTimer() },
    resume() { paused = false; schedule() },
    clear() { clearTimer(); paused = false; element = null; key = ''; characters = []; count = 0 },
  }
}
