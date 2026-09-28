const IMMERSIVE_CLASS = 'is-immersive'

export function isAppFullscreen(target: HTMLElement): boolean {
  return !!document.fullscreenElement || target.classList.contains(IMMERSIVE_CLASS)
}

function setImmersive(target: HTMLElement, active: boolean) {
  target.classList.toggle(IMMERSIVE_CLASS, active)
  document.documentElement.classList.toggle('immersive-active', active)
  window.dispatchEvent(new Event('appimmersivechange'))
}

export async function enterAppFullscreen(target: HTMLElement) {
  if (isAppFullscreen(target)) return
  if (typeof target.requestFullscreen === 'function' && document.fullscreenEnabled !== false) {
    try {
      await target.requestFullscreen()
      return
    } catch { /* Some mobile browsers only support an in-page immersive view. */ }
  }
  setImmersive(target, true)
}

export async function toggleAppFullscreen(target: HTMLElement) {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else if (target.classList.contains(IMMERSIVE_CLASS)) {
    setImmersive(target, false)
  } else {
    await enterAppFullscreen(target)
  }
}
