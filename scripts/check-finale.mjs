import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tsModuleUrl } from './ts-module.mjs'

const stateApi = await import(tsModuleUrl('src/finale-story.ts'))
const progressApi = await import(tsModuleUrl('src/finale-progress.ts'))
const map = await import(tsModuleUrl('src/finale-map.ts'))
const {
  finaleStories, finaleEndingIds, finaleSaveKey, finaleProgressKey,
  newFinaleSave, normalizeFinaleSave, advanceFinale, applyFinaleChoice,
  completeFinaleFilm, finaleChoiceAvailable, finaleCarryFromFive,
} = stateApi
const { newFinaleProgress, normalizeFinaleProgress, recordFinaleCheckpoint, restartFinaleFrom } = progressApi

assert.deepEqual(Object.keys(finaleStories).sort(), ['5', '6'])
assert.equal(finaleSaveKey(5), 'naiwa-chapter-five-v1')
assert.equal(finaleSaveKey(6), 'naiwa-final-chapter-v1')
assert.equal(finaleProgressKey(5), 'naiwa-chapter-five-progress-v1')
assert.equal(finaleProgressKey(6), 'naiwa-final-chapter-progress-v1')

const forbiddenFifthChapterReveal = /第二人格|另一个完整人格|奶霸是奶蛙|naiba is (part of|a part of) naiwa|second personality|alter ego|another complete personality/i
for (const chapter of [5, 6]) {
  const story = finaleStories[chapter]
  assert(Object.keys(story).length >= 20, `Chapter ${chapter}: the story map needs its full route content`)
  for (const [id, node] of Object.entries(story)) {
    assert(node.title?.zh?.trim() && node.title?.en?.trim(), `${id}: missing bilingual title`)
    assert(typeof node.art === 'string' && node.art, `${id}: missing scene art key`)
    assert(Array.isArray(node.lines), `${id}: lines must be an array`)
    assert(node.kind === undefined || node.kind === 'film', `${id}: unsupported scene kind`)
    assert(node.ending === undefined || finaleEndingIds[chapter].includes(node.ending), `${id}: invalid ending id`)
    assert(node.lines.length || node.kind === 'film', `${id}: a non-film scene needs dialogue`)
    assert(node.ending || node.next || node.choices?.length || node.kind === 'film', `${id}: dead end without an ending`)
    if (node.next) assert(Object.hasOwn(story, node.next), `${id}: missing next scene ${node.next}`)
    for (const line of node.lines) {
      assert(stateApi.finaleSpeakers[line.speaker]?.zh && stateApi.finaleSpeakers[line.speaker]?.en, `${id}: unknown speaker`)
      assert(line.text?.zh?.trim() && line.text?.en?.trim(), `${id}: missing bilingual dialogue`)
      if (id.startsWith('f5-')) assert(!forbiddenFifthChapterReveal.test(`${line.text.zh} ${line.text.en}`), `${id}: the fifth chapter reveals Naiba's identity too early`)
    }
    const choices = node.choices ?? []
    assert.equal(new Set(choices.map(choice => choice.id)).size, choices.length, `${id}: duplicate choice id`)
    for (const choice of choices) {
      assert(choice.id && choice.next && Object.hasOwn(story, choice.next), `${id}/${choice.id}: invalid branch`)
      assert(choice.text?.zh?.trim() && choice.text?.en?.trim(), `${id}/${choice.id}: missing bilingual choice`)
      assert(choice.detail?.zh?.trim() && choice.detail?.en?.trim(), `${id}/${choice.id}: missing bilingual choice detail`)
      for (const requirement of choice.requires ?? []) assert(/^(clue:.+|flag:.+|spirit>=\d+)$/.test(requirement), `${id}/${choice.id}: unsupported requirement ${requirement}`)
      for (const flag of choice.sets ?? []) assert(typeof flag === 'string' && flag, `${id}/${choice.id}: invalid flag effect`)
    }
  }
}

for (const chapter of [5, 6]) {
  const story = finaleStories[chapter]
  const points = map.finaleMapNodes[chapter]
  const links = map.finaleMapLinks(chapter)
  assert.deepEqual(Object.keys(points).sort(), Object.keys(story).sort(), `Chapter ${chapter}: map must contain every scene`)
  assert.equal(new Set(links.map(link => `${link.from}\u0000${link.to}`)).size, links.length, `Chapter ${chapter}: duplicate map edge`)
  for (const link of links) {
    assert(Object.hasOwn(story, link.from) && Object.hasOwn(story, link.to), `Chapter ${chapter}: invalid map edge ${link.from} → ${link.to}`)
  }
  for (const [id, node] of Object.entries(story)) {
    const point = points[id]
    assert(point.x >= 70 && point.x <= map.finaleMapWidth - 70, `${id}: map node is clipped horizontally`)
    assert(point.y >= 35 && point.y <= map.finaleMapHeights[chapter] - 35, `${id}: map node is clipped vertically`)
    for (const to of [node.next, ...(node.choices ?? []).map(choice => choice.next)].filter(Boolean)) {
      assert(links.some(link => link.from === id && link.to === to), `${id}: map is missing branch to ${to}`)
    }
  }
}

