import { execFile } from 'node:child_process'
import { relative, isAbsolute } from 'node:path'
import { promisify } from 'node:util'

const execute = promisify(execFile)

export function affectsGameStatistics(root, file) {
  const path = relative(root, file).replaceAll('\\', '/')
  if (isAbsolute(path) || path.startsWith('../')) return false
  if (path === 'src/game-statistics.ts') return false
  return (path.startsWith('src/') && path.endsWith('.ts'))
    || (path.startsWith('public/images/') && path.endsWith('.webp'))
    || ['scripts/generate-game-statistics.mjs', 'scripts/ts-module.mjs'].includes(path)
}

// Serialize batches: edits that arrive during a run trigger one more run, rather
// than racing generated files or leaving a newer edit out of the statistics.
export function createStatisticsRefresh(run, onError, delay = 180) {
  let timer, active = null, dirty = false, disposed = false
  async function flush() {
    clearTimeout(timer)
    timer = undefined
    if (disposed) return
    if (active) { dirty = true; await active; return }
    active = (async () => {
      do {
        dirty = false
        try { await run() } catch (error) { if (!disposed) onError(error) }
      } while (dirty && !disposed)
    })()
    try { await active } finally { active = null }
  }
  return {
    flush,
    schedule() {
      if (disposed) return
      if (active) { dirty = true; return }
      clearTimeout(timer)
      timer = setTimeout(() => { timer = undefined; void flush() }, delay)
    },
    dispose() { disposed = true; dirty = false; clearTimeout(timer) },
  }
}

export function gameStatisticsPlugin() {
  return {
    name: 'naiwa-game-statistics',
    apply: 'serve',
    async configureServer(server) {
      const root = server.config.root
      const refresh = createStatisticsRefresh(async () => {
        await execute(process.execPath, ['scripts/generate-game-statistics.mjs'], { cwd: root })
      }, error => server.config.logger.error(`[game statistics] ${error.stderr || error.message}`))
      const changed = (event, file) => {
        if (['add', 'change', 'unlink'].includes(event) && affectsGameStatistics(root, file)) refresh.schedule()
      }
      server.watcher.on('all', changed)
      const close = () => { refresh.dispose(); server.watcher.off('all', changed) }
      server.httpServer?.once('close', close)
      server.watcher.once('close', close)
      await refresh.flush()
    },
  }
}
