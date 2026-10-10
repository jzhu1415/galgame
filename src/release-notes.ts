import type { Language } from './story'

// Every major content update gets a new ID and player-facing notes in both languages.
export const latestRelease = {
  id: '2026-10-09-chapter-four-return-to-reality',
  date: '2026-10-09',
  title: { zh: '第四章《金笼》· 画境与现实', en: 'The Gilded Cage · Painting and reality' },
  intro: {
    zh: '帮奶神拼好那幅画，再说清楚为什么要回医院。第四章保留画作拼图，画廊与结局换上新分镜；视频播完自动接回剧情。',
    en: 'Help Naishen finish the painting, then explain why you need to return to the hospital. The painting puzzle now has new gallery and ending shots, and the film flows straight back into the story.',
  },
  items: [
    { tag: 'EPILOGUE', title: { zh: '从画境回到现实', en: 'From painting to reality' }, body: { zh: '新增同构图的原版 CG 风格病房画面，在返院尾声中从油画缓慢渐变，最后停留在现实质感。切换语言会保留过渡；减少动态效果时直接呈现最终画面。', en: 'A new hospital image in the original CG style matches the oil painting\'s composition. The hospital epilogue slowly dissolves into its realistic finish and stays there. Language changes retain the transition; reduced motion shows the final image directly.' } },
    { tag: 'STORY', title: { zh: '这一趟要做什么', en: 'Why you came here' }, body: { zh: '开场说明奶蛙仍在医院、你要带回第四层记忆，以及奶神为什么锁门。对白按行动顺序展开，日记随时提示当前目标。', en: 'The opening explains that Naiwa is still in the hospital, why you need the fourth memory, and why Naishen locks the door. Dialogue follows the actions, and the journal reminds you of your goal.' } },
    { tag: 'JIGSAW', title: { zh: '十二块画作拼图', en: 'A twelve-piece painting puzzle' }, body: { zh: '用画廊的群像画制作带凹凸边缘的拼图，替换三幅画调查和金线问答。支持拖动、点选和键盘选择，可查看原画与淡化参考；放错不扣精神力，进度自动保存。', en: 'Interlocking pieces of the gallery painting replace the three picture investigations and thread quizzes. Drag, select or use the keyboard, with a full reference and optional faint guide. Wrong placements cost no spirit; progress saves automatically.' } },
    { tag: 'FILM', title: { zh: '拼完，画里的影像开始', en: 'Complete the picture to start the film' }, body: { zh: '放好最后一片，立即全屏播放画作视频。可暂停、重看或跳过后继续剧情；浏览器阻止自动播放时，可点击播放或全屏。播放结束自动退出视频全屏、接回下一句剧情，打开弹窗或切到后台会暂停。', en: 'The last piece starts the painting\'s video fullscreen. Pause, replay or skip it to continue. If autoplay is blocked, click Play or Fullscreen. When the film ends, leave video fullscreen and continue the next line automatically. Panels and background tabs pause playback.' } },
    { tag: 'ART & VOICES', title: { zh: '油画分镜与双语声音', en: 'Oil paintings and bilingual audio' }, body: { zh: '新生成拼图画廊、画片与完整画作三张图，替换旧三画背景和物件照片。三个结局补上五张新分镜；新版对白配套 62 段中英文朗读。奶神与奶霸继续使用四段奶蛙原声轮换，原声不与字幕逐字对应。对白、视频与音效音量可调。', en: 'Three new puzzle gallery, piece and completed-painting shots replace the old gallery and object photos. Five new shots accompany the three endings, with 62 bilingual readings for the revised lines. Naishen and Naiba still rotate Naiwa\'s four original clips, which do not match subtitles word for word. Adjust dialogue, video and effects levels.' } },
    { tag: 'SAVES', title: { zh: '中途继续与剧情树回放', en: 'Resume and checkpoint replay' }, body: { zh: '沿用统一剧情树和结局图鉴。回放恢复首次抵达时的拼片、精神力与纸页状态。旧版结局保留，旧版进度另存备份，再从新版画廊开始；历史节点重访后才启用新版回放。', en: 'The shared story map and ending gallery remain. Replay restores first-arrival pieces, spirit and papers. Old endings are kept and old progress backed up before returning to the new gallery; revisits enable new replay checkpoints.' } },
  ],
}

export const releaseSeenKey = 'naiwa-release-notes-seen-v1'
let acknowledgedThisSession = false

export function shouldShowReleaseNotes(): boolean {
  if (acknowledgedThisSession) return false
  try { return localStorage.getItem(releaseSeenKey) !== latestRelease.id }
  catch { return true }
}

function acknowledgeRelease() {
  acknowledgedThisSession = true
  try { localStorage.setItem(releaseSeenKey, latestRelease.id) } catch { /* Session fallback for blocked storage. */ }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))

export function renderReleaseNotes(language: Language): string {
  const release = latestRelease
  return `<div class="release-intro"><p class="release-date">UPDATE / ${release.date.replaceAll('-', '.')}</p><h3>${escapeHtml(release.title[language])}</h3><p>${escapeHtml(release.intro[language])}</p></div>
    <ol class="release-list">${release.items.map(item => `<li><span class="release-tag">${item.tag}</span><h4>${escapeHtml(item.title[language])}</h4><p>${escapeHtml(item.body[language])}</p></li>`).join('')}</ol>`
}

export function showReleaseNotes(root: HTMLElement, language: Language, automatic = false): HTMLDialogElement | null {
  if (automatic && !shouldShowReleaseNotes()) return null
  // Avoid stacking native modal dialogs (including confirmations and route previews).
  if (root.querySelector('dialog[open]')) return null
  const focusBeforeOpen = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog release-dialog'
  dialog.setAttribute('aria-labelledby', 'release-dialog-title')
  dialog.innerHTML = `<header class="dialog-head"><h2 id="release-dialog-title">${language === 'zh' ? '更新内容' : 'What\'s new'}</h2><button class="small-btn" data-release-close type="button" autofocus aria-label="${language === 'zh' ? '关闭更新内容' : 'Close update notes'}">${language === 'zh' ? '关闭' : 'Close'} ×</button></header>
    <div class="release-body">${renderReleaseNotes(language)}</div>
    <footer class="release-footer"><p>${language === 'zh' ? '可随时在首页重新查看更新内容。' : 'You can read these notes again from the home page.'}</p><button class="primary-btn" data-release-close type="button">${language === 'zh' ? '开始旅程' : 'Let\'s begin'} ↗</button></footer>`
  dialog.querySelectorAll<HTMLButtonElement>('[data-release-close]').forEach(button => button.addEventListener('click', () => dialog.close()))
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })
  dialog.addEventListener('close', () => {
    acknowledgeRelease()
    dialog.remove()
    if (focusBeforeOpen?.isConnected) focusBeforeOpen.focus()
  }, { once: true })
  root.append(dialog)
  dialog.showModal()
  return dialog
}