const usedRequirements = new Set([...readFileSync('src/finale-story.ts', 'utf8').matchAll(/['"](flag:[^'"]+)['"]/g)].map(match => match[1]))
const stableState = save => JSON.stringify({
  chapter: save.chapter, node: save.node, line: save.line, spirit: save.spirit,
  clues: save.clues.filter(id => !save.node.startsWith('f6-') || id.startsWith('f6-')).sort(),
  flags: save.flags.filter(id => !save.node.startsWith('f6-') || !id.startsWith('f5-')).filter(id => usedRequirements.has('flag:' + id)).sort(),
})

function exploreChapter(chapter, start) {
  const story = finaleStories[chapter]
  const queue = [start]
  const seen = new Set()
  const states = []
  const firstArrival = new Map()
  const progressBox = { value: newFinaleProgress(chapter) }
  const push = next => {
    assert.notEqual(next, null)
    const restored = normalizeFinaleSave(chapter, JSON.parse(JSON.stringify(next)))
    assert.deepEqual(restored, next, `${next.node}/${next.line}: save/reload changed valid route state`)
    const key = stableState(next)
    if (!seen.has(key)) queue.push(next)
  }

  let cursor = 0
  while (cursor < queue.length) {
    const save = queue[cursor++]
    const key = stableState(save)
    if (seen.has(key)) continue
    seen.add(key)
    states.push(save)
    assert(seen.size < 100_000, `Chapter ${chapter}: route graph exceeded the bounded state budget`)

    if (save.line === 0 && !firstArrival.has(save.node)) firstArrival.set(save.node, save)
    if (save.line === 0) progressBox.value = recordFinaleCheckpoint(progressBox.value, save, true)

    const node = story[save.node]
    assert(node, `Chapter ${chapter}: unknown reachable scene ${save.node}`)
    if (node.kind === 'film') {
      assert.strictEqual(advanceFinale(save), save, `${save.node}: ordinary advance must not skip the film`)
      const finished = completeFinaleFilm(save)
      assert.notStrictEqual(finished, save, `${save.node}: film completion must advance`)
      assert.equal(finished.node, node.next)
      assert(finished.flags.includes('film-completed'), 'film completion must be recorded before the next scene')
      assert.strictEqual(completeFinaleFilm(finished), finished, 'duplicate/stale completion must not advance a second time')
      push(finished)
      continue
    }

    if (save.line < node.lines.length - 1) {
      const next = advanceFinale(save)
      assert.equal(next.node, save.node, `${save.node}: line advance changed scenes early`)
      assert.equal(next.line, save.line + 1, `${save.node}: dialogue line was skipped`)
      push(next)
      continue
    }

    if (node.ending) {
      assert(save.endings.includes(node.ending), `${save.node}: entering an ending must unlock it`)
      assert.strictEqual(advanceFinale(save), save, `${save.node}: the final ending line must stop cleanly`)
      continue
    }

    if (node.choices?.length) {
      for (const choice of node.choices) {
        const available = finaleChoiceAvailable(save, choice)
        const next = applyFinaleChoice(save, choice.id)
        if (!available) {
          assert.strictEqual(next, save, `${save.node}/${choice.id}: a locked choice changed state`)
          continue
        }
        assert.notStrictEqual(next, save, `${save.node}/${choice.id}: an available choice did nothing`)
        assert.equal(next.node, next.spirit <= 0 ? (chapter === 5 ? 'f5-exhausted' : 'f6-exhausted') : choice.next, `${save.node}/${choice.id}: choice went to an unexpected scene`)
        if (choice.clue) assert(next.clues.includes(choice.clue), `${choice.id}: clue effect was not recorded`)
        for (const flag of choice.sets ?? []) assert(next.flags.includes(flag), `${choice.id}: flag effect ${flag} was not recorded`)
        push(next)
      }
      continue
    }

    if (node.next) {
      const next = advanceFinale(save)
      assert.notStrictEqual(next, save, `${save.node}: next scene did not advance`)
      assert.equal(next.node, node.next, `${save.node}: unexpected linear transition`)
      push(next)
      continue
    }

    assert(node.ending || node.kind === 'film', `${save.node}: reachable scene has no exit`)
  }

  const reached = new Set(states.map(save => save.node))
  assert.deepEqual(reached, new Set(Object.keys(story)), `Chapter ${chapter}: every authored route node must be reachable`)
  const reachedEndings = new Set(states.flatMap(save => save.endings))
  assert.deepEqual(new Set(finaleEndingIds[chapter]), reachedEndings, `Chapter ${chapter}: every declared ending needs a reachable route`)

  const progress = normalizeFinaleProgress(chapter, JSON.parse(JSON.stringify(progressBox.value)))
  assert.deepEqual(progress, progressBox.value, `Chapter ${chapter}: checkpoints must survive reload`)
  assert.deepEqual(Object.keys(progress.checkpoints).sort(), Object.keys(story).sort(), `Chapter ${chapter}: first arrival must capture each reachable node`)
  for (const [id, snapshot] of Object.entries(progress.checkpoints)) {
    const replay = restartFinaleFrom(chapter, progress, id)
    assert(replay, `${id}: a real checkpoint must replay`)
    assert.equal(replay.node, id, `${id}: replay must not skip the checkpoint gate`)
    assert.equal(replay.line, 0, `${id}: replay starts at the first line`)
    assert.deepEqual(replay.history, [], `${id}: replay must clear the old dialogue log`)
    assert.equal(replay.spirit, snapshot.spirit, `${id}: replay must restore first-arrival spirit`)
    assert.deepEqual(replay.clues, snapshot.clues, `${id}: replay must restore first-arrival clues`)
    assert.deepEqual(replay.flags, snapshot.flags, `${id}: replay must restore first-arrival flags`)
    assert.deepEqual(replay.endings, progress.endings, `${id}: replay must preserve unlocked endings`)
  }
  assert.equal(restartFinaleFrom(chapter, progress, '__proto__'), null)
  assert.equal(restartFinaleFrom(chapter, progress, 'not-a-node'), null)

  // Checkpoint arrays are copied at first arrival and later visits cannot replace them.
  const example = progress.checkpoints[chapter === 5 ? 'f5-ledger-kept' : 'f6-core']
  if (example) {
    const before = JSON.parse(JSON.stringify(example))
    const replayLike = { ...newFinaleSave(chapter), node: example.node, line: 0, spirit: example.spirit, clues: [...example.clues], flags: [...example.flags] }
    const recorded = recordFinaleCheckpoint(progress, replayLike, true)
    replayLike.clues.push('mutated-after-record')
    assert.deepEqual(recorded.checkpoints[example.node], before, `${example.node}: checkpoint data must be cloned and immutable`)
    assert.deepEqual(recordFinaleCheckpoint(recorded, { ...replayLike, spirit: 1, line: 0 }, true).checkpoints[example.node], before, `${example.node}: later visits cannot overwrite first-arrival state`)
  }

  // Historical visit lists keep their labels but must not invent a replay snapshot.
  const entry = chapter === 5 ? 'f5-descent' : 'f6-entry'
  const oldNode = chapter === 5 ? 'f5-trace' : 'f6-investigation'
  const legacy = normalizeFinaleProgress(chapter, { version: 0, chapter, visited: [entry, oldNode], endings: [], checkpoints: {} })
  assert(legacy.visited.includes(oldNode))
  assert.equal(restartFinaleFrom(chapter, legacy, oldNode), null, 'legacy visits cannot invent replay checkpoints')
  const revisited = recordFinaleCheckpoint(legacy, { ...newFinaleSave(chapter), node: oldNode, line: 0 }, true)
  assert(restartFinaleFrom(chapter, revisited, oldNode), 'a real revisit enables replay from that point')

  for (const language of ['zh', 'en']) {
    const firstSave = newFinaleSave(chapter)
    const firstProgress = recordFinaleCheckpoint(newFinaleProgress(chapter), firstSave, true)
    const beforeSave = JSON.stringify(firstSave)
    const beforeProgress = JSON.stringify(firstProgress)
    const html = map.renderFinaleMindMap(firstSave, firstProgress, language)
    assert.equal(JSON.stringify(firstSave), beforeSave, 'rendering the map cannot mutate the save')
    assert.equal(JSON.stringify(firstProgress), beforeProgress, 'rendering the map cannot mutate progress')
    for (const token of ['map-viewport', 'map-zoom-tools', 'map-lines', 'map-link', 'ending-gallery', 'aria-current="step"']) assert(html.includes(token), `${chapter}/${language}: map is missing ${token}`)
    assert.match(html, new RegExp(`data-route="${entry}"[^>]*aria-current="step"`), 'the current node must be highlighted')
    for (const [id, node] of Object.entries(story)) {
      assert(html.includes(`data-route="${id}"`), `${chapter}/${language}: map omits ${id}`)
      if (id !== entry) assert.match(html, new RegExp(`data-route="${id}" disabled[^>]*><span class="mind-code">${id.toUpperCase()}</span><span class="mind-title">\\?\\?\\?<`), `${id}: an unvisited node must be disabled and concealed`)
      for (const target of [node.next, ...(node.choices ?? []).map(choice => choice.next)].filter(Boolean)) {
        assert(html.includes(`data-map-edge="${id}→${target}"`), `${id}: rendered map omits edge to ${target}`)
      }
    }
    for (const ending of finaleEndingIds[chapter]) assert(html.includes('???'), `${ending}: unearned endings stay hidden`)
  }

  return { states: states.length, reached: reached.size, endings: reachedEndings.size, firstArrival, progress }
}

