import './style.css'
import { firstScene, memoryNames, story, type Language, type MemoryId, type Scene } from './story'

type LogEntry = { sceneId: string; index: number }
type GameState = {
  version: 1
  sceneId: string
  lineIndex: number
  language: Language
  affection: number
  anxiety: number
  spirit: number
  memories: MemoryId[]
  history: LogEntry[]
}

const STORAGE_KEY = 'naiwa-origin-save-v1'
const root = document.querySelector<HTMLDivElement>('#app')!
let state: GameState | null = loadSave()
let active = false
let modal: 'log' | 'menu' | null = null
let preferredLanguage: Language = state?.language ?? 'zh'

const ui = {
  zh: {
    title: '奶之救赎', subtitle: '缘起', tagline: '那场雨之后，我走进了你的世界。',
    start: '开始故事', continue: '继续故事', restart: '重新开始', log: '回顾', menu: '菜单',
    language: 'EN', languageLabel: 'Switch to English', close: '关闭', next: '点击画面或按空格继续',
    select: '选择你的回答', spirit: '精神力', memories: '回忆', ending: '故事到此告一段落',
    finish: '《奶之救赎：缘起》完', replay: '再玩一次', returnTitle: '返回标题',
    confirmRestart: '确定重新开始吗？当前进度会被覆盖。', emptyLog: '故事开始后，对话会显示在这里。',
    introNote: '一段关于相遇、信任与内心世界的互动故事', saveNote: '进度自动保存在此浏览器',
    controls: '空格 / Enter 推进 · 点击选项作出选择 · Esc 关闭菜单',
    allFound: '三件回忆物已集齐',
  },
  en: {
    title: 'naiwa', subtitle: 'Origin', tagline: 'After that rain, I stepped into your world.',
    start: 'Begin story', continue: 'Continue', restart: 'Start over', log: 'History', menu: 'Menu',
    language: '中文', languageLabel: '切换到中文', close: 'Close', next: 'Click the scene or press Space to continue',
    select: 'Choose your response', spirit: 'Spirit', memories: 'Memories', ending: 'This path ends here',
    finish: 'The End · naiwa: Origin', replay: 'Play again', returnTitle: 'Return to title',
    confirmRestart: 'Start over? Your current progress will be replaced.', emptyLog: 'Dialogue will appear here once the story begins.',
    introNote: 'An interactive story of meeting, trust, and the world within', saveNote: 'Progress saves automatically in this browser',
    controls: 'Space / Enter to advance · Choose with a click · Esc to close the menu',
    allFound: 'All three memories found',
  },
} as const

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return null
    const data = saved as Partial<GameState>
    if (data.version !== 1 || !data.sceneId || !story[data.sceneId] || !Number.isInteger(data.lineIndex)) return null
    if (data.language !== 'zh' && data.language !== 'en') return null
    return {
      version: 1, sceneId: data.sceneId, lineIndex: Math.max(0, data.lineIndex ?? 0), language: data.language,
      affection: Number.isFinite(data.affection) ? data.affection! : 0,
      anxiety: Number.isFinite(data.anxiety) ? data.anxiety! : 0,
      spirit: Number.isFinite(data.spirit) ? data.spirit! : 100,
      memories: Array.isArray(data.memories) ? data.memories.filter((m): m is MemoryId => m === 'toy' || m === 'gift' || m === 'photo') : [],
      history: Array.isArray(data.history) ? data.history.filter((entry): entry is LogEntry => !!entry && typeof entry.sceneId === 'string' && !!story[entry.sceneId] && Number.isInteger(entry.index)).slice(-120) : [],
    }
  } catch {
    return null
  }
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

function enter(sceneId: string) {
  if (!state || !story[sceneId]) return
  state.sceneId = sceneId
  state.lineIndex = 0
  recordLine()
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
  state = { version: 1, sceneId: firstScene, lineIndex: 0, language: preferredLanguage, affection: 0, anxiety: 0, spirit: 100, memories: [], history: [] }
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
  state.affection = Math.max(0, state.affection + (choice.affection ?? 0))
  state.anxiety = Math.max(0, state.anxiety + (choice.anxiety ?? 0))
  state.spirit = Math.max(0, state.spirit + (choice.spirit ?? 0))
  if (choice.memory && !state.memories.includes(choice.memory)) state.memories.push(choice.memory)
  enter(state.spirit <= 0 ? 'exhausted' : choice.next)
}

