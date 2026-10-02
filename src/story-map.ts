export type StoryMapPoint = { x: number; y: number }

// The first chapter's canvas behaviour is shared by all chapter story maps.
export function setupStoryMap(dialog: HTMLDialogElement, options: { width: number; height: number; current: StoryMapPoint }) {
  const viewport = dialog.querySelector<HTMLElement>('#map-viewport')
  const scaled = dialog.querySelector<HTMLElement>('#map-scaled')
  const map = dialog.querySelector<HTMLElement>('#mindmap')
  if (!viewport || !scaled || !map) return
  let zoom = window.innerWidth < 600 ? 1 : .9
  const applyZoom = (next: number, initial = false) => {
    const worldX = initial ? options.current.x : (viewport.scrollLeft + viewport.clientWidth / 2) / zoom
    const worldY = initial ? options.current.y : (viewport.scrollTop + viewport.clientHeight / 2) / zoom
    zoom = Math.max(.55, Math.min(1.25, next))
    scaled.style.width = `${options.width * zoom}px`
    scaled.style.height = `${options.height * zoom}px`
    map.style.transform = `scale(${zoom})`
    const label = dialog.querySelector<HTMLElement>('#map-zoom')
    if (label) label.textContent = `${Math.round(zoom * 100)}%`
    viewport.scrollLeft = worldX * zoom - viewport.clientWidth / 2
    viewport.scrollTop = worldY * zoom - viewport.clientHeight / 2
  }
  const frame = requestAnimationFrame(() => { if (dialog.open) applyZoom(zoom, true) })
  dialog.addEventListener('close', () => cancelAnimationFrame(frame), { once: true })
  dialog.querySelector('#zoom-in')?.addEventListener('click', () => applyZoom(zoom + .15))
  dialog.querySelector('#zoom-out')?.addEventListener('click', () => applyZoom(zoom - .15))
  let drag: { x: number; y: number; left: number; top: number } | null = null
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest('button')) return
    drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }
    viewport.classList.add('is-dragging')
    viewport.setPointerCapture(event.pointerId)
  })
  viewport.addEventListener('pointermove', event => {
    if (!drag) return
    viewport.scrollLeft = drag.left - (event.clientX - drag.x)
    viewport.scrollTop = drag.top - (event.clientY - drag.y)
  })
  const finishDrag = () => { drag = null; viewport.classList.remove('is-dragging') }
  viewport.addEventListener('pointerup', finishDrag)
  viewport.addEventListener('pointercancel', finishDrag)
  viewport.addEventListener('lostpointercapture', finishDrag)
}
