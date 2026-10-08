import type { Language } from './story'

// Every major content update gets a new ID and player-facing notes in both languages.
export const latestRelease = {
  id: '2026-10-06-game-stability-fixes',
  date: '2026-10-06',
  title: { zh: '稳定性与手机体验更新', en: 'Stability and mobile improvements' },
  intro: {
    zh: '切换语言、查看回顾和进入镜馆更顺畅了。手机上的按钮位置与存档提示也做了调整。',
    en: 'Language changes, dialogue history and mirror hall startup work more smoothly. Mobile controls and save notices have also been improved.',
  },
  items: [
    { tag: 'EXPLORATION', title: { zh: '切换语言，留在原地', en: 'Switch languages without losing your place' }, body: { zh: '镜馆里切换中英文会保留当前位置和正在走的通路，不再重新加载整个地图。', en: 'Switching languages in the mirror hall keeps your position and the route you are exploring, without reloading the map.' } },
    { tag: 'SAVES', title: { zh: '保存状态更清楚', en: 'Clearer save status' }, body: { zh: '第二章无法写入存档时，会提示进度仅保存在本次会话中，提醒你保持页面打开。', en: 'If chapter two cannot write a save, a notice explains that progress is kept for this page session only.' } },
    { tag: 'HISTORY', title: { zh: '回顾保留你的选择', en: 'History remembers your choices' }, body: { zh: '第二章回顾会显示你实际选择的分支台词，中英文切换也使用同一条记录。', en: 'Chapter two history shows the lines from your chosen branch. Both languages use the same recorded choices.' } },
    { tag: 'MOBILE', title: { zh: '按钮避开屏幕边缘', en: 'Controls clear of screen cutouts' }, body: { zh: '对白、工具栏和海边番外增加安全区间距，横屏和全屏时也避开刘海与底部手势区域。', en: 'Dialogue, toolbars and the coastal story now leave room for screen cutouts and the home gesture area in landscape and fullscreen views.' } },
    { tag: 'LOADING', title: { zh: '加载失败时可以重试', en: 'Retry when the hall cannot start' }, body: { zh: '镜馆启动失败时会显示说明和重试、返回入口。字体改为在页面显示后加载，慢连接下也能先进入故事。', en: 'If the mirror hall cannot start, it shows a message with retry and back controls. Fonts load after the page appears, so a slow connection does not hold up the story.' } },
    { tag: 'CHAPTER PAGES', title: { zh: '章节介绍与回放', en: 'Chapter introductions and replay' }, body: { zh: '三章详情页展示各自的场景与角色；第二章剧情树沿用统一画布，回放恢复已记录的线索和路线状态。', en: 'Each chapter page introduces its scenes and characters. Chapter two uses the shared story map, restoring recorded clues and choices when you replay a node.' } },
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