function availableChoices(scene: Scene) {
  return (scene.choices ?? []).filter(choice =>
    (!choice.unlessMemory || !state?.memories.includes(choice.unlessMemory)) &&
    (!choice.requiresAllMemories || state?.memories.length === 3),
  )
}

function toggleLanguage() {
  preferredLanguage = preferredLanguage === 'zh' ? 'en' : 'zh'
  if (state) {
    state.language = preferredLanguage
    save()
  }
  document.documentElement.lang = preferredLanguage === 'zh' ? 'zh-CN' : 'en'
  render()
}

function imageUrl(id: string) { return `/images/${id}.webp` }

function renderIntro() {
  const t = ui[preferredLanguage]
  root.innerHTML = `
    <div class="intro" style="--intro-image:url('${imageUrl('P02')}')">
      <header class="intro-top"><span class="wordmark">NAIWA <span>·</span> ORIGIN</span><button class="small-btn" id="language" aria-label="${t.languageLabel}">${t.language}</button></header>
      <main class="intro-body">
        <div class="intro-kicker">A VISUAL NOVEL <span>✦</span> 01 / 01</div>
        <h1>${esc(t.title)}<small>${esc(t.subtitle)}</small></h1>
        <p class="intro-tagline">${esc(t.tagline)}</p>
        <p class="intro-note">${esc(t.introNote)}</p>
        <div class="intro-actions">
          ${state ? `<button class="primary-btn" id="continue">${esc(t.continue)} <span aria-hidden="true">↗</span></button><button class="secondary-btn" id="start">${esc(t.restart)}</button>` : `<button class="primary-btn" id="start">${esc(t.start)} <span aria-hidden="true">↗</span></button>`}
        </div>
        <p class="save-note">${esc(t.saveNote)}</p>
      </main>
      <footer class="intro-bottom"><span>© NAIWA / 2026</span><span>CHAPTER ONE · THE BEGINNING</span></footer>
    </div>`
  document.querySelector('#language')?.addEventListener('click', toggleLanguage)
  document.querySelector('#continue')?.addEventListener('click', () => { active = true; render() })
  document.querySelector('#start')?.addEventListener('click', () => { if (!state || window.confirm(t.confirmRestart)) start() })
}

function renderGame() {
  if (!state) return
  const scene = current()
  const lang = state.language
  const t = ui[lang]
  const lines = sceneLines(scene)
  state.lineIndex = Math.min(state.lineIndex, lines.length - 1)
  const line = lines[state.lineIndex]
  const finalLine = state.lineIndex === lines.length - 1
  const choices = finalLine ? availableChoices(scene) : []
  const ended = finalLine && !!scene.ending
  const inDream = scene.mood === 'dream' || (scene.mood === 'ending' && state.sceneId !== 'n01' && state.sceneId !== 'e02')
  root.innerHTML = `
    <div class="game ${scene.mood} ${state.anxiety >= 20 && inDream ? 'uneasy' : ''} ${state.sceneId === 'be02' || state.sceneId === 'exhausted' ? 'fractured' : ''}">
      <header class="game-top">
        <button class="wordmark wordmark-btn" id="title" aria-label="${esc(t.returnTitle)}">NAIWA <span>·</span> ORIGIN</button>
        <div class="game-tools"><button class="small-btn" id="log">${esc(t.log)}</button><button class="small-btn" id="language" aria-label="${t.languageLabel}">${t.language}</button><button class="small-btn" id="menu">${esc(t.menu)} <span aria-hidden="true">☰</span></button></div>
      </header>
      <main class="game-layout">
        <div class="chapter-line"><span class="chapter-number">CHAPTER 01</span><span class="chapter-divider"></span><span>${esc(scene.chapter[lang])}</span></div>
        <section class="stage" id="stage" aria-label="${esc(scene.chapter[lang])}">
          <img class="scene-image" src="${imageUrl(scene.image)}" alt="${esc(scene.chapter[lang])}" />
          <div class="scene-scrim"></div>
          ${inDream ? `<div class="hud"><span>${esc(t.spirit)} <strong>${state.spirit}</strong><span class="hud-track"><i style="width:${state.spirit}%"></i></span></span><span>${esc(t.memories)} <strong>${state.memories.length}/3</strong></span></div>` : ''}
          <div class="dialogue-zone">
            <div class="dialogue-meta"><span class="scene-counter">${String(state.lineIndex + 1).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}</span><span class="scene-rule"></span><span>NAIWA · ORIGIN</span></div>
            <div class="dialogue-box" aria-live="polite">
              <div class="speaker">${line.speaker ? esc(line.speaker[lang]) : lang === 'zh' ? '旁白' : 'Narration'}</div>
              <p>${esc(line.text[lang])}</p>
              ${!finalLine || scene.next ? `<span class="advance-hint">${esc(t.next)} <span aria-hidden="true">⌄</span></span>` : ''}
            </div>
            ${choices.length ? `<div class="choices" aria-label="${esc(t.select)}">${choices.map((choice, i) => `<button class="choice" data-choice="${i}"><span class="choice-number">${String(i + 1).padStart(2, '0')}</span><span>${esc(choice.text[lang])}</span><span aria-hidden="true" class="choice-arrow">↗</span></button>`).join('')}</div>` : ''}
            ${ended ? `<div class="ending-actions"><span>${esc(scene.ending === 'true' ? t.finish : t.ending)}</span><button class="primary-btn" id="replay">${esc(t.replay)} <span aria-hidden="true">↗</span></button></div>` : ''}
          </div>
        </section>
        <div class="stage-foot"><span>${esc(t.controls)}</span>${inDream ? `<span>${state.memories.map(id => esc(memoryNames[id][lang])).join(' · ') || '◌ ◌ ◌'}</span>` : `<span>01 / NAIWA</span>`}</div>
      </main>
    </div>`
  document.querySelector('#title')?.addEventListener('click', () => { active = false; render() })
  document.querySelector('#language')?.addEventListener('click', toggleLanguage)
  document.querySelector('#log')?.addEventListener('click', () => { modal = 'log'; renderModal() })
  document.querySelector('#menu')?.addEventListener('click', () => { modal = 'menu'; renderModal() })
  document.querySelector('#replay')?.addEventListener('click', () => { if (window.confirm(t.confirmRestart)) start() })
  document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); select(Number(button.dataset.choice)) }))
  document.querySelector('#stage')?.addEventListener('click', event => {
    if ((event.target as HTMLElement).closest('button, .choices, .ending-actions')) return
    advance()
  })
}

