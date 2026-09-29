import './style.css'
import { firstScene, memoryNames, story, type Language, type Line, type MemoryId, type Scene } from './story'
import { chapterTwoStatus, mountChapterTwo } from './chapter-two'
import { characterVoiceSequence } from './character-voice'
import { enterAppFullscreen, isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { confirmInApp } from './ui-confirm'

type LogEntry = { sceneId: string; index: number }
type GameState = {
  version: 1
  sceneId: string
  lineIndex: number
  language: Language
  affection: number
  anxiety: number
  spirit: number
  danger: number
  memories: MemoryId[]
  history: LogEntry[]
}
type Checkpoint = Pick<GameState, 'sceneId' | 'affection' | 'anxiety' | 'spirit' | 'danger' | 'memories'>
type Progress = { version: 1; checkpoints: Record<string, Checkpoint>; endings: string[] }

const STORAGE_KEY = 'naiwa-origin-save-v1'
const PROGRESS_KEY = 'naiwa-origin-progress-v1'
const LANGUAGE_OVERRIDE_KEY = 'naiwa-language-override-v1'

function systemLanguage(): Language {
  const locale = navigator.languages?.[0] || navigator.language || ''
  return locale.toLowerCase().split(/[-_]/)[0] === 'zh' ? 'zh' : 'en'
}

function languageOverride(): Language | null {
  try {
    const value = localStorage.getItem(LANGUAGE_OVERRIDE_KEY)
    return value === 'zh' || value === 'en' ? value : null
  } catch { return null }
}

const root = document.querySelector<HTMLDivElement>('#app')!
let state: GameState | null = loadSave()
let progress: Progress = loadProgress()
let active = false
let modal: 'log' | 'menu' | 'routes' | 'settings' | 'gallery' | null = null
let preferredLanguage: Language = languageOverride() ?? systemLanguage()
if (state) state.language = preferredLanguage
let imageGeneration = 0
type SoundPlayback = { key: string; audio: HTMLAudioElement; clips: string[]; clipIndex: number; status: 'playing' | 'finished' | 'error' }
let soundPlayback: SoundPlayback | null = null
let ambientLaugh: HTMLAudioElement | null = null
let ambientEnabled = true
let ambientError = false
let selectedChapter: 0 | 1 | 2 = 0
let chapterTwoController: ReturnType<typeof mountChapterTwo> | null = null
let playbackMode: 'off' | 'auto' | 'skip' = 'off'
let playbackTimer: number | null = null
let audioEnabled = localStorage.getItem('naiwa-audio-enabled-v1') !== 'false'

function clearPlaybackTimer() {
  if (playbackTimer !== null) window.clearTimeout(playbackTimer)
  playbackTimer = null
}

function stopPlayback() {
  clearPlaybackTimer()
  playbackMode = 'off'
}

const MAP_WIDTH = 1100
const MAP_HEIGHT = 3600
const mapNodes: Record<string, { x: number; y: number }> = {
  p01: { x: 550, y: 80 }, p02: { x: 550, y: 195 },
  p03a: { x: 280, y: 310 }, p03b: { x: 820, y: 310 },
  p04a: { x: 550, y: 430 }, p04b: { x: 550, y: 540 }, p05: { x: 550, y: 650 },
  n01: { x: 180, y: 770 }, r01: { x: 550, y: 770 },
  r01a: { x: 350, y: 890 }, r01b: { x: 750, y: 890 },
  r02: { x: 550, y: 1010 },
  r02a: { x: 350, y: 1130 }, r02b: { x: 750, y: 1130 },
  r03: { x: 550, y: 1250 },
  r03a: { x: 350, y: 1370 }, r03b: { x: 750, y: 1370 },
  r04: { x: 550, y: 1490 }, a01: { x: 550, y: 1610 },
  a02a: { x: 280, y: 1730 }, a02b: { x: 550, y: 1730 }, a02c: { x: 820, y: 1730 },
  a03: { x: 550, y: 1850 }, a04: { x: 550, y: 1960 },
  m01: { x: 550, y: 2070 }, m02: { x: 550, y: 2180 }, m03: { x: 550, y: 2290 },
  m04: { x: 550, y: 2400 }, be01: { x: 280, y: 2530 },
  m05: { x: 550, y: 2530 }, be02: { x: 820, y: 2530 },
  m06: { x: 550, y: 2650 },
  explore_toy: { x: 160, y: 2780 }, explore_gift: { x: 420, y: 2780 },
  explore_photo: { x: 680, y: 2780 }, diary_kiosk: { x: 940, y: 2780 },
  find_toy: { x: 160, y: 2900 }, find_gift: { x: 420, y: 2900 },
  find_photo: { x: 680, y: 2900 }, doll_hunt: { x: 940, y: 2900 },
  wrong_toy: { x: 220, y: 3020 }, wrong_gift: { x: 500, y: 3020 },
  wrong_photo: { x: 780, y: 3020 },
  m07: { x: 550, y: 3150 }, exhausted: { x: 940, y: 3150 },
  m08: { x: 550, y: 3270 }, e01: { x: 550, y: 3390 }, e02: { x: 550, y: 3510 },
}

const ui = {
  zh: {
    title: '奶之救赎', subtitle: '缘起', tagline: '那场雨之后，我走进了你的世界。',
    start: '开始故事', continue: '继续故事', restart: '重新开始', log: '回顾', routes: '剧情树', menu: '菜单',
    fullscreen: '全屏', exitFullscreen: '退出全屏',
    language: 'EN', languageLabel: 'Switch to English', close: '关闭', next: '点击画面或按空格继续',
    select: '选择你的回答', spirit: '精神力', memories: '回忆', danger: '玩偶警戒', found: '已找回', ending: '故事到此告一段落',
    finish: '《奶之救赎：缘起》完', replay: '再玩一次', returnTitle: '返回标题',
    confirmRestart: '确定重新开始吗？当前进度会被覆盖。', emptyLog: '故事开始后，对话会显示在这里。',
    introNote: '一段关于相遇、信任与内心世界的互动故事', saveNote: '进度自动保存在此浏览器',
    controls: '空格 / Enter 推进 · 点击选项作出选择 · Esc 关闭菜单',
    allFound: '三件回忆物已集齐',
    routesHint: '拖动画布查看剧情。点击已解锁节点可从这里重新开始；灰色节点尚未解锁。', endingGallery: '结局图鉴',
    unlocked: '已解锁', locked: '未解锁', routeConfirm: '从这里重新开始？当前进行中的剧情会被覆盖，已解锁的分支和结局会保留。',
    zoomIn: '放大', zoomOut: '缩小', mapLabel: '剧情分支思维导图',
    exploreMap: '迷雾游乐园地图', needMemories: '集齐三件回忆物后开放',
    pickObject: '将鼠标移到画面中的物品上并点击 · 手机可直接点选',
    laughPlaying: '奶蛙的笑声', naiwaSpeaking: '奶蛙的声音', heroPlaying: '主角男声', narratorPlaying: '旁白', soundSkip: '跳过', soundRetry: '重新播放',
    ambientOff: '关闭笑声', ambientOn: '开启笑声', ambientRetry: '播放笑声',
    save: '存档', saved: '已保存', settings: '设置', gallery: '图鉴', auto: '自动', skip: '快进', audio: '语音播放', on: '开启', off: '关闭',
  },
  en: {
    title: 'naiwa', subtitle: 'Origin', tagline: 'After that rain, I stepped into your world.',
    start: 'Begin story', continue: 'Continue', restart: 'Start over', log: 'History', routes: 'Story map', menu: 'Menu',
    fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen',
    language: 'ZH', languageLabel: 'Switch to Chinese', close: 'Close', next: 'Click the scene or press Space to continue',
    select: 'Choose your response', spirit: 'Spirit', memories: 'Memories', danger: 'Doll alert', found: 'Recovered', ending: 'This path ends here',
    finish: 'The End · naiwa: Origin', replay: 'Play again', returnTitle: 'Return to title',
    confirmRestart: 'Start over? Your current progress will be replaced.', emptyLog: 'Dialogue will appear here once the story begins.',
    introNote: 'An interactive story of meeting, trust, and the world within', saveNote: 'Progress saves automatically in this browser',
    controls: 'Space / Enter to advance · Choose with a click · Esc to close the menu',
    allFound: 'All three memories found',
    routesHint: 'Drag to explore. Select any unlocked node to restart there; dimmed nodes are still locked.', endingGallery: 'Ending gallery',
    unlocked: 'Unlocked', locked: 'Locked', routeConfirm: 'Restart from here? Your current run will be replaced, while unlocked routes and endings remain.',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', mapLabel: 'Branching story mind map',
    exploreMap: 'Mistbound fairground map', needMemories: 'Find all three memories to continue',
    pickObject: 'Hover over an item and click · Tap an item on mobile',
    laughPlaying: 'naiwa’s laugh', naiwaSpeaking: 'naiwa’s voice', heroPlaying: 'Protagonist voice', narratorPlaying: 'Narration', soundSkip: 'Skip', soundRetry: 'Replay',
    ambientOff: 'Turn off laughter', ambientOn: 'Turn on laughter', ambientRetry: 'Play laughter',
    save: 'Save', saved: 'Saved', settings: 'Settings', gallery: 'Gallery', auto: 'Auto', skip: 'Skip', audio: 'Voice playback', on: 'On', off: 'Off',
  },
} as const

const objectScenes: Record<string, {
  boxes: { x: number; y: number; width: number; height: number }[]
  labels: Record<Language, [string, string]>
}> = {
  explore_toy: {
    boxes: [{ x: 622, y: 305, width: 258, height: 263 }, { x: 883, y: 300, width: 190, height: 282 }],
    labels: { zh: ['旧木马', '小丑玩偶'], en: ['Worn horse', 'Clown doll'] },
  },
  explore_gift: {
    boxes: [{ x: 694, y: 292, width: 234, height: 174 }, { x: 920, y: 333, width: 163, height: 140 }],
    labels: { zh: ['星星杯', '戒指'], en: ['Star mug', 'Ring'] },
  },
  explore_photo: {
    boxes: [{ x: 515, y: 326, width: 317, height: 282 }, { x: 850, y: 326, width: 307, height: 282 }],
    labels: { zh: ['逆光合照', '完美合照'], en: ['Backlit photo', 'Perfect photo'] },
  },
}

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return null
    const data = saved as Partial<GameState>
    const sceneId = data.sceneId === 'false_trail' ? 'm06' : data.sceneId
    if (data.version !== 1 || !sceneId || !Object.hasOwn(story, sceneId) || !Number.isInteger(data.lineIndex)) return null
    if (data.language !== 'zh' && data.language !== 'en') return null
    return {
      version: 1, sceneId, lineIndex: data.sceneId === 'false_trail' ? 0 : Math.max(0, data.lineIndex ?? 0), language: data.language,
      affection: Number.isFinite(data.affection) ? data.affection! : 0,
      anxiety: Number.isFinite(data.anxiety) ? data.anxiety! : 0,
      spirit: Number.isFinite(data.spirit) ? data.spirit! : 100,
      danger: Number.isFinite(data.danger) ? Math.max(0, data.danger!) : 0,
      memories: Array.isArray(data.memories) ? data.memories.filter((m): m is MemoryId => m === 'toy' || m === 'gift' || m === 'photo') : [],
      history: Array.isArray(data.history) ? data.history.filter((entry): entry is LogEntry => !!entry && typeof entry.sceneId === 'string' && !!story[entry.sceneId] && Number.isInteger(entry.index)).slice(-120) : [],
    }
  } catch {
    return null
  }
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { version: 1, checkpoints: {}, endings: [] }
    const value = JSON.parse(raw) as Partial<Progress>
    if (value.version !== 1 || !value.checkpoints || !Array.isArray(value.endings)) throw new Error('Invalid progress')
    const checkpoints: Record<string, Checkpoint> = {}
    for (const [id, snapshot] of Object.entries(value.checkpoints)) {
      if (!Object.hasOwn(story, id) || !snapshot || snapshot.sceneId !== id) continue
      checkpoints[id] = {
        sceneId: id, affection: Number.isFinite(snapshot.affection) ? snapshot.affection : 0,
        anxiety: Number.isFinite(snapshot.anxiety) ? snapshot.anxiety : 0,
        spirit: Number.isFinite(snapshot.spirit) ? snapshot.spirit : 100,
        danger: Number.isFinite(snapshot.danger) ? Math.max(0, snapshot.danger) : 0,
        memories: Array.isArray(snapshot.memories) ? snapshot.memories.filter((m): m is MemoryId => m === 'toy' || m === 'gift' || m === 'photo') : [],
      }
    }
    return { version: 1, checkpoints, endings: value.endings.filter(id => Object.hasOwn(story, id) && !!story[id].ending) }
  } catch {
    return { version: 1, checkpoints: {}, endings: [] }
  }
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

