import type { Language } from './story'

// Every major content update gets a new ID and player-facing notes in both languages.
export const latestRelease = {
  id: '2026-10-09-chapter-four-oil-teaser',
  date: '2026-10-09',
  title: { zh: '奶神登场 · 金笼油画预告', en: 'Naishen enters the Gilded Cage' },
  intro: {
    zh: '下一段故事，来到金丝牢笼。第四章介绍页已开放，正式可玩章节仍在制作中。',
    en: 'The next story leads into the Gilded Cage. Its introduction is ready to explore; the playable chapter is still in development.',
  },
  items: [
    { tag: 'CHAPTER FOUR', title: { zh: '主页新增第四章入口', en: 'Chapter four on the home page' }, body: { zh: '点击《金笼》，查看第四章的故事开端与主题预告，无需通关前三章。', en: 'Choose The Gilded Cage to read its opening premise and themes. You can visit without finishing the first three chapters.' } },
    { tag: 'FIRST LOOK', title: { zh: '走近金丝牢笼', en: 'Step closer to the cage' }, body: { zh: '油画质感的金丝房间与奶神首次亮相，介绍关于留下与离开的第四层故事。支持中英文切换。', en: 'An oil-painted golden-thread room introduces Naishen and the fourth layer’s question of staying or leaving. Available in Chinese and English.' } },
    { tag: 'DEVELOPMENT', title: { zh: '故事仍在制作中', en: 'The story is in development' }, body: { zh: '本次开放的是介绍页。正式剧情、美术和可玩分支尚未开放，发布时间待定；可以从页尾返回前三章。', en: 'This update opens the introduction page. The script, artwork and playable branches are still to come, with no release date set. Return to the earlier chapters from the footer.' } },
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
