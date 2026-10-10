import './home-page.css'
import type { Language } from './story'

type Copy = { zh: string; en: string }
const b = (zh: string, en: string): Copy => ({ zh, en })
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const number = (value: number) => String(value).padStart(2, '0')
export type HomeChapter = 1 | 2 | 3 | 4 | 5
export type HomeSnapshot = { scrollTop: number; chapter: HomeChapter; person?: number; milestone?: number; notes?: boolean }
export type HomeStatus = { started: boolean; completed: boolean }

export const homeChapters = [
  { id: 1, title: b('缘起', 'Origin'), art: 'P02', color: '#efd2a0', position: '50% 35%', theme: b('相遇 / 回忆', 'MEETING / MEMORY'), lead: b('故事从一场雨开始。', 'It begins with a rainy night.'), description: b('巷口的纸箱里，有一双望向你的绿眼睛。一起吃早餐、拍照片、写日记，然后走进一座仍在下雨的游乐园。', 'A pair of green eyes looks up from a box in the alley. Breakfast, photographs and a journal come before a fairground where the rain never stops.') },
  { id: 2, title: b('冰镜疑凶', 'The Culprit in the Ice'), art: 'chapter-02-ice-hall', color: '#a8e4f1', position: '50% 40%', theme: b('探索 / 追踪', 'EXPLORATION / TRACES'), lead: b('镜子记住的，未必是全部。', 'A mirror remembers only so much.'), description: b('从医院走进冰封的镜馆。在三维空间里寻找录像与镜片，沿着反射追踪那道紫色身影。', 'Leave the hospital for a frozen mirror hall. Explore its three-dimensional rooms, find footage and mirror fragments, and follow a purple figure through the reflections.') },
  { id: 3, title: b('血色交易', 'The Crimson Bargain'), art: 'chapter-03-cg-entrance', color: '#f0b1be', position: '50% 35%', theme: b('重演 / 选择', 'REPETITION / CHOICE'), lead: b('灯亮了，那出戏又开始了。', 'The lights come on. The play begins again.'), description: b('奶粉站在剧场里，熟悉的日常被编成一幕幕戏。留意那些不对劲的细节，听它说出自己的愤怒。', 'Naifen stands in a theatre where familiar days have become scenes in a play. Notice what does not fit, and hear the anger behind the performance.') },
  { id: 4, title: b('金笼', 'The Gilded Cage'), art: 'chapter-04-gilded-room', color: '#e9c78c', position: '50% 40%', theme: b('拼图 / 边界', 'A PAINTING / A BOUNDARY'), lead: b('有人把不舍，编成了笼子。', 'Someone has woven a cage out of attachment.'), description: b('熟悉的房间被金线围住。把十二块画片拼回原处，看看画里留下了什么，再说清楚为什么还要向前。', 'Golden threads surround a familiar room. Reassemble twelve pieces of a painting, see what it holds, and explain why you still need to go on.') },
  { id: 5, title: b('终章', 'Finale'), art: 'finale-city', color: '#a0dce8', position: '58% 40%', theme: b('深渊 / 城市', 'THE DEPTHS / THE CITY'), lead: b('最后一页，轮到你来翻。', 'The last page is yours to turn.'), description: b('从无光深渊走向档案室、实验区与城市天台。前面的选择一路保留，日记里还有没有写完的话。', 'Travel from the lightless depths through the records room and laboratory to the city rooftops. Earlier choices stay with you. There are still words left for the journal.') },
] as const

export const homePeople = [
  { name: b('奶蛙', 'Naiwa'), role: b('故事的主角', 'At the heart of the story'), art: 'finale-naiwa', chapter: 1, traits: b('绿眼睛 / 日记 / 相遇', 'GREEN EYES / JOURNAL / MEETING'), intro: b('从雨夜纸箱里探出头的那个小家伙。相处留下的早餐、照片和日记，后来都成了值得找回的记忆。', 'The little one peeking out of a box on a rainy night. Breakfasts, photographs and journal pages become memories worth finding again.'), note: b('第一章从相遇开始。先认识它，再慢慢走进它的世界。', 'Chapter one begins with a meeting. Get to know Naiwa before stepping into its world.') },
  { name: b('奶霸', 'Naiba'), role: b('旅程中的熟悉身影', 'A familiar figure along the way'), art: 'finale-naiba', chapter: 5, traits: b('相识 / 陪伴 / 旅程', 'MEETING / COMPANY / JOURNEY'), intro: b('旅程中一个值得记住的名字。先认识它，关于它的故事，留给相处的时光慢慢展开。', 'A name to remember along the journey. Get to know Naiba, and let its story unfold in time.'), note: b('这里只留一张简短的角色卡。它的身份与经历，等你在游戏里亲自了解。', 'This is just a brief character card. Discover its identity and experiences in the game.') },
] as const

