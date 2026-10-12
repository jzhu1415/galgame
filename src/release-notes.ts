import type { Language } from './story'

// Every major content update gets a new ID and player-facing notes in both languages.
export const previousRelease = {
  id: '2026-10-09-continuous-finale-expanded-abyss',
  date: '2026-10-09',
  title: { zh: '第五章 · 终章：走到天亮', en: 'Chapter Five · Finale: Until dawn' },
  intro: { zh: '从无光深渊一路走向城市决战。追捕、实验区交锋与核心封锁连成同一章，接上完整影片与战后搜救。', en: 'Travel from the lightless depths to the city battle. Pursuit, laboratory clashes and the core blockade form one continuous chapter, followed by the complete film and aftermath rescue.' },
  items: [
    { tag: 'FINALE', title: { zh: '一章连续的最后旅程', en: 'One continuous final journey' }, body: { zh: '原第五章与终章合并，取消中途切章。线索、精神力与选择一路保留，调查、危险分支与后续剧情完整相连。', en: 'Chapter five and the finale are combined, with no chapter break. Evidence, spirit and choices stay with you through investigations, dangerous branches and the continuing story.' } },
    { tag: 'CONFRONTATIONS', title: { zh: '追捕、交锋与突破封锁', en: 'Pursuit, clashes and breaking the blockade' }, body: { zh: '香蕉猫封路追捕、肥嘟嘟实验区交锋和牛来的核心封锁加入连续应对选择。观察环境、躲避攻击与拆除装置都会影响后续状态；鲁莽行动可能失败。', en: 'Banana Cat’s pursuit, Fat Dudu’s laboratory clash and Niulai’s core blockade now have consecutive tactical choices. Read the environment, evade attacks and disable devices; reckless actions can fail.' } },
    { tag: 'CHARACTERS & ART', title: { zh: '组织成员与角色特写', en: 'Institute members and character close-ups' }, body: { zh: '牛来、香蕉猫、奶豆与黑化肥嘟嘟正式进入剧情。新增六张透明立绘、十张场景与二十三张非对战分镜及特写，开场深渊补上多角度分镜，覆盖调查、情绪与战后段落；可点击“看图”查看完整画面。', en: 'Niulai, Banana Cat, Naidou and dark Fat Dudu join the story. Six transparent sprites, ten locations and twenty-three noncombat shots cover investigation, emotion and aftermath. View art opens the complete image.' } },
    { tag: 'BATTLE FILM', title: { zh: '城市决战与战后搜救', en: 'City battle and aftermath rescue' }, body: { zh: '决战播放提供的完整原片，播完自动继续废墟中的搜救与调查。支持暂停、全屏与明确跳过；浏览器阻止播放时可手动启动。', en: 'The battle plays the complete supplied film, then continues into rescue and investigation in the ruins. Pause, go fullscreen or explicitly skip; manual playback is available if autoplay is blocked.' } },
    { tag: 'VOICES', title: { zh: '中英文逐句朗读', en: 'Bilingual line readings' }, body: { zh: '旁白、玩家和组织成员配有逐句朗读。奶蛙、奶霸及肥嘟嘟沿用原声片段，原声可能与字幕不逐字对应。可调节对白与影片音量。', en: 'Narration, player dialogue and institute members have line readings. Naiwa, Naiba and Fat Dudu use original clips that may not match subtitles word for word. Dialogue and film volume can be adjusted.' } },
    { tag: 'STORY MAP', title: { zh: '完整剧情树与首次抵达回放', en: 'Complete map and checkpoint replay' }, body: { zh: '沿用统一剧情树，保留调查、失败、分支与回流。回放恢复首次抵达的线索和精神力；详情页预览不推进剧情，重玩保留解锁记录。', en: 'The shared story map retains investigations, failures, branches and loops. Replay restores first-arrival evidence and spirit. Detail-page previews leave progress unchanged, and replays keep unlocks.' } },
  ],
}