function unlockScene() {
  if (!state) return
  const id = state.sceneId
  if (!progress.checkpoints[id]) {
    progress.checkpoints[id] = {
      sceneId: id, affection: state.affection, anxiety: state.anxiety,
      spirit: state.spirit, danger: state.danger, memories: [...state.memories],
    }
  }
  if (story[id].ending && !progress.endings.includes(id)) progress.endings.push(id)
  saveProgress()
}

function migrateProgressFromSave() {
  if (!state || Object.keys(progress.checkpoints).length) return
  const sequence = state.history.filter(entry => entry.index === 0).map(entry => entry.sceneId)
  const draft: Checkpoint = { sceneId: firstScene, affection: 0, anxiety: 0, spirit: 100, danger: 0, memories: [] }
  let previous: string | null = null
  for (const id of sequence) {
    if (!Object.hasOwn(story, id)) continue
    const choice = previous ? story[previous].choices?.find(option => option.next === id) : undefined
    if (choice) {
      draft.affection = Math.max(0, draft.affection + (choice.affection ?? 0))
      draft.anxiety = Math.max(0, draft.anxiety + (choice.anxiety ?? 0))
      draft.spirit = Math.max(0, draft.spirit + (choice.spirit ?? 0))
      draft.danger = Math.max(0, draft.danger + (choice.danger ?? 0))
      if (choice.memory && !draft.memories.includes(choice.memory)) draft.memories.push(choice.memory)
    } else if (id === 'exhausted') draft.spirit = 0
    draft.sceneId = id
    if (!progress.checkpoints[id]) progress.checkpoints[id] = { ...draft, memories: [...draft.memories] }
    if (story[id].ending && !progress.endings.includes(id)) progress.endings.push(id)
    previous = id
  }
  if (!progress.checkpoints[state.sceneId]) progress.checkpoints[state.sceneId] = {
    sceneId: state.sceneId, affection: state.affection, anxiety: state.anxiety,
    spirit: state.spirit, danger: state.danger, memories: [...state.memories],
  }
  if (story[state.sceneId].ending && !progress.endings.includes(state.sceneId)) progress.endings.push(state.sceneId)
  saveProgress()
}

