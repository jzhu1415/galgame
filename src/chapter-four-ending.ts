import type { Language } from './story'
import type { GildedSave } from './chapter-four-story'
import { transitionSceneImage } from './scene-image'
import { gildedVisuals, gildedVisualSrc, type GildedVisualId } from './chapter-four-visuals'

export const gildedEndingDissolve = { node: 'free', line: 1, from: 'bedside', to: 'bedsideReality', holdMs: 1250, durationMs: 3800 } as const

// Visual-only epilogue: the opaque oil frame stays under the incoming reality frame.
// No story advance, audio trigger, checkpoint or save write happens here.
export function createGildedEnding() {
  let active: { layer: HTMLElement; image: HTMLImageElement; oilReady: boolean; ready: boolean; started: boolean; revealed: boolean } | null = null
  let timer: number | undefined
  let frame: number | undefined
  function stop() {
    if (timer !== undefined) window.clearTimeout(timer)
    if (frame !== undefined) cancelAnimationFrame(frame)
    timer = frame = undefined
    if (active) { active.image.onload = active.image.onerror = null; active.image.remove() }
    active = null
  }
  function sync(layer: HTMLElement, save: Pick<GildedSave, 'node' | 'line'>, language: Language): boolean {
    if (save.node !== gildedEndingDissolve.node || save.line !== gildedEndingDissolve.line) { stop(); return false }
    const oil = gildedVisuals[gildedEndingDissolve.from]
    const reality = gildedVisuals[gildedEndingDissolve.to]
    if (active?.layer === layer) {
      layer.querySelectorAll<HTMLImageElement>('img').forEach(image => { image.alt = (image === active?.image ? reality : oil).alt[language] })
      return true // Language changes retain the ongoing or completed dissolve.
    }
    stop()
    const image = new Image()
    image.className = 'gilded-backdrop gilded-return-image'
    image.alt = reality.alt[language]
    image.dataset.art = gildedEndingDissolve.to
    image.decoding = 'async'
    image.width = 1672; image.height = 941
    image.style.objectPosition = reality.position
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    image.style.transitionDuration = `${reduced ? 0 : gildedEndingDissolve.durationMs}ms`
    const state = { layer, image, oilReady: false, ready: false, started: false, revealed: false }
    active = state
    const current = () => active === state && layer.isConnected && image.isConnected
    const start = () => {
      if (!current() || !state.oilReady || !state.ready || state.started) return
      state.started = true
      timer = window.setTimeout(() => {
        timer = undefined
        if (!current()) return
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            frame = undefined
            if (!current()) return
            image.classList.add('is-visible')
            state.revealed = true
          })
        })
      }, reduced ? 0 : gildedEndingDissolve.holdMs)
    }
    // A new replay may reuse a layer whose earlier oil load was cancelled.
    if (layer.dataset.image === gildedEndingDissolve.from) layer.dataset.image = ''
    transitionSceneImage(layer, {
      id: gildedEndingDissolve.from, src: gildedVisualSrc(gildedEndingDissolve.from), alt: oil.alt[language],
      className: 'gilded-backdrop', visibleClass: 'is-visible', position: oil.position,
      onReveal: () => { if (active === state) { state.oilReady = true; start() } },
    })
    // Loading both in parallel avoids a black frame or a fade to an unloaded image.
    layer.append(image)
    image.onload = () => { if (current() && image.naturalWidth) { state.ready = true; start() } }
    image.onerror = () => { if (active === state) { image.remove(); if (timer !== undefined) window.clearTimeout(timer); timer = undefined } }
    image.src = gildedVisualSrc(gildedEndingDissolve.to)
    return true
  }
  return {
    sync,
    displayedShot(): GildedVisualId | null { return active ? active.revealed ? gildedEndingDissolve.to : gildedEndingDissolve.from : null },
    dispose: stop,
  }
}
