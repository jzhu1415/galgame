import { finaleEndingIds, finaleStories, newFinaleSave, normalizeFinaleSave, type FinaleChapter, type FinaleSave } from './finale-story'

export type FinaleCheckpoint = Omit<FinaleSave, 'line' | 'history' | 'visited' | 'endings'>
export type FinaleProgress = { version: 1; chapter: FinaleChapter; checkpoints: Record<string, FinaleCheckpoint>; visited: string[]; endings: string[] }

const copyCheckpoint = (save: FinaleSave): FinaleCheckpoint => ({
  version: 1,
  chapter: save.chapter,
  node: save.node,
  spirit: save.spirit,
  clues: [...save.clues],
  flags: [...save.flags],
})
const emptyProgress = (chapter: FinaleChapter): FinaleProgress => ({ version: 1, chapter, checkpoints: {}, visited: [], endings: [] })
const unique = (values: string[]): string[] => [...new Set(values)]
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

/** Merge real legacy checkpoints without manufacturing any earlier state. */
export function mergeFinaleProgress(rawFive: unknown, rawSix: unknown): FinaleProgress {
  const five = normalizeFinaleProgress(5, rawFive)
  if (!isRecord(rawSix)) return five
  const six = normalizeFinaleProgress(6, rawSix)
  const converted = normalizeFinaleProgress(5, {
    ...six, chapter: 5,
    endings: six.endings.map(id => id === 'f6-exhausted' ? 'f5-exhausted' : id),
    checkpoints: Object.fromEntries(Object.entries(six.checkpoints).map(([id, checkpoint]) => [
      id === 'f6-exhausted' ? 'f5-exhausted' : id,
      { ...checkpoint, chapter: 5, node: id === 'f6-exhausted' ? 'f5-exhausted' : id },
    ])),
  })
  return { ...five, checkpoints: { ...converted.checkpoints, ...five.checkpoints },
    visited: unique([...five.visited, ...converted.visited]), endings: unique([...five.endings, ...converted.endings]) }
}

export function newFinaleProgress(chapter: FinaleChapter): FinaleProgress {
  return emptyProgress(chapter)
}

export function normalizeFinaleProgress(chapter: FinaleChapter, raw: unknown): FinaleProgress {
  if (raw == null) return newFinaleProgress(chapter)
  if (!isRecord(raw)) return newFinaleProgress(chapter)

  // Existing progress without snapshots keeps its known visits, but replay stays locked
  // until the player reaches a node again under this checkpoint format.
  const progress = emptyProgress(chapter)
  const dataChapter = raw.chapter === undefined ? chapter : raw.chapter
  const sameChapter = dataChapter === chapter
  const validNode = (id: unknown): id is string => typeof id === 'string' && Object.hasOwn(finaleStories[chapter], id)

  if (Array.isArray(raw.visited)) progress.visited = unique(raw.visited.filter(validNode))
  if (Array.isArray(raw.endings)) progress.endings = unique(raw.endings.filter((id): id is string => typeof id === 'string' && finaleEndingIds[chapter].includes(id)))

  if (sameChapter && raw.version === 1 && isRecord(raw.checkpoints)) {
    for (const [id, value] of Object.entries(raw.checkpoints)) {
      if (!validNode(id) || !isRecord(value) || value.node !== id || value.chapter !== chapter) continue
      if (!Number.isInteger(value.spirit) || Number(value.spirit) < 0 || Number(value.spirit) > 100) continue
      if (!Array.isArray(value.clues) || value.clues.some(clue => typeof clue !== 'string')) continue
      if (!Array.isArray(value.flags) || value.flags.some(flag => typeof flag !== 'string')) continue
      const candidate = normalizeFinaleSave(chapter, { ...value, version: 1, chapter, node: id, line: 0, history: [], visited: [id], endings: [] })
      if (candidate.node !== id || candidate.spirit !== value.spirit) continue
      progress.checkpoints[id] = copyCheckpoint(candidate)
    }
  }
  progress.visited = unique([...progress.visited, ...Object.keys(progress.checkpoints)])
  return progress
}

export function recordFinaleCheckpoint(progress: FinaleProgress, save: FinaleSave, arrival = true): FinaleProgress {
  if (save.chapter !== progress.chapter) return progress
  const checkpoints = arrival && save.line === 0 && !Object.hasOwn(progress.checkpoints, save.node)
    ? { ...progress.checkpoints, [save.node]: copyCheckpoint(save) }
    : progress.checkpoints
  return {
    version: 1,
    chapter: progress.chapter,
    checkpoints,
    visited: unique([...progress.visited, ...save.visited, save.node]),
    endings: unique([...progress.endings, ...save.endings].filter(id => finaleEndingIds[progress.chapter].includes(id))),
  }
}

export function restartFinaleFrom(chapter: FinaleChapter, progress: FinaleProgress, id: string): FinaleSave | null {
  if (progress.chapter !== chapter || !Object.hasOwn(progress.checkpoints, id)) return null
  const checkpoint = progress.checkpoints[id]
  return normalizeFinaleSave(chapter, {
    ...newFinaleSave(chapter, progress.endings),
    ...checkpoint,
    chapter,
    node: id,
    line: 0,
    visited: [id],
    history: [],
    endings: [...progress.endings],
  })
}
