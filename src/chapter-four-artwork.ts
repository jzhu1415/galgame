import type { Language } from './story'
import { gildedVisuals, gildedVisualSrc, type GildedVisualId } from './chapter-four-visuals'

// Viewing a painting never touches saves, resources, checkpoints or dialogue.
export function showGildedArtwork(root: HTMLElement, language: Language, id: GildedVisualId): HTMLDialogElement | null {
  if (root.querySelector('dialog[open]')) return null
  const doc = root.ownerDocument
  const before = doc.activeElement as HTMLElement | null
  const dialog = doc.createElement('dialog')
  const mural = id === 'mural'
  const tr = (zh: string, en: string) => language === 'zh' ? zh : en
  dialog.className = 'app-dialog gilded-art-dialog'
  dialog.setAttribute('aria-labelledby', 'gilded-art-title')
  dialog.innerHTML = `<header class="dialog-head"><h2 id="gilded-art-title">${mural ? tr('奶神的理想世界', 'naigod’s ideal world') : tr('油画镜头', 'The oil painting')}</h2><button type="button" class="small-btn" data-art-close autofocus aria-label="${tr('关闭画作', 'Close painting')}">${tr('关闭', 'Close')} ×</button></header><figure class="gilded-art-figure"><img src="${gildedVisualSrc(id)}" alt="${gildedVisuals[id].alt[language]}" decoding="async"><figcaption>${mural ? tr('画里的奶神向所有人张开双臂。金色云层遮住了地面，人群的目光都停在它身上。', 'In the painting, naigod opens its arms to everyone. Gold clouds hide the ground, and every gaze rests upon it.') : gildedVisuals[id].alt[language]}</figcaption></figure>`
  dialog.querySelector('[data-art-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })
  dialog.addEventListener('close', () => { dialog.remove(); if (before?.isConnected) before.focus({ preventScroll: true }) }, { once: true })
  root.append(dialog)
  dialog.showModal()
  return dialog
}
