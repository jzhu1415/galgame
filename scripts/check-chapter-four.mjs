import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { compile, moduleUrl, tsModuleUrl } from './ts-module.mjs'
const state = await import(tsModuleUrl('src/chapter-four-story.ts'))
const progressApi = await import(tsModuleUrl('src/chapter-four-progress.ts'))
const map = await import(tsModuleUrl('src/chapter-four-map.ts'))
const { gildedStory, gildedSaveKey, gildedProgressKey, newGildedSave, normalizeGildedSave, advanceGilded, applyGildedChoice, newGildedPuzzle, placeGildedPiece, finishGildedFilm, isGildedPuzzleComplete } = state
const { newGildedProgress, recordGildedCheckpoint, normalizeGildedProgress, restartGildedFrom } = progressApi
assert.deepEqual(new Set(Object.keys(gildedStory)), new Set(Object.keys(map.gildedMapNodes)))
for (const [id, node] of Object.entries(gildedStory)) {
  for (const language of ['zh', 'en']) {
    assert(node.title[language])
    for (const line of node.lines) assert(line.text[language] && state.gildedSpeakers[line.speaker][language])
    for (const choice of node.choices ?? []) assert(choice.text[language] && choice.detail[language])
  }
  if (node.next) assert(Object.hasOwn(gildedStory, node.next), `${id}: valid next`)
  for (const choice of node.choices ?? []) assert(Object.hasOwn(gildedStory, choice.next))
}
for (const link of map.gildedMapLinks()) assert(map.gildedMapNodes[link.from] && map.gildedMapNodes[link.to])
for (const [from, to] of [['gallery', 'puzzle'], ['puzzle', 'film'], ['film', 'confrontation'], ['trial', 'tightening'], ['tightening', 'trial'], ['report-kept', 'gallery'], ['report-burnt', 'gallery'], ['trial', 'exhausted']]) assert(map.gildedMapLinks().some(link => link.from === from && link.to === to), `map includes ${from} → ${to}`)
const visuals = await import(tsModuleUrl('src/chapter-four-visuals.ts'))
const { gildedVisuals, gildedShots, gildedShotFor, gildedVisualSrc, gildedJournalPaintings } = visuals
assert.deepEqual(new Set(Object.keys(gildedShots)), new Set(Object.keys(gildedStory)), 'all nodes have storyboard coverage')
const { gildedEndingDissolve } = await import(tsModuleUrl('src/chapter-four-ending.ts'))
const shown = new Set(['mural', 'assembled', gildedEndingDissolve.to]) // The epilogue adds its matched reality frame.
assert.equal(gildedShots[gildedEndingDissolve.node][gildedEndingDissolve.line], gildedEndingDissolve.from)
assert.equal(gildedVisuals.bedside.position, gildedVisuals.bedsideReality.position, 'matched frames share the same crop')
for (const [id, node] of Object.entries(gildedStory)) {
  assert.equal(gildedShots[id].length, Math.max(1, node.lines.length), `${id}: each line has a shot`)
  for (const shot of gildedShots[id]) { assert(Object.hasOwn(gildedVisuals, shot)); shown.add(shot) }
  for (let line = 0; line < Math.max(1, node.lines.length); line++) {
    const s = { ...newGildedSave(), node: id, line }
    const before = JSON.stringify(s)
    assert.equal(gildedShotFor(s), gildedShots[id][line])
    assert.equal(JSON.stringify(s), before, 'reading the storyboard never changes progress')
  }
}
assert.equal(gildedShotFor({ ...newGildedSave(), node: '__proto__' }), 'threshold')
assert.deepEqual(shown, new Set(Object.keys(gildedVisuals)), 'every generated shot is used')
assert.equal(new Set(gildedShots.welcome).size, 6, 'the introduction has several camera distances')
assert(gildedShots.confrontation.includes('gauntlet'))
for(const id of ['window','cup','key']) assert(!Object.hasOwn(gildedVisuals,id),'old three-picture object photos are no longer available in the chapter')
assert.equal(gildedVisuals.gallery.file,'chapter-04-puzzle-gallery')
for(const id of ['free','bound','exhausted']) assert.equal(new Set(gildedShots[id]).size,gildedStory[id].lines.length,`${id}: each ending line uses a different shot`)
const journalStart=newGildedSave(), journalBefore=JSON.stringify(journalStart)
assert.deepEqual(gildedJournalPaintings(journalStart),[])
assert.equal(JSON.stringify(journalStart),journalBefore,'reading the album never changes the save')
assert.deepEqual(gildedJournalPaintings({...journalStart,visited:['gallery']}),['gallery','pieces'])
assert.deepEqual(gildedJournalPaintings({...journalStart,visited:['gallery'],puzzle:{order:Array.from({length:12},(_,i)=>i),placed:Array.from({length:12},(_,i)=>i)}}),['gallery','pieces','assembled'])
for (const [id, v] of Object.entries(gildedVisuals)) {
  assert(v.alt.zh && v.alt.en)
  assert.equal(gildedVisualSrc(id), `/images/${v.file}.webp`)
  for (const [folder, ext] of [['assets/images', 'png'], ['public/images', 'webp']]) assert(existsSync(`${folder}/${v.file}.${ext}`))
}
const records = JSON.parse(readFileSync('docs/chapter-04-image-prompts.json', 'utf8'))
assert.equal(records.assets.length, 24)
assert.deepEqual(new Set(records.assets.filter(asset => asset.status !== 'superseded').map(asset => asset.id)), new Set(Object.values(gildedVisuals).map(v => v.file)))
for (const asset of records.assets) { assert(asset.prompt && asset.review); for (const reference of asset.references) assert(existsSync(reference.path) && reference.purpose) }
for (const asset of records.assets.filter(a => /naishen-(welcome|guarded|vulnerable|relieved)|thread-(grip|release)/.test(a.id))) assert(asset.references.some(r => r.path === 'references/naishen-character-turnaround.png'), 'each character close-up has the original identity reference')
assert(records.assets.find(a => a.id === 'chapter-04-naishen-mural').references.some(r => r.path === 'references/naishen-supplied-mural.png'))

