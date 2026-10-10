import type { Bilingual } from './story'

export type GildedEnding = 'free' | 'bound' | 'exhausted'
export type GildedArt = 'room' | 'gallery' | 'threshold' | 'open'
export type GildedSpeaker = 'narrator' | 'me' | 'naishen' | 'naiba' | 'journal'
export type GildedChoice = { id: string; text: Bilingual; detail: Bilingual; next: string; spirit?: number; report?: boolean }
export type GildedNode = { title: Bilingual; art: GildedArt; lines: { speaker: GildedSpeaker; text: Bilingual }[]; next?: string; choices?: GildedChoice[]; kind?: 'puzzle' | 'film'; ending?: GildedEnding }
export type GildedPuzzle = { order: number[]; placed: number[] }
export type GildedSave = { version: 2; node: string; line: number; spirit: number; puzzle: GildedPuzzle; filmSeen: boolean; reportKept: boolean | null; visited: string[]; endings: GildedEnding[]; history: { node: string; line: number }[] }
// Keep the storage keys so existing players can be migrated without losing endings.
export const gildedSaveKey = 'naiwa-chapter-four-v1'
export const gildedProgressKey = 'naiwa-chapter-four-progress-v1'
export const gildedLegacySaveKey = 'naiwa-chapter-four-before-jigsaw-v1'
export const gildedLegacyProgressKey = 'naiwa-chapter-four-progress-before-jigsaw-v1'
export const gildedPieceCount = 12
export const gildedPuzzleColumns = 4
export const gildedPuzzleRows = 3
const b = (zh: string, en: string): Bilingual => ({ zh, en })
const n = (zh: string, en: string) => ({ speaker: 'narrator' as const, text: b(zh, en) })
const s = (speaker: GildedSpeaker, zh: string, en: string) => ({ speaker, text: b(zh, en) })
const c = (id: string, zh: string, en: string, detailZh: string, detailEn: string, next: string, effects: Partial<GildedChoice> = {}): GildedChoice => ({ id, text: b(zh, en), detail: b(detailZh, detailEn), next, ...effects })
export const gildedEndingIds: GildedEnding[] = ['free', 'bound', 'exhausted']
export const gildedEndingNames = { free: b('带着钥匙回去', 'Going back with the key'), bound: b('留在画里', 'Staying in the painting'), exhausted: b('没能走出房间', 'Unable to leave the room') }
export const gildedSpeakers = { narrator: b('旁白', 'Narration'), me: b('我', 'Me'), naishen: b('奶神', 'Naishen'), naiba: b('奶霸', 'Naiba'), journal: b('奶蛙观察日记', 'Naiwa’s journal') }

