import type { Bilingual, Language } from './story'

type Chapter = 1 | 2 | 3
type PromoScene = { place: string; title: Bilingual; body: Bilingual; image: string; alt: Bilingual }
type PromoChapter = {
  title: Bilingual; displayTitle: Bilingual; theme: string; location: string
  cover: string; coverAlt: Bilingual; lead: Bilingual; genre: Bilingual
  storyTitle: Bilingual; storyBody: Bilingual; scenes: PromoScene[]
  person: { name: Bilingual; roman: string; image: string; alt: Bilingual; quote: Bilingual; body: Bilingual; portrait?: boolean }
  playBody: Bilingual; closing: Bilingual
}
const b = (zh: string, en: string): Bilingual => ({ zh, en })

// These are previews of existing scenes. Ending art and puzzle solutions stay in the game.
const chapters: Record<Chapter, PromoChapter> = {
  1: {
    title: b('缘起', 'Origin'), displayTitle: b('缘起', 'Origin'), theme: 'origin', location: 'A RAINY NIGHT',
    cover: 'P02', coverAlt: b('雨夜，奶蛙坐在巷口的纸箱里', 'Naiwa sitting in a cardboard box in a rainy alley'),
    lead: b('纸箱里的小家伙，想借你的屋檐躲场雨。', 'There\'s someone in that box. Could it stay until the rain stops?'),
    genre: b('恋爱日常 / 场景调查', 'Life together / Scene investigation'),
    storyTitle: b('你把它\n带回了家。', 'You brought\nit home.'),
    storyBody: b('从那天起，厨房里多了一双碗筷。有人陪你逛市场，等你下班，也会因为一张拍糊的合照高兴很久。后来，奶蛙没能醒来。你得去它的记忆里，把这些小事找回来。', 'After that night, there was another place at the table. Someone to browse the market with, someone waiting after work, someone delighted by a blurry photo of you both. Then Naiwa wouldn\'t wake up. You\'ll have to find those ordinary days inside its memories.'),
    scenes: [
      { place: 'THE ALLEY', title: b('雨还没停。', 'Still raining.'), body: b('下班回家的巷口，纸箱盖被顶开了一角。里面的小家伙说它叫奶蛙，还提醒你别把箱子落下。', 'On your way home from work, a box lid lifts. The creature inside introduces itself as Naiwa. If you\'re taking it home, please remember the box.'), image: 'P02', alt: b('奶蛙躲在被雨淋湿的纸箱里', 'Naiwa sheltering in a rain-soaked box') },
      { place: 'THE KITCHEN', title: b('第一张松饼焦了。', 'The first pancake burned.'), body: b('锅还是热的，奶蛙已经举起了锅铲。你可以陪它重做一张，也可以先尝尝眼前这张。早餐还早。', 'The pan is hot and Naiwa has the spatula ready. Make another together, or try the one in front of you. There\'s time.'), image: 'R02_KITCHEN', alt: b('奶蛙和主角在阳光照进的厨房做松饼', 'Naiwa and the player making pancakes in a sunlit kitchen') },
      { place: 'THE FAIRGROUND', title: b('旋转木马还在转。', 'The carousel is still turning.'), body: b('雾里没有游客，摊位上的旧东西却很眼熟。日记指向这里。找回玩具、礼物和照片之前，你得先走近一点。', 'There are no visitors in the fog, but the things on the stalls look familiar. The journal brought you here. Look closer for the toy, the gift, and the photograph.'), image: 'M03', alt: b('迷雾中的空荡游乐园，旋转木马亮着灯', 'An empty fairground in the fog, its carousel still lit') },
    ],
    person: {
      name: b('奶蛙', 'Naiwa'), roman: 'NAIWA', image: 'R03_PHOTO',
      alt: b('奶蛙与主角坐在厨房里拍合照', 'Naiwa posing for a photograph with the player in the kitchen'),
      quote: b('这箱子不漏水，就是盖子总掉。', 'The box keeps the rain out. The lid\'s the problem.'),
      body: b('会做饭，会把晚饭热两遍，也会因为等不到消息生气。它想跟你一起过日子，告白却练了好几遍。', 'Naiwa cooks, reheats dinner when you\'re late, and gets upset when you don\'t text. The confession took a few rehearsals.'),
    },
    playBody: b('陪奶蛙逛市场、做早餐，到了游乐园再找回那几件旧东西。选一句回答，或靠近一处摊位，故事就会往前走。', 'Browse the market, make breakfast, then search the fairground for things you remember. Choose a reply or investigate a stall to move the story along.'),
    closing: b('去巷口看看。', 'Take the alley home.'),
  },
  2: {
    title: b('冰镜疑凶', 'The Culprit in the Ice'), displayTitle: b('冰镜\n疑凶', 'The Culprit\nin the Ice'), theme: 'ice', location: 'THE FROZEN MIRROR HALL',
    cover: 'chapter-02-ice-hall', coverAlt: b('冰封镜馆，碎裂的镜面映在水中', 'Broken mirrors reflected in the water of the Frozen Mirror Hall'),
    lead: b('病房的录像里，有人带走了一页日记。', 'Someone took a page from the journal. The ward camera caught it.'),
    genre: b('镜馆探索 / 线索调查', 'Explore the hall / Examine the evidence'),
    storyTitle: b('录像跳过了\n最要紧的一秒。', 'One second\nis missing.'),
    storyBody: b('奶蛙还没醒。一个紫色身影带走了日记里的纸页，你追进冰封的镜馆。胶片、镜片和墙里的声音，都在说起那场事故。', 'Naiwa is still asleep. You follow the figure who took the journal page into a hall sealed in ice. Film, broken glass, and a voice inside the wall all point back to the crash.'),
    scenes: [
      { place: 'THREE MIRRORS', title: b('入口有三个你。', 'Three reflections. Three ways in.'), body: b('一个追着紫色背影跑，一个蹲着捡镜片，还有一个贴在墙上听。镜中的路各不相同，你先跟哪一个走？', 'One reflection chases the purple figure. Another gathers broken glass. The third listens at a wall. Which one do you follow first?'), image: 'chapter-02-cg-three-mirrors', alt: b('三面镜子里，主角分别追踪、拾取镜片和倾听', 'Three mirrors showing the player chasing, collecting glass, and listening') },
      { place: 'THE FILM', title: b('把这一格再放一遍。', 'Play that frame again.'), body: b('胶片离开冰面，雨点在画格里倒着走。时间码往前跳了，人影却已经站在另一处。把它记下来，后面还有别的证词。', 'Lift the film from the ice and the rain runs backwards. The timestamp jumps; the figure has moved. Keep a note. There are other accounts to compare.'), image: 'chapter-02-cg-film-fragment', alt: b('主角在冰面上拿起一段残缺胶片', 'The player holding a damaged strip of film above the ice') },
      { place: 'BEHIND THE GLASS', title: b('墙后有人在说话。', 'A voice behind the glass.'), body: b('他还记得车里的冷气，也记得有人喊过他的名字。先让他说完，再回头核对你找到的东西。', 'He remembers the cold inside the car, and someone calling his name. Let him finish. Then check his account against what you found.'), image: 'chapter-02-cg-cold-mirror', alt: b('奶鼠坐在冰镜前，镜中映出戴着手甲的奶霸', 'Naishu facing an icy mirror with Naiba and his gauntlet reflected in it') },
    ],
    person: {
      name: b('奶鼠与奶霸', 'Naishu & Naiba'), roman: 'NAISHU / NAIBA', image: 'chapter-02-cg-cold-mirror',
      alt: b('冰镜隔开了奶鼠与奶霸', 'An icy mirror separating Naishu and Naiba'),
      quote: b('你已经带回来一个了，别再进去。', 'You\'ve brought back one fragment already. Don\'t go in again.'),
      body: b('奶霸让你离开，奶鼠还有话没说完。两个人的说法对不上。镜馆里那些不起眼的物证，也许能补上他们略过的部分。', 'Naiba wants you to leave. Naishu hasn\'t finished talking. Their accounts don\'t agree. The evidence scattered around the hall may fill in what they leave out.'),
    },
    playBody: b('用键盘或摇杆在镜馆里走，靠近物证后调查。收集胶片和镜片，记录证词，再回到中央镜前核对。', 'Walk through the hall with the keyboard or joystick and examine the exhibits up close. Collect film and glass, note the testimony, then return to the central mirror.'),
    closing: b('电梯已经到了。', 'The elevator is here.'),
  },
  3: {
    title: b('血色交易', 'The Crimson Bargain'), displayTitle: b('血色\n交易', 'The Crimson\nBargain'), theme: 'crimson', location: 'THE FLESH THEATRE',
    cover: 'chapter-03-cg-entrance', coverAlt: b('红色幕布之间，血肉剧场的舞台亮着灯', 'The lit stage of the Flesh Theatre, framed by red curtains'),
    lead: b('台下没有人。掌声却没停。', 'The seats are empty. The applause won\'t stop.'),
    genre: b('记忆辨认 / 剧场调查', 'Examine the memories / Search the theatre'),
    storyTitle: b('这出戏，\n它已经砸过很多次。', 'It wrecked the stage.\nThe play started over.'),
    storyBody: b('奶粉被困在一出反复重演的戏里。雨窗、餐桌和放映机都摆好了，头顶的吊线又开始收紧。组织说能让奶蛙醒来，但要你先带回这里的记忆。', 'Naifen is trapped in a play that keeps starting over. The rainy window, the table, and the projector are ready. The threads overhead tighten again. The institute says it can wake Naiwa, if you bring back the memories from this place.'),
    scenes: [
      { place: 'THE THIRD BELL', title: b('第三声铃响了。', 'The third bell rings.'), body: b('红色帷幕擦过肩膀，掌声从空椅子里传来。舞台中央有人扯断了一根线，窗里的雨夜碎成了纸片。', 'Red curtains brush your shoulders. Applause comes from empty chairs. Someone tears a thread down on stage, and the rainy window breaks into paper scraps.'), image: 'chapter-03-cg-entrance', alt: b('血肉剧场入口，空座位正对着红色舞台', 'The entrance to the Flesh Theatre, with empty seats facing the red stage') },
      { place: 'THE BREAKFAST TABLE', title: b('这顿早餐，你记得。', 'You remember this breakfast.'), body: b('还是那只杯子，还是那张焦掉的松饼。旁边却多了一份整齐得过头的早餐。道具都摆在眼前，你得认出自己经历过的那一段。', 'The same mug. The same burnt pancake. Beside them is a breakfast that looks a little too perfect. The props are right here. Which version did you live through?'), image: 'chapter-03-cg-breakfast', alt: b('舞台餐桌上，焦掉的松饼和完好的松饼并排摆着', 'A burnt pancake and a perfect one set side by side on the stage table') },
      { place: 'THE OFFER', title: b('治疗也有条件。', 'The treatment has a price.'), body: b('研究员把银色箱子打开，探针和同意书都在里面。他催你先救奶蛙。至于那些记忆会被拿去做什么，他还没有回答。', 'The researcher opens the silver case. A probe and a consent form are waiting inside. He wants you to focus on saving Naiwa. He still hasn\'t said what the memories are for.'), image: 'chapter-03-cg-offer', alt: b('病床旁的银色箱子里放着探针与同意书', 'A silver case beside the hospital bed, holding a probe and a consent form') },
    ],
    person: {
      name: b('奶粉', 'Naifen'), roman: 'NAIFEN', image: 'chapter-03-naifen-guarded', portrait: true,
      alt: b('奶粉皱着眉，一只手向前伸出', 'Naifen frowning, one hand held out'),
      quote: b('你要看戏，就站远一点；你要带我走，就别碰那些线。', 'Here to watch? Stay back. Here to get me out? Leave those threads alone.'),
      body: b('它生气时会砸东西，也会把皱掉的剧本攥在手里。台上每次都要演到你受伤，它不想再看一遍。', 'It smashes things when it\'s angry, but still clutches the crumpled script. Every performance ends with you getting hurt. It doesn\'t want to watch that happen again.'),
    },
    playBody: b('在雨窗、餐桌和放映机之间查看记忆，听奶粉把话说完。带哪些碎片去见研究员，要由你决定。', 'Examine memories at the rainy window, the table, and the projector. Hear Naifen out. You decide which fragments to take to the researcher.'),
    closing: b('奶粉还在台上。', 'Naifen is still on stage.'),
  },
}

