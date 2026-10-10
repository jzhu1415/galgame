import './chapter-promo.css'
import './finale-promo.css'
import type { Language } from './story'
import { finaleTitles } from './finale-story'

type FinaleChapter = 5 | 6
type Bilingual = { zh: string; en: string }

const b = (zh: string, en: string): Bilingual => ({ zh, en })
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const text = (value: Bilingual, language: Language) => value[language]
const titleFor = (chapter: FinaleChapter, language: Language) =>
  finaleTitles[chapter]?.[language] ?? (language === 'zh' ? '第五章 · 终章' : 'Chapter Five · Finale')

type Plate = { id: string; w: number; h: number }
const plate = (id: string, w = 1672, h = 941): Plate => ({ id, w, h })
const img = (art: Plate, alt: string, className = '', eager = false) =>
  `<img class="${className}" src="/images/${art.id}.webp" alt="${esc(alt)}" width="${art.w}" height="${art.h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`

/** The hero title arrives character by character; the copy itself stays plain text for assistive tech. */
const kinetic = (value: string) => Array.from(value)
  .map((char, index) => `<span class="fl-char" style="--i:${index}">${char === ' ' ? '&nbsp;' : esc(char)}</span>`)
  .join('')

const copy = {
  heroLabel: b('终章', 'FINALE'),
  heroTitle: b('最后一页', 'The Last Page'),
  heroLead: b('穿过追捕与封锁，走向城市中的最后一战。', 'Survive the pursuit and the blockade, then face the final battle in the city.'),
  heroCue: b('往下读', 'Read on'),
  heroNote: b('提示：读完这一页，才能开始。', 'Note: read this page to the end before you begin.'),
  descentLabel: b('序章 · 深处的路', 'THE DESCENT'),
  descentTitle: b('从深渊，\n一路走到天亮。', 'From the depths,\nall the way to dawn.'),
  descentBody: b(
    '组织封锁了出口。躲开香蕉猫的追捕，迎上肥嘟嘟的攻击，再突破实验区的控制装置。线索与精神力会伴你走完这段连续的旅程。',
    'The institute has sealed the exits. Evade Banana Cat, face Feidudu’s attacks and break through the laboratory controls. Your evidence and spirit stay with you throughout this continuous journey.'),
  descentHint: b('新线索会写进日记，已经抵达的地方也会留在地图上。', 'New clues are written into the journal, and each reached place stays on the map.'),
  photosLabel: b('旅途记录 · 照片', 'CONTACT SHEET'),
  photosTitle: b('这一路，被一张张照片记住了。', 'The journey, kept as frames.'),
  photosBody: b('拖动这一排照片，点开可以看大图。', 'Drag the strip. Open a frame to see it full size.'),
  photosHint: b('按住拖动 · 会一直转下去 · 点开看大图', 'Drag · it loops · tap to enlarge'),
  routeLabel: b('走过的五章', 'THE ROUTE'),
  routeTitle: b('从巷口走到城市。', 'From the alley to the city.'),
  routeBody: b('前面四章都还能重玩。终章接在它们后面，一路把你带到这里。', 'The first four chapters are still replayable. The finale picks up where they leave you.'),
  sealedLabel: b('未公开 · 不剧透', 'SEALED'),
  sealedTitle: b('这一页，\n不讲结局。', 'This page will not\ntell you the ending.'),
  sealedBody: b('终章里有五条通往不同收束的路线。宣传页只把你送到门口，门后的事留给游戏。', 'Five routes reach the end of this chapter. This page walks you to the door; what is behind it stays in the game.'),
  sealedNote: b('问号留给你自己填。', 'The question marks are yours to fill in.'),
  startLabel: b('轮到你', 'YOUR TURN'),
  startTitle: b('翻开日记，\n继续向前。', 'Open the journal.\nKeep going.'),
  startBody: b('查看已抵达的节点，或从当前进度继续。', 'Review the places you have reached, or continue from your current progress.'),
  gateLocked: b('读完这一页，才能开始。', 'Read to the end of this page to begin.'),
  gateReady: b('已解锁，可以开始了。', 'Unlocked. You can begin now.'),
  gateHint: b('再往下一点', 'A little further down'),
  gateProgress: b('阅读进度', 'Reading'),
  play: b('进入终章', 'Enter the finale'),
  playStarted: b('继续终章', 'Continue the finale'),
  restart: b('重新开始', 'Restart'),
  routes: b('剧情树', 'Story map'),
  home: b('返回章节选择', 'Back to chapters'),
  top: b('回到顶部', 'Back to top'),
  whatsNew: b('更新内容', 'What’s new'),
  nav: [b('序章', 'Descent'), b('照片', 'Photos'), b('五章', 'Route'), b('开始', 'Play')],
  stats: [
    { value: 23, label: b('张终章 CG', 'finale CG shots') },
    { value: 10, label: b('处地点', 'locations') },
    { value: 6, label: b('名角色', 'character sprites') },
  ],
}

