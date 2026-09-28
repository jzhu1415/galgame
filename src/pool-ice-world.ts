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
  container.append(frame)
  let initialized = false
  let storyPaused = !!options.storyPaused
  const sendInit = () => {
    if (initialized || !frame.contentWindow) return
    frame.contentWindow.postMessage({ source: 'naiwa-chapter-two', type: 'init', language: options.language, found: options.found, storyPaused }, window.location.origin)
    initialized = true
  }
  const receive = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return
    const data = event.data as { source?: string; type?: string; id?: IceClueId } | null
    if (!data || data.source !== 'naiwa-ice-map') return
    if (data.type === 'ready') sendInit()
    else if (data.type === 'clue' && (data.id === 'footage' || data.id === 'shard' || data.id === 'echo' || data.id === 'note' || data.id === 'routeOne' || data.id === 'route')) options.onClue(data.id)
    else if (data.type === 'core') options.onCore()
    else if (data.type === 'exit') options.onExit()
  }
  window.addEventListener('message', receive)
  frame.addEventListener('load', sendInit)
  const setStoryPaused = (paused: boolean) => {
    storyPaused = paused
    if (initialized) frame.contentWindow?.postMessage({ source: 'naiwa-chapter-two', type: 'story-pause', paused }, window.location.origin)
  }
  return {
    setStoryPaused,
    dispose: () => { window.removeEventListener('message', receive); frame.removeEventListener('load', sendInit); frame.remove() },
  }
}
