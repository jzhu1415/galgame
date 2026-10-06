import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
const urls = new Map()
process.on('uncaughtException', error => {
  console.error((error.stack ?? String(error)).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<TS module>'))
  process.exitCode = 1
})
export const compile = file => ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
export const moduleUrl = js => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
export function tsModuleUrl(file) {
  file = resolve(file)
  if (!urls.has(file)) {
    const js = compile(file).replace(/^import ['"][^'"]+\.css['"];\n/gm, '').replace(/(['"])(\.\/[^'"]+)\1/g, (_match, _quote, relative) => JSON.stringify(tsModuleUrl(resolve(dirname(file), `${relative}.ts`))))
    urls.set(file, moduleUrl(js))
  }
  return urls.get(file)
}
