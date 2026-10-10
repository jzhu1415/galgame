import type { Language } from './story'
import { gildedPieceCount, gildedPuzzleColumns, gildedPuzzleRows, type GildedPuzzle } from './chapter-four-story'
import { gildedVisualSrc } from './chapter-four-visuals'

export const gildedPuzzleImage = gildedVisualSrc('mural')
const tabSize = 18
const edgeSign = (axis: 'h' | 'v', a: number, b: number) => (a * 3 + b * 5 + (axis === 'h' ? 1 : 0)) % 2 ? 1 : -1
export function gildedPieceEdges(id: number) {
  const row = Math.floor(id / gildedPuzzleColumns), col = id % gildedPuzzleColumns
  return { top: row === 0 ? 0 : -edgeSign('h', row - 1, col), right: col === gildedPuzzleColumns - 1 ? 0 : edgeSign('v', row, col), bottom: row === gildedPuzzleRows - 1 ? 0 : edgeSign('h', row, col), left: col === 0 ? 0 : -edgeSign('v', row, col - 1) }
}
export function gildedPiecePath(id: number) {
  const e = gildedPieceEdges(id)
  const side = (x: number, y: number, dx: number, dy: number, sign: number) => {
    const p = (along: number, out = 0) => `${x + dx * along + dy * out} ${y + dy * along - dx * out}`
    if (!sign) return `L ${p(100)}`
    const bump = tabSize * sign
    return `L ${p(35)} C ${p(43)} ${p(38, bump)} ${p(50, bump)} C ${p(62, bump)} ${p(57)} ${p(65)} L ${p(100)}`
  }
  return `M 0 0 ${side(0, 0, 1, 0, e.top)} ${side(100, 0, 0, 1, e.right)} ${side(100, 100, -1, 0, e.bottom)} ${side(0, 100, 0, -1, e.left)} Z`
}
export function gildedPieceSvg(id: number, prefix: string) {
  const col = id % gildedPuzzleColumns, row = Math.floor(id / gildedPuzzleColumns), clip = `${prefix}-${id}`
  return `<svg viewBox="-22 -22 144 144" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><clipPath id="${clip}"><path d="${gildedPiecePath(id)}"/></clipPath></defs><image href="${gildedPuzzleImage}" x="${-col * 100}" y="${-row * 100}" width="400" height="300" preserveAspectRatio="none" clip-path="url(#${clip})"/><path d="${gildedPiecePath(id)}" class="gilded-piece-outline"/></svg>`
}
export function gildedSlotAt(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, x: number, y: number): number | null {
  if (rect.width <= 0 || rect.height <= 0 || x < rect.left || y < rect.top || x >= rect.left + rect.width || y >= rect.top + rect.height) return null
  return Math.floor((y - rect.top) / rect.height * gildedPuzzleRows) * gildedPuzzleColumns + Math.floor((x - rect.left) / rect.width * gildedPuzzleColumns)
}
export function renderGildedJigsaw(puzzle: GildedPuzzle, language: Language) {
  const tr = (zh: string, en: string) => language === 'zh' ? zh : en
  const ids = Array.from({ length: gildedPieceCount }, (_, id) => id)
  return `<section class="gilded-puzzle" aria-labelledby="gilded-stage-title"><div class="gilded-puzzle-heading"><div><p class="gilded-kicker">THE BROKEN PAINTING / IV</p><h1 id="gilded-stage-title" tabindex="-1">${tr('把这幅画拼回来。', 'Put the painting together.')}</h1><p>${tr('拖动拼片到画框。也可以先点一块，再点要放的位置。放错会退回，不扣精神力。', 'Drag pieces into the frame. Or select a piece, then select its place. Wrong placements return to the tray without costing spirit.')}</p></div><span class="gilded-puzzle-count">${puzzle.placed.length}<small> / 12</small></span></div><div class="gilded-puzzle-tools"><button type="button" class="small-btn" data-puzzle-reference aria-haspopup="dialog">${tr('看完整原图', 'View the whole picture')} ↗</button><label><input type="checkbox" data-puzzle-guide> ${tr('显示淡底图', 'Show a faint guide')}</label><span>${tr('进度自动保存', 'Progress saves automatically')}</span></div><div class="gilded-jigsaw-workspace"><div class="gilded-jigsaw-frame"><div class="gilded-jigsaw-board" aria-label="${tr('十二块拼图的画框', 'Frame for twelve puzzle pieces')}"><img class="gilded-jigsaw-guide" src="${gildedPuzzleImage}" alt="" width="1470" height="1070" hidden><div class="gilded-jigsaw-slots">${ids.map(id => `<button type="button" class="gilded-jigsaw-slot" data-slot="${id}" ${puzzle.placed.includes(id) ? 'disabled' : ''} aria-label="${tr(`第 ${Math.floor(id / 4) + 1} 行，第 ${id % 4 + 1} 列${puzzle.placed.includes(id) ? '，已放好' : ''}`, `Row ${Math.floor(id / 4) + 1}, column ${id % 4 + 1}${puzzle.placed.includes(id) ? ', already filled' : ''}`)}"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${gildedPiecePath(id)}"/></svg></button>`).join('')}</div>${puzzle.placed.map(id => `<div class="gilded-fixed-piece" style="left:${((id % 4) - .22) / 4 * 100}%;top:${(Math.floor(id / 4) - .22) / 3 * 100}%;width:36%;height:48%" role="img" aria-label="${tr('已放好的拼片', 'Placed piece')}">${gildedPieceSvg(id, 'fixed')}</div>`).join('')}</div></div><div class="gilded-jigsaw-tray" aria-label="${tr('待拼画片', 'Piece tray')}"><h2>${tr('桌上的画片', 'Pieces on the table')}</h2><div class="gilded-jigsaw-pieces">${puzzle.order.filter(id => !puzzle.placed.includes(id)).map(id => `<button type="button" class="gilded-jigsaw-piece" data-piece="${id}" id="gilded-piece-${id}" aria-pressed="false" aria-label="${tr(`拼片 ${puzzle.order.indexOf(id) + 1}，选择后点画框位置`, `Piece ${puzzle.order.indexOf(id) + 1}. Select it, then select a place in the frame.`)}">${gildedPieceSvg(id, 'tray')}<span aria-hidden="true">${puzzle.order.indexOf(id) + 1}</span></button>`).join('')}</div></div></div><p class="gilded-puzzle-feedback" data-puzzle-feedback role="status" aria-live="polite">${tr('从颜色、人物和画片边缘找位置。拼完会播放画里的视频。', 'Match colors, figures and edges. The video within the picture plays when you finish.')}</p></section>`
}

