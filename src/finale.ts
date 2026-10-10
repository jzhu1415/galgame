import './finale.css'
import type { Language } from './story'
import { browserStorage } from './browser-storage'
import { confirmInApp } from './ui-confirm'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { characterVoiceSequence } from './character-voice'
import { gildedAudioEnabledKey, gildedAudioSettingsKey } from './chapter-four-audio'
import { createGildedFilm } from './chapter-four-film'
import { transitionSceneImage } from './scene-image'
import { showFinaleStoryMap } from './finale-map'
import { finaleArtwork } from './finale-artwork'
import { createFinaleBgm } from './finale-bgm'
import { mergeFinaleProgress, normalizeFinaleProgress, recordFinaleCheckpoint, restartFinaleFrom } from './finale-progress'
import {
  advanceFinale,
  applyFinaleChoice,
  completeFinaleFilm,
  finaleCarryFromFive,
  finaleChoiceAvailable,
  finaleClueNames,
  finaleEndingIds,
  finaleEndingNames,
  finaleProgressKey,
  finaleSaveKey,
  finaleSpeakers,
  finaleStories,
  finaleTitles,
  newFinaleSave,
  normalizeFinaleSave,
  type FinaleChapter,
  type FinaleChoice,
  type FinaleLine,
  type FinaleSave,
} from './finale-story'

const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const unique = (values: string[]) => [...new Set(values)]
const finaleFilmSrc = '/videos/final-battle-naiwa-feidudu.mp4'
const finalePortraits: Record<string, string> = {
  naiwa: '/images/finale-naiwa.webp',
  naiba: '/images/finale-naiba.webp',
  niulai: '/images/finale-niulai.webp',
  'banana-cat': '/images/finale-banana-cat.webp',
  naidou: '/images/finale-naidou.webp',
  feidudu: '/images/finale-feidudu-dark.webp',
}
const originalVoiceSpeakers = new Set(['naiwa', 'naiba'])

function readJSON(key: string): unknown {
  try { return JSON.parse(browserStorage.getItem(key) ?? 'null') as unknown }
  catch { return null }
}

function openingCarry(chapter: FinaleChapter): string[] {
  return chapter === 6 ? finaleCarryFromFive(browserStorage.getItem(finaleSaveKey(5))) : []
}

function loadFinaleSession(chapter: FinaleChapter) {
  let rawSave = readJSON(finaleSaveKey(chapter))
  // Historical separate-final-chapter saves stay usable after the chapter merge.
  if (chapter === 5) {
    const existing = rawSave as { node?: string; mergedFinale?: boolean } | null
    const legacy = readJSON(finaleSaveKey(6)) as { chapter?: number; node?: string } | null
    if (!existing?.mergedFinale && (!existing || !existing.node?.startsWith('f6-')) && legacy?.chapter === 6 && typeof legacy.node === 'string') {
      const old = normalizeFinaleSave(6, legacy)
      rawSave = { ...old, chapter: 5, node: old.node === 'f6-exhausted' ? 'f5-exhausted' : old.node,
        endings: old.endings.map(id => id === 'f6-exhausted' ? 'f5-exhausted' : id) }
    }
  }
  // Saves from the earlier aftermath resume at the new sequence without
  // inventing sacrifice flags or historical replay checkpoints.
  if (chapter === 5 && rawSave && typeof rawSave === 'object') {
    const old = rawSave as { node?: string; flags?: string[] }
    const lateNodes = ['f6-ruin-record', 'f6-ruin-relay', 'f6-resolution', 'f6-ending-reconcile', 'f6-ending-sever', 'f6-ending-captured', 'f6-ending-cradle']
    if (lateNodes.includes(old.node ?? '') && old.flags?.includes('film-completed') && (!old.flags.includes('f6-naiba-sacrificed') || !old.flags.includes('f6-revived'))) {
      rawSave = { ...old, node: 'f6-post-film', line: 0 }
    }
  }
  const rawProgress = readJSON(finaleProgressKey(chapter))
  const fresh = rawSave === null
  const save = fresh
    ? newFinaleSave(chapter, [], openingCarry(chapter))
    : normalizeFinaleSave(chapter, rawSave)
  let progress = chapter === 5 ? mergeFinaleProgress(rawProgress, readJSON(finaleProgressKey(6))) : normalizeFinaleProgress(chapter, rawProgress)
  // Keep old visit records visible without inventing state snapshots for them.
  if (!fresh) progress = recordFinaleCheckpoint(progress, save, false)
  const newRun = fresh && rawProgress === null
  if (newRun) progress = recordFinaleCheckpoint(progress, save, true)
  save.endings = unique([...save.endings, ...progress.endings])
  progress = recordFinaleCheckpoint(progress, save, false)
  return { save, progress, fresh, newRun }
}

