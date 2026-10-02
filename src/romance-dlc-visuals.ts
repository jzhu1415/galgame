import { romanceEpisodes, romanceStory } from './romance-dlc-story'
import type { Language } from './story'

type Art = { image: string; character: boolean; framing: 'wide' | 'close' | 'interaction'; position: string; alt: Record<Language, string> }
type Cue = { at: number; art: keyof typeof romanceArt }
const art = (image: string, character: boolean, framing: Art['framing'], zh: string, en: string, position = '50% 30%'): Art => ({ image: `dlc-coastal-${image}`, character, framing, position, alt: { zh, en } })
export const romanceArt = {
  train: art('train', false, 'wide', '沿海末班列车的窗景', 'The view from the last coastal train'),
  shore: art('shore', false, 'wide', '退潮后的海岸与灯塔', 'The low-tide shore and lighthouse'),
  rain: art('rain', false, 'wide', '海边旅馆窗外的雨夜', 'Rain outside the seaside inn'),
  dawn: art('dawn', false, 'wide', '日出时的海堤', 'The seawall at sunrise'),
  packing: art('packing-close', true, 'close', '奶蛙带着期待，询问旅行袋里要带些什么', 'Naiwa eagerly asks what to pack for the trip', '43% 30%'),
  trainClose: art('train-close', true, 'close', '列车窗边，奶蛙转过脸向你微笑', 'Naiwa turns from the train window with an affectionate smile'),
  shoreSmile: art('shore-smile', true, 'close', '奶蛙拿着地图，在海岸步道上回头看你', 'Naiwa looks back at you with the coastal map'),
  seaglass: art('seaglass-close', true, 'close', '奶蛙把找到的海玻璃举到阳光下', 'Naiwa holds the recovered sea glass up to the sun', '48% 30%'),
  hug: art('hug-close', true, 'interaction', '海风里，奶蛙微笑着接受你的拥抱', 'Naiwa smiles as it accepts your hug in the sea breeze', '60% 30%'),
  rainClose: art('rain-close', true, 'close', '奶蛙捏着没用上的车票，安静地失落了一会儿', 'Naiwa holds the unused tickets with quiet disappointment', '55% 30%'),
  stars: art('stars-close', true, 'close', '星空投影映在奶蛙笑起来的脸上', 'Projected stars light Naiwa’s joyful face'),
  rainTogether: art('rain-together', true, 'interaction', '雨夜窗边，奶蛙放松下来，轻轻握住你的手', 'Naiwa relaxes beside the rainy window and gently holds your hand', '45% 30%'),
  dawnClose: art('dawn-close', true, 'interaction', '清晨海堤上，奶蛙迎着暖光与你相望', 'Naiwa meets your gaze in the warm sunrise on the seawall', '40% 30%'),
  letter: art('letter-close', true, 'close', '奶蛙认真地把写给未来的信递给你', 'Naiwa earnestly offers you the letter to your future selves', '45% 30%'),
} as const

// Establish the setting, then cut to the face or gesture named in the dialogue.
// Found/missed and rainy-night branches never show props or actions not chosen.
export const romanceVisualCues: Record<string, Cue[]> = {
  departure: [{ at: 0, art: 'packing' }],
  'departure-train': [{ at: 0, art: 'train' }, { at: 1, art: 'trainClose' }],
  'departure-route': [{ at: 0, art: 'trainClose' }],
  'departure-slow': [{ at: 0, art: 'trainClose' }],
  'departure-end': [{ at: 0, art: 'train' }, { at: 1, art: 'trainClose' }],
  shore: [{ at: 0, art: 'shore' }, { at: 1, art: 'shoreSmile' }],
  'shore-found': [{ at: 0, art: 'seaglass' }],
  'shore-help': [{ at: 0, art: 'shore' }, { at: 1, art: 'shoreSmile' }],
  'shore-wish': [{ at: 0, art: 'shoreSmile' }, { at: 2, art: 'hug' }],
  'shore-missed': [{ at: 0, art: 'shore' }, { at: 1, art: 'shoreSmile' }],
  'shore-end': [{ at: 0, art: 'shore' }, { at: 1, art: 'shoreSmile' }],
  rain: [{ at: 0, art: 'rainClose' }, { at: 3, art: 'rain' }],
  'rain-stars': [{ at: 0, art: 'stars' }],
  'rain-sound': [{ at: 0, art: 'rainTogether' }],
  'rain-end': [{ at: 0, art: 'rain' }, { at: 1, art: 'rainTogether' }],
  dawn: [{ at: 0, art: 'dawn' }, { at: 1, art: 'dawnClose' }, { at: 3, art: 'letter' }],
  'dawn-tide': [{ at: 0, art: 'dawnClose' }, { at: 1, art: 'letter' }, { at: 3, art: 'dawnClose' }],
  'dawn-sound': [{ at: 0, art: 'dawnClose' }, { at: 3, art: 'letter' }],
  'dawn-promise': [{ at: 0, art: 'letter' }],
}

export function romanceVisual(nodeId: string, line: number): Art {
  const node = Object.hasOwn(romanceStory, nodeId) ? romanceStory[nodeId] : undefined
  const index = node ? Math.max(0, Math.min(Number.isFinite(line) ? Math.floor(line) : 0, node.lines.length - 1)) : 0
  let selected = romanceArt.train
  for (const cue of Object.hasOwn(romanceVisualCues, nodeId) ? romanceVisualCues[nodeId] : []) {
    if (cue.at > index) break
    selected = romanceArt[cue.art]
  }
  return selected
}

// Preload only the next cut; no random image state is stored in the save.
export function nextRomanceImage(nodeId: string, line: number): string | undefined {
  const next = Object.hasOwn(romanceVisualCues, nodeId) ? romanceVisualCues[nodeId].find(cue => cue.at > line) : undefined
  return next ? romanceArt[next.art].image : undefined
}
export function romanceEpisodeCover(id: string): Art {
  const cover: Record<string, keyof typeof romanceArt> = { departure: 'trainClose', shore: 'shoreSmile', rain: 'rainTogether', dawn: 'letter' }
  return romanceArt[cover[id] ?? 'trainClose']
}
export function romanceEnvironment(nodeId: string): string {
  const episode = romanceEpisodes.find(ep => ep.id === romanceStory[nodeId]?.episode)
  return episode?.image ?? romanceArt.train.image
}
