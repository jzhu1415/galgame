import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tsModuleUrl } from './ts-module.mjs'

const site = resolve('sites/naiwa-escape')
const dist = join(site, 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
assert(html.includes('奶蛙致死的爱') && html.includes('https://galgame-ashy.vercel.app'))
assert(!existsSync(join(dist, 'frog-escape-map.html')), 'the standalone root is the game itself')
for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) {
  assert(existsSync(join(dist, url)), `missing bundled entry ${url}`)
  assert(!url.startsWith('/src/'), 'entry scripts must be compiled')
}
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]) }
const artifacts = files(dist)
assert(artifacts.some(p => p.endsWith('.glb')), 'the real rigged character is included')
assert(!artifacts.some(p => /\.(webp|mp4)$/i.test(p)), 'visual-novel artwork and films are excluded')
const manifest = JSON.parse(readFileSync('assets/audio/frog-escape/manifest.json', 'utf8'))
for (const clip of Object.values(manifest.clips)) assert(existsSync(join(dist, 'audio/frog-escape', clip.file)), `missing audio ${clip.file}`)
const total = artifacts.reduce((sum, p) => sum + statSync(p).size, 0)
assert(total < 10_000_000, `standalone assets are unexpectedly large: ${total}`)
const { renderHomePage } = await import(tsModuleUrl('src/home-page.ts'))
const { escapeSiteUrl } = await import(tsModuleUrl('src/escape-site.ts'))
for (const language of ['zh', 'en']) {
  const home = renderHomePage(language, [])
  assert(home.includes(`href="${escapeSiteUrl}"`), 'both languages link to the standalone website')
  assert(home.includes(language === 'zh' ? '奶蛙致死的爱' : 'Naiwa’s Deadly Love'))
}
console.log(`Standalone site: ${artifacts.length} assets, ${(total / 1_000_000).toFixed(2)} MB; game entry, model, audio and bilingual home links pass.`)
