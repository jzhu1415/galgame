import './romance-dlc.css'
import { romanceEpisodes, romanceStory, packingItems, trailOrder, romanceFinale, romanceTrailResult } from './romance-dlc-story'
import type { Language } from './story'
import { romanceVisual, nextRomanceImage, romanceEpisodeCover, romanceEnvironment } from './romance-dlc-visuals'
import { nextCharacterVoice } from './character-voice'
import { isAppFullscreen, toggleAppFullscreen } from './app-fullscreen'
import { confirmInApp } from './ui-confirm'
const KEY = 'naiwa-romance-coastal-v1'
type Save = { version: 1; node: string | null; line: number; completed: string[]; choices: Record<string, string>; history: { node: string; line: number }[]; gear: string[]; trail: string[]; treasure: boolean; endings: string[] }
const blank = (): Save => ({ version: 1, node: null, line: 0, completed: [], choices: {}, history: [], gear: [], trail: [], treasure: false, endings: [] })
function load(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || raw.version !== 1) return blank()
    const node = typeof raw.node === 'string' && Object.hasOwn(romanceStory, raw.node) ? raw.node : null
    const completed = romanceEpisodes.filter(ep => Array.isArray(raw.completed) && raw.completed.includes(ep.id)).map(ep => ep.id)
    const choices = Object.fromEntries(romanceEpisodes.flatMap(ep => {
      const choice = raw.choices?.[ep.id]
      return Object.values(romanceStory).some(node => node.episode === ep.id && node.choices?.some(c => c.next === choice)) ? [[ep.id, choice]] : []
    }))
    const history = Array.isArray(raw.history) ? raw.history.filter((h: Save['history'][number]) => h && Object.hasOwn(romanceStory, h.node) && Number.isInteger(h.line) && h.line >= 0 && h.line < romanceStory[h.node].lines.length).slice(-180) : []
    const gear = packingItems.filter(item => Array.isArray(raw.gear) && raw.gear.includes(item.id)).map(item => item.id).slice(0, 2)
    const trail = Array.isArray(raw.trail) ? raw.trail.filter((id: string) => trailOrder.includes(id as typeof trailOrder[number])).slice(0, 3) : []
    const endings = ['dawn-tide', 'dawn-sound', 'dawn-promise'].filter(id => Array.isArray(raw.endings) && raw.endings.includes(id))
    return { version: 1, gear, trail, treasure: !!raw.treasure, endings, node, line: node && Number.isInteger(raw.line) ? Math.max(0, Math.min(raw.line, romanceStory[node].lines.length - 1)) : 0, completed, choices, history }
  } catch { return blank() }
}
export function romanceDlcStatus() { const save = load(); return { started: !!save.node || save.completed.length > 0, completed: save.completed.length } }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export function mountRomanceDlc(root: HTMLElement, initialLanguage: Language, onBack: () => void, onLanguageChange: (language: Language) => void) {
  let language = initialLanguage
  let save = load()
  let playing = false
  let disposed = false
  let audio: HTMLAudioElement | null = null
  let audioKey = ''
  let transition = 0
  let audioEnabled = localStorage.getItem('naiwa-audio-enabled-v1') !== 'false'
  let storageAvailable = true
  const text = (zh: string, en: string) => language === 'zh' ? zh : en
  const speaker = (who: string) => who === 'naiwa' ? text('奶蛙', 'Naiwa') : who === 'player' ? text('我', 'Me') : text('旁白', 'Narration')
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); storageAvailable = true } catch { storageAvailable = false } }
  const stopAudio = () => { audio?.pause(); if (audio) audio.src = ''; audio = null; audioKey = '' }
  const back = () => { stopAudio(); if (playing) { playing = false; render() } else onBack() }
  const record = () => {
    if (!save.node) return
    const last = save.history.at(-1)
    if (last?.node !== save.node || last.line !== save.line) save.history.push({ node: save.node, line: save.line })
    save.history = save.history.slice(-180)
    persist()
  }
  const begin = (id: string) => {
    const episode = romanceEpisodes.find(ep => ep.id === id)
    if (!episode || !unlocked(id)) return
    if (id === 'shore') { save.trail = []; save.treasure = false }
    stopAudio(); save.node = episode.start; save.line = 0; playing = true; record(); render()
  }
  const advance = () => {
    if (!playing || !save.node) return
    const node = romanceStory[save.node]
    if (save.line === node.lines.length - 1 && (node.choices || node.activity)) return
    stopAudio()
    if (save.line < node.lines.length - 1) save.line++
    else if (node.next) { save.node = node.finale ? romanceFinale(save.gear, save.treasure, save.choices.rain) : node.next; save.line = 0 }
    else if (node.ending) {
      if (!save.completed.includes(node.episode)) save.completed.push(node.episode)
      if (node.episode === 'dawn' && !save.endings.includes(save.node)) save.endings.push(save.node)
      save.node = null; save.line = 0; playing = false; persist(); render(); return
    }
    record(); render()
  }
  const log = () => {
    stopAudio()
    const dialog = document.createElement('dialog')
    dialog.className = 'dialog romance-log'
    dialog.innerHTML = `<div class="dialog-head"><h2>${text('约会回顾', 'Our conversations')}</h2><button class="small-btn" data-close>${text('关闭', 'Close')} ×</button></div><div class="romance-history">${save.history.length ? save.history.map(h => { const line = romanceStory[h.node].lines[h.line]; return `<article><strong>${speaker(line.speaker)}</strong><p>${esc((line.blanketText && save.gear.includes('blanket') ? line.blanketText : line.text)[language])}</p></article>` }).join('') : `<p>${text('还没有记录，选一段日常开始吧。', 'No conversations yet. Choose a day to begin.')}</p>`}</div>`
    root.append(dialog)
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close())
    dialog.addEventListener('close', () => { dialog.remove(); root.querySelector<HTMLElement>('#romance-log')?.focus() }, { once: true })
    dialog.showModal()
    const history = dialog.querySelector('.romance-history')!; history.scrollTop = history.scrollHeight
  }
  const endingName = (id: string) => id === 'dawn-tide' ? text('潮汐之约', 'A Promise with the Tide') : id === 'dawn-sound' ? text('能听见的旅行', 'A Journey You Can Hear') : text('下一场雨，也一起', 'Together in the Next Rain')
  const unlocked = (id: string) => { const index = romanceEpisodes.findIndex(ep => ep.id === id); return index === 0 || index > 0 && save.completed.includes(romanceEpisodes[index - 1].id) }
  const finishActivity = (node: string) => { stopAudio(); save.node = node; save.line = 0; record(); render() }
  function activityMarkup(kind: 'pack' | 'trail') {
    if (kind === 'pack') return `<section class="romance-activity"><h2>${text('只带两样', 'Room for two things')}</h2><p>${text('点击物品放入旅行袋，再点一次取出。它们会改变后面的约会。', 'Click to pack an item; click again to remove it. Your choices matter later.')}</p><div class="romance-pack">${packingItems.map(item => `<button data-pack="${item.id}" aria-pressed="${save.gear.includes(item.id)}" ${save.gear.length === 2 && !save.gear.includes(item.id) ? 'disabled' : ''}><strong>${item.title[language]}</strong><small>${item.note[language]}</small><span>${save.gear.includes(item.id) ? '✓' : '+'}</span></button>`).join('')}</div><p role="status">${save.gear.length}/2 ${text('已装好', 'packed')}</p><button class="romance-next" id="romance-pack-done" ${save.gear.length === 2 ? '' : 'disabled'}>${text('拉上拉链，出发', 'Zip the bag and go')} ↗</button></section>`
    const labels = { lighthouse: text('灯塔', 'Lighthouse'), anchor: text('船锚', 'Anchor'), shell: text('贝壳标记', 'Shell marker') }
    return `<section class="romance-activity"><h2>${text('循着海岸线索', 'Follow the coastal clues')}</h2><p>${text('先替船照路 → 再让船停下 → 最后听得见海。按顺序选择三个路标。', 'What guides a ship → what holds it still → what lets you hear the sea. Select three landmarks in order.')}</p><div class="romance-trail">${trailOrder.map(id => `<button data-trail="${id}" ${save.trail.includes(id) ? 'disabled' : ''}>${labels[id]}</button>`).join('')}</div><p role="status">${save.trail.map(id => labels[id as keyof typeof labels]).join(' → ') || text('还没选择路线', 'Choose your route')}${romanceTrailResult(save.trail) === 'retry' ? text(' · 顺序不对。看看第一句，再试一次。', ' · Wrong order. Read the first clue and try again.') : ''}</p><div class="romance-activity-actions"><button class="small-btn" id="romance-trail-reset">${text('重新辨认路线', 'Try another route')}</button><button class="small-btn" id="romance-trail-skip">${text('今天不找了，去看海', 'Leave the search and enjoy the sea')}</button></div></section>`
  }
  function bindActivities(kind: 'pack' | 'trail' | undefined, last: boolean) {
    if (!kind || !last) return
    root.querySelectorAll<HTMLButtonElement>('[data-pack]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.pack!
      if (save.gear.includes(id)) save.gear = save.gear.filter(item => item !== id)
      else if (save.gear.length < 2) save.gear.push(id)
      persist(); render()
    }))
    root.querySelector('#romance-pack-done')?.addEventListener('click', () => { if (save.gear.length === 2) finishActivity('departure-train') })
    root.querySelectorAll<HTMLButtonElement>('[data-trail]').forEach(button => button.addEventListener('click', () => {
      if (save.trail.includes(button.dataset.trail!) || save.trail.length >= 3) return
      save.trail.push(button.dataset.trail!); persist()
      if (romanceTrailResult(save.trail) === 'found') { save.treasure = true; finishActivity('shore-found') } else render()
    }))
    root.querySelector('#romance-trail-reset')?.addEventListener('click', () => { save.trail = []; persist(); render() })
    root.querySelector('#romance-trail-skip')?.addEventListener('click', () => { save.treasure = false; finishActivity('shore-missed') })
  }
  function image(nodeId: string, line: number) {
    const shot = romanceVisual(nodeId, line)
    const id = shot.image
    const layer = root.querySelector<HTMLElement>('.romance-image-layer')!
    layer.querySelectorAll<HTMLImageElement>('img').forEach(img => { if (img.dataset.art === id) img.alt = shot.alt[language] })
    if (layer.dataset.image === id) return
    layer.dataset.image = id
    const generation = ++transition
    layer.querySelectorAll('img:not(.is-visible)').forEach(img => img.remove())
    const old = layer.querySelector('img.is-visible')
    const img = new Image()
    img.className = 'romance-image'
    img.style.objectPosition = shot.position
    img.dataset.art = id
    img.alt = shot.alt[language]
    img.onload = () => {
      if (disposed || generation !== transition) { img.remove(); return }
      requestAnimationFrame(() => { if (disposed || generation !== transition) return; img.classList.add('is-visible'); old?.classList.remove('is-visible') })
    }
    img.onerror = () => {
      if (disposed || generation !== transition) { img.remove(); return }
      const fallback = romanceEnvironment(nodeId)
      if (img.dataset.art !== fallback) { img.dataset.art = fallback; img.src = `/images/${fallback}.webp` }
    }
    layer.append(img)
    img.src = `/images/${id}.webp`
    const next = nextRomanceImage(nodeId, line)
    if (next) { const preload = new Image(); preload.src = `/images/${next}.webp` }
  }
  function render() {
    const head = `<header class="romance-top"><button class="small-btn" id="romance-back" aria-keyshortcuts="Escape">← ${playing ? text('约会手账', 'Date journal') : text('第一章详情', 'Chapter one')}</button><span class="romance-wordmark">NAIWA / AFTER HOURS</span><nav><button class="small-btn" id="romance-log">${text('回顾', 'History')}</button><button class="small-btn" id="romance-audio" aria-pressed="${audioEnabled}">${audioEnabled ? text('声音：开', 'Audio on') : text('声音：关', 'Audio off')}</button><button class="small-btn" id="romance-fullscreen">${isAppFullscreen(root) ? text('退出全屏', 'Exit fullscreen') : text('全屏', 'Fullscreen')}</button><button class="small-btn" id="romance-language">${text('EN', '中文')}</button></nav></header>`
    if (!playing || !save.node) {
      root.innerHTML = `<div class="romance-dlc romance-hub">${head}<main class="romance-journal"><div class="romance-journal-heading"><span class="romance-eyebrow">CHAPTER 01 · DLC / 01</span><h1>${text('潮汐写给你的信', 'A Letter from the Tide')}</h1><p>${text('独立恋爱番外 · 两天一夜的海边旅行。行李、海岸路线和雨夜计划，将一起写下最后那封信。', 'A standalone romance side story. Your luggage, coastal trail, and rainy-night plan shape the letter at the end of a two-day trip.')}</p><div class="romance-hub-actions">${save.node ? `<button class="primary-btn" id="romance-resume">${text('继续上次的约会', 'Continue our date')} ↗</button>` : ''}<span>${text('日常纪念', 'Memories kept')} ${save.completed.length} / 4</span></div></div><div class="romance-date-grid">${romanceEpisodes.map((ep, i) => `<button class="romance-date ${save.completed.includes(ep.id) ? 'is-kept' : ''}" data-date="${ep.id}" ${i > 0 && !save.completed.includes(romanceEpisodes[i - 1].id) ? 'disabled' : ''}><div class="romance-date-art" style="background-image:url('/images/${romanceEpisodeCover(ep.id).image}.webp')"><span>0${i + 1} / ${save.completed.includes(ep.id) ? text('已珍藏', 'KEPT') : 'A DAY TOGETHER'}</span></div><div class="romance-date-copy"><h2>${esc(ep.title[language])}</h2><p>${esc(ep.note[language])}</p><span>${save.completed.includes(ep.id) ? `✓ ${esc(ep.stamp[language])}` : i > 0 && !save.completed.includes(romanceEpisodes[i - 1].id) ? text('完成上一段旅行后解锁', 'Finish the previous part to unlock') : text('继续这趟旅行 ↗', 'Continue the journey ↗')}</span>${save.choices[ep.id] ? `<small>${esc(Object.values(romanceStory).find(n => n.episode === ep.id && n.choices)?.choices?.find(c => c.next === save.choices[ep.id])?.text[language] ?? '')}</small>` : ''}</div></button>`).join('')}</div><section class="romance-keepsakes"><h2>${text('旅行箱与结尾', 'Luggage & endings')}</h2><p>${save.gear.length ? save.gear.map(id => packingItems.find(item => item.id === id)!.title[language]).join(' · ') : text('还未整理行李', 'Not packed yet')} · ${save.treasure ? text('已找到海玻璃', 'Sea glass found') : text('海岸秘密待寻找', 'Coastal secret undiscovered')}</p><div>${['dawn-tide', 'dawn-sound', 'dawn-promise'].map(id => `<span class="${save.endings.includes(id) ? 'is-unlocked' : ''}">${save.endings.includes(id) ? endingName(id) : text('尚未解锁的结尾', 'Undiscovered ending')}</span>`).join('')}</div></section><footer class="romance-journal-footer"><span>${storageAvailable ? text('独立存档 · 按旅程顺序解锁 · 三种专属结尾', 'Separate save · A sequential journey · Three endings') : text('无法保存，请保持页面打开', 'Saving unavailable · Keep this page open')}</span><button class="small-btn" id="romance-reset">${text('重置番外进度', 'Reset this DLC')}</button></footer></main></div>`
      root.querySelectorAll<HTMLButtonElement>('[data-date]').forEach(button => button.addEventListener('click', () => {
        const run = () => begin(button.dataset.date!)
        if (save.node && romanceStory[save.node].episode !== button.dataset.date) confirmInApp(root, text('开始这段日常会替换未完成的约会进度，已收集纪念会保留。', 'Starting this day replaces the unfinished date. Collected memories will remain.'), language, run)
        else if (save.node) { playing = true; render() }
        else run()
      }))
      root.querySelector('#romance-resume')?.addEventListener('click', () => { playing = true; render() })
      root.querySelector('#romance-reset')?.addEventListener('click', () => confirmInApp(root, text('重置恋爱日常 DLC？番外进度和纪念会清除。', 'Reset the romance DLC? Its progress and memories will be cleared.'), language, () => { stopAudio(); save = blank(); persist(); render() }))
    } else {
      const node = romanceStory[save.node]
      const episode = romanceEpisodes.find(ep => ep.id === node.episode)!
      const line = node.lines[save.line]
      if (!root.querySelector('.romance-stage')) root.innerHTML = `<div class="romance-dlc romance-play">${head}<main class="romance-stage"><div class="romance-image-layer"></div><div class="romance-stage-shade"></div><div class="romance-dialogue-zone"></div></main></div>`
      else root.querySelector('.romance-top')!.outerHTML = head
      root.querySelector<HTMLElement>('.romance-stage')!.onclick = event => { if (!(event.target as HTMLElement).closest('button')) advance() }
      image(save.node, save.line)
      const last = save.line === node.lines.length - 1
      root.querySelector('.romance-dialogue-zone')!.innerHTML = `<div class="romance-eyebrow">DLC · ${esc(episode.title[language])} / ${String(save.line + 1).padStart(2, '0')}</div><section class="romance-dialogue"><strong>${speaker(line.speaker)}</strong><p>${esc((line.blanketText && save.gear.includes('blanket') ? line.blanketText : line.text)[language])}</p><div class="romance-dialogue-tools"><button class="small-btn" id="romance-voice">${text('播放／跳过声音', 'Play / skip voice')}</button>${last && (node.choices || node.activity) ? '' : `<button class="romance-next" id="romance-next">${last && node.ending ? text('珍藏这一页', 'Keep this page') : text('继续', 'Continue')} ↗</button>`}</div></section>${last && node.activity ? activityMarkup(node.activity) : ''}${last && node.choices ? `<div class="romance-choices">${node.choices.map((c, i) => `<button data-romance-choice="${i}"><span>0${i + 1}</span>${esc(c.text[language])}<span>↗</span></button>`).join('')}</div>` : ''}<small class="romance-key-hint">${text('空格 / Enter 继续 · ESC 返回手账', 'Space / Enter to continue · ESC for journal')}</small>`
      root.querySelector('#romance-next')?.addEventListener('click', advance)
      bindActivities(node.activity, last)
      root.querySelectorAll<HTMLButtonElement>('[data-romance-choice]').forEach(button => button.addEventListener('click', () => {
        const choice = node.choices![Number(button.dataset.romanceChoice)]
        stopAudio(); save.choices[node.episode] = choice.next; save.node = choice.next; save.line = 0; record(); render()
      }))
      const key = `${save.node}/${save.line}/${language}`
      const playVoice = () => {
        stopAudio(); audioKey = key
        audio = new Audio(line.speaker === 'naiwa' ? (line.happy ? '/audio/naiwa-laugh.m4a' : nextCharacterVoice()) : `/audio/tts/romance-${save.node}-${save.line}${line.blanketText && save.gear.includes('blanket') ? '-blanket' : ''}-${language}.mp3`)
        const currentAudio = audio
        void currentAudio.play().catch(() => { if (audio !== currentAudio || disposed) return; const button = root.querySelector('#romance-voice'); if (button) button.textContent = text('点击播放声音', 'Click to play voice') })
      }
      if (audioEnabled && audioKey !== key) playVoice()
      root.querySelector('#romance-voice')?.addEventListener('click', () => { if (audio && !audio.paused) stopAudio(); else playVoice() })
    }
    root.querySelector('#romance-back')?.addEventListener('click', back)
    root.querySelector('#romance-log')?.addEventListener('click', log)
    root.querySelector('#romance-language')?.addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; onLanguageChange(language); render() })
    root.querySelector('#romance-audio')?.addEventListener('click', () => { audioEnabled = !audioEnabled; localStorage.setItem('naiwa-audio-enabled-v1', String(audioEnabled)); if (!audioEnabled) stopAudio(); render() })
    root.querySelector('#romance-fullscreen')?.addEventListener('click', async () => { await toggleAppFullscreen(root); if (!disposed) render() })
  }
  function keydown(event: KeyboardEvent) {
    if (!playing || root.querySelector('dialog[open]') || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    if ((event.target as HTMLElement)?.closest('button, input, select, textarea, a')) return
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); advance() }
  }
  function fullscreenChanged() {
    const button = root.querySelector('#romance-fullscreen')
    if (button) button.textContent = isAppFullscreen(root) ? text('退出全屏', 'Exit fullscreen') : text('全屏', 'Fullscreen')
  }
  document.addEventListener('keydown', keydown)
  document.addEventListener('fullscreenchange', fullscreenChanged)
  window.addEventListener('appimmersivechange', fullscreenChanged)
  render()
  return {
    setLanguage(next: Language) { if (next !== language) { language = next; render() } },
    dispose() { disposed = true; transition++; stopAudio(); document.removeEventListener('keydown', keydown); document.removeEventListener('fullscreenchange', fullscreenChanged); window.removeEventListener('appimmersivechange', fullscreenChanged) },
  }
}
