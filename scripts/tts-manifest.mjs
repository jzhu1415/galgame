import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'

async function loadStory() {
  const source = readFileSync(new URL('../src/story.ts', import.meta.url), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  return (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)).story
}

async function loadChapterTwoCopy() {
  const source = readFileSync(new URL('../src/chapter-two.ts', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('chapter-two.ts', source, ts.ScriptTarget.ES2022, true)
  let copy
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) !== 'copy') continue
      const expression = ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer
      const js = ts.transpileModule(`export default ${expression.getText(ast)}`, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      copy = (await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)).default
    }
  }
  if (!copy) throw new Error('Chapter two dialogue data was not found')
  return copy
}

const entries = []
const story = await loadStory()
const chapterTwo = await loadChapterTwoCopy()
const voices = {
  hero: { zh: 'zh-CN-YunxiNeural', en: 'en-US-AndrewNeural' },
  narrator: { zh: 'zh-CN-YunyangNeural', en: 'en-US-BrianNeural' },
}
const add = (path, text, role, lang) => {
  const voice = voices[role][lang]
  const rate = role === 'narrator' ? '-5%' : '+0%'
  const hash = createHash('sha256').update(`${voice}\0${rate}\0${text}`).digest('hex')
  entries.push({ path, text, voice, rate, hash })
}

for (const [sceneId, scene] of Object.entries(story)) {
  scene.lines.forEach((line, index) => {
    if (!line.speaker) {
      for (const lang of ['zh', 'en']) add(`tts/narration-01-${sceneId}-${index}-${lang}.mp3`, line.text[lang], 'narrator', lang)
    } else if (line.sound?.startsWith('protagonist-')) {
      for (const lang of ['zh', 'en']) add(`tts/hero-${line.sound.slice('protagonist-'.length)}-${lang}.mp3`, line.text[lang], 'hero', lang)
    }
  })
}

for (const phase of ['hospital', 'threshold', 'core', 'ending']) {
  chapterTwo.zh[phase].forEach(([speaker], index) => {
    if (speaker !== '旁白') return
    for (const lang of ['zh', 'en']) {
      if (chapterTwo[lang][phase][index][0] !== 'Narration' && lang === 'en') throw new Error(`Missing narration translation: ${phase}:${index}`)
      const text = chapterTwo[lang][phase][index][1]
      if (phase === 'core' && index === 1) {
        add(`tts/narration-02-${phase}-${index}-${lang}.mp3`, text, 'narrator', lang)
        for (const [approach, variant] of Object.entries(chapterTwo[lang].approachLines)) add(`tts/narration-02-${phase}-${index}-${approach}-${lang}.mp3`, variant, 'narrator', lang)
      } else if (phase === 'ending' && index === 0) {
        add(`tts/narration-02-${phase}-${index}-${lang}.mp3`, text, 'narrator', lang)
        for (const [response, variant] of Object.entries(chapterTwo[lang].responseLines)) add(`tts/narration-02-${phase}-${index}-${response}-${lang}.mp3`, variant, 'narrator', lang)
      } else add(`tts/narration-02-${phase}-${index}-${lang}.mp3`, text, 'narrator', lang)
    }
  })
}

const romanceSource = readFileSync(new URL('../src/romance-dlc-story.ts', import.meta.url), 'utf8')
const romanceJs = ts.transpileModule(romanceSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { romanceStory } = await import(`data:text/javascript;base64,${Buffer.from(romanceJs).toString('base64')}`)
for (const [id, node] of Object.entries(romanceStory)) {
  node.lines.forEach((line, index) => {
    if (line.speaker === 'naiwa') return
    for (const lang of ['zh', 'en']) {
      add(`tts/romance-${id}-${index}-${lang}.mp3`, line.text[lang], line.speaker === 'player' ? 'hero' : 'narrator', lang)
      if (line.blanketText) add(`tts/romance-${id}-${index}-blanket-${lang}.mp3`, line.blanketText[lang], 'narrator', lang)
    }
  })
}

const paths = new Set()
const gildedSource = readFileSync(new URL('../src/chapter-four-story.ts', import.meta.url), 'utf8')
const gildedJs = ts.transpileModule(gildedSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { gildedStory } = await import(`data:text/javascript;base64,${Buffer.from(gildedJs).toString('base64')}`)
for (const [id, node] of Object.entries(gildedStory)) {
  node.lines.forEach((line, index) => {
    // Established character voices retain the user's original four-clip rotation.
    if (line.speaker === 'naishen' || line.speaker === 'naiba') return
    for (const lang of ['zh', 'en']) add(`tts/chapter-04-${id}-${index}-${lang}.mp3`, line.text[lang], line.speaker === 'me' ? 'hero' : 'narrator', lang)
  })
}

for (const entry of entries) {
  if (!entry.text.trim()) throw new Error(`Empty TTS text: ${entry.path}`)
  if (paths.has(entry.path)) throw new Error(`Duplicate TTS path: ${entry.path}`)
  paths.add(entry.path)
}
process.stdout.write(JSON.stringify(entries))