const fifthStart = newFinaleSave(5)
assert.equal(fifthStart.node, 'f5-descent')
const fifth = exploreChapter(5, fifthStart)
assert(fifth.firstArrival.has('f5-ending-escape'), 'the fifth chapter needs a non-sacrificial escape route')
assert(fifth.firstArrival.has('f5-ending-bargain'), 'the consent shortcut remains an explicit route')

const fifthHub = normalizeFinaleSave(5, { ...newFinaleSave(5), node: 'f5-trace', line: finaleStories[5]['f5-trace'].lines.length - 1 })
assert.equal(finaleStories[5]['f5-trace'].choices.length, 2, 'record reading has one direct route and one optional memory')
const recordChain = ['f5-ledger', 'f5-ledger-kept', 'f5-film', 'f5-film-kept', 'f5-roster', 'f5-roster-kept', 'f5-lab-entry']
for (let index = 0; index < recordChain.length - 1; index++) {
  const node = finaleStories[5][recordChain[index]]
  assert(!node.choices?.length, 'records unfold without repeated search menus')
  assert.equal(node.next, recordChain[index + 1])
}
assert(fifth.firstArrival.get('f5-lab-entry').clues.includes('f5-ledger-proof'))
assert(fifth.firstArrival.get('f5-lab-entry').clues.includes('f5-film-proof'))
for (const clues of [[], ['f5-ledger-proof'], ['f5-film-proof'], ['invented-proof', '__proto__']]) {
  const forged = normalizeFinaleSave(5, { ...fifthHub, clues, node: 'f5-lab-entry' })
  assert.equal(forged.node, 'f5-descent', `incomplete or malformed Chapter Five evidence cannot restore the lab gate (${clues.join(',')})`)
}

