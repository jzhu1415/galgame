import type { Language } from './story'

// Every major content update gets a new ID and player-facing notes in both languages.
export const previousRelease = {
  id: '2026-10-09-continuous-finale-expanded-abyss',
  date: '2026-10-09',
  title: { zh: '第五章 · 终章：走到天亮', en: 'Chapter Five · Finale: Until dawn' },
  intro: { zh: '从无光深渊一路走向城市决战。追捕、实验区交锋与核心封锁连成同一章，接上完整影片与战后搜救。', en: 'Travel from the lightless depths to the city battle. Pursuit, laboratory clashes and the core blockade form one continuous chapter, followed by the complete film and aftermath rescue.' },
  items: [
    { tag: 'FINALE', title: { zh: '一章连续的最后旅程', en: 'One continuous final journey' }, body: { zh: '原第五章与终章合并，取消中途切章。线索、精神力与选择一路保留，调查、危险分支与后续剧情完整相连。', en: 'Chapter five and the finale are combined, with no chapter break. Evidence, spirit and choices stay with you through investigations, dangerous branches and the continuing story.' } },
    { tag: 'CONFRONTATIONS', title: { zh: '追捕、交锋与突破封锁', en: 'Pursuit, clashes and breaking the blockade' }, body: { zh: '香蕉猫封路追捕、肥嘟嘟实验区交锋和牛来的核心封锁加入连续应对选择。观察环境、躲避攻击与拆除装置都会影响后续状态；鲁莽行动可能失败。', en: 'Banana Cat’s pursuit, Feidudu’s laboratory clash and Niulai’s core blockade now have consecutive tactical choices. Read the environment, evade attacks and disable devices; reckless actions can fail.' } },
    { tag: 'CHARACTERS & ART', title: { zh: '组织成员与角色特写', en: 'Institute members and character close-ups' }, body: { zh: '牛来、香蕉猫、奶豆与黑化肥嘟嘟正式进入剧情。新增六张透明立绘、十张场景与二十三张非对战分镜及特写，开场深渊补上多角度分镜，覆盖调查、情绪与战后段落；可点击“看图”查看完整画面。', en: 'Niulai, Banana Cat, Naidou and dark Feidudu join the story. Six transparent sprites, ten locations and twenty-three noncombat shots cover investigation, emotion and aftermath. View art opens the complete image.' } },
    { tag: 'BATTLE FILM', title: { zh: '城市决战与战后搜救', en: 'City battle and aftermath rescue' }, body: { zh: '决战播放提供的完整原片，播完自动继续废墟中的搜救与调查。支持暂停、全屏与明确跳过；浏览器阻止播放时可手动启动。', en: 'The battle plays the complete supplied film, then continues into rescue and investigation in the ruins. Pause, go fullscreen or explicitly skip; manual playback is available if autoplay is blocked.' } },
    { tag: 'VOICES', title: { zh: '中英文逐句朗读', en: 'Bilingual line readings' }, body: { zh: '旁白、玩家和组织成员配有逐句朗读。奶蛙、奶霸及肥嘟嘟沿用原声片段，原声可能与字幕不逐字对应。可调节对白与影片音量。', en: 'Narration, player dialogue and institute members have line readings. Naiwa, Naiba and Feidudu use original clips that may not match subtitles word for word. Dialogue and film volume can be adjusted.' } },
    { tag: 'STORY MAP', title: { zh: '完整剧情树与首次抵达回放', en: 'Complete map and checkpoint replay' }, body: { zh: '沿用统一剧情树，保留调查、失败、分支与回流。回放恢复首次抵达的线索和精神力；详情页预览不推进剧情，重玩保留解锁记录。', en: 'The shared story map retains investigations, failures, branches and loops. Replay restores first-arrival evidence and spirit. Detail-page previews leave progress unchanged, and replays keep unlocks.' } },
  ],
}