export type ChapterPromoOptions = {
  chapter: Chapter
  language: Language
  started: boolean
  saveNote: string
  dlc?: { unlocked: boolean; views: number; completed: number }
}
const esc = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
const lines = (value: string) => esc(value).replaceAll('\n', '<br>')
const img = (id: string, alt: string, className = '', eager = false, portrait = false) =>
  `<img class="${className}" src="/images/${id}.webp" alt="${esc(alt)}" width="${portrait ? 1024 : 1672}" height="${portrait ? 1536 : 941}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`

export function renderChapterPromo({ chapter, language: lang, started, saveNote, dlc }: ChapterPromoOptions): string {
  const data = chapters[chapter]
  const zh = lang === 'zh'
  const number = `0${chapter}`
  const playLabel = zh ? (started ? '继续故事' : '开始故事') : (started ? 'Continue story' : 'Start story')
  const routesLabel = zh ? '剧情树' : 'Story map'
  const actions = (hero = false) => `<div class="promo-actions"><button type="button" class="promo-play" data-promo-play${hero ? ` id="${started ? 'continue' : 'start'}"` : ''}>${playLabel}<span aria-hidden="true">↗</span></button>${started ? `<button type="button" class="promo-text-button" data-promo-restart${hero ? ' id="start"' : ''}>${zh ? '重新开始' : 'Restart'}</button>` : ''}<button type="button" class="promo-text-button" data-promo-routes${hero ? ' id="routes-intro"' : ''}>${routesLabel}<span aria-hidden="true">＋</span></button></div>`
  return `<div class="chapter-promo promo-${data.theme}" data-promo-chapter="${chapter}" lang="${zh ? 'zh-CN' : 'en'}">
    <a class="promo-skip" href="#promo-story" data-promo-anchor>${zh ? '跳到章节介绍' : 'Skip to the chapter introduction'}</a>
    <header class="promo-header">
      <button class="promo-brand" id="chapter-home" type="button" aria-label="${zh ? '奶之救赎 · 返回章节选择' : 'Naiwa · Back to chapters'}">naiwa<span>CHAPTER ${number}</span></button>
      <nav class="promo-nav" aria-label="${zh ? '本页导航' : 'On this page'}"><a href="#promo-story" data-promo-anchor>${zh ? '故事' : 'Story'}</a><a href="#promo-character" data-promo-anchor>${zh ? '角色' : 'Characters'}</a><a href="#promo-start" data-promo-anchor>${zh ? '进入章节' : 'Play'}</a></nav>
      <div class="promo-tools"><button id="routes-intro-top" type="button">${routesLabel}</button><button id="language" type="button" aria-label="${zh ? 'Switch to English' : '切换至中文'}">${zh ? 'EN' : '中文'}</button>
        <details class="promo-utility"><summary aria-label="${zh ? '更多选项' : 'More options'}"><span aria-hidden="true">＋</span></summary><div class="promo-utility-menu"><button id="chapter-return" type="button" aria-keyshortcuts="Escape">← ${zh ? '返回章节选择' : 'Back to chapters'}</button><button id="settings-entry" type="button">${zh ? '设置' : 'Settings'}</button><button id="gallery-entry" type="button">${zh ? 'CG 图鉴' : 'CG gallery'}</button><button id="fullscreen" type="button">${zh ? '全屏' : 'Fullscreen'}</button></div></details>
      </div><div class="promo-reading" aria-hidden="true"><span></span></div>
    </header>
    <main>
      <section class="promo-hero" aria-labelledby="promo-title">
        <div class="promo-hero-media">${img(data.cover, data.coverAlt[lang], 'promo-hero-image', true)}</div>
        <div class="promo-hero-shade" aria-hidden="true"></div>
        <div class="promo-hero-copy"><p class="promo-eyebrow">NAIWA / ${zh ? '奶之救赎' : 'AN INTERACTIVE STORY'}</p><p class="promo-chapter-label"><span>${number}</span> ${data.location}</p>
          <h1 id="promo-title">${lines(data.displayTitle[lang])}</h1><p class="promo-hero-lead">${esc(data.lead[lang])}</p>${actions(true)}
          <p class="promo-save-note">${esc(saveNote)}</p>
        </div>
        <div class="promo-hero-foot"><a href="#promo-story" data-promo-anchor><span class="promo-scroll-line" aria-hidden="true"></span>${zh ? '往下看看' : 'Scroll to explore'}<span aria-hidden="true">↓</span></a><span>${esc(data.genre[lang])}</span><span class="promo-hero-index" aria-hidden="true">${number} / 03</span></div>
      </section>
      <section class="promo-story promo-section" id="promo-story" tabindex="-1" aria-labelledby="promo-story-title">
        <div class="promo-section-label" data-promo-reveal><span>01 / STORY</span><span>${zh ? '故事从这里开始' : 'Where it begins'}</span></div>
        <div class="promo-story-intro"><h2 id="promo-story-title" data-promo-reveal>${lines(data.storyTitle[lang])}</h2><p data-promo-reveal>${esc(data.storyBody[lang])}</p></div>
        <div class="promo-sequence">
          <div class="promo-sequence-visual" aria-hidden="true"><div class="promo-sequence-window">${data.scenes.map((scene, i) => `<figure class="promo-frame${i === 0 ? ' is-active' : ''}" data-promo-frame="${i}">${img(scene.image, '')}<figcaption><span>0${i + 1}</span>${scene.place}</figcaption></figure>`).join('')}<div class="promo-frame-corners" aria-hidden="true"></div></div><div class="promo-frame-count"><span>${zh ? '章节片段' : 'Scenes from the chapter'}</span><span data-promo-scene-count>01 / 03</span></div></div>
          <div class="promo-scenes">${data.scenes.map((scene, i) => `<article class="promo-scene" data-promo-scene="${i}"><div class="promo-scene-mobile-image">${img(scene.image, scene.alt[lang])}</div><div class="promo-scene-copy" data-promo-reveal><p class="promo-eyebrow"><span>0${i + 1}</span> ${scene.place}</p><h3>${esc(scene.title[lang])}</h3><p>${esc(scene.body[lang])}</p></div></article>`).join('')}</div>
        </div>
      </section>
      <section class="promo-person promo-section" id="promo-character" tabindex="-1" aria-labelledby="promo-person-title">
        <div class="promo-section-label" data-promo-reveal><span>02 / CHARACTERS</span><span>${zh ? '会遇见的人' : 'Who you\'ll meet'}</span></div>
        <div class="promo-person-layout${data.person.portrait ? ' has-portrait' : ''}"><span class="promo-person-name" aria-hidden="true">${data.person.roman}</span>
          <div class="promo-person-image" data-promo-reveal data-promo-drift-frame>${img(data.person.image, data.person.alt[lang], 'promo-drift-image', false, !!data.person.portrait)}</div>
          <div class="promo-person-copy" data-promo-reveal><p class="promo-eyebrow">${data.person.roman}</p><h2 id="promo-person-title">${esc(data.person.name[lang])}</h2><blockquote>${esc(data.person.quote[lang])}</blockquote><p>${esc(data.person.body[lang])}</p></div>
        </div>
      </section>
      <section class="promo-play-about promo-section" aria-labelledby="promo-play-title"><div class="promo-section-label" data-promo-reveal><span>03 / PLAY</span><span>${zh ? '轮到你了' : 'Your turn'}</span></div><div class="promo-play-about-body" data-promo-reveal><h2 id="promo-play-title">${esc(data.genre[lang]).replace(' / ', '<br>')}</h2><div><p>${esc(data.playBody[lang])}</p><button class="promo-text-button" type="button" data-promo-routes>${zh ? '看看故事会走向哪里' : 'See the paths through the story'} <span aria-hidden="true">↗</span></button></div></div></section>
      ${chapter === 1 && dlc ? `<section class="promo-coast" aria-labelledby="promo-dlc-title"><div class="promo-coast-image" data-promo-drift-frame>${img('dlc-coastal-shore-smile', zh ? '奶蛙拿着地图，站在海边的灯塔步道上' : 'Naiwa holding a map on the coastal lighthouse path', 'promo-drift-image')}</div><div class="promo-coast-shade" aria-hidden="true"></div><div class="promo-coast-copy" data-promo-reveal><p class="promo-eyebrow">SIDE STORY / 01</p><h2 id="promo-dlc-title">${zh ? '潮汐写给<br>你的信' : 'A Letter<br>from the Tide'}</h2><p>${zh ? '买两张车票，带奶蛙去海边。找灯塔，捡海玻璃，晚上等雨停。两天一夜，暂时不用赶着回家。' : 'Two train tickets and a trip with Naiwa. Find the lighthouse, look for sea glass, wait out the evening rain. Two days by the sea, with no rush to get home.'}</p><button class="promo-play" id="romance-dlc-entry" type="button">${dlc.unlocked ? (zh ? '进入海边番外' : 'Play the coastal story') : (zh ? '解锁海边番外' : 'Unlock the coastal story')}<span aria-hidden="true">↗</span></button><p class="promo-dlc-status"><span class="dlc-entry-lock">${dlc.unlocked ? (zh ? '已解锁' : 'Unlocked') : (zh ? `观看视频解锁 · ${dlc.views}/3` : `Watch to unlock · ${dlc.views}/3`)}</span><span>${zh ? '约会进度' : 'Date progress'} ${dlc.completed}/4</span></p></div></section>` : ''}
      <section class="promo-ending promo-section" id="promo-start" tabindex="-1" aria-labelledby="promo-ending-title"><p class="promo-eyebrow" data-promo-reveal>CHAPTER ${number} / ${esc(data.title[lang])}</p><h2 id="promo-ending-title" data-promo-reveal>${esc(data.closing[lang])}</h2><div data-promo-reveal>${actions()}<p class="promo-save-note">${zh ? '每章单独保存进度。随时可以回来。' : 'Each chapter has its own save. Come back whenever you like.'}</p></div></section>
    </main>
    <footer class="promo-footer"><div class="promo-footer-heading"><span>THE CHAPTERS</span><button id="release-entry" type="button">${zh ? '更新内容' : 'What\'s new'} <span aria-hidden="true">＋</span></button></div><nav aria-label="${zh ? '切换章节' : 'Choose a chapter'}">${([1, 2, 3] as Chapter[]).map(id => `<a href="?chapter=${id}" data-promo-chapter-link="${id}"${id === chapter ? ' aria-current="page"' : ''}><span>0${id}</span><strong>${esc(chapters[id].title[lang])}</strong><span aria-hidden="true">${id === chapter ? '●' : '↗'}</span></a>`).join('')}<a href="?chapter=4" data-promo-chapter-link="4"><span>04</span><strong>${zh ? '金笼' : 'The Gilded Cage'}<small>${zh ? '可玩首版' : 'First edition'}</small></strong><span aria-hidden="true">↗</span></a></nav><div class="promo-colophon"><span>naiwa / 奶之救赎</span><span>© 2026 NAIWA</span><a href="#promo-title" data-promo-anchor>${zh ? '回到顶部' : 'Back to top'} ↑</a></div></footer>
  </div>`
}