type Shot = { art: Plate; place: Bilingual; note: Bilingual; alt: Bilingual }
const shots: Shot[] = [
  {
    art: plate('finale-abyss', 1536, 1024), place: b('深渊 · 水面', 'The flooded depths'),
    note: b('灯亮着，柱子一直排到看不见的地方。', 'Lights on the water. Columns out of sight.'),
    alt: b('淹没水中的柱厅，水面反射着顶灯', 'A flooded pillared hall with lights reflected on the water'),
  },
  {
    art: plate('finale-abyss-beacon', 1536, 1024), place: b('信标 · 台面', 'The beacon'),
    note: b('信标亮着，日记翻开在这一页。', 'The beacon is lit. The journal lies open.'),
    alt: b('水面上方的石台上放着信标与摊开的日记', 'A beacon and an open journal on a ledge above the water'),
  },
  {
    art: plate('finale-abyss-journal', 1536, 1024), place: b('日记 · 纸页', 'The journal'),
    note: b('纸页被水浸过，字还认得出。', 'The pages are damp. The words still read.'),
    alt: b('被水打湿的日记本摊在铁栏上', 'A water-stained journal lying open on a railing'),
  },
  {
    art: plate('finale-archive'), place: b('档案室 · 桌面', 'The records room'),
    note: b('账本、录像、值班表，都摊在桌上。', 'A ledger, footage and a roster, laid out on the desk.'),
    alt: b('夜晚的档案室，桌上摊着账本与档案柜', 'A records room at night, ledgers open on the desk'),
  },
  {
    art: plate('finale-laboratory'), place: b('实验区 · 走廊', 'The laboratory'),
    note: b('走廊尽头那扇门亮着，像是一直在等人。', 'The door at the end of the corridor is still lit.'),
    alt: b('夜里的实验区，病床与亮着灯的走廊', 'A laboratory at night, a bed and a lit corridor'),
  },
  {
    art: plate('finale-core', 1536, 1024), place: b('核心 · 光', 'The core'),
    note: b('光从中间升起来，把整层楼照成白昼。', 'Light rises from the centre and turns the floor to daylight.'),
    alt: b('大厅中央升起的光团与环状装置', 'A ring of light rising in the middle of a hall'),
  },
  {
    art: plate('finale-city', 1536, 1024), place: b('城市 · 天台', 'The city'),
    note: b('霓虹亮着，雨还没干。', 'Neon is on. The asphalt is still wet.'),
    alt: b('夜里的城市天台，远处是亮着灯的高楼', 'A rooftop at night with a lit skyline beyond'),
  },
  {
    art: plate('finale-dawn', 1536, 1024), place: b('天亮 · 街道', 'The dawn'),
    note: b('太阳照到街上，天亮了。', 'Sunlight reaches the street. It is morning.'),
    alt: b('清晨的阳光照进城市街道', 'Morning sunlight falling across a city street'),
  },
]

const route: { n: number; art: Plate; title: Bilingual; line: Bilingual }[] = [
  { n: 1, art: plate('P02'), title: b('缘起', 'Origin'), line: b('雨夜相遇，走进迷雾里的游乐园。', 'A rainy meeting, then the mistbound fairground.') },
  { n: 2, art: plate('chapter-02-ice-hall'), title: b('冰镜疑凶', 'The Culprit in the Ice'), line: b('穿过冰封镜馆，拼出被裁切的那一秒。', 'Follow a shadow through the frozen mirror hall.') },
  { n: 3, art: plate('chapter-03-cg-entrance'), title: b('血色交易', 'The Crimson Bargain'), line: b('那出戏一次次重演，直到有人肯停下来。', 'The play keeps starting over until someone stops it.') },
  { n: 4, art: plate('chapter-04-gilded-room'), title: b('金笼', 'The Gilded Cage'), line: b('把画拼完，再想怎么回到现实。', 'Finish the painting, then find a way back.') },
  { n: 5, art: plate('finale-city', 1536, 1024), title: b('终章', 'Finale'), line: b('追捕、实验区与核心之后，城市等着你。', 'Pursuit, the laboratory, the core — then the city.') },
]

const sealed: { label: Bilingual }[] = [
  { label: b('这里往后的每一步', 'Every step after this') },
  { label: b('名字，与面孔', 'Names and faces') },
  { label: b('最后一次回答', 'The last answer') },
]

/** The contact sheet renders three copies so it can wrap without ever running out of stills.
 *  Only the middle copy is exposed to assistive tech and the tab order. */
function shotCard(shot: Shot, index: number, language: Language, decorated: boolean) {
  return `<button class="fl-shot" type="button" data-fl-open data-fl-src="/images/${shot.art.id}.webp" data-fl-alt="${esc(text(shot.alt, language))}" data-fl-place="${esc(text(shot.place, language))}" data-fl-note="${esc(text(shot.note, language))}" style="--fl-rot:${index % 2 ? '0.9deg' : '-0.8deg'}"${decorated ? '' : ' tabindex="-1"'}>
              <span class="fl-shot-frame">${img(shot.art, text(shot.alt, language))}</span>
              <span class="fl-shot-caption"><span class="fl-shot-index">0${index + 1}</span><span class="fl-shot-place">${esc(text(shot.place, language))}</span><span class="fl-shot-note">${esc(text(shot.note, language))}</span></span>
            </button>`
}

/* ---------------------------------------------------------------------------
 * Campaign theme. The track scores the Chinese page, fades in when it starts,
 * fades out into the loop point, and is remembered for the session only.
 * ------------------------------------------------------------------------- */
const BGM_SRC = '/audio/bgm/naiwa-finale-theme.m4a'
const BGM_VOLUME = 0.45
const BGM_FADE_IN = 2200
const BGM_FADE_OUT = 2600
const BGM_FADE_STOP = 900
/** Which page languages are scored. Add 'en' here to play the theme everywhere. */
const BGM_LANGUAGES: Language[] = ['zh']
let bgmEnabled = true

function bgmToggleMarkup(language: Language): string {
  if (!BGM_LANGUAGES.includes(language)) return ''
  return `<button id="bgm-toggle" type="button" class="fl-bgm-toggle" aria-pressed="true" aria-label="${language === 'zh' ? '背景音乐' : 'Background music'}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="fl-bgm-speaker" d="M4 9.4h3.2L11.5 6v12L7.2 14.6H4z"/><path class="fl-bgm-wave" d="M14.6 9.2a4.2 4.2 0 0 1 0 5.6"/><path class="fl-bgm-wave" d="M17.1 6.7a7.7 7.7 0 0 1 0 10.6"/><path class="fl-bgm-slash" d="M5 19 19 5"/></svg>
        </button>`
}

function actions(language: Language, started: boolean) {
  const primary = started ? text(copy.playStarted, language) : text(copy.play, language)
  return `<div class="fl-actions">
      <span class="fl-play-shell">
        <span class="fl-play-veil" data-fl-veil aria-hidden="true"></span>
        <button type="button" class="fl-play" data-promo-play id="${started ? 'continue' : 'start'}" aria-describedby="fl-gate-note">${esc(primary)}<span aria-hidden="true">↗</span></button>
      </span>
      ${started ? `<button type="button" class="fl-text-button" data-promo-restart id="start">${esc(text(copy.restart, language))}</button>` : ''}
      <button type="button" class="fl-text-button" data-promo-routes id="routes-intro">${esc(text(copy.routes, language))}<span aria-hidden="true">＋</span></button>
    </div>`
}

