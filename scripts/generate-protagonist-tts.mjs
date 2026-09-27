import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const source = readFileSync(resolve('src/story.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { story } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const voices = { zh: 'Eddy (Chinese (China mainland))', en: 'Eddy (English (US))' }
const output = resolve('public/audio')
const temporary = mkdtempSync(join(tmpdir(), 'naiwa-tts-'))

mkdirSync(output, { recursive: true })
try {
  for (const scene of Object.values(story)) {
    for (const line of scene.lines) {
      if (!line.sound?.startsWith('protagonist-')) continue
      if (line.speaker?.zh !== '我' || line.speaker?.en !== 'Me') throw new Error(`${line.sound} is not spoken by the protagonist`)
      for (const lang of ['zh', 'en']) {
        const aiff = join(temporary, `${line.sound}-${lang}.aiff`)
        const m4a = join(output, `${line.sound}-${lang}.m4a`)
        execFileSync('say', ['-v', voices[lang], '-o', aiff, line.text[lang]])
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-c:a', 'aac', '-b:a', '96k', m4a])
        process.stdout.write(`${m4a}\n`)
      }
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