const chapterPlay = [
  [b('对白选择与日常相处', 'Dialogue choices and everyday moments'), b('迷雾游乐园的物件探索', 'Object exploration in the mistbound fairground'), b('剧情分支与回忆收集', 'Branching paths and memory collection')],
  [b('三维镜馆自由探索', 'Explore the three-dimensional mirror hall'), b('拾取录像与镜片', 'Collect footage and mirror fragments'), b('键鼠或手机单摇杆操作', 'Mouse and keyboard or a phone joystick')],
  [b('跟随对白观察角色表情', 'Follow expressions through dialogue'), b('剧场重演与连续争论', 'Reenactments and arguments in the theatre'), b('在交易中做出选择', 'Make a choice in the bargain')],
  [b('十二块画片互动拼图', 'An interactive twelve-piece painting'), b('观察画作与房间变化', 'Watch the painting and room change'), b('讨论陪伴与边界', 'Discuss company and boundaries')],
  [b('连续剧情与角色特写', 'Continuous story and character close-ups'), b('完整城市决战影片', 'The complete city battle film'), b('旧图回忆与后续旅程', 'Earlier memories and the continuing journey')],
]

/** Dates come from repository history and production notes, not estimated work durations. */
export const homeTimeline = [
  { date: '2026-09-26', title: b('雨夜里的第一版', 'The first rainy-night build'), summary: b('第一章、分支剧情与回忆探索成形。', 'Chapter one, branching dialogue and memory exploration take shape.'), detail: b('从雨夜相遇开始，加入日常相处与迷雾游乐园。随后补上剧情树、全屏、物件热点和角色原声，让选择与画面一起推进。', 'The rainy meeting grows into everyday life and a mistbound fairground. A story map, fullscreen view, object hotspots and character recordings bring choices and images together.'), art: 'P02' },
  { date: '2026-09-27', title: b('走进冰封镜馆', 'Into the frozen mirror hall'), summary: b('第二章从对白走向三维探索。', 'Chapter two moves from dialogue into three-dimensional exploration.'), detail: b('镜馆加入移动、触控视角与物证拾取。之后继续调整镜面反射、冰晶与探索路线，让桌面和手机都能沿线找回片段。', 'Movement, touch look controls and evidence collection arrive in the hall. Reflections, crystals and routes are refined afterwards so desktop and phone players can recover the fragments.'), art: 'chapter-02-ice-hall' },
  { date: '2026-10-01', title: b('剧场与海边的两条路', 'The theatre and the coast'), summary: b('第三章与独立海边番外进入项目。', 'Chapter three and the separate coastal story join the project.'), detail: b('血肉剧场围绕重演与交易展开；海边番外让两天的旅程有自己的约会、探索与存档。角色分镜继续按原始参考补齐。', 'The theatre explores repetition and bargains, while the two-day coastal trip has its own dates, exploration and save. Character shots continue to follow the original references.'), art: 'dlc-coastal-shore-smile' },
  { date: '2026-10-02', title: b('让章节也有自己的开场', 'An opening for each chapter'), summary: b('章节介绍改成可以往下读的宣传页。', 'Chapter introductions become pages you can read down.'), detail: b('故事、场景与角色依次展开，加入页内导航、图片切换与滚动动效。介绍页保留真实章节入口，浏览画面不会推进剧情。', 'Story, locations and characters unfold through navigation, image changes and scroll effects. The pages keep the real chapter entrances, and viewing them leaves the story untouched.'), art: 'chapter-03-cg-entrance' },
  { date: '2026-10-06', title: b('把旅程接得更稳', 'A steadier journey'), summary: b('完善移动端、语言切换与存档恢复。', 'Phone controls, language changes and save recovery are refined.'), detail: b('镜馆切换语言时保留现场；手机横屏给对白和操作留出空间。浏览器无法保存时显示会话提示，加载失败时提供重试与返回。', 'The hall stays in place across language changes, and landscape phones leave room for dialogue and controls. Session warnings cover blocked storage, while loading failures offer retry and back actions.'), art: 'chapter-02-cg-three-mirrors' },
  { date: '2026-10-09', title: b('金笼与最后一页', 'The cage and the last page'), summary: b('第四章画作与终章宣传页继续展开。', 'The fourth chapter painting and finale campaign take shape.'), detail: b('金色房间与画作成为第四章的入口。终章宣传页延续长页叙事，加入照片墙、五章回顾与主题曲，为最后一段旅程铺好开场。', 'A golden room and painting introduce chapter four. The finale campaign extends the long-page format with a still wall, a five-chapter route and a theme for the final journey.'), art: 'chapter-04-gilded-room' },
  { date: '2026-10-10', title: b('继续补完，也继续打磨', 'Still adding, still refining'), summary: b('合并终章，补齐分镜、特写与回忆。', 'The finale is combined, with more shots, close-ups and memories.'), detail: b('第五章连成一段完整旅程，减少重复调查菜单。角色特写与旧图回忆随对白切换，影片和配乐接上后续场景；主页也重新整理成项目介绍。', 'Chapter five becomes one continuous journey with fewer repeated investigation menus. Close-ups and earlier memories follow the dialogue, film and music connect to later scenes, and this home page becomes a project introduction.'), art: 'finale-abyss-journal' },
] as const