/** Render the read-only finale campaign page. Gameplay, storage and audio are mounted elsewhere. */
export function renderFinalePromo(chapter: FinaleChapter, language: Language, started = false, saveNote = ''): string {
  chapter = 5
  const zh = language === 'zh'
  const scored = BGM_LANGUAGES.includes(language)
  const number = '05'
  const title = titleFor(chapter, language)
  const nav = copy.nav.map((item, index) => `<a href="#${['fl-descent', 'fl-photos', 'fl-route', 'fl-start'][index]}" data-promo-anchor>${esc(text(item, language))}</a>`).join('')
  return `<div class="chapter-promo promo-finale finale-launch" data-promo-chapter="5" lang="${zh ? 'zh-CN' : 'en'}">
    <a class="promo-skip" href="#fl-descent" data-promo-anchor>${zh ? '跳到章节介绍' : 'Skip to the chapter introduction'}</a>
    <header class="fl-header">
      <a class="fl-brand" id="chapter-home" href="?" aria-label="${zh ? '奶之救赎 · 返回章节选择' : 'Naiwa · Back to chapters'}">naiwa<span>CHAPTER ${number}</span></a>
      <nav class="fl-nav" aria-label="${zh ? '本页导航' : 'On this page'}">${nav}</nav>
      <div class="fl-tools">
        <button id="routes-intro-top" type="button">${esc(text(copy.routes, language))}</button>
        ${bgmToggleMarkup(language)}
        <button id="language" type="button" aria-label="${zh ? 'Switch to English' : '切换至中文'}">${zh ? 'EN' : '中文'}</button>
        <details class="fl-utility"><summary aria-label="${zh ? '更多选项' : 'More options'}"><span aria-hidden="true">＋</span></summary><div class="fl-utility-menu">
          <button id="chapter-return" type="button" aria-keyshortcuts="Escape">← ${esc(text(copy.home, language))}</button>
          <button id="fullscreen" type="button">${zh ? '全屏' : 'Fullscreen'}</button>
        </div></details>
      </div>
      <div class="promo-reading" aria-hidden="true"><span></span></div>
    </header>
    ${scored ? `<audio class="fl-bgm" data-fl-bgm src="${BGM_SRC}" preload="auto" aria-hidden="true"></audio>` : ''}
    <main>
      <section class="fl-hero" aria-labelledby="promo-title">
        <div class="fl-hero-media" data-fl-parallax="0.14">${img(plate('finale-city', 1536, 1024), '', 'fl-hero-image', true)}</div>
        <div class="fl-hero-glow" aria-hidden="true"></div>
        <div class="fl-hero-figure" data-fl-parallax="-0.05">${img(plate('finale-naiwa', 1078, 1459), zh ? '奶蛙抬手打招呼' : 'Naiwa waving', 'fl-hero-naiwa')}</div>
        <div class="fl-hero-fan" aria-hidden="true">
          <figure class="fl-fan-card"><span class="fl-fan-frame">${img(plate('finale-abyss-beacon', 1536, 1024), '')}</span><figcaption>01 · 信标</figcaption></figure>
          <figure class="fl-fan-card"><span class="fl-fan-frame">${img(plate('finale-laboratory', 1672, 941), '')}</span><figcaption>02 · 实验区</figcaption></figure>
          <figure class="fl-fan-card"><span class="fl-fan-frame">${img(plate('finale-core', 1536, 1024), '')}</span><figcaption>03 · 核心</figcaption></figure>
        </div>
        <div class="fl-hero-copy">
          <p class="fl-eyebrow">NAIWA / ${zh ? '奶之救赎' : 'AN INTERACTIVE STORY'}</p>
          <p class="fl-chapter-label"><span>${number}</span> ${esc(text(copy.heroLabel, language))} · ${esc(title)}</p>
          <h1 id="promo-title" class="fl-title">${kinetic(text(copy.heroTitle, language))}</h1>
          <p class="fl-lead">${esc(text(copy.heroLead, language))}</p>
          <p class="fl-note">${esc(text(copy.heroNote, language))}</p>
          <p class="fl-save-note">${esc(saveNote)}</p>
        </div>
        <div class="fl-hero-foot">
          <a href="#fl-descent" data-promo-anchor><span class="fl-scroll-line" aria-hidden="true"></span>${esc(text(copy.heroCue, language))}<span aria-hidden="true">↓</span></a>
          <span class="fl-hero-index" aria-hidden="true">${number} / 05</span>
        </div>
      </section>
      <section class="fl-section fl-descent" id="fl-descent" tabindex="-1" aria-labelledby="fl-descent-title">
        <div class="fl-section-label" data-promo-reveal><span>01 / ${esc(text(copy.descentLabel, language))}</span><span>${zh ? '故事从这里继续' : 'Where it continues'}</span></div>
        <div class="fl-descent-grid">
          <div class="fl-descent-copy">
            <h2 id="fl-descent-title" data-promo-reveal>${esc(text(copy.descentTitle, language)).replaceAll('\n', '<br>')}</h2>
            <p data-promo-reveal>${esc(text(copy.descentBody, language))}</p>
            <p data-promo-reveal>${esc(text(copy.descentHint, language))}</p>
            <ul class="fl-stats">${copy.stats.map(item => `<li data-promo-reveal><strong data-fl-count="${item.value}">0</strong><span>${esc(text(item.label, language))}</span></li>`).join('')}</ul>
          </div>
          <div class="fl-descent-plate" data-fl-stack>
            ${[plate('finale-abyss', 1536, 1024), plate('finale-abyss-descent', 1536, 1024), plate('finale-abyss-depth', 1536, 1024)]
              .map((art, index) => `<figure class="fl-plate${index === 0 ? ' is-active' : ''}" data-fl-plate="${index}">${img(art, zh ? '深渊中的记忆空间' : 'A memory space in the depths')}<figcaption><span>0${index + 1}</span>${['水面', '台阶', '深处'][index]}</figcaption></figure>`).join('')}
            <div class="fl-plate-rule" aria-hidden="true"></div>
          </div>
        </div>
      </section>
      <section class="fl-section fl-photos" id="fl-photos" tabindex="-1" aria-labelledby="fl-photos-title">
        <div class="fl-section-label" data-promo-reveal><span>02 / ${esc(text(copy.photosLabel, language))}</span><span>${zh ? '不剧透的截图' : 'Spoiler-free stills'}</span></div>
        <div class="fl-photos-head">
          <h2 id="fl-photos-title" data-promo-reveal>${esc(text(copy.photosTitle, language))}</h2>
          <div class="fl-photos-aside" data-promo-reveal>
            <p>${esc(text(copy.photosBody, language))}</p>
            <div class="fl-strip-controls">
              <button type="button" data-fl-strip-prev aria-label="${zh ? '上一张照片' : 'Previous still'}"><span aria-hidden="true">←</span></button>
              <button type="button" data-fl-strip-next aria-label="${zh ? '下一张照片' : 'Next still'}"><span aria-hidden="true">→</span></button>
            </div>
          </div>
        </div>
        <div class="fl-strip" data-fl-strip tabindex="0" role="group" aria-label="${zh ? '终章照片墙 · 循环滚动' : 'Finale stills · loops'}">
          <div class="fl-strip-track" data-fl-track>
            ${[0, 1, 2].map(set => `<div class="fl-strip-set"${set === 1 ? '' : ' aria-hidden="true"'}>${shots.map((shot, index) => shotCard(shot, index, language, set === 1)).join('')}</div>`).join('')}
          </div>
        </div>
        <p class="fl-strip-hint" data-promo-reveal><span aria-hidden="true">←</span>${esc(text(copy.photosHint, language))}<span aria-hidden="true">→</span></p>
      </section>
      <section class="fl-section fl-route" id="fl-route" tabindex="-1" aria-labelledby="fl-route-title">
        <div class="fl-section-label" data-promo-reveal><span>03 / ${esc(text(copy.routeLabel, language))}</span><span>01 — 05</span></div>
        <div class="fl-route-head"><h2 id="fl-route-title" data-promo-reveal>${esc(text(copy.routeTitle, language))}</h2><p data-promo-reveal>${esc(text(copy.routeBody, language))}</p></div>
        <div class="fl-route-grid">
          <div class="fl-route-preview"><div class="fl-route-window">
            ${route.map((item, index) => `<figure class="fl-route-plate${index === 4 ? ' is-active' : ''}" data-fl-route-plate="${index}">${img(item.art, text(item.title, language))}</figure>`).join('')}
          </div><p class="fl-route-preview-note" data-fl-route-note>${esc(text(route[4].line, language))}</p></div>
          <ol class="fl-route-list">
            ${route.map((item, index) => `<li data-fl-route-item="${index}"><a href="?chapter=${item.n}" data-promo-chapter-link="${item.n}"${item.n === 5 ? ' data-fl-current="true"' : ''}>
              <span class="fl-route-number">0${item.n}</span><span class="fl-route-copy"><strong>${esc(text(item.title, language))}</strong><small>${esc(text(item.line, language))}</small></span><span class="fl-route-mark" aria-hidden="true">${item.n === 5 ? '●' : '↗'}</span>
            </a></li>`).join('')}
          </ol>
        </div>
      </section>
      <section class="fl-section fl-sealed" id="fl-sealed" tabindex="-1" aria-labelledby="fl-sealed-title">
        <div class="fl-section-label" data-promo-reveal><span>04 / ${esc(text(copy.sealedLabel, language))}</span><span>${zh ? '保密' : 'Classified'}</span></div>
        <div class="fl-sealed-grid">
          <div class="fl-sealed-copy">
            <h2 id="fl-sealed-title" data-promo-reveal>${esc(text(copy.sealedTitle, language)).replaceAll('\n', '<br>')}</h2>
            <p data-promo-reveal>${esc(text(copy.sealedBody, language))}</p>
            <p class="fl-sealed-note" data-promo-reveal>${esc(text(copy.sealedNote, language))}</p>
          </div>
          <ol class="fl-sealed-list">
            ${sealed.map((item, index) => `<li data-promo-reveal style="--d:${index * 90}ms"><span class="fl-sealed-label">${esc(text(item.label, language))}</span><span class="fl-sealed-bar" aria-hidden="true"><i></i></span><span class="fl-sealed-bar" aria-hidden="true"><i></i></span></li>`).join('')}
          </ol>
        </div>
      </section>
      <section class="fl-start" id="fl-start" tabindex="-1" aria-labelledby="fl-start-title">
        <div class="fl-start-media" data-fl-parallax="0.1">${img(plate('finale-city', 1536, 1024), '')}</div>
        <div class="fl-start-figure">${img(plate('finale-naiwa', 1078, 1459), zh ? '奶蛙站在城市前方' : 'Naiwa standing before the city', 'fl-start-naiwa')}</div>
        <div class="fl-start-copy">
          <p class="fl-eyebrow">CHAPTER ${number} / ${esc(text(copy.startLabel, language))}</p>
          <h2 id="fl-start-title" data-promo-reveal>${esc(text(copy.startTitle, language)).replaceAll('\n', '<br>')}</h2>
          <p data-promo-reveal>${esc(text(copy.startBody, language))}</p>
          <div class="fl-gate" data-fl-gate>
            <span class="fl-gate-ring" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false"><circle class="fl-ring-track" cx="24" cy="24" r="20"></circle><circle class="fl-ring-value" cx="24" cy="24" r="20" data-fl-ring></circle></svg>
              <span class="fl-gate-check" aria-hidden="true">✓</span>
            </span>
            <span class="fl-gate-copy"><strong data-fl-gate-title>${esc(text(copy.gateLocked, language))}</strong><small id="fl-gate-note" data-fl-gate-note>${esc(text(copy.gateProgress, language))} <b data-fl-gate-percent>0%</b></small></span>
          </div>
          ${actions(language, started)}
          <a class="fl-text-button fl-home-link" href="?" data-finale-home>${esc(text(copy.home, language))}<span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </main>
    <footer class="fl-footer">
      <div class="fl-footer-heading"><span>THE CHAPTERS</span><button id="release-entry" type="button">${esc(text(copy.whatsNew, language))} <span aria-hidden="true">＋</span></button></div>
      <nav aria-label="${zh ? '切换章节' : 'Choose a chapter'}">${route.map(item => `<a href="?chapter=${item.n}" data-promo-chapter-link="${item.n}"${item.n === 5 ? ' aria-current="page"' : ''}><span>0${item.n}</span><strong>${esc(text(item.title, language))}</strong><span aria-hidden="true">${item.n === 5 ? '●' : '↗'}</span></a>`).join('')}</nav>
      <div class="fl-colophon"><span>naiwa / 奶之救赎</span><span>© 2026 NAIWA</span><a href="#promo-title" data-promo-anchor>${esc(text(copy.top, language))} <span aria-hidden="true">↑</span></a></div>
    </footer>
    <div class="fl-hud" data-fl-hud aria-hidden="false">
      <span class="fl-hud-ring"><svg viewBox="0 0 36 36" focusable="false"><circle class="fl-ring-track" cx="18" cy="18" r="15"></circle><circle class="fl-ring-value" cx="18" cy="18" r="15" data-fl-ring></circle></svg></span>
      <span class="fl-hud-text"><b data-fl-gate-percent>0%</b><small>${esc(text(copy.gateProgress, language))}</small></span>
    </div>
    <div class="fl-toast" data-fl-toast role="status" aria-live="polite"></div>
  </div>`
}

