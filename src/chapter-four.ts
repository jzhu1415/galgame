import './chapter-four.css'
import type { Language } from './story'
import { quoteJournalSpeech } from './story'
import { browserStorage } from './browser-storage'
import { preloadSceneImage, transitionSceneImage } from './scene-image'
import { gildedShotFor, gildedShots, gildedVisuals, gildedVisualSrc, gildedJournalPaintings, type GildedVisualId } from './chapter-four-visuals'
import { showGildedArtwork } from './chapter-four-artwork'
import { createGildedAudio } from './chapter-four-audio'
import { bindGildedJigsaw, renderGildedJigsaw } from './chapter-four-puzzle'
import { createGildedFilm, gildedFilmSrc } from './chapter-four-film'
import { createGildedEnding } from './chapter-four-ending'
import { confirmInApp } from './ui-confirm'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { showGildedStoryMap } from './chapter-four-map'
import { normalizeGildedProgress, recordGildedCheckpoint, restartGildedFrom } from './chapter-four-progress'
import { advanceGilded, applyGildedChoice, finishGildedFilm, gildedEndingIds, gildedEndingNames, gildedLegacySaveKey, gildedLegacyProgressKey, gildedProgressKey, gildedSaveKey, gildedSpeakers, gildedStory, newGildedSave, normalizeGildedSave, placeGildedPiece, type GildedSave } from './chapter-four-story'

const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
function read(key: string): unknown { try { return JSON.parse(browserStorage.getItem(key) ?? 'null') } catch { return null } }
function loadSession() {
  const raw = read(gildedSaveKey)
  const save = normalizeGildedSave(raw)
  const rawProgress = read(gildedProgressKey)
  let progress = normalizeGildedProgress(rawProgress)
  // Visits in historical saves may be known, but only real arrival creates a snapshot.
  if (raw) progress = recordGildedCheckpoint(progress, save, false)
  save.endings = [...new Set([...save.endings, ...progress.endings])]
  const legacy = raw && typeof raw === 'object' && (raw as { version?: number }).version === 1 ? { save: raw, progress: rawProgress } : null
  return { save, progress, fresh: !raw || Boolean(legacy), legacy }
}
function archiveLegacy(loaded: ReturnType<typeof loadSession>) {
  if (!loaded.legacy) return
  if (!browserStorage.getItem(gildedLegacySaveKey)) browserStorage.setItem(gildedLegacySaveKey, JSON.stringify(loaded.legacy.save))
  if (loaded.legacy.progress && !browserStorage.getItem(gildedLegacyProgressKey)) browserStorage.setItem(gildedLegacyProgressKey, JSON.stringify(loaded.legacy.progress))
}
export function resetChapterFour() {
  const loaded = loadSession()
  archiveLegacy(loaded)
  const { progress } = loaded
  const save = newGildedSave(progress.endings)
  const next = recordGildedCheckpoint(progress, save, true)
  browserStorage.setItem(gildedSaveKey, JSON.stringify(save))
  browserStorage.setItem(gildedProgressKey, JSON.stringify(next))
}
const replayMessage = (language: Language, id: string) => language === 'zh'
  ? `从“${gildedStory[id].title.zh}”重玩？恢复首次抵达时的精神力、拼图与纸页状态；已解锁节点与结局会保留。`
  : `Replay from “${gildedStory[id].title.en}”? Restore the spirit, puzzle pieces and report state from your first arrival. Unlocked nodes and endings remain.`
export function previewChapterFourRoutes(root: HTMLElement, language: Language, onPlay: () => void) {
  const loaded = loadSession()
  const { save, progress } = loaded
  const dialog = showGildedStoryMap(root, language, save, progress, id => {
    if (!Object.hasOwn(progress.checkpoints, id)) return
    confirmInApp(root, replayMessage(language, id), language, () => {
      const replay = restartGildedFrom(progress, id)
      if (!replay) return
      archiveLegacy(loaded)
      browserStorage.setItem(gildedSaveKey, JSON.stringify(replay))
      dialog.close()
      onPlay()
    })
  })
  return dialog
}

