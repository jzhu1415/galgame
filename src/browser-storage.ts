// Keep the current session playable when privacy settings or quotas block storage.
const fallback = new Map<string, string | null>()
const persisted = new Map<string, string>()
// A write in another tab invalidates our deduplication cache.
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === null) persisted.clear()
  else persisted.delete(event.key)
})
export const browserStorage = {
  getItem(key: string): string | null {
    if (fallback.has(key)) return fallback.get(key) ?? null
    try { return localStorage.getItem(key) } catch { return persisted.get(key) ?? null }
  },
  setItem(key: string, value: string): boolean {
    try {
      if (persisted.get(key) !== value || fallback.has(key)) localStorage.setItem(key, value)
      persisted.set(key, value)
      fallback.delete(key)
      return true
    } catch {
      fallback.set(key, value)
      return false
    }
  },
  removeItem(key: string): boolean {
    persisted.delete(key)
    try { localStorage.removeItem(key); fallback.delete(key); return true }
    catch { fallback.set(key, null); return false }
  },
}
