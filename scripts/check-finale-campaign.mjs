import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'

let writes = 0, plays = 0
globalThis.localStorage = { setItem() { writes++; throw new Error('A campaign page must not write a save') } }
globalThis.Audio = class { constructor() { plays++; throw new Error('A campaign page must not play audio') } }
const { renderFinalePromo, renderFinaleEntries, mountFinalePromo } = await import(tsModuleUrl('src/finale-promo.ts'))

const spoilers = ['第二人格', '纯白摇篮', '牺牲', '第二个完整人格', 'second personality', 'alter ego', 'White Cradle', 'sacrifice', 'true ending']

/* ---------------------------------------------------------------- markup */
for (const language of ['zh', 'en']) {
  const entries = renderFinaleEntries(language)
  assert(entries.includes('?chapter=5') && !entries.includes('?chapter=6'), 'the merged finale keeps one entrance')
  for (const spoiler of spoilers) assert(!entries.toLowerCase().includes(spoiler.toLowerCase()), `home teaser leaks ${spoiler}`)

  for (const started of [false, true]) {
    const html = renderFinalePromo(5, language, started, '<Session only>')
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1])
    assert.equal(ids.length, new Set(ids).size, 'campaign controls and anchors need unique IDs')
    assert.equal((html.match(/<h1 /g) ?? []).length, 1, 'the campaign has a single first-level heading')
    for (const id of ['promo-title', 'chapter-home', 'chapter-return', 'routes-intro-top', 'routes-intro', 'language', 'fullscreen', 'release-entry', 'fl-gate-note']) {
      assert(ids.includes(id), `campaign is missing #${id}`)
    }
    for (const match of html.matchAll(/<a ([^>]+)>/g)) {
      const href = match[1].match(/href="([^"]+)"/)?.[1]
      assert(href)
      if (href.startsWith('#')) assert(ids.includes(href.slice(1)), `section link ${href} must resolve`)
    }
    assert(html.includes('?chapter=5'), 'the campaign links back into the chapter')
    assert(html.includes(started ? 'data-promo-restart' : 'data-promo-play'), 'start or resume state is rendered')
    assert.equal((html.match(/data-promo-play/g) ?? []).length, 1, 'the gated start is the only entry point')
    assert.equal((html.match(/data-promo-restart/g) ?? []).length, started ? 1 : 0, 'restart appears only with a save')
    assert(html.includes(started ? 'id="continue"' : 'id="start"'))
    assert(html.includes('&lt;Session only&gt;'), 'storage notices stay escaped')
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1, 'one chapter is marked current')
    assert(html.includes('data-promo-chapter-link="5" aria-current="page"'))

    // The photo wall is the point of the page: it loops, so it never runs out of stills.
    const stills = [...html.matchAll(/data-fl-open /g)].length
    assert.equal(stills, 24, 'the contact sheet keeps three passes of its eight stills')
    assert.equal((html.match(/data-fl-note="/g) ?? []).length, 24, 'every still carries its own caption')
    assert.equal((html.match(/class="fl-strip-set"/g) ?? []).length, 3, 'the sheet is built from three passes')
    assert.equal((html.match(/fl-strip-set" aria-hidden="true"/g) ?? []).length, 2, 'only the middle pass is announced')
    assert.equal((html.match(/tabindex="-1"/g) ?? []).length, 21, 'five sections plus sixteen duplicate stills stay out of the tab order')
    assert.equal((html.match(/data-fl-note="[^"]*"[^>]*tabindex="-1"/g) ?? []).length, 16, 'duplicated stills are the ones skipped by the keyboard')
    assert.equal((html.match(/data-fl-parallax="/g) ?? []).length, 3, 'hero, hero figure and gate layer stay parallaxed')
    assert.equal((html.match(/data-fl-route-item="/g) ?? []).length, 5, 'the route lists all five chapters')
    assert.equal((html.match(/data-fl-count="/g) ?? []).length, 3, 'the finale counters are read-only numbers')
    assert(html.includes('class="fl-plate is-active"') && html.includes('class="fl-route-plate is-active"'), 'the first plate and the current chapter are shown before any script runs')
    assert(html.includes('data-fl-current="true"'), 'the route marks the chapter the reader is on')
    assert.equal((html.match(/data-fl-strip-(prev|next)/g) ?? []).length, 2, 'the contact sheet also has pointer controls')

    // The campaign theme scores the Chinese page only.
    const scored = language === 'zh'
    assert.equal(html.includes('id="bgm-toggle"'), scored, 'the theme switch appears exactly on the scored page')
    assert.equal(html.includes('class="fl-bgm"'), scored, 'the unscored page does not even download the theme')
    if (scored) {
      assert(html.includes('src="/audio/bgm/naiwa-finale-theme.m4a"'), 'the theme points at the supplied track')
      assert(html.includes('preload="auto"'), 'the theme is ready as soon as the page is')
      assert(html.includes('aria-pressed="true"'), 'the theme switch starts on')
      assert(!/<audio[^>]*\sloop(=|\s|>)/.test(html), 'the loop point stays in script so it can fade')
      assert(/<audio[^>]*aria-hidden="true"/.test(html), 'the audio element stays out of the reading order')
    }

    let high = 0
    for (const match of html.matchAll(/<img ([^>]+)>/g)) {
      const attributes = match[1]
      const src = attributes.match(/src="([^"]+)"/)?.[1]
      assert(src && existsSync('public' + src), `campaign art is missing: ${src}`)
      assert(attributes.includes('alt="') && attributes.includes('width="') && attributes.includes('height="'), 'images need alternatives and dimensions')
      if (attributes.includes('fetchpriority="high"')) high++
      assert(!attributes.includes('loading="eager"') || attributes.includes('fetchpriority="high"'), 'only the opening plate loads eagerly')
    }
    assert.equal(high, 1, 'exactly one plate is prioritised')
    for (const spoiler of spoilers) assert(!html.toLowerCase().includes(spoiler.toLowerCase()), `${language} campaign leaks ${spoiler}`)
  }
}

/* ------------------------------------------------------------- behaviour */
class Surface {
  constructor() {
    this.listeners = new Map()
    this.classes = new Set()
    this.properties = new Map()
    this.attributes = new Map()
    this.dataset = {}
    this.textContent = ''
    this.hidden = false
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    }
    this.style = { setProperty: (name, value) => this.properties.set(name, value) }
  }
  addEventListener(name, callback, options) {
    const capture = options === true || options?.capture === true
    const key = `${capture ? 'c' : 'b'}:${name}`
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key).add(callback)
  }
  removeEventListener(name, callback, options) {
    const capture = options === true || options?.capture === true
    this.listeners.get(`${capture ? 'c' : 'b'}:${name}`)?.delete(callback)
  }
  fire(name, event = {}, phase = 'b') { for (const callback of [...this.listeners.get(`${phase}:${name}`) ?? []]) callback(event) }
  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) { this.attributes.delete(name) }
  hasAttribute(name) { return this.attributes.has(name) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  querySelector() { return null }
  querySelectorAll() { return [] }
  focus() { this.focused = true }
  getBoundingClientRect() { return { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 } }
}
/** Capture down the ancestor path, then the target, then bubbling back up — like the browser. */
const dispatch = (path, type, event = {}) => {
  const shaped = { ...event }
  shaped.target = event.target ?? path[path.length - 1]
  shaped.preventDefault = () => { shaped.prevented = true }
  shaped.stopPropagation = () => { shaped.stopped = true }
  for (const node of path) { node.fire(type, shaped, 'c'); if (shaped.stopped) return shaped }
  path[path.length - 1].fire(type, shaped, 'b')
  if (shaped.stopped) return shaped
  for (let index = path.length - 2; index >= 0; index--) path[index].fire(type, shaped, 'b')
  return shaped
}
const closestFor = (node, tokens) => selector => tokens.some(token => selector.includes(token)) ? node : null

let nextFrame = 0
const queue = new Map()
const timers = new Map()
let clock = 0
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true })
const motion = new Surface()
motion.matches = false
globalThis.window = new Surface()
window.matchMedia = () => motion
window.requestAnimationFrame = callback => { queue.set(++nextFrame, callback); return nextFrame }
window.cancelAnimationFrame = id => queue.delete(id)
window.setTimeout = callback => { timers.set(++nextFrame, callback); return nextFrame }
window.clearTimeout = id => timers.delete(id)
const flush = (advance = 1000) => { clock += advance; const pending = [...queue.values()]; queue.clear(); pending.forEach(callback => callback(clock)) }
const runTimers = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()) }

let intersection, resize
globalThis.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; this.targets = new Set(); intersection = this }
  observe(target) { this.targets.add(target) }
  unobserve(target) { this.targets.delete(target) }
  disconnect() { this.disconnected = true; this.targets.clear() }
}
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; resize = this }
  observe() {}
  disconnect() { this.disconnected = true }
}

let createdViewer = null
const viewerNodes = { '.fl-viewer-image': { src: '', alt: '' }, '.fl-viewer-caption span': { textContent: '' }, '.fl-viewer-caption small': { textContent: '' }, '.fl-viewer-close': new Surface() }
const viewer = new Surface()
viewer.querySelector = selector => viewerNodes[selector] ?? null
viewer.showModal = function () { this.open = true; this.modal = true }
viewer.close = function () { this.open = false; this.fire('close') }
viewer.remove = function () { this.removed = true }
globalThis.document = { createElement: () => { createdViewer = viewer; return viewer } }

const page = new Surface()
page.lang = 'zh-CN'
page.clientHeight = 900
page.scrollHeight = 6000
page.scrollTop = 0
page.scrollTo = options => { page.lastScroll = options; page.scrollTop = options.top }
page.scrollLeft = 0
page.getBoundingClientRect = () => ({ top: 0 })
page.scrollBy = options => { page.scrolledBy = options }
const header = new Surface()
header.offsetHeight = 78
const stack = new Surface()
stack.getBoundingClientRect = () => ({ top: 1200 - page.scrollTop, height: 900 })
const strip = new Surface()
strip.scrollLeft = 0
strip.clientWidth = 900
strip.scrollBy = options => { strip.scrolledBy = options }
const stripPrev = new Surface()
const stripNext = new Surface()
const bgm = new Surface()
bgm.paused = true
bgm.volume = 0
bgm.currentTime = 0
bgm.duration = 49.14
bgm.playCalls = 0
bgm.pauseCalls = 0
bgm.play = function () { this.playCalls++; this.paused = false; return Promise.resolve() }
bgm.pause = function () { this.pauseCalls++; this.paused = true }
const bgmToggle = new Surface()
const gate = new Surface()
const gateTitle = new Surface()
const gateNote = new Surface()
const hud = new Surface()
const toast = new Surface()
const percents = [new Surface(), new Surface()]
const rings = [new Surface(), new Surface()]
rings[1].closest = () => hud
rings[0].closest = () => null
const parallax = [new Surface(), new Surface(), new Surface()]
parallax.forEach((element, index) => { element.dataset.flParallax = String(.1 + index * .02) })
parallax[1].getBoundingClientRect = () => ({ top: 300 - page.scrollTop, height: 400 })
const plateSurfaces = [new Surface(), new Surface(), new Surface()]
const revealSurfaces = [new Surface(), new Surface(), new Surface()]
// These two start active in the rendered markup, so the controller only reacts to changes.
plateSurfaces[0].classes.add('is-active')
const counts = ['23', '10', '6'].map(value => { const element = new Surface(); element.dataset.flCount = value; return element })
revealSurfaces[0].querySelectorAll = () => counts
const shotSurfaces = Array.from({ length: 24 }, (_, index) => {
  const shot = new Surface()
  const position = index % 8
  shot.dataset.flSrc = `/images/shot-${position}.webp`
  shot.dataset.flAlt = `alt ${position}`
  shot.dataset.flPlace = `place ${position}`
  shot.dataset.flNote = `note ${position}`
  // Three passes of eight cards, 320px apart, each pass 2560px wide.
  shot.offsetLeft = position * 320 + Math.floor(index / 8) * 2560
  return shot
})
const stripTrack = new Surface()
stripTrack.querySelectorAll = () => shotSurfaces
const routeItems = Array.from({ length: 5 }, (_, index) => { const item = new Surface(); item.dataset.flRouteItem = String(index); return item })
const routePlates = Array.from({ length: 5 }, () => new Surface())
routePlates[4].classes.add('is-active')
const routeNote = new Surface()
const play = new Surface()
const routes = new Surface()
const topRoutes = new Surface()
play.closest = closestFor(play, ['[data-promo-play]'])
routes.closest = closestFor(routes, ['[data-promo-routes]'])
topRoutes.closest = closestFor(topRoutes, ['#routes-intro-top', '[data-promo-routes]'])
const gated = [play, routes, topRoutes]
const selectors = {
  '.fl-header': header,
  '[data-fl-stack]': stack,
  '[data-fl-strip]': strip,
  '[data-fl-track]': stripTrack,
  '[data-fl-strip-prev]': stripPrev,
  '[data-fl-strip-next]': stripNext,
  '[data-fl-bgm]': bgm,
  '#bgm-toggle': bgmToggle,
  '[data-fl-route-note]': routeNote,
  '[data-fl-gate]': gate,
  '[data-fl-gate-title]': gateTitle,
  '[data-fl-gate-note]': gateNote,
  '[data-fl-hud]': hud,
  '[data-fl-toast]': toast,
  '[data-promo-play]': play,
}
const lists = {
  '[data-promo-reveal]': revealSurfaces,
  '[data-fl-parallax]': parallax,
  '[data-fl-plate]': plateSurfaces,
  '[data-fl-open]': shotSurfaces,
  '[data-fl-route-item]': routeItems,
  '[data-fl-route-plate]': routePlates,
  '[data-fl-gate-percent]': percents,
  '[data-fl-ring]': rings,
  '[data-promo-play], [data-promo-restart], [data-promo-routes], #routes-intro-top': gated,
  'img': [],
}
page.querySelector = selector => selectors[selector] ?? null
page.querySelectorAll = selector => lists[selector] ?? []
page.scrollTop = 0
const root = { querySelector: () => page, append: node => { root.appended = node }, querySelectorAll: () => [] }

// main.ts attaches its own handler to the gated buttons; the page must keep it out until the end.
let entries = 0
for (const button of gated) button.addEventListener('click', () => entries++)

const controller = mountFinalePromo(root, 0)
flush(0)
assert(page.classes.has('has-motion'), 'motion is enabled when the reader allows it')
assert.equal(controller.getScrollTop(), 0)
assert.equal(createdViewer, root.appended, 'the still viewer is attached to the stable app root')
assert.equal(gate.attributes.get('aria-disabled'), undefined, 'the gate container itself is not aria-disabled')
assert.equal(plateSurfaces[0].classes.has('is-active'), true, 'the opening plate is presented before any scrolling')
for (const button of gated) assert.equal(button.attributes.get('aria-disabled'), 'true', 'every route into the game starts locked')

// The campaign theme starts with the page, fades in, and can be switched off.
assert.equal(bgmToggle.attributes.get('aria-pressed'), 'true', 'the theme switch starts on')
assert.equal(bgm.playCalls, 1, 'the theme starts with the Chinese page')
assert.equal(bgm.paused, false)
flush(2500)
assert(Math.abs(bgm.volume - 0.45) < 0.01, 'the theme fades in rather than starting at full volume')
assert.equal(queue.size, 0, 'finishing the fade releases its animation frame')
dispatch([page, bgmToggle], 'click')
assert.equal(bgmToggle.attributes.get('aria-pressed'), 'false', 'the theme switch turns off')
runTimers()
assert.equal(bgm.pauseCalls, 1, 'switching off fades out and then pauses')
assert.equal(bgm.volume, 0)
dispatch([page, bgmToggle], 'click')
assert.equal(bgmToggle.attributes.get('aria-pressed'), 'true', 'the theme switch turns back on')
assert.equal(bgm.playCalls, 2, 'switching on plays again')
flush(2500)

// The end of the track fades out, so the loop point never cuts mid-note.
bgm.currentTime = 48.9
bgm.fire('timeupdate')
flush(2000)
assert.equal(bgm.volume, 0, 'the theme fades out into the loop point')
bgm.paused = true
bgm.fire('ended')
assert.equal(bgm.currentTime, 0, 'the loop restarts from the top')
assert.equal(bgm.playCalls, 3, 'the loop plays again')
flush(2500)
assert(Math.abs(bgm.volume - 0.45) < 0.01, 'the loop fades back in')
assert.equal(queue.size, 0)

// Clicking a locked control never reaches the gameplay handler.
const lockedClick = dispatch([page, play], 'click', { button: 0 })
assert.equal(entries, 0, 'a locked start cannot open the chapter')
assert(lockedClick.stopped && lockedClick.prevented, 'the capture guard consumes the locked click')
assert(!page.classes.has('is-unlocked'))
assert.equal(toast.classes.has('is-visible'), true, 'the reader is told how much is left')
assert(toast.textContent.length > 0)
assert.equal(gate.classes.has('is-alert'), true)

// Scrolling to the very end unlocks the start.
page.scrollTop = 5094
for (let index = 0; index < 20; index++) page.fire('scroll')
assert.equal(queue.size, 1, 'wheel and touch events share one animation frame')
flush()
assert(page.classes.has('is-unlocked'), 'reaching the bottom unlocks the chapter')
for (const button of gated) assert.equal(button.attributes.get('aria-disabled'), undefined, 'unlocked controls are re-enabled')
assert.equal(gateTitle.textContent, '已解锁，可以开始了。')
assert.equal(gateNote.hidden, true, 'the percentage is replaced by the unlocked state')
assert.equal(hud.classes.has('is-done'), true)
assert.equal(page.properties.get('--promo-reading'), String(5094 / 5100))
assert.equal(percents[0].textContent, '100%')
dispatch([page, play], 'click', { button: 0 })
assert.equal(entries, 1, 'an unlocked start reaches the gameplay handler')

// The plate stack crossfades with reading position.
page.scrollTop = 4400
page.fire('scroll')
flush()
assert.equal(plateSurfaces.filter(plate => plate.classes.has('is-active')).length, 1, 'exactly one plate is presented at a time')
assert(plateSurfaces[2].classes.has('is-active'), 'reading to the end presents the deepest plate')

// The contact sheet loops: it opens on the middle pass and wraps by exactly one pass.
assert.equal(strip.scrollLeft, 2560, 'the sheet opens on the middle pass so it can travel both ways')
strip.scrollLeft = 5200
strip.fire('scroll')
assert.equal(strip.scrollLeft, 2640, 'running past the last still wraps back exactly one pass')
strip.scrollLeft = 100
strip.fire('scroll')
assert.equal(strip.scrollLeft, 2660, 'scrolling before the first still wraps forward exactly one pass')

// Stills open in the viewer, and dragging the strip never opens one by accident.
dispatch([page, strip, shotSurfaces[3]], 'click', { button: 0 })
assert.equal(viewerNodes['.fl-viewer-image'].src, '/images/shot-3.webp')
assert.equal(viewerNodes['.fl-viewer-caption span'].textContent, 'place 3')
assert.equal(viewerNodes['.fl-viewer-caption small'].textContent, 'note 3')
assert.equal(viewer.open, true, 'the still viewer opens as a modal')
viewerNodes['.fl-viewer-close'].fire('click')
assert.equal(viewer.open, false)
strip.scrollLeft = 2560
strip.fire('pointerdown', { pointerType: 'mouse', button: 0, clientX: 400 })
window.fire('pointermove', { clientX: 300, preventDefault() {} })
assert.equal(strip.scrollLeft, 2660, 'dragging moves the contact sheet')
window.fire('pointermove', { clientX: -2400, preventDefault() {} })
assert.equal(strip.scrollLeft, 2800, 'a wrap mid-drag lands exactly one pass away')
window.fire('pointermove', { clientX: -2500, preventDefault() {} })
assert.equal(strip.scrollLeft, 2900, 'the drag keeps following the pointer after a wrap')
strip.fire('pointerup', {})
viewerNodes['.fl-viewer-image'].src = 'untouched'
dispatch([page, strip, shotSurfaces[3]], 'click', { button: 0 })
assert.equal(viewerNodes['.fl-viewer-image'].src, 'untouched', 'a drag suppresses the click it would otherwise trigger')
strip.fire('keydown', { key: 'ArrowRight', preventDefault() {} })
assert.equal(page.scrolledBy, undefined, 'the strip, not the page, handles its keys')
assert.deepEqual(strip.scrolledBy, { left: 320, behavior: 'smooth' }, 'keyboard scrolling works on the contact sheet')
stripPrev.fire('click')
assert.equal(strip.scrolledBy.left, -630, 'the pointer controls step back one screen')
stripNext.fire('click')
assert.equal(strip.scrolledBy.left, 630, 'the pointer controls step forward one screen')

// Route rows preview their chapter without leaving the campaign.
routeItems[1].fire('pointerenter')
assert.equal(routePlates[1].classes.has('is-active'), true)
assert.equal(routePlates[4].classes.has('is-active'), false, 'only one chapter is previewed')
assert.equal(routeNote.textContent, '穿过冰封镜馆，拼出被裁切的那一秒。')

// Reveals count up once and are not observed again.
intersection.callback([{ isIntersecting: true, target: revealSurfaces[0] }])
assert(revealSurfaces[0].classes.has('is-revealed'))
assert(!intersection.targets.has(revealSurfaces[0]), 'a revealed block stops being observed')
flush(1000)
assert.deepEqual(counts.map(element => element.textContent), ['23', '10', '6'], 'the finale counters settle on their real values')

// Reduced motion swaps to a static layout without losing any copy.
motion.matches = true
motion.fire('change')
flush()
assert(!page.classes.has('has-motion'))
assert.equal(parallax[0].properties.get('--fl-shift'), '0px', 'parallax stands still for reduced motion')
assert.equal(page.classes.has('is-unlocked'), true)

// Leaving the campaign releases every listener and the viewer.
controller.dispose()
assert.equal(queue.size, 0, 'leaving for gameplay cancels pending animation work')
assert(intersection.disconnected && resize.disconnected)
for (const name of ['b:scroll', 'c:click', 'b:click', 'c:load']) assert.equal(page.listeners.get(name)?.size, 0, `${name} listener removed`)
assert.equal(window.listeners.get('b:pointermove')?.size, 0)
assert.equal(window.listeners.get('b:pointerup')?.size, 0)
assert.equal(window.listeners.get('b:resize')?.size, 0)
assert.equal(motion.listeners.get('b:change')?.size, 0)
assert.equal(bgm.listeners.get('b:timeupdate')?.size, 0, 'the theme stops listening on the way out')
assert.equal(bgm.listeners.get('b:ended')?.size, 0)
assert.equal(bgmToggle.listeners.get('b:click')?.size, 0)
assert.equal(bgm.paused, true, 'leaving the campaign stops the theme')
assert.equal(viewer.removed, true, 'the still viewer is detached')
page.fire('scroll')
assert.equal(queue.size, 0, 'a disposed page cannot restart animation work')

// The unscored page has no switch and never starts the track.
const playsBefore = bgm.playCalls
page.lang = 'en'
const english = mountFinalePromo(root, 0)
flush(0)
assert.equal(bgm.playCalls, playsBefore, 'the English page stays silent')
english.dispose()
runTimers()
page.lang = 'zh-CN'

// Reading once per session is enough: a rerender keeps the gate open.
const second = mountFinalePromo(root, 0)
assert(page.classes.has('is-unlocked'), 'the unlock survives a language rerender')
assert.equal(gateTitle.textContent, '已解锁，可以开始了。')
second.dispose()
runTimers()

assert.equal(writes, 0, 'the campaign never writes a save')
assert.equal(plays, 0, 'the campaign never builds an audio element of its own')
console.log('Finale campaign OK: paragraph-by-paragraph gate unlocks only at the end of the page; capture guard blocks start, restart and story map; the contact sheet loops through three passes (only the middle one is announced) and wraps by exactly one pass under scroll, drag and buttons; the supplied theme scores the Chinese page with a session-only switch, fading in and out of its loop point; stills open in an accessible viewer; reduced motion stays static; nothing touches a save.')
