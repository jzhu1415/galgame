import { theatreStory } from './chapter-three-story'
import type { Bilingual } from './story'

export type NaifenExpression = 'neutral' | 'angry' | 'scared' | 'sad' | 'guarded' | 'relieved' | 'happy'
export type TheatreVisual = { background: string; expression: NaifenExpression; showCharacter: boolean; position: 'center' | 'left' | 'right' }
type VisualCue = Partial<TheatreVisual> & { at: number }
export const naifenExpressions: Record<NaifenExpression, { image: string; description: Bilingual }> = {
  neutral: { image: 'chapter-03-naifen', description: { zh: '奶粉向你伸出手', en: 'Naifen reaches toward you' } },
  angry: { image: 'chapter-03-naifen-angry', description: { zh: '奶粉皱眉握拳，显得愤怒', en: 'Naifen frowns and clenches its fists in anger' } },
  scared: { image: 'chapter-03-naifen-scared', description: { zh: '奶粉睁大眼睛，把手护在身前', en: 'Naifen holds its hands close with wide, frightened eyes' } },
  sad: { image: 'chapter-03-naifen-sad', description: { zh: '奶粉低垂肩膀，委屈得快要哭了', en: 'Naifen’s shoulders droop, its eyes close to tears' } },
  guarded: { image: 'chapter-03-naifen-guarded', description: { zh: '奶粉警惕地望着你，伸手示意停下', en: 'Naifen watches warily and raises a hand to ask you to stop' } },
  relieved: { image: 'chapter-03-naifen-relieved', description: { zh: '奶粉放松肩膀，露出释然的微笑', en: 'Naifen relaxes with a small, relieved smile' } },
  happy: { image: 'chapter-03-naifen-happy', description: { zh: '奶粉开心地微笑，轻轻张开双手', en: 'Naifen smiles warmly, opening its arms a little' } },
}
export const chapterThreeNewScenes = ['offer', 'entrance', 'rain', 'breakfast', 'film', 'backstage', 'bargain', 'curtain', 'collapse'].map(id => `chapter-03-cg-${id}`)
const scene = (id: string) => `chapter-03-cg-${id}`
const baseArt = { hospital: 'chapter-02-hospital', theatre: 'chapter-03-theatre', rain: 'P02', breakfast: 'R02_KITCHEN', film: 'chapter-02-crash-memory', backstage: 'chapter-03-theatre' }

