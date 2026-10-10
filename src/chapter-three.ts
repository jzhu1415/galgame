import { browserStorage } from './browser-storage'
import './chapter-three.css'
import type { Language } from './story'
import { quoteJournalSpeech } from './story'
import { characterVoiceSequence } from './character-voice'
import { chapterThreeVisual, naifenExpressions, type TheatreVisual } from './chapter-three-visuals'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { confirmInApp } from './ui-confirm'
import { showTheatreStoryMap } from './chapter-three-map'
import { newTheatreProgress, normalizeTheatreProgress, recordTheatreCheckpoint, restartTheatreFrom, type TheatreProgress } from './chapter-three-progress'
import { advanceTheatre, applyTheatreChoice, newTheatreSave, normalizeTheatreSave, openTheatreLocation, theatreEndingIds, theatreEndingNames, theatreMemoryIds, theatreMemoryNames, theatreSpeakers, theatreStory, type TheatreSave, type TheatreMemory } from './chapter-three-story'

const KEY = 'naiwa-chapter-three-v1'
const PROGRESS_KEY = 'naiwa-chapter-three-progress-v1'
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
function load(): TheatreSave {
  try { return normalizeTheatreSave(JSON.parse(browserStorage.getItem(KEY) ?? 'null')) } catch { return newTheatreSave() }
}
export function chapterThreeStatus() {
  const save = load()
  return { started: save.node !== 'invitation' || save.line > 0 || save.history.length > 0, completed: save.endings.length > 0 }
}
const text = {
  zh: { back: '章节详情', title: '血色交易', subtitle: '第三层 · 血肉剧场', next: '继续', enter: '走进剧场', stage: '回到舞台', log: '对话回顾', journal: '记忆日记', routes: '剧情树', voice: '声音', voiceOn: '声音已开启', voiceOff: '声音已关闭', play: '播放原声', stop: '跳过声音', blocked: '点击播放原声', audioError: '播放失败 · 点击重试', voiceNote: '奶粉和奶霸复用奶蛙原声片段，片段不与台词逐字对应。', spirit: '精神力', pollution: '精神污染', gathered: '真实记忆', route: '幕后路线', routeDone: '路线已核对', routeMissing: '路线待核对', replay: '重玩本章', restartConfirm: '重新开始第三章？本章当前进度将清除，已解锁结局会保留。', close: '关闭', saved: '进度已保存', saveFailed: '此浏览器无法保存进度，请保持页面开启。', exploreHint: '选择舞台上的场景，辨认三段真实记忆。首次调查每幕消耗 4 点精神力。', collected: '已找回 · 可重看', investigate: '调查此幕', backstage: '调查幕后', backstageDesc: '剧本里夹着一张手绘路线图。', confront: '去找奶霸', confrontLocked: '找齐三幕真实记忆后开启', confrontReady: '三幕已归位 · 进入对质', actNames: ['入场', '三幕记忆', '血色交易', '落幕'], ending: '第三章 · 完', completeSaved: '第三层已安抚。记忆、路线图都留在你手里。', completeDark: '治疗的代价已留下。你仍能前进，但记忆出现了空缺。', completeFailure: '精神力耗尽。可以重玩本章，重新辨认舞台里的记忆。', unlocked: '已解锁结局', emptyLog: '还没有对话记录。', emptyJournal: '尚未找回真实记忆。先调查舞台上的三幕。', noMemory: '尚未找回', current: '当前', visited: '已抵达', locked: '尚未抵达', routeDescription: '按星星杯 → 歪伞 → 车轮核对路线，侧门后藏着可用来交易的替代容器。', keyboard: '空格 / Enter 继续 · 点击选项作出选择', voiceLabel: '切换角色原声', languageLabel: 'Switch to English', full: '进入全屏', exitFull: '退出全屏' },
  en: { back: 'Chapter details', title: 'The Crimson Bargain', subtitle: 'Layer three · The Flesh Theatre', next: 'Continue', enter: 'Enter the theatre', stage: 'Return to the stage', log: 'Dialogue history', journal: 'Memory journal', routes: 'Story map', voice: 'Audio', voiceOn: 'Audio on', voiceOff: 'Audio off', play: 'Play voice clip', stop: 'Skip voice', blocked: 'Click to play voice', audioError: 'Playback failed · Retry', voiceNote: 'Naifen and Naiba share Naiwa\'s original voice clips. The clips do not match the dialogue word for word.', spirit: 'Spirit', pollution: 'Pollution', gathered: 'Real memories', route: 'Backstage route', routeDone: 'Route verified', routeMissing: 'Route unchecked', replay: 'Replay chapter', restartConfirm: 'Restart chapter three? Current progress will be cleared; unlocked endings will remain.', close: 'Close', saved: 'Progress saved', saveFailed: 'This browser cannot save progress. Keep the page open.', exploreHint: 'Explore the scenes on stage to find three real memories. Each act costs 4 spirit until you recover its memory.', collected: 'Recovered · Revisit', investigate: 'Investigate act', backstage: 'Investigate backstage', backstageDesc: 'A hand-drawn map is tucked inside the script.', confront: 'Find Naiba', confrontLocked: 'Recover all three real memories first', confrontReady: 'All three memories found · Confront Naiba', actNames: ['Arrival', 'Three memories', 'The bargain', 'Curtain'], ending: 'Chapter three · End', completeSaved: 'Naifen is free of the stage. You still have the memories and the map.', completeDark: 'You can go on, but some of your memories are missing.', completeFailure: 'Your spirit ran out. Replay to look for the real memories on stage.', unlocked: 'Unlocked endings', emptyLog: 'No dialogue recorded yet.', emptyJournal: 'No memories found yet. Try the three scenes on stage.', noMemory: 'Not recovered', current: 'Current', visited: 'Reached', locked: 'Not reached', routeDescription: 'Match star mug → tilted umbrella → wheel. The side door hides a decoy vessel for the bargain.', keyboard: 'Space / Enter to continue · Choose an option at branches', voiceLabel: 'Toggle original character voice', languageLabel: '切换为中文', full: 'Fullscreen', exitFull: 'Exit fullscreen' },
} as const

