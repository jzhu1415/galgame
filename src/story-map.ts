export type StoryMapPoint = { x: number; y: number }

// The first chapter's canvas behaviour is shared by all chapter story maps.
export function setupStoryMap(dialog: HTMLDialogElement, options: { width: number; height: number; current: StoryMapPoint; language?: 'zh' | 'en'; chapter?: number }) {
  const viewport = dialog.querySelector<HTMLElement>('#map-viewport')
  const scaled = dialog.querySelector<HTMLElement>('#map-scaled')
  const map = dialog.querySelector<HTMLElement>('#mindmap')
  if (!viewport || !scaled || !map) return
  const zh = options.language !== 'en'
  dialog.classList.add('is-story-archive')
  if (options.chapter) dialog.dataset.chapter = String(options.chapter)
  dialog.lang = zh ? 'zh-CN' : 'en'
  const nodes = [...map.querySelectorAll<HTMLButtonElement>('.mind-node')]
  const replayable = nodes.filter(node => !node.disabled).length
  const bar = document.createElement('div')
  bar.className = 'map-archive-bar'
  bar.innerHTML = `<div class="map-archive-heading"><span class="map-archive-index">${options.chapter ? `CHAPTER ${String(options.chapter).padStart(2, '0')}` : 'STORY MAP'}</span><strong>${zh ? '每一步，都留在这里。' : 'Every step stays here.'}</strong></div><div class="map-archive-progress"><strong>${replayable}<small> / ${nodes.length}</small></strong><span>${zh ? '可回放节点' : 'replayable nodes'}</span></div><div class="map-legend" aria-label="${zh ? '节点状态图例' : 'Node status legend'}"><span><i class="legend-current" aria-hidden="true"></i>${zh ? '当前' : 'Current'}</span><span><i class="legend-open" aria-hidden="true"></i>${zh ? '可回放' : 'Replayable'}</span><span><i class="legend-locked" aria-hidden="true"></i>${zh ? '未解锁' : 'Locked'}</span></div>`
  const intro = dialog.querySelector<HTMLElement>('.map-intro')
  if (intro) intro.before(bar)
  else viewport.before(bar)
  const tools = dialog.querySelector<HTMLElement>('.map-zoom-tools')
  const center = document.createElement('button')
  center.type = 'button'
  center.className = 'small-btn map-center-btn'
  center.textContent = zh ? '定位当前' : 'Current node'
  center.setAttribute('aria-label', zh ? '将剧情树定位到当前节点' : 'Center the story map on the current node')
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'small-btn map-reset-btn'
  reset.textContent = '↺'
  reset.setAttribute('aria-label', zh ? '恢复默认缩放并定位当前节点' : 'Reset zoom and center the current node')
  tools?.append(center, reset)
  let zoom = window.innerWidth < 600 ? 1 : .9
  const initialZoom = zoom
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
  center.addEventListener('click', () => applyZoom(zoom, true))
  reset.addEventListener('click', () => applyZoom(initialZoom, true))
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
