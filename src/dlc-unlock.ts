import type { Language } from './story'
import { DLC_REQUIRED_VIEWS, DLC_WATCH_KEY, DlcWatchSession, loadDlcViews, isRomanceDlcUnlocked, redeemDlcKey } from './dlc-unlock-progress'
export { isRomanceDlcUnlocked, loadDlcViews } from './dlc-unlock-progress'

export function showDlcUnlock(root: HTMLElement, language: Language, onUnlocked: () => void, onProgress: () => void) {
  root.querySelector<HTMLDialogElement>('#dlc-unlock-dialog')?.close()
  const text = (zh: string, en: string) => language === 'zh' ? zh : en
  const focus = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.id = 'dlc-unlock-dialog'
  dialog.className = 'app-dialog dlc-unlock-dialog'
  dialog.setAttribute('aria-labelledby', 'dlc-unlock-title')
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dlc-unlock-title">${text('解锁恋爱 DLC', 'Unlock the romance DLC')}</h2><button class="small-btn" data-close>${text('返回', 'Back')} ×</button></div><p>${text('完整观看这段视频 3 遍，即可解锁《潮汐写给你的信》。已完成的次数会保存。', 'Watch this video in full three times to unlock A Letter from the Tide. Completed views are saved.')}</p><video class="dlc-unlock-video" src="/video/romance-dlc-unlock.mp4" controls playsinline preload="metadata" controlslist="nodownload noplaybackrate" disablepictureinpicture></video><div class="dlc-unlock-progress" role="status" aria-live="polite"></div><div class="dlc-unlock-actions"><button class="primary-btn" data-play></button><button class="primary-btn" data-enter hidden>${text('进入 DLC', 'Enter DLC')} ↗</button></div><p class="dlc-unlock-hint">${text('跳到片尾不会计数。可以暂停，完整看完后再播放下一遍。', 'Skipping to the end does not count. You can pause, then finish the video and start the next viewing.')}</p>`
  root.append(dialog)
  dialog.insertAdjacentHTML('beforeend', `<form class="dlc-key-form"><label for="dlc-key-input">${text('输入密钥', 'Enter unlock key')}</label><div><input id="dlc-key-input" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required aria-describedby="dlc-key-message"><button class="small-btn" type="submit">${text('解锁', 'Unlock')}</button></div><p id="dlc-key-message" role="status" aria-live="polite"></p></form>`)
  const content = document.createElement('div')
  content.className = 'dlc-unlock-content'
  Array.from(dialog.children).slice(1).forEach(element => content.append(element))
  dialog.append(content)
  const video = dialog.querySelector<HTMLVideoElement>('video')!
  const status = dialog.querySelector<HTMLElement>('.dlc-unlock-progress')!
  const play = dialog.querySelector<HTMLButtonElement>('[data-play]')!
  const enter = dialog.querySelector<HTMLButtonElement>('[data-enter]')!
  let views = loadDlcViews()
  let session = new DlcWatchSession()
  let completed = false
  const draw = () => {
    const unlocked = isRomanceDlcUnlocked()
    status.textContent = unlocked ? text('DLC 已解锁', 'DLC unlocked') : `${text('完整观看', 'Completed views')} ${views} / ${DLC_REQUIRED_VIEWS}`
    play.hidden = unlocked
    enter.hidden = !unlocked
    play.textContent = text(`播放第 ${views + 1} 遍`, `Play viewing ${views + 1}`)
  }
  const sample = () => session.sample(video.currentTime, performance.now(), document.visibilityState === 'visible', video.playbackRate)
  video.addEventListener('playing', () => {
    if (completed) { session = new DlcWatchSession(); completed = false }
    session.start(video.currentTime, performance.now())
  })
  video.addEventListener('timeupdate', () => { if (!video.seeking) sample() })
  video.addEventListener('seeked', () => session.start(video.currentTime, performance.now()))
  video.addEventListener('ratechange', () => { if (video.playbackRate !== 1) video.playbackRate = 1 })
  video.addEventListener('ended', () => {
    if (completed) return
    sample()
    if (views < DLC_REQUIRED_VIEWS && session.finish(video.duration)) {
      views++
      try { localStorage.setItem(DLC_WATCH_KEY, JSON.stringify(views)) } catch {
        views--
        session = new DlcWatchSession()
        status.textContent = text('浏览器无法保存观看次数，请允许本地存储后重试。', 'The browser cannot save views. Allow local storage and try again.')
        return
      }
      completed = true
      draw(); onProgress()
    } else if (views < DLC_REQUIRED_VIEWS) {
      status.textContent = text('这遍未完整观看，请从头播放。', 'This viewing was incomplete. Please play from the beginning.')
    }
  })
  play.addEventListener('click', () => {
    video.pause(); video.currentTime = 0; session = new DlcWatchSession(); completed = false
    session.start(0, performance.now())
    void video.play().catch(() => { status.textContent = text('播放失败，请点击视频的播放按钮重试。', 'Playback failed. Try the video’s play button.') })
  })
  enter.addEventListener('click', () => { if (!isRomanceDlcUnlocked()) return; dialog.close(); onUnlocked() })
  dialog.querySelector<HTMLFormElement>('.dlc-key-form')!.addEventListener('submit', event => {
    event.preventDefault()
    const input = dialog.querySelector<HTMLInputElement>('#dlc-key-input')!
    const message = dialog.querySelector<HTMLElement>('#dlc-key-message')!
    const result = redeemDlcKey(input.value)
    input.setAttribute('aria-invalid', String(result === 'invalid'))
    if (result === 'invalid') { message.textContent = text('密钥不正确，请重试。', 'Incorrect key. Please try again.'); return }
    if (result === 'storage-error') { message.textContent = text('无法保存解锁状态，请允许本地存储后重试。', 'Unable to save the unlock. Allow local storage and try again.'); return }
    video.pause()
    input.value = ''
    message.textContent = text('密钥验证成功，已解锁 DLC。', 'Key accepted. DLC unlocked.')
    draw(); onProgress(); enter.focus()
  })
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); dialog.remove(); if (focus?.isConnected) focus.focus() }, { once: true })
  draw()
  dialog.showModal()
  return dialog
}