export const gildedStory: Record<string, GildedNode> = {
  threshold: { title: b('去救奶蛙', 'Going to help Naiwa'), art: 'threshold', lines: [
    n('奶蛙还躺在医院，没有醒来。我已经走过它精神世界的前三层，这次要到第四层，帮它找回下一块记忆。奶霸挡在一扇金色的门前。', 'Naiwa was still unconscious in the hospital. I had crossed the first three layers of its mind. I came to the fourth to recover another piece of memory. Naiba blocked a golden door.'),
    s('naiba', '别进去。你在里面待久了，就会跟那幅画一起留下。', 'Don’t go in. Stay too long and you’ll end up in that painting.'),
    s('me', '奶蛙还没醒。我不能到这里就回头。', 'Naiwa hasn’t woken up. I can’t turn back now.'),
    n('我抱紧日记，从奶霸身旁挤进门里。', 'I held the journal close and slipped past Naiba.'),
  ], next: 'welcome' },
  welcome: { title: b('奶神把门锁上了', 'Naishen locks the door'), art: 'room', lines: [
    n('房间很暖，桌上放着饭和热水。一个金黄色的身影披着红白布，笑着把椅子拉到我面前。', 'The room was warm. Food and hot water waited on the table. A golden figure in red and ivory cloth smiled and pulled out a chair.'),
    s('naishen', '叫我奶神吧。坐下来，别急着走。我把你需要的东西都准备好了。', 'Call me Naishen. Sit down. There’s no rush to leave. Everything you need is ready.'),
    n('我刚想问门在哪儿，奶神就伸手牵出几根金线。线绕住门把手，也绕住了我的袖口。', 'Before I could ask about the door, Naishen drew out golden threads. They wound around the handle and my sleeve.'),
    s('me', '等等。我是来救奶蛙的，不是来住下的。你先把门打开。', 'Wait. I came to help Naiwa, not to move in. Open the door first.'),
    s('naishen', '就是因为出了车祸，我才不敢放你出去。你留在这里，就不会再受伤了。', 'The crash is why I can’t let you out. If you stay here, you won’t get hurt again.'),
    s('journal', '奶神把门锁上，是因为它害怕再失去你。先问问它，墙上那幅碎掉的画是怎么回事。', 'Naishen locked the door because it’s afraid of losing you again. Ask about the broken painting on the wall.'),
  ], next: 'gallery' },
  gallery: { title: b('帮它拼好这幅画', 'Help put the painting together'), art: 'gallery', lines: [
    n('画框里空了一大片。十二块画片散在桌上，上面能看见金色云朵、红布，还有仰头看着奶神的人。', 'Most of the frame was empty. Twelve pieces lay on the table: gold clouds, red cloth, and people looking up at Naishen.'),
    s('naishen', '这幅画以前是完整的。我本来只想让大家高高兴兴地待在一起。出了事故以后，我就再也拼不好了。', 'It used to be whole. I just wanted everyone to be happy together. After the crash, I couldn’t put it back.'),
    s('me', '我帮你拼。拼好了，我们再说开门的事，行吗？', 'I’ll help. When it’s done, we’ll talk about opening the door. All right?'),
    s('journal', '把十二块画片放回画框。拼完整后，画里的那段影像就会播放。', 'Put all twelve pieces back into the frame. When the picture is complete, the scene within it will play.'),
  ], choices: [c('start-puzzle', '开始拼图', 'Start the puzzle', '拖动拼片，或先点拼片再点画框的位置。', 'Drag a piece, or select it and then choose its place in the frame.', 'puzzle'), c('read-report', '先看看画框背面的纸', 'Read the paper behind the frame first', '可选调查，不影响拼图。', 'Optional reading. It does not change the puzzle.', 'report')] },
  puzzle: { title: b('拼好奶神的画', 'Reassemble Naishen’s painting'), art: 'gallery', lines: [], kind: 'puzzle', next: 'film' },
  film: { title: b('画里的影像', 'The scene within the painting'), art: 'gallery', lines: [], kind: 'film', next: 'confrontation' },
  confrontation: { title: b('画好了，门还没开', 'The painting is whole, but the door is shut'), art: 'threshold', lines: [
    n('影像结束了，画片牢牢合在一起。门上的金线落下来，露出锁孔。奶霸走进来，把挡在锁孔前的装饰金钥匙捏断。', 'The scene ended, and the pieces held together. Threads fell away from the door, revealing its lock. Naiba came in and broke the decorative gold key covering the keyhole.'),
    s('me', '你又来干什么？我刚把画拼好，别把它弄坏。', 'What are you doing now? I just finished the painting. Don’t break it.'),
    s('naiba', '画没坏。拿桌上那把钥匙试。', 'The painting’s fine. Try the key on the table.'),
  ], next: 'trial' },
  trial: { title: b('奶神舍不得放你走', 'Naishen doesn’t want you to leave'), art: 'room', lines: [
    n('我拿起钥匙去开门。奶神突然抓住我的袖口，把我拉了回来。', 'I took the key to the door. Naishen caught my sleeve and pulled me back.'),
    s('naishen', '画刚拼好，你就要走吗？你走了，这里就只剩我一个了。', 'You’re leaving as soon as it’s fixed? Then I’ll be alone here.'),
    s('me', '我留下来拼画，就是在帮你。可现实里的奶蛙还在医院等我，我得回去。', 'I stayed to help you with the painting. But Naiwa is waiting in the hospital. I have to go back.'),
    s('naishen', '我知道……可我一想到你可能再出事，就想把门锁住。', 'I know… But when I think of another accident, I want to lock the door.'),
  ], choices: [c('talk', '我会小心。你先松手，我们慢慢说', 'I’ll be careful. Let go, and we can talk', '把回医院的理由告诉它。', 'Explain why you need to go back to the hospital.', 'permission'), c('force', '别再拦我了，马上开门', 'Stop blocking me. Open the door now', '硬拉袖口，消耗 20 精神力。', 'Pull against the sleeve. Costs 20 spirit.', 'tightening', { spirit: -20 }), c('stay', '那我就留在这里陪你', 'Then I’ll stay here with you', '把钥匙交给奶神。', 'Give Naishen the key.', 'bound')] },
  tightening: { title: b('越拉，线越紧', 'Pulling makes the threads tighter'), art: 'room', lines: [
    n('我用力拉开它的手，金线却把袖口勒得更紧。奶神吓得退了一步，我也头痛得站不稳。', 'I pulled against its grip. The thread tightened around my sleeve. Naishen backed away, frightened, and the pain in my head made me stagger.'),
    s('me', '好，我不拉了。先把话说清楚。', 'All right. I’ll stop pulling. Let’s talk first.'),
  ], next: 'trial' },
  permission: { title: b('把话说清楚', 'Talking it through'), art: 'room', lines: [
    s('naishen', '那你还会记得我吗？我不想等来等去，最后谁也不来。', 'Will you remember me? I don’t want to keep waiting and have nobody come.'),
    s('me', '我会记得。我来这里，就是为了把你也带回奶蛙身边。可是把我关起来，医院里的奶蛙就更没人救了。', 'I’ll remember. I came to bring this part of you back to Naiwa too. But if you keep me here, there’s nobody outside helping it.'),
    n('奶神看了看拼好的画，又看了看我的钥匙。它抓住袖口的手终于松了一点。', 'Naishen looked at the finished painting, then at my key. Its grip on my sleeve loosened.'),
  ], choices: [c('honest', '让我回医院，继续救奶蛙', 'Let me go back to the hospital and help Naiwa', '自己带好钥匙。', 'Keep the key with you.', 'release'), c('forever', '我答应永远不离开这间屋子', 'I promise never to leave this room', '留下陪它。', 'Stay with Naishen.', 'bound')] },
  release: { title: b('奶神亲手开门', 'Naishen opens the door'), art: 'open', lines: [
    s('naishen', '那你去吧。钥匙带好。要是以后回来，我再给你热饭。', 'Then go. Keep your key. If you come back, I’ll warm some food for you.'),
    n('奶神解开我袖口的线，亲手把门推开。外面有光，这次它没有追过来拉住我。', 'Naishen loosened the thread on my sleeve and opened the door. Light came in. This time, it didn’t reach out to stop me.'),
    n('拼好的画缩成一张小画，落进日记。我拿着它走出房间，回到病床旁边。', 'The finished painting shrank into a little picture and settled in the journal. I took it out of the room and returned to the bedside.'),
  ], next: 'free' },
  free: { title: gildedEndingNames.free, art: 'open', ending: 'free', lines: [
    n('奶蛙还是没有醒，但攥着床单的手指松开了。我把小画放在日记里：第四层的记忆已经带回来了。', 'Naiwa was still asleep, but its fingers relaxed around the sheet. I put the little painting in the journal. I had brought back the fourth layer’s memory.'),
    n('我坐在床边缓了一会儿。下一层还没走，现在先陪它待一会儿。', 'I sat beside the bed to catch my breath. Another layer lay ahead. For now, I stayed with Naiwa.'),
  ] },
  bound: { title: gildedEndingNames.bound, art: 'room', ending: 'bound', lines: [
    n('我把钥匙交给奶神，说自己不走了。它笑起来，把椅子拉到身边。', 'I gave Naishen the key and said I would stay. It smiled and pulled the chair closer.'),
    s('naishen', '这样就好了。以后谁也不会出事。', 'That’s better. Nobody will get hurt now.'),
    n('我的身影出现在画里，站在奶神旁边。医院里的奶蛙还在等我，可我已经听不见病房的声音了。', 'My figure appeared beside Naishen in the painting. Naiwa was still waiting in the hospital, but I could no longer hear the ward.'),
  ] },
  exhausted: { title: gildedEndingNames.exhausted, art: 'gallery', ending: 'exhausted', lines: [
    n('一次次硬拉金线，把我的精神力耗尽了。我扶着桌子，连门在哪儿都看不清。', 'Pulling against the threads had drained my spirit. I leaned on the table and could no longer make out the door.'),
    s('naishen', '别动了。你先坐下来……', 'Stop. Sit down first…'),
    n('我再也没有力气回到病房。这一次，没能把第四层的记忆带出去。', 'I had no strength left to return to the ward. This time, I hadn’t brought the fourth layer’s memory out.'),
  ] },
  report: { title: b('画框背面的报告', 'The report behind the frame'), art: 'threshold', lines: [
    n('画框后夹着一份调查报告。照片里，奶霸在车祸发生前按过控制器，后面几张照片的时间却接不上。', 'A report was tucked behind the frame. One photo showed Naiba pressing a controller before the crash. The later photos had gaps in their timestamps.'),
    s('me', '事故是他造成的，可这份报告也没写完整。我先救奶蛙，出去以后再查。', 'He caused the crash, but this report is incomplete too. I’ll help Naiwa first and investigate afterward.'),
    n('旁边还放着第三层留下的路线图。我可以一起带走，也可以只留下报告。', 'The map from the third layer lay beside it. I could keep both, or take only the report.'),
  ], choices: [c('keep-report', '报告和路线图都带走', 'Take the report and the map', '之后可以并排核对。', 'Compare them later.', 'report-kept', { report: true }), c('burn-report', '只留报告，把路线图撕掉', 'Keep the report and tear up the map', '之后无法再核对路线图。', 'The map will no longer be available.', 'report-burnt', { report: false })] },
  'report-kept': { title: b('留下两份纸', 'Keeping both papers'), art: 'gallery', lines: [n('我把两份纸夹进日记，回到那幅碎画前。', 'I put both papers in the journal and returned to the broken painting.')], next: 'gallery' },
  'report-burnt': { title: b('只留下报告', 'Keeping only the report'), art: 'gallery', lines: [n('我撕掉路线图，收起报告。这些事以后再查，先帮奶神把画拼好。', 'I tore up the map and kept the report. I could investigate later. First, I would help Naishen with the painting.')], next: 'gallery' },
}