function save() {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function sceneLines(scene: Scene) {
  return scene.lines.filter(line => !line.when || (line.when === 'uneasy' ? (state?.anxiety ?? 0) >= 20 : (state?.anxiety ?? 0) < 20))
}

function current() {
  if (!state) throw new Error('No active game')
  return story[state.sceneId]
}

function stopSound() {
  if (!soundPlayback) return
  soundPlayback.audio.pause()
  soundPlayback.audio.src = ''
  soundPlayback = null
}

function stopAmbientLaugh() {
  if (!ambientLaugh) return
  ambientLaugh.pause()
  ambientLaugh.src = ''
  ambientLaugh = null
}

function syncAmbientLaugh() {
  if (!state || !['e01', 'e02'].includes(state.sceneId) || !ambientEnabled || !audioEnabled) {
    stopAmbientLaugh()
    return
  }
  if (ambientLaugh) return
  const audio = new Audio('/audio/naiwa-laugh.m4a')
  audio.volume = 0.16
  audio.loop = true
  ambientLaugh = audio
  ambientError = false
  audio.addEventListener('error', () => {
    if (ambientLaugh !== audio) return
    ambientError = true
    renderGame()
  })
  void audio.play().catch(() => {
    if (ambientLaugh !== audio) return
    ambientError = true
    renderGame()
  })
}

function playSound(playback: SoundPlayback) {
  playback.status = 'playing'
  playback.audio.currentTime = 0
  void playback.audio.play().catch(() => {
    if (soundPlayback !== playback) return
    playback.status = 'error'
    renderGame()
  })
}

function longNaiwaLine(line: Line) {
  return (line.text.zh.match(/\p{Script=Han}/gu)?.length ?? 0) >= 20
}

function soundClips(sceneId: string, line: Line, language: Language): string[] {
  if (!line.speaker) {
    const index = story[sceneId].lines.indexOf(line)
    const narration = `/audio/tts/narration-01-${sceneId}-${index}-${language}.mp3`
    return line.sound === 'naiwa-laugh' ? ['/audio/naiwa-laugh.m4a', narration] : [narration]
  }
  if (!line.sound) return []
  if (line.sound === 'naiwa-speech' || line.sound === 'naiwa-short-reply') return characterVoiceSequence(line.sound === 'naiwa-speech' && longNaiwaLine(line))
  return [line.sound.startsWith('protagonist-') ? `/audio/tts/hero-${line.sound.slice('protagonist-'.length)}-${language}.mp3` : `/audio/${line.sound}.m4a`]
}

function syncSound() {
  if (!state) return
  if (!audioEnabled) { stopSound(); return }
  const line = sceneLines(current())[state.lineIndex]
  if (!line || (!line.sound && line.speaker)) { stopSound(); return }
  const key = `${state.sceneId}:${state.lineIndex}:${!line.speaker || line.sound?.startsWith('protagonist-') ? state.language : ''}`
  if (soundPlayback?.key === key) return
  stopSound()
  const clips = soundClips(state.sceneId, line, state.language)
  const audio = new Audio(clips[0])
  const playback: SoundPlayback = { key, audio, clips, clipIndex: 0, status: 'playing' }
  soundPlayback = playback
  audio.addEventListener('ended', () => {
    if (soundPlayback !== playback) return
    if (playback.clipIndex < playback.clips.length - 1) {
      audio.src = playback.clips[++playback.clipIndex]
      playSound(playback)
      return
    }
    playback.status = 'finished'
    renderGame()
  })
  audio.addEventListener('error', () => {
    if (soundPlayback !== playback) return
    playback.status = 'error'
    renderGame()
  })
  playSound(playback)
}

function enter(sceneId: string) {
  if (!state || !Object.hasOwn(story, sceneId)) return
  state.sceneId = sceneId
  state.lineIndex = 0
  recordLine()
  unlockScene()
  save()
  render()
}

function recordLine() {
  if (!state) return
  const lines = sceneLines(current())
  if (!lines[state.lineIndex]) return
  const latest = state.history.at(-1)
  if (latest?.sceneId === state.sceneId && latest.index === state.lineIndex) return
  state.history.push({ sceneId: state.sceneId, index: state.lineIndex })
  state.history = state.history.slice(-120)
}

function start() {
  stopPlayback()
  stopSound()
  stopAmbientLaugh()
  ambientEnabled = true
  state = { version: 1, sceneId: firstScene, lineIndex: 0, language: preferredLanguage, affection: 0, anxiety: 0, spirit: 100, danger: 0, memories: [], history: [] }
  selectedChapter = 1
  active = true
  modal = null
  recordLine()
  unlockScene()
  save()
  render()
}

function restartFrom(sceneId: string) {
  stopPlayback()
  const snapshot = progress.checkpoints[sceneId]
  if (!snapshot) return
  stopSound()
  stopAmbientLaugh()
  ambientEnabled = true
  state = {
    version: 1, ...snapshot, memories: [...snapshot.memories],
    lineIndex: 0, language: preferredLanguage, history: [],
  }
  selectedChapter = 1
  active = true
  modal = null
  recordLine()
  save()
  render()
}

function advance() {
  if (!active || !state || modal) return
  const scene = current()
  const lines = sceneLines(scene)
  if (state.lineIndex < lines.length - 1) {
    state.lineIndex++
    recordLine()
    save()
    render()
  } else if (scene.next) {
    enter(scene.next)
  }
}

function select(index: number) {
  if (!state || !active || modal) return
  const scene = current()
  if (state.lineIndex < sceneLines(scene).length - 1) return
  const choices = availableChoices(scene)
  const choice = choices[index]
  if (!choice) return
  const leavingCrossroads = state.sceneId === 'm06' && choice.next !== 'm07'
  state.affection = Math.max(0, state.affection + (choice.affection ?? 0))
  state.anxiety = Math.max(0, state.anxiety + (choice.anxiety ?? 0))
  state.spirit = Math.max(0, state.spirit + (choice.spirit ?? 0))
  state.danger = Math.max(0, state.danger + (choice.danger ?? 0))
  if (choice.memory && !state.memories.includes(choice.memory)) state.memories.push(choice.memory)
  enter(state.spirit <= 0 ? 'exhausted' : leavingCrossroads && state.danger >= 4 ? 'doll_hunt' : choice.next)
}

function availableChoices(scene: Scene) {
  return (scene.choices ?? []).filter(choice =>
    (!choice.unlessMemory || !state?.memories.includes(choice.unlessMemory)) &&
    (!choice.requiresAllMemories || state?.memories.length === 3),
  )
}

function setPreferredLanguage(language: Language) {
  preferredLanguage = language
  try {
    if (language === systemLanguage()) localStorage.removeItem(LANGUAGE_OVERRIDE_KEY)
    else localStorage.setItem(LANGUAGE_OVERRIDE_KEY, language)
  } catch { /* The current session can still switch languages without storage. */ }
  if (state) {
    state.language = preferredLanguage
    save()
  }
  document.documentElement.lang = preferredLanguage === 'zh' ? 'zh-CN' : 'en'
}

function confirmRestart(action: () => void, message: string = ui[preferredLanguage].confirmRestart) {
  confirmInApp(root, message, preferredLanguage, () => {
    root.querySelector<HTMLDialogElement>('#app-dialog')?.close()
    modal = null
    action()
  })
}

function openModal(kind: NonNullable<typeof modal>) {
  clearPlaybackTimer()
  modal = kind
  renderModal()
}

function manualSave() {
  save()
  saveProgress()
  const button = root.querySelector<HTMLButtonElement>('#save-entry')
  if (button) {
    button.textContent = ui[preferredLanguage].saved
    window.setTimeout(() => { if (button.isConnected) button.textContent = ui[preferredLanguage].save }, 1600)
  }
}

function toggleLanguage() {
  setPreferredLanguage(preferredLanguage === 'zh' ? 'en' : 'zh')
  render()
}

function imageUrl(id: string) { return `/images/${id}.webp` }

function renderChapterSelect() {
  stopSound()
  stopAmbientLaugh()
  const lang = preferredLanguage
  const status = chapterTwoStatus()
  root.innerHTML = `<div class="chapter-select" style="--cover:url('${imageUrl('P02')}')">
    <header class="chapter-select-top"><span class="wordmark">NAIWA <span>·</span> ${lang === 'zh' ? '奶之救赎' : 'THE REDEMPTION'}</span><div class="chapter-select-tools"><button class="small-btn" id="routes-select" type="button">${esc(ui[lang].routes)}</button><button class="small-btn" id="save-entry" type="button" ${state ? '' : 'disabled'}>${esc(ui[lang].save)}</button><button class="small-btn" id="settings-entry" type="button">${esc(ui[lang].settings)}</button><button class="small-btn" id="gallery-entry" type="button">${esc(ui[lang].gallery)}</button>${state ? `<button class="small-btn" id="replay-select" type="button">${esc(ui[lang].restart)}</button>` : ''}<button class="small-btn" id="fullscreen" type="button"></button><button class="small-btn" id="language" aria-label="${ui[lang].languageLabel}">${ui[lang].language}</button></div></header>
    <main class="chapter-select-main"><div class="chapter-select-heading"><span>AN INTERACTIVE STORY / 2026</span><h1>${lang === 'zh' ? '奶之救赎' : 'naiwa'}</h1><p>${lang === 'zh' ? '选择章节，走进奶蛙的世界。' : 'Choose a chapter and step into naiwa’s world.'}</p></div>
      <div class="chapter-cards"><button class="chapter-card first" id="chapter-one" type="button"><span class="card-overline">CHAPTER 01 / ${lang === 'zh' ? '已开放' : 'AVAILABLE'}</span><strong>${lang === 'zh' ? '缘起' : 'Origin'}</strong><span class="card-description">${lang === 'zh' ? '雨夜相遇，走进迷雾游乐园，找回遗失的回忆。' : 'A rainy meeting leads into the mistbound fairground.'}</span><span class="card-action">${state ? ui[lang].continue : ui[lang].start} ↗</span></button>
      <button class="chapter-card second" id="chapter-two" type="button"><span class="card-overline">CHAPTER 02 / ${lang === 'zh' ? '已开放' : 'AVAILABLE'}</span><strong>${lang === 'zh' ? '冰镜疑凶' : 'The Culprit in the Ice'}</strong><span class="card-description">${lang === 'zh' ? '追踪紫色身影，穿过冰封镜馆，拼出被裁切的真相。' : 'Follow a purple shadow through the frozen mirror hall.'}</span><span class="card-action">${status.started ? lang === 'zh' ? '继续第二章' : 'Resume chapter' : lang === 'zh' ? '进入冰晶世界' : 'Enter the ice world'} ↗</span></button></div>
      <p class="chapter-select-note">${lang === 'zh' ? '章节分别保存进度 · 可随时返回切换' : 'Each chapter saves separately · Switch at any time'}</p>
    </main><footer class="chapter-select-bottom"><span>© NAIWA / 2026</span><span>01 — 02</span></footer></div>`
  root.querySelector('#language')?.addEventListener('click', toggleLanguage)
  root.querySelector('#fullscreen')?.addEventListener('click', toggleFullscreen)
  root.querySelector('#routes-select')?.addEventListener('click', () => openModal('routes'))
  root.querySelector('#save-entry')?.addEventListener('click', manualSave)
  root.querySelector('#settings-entry')?.addEventListener('click', () => openModal('settings'))
  root.querySelector('#gallery-entry')?.addEventListener('click', () => openModal('gallery'))
  root.querySelector('#replay-select')?.addEventListener('click', () => confirmRestart(() => { selectedChapter = 1; start() }))
  root.querySelector('#chapter-one')?.addEventListener('click', () => { stopPlayback(); enterFullscreen(); selectedChapter = 1; render() })
  root.querySelector('#chapter-two')?.addEventListener('click', () => { stopPlayback(); enterFullscreen(); selectedChapter = 2; active = false; render() })
  updateFullscreenButton()
}

function renderIntro() {
  stopSound()
  stopAmbientLaugh()
  const t = ui[preferredLanguage]
  root.innerHTML = `
    <div class="intro" style="--intro-image:url('${imageUrl('P02')}')">
      <header class="intro-top"><button class="wordmark wordmark-btn" id="chapter-home" type="button" aria-label="${preferredLanguage === 'zh' ? '返回章节选择' : 'Back to chapters'}">← NAIWA <span>·</span> ORIGIN</button><div class="intro-tools"><button class="small-btn" id="routes-intro-top" type="button">${esc(t.routes)}</button><button class="small-btn" id="save-entry" type="button" ${state ? '' : 'disabled'}>${esc(t.save)}</button><button class="small-btn" id="settings-entry" type="button">${esc(t.settings)}</button><button class="small-btn" id="gallery-entry" type="button">${esc(t.gallery)}</button><button class="small-btn" id="fullscreen" type="button"></button><button class="small-btn" id="language" aria-label="${t.languageLabel}">${t.language}</button></div></header>
      <main class="intro-body">
        <div class="intro-kicker">A VISUAL NOVEL <span>✦</span> 01 / 01</div>
        <h1>${esc(t.title)}<small>${esc(t.subtitle)}</small></h1>
        <p class="intro-tagline">${esc(t.tagline)}</p>
        <p class="intro-note">${esc(t.introNote)}</p>
        <div class="intro-actions">
          ${state ? `<button class="primary-btn" id="continue">${esc(t.continue)} <span aria-hidden="true">↗</span></button><button class="secondary-btn" id="start">${esc(t.restart)}</button>` : `<button class="primary-btn" id="start">${esc(t.start)} <span aria-hidden="true">↗</span></button>`}
          <button class="secondary-btn" id="routes-intro">${esc(t.routes)}</button>
        </div>
        <p class="save-note">${esc(t.saveNote)}</p>
      </main>
      <footer class="intro-bottom"><span>© NAIWA / 2026</span><span>CHAPTER ONE · THE BEGINNING</span></footer>
    </div>`
  document.querySelector('#language')?.addEventListener('click', toggleLanguage)
  document.querySelector('#fullscreen')?.addEventListener('click', toggleFullscreen)
  document.querySelector('#chapter-home')?.addEventListener('click', () => { stopPlayback(); selectedChapter = 0; render() })
  document.querySelector('#continue')?.addEventListener('click', () => { enterFullscreen(); active = true; render() })
  document.querySelector('#start')?.addEventListener('click', () => { if (!state) { enterFullscreen(); start() } else confirmRestart(() => { enterFullscreen(); start() }) })
  document.querySelector('#routes-intro')?.addEventListener('click', () => openModal('routes'))
  document.querySelector('#routes-intro-top')?.addEventListener('click', () => openModal('routes'))
  document.querySelector('#save-entry')?.addEventListener('click', manualSave)
  document.querySelector('#settings-entry')?.addEventListener('click', () => openModal('settings'))
  document.querySelector('#gallery-entry')?.addEventListener('click', () => openModal('gallery'))
  updateFullscreenButton()
}

function updateSceneImage(layer: HTMLElement, image: string, alt: string) {
  if (layer.dataset.image === image) {
    layer.querySelectorAll<HTMLImageElement>('img').forEach(img => { img.alt = alt })
    return
  }
  const generation = ++imageGeneration
  layer.querySelectorAll<HTMLImageElement>('.scene-image:not(.active)').forEach(img => img.remove())
  const outgoing = layer.querySelector<HTMLImageElement>('.scene-image.active')
  const incoming = document.createElement('img')
  incoming.className = `scene-image${outgoing ? '' : ' active'}`
  incoming.src = imageUrl(image)
  incoming.alt = alt
  layer.dataset.image = image
  layer.append(incoming)
  if (!outgoing) return
  const reveal = () => {
    if (generation !== imageGeneration || !incoming.isConnected) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (generation !== imageGeneration || !incoming.isConnected) return
      incoming.classList.add('active')
      outgoing.classList.remove('active')
      window.setTimeout(() => outgoing.remove(), 650)
    }))
  }
  if (incoming.complete) reveal()
  else {
    incoming.addEventListener('load', reveal, { once: true })
    incoming.addEventListener('error', () => { incoming.remove(); layer.dataset.image = outgoing.src.split('/').at(-1)?.replace('.webp', '') ?? '' }, { once: true })
  }
}