// The final chapter succeeds on its own local investigation, with or without Chapter Five carryover.
const fifthCarrySource = { ...newFinaleSave(5), clues: ['f5-signal', 'f5-ledger-proof', 'f5-film-proof', 'f5-cradle-map', 'invented-proof'] }
const carry = finaleCarryFromFive(JSON.stringify(fifthCarrySource))
assert.deepEqual(new Set(carry), new Set(['f5-signal', 'f5-ledger-proof', 'f5-film-proof', 'f5-cradle-map']))
assert.deepEqual(finaleCarryFromFive('{bad json'), [])
const sixthStart = newFinaleSave(6, [], carry)
assert.equal(sixthStart.node, 'f6-entry')
assert(sixthStart.clues.includes('f5-ledger-proof'), 'the chapter-five clue should carry as context')
assert(!sixthStart.clues.includes('f6-medical-log') && !sixthStart.clues.includes('f6-waveform') && !sixthStart.clues.includes('f6-car-log'))
assert(sixthStart.flags.every(flag => flag.startsWith('carry:')), 'carried clues do not forge local achievement flags')
const sixth = exploreChapter(6, sixthStart)
assert(sixth.firstArrival.has('f6-ending-reconcile'), 'the final chapter has a standalone safe ending route')
assert(sixth.firstArrival.has('f6-ending-cradle'), 'the optional ending is reachable through local investigation')

