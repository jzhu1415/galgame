import type { Language } from './story'

// A presentation of the chapter draft, with no gameplay, save, or audio imports.
export function renderChapterFourEntry(language: Language): string {
  const zh = language === 'zh'
  return `<a class="chapter-four-entry" id="chapter-four" href="?chapter=4" data-promo-chapter-link="4">
    <span class="four-entry-copy"><span class="card-overline">CHAPTER 04 / ${zh ? '画作拼图' : 'PAINTING JIGSAW'}</span><strong>${zh ? '金笼' : 'The Gilded Cage'}</strong><span class="card-description">${zh ? '门外的人不让你进去。门里的人不让你离开。' : 'Someone outside keeps you from entering. Someone inside keeps you from leaving.'}</span></span>
    <span class="four-entry-action">${zh ? '查看第四章介绍' : 'Explore chapter four'} <span aria-hidden="true">↗</span></span><span class="four-entry-number" aria-hidden="true">04</span>
  </a>`
}

export function renderChapterFourPromo(language: Language, started = false, saveNote = ''): string {
  const zh = language === 'zh'
  const text = (cn: string, en: string) => zh ? cn : en
  const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
  const actions = (hero = false) => `<div class="promo-actions"><button type="button" class="promo-play" data-promo-play${hero ? ` id="${started ? 'continue' : 'start'}"` : ''}>${text(started ? '继续第四章' : '进入金笼', started ? 'Continue chapter four' : 'Enter the cage')}<span aria-hidden="true">↗</span></button>${started ? `<button type="button" class="promo-text-button" data-promo-restart${hero ? ' id="start"' : ''}>${text('重新开始', 'Restart')}</button>` : ''}<button type="button" class="promo-text-button" data-promo-routes>${text('剧情树', 'Story map')}<span aria-hidden="true">＋</span></button></div>`
  const titles = zh ? ['缘起', '冰镜疑凶', '血色交易', '金笼'] : ['Origin', 'The Culprit in the Ice', 'The Crimson Bargain', 'The Gilded Cage']
  return `<div class="chapter-promo promo-gilded" data-promo-chapter="4" lang="${zh ? 'zh-CN' : 'en'}">
    <a class="promo-skip" href="#promo-story" data-promo-anchor>${text('跳到章节介绍', 'Skip to the chapter introduction')}</a>
    <header class="promo-header">
      <a class="promo-brand" id="chapter-home" href="?" aria-label="${text('奶之救赎 · 返回章节选择', 'Naiwa · Back to chapters')}">naiwa<span>CHAPTER 04</span></a>
      <nav class="promo-nav" aria-label="${text('本页导航', 'On this page')}"><a href="#promo-story" data-promo-anchor>${text('故事', 'Story')}</a><a href="#promo-themes" data-promo-anchor>${text('金笼之内', 'Inside the cage')}</a><a href="#promo-status" data-promo-anchor>${text('进入章节', 'Play')}</a></nav>
      <div class="promo-tools"><button id="routes-intro-top" type="button">${text('剧情树', 'Story map')}</button><button id="language" type="button" aria-label="${text('Switch to English', '切换至中文')}">${text('EN', '中文')}</button><details class="promo-utility"><summary aria-label="${text('更多选项', 'More options')}"><span aria-hidden="true">＋</span></summary><div class="promo-utility-menu"><button id="chapter-return" type="button" aria-keyshortcuts="Escape">← ${text('返回章节选择', 'Back to chapters')}</button><button id="fullscreen" type="button">${text('全屏', 'Fullscreen')}</button></div></details></div>
      <div class="promo-reading" aria-hidden="true"><span></span></div>
    </header>
    <main>
      <section class="promo-hero gilded-hero" aria-labelledby="promo-title">
        <div class="promo-hero-media gilded-hero-media"><img class="promo-hero-image" src="/images/chapter-04-gilded-room.webp" alt="${text('油画中的金丝房间，奶神披着红白布，站在紧闭的拱门前', 'naigod in red and ivory cloth beside a locked archway, inside an oil-painted golden-thread room')}" width="1672" height="941" fetchpriority="high" decoding="async"></div>
        <div class="gilded-hero-grain" aria-hidden="true"></div>
        <div class="promo-hero-copy"><p class="promo-eyebrow">NAIWA / ${text('奶之救赎', 'AN INTERACTIVE STORY')}</p><p class="promo-chapter-label"><span>04</span> THE GILDED CAGE</p>
          <h1 id="promo-title" tabindex="-1">${text('金笼', 'The Gilded Cage')}</h1><p class="gilded-hero-question">${text('如果留下，才算爱呢？', 'What if love asks you to stay?')}</p>
          <p class="promo-hero-lead">${text('门外的人不让你进去。<br>门里的人不让你离开。', 'Someone outside keeps you from entering.<br>Someone inside keeps you from leaving.')}</p>
          ${actions(true)}<p class="promo-save-note">${esc(saveNote)}</p><p class="gilded-status">${text('第四章 · 画作拼图', 'CHAPTER FOUR · PAINTING JIGSAW')}</p>
        </div>
        <div class="promo-hero-foot"><a href="#promo-story" data-promo-anchor><span class="promo-scroll-line" aria-hidden="true"></span>${text('往下看看', 'Scroll to explore')}<span aria-hidden="true">↓</span></a><span>${text('第四层 / 金丝牢笼', 'LAYER FOUR / THE GILDED CAGE')}</span><span class="promo-hero-index" aria-hidden="true">04</span></div>
      </section>
      <section class="promo-section gilded-story" id="promo-story" tabindex="-1" aria-labelledby="gilded-story-title">
        <div class="promo-section-label" data-promo-reveal><span>01 / THE THRESHOLD</span><span>${text('故事开端', 'At the threshold')}</span></div>
        <div class="promo-story-intro"><h2 id="gilded-story-title" data-promo-reveal>${text('灯亮着。<br>门却打不开。', 'The lights are on.<br>The door won’t open.')}</h2><div class="gilded-story-body" data-promo-reveal><p>${text('从血肉剧场离开后，你仍然没能让奶蛙醒来。日记翻到了下一页，一根细细的金线从纸缝里伸出来，指向第四层。', 'You leave the Flesh Theatre, but Naiwa is still asleep. The journal turns to a new page. A thin golden thread slips out from between the pages, leading towards the fourth layer.')}</p><p>${text('那里没有冰，也没有掌声。灯光很暖，每样东西都摆在伸手就能碰到的地方。只要不去碰门把手，这里几乎像一个家。', 'There is no ice here, no applause. The light is warm. Everything you need is within reach. As long as you leave the door handle alone, it almost feels like home.')}</p><p>${text('奶霸挡在入口前。他又一次让你停下。这一次，你还会听吗？', 'Naiba stands at the entrance. Once again, he tells you to stop. Will you listen this time?')}</p></div></div>
        <div class="gilded-warning" data-promo-reveal><span>NAIBA / ${text('奶霸', 'AT THE ENTRANCE')}</span><blockquote>“${text('今天你不能再往前。', 'You’re not going any further today.')}”</blockquote></div>
      </section>
      <section class="promo-section gilded-themes" id="promo-themes" tabindex="-1" aria-labelledby="gilded-themes-title">
        <div class="promo-section-label" data-promo-reveal><span>02 / INSIDE THE CAGE</span><span>${text('章节主题预告', 'A first look at the themes')}</span></div>
        <div class="gilded-themes-heading" data-promo-reveal><h2 id="gilded-themes-title">${text('每根金线，都有理由。', 'Every thread has a reason.')}</h2><p>${text('第四层把不舍编成了笼子。你要面对的，是那些听起来很温柔的要求。', 'In the fourth layer, the fear of letting go becomes a cage. The demands you face sound almost gentle.')}</p></div>
        <ol class="gilded-theme-list">
          <li data-promo-reveal><span aria-hidden="true">01</span><div><p class="promo-eyebrow">THE ROOM</p><h3>${text('为你准备的房间', 'A room prepared for you')}</h3><p>${text('熟悉的日常被搬进了第四层。杯子、桌椅、灯光，都像在等你回来。门外的路，却被一根根金线遮住。', 'Familiar pieces of your life fill the fourth layer. The cup, the furniture, the lights: all waiting for your return. Beyond the door, golden threads obscure the way.')}</p></div></li>
          <li data-promo-reveal><span aria-hidden="true">02</span><div><p class="promo-eyebrow">naigod / THE ATTACHMENT</p><h3>${text('奶神 · 不愿松手', 'naigod · Holding on')}</h3><p>${text('金黄色的奶神披着红色与米白色布，伸开双臂迎接你。车祸让它害怕再失去你，它便把门锁上。墙上的画碎成十二片，你决定先帮它拼好，再劝它开门。', 'Golden naigod opens its arms, draped in red and ivory cloth. The crash made it afraid of losing you again, so it locked the door. The painting has broken into twelve pieces. You decide to help rebuild it, then ask naigod to let you out.')}</p></div></li>
          <li data-promo-reveal><span aria-hidden="true">03</span><div><p class="promo-eyebrow">THE BOUNDARY</p><h3>${text('由谁决定留下', 'Who decides whether you stay?')}</h3><p>${text('你想救奶蛙，也想自己走出这扇门。当留下成为条件，你的回答会怎样改变彼此？', 'You want to save Naiwa. You also want to walk out of this room by choice. When staying becomes a condition, what will your answer mean for you both?')}</p></div></li>
        </ol>
      </section>
      <section class="promo-section gilded-development" id="promo-status" tabindex="-1" aria-labelledby="gilded-status-title">
        <div class="promo-section-label" data-promo-reveal><span>03 / PLAY</span><span>${text('轮到你了', 'Your turn')}</span></div>
        <div class="gilded-development-body" data-promo-reveal><p class="gilded-status">${text('十二块拼图 / 画中影像', 'TWELVE PIECES / THE FILM WITHIN')}</p><h2 id="gilded-status-title">${text('拼好这幅画，<br>再让它开门。', 'Finish the painting.<br>Then open the door.')}</h2><p>${text('奶蛙还在医院等你。奶神却因为害怕再出事故，把你留在房间里。帮它将十二块画片拼成完整的油画，画中的视频就会播放。之后，你还得说清楚自己为什么必须回去。', 'Naiwa is waiting in the hospital, but naigod is afraid of another crash and keeps you in the room. Reassemble twelve pieces into the full oil painting to watch the scene within it. Then explain why you must go back.')}</p><p>${text('可拖动拼片，也可先选拼片再点位置；放错不扣精神力，拼图自动保存。鼠标、触屏与键盘均可操作，剧情树仍可从已记录的节点重玩。', 'Drag pieces, or select a piece and then its place. Wrong placements cost no spirit, and puzzle progress saves automatically. Mouse, touch and keyboard all work; the story map still restores recorded checkpoints.')}</p>${actions()}<a class="promo-text-button gilded-home-link" href="?" data-four-home>${text('返回章节选择', 'Back to chapters')}<span aria-hidden="true">↗</span></a></div>
      </section>
    </main>
    <footer class="promo-footer"><div class="promo-footer-heading"><span>THE CHAPTERS</span><button id="release-entry" type="button">${text('更新内容', 'What’s new')} <span aria-hidden="true">＋</span></button></div><nav aria-label="${text('切换章节', 'Choose a chapter')}">${titles.map((title, index) => `<a href="?chapter=${index + 1}" data-promo-chapter-link="${index + 1}"${index === 3 ? ' aria-current="page"' : ''}><span>0${index + 1}</span><strong>${title}${index === 3 ? `<small>${text('画作拼图', 'Painting jigsaw')}</small>` : ''}</strong><span aria-hidden="true">${index === 3 ? '●' : '↗'}</span></a>`).join('')}</nav><div class="promo-colophon"><span>naiwa / 奶之救赎</span><span>© 2026 NAIWA</span><a href="#promo-title" data-promo-anchor>${text('回到顶部', 'Back to top')} <span aria-hidden="true">↑</span></a></div></footer>
  </div>`
}