/** Read-only chapter cards used on the home page. */
export function renderFinaleEntries(language: Language): string {
  const zh = language === 'zh'
  return `<div class="finale-entry-pair finale-entry-single" aria-label="${zh ? '第五章 · 终章' : 'Chapter Five · Finale'}"><a class="finale-entry finale-entry-five" id="chapter-five" href="?chapter=5" data-promo-chapter-link="5"><span class="finale-entry-art" aria-hidden="true"></span><span class="finale-entry-copy"><span class="card-overline">CHAPTER 05 / ${zh ? '终章' : 'FINALE'}</span><strong>${esc(titleFor(5, language))}</strong><span class="card-description">${zh ? '穿过追捕、实验区交锋与核心封锁，走向城市决战。' : 'Survive pursuit, laboratory clashes and the core blockade, then reach the city battle.'}</span><span class="finale-entry-action">${zh ? '查看终章介绍' : 'Explore the finale'} <span aria-hidden="true">↗</span></span></span><span class="finale-entry-number" aria-hidden="true">05</span></a></div>`
}

/* ---------------------------------------------------------------------------
 * Presentation only. This controller owns the campaign viewport: it reads
 * geometry, animates layers, opens stills and gates the start button. It never
 * touches a save, a chapter checkpoint or an audio element.
 * ------------------------------------------------------------------------- */

