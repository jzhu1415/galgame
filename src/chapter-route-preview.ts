import type { Language } from './story'

// This view owns only a dialog. Opening it never mounts a game or writes a save.
export function showChapterRoutePreview(root: HTMLElement, language: Language, title: string, content: string, className: string) {
  root.querySelector('#chapter-route-preview')?.remove()
  const focus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.id = 'chapter-route-preview'
  dialog.className = `${className} chapter-route-preview`
  dialog.setAttribute('aria-labelledby', 'chapter-route-preview-title')
  dialog.innerHTML = `<header><div><h2 id="chapter-route-preview-title">${title}</h2><button type="button" data-preview-close aria-label="${language === 'zh' ? '关闭剧情树' : 'Close story tree'}">${language === 'zh' ? '关闭' : 'Close'} ×</button></div></header><div class="chapter-route-preview-content">${content}</div>`
  root.append(dialog)
  dialog.querySelector('[data-preview-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { dialog.remove(); if (focus?.isConnected) focus.focus() }, { once: true })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
  })
  dialog.showModal()
  return dialog
}