const sixthGate = finaleStories[6]['f6-investigation'].choices.find(choice => choice.id === 'f6-test-core')
assert(sixthGate)
assert.deepEqual(sixthGate.requires, ['clue:f6-medical-log', 'clue:f6-waveform', 'clue:f6-car-log'])
const carriedHub = normalizeFinaleSave(6, { ...sixthStart, node: 'f6-investigation', line: finaleStories[6]['f6-investigation'].lines.length - 1 })
assert.equal(finaleChoiceAvailable(carriedHub, sixthGate), false, 'carried clues cannot satisfy the local core gate')
assert.strictEqual(applyFinaleChoice(carriedHub, sixthGate.id), carriedHub, 'the Core door cannot be skipped with Chapter Five carryover')
for (const clues of [carry, [...carry, 'f6-medical-log'], ['f6-medical-log', 'f6-waveform'], ['f6-medical-log', 'f6-car-log'], ['f6-waveform', 'f6-car-log'], ['invented-proof', '__proto__']]) {
  const forged = normalizeFinaleSave(6, { ...carriedHub, clues, node: 'f6-core-door' })
  assert.equal(forged.node, 'f6-entry', `incomplete/carryover evidence cannot restore the Core gate (${clues.join(',')})`)
}

// Final battle completion is the only way out of the film node, and it is idempotent.
const filmNode = finaleStories[6]['f6-battle-film']
assert.equal(filmNode.kind, 'film')
assert.deepEqual(filmNode.lines, [])
assert.equal(filmNode.next, 'f6-post-film')
let filmSave = normalizeFinaleSave(6, { ...newFinaleSave(6), node: 'f6-battle-film', flags: ['extraction-cut'] })
assert.equal(filmSave.node, 'f6-entry', 'a corrupt save cannot skip the local investigation and responsibility gates to start the film')
filmSave = normalizeFinaleSave(6, {
  ...newFinaleSave(6), node: 'f6-battle-film', flags: ['f6-local-evidence-ready', 'f6-responsibility-faced', 'extraction-cut', 'fight-ready'],
  clues: ['f6-medical-log', 'f6-waveform', 'f6-car-log'],
})
assert.equal(filmSave.node, 'f6-battle-film')
assert.strictEqual(advanceFinale(filmSave), filmSave)
const afterFilm = completeFinaleFilm(filmSave)
assert.equal(afterFilm.node, 'f6-post-film')
assert(afterFilm.flags.includes('film-completed'))
assert.strictEqual(completeFinaleFilm(afterFilm), afterFilm)
assert.equal(finaleStories[6]['f6-rooftop'].choices.find(choice => choice.id === 'f6-cut-relay').sets.includes('fight-ready'), true)
assert.deepEqual(finaleStories[6]['f6-rooftop'].choices.filter(choice => choice.sets?.includes('fight-ready')).map(choice => choice.id), ['f6-cut-relay'], 'only the prepared relay choice sets fight-ready')
const rushed = normalizeFinaleSave(6, { ...filmSave, node: 'f6-rooftop', line: finaleStories[6]['f6-rooftop'].lines.length - 1, spirit: 100, flags: ['f6-responsibility-faced'] })
const failedRush = applyFinaleChoice(rushed, 'f6-rush-relay')
assert.equal(failedRush.node, 'f6-exhausted', 'a reckless zero-spirit shortcut enters the failure ending')
assert.equal(failedRush.spirit, 0)

// Old visits can be displayed but cannot create invented snapshots, including malformed snapshots.
for (const chapter of [5, 6]) {
  const node = chapter === 5 ? 'f5-lab-entry' : 'f6-core-door'
  const invalidProgress = normalizeFinaleProgress(chapter, {
    version: 1, chapter, visited: [node], endings: [], checkpoints: {
      [node]: { version: 1, chapter, node, spirit: 100, clues: [], flags: [] },
    },
  })
  assert(!Object.hasOwn(invalidProgress.checkpoints, node), `${node}: corrupt snapshots cannot mint replay access`)
  assert.equal(restartFinaleFrom(chapter, invalidProgress, node), null)
}

