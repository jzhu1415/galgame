export function confirmInApp(root: HTMLElement, message: string, language: 'zh' | 'en', onConfirm: () => void) {
  root.querySelector('#app-confirm')?.remove()
  const dialog = document.createElement('dialog')
  dialog.id = 'app-confirm'
  dialog.className = 'app-dialog app-confirm'
  const title = language === 'zh' ? '确认操作' : 'Please confirm'
  const cancel = language === 'zh' ? '取消' : 'Cancel'
  const confirm = language === 'zh' ? '确定' : 'Confirm'
  const text = document.createElement('p')
  text.className = 'confirm-message'
  text.textContent = message
  dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2></div><div class="confirm-actions"><button class="secondary-btn" type="button" data-cancel>${cancel}</button><button class="primary-btn" type="button" data-confirm>${confirm}</button></div>`
  dialog.querySelector('.dialog-head')?.after(text)
  root.append(dialog)
  dialog.addEventListener('close', () => dialog.remove(), { once: true })
  dialog.querySelector('[data-cancel]')?.addEventListener('click', () => dialog.close())
  dialog.querySelector('[data-confirm]')?.addEventListener('click', () => { dialog.close(); onConfirm() })
  dialog.showModal()
  dialog.querySelector<HTMLButtonElement>('[data-confirm]')?.focus()
}
