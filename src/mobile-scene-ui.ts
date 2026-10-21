// Presentation state stays in the current scene's DOM, never in chapter saves.
export const mobileSceneQuery = '(max-width: 800px), (max-width: 1000px) and (max-height: 560px) and (orientation: landscape)'

const layouts = [
  ['.game', '.game-top', '.game-tools'],
  ['.chapter-three', '.crimson-top', '.crimson-top nav'],
  ['.gilded-game', '.gilded-toolbar', '.gilded-toolbar > div'],
  ['.finale-game', '.finale-toolbar', '.finale-toolset'],
  ['.romance-play', '.romance-top', '.romance-top nav'],
] as const

export function mountMobileSceneUI(root: HTMLElement) {
  const media = window.matchMedia(mobileSceneQuery)
  let scene: HTMLElement | null = null
  let groups: HTMLElement[] = []
  let art: HTMLButtonElement | null = null
  let menu: HTMLButtonElement | null = null
  let controls: HTMLElement | null = null
  let disposed = false

  const label = (button: HTMLButtonElement, text: string) => { if (button.textContent !== text) button.textContent = text }
  function update() {
    if (disposed || !scene || !art || !menu) return
    const languageSwitch = scene.querySelector('#language, #crimson-language, #romance-language')?.textContent?.trim()
    const english = scene.lang ? scene.lang.startsWith('en') : languageSwitch ? /^(中文|ZH)$/i.test(languageSwitch) : document.documentElement.lang.startsWith('en')
    const hidden = scene.dataset.mobileArtOnly === 'true'
    const open = scene.dataset.mobileToolsOpen === 'true'
    label(art, hidden ? english ? 'Show UI' : '恢复界面' : english ? 'View art' : '看图')
    label(menu, open ? english ? 'Close' : '收起' : english ? 'Tools' : '菜单')
    art.setAttribute('aria-pressed', String(hidden))
    menu.setAttribute('aria-expanded', String(open))
  }
  function closeTools(focus = false) {
    if (!scene) return
    scene.dataset.mobileToolsOpen = 'false'
    update()
    if (focus) menu?.focus()
  }
  function sync() {
    if (disposed) return
    const next = root.querySelector<HTMLElement>(':scope > .game, :scope > .chapter-three, :scope > .gilded-game, :scope > .finale-game, :scope > .romance-play')
    if (next === scene && controls?.isConnected) { update(); return }
    scene = next
    controls = null
    if (!scene) return
    const layout = layouts.find(([selector]) => scene!.matches(selector))
    if (!layout) return
    const header = scene.querySelector<HTMLElement>(layout[1])
    groups = Array.from(scene.querySelectorAll<HTMLElement>(layout[2]))
    if (!header || !groups.length) return
    scene.dataset.mobileScene = 'true'
    scene.dataset.mobileArtOnly = 'false'
    scene.dataset.mobileToolsOpen = 'false'
    groups.forEach((group, index) => {
      group.dataset.mobileToolGroup = 'true'
      group.id ||= `mobile-scene-tools-${index}`
    })
    controls = document.createElement('div')
    controls.className = 'mobile-scene-actions'
    art = document.createElement('button')
    menu = document.createElement('button')
    for (const button of [art, menu]) { button.type = 'button'; button.className = 'small-btn' }
    art.dataset.mobileCommand = 'art'
    menu.dataset.mobileCommand = 'tools'
    menu.setAttribute('aria-controls', groups.map(group => group.id).join(' '))
    controls.append(art)
    controls.append(menu)
    header.append(controls)
    update()
  }
  function click(event: MouseEvent) {
    if (!media.matches || !scene || !(event.target instanceof Element) || root.querySelector('dialog[open]')) return
    const command = event.target.closest<HTMLElement>('[data-mobile-command]')?.dataset.mobileCommand
    if (command) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (command === 'tools') {
        const open = scene.dataset.mobileToolsOpen !== 'true'
        scene.dataset.mobileToolsOpen = String(open)
        update()
        if (open) groups[0]?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
      } else {
        const hidden = scene.dataset.mobileArtOnly !== 'true'
        if (hidden) {
          // Stop auto/skip before hiding their controls. The current line stays
          // in place and playback only restarts through an explicit action.
          scene.querySelector<HTMLButtonElement>('#auto[aria-pressed="true"], #skip[aria-pressed="true"]')?.click()
          sync()
        }
        if (scene) scene.dataset.mobileArtOnly = String(hidden)
        closeTools()
        art?.focus()
      }
      return
    }
    if (scene.dataset.mobileArtOnly === 'true') {
      event.preventDefault()
      event.stopImmediatePropagation()
    } else if (scene.dataset.mobileToolsOpen === 'true') {
      const withinTools = groups.some(group => group.contains(event.target as Node))
      closeTools()
      if (!withinTools) { event.preventDefault(); event.stopImmediatePropagation(); menu?.focus() }
      else queueMicrotask(() => {
        if (disposed) return
        sync()
        if (!root.querySelector('dialog[open]')) menu?.focus()
      })
    }
  }
  function keydown(event: KeyboardEvent) {
    if (!media.matches || !scene || root.querySelector('dialog[open]')) return
    const hidden = scene.dataset.mobileArtOnly === 'true'
    if (event.key === 'Escape' && (hidden || scene.dataset.mobileToolsOpen === 'true')) {
      event.preventDefault(); event.stopImmediatePropagation()
      scene.dataset.mobileArtOnly = 'false'
      closeTools(!hidden)
      if (hidden) art?.focus()
    } else if (hidden && [' ', 'Enter', 'ArrowRight'].includes(event.key)) {
      event.stopImmediatePropagation()
      // Native button activation still restores the interface; chapter keyboard
      // shortcuts must never receive that same key and advance underneath it.
      if (!(event.target instanceof Element && event.target.closest('[data-mobile-command]'))) event.preventDefault()
    }
  }
  function resize() {
    if (!media.matches && scene) {
      scene.dataset.mobileArtOnly = 'false'
      closeTools()
      if (controls?.contains(document.activeElement)) scene.querySelector<HTMLButtonElement>('button:not([data-mobile-command]):not(:disabled)')?.focus()
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(root, { childList: true })
  const languageObserver = new MutationObserver(update)
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  root.addEventListener('click', click, true)
  root.addEventListener('keydown', keydown, true)
  media.addEventListener('change', resize)
  sync()
  return () => {
    disposed = true
    observer.disconnect(); languageObserver.disconnect()
    root.removeEventListener('click', click, true)
    root.removeEventListener('keydown', keydown, true)
    media.removeEventListener('change', resize)
    controls?.remove()
    if (scene) { delete scene.dataset.mobileScene; delete scene.dataset.mobileArtOnly; delete scene.dataset.mobileToolsOpen }
    groups.forEach(group => { delete group.dataset.mobileToolGroup })
  }
}