function positionObjectHotspots(stage: HTMLElement) {
  const config = objectScenes[stage.dataset.objectScene ?? '']
  const buttons = stage.querySelectorAll<HTMLButtonElement>('.object-hotspot')
  if (!config || !buttons.length) return
  const { width, height } = stage.getBoundingClientRect()
  const scale = Math.max(width / 1672, height / 941)
  const offsetX = (width - 1672 * scale) / 2
  const offsetY = (height - 941 * scale) * (window.matchMedia('(max-width: 800px)').matches ? .28 : .5)
  buttons.forEach((button, index) => {
    const box = config.boxes[index]
    button.style.left = `${offsetX + box.x * scale}px`
    button.style.top = `${offsetY + box.y * scale}px`
    button.style.width = `${box.width * scale}px`
    button.style.height = `${box.height * scale}px`
  })
}

function updateFullscreenButton() {
  const button = document.querySelector<HTMLButtonElement>('#fullscreen')
  if (!button) return
  const lang = state?.language ?? preferredLanguage
  button.textContent = isAppFullscreen(root) ? ui[lang].exitFullscreen : ui[lang].fullscreen
  button.setAttribute('aria-pressed', String(isAppFullscreen(root)))
}

function enterFullscreen() {
  void enterAppFullscreen(root)
}