function loadProgress(save: TheatreSave): TheatreProgress {
  try { return recordTheatreCheckpoint(normalizeTheatreProgress(JSON.parse(browserStorage.getItem(PROGRESS_KEY) ?? 'null')), save, false) }
  catch { return recordTheatreCheckpoint(newTheatreProgress(), save, false) }
}
const routeConfirmation = (language: Language, id: string) => language === 'zh'
  ? `从“${theatreStory[id].title.zh}”重新开始？将恢复抵达此节点时的精神力、记忆和路线状态；已解锁节点与结局会保留。`
  : `Restart from “${theatreStory[id].title.en}”? Restore the spirit, memories and route recorded on arrival. Unlocked nodes and endings will remain.`

export function mountChapterThree(root: HTMLElement, initialLanguage: Language, onBack: (language: Language) => void, onLanguageChange?: (language: Language) => void) {
  const themeColor = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const originalThemeColor = themeColor?.content
  const originalColorScheme = root.ownerDocument.documentElement.style.colorScheme
  if (themeColor) themeColor.content = '#160b11'
  root.ownerDocument.documentElement.style.colorScheme = 'dark'
  let language = initialLanguage
  let save = load()
  let progress = loadProgress(save)
  let disposed = false
  let storageAvailable = true
  let audioEnabled = true
  try { audioEnabled = browserStorage.getItem('naiwa-audio-enabled-v1') !== 'false' } catch { storageAvailable = false }
  let voiceKey = ''
  let audio: HTMLAudioElement | null = null
  let audioClips: string[] = []
  let clipIndex = 0
  let dialogue: HTMLDialogElement | null = null
  let panelKind: 'log' | 'journal' | 'routes' | null = null
  let restoreFocusId: string | null = null
  const t = () => text[language]
  const persist = () => {
    progress = recordTheatreCheckpoint(progress, save, false)
    try {
      const saved = browserStorage.setItem(KEY, JSON.stringify(save))
      const progressSaved = browserStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
      storageAvailable = saved && progressSaved
    } catch { storageAvailable = false }
  }
  function stopAudio() {
    if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; audio.removeAttribute('src'); audio.load(); audio = null }
    voiceButton(t().play)
  }
  function voiceButton(label: string) {
    const button = root.querySelector<HTMLButtonElement>('#crimson-play')
    if (button) {
      button.textContent = label
      const speaker = theatreStory[save.node].lines[save.line]?.speaker
      button.setAttribute('aria-label', speaker ? `${theatreSpeakers[speaker][language]} · ${label}` : label)
    }
  }
  function playAudio() {
    if (!audio || !audioEnabled || disposed) return
    const current = audio
    voiceButton(t().stop)
    void current.play().catch(() => { if (audio === current && !disposed) voiceButton(t().blocked) })
  }
  function prepareAudio(force = false) {
    const key = `${save.node}/${save.line}`
    if (!force && voiceKey === key) { if (audio) voiceButton(audio.paused ? t().play : t().stop); return }
    voiceKey = key
    const line = theatreStory[save.node].lines[save.line]
    if (!line || !audioEnabled || !['naifen', 'naiba'].includes(line.speaker)) return
    // One original clip per line lets all four voices rotate across four speeches.
    audioClips = characterVoiceSequence(false)
    clipIndex = 0
    const current = new Audio(audioClips[0])
    current.volume = .8
    audio = current
    current.onended = () => {
      if (disposed || audio !== current) return
      if (clipIndex + 1 < audioClips.length) { current.src = audioClips[++clipIndex]; playAudio() }
      else voiceButton(t().play)
    }
    current.onerror = () => { if (audio === current && !disposed) voiceButton(t().audioError) }
    playAudio()
  }
  function toggleVoiceClip() {
    if (!audio) { prepareAudio(true); return }
    if (!audio.paused) { audio.pause(); clipIndex = 0; audio.src = audioClips[0]; voiceButton(t().play) }
    else { if (audio.ended) { clipIndex = 0; audio.src = audioClips[0] } playAudio() }
  }
  function closePanel() {
    panelKind = null
    if (dialogue?.open) dialogue.close()
    dialogue?.remove(); dialogue = null
  }
  function updateFullscreenLabel() {
    const button = root.querySelector<HTMLButtonElement>('#crimson-fullscreen')
    if (button) { button.textContent = isAppFullscreen(root) ? t().exitFull : t().full; button.setAttribute('aria-pressed', String(isAppFullscreen(root))) }
  }
  function update(next: TheatreSave) { if (disposed) return; const arrived = next.node !== save.node; save = next; if (arrived) progress = recordTheatreCheckpoint(progress, save); render() }
  function advance() {
    if (disposed || root.querySelector('dialog[open]')) return
    const node = theatreStory[save.node]
    if (node.map || (node.choices && save.line === node.lines.length - 1)) return
    if (node.ending && save.line === node.lines.length - 1) { onBack(language); return }
    update(advanceTheatre(save))
  }
  function renderMap() {
    const copy = t()
    const ready = save.memories.length === 3
    const locations: { id: TheatreMemory; index: string; label: string; note: string }[] = [
      { id: 'breakfast', index: 'II', label: language === 'zh' ? '早餐' : 'Breakfast', note: language === 'zh' ? '完美的餐盘，或焦掉的松饼。' : 'A perfect plate, or a burnt pancake.' },
      { id: 'rain', index: 'I', label: language === 'zh' ? '雨夜' : 'Rain', note: language === 'zh' ? '没有车灯的那场雨。' : 'The rain before the headlights.' },
      { id: 'film', index: 'III', label: language === 'zh' ? '车灯' : 'Headlights', note: language === 'zh' ? '放映机里，少不了的一秒。' : 'The second that must remain.' },
    ]
    return `<section class="crimson-map" aria-label="${copy.subtitle}"><div class="crimson-map-intro"><span class="crimson-kicker">THE FLESH THEATRE / III</span><h2>${language === 'zh' ? '别让它再演一次。' : 'Don\'t let the play repeat.'}</h2><p>${copy.exploreHint}</p></div><div class="crimson-stage-points">${locations.map(location => `<button type="button" class="crimson-hotspot point-${location.id} ${save.memories.includes(location.id) ? 'is-recovered' : ''}" data-location="${location.id}"><span class="hotspot-ring" aria-hidden="true">${save.memories.includes(location.id) ? '✓' : location.index}</span><strong>${location.label}</strong><small>${save.memories.includes(location.id) ? copy.collected : copy.investigate}</small></button>`).join('')}</div><div class="crimson-explore-footer"><div class="crimson-acts">${locations.map(location => `<button type="button" data-location="${location.id}" class="crimson-act ${save.memories.includes(location.id) ? 'is-recovered' : ''}"><span>${location.index}</span><div><strong>${location.label} ${save.memories.includes(location.id) ? '✓' : ''}</strong><small>${location.note}</small></div></button>`).join('')}</div><div class="crimson-backstage-actions"><button type="button" data-location="route"><span>${copy.backstage}</span><small>${save.routeVerified ? copy.routeDone : copy.backstageDesc}</small></button><button type="button" class="crimson-primary" data-location="confrontation" ${ready ? '' : 'disabled'}><span>${copy.confront} →</span><small>${ready ? copy.confrontReady : copy.confrontLocked}</small></button></div></div></section>`
  }
  function renderNarrative(visual: TheatreVisual) {
    const node = theatreStory[save.node]
    const copy = t()
    const line = node.lines[save.line]
    const finalLine = save.line === node.lines.length - 1
    const portrait = naifenExpressions[visual.expression]
    const speaker = theatreSpeakers[line.speaker][language]
    const hasVoice = audioEnabled && ['naifen', 'naiba'].includes(line.speaker)
    const endingNote = node.ending === 'saved' ? copy.completeSaved : node.ending === 'bargained' ? copy.completeDark : copy.completeFailure
    return `<figure class="crimson-shot-frame" data-expression="${visual.expression}"><img class="crimson-storyboard" src="/images/${visual.background}.webp" width="1672" height="941" alt="" draggable="false">${visual.showCharacter ? `<img class="crimson-naifen" src="/images/${portrait.image}.webp" width="1024" height="1536" alt="${esc(portrait.description[language])}" draggable="false">` : ''}</figure><section class="crimson-dialogue" aria-label="${esc(node.title[language])}"><div class="crimson-dialogue-top"><div class="crimson-speaker ${line.speaker === 'naifen' ? 'is-naifen' : ''}"><span class="speaker-mark" aria-hidden="true"></span>${speaker}</div><span class="crimson-line-count" aria-label="${language === 'zh' ? '当前台词进度' : 'Dialogue progress'}">${String(save.line + 1).padStart(2, '0')} / ${String(node.lines.length).padStart(2, '0')}</span></div><p class="crimson-line" aria-live="polite">${esc(line.speaker === 'journal' ? quoteJournalSpeech(line.text[language], language) : line.text[language])}</p>${finalLine && node.choices ? `<div class="crimson-choices" role="group" aria-label="${language === 'zh' ? '剧情选择' : 'Story choices'}">${node.choices.map((choice, index) => `<button type="button" id="crimson-choice-${choice.id}" data-choice="${choice.id}" ${choice.requiresRoute && !save.routeVerified ? 'disabled' : ''}><span class="choice-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${esc(choice.text[language])}</strong><small>${esc(choice.detail[language])}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div>` : finalLine && node.ending ? `<div class="crimson-ending"><span>${copy.ending}</span><strong>${theatreEndingNames[node.ending][language]}</strong><p>${endingNote}</p><div><button type="button" id="crimson-finish" class="crimson-primary">${copy.back} →</button><button type="button" id="crimson-replay-end">${copy.replay}</button></div></div>` : ''}<div class="crimson-dialogue-bottom"><span class="crimson-key-hint">${copy.keyboard}</span><div>${hasVoice ? `<button type="button" id="crimson-play" class="crimson-voice" aria-label="${speaker} · ${copy.play}">${copy.play}</button>` : ''}${!finalLine || (!node.ending && !node.choices) ? `<button type="button" id="crimson-next" class="crimson-next">${finalLine && node.next === 'explore' ? copy.stage : copy.next} <span aria-hidden="true">→</span></button>` : ''}</div></div></section>`
  }
  function render() {
    if (disposed) return
    const oldFocus = (document.activeElement as HTMLElement | null)?.id
    closePanel()
    if (voiceKey !== `${save.node}/${save.line}` || !audioEnabled) stopAudio()
    const copy = t()
    const node = theatreStory[save.node]
    const visual = chapterThreeVisual(save.node, save.line)
    const oldScenery = root.querySelector<HTMLElement>('.crimson-scenery')
    const oldShot = root.querySelector<HTMLElement>('.crimson-shot-frame')
    const shotKey = `${visual.background}/${visual.expression}/${visual.showCharacter}`
    if (!node.map) {
      const last = save.history.at(-1)
      if (!last || last.node !== save.node || last.line !== save.line) save.history = [...save.history, { node: save.node, line: save.line }].slice(-200)
      if (node.ending && save.line === node.lines.length - 1 && !save.endings.includes(node.ending)) save.endings.push(node.ending)
    }
    persist()
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = 'Naiwa: The Crimson Bargain'
    root.innerHTML = `<div class="chapter-three ${node.map ? 'is-exploring' : 'is-narrative'} art-${node.art} ${save.pollution >= 45 ? 'is-polluted' : ''}" style="--crimson-art:url('/images/${visual.background}.webp');--crimson-shot-position:${visual.position}"><a class="crimson-skip" href="#crimson-main">${language === 'zh' ? '跳到剧情' : 'Skip to story'}</a><div class="crimson-scenery" aria-hidden="true"></div><header class="crimson-top"><button type="button" id="crimson-back">← ${copy.back}</button><span class="crimson-wordmark">NAIWA <i aria-hidden="true">✦</i> CHAPTER 03</span><nav aria-label="${language === 'zh' ? '章节工具' : 'Chapter tools'}"><button type="button" id="crimson-journal">${copy.journal}</button><button type="button" id="crimson-log">${copy.log}</button><button type="button" id="crimson-routes">${copy.routes}</button><button type="button" id="crimson-audio" aria-label="${copy.voiceLabel}" aria-pressed="${audioEnabled}">${audioEnabled ? copy.voiceOn : copy.voiceOff}</button><button type="button" id="crimson-fullscreen" aria-pressed="${isAppFullscreen(root)}">${isAppFullscreen(root) ? copy.exitFull : copy.full}</button><button type="button" id="crimson-language" aria-label="${copy.languageLabel}">${language === 'zh' ? 'EN' : '中文'}</button></nav></header><main id="crimson-main" class="crimson-main" tabindex="-1"><div class="crimson-heading"><div><span class="crimson-kicker">THE CRIMSON BARGAIN / 03</span><h1>${copy.title}</h1><p>${copy.subtitle} <span aria-hidden="true">—</span> ${esc(node.title[language])}</p></div><div class="crimson-ticket"><span>ADMIT ONE</span><strong>03</strong><span>${copy.actNames[node.act]}</span></div></div><div class="crimson-status" aria-label="${language === 'zh' ? '当前状态' : 'Current status'}"><div><span>${copy.spirit}</span><strong>${save.spirit}<small>/100</small></strong><meter min="0" max="100" value="${save.spirit}" aria-label="${copy.spirit}"></meter></div><div><span>${copy.pollution}</span><strong>${save.pollution}<small>/100</small></strong><meter min="0" max="100" value="${save.pollution}" aria-label="${copy.pollution}" class="pollution-meter"></meter></div><div class="crimson-memory-counter"><span>${copy.gathered}</span><strong>${save.memories.length}<small>/3</small></strong><span class="crimson-route-state">${save.routeVerified ? copy.routeDone : copy.routeMissing}</span></div></div>${node.map ? renderMap() : renderNarrative(visual)}</main><footer class="crimson-footer"><span>NAIFEN / ${copy.actNames[node.act]}</span><span role="status" class="${storageAvailable ? '' : 'save-warning'}">${storageAvailable ? copy.saved : copy.saveFailed}</span><button type="button" id="crimson-restart">${copy.replay}</button></footer></div>`
    const newScenery = root.querySelector<HTMLElement>('.crimson-scenery')!
    if (oldScenery?.dataset.art === visual.background) newScenery.replaceWith(oldScenery)
    else newScenery.dataset.art = visual.background
    const newShot = root.querySelector<HTMLElement>('.crimson-shot-frame')
    if (newShot && oldShot?.dataset.shot === shotKey) {
      newShot.replaceWith(oldShot)
      const portrait = oldShot.querySelector<HTMLImageElement>('.crimson-naifen')
      if (portrait) portrait.alt = naifenExpressions[visual.expression].description[language]
    } else if (newShot) newShot.dataset.shot = shotKey
    root.querySelector('#crimson-back')?.addEventListener('click', () => onBack(language))
    root.querySelector('#crimson-finish')?.addEventListener('click', () => onBack(language))
    root.querySelector('#crimson-next')?.addEventListener('click', advance)
    root.querySelector('#crimson-language')?.addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; onLanguageChange?.(language); render() })
    root.querySelector('#crimson-fullscreen')?.addEventListener('click', () => { void toggleAppFullscreen(root) })
    root.querySelector('#crimson-audio')?.addEventListener('click', () => {
      audioEnabled = !audioEnabled
      if (audioEnabled) voiceKey = ''
      try { browserStorage.setItem('naiwa-audio-enabled-v1', String(audioEnabled)) } catch { /* Continue playing in memory when storage is unavailable. */ }
      render()
    })
    root.querySelector('#crimson-play')?.addEventListener('click', toggleVoiceClip)
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', () => update(applyTheatreChoice(save, button.dataset.choice!))))
    root.querySelectorAll<HTMLButtonElement>('[data-location]').forEach(button => button.addEventListener('click', () => update(openTheatreLocation(save, button.dataset.location as TheatreMemory | 'route' | 'confrontation'))))
    root.querySelector('#crimson-journal')?.addEventListener('click', () => openPanel('journal'))
    root.querySelector('#crimson-log')?.addEventListener('click', () => openPanel('log'))
    root.querySelector('#crimson-routes')?.addEventListener('click', () => openPanel('routes'))
    root.querySelector('#crimson-restart')?.addEventListener('click', askRestart)
    root.querySelector('#crimson-replay-end')?.addEventListener('click', askRestart)
    prepareAudio()
    if (oldFocus && root.querySelector(`#${oldFocus}`)) root.querySelector<HTMLElement>(`#${oldFocus}`)?.focus({ preventScroll: true })
    else root.querySelector<HTMLElement>('#crimson-main')?.focus({ preventScroll: true })
  }
  function askRestart() { stopAudio(); confirmInApp(root, t().restartConfirm, language, () => update(newTheatreSave(save.endings))) }
  function openPanel(kind: 'log' | 'journal' | 'routes') {
    closePanel(); stopAudio(); panelKind = kind
    if (kind === 'routes') {
      const current = showTheatreStoryMap(root, language, save, progress, id => {
        if (!Object.hasOwn(progress.checkpoints, id)) return
        confirmInApp(root, routeConfirmation(language, id), language, () => {
          const restored = restartTheatreFrom(progress, id)
          if (!restored) return
          closePanel()
          update(restored)
        })
      })
      dialogue = current
      current.addEventListener('close', () => { if (dialogue === current) { dialogue = null; panelKind = null } }, { once: true })
      return
    }
    restoreFocusId = (document.activeElement as HTMLElement | null)?.id ?? null
    const copy = t()
    dialogue = document.createElement('dialog')
    dialogue.className = 'crimson-panel'
    dialogue.setAttribute('aria-labelledby', 'crimson-panel-title')
    let content = ''
    if (kind === 'log') content = save.history.length ? save.history.map(entry => {
      const node = theatreStory[entry.node]
      const line = node.lines[entry.line]
      return `<article class="crimson-log-entry"><small>${esc(node.title[language])} · ${theatreSpeakers[line.speaker][language]}</small><p>${esc(line.speaker === 'journal' ? quoteJournalSpeech(line.text[language], language) : line.text[language])}</p></article>`
    }).join('') : `<p>${copy.emptyLog}</p>`
    if (kind === 'journal') content = `<p class="crimson-panel-note">${copy.voiceNote}</p>${save.memories.length ? '' : `<p>${copy.emptyJournal}</p>`}<div class="crimson-journal-list">${theatreMemoryIds.map(id => `<article><span>${save.memories.includes(id) ? '✓' : '○'}</span><div><h3>${save.memories.includes(id) ? theatreMemoryNames[id][language] : theatreStory[id].title[language]}</h3><p>${save.memories.includes(id) ? theatreStory[`${id}-kept`].lines.map(line => esc(line.text[language])).join(' ') : copy.noMemory}</p></div></article>`).join('')}</div><div class="crimson-journal-route"><h3>${copy.route}</h3><p>${save.routeVerified ? copy.routeDescription : copy.backstageDesc}</p></div><h3>${copy.unlocked} · ${save.endings.length}/3</h3><div class="crimson-ending-list">${theatreEndingIds.map(id => `<span>${save.endings.includes(id) ? `✓ ${theatreEndingNames[id][language]}` : '○ ???'}</span>`).join('')}</div>`
    dialogue.innerHTML = `<header><span class="crimson-kicker">CHAPTER 03 / ARCHIVE</span><div><h2 id="crimson-panel-title">${copy[kind === 'journal' ? 'journal' : 'log']}</h2><button type="button" id="crimson-panel-close">${copy.close} ×</button></div></header><div class="crimson-panel-content">${content}</div>`
    root.append(dialogue)
    const current = dialogue
    current.addEventListener('close', () => { current.remove(); if (dialogue === current) { dialogue = null; panelKind = null; if (restoreFocusId) root.querySelector<HTMLElement>(`#${restoreFocusId}`)?.focus() } }, { once: true })
    current.querySelector('#crimson-panel-close')?.addEventListener('click', () => current.close())
    current.addEventListener('click', event => { if (event.target === current) { const rect = current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) current.close() } })
    current.showModal()
    if (kind === 'log') { const container = current.querySelector('.crimson-panel-content')!; container.scrollTop = container.scrollHeight }
  }
  function handleKey(event: KeyboardEvent) {
    if (disposed || panelKind || root.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
    if ((event.target as HTMLElement)?.closest('button, a, input, select, textarea, summary')) return
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); advance() }
  }
  root.ownerDocument.addEventListener('keydown', handleKey)
  root.ownerDocument.addEventListener('fullscreenchange', updateFullscreenLabel)
  window.addEventListener('appimmersivechange', updateFullscreenLabel)
  render()
  return {
    setLanguage(next: Language) { if (next !== language) { language = next; render() } },
    dispose() {
      disposed = true; closePanel(); stopAudio()
      if (themeColor && originalThemeColor !== undefined) themeColor.content = originalThemeColor
      root.ownerDocument.documentElement.style.colorScheme = originalColorScheme
      root.ownerDocument.removeEventListener('keydown', handleKey)
      root.ownerDocument.removeEventListener('fullscreenchange', updateFullscreenLabel)
      window.removeEventListener('appimmersivechange', updateFullscreenLabel)
    },
  }
}