// Presentation owns only its viewport. Scrolling never touches gameplay, storage, or audio.
export function mountChapterPromo(root: HTMLElement, restoredScroll = 0) {
  const page = root.querySelector<HTMLElement>('.chapter-promo')!
  const header = page.querySelector<HTMLElement>('.promo-header')!
  const scenes = [...page.querySelectorAll<HTMLElement>('[data-promo-scene]')]
  const frames = [...page.querySelectorAll<HTMLElement>('[data-promo-frame]')]
  const driftFrames = [...page.querySelectorAll<HTMLElement>('[data-promo-drift-frame]')]
  const reveals = [...page.querySelectorAll<HTMLElement>('[data-promo-reveal]')]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const sceneCount = page.querySelector<HTMLElement>('[data-promo-scene-count]')
  let disposed = false, frame = 0, activeScene = -1
  page.scrollTop = restoredScroll

  const revealObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed')
      revealObserver?.unobserve(entry.target)
    }
  }, { root: page, threshold: 0.08, rootMargin: '0px 0px -32px 0px' })
  const setMotion = () => {
    page.classList.toggle('has-motion', !!revealObserver && !reduced.matches)
    if (reduced.matches) reveals.forEach(element => element.classList.add('is-revealed'))
    schedule()
  }

  function update() {
    frame = 0
    if (disposed) return
    // Read all geometry first, then apply transforms and classes together.
    const height = page.clientHeight
    const top = page.scrollTop
    const max = page.scrollHeight - height
    const bounds = page.getBoundingClientRect()
    const sceneTops = scenes.map(scene => scene.getBoundingClientRect().top - bounds.top)
    const drifts = driftFrames.map(element => {
      const rect = element.getBoundingClientRect()
      return Math.max(-24, Math.min(24, (height / 2 - (rect.top - bounds.top + rect.height / 2)) * .055))
    })
    let nextScene = 0
    sceneTops.forEach((sceneTop, index) => { if (sceneTop <= height * .55) nextScene = index })
    page.style.setProperty('--promo-reading', String(max > 0 ? top / max : 0))
    page.style.setProperty('--promo-hero-shift', reduced.matches ? '0px' : `${Math.min(top * .12, 80)}px`)
    header.classList.toggle('is-scrolled', top > 24)
    driftFrames.forEach((element, index) => element.style.setProperty('--promo-drift', reduced.matches ? '0px' : `${drifts[index]}px`))
    if (nextScene !== activeScene) {
      activeScene = nextScene
      frames.forEach((element, index) => element.classList.toggle('is-active', index === activeScene))
      if (sceneCount) sceneCount.textContent = `0${activeScene + 1} / 03`
    }
  }
  function schedule() {
    if (!disposed && !frame) frame = window.requestAnimationFrame(update)
  }
  function navigate(event: Event) {
    const click = event as MouseEvent
    if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('[data-promo-anchor]')
    if (!anchor) return
    const target = page.querySelector<HTMLElement>(anchor.hash)
    if (!target) return
    event.preventDefault()
    const top = anchor.hash === '#promo-title' ? 0 : target.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop - header.offsetHeight - 24
    page.scrollTo({ top: Math.max(0, top), behavior: reduced.matches ? 'auto' : 'smooth' })
    if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true })
  }

  reveals.forEach(element => revealObserver?.observe(element))
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
  resizeObserver?.observe(page)
  page.addEventListener('scroll', schedule, { passive: true })
  page.addEventListener('click', navigate)
  page.addEventListener('load', schedule, true)
  window.addEventListener('resize', schedule, { passive: true })
  reduced.addEventListener('change', setMotion)
  setMotion()
  return {
    getScrollTop: () => page.scrollTop,
    dispose() {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
      revealObserver?.disconnect()
      resizeObserver?.disconnect()
      page.removeEventListener('scroll', schedule)
      page.removeEventListener('click', navigate)
      page.removeEventListener('load', schedule, true)
      window.removeEventListener('resize', schedule)
      reduced.removeEventListener('change', setMotion)
    },
  }
}