const clamp = (value: unknown, max: number, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback
const validNode = (id: unknown): id is string => typeof id === 'string' && Object.hasOwn(gildedStory, id)
const validPiece = (id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < gildedPieceCount
const allPieces = () => Array.from({ length: gildedPieceCount }, (_, i) => i)
export function newGildedPuzzle(random = Math.random): GildedPuzzle {
  const order = allPieces()
  for (let i = order.length - 1; i > 0; i--) { const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1)))); [order[i], order[j]] = [order[j], order[i]] }
  if (order.every((id, i) => id === i)) [order[0], order[1]] = [order[1], order[0]]
  return { order, placed: [] }
}
export function normalizeGildedPuzzle(raw: unknown): GildedPuzzle {
  const data = raw && typeof raw === 'object' ? raw as Partial<GildedPuzzle> : {}
  const order = Array.isArray(data.order) ? data.order.filter(validPiece) : []
  const placed = Array.isArray(data.placed) ? [...new Set(data.placed.filter(validPiece))] : []
  return { order: order.length === gildedPieceCount && new Set(order).size === gildedPieceCount ? [...order] : [7, 2, 10, 0, 5, 9, 3, 11, 1, 8, 4, 6], placed }
}
export function newGildedSave(endings: GildedEnding[] = []): GildedSave {
  return { version: 2, node: 'threshold', line: 0, spirit: 80, puzzle: newGildedPuzzle(), filmSeen: false, reportKept: null, visited: ['threshold'], endings: [...endings], history: [] }
}
export const isGildedPuzzleComplete = (save: Pick<GildedSave, 'puzzle'>) => save.puzzle.placed.length === gildedPieceCount && new Set(save.puzzle.placed).size === gildedPieceCount && save.puzzle.placed.every(validPiece)
export function normalizeGildedSave(raw: unknown): GildedSave {
  if (!raw || typeof raw !== 'object') return newGildedSave()
  const data = raw as Omit<Partial<GildedSave>, 'version'> & { version?: number }
  const endings = Array.isArray(data.endings) ? [...new Set(data.endings.filter(id => gildedEndingIds.includes(id)))]: []
  if (data.version === 1) {
    // An old three-painting save cannot pretend the new jigsaw is finished.
    const node = data.node === 'threshold' || data.node === 'welcome' ? data.node : 'gallery'
    return { ...newGildedSave(endings), node, spirit: clamp(data.spirit, 100, 80) || 80, reportKept: typeof data.reportKept === 'boolean' ? data.reportKept : null,
      visited: [...new Set([...(Array.isArray(data.visited) ? data.visited.filter(validNode) : []), node])], history: [] }
  }
  if (data.version !== 2 || !validNode(data.node)) return newGildedSave(endings)
  const puzzle = normalizeGildedPuzzle(data.puzzle)
  const save: GildedSave = { version: 2, node: data.node, line: clamp(data.line, Math.max(0, gildedStory[data.node].lines.length - 1)), spirit: clamp(data.spirit, 100, 80), puzzle, filmSeen: data.filmSeen === true && isGildedPuzzleComplete({ puzzle }), reportKept: typeof data.reportKept === 'boolean' ? data.reportKept : null,
    visited: Array.isArray(data.visited) ? [...new Set(data.visited.filter(validNode))] : [data.node], endings,
    history: Array.isArray(data.history) ? data.history.filter(entry => entry && validNode(entry.node) && Number.isInteger(entry.line) && entry.line >= 0 && entry.line < gildedStory[entry.node].lines.length).map(entry => ({ ...entry })).slice(-250) : [],
  }
  const gated = ['film', 'confrontation', 'trial', 'tightening', 'permission', 'release', 'free', 'bound']
  if (gated.includes(save.node) && !isGildedPuzzleComplete(save)) { save.node = 'puzzle'; save.line = 0 }
  else if (gated.includes(save.node) && save.node !== 'film' && !save.filmSeen) { save.node = 'film'; save.line = 0 }
  if (save.node === 'puzzle' && isGildedPuzzleComplete(save)) { save.node = 'film'; save.line = 0 }
  if (save.node === 'report-kept') save.reportKept = true
  if (save.node === 'report-burnt') save.reportKept = false
  if (save.spirit === 0 || save.node === 'exhausted') { if (save.node !== 'exhausted') { save.node = 'exhausted'; save.line = 0 }; save.spirit = 0 }
  if (!save.visited.includes(save.node)) save.visited.push(save.node)
  return save
}
export function enterGildedNode(save: GildedSave, id: string): GildedSave {
  if (!validNode(id)) return save
  const next = save.spirit <= 0 ? 'exhausted' : id
  const ending = gildedStory[next].ending
  return { ...save, node: next, line: 0, visited: [...new Set([...save.visited, next])], endings: ending ? [...new Set([...save.endings, ending])] : save.endings }
}
export function advanceGilded(save: GildedSave): GildedSave {
  const node = gildedStory[save.node]
  if (node.kind || node.ending) return save.line < node.lines.length - 1 ? { ...save, line: save.line + 1 } : save
  if (save.line < node.lines.length - 1) return { ...save, line: save.line + 1 }
  return node.next ? enterGildedNode(save, node.next) : save
}
export function applyGildedChoice(save: GildedSave, id: string): GildedSave {
  const node = gildedStory[save.node]
  if (save.line !== node.lines.length - 1) return save
  const choice = node.choices?.find(item => item.id === id)
  if (!choice || ['trial', 'permission'].includes(save.node) && (!isGildedPuzzleComplete(save) || !save.filmSeen)) return save
  return enterGildedNode({ ...save, spirit: clamp(save.spirit + (choice.spirit ?? 0), 100), reportKept: choice.report ?? save.reportKept }, choice.next)
}
export function placeGildedPiece(save: GildedSave, piece: number, slot: number): GildedSave {
  if (save.node !== 'puzzle' || !validPiece(piece) || piece !== slot || save.puzzle.placed.includes(piece)) return save
  const next = { ...save, puzzle: { order: [...save.puzzle.order], placed: [...save.puzzle.placed, piece] } }
  return isGildedPuzzleComplete(next) ? enterGildedNode(next, 'film') : next
}
export function finishGildedFilm(save: GildedSave): GildedSave {
  return save.node === 'film' && isGildedPuzzleComplete(save) ? enterGildedNode({ ...save, filmSeen: true }, 'confrontation') : save
}
