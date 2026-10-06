import type { IceApproach, IceHistoryEntry, IceResponse } from './chapter-two-progress'

type DialogueCopy = Record<IceHistoryEntry['phase'], readonly (readonly [string, string])[]> & {
  approachLines: Record<IceApproach, string>
  responseLines: Record<IceResponse, string>
}

// One resolver keeps the on-screen line, its narration clip and the history aligned.
export function resolveIceDialogue(copy: DialogueCopy, entry: IceHistoryEntry) {
  const line = copy[entry.phase][entry.line]
  const variant = entry.phase === 'core' && entry.line === 1 ? entry.approach
    : entry.phase === 'ending' && entry.line === 0 ? entry.response : null
  const text = entry.phase === 'core' && entry.line === 1 && entry.approach ? copy.approachLines[entry.approach]
    : entry.phase === 'ending' && entry.line === 0 && entry.response ? copy.responseLines[entry.response] : line?.[1] ?? ''
  return { speaker: line?.[0] ?? '', text, variant: variant ?? null }
}