async function toggleFullscreen() {
  await toggleAppFullscreen(root)
  updateFullscreenButton()
}

function renderExplorationMap(scene: Scene, choices: NonNullable<Scene['choices']>, lang: Language) {
  if (!state) return ''
  const t = ui[lang]
  const sites = (scene.choices ?? []).slice(0, 4).map((choice, index) => {
    const found = !!choice.unlessMemory && state!.memories.includes(choice.unlessMemory)
    const choiceIndex = choices.indexOf(choice)
    return `<button class="explore-site ${found ? 'is-found' : ''}" ${found ? 'disabled' : `data-choice="${choiceIndex}"`}><span class="explore-site-number">0${index + 1}</span><span class="explore-site-name">${esc(choice.text[lang])}</span><span class="explore-site-status">${esc(found ? t.found : `−10 ${t.spirit}`)}</span></button>`
  }).join('')
  const finalChoice = (scene.choices ?? []).at(-1)!
  const canReturn = state.memories.length === 3
  const finalIndex = choices.indexOf(finalChoice)
  return `<div class="exploration-map" aria-label="${esc(t.exploreMap)}"><div class="explore-map-heading"><span>${esc(t.exploreMap)}</span><span>${esc(t.memories)} ${state.memories.length}/3</span></div><div class="explore-sites">${sites}<span class="explore-crossroads" aria-hidden="true">✦</span></div><button class="explore-return ${canReturn ? 'is-ready' : ''}" ${canReturn ? `data-choice="${finalIndex}"` : 'disabled'}><span>${esc(finalChoice.text[lang])}</span><span>${esc(canReturn ? `−10 ${t.spirit}` : t.needMemories)}</span></button></div>`
}