function replayMessage(chapter: FinaleChapter, language: Language, id: string) {
  const title = finaleStories[chapter][id].title[language]
  return language === 'zh'
    ? `从“${title}”重玩？会恢复首次抵达这里时的精神力、线索与路线状态，并从本节点第一句开始。已解锁节点和结局会保留。`
    : `Replay from “${title}”? Restore the spirit, clues, and route state from your first arrival, then start from this node’s first line. Unlocked nodes and endings remain.`
}

/** Read-only route preview. Storage changes only after the player confirms a replay. */
export function previewFinaleRoutes(root: HTMLElement, chapter: FinaleChapter, language: Language, onBegin: () => void) {
  const { save, progress } = loadFinaleSession(chapter)
  const dialog = showFinaleStoryMap(root, language, save, progress, id => {
    if (!Object.hasOwn(progress.checkpoints, id)) return
    confirmInApp(root, replayMessage(chapter, language, id), language, () => {
      const replay = restartFinaleFrom(chapter, progress, id)
      if (!replay) return
      browserStorage.setItem(finaleSaveKey(chapter), JSON.stringify({ ...replay, mergedFinale: true }))
      browserStorage.setItem(finaleProgressKey(chapter), JSON.stringify(progress))
      dialog.close()
      onBegin()
    })
  })
  return dialog
}

/** Start a chapter again while retaining its map history and ending gallery. */
export function resetFinale(chapter: FinaleChapter) {
  const loaded = loadFinaleSession(chapter)
  const endings = unique([...loaded.save.endings, ...loaded.progress.endings])
  const save = newFinaleSave(chapter, endings, openingCarry(chapter))
  save.visited = unique([...loaded.save.visited, save.node])
  let progress = recordFinaleCheckpoint(loaded.progress, save, false)
  if (!Object.hasOwn(progress.checkpoints, save.node)) progress = recordFinaleCheckpoint(progress, save, true)
  save.endings = unique([...save.endings, ...progress.endings])
  browserStorage.setItem(finaleSaveKey(chapter), JSON.stringify({ ...save, mergedFinale: true }))
  browserStorage.setItem(finaleProgressKey(chapter), JSON.stringify(progress))
}

type VoiceStatus = 'idle' | 'playing' | 'paused' | 'finished' | 'blocked' | 'error'
type VoiceDescriptor = { key: string; src: string | null } | null
type FinaleAudio = ReturnType<typeof createFinaleAudio>

function volumeValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback
}

function createFinaleAudio(chapter: FinaleChapter, onChange: () => void) {
  let enabled = browserStorage.getItem(gildedAudioEnabledKey) !== 'false'
  let settings: Record<string, unknown> = {}
  try {
    const raw = JSON.parse(browserStorage.getItem(gildedAudioSettingsKey) ?? 'null') as unknown
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) settings = raw as Record<string, unknown>
  } catch { /* Defaults keep the story playable if saved audio settings are damaged. */ }
  let voiceVolume = volumeValue(settings.voice, .85)
  let descriptor: VoiceDescriptor = null
  let voice: HTMLAudioElement | null = null
  let status: VoiceStatus = 'idle'
  let disposed = false
  let attempt = 0
  let positionKey = ''

  const release = (audio: HTMLAudioElement | null) => {
    if (!audio) return
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  const stopVoice = () => { attempt++; release(voice); voice = null; status = 'idle' }
  const saveSettings = () => browserStorage.setItem(gildedAudioSettingsKey, JSON.stringify({ ...settings, voice: voiceVolume }))

  function play() {
    if (disposed || !enabled || !descriptor) return
    if (!voice) {
      const current = new Audio(descriptor.src ?? characterVoiceSequence(false)[0])
      current.preload = 'auto'
      voice = current
      current.onended = () => { if (voice !== current || disposed) return; attempt++; status = 'finished'; onChange() }
      current.onerror = () => { if (voice !== current || disposed) return; attempt++; status = 'error'; onChange() }
    }
    const current = voice
    current.volume = voiceVolume
    if (status === 'finished') current.currentTime = 0
    if (status === 'error') current.load()
    status = 'playing'
    const token = ++attempt
    onChange()
    void current.play().catch(error => {
      if (disposed || voice !== current || token !== attempt) return
      status = error?.name === 'NotAllowedError' ? 'blocked' : 'error'
      onChange()
    })
  }

  function sync(save: FinaleSave, language: Language) {
    if (disposed) return
    const node = finaleStories[chapter][save.node]
    const line = node?.lines[save.line]
    const position = `${save.node}/${save.line}`
    const enteredLine = position !== positionKey
    positionKey = position
    if (!line) {
      if (descriptor || voice) stopVoice()
      descriptor = null
      onChange()
      return
    }
    const speaker = line.speaker
    const src = speaker === 'feidudu'
      ? '/audio/second-plane-mouse-line.m4a'
      : originalVoiceSpeakers.has(speaker)
        ? null
        : `/audio/tts/finale-${chapter}-${save.node}-${save.line}-${language}.mp3`
    const roleVoice = speaker === 'feidudu' || originalVoiceSpeakers.has(speaker)
    const next = { key: `${position}/${roleVoice ? 'original' : language}`, src }
    if (next.key === descriptor?.key) { onChange(); return }
    stopVoice()
    descriptor = next
    if (enabled && enteredLine) play()
    else onChange()
  }

  return {
    get enabled() { return enabled },
    get voiceVolume() { return voiceVolume },
    get status() { return status },
    get hasVoice() { return Boolean(descriptor) },
    sync,
    play,
    pause() {
      if (disposed) return
      attempt++
      if (voice && status === 'playing') { voice.pause(); status = 'paused' }
      if (!disposed) onChange()
    },
    toggleVoice() { if (status === 'playing') this.pause(); else play() },
    setEnabled(next: boolean, autoplay = true) {
      if (disposed) return
      enabled = next
      browserStorage.setItem(gildedAudioEnabledKey, String(enabled))
      if (!enabled) this.pause()
      else if (autoplay) play()
      onChange()
    },
    setVoiceVolume(value: number) {
      if (disposed) return
      voiceVolume = volumeValue(value, voiceVolume)
      if (voice) voice.volume = voiceVolume
      saveSettings()
      onChange()
    },
    dispose() { disposed = true; stopVoice(); descriptor = null },
  }
}