const finaleSource = readFileSync('src/finale.ts', 'utf8')
const finaleCss = readFileSync('src/finale.css', 'utf8')
const requiredControls = [
  'finale-back', 'finale-journal', 'finale-log', 'finale-routes', 'finale-audio',
  'finale-audio-settings', 'finale-fullscreen', 'finale-language', 'finale-next',
  'finale-film-video', 'finale-film-play', 'finale-film-fullscreen', 'finale-film-skip',
]
for (const id of requiredControls) {
  assert(finaleSource.includes(id), `Finale UI is missing #${id}`)
}
assert.equal((finaleSource.match(/completeFinaleFilm\s*\(/g) ?? []).length, 1, 'the video end handler advances the finale exactly once')
assert(finaleSource.includes("'/videos/final-battle-naiwa-feidudu.mp4'") || finaleSource.includes('"/videos/final-battle-naiwa-feidudu.mp4"'), 'finale UI must reference the supplied battle video')
assert(finaleSource.includes('createGildedFilm'), 'finale video reuses the tested film lifecycle helper')
for (const required of ['playsinline', 'preload', 'aria-label']) assert(finaleSource.includes(required), `Finale UI should handle ${required}`)
for (const required of ['position: fixed', 'inset: 0', '100dvh', 'prefers-reduced-motion']) assert(finaleCss.includes(required), `Finale styling is missing ${required}`)
for (const required of ['.route-dialog', '.map-viewport', '.mind-node', '.finale-film']) assert((finaleCss + readFileSync('src/style.css', 'utf8')).includes(required), `Finale styling is missing ${required}`)

const promoApi = await import(tsModuleUrl('src/finale-promo.ts'))
for (const language of ['zh', 'en']) {
  const entries = promoApi.renderFinaleEntries(language)
  assert(entries.includes('?chapter=5') && !entries.includes('?chapter=6'), `${language}: merged finale has one working entry`)
  for (const spoiler of ['第二人格', '纯白摇篮', '牺牲', '第二个完整人格', 'second personality', 'alter ego', 'White Cradle', 'sacrifice', 'true ending']) {
    assert(!entries.toLowerCase().includes(spoiler.toLowerCase()), `${language}: chapter entry teaser leaks ${spoiler}`)
  }
  for (const chapter of [5]) for (const started of [false, true]) {
    const html = promoApi.renderFinalePromo(chapter, language, started, '<Session only>')
    assert(html.includes(`?chapter=${chapter}`), `Chapter ${chapter}: promo needs a real chapter link`)
    assert(html.includes(started ? 'data-promo-restart' : 'data-promo-play'), `Chapter ${chapter}: start/resume state is missing`)
    assert(html.includes('&lt;Session only&gt;'), 'save notices must remain escaped')
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1])
    assert.equal(ids.length, new Set(ids).size, `Chapter ${chapter}: promo has duplicate IDs`)
    for (const match of html.matchAll(/<img ([^>]+)>/g)) {
      const src = match[1].match(/src="([^"]+)"/)?.[1]
      assert(src && existsSync(`public${src}`), `Chapter ${chapter}: missing teaser image ${src}`)
      assert(match[1].includes('alt="') && match[1].includes('width="') && match[1].includes('height="'), 'teaser images need alternatives and dimensions')
    }
    for (const spoiler of ['第二人格', '纯白摇篮', '牺牲', '第二个完整人格', 'second personality', 'alter ego', 'White Cradle', 'sacrifice', 'true ending']) {
      assert(!html.toLowerCase().includes(spoiler.toLowerCase()), `Chapter ${chapter} ${language} promo leaks ${spoiler}`)
    }
  }
}

const videoPath = 'public/videos/final-battle-naiwa-feidudu.mp4'
assert(existsSync(videoPath), 'the supplied final battle video must be present')
const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', videoPath]))
assert(metadata.streams.some(stream => stream.codec_name === 'h264' && stream.codec_type === 'video' && stream.width === 1280 && stream.height === 720))
assert(metadata.streams.some(stream => stream.codec_name === 'aac' && stream.codec_type === 'audio'))
assert(Math.abs(Number(metadata.format.duration) - 89.728) < 0.1)
assert.equal(statSync(videoPath).size, 22_726_901, 'keep the provided battle video byte-for-byte')

for (const art of new Set(Object.values(finaleStories).flatMap(story => Object.values(story).map(node => node.art)))) {
  const visuals = await import(tsModuleUrl('src/finale-visuals.ts'))
  const visual = visuals.finaleVisuals[art]
  assert(visual, `Missing art mapping for ${art}`)
  assert(visual.src?.startsWith('/images/') && existsSync(`public${visual.src}`), `${art}: missing scene image ${visual.src}`)
}


