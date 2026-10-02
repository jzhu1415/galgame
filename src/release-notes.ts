import type { Language } from './story'

// Every major content update gets a new ID and player-facing notes in both languages.
export const latestRelease = {
  id: '2026-10-02',
  title: { zh: '剧场启幕，海边来信', en: 'The Curtain Rises, the Tide Writes' },
  intro: {
    zh: '第三章与恋爱番外现已开放。新的旅程、新的分镜，也有更顺手的探索体验。',
    en: 'Chapter three and a new romance story are here, with more illustrated moments and smoother exploration.',
  },
  items: [
    {
      tag: 'CHAPTER 03',
      title: { zh: '奶粉登场 · 血色交易', en: 'Meet Naifen · The Crimson Bargain' },
      body: { zh: '进入血肉剧场，辨认记忆并作出交易选择。新增多个剧情分支与三种结局，搭配更多场景分镜和奶粉的不同神态。', en: 'Enter the Flesh Theatre, identify memories and choose your bargain. Explore branching paths and three endings, with new scene illustrations and Naifen expressions.' },
    },
    {
      tag: 'ROMANCE DLC',
      title: { zh: '潮汐写给你的信', en: 'A Letter from the Tide' },
      body: { zh: '与奶蛙一起度过两天一夜的海边旅行。四段约会、不同出行选择与雨天路线，新增十张角色特写，让每个亲密瞬间都有自己的画面。可在第一章详情页观看视频解锁。', en: 'Spend two days by the sea with Naiwa. Enjoy four dates, travel choices and a rainy-day route, with ten new character close-ups. Watch the unlock video from the chapter one page to enter.' },
    },
    {
      tag: 'STORY MAP',
      title: { zh: '更清楚的剧情树与回放', en: 'Explore the story map and replay' },
      body: { zh: '第三章剧情树采用第一章的画布风格，可拖动、缩放和查看结局。已记录检查点的节点可确认后重玩；各章详情页也能预览路线和查看对白记录。', en: 'Chapter three uses the familiar chapter one canvas, with pan, zoom and ending galleries. Replay saved checkpoints after confirmation, and preview routes or read dialogue logs from chapter pages.' },
    },
    {
      tag: 'EXPLORATION',
      title: { zh: '镜馆探索更轻巧', en: 'A clearer view of the mirror hall' },
      body: { zh: '手机端镜馆左上角保留小地图，精简探索界面；删除密码破译环节，拾取线索后自然推进通路。第二章也增加了新的剧情画面。', en: 'The mobile mirror hall keeps a small map at the top left with a lighter interface. Cipher puzzles have been removed so collected clues advance the route naturally. Chapter two also gains new story illustrations.' },
    },
    {
      tag: 'VOICE & ART',
      title: { zh: '更多声音，更一致的角色', en: 'More voice variety, consistent characters' },
      body: { zh: '奶粉沿用奶蛙的声音，角色语音轮换播放，减少同一片段反复出现。新增角色画面逐张对照原始参考图，保持外形与画风一致。', en: 'Naifen shares Naiwa’s voice, with rotating clips to reduce repetition. New character illustrations are checked against the original references to preserve their appearance and style.' },
    },
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
  return `<div class="release-intro"><p class="release-date">UPDATE / ${release.id.replaceAll('-', '.')}</p><h3>${escapeHtml(release.title[language])}</h3><p>${escapeHtml(release.intro[language])}</p></div>
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
  dialog.innerHTML = `<header class="dialog-head"><h2 id="release-dialog-title">${language === 'zh' ? '更新内容' : 'What’s new'}</h2><button class="small-btn" data-release-close type="button" autofocus aria-label="${language === 'zh' ? '关闭更新内容' : 'Close update notes'}">${language === 'zh' ? '关闭' : 'Close'} ×</button></header>
    <div class="release-body">${renderReleaseNotes(language)}</div>
    <footer class="release-footer"><p>${language === 'zh' ? '可随时在首页重新查看更新内容。' : 'You can read these notes again from the home page.'}</p><button class="primary-btn" data-release-close type="button">${language === 'zh' ? '开始旅程' : 'Let’s begin'} ↗</button></footer>`
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
