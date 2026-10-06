type Two = typeof import('./chapter-two')
type Three = typeof import('./chapter-three')
type Romance = typeof import('./romance-dlc')
let two: Promise<Two> | null = null
let three: Promise<Three> | null = null
let romance: Promise<Romance> | null = null
export const loadChapterTwo = () => two ??= import('./chapter-two').catch(error => { two = null; throw error })
export const loadChapterThree = () => three ??= import('./chapter-three').catch(error => { three = null; throw error })
export const loadRomanceDlc = () => romance ??= import('./romance-dlc').catch(error => { romance = null; throw error })
