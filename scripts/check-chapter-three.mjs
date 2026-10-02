import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('src/chapter-three-story.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { theatreStory: story, newTheatreSave, normalizeTheatreSave: restore, advanceTheatre: advance, applyTheatreChoice: choose, openTheatreLocation: open } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const storyUrl = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
const visualJs = ts.transpileModule(readFileSync('src/chapter-three-visuals.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/(['"])\.\/chapter-three-story\1/g, JSON.stringify(storyUrl))
const { chapterThreeVisual, chapterThreeVisualCues, chapterThreeNewScenes, naifenExpressions } = await import(`data:text/javascript;base64,${Buffer.from(visualJs).toString('base64')}`)
const progressJs = ts.transpileModule(readFileSync('src/chapter-three-progress.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/(['"])\.\/chapter-three-story\1/g, JSON.stringify(storyUrl))
const { newTheatreProgress, normalizeTheatreProgress, recordTheatreCheckpoint, restartTheatreFrom } = await import(`data:text/javascript;base64,${Buffer.from(progressJs).toString('base64')}`)
const canvasJs = ts.transpileModule(readFileSync('src/story-map.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const canvasUrl = `data:text/javascript;base64,${Buffer.from(canvasJs).toString('base64')}`
const mapJs = ts.transpileModule(readFileSync('src/chapter-three-map.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/(['"])\.\/chapter-three-story\1/g, JSON.stringify(storyUrl)).replace(/(['"])\.\/story-map\1/g, JSON.stringify(canvasUrl))
const { theatreMapNodes, theatreMapWidth, theatreMapHeight, theatreMapLinks, renderTheatreMindMap } = await import(`data:text/javascript;base64,${Buffer.from(mapJs).toString('base64')}`)
let capture = null
const usedScenes = new Set()
const usedExpressions = new Set()
const assets = { hospital: 'chapter-02-hospital', theatre: 'chapter-03-theatre', rain: 'P02', breakfast: 'R02_KITCHEN', film: 'chapter-02-crash-memory', backstage: 'chapter-03-theatre' }
const speakers = new Set(['narrator', 'naifen', 'naiba', 'researcher', 'journal', 'me'])
for (const [id, node] of Object.entries(story)) {
  assert(node.title.zh && node.title.en, `${id}: missing bilingual title`)
  assert(existsSync(`public/images/${assets[node.art]}.webp`), `${id}: missing background`)
  assert(node.map || node.lines.length, `${id}: no dialogue`)
  assert(node.map || node.ending || node.next || node.choices?.length, `${id}: dead end`)
  for (const line of node.lines) {
    assert(speakers.has(line.speaker), `${id}: unknown speaker`)
    assert(line.text.zh.trim() && line.text.en.trim(), `${id}: missing translation`)
    assert(!/第二人格|second personality|alter ego/i.test(line.text.zh + line.text.en), `${id}: premature identity reveal`)
  }
  let previousCue = -1
  for (const cue of chapterThreeVisualCues[id] ?? []) {
    assert(cue.at > previousCue && cue.at >= 0 && (node.map ? cue.at === 0 : cue.at < node.lines.length), `${id}: invalid or unordered shot cue`)
    previousCue = cue.at
  }
  for (let index = 0; index < Math.max(1, node.lines.length); index++) {
    const visual = chapterThreeVisual(id, index)
    assert(existsSync(`public/images/${visual.background}.webp`), `${id}/${index}: missing storyboard image`)
    assert(Object.hasOwn(naifenExpressions, visual.expression), `${id}/${index}: invalid expression`)
    if (visual.showCharacter) usedExpressions.add(visual.expression)
    usedScenes.add(visual.background)
    assert.deepEqual(chapterThreeVisual(id, index), visual, 'Resuming the same line must select the same shot')
  }
  if (node.next) assert(story[node.next], `${id}: invalid next node`)
  for (const choice of node.choices ?? []) {
    assert(story[choice.next], `${id}: invalid branch`)
    assert(choice.text.zh && choice.text.en && choice.detail.zh && choice.detail.en, `${id}: untranslated choice`)
  }
}
for (const name of ['naiwa-speech', 'naiwa-short-reply', 'character-voice-03', 'character-voice-04']) assert(existsSync(`public/audio/${name}.m4a`))
assert(existsSync('public/images/chapter-03-naifen.webp'))
for (const expression of Object.values(naifenExpressions)) assert(existsSync(`public/images/${expression.image}.webp`), `Missing portrait: ${expression.image}`)
for (const image of chapterThreeNewScenes) assert(usedScenes.has(image), `Generated scene is not wired into the story: ${image}`)
for (const expression of ['angry', 'scared', 'sad', 'guarded', 'relieved', 'happy']) assert(usedExpressions.has(expression), `Unused expression: ${expression}`)
assert.equal(chapterThreeVisual('explore', 0).background, 'chapter-03-theatre', 'Stage markers must retain the original overview')

// Every visited line must survive a save/reload, including the last line before a choice.
function settle(save) {
  for (let i = 0; i < 250; i++) {
    const node = story[save.node]
    capture?.(save)
    const restored = restore(JSON.parse(JSON.stringify(save)))
    assert.deepEqual(restored, save, `${save.node}/${save.line}: reload changed progress`)
    if (node.map || (save.line === node.lines.length - 1 && (node.choices || node.ending))) return save
    save = advance(save)
  }
  throw new Error('Dialogue failed to reach a boundary')
}
function arrived(approach = 'journal') { return settle(choose(settle(newTheatreSave()), approach)) }
function recover(save, order) {
  for (const id of order) {
    save = settle(open(save, id))
    save = settle(choose(save, `${id}-real`))
    assert.equal(save.node, 'explore')
  }
  assert.equal(save.memories.length, 3)
  return save
}
const permutations = [['rain','breakfast','film'], ['rain','film','breakfast'], ['breakfast','rain','film'], ['breakfast','film','rain'], ['film','rain','breakfast'], ['film','breakfast','rain']]
let routes = 0
for (const approach of ['probe', 'journal']) for (const order of permutations) for (const trade of ['real', 'fake']) {
  let routeProgress = newTheatreProgress()
  capture = candidate => { routeProgress = recordTheatreCheckpoint(routeProgress, candidate) }
  let save = recover(arrived(approach), order)
  const before = save.spirit
  save = settle(choose(settle(open(save, order[0])), `${order[0]}-real`))
  assert.equal(save.spirit, before, 'Revisited memory must not farm spirit')
  assert.equal(save.memories.length, 3, 'Recovered memories must remain unique')
  if (trade === 'fake') {
    save = settle(choose(settle(open(save, 'route')), 'route-side'))
    assert(save.routeVerified)
    assert(restore(save).routeVerified)
  }
  save = settle(open(save, 'confrontation'))
  assert.equal(save.node, 'bargain')
  const rejected = choose(save, 'trade-fake')
  if (!save.routeVerified) assert.equal(rejected, save, 'Fake trade must be locked without the map')
  save = settle(choose(save, `trade-${trade}`))
  if (trade === 'fake') {
    assert.equal(save.node, 'comfort')
    save = settle(choose(save, 'comfort-listen'))
  }
  assert.equal(save.node, trade === 'fake' ? 'saved' : 'bargained')
  save = advance(save)
  assert(save.endings.includes(trade === 'fake' ? 'saved' : 'bargained'))
  assert.deepEqual(newTheatreSave(save.endings).endings, save.endings, 'Replay must preserve ending unlocks')
  routeProgress = recordTheatreCheckpoint(routeProgress, save)
  assert.deepEqual(normalizeTheatreProgress(JSON.parse(JSON.stringify(routeProgress))), routeProgress, 'Checkpoint progress must survive reload')
  for (const [id, snapshot] of Object.entries(routeProgress.checkpoints)) {
    const replay = restartTheatreFrom(routeProgress, id)
    assert(replay, `${id}: recorded checkpoint must replay`)
    assert.equal(replay.node, id, `${id}: replay must not redirect past a gate`)
    assert.equal(replay.line, 0)
    assert.equal(replay.history.length, 0)
    for (const field of ['spirit', 'pollution', 'memories', 'routeVerified', 'trade']) assert.deepEqual(replay[field], snapshot[field], `${id}: replay changed ${field}`)
    assert.deepEqual(replay.endings, routeProgress.endings, 'Replay must retain ending unlocks')
  }
  const entry = restartTheatreFrom(routeProgress, 'explore')
  assert.equal(entry.memories.length, 0, 'Early exploration must not inherit later memories')
  assert.equal(entry.routeVerified, false, 'Early exploration must not inherit the decoy route')
  assert.equal(entry.trade, null, 'Early exploration must not inherit a later trade')
  assert.equal(choose({...entry, node:'bargain', line:3}, 'trade-fake').trade, null, 'A replayed early state must not unlock decoy trading')
  assert.deepEqual(recordTheatreCheckpoint(routeProgress, {...entry, spirit:1, pollution:99, memories:['rain'], visited:['explore']}).checkpoints.explore, routeProgress.checkpoints.explore, 'Later visits cannot overwrite the first checkpoint')
  assert.equal(restartTheatreFrom(routeProgress, '__proto__'), null)
  assert.equal(restartTheatreFrom(routeProgress, 'made-up'), null)
  capture = null
  routes++
}
let locked = arrived()
assert.equal(open(locked, 'confrontation'), locked, 'Confrontation must wait for three memories')
assert.equal(choose(locked, 'unknown'), locked)
let detour = arrived()
const initialSpirit = detour.spirit
detour = settle(choose(settle(open(detour, 'route')), 'route-main'))
assert.equal(detour.spirit, initialSpirit - 24)
assert(!detour.routeVerified, 'A trap cannot unlock the decoy route')
detour = settle(choose(settle(open(detour, 'route')), 'route-side'))
detour = recover(detour, ['rain', 'breakfast', 'film'])
detour = settle(open(detour, 'confrontation'))
detour = settle(choose(detour, 'return-stage'))
assert.equal(detour.node, 'explore', 'The bargain must allow a return to investigation')
detour = settle(choose(settle(open(detour, 'confrontation')), 'trade-fake'))
detour = settle(choose(detour, 'comfort-order'))
assert.equal(detour.node, 'comfort', 'An unhelpful response allows another attempt')
assert(detour.spirit > 0)
detour = settle(choose(detour, 'comfort-listen'))
assert.equal(detour.node, 'saved', 'A recovered mistake can still soothe Naifen')
let failing = arrived()
while (failing.spirit > 0) {
  failing = settle(open(failing, 'rain'))
  if (failing.node === 'exhausted') break
  failing = settle(choose(failing, 'rain-fake'))
}
assert.equal(failing.node, 'exhausted')
assert.equal(advance(failing).endings[0], 'exhausted')
assert.deepEqual(restore({version: 1, node: '__proto__'}), newTheatreSave())
assert.equal(restore({...newTheatreSave(), node: 'invitation', line: 6, spirit: 0}).line, 0, 'Failed-save recovery must reset the dialogue index')
assert.equal(restore({...newTheatreSave(), node: 'bargain'}).node, 'explore', 'Incomplete saves cannot skip the memory gate')
assert.equal(restore({...newTheatreSave(), spirit: Infinity}).spirit, 80)
assert.equal(restore({...newTheatreSave(), pollution: -100}).pollution, 0)
assert.equal(restore({...newTheatreSave(), history: [{node:'made-up',line:0}, {node:'rain',line:100}]}).history.length, 0)

// All authored scenes must be reachable through navigation or choices.
const seen = new Set()
const queue = ['invitation']
while (queue.length) {
  const id = queue.shift()
  if (seen.has(id)) continue
  seen.add(id)
  const node = story[id]
  if (node.next) queue.push(node.next)
  for (const choice of node.choices ?? []) queue.push(choice.next)
  if (node.map) queue.push('rain','breakfast','film','route','confrontation')
  if (!node.ending) queue.push('exhausted')
}
assert.equal(seen.size, Object.keys(story).length, 'Unreachable chapter content')
// The map covers every branch, including retries, optional investigation and failure.
assert.deepEqual(Object.keys(theatreMapNodes).sort(), Object.keys(story).sort())
const links = theatreMapLinks()
for (const [id, node] of Object.entries(story)) {
  const point = theatreMapNodes[id]
  assert(point.x >= 95 && point.x <= theatreMapWidth - 95 && point.y >= 35 && point.y <= theatreMapHeight - 35, `${id}: clipped map node`)
  for (const to of [node.next, ...(node.choices ?? []).map(choice => choice.next)].filter(Boolean)) assert(links.some(link => link.from === id && link.to === to), `${id}: missing map branch to ${to}`)
}
for (const id of ['rain','breakfast','film','route','confrontation','exhausted']) assert(links.some(link => link.from === 'explore' && link.to === id))
const points = Object.entries(theatreMapNodes)
for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) assert(Math.abs(points[i][1].x - points[j][1].x) >= 190 || Math.abs(points[i][1].y - points[j][1].y) >= 70, `${points[i][0]} overlaps ${points[j][0]}`)
const legacySave = {...newTheatreSave(['saved']), node:'explore', visited:['invitation','meeting','rain','explore']}
const legacyProgress = recordTheatreCheckpoint(newTheatreProgress(), legacySave)
assert(legacyProgress.visited.includes('rain'))
assert.equal(restartTheatreFrom(legacyProgress, 'rain'), null, 'Legacy visits cannot fabricate a checkpoint')
assert.deepEqual(legacyProgress.endings, ['saved'])
const badProgress = normalizeTheatreProgress({version:1, checkpoints:{'fake-trade':{node:'fake-trade',spirit:60,pollution:0,memories:['rain','breakfast','film'],routeVerified:false,trade:'fake'}, rain:{node:'rain',spirit:Infinity,pollution:0,memories:[],routeVerified:false,trade:null}, bargain:{node:'bargain',spirit:80,pollution:0,memories:[],routeVerified:false,trade:null}}})
assert.deepEqual(Object.keys(badProgress.checkpoints), ['invitation'], 'Corrupt or gated checkpoints must be discarded')
assert.deepEqual(normalizeTheatreProgress(null), newTheatreProgress())
for (const language of ['zh','en']) {
  const before = JSON.stringify(legacyProgress)
  const html = renderTheatreMindMap(legacySave, legacyProgress, language)
  assert.equal(JSON.stringify(legacyProgress), before, 'Rendering a preview cannot mutate progress')
  assert(html.includes('map-viewport') && html.includes('map-zoom-tools') && html.includes('map-link') && html.includes('ending-gallery'))
  assert.equal((html.match(/data-route=/g) ?? []).length, 23)
  assert(html.includes('aria-current="step"'))
  assert(/data-route="rain" disabled/.test(html), 'Legacy nodes without snapshots must remain disabled')
}
console.log(`Chapter three verified: ${seen.size} bilingual scenes, ${routes} complete route combinations, all 3 endings, ${usedScenes.size} storyboard images, ${usedExpressions.size} expressions, checkpoint replay, map branches, reloads, and choice gates.`)