function renderGame() {
  if (!state) return
  let game = root.querySelector<HTMLElement>(':scope > .game')
  if (!game) {
    root.innerHTML = `
      <div class="game">
        <header class="game-top">
          <button class="wordmark wordmark-btn" id="title">NAIWA <span>·</span> ORIGIN</button>
          <div class="game-tools">
            <button class="small-btn" id="log"></button>
            <button class="small-btn" id="routes"></button>
            <button class="small-btn" id="auto" type="button"></button>
            <button class="small-btn" id="skip" type="button"></button>
            <button class="small-btn" id="save-entry" type="button"></button>
            <button class="small-btn" id="language"></button>
            <button class="small-btn" id="fullscreen"></button>
            <button class="small-btn" id="menu"></button>
          </div>
        </header>
        <main class="game-layout">
          <div class="chapter-line"><span class="chapter-number">CHAPTER 01</span><span class="chapter-divider"></span><span id="chapter-name"></span></div>
          <section class="stage" id="stage"><div class="image-layer" id="image-layer"></div><div class="scene-scrim"></div><div class="hud" id="hud"></div><button class="ambient-control" id="ambient-toggle" type="button" hidden></button><div class="dialogue-zone" id="dialogue-zone"></div></section>
          <div class="stage-foot" id="stage-foot"></div>
        </main>
      </div>`
    game = root.querySelector<HTMLElement>(':scope > .game')!
    game.querySelector('#title')?.addEventListener('click', () => { stopPlayback(); active = false; render() })
    game.querySelector('#language')?.addEventListener('click', toggleLanguage)
    game.querySelector('#log')?.addEventListener('click', () => openModal('log'))
    game.querySelector('#routes')?.addEventListener('click', () => openModal('routes'))
    game.querySelector('#menu')?.addEventListener('click', () => openModal('menu'))
    game.querySelector('#save-entry')?.addEventListener('click', manualSave)
    game.querySelector('#auto')?.addEventListener('click', () => { playbackMode = playbackMode === 'auto' ? 'off' : 'auto'; clearPlaybackTimer(); renderGame() })
    game.querySelector('#skip')?.addEventListener('click', () => { playbackMode = playbackMode === 'skip' ? 'off' : 'skip'; clearPlaybackTimer(); renderGame() })
    game.querySelector('#fullscreen')?.addEventListener('click', toggleFullscreen)
    game.querySelector('#stage')?.addEventListener('click', event => {
      const target = event.target as HTMLElement
      if (target.closest('#ambient-toggle')) {
        ambientEnabled = !ambientEnabled || ambientError
        stopAmbientLaugh()
        renderGame()
        return
      }
      if (target.closest('#sound-retry')) { if (soundPlayback) playSound(soundPlayback); renderGame(); return }
      if (target.closest('#sound-skip')) { if (soundPlayback) { soundPlayback.audio.pause(); soundPlayback.status = 'finished' }; renderGame(); return }
      if (target.closest('.sound-status')) return
      const choice = target.closest<HTMLButtonElement>('[data-choice]')
      if (choice) { select(Number(choice.dataset.choice)); return }
      if (target.closest('#replay')) {
        const t = ui[state?.language ?? preferredLanguage]
        confirmRestart(start, t.confirmRestart)
        return
      }
      if (target.closest('.choices, .ending-actions')) return
      advance()
    })
  }
  const scene = current()
  const lang = state.language
  const t = ui[lang]
  const lines = sceneLines(scene)
  state.lineIndex = Math.min(state.lineIndex, lines.length - 1)
  const line = lines[state.lineIndex]
  syncSound()
  syncAmbientLaugh()
  const soundStatus = soundPlayback?.status
  const hasLineSound = !!line.sound || !line.speaker
  const soundLabel = !line.speaker ? line.sound === 'naiwa-laugh' && soundPlayback?.clipIndex === 0 ? t.laughPlaying : t.narratorPlaying : line.sound?.startsWith('naiwa-') ? t.naiwaSpeaking : t.heroPlaying
  const finalLine = state.lineIndex === lines.length - 1
  const choices = finalLine ? availableChoices(scene) : []
  const objectChoiceScene = finalLine && !!objectScenes[state.sceneId]
  const ended = finalLine && !!scene.ending
  const inDream = scene.mood === 'dream' || (scene.mood === 'ending' && state.sceneId !== 'n01' && state.sceneId !== 'e02')
  game.className = `game ${scene.mood} ${state.anxiety >= 20 && inDream ? 'uneasy' : ''} ${state.sceneId === 'be02' || state.sceneId === 'exhausted' ? 'fractured' : ''}`
  game.querySelector<HTMLElement>('#chapter-name')!.textContent = scene.chapter[lang]
  const stage = game.querySelector<HTMLElement>('#stage')!
  stage.setAttribute('aria-label', scene.chapter[lang])
  stage.dataset.objectScene = objectChoiceScene ? state.sceneId : ''
  const ambientButton = game.querySelector<HTMLButtonElement>('#ambient-toggle')!
  ambientButton.hidden = state.sceneId !== 'e01' && state.sceneId !== 'e02'
  ambientButton.textContent = ambientEnabled ? ambientError ? t.ambientRetry : t.ambientOff : t.ambientOn
  ambientButton.setAttribute('aria-label', ambientButton.textContent)
  updateSceneImage(game.querySelector<HTMLElement>('#image-layer')!, scene.image, scene.chapter[lang])
  game.querySelector<HTMLElement>('#title')!.setAttribute('aria-label', t.returnTitle)
  for (const id of ['log', 'routes', 'menu', 'auto', 'skip', 'save'] as const) {
    const element = game.querySelector<HTMLElement>(`#${id === 'save' ? 'save-entry' : id}`)!
    element.textContent = t[id]
  }
  for (const id of ['auto', 'skip'] as const) game.querySelector<HTMLElement>(`#${id}`)!.setAttribute('aria-pressed', String(playbackMode === id))
  const languageButton = game.querySelector<HTMLElement>('#language')!
  languageButton.textContent = t.language
  languageButton.setAttribute('aria-label', t.languageLabel)
  updateFullscreenButton()
  const hud = game.querySelector<HTMLElement>('#hud')!
  hud.hidden = !inDream
  hud.innerHTML = inDream ? `<span>${esc(t.spirit)} <strong>${state.spirit}</strong><span class="hud-track"><i style="width:${state.spirit}%"></i></span></span><span>${esc(t.memories)} <strong>${state.memories.length}/3</strong></span><span class="danger-hud ${state.danger >= 3 ? 'is-high' : ''}">${esc(t.danger)} <strong>${Math.min(state.danger, 4)}/4</strong></span>` : ''
  game.querySelector<HTMLElement>('#dialogue-zone')!.innerHTML = `
    <div class="dialogue-meta"><span class="scene-counter">${String(state.lineIndex + 1).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}</span><span class="scene-rule"></span><span>NAIWA · ORIGIN</span></div>
    <div class="dialogue-box" aria-live="polite">
      <div class="speaker">${line.speaker ? esc(line.speaker[lang]) : lang === 'zh' ? '旁白' : 'Narration'}</div>
      <p>${esc(line.text[lang])}</p>
      ${hasLineSound && soundStatus === 'playing' ? `<div class="sound-status" role="status"><span class="sound-pulse" aria-hidden="true">♪</span><span>${esc(soundLabel)}</span><button id="sound-skip" type="button">${esc(t.soundSkip)}</button></div>` : hasLineSound && soundStatus === 'error' ? `<div class="sound-status" role="status"><button id="sound-retry" type="button">▶ ${esc(t.soundRetry)}</button></div>` : ''}
      ${objectChoiceScene ? `<div class="object-controls"><span>${esc(t.pickObject)}</span><button class="object-return" data-choice="2">← ${esc(choices[2].text[lang])}</button></div>` : ''}
      ${!finalLine || scene.next ? `<span class="advance-hint">${esc(t.next)} <span aria-hidden="true">⌄</span></span>` : ''}
    </div>
    ${state.sceneId === 'm06' && finalLine ? renderExplorationMap(scene, choices, lang) : objectChoiceScene ? '' : choices.length ? `<div class="choices" aria-label="${esc(t.select)}">${choices.map((choice, i) => `<button class="choice" data-choice="${i}"><span class="choice-number">${String(i + 1).padStart(2, '0')}</span><span>${esc(choice.text[lang])}</span><span aria-hidden="true" class="choice-arrow">↗</span></button>`).join('')}</div>` : ''}
    ${ended ? `<div class="ending-actions"><span>${esc(scene.ending === 'true' ? t.finish : t.ending)}</span><button class="primary-btn" id="replay">${esc(t.replay)} <span aria-hidden="true">↗</span></button></div>` : ''}`
  stage.querySelector('#object-hotspots')?.remove()
  if (objectChoiceScene) {
    const labels = objectScenes[state.sceneId].labels[lang]
    stage.insertAdjacentHTML('beforeend', `<div class="object-hotspots" id="object-hotspots" aria-label="${esc(t.select)}">${choices.slice(0, 2).map((choice, index) => `<button class="object-hotspot" data-choice="${index}" aria-label="${esc(choice.text[lang])}"><span class="object-hotspot-label">${esc(labels[index])}</span></button>`).join('')}</div>`)
    positionObjectHotspots(stage)
  }
  game.querySelector<HTMLElement>('#stage-foot')!.innerHTML = `<span>${esc(t.controls)}</span>${inDream ? `<span>${state.memories.map(id => esc(memoryNames[id][lang])).join(' · ') || '◌ ◌ ◌'}</span>` : `<span>01 / NAIWA</span>`}`
  clearPlaybackTimer()
  if (playbackMode !== 'off' && !modal && !ended && (!finalLine || !!scene.next)) {
    const expectedScene = state.sceneId
    const expectedLine = state.lineIndex
    playbackTimer = window.setTimeout(() => {
      playbackTimer = null
      if (active && state?.sceneId === expectedScene && state.lineIndex === expectedLine && !modal) advance()
    }, playbackMode === 'skip' ? 220 : Math.max(2600, Math.min(7000, line.text[lang].length * 100)))
  }
}

