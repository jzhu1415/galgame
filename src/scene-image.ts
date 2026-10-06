type Shot = { id: string; src: string; alt: string; className: string; visibleClass: string; position?: string; fallback?: string }
const generations = new WeakMap<HTMLElement, number>()

// Keep at most the outgoing frame and its replacement, including during rapid clicks.
export function transitionSceneImage(layer: HTMLElement, shot: Shot): void {
  if (layer.dataset.image === shot.id) {
    layer.querySelectorAll<HTMLImageElement>('img').forEach(img => { img.alt = shot.alt; if (shot.position) img.style.objectPosition = shot.position })
    return
  }
  const generation = (generations.get(layer) ?? 0) + 1
  generations.set(layer, generation)
  layer.querySelectorAll<HTMLImageElement>(`img:not(.${shot.visibleClass})`).forEach(img => img.remove())
  const outgoing = layer.querySelector<HTMLImageElement>(`img.${shot.visibleClass}`)
  const incoming = new Image()
  incoming.className = shot.className
  incoming.alt = shot.alt
  incoming.dataset.art = shot.id
  incoming.decoding = 'async'
  incoming.width = 1672
  incoming.height = 941
  if (shot.position) incoming.style.objectPosition = shot.position
  layer.dataset.image = shot.id
  const current = () => incoming.isConnected && generations.get(layer) === generation
  let revealed = false
  incoming.onload = () => {
    if (!current()) { incoming.remove(); return }
    if (revealed || !incoming.naturalWidth) return
    revealed = true
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!current()) return
      incoming.classList.add(shot.visibleClass)
      outgoing?.classList.remove(shot.visibleClass)
      if (outgoing) window.setTimeout(() => outgoing.remove(), 700)
    }))
  }
  incoming.onerror = () => {
    if (!current()) { incoming.remove(); return }
    if (shot.fallback && incoming.getAttribute('src') !== shot.fallback) { incoming.src = shot.fallback; return }
    incoming.remove()
    layer.dataset.image = outgoing?.dataset.art ?? ''
  }
  layer.append(incoming)
  incoming.src = shot.src
}

const preloaded = new Set<string>()
export function preloadSceneImage(src: string): void {
  if (preloaded.has(src) || (typeof navigator !== 'undefined' && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)) return
  preloaded.add(src)
  if (preloaded.size > 32) preloaded.delete(preloaded.values().next().value!)
  const load = () => { const img = new Image(); img.decoding = 'async'; img.src = src }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 1200 })
  else window.setTimeout(load, 200)
}