// Cues apply from their line onward. Changing language or loading a save selects
// the same shot and expression without altering any story state.
export const chapterThreeVisualCues: Record<string, VisualCue[]> = {
  invitation: [
    { at: 0, background: 'chapter-02-hospital', showCharacter: false },
    { at: 1, background: scene('offer') },
    { at: 2, background: scene('film') },
    { at: 3, background: scene('offer') },
    { at: 6, background: 'chapter-02-journal' },
  ],
  threshold: [
    { at: 0, background: scene('entrance'), showCharacter: false },
    { at: 1, background: 'chapter-03-theatre' },
    { at: 2, expression: 'angry', showCharacter: true },
    { at: 4, expression: 'guarded' },
  ],
  meeting: [
    { at: 0, background: 'chapter-03-theatre', expression: 'guarded', showCharacter: true },
    { at: 1, expression: 'angry' },
    { at: 3, expression: 'scared' },
    { at: 4, expression: 'guarded' },
  ],
  // Keep the exploration overview fixed so its stage markers still match the props.
  explore: [{ at: 0, background: 'chapter-03-theatre', showCharacter: false }],
  rain: [
    { at: 0, background: scene('rain'), showCharacter: false },
    { at: 1, expression: 'angry', showCharacter: true },
    { at: 2, background: 'P02', showCharacter: false },
    { at: 4, background: scene('rain'), expression: 'guarded', showCharacter: true },
  ],
  'rain-kept': [
    { at: 0, background: scene('rain'), expression: 'relieved', showCharacter: true },
    { at: 1, expression: 'happy' },
  ],
  breakfast: [
    { at: 0, background: scene('breakfast'), showCharacter: false },
    { at: 1, expression: 'sad', showCharacter: true },
    { at: 2, background: 'R02_KITCHEN', showCharacter: false },
    { at: 4, background: scene('breakfast'), expression: 'sad', showCharacter: true },
  ],
  'breakfast-kept': [
    { at: 0, background: scene('breakfast'), expression: 'relieved', showCharacter: true },
    { at: 2, expression: 'happy' },
  ],
  film: [
    { at: 0, background: scene('film'), showCharacter: false },
    { at: 2, background: 'chapter-02-crash-memory' },
    { at: 3, background: scene('film'), expression: 'angry', showCharacter: true },
    { at: 4, expression: 'guarded' },
  ],
  'film-kept': [
    { at: 0, background: scene('film'), showCharacter: false },
    { at: 1, expression: 'guarded', showCharacter: true },
  ],
  rehearsal: [
    { at: 0, background: scene('collapse'), showCharacter: false },
    { at: 1, expression: 'scared', showCharacter: true },
    { at: 2, showCharacter: false },
  ],
  route: [
    { at: 0, background: scene('backstage'), showCharacter: false, position: 'left' },
    { at: 1, position: 'center' },
    { at: 2, position: 'right' },
    { at: 3, expression: 'guarded', showCharacter: true },
  ],
  'route-kept': [
    { at: 0, background: scene('backstage'), showCharacter: false, position: 'right' },
  ],
  trap: [
    { at: 0, background: scene('backstage'), showCharacter: false },
    { at: 1, background: scene('collapse'), expression: 'scared', showCharacter: true },
    { at: 2, background: 'chapter-03-theatre' },
  ],
  confrontation: [
    { at: 0, background: scene('bargain'), showCharacter: false },
    { at: 3, background: 'chapter-02-gauntlet' },
    { at: 5, background: scene('collapse'), expression: 'angry', showCharacter: true },
    { at: 6, background: scene('bargain'), showCharacter: false },
    { at: 7, background: scene('backstage') },
  ],
  bargain: [
    { at: 0, background: scene('bargain'), showCharacter: false },
    { at: 2, expression: 'sad', showCharacter: true },
  ],
  'fake-trade': [
    { at: 0, background: scene('bargain'), showCharacter: false },
    { at: 1, background: scene('backstage'), expression: 'guarded', showCharacter: true },
    { at: 2, expression: 'angry' },
  ],
  comfort: [
    { at: 0, background: 'chapter-03-theatre', expression: 'angry', showCharacter: true },
    { at: 1, expression: 'sad' },
  ],
  resistance: [
    { at: 0, background: scene('collapse'), expression: 'sad', showCharacter: true },
    { at: 1, background: 'chapter-03-theatre' },
  ],
  'real-trade': [
    { at: 0, background: scene('bargain'), showCharacter: false },
    { at: 1, background: 'chapter-03-theatre', expression: 'scared', showCharacter: true },
    { at: 2, expression: 'sad' },
    { at: 3, background: scene('backstage'), showCharacter: false },
  ],
  saved: [
    { at: 0, background: scene('curtain'), expression: 'relieved', showCharacter: true },
    { at: 1, expression: 'happy' },
    { at: 3, background: 'chapter-02-hospital', showCharacter: false },
    { at: 5, background: scene('offer') },
    { at: 6, background: 'chapter-02-gauntlet' },
    { at: 7, background: scene('curtain') },
  ],
  bargained: [
    { at: 0, background: 'chapter-02-hospital', showCharacter: false },
    { at: 2, background: 'chapter-02-gauntlet' },
    { at: 3, background: 'chapter-02-hospital' },
    { at: 4, background: 'chapter-02-gauntlet' },
    { at: 5, background: scene('backstage') },
  ],
  exhausted: [
    { at: 0, background: scene('collapse'), showCharacter: false },
    { at: 1, expression: 'scared', showCharacter: true },
    { at: 2, showCharacter: false },
  ],
}

export function chapterThreeVisual(nodeId: string, lineIndex: number): TheatreVisual {
  const id = Object.hasOwn(theatreStory, nodeId) ? nodeId : 'explore'
  const node = theatreStory[id]
  const line = Number.isFinite(lineIndex) ? Math.max(0, Math.min(node.lines.length - 1, Math.floor(lineIndex))) : 0
  const visual: TheatreVisual = { background: baseArt[node.art], expression: 'neutral', showCharacter: !!node.character || node.lines[line]?.speaker === 'naifen', position: 'center' }
  for (const cue of chapterThreeVisualCues[id] ?? []) {
    if (cue.at > line) break
    const { at: _, ...changes } = cue
    Object.assign(visual, changes)
  }
  return visual
}