/** Reading the page once per tab is enough; the flag is deliberately in memory only. */
let pageRead = false
const CIRCUMFERENCE = 2 * Math.PI * 20
const HUD_CIRCUMFERENCE = 2 * Math.PI * 15

export type FinalePromoController = { getScrollTop: () => number; dispose: () => void }

export function mountFinalePromo(root: HTMLElement, restoredScroll = 0): FinalePromoController {
  const pageElement = root.querySelector<HTMLElement>('.finale-launch')
  if (!pageElement) return { getScrollTop: () => 0, dispose() {} }
  const page = pageElement
  const header = page.querySelector<HTMLElement>('.fl-header')
  const reveals = [...page.querySelectorAll<HTMLElement>('[data-promo-reveal]')]
  const parallax = [...page.querySelectorAll<HTMLElement>('[data-fl-parallax]')]
  const stack = page.querySelector<HTMLElement>('[data-fl-stack]')
  const plates = [...page.querySelectorAll<HTMLElement>('[data-fl-plate]')]
  const strip = page.querySelector<HTMLElement>('[data-fl-strip]')
  const stripTrack = page.querySelector<HTMLElement>('[data-fl-track]')
  const stripPrev = page.querySelector<HTMLElement>('[data-fl-strip-prev]')
  const stripNext = page.querySelector<HTMLElement>('[data-fl-strip-next]')
  const shots = [...page.querySelectorAll<HTMLElement>('[data-fl-open]')]
  const routeItems = [...page.querySelectorAll<HTMLElement>('[data-fl-route-item]')]
  const routePlates = [...page.querySelectorAll<HTMLElement>('[data-fl-route-plate]')]
  const routeNote = page.querySelector<HTMLElement>('[data-fl-route-note]')
  const gate = page.querySelector<HTMLElement>('[data-fl-gate]')
  const gateTitle = page.querySelector<HTMLElement>('[data-fl-gate-title]')
  const gateNote = page.querySelector<HTMLElement>('[data-fl-gate-note]')
  const percentages = [...page.querySelectorAll<HTMLElement>('[data-fl-gate-percent]')]
  const rings = [...page.querySelectorAll<SVGCircleElement>('[data-fl-ring]')]
  const hud = page.querySelector<HTMLElement>('[data-fl-hud]')
  const toast = page.querySelector<HTMLElement>('[data-fl-toast]')
  const gated = () => [...page.querySelectorAll<HTMLElement>('[data-promo-play], [data-promo-restart], [data-promo-routes], #routes-intro-top')]
  const gateMessage = <T extends Bilingual>(value: T) => value[page.lang === 'en' ? 'en' : 'zh']
  const routeLines = route.map(item => gateMessage(item.line))

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let disposed = false
  let frame = 0
  let unlocked = pageRead
  let activePlate = 0
  let activeRoute = route.length - 1
  let toastTimer = 0
  /** Width of one full pass of stills; 0 when the sheet is too narrow to loop safely. */
  let loopWidth = 0
  let suppressClick = false
  let dragging = false
  let dragStartX = 0
  let dragStartScroll = 0
  let lastFocus: HTMLElement | null = null

  page.scrollTop = restoredScroll
  page.classList.toggle('is-unlocked', unlocked)

  rings.forEach(ring => {
    const length = ring.closest('.fl-hud-ring') ? HUD_CIRCUMFERENCE : CIRCUMFERENCE
    ring.style.strokeDasharray = String(length)
    ring.style.strokeDashoffset = String(unlocked ? 0 : length)
  })

  /* --- still viewer ------------------------------------------------------- */
  const viewer = document.createElement('dialog')
  viewer.className = 'fl-viewer'
  viewer.innerHTML = `<div class="fl-viewer-inner"><button class="fl-viewer-close" type="button" aria-label="${page.lang === 'en' ? 'Close' : '关闭'}">✕</button><img class="fl-viewer-image" alt="" decoding="async"><p class="fl-viewer-caption"><span></span><small></small></p></div>`
  const viewerImage = viewer.querySelector<HTMLImageElement>('.fl-viewer-image')!
  const viewerPlace = viewer.querySelector<HTMLElement>('.fl-viewer-caption span')!
  const viewerNote = viewer.querySelector<HTMLElement>('.fl-viewer-caption small')!
  viewer.querySelector('.fl-viewer-close')?.addEventListener('click', () => viewer.close())
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close() })
  viewer.addEventListener('close', () => { lastFocus?.focus({ preventScroll: true }); lastFocus = null })
  root.append(viewer)

  function openViewer(button: HTMLElement) {
    const src = button.dataset.flSrc
    if (!src) return
    lastFocus = button
    viewerImage.src = src
    viewerImage.alt = button.dataset.flAlt ?? ''
    viewerPlace.textContent = button.dataset.flPlace ?? ''
    viewerNote.textContent = button.dataset.flNote ?? ''
    if (typeof viewer.showModal === 'function' && !viewer.open) viewer.showModal()
    else viewer.setAttribute('open', '')
    viewer.querySelector<HTMLElement>('.fl-viewer-close')?.focus({ preventScroll: true })
  }

  /* --- unlock gate ------------------------------------------------------- */
  function announce(message: string) {
    if (!toast) return
    toast.textContent = message
    toast.classList.add('is-visible')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600)
  }

  function setUnlocked(next: boolean, celebrate = false) {
    unlocked = next
    if (next) pageRead = true
    page.classList.toggle('is-unlocked', unlocked)
    gated().forEach(button => {
      if (unlocked) button.removeAttribute('aria-disabled')
      else button.setAttribute('aria-disabled', 'true')
    })
    if (gateTitle) gateTitle.textContent = gateMessage(unlocked ? copy.gateReady : copy.gateLocked)
    if (gateNote) gateNote.hidden = unlocked
    if (rings.length) {
      rings.forEach(ring => {
        if (unlocked) ring.style.strokeDashoffset = '0'
      })
    }
    if (unlocked && celebrate) {
      hud?.classList.add('is-done')
      announce(gateMessage(copy.gateReady))
    }
  }

  function blocked() {
    const target = page.querySelector<HTMLElement>('[data-promo-play]')
    target?.classList.add('is-nudged')
    window.setTimeout(() => target?.classList.remove('is-nudged'), 620)
    gate?.classList.add('is-alert')
    window.setTimeout(() => gate?.classList.remove('is-alert'), 620)
    const remaining = Math.max(0, Math.round((1 - readingProgress()) * 100))
    announce(`${gateMessage(copy.gateHint)} · ${remaining}%`)
  }

  // Capture phase: the page decides whether a gated control may reach its own handler.
  function guard(event: Event) {
    if (unlocked) return
    const target = event.target as Element | null
    if (!target?.closest?.('[data-promo-play], [data-promo-restart], [data-promo-routes], #routes-intro-top')) return
    event.stopPropagation()
    event.preventDefault()
    blocked()
  }
  page.addEventListener('click', guard, true)

  /* --- reading progress -------------------------------------------------- */
  function readingProgress() {
    const max = page.scrollHeight - page.clientHeight
    return max > 0 ? Math.min(1, Math.max(0, page.scrollTop / max)) : 1
  }

  function update() {
    frame = 0
    if (disposed) return
    const height = page.clientHeight
    const top = page.scrollTop
    const max = page.scrollHeight - height
    const bounds = page.getBoundingClientRect()
    const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 1

    page.style.setProperty('--promo-reading', String(progress))
    page.style.setProperty('--fl-scroll', `${Math.min(top, 900)}px`)
    header?.classList.toggle('is-scrolled', top > 24)

    const offsets = parallax.map(element => {
      const rect = element.getBoundingClientRect()
      const centre = rect.top - bounds.top + rect.height / 2
      return (height / 2 - centre) * Number(element.dataset.flParallax ?? 0.12)
    })
    parallax.forEach((element, index) => element.style.setProperty('--fl-shift', reduced.matches ? '0px' : `${offsets[index].toFixed(1)}px`))

    if (stack && plates.length) {
      const rect = stack.getBoundingClientRect()
      const span = Math.max(1, rect.height - height * .4)
      const seen = (height * .6 - (rect.top - bounds.top)) / span
      const next = Math.min(plates.length - 1, Math.max(0, Math.floor(seen * plates.length)))
      if (next !== activePlate) {
        activePlate = next
        plates.forEach((element, index) => element.classList.toggle('is-active', index === activePlate))
      }
    }

    const shown = Math.round(progress * 100)
    percentages.forEach(element => { element.textContent = `${shown}%` })
    rings.forEach(ring => {
      const length = ring.closest('.fl-hud-ring') ? HUD_CIRCUMFERENCE : CIRCUMFERENCE
      const value = unlocked ? 1 : progress
      if (!unlocked) ring.style.strokeDashoffset = String(length * (1 - value))
      else ring.style.strokeDashoffset = '0'
    })
    if (hud) hud.classList.toggle('is-visible', top > height * .35 && !unlocked)

    const reachedEnd = max <= 0 || top >= max - 6
    if (reachedEnd && !unlocked) setUnlocked(true, true)
  }

  function schedule() {
    if (!disposed && !frame) frame = window.requestAnimationFrame(update)
  }

  /* --- reveal + counters ------------------------------------------------- */
  const revealObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-revealed')
      if (entry.target.classList.contains('fl-shot')) entry.target.classList.add('is-developed')
      entry.target.querySelectorAll<HTMLElement>('[data-fl-count]').forEach(count)
      revealObserver?.unobserve(entry.target)
    }
  }, { root: page, threshold: 0.12, rootMargin: '0px 0px -40px 0px' })

  function count(element: HTMLElement) {
    const target = Number(element.dataset.flCount ?? 0)
    if (!target || reduced.matches) { element.textContent = String(target); return }
    const start = performance.now()
    const step = (now: number) => {
      if (disposed) return
      const t = Math.min(1, (now - start) / 900)
      element.textContent = String(Math.round(target * (1 - (1 - t) ** 3)))
      if (t < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }

  const motionAllowed = typeof IntersectionObserver !== 'undefined' && !reduced.matches
  page.classList.toggle('has-motion', motionAllowed)
  if (!motionAllowed) reveals.forEach(element => element.classList.add('is-revealed'))
  reveals.forEach(element => revealObserver?.observe(element))
  shots.forEach(element => revealObserver?.observe(element))

  /* --- campaign theme ---------------------------------------------------- */
  const bgm = page.querySelector<HTMLAudioElement>('[data-fl-bgm]')
  const bgmToggle = page.querySelector<HTMLButtonElement>('#bgm-toggle')
  const bgmScored = BGM_LANGUAGES.includes(page.lang === 'en' ? 'en' : 'zh')
  let bgmWanted = false
  let bgmVolume = 0
  let bgmFrame = 0
  let bgmFadingOut = false
  let bgmStopTimer = 0
  let bgmGesturesArmed = false

  function rampBgm(target: number, duration: number) {
    const element = bgm
    if (!element) return
    if (bgmFrame) window.cancelAnimationFrame(bgmFrame)
    const from = bgmVolume
    const start = performance.now()
    const step = (now: number) => {
      const t = duration > 0 ? Math.min(1, Math.max(0, (now - start) / duration)) : 1
      bgmVolume = from + (target - from) * t
      element.volume = Math.max(0, Math.min(1, bgmVolume))
      bgmFrame = t < 1 ? window.requestAnimationFrame(step) : 0
    }
    bgmFrame = window.requestAnimationFrame(step)
  }
  function silenceBgm() {
    bgmVolume = 0
    if (bgmFrame) { window.cancelAnimationFrame(bgmFrame); bgmFrame = 0 }
    if (bgm) bgm.volume = 0
  }
  function releaseGestures() {
    if (!bgmGesturesArmed) return
    bgmGesturesArmed = false
    window.removeEventListener('pointerdown', onFirstGesture)
    window.removeEventListener('keydown', onFirstGesture)
    window.removeEventListener('wheel', onFirstGesture)
  }
  function armGestures() {
    if (bgmGesturesArmed || disposed) return
    bgmGesturesArmed = true
    window.addEventListener('pointerdown', onFirstGesture, { passive: true })
    window.addEventListener('keydown', onFirstGesture)
    window.addEventListener('wheel', onFirstGesture, { passive: true })
  }
  function playBgm() {
    const element = bgm
    if (!element || !bgmWanted || !element.paused) return
    bgmFadingOut = false
    element.volume = bgmVolume
    rampBgm(BGM_VOLUME, BGM_FADE_IN)
    let attempt: Promise<void> | undefined
    try { attempt = element.play() } catch { attempt = undefined }
    if (!attempt || typeof attempt.then !== 'function') return
    attempt.then(() => releaseGestures()).catch(() => {
      // Autoplay was refused: stay silent and wait for the first real gesture.
      silenceBgm()
      armGestures()
    })
  }
  function stopBgm() {
    const element = bgm
    if (!element) return
    bgmFadingOut = false
    window.clearTimeout(bgmStopTimer)
    if (element.paused) { silenceBgm(); return }
    rampBgm(0, BGM_FADE_STOP)
    bgmStopTimer = window.setTimeout(() => {
      if (bgmWanted) return
      element.pause()
      silenceBgm()
    }, BGM_FADE_STOP + 80)
  }
  function syncBgm() {
    bgmWanted = bgmEnabled && bgmScored
    if (bgmWanted) playBgm()
    else stopBgm()
  }
  function onFirstGesture() { releaseGestures(); playBgm() }
  function onBgmProgress() {
    const element = bgm
    if (!element || !bgmWanted || element.paused || bgmFadingOut) return
    const total = element.duration
    if (!Number.isFinite(total) || total <= 0) return
    const remaining = total - element.currentTime
    if (remaining > BGM_FADE_OUT / 1000) return
    // Fade out over whatever is left so the loop point never cuts mid-note.
    bgmFadingOut = true
    rampBgm(0, Math.max(500, remaining * 1000))
  }
  function onBgmEnded() {
    const element = bgm
    if (!element) return
    element.currentTime = 0
    bgmFadingOut = false
    silenceBgm()
    if (bgmWanted) playBgm()
  }
  function onBgmToggle() {
    bgmEnabled = !bgmEnabled
    bgmToggle?.setAttribute('aria-pressed', bgmEnabled ? 'true' : 'false')
    syncBgm()
  }
  bgmToggle?.setAttribute('aria-pressed', bgmEnabled ? 'true' : 'false')
  bgmToggle?.addEventListener('click', onBgmToggle)
  bgm?.addEventListener('timeupdate', onBgmProgress)
  bgm?.addEventListener('ended', onBgmEnded)
  syncBgm()

  /* --- photo strip ------------------------------------------------------- */
  /** The track holds three identical passes. Keep the viewport inside the middle one and
   *  shift it by exactly one pass whenever it drifts out, so the sheet never shows an end. */
  function measureStrip() {
    if (!strip || !stripTrack) return
    const cards = [...stripTrack.querySelectorAll<HTMLElement>('[data-fl-open]')]
    const perSet = Math.round(cards.length / 3)
    const first = cards[0]
    const second = perSet > 0 ? cards[perSet] : undefined
    if (!first || !second) return
    const step = second.offsetLeft - first.offsetLeft
    // A pass narrower than the viewport would leave a gap while wrapping, so looping stays off.
    if (!Number.isFinite(step) || step <= (strip.clientWidth || 0) * 1.15) { loopWidth = 0; return }
    const previous = loopWidth
    loopWidth = step
    strip.scrollLeft = loopWidth + (previous > 0 ? strip.scrollLeft % loopWidth : 0)
  }
  function wrapStrip() {
    if (!strip || !loopWidth) return 0
    let delta = 0
    if (strip.scrollLeft >= loopWidth * 2) delta = -loopWidth
    else if (strip.scrollLeft < loopWidth) delta = loopWidth
    if (delta) strip.scrollLeft += delta
    return delta
  }
  const onStripScroll = () => { wrapStrip() }
  function onStripDown(event: PointerEvent) {
    if (!strip || event.pointerType !== 'mouse' || event.button !== 0) return
    dragging = true
    suppressClick = false
    dragStartX = event.clientX
    dragStartScroll = strip.scrollLeft
    strip.classList.add('is-grabbing')
  }
  function onStripMove(event: PointerEvent) {
    if (!strip || !dragging) return
    const dx = event.clientX - dragStartX
    if (Math.abs(dx) > 5) suppressClick = true
    strip.scrollLeft = dragStartScroll - dx
    // A wrap mid-drag must not fight the pointer, so the drag origin moves with it.
    dragStartScroll += wrapStrip()
    if (suppressClick) event.preventDefault()
  }
  function onStripUp() {
    if (!dragging) return
    dragging = false
    strip?.classList.remove('is-grabbing')
  }
  function onStripClick(event: Event) {
    if (!suppressClick) return
    suppressClick = false
    event.stopPropagation()
    event.preventDefault()
  }
  function onStripKey(event: KeyboardEvent) {
    if (!strip) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    wrapStrip()
    strip.scrollBy({ left: event.key === 'ArrowLeft' ? -320 : 320, behavior: reduced.matches ? 'auto' : 'smooth' })
  }
  function scrollStrip(direction: number) {
    if (!strip) return
    wrapStrip()
    strip.scrollBy({ left: direction * Math.max(240, (strip.clientWidth || 0) * .7), behavior: reduced.matches ? 'auto' : 'smooth' })
  }
  const onStripPrev = () => scrollStrip(-1)
  const onStripNext = () => scrollStrip(1)
  stripPrev?.addEventListener('click', onStripPrev)
  stripNext?.addEventListener('click', onStripNext)
  strip?.addEventListener('pointerdown', onStripDown as EventListener)
  window.addEventListener('pointermove', onStripMove as EventListener, { passive: false })
  window.addEventListener('pointerup', onStripUp)
  window.addEventListener('pointercancel', onStripUp)
  strip?.addEventListener('click', onStripClick, true)
  strip?.addEventListener('keydown', onStripKey)
  strip?.addEventListener('scroll', onStripScroll, { passive: true })
  measureStrip()

  shots.forEach(button => button.addEventListener('click', () => {
    if (suppressClick) return
    openViewer(button)
  }))

  /* --- route preview ----------------------------------------------------- */
  function setRoute(index: number) {
    if (index === activeRoute) return
    activeRoute = index
    routePlates.forEach((element, position) => element.classList.toggle('is-active', position === index))
    routeItems.forEach((element, position) => element.classList.toggle('is-active', position === index))
    if (routeNote) routeNote.textContent = routeLines[index] ?? ''
  }
  routeItems.forEach(item => {
    const index = Number(item.dataset.flRouteItem)
    item.addEventListener('pointerenter', () => setRoute(index))
    item.addEventListener('focusin', () => setRoute(index))
  })

  /* --- in-page navigation ------------------------------------------------ */
  function navigate(event: Event) {
    const click = event as MouseEvent
    if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return
    const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('[data-promo-anchor]')
    if (!anchor) return
    const target = page.querySelector<HTMLElement>(anchor.hash)
    if (!target) return
    event.preventDefault()
    const offset = anchor.hash === '#promo-title' ? 0 : target.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop - (header?.offsetHeight ?? 0) - 24
    page.scrollTo({ top: Math.max(0, offset), behavior: reduced.matches ? 'auto' : 'smooth' })
    if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true })
  }
  page.addEventListener('click', navigate)

  /* --- lifecycle --------------------------------------------------------- */
  const onResize = () => { measureStrip(); schedule() }
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)
  resizeObserver?.observe(page)
  page.addEventListener('scroll', schedule, { passive: true })
  page.addEventListener('load', onResize, true)
  window.addEventListener('resize', onResize, { passive: true })
  const motionListener = () => { page.classList.toggle('has-motion', motionAllowed && !reduced.matches); schedule() }
  reduced.addEventListener('change', motionListener)
  setUnlocked(unlocked)
  window.requestAnimationFrame(() => {
    // Fonts and images settle after layout, so the loop is measured once more.
    measureStrip()
    update()
    page.querySelectorAll('img').forEach(image => image.addEventListener('load', onResize, { once: true }))
  })

  return {
    getScrollTop: () => page.scrollTop,
    dispose() {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(toastTimer)
      window.clearTimeout(bgmStopTimer)
      bgmWanted = false
      releaseGestures()
      if (bgmFrame) window.cancelAnimationFrame(bgmFrame)
      bgmToggle?.removeEventListener('click', onBgmToggle)
      bgm?.removeEventListener('timeupdate', onBgmProgress)
      bgm?.removeEventListener('ended', onBgmEnded)
      if (bgm) { bgm.volume = 0; bgm.pause() }
      revealObserver?.disconnect()
      resizeObserver?.disconnect()
      page.removeEventListener('scroll', schedule)
      page.removeEventListener('click', navigate)
      page.removeEventListener('click', guard, true)
      page.removeEventListener('load', onResize, true)
      strip?.removeEventListener('pointerdown', onStripDown as EventListener)
      stripPrev?.removeEventListener('click', onStripPrev)
      stripNext?.removeEventListener('click', onStripNext)
      strip?.removeEventListener('click', onStripClick, true)
      strip?.removeEventListener('keydown', onStripKey)
      strip?.removeEventListener('scroll', onStripScroll)
      window.removeEventListener('pointermove', onStripMove as EventListener)
      window.removeEventListener('pointerup', onStripUp)
      window.removeEventListener('pointercancel', onStripUp)
      window.removeEventListener('resize', onResize)
      reduced.removeEventListener('change', motionListener)
      if (viewer.open) viewer.close()
      viewer.remove()
    },
  }
}
