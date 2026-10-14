import type { Language } from './story'

type CurtainPhase = 'fade' | 'title' | 'end' | 'ready'
type CurtainClock = {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void
}

// One sequence per ending. Advancing repeatedly cannot shorten the final pause.
export function createFinaleCurtainSequence(
  onPhase: (phase: CurtainPhase) => void,
  onReturn: () => void,
  reducedMotion = false,
  clock: CurtainClock = { setTimeout, clearTimeout },
) {
  let phase: CurtainPhase = 'fade'
  let disposed = false
  const timers: ReturnType<typeof setTimeout>[] = []
  onPhase(phase)
  const timings = reducedMotion ? [500, 1000, 2400] : [3200, 4300, 6500]
  const phases = ['title', 'end', 'ready'] as const
  phases.forEach((next, index) => {
    timers.push(clock.setTimeout(() => {
      if (disposed) return
      phase = next
      onPhase(phase)
    }, timings[index]))
  })
  function dispose() {
    disposed = true
    timers.forEach(id => clock.clearTimeout(id))
  }
  return {
    finish() {
      if (disposed || phase !== 'ready') return
      dispose()
      onReturn()
    },
    dispose,
  }
}

export function showFinaleCurtain(root: HTMLElement, initialLanguage: Language, onReturn: () => void) {
  const doc = root.ownerDocument
  const dialog = doc.createElement('dialog')
  dialog.className = 'finale-curtain'
  dialog.tabIndex = -1
  dialog.setAttribute('aria-labelledby', 'finale-curtain-title')
  dialog.setAttribute('aria-describedby', 'finale-curtain-end')
  dialog.innerHTML = '<div class="finale-curtain-copy"><h1 id="finale-curtain-title"></h1><p id="finale-curtain-end"></p></div><button type="button" class="finale-curtain-return" disabled></button>'
  const title = dialog.querySelector<HTMLElement>('h1')!
  const end = dialog.querySelector<HTMLElement>('p')!
  const button = dialog.querySelector<HTMLButtonElement>('button')!
  let disposed = false
  function setLanguage(language: Language) {
    dialog.lang = language === 'zh' ? 'zh-CN' : 'en'
    title.textContent = language === 'zh' ? '奶之崛起：终章' : 'Rise of Naiwa: Finale'
    end.textContent = language === 'zh' ? '完' : 'THE END'
    button.textContent = language === 'zh' ? '返回章节页' : 'Back to chapter details'
  }
  setLanguage(initialLanguage)
  const reducedMotion = doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false
  if (reducedMotion) dialog.classList.add('is-reduced-motion')
  const sequence = createFinaleCurtainSequence(phase => {
    dialog.dataset.phase = phase
    if (phase === 'ready') {
      button.disabled = false
      button.focus({ preventScroll: true })
    }
  }, () => {
    dispose()
    onReturn()
  }, reducedMotion)
  button.addEventListener('click', () => sequence.finish())
  dialog.addEventListener('cancel', event => {
    event.preventDefault()
    sequence.finish()
  })
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    // A held advance key must not immediately dismiss the curtain.
    if (event.repeat || event.target !== button) {
      event.preventDefault()
      if (!event.repeat) sequence.finish()
    }
  })
  root.append(dialog)
  dialog.showModal()
  dialog.focus({ preventScroll: true })
  function dispose() {
    if (disposed) return
    disposed = true
    sequence.dispose()
    dialog.close()
    dialog.remove()
  }
  return { setLanguage, dispose }
}
