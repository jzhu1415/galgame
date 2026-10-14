import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { affectsGameStatistics, createStatisticsRefresh, gameStatisticsPlugin } from './game-statistics-plugin.mjs'
const root = process.cwd()
for (const file of ['src/story.ts', 'src/chapter-two.ts', 'src/finale-story.ts', 'public/images/new-frame.webp', 'scripts/generate-game-statistics.mjs']) assert(affectsGameStatistics(root, resolve(root, file)))
for (const file of ['src/game-statistics.ts', 'docs/game-statistics.json', 'src/finale-map.css', 'assets/images/new-frame.png', 'public/audio/tts/test.mp3', 'node_modules/package/test.ts']) assert(!affectsGameStatistics(root, resolve(root, file)))
assert(!affectsGameStatistics(root, resolve(root, '../another-project/src/story.ts')))

const sleep = ms => new Promise(done => setTimeout(done, ms))
let runs = 0
const burst = createStatisticsRefresh(async () => { runs++ }, assert.fail, 10)
for (let i = 0; i < 10; i++) burst.schedule()
await sleep(35)
assert.equal(runs, 1, 'A burst of file events starts one statistics run')
burst.dispose()
burst.schedule(); await sleep(25)
assert.equal(runs, 1, 'A closed server cannot schedule new work')

let running = 0, peak = 0, batches = 0
const releases = []
const serial = createStatisticsRefresh(() => {
  batches++; running++; peak = Math.max(peak, running)
  return new Promise(done => releases.push(() => { running--; done() }))
}, assert.fail, 10)
const initial = serial.flush()
assert.equal(batches, 1)
for (let i = 0; i < 10; i++) serial.schedule()
releases.shift()()
await new Promise(done => setImmediate(done))
assert.equal(batches, 2, 'Edits during a running generation are not lost')
assert.equal(peak, 1, 'Generated files are never written concurrently')
serial.schedule(); serial.dispose(); releases.shift()(); await initial
assert.equal(batches, 2, 'Disposal drops pending batches')

let attempts = 0
const errors = []
const recovery = createStatisticsRefresh(async () => { if (++attempts === 1) throw new Error('artwork not ready') }, error => errors.push(error.message), 10)
await recovery.flush(); await recovery.flush(); recovery.dispose()
assert.equal(attempts, 2)
assert.deepEqual(errors, ['artwork not ready'], 'A temporary missing asset is reported and a later update can recover')

// Exercise the real plugin startup and native lifecycle without opening a browser.
const files = ['src/game-statistics.ts', 'docs/game-statistics.json']
const before = files.map(file => readFileSync(file, 'utf8'))
const watcher = new EventEmitter(), httpServer = new EventEmitter(), startupErrors = []
const plugin = gameStatisticsPlugin()
assert.equal(plugin.apply, 'serve', 'The build still uses its existing prebuild generator')
await plugin.configureServer({ config: { root, logger: { error: text => startupErrors.push(text) } }, watcher, httpServer })
assert.equal(watcher.listenerCount('all'), 1)
assert.deepEqual(files.map(file => readFileSync(file, 'utf8')), before, 'Current totals are regenerated idempotently at startup')
httpServer.emit('close')
assert.equal(watcher.listenerCount('all'), 0)
assert.deepEqual(startupErrors, [])
console.log('Statistics refresh OK: input filtering, generated-file loop prevention, burst batching, serial latest-edit refresh, error recovery, real startup generation and shutdown cleanup.')