// The midpoint is a normal transition: no new game, restored spirit or lost evidence.
for (const id of ['f5-ending-escape', 'f5-ending-taken', 'f5-ending-bargain']) {
  const arrival = fifth.firstArrival.get(id)
  const node = finaleStories[5][id]
  assert(!node.ending && node.next === 'f6-entry')
  const crossing = advanceFinale({ ...arrival, line: node.lines.length - 1 })
  assert.equal(crossing.node, 'f6-entry')
  assert.equal(crossing.chapter, 5)
  assert.equal(crossing.spirit, arrival.spirit)
  assert.deepEqual(crossing.clues, arrival.clues)
  assert.deepEqual(crossing.flags, arrival.flags)
}
for (const id of ['f5-cat-ambush', 'f5-feidudu-clash', 'f6-core-blockade']) {
  const arrived = fifth.firstArrival.get(id)
  assert(arrived, id + ': argument must be reachable')
  const choices = finaleStories[5][id].choices
  assert.equal(choices.length, 2, 'arguments keep two meaningful responses')
  assert(choices.every(choice => (choice.spirit ?? 0) > -100), 'arguments cannot be fatal combat shortcuts')
  const text = finaleStories[5][id].lines.map(line => line.text.zh).join(' ')
  assert(!/挥拳|躲闪|冲撞|踢向|扑向|一拳|肉搏/.test(text), 'pre-film confrontation stays verbal')
}
const mergedFilm = fifth.firstArrival.get('f6-battle-film')
const mergedRuins = completeFinaleFilm(mergedFilm)
assert.equal(mergedRuins.chapter, 5)
assert.equal(mergedRuins.node, 'f6-post-film')
assert.equal(finaleStories[5][mergedRuins.node].art, 'aftermath')
const aftermathChain = ['f6-post-film', 'f6-injury-reveal', 'f6-ruin-search', 'f6-ruin-rescue', 'f6-naiba-farewell', 'f6-naiba-sacrifice', 'f6-revival', 'f6-ruin-record', 'f6-ruin-relay', 'f6-resolution']
for (let index = 0; index < aftermathChain.length - 1; index++) {
  const node = finaleStories[5][aftermathChain[index]]
  assert.equal(node.next, aftermathChain[index + 1], 'every route plays injury, sacrifice and revival before the ending choice')
  assert(!node.choices?.length, 'rescue is uninterrupted by investigation menus')
}
assert(finaleStories[5]['f6-injury-reveal'].lines.some(line => /腰.*截断|腰斩/.test(line.text.zh)))
for (const id of ['f6-resolution', ...Object.keys(finaleStories[5]).filter(id => finaleStories[5][id].ending?.startsWith('f6-'))]) {
  const arrival = fifth.firstArrival.get(id)
  assert(arrival.flags.includes('f6-naiba-sacrificed') && arrival.flags.includes('f6-revived'), id + ': revival is mandatory')
  assert(finaleStories[5][id].lines.every(line => line.speaker !== 'naiba'), 'Naiba never speaks again after sacrificing all consciousness')
  const invalid = normalizeFinaleSave(5, { ...arrival, flags: arrival.flags.filter(flag => flag !== 'f6-revived') })
  assert.notEqual(invalid.node, id, 'replay cannot bypass the revival gate')
}
const legacyMerged = progressApi.mergeFinaleProgress(fifth.progress, sixth.progress)
assert(legacyMerged.checkpoints['f6-core'])
assert.equal(legacyMerged.chapter, 5)
const migratedReplay = restartFinaleFrom(5, legacyMerged, 'f6-core')
assert.equal(migratedReplay.chapter, 5)
assert.equal(migratedReplay.node, 'f6-core')
assert.deepEqual(migratedReplay.flags, fifth.progress.checkpoints['f6-core'].flags)
const legacyVisits = progressApi.mergeFinaleProgress(null, { version: 0, chapter: 6, visited: ['f6-core'], checkpoints: {} })
assert(legacyVisits.visited.includes('f6-core') && !legacyVisits.checkpoints['f6-core'])

