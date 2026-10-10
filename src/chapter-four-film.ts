export const gildedFilmSrc = '/videos/chapter-04-mural-awakening.mp4'
export type GildedFilmStatus = 'playing' | 'paused' | 'finished' | 'blocked' | 'error'

export function createGildedFilm(video: HTMLVideoElement, notify: (status: GildedFilmStatus) => void, onComplete?: () => void) {
  const nativeVideo = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitExitFullscreen?: () => void; webkitDisplayingFullscreen?: boolean }
  const events = new AbortController()
  let disposed = false, completed = false, attempt = 0, status: GildedFilmStatus = 'paused'
  const change = (next: GildedFilmStatus) => { if (disposed) return; status = next; notify(status) }
  function leaveFullscreen() {
    try {
      if (video.ownerDocument?.fullscreenElement === video) void video.ownerDocument.exitFullscreen().catch(() => {})
      else if (nativeVideo.webkitDisplayingFullscreen) nativeVideo.webkitExitFullscreen?.()
    } catch { /* The browser may have already left its video player. */ }
  }
  function enterFullscreen(): Promise<boolean> {
    if (disposed) return Promise.resolve(false)
    if (video.ownerDocument?.fullscreenElement === video || nativeVideo.webkitDisplayingFullscreen) return Promise.resolve(true)
    try {
      const request = typeof video.requestFullscreen === 'function' ? video.requestFullscreen()
        : nativeVideo.webkitEnterFullscreen ? nativeVideo.webkitEnterFullscreen() : false
      return Promise.resolve(request).then(result => {
        if (disposed) { leaveFullscreen(); return false }
        return result !== false
      }).catch(() => false) // The full-page player remains available if permission is denied.
    } catch { return Promise.resolve(false) }
  }
  function play() {
    if (disposed) return
    if (video.ended) video.currentTime = 0
    if (status === 'error') video.load()
    const ticket = ++attempt
    change('playing')
    void video.play().catch(error => { if (!disposed && ticket === attempt) change(error?.name === 'NotAllowedError' ? 'blocked' : 'error') })
  }
  video.addEventListener('play', () => change('playing'), { signal: events.signal })
  video.addEventListener('pause', () => { attempt++; if (!video.ended) change('paused') }, { signal: events.signal })
  video.addEventListener('ended', () => {
    if (disposed || completed) return
    completed = true
    attempt++; leaveFullscreen(); change('finished')
    onComplete?.()
  }, { signal: events.signal })
  video.addEventListener('error', () => { attempt++; change('error') }, { signal: events.signal })
  return {
    get status() { return status },
    play,
    enterFullscreen,
    pause() { if (disposed) return; attempt++; video.pause(); if (!video.ended) change('paused') },
    syncAudio(enabled: boolean, volume: number) { if (disposed) return; video.muted = !enabled; video.volume = Math.max(0, Math.min(1, volume)) },
    dispose() { disposed = true; attempt++; events.abort(); leaveFullscreen(); video.pause(); video.removeAttribute('src'); video.load() },
  }
}
