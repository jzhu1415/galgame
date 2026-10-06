export function confirmInApp(root: HTMLElement, message: string, language: 'zh' | 'en', onConfirm: () => void) {
  const previous = root.querySelector<HTMLDialogElement>('#app-confirm')
  if (previous?.open) previous.close()
  previous?.remove()
  const focusBeforeOpen = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.id = 'app-confirm'
  dialog.className = 'app-dialog app-confirm'
  const title = language === 'zh' ? '确认操作' : 'Please confirm'
  const cancel = language === 'zh' ? '取消' : 'Cancel'
  const confirm = language === 'zh' ? '确定' : 'Confirm'
  const text = document.createElement('p')
  text.className = 'confirm-message'
  text.textContent = message
  dialog.setAttribute('aria-labelledby', 'app-confirm-title')
  dialog.innerHTML = `<div class="dialog-head"><h2 id="app-confirm-title">${title}</h2></div><div class="confirm-actions"><button class="secondary-btn" type="button" data-cancel>${cancel}</button><button class="primary-btn" type="button" data-confirm>${confirm}</button></div>`
  dialog.querySelector('.dialog-head')?.after(text)
  root.append(dialog)
  dialog.addEventListener('close', () => { dialog.remove(); if (focusBeforeOpen?.isConnected) focusBeforeOpen.focus() }, { once: true })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })
  dialog.querySelector('[data-cancel]')?.addEventListener('click', () => dialog.close())
  dialog.querySelector('[data-confirm]')?.addEventListener('click', () => { dialog.close(); onConfirm() })
  dialog.showModal()
  dialog.querySelector<HTMLButtonElement>('[data-confirm]')?.focus()
}
