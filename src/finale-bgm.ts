/** The existing campaign theme, kept quiet underneath the aftermath dialogue. */
export const finaleBgmSrc = '/audio/bgm/naiwa-finale-theme.m4a'
export const finaleBgmVolume = .12
export const finaleBgmDialogueVolume = .07
const aftermathNodes = new Set([
  'f6-post-film', 'f6-injury-reveal', 'f6-ruin-search', 'f6-ruin-rescue',
  'f6-naiba-farewell', 'f6-naiba-sacrifice', 'f6-revival', 'f6-ruin-record',
  'f6-ruin-relay', 'f6-resolution', 'f6-ending-reconcile', 'f6-ending-sever',
  'f6-ending-captured', 'f6-ending-cradle',
])
type BgmState = { node: string; filmCompleted: boolean; enabled: boolean; dialoguePlaying: boolean; suspended: boolean }

export function createFinaleBgm() {
  let audio: HTMLAudioElement | null = null
  let wanted = false, pending = false, disposed = false, fadingOut = false
  let targetVolume = finaleBgmVolume
  let frame = 0, generation = 0

  function cancelFade() {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
  }
  function fadeTo(target: number, duration = 700) {
    cancelFade()
    const element = audio
    if (!element || element.volume === target) return
    const from = element.volume, started = performance.now()
    const step = (now: number) => {
      if (disposed || audio !== element) return
      const elapsed = Math.min(1, Math.max(0, (now - started) / duration))
      element.volume = from + (target - from) * elapsed
      frame = elapsed < 1 ? window.requestAnimationFrame(step) : 0
    }
    frame = window.requestAnimationFrame(step)
  }
  function pause() {
    generation++
    pending = false
    cancelFade()
    if (audio) { audio.pause(); audio.volume = 0 }
  }
  function release() {
    pause()
    if (audio) {
      audio.onended = null
      audio.ontimeupdate = null
      audio.removeAttribute('src')
      audio.load()
      audio = null
    }
    fadingOut = false
  }
  function play() {
    if (disposed || !wanted || pending) return
    if (!audio) {
      audio = new Audio(finaleBgmSrc)
      audio.preload = 'auto'
      audio.volume = 0
      const element = audio
      element.ontimeupdate = () => {
        if (!wanted || element.paused || fadingOut || !Number.isFinite(element.duration)) return
        const remaining = element.duration - element.currentTime
        if (remaining > 2 || remaining <= 0) return
        fadingOut = true
        fadeTo(0, Math.max(100, remaining * 1000))
      }
      element.onended = () => {
        if (disposed || audio !== element) return
        cancelFade()
        element.currentTime = 0
        element.volume = 0
        fadingOut = false
        play()
      }
    }
    const element = audio
    if (!element.paused) { if (!fadingOut) fadeTo(targetVolume); return }
    const token = ++generation
    pending = true
    void element.play().then(() => {
      if (disposed || audio !== element || token !== generation) return
      pending = false
      if (!wanted) { pause(); return }
      fadingOut = false
      fadeTo(targetVolume, 1000)
    }).catch(() => {
      if (disposed || audio !== element || token !== generation) return
      pending = false // A later player gesture retries blocked autoplay.
    })
  }
  return {
    sync(state: BgmState) {
      if (disposed) return
      const eligible = state.filmCompleted && aftermathNodes.has(state.node)
      wanted = eligible && state.enabled && !state.suspended
      targetVolume = state.dialoguePlaying ? finaleBgmDialogueVolume : finaleBgmVolume
      if (!eligible) release()
      else if (!wanted) pause()
      else play()
    },
    retry() { play() },
    dispose() { if (disposed) return; disposed = true; wanted = false; release() },
  }
}
