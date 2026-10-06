export const DLC_WATCH_KEY = 'naiwa-romance-coastal-unlock-v1'
export const DLC_REQUIRED_VIEWS = 3
export function normalizeDlcViews(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? Math.max(0, Math.min(DLC_REQUIRED_VIEWS, value)) : 0
}
export function loadDlcViews() {
  try { return normalizeDlcViews(JSON.parse(browserStorage.getItem(DLC_WATCH_KEY) ?? '0')) } catch { return 0 }
}
const DLC_KEY_UNLOCK = 'naiwa-romance-coastal-key-unlock-v1'
export function isRomanceDlcUnlocked() {
  if (browserStorage.getItem(DLC_KEY_UNLOCK) === 'true') return true
  return loadDlcViews() >= DLC_REQUIRED_VIEWS
}
export function redeemDlcKey(key: string): 'unlocked' | 'invalid' | 'session-unlocked' {
  if (key.trim() !== '442456') return 'invalid'
  return browserStorage.setItem(DLC_KEY_UNLOCK, 'true') ? 'unlocked' : 'session-unlocked'
}

// Track the continuous prefix actually played, so seeking to the end cannot count.
export class DlcWatchSession {
  private covered = 0
  private previous = 0
  private lastClock = 0
  private counted = false
  start(time: number, clock: number) { this.previous = time; this.lastClock = clock }
  sample(time: number, clock: number, visible: boolean, rate: number) {
    const delta = time - this.previous
    const elapsed = Math.max(0, (clock - this.lastClock) / 1000)
    if (visible && rate === 1 && delta > 0 && delta <= elapsed + .3 && this.previous <= this.covered + .15) this.covered = Math.max(this.covered, time)
    this.previous = time
    this.lastClock = clock
  }
  finish(duration: number) {
    const complete = Number.isFinite(duration) && duration > 0 && this.covered >= duration - Math.min(.2, duration * .02)
    if (!complete || this.counted) return false
    this.counted = true
    return true
  }
}
import { browserStorage } from './browser-storage'