const homePhotos = [
  { art: 'P02', title: b('相遇', 'The meeting'), note: b('一个纸箱，一双绿眼睛。', 'A box. A pair of green eyes.') },
  { art: 'R02_KITCHEN', title: b('日常', 'The everyday'), note: b('故事里，也留了一份早餐。', 'There is room in the story for breakfast.') },
  { art: 'chapter-02-ice-hall', title: b('另一侧', 'The other side'), note: b('熟悉的世界，开始长出裂缝。', 'Cracks appear in a familiar world.') },
]
const image = (art: string, alt: string, eager = false, className = '') => `<img class="${className}" src="/images/${art}.webp" alt="${esc(alt)}" width="1672" height="941" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`

export function renderHomePage(language: Language, statuses: HomeStatus[], selected: HomeChapter = 1, restored: HomeSnapshot = { scrollTop: 0, chapter: selected }): string {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const title = t('奶之救赎', 'Naiwa')
  const person = Math.max(0, Math.min(homePeople.length - 1, restored.person ?? 0))
  const milestone = Math.max(0, Math.min(homeTimeline.length - 1, restored.milestone ?? 0))
  const chars = Array.from(title).map((char, index) => `<span style="--i:${index}" aria-hidden="true">${esc(char)}</span>`).join('')
  return `<div class="home-launch" lang="${language === 'zh' ? 'zh-CN' : 'en'}">
    <a class="home-skip" href="#home-chapters" data-home-anchor>${t('跳到章节选择', 'Skip to chapters')}</a>
    <header class="home-header"><a href="#home-top" class="home-brand" data-home-anchor>naiwa<span>${t('奶之救赎', 'THE REDEMPTION')}</span></a>
      <nav class="home-nav" aria-label="${t('本页导航', 'On this page')}"><a href="#home-about" data-home-anchor>${t('故事', 'Story')}</a><a href="#home-people" data-home-anchor>${t('角色', 'Cast')}</a><a href="#home-chapters" data-home-anchor>${t('章节', 'Chapters')}</a><a href="#home-making" data-home-anchor>${t('制作过程', 'Making of')}</a></nav>
      <div class="home-tools"><button id="language" type="button" aria-label="${t('切换至英文', 'Switch to Chinese')}">${t('EN', '中文')}</button><details class="home-utility"><summary aria-label="${t('更多选项', 'More options')}"><span aria-hidden="true">＋</span></summary><div class="home-utility-menu"><button id="routes-select" type="button">${t('第一章剧情树', 'Chapter one story map')}</button><button id="settings-entry" type="button">${t('声音设置', 'Sound settings')}</button><button id="gallery-entry" type="button">${t('结局图鉴', 'Ending gallery')}</button>${statuses[0]?.started ? `<button id="replay-select" type="button">${t('重玩第一章', 'Restart chapter one')}</button>` : ''}<button id="fullscreen" type="button">${t('全屏', 'Fullscreen')}</button></div></details></div>
      <div class="home-reading" aria-hidden="true"><span></span></div>
    </header>
    <main>
      <section class="home-hero" id="home-top" tabindex="-1" aria-labelledby="home-title"><div class="home-hero-paper" aria-hidden="true"><span>hello,<br>naiwa!</span></div><button type="button" class="home-hello" data-home-hello aria-label="${t('和奶蛙打个招呼', 'Say hello to Naiwa')}"><img class="home-hero-character" src="/images/finale-naiwa.webp" alt="" width="1078" height="1459" decoding="async" fetchpriority="high"><span class="home-hello-hint">${t('戳一下，打个招呼', 'Tap to say hello')} ↗</span></button><p class="home-hello-bubble" data-home-greeting aria-live="polite">${t('你好呀，欢迎翻开这个故事。', 'Hello! Welcome to the story.')}</p><div class="home-hero-copy"><p class="home-eyebrow">A LITTLE WORLD TO EXPLORE / 2026</p><h1 id="home-title" aria-label="${esc(title)}">${chars}</h1><p class="home-hero-subtitle">${t('从一场雨，走到最后一页。', 'From the rain to the last page.')}</p><p class="home-hero-lead">${t('一段关于相遇、记忆与选择的故事。<br>五个章节，等你亲自走过。', 'A story of meetings, memories and choices.<br>Five chapters to walk through yourself.')}</p><div class="home-actions"><a class="home-primary" href="#home-chapters" data-home-anchor>${t('翻开章节', 'Explore the chapters')}<span aria-hidden="true">↗</span></a><a class="home-text-link" href="#home-making" data-home-anchor>${t('看看它如何诞生', 'See how it was made')}<span aria-hidden="true">↓</span></a></div></div><div class="home-hero-foot"><span>01 — 05 / ${t('中英双语互动叙事', 'A BILINGUAL VISUAL NOVEL')}</span><a href="#home-about" data-home-anchor>${t('往下读', 'Read on')}<span aria-hidden="true">↓</span></a></div></section>
      <section class="home-section home-about" id="home-about" tabindex="-1" aria-labelledby="home-about-title"><div class="home-section-label" data-home-reveal><span>01 / THE STORY</span><span>${t('关于这个故事', 'About the story')}</span></div><div class="home-about-copy" data-home-reveal><h2 id="home-about-title">${t('先记住相遇。<br>再面对失去。', 'Remember the meeting.<br>Then face what is missing.')}</h2><div><p>${t('你在雨夜的巷口遇见奶蛙。它走进你的生活，和你一起吃早餐、拍照片、写下日记。后来，你不得不走进它的精神世界，寻找那些散落的回忆。', 'You meet Naiwa in an alley on a rainy night. It shares your life: breakfast, photographs, a journal. Later, you must enter its inner world to find the memories scattered there.')}</p><p>${t('镜馆、剧场、金色房间，还有仍亮着灯的城市。每一层都有自己的故事，也有等你回答的问题。', 'A mirror hall, a theatre, a golden room, and a city still lit. Each layer has its own story, and a question waiting for your answer.')}</p><ul class="home-facts"><li>${t('五章主线', 'Five main chapters')}</li><li>${t('独立海边番外', 'A separate coastal story')}</li><li>${t('中英双语', 'Chinese & English')}</li><li>${t('剧情树回放', 'Checkpoint replay')}</li></ul></div></div><div class="home-photo-strip" aria-label="${t('故事照片，点击展开', 'Story stills, open to enlarge')}">${homePhotos.map((photo, index) => `<button type="button" class="home-photo" data-home-photo="${index}" data-home-reveal><span class="home-photo-frame">${image(photo.art, photo.title[language])}</span><span class="home-photo-caption"><span>${number(index + 1)} / ${esc(photo.title[language])}</span><span aria-hidden="true">＋</span></span><span class="home-photo-note">${esc(photo.note[language])}</span></button>`).join('')}</div></section>
      <section class="home-section home-people" id="home-people" tabindex="-1" aria-labelledby="home-people-title"><div class="home-section-label" data-home-reveal><span>02 / THE CHARACTERS</span><span>${t('先认识他们', 'Meet the cast')}</span></div><div class="home-chapter-heading" data-home-reveal><h2 id="home-people-title">${t('故事里的几个名字。', 'A few names to remember.')}</h2><p>${t('换一张角色卡，翻开小档案，或去看看它出现的章节。', 'Pick a character card, open its notes, or preview a chapter where it appears.')}</p></div><div class="home-person-tabs" role="tablist" aria-label="${t('角色档案', 'Character cards')}">${homePeople.map((p, i) => `<button type="button" role="tab" id="home-person-tab-${i}" data-home-person="${i}" aria-controls="home-person-panel-${i}" aria-selected="${i === person}" tabindex="${i === person ? 0 : -1}"><img src="/images/${p.art}.webp" alt="" width="96" height="128" loading="lazy">${esc(p.name[language])}<span aria-hidden="true">↗</span></button>`).join('')}</div><div class="home-person-stage">${homePeople.map((p, i) => `<article class="home-person-panel" role="tabpanel" id="home-person-panel-${i}" aria-labelledby="home-person-tab-${i}"${i === person ? '' : ' hidden'}><div class="home-person-portrait"><span aria-hidden="true">${number(i + 1)}</span><img src="/images/${p.art}.webp" alt="${esc(p.name[language])}" width="1024" height="1536" loading="lazy" decoding="async"></div><div class="home-person-copy"><p class="home-eyebrow">CHARACTER FILE / ${number(i + 1)}</p><h3>${esc(p.name[language])}<small>${esc(p.role[language])}</small></h3><p class="home-person-traits">${esc(p.traits[language])}</p><p>${esc(p.intro[language])}</p><details class="home-person-notes"><summary>${t('翻开小档案', 'Open the notes')}<span aria-hidden="true">＋</span></summary><p>${esc(p.note[language])}</p></details><button type="button" class="home-text-link" data-home-person-chapter="${p.chapter}">${t('看看它的章节', 'Preview its chapter')} ↗</button></div></article>`).join('')}</div></section>
      <section class="home-section home-chapters" id="home-chapters" tabindex="-1" aria-labelledby="home-chapters-title"><div class="home-section-label" data-home-reveal><span>03 / THE CHAPTERS</span><span>${t('选一页，走进去', 'Choose a page to enter')}</span></div><div class="home-chapter-heading" data-home-reveal><h2 id="home-chapters-title">${t('走过的每一层。', 'Every layer of the journey.')}</h2><p>${t('先看这一章的开场，再从原来的地方继续。', 'See the chapter opening, then pick up where you left off.')}</p></div>
        <div class="home-chapter-tabs" role="tablist" aria-label="${t('章节预览', 'Chapter previews')}">${homeChapters.map(chapter => `<button type="button" role="tab" id="home-tab-${chapter.id}" data-home-tab="${chapter.id}" aria-controls="home-panel-${chapter.id}" aria-selected="${chapter.id === selected}" tabindex="${chapter.id === selected ? 0 : -1}"><span>${number(chapter.id)}</span>${esc(chapter.title[language])}</button>`).join('')}</div>
        <div class="home-chapter-stage" data-home-stage>${homeChapters.map(chapter => { const status = statuses[chapter.id - 1] ?? { started: false, completed: false }; return `<article class="home-chapter-panel" role="tabpanel" id="home-panel-${chapter.id}" aria-labelledby="home-tab-${chapter.id}" style="--home-chapter-color:${chapter.color};--home-position:${chapter.position}"${chapter.id === selected ? '' : ' hidden'}><div class="home-chapter-art" aria-hidden="true">${image(chapter.art, '')}</div><div class="home-chapter-veil" aria-hidden="true"></div><div class="home-chapter-copy"><p class="home-eyebrow">CHAPTER ${number(chapter.id)} / ${esc(chapter.theme[language])}</p><h3>${esc(chapter.title[language])}</h3><p class="home-chapter-lead">${esc(chapter.lead[language])}</p><p class="home-chapter-description">${esc(chapter.description[language])}</p><details class="home-chapter-how"><summary>${t('这一章怎么玩', 'How to play this chapter')}<span aria-hidden="true">＋</span></summary><ul>${chapterPlay[chapter.id - 1].map(item => `<li>${esc(item[language])}</li>`).join('')}</ul></details><p class="home-chapter-status">${status.completed ? t('已收录结局 · 可继续探索', 'Ending recorded · More to explore') : status.started ? t('已有进度 · 从存档继续', 'Progress saved · Continue your story') : t('已开放 · 旅程尚未开始', 'Available · A new journey')}</p><a class="home-primary" id="chapter-${['one','two','three','four','five'][chapter.id - 1]}" href="?chapter=${chapter.id}" data-home-chapter="${chapter.id}">${status.started ? t('继续这一章', 'Continue this chapter') : t('查看章节介绍', 'Explore this chapter')}<span aria-hidden="true">↗</span></a></div><span class="home-chapter-number" aria-hidden="true">${number(chapter.id)}</span></article>` }).join('')}</div>
        <div class="home-chapter-controls"><p>${t('章节分别保存进度 · 可随时切换', 'Each chapter saves separately · Switch at any time')}</p><div><button type="button" data-home-step="-1" aria-label="${t('预览上一章', 'Preview previous chapter')}">←</button><span data-home-counter aria-live="polite">${number(selected)} / 05</span><button type="button" data-home-step="1" aria-label="${t('预览下一章', 'Preview next chapter')}">→</button></div></div>
      </section>
      <section class="home-section home-making" id="home-making" tabindex="-1" aria-labelledby="home-making-title"><div class="home-section-label" data-home-reveal><span>04 / MAKING OF</span><span>${t('制作过程时间线', 'A production timeline')}</span></div><div class="home-making-heading" data-home-reveal><h2 id="home-making-title">${t('从第一场雨，<br>一点点做起。', 'One rainy night.<br>Then a little more each day.')}</h2><p>${t('这些是制作时留下的脚印。点开日期，看看那一步做了什么。', 'Footsteps left during production. Open a date to see what changed.')}</p></div><div class="home-making-body"><figure class="home-workbench"><div class="home-workbench-tabs" role="group" aria-label="${t('工作台视图', 'Workbench view')}"><button type="button" data-home-view="art" aria-pressed="${!restored.notes}">${t('场景画面', 'Scene art')}</button><button type="button" data-home-view="notes" aria-pressed="${!!restored.notes}">${t('制作手记', 'Production notes')}</button></div><div class="home-workbench-images"${restored.notes ? ' hidden' : ''}>${homeTimeline.map((event, index) => image(event.art, '', false, `home-workbench-image${index === milestone ? ' is-current' : ''}`)).join('')}</div><div class="home-workbench-notes" data-home-making-notes${restored.notes ? '' : ' hidden'}><span>FROM THE WORKBENCH</span><p data-home-making-detail>${esc(homeTimeline[milestone].detail[language])}</p></div><figcaption><span>WORK IN PROGRESS / <span data-home-making-date>${homeTimeline[milestone].date.replaceAll('-', '.')}</span></span><strong data-home-making-title>${esc(homeTimeline[milestone].title[language])}</strong></figcaption><div class="home-workbench-controls"><button type="button" data-home-time-step="-1" aria-label="${t('上一个制作节点', 'Previous milestone')}">←</button><label class="home-time-slider"><span>${t('拖动浏览制作过程', 'Slide through production')}</span><input type="range" min="0" max="6" value="${milestone}" data-home-time-slider aria-label="${t('制作时间线', 'Production timeline')}" aria-valuetext="${esc(homeTimeline[milestone].title[language])}"></label><button type="button" data-home-time-step="1" aria-label="${t('下一个制作节点', 'Next milestone')}">→</button></div><button type="button" class="home-workbench-enlarge" data-home-workbench-open>${t('展开这一张画面', 'Enlarge this frame')} ↗</button></figure><div class="home-timeline-column"><div class="home-timeline-actions"><button type="button" data-home-time-expand>${t('展开全部', 'Expand all')} ＋</button><button type="button" data-home-time-collapse>${t('收起全部', 'Collapse all')} −</button></div><ol class="home-timeline">${homeTimeline.map((event, index) => `<li data-home-milestone="${index}" data-home-reveal><details${index === milestone ? ' open' : ''}><summary><span class="home-timeline-dot" aria-hidden="true"></span><time datetime="${event.date}">${event.date.replaceAll('-', '.')}</time><span class="home-timeline-title">${esc(event.title[language])}</span><span class="home-timeline-toggle" aria-hidden="true">＋</span><span class="home-timeline-summary">${esc(event.summary[language])}</span></summary><p>${esc(event.detail[language])}</p></details></li>`).join('')}</ol></div></div></section>
      <section class="home-end" data-home-reveal><p class="home-eyebrow">YOUR NEXT PAGE</p><h2>${t('现在，轮到你了。', 'Now it is your turn.')}</h2><a class="home-primary" href="#home-chapters" data-home-anchor>${t('选一章开始', 'Choose your chapter')}<span aria-hidden="true">↑</span></a></section>
    </main><footer class="home-footer"><span>naiwa / © 2026</span><button id="release-entry" type="button">${t('更新内容', 'What’s new')} ＋</button><a href="#home-top" data-home-anchor>${t('回到顶部', 'Back to top')} ↑</a></footer>
  </div>`
}

