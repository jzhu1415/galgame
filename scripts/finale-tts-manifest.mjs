import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const source = readFileSync(new URL('../src/finale-story.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { finaleStories } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const voices = {
  narrator: { zh: 'zh-CN-YunyangNeural', en: 'en-US-BrianNeural' },
  journal: { zh: 'zh-CN-YunyangNeural', en: 'en-US-BrianNeural' },
  me: { zh: 'zh-CN-YunxiNeural', en: 'en-US-AndrewNeural' },
  niulai: { zh: 'zh-CN-YunjianNeural', en: 'en-US-ChristopherNeural' },
  'banana-cat': { zh: 'zh-CN-YunxiaNeural', en: 'en-US-GuyNeural' },
  naidou: { zh: 'zh-CN-XiaoxiaoNeural', en: 'en-US-JennyNeural' },
}
const entries = []
for (const [chapter, story] of [['5', finaleStories[5]]]) {
  for (const [node, scene] of Object.entries(story)) scene.lines.forEach((line, index) => {
    if (['naiwa', 'naiba', 'feidudu'].includes(line.speaker)) return
    for (const language of ['zh', 'en']) {
      const text = line.text[language], voice = voices[line.speaker][language]
      const rate = line.speaker === 'narrator' || line.speaker === 'journal' ? '-5%' : '+0%'
      const path = `tts/finale-${chapter}-${node}-${index}-${language}.mp3`
      const hash = createHash('sha256').update(`${voice}\0${rate}\0${text}`).digest('hex')
      entries.push({ path, text, voice, rate, hash })
    }
  })
}
process.stdout.write(JSON.stringify(entries))