let save, progress
const begin = () => { save = newGildedSave(); progress = recordGildedCheckpoint(newGildedProgress(), save, true) }
const update = next => {
  if (next.node !== save.node) progress = recordGildedCheckpoint(progress, next, true)
  save = next
  assert.deepEqual(normalizeGildedSave(JSON.parse(JSON.stringify(save))), save, `reload must preserve ${save.node}`)
}
const finishLines = () => { let guard = 0; while (save.line < gildedStory[save.node].lines.length - 1 && guard++ < 50) update(advanceGilded(save)) }
const flowTo = node => { let guard = 0; while (save.node !== node && guard++ < 50) { const previous = save; update(advanceGilded(save)); assert.notEqual(save, previous, `blocked while moving toward ${node}`) }; assert.equal(save.node, node) }
const choose = id => { finishLines(); update(applyGildedChoice(save, id)) }
const allPieces = Array.from({ length: 12 }, (_, i) => i)
for (const rng of [() => 0, () => .5, () => .9999]) {
  const puzzle = newGildedPuzzle(rng)
  assert.deepEqual([...puzzle.order].sort((a,b) => a-b), allPieces)
  assert.notDeepEqual(puzzle.order, allPieces, 'pieces start shuffled')
}
let routes = 0
for (const order of [allPieces, [...allPieces].reverse(), newGildedPuzzle(() => .5).order]) for (const report of ['keep-report', 'burn-report', null]) for (const forces of [0, 1, 3]) {
  begin(); flowTo('gallery')
  assert.equal(applyGildedChoice(save, 'start-puzzle'), save, 'finish the introductory lines first')
  if (report) { choose('read-report'); choose(report); flowTo('gallery') }
  choose('start-puzzle'); assert.equal(save.node, 'puzzle')
  assert.equal(advanceGilded(save), save); assert.equal(finishGildedFilm(save), save)
  const startSpirit = save.spirit
  for (const [index, piece] of order.entries()) {
    assert.equal(placeGildedPiece(save, piece, (piece+1)%12), save, 'wrong positions have no cost or progress')
    assert.equal(placeGildedPiece(save, -1, -1), save)
    update(placeGildedPiece(save, piece, piece))
    assert.equal(save.puzzle.placed.length, index+1)
    assert.equal(save.spirit, startSpirit)
    assert.equal(placeGildedPiece(save, piece, piece), save, 'repeat placements never count twice')
    if (index<11) assert.equal(save.node, 'puzzle'); else assert.equal(save.node, 'film', 'last placement immediately enters the video')
  }
  assert(isGildedPuzzleComplete(save)); assert(!save.filmSeen)
  assert.equal(advanceGilded(save), save, 'Space cannot bypass video controls')
  update(finishGildedFilm(save)); assert(save.filmSeen); assert.equal(save.node, 'confrontation')
  assert.equal(finishGildedFilm(save), save, 'a stale video button cannot advance again')
  flowTo('trial')
  for(let i=0; i<forces; i++) { choose('force'); assert.equal(save.node, 'tightening'); flowTo('trial') }
  choose('talk'); choose('honest'); flowTo('free'); finishLines()
  assert(save.endings.includes('free')); assert.equal(save.spirit, 80-forces*20)
  assert.equal(save.reportKept, report === null ? null : report === 'keep-report')
  const normalized = normalizeGildedProgress(JSON.parse(JSON.stringify(progress)))
  assert(normalized.checkpoints.free)
  const replay = restartGildedFrom(normalized, 'puzzle')
  assert.equal(replay.line, 0); assert.equal(replay.spirit, 80); assert(!replay.filmSeen)
  assert.deepEqual(replay.puzzle.placed, []); assert.deepEqual(replay.puzzle.order, save.puzzle.order)
  assert(replay.endings.includes('free'))
  replay.puzzle.order.reverse(); replay.puzzle.placed.push(0)
  assert.deepEqual(normalized.checkpoints.puzzle.puzzle.order, save.puzzle.order, 'replays deep-clone snapshots')
  assert.deepEqual(normalized.checkpoints.puzzle.puzzle.placed, [])
  const filmReplay = restartGildedFrom(normalized, 'film')
  assert.equal(filmReplay.node, 'film'); assert(isGildedPuzzleComplete(filmReplay)); assert(!filmReplay.filmSeen)
  const trialReplay = restartGildedFrom(normalized, 'trial')
  assert.equal(trialReplay.spirit, 80, 'return loops never overwrite the first trial checkpoint')
  assert(trialReplay.filmSeen)
  routes++
}
const completeToTrial = () => { begin(); flowTo('gallery'); choose('start-puzzle'); for (const id of allPieces) update(placeGildedPiece(save, id, id)); update(finishGildedFilm(save)); flowTo('trial') }
for (const stay of ['stay', 'forever']) {
  completeToTrial(); if (stay === 'forever') choose('talk'); choose(stay)
  assert.equal(save.node, 'bound'); assert(save.endings.includes('bound')); finishLines()
}
completeToTrial()
for(let i=0; i<4; i++) { choose('force'); if(i<3) flowTo('trial') }
assert.equal(save.node, 'exhausted'); assert.equal(save.spirit, 0); assert(save.endings.includes('exhausted')); finishLines()
const firstTrial = restartGildedFrom(progress, 'trial'); assert.equal(firstTrial.spirit, 80)
for (const node of ['film', 'confrontation', 'trial', 'permission', 'release', 'free', 'bound']) {
  assert.equal(normalizeGildedSave({ ...newGildedSave(), node }).node, 'puzzle', 'incomplete puzzle blocks later nodes')
  assert.equal(normalizeGildedSave({ ...newGildedSave(), node, puzzle: { order: allPieces, placed: allPieces } }).node, 'film', 'finished puzzle still passes through video')
}
for (const node of ['__proto__', 'toString', 'missing']) assert.equal(normalizeGildedSave({ ...newGildedSave(), node }).node, 'threshold')
const invalidPieces = normalizeGildedSave({ ...newGildedSave(), node:'puzzle', puzzle:{order:[0,0],placed:[1,1,-1,12,2.5,'2']} })
assert.deepEqual(invalidPieces.puzzle.placed,[1]); assert.equal(new Set(invalidPieces.puzzle.order).size,12)
const legacyRaw = { version:1, node:'loom', spirit:44, evidence:['window','cup','door'], visited:['threshold','gallery','loom','free'], endings:['free'], checkpoints:{} }
const migrated = normalizeGildedSave(legacyRaw)
assert.equal(migrated.node,'gallery'); assert.equal(migrated.line,0); assert.equal(migrated.spirit,44)
assert.deepEqual(migrated.puzzle.placed,[]); assert(!migrated.filmSeen); assert(migrated.endings.includes('free'))
const migratedProgress = normalizeGildedProgress({version:1, visited:legacyRaw.visited, endings:['free'], checkpoints:{gallery:{node:'gallery',spirit:80,evidence:[]}}})
assert.equal(restartGildedFrom(migratedProgress,'gallery'),null,'old mechanics cannot fabricate new replay snapshots')
const legacy = { ...newGildedSave(), node: 'gallery', visited: ['threshold', 'welcome', 'gallery'] }
const oldProgress = recordGildedCheckpoint(newGildedProgress(), legacy, false)
assert.equal(restartGildedFrom(oldProgress, 'gallery'), null, 'historical visits never invent snapshots')
for (const lang of ['zh', 'en']) {
  const html = map.renderGildedMindMap(legacy, oldProgress, lang)
  assert(html.includes('map-viewport') && html.includes('map-lines') && html.includes('ending-gallery'))
  assert(html.includes(lang === 'zh' ? '重访后可回放' : 'Revisit to enable replay'))
  assert(html.includes('data-route="gallery" disabled') && html.includes('aria-current="step"'))
}
const badProgress=normalizeGildedProgress({version:2,visited:['free'],endings:[],checkpoints:{free:{node:'free',spirit:80,puzzle:{order:allPieces,placed:[]},filmSeen:true,reportKept:null}}})
assert.equal(restartGildedFrom(badProgress,'free'),null,'invalid saved snapshots cannot bypass puzzle gates')