export const latestRelease = {
  id: '2026-10-11-all-chapter-dialogue-themes',
  date: '2026-10-11',
  title: { zh: '每一章，都有自己的颜色', en: 'A different color for every chapter' },
  intro: {
    zh: '五章主线与海岸番外都有不同的对白外框。底色和画面遮罩更通透，角色与场景更清楚；章节剧情树同步配色，终章仍保留影片后的破损变化。',
    en: 'All five main chapters and the coastal story have distinct dialogue frames. Lighter panel fills and scene shading bring characters and backgrounds into view. Chapter maps follow their palettes, and the finale retains its post-film damage.',
  },
  items: [
    { tag: 'CHAPTER COLORS', title: { zh: '日记、冰镜、剧场与金色画框', en: 'A journal, ice, theatre and a gilded frame' }, body: { zh: '第一章用暖黄日记纸页，第二章用冰蓝晶面，第三章用酒红票券，第四章用金色油画框。最终章保留深蓝金色与战后破损，海岸番外用青绿色旅行卡；姓名牌与回应按钮也随章节变化。降低背景填充和画面遮罩的不透明度，文字、焦点和操作保持清晰。', en: 'Chapter one uses warm journal paper, two icy facets, three wine-red tickets and four a golden painting frame. The finale keeps midnight blue, gold and post-battle scars; the coastal story has a teal travel card. Nameplates and response buttons follow each chapter. More translucent fills and lighter shading preserve clear text, focus and controls.' } },
    { tag: 'FAT DUDU', title: { zh: '把黑化过程接成一段经历', en: 'A clearer progression for Fat Dudu' }, body: { zh: '第二章增加离别时的担忧与组织接触；终章通过查看原片、请求暂停、面对读数和亲口回应，补足情绪与行为递进。停机、苏醒和影片前的对白衔接更清楚，中英文与相关朗读同步。', en: 'Chapter Two adds anxiety at parting and contact with the institute. Finale scenes develop through checking the original footage, requesting a pause, facing the readings and answering directly. Shutdown, awakening and pre-film dialogue connect more clearly, with bilingual text and corresponding readings updated.' } },
    { tag: 'FINALE STORY MAP', title: { zh: '剧情树也留下同一场雨后的痕迹', en: 'A story map that shares the same scars' }, body: { zh: '最终章剧情树的标题、图例、缩放工具、节点和结局图鉴跟随对白配色。影片后外框出现裂痕与磨损，分支画布保持完整可读；回放战前节点恢复深蓝外框。介绍页预览与游戏内使用同一套主题判断，不改动解锁和存档。', en: 'The finale map’s heading, legend, zoom controls, nodes and ending gallery follow the dialogue palette. After the film, the exterior gains cracks and wear while the canvas stays fully readable. Pre-battle replay restores the blue frame. Previews and gameplay use the same theme rules without changing unlocks or saves.' } },
    { tag: 'EARLIER STORY', title: { zh: '先在病房认识他们', en: 'Meet them first in the ward' }, body: { zh: '第二章补入三人的病房交班、设备记录与电梯签单；第三章再次接触，并把探针、同意书和后台交接连起来。前章通过实际操作认识人物，终章以重逢对白回应之前的经历。', en: 'Chapter Two introduces all three through ward handover, equipment records and lift forms. Chapter Three reconnects them through the probe, consent form and backstage handoff. Their actions establish them before finale reunions recall those encounters.' } },
    { tag: 'NEW FRAMES', title: { zh: '重新绘制前章角色分镜', en: 'New earlier-chapter character frames' }, body: { zh: '使用角色原始三视图与场景参考，新绘病房交班、香蕉猫调阅监控、剧场后台交接三张画面。终章在认出旧人的句子切入对应前章画面，再返回现场；中英文与相关朗读同步。', en: 'Three new frames use original character turnarounds and scene references: ward handover, Banana Cat at the monitor, and the backstage handoff. Finale recognition lines briefly recall their earlier frames before returning to the present, with bilingual text and corresponding readings aligned.' } },
    { tag: 'FINALE DIALOGUE', title: { zh: '完整的外框，与城市留下的裂痕', en: 'An intact frame, then the city’s scars' }, body: { zh: '最终章采用冷蓝半透明对白框、独立姓名牌、金色继续按钮与编号回应。影片结束后外框切换为灰烬暖色，边角出现缺口、细裂纹与磨损；正文、焦点和操作区保持完整。回放战前节点会恢复原有完整外框，这种破损变化用于最终章。', en: 'The finale uses cool-blue translucent dialogue, separate nameplates, gold continue buttons and numbered responses. After the film, the frame turns ash-warm with chips, fine cracks and wear while text, focus and controls stay intact. Replaying a pre-battle node restores the intact frame. This damage treatment belongs to the finale.' } },
    { tag: 'SHARED INTERFACE', title: { zh: '剧情树与更新内容一起焕新', en: 'Refreshed story maps and update notes' }, body: { zh: '剧情树采用黄白档案弹窗、清晰状态图例、回放数量与当前节点定位，五章保持同一套画布。更新说明改为黄白分栏、编号条目和固定关闭区，支持手机与键盘操作。主页移除第一章专属的剧情树、结局图鉴和重玩菜单；对应功能仍在章节内保留。', en: 'Story maps use a yellow-and-white archive, a status legend, replay counts and current-node centering, with the same canvas across all five chapters. Update notes have numbered entries and a fixed dismissal area for phones and keyboards. First-chapter map, ending-gallery and restart shortcuts are removed from the home and remain inside the chapter.' } },
    { tag: 'WHOLE-GAME RECORDS', title: { zh: '看见整个游戏的规模', en: 'See the scale of the whole game' }, body: { zh: '制作记录扩展为全作中文剧情字数、剧情节点、对白与旁白、剧情画面与立绘四项。共享画面去重，终章只统计一次；大字排版和千位分隔更易读，减少动态时直接显示完整数字。', en: 'Production records now cover Chinese story characters, story nodes, dialogue and narration entries, and story images and portraits across the whole game. Shared images are deduplicated and the merged finale counts once. Large type and thousands separators improve readability; reduced motion shows complete totals immediately.' } },
    { tag: 'EARLIER ENCOUNTERS', title: { zh: '病房值班台与入院接待', en: 'The ward desk and reception' }, body: { zh: '第二章中，香蕉猫作为监控与门禁工作人员帮忙开门、调阅录像并报上名字；第三章回到病房时再次碰面。沿用完整香蕉壳的角色立绘，后续相遇通过对白认出同一个人。', en: 'In chapter two, Banana Cat introduces itself as the cameras-and-access attendant, opens a door and retrieves footage. You meet again on returning to the ward in chapter three. Its intact-peel portrait accompanies these scenes, and later dialogue recognizes the same person.' } },
    { tag: 'FIRST ENCOUNTERS', title: { zh: '认识眼前的人', en: 'Meet the person in front of you' }, body: { zh: '牛来和奶豆在初遇中说明姓名与工作，香蕉猫重逢时补上更完整的职责；玩家会追问身份与来意。肥嘟嘟补上镜馆旧识的关系。出场时显示简短姓名、职务与现场说明，面对面再接上先前广播或录像中的人，不透露后续经历。', en: 'Niulai and Naidou introduce their names and work. Banana Cat explains its broader role at the reunion, and the player asks about authority and intentions. Fat Dudu’s mirror-hall connection is explained. Brief name, role and scene notes accompany their dialogue; later meetings connect to the earlier broadcast or recording without revealing future events.' } },
    { tag: 'INVESTIGATION FRAMES', title: { zh: '让记录变成看得见的画面', en: 'Records you can see' }, body: { zh: '新增六张非对战调查分镜：档案时间轴、烧焦照片、走廊监控、签名值班表、实验区入口与抽取读数。逐句切换画面，沿用连续阅读与“看图”，减少同一背景长时间停留。', en: 'Six new noncombat investigation frames show the archive timeline, burned photograph, corridor monitor, signed roster, laboratory entrance and extraction readings. Frames change with dialogue, retaining continuous reading and View art.' } },
    { tag: 'ENTRANCE FIX', title: { zh: '镜头接通后的相遇', en: 'An encounter after the feed connects' }, body: { zh: '终章与香蕉猫重逢前先交代信标、异常路标和监控镜头，玩家接通后才看见操作室里的它。修复立绘提前显示与战前误用战后背景图片的问题，并同步这段中英文朗读。', en: 'The finale reunion with Banana Cat establishes the beacon, altered sign and tracking camera before the player connects its control-room feed. Portraits no longer appear ahead of their dialogue, post-battle art stays out of pre-battle scenes, and both language readings are updated.' } },
    { tag: 'CHARACTER ENTRANCES', title: { zh: '先听见，再见到', en: 'Hear them before meeting them' }, body: { zh: '补充广播、监控和录像中的露面，再衔接组织成员的现场出场；人物分工通过各自的操作呈现。肥嘟嘟增加信任、迟疑与固执的递进对白，以及一张争论中的神态特写。', en: 'Broadcast, surveillance and recorded appearances lead into institute members arriving in person, with their roles shown through what they do. Fat Dudu gains dialogue progressing through trust, doubt and stubbornness, plus an expression close-up during an argument.' } },
    { tag: 'MEMORY & VOICES', title: { zh: '回忆与英文名称同步', en: 'Memories and English naming aligned' }, body: { zh: '“回忆 · 记忆画廊”改用当前第四章的拼图画廊画面。肥嘟嘟英文名统一为 Fat Dudu；相关英文朗读及新增旁白、玩家和组织成员对白同步更新。', en: 'Memory · The memory gallery now uses the current chapter-four puzzle gallery. The English name is consistently Fat Dudu, with updated English readings and new narration, player and institute dialogue.' } },
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
    <ol class="release-list">${release.items.map((item, index) => `<li><span class="release-item-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="release-item-copy"><span class="release-tag">${item.tag}</span><h4>${escapeHtml(item.title[language])}</h4><p>${escapeHtml(item.body[language])}</p></div></li>`).join('')}</ol>`
}

export function showReleaseNotes(root: HTMLElement, language: Language, automatic = false): HTMLDialogElement | null {
  if (automatic && !shouldShowReleaseNotes()) return null
  // Avoid stacking native modal dialogs (including confirmations and route previews).
  if (root.querySelector('dialog[open]')) return null
  const focusBeforeOpen = document.activeElement as HTMLElement | null
  const dialog = document.createElement('dialog')
  dialog.className = 'app-dialog release-dialog'
  dialog.lang = language === 'zh' ? 'zh-CN' : 'en'
  dialog.setAttribute('aria-labelledby', 'release-dialog-title')
  dialog.innerHTML = `<header class="dialog-head"><div class="release-heading"><p class="release-eyebrow">NAIWA / RELEASE NOTES</p><h2 id="release-dialog-title">${language === 'zh' ? '更新内容' : 'What\'s new'}</h2></div><button class="small-btn" data-release-close type="button" autofocus aria-label="${language === 'zh' ? '关闭更新内容' : 'Close update notes'}">${language === 'zh' ? '关闭' : 'Close'} ×</button></header>
    <div class="release-body">${renderReleaseNotes(language)}</div>
    <footer class="release-footer"><p>${language === 'zh' ? '可随时在首页重新查看更新内容。' : 'You can read these notes again from the home page.'}</p><button class="primary-btn" data-release-close type="button">${language === 'zh' ? '知道了' : 'Got it'} ✓</button></footer>`
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