export function mountFinale(
  root: HTMLElement,
  chapter: FinaleChapter,
  initialLanguage: Language,
  onBack: (language: Language) => void,
  onLanguageChange?: (language: Language) => void,
) {
  const loaded = loadFinaleSession(chapter)
  let save = loaded.save
  let progress = loaded.progress
  let language = initialLanguage
  let disposed = false
  let storageAvailable = true
  let notice = ''
  let panel: HTMLDialogElement | null = null
  let film: ReturnType<typeof createGildedFilm> | null = null
  let filmElement: HTMLVideoElement | null = null
  let filmCompleted = false
  const theme = root.ownerDocument.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const previousTheme = theme?.content
  const previousDocumentLanguage = document.documentElement.lang
  if (theme) theme.content = chapter === 5 ? '#071318' : '#18130e'

  const tr = (zh: string, en: string) => language === 'zh' ? zh : en
  const bgm = createFinaleBgm()
  let mediaSuspended = false
  const sound: FinaleAudio = createFinaleAudio(chapter, updateAudioUI)
  const pauseMedia = () => { mediaSuspended = true; sound.pause(); film?.pause(); syncBgm() }
  const currentNode = () => finaleStories[chapter][save.node]

  function syncBgm() {
    bgm.sync({ node: save.node, filmCompleted: save.flags.includes('film-completed'), enabled: sound.enabled,
      dialoguePlaying: sound.status === 'playing', suspended: mediaSuspended || document.hidden || Boolean(root.querySelector('dialog[open]')) })
  }
  function resumeBgm() {
    if (disposed) return
    mediaSuspended = false
    syncBgm()
  }

  function persist() {
    storageAvailable = browserStorage.setItem(finaleSaveKey(chapter), JSON.stringify({ ...save, mergedFinale: true }))
      && browserStorage.setItem(finaleProgressKey(chapter), JSON.stringify(progress))
  }

  function updateAudioUI() {
    if (disposed) return
    const audioButton = root.querySelector<HTMLButtonElement>('#finale-audio')
    if (audioButton) {
      audioButton.textContent = sound.enabled ? tr('声音：开', 'Audio on') : tr('声音：关', 'Audio off')
      audioButton.setAttribute('aria-pressed', String(sound.enabled))
    }
    const voiceButton = root.querySelector<HTMLButtonElement>('#finale-voice')
    if (voiceButton) {
      const labels: Record<VoiceStatus, string> = {
        idle: tr('播放语音', 'Play voice'), playing: tr('暂停语音', 'Pause voice'), paused: tr('继续语音', 'Resume voice'),
        finished: tr('重播语音', 'Replay voice'), blocked: tr('点击播放语音', 'Click to play voice'), error: tr('播放失败 · 重试', 'Playback failed · Retry'),
      }
      voiceButton.textContent = labels[sound.status]
      voiceButton.disabled = !sound.enabled
      voiceButton.setAttribute('aria-label', labels[sound.status])
    }
    const audioStatus = root.querySelector<HTMLElement>('#finale-audio-status')
    if (audioStatus) audioStatus.textContent = !sound.enabled ? tr('声音已关闭', 'Audio is off') : sound.status === 'blocked' ? tr('浏览器需要点击后播放', 'Click to enable browser playback') : sound.status === 'error' ? tr('声音暂时不可用，仍可继续剧情', 'Audio is unavailable. You can continue the story.') : sound.status === 'playing' ? tr('正在播放当前对白', 'Playing this line') : ''
    const masterSetting = root.querySelector<HTMLInputElement>('#finale-audio-enabled')
    if (masterSetting) masterSetting.checked = sound.enabled
    const volume = root.querySelector<HTMLInputElement>('#finale-voice-volume')
    if (volume) volume.value = String(Math.round(sound.voiceVolume * 100))
    const volumeOutput = root.querySelector<HTMLOutputElement>('#finale-voice-volume-value')
    if (volumeOutput) volumeOutput.value = `${Math.round(sound.voiceVolume * 100)}%`
    film?.syncAudio(sound.enabled, sound.voiceVolume)
    syncBgm()
    updateFilmUI()
  }

  function closePanel() {
    const active = panel
    panel = null
    if (active?.open) active.close()
    else active?.remove()
  }

  function mountDialog(titleId: string, title: string, content: string, className = 'finale-panel') {
    if (root.querySelector('dialog[open]')) return null
    pauseMedia()
    const before = document.activeElement as HTMLElement | null
    const dialog = document.createElement('dialog')
    dialog.className = `app-dialog ${className}`
    dialog.setAttribute('aria-labelledby', titleId)
    dialog.innerHTML = `<div class="dialog-head"><h2 id="${titleId}">${title}</h2><button class="small-btn" type="button" data-close autofocus>${tr('关闭', 'Close')} ×</button></div>${content}`
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
    dialog.addEventListener('close', () => {
      dialog.remove()
      if (panel === dialog) panel = null
      if (before?.isConnected) before.focus({ preventScroll: true })
      resumeBgm()
    }, { once: true })
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return
      const bounds = dialog.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
    })
    root.append(dialog)
    panel = dialog
    dialog.showModal()
    return dialog
  }

  function openAudioSettings() {
    if (root.querySelector('dialog[open]')) return
    const content = `<div class="finale-panel-body finale-audio-settings"><label class="finale-audio-check"><input type="checkbox" id="finale-audio-enabled" ${sound.enabled ? 'checked' : ''}>${tr('开启声音', 'Enable audio')}</label><label for="finale-voice-volume">${tr('对白与视频音量', 'Dialogue and video volume')} <output id="finale-voice-volume-value">${Math.round(sound.voiceVolume * 100)}%</output></label><input type="range" id="finale-voice-volume" min="0" max="100" step="1" value="${Math.round(sound.voiceVolume * 100)}"><p>${tr('部分角色沿用原声片段，可能与字幕不逐字对应。字幕用于阅读剧情；此处音量同时应用于对白和影片。战后背景音乐轻声播放，对白响起时自动降低，关闭声音也会关闭音乐。', 'Some characters use original recordings that may not match the subtitles word for word. Read the subtitles for the story. This volume applies to dialogue and the film. Aftermath music plays quietly, lowers during dialogue, and follows the audio switch.')}</p></div>`
    const dialog = mountDialog('finale-audio-title', tr('声音设置', 'Sound settings'), content)
    if (!dialog) return
    dialog.querySelector<HTMLInputElement>('#finale-audio-enabled')?.addEventListener('change', event => sound.setEnabled((event.target as HTMLInputElement).checked, false))
    dialog.querySelector<HTMLInputElement>('#finale-voice-volume')?.addEventListener('input', event => sound.setVoiceVolume(Number((event.target as HTMLInputElement).value) / 100))
  }

  function openTextPanel(kind: 'journal' | 'history') {
    let content = ''
    if (kind === 'history') {
      const entries = save.history.map(entry => {
        const historicalNode = finaleStories[chapter][entry.node]
        const line = historicalNode?.lines[entry.line]
        if (!line) return ''
        return `<article class="finale-history-entry"><small>${esc(finaleTitles[chapter][language])} · ${esc(historicalNode.title[language])}</small><strong>${esc(finaleSpeakers[line.speaker][language])}</strong><p>${esc(line.text[language])}</p></article>`
      }).join('')
      content = `<div class="finale-panel-body finale-history">${entries || `<p>${tr('还没有对白记录。', 'No dialogue recorded yet.')}</p>`}</div>`
    } else {
      const clues = save.clues.map(id => `<li>${esc(finaleClueNames[id]?.[language] ?? tr('留存记录', 'Preserved record'))}</li>`).join('')
      const visited = unique(save.visited).map(id => finaleStories[chapter][id]?.title[language]).filter((title): title is string => Boolean(title))
      const endings = finaleEndingIds[chapter].map(id => {
        const unlocked = progress.endings.includes(id) || save.endings.includes(id)
        return `<li>${unlocked ? '✦ ' + esc(finaleEndingNames[id]?.[language] ?? id) : '???'}</li>`
      }).join('')
      const recordedChoices = Object.values(finaleStories[chapter]).flatMap(node => node.choices ?? [])
        .filter(choice => choice.sets?.some(flag => save.flags.includes(flag)))
      const flags = recordedChoices.map(choice => `<li>${esc(choice.text[language])}</li>`).join('')
      content = `<div class="finale-panel-body finale-journal"><p>${tr('当前精神力', 'Current spirit')}: <strong>${save.spirit}/100</strong></p><h3>${tr('已找回的线索', 'Recovered clues')} · ${save.clues.length}</h3>${clues ? `<ul>${clues}</ul>` : `<p>${tr('日记里还没有新的线索。', 'There are no new clues in the journal yet.')}</p>`}<h3>${tr('作出的选择', 'Choices made')}</h3>${flags ? `<ul>${flags}</ul>` : `<p>${tr('还没有留下选择记录。', 'No choice has been recorded yet.')}</p>`}<h3>${tr('抵达过的场景', 'Places reached')} · ${visited.length}</h3><ul>${visited.map(title => `<li>${esc(title)}</li>`).join('')}</ul><h3>${tr('结局图鉴', 'Ending gallery')} · ${progress.endings.length}/${finaleEndingIds[chapter].length}</h3><ul>${endings}</ul></div>`
    }
    const dialog = mountDialog(kind === 'journal' ? 'finale-journal-title' : 'finale-history-title', kind === 'journal' ? tr('本章日记', 'Chapter journal') : tr('对白回顾', 'Dialogue history'), content)
    if (dialog) panel = dialog
  }

  function openRoutes() {
    if (root.querySelector('dialog[open]')) return
    pauseMedia()
    panel = showFinaleStoryMap(root, language, save, progress, id => {
      if (!Object.hasOwn(progress.checkpoints, id)) return
      confirmInApp(root, replayMessage(chapter, language, id), language, () => {
        const replay = restartFinaleFrom(chapter, progress, id)
        if (!replay) return
        closePanel()
        filmCompleted = false
        update(replay, 'finale-stage-title')
      })
    })
    panel.addEventListener('close', resumeBgm, { once: true })
  }

  function portraitFor(speaker: FinaleLine['speaker']) { return finalePortraits[speaker] ?? '' }

  function choicesMarkup(node: (typeof finaleStories)[FinaleChapter][string]) {
    const choices = node.choices ?? []
    if (!choices.length) return ''
    return `<div class="finale-choices" role="group" aria-label="${tr('选择回应', 'Choose a response')}">${choices.map((choice: FinaleChoice) => {
      const available = finaleChoiceAvailable(save, choice)
      const condition = available ? '' : `<small>${tr('尚未满足条件', 'Requirements not met')}</small>`
      return `<button type="button" class="finale-choice" data-choice="${esc(choice.id)}" ${available ? '' : 'disabled'}><strong>${esc(choice.text[language])}</strong><small>${esc(choice.detail[language])}</small>${condition}</button>`
    }).join('')}</div>`
  }

  function narrativeMarkup() {
    const node = currentNode()
    const line = node.lines[save.line]
    const last = save.line >= node.lines.length - 1
    if (!line) return `<section class="finale-dialogue"><p>${tr('这一幕暂时没有对白。', 'There is no dialogue in this scene.')}</p></section>`
    const isChoice = last && Boolean(node.choices?.length)
    const nextLabel = node.ending && last
      ? tr('返回章节详情', 'Back to chapter details')
      : tr('继续', 'Continue')
    const ending = node.ending
      ? `<p class="finale-ending-note">${tr(chapter === 5 ? '第五章 · 结局' : '终章 · 结局', chapter === 5 ? 'Chapter five · Ending' : 'Final chapter · Ending')} / ${esc(finaleEndingNames[node.ending]?.[language] ?? node.ending)}<br>${tr('已解锁结局', 'Unlocked endings')} ${progress.endings.length}/${finaleEndingIds[chapter].length}</p>`
      : ''
    return `<section class="finale-dialogue" aria-label="${tr('当前对白', 'Current dialogue')}"><p class="finale-speaker">${esc(finaleSpeakers[line.speaker][language])}</p><p class="finale-line">${esc(line.text[language])}</p>${isChoice ? choicesMarkup(node) : `<div class="finale-dialogue-actions"><span class="finale-line-counter">${save.line + 1}/${node.lines.length}</span>${line ? `<button class="small-btn" type="button" id="finale-voice" ${sound.enabled ? '' : 'disabled'}>${tr('播放语音', 'Play voice')}</button>` : ''}<span class="finale-audio-status" id="finale-audio-status" role="status" aria-live="polite"></span><button class="primary-btn" type="button" id="finale-next">${nextLabel} →</button></div>`}${ending}</section>`
  }

  function filmMarkup() {
    return `<section class="finale-film-screen" aria-labelledby="finale-stage-title"><header class="finale-film-heading"><p class="finale-kicker">${tr('终章 · 城市决战', 'FINAL CHAPTER · CITY BATTLE')}</p><h1 id="finale-stage-title" tabindex="-1">${esc(currentNode().title[language])}</h1></header><video id="finale-film-video" src="${finaleFilmSrc}" controls playsinline preload="metadata" aria-label="${tr('奶蛙与黑化肥嘟嘟的城市决战', 'Naiwa and dark Feidudu battle in the city')}"></video><div class="finale-film-actions"><button type="button" class="secondary-btn" id="finale-film-play" hidden>${tr('播放视频', 'Play video')}</button><button type="button" class="secondary-btn" id="finale-film-fullscreen">${tr('全屏播放', 'Play fullscreen')} ↗</button><button type="button" class="primary-btn" id="finale-film-skip">${tr('跳过视频，继续剧情', 'Skip video and continue story')} →</button></div><p class="finale-film-status" id="finale-film-status" role="status" aria-live="polite"></p></section>`
  }

  function updateFilmUI() {
    if (disposed || !film) return
    const play = root.querySelector<HTMLButtonElement>('#finale-film-play')
    if (play) {
      play.hidden = film.status === 'playing'
      play.textContent = film.status === 'finished' ? tr('再看一遍', 'Watch again') : film.status === 'error' ? tr('重试播放视频', 'Retry video') : tr('播放视频', 'Play video')
    }
    const skip = root.querySelector<HTMLButtonElement>('#finale-film-skip')
    if (skip) skip.textContent = film.status === 'finished' ? tr('继续剧情', 'Continue story') : tr('跳过视频，继续剧情', 'Skip video and continue story')
    const status = root.querySelector<HTMLElement>('#finale-film-status')
    if (status) status.textContent = film.status === 'blocked' ? tr('点击播放视频即可继续观看。', 'Click Play video to watch.') : film.status === 'error' ? tr('视频暂时无法播放，可以重试或跳过。', 'The video is unavailable. Retry or skip it.') : ''
  }

  function finishFilm() {
    if (disposed || filmCompleted || currentNode().kind !== 'film') return
    filmCompleted = true
    film?.pause()
    sound.pause()
    update(completeFinaleFilm(save), 'finale-stage-title')
  }

  function render(focusId?: string) {
    if (disposed) return
    mediaSuspended = false
    const node = currentNode()
    const line = node.lines[save.line]
    const title = finaleTitles[chapter][language]
    const portraitSpeaker = line && portraitFor(line.speaker) ? line.speaker
      : node.lines.slice(0, save.line + 1).reverse().find(item => portraitFor(item.speaker))?.speaker
        ?? node.lines.find(item => portraitFor(item.speaker))?.speaker
    const shot = finaleArtwork(save)
    const memoryLabel = shot.memory ? `${tr('回忆', 'MEMORY')} · ${shot.memory[language]}` : ''
    const artworkTitle = memoryLabel || node.title[language]
    const portraitSrc = !shot.cg && portraitSpeaker ? portraitFor(portraitSpeaker) : ''
    const oldLayer = root.querySelector<HTMLElement>('.finale-art-layer')
    const portrait = portraitSrc && portraitSpeaker
      ? `<figure class="finale-portrait"><img src="${portraitSrc}" alt="${esc(finaleSpeakers[portraitSpeaker][language])}" decoding="async"></figure>`
      : ''
    const gameMarkup = `<div class="finale-game finale-chapter-${save.node.startsWith('f5-') ? 5 : 6}${shot.cg ? ' finale-has-cg' : ''}" data-chapter="${chapter}" lang="${language === 'zh' ? 'zh-CN' : 'en'}"><div class="finale-art-layer" aria-hidden="true"></div><div class="finale-scene-scrim" aria-hidden="true"></div>${portrait}<header class="finale-toolbar"><button class="small-btn finale-back" type="button" id="finale-back">← ${tr('章节详情', 'Chapter details')}</button><span class="finale-wordmark">${chapter === 5 ? 'V' : 'VI'} / ${esc(title)}</span><nav class="finale-toolset" aria-label="${tr('章节工具', 'Chapter tools')}"><button class="small-btn" type="button" id="finale-journal">${tr('日记', 'Journal')}</button><button class="small-btn" type="button" id="finale-image" aria-haspopup="dialog">${tr('看图', 'View art')}</button><button class="small-btn" type="button" id="finale-log">${tr('回顾', 'History')}</button><button class="small-btn" type="button" id="finale-routes">${tr('剧情树', 'Story map')}</button><button class="small-btn" type="button" id="finale-audio" aria-pressed="${sound.enabled}">${sound.enabled ? tr('声音：开', 'Audio on') : tr('声音：关', 'Audio off')}</button><button class="small-btn" type="button" id="finale-audio-settings" aria-haspopup="dialog">${tr('声音设置', 'Sound settings')}</button><button class="small-btn" type="button" id="finale-fullscreen" aria-pressed="${isAppFullscreen(root)}">${isAppFullscreen(root) ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen')}</button><button class="small-btn" type="button" id="finale-language" aria-label="${tr('切换至英文', 'Switch to Chinese')}">${language === 'zh' ? 'EN' : '中文'}</button></nav></header><div class="finale-status" aria-label="${tr('当前状态', 'Current status')}"><span>${tr('精神力', 'Spirit')} <strong>${save.spirit}</strong>/100</span><span class="finale-clue-count">${tr('线索', 'Clues')} <strong>${save.clues.length}</strong></span></div><main class="finale-main" id="finale-main" tabindex="-1">${node.kind === 'film' ? filmMarkup() : `<div class="finale-node-heading">${memoryLabel ? `<p class="finale-memory-label" role="status">${esc(memoryLabel)}</p>` : ''}<p class="finale-kicker">${save.node.startsWith('f5-') ? tr('第五层 · 无光深渊', 'LAYER FIVE · THE LIGHTLESS DEEP') : tr('最后一层 · 同一颗心', 'THE FINAL LAYER · ONE HEART')}</p><h1 id="finale-stage-title" tabindex="-1">${esc(node.title[language])}</h1></div>${narrativeMarkup()}`}<p class="finale-notice" role="status">${esc(notice)}</p></main><footer class="finale-save-footer"><span role="status">${storageAvailable ? tr('本章进度自动保存', 'Chapter progress saved automatically') : tr('无法保存到浏览器 · 请保持本页开启', 'Session only · Keep this page open')}</span><span>${tr('空格 / Enter 继续 · Tab 选择操作', 'Space / Enter to continue · Tab to choose an action')}</span></footer></div>`
    root.innerHTML = gameMarkup
    const placeholder = root.querySelector<HTMLElement>('.finale-art-layer')!
    const layer = oldLayer ?? placeholder
    if (oldLayer) placeholder.replaceWith(oldLayer)
    transitionSceneImage(layer, { id: shot.id, src: shot.src, position: shot.position, alt: artworkTitle, className: 'finale-backdrop', visibleClass: 'is-visible', fallback: chapter === 5 ? '/images/chapter-03-theatre.webp' : '/images/chapter-04-ending-bedside-reality.webp' })
    root.querySelector<HTMLImageElement>('.finale-portrait img')?.addEventListener('error', event => {
      const image = event.currentTarget as HTMLImageElement
      image.closest('.finale-portrait')?.remove()
    }, { once: true })
    if (node.kind !== 'film') {
      film?.dispose(); film = null; filmElement = null; filmCompleted = false
    }
    logCurrentLine()
    persist()
    sound.sync(save, language)
    root.querySelector('#finale-back')?.addEventListener('click', () => { pauseMedia(); onBack(language) })
    root.querySelector('#finale-journal')?.addEventListener('click', () => openTextPanel('journal'))
    root.querySelector('#finale-image')?.addEventListener('click', () => {
      mountDialog('finale-image-title', artworkTitle, `<img class="finale-image-view" src="${shot.src}" alt="${esc(artworkTitle)}">`, 'finale-image-panel')
    })
    root.querySelector('#finale-log')?.addEventListener('click', () => openTextPanel('history'))
    root.querySelector('#finale-routes')?.addEventListener('click', openRoutes)
    root.querySelector('#finale-audio')?.addEventListener('click', () => sound.setEnabled(!sound.enabled))
    root.querySelector('#finale-audio-settings')?.addEventListener('click', openAudioSettings)
    root.querySelector('#finale-voice')?.addEventListener('click', () => sound.toggleVoice())
    root.querySelector('#finale-fullscreen')?.addEventListener('click', () => toggleAppFullscreen(root))
    root.querySelector('#finale-language')?.addEventListener('click', () => {
      language = language === 'zh' ? 'en' : 'zh'
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
      onLanguageChange?.(language)
      closePanel()
      render('finale-language')
    })
    root.querySelector('#finale-next')?.addEventListener('click', advance)
    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', () => {
      const next = applyFinaleChoice(save, button.dataset.choice ?? '')
      if (next !== save) { sound.pause(); update(next, 'finale-stage-title') }
    }))
    if (node.kind === 'film') {
      const placeholderVideo = root.querySelector<HTMLVideoElement>('#finale-film-video')!
      if (film && filmElement) {
        placeholderVideo.replaceWith(filmElement)
        updateFilmUI()
      } else {
        filmElement = placeholderVideo
        filmCompleted = false
        film = createGildedFilm(filmElement, updateFilmUI, finishFilm)
        film.syncAudio(sound.enabled, sound.voiceVolume)
        if (!document.hidden) { film.play(); void film.enterFullscreen() }
      }
      root.querySelector('#finale-film-play')?.addEventListener('click', () => { film?.play(); void film?.enterFullscreen() })
      root.querySelector('#finale-film-fullscreen')?.addEventListener('click', () => { film?.play(); void film?.enterFullscreen() })
      root.querySelector('#finale-film-skip')?.addEventListener('click', finishFilm)
    }
    if (focusId) root.querySelector<HTMLElement>(`#${focusId}`)?.focus({ preventScroll: true })
    updateAudioUI()
  }

  function logCurrentLine() {
    const node = currentNode()
    if (!node.lines[save.line]) return
    const last = save.history.at(-1)
    if (!last || last.node !== save.node || last.line !== save.line) save.history = [...save.history, { node: save.node, line: save.line }].slice(-200)
  }

  function update(next: FinaleSave, focusId?: string) {
    if (disposed || next === save) return
    const changedNode = next.node !== save.node
    save = next
    if (changedNode) {
      notice = ''
      filmCompleted = false
      progress = recordFinaleCheckpoint(progress, save, true)
    }
    render(focusId)
  }

  function advance() {
    if (disposed || root.querySelector('dialog[open]')) return
    const node = currentNode()
    if (node.kind === 'film') return
    const last = save.line >= node.lines.length - 1
    if (node.ending && last) {
      pauseMedia()
      onBack(language)
      return
    }
    if (last && node.choices?.length) return
    logCurrentLine()
    sound.pause()
    update(advanceFinale(save), 'finale-stage-title')
  }

  const fullChange = () => {
    const button = root.querySelector<HTMLButtonElement>('#finale-fullscreen')
    if (!button) return
    button.textContent = isAppFullscreen(root) ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen')
    button.setAttribute('aria-pressed', String(isAppFullscreen(root)))
  }
  const visibilityChanged = () => { if (document.hidden) pauseMedia(); else resumeBgm() }
  const retryBgm = () => bgm.retry()
  const keydown = (event: KeyboardEvent) => {
    if (disposed || event.repeat || event.altKey || event.ctrlKey || event.metaKey || root.querySelector('dialog[open]')) return
    if (event.key !== ' ' && event.key !== 'Enter') return
    const target = event.target as HTMLElement
    if (target.closest('button, a, input, textarea, select, video, [contenteditable="true"], [role="slider"]')) return
    event.preventDefault()
    advance()
  }
  const languageChanged = () => {
    const button = root.querySelector<HTMLButtonElement>('#finale-language')
    if (button) button.setAttribute('aria-label', language === 'zh' ? '切换至英文' : 'Switch to Chinese')
  }
  document.addEventListener('visibilitychange', visibilityChanged)
  root.addEventListener('pointerdown', retryBgm, true)
  root.addEventListener('click', retryBgm, true)
  root.addEventListener('keydown', retryBgm, true)
  document.addEventListener('keydown', keydown)
  document.addEventListener('fullscreenchange', fullChange)
  window.addEventListener('appimmersivechange', fullChange)
  window.addEventListener('languagechange', languageChanged)
  render('finale-stage-title')

  function setLanguage(next: Language) {
    if (disposed || language === next) return
    language = next
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
    closePanel()
    render('finale-stage-title')
  }

  return {
    setLanguage,
    dispose() {
      if (disposed) return
      disposed = true
      closePanel()
      film?.dispose()
      film = null; filmElement = null
      sound.dispose()
      bgm.dispose()
      root.removeEventListener('pointerdown', retryBgm, true)
      root.removeEventListener('click', retryBgm, true)
      root.removeEventListener('keydown', retryBgm, true)
      document.removeEventListener('visibilitychange', visibilityChanged)
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('fullscreenchange', fullChange)
      window.removeEventListener('appimmersivechange', fullChange)
      window.removeEventListener('languagechange', languageChanged)
      if (theme && previousTheme !== undefined) theme.content = previousTheme
      document.documentElement.lang = previousDocumentLanguage
    },
  }
}