function mapPath(fromId: string, toId: string) {
  const from = mapNodes[fromId]
  const to = mapNodes[toId]
  if (!from || !to) return ''
  if (to.y <= from.y) {
    const side = from.x < 550 ? -1 : 1
    const detour = side < 0 ? 52 : 1048
    return `M ${from.x + side * 96} ${from.y} C ${detour} ${from.y + 18}, ${detour} ${to.y - 18}, ${to.x + side * 96} ${to.y}`
  }
  const startY = from.y + 35
  const endY = to.y - 35
  const bend = Math.max(28, (endY - startY) * .48)
  return `M ${from.x} ${startY} C ${from.x} ${startY + bend}, ${to.x} ${endY - bend}, ${to.x} ${endY}`
}

function renderMindMap(lang: Language) {
  const t = ui[lang]
  const links: { from: string; to: string; risk?: boolean }[] = []
  for (const [id, scene] of Object.entries(story)) {
    if (scene.next && scene.next !== 'm06') links.push({ from: id, to: scene.next })
    for (const choice of scene.choices ?? []) if (choice.next !== 'm06') links.push({ from: id, to: choice.next })
  }
  links.push({ from: 'm06', to: 'doll_hunt', risk: true })
  links.push({ from: 'm06', to: 'exhausted', risk: true })
  const paths = links.map(({ from, to, risk }) => {
    const d = mapPath(from, to)
    if (!d) return ''
    const unlocked = !!progress.checkpoints[from] && !!progress.checkpoints[to]
    const returning = mapNodes[to].y <= mapNodes[from].y
    return `<path d="${d}" class="map-link ${unlocked ? 'is-open' : 'is-locked'} ${returning ? 'is-return' : ''} ${risk ? 'is-risk' : ''}"/>`
  }).join('')
  const chapterTags = [
    { y: 75, zh: '序章 / 相遇', en: 'PROLOGUE / MEETING' },
    { y: 760, zh: '第一幕 / 恋人', en: 'ACT I / TOGETHER' },
    { y: 1840, zh: '第二幕 / 意外', en: 'ACT II / THE ACCIDENT' },
    { y: 2290, zh: '第一层 / 迷雾', en: 'LAYER ONE / THE MIST' },
    { y: 3390, zh: '终幕 / 回应', en: 'EPILOGUE / RESPONSE' },
  ].map(tag => `<span class="map-chapter" style="top:${tag.y}px">${esc(tag[lang])}</span>`).join('')
  const nodes = Object.entries(mapNodes).map(([id, point]) => {
    const unlocked = !!progress.checkpoints[id]
    const ending = !!story[id].ending
    const currentNode = state?.sceneId === id
    return `<button class="mind-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${ending ? 'is-ending' : ''} ${currentNode ? 'is-current' : ''}" style="left:${point.x}px;top:${point.y}px" data-route="${id}" ${unlocked ? '' : 'disabled'} ${currentNode ? 'aria-current="step"' : ''} aria-label="${esc(unlocked ? `${story[id].chapter[lang]} · ${t.unlocked}` : `${id.toUpperCase()} · ${t.locked}`)}"><span class="mind-code">${esc(id.toUpperCase())}</span><span class="mind-title">${esc(unlocked ? story[id].chapter[lang] : '???')}</span>${ending ? '<span class="mind-ending-mark" aria-hidden="true">✦</span>' : ''}${story[id].next === 'm06' ? '<span class="mind-return-mark" aria-hidden="true">↻</span>' : ''}</button>`
  }).join('')
  return `<div class="map-viewport" id="map-viewport" role="region" tabindex="0" aria-label="${esc(t.mapLabel)}"><div class="map-scaled" id="map-scaled"><div class="mindmap" id="mindmap"><div class="map-grid"></div><svg class="map-lines" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" aria-hidden="true">${paths}</svg>${chapterTags}${nodes}</div></div></div>`
}

function setupMindMap(dialog: HTMLDialogElement) {
  const viewport = dialog.querySelector<HTMLElement>('#map-viewport')
  const scaled = dialog.querySelector<HTMLElement>('#map-scaled')
  const map = dialog.querySelector<HTMLElement>('#mindmap')
  if (!viewport || !scaled || !map) return
  let zoom = window.innerWidth < 600 ? 1 : .9
  const applyZoom = (next: number, initial = false) => {
    const worldX = initial ? 550 : (viewport.scrollLeft + viewport.clientWidth / 2) / zoom
    const worldY = initial ? (mapNodes[state?.sceneId ?? 'p01']?.y ?? 80) : (viewport.scrollTop + viewport.clientHeight / 2) / zoom
    zoom = Math.max(.55, Math.min(1.25, next))
    scaled.style.width = `${MAP_WIDTH * zoom}px`
    scaled.style.height = `${MAP_HEIGHT * zoom}px`
    map.style.transform = `scale(${zoom})`
    dialog.querySelector<HTMLElement>('#map-zoom')!.textContent = `${Math.round(zoom * 100)}%`
    viewport.scrollLeft = worldX * zoom - viewport.clientWidth / 2
    viewport.scrollTop = worldY * zoom - viewport.clientHeight / 2
  }
  requestAnimationFrame(() => applyZoom(zoom, true))
  dialog.querySelector('#zoom-in')?.addEventListener('click', () => applyZoom(zoom + .15))
  dialog.querySelector('#zoom-out')?.addEventListener('click', () => applyZoom(zoom - .15))
  let drag: { x: number; y: number; left: number; top: number } | null = null
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || (event.target as HTMLElement).closest('button')) return
    drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }
    viewport.classList.add('is-dragging')
    viewport.setPointerCapture(event.pointerId)
  })
  viewport.addEventListener('pointermove', event => {
    if (!drag) return
    viewport.scrollLeft = drag.left - (event.clientX - drag.x)
    viewport.scrollTop = drag.top - (event.clientY - drag.y)
  })
  const finishDrag = () => { drag = null; viewport.classList.remove('is-dragging') }
  viewport.addEventListener('pointerup', finishDrag)
  viewport.addEventListener('pointercancel', finishDrag)
}

