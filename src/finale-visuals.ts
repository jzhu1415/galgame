import type { FinaleChapter, FinaleNode } from './finale-story'

type SceneVisual = { src: string }
export const finaleVisuals: Record<FinaleNode['art'], SceneVisual> = {
  abyss: { src: '/images/finale-abyss.webp' },
  pursuit: { src: '/images/finale-pursuit.webp' },
  archive: { src: '/images/finale-archive.webp' },
  laboratory: { src: '/images/finale-laboratory.webp' },
  core: { src: '/images/finale-core.webp' },
  awakening: { src: '/images/finale-awakening.webp' },
  city: { src: '/images/finale-city.webp' },
  aftermath: { src: '/images/finale-aftermath.webp' },
  dawn: { src: '/images/finale-dawn.webp' },
  cradle: { src: '/images/finale-cradle.webp' },
}

export function finaleSceneImage(chapter: FinaleChapter, art: FinaleNode['art'], node = ''): string {
  // City destruction happens only after the final battle, never in chapter five.
  if (chapter === 5 && node.startsWith('f5-') && (art === 'dawn' || art === 'aftermath')) return finaleVisuals.awakening.src
  return finaleVisuals[art].src
}
