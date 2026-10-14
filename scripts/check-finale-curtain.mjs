import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tsModuleUrl } from './ts-module.mjs'
const { createFinaleCurtainSequence, showFinaleCurtain } = await import(tsModuleUrl('src/finale-curtain.ts'))

function fakeClock() {
  let now = 0, nextId = 0
  const pending = new Map()
  return {
    setTimeout(callback, delay) { const id = ++nextId; pending.set(id, { callback, at: now + delay }); return id },
    clearTimeout(id) { pending.delete(id) },
    tick(time) {
      const target = now + time
      while (true) {
        const next = [...pending.entries()].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        now = next[1].at; pending.delete(next[0]); next[1].callback()
      }
      now = target
    },
    get pending() { return pending.size },
  }
}
for (const reduced of [false, true]) {
  const clock = fakeClock(), phases = []
  let returns = 0
  const sequence = createFinaleCurtainSequence(phase => phases.push(phase), () => returns++, reduced, clock)
  sequence.finish(); sequence.finish()
  assert.equal(returns, 0, 'Repeated advance cannot skip the black fade')
  clock.tick(reduced ? 500 : 3200)
  assert.deepEqual(phases, ['fade', 'title'])
  sequence.finish(); assert.equal(returns, 0, 'Title alone is not a return prompt')
  clock.tick(reduced ? 500 : 1100)
  assert.equal(phases.at(-1), 'end')
  sequence.finish(); assert.equal(returns, 0, 'THE END must remain on screen')
  clock.tick(reduced ? 1400 : 2200)
  assert.equal(phases.at(-1), 'ready')
  assert.equal(returns, 0, 'The website does not return automatically')
  sequence.finish(); sequence.finish()
  assert.equal(returns, 1, 'One user return produces one navigation')
  assert.equal(clock.pending, 0)
}
const abandoned = fakeClock(), phases = []
const canceled = createFinaleCurtainSequence(phase => phases.push(phase), () => assert.fail('Disposed sequence navigated'), false, abandoned)
canceled.dispose(); abandoned.tick(10000); canceled.finish()
assert.deepEqual(phases, ['fade']); assert.equal(abandoned.pending, 0)

// Exercise the real modal adapter with a fake DOM and clock, without a browser.
const clock = fakeClock()
const realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout
globalThis.setTimeout = clock.setTimeout
globalThis.clearTimeout = clock.clearTimeout
try {
  function element() {
    const events = new Map()
    return { dataset: {}, classList: { add() {} }, textContent: '', disabled: true, focuses: 0,
      setAttribute(name, value) { this[name] = value },
      addEventListener(name, callback) { events.set(name, callback) },
      dispatch(name, values = {}) { let prevented = false; events.get(name)?.({ target: this, preventDefault() { prevented = true }, ...values }); return prevented },
      focus() { this.focuses++ },
      showModal() { this.open = true }, close() { this.open = false }, remove() { this.removed = true },
    }
  }
  const title = element(), end = element(), button = element(), dialog = element()
  dialog.querySelector = selector => ({ h1: title, p: end, button })[selector]
  const root = { ownerDocument: { createElement: () => dialog, defaultView: { matchMedia: () => ({ matches: false }) } }, append(child) { assert.equal(child, dialog) } }
  let returns = 0
  const curtain = showFinaleCurtain(root, 'zh', () => returns++)
  assert.equal(dialog.open, true)
  assert.equal(title.textContent, '奶之崛起：终章'); assert.equal(end.textContent, '完')
  assert.equal(dialog.lang, 'zh-CN')
  assert.equal(dialog.dispatch('cancel'), true); assert.equal(returns, 0)
  button.dispatch('click'); assert.equal(returns, 0)
  assert(dialog.dispatch('keydown', { key: 'Enter', repeat: false }))
  curtain.setLanguage('en'); assert.equal(end.textContent, 'THE END'); assert.equal(dialog.lang, 'en')
  clock.tick(6500)
  assert.equal(button.disabled, false); assert.equal(button.focuses, 1)
  assert(dialog.dispatch('keydown', { key: 'Enter', repeat: true, target: button }))
  assert.equal(returns, 0, 'A held advance key cannot navigate')
  button.dispatch('click'); assert.equal(returns, 1)
  assert.equal(dialog.open, false); assert.equal(dialog.removed, true)
  button.dispatch('click'); assert.equal(returns, 1)
  curtain.dispose(); assert.equal(clock.pending, 0)
  const disposable = showFinaleCurtain(root, 'zh', () => assert.fail('Unmounted curtain navigated'))
  disposable.dispose(); clock.tick(10000)
  assert.equal(clock.pending, 0)
} finally {
  globalThis.setTimeout = realSet; globalThis.clearTimeout = realClear
}
const source = readFileSync('src/finale.ts', 'utf8')
assert(source.includes('curtain = showFinaleCurtain(root, language, () => onBack(language))'))
assert(source.includes('if (disposed || curtain) return'), 'Visibility changes cannot restart BGM behind closing titles')
assert(source.includes('curtain?.dispose()'), 'Unmount cancels the final sequence')
const css = readFileSync('src/finale-curtain.css', 'utf8')
assert(css.includes('prefers-reduced-motion') && css.includes('safe-area-inset-bottom'))
console.log('Finale curtain OK: staged fade/title/end/pause, explicit single return, early Escape/Enter/click protection, held keys, language changes and unmount cleanup.')