export function bindGildedJigsaw(host: HTMLElement, puzzle: GildedPuzzle, language: Language, onPlace: (piece: number, slot: number) => void, onReference: () => void) {
  const controller = new AbortController(), opts = { signal: controller.signal }
  const doc = host.ownerDocument, board = host.querySelector<HTMLElement>('.gilded-jigsaw-board')!
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('[data-piece]')]
  let selected: number | null = null, swallowClick = false, disposed = false
  let drag: { pointer: number; piece: number; x: number; y: number; ghost: HTMLElement | null } | null = null
  const feedback = (zh: string, en: string) => { const el = host.querySelector<HTMLElement>('[data-puzzle-feedback]'); if (el) el.textContent = language === 'zh' ? zh : en }
  const select = (id: number | null) => { selected = id; for (const b of buttons) { const active = Number(b.dataset.piece) === id; b.classList.toggle('is-selected', active); b.setAttribute('aria-pressed', String(active)) } }
  const clearDrag = () => { drag?.ghost?.remove(); drag = null; host.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target')) }
  const place = (piece: number, slot: number) => {
    if (disposed) return
    if (puzzle.placed.includes(slot)) { feedback('这个位置已经有拼片了。', 'That place is already filled.'); return }
    if (piece !== slot) { feedback('这块放在这里对不上，试试别的位置。', 'This piece does not fit here. Try another place.'); return }
    select(null); onPlace(piece, slot)
  }
  for (const button of buttons) {
    button.addEventListener('click', event => { if (swallowClick && event.detail > 0) { swallowClick = false; return }; select(Number(button.dataset.piece)); feedback('已选中一块画片，点画框里的空位放下。', 'Piece selected. Choose an empty place in the frame.') }, opts)
    button.addEventListener('pointerdown', event => { if (event.button !== 0 || drag) return; swallowClick = false; drag = { pointer: event.pointerId, piece: Number(button.dataset.piece), x: event.clientX, y: event.clientY, ghost: null } }, opts)
  }
  host.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(button => button.addEventListener('click', () => {
    if (selected === null) { feedback('先从桌上选一块画片。', 'Select a piece from the table first.'); return }
    place(selected, Number(button.dataset.slot))
  }, opts))
  doc.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return
    event.preventDefault()
    const rect = board.getBoundingClientRect()
    if (!drag.ghost) {
      select(drag.piece)
      const ghost = doc.createElement('div')
      ghost.className = 'gilded-drag-piece'; ghost.setAttribute('aria-hidden', 'true')
      ghost.innerHTML = gildedPieceSvg(drag.piece, 'drag')
      ghost.style.width = `${rect.width / 4 * 1.44}px`; ghost.style.height = `${rect.height / 3 * 1.44}px`
      ;(host.closest('#app') ?? host).append(ghost)
      drag.ghost = ghost
    }
    drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`
    const slot = gildedSlotAt(rect, event.clientX, event.clientY)
    host.querySelectorAll<HTMLElement>('[data-slot]').forEach(el => el.classList.toggle('is-drop-target', Number(el.dataset.slot) === slot && !puzzle.placed.includes(Number(el.dataset.slot))))
  }, { ...opts, passive: false })
  doc.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointer) return
    const current = drag, moved = Boolean(current.ghost)
    clearDrag()
    if (!moved) return // The native click handles simple taps and keyboard selection.
    swallowClick = true
    const slot = gildedSlotAt(board.getBoundingClientRect(), event.clientX, event.clientY)
    if (slot !== null) place(current.piece, slot)
    else feedback('画片已放回桌上，再试一次。', 'The piece is back on the table. Try again.')
  }, opts)
  doc.addEventListener('pointercancel', clearDrag, opts)
  doc.defaultView?.addEventListener('blur', clearDrag, opts)
  host.addEventListener('keydown', event => { if (event.key === 'Escape') { clearDrag(); select(null); feedback('已取消选中。', 'Selection cleared.') } }, opts)
  host.querySelector('[data-puzzle-reference]')?.addEventListener('click', () => { clearDrag(); onReference() }, opts)
  host.querySelector<HTMLInputElement>('[data-puzzle-guide]')?.addEventListener('change', event => {
    const img = host.querySelector<HTMLImageElement>('.gilded-jigsaw-guide')
    if (img) img.hidden = !(event.target as HTMLInputElement).checked
  }, opts)
  return () => { disposed = true; clearDrag(); controller.abort() }
}
