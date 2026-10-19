import { build } from 'vite'
import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = resolve(root, 'sites/naiwa-escape')
const outDir = resolve(site, 'dist')
const manifestPath = resolve(site, '.openai/hosting.json')
const hosting = JSON.parse(await readFile(resolve(root, 'sites/escape-hosting.json'), 'utf8'))
let current
try { current = JSON.parse(await readFile(manifestPath, 'utf8')) }
catch (error) { if (error.code !== 'ENOENT') throw error }
if (current && current.project_id !== hosting.project_id) throw new Error('Preserve the existing Site identity; reconcile hosting manifests before building.')
await mkdir(resolve(site, '.openai'), { recursive: true })
await writeFile(manifestPath, JSON.stringify({ ...hosting, ...current, static: { directory: 'dist' } }, null, 2) + '\n')

// Reuse the actual game entry and modules, without copying the visual novel's
// illustrations, recordings and films into the separate game's deployment.
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: resolve(root, 'frog-escape-map.html') },
  },
})
await rename(resolve(outDir, 'frog-escape-map.html'), resolve(outDir, 'index.html'))
await mkdir(resolve(outDir, 'audio'), { recursive: true })
await cp(resolve(root, 'public/audio/frog-escape'), resolve(outDir, 'audio/frog-escape'), { recursive: true })
await writeFile(resolve(site, 'README.md'), `# Naiwa’s Deadly Love\n\nPublic standalone edition of the castle escape game.\n\nThis static snapshot is built from the shared game source in https://github.com/jzhu1415/galgame with \`npm run build:escape\`. Only the game's JavaScript, CSS, rigged model and licensed audio are included.\n`)
console.log('Standalone escape site prepared in sites/naiwa-escape/dist')