export type HomeController = { snapshot: () => HomeSnapshot; dispose: () => void }
/** Presentation only: no gameplay imports, save writes, audio or automatic navigation. */
export function mountHomePage(root: HTMLElement, language: Language, restored: HomeSnapshot = { scrollTop: 0, chapter: 1 }): HomeController {
  const page = root.querySelector<HTMLElement>('.home-launch')
  if (!page) return { snapshot: () => restored, dispose() {} }
  let chapter = restored.chapter, frame = 0, disposed = false
  let person = Math.max(0, Math.min(homePeople.length - 1, restored.person ?? 0))
  let milestone = Math.max(0, Math.min(homeTimeline.length - 1, restored.milestone ?? 0))
  let notes = restored.notes ?? false
  const cleanups: (() => void)[] = []
  const listen = (target: EventTarget, type: string, callback: EventListener, options?: AddEventListenerOptions) => {
    target.addEventListener(type, callback, options)
    cleanups.push(() => target.removeEventListener(type, callback, options))
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const tabs = [...page.querySelectorAll<HTMLButtonElement>('[data-home-tab]')]
  const panels = [...page.querySelectorAll<HTMLElement>('.home-chapter-panel')]
  const stage = page.querySelector<HTMLElement>('[data-home-stage]')!
  const hero = page.querySelector<HTMLElement>('.home-hero')!
  const bar = page.querySelector<HTMLElement>('.home-reading span')!
  const reveals = [...page.querySelectorAll<HTMLElement>('[data-home-reveal]')]
  const milestones = [...page.querySelectorAll<HTMLElement>('[data-home-milestone]')]
  const plates = [...page.querySelectorAll<HTMLElement>('.home-workbench-image')]
  const select = (value: number, focus = false) => {
    chapter = (((value - 1) % 5 + 5) % 5 + 1) as HomeChapter
    tabs.forEach(tab => { const current = Number(tab.dataset.homeTab) === chapter; tab.setAttribute('aria-selected', String(current)); tab.tabIndex = current ? 0 : -1 })
    panels.forEach((panel, index) => { panel.hidden = index + 1 !== chapter })
    page.querySelector<HTMLElement>('[data-home-counter]')!.textContent = `${number(chapter)} / 05`
    if (focus) tabs[chapter - 1].focus({ preventScroll: true })
  }
  const peopleTabs = [...page.querySelectorAll<HTMLButtonElement>('[data-home-person]')]
  const peoplePanels = [...page.querySelectorAll<HTMLElement>('.home-person-panel')]
  const selectPerson = (value: number, focus = false) => {
    person = ((value % homePeople.length) + homePeople.length) % homePeople.length
    peopleTabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === person)); tab.tabIndex = i === person ? 0 : -1 })
    peoplePanels.forEach((panel, i) => { panel.hidden = i !== person })
    if (focus) peopleTabs[person].focus({ preventScroll: true })
  }
  peopleTabs.forEach((tab, index) => {
    listen(tab, 'click', () => selectPerson(index))
    listen(tab, 'keydown', event => {
      const key = (event as KeyboardEvent).key
      const next = key === 'ArrowRight' ? person + 1 : key === 'ArrowLeft' ? person - 1 : key === 'Home' ? 0 : key === 'End' ? homePeople.length - 1 : null
      if (next !== null) { event.preventDefault(); selectPerson(next, true) }
    })
  })
  page.querySelectorAll<HTMLButtonElement>('[data-home-person-chapter]').forEach(button => listen(button, 'click', () => {
    select(Number(button.dataset.homePersonChapter))
    const target = page.querySelector<HTMLElement>('#home-chapters')!
    page.scrollTo({ top: page.scrollTop + target.getBoundingClientRect().top - page.getBoundingClientRect().top - 88, behavior: motion.matches ? 'auto' : 'smooth' })
    tabs[chapter - 1].focus({ preventScroll: true })
  }))
  const greetings = [b('你好呀，欢迎翻开这个故事。', 'Hello! Welcome to the story.'), b('先看看我们的照片吧。', 'Take a look at our photographs.'), b('下面的角色卡，也可以翻一翻。', 'Try the character cards below.'), b('制作时间线里，藏着这个故事的脚印。', 'The timeline keeps the footsteps of this story.')]
  let greeting = 0
  listen(page.querySelector('[data-home-hello]')!, 'click', () => {
    greeting = (greeting + 1) % greetings.length
    page.querySelector<HTMLElement>('[data-home-greeting]')!.textContent = greetings[greeting][language]
  })
  const showMilestone = (index: number) => {
    const event = homeTimeline[index]
    if (!event) return
    milestone = index
    plates.forEach((plate, i) => plate.classList.toggle('is-current', i === index))
    milestones.forEach((item, i) => item.classList.toggle('is-current', i === index))
    page.querySelector<HTMLElement>('[data-home-making-date]')!.textContent = event.date.replaceAll('-', '.')
    page.querySelector<HTMLElement>('[data-home-making-title]')!.textContent = event.title[language]
    page.querySelector<HTMLElement>('[data-home-making-detail]')!.textContent = event.detail[language]
    const slider = page.querySelector<HTMLInputElement>('[data-home-time-slider]')!
    slider.value = String(index)
    slider.setAttribute('aria-valuetext', `${event.date}: ${event.title[language]}`)
    page.querySelectorAll<HTMLButtonElement>('[data-home-time-step]').forEach(button => {
      button.disabled = Number(button.dataset.homeTimeStep) < 0 ? index === 0 : index === homeTimeline.length - 1
    })
  }
  const setWorkbenchView = (value: boolean) => {
    notes = value
    page.querySelector<HTMLElement>('.home-workbench-images')!.hidden = notes
    page.querySelector<HTMLElement>('[data-home-making-notes]')!.hidden = !notes
    page.querySelectorAll<HTMLElement>('[data-home-view]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.homeView === 'notes') === notes)))
  }
  page.querySelectorAll<HTMLElement>('[data-home-view]').forEach(button => listen(button, 'click', () => setWorkbenchView(button.dataset.homeView === 'notes')))
  const browseMilestone = (index: number) => {
    index = Math.max(0, Math.min(homeTimeline.length - 1, index))
    milestones.forEach((item, i) => { item.querySelector('details')!.open = i === index })
    showMilestone(index)
  }
  listen(page.querySelector('[data-home-time-slider]')!, 'input', event => browseMilestone(Number((event.target as HTMLInputElement).value)))
  page.querySelectorAll<HTMLElement>('[data-home-time-step]').forEach(button => listen(button, 'click', () => browseMilestone(milestone + Number(button.dataset.homeTimeStep))))
  listen(page.querySelector('[data-home-time-expand]')!, 'click', () => milestones.forEach(item => { item.querySelector('details')!.open = true }))
  listen(page.querySelector('[data-home-time-collapse]')!, 'click', () => milestones.forEach(item => { item.querySelector('details')!.open = false }))
  tabs.forEach(tab => {
    listen(tab, 'click', () => select(Number(tab.dataset.homeTab)))
    listen(tab, 'keydown', event => {
      const key = (event as KeyboardEvent).key
      const next = key === 'ArrowRight' ? chapter + 1 : key === 'ArrowLeft' ? chapter - 1 : key === 'Home' ? 1 : key === 'End' ? 5 : null
      if (next !== null) { event.preventDefault(); select(next, true) }
    })
  })
  page.querySelectorAll<HTMLElement>('[data-home-step]').forEach(button => listen(button, 'click', () => select(chapter + Number(button.dataset.homeStep))))
  let swipe: { x: number; y: number; id: number } | null = null
  listen(stage, 'pointerdown', event => {
    const e = event as PointerEvent
    swipe = null
    if (e.pointerType !== 'touch' || !e.isPrimary || (e.target as Element).closest('a,button')) return
    swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }
  })
  listen(stage, 'pointerup', event => {
    const e = event as PointerEvent
    if (swipe && e.pointerId === swipe.id && Math.abs(e.clientX - swipe.x) > 65 && Math.abs(e.clientX - swipe.x) > Math.abs(e.clientY - swipe.y) * 1.5) select(chapter + (e.clientX < swipe.x ? 1 : -1))
    swipe = null
  })
  listen(stage, 'pointercancel', () => { swipe = null })
  listen(stage, 'pointerleave', () => { swipe = null })
  milestones.forEach((item, index) => {
    listen(item, 'focusin', () => showMilestone(index))
    listen(item, 'pointerenter', event => { if ((event as PointerEvent).pointerType === 'mouse') showMilestone(index) })
    listen(item.querySelector('summary')!, 'click', () => showMilestone(index))
    // Programmatic expand/collapse and slider updates must not steal the selected date.
  })
  page.querySelectorAll<HTMLAnchorElement>('[data-home-anchor]').forEach(anchor => listen(anchor, 'click', event => {
    const e = event as MouseEvent
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const target = page.querySelector<HTMLElement>(anchor.hash)
    if (!target) return
    e.preventDefault()
    page.scrollTo({ top: page.scrollTop + target.getBoundingClientRect().top - page.getBoundingClientRect().top - 88, behavior: motion.matches ? 'auto' : 'smooth' })
    target.focus({ preventScroll: true })
  }))
  let imageDialog: HTMLDialogElement | null = null
  const openImage = (photo: { art: string; title: Copy; note: Copy }, button: HTMLButtonElement) => {
    if (root.querySelector('dialog[open]')) return
    const dialog = document.createElement('dialog')
    imageDialog = dialog
    dialog.className = 'app-dialog home-image-dialog'
    dialog.setAttribute('aria-labelledby', 'home-image-title')
    dialog.innerHTML = `<header class="dialog-head"><h2 id="home-image-title">${esc(photo.title[language])}</h2><button type="button" class="small-btn" data-home-image-close autofocus>${language === 'zh' ? '关闭' : 'Close'} ×</button></header>${image(photo.art, photo.title[language], true)}<p>${esc(photo.note[language])}</p>`
    dialog.querySelector('[data-home-image-close]')!.addEventListener('click', () => dialog.close())
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close() })
    dialog.addEventListener('close', () => { dialog.remove(); if (imageDialog === dialog) imageDialog = null; if (!disposed && button.isConnected) button.focus({ preventScroll: true }) })
    root.append(dialog); dialog.showModal()
  }
  page.querySelectorAll<HTMLButtonElement>('[data-home-photo]').forEach(button => listen(button, 'click', () => {
    const photo = homePhotos[Number(button.dataset.homePhoto)]
    if (photo) openImage(photo, button)
  }))
  const workbenchOpen = page.querySelector<HTMLButtonElement>('[data-home-workbench-open]')!
  listen(workbenchOpen, 'click', () => { const event = homeTimeline[milestone]; openImage({ art: event.art, title: event.title, note: event.summary }, workbenchOpen) })
  const draw = () => {
    frame = 0
    if (disposed) return
    const amount = page.scrollTop / Math.max(1, page.scrollHeight - page.clientHeight)
    bar.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`
    page.querySelector('.home-header')!.classList.toggle('is-scrolled', page.scrollTop > 24)
    hero.style.setProperty('--home-shift', motion.matches ? '0px' : `${Math.min(page.scrollTop * .15, page.clientHeight * .15)}px`)
  }
  const schedule = () => { if (!frame && !disposed) frame = requestAnimationFrame(draw) }
  listen(page, 'scroll', schedule, { passive: true })
  listen(window, 'resize', schedule, { passive: true })
  listen(window, 'appimmersivechange', schedule)
  listen(document, 'fullscreenchange', schedule)
  let pointerFrame = 0, pointerX = 0, pointerY = 0
  const drawPointer = () => { pointerFrame = 0; if (!disposed) { hero.style.setProperty('--home-x', `${pointerX}px`); hero.style.setProperty('--home-y', `${pointerY}px`) } }
  listen(hero, 'pointermove', event => {
    const e = event as PointerEvent
    if (motion.matches || e.pointerType !== 'mouse') return
    const bounds = hero.getBoundingClientRect()
    pointerX = ((e.clientX - bounds.left) / Math.max(bounds.width, 1) - .5) * 14
    pointerY = ((e.clientY - bounds.top) / Math.max(bounds.height, 1) - .5) * 10
    if (!pointerFrame) pointerFrame = requestAnimationFrame(drawPointer)
  }, { passive: true })
  listen(hero, 'pointerleave', () => { pointerX = pointerY = 0; if (!pointerFrame) pointerFrame = requestAnimationFrame(drawPointer) })
  let observer: IntersectionObserver | null = null
  const configureMotion = () => {
    observer?.disconnect(); observer = null
    page.classList.toggle('has-motion', !motion.matches)
    page.classList.remove('has-reveals')
    if (!motion.matches && typeof IntersectionObserver !== 'undefined') {
      page.classList.add('has-reveals')
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer?.unobserve(entry.target) }
      }, { root: page, threshold: .1 })
      reveals.forEach(item => { if (!item.classList.contains('is-visible')) observer!.observe(item) })
    } else reveals.forEach(item => item.classList.add('is-visible'))
    pointerX = pointerY = 0; drawPointer(); schedule()
  }
  listen(motion, 'change', configureMotion)
  select(chapter); selectPerson(person); showMilestone(milestone); setWorkbenchView(notes); configureMotion()
  page.scrollTop = Math.max(0, restored.scrollTop)
  schedule()
  return {
    snapshot: () => ({ scrollTop: page.scrollTop, chapter, person, milestone, notes }),
    dispose() {
      disposed = true
      cleanups.forEach(cleanup => cleanup()); observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      if (pointerFrame) cancelAnimationFrame(pointerFrame)
      imageDialog?.close(); imageDialog?.remove(); imageDialog = null
    },
  }
}