export const latestRelease = {
  id: '2026-10-10-sunshine-home-character-workbench',
  date: '2026-10-10',
  title: { zh: '黄白新主页：角色与制作手记', en: 'A sunny home: cast and making of' },
  intro: {
    zh: '主页换上黄色与白色，成为可以翻看的项目介绍。认识角色、预览五章，再沿着时间线看看这个故事如何诞生。已有存档与章节入口继续保留。',
    en: 'A yellow-and-white home introduces the project through character cards, five chapter previews and a production timeline. Existing saves and chapter entrances remain available.',
  },
  items: [
    { tag: 'PROJECT INTRODUCTION', title: { zh: '从一场雨，走到最后一页', en: 'From the rain to the last page' }, body: { zh: '黄色纸页、白色留白和奶蛙立绘组成新开场，故事照片可以展开。五章改为图文分栏预览，支持点按、方向键和手机横向滑动；展开玩法介绍，再进入对应章节。', en: 'Yellow paper, white space and Naiwa introduce the story, with stills that open at full size. Five split-image chapter previews support buttons, arrow keys and horizontal phone swipes. Open the gameplay notes, then enter a chapter.' } },
    { tag: 'MAKING OF', title: { zh: '看见制作的每一步', en: 'See how it was made' }, body: { zh: '保留七个依据提交与制作记录整理的节点。工作台新增时间滑杆、前后切换、场景与手记双视图和大图查看，时间线可以一键展开或收起。', en: 'Seven milestones follow repository history and production notes. A date slider, previous and next controls, scene and notebook views, and full-size images make the workbench interactive. Expand or collapse the entire timeline at once.' } },
    { tag: 'HOME INTERACTIONS', title: { zh: '随阅读展开的画面', en: 'Frames that unfold as you read' }, body: { zh: '点击奶蛙可以打招呼，角色介绍只保留奶蛙与奶霸，支持点按和方向键，文案避免透露后续身份与经历。档案里的入口可以定位对应章节预览。切换语言或返回主页保留章节、角色、时间节点与阅读位置；浏览这些内容不会改动存档或播放对白。支持手机、全屏、键盘与减少动态效果。', en: 'Tap Naiwa to say hello, switch between brief, spoiler-conscious Naiwa and Naiba cards with buttons or arrow keys, and use a card to find its chapter preview. Language changes and returns preserve the chapter, character, milestone and reading position. Browsing leaves saves and dialogue audio untouched. Phone, fullscreen, keyboard and reduced-motion support remain.' } },
    { tag: 'EMOTIONAL SEQUENCE', title: { zh: '逐句展开的近景分镜', en: 'A close-up sequence across dialogue' }, body: { zh: '为后半段的重要时刻再补六张非对战特写，镜头从手部与身体细节移向眼神，再回到眼前的场景。沿用原始角色形象与废墟环境，可随时点击“看图”查看完整画面。', en: 'Six more noncombat close-ups expand a key late sequence, moving from hands and body details to the eyes and back to the scene. Original character designs and the ruined setting are retained. View art opens the complete frame.' } },
    { tag: 'CLOSE-UPS & MEMORIES', title: { zh: '更近的表情，更清楚的回忆', en: 'Closer expressions, clearer memories' }, body: { zh: '新增六张非对战特写，补足表情、手部与日记细节。八张前章旧图随对应对白切入，标注“回忆”，再切回眼前的场景；“看图”可查看完整画面。', en: 'Six new noncombat close-ups add expressions, hands and journal details. Eight earlier chapter images appear with matching lines and a Memory label, then return to the present. View art opens the complete frame.' } },
    { tag: 'AFTERMATH MUSIC', title: { zh: '战后的轻声配乐', en: 'Quiet music after the battle' }, body: { zh: '影片结束后的剧情沿用宣传页主题曲，轻声淡入，对白播放时再降低音量。逐句阅读时音乐连续播放，声音开关可以一并关闭；打开面板或切到后台会暂停。', en: 'After-film scenes use the campaign theme with a quiet fade-in and a lower level during dialogue. Music continues across lines and follows the audio switch. Panels and background tabs pause playback.' } },
    { tag: 'FRAMING', title: { zh: '前半段角色更靠近你', en: 'Closer character framing' }, body: { zh: '放大无光深渊与实验区的角色立绘，向画面中部移动。手机竖屏与横屏同步调整，表情更清楚，保留底部对白与常驻工具栏。', en: 'Larger sprites move toward the center in the deep and laboratory. Portrait and landscape phone layouts follow suit, with clearer expressions and the dialogue and toolbar retained.' } },
    { tag: 'STORY', title: { zh: '争论与战后分镜衔接', en: 'Arguments and aftermath continuity' }, body: { zh: '视频前的交锋以争论展开，档案阅读改为连续推进，减少重复调查选项。补齐战后分镜及剧情树中的对应节点，城市决战继续使用提供的完整影片。', en: 'Pre-film confrontations unfold through arguments, and records advance consecutively with fewer repeated investigation choices. New aftermath shots and their map nodes are connected; the city battle uses the complete supplied film.' } },
    { tag: 'CAMPAIGN', title: { zh: '一条往下读的路线', en: 'One page, one descent' }, body: { zh: '页首是雨夜城市与缓慢视差，往下依次是序章、照片墙、五章回顾、未公开段落和开始区域。标题逐字出现，画面随滚动位移；中英文内容一致，手机与全屏都能读。', en: 'A rainy skyline opens the page with slow parallax, followed by the prologue, a still wall, the five chapters, a withheld section and the start area. The title arrives character by character and the plates drift as you scroll. Both languages and phone layouts are covered.' } },
    { tag: 'STILLS', title: { zh: '会循环的照片墙', en: 'A still wall that loops' }, body: { zh: '八张不剧透的终章画面做成相纸，首尾相接循环滚动，一直往同一个方向拖也不会划到头。点开可以看完整大图，也支持键盘方向键和页内左右按钮；照片进入视野后才显影。', en: 'Eight spoiler-free finale frames are laid out as prints that join end to end, so the wall never runs out however far you drag. Open one to see it full size, or use the arrow keys and the on-page buttons. Each print develops as it enters view.' } },
    { tag: 'THEME', title: { zh: '终章主题曲', en: 'A theme for the finale page' }, body: { zh: '中文版宣传页配上背景音乐，默认开启，标题栏里可以随时关掉。音乐淡入开始，接近结尾时淡出再接回开头循环，读得久也不会突然断在半句上。浏览器拦住自动播放时，第一次滚动或点按就会接上。', en: 'The Chinese campaign page now has a theme, on by default, with a switch in the header. It fades in, fades out towards the end and loops back to the top, so a long read never cuts mid-phrase. If the browser blocks autoplay, the first scroll or tap picks it up.' } },
    { tag: 'GATE', title: { zh: '拉到底，才解锁开始', en: 'The end of the page opens the chapter' }, body: { zh: '进入终章、重新开始和剧情树在读完这一页之前保持锁定，右下角显示阅读进度。滚到底部会自动解锁，同一个浏览器里不必再读一次。', en: 'Enter the finale, Restart and Story map stay locked until the page is read; a reading ring in the corner shows how far you are. Reaching the end unlocks them, and the same browser does not ask again.' } },
    { tag: 'NO SPOILERS', title: { zh: '这一页不讲结局', en: 'This page does not tell the ending' }, body: { zh: '宣传页只使用环境与角色画面，不放结局图、后台解谜路线和对抗画面；未公开段落只留下问号，等你到游戏里填。', en: 'Only environment and character art appears here: no ending frames, no puzzle solutions, no confrontation shots. The withheld section leaves question marks for the game to answer.' } },
    { tag: 'ACCESSIBILITY', title: { zh: '键盘、静态模式与轻量加载', en: 'Keyboard, quiet mode and light loading' }, body: { zh: '按钮和链接可以键盘操作并保留焦点样式；系统开启减少动态效果时改为静态图文。打开、拖动和看大图都不会推进剧情或写入存档；只想安静看画面，就在标题栏关掉音乐。', en: 'Every control is keyboard reachable with visible focus, and reduced-motion systems get a static layout. Opening, dragging and viewing art never advance the story or write a save; turn the theme off in the header if you would rather read in silence.' } },
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