// Read-only preview harness: no game controller or browser required.
const storage = new Map(); let writes = 0, confirmations = 0, plays = 0, dialog, confirmCallback
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes++; storage.set(key, value) } }
globalThis.fourMap = (_root, language, currentSave, currentProgress, select) => dialog = { html: map.renderGildedMindMap(currentSave, currentProgress, language), select, closed: false, close() { this.closed = true } }
globalThis.fourConfirm = (_root, _message, _language, callback) => { confirmations++; confirmCallback = callback }
const strip = js => js.replace(/^import .*;\n/gm, '')
const four = await import(moduleUrl(`const browserStorage = globalThis.localStorage; const showGildedStoryMap = globalThis.fourMap; const confirmInApp = globalThis.fourConfirm; const { ${Object.keys(state).join(', ')} } = await import(${JSON.stringify(tsModuleUrl('src/chapter-four-story.ts'))}); const { ${Object.keys(progressApi).join(', ')} } = await import(${JSON.stringify(tsModuleUrl('src/chapter-four-progress.ts'))});\n${strip(compile('src/chapter-four.ts'))}`))
for (const language of ['zh', 'en']) {
  storage.clear(); writes = 0; confirmations = 0; plays = 0
  four.previewChapterFourRoutes({}, language, () => plays++)
  dialog.select('free'); assert.equal(confirmations, 0); assert.equal(writes, 0); dialog.close(); assert.equal(plays, 0)
  storage.set(gildedSaveKey, JSON.stringify(legacy)); writes = 0
  four.previewChapterFourRoutes({}, language, () => plays++); dialog.select('gallery'); assert.equal(confirmations, 0); assert.equal(writes, 0)
  const enteredProgress = recordGildedCheckpoint(newGildedProgress(), newGildedSave(), true)
  storage.set(gildedProgressKey, JSON.stringify(enteredProgress)); writes = 0
  four.previewChapterFourRoutes({}, language, () => plays++); dialog.select('threshold'); assert.equal(confirmations, 1); assert.equal(writes, 0); assert.equal(plays, 0)
  confirmCallback = null // Cancel keeps story and preview intact.
  assert(!dialog.closed)
  dialog.select('threshold'); confirmCallback(); assert(dialog.closed); assert.equal(plays, 1); assert.equal(writes, 1)
  const replay = JSON.parse(storage.get(gildedSaveKey)); assert.equal(replay.node, 'threshold'); assert.equal(replay.line, 0); assert.deepEqual(replay.puzzle.placed, [])
}
storage.clear()
const legacyProgressRaw = {version:1, visited:legacyRaw.visited, endings:['free'], checkpoints:{gallery:{node:'gallery',spirit:80,evidence:[]}}}
storage.set(gildedSaveKey,JSON.stringify(legacyRaw)); storage.set(gildedProgressKey,JSON.stringify(legacyProgressRaw)); writes=0; confirmations=0
four.previewChapterFourRoutes({},'zh',()=>plays++)
dialog.select('gallery'); dialog.close()
assert.equal(writes,0); assert.equal(confirmations,0,'legacy preview cannot migrate storage or invent a replay')
four.resetChapterFour()
assert.deepEqual(JSON.parse(storage.get(state.gildedLegacySaveKey)),legacyRaw,'actual entry preserves the original old save')
assert.deepEqual(JSON.parse(storage.get(state.gildedLegacyProgressKey)),legacyProgressRaw,'old snapshots remain in the backup')
assert(JSON.parse(storage.get(gildedSaveKey)).endings.includes('free'))
const backups=[storage.get(state.gildedLegacySaveKey),storage.get(state.gildedLegacyProgressKey)]
four.resetChapterFour()
assert.deepEqual([storage.get(state.gildedLegacySaveKey),storage.get(state.gildedLegacyProgressKey)],backups,'restarts never overwrite the original backups')
// Native artwork viewer: full composition, modal isolation and focus; no save writes.
const { showGildedArtwork } = await import(tsModuleUrl('src/chapter-four-artwork.ts'))
let currentArt = null, focuses = 0
const documentMock = {
  activeElement: { isConnected: true, focus: () => focuses++ },
  createElement() {
    const listeners = new Map(), attrs = new Map()
    const closeButton = { addEventListener: (_name, handler) => { closeButton.click = handler } }
    return {
      open: false, removed: false, innerHTML: '', attrs, closeButton,
      setAttribute: (name, value) => attrs.set(name, value), querySelector: () => closeButton,
      addEventListener: (name, handler) => listeners.set(name, handler),
      getBoundingClientRect: () => ({ left: 10, top: 10, right: 100, bottom: 100 }),
      showModal() { this.open = true }, close() { this.open = false; listeners.get('close')?.() },
      remove() { this.removed = true }, clickAt(x, y) { listeners.get('click')({ target: this, clientX: x, clientY: y }) },
    }
  },
}
const artRoot = { ownerDocument: documentMock, querySelector: () => currentArt?.open ? currentArt : null, append: d => { currentArt = d } }
const savesBeforeArt = [...storage.entries()], writesBeforeArt = writes
for (const language of ['zh', 'en']) {
  const mural = showGildedArtwork(artRoot, language, 'mural')
  assert(mural.open && mural.innerHTML.includes(gildedVisualSrc('mural')))
  assert(mural.innerHTML.includes(gildedVisuals.mural.alt[language]))
  assert.equal(mural.attrs.get('aria-labelledby'), 'gilded-art-title')
  assert.equal(showGildedArtwork(artRoot, language, 'welcome'), null, 'do not stack art modals')
  mural.clickAt(50, 50); assert(mural.open, 'dialog padding does not dismiss the painting')
  mural.clickAt(0, 0); assert(mural.removed && !mural.open)
  const current = showGildedArtwork(artRoot, language, 'gauntlet')
  assert(current.innerHTML.includes(gildedVisualSrc('gauntlet')))
  current.closeButton.click(); assert(current.removed)
  showGildedArtwork(artRoot, language, 'relieved').close() // Native Esc dispatches close.
}
assert.equal(focuses, 6)
assert.deepEqual([...storage.entries()], savesBeforeArt)
assert.equal(writes, writesBeforeArt, 'viewing and closing artwork never write progress')
console.log(`Chapter four OK: ${Object.keys(gildedStory).length} bilingual nodes, ${routes} full routes, 3 endings, 20 current paintings, 6 new ending images including the CG dissolve, per-line storyboard, read-only art modals, jigsaw, video transition, reloads, gates, legacy migration, previews and first-arrival replay.`)