export function resetChapterThree() {
  const progress = loadProgress(load())
  browserStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  browserStorage.setItem(KEY, JSON.stringify(newTheatreSave(progress.endings)))
}

export function previewChapterThreeRoutes(root: HTMLElement, language: Language, onPlay: () => void) {
  const save = load()
  const progress = loadProgress(save)
  const dialog = showTheatreStoryMap(root, language, save, progress, id => {
    if (!Object.hasOwn(progress.checkpoints, id)) return
    confirmInApp(root, routeConfirmation(language, id), language, () => {
      const restored = restartTheatreFrom(progress, id)
      if (!restored) return
      try {
        browserStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
        browserStorage.setItem(KEY, JSON.stringify(restored))
      } catch {
        // The preview must not enter a different scene if its save could not be written.
        root.querySelector<HTMLDialogElement>('#app-confirm')?.close()
        let message = dialog.querySelector<HTMLElement>('[data-save-error]')
        if (!message) { message = document.createElement('p'); message.dataset.saveError = ''; message.className = 'routes-hint'; message.setAttribute('role', 'alert'); dialog.querySelector('.map-intro')?.prepend(message) }
        message.textContent = text[language].saveFailed
        return
      }
      dialog.close()
      onPlay()
    })
  })
  return dialog
}