function renderModal() {
  if (!modal) return
  document.querySelector('#app-dialog')?.remove()
  const lang = state?.language ?? preferredLanguage
  const t = ui[lang]
  const dialog = document.createElement('dialog')
  dialog.id = 'app-dialog'
  dialog.className = 'app-dialog'
  if (modal === 'log') {
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.log)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div><div class="log-list">${state?.history.length ? state.history.map(entry => {
      const scene = story[entry.sceneId]
      const line = sceneLinesForLog(scene, state!, entry.index)
      return line ? `<article class="log-entry"><small>${esc(scene.chapter[lang])} · ${esc(line.speaker?.[lang] ?? (lang === 'zh' ? '旁白' : 'Narration'))}</small><p>${esc(line.text[lang])}</p></article>` : ''
    }).join('') : `<p>${esc(t.emptyLog)}</p>`}</div>`
  } else {
    dialog.innerHTML = `<div class="dialog-head"><h2>${esc(t.menu)}</h2><button id="close-dialog" class="small-btn">${esc(t.close)} ×</button></div><div class="menu-actions"><button id="menu-continue" class="primary-btn">${esc(t.continue)} ↗</button><button id="menu-restart" class="secondary-btn">${esc(t.restart)}</button><button id="menu-title" class="secondary-btn">${esc(t.returnTitle)}</button></div><p class="modal-note">${esc(t.saveNote)}</p>`
  }
  root.append(dialog)
  dialog.addEventListener('close', () => { modal = null; dialog.remove() })
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
  dialog.querySelector('#close-dialog')?.addEventListener('click', () => dialog.close())
  dialog.querySelector('#menu-continue')?.addEventListener('click', () => dialog.close())
  dialog.querySelector('#menu-title')?.addEventListener('click', () => { dialog.close(); active = false; render() })
  dialog.querySelector('#menu-restart')?.addEventListener('click', () => { if (window.confirm(t.confirmRestart)) { dialog.close(); start() } })
  dialog.showModal()
}

function sceneLinesForLog(scene: Scene, saved: GameState, index: number) {
  const lines = scene.lines.filter(line => !line.when || (line.when === 'uneasy' ? saved.anxiety >= 20 : saved.anxiety < 20))
  return lines[index]
}

function render() {
  document.documentElement.lang = preferredLanguage === 'zh' ? 'zh-CN' : 'en'
  document.title = preferredLanguage === 'zh' ? '奶之救赎：缘起 | naiwa' : 'naiwa: Origin'
  if (!active) renderIntro()
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

render()
