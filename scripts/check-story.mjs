import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

const source = readFileSync(resolve('src/story.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { story, firstScene } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const errors = []

for (const [id, scene] of Object.entries(story)) {
  if (!scene.lines?.length) errors.push(`${id}: no dialogue`)
  if (!existsSync(resolve(`public/images/${scene.image}.webp`))) errors.push(`${id}: missing image ${scene.image}`)
  if (!scene.ending && !scene.next && !scene.choices?.length) errors.push(`${id}: dead end`)
  if (scene.next && !story[scene.next]) errors.push(`${id}: missing next ${scene.next}`)
  for (const line of scene.lines) {
    if (!line.text.zh?.trim() || !line.text.en?.trim()) errors.push(`${id}: missing translation`)
  }
  for (const choice of scene.choices ?? []) {
    if (!story[choice.next]) errors.push(`${id}: missing choice target ${choice.next}`)
    if (!choice.text.zh?.trim() || !choice.text.en?.trim()) errors.push(`${id}: missing choice translation`)
  }
}

const queue = [{ id: firstScene, spirit: 100, danger: 0, memories: [] }]
const seen = new Set()
const visitedScenes = new Set()
const visitedEndings = new Set()
while (queue.length) {
  const state = queue.shift()
  const key = `${state.id}|${state.spirit}|${state.danger}|${state.memories.join(',')}`
  if (seen.has(key)) continue
  seen.add(key)
  const scene = story[state.id]
  visitedScenes.add(state.id)
  if (scene.ending) { visitedEndings.add(scene.ending); continue }
  if (scene.next) queue.push({ ...state, id: scene.next })
  for (const choice of scene.choices ?? []) {
    if (choice.unlessMemory && state.memories.includes(choice.unlessMemory)) continue
    if (choice.requiresAllMemories && state.memories.length !== 3) continue
    const spirit = Math.max(0, state.spirit + (choice.spirit ?? 0))
    const danger = Math.max(0, state.danger + (choice.danger ?? 0))
    const memories = choice.memory ? [...state.memories, choice.memory].sort() : state.memories
    const id = spirit === 0 ? 'exhausted' : state.id === 'm06' && choice.next !== 'm07' && danger >= 4 ? 'doll_hunt' : choice.next
    queue.push({ id, spirit, danger, memories })
  }
}

for (const id of Object.keys(story)) if (!visitedScenes.has(id)) errors.push(`${id}: unreachable scene`)
for (const ending of ['missed', 'embrace', 'escape', 'exhausted', 'true']) if (!visitedEndings.has(ending)) errors.push(`${ending}: unreachable ending`)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Story OK: ${visitedScenes.size} scenes, ${visitedEndings.size} endings, Chinese and English text, images and routes checked.`)
