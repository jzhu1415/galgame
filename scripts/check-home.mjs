import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'

let writes = 0, plays = 0
// No progress, sound or chapter controller should be touched during home exploration.
globalThis.localStorage = { setItem() { writes++; throw new Error('Home preview cannot write a game save') } }
globalThis.Audio = class { constructor() { plays++; throw new Error('Home preview cannot play dialogue') } }
const { renderHomePage, mountHomePage, homeChapters, homeTimeline, homePeople } = await import(tsModuleUrl('src/home-page.ts'))
assert.equal(homeChapters.length, 5)
assert.deepEqual(homePeople.map(p => p.name.zh), ['奶蛙', '奶霸'], 'the public cast is limited to the two approved characters')
assert.equal(homeTimeline.length, 7)
assert.deepEqual(homeTimeline.map(e => e.date), [...homeTimeline.map(e => e.date)].sort())
for (const language of ['zh', 'en']) {
  for (const started of [false, true]) {
    const html = renderHomePage(language, Array.from({ length: 5 }, () => ({ started, completed: false })), 3, { scrollTop: 0, chapter: 3, person: 2, milestone: 4, notes: true })
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1])
    assert.equal(ids.length, new Set(ids).size, 'native dialogs, tab panels and section links need unique IDs')
    assert.equal((html.match(/<h1 /g) ?? []).length, 1)
    for (const m of html.matchAll(/href="(#[^"]+)"/g)) assert(ids.includes(m[1].slice(1)), `missing section ${m[1]}`)
    for (const chapter of homeChapters) {
      assert.equal((html.match(new RegExp(`data-home-chapter="${chapter.id}"`, 'g')) ?? []).length, 1)
      assert(html.includes(`href="?chapter=${chapter.id}"`), 'each real chapter entrance stays available')
      assert(html.includes(chapter.title[language]) && html.includes(chapter.description[language]))
    }
    assert.equal((html.match(/data-home-tab="/g) ?? []).length, 5)
    assert.equal((html.match(/data-home-person="/g) ?? []).length, homePeople.length)
    const cast = html.slice(html.indexOf('<section class="home-section home-people"'), html.indexOf('<section class="home-section home-chapters"'))
    for (const name of ['奶粉', '香蕉猫', '牛来', '奶豆', '肥嘟嘟', 'Naifen', 'Banana Cat', 'Niulai', 'Naidou', 'Feidudu']) assert(!cast.includes(name), `cast introduction leaks ${name}`)
    assert.equal((html.match(/data-home-milestone="/g) ?? []).length, 7)
    assert.equal(html.includes('id="replay-select"'), started, 'restart is only offered for an existing first-chapter save')
    assert(html.includes('aria-selected="true" tabindex="0"'), 'the selected chapter and character are keyboard reachable')
    assert(html.includes('data-home-making-notes><span>') && html.includes('home-workbench-images" hidden'))
    for (const match of html.matchAll(/<img ([^>]+)>/g)) {
      const attributes = match[1]
      const src = attributes.match(/src="([^"]+)"/)?.[1]
      assert(src && existsSync('public' + src), `missing home image ${src}`)
      assert(attributes.includes('alt="') && attributes.includes('width="') && attributes.includes('height="'))
    }
    for (const spoiler of ['腰斩', '献祭', '备用意识', 'bisected', 'sacrifice', 'backup consciousness']) assert(!html.toLowerCase().includes(spoiler), `introduction leaks ${spoiler}`)
  }
}

// A small event surface exercises the real controller without launching a browser.
class Surface {
  constructor(dataset = {}) {
    this.dataset = dataset; this.events = new Map(); this.one = new Map(); this.many = new Map(); this.attributes = new Map()
    const values = new Set()
    this.classList = { add: (...names) => names.forEach(n => values.add(n)), remove: (...names) => names.forEach(n => values.delete(n)), contains: n => values.has(n), toggle(n, force = !values.has(n)) { if (force) values.add(n); else values.delete(n); return force } }
    this.style = { setProperty(name, value) { this[name] = value } }
    this.scrollTop = 0; this.scrollHeight = 2000; this.clientHeight = 500; this.isConnected = true; this.focuses = 0
  }
  addEventListener(type, fn) { if (!this.events.has(type)) this.events.set(type, new Set()); this.events.get(type).add(fn) }
  removeEventListener(type, fn) { this.events.get(type)?.delete(fn) }
  fire(type, values = {}) { const event = { target: this, button: 0, prevented: false, preventDefault() { this.prevented = true }, ...values }; for (const fn of this.events.get(type) ?? []) fn(event); return event }
  querySelector(s) { return this.one.get(s) ?? null }
  querySelectorAll(s) { return this.many.get(s) ?? [] }
  setAttribute(name, value) { this.attributes.set(name, value) }
  focus() { this.focuses++ }
  getBoundingClientRect() { return { top: this.top ?? 0, left: 10, width: 1000, height: 500, right: 1010, bottom: 500 } }
  scrollTo(options) { this.lastScroll = options; this.scrollTop = options.top }
  closest() { return null }
  append(child) { this.child = child; child.parent = this }
  remove() { this.removed = true; if (this.parent?.child === this) this.parent.child = null }
  showModal() { this.open = true }
  close() { this.open = false; this.fire('close') }
}
let nextFrame = 0
const frames = new Map()
globalThis.requestAnimationFrame = fn => { frames.set(++nextFrame, fn); return nextFrame }
globalThis.cancelAnimationFrame = id => frames.delete(id)
const flush = () => { while (frames.size) { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()) } }
globalThis.window = new Surface()
const motion = new Surface(); motion.matches = false
window.matchMedia = () => motion
globalThis.document = new Surface()
document.createElement = tag => {
  assert.equal(tag, 'dialog')
  const dialog = new Surface()
  dialog.one.set('[data-home-image-close]', new Surface())
  return dialog
}
const observers = []
globalThis.IntersectionObserver = class {
  constructor(fn) { this.fn = fn; this.targets = new Set(); observers.push(this) }
  observe(target) { this.targets.add(target) }
  unobserve(target) { this.targets.delete(target) }
  disconnect() { this.targets.clear(); this.disconnected = true }
}
const root = new Surface(), page = new Surface()
root.one.set('.home-launch', page)
root.querySelector = selector => selector === 'dialog[open]' ? root.child?.open ? root.child : null : root.one.get(selector) ?? null
const add = selector => { const node = new Surface(); page.one.set(selector, node); return node }
const list = (selector, nodes) => { page.many.set(selector, nodes); return nodes }
const hero = add('.home-hero'), stage = add('[data-home-stage]'), bar = add('.home-reading span'), header = add('.home-header')
add('[data-home-counter]'); add('[data-home-making-date]'); add('[data-home-making-title]'); add('[data-home-making-detail]')
const greeting = add('[data-home-greeting]'), hello = add('[data-home-hello]'), slider = add('[data-home-time-slider]')
const art = add('.home-workbench-images'), notes = add('[data-home-making-notes]'), workbenchOpen = add('[data-home-workbench-open]')
const expand = add('[data-home-time-expand]'), collapse = add('[data-home-time-collapse]')
const tabs = list('[data-home-tab]', homeChapters.map(c => new Surface({ homeTab: String(c.id) })))
const panels = list('.home-chapter-panel', homeChapters.map(() => new Surface()))
const people = list('[data-home-person]', homePeople.map((_, i) => new Surface({ homePerson: String(i) })))
const personPanels = list('.home-person-panel', homePeople.map(() => new Surface()))
const personChapters = list('[data-home-person-chapter]', homePeople.map(p => new Surface({ homePersonChapter: String(p.chapter) })))
const steps = list('[data-home-step]', [-1, 1].map(n => new Surface({ homeStep: String(n) })))
const timeSteps = list('[data-home-time-step]', [-1, 1].map(n => new Surface({ homeTimeStep: String(n) })))
const views = list('[data-home-view]', ['art', 'notes'].map(v => new Surface({ homeView: v })))
const plates = list('.home-workbench-image', homeTimeline.map(() => new Surface()))
const milestones = list('[data-home-milestone]', homeTimeline.map((_, i) => {
  const item = new Surface({ homeMilestone: String(i) }); item.one.set('details', new Surface()); item.one.set('summary', new Surface()); return item
}))
const reveals = list('[data-home-reveal]', [new Surface(), ...milestones])
const anchor = new Surface(); anchor.hash = '#home-chapters'; list('[data-home-anchor]', [anchor])
const chapterTarget = add('#home-chapters'); chapterTarget.top = 300
const photo = new Surface({ homePhoto: '1' }); list('[data-home-photo]', [photo])
const controller = mountHomePage(root, 'zh', { scrollTop: 120, chapter: 3, person: 6, milestone: 4, notes: true })
flush()
assert.deepEqual(controller.snapshot(), { scrollTop: 120, chapter: 3, person: 1, milestone: 4, notes: true })
assert.equal(panels.filter(p => !p.hidden).length, 1)
assert.equal(personPanels.filter(p => !p.hidden).length, 1)
assert(art.hidden && !notes.hidden)
assert.equal(slider.value, '4')
assert.equal(bar.style.transform, 'scaleX(0.08)')

// Preview tab keyboard focus follows selection; arrows wrap without entering a chapter.
tabs[2].fire('keydown', { key: 'End' }); assert.equal(controller.snapshot().chapter, 5); assert.equal(tabs[4].focuses, 1)
tabs[4].fire('keydown', { key: 'ArrowRight' }); assert.equal(controller.snapshot().chapter, 1)
steps[0].fire('click'); assert.equal(controller.snapshot().chapter, 5)
tabs[1].fire('click'); assert.equal(controller.snapshot().chapter, 2)
people[1].fire('click'); assert.equal(controller.snapshot().person, 1)
people[1].fire('keydown', { key: 'End' }); assert.equal(controller.snapshot().person, homePeople.length - 1)
people.at(-1).fire('keydown', { key: 'ArrowRight' }); assert.equal(controller.snapshot().person, 0)
personChapters[1].fire('click'); assert.equal(controller.snapshot().chapter, homePeople[1].chapter)
assert.equal(page.lastScroll.behavior, 'smooth'); assert(tabs[homePeople[1].chapter - 1].focuses > 0)
hello.fire('click'); const text = greeting.textContent; hello.fire('click'); assert.notEqual(greeting.textContent, text)

// Native vertical scroll, pinch gestures and taps on the chapter link are not hijacked.
tabs[2].fire('click')
const touch = { pointerType: 'touch', pointerId: 1, isPrimary: true, clientX: 220, clientY: 100 }
stage.fire('pointerdown', touch); stage.fire('pointerup', { ...touch, clientX: 80 }); assert.equal(controller.snapshot().chapter, 4)
stage.fire('pointerdown', touch); stage.fire('pointerup', { ...touch, clientX: 140, clientY: 300 }); assert.equal(controller.snapshot().chapter, 4)
stage.fire('pointerdown', touch); stage.fire('pointercancel'); stage.fire('pointerup', { ...touch, clientX: 80 }); assert.equal(controller.snapshot().chapter, 4)
stage.fire('pointerdown', { ...touch, isPrimary: false }); stage.fire('pointerup', { ...touch, clientX: 80 }); assert.equal(controller.snapshot().chapter, 4)
stage.fire('pointerdown', { ...touch, target: { closest: () => ({ tagName: 'A' }) } }); stage.fire('pointerup', { ...touch, clientX: 80 }); assert.equal(controller.snapshot().chapter, 4)

// The date slider changes the workbench, open milestone and accessible range value together.
slider.value = '6'; slider.fire('input'); assert.equal(controller.snapshot().milestone, 6); assert(timeSteps[1].disabled)
assert.equal(milestones.filter(i => i.querySelector('details').open).length, 1)
assert(plates[6].classList.contains('is-current')); assert(slider.attributes.get('aria-valuetext').includes(homeTimeline[6].title.zh))
timeSteps[0].fire('click'); assert.equal(controller.snapshot().milestone, 5)
expand.fire('click'); assert(milestones.every(i => i.querySelector('details').open)); assert.equal(controller.snapshot().milestone, 5)
collapse.fire('click'); assert(milestones.every(i => !i.querySelector('details').open)); assert.equal(controller.snapshot().milestone, 5)
milestones[2].fire('pointerenter', { pointerType: 'mouse' }); assert.equal(controller.snapshot().milestone, 2)
milestones[1].fire('focusin'); assert.equal(controller.snapshot().milestone, 1)
views[0].fire('click'); assert(!art.hidden && notes.hidden); assert.equal(controller.snapshot().notes, false)
views[1].fire('click'); assert(art.hidden && !notes.hidden)

// Enlarged pictures use the stable app root, prevent stacked dialogs and restore entry focus.
photo.fire('click'); const dialog = root.child; assert(dialog.open && dialog.innerHTML.includes('R02_KITCHEN.webp'))
workbenchOpen.fire('click'); assert.equal(root.child, dialog)
dialog.fire('click', { clientX: 0, clientY: -1 }); assert(dialog.removed && photo.focuses === 1)
workbenchOpen.fire('click'); assert(root.child.innerHTML.includes(homeTimeline[1].art + '.webp'))
root.child.querySelector('[data-home-image-close]').fire('click'); assert.equal(workbenchOpen.focuses, 1)

// Reading and pointer updates coalesce; quiet mode disables all dynamic transforms.
page.scrollTop = 600; page.fire('scroll'); page.fire('scroll'); assert.equal(frames.size, 1); flush()
assert(header.classList.contains('is-scrolled')); assert.equal(bar.style.transform, 'scaleX(0.4)')
hero.fire('pointermove', { pointerType: 'mouse', clientX: 1010, clientY: 500 }); flush(); assert.equal(hero.style['--home-x'], '7px')
motion.matches = true; motion.fire('change'); flush(); assert(!page.classList.contains('has-motion')); assert(observers[0].disconnected)
assert(reveals.every(node => node.classList.contains('is-visible')))
hero.fire('pointermove', { pointerType: 'mouse', clientX: 1010, clientY: 500 }); flush(); assert.equal(hero.style['--home-x'], '0px')
assert.equal(hero.style['--home-shift'], '0px')
assert(!anchor.fire('click', { ctrlKey: true }).prevented, 'modified links retain native navigation')
assert(anchor.fire('click').prevented); assert.equal(page.lastScroll.behavior, 'auto')
const snapshot = controller.snapshot(); photo.fire('click'); const closing = root.child
page.fire('scroll'); controller.dispose(); assert(closing.removed && !closing.open); assert.equal(frames.size, 0)
const after = controller.snapshot(); tabs[0].fire('click'); people[1].fire('click'); hello.fire('click')
assert.deepEqual(controller.snapshot(), after, 'disposed pages have no interactive callbacks')
assert.equal([...window.events.values()].reduce((n, s) => n + s.size, 0), 0)
assert.equal([...document.events.values()].reduce((n, s) => n + s.size, 0), 0)
const restored = mountHomePage(root, 'en', snapshot); flush(); assert.deepEqual(restored.snapshot(), snapshot); restored.dispose()
assert.equal(writes, 0); assert.equal(plays, 0)
const main = readFileSync('src/main.ts', 'utf8')
assert(main.includes('homeSnapshot = homeController.snapshot()') && main.includes('homeController.dispose()'))
assert(main.includes('renderHomePage(preferredLanguage, statuses, homeSnapshot.chapter, homeSnapshot)'))
console.log('Home checks passed: bilingual entrances, spoiler-free assets, cards, swipes, timeline, dialogs, quiet mode, cleanup and read-only snapshots.')