export function mountChapterFour(root: HTMLElement, initialLanguage: Language, onBack: (language: Language) => void, onLanguageChange?: (language: Language) => void) {
  const loaded = loadSession()
  archiveLegacy(loaded)
  let save = loaded.save
  let progress = loaded.fresh ? recordGildedCheckpoint(loaded.progress, save, true) : loaded.progress
  let language = initialLanguage
  let disposed = false, persistent = true
  let puzzleGuideVisible = false
  let panel: HTMLDialogElement | null = null
  let notice = ''
  const tr = (zh: string, en: string) => language === 'zh' ? zh : en
  let disposePuzzle: (() => void) | null = null
  let film: ReturnType<typeof createGildedFilm> | null = null
  let filmElement: HTMLVideoElement | null = null
  const sound = createGildedAudio(updateAudioUI)
  const ending = createGildedEnding()
  const pauseMedia = () => { sound.pause(); film?.pause() }
  function updateAudioUI() {
    if (disposed) return
    const toggle = root.querySelector<HTMLButtonElement>('#gilded-audio')
    if (toggle) { toggle.textContent = sound.enabled ? tr('声音：开', 'Audio on') : tr('声音：关', 'Audio off'); toggle.setAttribute('aria-pressed', String(sound.enabled)) }
    const controls = root.querySelector<HTMLElement>('.gilded-audio-controls')
    if (controls) controls.hidden = !sound.hasVoice
    const play = root.querySelector<HTMLButtonElement>('#gilded-voice')
    if (play) {
      const labels = { idle: tr('播放语音', 'Play voice'), playing: tr('暂停语音', 'Pause voice'), paused: tr('继续语音', 'Resume voice'), finished: tr('重播语音', 'Replay voice'), blocked: tr('点击播放语音', 'Click to play voice'), error: tr('播放失败 · 重试', 'Playback failed · Retry') }
      play.textContent = labels[sound.status]
      play.disabled = !sound.enabled
      play.setAttribute('aria-label', play.textContent)
    }
    const status = root.querySelector<HTMLElement>('#gilded-audio-status')
    if (status) status.textContent = !sound.enabled ? tr('声音已关闭', 'Audio off') : sound.status === 'playing' ? tr('正在播放当前对白', 'Playing the current line') : sound.status === 'blocked' ? tr('浏览器需要点击后播放', 'Click to enable browser playback') : sound.status === 'error' ? tr('声音暂时不可用，仍可继续剧情', 'Audio unavailable. You can continue the story.') : ''
    const master = root.querySelector<HTMLInputElement>('#gilded-master-setting')
    if (master) master.checked = sound.enabled
    const effects = root.querySelector<HTMLInputElement>('#gilded-effects-setting')
    if (effects) effects.checked = sound.effectsEnabled
    const voiceValue = root.querySelector<HTMLOutputElement>('#gilded-voice-value')
    if (voiceValue) voiceValue.value = `${Math.round(sound.voiceVolume * 100)}%`
    const effectValue = root.querySelector<HTMLOutputElement>('#gilded-effect-value')
    if (effectValue) effectValue.value = `${Math.round(sound.effectVolume * 100)}%`
    film?.syncAudio(sound.enabled, sound.voiceVolume)
  }
  const theme = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const previousTheme = theme?.content
  if (theme) theme.content = '#17120c'
  const persist = () => {
    progress = recordGildedCheckpoint(progress, save, false)
    const a = browserStorage.setItem(gildedSaveKey, JSON.stringify(save))
    const b = browserStorage.setItem(gildedProgressKey, JSON.stringify(progress))
    persistent = a && b
  }
  function closePanel() { if (panel?.open) panel.close(); panel?.remove(); panel = null }
  function openSoundSettings() {
    if (root.querySelector('dialog[open]')) return
    pauseMedia()
    const before = document.activeElement as HTMLElement | null
    const dialog = document.createElement('dialog')
    panel = dialog
    dialog.className = 'app-dialog gilded-panel'
    dialog.setAttribute('aria-labelledby', 'gilded-sound-title')
    dialog.innerHTML = `<header class="dialog-head"><h2 id="gilded-sound-title">${tr('声音设置', 'Sound settings')}</h2><button type="button" class="small-btn" data-close autofocus>${tr('关闭', 'Close')} ×</button></header><div class="gilded-panel-body gilded-sound-settings"><label class="gilded-sound-check"><input type="checkbox" id="gilded-master-setting" ${sound.enabled ? 'checked' : ''}>${tr('开启声音', 'Enable audio')}</label><label for="gilded-voice-volume">${tr('对白与视频音量', 'Dialogue and video volume')} <output id="gilded-voice-value" for="gilded-voice-volume">${Math.round(sound.voiceVolume * 100)}%</output></label><input type="range" id="gilded-voice-volume" min="0" max="100" step="1" value="${Math.round(sound.voiceVolume * 100)}"><label class="gilded-sound-check"><input type="checkbox" id="gilded-effects-setting" ${sound.effectsEnabled ? 'checked' : ''}>${tr('拼图与剧情音效', 'Puzzle and story effects')}</label><label for="gilded-effect-volume">${tr('音效音量', 'Effects volume')} <output id="gilded-effect-value" for="gilded-effect-volume">${Math.round(sound.effectVolume * 100)}%</output></label><input type="range" id="gilded-effect-volume" min="0" max="100" step="1" value="${Math.round(sound.effectVolume * 100)}"><p>${tr('奶神与奶霸沿用奶蛙原声片段，片段不与字幕逐字对应。旁白、我与日记使用中英文逐句朗读。声音设置自动保存，不影响剧情进度。', 'naigod and Naiba share Naiwa’s original clips, which do not match the subtitles word for word. Narration, your lines and the journal have line-by-line readings in both languages. Sound settings are saved separately from story progress.')}</p></div>`
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
    dialog.querySelector<HTMLInputElement>('#gilded-master-setting')?.addEventListener('change', event => sound.setEnabled((event.target as HTMLInputElement).checked, false))
    dialog.querySelector<HTMLInputElement>('#gilded-effects-setting')?.addEventListener('change', event => sound.setEffectsEnabled((event.target as HTMLInputElement).checked))
    dialog.querySelector<HTMLInputElement>('#gilded-voice-volume')?.addEventListener('input', event => sound.setVoiceVolume(Number((event.target as HTMLInputElement).value) / 100))
    dialog.querySelector<HTMLInputElement>('#gilded-effect-volume')?.addEventListener('input', event => sound.setEffectVolume(Number((event.target as HTMLInputElement).value) / 100))
    dialog.addEventListener('close', () => { dialog.remove(); if (panel === dialog) panel = null; if (before?.isConnected) before.focus({ preventScroll: true }) }, { once: true })
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const b = dialog.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close() })
    root.append(dialog); dialog.showModal()
  }
  function update(next: GildedSave, focusId?: string) {
    if (disposed || next === save) return
    if (next.node !== save.node) progress = recordGildedCheckpoint(progress, next, true)
    const previousNode = save.node
    save = next
    if (previousNode !== save.node) notice = ''
    render()
    const focus = focusId ? root.querySelector<HTMLElement>(`#${focusId}`) : null
    if (focus && !focus.hasAttribute('disabled')) focus.focus({ preventScroll: true })
    else if (previousNode !== save.node) root.querySelector<HTMLElement>('#gilded-stage-title')?.focus({ preventScroll: true })
  }
  function logCurrentLine() {
    const node = gildedStory[save.node]
    if (!node.lines[save.line]) return
    const last = save.history.at(-1)
    if (!last || last.node !== save.node || last.line !== save.line) save = { ...save, history: [...save.history, { node: save.node, line: save.line }].slice(-250) }
  }
  function advance() {
    if (disposed || root.querySelector('dialog[open]')) return
    const node = gildedStory[save.node]
    if (node.ending && save.line === node.lines.length - 1) { onBack(language); return }
    const last = save.line >= node.lines.length - 1
    if (last && (node.choices || node.kind)) return
    logCurrentLine()
    update(advanceGilded(save), 'gilded-next')
  }
  function openTextPanel(kind: 'journal' | 'log') {
    if (root.querySelector('dialog[open]')) return
    pauseMedia()
    const before = document.activeElement as HTMLElement | null
    panel = document.createElement('dialog')
    panel.className = 'app-dialog gilded-panel'
    panel.setAttribute('aria-labelledby', 'gilded-panel-title')
    const body = kind === 'journal'
      ? `<p>${tr('我要做的事：帮奶神把画拼好，让它打开门，带着第四层的记忆回医院继续救奶蛙。', 'My task: help naigod finish the painting, get the door open, and bring the fourth layer’s memory back to the hospital.')}</p><p>${tr('拼图进度', 'Puzzle progress')} ${save.puzzle.placed.length}/12 · ${save.filmSeen ? tr('画中影像已看过或跳过', 'The film has been viewed or skipped') : tr('拼完后播放画中影像', 'The film plays after the puzzle is complete')}</p><p>${save.reportKept === null ? tr('可选调查：画框背面的报告尚未看过。', 'Optional reading: the report behind the frame is unread.') : save.reportKept ? tr('报告和路线图已保留，回医院后再核对。', 'The report and map are kept for comparison back at the hospital.') : tr('只留下了报告，路线图已撕掉。', 'Only the report remains; the map was torn up.')}</p><h3>${tr('这幅画的记录', 'Painting records')}</h3><div class="gilded-journal-art">${gildedJournalPaintings(save).map(id => `<button type="button" data-journal-art="${id}" aria-haspopup="dialog"><img src="${gildedVisualSrc(id)}" alt="${gildedVisuals[id].alt[language]}" loading="lazy"><span>${({ gallery: tr('散落画片的画廊', 'The unfinished painting'), pieces: tr('桌上的画片', 'Pieces on the table'), assembled: tr('拼好的画', 'The completed painting') })[id as 'gallery' | 'pieces' | 'assembled']}</span></button>`).join('')}</div>`
      : save.history.length ? save.history.map(entry => { const line = gildedStory[entry.node].lines[entry.line]; return `<p><strong>${gildedSpeakers[line.speaker][language]}</strong> ${esc(line.speaker === 'journal' ? quoteJournalSpeech(line.text[language], language) : line.text[language])}</p>` }).join('') : `<p>${tr('还没有对话记录。', 'No dialogue recorded yet.')}</p>`
    panel.innerHTML = `<header class="dialog-head"><h2 id="gilded-panel-title">${kind === 'journal' ? tr('本章日记', 'Chapter journal') : tr('对白回顾', 'Dialogue history')}</h2><button class="small-btn" type="button" data-close>${tr('关闭', 'Close')} ×</button></header><div class="gilded-panel-body">${body}</div>`
    const dialog = panel
    root.append(dialog)
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
    dialog.querySelectorAll<HTMLButtonElement>('[data-journal-art]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.journalArt as GildedVisualId; closePanel(); const next = showGildedArtwork(root, language, id); if (next) panel = next }))
    dialog.addEventListener('close', () => { dialog.remove(); if (panel === dialog) panel = null; if (before?.isConnected) before.focus() }, { once: true })
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const b = dialog.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close() })
    dialog.showModal()
  }
  function openRoutes() {
    if (root.querySelector('dialog[open]')) return
    pauseMedia()
    panel = showGildedStoryMap(root, language, save, progress, id => {
      if (!Object.hasOwn(progress.checkpoints, id)) return
      confirmInApp(root, replayMessage(language, id), language, () => {
      const replay = restartGildedFrom(progress, id)
      if (!replay) return
      closePanel()
      sound.reset()
      film?.dispose(); film = null; filmElement = null
      update(replay)
      })
    })
  }
  function openArtwork(mural = false) {
    if (root.querySelector('dialog[open]')) return
    pauseMedia()
    const dialog = showGildedArtwork(root, language, mural ? 'mural' : ending.displayedShot() ?? gildedShotFor(save))
    if (dialog) panel = dialog
  }
  function filmMarkup() {
    return `<section class="gilded-film" aria-labelledby="gilded-stage-title"><header class="gilded-film-heading"><p class="gilded-kicker">THE PAINTING AWAKENS / IV</p><h1 id="gilded-stage-title" tabindex="-1">${tr('画里的影像', 'The scene within the painting')}</h1><span>${tr('《圣母奶龙升天》', 'The Ascension')}</span></header><video id="gilded-film-video" src="${gildedFilmSrc}" poster="${gildedVisualSrc('mural')}" controls playsinline preload="metadata" aria-label="${tr('拼图完成后的画作视频', 'The painting’s video after completing the puzzle')}"></video><div class="gilded-film-actions"><button type="button" class="secondary-btn" id="gilded-film-play" hidden>${tr('播放视频', 'Play video')}</button><button type="button" class="secondary-btn" id="gilded-film-fullscreen">${tr('全屏播放', 'Play fullscreen')} ↗</button><button type="button" class="primary-btn" id="gilded-film-continue">${tr('跳过视频，继续剧情', 'Skip video and continue')} →</button></div><p id="gilded-film-status" role="status"></p></section>`
  }
  function updateFilmUI() {
    if (disposed || !film) return
    const play = root.querySelector<HTMLButtonElement>('#gilded-film-play')
    if (play) { play.hidden = film.status === 'playing'; play.textContent = film.status === 'finished' ? tr('再看一遍', 'Watch again') : film.status === 'error' ? tr('重试播放视频', 'Retry video') : tr('播放视频', 'Play video') }
    const next = root.querySelector<HTMLButtonElement>('#gilded-film-continue')
    if (next) next.textContent = film.status === 'finished' ? tr('继续剧情 →', 'Continue story →') : tr('跳过视频，继续剧情 →', 'Skip video and continue →')
    const status = root.querySelector<HTMLElement>('#gilded-film-status')
    if (status) status.textContent = film.status === 'blocked' ? tr('点击播放视频即可继续观看。', 'Click Play video to watch.') : film.status === 'error' ? tr('视频暂时无法播放，可以重试或继续剧情。', 'The video could not play. Retry or continue the story.') : ''
  }
  function choices() {
    const node = gildedStory[save.node]
    return `<div class="gilded-choices">${(node.choices ?? []).map(choice => `<button type="button" class="gilded-choice" id="gilded-choice-${choice.id}" data-choice="${choice.id}"><strong>${choice.text[language]}</strong><small>${choice.detail[language]}</small></button>`).join('')}</div>`
  }
  function narrative() {
    const node = gildedStory[save.node]
    const line = node.lines[save.line]
    const last = save.line === node.lines.length - 1
    return `<section class="gilded-dialogue" aria-labelledby="gilded-stage-title"><p class="gilded-kicker" id="gilded-stage-title" tabindex="-1">${node.title[language]}</p><h1>${gildedSpeakers[line.speaker][language]}</h1><p class="gilded-line">${esc(line.speaker === 'journal' ? quoteJournalSpeech(line.text[language], language) : line.text[language])}</p>${last && node.choices ? choices() : `<div class="gilded-dialogue-next"><span>${save.line + 1}/${node.lines.length}</span><button type="button" class="primary-btn" id="gilded-next">${node.ending && last ? tr('返回章节详情', 'Back to chapter details') : tr('继续', 'Continue')} →</button></div>`}${node.ending ? `<p class="gilded-ending-note">${tr('第四章 · 结局', 'Chapter four · Ending')} / ${gildedEndingNames[node.ending][language]}<br>${tr('已解锁结局', 'Unlocked endings')} ${progress.endings.length}/${gildedEndingIds.length}</p>` : ''}</section>`
  }
  function render() {
    if (disposed) return
    const guideToggle = root.querySelector<HTMLInputElement>('[data-puzzle-guide]')
    if (guideToggle) puzzleGuideVisible = guideToggle.checked
    disposePuzzle?.(); disposePuzzle = null
    if (save.node !== 'film') { film?.dispose(); film = null; filmElement = null }
    logCurrentLine()
    persist()
    const node = gildedStory[save.node]
    const shotId = gildedShotFor(save)
    const shot = gildedVisuals[shotId]
    const previousLayer = root.querySelector<HTMLElement>('.gilded-backdrop-layer')
    root.innerHTML = `<div class="gilded-game" lang="${language === 'zh' ? 'zh-CN' : 'en'}"><div class="gilded-backdrop-layer"></div><div class="gilded-scrim" aria-hidden="true"></div><header class="gilded-toolbar"><button type="button" class="small-btn" id="gilded-back">← ${tr('章节详情', 'Chapter details')}</button><span class="gilded-wordmark">IV / ${tr('金笼', 'THE GILDED CAGE')}</span><div><button type="button" class="small-btn" id="gilded-journal">${tr('本章日记', 'Journal')}</button><button type="button" class="small-btn" id="gilded-log">${tr('回顾', 'History')}</button><button type="button" class="small-btn" id="gilded-routes">${tr('剧情树', 'Story map')}</button><button type="button" class="small-btn" id="gilded-audio" aria-pressed="${sound.enabled}">${sound.enabled ? tr('声音：开', 'Audio on') : tr('声音：关', 'Audio off')}</button><button type="button" class="small-btn" id="gilded-audio-settings" aria-haspopup="dialog">${tr('声音设置', 'Sound settings')}</button><button type="button" class="small-btn" id="gilded-fullscreen" aria-pressed="${isAppFullscreen(root)}">${isAppFullscreen(root) ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen')}</button><button type="button" class="small-btn" id="gilded-language" aria-label="${tr('Switch to English', '切换至中文')}">${tr('EN', '中文')}</button></div></header><div class="gilded-hud"><span>${tr('精神力', 'Spirit')} <strong>${save.spirit}</strong>/100</span><span>${tr('画作', 'Painting')} ${save.puzzle.placed.length}/12</span><button type="button" class="small-btn" id="gilded-view-art" aria-haspopup="dialog">${tr('查看画面', 'View painting')} ↗</button></div><main class="gilded-main">${node.kind === 'puzzle' ? renderGildedJigsaw(save.puzzle, language, puzzleGuideVisible) : node.kind === 'film' ? filmMarkup() : narrative()}<p class="gilded-action-notice" role="status">${notice}</p></main><div class="gilded-audio-controls" hidden><button type="button" class="small-btn" id="gilded-voice">${tr('播放语音', 'Play voice')}</button><span id="gilded-audio-status" role="status"></span></div><footer class="gilded-game-footer"><span role="status">${persistent ? tr('本章进度自动保存', 'Chapter progress saved automatically') : tr('无法保存到浏览器 · 请保持本页开启', 'Session only · Keep this page open')}</span><span>${tr('空格 / Enter 继续 · Tab 选择操作', 'Space / Enter to continue · Tab to select actions')}</span></footer></div>`
    const placeholder = root.querySelector<HTMLElement>('.gilded-backdrop-layer')!
    const layer = previousLayer ?? placeholder
    if (previousLayer) placeholder.replaceWith(previousLayer)
    if (!ending.sync(layer, save, language)) transitionSceneImage(layer, { id: shotId, src: gildedVisualSrc(shotId), alt: shot.alt[language], className: 'gilded-backdrop', visibleClass: 'is-visible', position: shot.position, fallback: gildedVisualSrc(node.art) })
    if (save.node === 'free' && save.line === 0) preloadSceneImage(gildedVisualSrc('bedsideReality'))
    const nextShot = gildedShots[save.node][save.line + 1]
    if (nextShot && nextShot !== shotId) preloadSceneImage(gildedVisualSrc(nextShot))
    sound.sync(save, language)
    if (node.kind === 'puzzle') disposePuzzle = bindGildedJigsaw(root.querySelector<HTMLElement>('.gilded-puzzle')!, save.puzzle, language, (piece, slot) => { const next = placeGildedPiece(save, piece, slot); update(next); if (save.node === 'puzzle') { sound.playEffect('thread-loose'); root.querySelector<HTMLElement>('[data-piece]')?.focus({ preventScroll: true }) } }, () => openArtwork(true))
    if (node.kind === 'film') {
      const placeholderVideo = root.querySelector<HTMLVideoElement>('#gilded-film-video')!
      if (film && filmElement) { placeholderVideo.replaceWith(filmElement); updateFilmUI() }
      else { filmElement = placeholderVideo; film = createGildedFilm(filmElement, updateFilmUI, () => update(finishGildedFilm(save))); film.syncAudio(sound.enabled, sound.voiceVolume); if (!document.hidden) { film.play(); void film.enterFullscreen() } }
      root.querySelector('#gilded-film-play')?.addEventListener('click', () => { film?.play(); void film?.enterFullscreen() })
      root.querySelector('#gilded-film-fullscreen')?.addEventListener('click', () => { film?.play(); void film?.enterFullscreen() })
      root.querySelector('#gilded-film-continue')?.addEventListener('click', () => update(finishGildedFilm(save)))
    }
    root.querySelector('#gilded-audio')?.addEventListener('click', () => sound.setEnabled(!sound.enabled))
    root.querySelector('#gilded-audio-settings')?.addEventListener('click', openSoundSettings)
    root.querySelector('#gilded-voice')?.addEventListener('click', () => sound.toggleVoice())
    root.querySelector('#gilded-mural')?.addEventListener('click', () => openArtwork(true))
    root.querySelector('#gilded-view-art')?.addEventListener('click', () => openArtwork())
    root.querySelector('#gilded-back')?.addEventListener('click', () => onBack(language))
    root.querySelector('#gilded-next')?.addEventListener('click', advance)
    root.querySelector('#gilded-journal')?.addEventListener('click', () => openTextPanel('journal'))
    root.querySelector('#gilded-log')?.addEventListener('click', () => openTextPanel('log'))
    root.querySelector('#gilded-routes')?.addEventListener('click', openRoutes)
    root.querySelector('#gilded-fullscreen')?.addEventListener('click', () => toggleAppFullscreen(root))
    root.querySelector('#gilded-language')?.addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; onLanguageChange?.(language); setLanguage(language); root.querySelector<HTMLElement>('#gilded-language')?.focus({ preventScroll: true }) })
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', () => update(applyGildedChoice(save, button.dataset.choice!))))
  }
  function setLanguage(next: Language) { if (disposed) return; language = next; document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'; closePanel(); render() }
  const keys = (event: KeyboardEvent) => {
    if (disposed || event.repeat || event.altKey || event.ctrlKey || event.metaKey || root.querySelector('dialog[open]')) return
    if (event.key !== ' ' && event.key !== 'Enter') return
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, video, [contenteditable=true]')) return
    event.preventDefault(); advance()
  }
  const fullChange = () => { const button = root.querySelector<HTMLButtonElement>('#gilded-fullscreen'); if (button) { button.textContent = isAppFullscreen(root) ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen'); button.setAttribute('aria-pressed', String(isAppFullscreen(root))) } }
  const visibilityChanged = () => { if (document.hidden) pauseMedia() }
  document.addEventListener('visibilitychange', visibilityChanged)
  document.addEventListener('keydown', keys)
  document.addEventListener('fullscreenchange', fullChange)
  window.addEventListener('appimmersivechange', fullChange)
  render()
  return { setLanguage, dispose() { disposed = true; ending.dispose(); disposePuzzle?.(); film?.dispose(); sound.dispose(); closePanel(); document.removeEventListener('visibilitychange', visibilityChanged); document.removeEventListener('keydown', keys); document.removeEventListener('fullscreenchange', fullChange); window.removeEventListener('appimmersivechange', fullChange); if (theme && previousTheme !== undefined) theme.content = previousTheme } }
}