const artworkApi = await import(tsModuleUrl('src/finale-artwork.ts'))
const cgKeys = new Set()
const memoryKeys = new Set()
const memoryLog = JSON.parse(readFileSync('docs/finale-memory-shots.json')).memories
for (const [id, cuts] of Object.entries(artworkApi.finaleCuts)) {
  const node = finaleStories[5][id]
  assert(node, id + ': artwork must belong to a real node')
  let previousLine = -1
  for (const cut of cuts) {
    assert(cut.from >= 0 && cut.from > previousLine && cut.from < node.lines.length, id + ': cuts must advance within the dialogue')
    previousLine = cut.from
    const save = { ...newFinaleSave(5), node: id, line: cut.from }
    const before = structuredClone(save)
    const shot = artworkApi.finaleArtwork(save)
    assert.deepEqual(save, before, 'Selecting artwork must not change story state')
    assert(shot.cg)
    assert(existsSync('public' + shot.src))
    if (cut.memory) {
      memoryKeys.add(cut.key)
      assert(cut.memory.zh && cut.memory.en, 'Memories need both language labels')
      assert(!shot.src.includes('/finale-'), 'Memories reuse earlier chapter images')
      assert.equal(shot.id, 'memory/' + cut.key)
      const logged = memoryLog.find(entry => entry.key === cut.key)
      assert(logged && logged.src === shot.src && logged.title.zh === cut.memory.zh && logged.title.en === cut.memory.en)
      assert.equal(createHash('sha256').update(readFileSync('public' + shot.src)).digest('hex'), logged.sha256, 'Reused artwork stays unchanged')
      // Every flashback must return to the present before the current node ends.
      assert(cuts.some(next => next.from > cut.from && !next.memory), id + ': memory needs a return cut')
      continue
    }
    assert(existsSync('assets/images/finale-' + cut.key + '.png'))
    assert(!/strike|ambush|faceoff|blockade|chase|bound/.test(cut.key), 'No generated confrontation pictures may be connected')
    cgKeys.add(cut.key)
  }
}
assert.equal(cgKeys.size, 39)
assert.equal(memoryKeys.size, 8)
assert.equal(memoryLog.length, 8)
for (const id of ['f6-revival', 'f6-resolution', 'f6-ending-reconcile', 'f6-ending-sever', 'f6-ending-cradle']) {
  for (let line = 0; line < finaleStories[5][id].lines.length; line++) {
    const shot = artworkApi.finaleArtwork({ ...newFinaleSave(5), node: id, line })
    assert(shot.memory || !/naiba-(farewell|hand|sacrifice|confession|gauntlet)|sacrifice-(palm-heart|shoulder-fading|last-eyes)/.test(shot.id), 'After sacrifice, Naiba may appear only in a labeled memory')
  }
}
// Restoring a first-arrival checkpoint shows its first shot, not a later flashback.
const memoryReplay = restartFinaleFrom(5, fifth.progress, 'f6-revival')
assert(memoryReplay)
assert.equal(artworkApi.finaleArtwork(memoryReplay).id, 'sacrifice-first-breath')
// The sacrifice now has a shot for each line, without repeating adjacent frames.
const sacrificeFrames = finaleStories[5]['f6-naiba-sacrifice'].lines.map((_, line) =>
  artworkApi.finaleArtwork({ ...newFinaleSave(5), node: 'f6-naiba-sacrifice', line }))
assert(sacrificeFrames.every(shot => shot.cg))
assert(sacrificeFrames.every((shot, index) => index === 0 || shot.id !== sacrificeFrames[index - 1].id))
assert.equal(sacrificeFrames.at(-1).id, 'sacrifice-final-mote', 'Last transfer must show Naiba already absent')
for (const id of ['f5-cat-ambush', 'f5-feidudu-clash', 'f6-core-blockade', 'f6-battle-film']) {
  assert.equal(artworkApi.finaleArtwork({ ...newFinaleSave(5), node: id }).cg, false)
}
const sacrificeLog = JSON.parse(readFileSync('docs/finale-sacrifice-closeup-prompts.json')).assets
assert.equal(sacrificeLog.length, 6)
for (const entry of sacrificeLog) {
  assert(entry.status.startsWith('accepted') && existsSync(entry.png) && existsSync(entry.webp))
  assert(entry.refRoles.length === entry.refs.length && entry.refRoles.every(role => role.purpose))
  assert(entry.refs.some(ref => ref.startsWith('references/')), 'Original identity reference remains mandatory')
  assert(entry.refs.includes('assets/images/finale-aftermath.png'), 'Established sacrifice scene reference is required')
}
const cgLog = [...JSON.parse(readFileSync('docs/finale-closeup-prompts.json')).assets, ...JSON.parse(readFileSync('docs/finale-sacrifice-prompts.json')).assets, ...JSON.parse(readFileSync('docs/finale-memory-closeup-prompts.json')).assets, ...sacrificeLog]
assert.equal(cgLog.length, 39)
for (const entry of cgLog) {
  assert(cgKeys.has(entry.key), entry.key + ': accepted art should be connected')
  assert(entry.refs.length && entry.prompt)
  for (const ref of entry.refs) assert(existsSync(ref), ref)
}
const speech = JSON.parse(execFileSync('node', ['scripts/finale-tts-manifest.mjs']))
const hashes = JSON.parse(readFileSync('public/audio/tts/finale-manifest.json'))
assert.equal(speech.length, 350)
for (const entry of speech) {
  assert(existsSync('public/audio/' + entry.path) && statSync('public/audio/' + entry.path).size > 1024, entry.path)
  assert.equal(hashes[entry.path], entry.hash, entry.path + ': speech must match current text')
}
assert.equal(createHash('sha256').update(readFileSync(videoPath)).digest('hex'), 'cb1256883e6190f0ad768a6117683652de7e05afe6e80f3e5a9c1994d66f5a49')
console.log(`Finale OK: ${Object.keys(finaleStories[5]).length} scenes in ONE chapter, ${finaleEndingIds[5].length} endings; continuous state, arguments, mandatory sacrifice and revival, first-arrival replay, 39 noncombat CGs, 8 labeled memories, complete sacrifice cuts, 350 speech files and original battle film.`)
