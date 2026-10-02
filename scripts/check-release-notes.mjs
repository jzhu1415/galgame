import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const js = ts.transpileModule(readFileSync('src/release-notes.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
let loadCount = 0
const freshModule = () => import(`data:text/javascript;base64,${Buffer.from(`${js}\n// fresh session ${++loadCount}`).toString('base64')}`)
const storage = new Map([['naiwa-origin-save-v1', '{"sceneId":"home"}'], ['naiwa-chapter-three-v1', '{"node":"invitation"}']])
const writes = []
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes.push(key); storage.set(key, value) } }
let focuses = 0
globalThis.document = {
  activeElement: { isConnected: true, focus: () => focuses++ },
  createElement: () => {
    const listeners = new Map()
    const buttons = [0, 1].map(() => {
      const button = { addEventListener: (_event, callback) => { button.click = callback } }
      return button
    })
    return {
      open: false, removed: false, innerHTML: '',
      setAttribute() {}, querySelectorAll: () => buttons,
      addEventListener: (event, callback) => listeners.set(event, callback),
      getBoundingClientRect: () => ({ left: 10, top: 10, right: 100, bottom: 100 }),
      showModal() { this.open = true },
      close() { this.open = false; listeners.get('close')?.() },
      remove() { this.removed = true },
      clickAt(x, y) { listeners.get('click')({ target: this, clientX: x, clientY: y }) },
      buttons,
    }
  },
}
let current = null
const root = { append: dialog => { current = dialog }, querySelector: () => current?.open ? current : null }
let notes = await freshModule()
for (const language of ['zh', 'en']) {
  const content = notes.renderReleaseNotes(language)
  assert.equal((content.match(/<li>/g) ?? []).length, 5)
  for (const item of notes.latestRelease.items) assert(content.includes(item.title[language]) && content.includes(item.body[language]))
}
const savesBefore = [...storage.entries()]
assert(notes.shouldShowReleaseNotes(), 'first visit shows the new release')
const first = notes.showReleaseNotes(root, 'zh', true)
assert(first.open && first.innerHTML.includes('更新内容'))
assert.deepEqual([...storage.entries()], savesBefore, 'opening notes does not mark them read or alter game saves')
assert.equal(notes.showReleaseNotes(root, 'en'), null, 'other modal must close before notes can open')
first.clickAt(50, 50)
assert(first.open, 'clicking dialog padding must not dismiss the notes')
first.clickAt(0, 0)
assert(first.removed && !first.open, 'clicking the backdrop closes the dialog')
assert.equal(focuses, 1, 'closing restores the previous focus')
assert.equal(storage.get(notes.releaseSeenKey), notes.latestRelease.id)
assert(!notes.shouldShowReleaseNotes())
assert.equal(notes.showReleaseNotes(root, 'zh', true), null, 'same session does not repeat automatic notes')
notes = await freshModule()
assert(!notes.shouldShowReleaseNotes(), 'same version stays read after a reload')
const manual = notes.showReleaseNotes(root, 'en')
assert(manual.open && manual.innerHTML.includes('What’s new'), 'manual entry works even after reading')
manual.buttons[0].click()
assert(manual.removed)
storage.set(notes.releaseSeenKey, 'older-release')
notes = await freshModule()
assert(notes.shouldShowReleaseNotes(), 'a newly published release is shown to existing players')
notes.showReleaseNotes(root, 'zh', true).close() // Native Escape cancellation also dispatches close.
assert(writes.every(key => key === notes.releaseSeenKey), 'notes only write their own acknowledgement key')
for (const [key, value] of savesBefore) assert.equal(storage.get(key), value, 'existing saves remain intact')
globalThis.localStorage = { getItem() { throw new Error('storage blocked') }, setItem() { throw new Error('storage blocked') } }
notes = await freshModule()
assert(notes.shouldShowReleaseNotes())
notes.showReleaseNotes(root, 'en', true).close()
assert(!notes.shouldShowReleaseNotes(), 'blocked storage still remembers dismissal for this session')
assert.equal(notes.showReleaseNotes(root, 'en', true), null)
const main = readFileSync('src/main.ts', 'utf8')
assert(main.includes('showReleaseNotes(root, preferredLanguage, true)'))
assert.equal((main.match(/id="release-entry"/g) ?? []).length, 2, 'home and chapter details both keep a manual entry')
console.log('Update notes OK: both languages, first visit/new version/reload/manual entry, modal isolation, backdrop bounds, focus restoration, blocked storage fallback; game saves unchanged.')
