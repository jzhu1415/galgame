import type { Language } from './story'

export type IceClueId = 'footage' | 'shard' | 'echo' | 'note' | 'routeOne' | 'route'
type Options = {
  language: Language
  found: IceClueId[]
  storyPaused?: boolean
  onClue: (id: IceClueId) => void
  onCore: () => void
  onExit: () => void
}

export function mountPoolIceWorld(container: HTMLElement, options: Options) {
  const frame = document.createElement('iframe')
  frame.className = 'pool-ice-frame'
  frame.src = '/ice-map.html'
  frame.title = options.language === 'zh' ? '冰晶世界三维地图' : 'Three-dimensional ice world map'
  frame.allow = 'fullscreen; autoplay'
  let initialized = false
  let disposed = false
  let language = options.language
  let storyPaused = !!options.storyPaused
  let errorPanel: HTMLElement | null = null
  let errorReason: 'unsupported' | 'load' = 'load'
  let timer: number | null = null
  const clearTimer = () => { if (timer !== null) window.clearTimeout(timer); timer = null }
  const updateErrorCopy = () => {
    if (!errorPanel) return
    const zh = language === 'zh'
    errorPanel.querySelector('h2')!.textContent = zh ? '镜馆暂时无法启动' : 'The mirror hall could not start'
    errorPanel.querySelector('p')!.textContent = errorReason === 'unsupported'
      ? zh ? '当前浏览器不支持所需的图形功能。请使用支持 WebGL 2 的浏览器，并开启图形加速。进度会保留。' : 'Use a browser with WebGL 2 support and graphics acceleration enabled. Your progress is kept.'
      : zh ? '请检查网络和浏览器的图形支持后重试。已收集的线索会保留。' : 'Check your connection and browser graphics support, then retry. Collected clues are kept.'
    errorPanel.querySelector('[data-ice-retry]')!.textContent = zh ? '重新加载镜馆' : 'Retry mirror hall'
    errorPanel.querySelector('[data-ice-exit]')!.textContent = zh ? '返回章节详情' : 'Back to chapter details'
  }
  const showError = (reason: 'unsupported' | 'load') => {
    if (disposed) return
    clearTimer()
    errorReason = reason
    if (!errorPanel) {
      errorPanel = document.createElement('section')
      errorPanel.className = 'pool-ice-error'
      errorPanel.setAttribute('role', 'alert')
      errorPanel.innerHTML = '<div><h2></h2><p></p><div class="pool-ice-error-actions"><button type="button" data-ice-retry></button><button type="button" data-ice-exit></button></div></div>'
      errorPanel.querySelector('[data-ice-retry]')!.addEventListener('click', () => {
        errorPanel?.remove(); errorPanel = null
        initialized = false
        armTimeout()
        frame.src = '/ice-map.html'
      })
      errorPanel.querySelector('[data-ice-exit]')!.addEventListener('click', options.onExit)
      container.append(errorPanel)
    }
    updateErrorCopy()
  }
  const armTimeout = () => { clearTimer(); timer = window.setTimeout(() => showError('load'), 20000) }
  const sendInit = () => {
    if (disposed || !frame.contentWindow) return
    // A fresh ready signal also reinitializes a reloaded iframe document.
    frame.contentWindow.postMessage({ source: 'naiwa-chapter-two', type: 'init', language, found: options.found, storyPaused }, window.location.origin)
    initialized = true
    clearTimer()
    errorPanel?.remove(); errorPanel = null
  }
  const receive = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return
    const data = event.data as { source?: string; type?: string; id?: IceClueId; reason?: string } | null
    if (!data || data.source !== 'naiwa-ice-map') return
    if (data.type === 'ready') sendInit()
    else if (data.type === 'error') showError(data.reason === 'unsupported' ? 'unsupported' : 'load')
    else if (data.type === 'clue' && (data.id === 'footage' || data.id === 'shard' || data.id === 'echo' || data.id === 'note' || data.id === 'routeOne' || data.id === 'route')) options.onClue(data.id)
    else if (data.type === 'core') options.onCore()
    else if (data.type === 'exit') options.onExit()
  }
  window.addEventListener('message', receive)
  frame.addEventListener('error', () => showError('load'))
  container.append(frame)
  armTimeout()
  const setStoryPaused = (paused: boolean) => {
    storyPaused = paused
    if (initialized) frame.contentWindow?.postMessage({ source: 'naiwa-chapter-two', type: 'story-pause', paused }, window.location.origin)
  }
  return {
    setStoryPaused,
    setLanguage(next: Language) {
      language = next
      frame.title = language === 'zh' ? '冰晶世界三维地图' : 'Three-dimensional ice world map'
      updateErrorCopy()
      if (initialized) frame.contentWindow?.postMessage({ source: 'naiwa-chapter-two', type: 'language', language }, window.location.origin)
    },
    dispose: () => { disposed = true; clearTimer(); window.removeEventListener('message', receive); errorPanel?.remove(); errorPanel = null; frame.remove() },
  }
}