function renderModal() {
  if (!modal) return
  document.querySelector('#app-dialog')?.remove()
  const lang = state?.language ?? preferredLanguage
  const t = ui[lang]
  const dialog = document.createElement('dialog')
  dialog.id = 'app-dialog'
  dialog.className = `app-dialog${modal === 'routes' ? ' route-dialog' : ''}`
  dialog.dataset.kind = modal
  if (modal === 'log') {
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.log)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div><div class="log-list">${state?.history.length ? state.history.map(entry => {
      const scene = story[entry.sceneId]
      const line = sceneLinesForLog(scene, state!, entry.index)
      return line ? `<article class="log-entry"><small>${esc(scene.chapter[lang])} · ${esc(line.speaker?.[lang] ?? (lang === 'zh' ? '旁白' : 'Narration'))}</small><p>${esc(line.text[lang])}</p></article>` : ''
    }).join('') : `<p>${esc(t.emptyLog)}</p>`}</div>`
  } else if (modal === 'routes') {
    const endingIds = ['n01', 'be01', 'be02', 'exhausted', 'e02']
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.routes)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div>
      <div class="routes-content">
        <div class="map-intro"><p class="routes-hint">${esc(t.routesHint)}</p><div class="map-zoom-tools"><button class="small-btn" id="zoom-out" aria-label="${esc(t.zoomOut)}">−</button><span id="map-zoom">90%</span><button class="small-btn" id="zoom-in" aria-label="${esc(t.zoomIn)}">+</button></div></div>
        ${renderMindMap(lang)}
        <section class="ending-gallery"><h3>${esc(t.endingGallery)} <small>${progress.endings.length}/5</small></h3><div class="ending-grid">${endingIds.map(id => `<div class="ending-badge ${progress.endings.includes(id) ? 'is-unlocked' : 'is-locked'}"><span>${progress.endings.includes(id) ? '✦' : '◇'}</span><span>${esc(progress.endings.includes(id) ? story[id].chapter[lang] : '???')}</span></div>`).join('')}</div></section>
      </div>`
  } else if (modal === 'gallery') {
    const endingIds = ['n01', 'be01', 'be02', 'exhausted', 'e02']
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.gallery)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div><div class="gallery-content"><p>${esc(t.endingGallery)} · ${progress.endings.length}/5</p><div class="ending-grid">${endingIds.map(id => `<div class="ending-badge ${progress.endings.includes(id) ? 'is-unlocked' : 'is-locked'}"><span>${progress.endings.includes(id) ? '✦' : '◇'}</span><span>${esc(progress.endings.includes(id) ? story[id].chapter[lang] : '???')}</span></div>`).join('')}</div></div>`
  } else if (modal === 'settings') {
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.settings)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div><div class="menu-actions"><button id="settings-language" class="secondary-btn" type="button">${esc(t.languageLabel)}</button><button id="settings-audio" class="secondary-btn" type="button" aria-pressed="${audioEnabled}">${esc(t.audio)} · ${esc(audioEnabled ? t.on : t.off)}</button><button id="settings-fullscreen" class="secondary-btn" type="button">${esc(isAppFullscreen(root) ? t.exitFullscreen : t.fullscreen)}</button></div>`
  } else {
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.menu)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div><div class="menu-actions"><button id="menu-continue" class="primary-btn">${esc(t.continue)} ↗</button><button id="menu-save" class="secondary-btn">${esc(t.save)}</button><button id="menu-settings" class="secondary-btn">${esc(t.settings)}</button><button id="menu-gallery" class="secondary-btn">${esc(t.gallery)}</button><button id="menu-routes" class="secondary-btn">${esc(t.routes)}</button><button id="menu-restart" class="secondary-btn">${esc(t.restart)}</button><button id="menu-title" class="secondary-btn">${esc(t.returnTitle)}</button></div><p class="modal-note">${esc(t.saveNote)}</p>`
  }
  root.append(dialog)
  dialog.addEventListener('close', () => {
    if (modal === dialog.dataset.kind) modal = null
    dialog.remove()
    if (active && playbackMode !== 'off' && !modal && root.querySelector(':scope > .game')) renderGame()
  })
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
  dialog.querySelector('#close-dialog')?.addEventListener('click', () => dialog.close())
  dialog.querySelector('#menu-continue')?.addEventListener('click', () => dialog.close())
  dialog.querySelector('#menu-save')?.addEventListener('click', () => { manualSave(); const button = dialog.querySelector<HTMLButtonElement>('#menu-save'); if (button) button.textContent = t.saved })
  dialog.querySelector('#menu-settings')?.addEventListener('click', () => openModal('settings'))
  dialog.querySelector('#menu-gallery')?.addEventListener('click', () => openModal('gallery'))
  dialog.querySelector('#menu-routes')?.addEventListener('click', () => openModal('routes'))
  dialog.querySelector('#menu-title')?.addEventListener('click', () => { modal = null; dialog.close(); stopPlayback(); active = false; render() })
  dialog.querySelector('#menu-restart')?.addEventListener('click', () => confirmRestart(start, t.confirmRestart))
  dialog.querySelector('#settings-language')?.addEventListener('click', () => { modal = null; dialog.close(); toggleLanguage(); openModal('settings') })
  dialog.querySelector('#settings-audio')?.addEventListener('click', () => { audioEnabled = !audioEnabled; localStorage.setItem('naiwa-audio-enabled-v1', String(audioEnabled)); if (!audioEnabled) { stopSound(); stopAmbientLaugh() }; openModal('settings') })
  dialog.querySelector('#settings-fullscreen')?.addEventListener('click', async () => { await toggleFullscreen(); openModal('settings') })
  dialog.querySelectorAll<HTMLButtonElement>('[data-route]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.route
    if (id && progress.checkpoints[id]) confirmRestart(() => restartFrom(id), t.routeConfirm)
  }))
  dialog.showModal()
  if (modal === 'routes') setupMindMap(dialog)
}

function sceneLinesForLog(scene: Scene, saved: GameState, index: number) {
  const lines = scene.lines.filter(line => !line.when || (line.when === 'uneasy' ? saved.anxiety >= 20 : saved.anxiety < 20))
  return lines[index]
}

function render() {
  document.documentElement.lang = preferredLanguage === 'zh' ? 'zh-CN' : 'en'
  document.title = preferredLanguage === 'zh' ? selectedChapter === 2 ? '奶之救赎：冰镜疑凶 | naiwa' : '奶之救赎 | naiwa' : selectedChapter === 2 ? 'naiwa: The Culprit in the Ice' : 'naiwa'
  if (selectedChapter !== 2 && chapterTwoController) { chapterTwoController.dispose(); chapterTwoController = null }
  if (selectedChapter === 2) {
    if (!chapterTwoController) chapterTwoController = mountChapterTwo(root, preferredLanguage, language => { setPreferredLanguage(language); chapterTwoController?.dispose(); chapterTwoController = null; selectedChapter = 0; render() }, setPreferredLanguage)
    else chapterTwoController.setLanguage(preferredLanguage)
  } else if (selectedChapter === 0) renderChapterSelect()
  else if (!active) renderIntro()
  else renderGame()
  if (modal) renderModal()
}

document.addEventListener('keydown', event => {
  if (!active || modal || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key !== ' ' && event.key !== 'Enter') return
  if ((event.target as HTMLElement).closest('button, dialog')) return
  event.preventDefault()
  advance()
})

migrateProgressFromSave()
window.addEventListener('languagechange', () => {
  if (languageOverride()) return
  preferredLanguage = systemLanguage()
  if (state) { state.language = preferredLanguage; save() }
  render()
})
document.addEventListener('fullscreenchange', updateFullscreenButton)
window.addEventListener('appimmersivechange', updateFullscreenButton)
window.addEventListener('resize', () => {
  const stage = root.querySelector<HTMLElement>('#stage')
  if (stage) positionObjectHotspots(stage)
})
render()
