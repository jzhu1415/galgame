import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync('src/romance-dlc-story.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const storyUrl = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
const { romanceStory: story, romanceEpisodes: episodes, romanceFinale, romanceTrailResult } = await import(storyUrl)
const visualJs = ts.transpileModule(readFileSync('src/romance-dlc-visuals.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/(['"])\.\/romance-dlc-story\1/g, JSON.stringify(storyUrl))
const { romanceArt, romanceVisualCues, romanceVisual, nextRomanceImage, romanceEpisodeCover } = await import(`data:text/javascript;base64,${Buffer.from(visualJs).toString('base64')}`)
const usedImages = new Set()
const reached = new Set()
let routes = 0
let lines = 0
for (const [id, node] of Object.entries(story)) {
  assert(episodes.some(ep => ep.id === node.episode), `${id}: unknown episode`)
  assert(node.lines.length > 0, `${id}: no dialogue`)
  assert.equal(Number(!!node.choices) + Number(!!node.next) + Number(!!node.ending), 1, `${id}: ambiguous or missing continuation`)
  for (const [index, line] of node.lines.entries()) {
    assert(['naiwa', 'player', 'narrator'].includes(line.speaker), `${id}: speaker`)
    for (const lang of ['zh', 'en']) {
      assert(line.text[lang]?.trim(), `${id}/${index}: missing ${lang}`)
      if (line.speaker !== 'naiwa') assert(existsSync(`public/audio/tts/romance-${id}-${index}-${lang}.mp3`), `${id}/${index}: missing ${lang} TTS`)
    }
    const shot = romanceVisual(id, index)
    assert(existsSync(`public/images/${shot.image}.webp`), `${id}/${index}: missing storyboard image`)
    assert(shot.alt.zh && shot.alt.en, `${id}/${index}: missing visual description`)
    assert.deepEqual(romanceVisual(id, index), shot, 'Reload and language changes preserve the same shot')
    if (line.speaker === 'naiwa') assert(shot.character, `${id}/${index}: character dialogue must show Naiwa`)
    usedImages.add(shot.image)
    lines++
  }
  for (const choice of node.choices ?? []) for (const lang of ['zh', 'en']) assert(choice.text[lang]?.trim(), `${id}: untranslated choice`)
}
assert.deepEqual(Object.keys(romanceVisualCues).sort(), Object.keys(story).sort(), 'Every branch needs explicit storyboard cues')
for (const [id, cues] of Object.entries(romanceVisualCues)) {
  assert.equal(cues[0].at, 0, `${id}: initial shot missing`)
  let previous = -1
  for (const cue of cues) {
    assert(cue.at > previous && cue.at < story[id].lines.length, `${id}: invalid shot timing`)
    assert(romanceArt[cue.art], `${id}: unknown shot`)
    previous = cue.at
  }
}
const portraits = Object.values(romanceArt).filter(shot => shot.character)
assert.equal(portraits.length, 10, 'Ten dedicated character close-ups and interactions are wired in')
for (const shot of portraits) {
  assert(usedImages.has(shot.image), `Unused character image: ${shot.image}`)
  assert(existsSync(`assets/images/${shot.image}.png`), `Missing original image: ${shot.image}`)
}
assert.equal(romanceVisual('shore-wish', 1).image, romanceArt.shoreSmile.image, 'The hug only appears after consent')
assert.equal(romanceVisual('shore-wish', 2).image, romanceArt.hug.image)
for (const index of story['shore-missed'].lines.keys()) assert.notEqual(romanceVisual('shore-missed', index).image, romanceArt.seaglass.image, 'A missed treasure cannot appear in the image')
for (const id of ['rain', 'rain-sound', 'rain-end']) for (const index of story[id].lines.keys()) assert.notEqual(romanceVisual(id, index).image, romanceArt.stars.image, 'Star projection belongs to the chosen planetarium branch')
assert.equal(nextRomanceImage('departure-train', 0), romanceArt.trainClose.image)
assert.equal(nextRomanceImage('departure-train', 3), undefined)
assert.deepEqual(romanceVisual('dawn', -1), romanceVisual('dawn', 0))
for (const episode of episodes) {
  assert(romanceEpisodeCover(episode.id).character, 'Each journal cover shows the character')
  assert(episode.image.startsWith('dlc-coastal-'), 'DLC must use new, dedicated scene art')
  assert(existsSync(`public/images/${episode.image}.webp`), `${episode.id}: missing illustration`)
  const walk = (id, trail = []) => {
    assert(Object.hasOwn(story, id), `missing node ${id}`)
    assert(!trail.includes(id), `cycle at ${id}`)
    const node = story[id]
    assert.equal(node.episode, episode.id, `${id}: crosses into another date`)
    reached.add(id)
    if (node.ending) { routes++; return }
    const targets = node.finale ? ['dawn-tide', 'dawn-sound', 'dawn-promise'] : node.activity === 'trail' ? ['shore-found', 'shore-missed'] : node.choices?.map(c => c.next) ?? [node.next]
    for (const target of targets) walk(target, [...trail, id])
  }
  walk(episode.start)
}
assert.equal(reached.size, Object.keys(story).length, 'unreachable nodes')
const endings = new Set()
for (const gear of [['blanket', 'thermos'], ['blanket', 'recorder'], ['thermos', 'recorder']]) {
  for (const treasure of [false, true]) for (const choice of ['rain-stars', 'rain-sound']) endings.add(romanceFinale(gear, treasure, choice))
}
assert.equal(endings.size, 3, 'all three endings must be reachable from player decisions')
assert.equal(romanceFinale(['blanket', 'thermos'], true, 'rain-stars'), 'dawn-tide')
assert.equal(romanceFinale(['blanket', 'recorder'], false, 'rain-sound'), 'dawn-sound')
assert.equal(romanceFinale(['blanket', 'recorder'], false, 'rain-stars'), 'dawn-promise')
assert.equal(romanceTrailResult([]), 'pending')
assert.equal(romanceTrailResult(['lighthouse', 'anchor', 'shell']), 'found')
assert.equal(romanceTrailResult(['anchor', 'lighthouse', 'shell']), 'retry')
assert.equal(romanceTrailResult(['lighthouse', 'lighthouse', 'shell']), 'retry')
assert.equal(romanceTrailResult(['lighthouse', 'anchor', 'shell', 'shell']), 'retry')
console.log(`Romance DLC OK: ${episodes.length} dates, ${routes} complete routes, ${lines} bilingual lines, all 3 decision-dependent endings and trail puzzle checked; ${portraits.length} character shots, branch-aware storyboard cuts, journal covers and male/narrator TTS checked.`)
